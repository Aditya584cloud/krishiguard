import type { ButtonHTMLAttributes } from "react";
import { RefreshCw } from "./icons";

const VARIANTS = {
  primary: "bg-leaf-600 text-white active:bg-leaf-700 disabled:bg-soil-200 disabled:text-soil-400",
  secondary: "bg-soil-100 text-soil-800 active:bg-soil-200",
  ghost: "bg-transparent text-leaf-700 active:bg-leaf-50",
  danger: "bg-danger-600 text-white active:bg-danger-700",
} as const;

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: keyof typeof VARIANTS;
  loading?: boolean;
  loadingLabel?: string;
  fullWidth?: boolean;
}

export function Button({
  variant = "primary",
  loading,
  loadingLabel = "Working…",
  fullWidth,
  className = "",
  children,
  disabled,
  ...rest
}: ButtonProps) {
  return (
    <button
      className={`flex min-h-11 items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition-colors disabled:cursor-not-allowed ${VARIANTS[variant]} ${fullWidth ? "w-full" : ""} ${className}`}
      disabled={disabled || loading}
      {...rest}
    >
      {loading && <RefreshCw className="h-4 w-4 animate-spin" />}
      {loading ? loadingLabel : children}
    </button>
  );
}
