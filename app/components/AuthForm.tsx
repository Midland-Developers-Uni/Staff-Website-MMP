"use client";
import React, { useState } from "react";
import { useTheme } from "../context/ThemeContext";
import "./authForm.css";

const AuthForm: React.FC = () => {
  const { darkMode } = useTheme();
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    token: "",
    firstname: "",
    surname: "",
    confirmPassword: ""
  });
  const [errors, setErrors] = useState({
    email: "",
    password: "",
    token: "",
    firstname: "",
    surname: "",
    confirmPassword: "",
    form: ""
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isSignup, setIsSignup] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Special handler for token field to format as xxxx-xxxx-xxxx-xxxx
  const handleTokenChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Get the raw value and convert to lowercase
    let value = e.target.value.toLowerCase();
    
    // Remove any non-lowercase letter characters (except hyphens for usability)
    value = value.replace(/[^a-z-]/g, '');
    
    // Remove any existing hyphens
    const letters = value.replace(/-/g, '');
    
    // Format with hyphens after every 4 characters
    let formattedValue = '';
    for (let i = 0; i < letters.length; i++) {
      if (i > 0 && i % 4 === 0 && i < 16) {
        formattedValue += '-';
      }
      formattedValue += letters[i];
    }
    
    // Only keep the first 19 characters (xxxx-xxxx-xxxx-xxxx format = 19 chars)
    formattedValue = formattedValue.slice(0, 19);
    
    // Update the state with the formatted value
    setFormData((prev) => ({
      ...prev,
      token: formattedValue,
    }));
    
    // Clear error if user is typing
    if (errors.token) {
      setErrors((prev) => ({
        ...prev,
        token: "",
      }));
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    
    // Use the special handler for token field
    if (name === 'token') {
      return;
    }
    
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
    
    // Clear errors when user types
    if (errors[name as keyof typeof errors]) {
      setErrors((prev) => ({
        ...prev,
        [name]: "",
      }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    let valid = true;
    const newErrors = { ...errors, form: "" };

    // Email validation
    if (!formData.email.trim()) {
      newErrors.email = "Email is required";
      valid = false;
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = "Invalid email format";
      valid = false;
    }

    // Password validation
    if (!formData.password.trim()) {
      newErrors.password = "Password is required";
      valid = false;
    } else if (formData.password.length < 6) {
      newErrors.password = "Password must be at least 6 characters";
      valid = false;
    }

    // Additional validation for signup form
    if (isSignup) {
      // Token validation
      if (!formData.token.trim()) {
        newErrors.token = "Token is required";
        valid = false;
      } else if (!/^[a-z]{4}-[a-z]{4}-[a-z]{4}-[a-z]{4}$/.test(formData.token)) {
        newErrors.token = "Invalid token format";
        valid = false;
      }

      // First name validation
      if (!formData.firstname.trim()) {
        newErrors.firstname = "First name is required";
        valid = false;
      }

      // Surname validation
      if (!formData.surname.trim()) {
        newErrors.surname = "Surname is required";
        valid = false;
      }

      // Confirm password validation
      if (!formData.confirmPassword.trim()) {
        newErrors.confirmPassword = "Confirm password is required";
        valid = false;
      } else if (formData.password !== formData.confirmPassword) {
        newErrors.confirmPassword = "Passwords do not match";
        valid = false;
      }
    }

    setErrors(newErrors);

    if (valid) {
      setIsLoading(true);
      try {
        // Call API route
        const endpoint = isSignup ? '/api/auth/register' : '/api/auth/login';
        const response = await fetch(endpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            email: formData.email,
            password: formData.password,
            token: isSignup ? formData.token : undefined,
            firstname: isSignup ? formData.firstname : undefined,
            surname: isSignup ? formData.surname : undefined,
          }),
        });

        const data = await response.json();
        
        if (!response.ok) {
          throw new Error(data.message || 'Authentication failed');
        }

        // Handle successful authentication
        console.log('Authentication successful', data);
        
        // Redirect to dashboard
        window.location.href = '/dashboard';
        
      } catch (error) {
        console.error('Authentication error:', error);
        setErrors(prev => ({
          ...prev,
          form: error instanceof Error ? error.message : 'Authentication failed'
        }));
      } finally {
        setIsLoading(false);
      }
    }
  };

  const toggleFormMode = () => {
    setIsSignup(!isSignup);
    // Clear the form and errors when switching modes
    setFormData({
      email: "",
      password: "",
      token: "",
      firstname: "",
      surname: "",
      confirmPassword: ""
    });
    setErrors({
      email: "",
      password: "",
      token: "",
      firstname: "",
      surname: "",
      confirmPassword: "",
      form: ""
    });
  };

  return (
    <div className={`auth-container ${darkMode ? "dark" : "light"}`}>
      <div className="auth-form-wrapper">
        <h2>{isSignup ? "Create Staff Account" : "Login to Staff Portal"}</h2>
        <form onSubmit={handleSubmit} className="auth-form">
          {errors.form && <div className="form-error-message">{errors.form}</div>}
          
          {isSignup && (
            <div className="form-group">
              <input
                type="text"
                name="token"
                placeholder="Token (xxxx-xxxx-xxxx-xxxx)"
                value={formData.token}
                onChange={handleTokenChange}
                className={errors.token ? "error" : ""}
                disabled={isLoading}
                maxLength={19} // xxxx-xxxx-xxxx-xxxx = 19 chars
              />
              {errors.token && <span className="error-message">{errors.token}</span>}
            </div>
          )}

          <div className="form-group">
            <input
              type="email"
              name="email"
              placeholder="Email"
              value={formData.email}
              onChange={handleChange}
              className={errors.email ? "error" : ""}
              disabled={isLoading}
            />
            {errors.email && <span className="error-message">{errors.email}</span>}
          </div>

          {isSignup && (
            <>
              <div className="form-group">
                <input
                  type="text"
                  name="firstname"
                  placeholder="First Name"
                  value={formData.firstname}
                  onChange={handleChange}
                  className={errors.firstname ? "error" : ""}
                  disabled={isLoading}
                />
                {errors.firstname && <span className="error-message">{errors.firstname}</span>}
              </div>
              <div className="form-group">
                <input
                  type="text"
                  name="surname"
                  placeholder="Surname"
                  value={formData.surname}
                  onChange={handleChange}
                  className={errors.surname ? "error" : ""}
                  disabled={isLoading}
                />
                {errors.surname && <span className="error-message">{errors.surname}</span>}
              </div>
            </>
          )}

          <div className="form-group password-group">
            <input
              type={showPassword ? "text" : "password"}
              name="password"
              placeholder="Password"
              value={formData.password}
              onChange={handleChange}
              className={errors.password ? "error" : ""}
              disabled={isLoading}
            />
            <button 
              type="button"
              className="view-password-btn"
              onMouseDown={() => setShowPassword(true)}
              onMouseUp={() => setShowPassword(false)}
              onMouseLeave={() => setShowPassword(false)}
              aria-label={showPassword ? "Hide password" : "Show password"}
              disabled={isLoading}
            >
              {showPassword ? (
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7z" />
                  <circle cx="12" cy="12" r="3" />
                </svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7z" />
                  <circle cx="12" cy="12" r="3" />
                  <line x1="3" y1="3" x2="21" y2="21" />
                </svg>
              )}
            </button>
            {errors.password && <span className="error-message">{errors.password}</span>}
          </div>

          {isSignup && (
            <div className="form-group password-group">
              <input
                type={showConfirmPassword ? "text" : "password"}
                name="confirmPassword"
                placeholder="Confirm Password"
                value={formData.confirmPassword}
                onChange={handleChange}
                className={errors.confirmPassword ? "error" : ""}
                disabled={isLoading}
              />
              <button 
                type="button"
                className="view-password-btn"
                onMouseDown={() => setShowConfirmPassword(true)}
                onMouseUp={() => setShowConfirmPassword(false)}
                onMouseLeave={() => setShowConfirmPassword(false)}
                aria-label={showConfirmPassword ? "Hide confirm password" : "Show confirm password"}
                disabled={isLoading}
              >
                {showConfirmPassword ? (
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7z" />
                    <circle cx="12" cy="12" r="3" />
                  </svg>
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7z" />
                    <circle cx="12" cy="12" r="3" />
                    <line x1="3" y1="3" x2="21" y2="21" />
                  </svg>
                )}
              </button>
              {errors.confirmPassword && <span className="error-message">{errors.confirmPassword}</span>}
            </div>
          )}

          <button 
            type="submit" 
            className={`auth-button ${isLoading ? 'loading' : ''}`}
            disabled={isLoading}
          >
            {isLoading ? 'Processing...' : isSignup ? 'Create Account' : 'Login'}
          </button>
          
          <div className="auth-links">
            {!isSignup && <a href="/forgot-password">Forgot Password?</a>}
            <button 
              type="button" 
              className="mode-toggle" 
              onClick={toggleFormMode}
              disabled={isLoading}
            >
              {isSignup ? "Already have an account? Login" : "New staff member? Create Account"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AuthForm;