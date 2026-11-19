import * as React from 'react';
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom';
import {
  Building2,
  Check,
  ChevronDown,
  Globe,
  KeyRound,
  LayoutDashboard,
  LogOut,
  Menu,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Users,
  X,
} from 'lucide-react';
import { useAuth } from '../../features/auth/useAuth.js';
import { cn } from '../../lib/utils.js';
import { Badge } from '../ui/badge.js';
import { Spinner } from '../ui/loading.js';

export function DashboardLayout() {
  const {
    user,
    activeOrganization,
    organizations,
    isSuperAdmin,
    switchOrganization,
    isSwitchingOrg,
    logout,
  } = useAuth();

  const [orgDropdownOpen, setOrgDropdownOpen] = React.useState(false);
  const [userDropdownOpen, setUserDropdownOpen] = React.useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = React.useState(false);
  const location = useLocation();

  const dropdownRef = React.useRef<HTMLDivElement>(null);
  const userMenuRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    setMobileSidebarOpen(false);
  }, [location.pathname]);

  // Click outside listener for dropdowns
  React.useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOrgDropdownOpen(false);
      }
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setUserDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const navigation = [
    { name: 'Overview', href: '/dashboard', icon: LayoutDashboard },
    { name: 'Organization', href: '/dashboard/organization', icon: Building2 },
    { name: 'Members', href: '/dashboard/members', icon: Users },
    { name: 'SSO Configuration', href: '/dashboard/sso', icon: KeyRound },
    { name: 'Security & Audit', href: '/dashboard/security', icon: ShieldAlert },
  ];

  return (
    <div className="flex min-h-screen bg-background text-foreground">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex w-64 flex-col border-r border-border bg-card/60">
        {/* Brand */}
        <div className="flex h-16 items-center px-6 border-b border-border">
          <Link to="/" className="flex items-center space-x-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-sm">
              <ShieldCheck className="h-4 w-4" />
            </div>
            <span className="font-bold text-base tracking-tight">SSO IAM Portal</span>
          </Link>
        </div>

        {/* Sidebar Nav */}
        <div className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {navigation.map((item) => {
            const Icon = item.icon;
            const isExact = item.href === '/dashboard';
            const isActive = isExact
              ? location.pathname === '/dashboard'
              : location.pathname.startsWith(item.href);

            return (
              <NavLink
                key={item.name}
                to={item.href}
                className={cn(
                  'flex items-center space-x-3 px-3 py-2.5 text-sm font-medium rounded-lg transition-colors',
                  isActive
                    ? 'bg-primary text-primary-foreground shadow-sm'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                )}
              >
                <Icon className="h-4 w-4 flex-shrink-0" />
                <span>{item.name}</span>
              </NavLink>
            );
          })}
        </div>

        {/* Sidebar Footer Info */}
        <div className="p-4 border-t border-border text-xs text-muted-foreground space-y-1">
          <div className="flex items-center space-x-1.5">
            <Shield className="h-3.5 w-3.5 text-primary" />
            <span className="font-medium text-foreground">Tenant Isolation: RLS Active</span>
          </div>
          <p className="text-[11px] text-muted-foreground">Session context locked to active tenant</p>
        </div>
      </aside>

      {/* Mobile Sidebar Overlay */}
      {mobileSidebarOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          <div
            className="fixed inset-0 bg-background/80 backdrop-blur-sm"
            onClick={() => setMobileSidebarOpen(false)}
          />
          <aside className="relative z-50 w-64 max-w-[80vw] flex flex-col bg-card border-r border-border p-4 shadow-xl">
            <div className="flex items-center justify-between pb-4 border-b border-border">
              <span className="font-bold text-base">SSO IAM Portal</span>
              <button
                type="button"
                onClick={() => setMobileSidebarOpen(false)}
                className="p-1 rounded-md text-muted-foreground hover:text-foreground"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <nav className="mt-4 space-y-1 flex-1">
              {navigation.map((item) => {
                const Icon = item.icon;
                const isExact = item.href === '/dashboard';
                const isActive = isExact
                  ? location.pathname === '/dashboard'
                  : location.pathname.startsWith(item.href);

                return (
                  <NavLink
                    key={item.name}
                    to={item.href}
                    className={cn(
                      'flex items-center space-x-3 px-3 py-2 text-sm font-medium rounded-md transition-colors',
                      isActive
                        ? 'bg-primary text-primary-foreground'
                        : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                    )}
                  >
                    <Icon className="h-4 w-4" />
                    <span>{item.name}</span>
                  </NavLink>
                );
              })}
            </nav>
          </aside>
        </div>
      )}

      {/* Main Content Surface */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top Header with Organization Switcher */}
        <header className="sticky top-0 z-40 flex h-16 items-center justify-between border-b border-border bg-card/80 backdrop-blur-md px-4 sm:px-6">
          <div className="flex items-center space-x-3">
            {/* Mobile menu toggle */}
            <button
              type="button"
              className="lg:hidden p-2 text-muted-foreground hover:text-foreground"
              onClick={() => setMobileSidebarOpen(true)}
            >
              <Menu className="h-5 w-5" />
            </button>

            {/* ========================================================================= */}
            {/* ORGANIZATION SWITCHER DROPDOWN */}
            {/* ========================================================================= */}
            <div className="relative" ref={dropdownRef}>
              <button
                type="button"
                aria-label={`Switch Organization - ${activeOrganization?.organizationName || 'Select Organization'}`}
                onClick={() => setOrgDropdownOpen(!orgDropdownOpen)}
                disabled={isSwitchingOrg}
                className="flex items-center space-x-2.5 rounded-lg border border-border bg-background px-3 py-1.5 text-sm font-medium hover:bg-muted/50 transition-colors focus:outline-none focus:ring-2 focus:ring-ring"
                aria-expanded={orgDropdownOpen}
                aria-haspopup="listbox"
              >
                <Building2 className="h-4 w-4 text-primary" />
                <div className="flex flex-col text-left">
                  <span className="font-semibold text-xs leading-none">
                    {activeOrganization?.organizationName || 'Select Organization'}
                  </span>
                  <span className="text-[10px] text-muted-foreground mt-0.5">
                    {activeOrganization?.organizationSlug ? `@${activeOrganization.organizationSlug}` : ''}
                  </span>
                </div>
                {isSwitchingOrg ? (
                  <Spinner className="h-3.5 w-3.5 ml-1" />
                ) : (
                  <ChevronDown className="h-3.5 w-3.5 text-muted-foreground ml-1" />
                )}
              </button>

              {orgDropdownOpen && (
                <div className="absolute left-0 mt-2 w-72 rounded-xl border border-border bg-card p-2 shadow-xl z-50 animate-in fade-in-0 zoom-in-95">
                  <div className="px-2 py-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Your Organizations ({organizations.length})
                  </div>
                  <div className="mt-1 space-y-1 max-h-60 overflow-y-auto">
                    {organizations.map((org) => {
                      const isCurrent = org.organizationId === activeOrganization?.organizationId;
                      return (
                        <button
                          key={org.organizationId}
                          type="button"
                          onClick={async () => {
                            if (!isCurrent) {
                              setOrgDropdownOpen(false);
                              await switchOrganization(org.organizationId);
                            } else {
                              setOrgDropdownOpen(false);
                            }
                          }}
                          className={cn(
                            'w-full flex items-center justify-between px-3 py-2 rounded-lg text-left text-sm transition-colors',
                            isCurrent
                              ? 'bg-primary/10 text-primary font-semibold'
                              : 'hover:bg-muted text-foreground'
                          )}
                        >
                          <div className="flex flex-col">
                            <span className="font-medium">{org.organizationName}</span>
                            <span className="text-xs text-muted-foreground">@{org.organizationSlug}</span>
                          </div>
                          <div className="flex items-center space-x-1.5">
                            {org.roles.length > 0 && (
                              <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                                {org.roles[0]}
                              </Badge>
                            )}
                            {isCurrent && <Check className="h-4 w-4 text-primary" />}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* User profile, SuperAdmin status & Logout */}
          <div className="flex items-center space-x-3">
            {isSuperAdmin && (
              <Badge variant="warning" className="hidden sm:inline-flex text-[11px]">
                Platform SuperAdmin
              </Badge>
            )}

            <Link to="/" className="hidden sm:flex text-xs text-muted-foreground hover:text-foreground items-center space-x-1">
              <Globe className="h-3.5 w-3.5" />
              <span>Public Website</span>
            </Link>

            {/* User Dropdown */}
            <div className="relative" ref={userMenuRef}>
              <button
                type="button"
                aria-label="User menu"
                onClick={() => setUserDropdownOpen(!userDropdownOpen)}
                className="flex items-center space-x-2 rounded-full border border-border p-1 hover:bg-muted transition-colors focus:outline-none focus:ring-2 focus:ring-ring"
              >
                <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/10 text-primary font-semibold text-xs">
                  {user?.firstName?.[0] || user?.email?.[0]?.toUpperCase() || 'U'}
                </div>
              </button>

              {userDropdownOpen && (
                <div className="absolute right-0 mt-2 w-56 rounded-xl border border-border bg-card p-2 shadow-xl z-50 animate-in fade-in-0 zoom-in-95">
                  <div className="px-3 py-2 border-b border-border">
                    <p className="text-sm font-semibold text-foreground truncate">
                      {user?.firstName && user?.lastName
                        ? `${user.firstName} ${user.lastName}`
                        : user?.email}
                    </p>
                    <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
                  </div>
                  <div className="mt-2 space-y-1">
                    <button
                      type="button"
                      onClick={() => {
                        setUserDropdownOpen(false);
                        logout();
                      }}
                      className="w-full flex items-center space-x-2 px-3 py-2 rounded-lg text-sm text-destructive hover:bg-destructive/10 transition-colors"
                    >
                      <LogOut className="h-4 w-4" />
                      <span>Sign Out</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Dashboard Views */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

