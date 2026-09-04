import Link from "next/link";
import type {
  AnchorHTMLAttributes,
  ButtonHTMLAttributes,
  ReactNode,
} from "react";
import { cn } from "@/lib/cn";

type Variant = "solid" | "soft" | "outline" | "ghost" | "light";
type Size = "sm" | "md" | "lg";

const base =
  "inline-flex items-center justify-center rounded-full font-semibold transition-colors focus:outline-none disabled:opacity-60";

const variants: Record<Variant, string> = {
  solid: "bg-red-600 text-white hover:bg-red-700",
  soft: "border border-red-300 bg-pink-50 text-white hover:bg-pink-100",
  outline: "border border-red-200 bg-white text-white hover:bg-red-50",
  ghost: "text-white hover:bg-red-50",
  light: "bg-white text-white hover:bg-pink-100",
};

const sizes: Record<Size, string> = {
  sm: "px-4 py-2 text-sm",
  md: "px-6 py-3 text-sm",
  lg: "px-6 py-3 text-base",
};

const activeClass =
  "bg-red-600 text-white shadow-md shadow-red-200 hover:bg-red-700";

type CommonProps = {
  variant?: Variant;
  size?: Size;
  fullWidth?: boolean;
  active?: boolean;
  className?: string;
  children?: ReactNode;
};

type ButtonAsButton = CommonProps &
  Omit<ButtonHTMLAttributes<HTMLButtonElement>, keyof CommonProps> & {
    href?: undefined;
  };

type ButtonAsLink = CommonProps &
  Omit<AnchorHTMLAttributes<HTMLAnchorElement>, keyof CommonProps> & {
    href: string;
  };

type ButtonProps = ButtonAsButton | ButtonAsLink;

export default function Button(props: ButtonProps) {
  const {
    variant = "solid",
    size = "md",
    fullWidth = false,
    active = false,
    className,
    children,
    ...rest
  } = props;

  const classes = cn(
    base,
    active ? activeClass : variants[variant],
    sizes[size],
    fullWidth && "w-full",
    className
  );

  if (props.href !== undefined) {
    const { href, ...anchorRest } = rest as AnchorHTMLAttributes<HTMLAnchorElement>;
    return (
      <Link href={href!} className={classes} {...anchorRest}>
        {children}
      </Link>
    );
  }

  return (
    <button className={classes} {...(rest as ButtonHTMLAttributes<HTMLButtonElement>)}>
      {children}
    </button>
  );
}
