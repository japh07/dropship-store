'use client';

import React, { useState, useRef, useCallback } from 'react';
import {
  Upload,
  Download,
  Play,
  Square,
  FileText,
  AlertTriangle,
  CheckCircle,
  X,
  Terminal,
  RefreshCw,
  Copy,
  Eye,
  Code,
  Shield,
  Clock,
  Zap,
  FileJson
} from 'lucide-react';

import { PluginMetadata, PluginManifest } from '@/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Progress } from '@/components/ui/progress';

interface PluginSandboxProps {
  onUploadPlugin?: (files: File[]) => void;
  onTestPlugin?: (pluginData: any) => Promise<PluginTestResult>;
  onDownloadPlugin?: (pluginData: any) => void;
  className?: string;
}

interface PluginTestResult {
  success: boolean;
  errors: string[];
  warnings: string[];
  performance: {
    memoryUsage: number;
    executionTime: number;
  };
  security: {
    violations: string[];
    riskLevel: 'low' | 'medium' | 'high';
  };
}

interface SandboxLog {
  id: string;
  timestamp: Date;
  type: 'info' | 'warning' | 'error' | 'success';
  message: string;
  details?: any;
}

export function PluginSandbox({
  onUploadPlugin,
  onTestPlugin,
  onDownloadPlugin,
  className = ''
}: PluginSandboxProps) {
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [pluginData, setPluginData] = useState<any>(null);
  const [testResult, setTestResult] = useState<PluginTestResult | null>(null);
  const [isTesting, setIsTesting] = useState(false);
  const [logs, setLogs] = useState<SandboxLog[]>([]);
  const [activeTab, setActiveTab] = useState('upload');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const addLog = useCallback((type: SandboxLog['type'], message: string, details?: any) => {
    const log: SandboxLog = {
      id: Math.random().toString(36).substr(2, 9),
      timestamp: new Date(),
      type,
      message,
      details
    };
    setLogs(prev => [...prev.slice(-50), log]); // Keep last 50 logs
  }, []);

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setUploadedFile(file);
      addLog('info', `File uploaded: ${file.name} (${(file.size / 1024).toFixed(1)}KB)`);
      processUploadedFile(file);
    }
  };

  const processUploadedFile = async (file: File) => {
    try {
      addLog('info', 'Processing uploaded file...');

      const fileContent = await file.text();
      const parsed = JSON.parse(fileContent);

      // Validate plugin structure
      if (!parsed.plugin || !parsed.manifest) {
        throw new Error('Invalid plugin structure. Missing plugin or manifest data.');
      }

      setPluginData(parsed);
      addLog('success', 'Plugin file processed successfully');
      setActiveTab('preview');
    } catch (error) {
      addLog('error', `Failed to process file: ${error instanceof Error ? error.message : 'Unknown error'}`);
      setUploadedFile(null);
    }
  };

  const handleTestPlugin = async () => {
    if (!pluginData || !onTestPlugin) return;

    setIsTesting(true);
    addLog('info', 'Starting plugin test...');

    try {
      const result = await onTestPlugin(pluginData);
      setTestResult(result);

      if (result.success) {
        addLog('success', 'Plugin test completed successfully');
        if (result.warnings.length > 0) {
          result.warnings.forEach(warning => {
            addLog('warning', `Warning: ${warning}`);
          });
        }
      } else {
        addLog('error', 'Plugin test failed');
        result.errors.forEach(error => {
          addLog('error', `Error: ${error}`);
        });
      }

      // Add performance logs
      addLog('info', `Performance: Memory usage: ${(result.performance.memoryUsage / 1024 / 1024).toFixed(1)}MB`);
      addLog('info', `Performance: Execution time: ${result.performance.executionTime.toFixed(0)}ms`);

      // Add security logs
      if (result.security.violations.length > 0) {
        addLog('warning', `Security issues detected (${result.security.violations.length})`);
        result.security.violations.forEach(violation => {
          addLog('warning', `Security: ${violation}`);
        });
      }

      setActiveTab('results');
    } catch (error) {
      addLog('error', `Test failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsTesting(false);
    }
  };

  const handleDrop = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    const files = Array.from(event.dataTransfer.files);
    if (files.length > 0) {
      const file = files[0];
      if (file.type === 'application/json' || file.name.endsWith('.json')) {
        setUploadedFile(file);
        addLog('info', `File dropped: ${file.name}`);
        processUploadedFile(file);
      } else {
        addLog('error', 'Invalid file type. Please upload a JSON plugin file.');
      }
    }
  }, []);

  const handleDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
  }, []);

  const formatLogTime = (timestamp: Date) => {
    return timestamp.toLocaleTimeString();
  };

  const getLogIcon = (type: SandboxLog['type']) => {
    switch (type) {
      case 'error':
        return <AlertTriangle className="w-4 h-4 text-red-500" />;
      case 'warning':
        return <AlertTriangle className="w-4 h-4 text-yellow-500" />;
      case 'success':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      default:
        return <Terminal className="w-4 h-4 text-blue-500" />;
    }
  };

  const getRiskColor = (riskLevel: string) => {
    switch (riskLevel) {
      case 'high':
        return 'text-red-600 bg-red-50';
      case 'medium':
        return 'text-yellow-600 bg-yellow-50';
      case 'low':
        return 'text-green-600 bg-green-50';
      default:
        return 'text-gray-600 bg-gray-50';
    }
  };

  return (
    <div className={`space-y-6 ${className}`}>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Plugin Sandbox</h1>
          <p className="text-gray-600">
            Test and validate plugins in a secure sandboxed environment
          </p>
        </div>
        <Button variant="outline" onClick={() => setLogs([])}>
          <RefreshCw className="w-4 h-4 mr-2" />
          Clear Logs
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
            {/* Upload Tab */}
            <TabsContent value="upload" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Upload Plugin</CardTitle>
                  <CardDescription>
                    Upload a plugin file to test in the sandbox environment
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div
                    className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-gray-400 transition-colors cursor-pointer"
                    onDrop={handleDrop}
                    onDragOver={handleDragOver}
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <Upload className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                    <div className="space-y-2">
                      <p className="text-lg font-medium">Drop plugin file here</p>
                      <p className="text-sm text-gray-600">
                        or click to browse
                      </p>
                      <p className="text-xs text-gray-500">
                        Supports JSON plugin files (.json)
                      </p>
                    </div>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".json,application/json"
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Plugin Preview */}
              {pluginData && (
                <Card>
                  <CardHeader>
                    <CardTitle>Plugin Preview</CardTitle>
                    <CardDescription>
                      Review plugin information before testing
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm font-medium text-gray-700">Plugin Name</label>
                        <div className="mt-1 p-2 bg-gray-50 rounded">
                          {pluginData.plugin?.name || 'N/A'}
                        </div>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-700">Version</label>
                        <div className="mt-1 p-2 bg-gray-50 rounded">
                          {pluginData.plugin?.version || 'N/A'}
                        </div>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-700">Author</label>
                        <div className="mt-1 p-2 bg-gray-50 rounded">
                          {pluginData.plugin?.author?.name || 'N/A'}
                        </div>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-700">Category</label>
                        <div className="mt-1 p-2 bg-gray-50 rounded">
                          {pluginData.plugin?.category || 'N/A'}
                        </div>
                      </div>
                    </div>

                    <div>
                      <label className="text-sm font-medium text-gray-700">Description</label>
                      <Textarea
                        value={pluginData.plugin?.description || ''}
                        readOnly
                        className="mt-1"
                        rows={3}
                      />
                    </div>

                    <div>
                      <label className="text-sm font-medium text-gray-700">Permissions</label>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {pluginData.plugin?.permissions?.map((permission: string, index: number) => (
                          <Badge key={index} variant="secondary" className="text-xs">
                            {permission}
                          </Badge>
                        )) || <span className="text-sm text-gray-500">No permissions</span>}
                      </div>
                    </div>

                    <div className="flex space-x-3">
                      <Button
                        onClick={handleTestPlugin}
                        disabled={isTesting}
                        className="flex-1"
                      >
                        {isTesting ? (
                          <>
                            <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                            Testing...
                          </>
                        ) : (
                          <>
                            <Play className="w-4 h-4 mr-2" />
                            Test Plugin
                          </>
                        )}
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => setPluginData(null)}
                      >
                        <X className="w-4 h-4 mr-2" />
                        Clear
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            {/* Test Results */}
            <TabsContent value="results" className="space-y-6">
              {testResult && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      Test Results
                      <Badge
                        variant={testResult.success ? 'default' : 'destructive'}
                        className="ml-3"
                      >
                        {testResult.success ? 'Passed' : 'Failed'}
                      </Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    {/* Performance Metrics */}
                    <div>
                      <h4 className="font-medium mb-3">Performance Metrics</h4>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-sm font-medium">Memory Usage</span>
                            <span className="text-sm text-gray-600">
                              {(testResult.performance.memoryUsage / 1024 / 1024).toFixed(1)}MB
                            </span>
                          </div>
                          <Progress
                            value={(testResult.performance.memoryUsage / (50 * 1024 * 1024)) * 100}
                            className="h-2"
                          />
                        </div>
                        <div>
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-sm font-medium">Execution Time</span>
                            <span className="text-sm text-gray-600">
                              {testResult.performance.executionTime.toFixed(0)}ms
                            </span>
                          </div>
                          <Progress
                            value={Math.min((testResult.performance.executionTime / 1000) * 100, 100)}
                            className="h-2"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Security Analysis */}
                    <div>
                      <h4 className="font-medium mb-3">Security Analysis</h4>
                      <div className="flex items-center space-x-3 mb-3">
                        <Shield className="w-5 h-5" />
                        <span className="text-sm font-medium">Risk Level:</span>
                        <Badge className={getRiskColor(testResult.security.riskLevel)}>
                          {testResult.security.riskLevel}
                        </Badge>
                      </div>
                      {testResult.security.violations.length > 0 && (
                        <div className="space-y-2">
                          {testResult.security.violations.map((violation, index) => (
                            <div key={index} className="flex items-center space-x-2 p-2 bg-yellow-50 border border-yellow-200 rounded">
                              <AlertTriangle className="w-4 h-4 text-yellow-600" />
                              <span className="text-sm text-yellow-800">{violation}</span>
                            </div>
                          ))}
                        </div>
                      )}
                      {testResult.security.violations.length === 0 && (
                        <div className="p-2 bg-green-50 border border-green-200 rounded">
                          <CheckCircle className="w-4 h-4 text-green-600 mr-2" />
                          <span className="text-sm text-green-800">No security violations detected</span>
                        </div>
                      )}
                    </div>

                    {/* Errors */}
                    {testResult.errors.length > 0 && (
                      <div>
                        <h4 className="font-medium mb-3 text-red-600">Errors</h4>
                        <div className="space-y-2">
                          {testResult.errors.map((error, index) => (
                            <div key={index} className="p-3 bg-red-50 border border-red-200 rounded">
                              <AlertTriangle className="w-4 h-4 text-red-600" />
                              <span className="text-sm text-red-800">{error}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Warnings */}
                    {testResult.warnings.length > 0 && (
                      <div>
                        <h4 className="font-medium mb-3 text-yellow-600">Warnings</h4>
                        <div className="space-y-2">
                          {testResult.warnings.map((warning, index) => (
                            <div key={index} className="p-3 bg-yellow-50 border border-yellow-200 rounded">
                              <AlertTriangle className="w-4 h-4 text-yellow-600" />
                              <span className="text-sm text-yellow-800">{warning}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}

              {!testResult && (
                <Card>
                  <CardContent className="pt-12 text-center">
                    <Code className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">
                      No Test Results
                    </h3>
                    <p className="text-gray-600">
                      Upload and test a plugin to see results here.
                    </p>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            {/* Code Editor */}
            <TabsContent value="code" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Plugin Code</CardTitle>
                  <CardDescription>
                    View and inspect the plugin source code
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {pluginData ? (
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">Plugin Structure</span>
                        <Button variant="outline" size="sm">
                          <Copy className="w-4 h-4 mr-2" />
                          Copy
                        </Button>
                      </div>
                      <div className="bg-gray-900 text-gray-100 p-4 rounded-lg overflow-x-auto">
                        <pre className="text-xs">
                          <code>{JSON.stringify(pluginData, null, 2)}</code>
                        </pre>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-12">
                      <FileJson className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                      <h3 className="text-lg font-semibold text-gray-900 mb-2">
                        No Code Available
                      </h3>
                      <p className="text-gray-600">
                        Upload a plugin file to view its code.
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>

        {/* Logs Panel */}
        <div>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                Logs
                <Badge variant="secondary">
                  {logs.length} entries
                </Badge>
              </CardTitle>
              <CardDescription>
                Real-time logs from plugin testing and validation
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {logs.length === 0 ? (
                  <div className="text-center py-8">
                    <Terminal className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                    <p className="text-sm text-gray-500">No logs yet</p>
                  </div>
                ) : (
                  logs.map((log) => (
                    <div
                      key={log.id}
                      className="flex items-start space-x-3 p-2 rounded-lg border border-gray-200 bg-white"
                    >
                      {getLogIcon(log.type)}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs font-medium text-gray-900">
                            {log.message}
                          </span>
                          <span className="text-xs text-gray-500">
                            {formatLogTime(log.timestamp)}
                          </span>
                        </div>
                        {log.details && (
                          <div className="text-xs text-gray-600 bg-gray-50 p-2 rounded">
                            {typeof log.details === 'string'
                              ? log.details
                              : JSON.stringify(log.details, null, 2)
                            }
                          </div>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <Card className="mt-4">
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full justify-start"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Upload className="w-4 h-4 mr-2" />
                  Upload Plugin
                </Button>
                {pluginData && (
                  <>
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full justify-start"
                      onClick={handleTestPlugin}
                      disabled={isTesting}
                    >
                      <Play className="w-4 h-4 mr-2" />
                      Test Plugin
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full justify-start"
                      onClick={() => onDownloadPlugin?.(pluginData)}
                    >
                      <Download className="w-4 h-4 mr-2" />
                      Download
                    </Button>
                  </>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

export default PluginSandbox;