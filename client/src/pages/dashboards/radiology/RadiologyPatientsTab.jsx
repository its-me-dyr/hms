/**
 * Patients Radiology Directory & Longitudinal Imaging History Tab
 * 
 * Master patient directory with comprehensive diagnostic imaging timeline:
 * - Search by patient name, MRN, contact information
 * - Historical imaging examination records (X-Ray, CT, MRI, US)
 * - Timeline view with direct link to view past diagnostic reports
 */

import { useState, useEffect, useCallback } from 'react';
import {
  Users,
  Search,
  RefreshCw,
  Clock,
  Eye,
  FileText,
  AlertCircle,
  X,
} from 'lucide-react';
import { radiologyService } from '../../../services/radiology.service';

export default function RadiologyPatientsTab({ activePatient, onNavigateTab }) {
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');

  // Selected patient for history drawer
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [patientHistory, setPatientHistory] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  const handleOpenHistory = useCallback((patient) => {
    setSelectedPatient(patient);
    setLoadingHistory(true);
    radiologyService.getPatientHistory(patient._id || patient.id)
      .then((res) => {
        const hList = Array.isArray(res.data) ? res.data : (res.data?.history || res.data?.reports || []);
        setPatientHistory(hList);
      })
      .catch((err) => {
        console.error('Failed to fetch patient imaging history:', err);
        setPatientHistory([]);
      })
      .finally(() => {
        setLoadingHistory(false);
      });
  }, []);

  const fetchPatients = useCallback(() => {
    setLoading(true);
    setError('');
    radiologyService.getPatients({ search })
      .then((res) => {
        const list = Array.isArray(res.data) ? res.data : (res.data?.patients || []);
        setPatients(list);
        if (activePatient) {
          const match = list.find((p) => (p._id || p.id) === (activePatient._id || activePatient.id));
          handleOpenHistory(match || activePatient);
        }
      })
      .catch((err) => {
        console.error('Failed to load patients:', err);
        setError('Failed to fetch radiology patient directory.');
      })
      .finally(() => {
        setLoading(false);
      });
  }, [search, activePatient, handleOpenHistory]);

  useEffect(() => {
    fetchPatients();
  }, [fetchPatients]);

  return (
    <div className="lab-container">
      {/* ── Page Header ── */}
      <div className="lab-header">
        <div className="lab-header-left">
          <div className="radiology-header-badge">
            <Users size={13} />
            <span>PATIENT IMAGING DIRECTORY</span>
          </div>
          <h1 className="lab-header-title">Patients Radiology Directory</h1>
          <p className="lab-header-subtitle">
            Longitudinal diagnostic imaging histories, prior study comparisons, and patient records.
          </p>
        </div>
        <div className="lab-header-actions">
          <button className="lab-btn lab-btn-secondary" onClick={fetchPatients} disabled={loading}>
            <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="lab-alert-banner lab-alert-banner-error" style={{ marginBottom: '1.5rem' }}>
          <AlertCircle size={18} />
          <span>{error}</span>
          <button className="lab-btn lab-btn-sm lab-btn-secondary" onClick={fetchPatients} style={{ marginLeft: 'auto' }}>
            Retry
          </button>
        </div>
      )}

      {/* ── Search Bar ── */}
      <div className="lab-card" style={{ marginBottom: '1.5rem', padding: '1rem' }}>
        <form onSubmit={(e) => { e.preventDefault(); fetchPatients(); }} style={{ display: 'flex', gap: '1rem' }}>
          <div style={{ flex: 1, position: 'relative' }}>
            <Search size={15} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
            <input
              type="text"
              placeholder="Search by patient name, MRN, phone, email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="lab-input"
              style={{ width: '100%', paddingLeft: '2rem' }}
            />
          </div>
          <button type="submit" className="lab-btn lab-btn-primary" style={{ background: '#6366f1', borderColor: '#4f46e5' }}>
            <Search size={15} />
            <span>Search</span>
          </button>
        </form>
      </div>

      {/* ── Patient List Table ── */}
      <div className="lab-card">
        <div className="lab-table-container">
          {loading ? (
            <div style={{ padding: '3rem', textAlign: 'center', color: '#94a3b8' }}>
              <RefreshCw size={28} className="animate-spin" style={{ margin: '0 auto 0.75rem' }} />
              <p>Loading patient directory...</p>
            </div>
          ) : patients.length === 0 ? (
            <div style={{ padding: '3rem', textAlign: 'center', color: '#94a3b8' }}>
              <Users size={36} style={{ margin: '0 auto 0.75rem', opacity: 0.5 }} />
              <p style={{ fontWeight: 600, color: 'var(--text-secondary)' }}>No patients found.</p>
              <p style={{ fontSize: '0.85rem' }}>Try adjusting your search criteria.</p>
            </div>
          ) : (
            <table className="lab-table">
              <thead>
                <tr>
                  <th>Patient Name</th>
                  <th>MRN</th>
                  <th>Gender / Age</th>
                  <th>Contact Phone</th>
                  <th>Total Studies</th>
                  <th>Last Exam</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {patients.map((p) => (
                  <tr key={p._id || p.id}>
                    <td>
                      <strong style={{ fontSize: '0.92rem', color: 'var(--text-primary)' }}>
                        {p.fullName || p.name || 'Patient'}
                      </strong>
                    </td>
                    <td>
                      <span className="font-mono text-xs font-bold" style={{ color: '#4338ca' }}>
                        {p.medicalRecordNumber || 'N/A'}
                      </span>
                    </td>
                    <td>
                      {p.gender || 'N/A'} {p.age ? `(${p.age}y)` : ''}
                    </td>
                    <td style={{ fontSize: '0.85rem', color: '#64748b' }}>
                      {p.phone || p.contactNumber || 'N/A'}
                    </td>
                    <td>
                      <span className="lab-badge" style={{ background: '#f1f5f9', color: '#334155' }}>
                        {p.studyCount ?? (p.totalStudies ?? 1)} Studies
                      </span>
                    </td>
                    <td style={{ fontSize: '0.8rem', color: '#64748b' }}>
                      {p.lastExamDate ? new Date(p.lastExamDate).toLocaleDateString() : 'Recent'}
                    </td>
                    <td>
                      <button
                        className="lab-btn lab-btn-sm lab-btn-secondary"
                        onClick={() => handleOpenHistory(p)}
                        title="View Imaging History"
                      >
                        <Eye size={13} />
                        <span>Timeline</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* ── Patient Longitudinal History Modal ── */}
      {selectedPatient && (
        <div className="lab-modal-overlay" onClick={() => setSelectedPatient(null)}>
          <div className="lab-modal" style={{ maxWidth: '650px' }} onClick={(e) => e.stopPropagation()}>
            <div className="lab-modal-header">
              <div>
                <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 700 }}>Longitudinal Imaging Timeline</h3>
                <span style={{ fontSize: '0.8rem', color: '#64748b' }}>
                  {selectedPatient.fullName} • MRN: {selectedPatient.medicalRecordNumber || 'N/A'}
                </span>
              </div>
              <button className="lab-btn-icon" onClick={() => setSelectedPatient(null)}>
                <X size={18} />
              </button>
            </div>
            <div className="lab-modal-body" style={{ maxHeight: '65vh', overflowY: 'auto' }}>
              {loadingHistory ? (
                <div style={{ padding: '2rem', textAlign: 'center', color: '#94a3b8' }}>
                  <RefreshCw size={24} className="animate-spin" style={{ margin: '0 auto 0.5rem' }} />
                  <p style={{ margin: 0, fontSize: '0.85rem' }}>Loading examination history...</p>
                </div>
              ) : patientHistory.length === 0 ? (
                <div style={{ padding: '2rem', textAlign: 'center', color: '#94a3b8' }}>
                  <Clock size={32} style={{ margin: '0 auto 0.5rem', opacity: 0.5 }} />
                  <p style={{ margin: 0 }}>No prior radiology records found for this patient.</p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  {patientHistory.map((h) => (
                    <div
                      key={h._id || h.id}
                      style={{
                        padding: '1rem',
                        background: 'var(--bg-surface)',
                        border: '1px solid var(--border-color)',
                        borderRadius: '8px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '0.5rem',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                            <span className="lab-badge" style={{ background: '#e0e7ff', color: '#3730a3' }}>
                              {h.modality}
                            </span>
                            <strong style={{ fontSize: '0.95rem', color: 'var(--text-primary)' }}>{h.studyType || h.procedureName}</strong>
                          </div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.2rem' }}>
                            ACC #{h.accessionNumber || 'N/A'} • {h.createdAt ? new Date(h.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' }) : 'N/A'}
                          </div>
                        </div>
                        <span className={`lab-badge ${h.status === 'verified' ? 'lab-badge-success' : 'lab-badge-secondary'}`}>
                          {h.status?.toUpperCase()}
                        </span>
                      </div>

                      {h.impression && (
                        <div style={{ fontSize: '0.85rem', color: 'var(--text-primary)', background: 'var(--bg-card)', padding: '0.6rem', borderRadius: '6px', border: '1px solid var(--border-color)' }}>
                          <strong>Impression:</strong> {h.impression}
                        </div>
                      )}

                      <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '0.25rem' }}>
                        <button
                          className="lab-btn lab-btn-sm lab-btn-secondary"
                          onClick={() => {
                            const report = h;
                            setSelectedPatient(null);
                            onNavigateTab('reports', report);
                          }}
                        >
                          <FileText size={12} />
                          <span>View Full Report</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="lab-modal-footer">
              <button className="lab-btn lab-btn-secondary" onClick={() => setSelectedPatient(null)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
