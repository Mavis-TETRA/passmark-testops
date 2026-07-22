
import React from "react";
import { cn } from "../../lib/cn";

type Variant = "primary" | "secondary" | "ghost" | "danger" | "outline";
type Size = "sm" | "md";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
}

const variants: Record<Variant, string> = {
  primary:
  "bg-accent text-accent-fg hover:opacity-90 border border-transparent",
  secondary:
  "bg-surface-2 text-ink hover:bg-line border border-line",
  outline:
  "bg-transparent text-ink hover:bg-surface-2 border border-line-strong",
  ghost: "bg-transparent text-ink-2 hover:bg-surface-2 hover:text-ink border border-transparent",
  danger:
  "bg-[rgb(var(--fail))] text-white hover:opacity-90 border border-transparent"
};

const sizes: Record<Size, string> = {
  sm: "h-8 px-2.5 text-xs gap-1.5 rounded-md",
  md: "h-9 px-3.5 text-sm gap-2 rounded-lg"
};

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = "secondary", size = "md", className, children, ...props }, ref) =>
  <button
    ref={ref}
    className={cn(
      "inline-flex items-center justify-center whitespace-nowrap font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-surface",
      "disabled:pointer-events-none disabled:opacity-50 select-none",
      variants[variant],
      sizes[size],
      className
    )}
    {...props}>
    
      {children}
    </button>

);
Button.displayName = "Button";

