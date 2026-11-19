import * as React from 'react';
import { LucideIcon } from 'lucide-react';
import { cn } from '../../lib/utils.js';
import { Button } from './button.js';

export interface EmptyStateProps {
  icon: LucideIcon | React.ReactNode;
  title: string;
  description: string;
  action?: React.ReactNode;
  actionLabel?: string;
  onAction?: () => void;
  className?: string;
}

export function EmptyState({
  icon,
  title,
  description,
  action,
  actionLabel,
  onAction,
  className,
}: EmptyStateProps) {
  const isLucideIcon = typeof icon === 'function';
  const IconComponent = isLucideIcon ? (icon as LucideIcon) : null;

  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center rounded-xl border border-dashed border-border bg-card/40 p-8 text-center sm:p-12',
        className
      )}
    >
      <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-muted text-muted-foreground shadow-sm mb-4">
        {IconComponent ? <IconComponent className="h-6 w-6" /> : (icon as React.ReactNode)}
      </div>
      <h3 className="text-base font-semibold text-foreground tracking-tight">{title}</h3>
      <p className="mt-1.5 max-w-sm text-sm text-muted-foreground leading-relaxed">
        {description}
      </p>
      {action ? (
        <div className="mt-6">{action}</div>
      ) : actionLabel && onAction ? (
        <div className="mt-6">
          <Button onClick={onAction}>{actionLabel}</Button>
        </div>
      ) : null}
    </div>
  );
}
