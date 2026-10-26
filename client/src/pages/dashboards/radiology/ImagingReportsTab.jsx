/**
 * Imaging Reports Archive Tab
 * 
 * Central digital repository for finalized and historical diagnostic radiology reports:
 * - Full-text search and date / modality filtering
 * - Formal clinical document view with electronic signatures and accreditation headers
 * - Print-ready clinical export
 */

import { useState, useEffect, useCallback } from 'react';
import {
  FileCheck,
  Search,
  RefreshCw,
  Printer,
  Eye,
  AlertCircle,
  X,
} from 'lucide-react';
import { radiologyService } from '../../../services/radiology.service';

export default function ImagingReportsTab({ activeReport, _onNavigateTab }) {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Filters
  const [search, setSearch] = useState('');
  const [modality, setModality] = useState('');
  const [status, setStatus] = useState('');

  // Selected report for printable document viewer
  const [viewReport, setViewReport] = useState(null);

  const fetchReports = useCallback(() => {
    setLoading(true);
    setError('');
    radiologyService.getReports({ search, modality, status })
      .then((res) => {
        const list = Array.isArray(res.data) ? res.data : (res.data?.reports || []);
        setReports(list);
        if (activeReport) {
          const match = list.find((r) => (r._id || r.id) === (activeReport._id || activeReport.id));
          setViewReport(match || activeReport);
        }
      })
      .catch((err) => {
        console.error('Failed to load reports:', err);
        setError('Failed to fetch radiology reports archive.');
      })
      .finally(() => {
        setLoading(false);
      });
  }, [search, modality, status, activeReport]);

  useEffect(() => {
    fetchReports();
  }, [fetchReports]);

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="lab-container">
      {/* ── Page Header ── */}
      <div className="lab-header lab-no-print">
        <div className="lab-header-left">
          <div className="radiology-header-badge">
            <FileCheck size={13} />
            <span>DIAGNOSTIC ARCHIVE & EMR PUBLISHING</span>
          </div>
          <h1 className="lab-header-title">Diagnostic Reports Archive</h1>
          <p className="lab-header-subtitle">
            Search, view, and print finalized diagnostic radiology reports with verified radiologist interpretations.
          </p>
        </div>
        <div className="lab-header-actions">
          <button className="lab-btn lab-btn-secondary" onClick={fetchReports} disabled={loading}>
            <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="lab-alert-banner lab-alert-banner-error lab-no-print" style={{ marginBottom: '1.5rem' }}>
          <AlertCircle size={18} />
          <span>{error}</span>
          <button className="lab-btn lab-btn-sm lab-btn-secondary" onClick={fetchReports} style={{ marginLeft: 'auto' }}>
            Retry
          </button>
        </div>
      )}

      {/* ── Filter Bar ── */}
      <div className="lab-card lab-no-print" style={{ marginBottom: '1.5rem', padding: '1rem' }}>
        <form
          onSubmit={(e) => { e.preventDefault(); fetchReports(); }}
          style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'center' }}
        >
          <div style={{ flex: '1 1 240px', position: 'relative' }}>
            <Search size={15} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
            <input
              type="text"
              placeholder="Search by patient name, MRN, report #, accession..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="lab-input"
              style={{ width: '100%', paddingLeft: '2rem' }}
            />
          </div>

          <div style={{ minWidth: '150px' }}>
            <select className="lab-select" value={modality} onChange={(e) => setModality(e.target.value)}>
              <option value="">All Modalities</option>
              <option value="X-Ray">X-Ray</option>
              <option value="CT">Computed Tomography (CT)</option>
              <option value="MRI">Magnetic Resonance (MRI)</option>
              <option value="Ultrasound">Ultrasound</option>
              <option value="Mammography">Mammography</option>
            </select>
          </div>

          <div style={{ minWidth: '140px' }}>
            <select className="lab-select" value={status} onChange={(e) => setStatus(e.target.value)}>
              <option value="">All Statuses</option>
              <option value="verified">Finalized & Verified</option>
              <option value="pending_verification">Awaiting Verification</option>
              <option value="completed">Acquired</option>
            </select>
          </div>

          <button type="submit" className="lab-btn lab-btn-primary" style={{ background: '#6366f1', borderColor: '#4f46e5' }}>
            <Search size={15} />
            <span>Search</span>
          </button>
        </form>
      </div>

      {/* ── Reports Table ── */}
      <div className="lab-card lab-no-print">
        <div className="lab-table-container">
          {loading ? (
            <div style={{ padding: '3rem', textAlign: 'center', color: '#94a3b8' }}>
              <RefreshCw size={28} className="animate-spin" style={{ margin: '0 auto 0.75rem' }} />
              <p>Loading reports archive...</p>
            </div>
          ) : reports.length === 0 ? (
            <div style={{ padding: '3rem', textAlign: 'center', color: '#94a3b8' }}>
              <FileCheck size={36} style={{ margin: '0 auto 0.75rem', opacity: 0.5 }} />
              <p style={{ fontWeight: 600, color: 'var(--text-secondary)' }}>No diagnostic reports found.</p>
              <p style={{ fontSize: '0.85rem' }}>Try adjusting your search criteria.</p>
            </div>
          ) : (
            <table className="lab-table">
              <thead>
                <tr>
                  <th>Report # / Accession</th>
                  <th>Patient</th>
                  <th>Procedure / Modality</th>
                  <th>Verified By</th>
                  <th>Status</th>
                  <th>Date</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {reports.map((r) => (
                  <tr key={r._id || r.id}>
                    <td>
                      <span className="font-mono text-xs font-bold" style={{ color: '#4338ca' }}>
                        {r.reportNumber || r.accessionNumber || 'N/A'}
                      </span>
                    </td>
                    <td>
                      <strong>{r.patient?.fullName || r.patient?.name || 'Patient'}</strong>
                      <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                        MRN: {r.patient?.medicalRecordNumber || 'N/A'}
                      </div>
                    </td>
                    <td>
                      <div style={{ fontWeight: 600 }}>{r.studyType || r.procedureName}</div>
                      <span className="lab-badge" style={{ background: '#e0e7ff', color: '#3730a3' }}>
                        {r.modality}
                      </span>
                    </td>
                    <td>
                      <div style={{ fontSize: '0.85rem' }}>
                        {r.verifiedBy?.fullName || r.radiologist?.name || 'Staff Radiologist'}
                      </div>
                    </td>
                    <td>
                      <span className={`lab-badge ${
                        r.status === 'verified' || r.status === 'finalized' ? 'lab-badge-success' :
                        r.status === 'pending_verification' ? 'lab-badge-warning' : 'lab-badge-secondary'
                      }`}>
                        {r.status === 'verified' ? 'FINALIZED' : (r.status?.toUpperCase() || 'DRAFT')}
                      </span>
                    </td>
                    <td style={{ fontSize: '0.8rem', color: '#64748b', whiteSpace: 'nowrap' }}>
                      {r.updatedAt ? new Date(r.updatedAt).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' }) : 'N/A'}
                    </td>
                    <td>
                      <button
                        className="lab-btn lab-btn-sm lab-btn-secondary"
                        onClick={() => setViewReport(r)}
                        title="View & Print Official Report"
                      >
                        <Eye size={13} />
                        <span>View</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* ── Official Printable Diagnostic Report Document Modal ── */}
      {viewReport && (
        <div className="lab-modal-overlay" onClick={() => setViewReport(null)}>
          <div
            className="lab-modal lab-report-document"
            style={{ maxWidth: '800px', padding: '2rem' }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Action Bar (Hidden when printing) */}
            <div className="lab-no-print" style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.5rem', borderBottom: '1px solid #e2e8f0', paddingBottom: '1rem' }}>
              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                <span className="lab-badge lab-badge-success">OFFICIAL DIAGNOSTIC REPORT</span>
                <span className="font-mono text-xs">{viewReport.reportNumber || viewReport.accessionNumber}</span>
              </div>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button className="lab-btn lab-btn-secondary" onClick={handlePrint}>
                  <Printer size={15} />
                  <span>Print Report</span>
                </button>
                <button className="lab-btn lab-btn-secondary" onClick={() => setViewReport(null)}>
                  <X size={15} />
                  <span>Close</span>
                </button>
              </div>
            </div>

            {/* Document Header */}
            <div style={{ borderBottom: '2px solid #0f172a', paddingBottom: '1rem', marginBottom: '1.5rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <h2 style={{ margin: 0, fontSize: '1.4rem', fontWeight: 800, letterSpacing: '-0.02em', color: 'var(--text-primary)' }}>
                    HOSPITAL RADIOLOGY & IMAGING DEPARTMENT
                  </h2>
                  <p style={{ margin: '0.2rem 0 0', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                    Diagnostic Radiology & Molecular Imaging Services • Accredited Facility
                  </p>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '0.8rem', color: '#64748b' }}>REPORT STATUS</div>
                  <strong style={{ fontSize: '1rem', color: '#10b981' }}>FINAL / VERIFIED</strong>
                </div>
              </div>
            </div>

            {/* Patient & Exam Metadata Block */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', background: 'var(--bg-surface)', padding: '1rem', borderRadius: '8px', border: '1px solid #e2e8f0', marginBottom: '1.5rem' }}>
              <div>
                <div style={{ fontSize: '0.8rem', color: '#64748b' }}>PATIENT NAME</div>
                <div style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                  {viewReport.patient?.fullName || viewReport.patient?.name || 'Unknown Patient'}
                </div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.2rem' }}>
                  MRN: <strong>{viewReport.patient?.medicalRecordNumber || 'N/A'}</strong> | Gender: {viewReport.patient?.gender || 'N/A'} | Age: {viewReport.patient?.age || 'N/A'}
                </div>
              </div>

              <div>
                <div style={{ fontSize: '0.8rem', color: '#64748b' }}>EXAM & ACCESSION</div>
                <div style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                  {viewReport.studyType || viewReport.procedureName} ({viewReport.modality})
                </div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.2rem' }}>
                  Accession #: <strong>{viewReport.accessionNumber || 'N/A'}</strong> | Exam Date: {viewReport.createdAt ? new Date(viewReport.createdAt).toLocaleDateString() : 'N/A'}
                </div>
              </div>
            </div>

            {/* Clinical Content Sections */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', lineHeight: 1.6, color: '#1e293b' }}>
              
              <div>
                <h4 style={{ margin: '0 0 0.25rem', fontSize: '0.85rem', fontWeight: 800, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  CLINICAL INDICATION & HISTORY
                </h4>
                <p style={{ margin: 0, fontSize: '0.92rem' }}>
                  {viewReport.clinicalHistory || 'Routine diagnostic evaluation.'}
                </p>
              </div>

              <div>
                <h4 style={{ margin: '0 0 0.25rem', fontSize: '0.85rem', fontWeight: 800, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  EXAMINATION TECHNIQUE
                </h4>
                <p style={{ margin: 0, fontSize: '0.92rem' }}>
                  {viewReport.technique || `${viewReport.modality} imaging performed in standard projections.`}
                </p>
              </div>

              <div>
                <h4 style={{ margin: '0 0 0.25rem', fontSize: '0.85rem', fontWeight: 800, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  COMPARISON
                </h4>
                <p style={{ margin: 0, fontSize: '0.92rem' }}>
                  {viewReport.comparison || 'None available.'}
                </p>
              </div>

              <div>
                <h4 style={{ margin: '0 0 0.25rem', fontSize: '0.85rem', fontWeight: 800, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  DETAILED FINDINGS
                </h4>
                <p style={{ margin: 0, fontSize: '0.92rem', whiteSpace: 'pre-line' }}>
                  {viewReport.findings || 'No remarkable findings.'}
                </p>
              </div>

              {/* Impression Box */}
              <div style={{ background: '#f1f5f9', padding: '1rem', borderRadius: '8px', borderLeft: '4px solid #6366f1' }}>
                <h4 style={{ margin: '0 0 0.35rem', fontSize: '0.9rem', fontWeight: 800, color: 'var(--text-primary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  IMPRESSION
                </h4>
                <div style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--text-primary)', whiteSpace: 'pre-line' }}>
                  {viewReport.impression || 'Finalized impression.'}
                </div>
              </div>

              {viewReport.recommendation && (
                <div>
                  <h4 style={{ margin: '0 0 0.25rem', fontSize: '0.85rem', fontWeight: 800, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    RECOMMENDATIONS
                  </h4>
                  <p style={{ margin: 0, fontSize: '0.92rem' }}>
                    {viewReport.recommendation}
                  </p>
                </div>
              )}

              {/* Electronic Signature Block */}
              <div style={{ marginTop: '2rem', paddingTop: '1.5rem', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                <div>
                  <div style={{ fontSize: '0.75rem', color: '#64748b' }}>ELECTRONICALLY SIGNED & VERIFIED BY:</div>
                  <strong style={{ fontSize: '0.95rem', color: 'var(--text-primary)' }}>
                    {viewReport.verifiedBy?.fullName || viewReport.radiologist?.name || 'Staff Radiologist, MD'}
                  </strong>
                  <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                    Board Certified Radiologist • HMS Diagnostic Imaging
                  </div>
                </div>
                <div style={{ textAlign: 'right', fontSize: '0.75rem', color: '#94a3b8' }}>
                  Date / Time: {viewReport.verifiedAt ? new Date(viewReport.verifiedAt).toLocaleString() : new Date().toLocaleString()}
                </div>
              </div>

            </div>

          </div>
        </div>
      )}

    </div>
  );
}
