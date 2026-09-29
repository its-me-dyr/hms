/**
 * Patients Laboratory Directory & History Tab
 * 
 * Patient lookup and diagnostic history:
 * - Search by Name, Email, Phone, or Patient ID
 * - Comprehensive laboratory record audit per patient
 * - Quick jump to patient orders and verified reports
 */

import { useState, useEffect } from 'react';
import {
  Users,
  Search,
  RefreshCw,
  Eye,
  User,
  FlaskConical,
  FileCheck,
  Calendar,
  Phone,
  Mail,
  X,
  ChevronRight,
  Droplet,
} from 'lucide-react';
import { labService } from '../../../services/lab.service';

export default function LabPatientsTab({ onNavigateTab }) {
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [patientHistory, setPatientHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  const fetchPatients = () => {
    setLoading(true);
    labService.getPatients({ search: search || undefined })
      .then((res) => {
        setPatients(res.data || []);
      })
      .catch((err) => {
        console.error('Failed to load lab patients:', err);
      })
      .finally(() => {
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchPatients();
  }, []);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchPatients();
  };

  const openPatientHistory = (pat) => {
    setSelectedPatient(pat);
    setHistoryLoading(true);
    labService.getPatientHistory(pat._id)
      .then((res) => {
        setPatientHistory(res.data || []);
      })
      .catch((err) => {
        console.error('Failed to load patient lab history:', err);
      })
      .finally(() => {
        setHistoryLoading(false);
      });
  };

  return (
    <div className="lab-container">
      {/* ── Page Header ── */}
      <div className="lab-header">
        <div className="lab-header-left">
          <div className="lab-header-badge">
            <Users size={13} />
            <span>PATIENT DIAGNOSTIC LEDGER</span>
          </div>
          <h1 className="lab-header-title">Patients Directory</h1>
          <p className="lab-header-subtitle">
            Look up registered hospital patients and review cumulative diagnostic investigation histories.
          </p>
        </div>
        <div className="lab-header-actions">
          <button
            type="button"
            className="lab-btn lab-btn--secondary"
            onClick={fetchPatients}
            disabled={loading}
          >
            <RefreshCw size={15} className={loading ? 'lab-spin' : ''} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* ── Search Bar ── */}
      <div className="lab-filter-card">
        <form onSubmit={handleSearchSubmit} className="lab-filter-search" style={{ flex: 1 }}>
          <Search size={16} className="lab-filter-icon" />
          <input
            type="text"
            className="lab-input lab-input--search"
            placeholder="Search patients by name, email, phone number..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <button type="submit" className="lab-btn lab-btn--primary lab-btn--sm">
            Search
          </button>
        </form>
      </div>

      {/* ── Patient Table ── */}
      <div className="lab-card">
        <div className="lab-card__body lab-card__body--flush">
          {loading ? (
            <div className="lab-loading-block">
              <div className="lab-spinner" />
              <span>Querying patient directory...</span>
            </div>
          ) : patients.length === 0 ? (
            <div className="lab-empty-state">
              <Users size={40} className="lab-empty-icon" />
              <p className="lab-empty-title">No Patients Found</p>
              <p className="lab-empty-desc">No patient records matched the search query.</p>
            </div>
          ) : (
            <div className="lab-table-wrap">
              <table className="lab-table">
                <thead>
                  <tr>
                    <th>Patient Name</th>
                    <th>Gender / Age</th>
                    <th>Contact Phone</th>
                    <th>Email Address</th>
                    <th>Blood Group</th>
                    <th>Lab Investigations</th>
                    <th className="lab-col-right">Diagnostic History</th>
                  </tr>
                </thead>
                <tbody>
                  {patients.map((p) => (
                    <tr key={p._id}>
                      <td>
                        <div className="lab-cell-user">
                          <span className="lab-user-name">
                            {p.firstName} {p.lastName}
                          </span>
                          <span className="lab-user-sub">ID: {p._id.slice(-6).toUpperCase()}</span>
                        </div>
                      </td>
                      <td>
                        <span>{p.gender || 'Unspecified'}</span>
                      </td>
                      <td>
                        <span>{p.phone || 'No phone'}</span>
                      </td>
                      <td>
                        <span className="lab-sub-text">{p.email}</span>
                      </td>
                      <td>
                        {p.bloodGroup ? (
                          <span className="lab-tube-pill" style={{ color: '#ef4444' }}>
                            <Droplet size={11} />
                            <span>{p.bloodGroup}</span>
                          </span>
                        ) : (
                          <span className="lab-muted-text">-</span>
                        )}
                      </td>
                      <td>
                        <span className="lab-text-bold">{p.totalLabOrders || 0} order(s)</span>
                      </td>
                      <td className="lab-col-right">
                        <button
                          type="button"
                          className="lab-btn lab-btn--xs lab-btn--secondary"
                          onClick={() => openPatientHistory(p)}
                        >
                          <Eye size={13} />
                          <span>View History</span>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* ── Slide-Over Drawer: Patient Diagnostic History ── */}
      {selectedPatient && (
        <div className="lab-drawer-overlay" onClick={() => setSelectedPatient(null)}>
          <div className="lab-drawer lab-drawer--wide" onClick={(e) => e.stopPropagation()}>
            <div className="lab-drawer__header">
              <div>
                <div className="lab-header-badge">CUMULATIVE LABORATORY HISTORY</div>
                <h3 className="lab-drawer__title">
                  {selectedPatient.firstName} {selectedPatient.lastName}
                </h3>
                <div className="lab-card__subtext">
                  {selectedPatient.gender ? `${selectedPatient.gender} | ` : ''}
                  {selectedPatient.phone || selectedPatient.email}
                </div>
              </div>
              <button
                type="button"
                className="lab-drawer__close"
                onClick={() => setSelectedPatient(null)}
              >
                <X size={18} />
              </button>
            </div>

            <div className="lab-drawer__content">
              {historyLoading ? (
                <div className="lab-loading-block">
                  <div className="lab-spinner" />
                  <span>Loading patient investigation records...</span>
                </div>
              ) : patientHistory.length === 0 ? (
                <div className="lab-empty-state" style={{ padding: '3rem 1rem' }}>
                  <FlaskConical size={36} className="lab-empty-icon" />
                  <p className="lab-empty-title">No Past Lab Investigations</p>
                  <p className="lab-empty-desc">This patient has no recorded laboratory test orders.</p>
                </div>
              ) : (
                <div className="lab-table-wrap">
                  <table className="lab-table">
                    <thead>
                      <tr>
                        <th>Order ID</th>
                        <th>Investigation</th>
                        <th>Category</th>
                        <th>Ordered Date</th>
                        <th>Status</th>
                        <th className="lab-col-right">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {patientHistory.map((h) => (
                        <tr key={h._id}>
                          <td>
                            <span className="lab-code-chip">{h.requestId}</span>
                          </td>
                          <td>
                            <span className="lab-text-bold">{h.testName}</span>
                          </td>
                          <td>
                            <span className="lab-badge-cat">{h.category}</span>
                          </td>
                          <td>
                            <span className="lab-sub-text">
                              {new Date(h.createdAt).toLocaleDateString()}
                            </span>
                          </td>
                          <td>
                            <span className="lab-status-badge lab-status-badge--green">
                              {h.status}
                            </span>
                          </td>
                          <td className="lab-col-right">
                            {['Verified', 'Completed'].includes(h.status) ? (
                              <button
                                type="button"
                                className="lab-btn lab-btn--xs lab-btn--primary"
                                onClick={() => {
                                  setSelectedPatient(null);
                                  onNavigateTab('reports', h);
                                }}
                              >
                                View Report
                              </button>
                            ) : (
                              <button
                                type="button"
                                className="lab-btn lab-btn--xs lab-btn--secondary"
                                onClick={() => {
                                  setSelectedPatient(null);
                                  onNavigateTab('requests', h);
                                }}
                              >
                                Track Order
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <div className="lab-drawer__footer">
              <button
                type="button"
                className="lab-btn lab-btn--secondary"
                onClick={() => setSelectedPatient(null)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
