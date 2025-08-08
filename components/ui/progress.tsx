"use client";

import React from "react";

export const Progress: React.FC<{ value: number; className?: string }> = ({ value, className = "" }) => (
  <div className={`w-full h-2 rounded bg-secondary ${className}`}>
    <div className="h-2 rounded bg-primary" style={{ width: `${Math.max(0, Math.min(100, value))}%` }} />
  </div>
);


