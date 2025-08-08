"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Zap, Mail, Lock, AlertCircle } from "lucide-react";
import "./login.css";
import "./override.css";

export default function LoginPage() {
  const router = useRouter();
  const { login, error, loading } = useAuth();
  const [showPassword, setShowPassword] = useState(false);
  
  // Login form state
  const [credentials, setCredentials] = useState({
    email: "",
    password: "",
  });

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const success = await login(credentials.email, credentials.password);
    if (success) {
      router.push("/");
    }
  };

  return (
    <div className="login-container" data-login-page>
      {/* Background gradient effect */}
      <div className="login-background-gradient" />
      
      <div className="login-content">
        {/* Logo and branding */}
        <div className="login-brand">
          <div className="login-logo-container">
            <Zap className="login-logo" />
          </div>
          <h1 className="login-brand-name">SentientEdge</h1>
          <p className="login-tagline">Autonomous Drone Fleet Management</p>
        </div>
        
        {/* Login card */}
        <Card className="login-card">
          <CardHeader className="login-card-header">
            <CardTitle className="login-title">Welcome back</CardTitle>
            <CardDescription className="login-description">
              Sign in to continue to your dashboard
            </CardDescription>
          </CardHeader>
          
          <form onSubmit={handleLogin}>
            <CardContent className="login-card-content">
              {error && (
                <Alert className="login-alert" variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}
              
              {/* Email field */}
              <div className="login-field-group">
                <Label htmlFor="email" className="login-label">
                  Email address
                </Label>
                <div className="login-input-wrapper">
                  <Mail className="login-input-icon" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="you@example.com"
                    value={credentials.email}
                    onChange={(e) => setCredentials({ ...credentials, email: e.target.value })}
                    className="login-input"
                    required
                  />
                </div>
              </div>
              
              {/* Password field */}
              <div className="login-field-group">
                <div className="login-label-row">
                  <Label htmlFor="password" className="login-label">
                    Password
                  </Label>
                  <Link 
                    href="/forgot-password" 
                    className="login-forgot-link"
                  >
                    Forgot password?
                  </Link>
                </div>
                <div className="login-input-wrapper">
                  <Lock className="login-input-icon" />
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Enter your password"
                    value={credentials.password}
                    onChange={(e) => setCredentials({ ...credentials, password: e.target.value })}
                    className="login-input"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="login-password-toggle"
                  >
                    {showPassword ? "Hide" : "Show"}
                  </button>
                </div>
              </div>
              
              {/* Remember me checkbox */}
              <div className="login-remember">
                <input
                  type="checkbox"
                  id="remember"
                  className="login-checkbox"
                />
                <Label htmlFor="remember" className="login-remember-label">
                  Remember me for 30 days
                </Label>
              </div>
            </CardContent>
            
            <CardFooter className="login-card-footer">
              <Button 
                type="submit" 
                className="login-submit-button" 
                disabled={loading}
              >
                {loading ? (
                  <>
                    <span className="login-spinner" />
                    Signing in...
                  </>
                ) : (
                  "Sign in"
                )}
              </Button>
            </CardFooter>
          </form>
        </Card>
        
        {/* Footer links */}
        <div className="login-footer">
          <p className="login-footer-text">
            Don't have an account?{" "}
            <Link href="/signup" className="login-footer-link">
              Create one
            </Link>
          </p>
          <div className="login-footer-divider" />
          <p className="login-footer-legal">
            By continuing, you agree to our{" "}
            <Link href="/terms" className="login-footer-link">
              Terms of Service
            </Link>{" "}
            and{" "}
            <Link href="/privacy" className="login-footer-link">
              Privacy Policy
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
