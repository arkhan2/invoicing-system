"use client";

import type { ButtonHTMLAttributes } from "react";

type Variant = "primary" | "secondary" | "danger";

const variantClass: Record<Variant, string> = {
  primary: "btn btn-primary btn-icon",
  secondary: "btn btn-secondary btn-icon",
  danger: "btn btn-danger btn-icon",
};

export interface IconButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, "children"> {
  variant?: Variant;
  icon: React.ReactNode;
  label: string;
  className?: string;
}

export function IconButton({
  variant = "secondary",
  icon,
  label,
  className = "",
  type = "button",
  ...props
}: IconButtonProps) {
  return (
    <button
      type={type}
      className={`${variantClass[variant]} ${className}`.trim()}
      aria-label={label}
      title={label}
      {...props}
    >
      {icon}
    </button>
  );
}
