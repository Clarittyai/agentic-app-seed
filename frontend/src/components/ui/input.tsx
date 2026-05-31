import type { InputHTMLAttributes, TextareaHTMLAttributes, LabelHTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

const base =
  'w-full rounded-xl border border-border bg-card px-3.5 text-sm text-foreground outline-none ' +
  'transition-colors placeholder:text-muted-foreground focus:border-accent disabled:opacity-50';

export function Input({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={cn('h-10', base, className)} {...props} />;
}

export function Textarea({ className, ...props }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={cn('min-h-[80px] resize-y py-2.5', base, className)} {...props} />;
}

export function Label({ className, ...props }: LabelHTMLAttributes<HTMLLabelElement>) {
  return <label className={cn('mb-1.5 block text-xs font-medium text-muted-foreground', className)} {...props} />;
}
