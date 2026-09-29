/**
 * Patients List Tab
 * 
 * Directory of all registered hospital patients:
 * - Real-time search by Name, Patient ID, Phone, Email
 * - Filters for Gender, Blood Group, Status
 * - Paginated responsive table
 * - Drill-down to Patient Details Drawer
 */

import { useState, useEffect } from 'react';
import {
  Users,
  Search,
  UserPlus,
  Eye,
  Calendar,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
  X,
} from 'lucide-react';
import { receptionService } from '../../../services/reception.service';

export default function PatientsListTab({ onNavigateTab, onSelectPatient, onOpenBookAppointment }) {
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [genderFilter, setGenderFilter] = useState('');
  const [bloodFilter, setBloodFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ total: 0, pages: 1, limit: 10 });

  // Details drawer
  const [selectedPatientId, setSelectedPatientId] = useState(null);
  const [patientDetail, setPatientDetail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const fetchPatients = () => {
    setLoading(true);
    setError('');
    receptionService.getPatients({
      search,
      gender: genderFilter,
      bloodGroup: bloodFilter,
      status: statusFilter,
      page,
      limit: 10,
    })
      .then((res) => {
        const data = res.data || res;
        setPatients(data.patients || []);
        setPagination(data.pagination || { total: 0, pages: 1, limit: 10 });
      })
      .catch((err) => {
        console.error('Error fetching patients:', err);
        setError(err.message || 'Failed to load patient records.');
      })
      .finally(() => {
        setLoading(false);
      });
  };

  useEffect(() => {
    let active = true;
    receptionService.getPatients({
      search,
      gender: genderFilter,
      bloodGroup: bloodFilter,
      status: statusFilter,
      page,
      limit: 10,
    })
      .then((res) => {
        if (!active) return;
        const data = res.data || res;
        setPatients(data.patients || []);
        setPagination(data.pagination || { total: 0, pages: 1, limit: 10 });
      })
      .catch((err) => {
        if (!active) return;
        console.error('Error fetching patients:', err);
        setError(err.message || 'Failed to load patient records.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [search, genderFilter, bloodFilter, statusFilter, page]);

  // Open patient details drawer
  const handleOpenDetails = async (id) => {
    setSelectedPatientId(id);
    setDetailLoading(true);
    try {
      const res = await receptionService.getPatientById(id);
      setPatientDetail(res.data || res);
    } catch (err) {
      console.error('Failed to load patient detail:', err);
    } finally {
      setDetailLoading(false);
    }
  };

  const handleCloseDetails = () => {
    setSelectedPatientId(null);
    setPatientDetail(null);
  };

  return (
    <div className="rec-container">
      {/* ─── PAGE HEADER ────────────────────────────────────── */}
      <div className="rec-page-header">
        <div>
          <h1 className="rec-page-title">Patients Directory</h1>
          <p className="rec-page-subtitle">Search, filter, and inspect registered patient files.</p>
        </div>

        <div style={{ display: 'flex', gap: '0.65rem' }}>
          <button
            onClick={fetchPatients}
            disabled={loading}
            className="btn btn--outline btn--sm"
          >
            <RefreshCw size={14} className={loading ? 'spin-icon' : ''} />
            <span>Refresh</span>
          </button>
          <button
            onClick={() => onNavigateTab('register-patient')}
            className="btn btn--primary btn--sm"
          >
            <UserPlus size={15} />
            <span>+ Register Patient</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="alert alert--danger" style={{ marginBottom: '1.25rem' }}>
          <AlertCircle size={16} />
          <span>{error}</span>
        </div>
      )}

      {/* ─── SEARCH & FILTER BAR ────────────────────────────── */}
      <div className="rec-card" style={{ padding: '1rem', marginBottom: '1.25rem' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', alignItems: 'center' }}>
          {/* Universal search input */}
          <div style={{ position: 'relative', flex: '1 1 280px' }}>
            <Search
              size={16}
              style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }}
            />
            <input
              type="text"
              placeholder="Search by patient name, ID, phone, email..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              className="form-input"
              style={{ paddingLeft: '2.25rem', height: '40px' }}
            />
          </div>

          {/* Gender Filter */}
          <select
            value={genderFilter}
            onChange={(e) => {
              setGenderFilter(e.target.value);
              setPage(1);
            }}
            className="form-input"
            style={{ width: 'auto', minWidth: '130px', height: '40px' }}
          >
            <option value="">All Genders</option>
            <option value="male">Male</option>
            <option value="female">Female</option>
            <option value="other">Other</option>
          </select>

          {/* Blood Group Filter */}
          <select
            value={bloodFilter}
            onChange={(e) => {
              setBloodFilter(e.target.value);
              setPage(1);
            }}
            className="form-input"
            style={{ width: 'auto', minWidth: '130px', height: '40px' }}
          >
            <option value="">All Blood Groups</option>
            <option value="A+">A+</option>
            <option value="A-">A-</option>
            <option value="B+">B+</option>
            <option value="B-">B-</option>
            <option value="AB+">AB+</option>
            <option value="AB-">AB-</option>
            <option value="O+">O+</option>
            <option value="O-">O-</option>
          </select>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(1);
            }}
            className="form-input"
            style={{ width: 'auto', minWidth: '130px', height: '40px' }}
          >
            <option value="">All Statuses</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>

          {(search || genderFilter || bloodFilter || statusFilter) && (
            <button
              onClick={() => {
                setSearch('');
                setGenderFilter('');
                setBloodFilter('');
                setStatusFilter('');
                setPage(1);
              }}
              className="btn btn--outline btn--sm"
              style={{ height: '40px' }}
            >
              Clear Filters
            </button>
          )}
        </div>
      </div>

      {/* ─── PATIENTS TABLE ─────────────────────────────────── */}
      <div className="rec-card" style={{ padding: 0, overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: '#64748b' }}>
            <RefreshCw size={24} className="spin-icon" style={{ margin: '0 auto 0.5rem', color: '#0891b2' }} />
            <p style={{ margin: 0 }}>Loading patient records...</p>
          </div>
        ) : patients.length === 0 ? (
          <div style={{ padding: '3.5rem 1.5rem', textAlign: 'center' }}>
            <Users size={36} style={{ color: '#cbd5e1', margin: '0 auto 0.75rem' }} />
            <h3 style={{ margin: '0 0 0.4rem', color: '#0f172a', fontSize: '1.05rem' }}>No patients found</h3>
            <p style={{ margin: '0 0 1rem', color: '#64748b', fontSize: '0.85rem' }}>
              {search ? 'Try adjusting your search criteria or filters.' : 'No registered patients in the database yet.'}
            </p>
            <button onClick={() => onNavigateTab('register-patient')} className="btn btn--primary btn--sm">
              + Register First Patient
            </button>
          </div>
        ) : (
          <div className="table-container" style={{ margin: 0, border: 'none' }}>
            <table className="table">
              <thead>
                <tr>
                  <th>Patient ID</th>
                  <th>Patient Name</th>
                  <th>Age / Gender</th>
                  <th>Contact Phone</th>
                  <th>Blood Group</th>
                  <th>City / Location</th>
                  <th>Status</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {patients.map((p) => (
                  <tr key={p.id}>
                    <td>
                      <span
                        style={{
                          background: '#f1f5f9',
                          color: '#0891b2',
                          fontWeight: 700,
                          fontSize: '0.78rem',
                          padding: '0.2rem 0.5rem',
                          borderRadius: '4px',
                          letterSpacing: '0.02em',
                        }}
                      >
                        {p.patientId}
                      </span>
                    </td>
                    <td>
                      <div style={{ fontWeight: 600, color: '#0f172a' }}>{p.name}</div>
                      <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{p.email}</div>
                    </td>
                    <td>
                      <div style={{ fontSize: '0.82rem', color: '#334155' }}>{p.age}</div>
                      <div style={{ fontSize: '0.72rem', color: '#64748b' }}>{p.gender}</div>
                    </td>
                    <td>
                      <span style={{ fontSize: '0.82rem', color: '#0f172a' }}>{p.phone}</span>
                    </td>
                    <td>
                      <span
                        style={{
                          background: '#fee2e2',
                          color: '#991b1b',
                          fontSize: '0.72rem',
                          fontWeight: 700,
                          padding: '0.15rem 0.45rem',
                          borderRadius: '4px',
                        }}
                      >
                        {p.bloodGroup}
                      </span>
                    </td>
                    <td>
                      <span style={{ fontSize: '0.8rem', color: '#64748b' }}>{p.address?.city || '—'}</span>
                    </td>
                    <td>
                      <span
                        className="badge badge--success"
                        style={{ textTransform: 'capitalize', fontSize: '0.7rem' }}
                      >
                        {p.status}
                      </span>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <div style={{ display: 'inline-flex', gap: '0.4rem' }}>
                        <button
                          onClick={() => handleOpenDetails(p.id)}
                          className="btn btn--outline btn--sm"
                          style={{ padding: '0.25rem 0.55rem', fontSize: '0.75rem' }}
                          title="View Profile Details"
                        >
                          <Eye size={13} />
                          <span>View</span>
                        </button>
                        <button
                          onClick={() => {
                            if (onOpenBookAppointment) onOpenBookAppointment(p);
                            else onNavigateTab('appointments');
                          }}
                          className="btn btn--primary btn--sm"
                          style={{ padding: '0.25rem 0.55rem', fontSize: '0.75rem' }}
                          title="Book Visit"
                        >
                          <Calendar size={13} />
                          <span>Book</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* ─── PAGINATION BAR ─────────────────────────────────── */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '0.85rem 1.25rem',
            background: 'var(--bg-card)',
            borderTop: '1px solid #e2e8f0',
            fontSize: '0.8125rem',
            color: '#64748b',
          }}
        >
          <div>
            Showing <strong>{patients.length}</strong> of <strong>{pagination.total}</strong> registered patients
          </div>
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="btn btn--outline btn--sm"
            >
              <ChevronLeft size={14} />
              <span>Previous</span>
            </button>
            <span>
              Page {page} of {pagination.pages}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(pagination.pages, p + 1))}
              disabled={page >= pagination.pages}
              className="btn btn--outline btn--sm"
            >
              <span>Next</span>
              <ChevronRight size={14} />
            </button>
          </div>
        </div>
      </div>

      {/* ─── PATIENT DETAILS DRAWER / MODAL ─────────────────── */}
      {selectedPatientId && (
        <div className="hms-modal-backdrop" onClick={handleCloseDetails}>
          <div
            className="hms-modal"
            style={{ maxWidth: '680px', maxHeight: '90vh', overflowY: 'auto', textAlign: 'left' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.25rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <div
                  style={{
                    width: '48px',
                    height: '48px',
                    borderRadius: '12px',
                    background: '#e0f2fe',
                    color: '#0284c7',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 800,
                    fontSize: '1.1rem',
                  }}
                >
                  {patientDetail?.firstName?.[0] || 'P'}
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800, color: '#0f172a' }}>
                    {patientDetail?.name || 'Patient Profile'}
                  </h3>
                  <div style={{ fontSize: '0.78rem', color: '#64748b' }}>
                    ID: <strong style={{ color: '#0891b2' }}>{patientDetail?.patientId}</strong> • Registered on {new Date(patientDetail?.registeredAt).toLocaleDateString()}
                  </div>
                </div>
              </div>
              <button
                onClick={handleCloseDetails}
                className="btn btn--outline btn--sm"
                style={{ borderRadius: '50%', width: '32px', height: '32px', padding: 0 }}
              >
                <X size={16} />
              </button>
            </div>

            {detailLoading ? (
              <div style={{ padding: '2rem', textAlign: 'center', color: '#94a3b8' }}>Loading profile details...</div>
            ) : patientDetail ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                {/* Demographic & Contact Details Grid */}
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(3, 1fr)',
                    gap: '0.75rem',
                    background: '#f8fafc',
                    border: '1px solid var(--border-color)',
                    borderRadius: '10px',
                    padding: '0.85rem',
                    fontSize: '0.8rem',
                  }}
                >
                  <div>
                    <span style={{ color: '#64748b', display: 'block', fontSize: '0.72rem' }}>PHONE NUMBER</span>
                    <strong style={{ color: '#0f172a' }}>{patientDetail.phone}</strong>
                  </div>
                  <div>
                    <span style={{ color: '#64748b', display: 'block', fontSize: '0.72rem' }}>EMAIL ADDRESS</span>
                    <strong style={{ color: '#0f172a' }}>{patientDetail.email}</strong>
                  </div>
                  <div>
                    <span style={{ color: '#64748b', display: 'block', fontSize: '0.72rem' }}>GENDER & AGE</span>
                    <strong style={{ color: '#0f172a' }}>{patientDetail.gender} ({patientDetail.age})</strong>
                  </div>
                  <div>
                    <span style={{ color: '#64748b', display: 'block', fontSize: '0.72rem' }}>BLOOD GROUP</span>
                    <strong style={{ color: '#dc2626' }}>{patientDetail.bloodGroup}</strong>
                  </div>
                  <div>
                    <span style={{ color: '#64748b', display: 'block', fontSize: '0.72rem' }}>LOCATION</span>
                    <strong style={{ color: '#0f172a' }}>{patientDetail.address?.city || 'Springfield'}, {patientDetail.address?.state || 'IL'}</strong>
                  </div>
                  <div>
                    <span style={{ color: '#64748b', display: 'block', fontSize: '0.72rem' }}>ACCOUNT STATUS</span>
                    <span className="badge badge--success" style={{ fontSize: '0.68rem' }}>{patientDetail.status}</span>
                  </div>
                </div>

                {/* Emergency Contact & Allergies */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.85rem' }}>
                  <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '8px', padding: '0.75rem' }}>
                    <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#991b1b', textTransform: 'uppercase' }}>
                      Known Allergies
                    </div>
                    <div style={{ fontSize: '0.82rem', color: '#7f1d1d', marginTop: '0.2rem', fontWeight: 500 }}>
                      {patientDetail.allergies?.length ? patientDetail.allergies.join(', ') : 'No known allergies on record.'}
                    </div>
                  </div>

                  <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '8px', padding: '0.75rem' }}>
                    <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#166534', textTransform: 'uppercase' }}>
                      Emergency Contact
                    </div>
                    <div style={{ fontSize: '0.82rem', color: '#14532d', marginTop: '0.2rem' }}>
                      <strong>{patientDetail.emergencyContact?.name || 'None listed'}</strong>
                      {patientDetail.emergencyContact?.phone && ` (${patientDetail.emergencyContact.phone})`}
                    </div>
                  </div>
                </div>

                {/* Appointments History */}
                <div>
                  <h4 style={{ margin: '0 0 0.5rem', fontSize: '0.9rem', fontWeight: 700, color: '#0f172a' }}>
                    Recent Consultations & Appointments
                  </h4>
                  {patientDetail.appointments?.length === 0 ? (
                    <p style={{ margin: 0, fontSize: '0.8rem', color: '#94a3b8' }}>No recorded visits yet.</p>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                      {patientDetail.appointments.map((a) => (
                        <div
                          key={a.id}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            padding: '0.5rem 0.75rem',
                            background: '#f8fafc',
                            border: '1px solid var(--border-color)',
                            borderRadius: '6px',
                            fontSize: '0.78rem',
                          }}
                        >
                          <div>
                            <strong>{a.doctorName}</strong> ({a.department})
                            <div style={{ color: '#64748b', fontSize: '0.72rem' }}>{new Date(a.appointmentDate).toLocaleDateString()} at {a.appointmentTime}</div>
                          </div>
                          <span className={`rec-badge rec-badge--${a.status.toLowerCase().replace(/\s+/g, '')}`}>
                            {a.status}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Drawer Footer Actions */}
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.65rem', borderTop: '1px solid #e2e8f0', paddingTop: '0.85rem' }}>
                  <button
                    type="button"
                    onClick={() => {
                      handleCloseDetails();
                      if (onOpenBookAppointment) onOpenBookAppointment(patientDetail);
                      else onNavigateTab('appointments');
                    }}
                    className="btn btn--primary btn--sm"
                  >
                    <Calendar size={14} />
                    <span>Book New Appointment</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleCloseDetails}
                    className="btn btn--outline btn--sm"
                  >
                    Close
                  </button>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
}
