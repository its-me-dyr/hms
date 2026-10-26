/**
 * Hospital Admin Portal — System Configuration
 * 
 * Clean, production-ready, focused system configuration management component.
 * 
 * Responsibilities:
 * 1. Appointment Scheduling (Appointment Buffer minutes, Max Appointments per Slot).
 * 2. Emergency Contact (Authoritative Emergency Hotline).
 * 3. Notification Configuration (Email Notifications toggle).
 * 4. System Availability (Maintenance Mode toggle with confirmation modal).
 * 5. Full audit logging integration (UPDATE_SYSTEM_CONFIG), multi-tenant isolation,
 *    and seamless light/dark mode compatibility.
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  CalendarClock,
  PhoneCall,
  BellRing,
  ShieldAlert,
  CheckCircle2,
  AlertCircle,
  RotateCcw,
  Save,
  Loader2,
  Info,
  AlertTriangle,
  X,
} from 'lucide-react';
import { hospitalAdminService } from '../../../services/hospitalAdmin.service';

const DEFAULT_CONFIG = {
  appointmentBufferMinutes: 15,
  maxAppointmentsPerSlot: 3,
  emergencyHotline: '+1 (800) 555-0199',
  enableEmailNotifications: true,
  maintenanceMode: false,
};

export default function HospitalSystemConfigTab({ onConfigChange }) {
  // ─── 1. State ───
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  // Form State
  const [formData, setFormData] = useState({ ...DEFAULT_CONFIG });
  const [savedData, setSavedData] = useState({ ...DEFAULT_CONFIG });

  // Field validation errors
  const [validationErrors, setValidationErrors] = useState({});

  // Maintenance Mode Confirmation Modal
  const [maintenanceModalOpen, setMaintenanceModalOpen] = useState(false);

  // ─── 2. Fetch System Configuration ───
  const fetchConfig = useCallback(async () => {
    setLoading(true);
    setErrorMsg('');
    try {
      const res = await hospitalAdminService.getSystemConfig();
      const data = res?.data?.data || res?.data || {};

      const loaded = {
        appointmentBufferMinutes:
          data.appointmentBufferMinutes !== undefined ? Number(data.appointmentBufferMinutes) : DEFAULT_CONFIG.appointmentBufferMinutes,
        maxAppointmentsPerSlot:
          data.maxAppointmentsPerSlot !== undefined ? Number(data.maxAppointmentsPerSlot) : DEFAULT_CONFIG.maxAppointmentsPerSlot,
        emergencyHotline:
          data.emergencyHotline || data.emergencyContactNumber || DEFAULT_CONFIG.emergencyHotline,
        enableEmailNotifications:
          data.enableEmailNotifications !== undefined ? Boolean(data.enableEmailNotifications) : DEFAULT_CONFIG.enableEmailNotifications,
        maintenanceMode:
          data.maintenanceMode !== undefined ? Boolean(data.maintenanceMode) : DEFAULT_CONFIG.maintenanceMode,
      };

      setFormData(loaded);
      setSavedData(loaded);
      setValidationErrors({});
    } catch (err) {
      console.error('Failed to load system configuration:', err);
      setErrorMsg(
        err.response?.data?.message || err.message || 'Unable to load system configuration. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchConfig();
  }, [fetchConfig]);

  // ─── 3. Unsaved Changes Calculation ───
  const isDirty = useMemo(() => {
    return (
      Number(formData.appointmentBufferMinutes) !== Number(savedData.appointmentBufferMinutes) ||
      Number(formData.maxAppointmentsPerSlot) !== Number(savedData.maxAppointmentsPerSlot) ||
      formData.emergencyHotline.trim() !== savedData.emergencyHotline.trim() ||
      Boolean(formData.enableEmailNotifications) !== Boolean(savedData.enableEmailNotifications) ||
      Boolean(formData.maintenanceMode) !== Boolean(savedData.maintenanceMode)
    );
  }, [formData, savedData]);

  // ─── 4. Field Change Handlers ───
  const handleFieldChange = (field, value) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));

    if (validationErrors[field]) {
      setValidationErrors((prev) => {
        const copy = { ...prev };
        delete copy[field];
        return copy;
      });
    }
  };

  // Maintenance Toggle Handler with Warning
  const handleMaintenanceToggle = (checked) => {
    if (checked && !formData.maintenanceMode) {
      // Prompt confirmation before turning ON
      setMaintenanceModalOpen(true);
    } else {
      handleFieldChange('maintenanceMode', false);
    }
  };

  const confirmMaintenanceOn = () => {
    handleFieldChange('maintenanceMode', true);
    setMaintenanceModalOpen(false);
  };

  // ─── 5. Validation ───
  const validateForm = () => {
    const errors = {};

    const bufferVal = Number(formData.appointmentBufferMinutes);
    if (isNaN(bufferVal) || bufferVal < 0 || !Number.isInteger(bufferVal)) {
      errors.appointmentBufferMinutes = 'Appointment buffer must be a non-negative integer (in minutes).';
    } else if (bufferVal > 240) {
      errors.appointmentBufferMinutes = 'Appointment buffer cannot exceed 240 minutes.';
    }

    const slotVal = Number(formData.maxAppointmentsPerSlot);
    if (isNaN(slotVal) || slotVal < 1 || !Number.isInteger(slotVal)) {
      errors.maxAppointmentsPerSlot = 'Maximum appointments per slot must be an integer of at least 1.';
    } else if (slotVal > 100) {
      errors.maxAppointmentsPerSlot = 'Maximum appointments per slot cannot exceed 100.';
    }

    if (!formData.emergencyHotline || !formData.emergencyHotline.trim()) {
      errors.emergencyHotline = 'Emergency hotline contact number is required.';
    } else if (formData.emergencyHotline.trim().length > 50) {
      errors.emergencyHotline = 'Emergency hotline contact number cannot exceed 50 characters.';
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // ─── 6. Save Handler ───
  const handleSave = async (e) => {
    if (e) e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setSaving(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      const payload = {
        appointmentBufferMinutes: Number(formData.appointmentBufferMinutes),
        maxAppointmentsPerSlot: Number(formData.maxAppointmentsPerSlot),
        emergencyContactNumber: formData.emergencyHotline.trim(),
        emergencyHotline: formData.emergencyHotline.trim(),
        enableEmailNotifications: Boolean(formData.enableEmailNotifications),
        maintenanceMode: Boolean(formData.maintenanceMode),
      };

      const res = await hospitalAdminService.updateSystemConfig(payload);
      const updated = res?.data?.data || payload;

      const normalized = {
        appointmentBufferMinutes:
          updated.appointmentBufferMinutes !== undefined
            ? Number(updated.appointmentBufferMinutes)
            : Number(payload.appointmentBufferMinutes),
        maxAppointmentsPerSlot:
          updated.maxAppointmentsPerSlot !== undefined
            ? Number(updated.maxAppointmentsPerSlot)
            : Number(payload.maxAppointmentsPerSlot),
        emergencyHotline:
          updated.emergencyHotline || updated.emergencyContactNumber || payload.emergencyHotline,
        enableEmailNotifications:
          updated.enableEmailNotifications !== undefined
            ? Boolean(updated.enableEmailNotifications)
            : Boolean(payload.enableEmailNotifications),
        maintenanceMode:
          updated.maintenanceMode !== undefined
            ? Boolean(updated.maintenanceMode)
            : Boolean(payload.maintenanceMode),
      };

      setFormData(normalized);
      setSavedData(normalized);
      setSuccessMsg('System configuration updated successfully.');

      if (onConfigChange) {
        onConfigChange();
      }

      setTimeout(() => setSuccessMsg(''), 4500);
    } catch (err) {
      console.error('Error saving system configuration:', err);
      setErrorMsg(
        err.response?.data?.message || err.message || 'Failed to update system configuration. Please try again.'
      );
    } finally {
      setSaving(false);
    }
  };

  // ─── 7. Reset / Cancel Handler ───
  const handleReset = () => {
    setFormData({ ...savedData });
    setValidationErrors({});
    setErrorMsg('');
  };

  if (loading) {
    return (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '4rem 1rem',
          color: 'var(--text-secondary)',
        }}
      >
        <Loader2
          size={32}
          className="spin"
          style={{ animation: 'spin 1s linear infinite', marginBottom: '1rem', color: '#0891B2' }}
        />
        <p style={{ margin: 0, fontSize: '0.9375rem', fontWeight: 500 }}>Loading system configuration...</p>
      </div>
    );
  }

  return (
    <div className="ha-system-config-container" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      {/* ── Page Header (Clean, compact, no generic hero) ── */}
      <div className="ha-page-header">
        <div className="ha-page-header__left">
          <h1 className="ha-page-title">System Configuration</h1>
          <p className="ha-page-description">
            Configure operational parameters that control how the hospital system behaves.
          </p>
        </div>
      </div>

      {/* ── Feedback Alerts ── */}
      {successMsg && (
        <div className="ha-alert ha-alert--success" role="alert" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <CheckCircle2 size={16} />
          <span>{successMsg}</span>
        </div>
      )}

      {errorMsg && (
        <div className="ha-alert ha-alert--error" role="alert" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <AlertCircle size={16} />
          <span>{errorMsg}</span>
        </div>
      )}

      <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
        {/* =================================================================== */}
        {/* A. APPOINTMENT SCHEDULING */}
        {/* =================================================================== */}
        <div className="ha-panel" style={{ margin: 0 }}>
          <div className="ha-panel__header">
            <h2 className="ha-panel__title">
              <CalendarClock size={18} color="#0891B2" />
              Appointment Scheduling
            </h2>
          </div>
          <div className="ha-panel__body">
            <p style={{ margin: '0 0 1.25rem 0', fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>
              Controls the pacing and concurrent patient volume per consultation slot.
            </p>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
                gap: '1.25rem',
              }}
            >
              {/* 1. Appointment Buffer */}
              <div className="ha-form-group">
                <label style={{ fontWeight: 600, fontSize: '0.875rem', marginBottom: '0.35rem', display: 'block' }}>
                  Appointment Buffer
                </label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <input
                    type="number"
                    min="0"
                    max="240"
                    step="1"
                    value={formData.appointmentBufferMinutes}
                    onChange={(e) => handleFieldChange('appointmentBufferMinutes', e.target.value)}
                    style={{
                      borderColor: validationErrors.appointmentBufferMinutes ? '#ef4444' : undefined,
                      width: '120px',
                    }}
                  />
                  <span style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', fontWeight: 500 }}>
                    minutes
                  </span>
                </div>
                {validationErrors.appointmentBufferMinutes ? (
                  <span style={{ color: '#ef4444', fontSize: '0.75rem', marginTop: '0.25rem', display: 'block' }}>
                    {validationErrors.appointmentBufferMinutes}
                  </span>
                ) : (
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.25rem', display: 'block' }}>
                    Minimum transition window reserved between scheduled appointments.
                  </span>
                )}
              </div>

              {/* 2. Maximum Appointments Per Slot */}
              <div className="ha-form-group">
                <label style={{ fontWeight: 600, fontSize: '0.875rem', marginBottom: '0.35rem', display: 'block' }}>
                  Maximum Appointments Per Slot
                </label>
                <input
                  type="number"
                  min="1"
                  max="100"
                  step="1"
                  value={formData.maxAppointmentsPerSlot}
                  onChange={(e) => handleFieldChange('maxAppointmentsPerSlot', e.target.value)}
                  style={{
                    borderColor: validationErrors.maxAppointmentsPerSlot ? '#ef4444' : undefined,
                    maxWidth: '160px',
                  }}
                />
                {validationErrors.maxAppointmentsPerSlot ? (
                  <span style={{ color: '#ef4444', fontSize: '0.75rem', marginTop: '0.25rem', display: 'block' }}>
                    {validationErrors.maxAppointmentsPerSlot}
                  </span>
                ) : (
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.25rem', display: 'block' }}>
                    Upper threshold of patients booked into a single time slot window.
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* =================================================================== */}
        {/* B. EMERGENCY CONTACT */}
        {/* =================================================================== */}
        <div className="ha-panel" style={{ margin: 0 }}>
          <div className="ha-panel__header">
            <h2 className="ha-panel__title">
              <PhoneCall size={18} color="#0891B2" />
              Emergency Contact
            </h2>
          </div>
          <div className="ha-panel__body">
            <p style={{ margin: '0 0 1.25rem 0', fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>
              Primary emergency dispatch contact displayed across patient interfaces and clinical paperwork.
            </p>

            <div className="ha-form-group" style={{ maxWidth: '420px' }}>
              <label style={{ fontWeight: 600, fontSize: '0.875rem', marginBottom: '0.35rem', display: 'block' }}>
                Emergency Hotline
              </label>
              <input
                type="text"
                placeholder="e.g. 911 / 108 or +1 (800) 555-0199"
                value={formData.emergencyHotline}
                onChange={(e) => handleFieldChange('emergencyHotline', e.target.value)}
                style={{
                  borderColor: validationErrors.emergencyHotline ? '#ef4444' : undefined,
                }}
              />
              {validationErrors.emergencyHotline ? (
                <span style={{ color: '#ef4444', fontSize: '0.75rem', marginTop: '0.25rem', display: 'block' }}>
                  {validationErrors.emergencyHotline}
                </span>
              ) : (
                <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.25rem', display: 'block' }}>
                  Authoritative hotline synchronized with hospital emergency parameters.
                </span>
              )}
            </div>
          </div>
        </div>

        {/* =================================================================== */}
        {/* C. NOTIFICATION CONFIGURATION */}
        {/* =================================================================== */}
        <div className="ha-panel" style={{ margin: 0 }}>
          <div className="ha-panel__header">
            <h2 className="ha-panel__title">
              <BellRing size={18} color="#0891B2" />
              Notification Configuration
            </h2>
          </div>
          <div className="ha-panel__body">
            <p style={{ margin: '0 0 1.25rem 0', fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>
              Configure automated messaging systems dispatched to patients and hospital staff.
            </p>

            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '1rem',
                borderRadius: '0.5rem',
                border: '1px solid var(--border-color)',
                background: 'var(--bg-surface)',
                maxWidth: '650px',
              }}
            >
              <div>
                <div style={{ fontWeight: 600, fontSize: '0.9375rem', color: 'var(--text-primary)', marginBottom: '0.25rem' }}>
                  Email Notifications
                </div>
                <div style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>
                  Controls transactional email dispatch for appointment confirmations, reminders, and billing receipts.
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexShrink: 0, marginLeft: '1rem' }}>
                <span
                  className={`ha-badge ${formData.enableEmailNotifications ? 'ha-badge--success' : 'ha-badge--secondary'}`}
                  style={{ fontSize: '0.75rem', fontWeight: 600 }}
                >
                  {formData.enableEmailNotifications ? 'Enabled' : 'Disabled'}
                </span>
                <label
                  style={{
                    position: 'relative',
                    display: 'inline-block',
                    width: '44px',
                    height: '24px',
                    cursor: 'pointer',
                    margin: 0,
                  }}
                >
                  <input
                    type="checkbox"
                    aria-label="Toggle Email Notifications"
                    checked={formData.enableEmailNotifications}
                    onChange={(e) => handleFieldChange('enableEmailNotifications', e.target.checked)}
                    style={{ opacity: 0, width: 0, height: 0 }}
                  />
                  <span
                    style={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      right: 0,
                      bottom: 0,
                      backgroundColor: formData.enableEmailNotifications ? '#0891B2' : 'var(--border-color)',
                      borderRadius: '24px',
                      transition: '0.2s',
                    }}
                  >
                    <span
                      style={{
                        position: 'absolute',
                        height: '18px',
                        width: '18px',
                        left: formData.enableEmailNotifications ? '23px' : '3px',
                        bottom: '3px',
                        backgroundColor: '#ffffff',
                        borderRadius: '50%',
                        transition: '0.2s',
                        boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
                      }}
                    />
                  </span>
                </label>
              </div>
            </div>
          </div>
        </div>

        {/* =================================================================== */}
        {/* D. SYSTEM AVAILABILITY */}
        {/* =================================================================== */}
        <div className="ha-panel" style={{ margin: 0 }}>
          <div className="ha-panel__header">
            <h2 className="ha-panel__title">
              <ShieldAlert size={18} color="#0891B2" />
              System Availability
            </h2>
          </div>
          <div className="ha-panel__body">
            <p style={{ margin: '0 0 1.25rem 0', fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>
              Hospital operational status and administrative maintenance controls.
            </p>

            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '1rem',
                borderRadius: '0.5rem',
                border: formData.maintenanceMode ? '1px solid #ef4444' : '1px solid var(--border-color)',
                background: formData.maintenanceMode ? 'rgba(239, 68, 68, 0.05)' : 'var(--bg-surface)',
                maxWidth: '650px',
                marginBottom: '1rem',
              }}
            >
              <div>
                <div style={{ fontWeight: 600, fontSize: '0.9375rem', color: formData.maintenanceMode ? '#ef4444' : 'var(--text-primary)', marginBottom: '0.25rem' }}>
                  Maintenance Mode
                </div>
                <div style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>
                  Enabling maintenance mode indicates operational suspension and restricts regular scheduling workflows.
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexShrink: 0, marginLeft: '1rem' }}>
                <span
                  className={`ha-badge ${formData.maintenanceMode ? 'ha-badge--danger' : 'ha-badge--secondary'}`}
                  style={{ fontSize: '0.75rem', fontWeight: 600 }}
                >
                  {formData.maintenanceMode ? 'Active' : 'Off'}
                </span>
                <label
                  style={{
                    position: 'relative',
                    display: 'inline-block',
                    width: '44px',
                    height: '24px',
                    cursor: 'pointer',
                    margin: 0,
                  }}
                >
                  <input
                    type="checkbox"
                    aria-label="Toggle Maintenance Mode"
                    checked={formData.maintenanceMode}
                    onChange={(e) => handleMaintenanceToggle(e.target.checked)}
                    style={{ opacity: 0, width: 0, height: 0 }}
                  />
                  <span
                    style={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      right: 0,
                      bottom: 0,
                      backgroundColor: formData.maintenanceMode ? '#ef4444' : 'var(--border-color)',
                      borderRadius: '24px',
                      transition: '0.2s',
                    }}
                  >
                    <span
                      style={{
                        position: 'absolute',
                        height: '18px',
                        width: '18px',
                        left: formData.maintenanceMode ? '23px' : '3px',
                        bottom: '3px',
                        backgroundColor: '#ffffff',
                        borderRadius: '50%',
                        transition: '0.2s',
                        boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
                      }}
                    />
                  </span>
                </label>
              </div>
            </div>

            {formData.maintenanceMode && (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '0.75rem',
                  padding: '0.875rem 1rem',
                  borderRadius: '0.5rem',
                  backgroundColor: 'rgba(239, 68, 68, 0.08)',
                  border: '1px solid rgba(239, 68, 68, 0.25)',
                  color: 'var(--text-primary)',
                  fontSize: '0.8125rem',
                  maxWidth: '650px',
                }}
              >
                <AlertTriangle size={18} color="#ef4444" style={{ flexShrink: 0, marginTop: '2px' }} />
                <div>
                  <strong>Maintenance mode active:</strong> Routine outpatient appointment booking and self-service registration are flagged as paused during system service.
                </div>
              </div>
            )}
          </div>
        </div>

        {/* =================================================================== */}
        {/* BOTTOM ACTION BAR */}
        {/* =================================================================== */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: '0.75rem',
            paddingTop: '0.75rem',
          }}
        >
          <div>
            {isDirty && (
              <span
                className="ha-badge ha-badge--warning"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.35rem',
                  padding: '0.3rem 0.6rem',
                  fontSize: '0.75rem',
                  fontWeight: 600,
                }}
              >
                <Info size={13} />
                Unsaved changes
              </span>
            )}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <button
              type="button"
              className="ha-btn ha-btn--secondary"
              onClick={handleReset}
              disabled={!isDirty || saving}
              title="Discard edits and restore last saved system configuration"
            >
              <RotateCcw size={15} />
              Cancel
            </button>

            <button
              type="submit"
              className="ha-btn ha-btn--primary"
              disabled={saving || !isDirty}
              title="Save system configuration to database"
            >
              {saving ? (
                <>
                  <Loader2 size={15} className="spin" style={{ animation: 'spin 1s linear infinite' }} />
                  Saving changes...
                </>
              ) : (
                <>
                  <Save size={15} />
                  Save Changes
                </>
              )}
            </button>
          </div>
        </div>
      </form>

      {/* ── Maintenance Mode Confirmation Modal ── */}
      {maintenanceModalOpen && (
        <div className="ha-modal-overlay">
          <div className="ha-modal" style={{ maxWidth: '440px' }}>
            <div className="ha-modal__header" style={{ borderBottom: '1px solid rgba(239, 68, 68, 0.2)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#ef4444' }}>
                <AlertTriangle size={20} />
                <h3 className="ha-modal__title" style={{ color: '#ef4444', margin: 0 }}>
                  Enable Maintenance Mode?
                </h3>
              </div>
              <button
                type="button"
                className="ha-btn ha-btn--secondary ha-btn--sm"
                onClick={() => setMaintenanceModalOpen(false)}
              >
                <X size={14} />
              </button>
            </div>
            <div className="ha-modal__body" style={{ padding: '1.25rem' }}>
              <p style={{ margin: '0 0 0.75rem 0', fontSize: '0.875rem', lineHeight: 1.5, color: 'var(--text-primary)' }}>
                Maintenance mode may affect normal user access and pause routine outpatient scheduling.
              </p>
              <p style={{ margin: 0, fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>
                Do you wish to proceed and mark the system as in maintenance?
              </p>
            </div>
            <div className="ha-modal__footer" style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
              <button
                type="button"
                className="ha-btn ha-btn--secondary"
                onClick={() => setMaintenanceModalOpen(false)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="ha-btn ha-btn--primary"
                style={{ backgroundColor: '#ef4444', borderColor: '#ef4444', color: '#ffffff' }}
                onClick={confirmMaintenanceOn}
              >
                Confirm Enable
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
