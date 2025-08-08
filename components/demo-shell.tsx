"use client";

import React from "react";

export const DemoShell: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="min-h-screen">{children}</div>
);

export default DemoShell;


