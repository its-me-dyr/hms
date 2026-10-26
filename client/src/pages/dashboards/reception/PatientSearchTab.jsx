/**
 * Reception Patient Search Tab
 * 
 * Universal fast patient directory search:
 * - Auto-focused instant search by Name, Patient ID, Phone, Email, or Blood Group
 * - Detailed patient preview cards with contact, clinical demographics, and status
 * - Quick Action buttons: View Profile, Book Appointment, Issue OPD Token, Check-In
 * - Direct routing to other reception modules with the patient in context
 */

import { useState, useEffect } from 'react';
import {
  Search,
  Phone,
  Mail,
  Calendar,
  Ticket,
  LogIn,
  Eye,
  Plus,
  RefreshCw,
  AlertCircle,
} from 'lucide-react';
import { receptionService } from '../../../services/reception.service';

export default function PatientSearchTab({
  onNavigateTab,
  onSelectPatient,
  onOpenBookAppointment,
}) {
  const [query, setQuery] = useState('');
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Quick search pills
  const [genderFilter, setGenderFilter] = useState('');
  const [bloodGroupFilter, setBloodGroupFilter] = useState('');

  useEffect(() => {
    let ignore = false;
    const fetchFilteredPatients = async () => {
      try {
        const params = {
          search: (query || '').trim(),
          limit: 20,
        };
        if (genderFilter) params.gender = genderFilter;
        if (bloodGroupFilter) params.bloodGroup = bloodGroupFilter;

        const res = await receptionService.getPatients(params);
        if (!ignore) {
          const list = res.data?.patients || res.data || [];
          setPatients(Array.isArray(list) ? list : []);
        }
      } catch (err) {
        if (!ignore) {
          console.error('Search failed:', err);
          setError(err.message || 'Error searching patient records.');
        }
      } finally {
        if (!ignore) {
          setLoading(false);
        }
      }
    };

    fetchFilteredPatients();

    return () => {
      ignore = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [genderFilter, bloodGroupFilter]);

  const handleFormSubmit = async (e) => {
    if (e) e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const params = {
        search: query.trim(),
        limit: 20,
      };
      if (genderFilter) params.gender = genderFilter;
      if (bloodGroupFilter) params.bloodGroup = bloodGroupFilter;

      const res = await receptionService.getPatients(params);
      const list = res.data?.patients || res.data || [];
      setPatients(Array.isArray(list) ? list : []);
    } catch (err) {
      console.error('Search failed:', err);
      setError(err.message || 'Error searching patient records.');
    } finally {
      setLoading(false);
    }
  };

  const handleReset = async () => {
    setQuery('');
    setGenderFilter('');
    setBloodGroupFilter('');
    setLoading(true);
    setError('');
    try {
      const res = await receptionService.getPatients({ limit: 20 });
      const list = res.data?.patients || res.data || [];
      setPatients(Array.isArray(list) ? list : []);
    } catch (err) {
      setError(err.message || 'Error searching patient records.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="rec-container">
      {/* Header */}
      <div className="rec-header">
        <div className="rec-header-left">
          <div className="rec-header-badge">UNIVERSAL DIRECTORY</div>
          <h1 className="rec-header-title">Universal Patient Search</h1>
          <p className="rec-header-subtitle">
            Instantly look up any registered patient across the hospital using their ID, phone number, or full name.
          </p>
        </div>
        <div className="rec-header-actions">
          <button
            type="button"
            className="rec-btn rec-btn--primary"
            onClick={() => onNavigateTab('register-patient')}
          >
            <Plus size={18} />
            <span>Register New Patient</span>
          </button>
        </div>
      </div>

      {/* Hero Search Box Card */}
      <div
        className="rec-card"
        style={{
          marginBottom: '1.5rem',
          padding: '1.5rem',
          backgroundColor: 'var(--bg-card)',
          boxShadow: '0 4px 20px -2px rgba(8, 145, 178, 0.08)',
        }}
      >
        <form onSubmit={handleFormSubmit}>
          <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1rem' }}>
            <div style={{ flex: 1, position: 'relative' }}>
              <Search
                size={22}
                style={{
                  position: 'absolute',
                  left: '16px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: '#0891b2',
                }}
              />
              <input
                type="text"
                autoFocus
                placeholder="Search by Patient ID (e.g. HMS-P-1001), Phone Number, Full Name, Email..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="rec-form-input"
                style={{
                  paddingLeft: '48px',
                  height: '50px',
                  fontSize: '1.05rem',
                  borderRadius: '10px',
                  border: '2px solid #e2e8f0',
                }}
              />
            </div>
            <button
              type="submit"
              className="rec-btn rec-btn--primary"
              style={{ padding: '0 1.75rem', fontSize: '1rem', borderRadius: '10px' }}
              disabled={loading}
            >
              {loading ? <RefreshCw size={18} className="rec-spin" /> : 'Search Records'}
            </button>
          </div>

          {/* Quick Filter Pills */}
          <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
            <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#64748b' }}>
              Quick Filters:
            </span>

            {['', 'Male', 'Female', 'Other'].map((g) => (
              <button
                key={g || 'all-gender'}
                type="button"
                className={`rec-btn rec-btn--sm ${
                  genderFilter === g ? 'rec-btn--primary' : 'rec-btn--secondary'
                }`}
                style={{ fontSize: '0.75rem', padding: '0.25rem 0.6rem' }}
                onClick={() => setGenderFilter(g)}
              >
                {g || 'All Genders'}
              </button>
            ))}

            <span style={{ color: '#cbd5e1', margin: '0 0.25rem' }}>|</span>

            {['', 'O+', 'A+', 'B+', 'AB+'].map((b) => (
              <button
                key={b || 'all-blood'}
                type="button"
                className={`rec-btn rec-btn--sm ${
                  bloodGroupFilter === b ? 'rec-btn--primary' : 'rec-btn--secondary'
                }`}
                style={{ fontSize: '0.75rem', padding: '0.25rem 0.6rem' }}
                onClick={() => setBloodGroupFilter(b)}
              >
                {b || 'All Blood Groups'}
              </button>
            ))}

            {(query || genderFilter || bloodGroupFilter) && (
              <button
                type="button"
                className="rec-btn rec-btn--secondary rec-btn--sm"
                style={{ fontSize: '0.75rem', padding: '0.25rem 0.6rem', color: '#ef4444' }}
                onClick={handleReset}
              >
                Reset
              </button>
            )}
          </div>
        </form>
      </div>

      {/* Results Section */}
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <h2 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-primary)' }}>
            Search Results ({patients.length})
          </h2>
        </div>

        {loading ? (
          <div style={{ padding: '3.5rem', textAlign: 'center', color: '#64748b' }}>
            <RefreshCw size={32} className="rec-spin" style={{ margin: '0 auto 1rem', color: '#0891b2' }} />
            <p>Searching master patient registry...</p>
          </div>
        ) : error ? (
          <div className="rec-alert rec-alert--error" style={{ marginBottom: '1.5rem' }}>
            <AlertCircle size={18} />
            <span>{error}</span>
          </div>
        ) : patients.length === 0 ? (
          <div className="rec-card">
            <div className="rec-empty-state" style={{ padding: '3.5rem 1.5rem' }}>
              <Search size={48} className="rec-empty-state-icon" />
              <div className="rec-empty-state-title">No matching patients found</div>
              <div className="rec-empty-state-desc">
                {query
                  ? `No records found matching "${query}". Double-check spelling or register this patient.`
                  : 'Start typing above to search patients.'}
              </div>
              <button
                type="button"
                className="rec-btn rec-btn--primary"
                onClick={() => onNavigateTab('register-patient')}
                style={{ marginTop: '1rem' }}
              >
                <Plus size={16} />
                <span>Register New Patient</span>
              </button>
            </div>
          </div>
        ) : (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))',
              gap: '1.25rem',
            }}
          >
            {patients.map((patient) => {
              const fullName = `${patient.firstName || ''} ${patient.lastName || ''}`.trim();
              const initial = fullName.charAt(0).toUpperCase() || 'P';

              return (
                <div
                  key={patient._id}
                  className="rec-card"
                  style={{
                    padding: '1.25rem',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    transition: 'transform 0.15s ease, box-shadow 0.15s ease',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'translateY(-2px)';
                    e.currentTarget.style.boxShadow = '0 8px 25px -5px rgba(15, 23, 42, 0.08)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'none';
                    e.currentTarget.style.boxShadow = 'none';
                  }}
                >
                  <div>
                    {/* Top Patient Header */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
                      <div
                        style={{
                          width: '50px',
                          height: '50px',
                          borderRadius: '12px',
                          backgroundColor: 'rgba(8, 145, 178, 0.12)',
                          color: '#0891b2',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontWeight: 800,
                          fontSize: '1.25rem',
                          flexShrink: 0,
                        }}
                      >
                        {initial}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div
                          style={{
                            fontWeight: 700,
                            color: 'var(--text-primary)',
                            fontSize: '1.05rem',
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                          }}
                        >
                          {fullName}
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginTop: '0.2rem' }}>
                          <span className="rec-badge rec-badge--confirmed" style={{ fontSize: '0.72rem' }}>
                            {patient.patientId || 'HMS-PATIENT'}
                          </span>
                          <span style={{ fontSize: '0.75rem', color: '#64748b' }}>
                            {patient.gender} • {patient.age ? `${patient.age} yrs` : 'Age N/A'}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Quick Metadata */}
                    <div
                      style={{
                        backgroundColor: '#f8fafc',
                        borderRadius: '8px',
                        padding: '0.75rem',
                        fontSize: '0.82rem',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '0.4rem',
                        marginBottom: '1rem',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#334155' }}>
                        <Phone size={14} style={{ color: '#0891b2' }} />
                        <span>{patient.phone || 'Phone not recorded'}</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#334155' }}>
                        <Mail size={14} style={{ color: '#0891b2' }} />
                        <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {patient.email || 'Email not recorded'}
                        </span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', color: '#334155' }}>
                        <span>
                          Blood: <strong style={{ color: '#ef4444' }}>{patient.bloodGroup || 'Unknown'}</strong>
                        </span>
                        <span>
                          City: <strong>{patient.address?.city || 'Registered'}</strong>
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Action Buttons Bar */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                    <button
                      type="button"
                      className="rec-btn rec-btn--secondary rec-btn--sm"
                      onClick={() => onSelectPatient && onSelectPatient(patient)}
                      title="View Medical Chart"
                    >
                      <Eye size={14} />
                      <span>Full Profile</span>
                    </button>

                    <button
                      type="button"
                      className="rec-btn rec-btn--primary rec-btn--sm"
                      onClick={() => onOpenBookAppointment && onOpenBookAppointment(patient)}
                      title="Book Doctor Appointment"
                    >
                      <Calendar size={14} />
                      <span>Book Visit</span>
                    </button>

                    <button
                      type="button"
                      className="rec-btn rec-btn--secondary rec-btn--sm"
                      onClick={() => onNavigateTab('check-in-out')}
                      title="Check In this Patient"
                    >
                      <LogIn size={14} />
                      <span>Check-In</span>
                    </button>

                    <button
                      type="button"
                      className="rec-btn rec-btn--secondary rec-btn--sm"
                      onClick={() => onNavigateTab('opd-registration')}
                      title="Issue OPD Consultation Slip"
                    >
                      <Ticket size={14} />
                      <span>OPD Slip</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
