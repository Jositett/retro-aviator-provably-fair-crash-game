import React, { useState, useEffect } from 'react';
import { AlertTriangle, RefreshCw, Home, Wifi, WifiOff, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

export interface ErrorFallbackProps {
  title?: string;
  message?: string;
  error?: Error | any;
  onRetry?: () => void;
  onGoHome?: () => void;
  showErrorDetails?: boolean;
  statusMessage?: string;
  isOffline?: boolean;
}

export function ErrorFallback({
  title = "Oops! Something went wrong",
  message = "We're aware of the issue and actively working to fix it. Your experience matters to us.",
  error,
  onRetry,
  onGoHome,
  showErrorDetails = true,
  statusMessage = "Our team has been notified",
  isOffline = false
}: ErrorFallbackProps) {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [showReport, setShowReport] = useState(false);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const handleRetry = () => {
    if (onRetry) {
      onRetry();
    } else {
      window.location.reload();
    }
  };

  const handleGoHome = () => {
    if (onGoHome) {
      onGoHome();
    } else {
      window.location.href = '/';
    }
  };

  const handleReport = () => {
    const report = {
      message: error?.message || 'Unknown error',
      stack: error?.stack,
      componentStack: error?.componentStack,
      timestamp: new Date().toISOString(),
      url: window.location.href,
      userAgent: navigator.userAgent,
      online: navigator.onLine,
      referrer: document.referrer,
      viewport: `${window.innerWidth}x${window.innerHeight}`
    };
    
    navigator.clipboard.writeText(JSON.stringify(report, null, 2)).then(() => {
      setShowReport(true);
      setTimeout(() => setShowReport(false), 3000);
    });
  };

  const isNetworkError = isOffline || (!isOnline && error?.message?.includes('fetch'));

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-md">
        {/* Animated background gradient */}
        <div className="absolute inset-0 bg-gradient-rainbow opacity-5 dark:opacity-10" />
        
        {/* Error card */}
        <Card className="relative backdrop-blur-sm shadow-2xl">
          <CardContent className="p-8 space-y-6">
            {/* Icon and title */}
            <div className="text-center space-y-4">
              <div className="mx-auto w-16 h-16 rounded-2xl bg-destructive/10 flex items-center justify-center">
                {isNetworkError ? (
                  <WifiOff className="w-8 h-8 text-destructive" />
                ) : (
                  <AlertTriangle className="w-8 h-8 text-destructive" />
                )}
              </div>
              <h1 className="text-2xl font-bold">
                {isNetworkError ? "Connection Lost" : title}
              </h1>
              <p className="text-muted-foreground">
                {isNetworkError 
                  ? "You are currently offline. Please check your internet connection and try again."
                  : message
                }
              </p>
            </div>

            {/* Connection status indicator */}
            {isNetworkError && (
              <div className="flex items-center justify-center gap-2 text-sm">
                <div className={`w-2 h-2 rounded-full ${isOnline ? 'bg-green-500' : 'bg-red-500'} animate-pulse`} />
                <span className={isOnline ? 'text-green-500' : 'text-red-500'}>
                  {isOnline ? 'Reconnecting...' : 'Offline'}
                </span>
              </div>
            )}

            {/* Status indicator */}
            {!isNetworkError && statusMessage && (
              <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                <div className="w-2 h-2 rounded-full bg-orange-500 animate-pulse" />
                <span>{statusMessage}</span>
              </div>
            )}

            {/* Action buttons */}
            <div className="space-y-3">
              {isNetworkError ? (
                <Button onClick={handleRetry} className="w-full bg-amber-500 hover:bg-amber-400 text-black font-bold">
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Retry Connection
                </Button>
              ) : (
                <Button onClick={handleRetry} className="w-full">
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Try Again
                </Button>
              )}
              <Button onClick={handleGoHome} variant="secondary" className="w-full">
                <Home className="w-4 h-4 mr-2" />
                Go to Homepage
              </Button>
              {!isNetworkError && (
                <Button onClick={handleReport} variant="outline" className="w-full">
                  <ExternalLink className="w-4 h-4 mr-2" />
                  {showReport ? "Copied!" : "Copy Error Report"}
                </Button>
              )}
            </div>

            {/* Error details (collapsible) */}
            {showErrorDetails && error && (
              <details className="mt-6 p-4 bg-muted/50 rounded-lg">
                <summary className="cursor-pointer text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
                  Error details
                </summary>
                <pre className="mt-3 text-xs overflow-auto max-h-40 text-muted-foreground">
                  {error.message || error.toString()}
                  {error.stack && '\n\n' + error.stack + '\n\n' + error.componentStack}
                </pre>
              </details>
            )}
          </CardContent>
        </Card>

        {/* Support text */}
        <p className="text-center text-sm text-muted-foreground mt-6">
          {isNetworkError 
            ? "The game requires an active internet connection to function properly."
            : "If this problem persists, please contact our support team"
          }
        </p>
      </div>
    </div>
  );
}
