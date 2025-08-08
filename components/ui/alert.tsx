"use client";

import React from "react";

export const Alert: React.FC<{ variant?: "default" | "destructive" } & React.HTMLAttributes<HTMLDivElement>> = ({ variant = "default", className = "", children, ...props }) => (
  <div className={`w-full rounded-md border p-4 ${variant === "destructive" ? "border-red-600 bg-red-50" : ""} ${className}`} role="alert" {...props}>
    {children}
  </div>
);

export const AlertTitle: React.FC<React.HTMLAttributes<HTMLHeadingElement>> = ({ className = "", children, ...props }) => (
  <h5 className={`mb-1 font-semibold ${className}`} {...props}>{children}</h5>
);

export const AlertDescription: React.FC<React.HTMLAttributes<HTMLParagraphElement>> = ({ className = "", children, ...props }) => (
  <p className={`text-sm text-muted-foreground ${className}`} {...props}>{children}</p>
);


