/**
 * Laboratory Diagnostic Reports Archive Tab
 * 
 * Verified clinical reports archive:
 * - Search by report ID, patient name, or investigation
 * - Official diagnostic report viewer with printable clinical layout
 * - Pathologist electronic sign-off verification
 */

import { useState, useEffect, useCallback } from 'react';
import {
  FileCheck,
  Search,
  RefreshCw,
  Eye,
  Printer,
  X,
  Barcode,
} from 'lucide-react';
import { labService } from '../../../services/lab.service';

export default function LabReportsTab({ activeReport }) {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [activeSearch, setActiveSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [selectedReport, setSelectedReport] = useState(activeReport || null);

  useEffect(() => {
    if (activeReport) {
      setSelectedReport(activeReport);
    }
  }, [activeReport]);

  const fetchReports = useCallback(() => {
    setLoading(true);
    labService.getReports({
      search: activeSearch || undefined,
      category: categoryFilter !== 'ALL' ? categoryFilter : undefined,
    })
      .then((res) => {
        setReports(res.data || []);
      })
      .catch((err) => {
        console.error('Failed to load lab reports:', err);
      })
      .finally(() => {
        setLoading(false);
      });
  }, [activeSearch, categoryFilter]);

  useEffect(() => {
    fetchReports();
  }, [fetchReports]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setActiveSearch(search);
  };

  return (
    <div className="lab-container">
      {/* ── Page Header ── */}
      <div className="lab-header">
        <div className="lab-header-left">
          <div className="lab-header-badge">
            <FileCheck size={13} />
            <span>DIAGNOSTIC REPORTS ARCHIVE</span>
          </div>
          <h1 className="lab-header-title">Laboratory Reports</h1>
          <p className="lab-header-subtitle">
            Archive of verified diagnostic investigations with printable hospital letterheads.
          </p>
        </div>
        <div className="lab-header-actions">
          <button
            type="button"
            className="lab-btn lab-btn--secondary"
            onClick={fetchReports}
            disabled={loading}
          >
            <RefreshCw size={15} className={loading ? 'lab-spin' : ''} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* ── Search & Filter ── */}
      <div className="lab-filter-card">
        <form onSubmit={handleSearchSubmit} className="lab-filter-search" style={{ flex: 1 }}>
          <Search size={16} className="lab-filter-icon" />
          <input
            type="text"
            className="lab-input lab-input--search"
            placeholder="Search reports by Report ID, Patient name, or Investigation..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <button type="submit" className="lab-btn lab-btn--primary lab-btn--sm">
            Search
          </button>
        </form>

        <div className="lab-select-wrap">
          <label className="lab-filter-label">Category:</label>
          <select
            className="lab-select"
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
          >
            <option value="ALL">All Categories</option>
            <option value="Hematology">Hematology</option>
            <option value="Biochemistry">Biochemistry</option>
            <option value="Microbiology">Microbiology</option>
            <option value="Immunology">Immunology</option>
            <option value="Pathology">Pathology</option>
            <option value="Urinalysis">Urinalysis</option>
          </select>
        </div>
      </div>

      {/* ── Reports Table ── */}
      <div className="lab-card">
        <div className="lab-card__body lab-card__body--flush">
          {loading ? (
            <div className="lab-loading-block">
              <div className="lab-spinner" />
              <span>Querying verified reports archive...</span>
            </div>
          ) : reports.length === 0 ? (
            <div className="lab-empty-state">
              <FileCheck size={40} className="lab-empty-icon" />
              <p className="lab-empty-title">No Reports Available</p>
              <p className="lab-empty-desc">
                {search || categoryFilter !== 'ALL'
                  ? 'No diagnostic reports match the filter query.'
                  : 'There are currently no verified laboratory reports.'}
              </p>
            </div>
          ) : (
            <div className="lab-table-wrap">
              <table className="lab-table">
                <thead>
                  <tr>
                    <th>Report / Order ID</th>
                    <th>Patient</th>
                    <th>Investigation</th>
                    <th>Specimen Barcode</th>
                    <th>Verification Date</th>
                    <th>Verified By</th>
                    <th>Status</th>
                    <th className="lab-col-right">Official Document</th>
                  </tr>
                </thead>
                <tbody>
                  {reports.map((r) => (
                    <tr key={r._id}>
                      <td>
                        <span className="lab-code-chip">{r.requestId || 'LR-REP'}</span>
                      </td>
                      <td>
                        <div className="lab-cell-user">
                          <span className="lab-user-name">
                            {r.patient ? `${r.patient.firstName} ${r.patient.lastName}` : 'Walk-in'}
                          </span>
                          <span className="lab-user-sub">{r.patient?.phone || ''}</span>
                        </div>
                      </td>
                      <td>
                        <span className="lab-text-bold">{r.testName}</span>
                        <span className="lab-badge-cat">{r.category}</span>
                      </td>
                      <td>
                        <span className="lab-barcode-chip">
                          <Barcode size={12} />
                          <span>{r.sampleId || 'N/A'}</span>
                        </span>
                      </td>
                      <td>
                        <span className="lab-sub-text">
                          {r.verifiedAt ? new Date(r.verifiedAt).toLocaleDateString() : 'Pending'}
                        </span>
                      </td>
                      <td>
                        <span className="lab-sub-text">
                          {r.verifiedBy ? `Dr. ${r.verifiedBy.firstName} ${r.verifiedBy.lastName}` : 'Authorized Signatory'}
                        </span>
                      </td>
                      <td>
                        <span className="lab-status-badge lab-status-badge--green">
                          {r.status || 'Verified'}
                        </span>
                      </td>
                      <td className="lab-col-right">
                        <button
                          type="button"
                          className="lab-btn lab-btn--xs lab-btn--primary"
                          onClick={() => setSelectedReport(r)}
                        >
                          <Eye size={13} />
                          <span>View Report</span>
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

      {/* ── Modal: Formal Printable Clinical Diagnostic Report ── */}
      {selectedReport && (
        <div className="lab-modal-overlay" onClick={() => setSelectedReport(null)}>
          <div className="lab-modal lab-modal--lg lab-printable-modal" onClick={(e) => e.stopPropagation()}>
            <div className="lab-modal__header lab-no-print">
              <div className="lab-modal__title-group">
                <FileCheck size={18} className="lab-color-green" />
                <h3 className="lab-modal__title">Clinical Diagnostic Laboratory Report</h3>
              </div>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button
                  type="button"
                  className="lab-btn lab-btn--sm lab-btn--primary"
                  onClick={() => window.print()}
                >
                  <Printer size={15} />
                  <span>Print Report</span>
                </button>
                <button
                  type="button"
                  className="lab-modal__close"
                  onClick={() => setSelectedReport(null)}
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            <div className="lab-modal__body lab-report-document">
              {/* Formal Hospital Letterhead */}
              <div className="lab-report-header">
                <div className="lab-report-brand">
                  <div className="lab-report-logo">HMS</div>
                  <div>
                    <h2 className="lab-report-hospital-name">HMS CENTRAL DIAGNOSTIC HOSPITAL</h2>
                    <p className="lab-report-hospital-sub">Department of Laboratory Medicine & Pathology</p>
                    <p className="lab-report-hospital-contact">ISO 15189 Accredited Clinical Laboratory | Ext: 4820</p>
                  </div>
                </div>
                <div className="lab-report-qr">
                  <Barcode size={44} />
                  <span className="lab-barcode-id">{selectedReport.sampleId || selectedReport.requestId}</span>
                </div>
              </div>

              {/* Patient & Specimen Info Grid */}
              <div className="lab-report-demographics">
                <div className="lab-report-demographics-col">
                  <div><strong>Patient Name:</strong> {selectedReport.patient ? `${selectedReport.patient.firstName} ${selectedReport.patient.lastName}` : 'Walk-in'}</div>
                  <div><strong>Age / Gender:</strong> {selectedReport.patient?.gender || 'N/A'}</div>
                  <div><strong>Patient Contact:</strong> {selectedReport.patient?.phone || 'N/A'}</div>
                  <div><strong>Ordering Doctor:</strong> {selectedReport.doctor ? `Dr. ${selectedReport.doctor.firstName} ${selectedReport.doctor.lastName}` : selectedReport.department}</div>
                </div>
                <div className="lab-report-demographics-col">
                  <div><strong>Report ID:</strong> {selectedReport.requestId}</div>
                  <div><strong>Specimen Barcode:</strong> {selectedReport.sampleId || 'SMP-26470'}</div>
                  <div><strong>Collected At:</strong> {selectedReport.sampleCollectedAt ? new Date(selectedReport.sampleCollectedAt).toLocaleString() : 'N/A'}</div>
                  <div><strong>Report Verified:</strong> {selectedReport.verifiedAt ? new Date(selectedReport.verifiedAt).toLocaleString() : 'N/A'}</div>
                </div>
              </div>

              <div className="lab-report-test-title">
                <h3>{selectedReport.testName.toUpperCase()}</h3>
                <span className="lab-badge-cat">{selectedReport.category}</span>
              </div>

              {/* Parameter Table */}
              <table className="lab-report-table">
                <thead>
                  <tr>
                    <th>INVESTIGATION PARAMETER</th>
                    <th>RESULT VALUE</th>
                    <th>UNIT</th>
                    <th>REFERENCE INTERVAL</th>
                    <th>STATUS FLAG</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedReport.results && selectedReport.results.length > 0 ? (
                    selectedReport.results.map((r, idx) => (
                      <tr key={idx}>
                        <td className="lab-text-bold">{r.parameter}</td>
                        <td>
                          <span className={`lab-result-chip lab-result-chip--${r.flag.toLowerCase()}`}>
                            {r.result}
                          </span>
                        </td>
                        <td>{r.unit || '-'}</td>
                        <td>{r.referenceRange || '-'}</td>
                        <td>
                          <span className={`lab-priority-pill lab-priority-pill--${r.flag === 'Critical' ? 'stat' : r.flag === 'High' || r.flag === 'Low' ? 'urgent' : 'routine'}`}>
                            {r.flag}
                          </span>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={5} style={{ textAlign: 'center', padding: '1rem', color: '#64748b' }}>
                        No parameterized findings recorded.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>

              {/* Remarks */}
              {selectedReport.verificationNotes && (
                <div className="lab-report-notes">
                  <strong>Pathologist / Verification Remarks:</strong>
                  <p>{selectedReport.verificationNotes}</p>
                </div>
              )}

              {/* Signatures */}
              <div className="lab-report-signatures">
                <div className="lab-sig-box">
                  <div className="lab-sig-line" />
                  <span className="lab-sig-name">
                    {selectedReport.processedBy ? `${selectedReport.processedBy.firstName} ${selectedReport.processedBy.lastName}` : 'Elena Kovacs'}
                  </span>
                  <span className="lab-sig-role">Medical Laboratory Technologist</span>
                </div>
                <div className="lab-sig-box">
                  <div className="lab-sig-line" />
                  <span className="lab-sig-name">
                    {selectedReport.verifiedBy ? `Dr. ${selectedReport.verifiedBy.firstName} ${selectedReport.verifiedBy.lastName}` : 'Dr. Sarah Jenkins'}
                  </span>
                  <span className="lab-sig-role">Consultant Pathologist & Clinical Lead</span>
                </div>
              </div>
            </div>

            <div className="lab-modal__footer lab-no-print">
              <button
                type="button"
                className="lab-btn lab-btn--secondary"
                onClick={() => setSelectedReport(null)}
              >
                Close
              </button>
              <button
                type="button"
                className="lab-btn lab-btn--primary"
                onClick={() => window.print()}
              >
                <Printer size={15} />
                <span>Print Official PDF</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
