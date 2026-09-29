/**
 * Landing Page Component
 * 
 * Professional healthcare SaaS landing page for the Hospital Management System (HMS).
 * Includes all 10 required sections with functional React Router navigation.
 */

import { Link } from 'react-router-dom';
import LandingNavbar from './components/LandingNavbar';
import LandingFooter from './components/LandingFooter';
import {
  Heart,
  ArrowRight,
  ShieldCheck,
  Users,
  Activity,
  Calendar,
  Pill,
  Microscope,
  FileText,
  CreditCard,
  Building2,
  Lock,
  CheckCircle2,
  Stethoscope,
  Database,
  Bed,
  PhoneCall,
  ChevronRight,
  LogIn,
} from 'lucide-react';

export default function LandingPage() {
  return (
    <div className="landing-page">
      {/* 1. Navbar */}
      <LandingNavbar />

      {/* 2. Hero Section */}
      <section className="hero-section">
        <div className="landing-container hero-container">
          <div className="hero-content">
            <div className="hero-badge">
              <span className="hero-badge__dot" />
              <span>Next-Gen Enterprise Hospital Operating System</span>
            </div>

            <h1 className="hero-headline">
              Smart Hospital Management, <br />
              <span className="hero-headline--gradient">Connected Care</span>
            </h1>

            <p className="hero-subtext">
              An all-in-one healthcare platform unifying{' '}
              <strong>Patients</strong>, <strong>Doctors</strong>, <strong>Appointments</strong>,{' '}
              <strong>OPD</strong>, <strong>IPD</strong>, <strong>Pharmacy</strong>,{' '}
              <strong>Laboratory</strong>, <strong>Billing</strong>, and{' '}
              <strong>Administration</strong> into a synchronized, secure cloud workflow.
            </p>

            <div className="hero-actions">
              <Link to="/login" className="btn btn--primary btn--lg">
                <LogIn size={18} />
                <span>Sign In to Portal</span>
              </Link>
            </div>

            <div style={{ marginTop: '0.85rem', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
              <ShieldCheck size={15} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '6px', color: 'var(--color-primary)' }} />
              Staff and patient accounts are created by authorized hospital staff.
            </div>

            <div className="hero-trust">
              <div className="hero-trust__item">
                <ShieldCheck size={18} className="hero-trust__icon" />
                <span>HIPAA-Grade RBAC</span>
              </div>
              <div className="hero-trust__item">
                <Database size={18} className="hero-trust__icon" />
                <span>Document DB Persistence</span>
              </div>
              <div className="hero-trust__item">
                <Lock size={18} className="hero-trust__icon" />
                <span>Role-Strict Security</span>
              </div>
            </div>
          </div>

          <div className="hero-visual">
            <div className="hero-image-wrapper">
              <img
                src="/images/hms_doctor_console.jpg"
                alt="HMS Clinical Console in Action"
                className="hero-image"
              />
              <div className="hero-image-overlay" />

              {/* Floating Live Telemetry Badge */}
              <div className="hero-floating-badge">
                <span className="pulse-dot" />
                <span>Live Telemetry Connected</span>
              </div>

              {/* Floating Activity Card */}
              <div className="hero-floating-card">
                <div className="hero-floating-card__icon">
                  <Activity size={18} />
                </div>
                <div>
                  <div className="hero-floating-card__title">Dr. S. Jenkins • Cardiology</div>
                  <div className="hero-floating-card__subtitle">Consultation #OPD-8942 Verified</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 3. HMS Overview */}
      <section id="overview" className="landing-section bg-surface">
        <div className="landing-container">
          <div className="section-header text-center">
            <h2 className="section-title">A Unified Healthcare Operating System</h2>
            <p className="section-subtitle">
              Designed from the ground up for modern medical centers, clinics, and multi-specialty hospital networks.
            </p>
          </div>

          <div className="grid grid-3">
            <div className="feature-card">
              <div className="feature-card__icon" style={{ background: 'rgba(8, 145, 178, 0.1)', color: 'var(--color-primary)' }}>
                <Stethoscope size={24} />
              </div>
              <h3 className="feature-card__title">Clinical Operations</h3>
              <p className="feature-card__text">
                Streamline OPD consultations, clinical notes, digital prescriptions, diagnosis coding, and inpatient rounds with instant physician access.
              </p>
            </div>

            <div className="feature-card">
              <div className="feature-card__icon" style={{ background: 'rgba(5, 150, 105, 0.1)', color: 'var(--color-success)' }}>
                <Building2 size={24} />
              </div>
              <h3 className="feature-card__title">Administrative Control</h3>
              <p className="feature-card__text">
                Centralized hospital registry, bed management, token queueing, branch operations, staff roster scheduling, and executive compliance metrics.
              </p>
            </div>

            <div className="feature-card">
              <div className="feature-card__icon" style={{ background: 'rgba(37, 99, 235, 0.1)', color: 'var(--color-info)' }}>
                <CreditCard size={24} />
              </div>
              <h3 className="feature-card__title">Financial & Billing Suite</h3>
              <p className="feature-card__text">
                Automated multi-department invoicing, insurance pre-authorization, split claims, pharmacy POS billing, and real-time revenue cycle management.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 4. Key Capabilities */}
      <section id="capabilities" className="landing-section">
        <div className="landing-container">
          <div className="section-header text-center">
            <h2 className="section-title">Comprehensive Key Capabilities</h2>
            <p className="section-subtitle">
              From emergency admission to outpatient dispensing, every department operates on a single real-time truth.
            </p>
          </div>

          <div className="grid grid-4">
            <div className="capability-card">
              <Users size={22} className="capability-card__icon" />
              <h4>Patient Registry</h4>
              <p>Lifelong unified patient records, demographic tracking, and medical history.</p>
            </div>

            <div className="capability-card">
              <Calendar size={22} className="capability-card__icon" />
              <h4>Appointments & OPD</h4>
              <p>Doctor availability rosters, smart queueing, tokens, and triage flow.</p>
            </div>

            <div className="capability-card">
              <Bed size={22} className="capability-card__icon" />
              <h4>Inpatient & Bed Wards</h4>
              <p>Real-time bed occupancy, ICU transfers, nursing shifts, and discharge plans.</p>
            </div>

            <div className="capability-card">
              <Pill size={22} className="capability-card__icon" />
              <h4>Pharmacy & Inventory</h4>
              <p>Digital prescription fulfillment, batch expiry tracking, and stock alerts.</p>
            </div>

            <div className="capability-card">
              <Microscope size={22} className="capability-card__icon" />
              <h4>Diagnostic Lab</h4>
              <p>Specimen barcode tracking, automated result entry, and physician alerts.</p>
            </div>

            <div className="capability-card">
              <FileText size={22} className="capability-card__icon" />
              <h4>Electronic Health Records</h4>
              <p>Structured clinical notes, vitals trending, allergy checks, and documents.</p>
            </div>

            <div className="capability-card">
              <PhoneCall size={22} className="capability-card__icon" />
              <h4>Emergency & Trauma</h4>
              <p>Rapid triage protocol, emergency bed reserve, and immediate alert dispatch.</p>
            </div>

            <div className="capability-card">
              <ShieldCheck size={22} className="capability-card__icon" />
              <h4>Audit & Compliance</h4>
              <p>Immutable event logging, tamper-resistant access trails, and HIPAA RBAC.</p>
            </div>
          </div>
        </div>
      </section>

      {/* 5. Role-Based Access Control Explanation */}
      <section id="roles" className="landing-section bg-surface">
        <div className="landing-container">
          <div className="section-header text-center">
            <h2 className="section-title">Strict Role-Based Access Architecture</h2>
            <p className="section-subtitle">
              Security is built into the data layer. Public registration is strictly restricted to Patients.
              All 15 staff roles are governed by zero-trust backend authorization.
            </p>
          </div>

          <div className="roles-grid">
            <div className="role-box role-box--public">
              <div className="role-box__tag">Public Onboarding</div>
              <h3 className="role-box__title">Patient Portal</h3>
              <p className="role-box__desc">
                Public self-registration automatically provisions a safe, patient-scoped portal. Patients can view their own vitals, appointments, and bills without accessing internal clinical or administrative records.
              </p>
              <Link to="/register" className="btn btn--primary btn--sm" style={{ marginTop: '0.75rem' }}>
                Register as Patient
              </Link>
            </div>

            <div className="role-box role-box--staff">
              <div className="role-box__tag" style={{ background: '#fef3c7', color: '#b45309' }}>Authorized Staff Only</div>
              <h3 className="role-box__title">15 Specialized Staff Roles</h3>
              <p className="role-box__desc">
                Physicians, Nurses, Receptionists, Pharmacists, Lab Technicians, Radiologists, OT Teams, Billing Clerks, and Administrators receive tailored workspaces strictly provisioned by hospital administrators.
              </p>
              <div className="role-tags">
                <span>Super Admin</span>
                <span>Hospital Admin</span>
                <span>Doctor</span>
                <span>Nurse</span>
                <span>Receptionist</span>
                <span>Pharmacist</span>
                <span>Lab Tech</span>
                <span>Radiologist</span>
                <span>OT Staff</span>
                <span>Billing Staff</span>
                <span>Insurance</span>
                <span>HR Staff</span>
                <span>Inventory</span>
                <span>Blood Bank</span>
                <span>Emergency</span>
              </div>
              <Link to="/login" className="btn btn--outline btn--sm" style={{ marginTop: '0.75rem' }}>
                Staff Sign In
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* 6. Patient Experience Section */}
      <section id="patient-experience" className="landing-section">
        <div className="landing-container">
          <div className="experience-layout">
            <div className="experience-content">
              <div className="section-badge">Patient Empowerment</div>
              <h2 className="section-title">Modern, Frictionless Patient Experience</h2>
              <p className="section-subtitle" style={{ textAlign: 'left' }}>
                Give your patients transparency, convenience, and complete autonomy over their medical records and care schedule.
              </p>

              <div className="experience-list">
                <div className="experience-item">
                  <CheckCircle2 size={20} className="experience-item__icon" />
                  <div>
                    <h4>Direct Appointment Booking</h4>
                    <p>Select specialized doctors, convenient dates, and receive instant confirmation.</p>
                  </div>
                </div>

                <div className="experience-item">
                  <CheckCircle2 size={20} className="experience-item__icon" />
                  <div>
                    <h4>Digital Prescriptions & Lab Results</h4>
                    <p>Access doctor prescriptions, laboratory reports, and imaging findings online.</p>
                  </div>
                </div>

                <div className="experience-item">
                  <CheckCircle2 size={20} className="experience-item__icon" />
                  <div>
                    <h4>Transparent Billing & Payment Receipts</h4>
                    <p>Review itemized hospital invoices, insurance adjustments, and receipts on-demand.</p>
                  </div>
                </div>
              </div>

              <div style={{ marginTop: '1.5rem' }}>
                <Link to="/register" className="btn btn--primary">
                  <span>Create Patient Account</span>
                  <ArrowRight size={16} />
                </Link>
              </div>
            </div>

            <div className="experience-visual">
              <div className="portal-mockup">
                <div className="portal-mockup__header">
                  <Heart size={18} style={{ color: 'var(--color-primary)' }} />
                  <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>Patient Health Portal</span>
                  <span className="badge badge--primary" style={{ fontSize: '0.7rem', marginLeft: 'auto' }}>Patient Role</span>
                </div>
                <div className="portal-mockup__body">
                  <div className="portal-item">
                    <Calendar size={18} style={{ color: 'var(--color-primary)' }} />
                    <div>
                      <div style={{ fontWeight: 600, fontSize: '0.85rem' }}>Next Appointment: Cardiology</div>
                      <div style={{ fontSize: '0.75rem', color: '#64748b' }}>Tomorrow at 10:30 AM with Dr. Sarah Jenkins</div>
                    </div>
                  </div>

                  <div className="portal-item">
                    <Pill size={18} style={{ color: 'var(--color-success)' }} />
                    <div>
                      <div style={{ fontWeight: 600, fontSize: '0.85rem' }}>Active Prescription</div>
                      <div style={{ fontSize: '0.75rem', color: '#64748b' }}>Atorvastatin 20mg — 1 tablet daily at bedtime</div>
                    </div>
                  </div>

                  <div className="portal-item">
                    <Microscope size={18} style={{ color: 'var(--color-info)' }} />
                    <div>
                      <div style={{ fontWeight: 600, fontSize: '0.85rem' }}>Lipid Profile Test Report</div>
                      <div style={{ fontSize: '0.75rem', color: '#64748b' }}>Verified by Lab Pathology • Status: Normal</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 7. Hospital Management Section */}
      <section id="hospital-admin" className="landing-section bg-surface">
        <div className="landing-container">
          <div className="experience-layout experience-layout--reverse">
            <div className="experience-content">
              <div className="section-badge">Hospital Administration</div>
              <h2 className="section-title">Enterprise Hospital Governance</h2>
              <p className="section-subtitle" style={{ textAlign: 'left' }}>
                Provide leadership and administrative teams with real-time operational oversight across hospital branches, departments, and personnel.
              </p>

              <div className="experience-list">
                <div className="experience-item">
                  <CheckCircle2 size={20} className="experience-item__icon" />
                  <div>
                    <h4>Bed & Ward Allocation Engine</h4>
                    <p>Monitor ICU, general, and emergency bed occupancy across all wards in real time.</p>
                  </div>
                </div>

                <div className="experience-item">
                  <CheckCircle2 size={20} className="experience-item__icon" />
                  <div>
                    <h4>Staff User Lifecycle & Permission Matrix</h4>
                    <p>Provision clinical and operational accounts with granular permission sets.</p>
                  </div>
                </div>

                <div className="experience-item">
                  <CheckCircle2 size={20} className="experience-item__icon" />
                  <div>
                    <h4>Department Revenue & Clinical Metrics</h4>
                    <p>Track OPD volume, patient wait times, pharmacy turnover, and insurance claims.</p>
                  </div>
                </div>
              </div>

              <div style={{ marginTop: '1.5rem' }}>
                <Link to="/login" className="btn btn--outline">
                  <span>Access Admin Console</span>
                  <ChevronRight size={16} />
                </Link>
              </div>
            </div>

            <div className="experience-visual">
              <div className="admin-mockup">
                <div className="admin-mockup__header">
                  <Building2 size={18} style={{ color: 'var(--color-info)' }} />
                  <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>Hospital Administration Hub</span>
                  <span className="badge badge--success" style={{ fontSize: '0.7rem', marginLeft: 'auto' }}>All Systems Normal</span>
                </div>
                <div className="admin-mockup__body">
                  <div className="admin-stat-row">
                    <span>General Ward Occupancy</span>
                    <strong>87%</strong>
                  </div>
                  <div className="admin-progress-bar"><div style={{ width: '87%', background: 'var(--color-primary)' }} /></div>

                  <div className="admin-stat-row" style={{ marginTop: '0.75rem' }}>
                    <span>ICU Availability</span>
                    <strong>4 Beds Open</strong>
                  </div>
                  <div className="admin-progress-bar"><div style={{ width: '60%', background: 'var(--color-warning)' }} /></div>

                  <div className="admin-stat-row" style={{ marginTop: '0.75rem' }}>
                    <span>Emergency Queue</span>
                    <strong>Zero Delay</strong>
                  </div>
                  <div className="admin-progress-bar"><div style={{ width: '10%', background: 'var(--color-success)' }} /></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 8. Security / RBAC Section */}
      <section id="security" className="landing-section">
        <div className="landing-container">
          <div className="section-header text-center">
            <h2 className="section-title">Enterprise Security & Compliance Standards</h2>
            <p className="section-subtitle">
              Engineered with zero-trust architectural principles to protect electronic protected health information (ePHI).
            </p>
          </div>

          <div className="grid grid-3">
            <div className="security-card">
              <Lock size={28} className="security-card__icon" />
              <h3>JWT Token Rotation</h3>
              <p>Short-lived access tokens combined with secure refresh token rotation to minimize session vulnerability.</p>
            </div>

            <div className="security-card">
              <ShieldCheck size={28} className="security-card__icon" />
              <h3>Bcrypt Password Hashing</h3>
              <p>All passwords are encrypted with salted bcrypt hashing before database persistence. Plaintext is never stored.</p>
            </div>

            <div className="security-card">
              <Database size={28} className="security-card__icon" />
              <h3>Immutable Audit Logging</h3>
              <p>Every authentication event, role elevation, and security action is recorded with client IP and timestamp.</p>
            </div>
          </div>
        </div>
      </section>

      {/* 9. Call-To-Action Banner */}
      <section className="landing-cta">
        <div className="landing-container text-center">
          <h2 className="landing-cta__title">Ready to Experience Modern Healthcare Management?</h2>
          <p className="landing-cta__subtitle">
            Join thousands of patients and clinical professionals operating on the HMS platform today.
          </p>
          <div className="landing-cta__actions">
            <Link to="/login" className="btn btn--primary btn--lg">
              <LogIn size={18} />
              <span>Sign In to Hospital Portal</span>
            </Link>
          </div>
          <p style={{ marginTop: '0.85rem', fontSize: '0.85rem', color: 'rgba(255,255,255,0.85)' }}>
            Staff and patient accounts are created by authorized hospital staff.
          </p>
        </div>
      </section>

      {/* 10. Footer */}
      <LandingFooter />
    </div>
  );
}
