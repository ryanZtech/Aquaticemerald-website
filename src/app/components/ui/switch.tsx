"use client";

import * as React from "react";

import { cn } from "./utils";

type SwitchProps = {
  checked?: boolean;
  onCheckedChange?: (checked: boolean) => void;
  className?: string;
} & Omit<
  React.InputHTMLAttributes<HTMLInputElement>,
  "type" | "checked" | "defaultChecked" | "onChange" | "className"
>;

/**
 * Toggle switch built on a real checkbox (styling lives in `.toggle` in
 * styles/theme.css). Clicking the track — or pressing Space on the focused
 * checkbox — flips the state.
 */
function Switch({
  className,
  checked,
  onCheckedChange,
  id,
  disabled,
  ...props
}: SwitchProps) {
  const autoId = React.useId();
  const inputId = id ?? autoId;
  return (
    <span className={cn("toggle inline-block", className)}>
      <input
        type="checkbox"
        id={inputId}
        checked={checked}
        disabled={disabled}
        onChange={(e) => onCheckedChange?.(e.target.checked)}
        {...props}
      />
      <label htmlFor={inputId} />
    </span>
  );
}

export { Switch };
