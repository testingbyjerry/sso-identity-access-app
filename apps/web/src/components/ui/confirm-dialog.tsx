import * as React from 'react';
import { AlertTriangle } from 'lucide-react';
import { Button } from './button.js';
import { Dialog } from './dialog.js';

export interface ConfirmDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  description: React.ReactNode;
  confirmText?: string;
  confirmLabel?: string;
  cancelText?: string;
  cancelLabel?: string;
  variant?: 'destructive' | 'default';
  isLoading?: boolean;
}

export function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  description,
  confirmText = 'Confirm',
  confirmLabel,
  cancelText = 'Cancel',
  cancelLabel,
  variant = 'destructive',
  isLoading = false,
}: ConfirmDialogProps) {
  const finalConfirmText = confirmLabel || confirmText;
  const finalCancelText = cancelLabel || cancelText;

  return (
    <Dialog
      open={open}
      onClose={isLoading ? () => {} : onClose}
      maxWidth="sm"
      footer={
        <>
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={isLoading}
          >
            {finalCancelText}
          </Button>
          <Button
            type="button"
            variant={variant}
            onClick={onConfirm}
            disabled={isLoading}
          >
            {isLoading ? 'Processing...' : finalConfirmText}
          </Button>
        </>
      }
    >
      <div className="flex items-start space-x-3">
        {variant === 'destructive' && (
          <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-destructive/10 text-destructive">
            <AlertTriangle className="h-5 w-5" />
          </div>
        )}
        <div className="space-y-1">
          <h3 className="text-base font-semibold text-foreground">{title}</h3>
          <div className="text-sm text-muted-foreground">{description}</div>
        </div>
      </div>
    </Dialog>
  );
}
