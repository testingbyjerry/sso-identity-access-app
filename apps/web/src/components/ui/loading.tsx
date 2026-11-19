import { Loader2 } from 'lucide-react';
import { cn } from '../../lib/utils.js';

export function Spinner({ className, size }: { className?: string; size?: string | number }) {
  const sizeClass = size ? `h-${size} w-${size}` : '';
  return <Loader2 className={cn('h-5 w-5 animate-spin text-primary', sizeClass, className)} />;
}

export function PageLoader({
  message,
  text = message || 'Loading...',
}: {
  message?: string;
  text?: string;
}) {
  return (
    <div className="flex min-h-[400px] w-full flex-col items-center justify-center space-y-3">
      <Spinner className="h-8 w-8 text-primary" />
      <p className="text-sm font-medium text-muted-foreground">{text}</p>
    </div>
  );
}

export function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn('animate-pulse rounded-md bg-muted/60', className)}
      {...props}
    />
  );
}
