"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from "react";
import { useRouter } from "next/navigation";
import { api, ApiResponse } from "@/lib/api";
import { User, AuthResponse } from "@/lib/types";
import { toast } from "sonner";

interface AuthContextType {
  user: User | null;
  loading: boolean;
  error: string | null;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => void;
  register: (userData: RegisterData) => Promise<boolean>;
  isAuthenticated: boolean;
}

interface AuthProviderProps {
  children: ReactNode;
}

interface RegisterData {
  email: string;
  password: string;
  username: string;
  firstName?: string;
  lastName?: string;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const router = useRouter();

  // Check if user is already logged in on initial load
  useEffect(() => {
    const checkAuthStatus = async () => {
      const token = localStorage.getItem("auth-token");
      if (!token) {
        setLoading(false);
        return;
      }

      try {
        // Verify token and get user data
        const response = await api.get<User>("/auth/me");
        if (response.data) {
          setUser(response.data);
          setIsAuthenticated(true);
        }
      } catch (err) {
        // Token is invalid or expired
        localStorage.removeItem("auth-token");
        setError("Session expired. Please log in again.");
      } finally {
        setLoading(false);
      }
    };

    checkAuthStatus();
  }, []);

  const login = async (email: string, password: string): Promise<boolean> => {
    setLoading(true);
    setError(null);

    try {
      const response = await api.post<AuthResponse>("/auth/login", {
        email,
        password,
      });

      if (response.error) {
        setError(response.error);
        toast.error(response.error);
        setLoading(false);
        return false;
      }

      if (response.data) {
        const { user, token } = response.data;
        localStorage.setItem("auth-token", token);
        setUser(user);
        setIsAuthenticated(true);
        toast.success("Login successful");
        setLoading(false);
        return true;
      }

      return false;
    } catch (err) {
      setError("An unexpected error occurred");
      toast.error("Login failed");
      setLoading(false);
      return false;
    }
  };

  const register = async (userData: RegisterData): Promise<boolean> => {
    setLoading(true);
    setError(null);

    try {
      const response = await api.post<AuthResponse>("/auth/register", userData);

      if (response.error) {
        setError(response.error);
        toast.error(response.error);
        setLoading(false);
        return false;
      }

      if (response.data) {
        const { user, token } = response.data;
        localStorage.setItem("auth-token", token);
        setUser(user);
        setIsAuthenticated(true);
        toast.success("Registration successful");
        setLoading(false);
        return true;
      }

      return false;
    } catch (err) {
      setError("An unexpected error occurred");
      toast.error("Registration failed");
      setLoading(false);
      return false;
    }
  };

  const logout = () => {
    localStorage.removeItem("auth-token");
    setUser(null);
    setIsAuthenticated(false);
    router.push("/login");
    toast.info("You have been logged out");
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        error,
        login,
        logout,
        register,
        isAuthenticated,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
