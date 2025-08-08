"use client";

import React, { createContext, useContext } from "react";

const Ctx = createContext<{ enabled: boolean }>({ enabled: true });

export const EnhancedCommunicationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <Ctx.Provider value={{ enabled: true }}>{children}</Ctx.Provider>
);

export const useEnhancedCommunication = () => useContext(Ctx);


