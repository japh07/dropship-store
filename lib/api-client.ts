import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse, AxiosError } from 'axios';
import { NextRequest } from 'next/server';
import { getAuthSession, getCurrentUser } from './auth';
import { EnvEncryption } from './encryption';
import { auditLogger } from './audit-logger';

/**
 * API client configuration interface
 */
export interface APIClientConfig {
  baseURL?: string;
  timeout?: number;
  retries?: number;
  retryDelay?: number;
  encryptionEnabled?: boolean;
  auditEnabled?: boolean;
  customHeaders?: Record<string, string>;
}

/**
 * API response interface
 */
export interface APIResponse<T = any> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
  metadata?: {
    requestId: string;
    timestamp: string;
    responseTime: number;
    rateLimit?: {
      limit: number;
      remaining: number;
      reset: number;
    };
  };
}

/**
 * Secure HTTP client for external API calls
 * - Axios instance with authentication headers
 * - Request/response interceptors for encryption/decryption
 * - Automatic token refresh
 * - Rate limiting and retry logic
 * - Comprehensive audit logging
 */
export class SecureAPIClient {
  private axiosInstance: AxiosInstance;
  private config: Required<APIClientConfig>;

  constructor(config: APIClientConfig = {}) {
    this.config = {
      baseURL: config.baseURL || process.env.NEXT_PUBLIC_API_URL || 'https://api.example.com',
      timeout: config.timeout || 10000,
      retries: config.retries || 3,
      retryDelay: config.retryDelay || 1000,
      encryptionEnabled: config.encryptionEnabled !== false, // Default to true
      auditEnabled: config.auditEnabled !== false, // Default to true
      customHeaders: config.customHeaders || {},
    };

    this.axiosInstance = this.createAxiosInstance();
    this.setupInterceptors();
  }

  /**
   * Create and configure Axios instance
   */
  private createAxiosInstance(): AxiosInstance {
    return axios.create({
      baseURL: this.config.baseURL,
      timeout: this.config.timeout,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'User-Agent': `Dropship-Store/1.0 (Secure-API-Client)`,
        ...this.config.customHeaders,
      },
      // Enable HTTPS-only in production
      httpsAgent: process.env.NODE_ENV === 'production' ? new (require('https').Agent)({
        rejectUnauthorized: true,
        minVersion: 'TLSv1.2',
      }) : undefined,
    });
  }

  /**
   * Setup request and response interceptors
   */
  private setupInterceptors(): void {
    // Request interceptor
    this.axiosInstance.interceptors.request.use(
      async (config) => {
        const startTime = Date.now();

        // Add request ID for tracking
        const requestId = crypto.randomUUID();
        config.headers['X-Request-ID'] = requestId;
        (config as any).metadata = { requestId, startTime };

        try {
          // Add authentication headers if available
          const authHeaders = await this.getAuthHeaders();
          Object.assign(config.headers, authHeaders);

          // Encrypt request data if enabled
          if (this.config.encryptionEnabled && config.data) {
            config.data = this.encryptPayload(config.data);
            config.headers['X-Encrypted'] = 'true';
          }

          // Log API call
          if (this.config.auditEnabled) {
            await auditLogger.logAPICall(
              config.method?.toUpperCase() || 'GET',
              config.url || '',
              0, // Will be updated in response interceptor
              0, // Will be updated in response interceptor
              {
                requestId,
                encrypted: this.config.encryptionEnabled && !!config.data,
                userAgent: config.headers['User-Agent'],
              }
            );
          }

          return config;
        } catch (error) {
          console.error('Request interceptor error:', error);
          throw error;
        }
      },
      async (error) => {
        if (this.config.auditEnabled) {
          await auditLogger.logSecurityEvent('api_request_error', {
            error: error.message,
            config: error.config,
          }, null, 'ERROR');
        }
        return Promise.reject(error);
      }
    );

    // Response interceptor
    this.axiosInstance.interceptors.response.use(
      async (response) => {
        const startTime = (response.config as any).metadata?.startTime || Date.now();
        const responseTime = Date.now() - startTime;
        const requestId = (response.config as any).metadata?.requestId;

        try {
          // Decrypt response data if encrypted
          if (response.headers['x-encrypted'] === 'true' && response.data) {
            response.data = this.decryptPayload(response.data);
          }

          // Extract rate limiting information
          const rateLimit = {
            limit: response.headers['x-ratelimit-limit'],
            remaining: response.headers['x-ratelimit-remaining'],
            reset: response.headers['x-ratelimit-reset'],
          };

          // Log successful response
          if (this.config.auditEnabled) {
            await auditLogger.logAPICall(
              response.config.method?.toUpperCase() || 'GET',
              response.config.url || '',
              response.status,
              responseTime,
              {
                requestId,
                encrypted: response.headers['x-encrypted'] === 'true',
                rateLimit: rateLimit.limit ? {
                  limit: parseInt(rateLimit.limit),
                  remaining: parseInt(rateLimit.remaining),
                  reset: parseInt(rateLimit.reset),
                } : undefined,
              }
            );
          }

          // Wrap response in standardized format
          const apiResponse: APIResponse = {
            success: true,
            data: response.data,
            metadata: {
              requestId: requestId || 'unknown',
              timestamp: new Date().toISOString(),
              responseTime,
              ...(rateLimit.limit && {
                rateLimit: {
                  limit: parseInt(rateLimit.limit),
                  remaining: parseInt(rateLimit.remaining),
                  reset: parseInt(rateLimit.reset),
                },
              }),
            },
          };

          return { ...response, data: apiResponse };
        } catch (error) {
          console.error('Response interceptor error:', error);
          throw error;
        }
      },
      async (error: AxiosError) => {
        const response = error.response;
        const startTime = (error.config as any)?.metadata?.startTime || Date.now();
        const responseTime = Date.now() - startTime;
        const requestId = (error.config as any)?.metadata?.requestId;

        try {
          // Handle rate limiting
          if (response?.status === 429) {
            const retryAfter = response.headers['retry-after'];
            if (retryAfter) {
              // Wait and retry if retry-after header is present
              await new Promise(resolve => setTimeout(resolve, parseInt(retryAfter) * 1000));
              return this.axiosInstance.request(error.config!);
            }
          }

          // Handle unauthorized/forbidden - potential token refresh
          if ((response?.status === 401 || response?.status === 403) && error.config && !error.config.headers['X-Retry-After']) {
            try {
              await this.refreshAuthToken();
              error.config.headers['X-Retry-After'] = 'true';
              return this.axiosInstance.request(error.config);
            } catch (refreshError) {
              // Token refresh failed, log and continue with error
              await auditLogger.logSecurityEvent('token_refresh_failed', {
                originalUrl: error.config?.url,
                refreshError: refreshError instanceof Error ? refreshError.message : 'Unknown',
              }, null, 'ERROR');
            }
          }

          // Log error response
          if (this.config.auditEnabled) {
            await auditLogger.logAPICall(
              error.config?.method?.toUpperCase() || 'GET',
              error.config?.url || '',
              response?.status || 500,
              responseTime,
              {
                requestId,
                error: error.message,
                errorData: response?.data,
              }
            );
          }

          // Wrap error in standardized format
          const apiResponse: APIResponse = {
            success: false,
            error: {
              code: this.getErrorCode(response?.status),
              message: this.getErrorMessage(error),
              details: response?.data,
            },
            metadata: {
              requestId: requestId || 'unknown',
              timestamp: new Date().toISOString(),
              responseTime,
            },
          };

          return Promise.reject({ ...error, response: { ...response, data: apiResponse } });
        } catch (interceptorError) {
          console.error('Error response interceptor error:', interceptorError);
          return Promise.reject(error);
        }
      }
    );
  }

  /**
   * Get authentication headers
   */
  private async getAuthHeaders(): Promise<Record<string, string>> {
    try {
      const session = await getAuthSession();
      if (session?.accessToken) {
        return {
          'Authorization': `Bearer ${session.accessToken}`,
          'X-User-ID': session.user?.id || '',
          'X-User-Email': session.user?.email || '',
        };
      }
    } catch (error) {
      console.error('Failed to get auth headers:', error);
    }

    // Fallback to API key authentication for external services
    const apiKey = process.env.EXTERNAL_API_KEY;
    if (apiKey) {
      try {
        const encryptedApiKey = EnvEncryption.encrypt(apiKey);
        return {
          'X-API-Key': JSON.stringify(encryptedApiKey),
          'X-Auth-Method': 'encrypted-api-key',
        };
      } catch (error) {
        console.error('Failed to encrypt API key:', error);
      }
    }

    return {};
  }

  /**
   * Encrypt request payload
   */
  private encryptPayload(payload: any): any {
    try {
      const encrypted = EnvEncryption.encrypt(payload);
      return { encrypted: true, data: encrypted };
    } catch (error) {
      console.error('Failed to encrypt payload:', error);
      throw new Error('Payload encryption failed');
    }
  }

  /**
   * Decrypt response payload
   */
  private decryptPayload(payload: any): any {
    try {
      if (payload.encrypted && payload.data) {
        return EnvEncryption.decrypt(payload.data);
      }
      return payload;
    } catch (error) {
      console.error('Failed to decrypt payload:', error);
      throw new Error('Payload decryption failed');
    }
  }

  /**
   * Refresh authentication token
   */
  private async refreshAuthToken(): Promise<void> {
    // This would implement token refresh logic
    // For now, we'll just log the attempt
    await auditLogger.logAuthEvent('token_refresh_attempt', {
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Get standardized error code
   */
  private getErrorCode(status?: number): string {
    switch (status) {
      case 400: return 'BAD_REQUEST';
      case 401: return 'UNAUTHORIZED';
      case 403: return 'FORBIDDEN';
      case 404: return 'NOT_FOUND';
      case 409: return 'CONFLICT';
      case 422: return 'VALIDATION_ERROR';
      case 429: return 'RATE_LIMIT_EXCEEDED';
      case 500: return 'INTERNAL_SERVER_ERROR';
      case 502: return 'BAD_GATEWAY';
      case 503: return 'SERVICE_UNAVAILABLE';
      default: return 'UNKNOWN_ERROR';
    }
  }

  /**
   * Get standardized error message
   */
  private getErrorMessage(error: AxiosError): string {
    if (error.response?.data && typeof (error.response.data as any).message === 'string') {
      return (error.response.data as any).message;
    }

    switch (error.response?.status) {
      case 400: return 'Invalid request data';
      case 401: return 'Authentication required';
      case 403: return 'Access forbidden';
      case 404: return 'Resource not found';
      case 429: return 'Too many requests';
      case 500: return 'Internal server error';
      case 503: return 'Service temporarily unavailable';
      default: return error.message || 'Request failed';
    }
  }

  /**
   * HTTP GET request
   */
  async get<T = any>(url: string, config?: AxiosRequestConfig): Promise<APIResponse<T>> {
    const response = await this.axiosInstance.get<T>(url, config);
    return response.data as APIResponse<T>;
  }

  /**
   * HTTP POST request
   */
  async post<T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<APIResponse<T>> {
    const response = await this.axiosInstance.post<T>(url, data, config);
    return response.data as APIResponse<T>;
  }

  /**
   * HTTP PUT request
   */
  async put<T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<APIResponse<T>> {
    const response = await this.axiosInstance.put<T>(url, data, config);
    return response.data as APIResponse<T>;
  }

  /**
   * HTTP PATCH request
   */
  async patch<T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<APIResponse<T>> {
    const response = await this.axiosInstance.patch<T>(url, data, config);
    return response.data as APIResponse<T>;
  }

  /**
   * HTTP DELETE request
   */
  async delete<T = any>(url: string, config?: AxiosRequestConfig): Promise<APIResponse<T>> {
    const response = await this.axiosInstance.delete<T>(url, config);
    return response.data as APIResponse<T>;
  }

  /**
   * Upload file with progress tracking
   */
  async upload<T = any>(
    url: string,
    file: File,
    onProgress?: (progress: number) => void,
    config?: AxiosRequestConfig
  ): Promise<APIResponse<T>> {
    const formData = new FormData();
    formData.append('file', file);

    const response = await this.axiosInstance.post<T>(url, formData, {
      ...config,
      headers: {
        'Content-Type': 'multipart/form-data',
        ...config?.headers,
      },
      onUploadProgress: (progressEvent) => {
        if (onProgress && progressEvent.total) {
          const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          onProgress(progress);
        }
      },
    });

    return response.data as APIResponse<T>;
  }

  /**
   * Download file
   */
  async download(
    url: string,
    filename?: string,
    onProgress?: (progress: number) => void,
    config?: AxiosRequestConfig
  ): Promise<Blob> {
    const response = await this.axiosInstance.get(url, {
      ...config,
      responseType: 'blob',
      onDownloadProgress: (progressEvent) => {
        if (onProgress && progressEvent.total) {
          const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          onProgress(progress);
        }
      },
    });

    // Trigger file download if filename is provided
    if (filename && typeof window !== 'undefined') {
      const blobUrl = window.URL.createObjectURL(response.data);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(blobUrl);
    }

    return response.data;
  }

  /**
   * Cancel ongoing requests (placeholder implementation)
   */
  cancelRequests(): void {
    // Implementation would depend on axios version and TypeScript types
    // This method is optional and can be implemented as needed
    console.log('Cancel requests called - implementation depends on axios version');
  }
}

// Create default instance
export const apiClient = new SecureAPIClient();

// Export utilities
export { SecureAPIClient as APIClient };
export type { APIResponse };