import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium transition-colors",
  {
    variants: {
      variant: {
        default:
          "border border-blue-200 bg-blue-50 text-blue-700",
        secondary:
          "border border-slate-200 bg-slate-100 text-slate-700",
        success:
          "border border-emerald-200 bg-emerald-50 text-emerald-700",
        warning:
          "border border-amber-200 bg-amber-50 text-amber-700",
        destructive:
          "border border-rose-200 bg-rose-50 text-rose-700",
        outline:
          "border border-slate-300 text-slate-700 bg-transparent",
        navy:
          "border border-slate-700 bg-slate-900 text-slate-100",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}

export { Badge, badgeVariants };
