"use client";

import React from "react";

export const Switch: React.FC<{ checked?: boolean; onCheckedChange?: (v: boolean) => void; className?: string } & Omit<React.InputHTMLAttributes<HTMLInputElement>, "onChange">> = ({ checked, onCheckedChange, className = "", ...props }) => (
  <label className={`inline-flex cursor-pointer items-center ${className}`}>
    <input
      type="checkbox"
      className="peer sr-only"
      checked={checked}
      onChange={(e) => onCheckedChange?.(e.target.checked)}
      {...props}
    />
    <div className="h-5 w-9 rounded-full bg-muted peer-checked:bg-primary transition-colors">
      <div className="h-4 w-4 translate-x-0 peer-checked:translate-x-4 transform rounded-full bg-background shadow -mt-4 ml-0.5 mt-0.5 transition-transform" />
    </div>
  </label>
);


