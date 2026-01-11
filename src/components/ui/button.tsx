import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-full text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 active:scale-[0.98] touch-manipulation",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm", // Filled button
        filled: "bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm",
        tonal: "bg-secondary/20 text-secondary-foreground hover:bg-secondary/30",
        elevated: "bg-background text-foreground shadow-sm hover:shadow-md border border-border/60",
        outline: "border border-border bg-transparent text-foreground hover:bg-primary/5",
        secondary: "bg-secondary/20 text-secondary-foreground hover:bg-secondary/30",
        ghost: "bg-transparent text-foreground hover:bg-primary/5",
        link: "text-primary underline-offset-4 hover:underline px-0", // textual action
        destructive: "bg-destructive text-destructive-foreground hover:bg-destructive/90",
      },
      size: {
        default: "h-10 min-h-[44px] px-4 py-2 md:min-h-[40px]",
        sm: "h-9 min-h-[40px] rounded-full px-3",
        lg: "h-11 min-h-[48px] rounded-full px-6",
        icon: "h-10 w-10 min-h-[44px] min-w-[44px] rounded-full",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);


export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />;
  },
);
Button.displayName = "Button";

export { Button, buttonVariants };
