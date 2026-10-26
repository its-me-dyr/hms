/**
 * Receptionist Dashboard Master Component
 * 
 * Central controller for all 12 Front Desk / Reception modules:
 * 1.  dashboard          -> ReceptionOverviewTab
 * 2.  register-patient   -> PatientRegistrationTab
 * 3.  patients           -> PatientsListTab
 * 4.  appointments       -> AppointmentsTab
 * 5.  check-in-out       -> CheckInOutTab
 * 6.  queue-tokens       -> QueueTokensTab
 * 7.  opd-registration   -> OPDRegistrationTab
 * 8.  admission          -> AdmissionTab
 * 9.  billing-coord      -> BillingCoordinationTab
 * 10. search-patient     -> PatientSearchTab
 * 11. notifications      -> NotificationsTab
 * 12. profile            -> ReceptionProfileTab
 */

import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '../../context/useAuth';

// Tab Subcomponents
import ReceptionOverviewTab from './reception/ReceptionOverviewTab';
import PatientRegistrationTab from './reception/PatientRegistrationTab';
import PatientsListTab from './reception/PatientsListTab';
import AppointmentsTab from './reception/AppointmentsTab';
import CheckInOutTab from './reception/CheckInOutTab';
import QueueTokensTab from './reception/QueueTokensTab';
import OPDRegistrationTab from './reception/OPDRegistrationTab';
import AdmissionTab from './reception/AdmissionTab';
import BillingCoordinationTab from './reception/BillingCoordinationTab';
import PatientSearchTab from './reception/PatientSearchTab';
import NotificationsTab from './reception/NotificationsTab';
import ReceptionProfileTab from './reception/ReceptionProfileTab';

// Modals
import BookAppointmentModal from './reception/BookAppointmentModal';
import { Calendar } from 'lucide-react';

export default function ReceptionistDashboard() {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get('tab') || 'dashboard';

  // Global Modals State
  const [bookAppointmentState, setBookAppointmentState] = useState({
    open: false,
    patient: null,
  });
  const [selectedPatientRecord, setSelectedPatientRecord] = useState(null);

  // Tab switching helper
  const handleNavigateTab = (tabId) => {
    setSearchParams({ tab: tabId });
  };

  // Open Book Appointment modal
  const handleOpenBookAppointment = (patient = null) => {
    setBookAppointmentState({
      open: true,
      patient: patient || null,
    });
  };

  // Open Patient Record modal
  const handleSelectPatient = (patient) => {
    setSelectedPatientRecord(patient);
  };

  return (
    <div className="receptionist-portal" style={{ minHeight: '100%', width: '100%' }}>
      {/* ── Active Module Router ── */}
      {(() => {
        switch (activeTab) {
          case 'dashboard':
            return (
              <ReceptionOverviewTab
                user={user}
                onNavigateTab={handleNavigateTab}
                onSelectPatient={handleSelectPatient}
                onOpenBookAppointment={handleOpenBookAppointment}
              />
            );

          case 'register-patient':
            return (
              <PatientRegistrationTab
                onNavigateTab={handleNavigateTab}
                onSelectPatient={handleSelectPatient}
                onOpenBookAppointment={handleOpenBookAppointment}
              />
            );

          case 'patients':
            return (
              <PatientsListTab
                onNavigateTab={handleNavigateTab}
                onSelectPatient={handleSelectPatient}
                onOpenBookAppointment={handleOpenBookAppointment}
              />
            );

          case 'appointments':
            return (
              <AppointmentsTab
                onNavigateTab={handleNavigateTab}
                onSelectPatient={handleSelectPatient}
                onOpenBookAppointment={handleOpenBookAppointment}
              />
            );

          case 'check-in-out':
            return (
              <CheckInOutTab
                onNavigateTab={handleNavigateTab}
                onSelectPatient={handleSelectPatient}
                onOpenBookAppointment={handleOpenBookAppointment}
              />
            );

          case 'queue-tokens':
            return (
              <QueueTokensTab
                onNavigateTab={handleNavigateTab}
                onSelectPatient={handleSelectPatient}
                onOpenBookAppointment={handleOpenBookAppointment}
              />
            );

          case 'opd-registration':
            return (
              <OPDRegistrationTab
                onNavigateTab={handleNavigateTab}
                onSelectPatient={handleSelectPatient}
                onOpenBookAppointment={handleOpenBookAppointment}
              />
            );

          case 'admission':
            return (
              <AdmissionTab
                onNavigateTab={handleNavigateTab}
                onSelectPatient={handleSelectPatient}
                onOpenBookAppointment={handleOpenBookAppointment}
              />
            );

          case 'billing-coord':
            return (
              <BillingCoordinationTab
                onNavigateTab={handleNavigateTab}
                onSelectPatient={handleSelectPatient}
                onOpenBookAppointment={handleOpenBookAppointment}
              />
            );

          case 'search-patient':
            return (
              <PatientSearchTab
                onNavigateTab={handleNavigateTab}
                onSelectPatient={handleSelectPatient}
                onOpenBookAppointment={handleOpenBookAppointment}
              />
            );

          case 'notifications':
            return (
              <NotificationsTab
                onNavigateTab={handleNavigateTab}
                onSelectPatient={handleSelectPatient}
                onOpenBookAppointment={handleOpenBookAppointment}
              />
            );

          case 'profile':
            return (
              <ReceptionProfileTab
                user={user}
                onNavigateTab={handleNavigateTab}
              />
            );

          default:
            return (
              <ReceptionOverviewTab
                user={user}
                onNavigateTab={handleNavigateTab}
                onSelectPatient={handleSelectPatient}
                onOpenBookAppointment={handleOpenBookAppointment}
              />
            );
        }
      })()}

      {/* ── Global Book Appointment Wizard Modal ── */}
      <BookAppointmentModal
        isOpen={bookAppointmentState.open}
        initialPatient={bookAppointmentState.patient}
        onClose={() => setBookAppointmentState({ open: false, patient: null })}
        onSuccess={() => {
          setBookAppointmentState({ open: false, patient: null });
        }}
      />

      {/* ── Global Patient Quick View Modal ── */}
      {selectedPatientRecord && (
        <div className="rec-modal-overlay" onClick={() => setSelectedPatientRecord(null)}>
          <div
            className="rec-modal-card"
            style={{ maxWidth: '600px' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="rec-modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <div
                  style={{
                    width: '42px',
                    height: '42px',
                    borderRadius: '50%',
                    backgroundColor: 'rgba(8, 145, 178, 0.1)',
                    color: '#0891b2',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 700,
                    fontSize: '1.1rem',
                  }}
                >
                  {(selectedPatientRecord.firstName || 'P').charAt(0).toUpperCase()}
                </div>
                <div>
                  <h3 className="rec-modal-title">
                    {selectedPatientRecord.firstName} {selectedPatientRecord.lastName}
                  </h3>
                  <div style={{ fontSize: '0.78rem', color: '#64748b' }}>
                    ID: {selectedPatientRecord.patientId || 'Pending'} • Registered Patient
                  </div>
                </div>
              </div>
              <button
                type="button"
                className="rec-modal-close"
                onClick={() => setSelectedPatientRecord(null)}
              >
                ×
              </button>
            </div>

            <div className="rec-modal-body">
              {/* Demographics grid */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: '0.75rem',
                  marginBottom: '1.25rem',
                  fontSize: '0.88rem',
                }}
              >
                <div style={{ padding: '0.75rem', backgroundColor: '#f8fafc', borderRadius: '8px' }}>
                  <span style={{ color: '#64748b', fontSize: '0.75rem', display: 'block' }}>GENDER & AGE</span>
                  <strong style={{ color: 'var(--text-primary)' }}>
                    {selectedPatientRecord.gender || 'Not specified'} • {selectedPatientRecord.age ? `${selectedPatientRecord.age} yrs` : 'N/A'}
                  </strong>
                </div>

                <div style={{ padding: '0.75rem', backgroundColor: '#f8fafc', borderRadius: '8px' }}>
                  <span style={{ color: '#64748b', fontSize: '0.75rem', display: 'block' }}>BLOOD GROUP</span>
                  <strong style={{ color: '#ef4444' }}>
                    {selectedPatientRecord.bloodGroup || 'Not Recorded'}
                  </strong>
                </div>

                <div style={{ padding: '0.75rem', backgroundColor: '#f8fafc', borderRadius: '8px' }}>
                  <span style={{ color: '#64748b', fontSize: '0.75rem', display: 'block' }}>PHONE NUMBER</span>
                  <strong style={{ color: 'var(--text-primary)' }}>
                    {selectedPatientRecord.phone || 'N/A'}
                  </strong>
                </div>

                <div style={{ padding: '0.75rem', backgroundColor: '#f8fafc', borderRadius: '8px' }}>
                  <span style={{ color: '#64748b', fontSize: '0.75rem', display: 'block' }}>EMAIL</span>
                  <strong style={{ color: 'var(--text-primary)', wordBreak: 'break-all' }}>
                    {selectedPatientRecord.email || 'N/A'}
                  </strong>
                </div>
              </div>

              {/* Address & Emergency */}
              <div style={{ border: '1px solid #e2e8f0', borderRadius: '8px', padding: '0.85rem', marginBottom: '1rem', fontSize: '0.85rem' }}>
                <div style={{ color: '#64748b', fontSize: '0.75rem', fontWeight: 700, marginBottom: '0.25rem' }}>
                  CONTACT & RESIDENTIAL ADDRESS
                </div>
                <div style={{ color: '#1e293b' }}>
                  {selectedPatientRecord.address?.street
                    ? `${selectedPatientRecord.address.street}, ${selectedPatientRecord.address.city || ''} ${selectedPatientRecord.address.zipCode || ''}`
                    : 'Address not recorded.'}
                </div>
                {selectedPatientRecord.emergencyContact && (
                  <div style={{ marginTop: '0.5rem', color: '#0891b2' }}>
                    Emergency Contact: <strong>{selectedPatientRecord.emergencyContact.name || 'Relation'} ({selectedPatientRecord.emergencyContact.phone || 'N/A'})</strong>
                  </div>
                )}
              </div>
            </div>

            <div className="rec-modal-footer">
              <button
                type="button"
                className="rec-btn rec-btn--secondary"
                onClick={() => setSelectedPatientRecord(null)}
              >
                Close
              </button>
              <button
                type="button"
                className="rec-btn rec-btn--primary"
                onClick={() => {
                  const pt = selectedPatientRecord;
                  setSelectedPatientRecord(null);
                  handleOpenBookAppointment(pt);
                }}
              >
                <Calendar size={16} />
                <span>Book Appointment</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
