import * as React from 'react';
import { AlertCircle, AlertTriangle, CheckCircle2, Info, X } from 'lucide-react';
import { cn } from '../../lib/utils.js';

export interface AlertProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'info' | 'success' | 'warning' | 'destructive';
  title?: string;
  onClose?: () => void;
}

export function Alert({
  className,
  variant = 'default',
  title,
  children,
  onClose,
  ...props
}: AlertProps) {
  const icons = {
    default: <Info className="h-4 w-4 text-foreground" />,
    info: <Info className="h-4 w-4 text-blue-600 dark:text-blue-400" />,
    success: <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />,
    warning: <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400" />,
    destructive: <AlertCircle className="h-4 w-4 text-destructive" />,
  };

  const variants = {
    default: 'bg-muted/50 border-border text-foreground',
    info: 'bg-blue-500/10 border-blue-500/20 text-blue-900 dark:text-blue-200',
    success: 'bg-emerald-500/10 border-emerald-500/20 text-emerald-900 dark:text-emerald-200',
    warning: 'bg-amber-500/10 border-amber-500/20 text-amber-900 dark:text-amber-200',
    destructive: 'bg-destructive/10 border-destructive/20 text-destructive',
  };

  return (
    <div
      role="alert"
      className={cn(
        'relative w-full rounded-lg border p-4 text-sm [&>svg~*]:pl-7 [&>svg+div]:translate-y-[-3px] [&>svg]:absolute [&>svg]:left-4 [&>svg]:top-4',
        variants[variant],
        className
      )}
      {...props}
    >
      {icons[variant]}
      <div className="flex-1">
        {title && <h5 className="mb-1 font-medium leading-none tracking-tight">{title}</h5>}
        <div className="text-sm [&_p]:leading-relaxed">{children}</div>
      </div>
      {onClose && (
        <button
          type="button"
          onClick={onClose}
          className="absolute top-3 right-3 text-muted-foreground hover:text-foreground"
          aria-label="Dismiss alert"
        >
          <X className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}
