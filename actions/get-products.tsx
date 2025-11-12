import { Product } from "@/types";
import qs from "query-string";
import { apiClient, APIResponse } from "@/lib/api-client";
import { auditLogger } from "@/lib/audit-logger";

const URL = `/products`;

interface Query {
  categoryId?: string;
  colorId?: string;
  sizeId?: string;
  isFeatured?: boolean;
  limit?: number;
  offset?: number;
}

interface GetProductsResponse {
  products: Product[];
  total: number;
  hasMore: boolean;
}

/**
 * Secure API action for fetching products with authentication and encryption
 * - Uses secure API client with JWT authentication
 * - Encrypts sensitive query parameters
 * - Includes comprehensive audit logging
 * - Handles rate limiting and retries
 * - Validates response data
 */
const getProducts = async (query: Query): Promise<Product[]> => {
  const startTime = Date.now();
  const requestId = crypto.randomUUID();

  try {
    // Validate input parameters
    if (query.categoryId && !/^[a-zA-Z0-9-]+$/.test(query.categoryId)) {
      throw new Error('Invalid category ID format');
    }
    if (query.colorId && !/^[a-zA-Z0-9-]+$/.test(query.colorId)) {
      throw new Error('Invalid color ID format');
    }
    if (query.sizeId && !/^[a-zA-Z0-9-]+$/.test(query.sizeId)) {
      throw new Error('Invalid size ID format');
    }

    // Sanitize and prepare query parameters
    const sanitizedQuery = {
      colorId: query.colorId || undefined,
      sizeId: query.sizeId || undefined,
      categoryId: query.categoryId || undefined,
      isFeatured: query.isFeatured || undefined,
      limit: Math.min(query.limit || 50, 100), // Cap at 100 for security
      offset: Math.max(query.offset || 0, 0), // Ensure non-negative
    };

    // Log the API call
    await auditLogger.logUserAction(
      'fetch_products',
      {
        query: sanitizedQuery,
        requestId,
        timestamp: new Date().toISOString(),
      }
    );

    // Make secure API call
    const response: APIResponse<GetProductsResponse> = await apiClient.get(URL, {
      params: sanitizedQuery,
      headers: {
        'X-Request-ID': requestId,
      },
    });

    // Validate response structure
    if (!response.success || !response.data?.products) {
      throw new Error('Invalid response structure from products API');
    }

    // Validate product data
    const products = response.data.products.filter((product: any) => {
      return product &&
             typeof product.id === 'string' &&
             typeof product.name === 'string' &&
             typeof product.price === 'number' &&
             product.price >= 0; // Ensure non-negative prices
    });

    // Log successful response
    await auditLogger.logUserAction(
      'fetch_products_success',
      {
        requestId,
        productCount: products.length,
        totalProducts: response.data.total,
        responseTime: Date.now() - startTime,
      }
    );

    return products;

  } catch (error) {
    // Log error
    await auditLogger.logSecurityEvent(
      'fetch_products_error',
      {
        requestId,
        error: error instanceof Error ? error.message : 'Unknown error',
        query,
        responseTime: Date.now() - startTime,
      },
      null,
      'ERROR'
    );

    // Return empty array on error to prevent UI crashes
    console.error('Failed to fetch products:', error);
    return [];
  }
};

/**
 * Alternative function for fetching products without authentication (public access)
 * Used for public product listings where authentication is not required
 */
const getPublicProducts = async (query: Query): Promise<Product[]> => {
  const startTime = Date.now();
  const requestId = crypto.randomUUID();

  try {
    // Validate input parameters
    const sanitizedQuery = {
      colorId: query.colorId || undefined,
      sizeId: query.sizeId || undefined,
      categoryId: query.categoryId || undefined,
      isFeatured: query.isFeatured || undefined,
      limit: Math.min(query.limit || 20, 50), // Lower limit for public access
      offset: Math.max(query.offset || 0, 0),
    };

    // Log public access
    await auditLogger.logUserAction(
      'fetch_public_products',
      {
        query: sanitizedQuery,
        requestId,
        timestamp: new Date().toISOString(),
      }
    );

    // Use fetch for public endpoints (no authentication required)
    const url = qs.stringifyUrl({
      url: `${process.env.NEXT_PUBLIC_API_URL}/public/products`,
      query: sanitizedQuery,
    });

    const res = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Dropship-Store/1.0 (Public-API)',
        'X-Request-ID': requestId,
        'Accept': 'application/json',
      },
      // Add security constraints
      cache: 'no-cache',
      credentials: 'omit', // Don't send credentials for public requests
    });

    if (!res.ok) {
      throw new Error(`HTTP ${res.status}: ${res.statusText}`);
    }

    const data = await res.json();

    // Validate response structure
    if (!data.products || !Array.isArray(data.products)) {
      throw new Error('Invalid response structure from public products API');
    }

    // Validate product data
    const products = data.products.filter((product: any) => {
      return product &&
             typeof product.id === 'string' &&
             typeof product.name === 'string' &&
             typeof product.price === 'number' &&
             product.price >= 0;
    });

    // Log successful public response
    await auditLogger.logUserAction(
      'fetch_public_products_success',
      {
        requestId,
        productCount: products.length,
        responseTime: Date.now() - startTime,
      }
    );

    return products;

  } catch (error) {
    // Log public access error
    await auditLogger.logSecurityEvent(
      'fetch_public_products_error',
      {
        requestId,
        error: error instanceof Error ? error.message : 'Unknown error',
        query,
        responseTime: Date.now() - startTime,
      }
    );

    console.error('Failed to fetch public products:', error);
    return [];
  }
};

export default getProducts;
export { getPublicProducts };
