import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import App from '../src/App.js';

describe('App Root and Marketing Experience', () => {
  it('renders enterprise SSO platform branding and header', () => {
    render(<App />);
    expect(screen.getAllByText(/SSO IAM Platform/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/Multi-Tenant Identity Management/i)).toBeInTheDocument();
  });

  it('renders navigation links and call to actions', () => {
    render(<App />);
    expect(screen.getByRole('link', { name: /Features/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Solutions/i })).toBeInTheDocument();
    expect(screen.getAllByRole('link', { name: /Enterprise SSO/i }).length).toBeGreaterThan(0);
  });
});
