"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Zap, Mail, Lock } from "lucide-react";
import "./login.css";
import "./override.css";

export default function LoginPageDemo() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    // Demo authentication
    if (email === "admin@sentientedge.ai" && password === "TempAdmin123!@#") {
      // Store demo session
      localStorage.setItem("demo-user", JSON.stringify({
        id: "1",
        email: email,
        username: "admin",
        firstName: "System",
        lastName: "Administrator",
        role: "admin",
      }));
      localStorage.setItem("auth-token", `demo-token-${Date.now()}`);
      
      // Redirect to dashboard
      setTimeout(() => {
        router.push("/");
      }, 500);
    } else {
      setError("Invalid email or password");
      setLoading(false);
    }
  };

  return (
    <div className="login-container" data-login-page>
      <div className="login-background-gradient" />
      
      <div className="login-content">
        <div className="login-brand">
          <div className="login-logo-container">
            <Zap className="login-logo" />
          </div>
          <h1 className="login-brand-name">SentientEdge</h1>
          <p className="login-tagline">Autonomous Drone Fleet Management</p>
        </div>
        
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
                <div className="login-alert">
                  {error}
                </div>
              )}
              
              <div className="login-field-group">
                <Label htmlFor="email" className="login-label">
                  Email address
                </Label>
                <div className="login-input-wrapper">
                  <Mail className="login-input-icon" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="admin@sentientedge.ai"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="login-input"
                    required
                  />
                </div>
              </div>
              
              <div className="login-field-group">
                <div className="login-label-row">
                  <Label htmlFor="password" className="login-label">
                    Password
                  </Label>
                </div>
                <div className="login-input-wrapper">
                  <Lock className="login-input-icon" />
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="TempAdmin123!@#"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
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
            </CardContent>
            
            <CardFooter className="login-card-footer">
              <Button 
                type="submit" 
                className="login-submit-button" 
                disabled={loading}
              >
                {loading ? "Signing in..." : "Sign in (Demo Mode)"}
              </Button>
            </CardFooter>
          </form>
        </Card>
        
        <div className="login-footer">
          <p className="login-footer-text">
            Demo credentials: admin@sentientedge.ai / TempAdmin123!@#
          </p>
        </div>
      </div>
    </div>
  );
}

