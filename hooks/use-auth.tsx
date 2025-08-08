"use client";

import React, { createContext, useContext, useEffect, useState } from "react";

type AuthContextType = {
  isAuthenticated: boolean;
  loading: boolean;
  error: string | null;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => Promise<void>;
  user: { id: string; email: string } | null;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<AuthContextType["user"]>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // TODO: replace with real session check
    const stored = typeof window !== "undefined" ? window.localStorage.getItem("sentientedge_user") : null;
    if (stored) setUser(JSON.parse(stored));
    setLoading(false);
  }, []);

  const login = async (email: string, password: string) => {
    try {
      setLoading(true);
      setError(null);
      // TODO: replace with real API call and credential check
      if (!email || !password) {
        throw new Error("Missing credentials");
      }
      const fake = { id: "1", email };
      setUser(fake);
      if (typeof window !== "undefined") window.localStorage.setItem("sentientedge_user", JSON.stringify(fake));
      return true;
    } catch (e: any) {
      setError(e?.message ?? "Login failed");
      return false;
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    setUser(null);
    if (typeof window !== "undefined") window.localStorage.removeItem("sentientedge_user");
  };

  return (
    <AuthContext.Provider value={{ isAuthenticated: !!user, loading, error, login, logout, user }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
};


