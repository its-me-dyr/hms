/**
 * Landing Page Navbar
 */

import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Heart, Menu, X, ArrowRight, LogIn } from 'lucide-react';
import { useAuth } from '../../../context/useAuth';

export default function LandingNavbar() {
  const navigate = useNavigate();
  const { isAuthenticated, user } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <header className="landing-header">
      <div className="landing-container landing-header__inner">
        {/* Brand */}
        <Link to="/" className="landing-brand">
          <div className="landing-brand__icon">
            <Heart size={20} strokeWidth={2.5} />
          </div>
          <span className="landing-brand__name">HMS</span>
          <span className="landing-brand__badge">Healthcare Cloud</span>
        </Link>

        {/* Desktop Nav */}
        <nav className="landing-nav">
          <a href="#overview" className="landing-nav__link">Overview</a>
          <a href="#capabilities" className="landing-nav__link">Capabilities</a>
          <a href="#roles" className="landing-nav__link">Roles</a>
          <a href="#patient-experience" className="landing-nav__link">Patient Portal</a>
          <a href="#hospital-admin" className="landing-nav__link">Administration</a>
          <a href="#security" className="landing-nav__link">Security</a>
        </nav>

        {/* Auth CTAs */}
        <div className="landing-header__actions">
          {isAuthenticated ? (
            <button
              onClick={() => navigate('/dashboard')}
              className="btn btn--primary"
            >
              <span>
                Dashboard (
                {typeof user?.role === 'object' && user?.role !== null
                  ? user.role.displayName || user.role.name || 'User'
                  : user?.roleName || user?.role || 'User'}
                )
              </span>
              <ArrowRight size={16} />
            </button>
          ) : (
            <Link to="/login" className="btn btn--primary">
              <LogIn size={15} />
              <span>Sign In to Portal</span>
            </Link>
          )}
        </div>

        {/* Mobile Toggle */}
        <button
          className="landing-mobile-toggle"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          aria-label="Toggle navigation menu"
        >
          {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {/* Mobile Menu Dropdown */}
      {mobileMenuOpen && (
        <div className="landing-mobile-menu">
          <a href="#overview" onClick={() => setMobileMenuOpen(false)}>Overview</a>
          <a href="#capabilities" onClick={() => setMobileMenuOpen(false)}>Capabilities</a>
          <a href="#roles" onClick={() => setMobileMenuOpen(false)}>Roles</a>
          <a href="#patient-experience" onClick={() => setMobileMenuOpen(false)}>Patient Portal</a>
          <a href="#hospital-admin" onClick={() => setMobileMenuOpen(false)}>Administration</a>
          <a href="#security" onClick={() => setMobileMenuOpen(false)}>Security</a>
          <div className="landing-mobile-menu__actions">
            {isAuthenticated ? (
              <button onClick={() => { setMobileMenuOpen(false); navigate('/dashboard'); }} className="btn btn--primary btn--full">
                Go to Dashboard
              </button>
            ) : (
              <Link to="/login" onClick={() => setMobileMenuOpen(false)} className="btn btn--primary btn--full">
                <LogIn size={15} />
                <span>Sign In to Portal</span>
              </Link>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
