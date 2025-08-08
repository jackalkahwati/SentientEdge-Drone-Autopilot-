"use client";

import React from "react";

export const Badge: React.FC<{ variant?: "default" | "outline" | "secondary" | "destructive"; className?: string; children: React.ReactNode } & React.HTMLAttributes<HTMLSpanElement>> = ({ variant = "default", className = "", children, ...props }) => (
  <span
    className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium ${
      variant === "outline"
        ? "border"
        : variant === "secondary"
        ? "bg-secondary text-secondary-foreground"
        : variant === "destructive"
        ? "bg-red-600 text-white"
        : "bg-accent text-accent-foreground"
    } ${className}`}
    {...props}
  >
    {children}
  </span>
);


