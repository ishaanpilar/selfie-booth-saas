import { forwardRef, type InputHTMLAttributes, type LabelHTMLAttributes, type ReactNode, type TextareaHTMLAttributes } from "react";
import { cn } from "../lib/cn";

const fieldBaseClasses =
  "w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 " +
  "focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 " +
  "disabled:cursor-not-allowed disabled:opacity-50 " +
  "dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:border-indigo-400";

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  error?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(({ className, error, ...props }, ref) => (
  <input
    ref={ref}
    className={cn(fieldBaseClasses, error && "border-red-500 focus:border-red-500 focus:ring-red-500/20", className)}
    aria-invalid={Boolean(error)}
    {...props}
  />
));
Input.displayName = "Input";

export interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  error?: string;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(({ className, error, ...props }, ref) => (
  <textarea ref={ref} className={cn(fieldBaseClasses, "min-h-24 resize-y", error && "border-red-500", className)} {...props} />
));
Textarea.displayName = "Textarea";

export function FormField({
  label,
  htmlFor,
  error,
  hint,
  children,
  ...props
}: LabelHTMLAttributes<HTMLLabelElement> & { label: string; htmlFor: string; error?: string; hint?: string; children: ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={htmlFor} className="block text-sm font-medium text-slate-700 dark:text-slate-300" {...props}>
        {label}
      </label>
      {children}
      {hint && !error && <p className="text-xs text-slate-500 dark:text-slate-400">{hint}</p>}
      {error && <p className="text-xs text-red-600 dark:text-red-400">{error}</p>}
    </div>
  );
}
