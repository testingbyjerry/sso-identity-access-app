import React from 'react';
import { ShieldCheck, Activity, Server, ExternalLink } from 'lucide-react';
import { useSystemHealth } from '../../api/health.js';
import { useAppStore } from '../../store/useAppStore.js';
import { Badge } from '../ui/badge.js';

interface AppShellProps {
  children: React.ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  const { isLoading, isError } = useSystemHealth();
  const { activeTenantName } = useAppStore();

  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      {/* Top Navigation Bar */}
      <header className="sticky top-0 z-50 border-b border-border bg-card/80 backdrop-blur-md">
        <div className="container mx-auto flex h-16 items-center justify-between px-4 sm:px-6">
          {/* Logo & Branding */}
          <div className="flex items-center space-x-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-sm">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div>
              <span className="font-bold text-base tracking-tight sm:text-lg">
                SSO IAM Platform
              </span>
              <span className="ml-2 text-xs font-mono text-muted-foreground hidden sm:inline">
                v1.0.0
              </span>
            </div>
          </div>

          {/* Active Tenant & System Status */}
          <div className="flex items-center space-x-3 sm:space-x-4">
            {activeTenantName && (
              <div className="hidden md:flex items-center space-x-1.5 text-xs">
                <span className="text-muted-foreground">Tenant:</span>
                <Badge variant="outline" className="font-medium">
                  {activeTenantName}
                </Badge>
              </div>
            )}

            {/* Live API Health Status */}
            <div className="flex items-center space-x-2 text-xs">
              {isLoading ? (
                <Badge variant="secondary" className="animate-pulse">
                  <Activity className="mr-1 h-3 w-3 animate-spin" />
                  Connecting API...
                </Badge>
              ) : isError ? (
                <Badge variant="destructive">
                  <Server className="mr-1 h-3 w-3" />
                  API Offline
                </Badge>
              ) : (
                <Badge variant="success">
                  <span className="mr-1.5 inline-block h-2 w-2 rounded-full bg-emerald-500 animate-ping" />
                  API Online
                </Badge>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 container mx-auto px-4 py-8 sm:px-6 sm:py-10">{children}</main>

      {/* Footer */}
      <footer className="border-t border-border bg-card py-6 text-xs text-muted-foreground">
        <div className="container mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 px-4 sm:px-6">
          <p>
            &copy; 2026 SSO &amp; Identity Access Management Platform. Modular Monolith
            Architecture.
          </p>
          <div className="flex items-center space-x-4">
            <a
              href="http://localhost:3000/docs"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center hover:text-foreground transition-colors"
            >
              OpenAPI Swagger UI
              <ExternalLink className="ml-1 h-3 w-3" />
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
