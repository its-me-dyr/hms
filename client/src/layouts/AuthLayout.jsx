/**
 * Auth Layout
 * 
 * Centered layout for authentication pages (login, forgot password).
 * Simple, clean design with hospital branding.
 */

import { Outlet, Navigate } from 'react-router-dom';
import { useAuth } from '../context/useAuth';
import { Heart } from 'lucide-react';

export default function AuthLayout() {
  const { isAuthenticated, loading } = useAuth();

  // If already logged in, redirect to dashboard
  if (!loading && isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <div className="auth-layout">
      <div className="auth-layout__container">
        <div className="auth-layout__brand">
          <div className="auth-layout__logo">
            <Heart size={32} strokeWidth={2.5} />
          </div>
          <h1 className="auth-layout__title">HMS</h1>
          <p className="auth-layout__subtitle">Hospital Management System</p>
        </div>
        <div className="auth-layout__content">
          <Outlet />
        </div>
      </div>
      <footer className="auth-layout__footer">
        <p>&copy; {new Date().getFullYear()} HMS by GD. All rights reserved.</p>
      </footer>
    </div>
  );
}
