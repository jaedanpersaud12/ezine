import { Button as ButtonPrimitive } from "@base-ui/react/button";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "group/button inline-flex shrink-0 items-center justify-center gap-2 rounded-md border border-transparent bg-clip-padding text-sm font-medium whitespace-nowrap transition-[color,background-color,border-color,box-shadow,scale] duration-150 ease-out outline-none select-none focus-visible:border-ring focus-visible:ring-1 focus-visible:ring-ring active:not-disabled:scale-[0.96] disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-primary/90",
        outline: "border-border bg-card text-card-foreground hover:bg-accent hover:text-accent-foreground",
        secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/80",
        ghost: "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
        destructive: "bg-destructive text-destructive-foreground hover:bg-destructive/90",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default:
          "px-4 py-2 has-data-[icon=inline-end]:pe-3.5 has-data-[icon=inline-start]:ps-3.5",
        sm: "px-3 py-2 text-xs has-data-[icon=inline-end]:pe-2.5 has-data-[icon=inline-start]:ps-2.5",
        lg: "px-6 py-3 has-data-[icon=inline-end]:pe-5.5 has-data-[icon=inline-start]:ps-5.5",
        icon: "size-9",
        /** Row actions and dialog close buttons — the sizes shadcn's own dialog, sheet and sidebar reach for. */
        "icon-sm": "size-8",
        "icon-xs": "size-6 rounded-sm [&_svg:not([class*='size-'])]:size-3.5",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

/**
 * Mark a leading or trailing icon with `data-icon="inline-start"` / `"inline-end"`
 * for optical padding.
 *
 * For a link that looks like a button, put `buttonVariants()` on the link itself
 * (`<Link className={buttonVariants()}>`). Rendering a link through this component with
 * `nativeButton={false}` makes Base UI add `role="button"`, so screen readers announce it as a
 * button and it drops out of the links list.
 */
function Button({
  className,
  variant = "default",
  size = "default",
  ...props
}: ButtonPrimitive.Props & VariantProps<typeof buttonVariants>) {
  return (
    <ButtonPrimitive
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  );
}

export { Button, buttonVariants };
