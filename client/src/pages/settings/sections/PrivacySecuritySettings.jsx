/**
 * Privacy & Security Settings Section
 * 
 * Clinical data privacy standards, HIPAA / GDPR compliance overview,
 * active session status, and cryptographic transmission standards.
 */

import {
  ShieldCheck,
  Lock,
  FileText,
  Server,
  KeyRound,
  CheckCircle2,
} from 'lucide-react';
import { useAuth } from '../../../context/useAuth';

export default function PrivacySecuritySettings() {
  const { user } = useAuth();

  return (
    <div className="settings-section">
      <div className="settings-section__header">
        <h2 className="settings-section__title">Privacy, Security & Compliance</h2>
        <p className="settings-section__subtitle">
          Institutional data protection safeguards, active terminal session metrics, and clinical privacy guidelines.
        </p>
      </div>

      {/* Active Session & Device Overview Card */}
      <div className="settings-card" style={{ marginBottom: '1.75rem' }}>
        <h3 className="settings-card__title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.25rem' }}>
          <Server size={18} style={{ color: 'var(--color-primary)' }} />
          Active Workstation Session
        </h3>

        <div className="settings-meta-grid">
          <div className="settings-meta-item">
            <div className="settings-meta-label">
              <KeyRound size={14} /> Session Status
            </div>
            <div className="settings-meta-val" style={{ color: 'var(--color-success)', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
              <CheckCircle2 size={15} /> Active Authenticated JWT
            </div>
          </div>

          <div className="settings-meta-item">
            <div className="settings-meta-label">
              <Lock size={14} /> Encryption In Transit
            </div>
            <div className="settings-meta-val">TLS 1.3 / 256-Bit Standard</div>
          </div>

          <div className="settings-meta-item">
            <div className="settings-meta-label">
              <ShieldCheck size={14} /> Access Authorization
            </div>
            <div className="settings-meta-val" style={{ textTransform: 'uppercase', color: 'var(--color-primary)' }}>
              {String(user?.role || 'User').replace(/_/g, ' ')} RBAC
            </div>
          </div>

          <div className="settings-meta-item">
            <div className="settings-meta-label">
              <FileText size={14} /> Audit Logging
            </div>
            <div className="settings-meta-val">Active System-Wide Logging</div>
          </div>
        </div>
      </div>

      {/* Privacy & Regulatory Standards Card */}
      <div className="settings-card">
        <h3 className="settings-card__title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
          <ShieldCheck size={18} style={{ color: 'var(--color-primary)' }} />
          Clinical Data Protection & Regulatory Protocols
        </h3>

        <div className="settings-privacy-list">
          <div className="settings-privacy-item">
            <div className="settings-privacy-bullet">
              <CheckCircle2 size={16} color="var(--color-primary)" />
            </div>
            <div>
              <div className="settings-privacy-title">HIPAA & Healthcare Data Confidentiality</div>
              <div className="settings-privacy-desc">
                Protected Health Information (PHI) is strictly compartmentalized. Staff members are authorized to access medical records solely on a clinical need-to-know basis.
              </div>
            </div>
          </div>

          <div className="settings-privacy-item">
            <div className="settings-privacy-bullet">
              <CheckCircle2 size={16} color="var(--color-primary)" />
            </div>
            <div>
              <div className="settings-privacy-title">Cryptographic Storage & Secure Hashing</div>
              <div className="settings-privacy-desc">
                Account passwords are never stored in plaintext and are protected via salted bcrypt cryptographic hashing. Electronic health records and attachments are isolated with secure access policies.
              </div>
            </div>
          </div>

          <div className="settings-privacy-item">
            <div className="settings-privacy-bullet">
              <CheckCircle2 size={16} color="var(--color-primary)" />
            </div>
            <div>
              <div className="settings-privacy-title">Automatic Session Revocation</div>
              <div className="settings-privacy-desc">
                Terminal sessions automatically invalidate expired authorization tokens to protect clinical workstations against unauthorized access during shift rotations.
              </div>
            </div>
          </div>

          <div className="settings-privacy-item">
            <div className="settings-privacy-bullet">
              <CheckCircle2 size={16} color="var(--color-primary)" />
            </div>
            <div>
              <div className="settings-privacy-title">Comprehensive Audit Trail</div>
              <div className="settings-privacy-desc">
                All administrative mutations, prescription dispensations, vital sign recordings, and record modifications produce immutable audit events for hospital compliance inspection.
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
