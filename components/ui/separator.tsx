"use client";

import React from "react";

export const Separator: React.FC<{ className?: string }> = ({ className = "" }) => (
  <div className={`h-px w-full bg-border ${className}`} />
);


