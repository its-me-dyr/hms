/**
 * Landing Page Footer
 */

import { Heart, ShieldCheck, Lock, Activity } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function LandingFooter() {
  return (
    <footer className="landing-footer">
      <div className="landing-container landing-footer__grid">
        {/* Brand column */}
        <div className="landing-footer__brand-col">
          <div className="landing-brand">
            <div className="landing-brand__icon">
              <Heart size={20} strokeWidth={2.5} />
            </div>
            <span className="landing-brand__name">HMS</span>
          </div>
          <p className="landing-footer__desc">
            Next-generation Hospital Management System engineered for seamless clinical operations, connected patient care, and enterprise healthcare administration.
          </p>
          <div className="landing-footer__badges">
            <span className="compliance-badge"><ShieldCheck size={14} /> HIPAA Compliant</span>
            <span className="compliance-badge"><Lock size={14} /> 256-Bit Encrypted</span>
            <span className="compliance-badge"><Activity size={14} /> 99.99% Uptime</span>
          </div>
        </div>

        {/* Modules */}
        <div className="landing-footer__col">
          <h4 className="landing-footer__title">Clinical Modules</h4>
          <ul className="landing-footer__links">
            <li><a href="#capabilities">Outpatient Department (OPD)</a></li>
            <li><a href="#capabilities">Inpatient Admissions (IPD)</a></li>
            <li><a href="#capabilities">Operation Theatre (OT)</a></li>
            <li><a href="#capabilities">Emergency & Trauma Care</a></li>
            <li><a href="#capabilities">Pharmacy & Formulary</a></li>
            <li><a href="#capabilities">Diagnostic Laboratory</a></li>
            <li><a href="#capabilities">PACS & Radiology</a></li>
          </ul>
        </div>

        {/* Portals */}
        <div className="landing-footer__col">
          <h4 className="landing-footer__title">Portals & RBAC</h4>
          <ul className="landing-footer__links">
            <li><Link to="/login">Patient Portal Access</Link></li>
            <li><Link to="/login">Physician Clinical Workspace</Link></li>
            <li><Link to="/login">Nursing Station & Vitals</Link></li>
            <li><Link to="/login">Front Desk & Reception</Link></li>
            <li><Link to="/login">Billing & Insurance Claims</Link></li>
            <li><Link to="/login">Hospital Administrator</Link></li>
            <li><Link to="/login">Super Admin Console</Link></li>
          </ul>
        </div>

        {/* System & Architecture */}
        <div className="landing-footer__col">
          <h4 className="landing-footer__title">Architecture</h4>
          <ul className="landing-footer__links">
            <li><a href="#security">Zero-Trust Role-Based Access</a></li>
            <li><a href="#security">Immutable Audit Logging</a></li>
            <li><a href="#security">JWT Token Rotation</a></li>
            <li><a href="#security">RESTful Healthcare API</a></li>
            <li><a href="#security">MongoDB Document Model</a></li>
          </ul>
        </div>
      </div>

      <div className="landing-footer__bottom">
        <div className="landing-container landing-footer__bottom-inner">
          <p>&copy; {new Date().getFullYear()} HMS Healthcare Systems. All rights reserved.</p>
          <div className="landing-footer__legal">
            <a href="#privacy" onClick={(e) => e.preventDefault()}>Privacy Policy</a>
            <span>•</span>
            <a href="#terms" onClick={(e) => e.preventDefault()}>Terms of Service</a>
            <span>•</span>
            <a href="#security" onClick={(e) => e.preventDefault()}>Security Statement</a>
          </div>
        </div>
      </div>
    </footer>
  );
}
