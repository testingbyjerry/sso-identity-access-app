import * as React from 'react';
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom';
import { Menu, ShieldCheck, X } from 'lucide-react';
import { Button } from '../ui/button.js';
import { cn } from '../../lib/utils.js';

export function PublicLayout() {
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);
  const location = useLocation();

  React.useEffect(() => {
    setMobileMenuOpen(false);
  }, [location.pathname]);

  const navLinks = [
    { label: 'Home', href: '/' },
    { label: 'Features', href: '/features' },
    { label: 'Solutions', href: '/solutions' },
    { label: 'About', href: '/about' },
    { label: 'Contact', href: '/contact' },
  ];

  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      {/* Reusable Public Header */}
      <header className="sticky top-0 z-50 border-b border-border bg-card/80 backdrop-blur-md">
        <div className="container mx-auto flex h-16 items-center justify-between px-4 sm:px-6">
          {/* Logo */}
          <Link to="/" className="flex items-center space-x-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-sm">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <span className="text-lg font-bold tracking-tight">SSO IAM Platform</span>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center space-x-6 text-sm font-medium">
            {navLinks.map((link) => (
              <NavLink
                key={link.href}
                to={link.href}
                className={({ isActive }) =>
                  cn(
                    'transition-colors hover:text-foreground',
                    isActive ? 'text-primary font-semibold' : 'text-muted-foreground'
                  )
                }
              >
                {link.label}
              </NavLink>
            ))}
          </nav>

          {/* Desktop Auth CTAs */}
          <div className="hidden md:flex items-center space-x-3">
            <Link to="/login">
              <Button variant="ghost" size="sm">
                Sign In
              </Button>
            </Link>
            <Link to="/login/sso">
              <Button size="sm">Enterprise SSO</Button>
            </Link>
          </div>

          {/* Mobile menu toggle button */}
          <button
            type="button"
            className="md:hidden p-2 text-muted-foreground hover:text-foreground"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label="Toggle Navigation"
          >
            {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>

        {/* Mobile menu dropdown */}
        {mobileMenuOpen && (
          <div className="border-b border-border bg-card px-4 py-4 md:hidden animate-in fade-in-50">
            <nav className="flex flex-col space-y-3">
              {navLinks.map((link) => (
                <NavLink
                  key={link.href}
                  to={link.href}
                  className={({ isActive }) =>
                    cn(
                      'px-2 py-1.5 text-sm font-medium rounded-md transition-colors',
                      isActive ? 'bg-muted text-primary font-semibold' : 'text-muted-foreground'
                    )
                  }
                >
                  {link.label}
                </NavLink>
              ))}
              <div className="pt-3 border-t border-border flex flex-col space-y-2">
                <Link to="/login" className="w-full">
                  <Button variant="outline" className="w-full" size="sm">
                    Sign In
                  </Button>
                </Link>
                <Link to="/login/sso" className="w-full">
                  <Button className="w-full" size="sm">
                    Enterprise SSO
                  </Button>
                </Link>
              </div>
            </nav>
          </div>
        )}
      </header>

      {/* Main Surface */}
      <main className="flex-1">
        <Outlet />
      </main>

      {/* Reusable Public Footer */}
      <footer className="border-t border-border bg-card/60 py-12 text-muted-foreground">
        <div className="container mx-auto px-4 sm:px-6">
          <div className="grid grid-cols-1 gap-8 md:grid-cols-4">
            <div className="space-y-3">
              <div className="flex items-center space-x-2">
                <ShieldCheck className="h-5 w-5 text-primary" />
                <span className="font-bold text-foreground">SSO IAM Platform</span>
              </div>
              <p className="text-xs leading-relaxed max-w-xs">
                Production-grade multi-tenant Single Sign-On and Identity Access Management architecture
                for modern cloud SaaS applications.
              </p>
            </div>

            <div>
              <h4 className="text-xs font-semibold uppercase tracking-wider text-foreground mb-3">
                Product
              </h4>
              <ul className="space-y-2 text-xs">
                <li>
                  <Link to="/features" className="hover:text-foreground">
                    Enterprise SSO (OIDC/SAML)
                  </Link>
                </li>
                <li>
                  <Link to="/features" className="hover:text-foreground">
                    Directory & JIT Provisioning
                  </Link>
                </li>
                <li>
                  <Link to="/features" className="hover:text-foreground">
                    Multi-Tenant RBAC
                  </Link>
                </li>
                <li>
                  <Link to="/features" className="hover:text-foreground">
                    Session Security & Audit Trail
                  </Link>
                </li>
              </ul>
            </div>

            <div>
              <h4 className="text-xs font-semibold uppercase tracking-wider text-foreground mb-3">
                Solutions
              </h4>
              <ul className="space-y-2 text-xs">
                <li>
                  <Link to="/solutions" className="hover:text-foreground">
                    B2B SaaS Multi-Tenancy
                  </Link>
                </li>
                <li>
                  <Link to="/solutions" className="hover:text-foreground">
                    Microsoft Entra ID Federation
                  </Link>
                </li>
                <li>
                  <Link to="/solutions" className="hover:text-foreground">
                    Okta Universal Directory
                  </Link>
                </li>
                <li>
                  <Link to="/solutions" className="hover:text-foreground">
                    Row-Level Tenant Isolation
                  </Link>
                </li>
              </ul>
            </div>

            <div>
              <h4 className="text-xs font-semibold uppercase tracking-wider text-foreground mb-3">
                Platform
              </h4>
              <ul className="space-y-2 text-xs">
                <li>
                  <Link to="/about" className="hover:text-foreground">
                    Architecture Overview
                  </Link>
                </li>
                <li>
                  <Link to="/contact" className="hover:text-foreground">
                    Contact & Inquiries
                  </Link>
                </li>
                <li>
                  <Link to="/login" className="hover:text-foreground">
                    Organization Login
                  </Link>
                </li>
                <li>
                  <Link to="/login/sso" className="hover:text-foreground">
                    Enterprise Discovery
                  </Link>
                </li>
              </ul>
            </div>
          </div>

          <div className="mt-8 border-t border-border pt-6 flex flex-col sm:flex-row items-center justify-between text-xs">
            <p>© {new Date().getFullYear()} SSO IAM Platform. Modular Monolith Architecture.</p>
            <p className="mt-2 sm:mt-0 font-mono text-[11px]">
              Argon2id · AES-256-GCM · OIDC PKCE · PostgreSQL RLS
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
