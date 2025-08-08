"use client";

import React, { useState } from "react";

export const Tabs: React.FC<{ defaultValue: string; className?: string; children: React.ReactNode }> = ({ defaultValue, className = "", children }) => (
  <div className={className}>{children}</div>
);

export const TabsList: React.FC<{ className?: string; children: React.ReactNode }> = ({ className = "", children }) => (
  <div className={`inline-flex h-10 items-center justify-center rounded-md bg-muted p-1 text-muted-foreground ${className}`}>{children}</div>
);

export const TabsTrigger: React.FC<{ value: string; active?: boolean; onClick?: () => void; className?: string; children: React.ReactNode }> = ({ active, onClick, className = "", children }) => (
  <button onClick={onClick} className={`inline-flex items-center justify-center whitespace-nowrap rounded-sm px-3 py-1 text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 ${active ? "bg-background text-foreground shadow" : "hover:text-foreground"} ${className}`}>{children}</button>
);

export const TabsContent: React.FC<{ value: string; active?: boolean; className?: string; children: React.ReactNode }> = ({ active, className = "", children }) => (
  <div className={`${active ? "block" : "hidden"} ${className}`}>{children}</div>
);


