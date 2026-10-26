/**
 * Report Entry & Preliminary Interpretation Tab
 * 
 * Clinical radiologist workstation for drafting diagnostic interpretations:
 * - Structured clinical reporting fields (Technique, Comparison, Findings, Impression, Recommendations)
 * - Quick-load standardized clinical templates (Normal Chest X-Ray, Head CT, Abdominal US, Spine)
 * - Critical finding flag & alert trigger
 * - Submission for Radiologist Sign-off / Verification Workstation
 */

import { useState, useEffect, useCallback } from 'react';
import {
  FileText,
  Save,
  CheckCircle2,
  RefreshCw,
  Sparkles,
  AlertCircle,
  FileCheck,
} from 'lucide-react';
import { radiologyService } from '../../../services/radiology.service';

const CLINICAL_TEMPLATES = {
  cxr_normal: {
    label: 'Normal Chest X-Ray (PA & Lateral)',
    technique: 'PA and lateral radiographs of the chest were obtained in upright position.',
    comparison: 'None available.',
    findings: 'Lungs are clear bilaterally without focal consolidation, pneumothorax, or pleural effusion. Cardiomediastinal silhouette is within normal limits for size and contour. Osseous structures and thoracic soft tissues are unremarkable.',
    impression: '1. No acute cardiopulmonary abnormality.\n2. Clear lungs, normal heart size.',
    recommendation: 'None indicated.',
  },
  head_ct_normal: {
    label: 'Normal Non-Contrast Head CT',
    technique: 'Axial contiguous non-contrast CT images of the brain were performed from skull base to vertex.',
    comparison: 'No prior CT scans available for comparison.',
    findings: 'No acute intracranial hemorrhage, mass effect, or midline shift. Ventricles, sulci, and basal cisterns are age-appropriate in caliber and symmetry. Gray-white matter differentiation is preserved. Calvarium and skull base appear intact.',
    impression: '1. No acute intracranial hemorrhage or territorial infarction.\n2. Age-appropriate brain parenchymal volume.',
    recommendation: 'Clinical correlation recommended.',
  },
  abdomen_us_normal: {
    label: 'Normal Complete Abdomen Ultrasound',
    technique: 'Real-time grayscale and color Doppler sonography of the abdomen was performed.',
    comparison: 'None.',
    findings: 'Liver demonstrates normal size, smooth contour, and homogeneous echotexture without focal mass. Gallbladder is normal without calculi, wall thickening, or pericholecystic fluid. Common bile duct is normal in caliber. Spleen, pancreas, and bilateral kidneys are unremarkable. No free fluid or ascites.',
    impression: '1. Normal abdominal sonogram.\n2. No cholelithiasis or acute inflammatory process.',
    recommendation: 'None.',
  },
};

export default function ReportEntryTab({ activeStudy, _onNavigateTab }) {
  const [pendingList, setPendingList] = useState([]);
  const [selectedStudy, setSelectedStudy] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Form State
  const [reportData, setReportData] = useState({
    technique: '',
    comparison: 'None available',
    findings: '',
    impression: '',
    recommendation: '',
    isCritical: false,
    criticalFindingNotes: '',
    saveAsDraft: false,
  });

  const handleSelectStudy = useCallback((study) => {
    setSelectedStudy(study);
    setReportData({
      technique: study.technique || `${study.modality || 'Diagnostic'} examination of ${study.bodyPart || study.studyType || 'the indicated region'}.`,
      comparison: study.comparison || 'None available',
      findings: study.findings || '',
      impression: study.impression || '',
      recommendation: study.recommendation || '',
      isCritical: study.isCritical || study.priority === 'emergency',
      criticalFindingNotes: study.criticalFindingNotes || '',
      saveAsDraft: false,
    });
  }, []);

  const fetchPending = useCallback(() => {
    setLoading(true);
    setError('');
    radiologyService.getReportsPending()
      .then((res) => {
        const list = Array.isArray(res.data) ? res.data : (res.data?.reports || []);
        setPendingList(list);
        if (activeStudy) {
          const match = list.find((s) => (s._id || s.id) === (activeStudy._id || activeStudy.id));
          handleSelectStudy(match || activeStudy);
        } else if (list.length > 0 && !selectedStudy) {
          handleSelectStudy(list[0]);
        }
      })
      .catch((err) => {
        console.error('Failed to load pending reports:', err);
        setError('Failed to fetch studies awaiting reporting.');
      })
      .finally(() => {
        setLoading(false);
      });
  }, [activeStudy, handleSelectStudy, selectedStudy]);

  useEffect(() => {
    fetchPending();
  }, [fetchPending]);

  const applyTemplate = (key) => {
    const tpl = CLINICAL_TEMPLATES[key];
    if (!tpl) return;
    setReportData((prev) => ({
      ...prev,
      technique: tpl.technique,
      comparison: tpl.comparison,
      findings: tpl.findings,
      impression: tpl.impression,
      recommendation: tpl.recommendation,
    }));
  };

  const handleSubmit = async (isDraft = false) => {
    if (!selectedStudy) return;
    if (!reportData.impression && !isDraft) {
      alert('Please provide an Impression before submitting for verification.');
      return;
    }
    setSubmitting(true);
    try {
      await radiologyService.submitReportEntry(selectedStudy._id || selectedStudy.id, {
        ...reportData,
        status: isDraft ? 'draft' : 'pending_verification',
      });
      alert(isDraft ? 'Report saved as draft.' : 'Report submitted successfully for radiologist verification!');
      fetchPending();
    } catch (err) {
      console.error('Failed to submit report:', err);
      alert(err.response?.data?.message || 'Error submitting diagnostic report.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="lab-container">
      {/* ── Page Header ── */}
      <div className="lab-header">
        <div className="lab-header-left">
          <div className="radiology-header-badge">
            <FileText size={13} />
            <span>DIAGNOSTIC REPORT ENTRY WORKSTATION</span>
          </div>
          <h1 className="lab-header-title">Radiologist Report Drafting</h1>
          <p className="lab-header-subtitle">
            Document clinical observations, structured findings, diagnostic impressions, and critical alerts.
          </p>
        </div>
        <div className="lab-header-actions">
          <button className="lab-btn lab-btn-secondary" onClick={fetchPending} disabled={loading}>
            <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="lab-alert-banner lab-alert-banner-error" style={{ marginBottom: '1.5rem' }}>
          <AlertCircle size={18} />
          <span>{error}</span>
          <button className="lab-btn lab-btn-sm lab-btn-secondary" onClick={fetchPending} style={{ marginLeft: 'auto' }}>
            Retry
          </button>
        </div>
      )}

      {/* ── Two-Column Layout ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '320px 1fr', gap: '1.5rem', alignItems: 'start' }}>
        
        {/* Left: Worklist of Studies Awaiting Reporting */}
        <div className="lab-card" style={{ padding: 0 }}>
          <div className="lab-card-header" style={{ padding: '1rem', borderBottom: '1px solid #e2e8f0' }}>
            <h3 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 700 }}>Awaiting Interpretation</h3>
            <span style={{ fontSize: '0.75rem', color: '#64748b' }}>{pendingList.length} studies</span>
          </div>
          <div style={{ maxHeight: '650px', overflowY: 'auto' }}>
            {pendingList.length === 0 ? (
              <div style={{ padding: '2rem', textAlign: 'center', color: '#94a3b8' }}>
                <CheckCircle2 size={28} style={{ margin: '0 auto 0.5rem', color: '#10b981' }} />
                <p style={{ margin: 0, fontSize: '0.85rem' }}>All acquired studies have been reported!</p>
              </div>
            ) : (
              pendingList.map((item) => {
                const isSelected = selectedStudy && (selectedStudy._id || selectedStudy.id) === (item._id || item.id);
                return (
                  <div
                    key={item._id || item.id}
                    onClick={() => handleSelectStudy(item)}
                    style={{
                      padding: '0.85rem 1rem',
                      borderBottom: '1px solid #f1f5f9',
                      cursor: 'pointer',
                      background: isSelected ? 'rgba(99, 102, 241, 0.08)' : 'transparent',
                      borderLeft: isSelected ? '3px solid #6366f1' : '3px solid transparent',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <strong style={{ fontSize: '0.9rem', color: isSelected ? '#4338ca' : '#0f172a' }}>
                        {item.patient?.fullName || item.patient?.name || 'Patient'}
                      </strong>
                      <span className={`lab-badge ${
                        item.priority === 'emergency' ? 'lab-badge-danger' :
                        item.priority === 'urgent' ? 'lab-badge-warning' : 'lab-badge-secondary'
                      }`} style={{ fontSize: '0.65rem' }}>
                        {item.priority?.toUpperCase() || 'ROUTINE'}
                      </span>
                    </div>
                    <div style={{ fontSize: '0.8rem', fontWeight: 600, marginTop: '0.2rem' }}>
                      {item.studyType || item.procedureName}
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.3rem', fontSize: '0.75rem', color: '#64748b' }}>
                      <span>{item.modality}</span>
                      <span className="font-mono">{item.accessionNumber || 'N/A'}</span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right: Diagnostic Report Editor */}
        {selectedStudy ? (
          <div className="lab-card" style={{ padding: '1.5rem' }}>
            
            {/* Header info */}
            <div style={{ borderBottom: '1px solid #e2e8f0', paddingBottom: '1rem', marginBottom: '1.25rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.5rem' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                    <span className="lab-badge" style={{ background: '#e0e7ff', color: '#3730a3', fontWeight: 700 }}>
                      {selectedStudy.modality}
                    </span>
                    <span className="font-mono text-xs font-bold" style={{ color: '#4338ca' }}>
                      ACC #{selectedStudy.accessionNumber || 'N/A'}
                    </span>
                  </div>
                  <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800 }}>
                    {selectedStudy.studyType || selectedStudy.procedureName}
                  </h2>
                  <div style={{ fontSize: '0.85rem', color: '#64748b', marginTop: '0.2rem' }}>
                    Patient: <strong>{selectedStudy.patient?.fullName}</strong> • MRN: {selectedStudy.patient?.medicalRecordNumber || 'N/A'} • DOB/Age: {selectedStudy.patient?.age || 'N/A'}
                  </div>
                </div>

                {/* Standard Macros Picker */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <Sparkles size={14} style={{ color: '#6366f1' }} />
                  <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Quick Macro:</span>
                  <select
                    className="lab-select"
                    style={{ fontSize: '0.8rem', padding: '0.25rem 0.5rem' }}
                    onChange={(e) => {
                      if (e.target.value) applyTemplate(e.target.value);
                      e.target.value = '';
                    }}
                  >
                    <option value="">Insert Clinical Template...</option>
                    <option value="cxr_normal">Normal Chest X-Ray</option>
                    <option value="head_ct_normal">Normal Head CT</option>
                    <option value="abdomen_us_normal">Normal Abdomen Ultrasound</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Structured Form Fields */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              
              <div>
                <label style={{ fontSize: '0.85rem', fontWeight: 700, display: 'block', marginBottom: '0.3rem', color: '#334155' }}>
                  Technique & Exam Description
                </label>
                <input
                  type="text"
                  className="lab-input"
                  value={reportData.technique}
                  onChange={(e) => setReportData({ ...reportData, technique: e.target.value })}
                  style={{ width: '100%' }}
                />
              </div>

              <div>
                <label style={{ fontSize: '0.85rem', fontWeight: 700, display: 'block', marginBottom: '0.3rem', color: '#334155' }}>
                  Comparison Studies
                </label>
                <input
                  type="text"
                  className="lab-input"
                  value={reportData.comparison}
                  onChange={(e) => setReportData({ ...reportData, comparison: e.target.value })}
                  style={{ width: '100%' }}
                />
              </div>

              <div>
                <label style={{ fontSize: '0.85rem', fontWeight: 700, display: 'block', marginBottom: '0.3rem', color: '#334155' }}>
                  Detailed Diagnostic Findings *
                </label>
                <textarea
                  rows={6}
                  className="lab-textarea"
                  placeholder="Describe observations: parenchyma, bones, soft tissues, vascular structures, presence or absence of focal lesions..."
                  value={reportData.findings}
                  onChange={(e) => setReportData({ ...reportData, findings: e.target.value })}
                  style={{ width: '100%', fontFamily: 'inherit' }}
                />
              </div>

              <div>
                <label style={{ fontSize: '0.85rem', fontWeight: 700, display: 'block', marginBottom: '0.3rem', color: '#334155' }}>
                  Clinical Impression / Conclusions *
                </label>
                <textarea
                  rows={4}
                  className="lab-textarea"
                  placeholder="Numbered diagnostic impression (e.g. 1. No acute intracranial process...)"
                  value={reportData.impression}
                  onChange={(e) => setReportData({ ...reportData, impression: e.target.value })}
                  style={{ width: '100%', fontWeight: 500 }}
                />
              </div>

              <div>
                <label style={{ fontSize: '0.85rem', fontWeight: 700, display: 'block', marginBottom: '0.3rem', color: '#334155' }}>
                  Recommendations & Next Steps
                </label>
                <input
                  type="text"
                  placeholder="e.g. Recommend follow-up high resolution CT in 3 months if symptoms persist..."
                  className="lab-input"
                  value={reportData.recommendation}
                  onChange={(e) => setReportData({ ...reportData, recommendation: e.target.value })}
                  style={{ width: '100%' }}
                />
              </div>

              {/* Critical Findings Section */}
              <div style={{
                background: reportData.isCritical ? '#fef2f2' : '#f8fafc',
                border: reportData.isCritical ? '1px solid #f87171' : '1px solid #e2e8f0',
                padding: '1rem',
                borderRadius: '8px',
                transition: 'background 0.2s',
              }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', cursor: 'pointer', marginBottom: reportData.isCritical ? '0.75rem' : '0' }}>
                  <input
                    type="checkbox"
                    checked={reportData.isCritical}
                    onChange={(e) => setReportData({ ...reportData, isCritical: e.target.checked })}
                    style={{ width: '18px', height: '18px' }}
                  />
                  <span style={{ fontWeight: 700, color: reportData.isCritical ? '#991b1b' : '#334155' }}>
                    Critical / Unexpected Abnormal Finding (Triggers STAT Notification Alert)
                  </span>
                </label>

                {reportData.isCritical && (
                  <div>
                    <label style={{ fontSize: '0.85rem', fontWeight: 600, display: 'block', marginBottom: '0.3rem', color: '#991b1b' }}>
                      Critical Finding Communication Summary & Attending Physician Notified:
                    </label>
                    <textarea
                      rows={2}
                      className="lab-textarea"
                      placeholder="e.g. Tension pneumothorax noted. Verbally communicated to Dr. Adams at 14:15 hrs."
                      value={reportData.criticalFindingNotes}
                      onChange={(e) => setReportData({ ...reportData, criticalFindingNotes: e.target.value })}
                      style={{ width: '100%', borderColor: '#fca5a5' }}
                    />
                  </div>
                )}
              </div>

              {/* Submission buttons */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
                <button
                  type="button"
                  className="lab-btn lab-btn-secondary"
                  onClick={() => handleSubmit(true)}
                  disabled={submitting}
                >
                  <Save size={15} />
                  <span>Save Draft</span>
                </button>
                <button
                  type="button"
                  className="lab-btn lab-btn-primary"
                  style={{ background: '#6366f1', borderColor: '#4f46e5' }}
                  onClick={() => handleSubmit(false)}
                  disabled={submitting}
                >
                  <FileCheck size={15} />
                  <span>{submitting ? 'Submitting...' : 'Submit for Verification'}</span>
                </button>
              </div>

            </div>

          </div>
        ) : (
          <div className="lab-card" style={{ padding: '3rem', textAlign: 'center', color: '#94a3b8' }}>
            <FileText size={40} style={{ margin: '0 auto 0.75rem', opacity: 0.5 }} />
            <p style={{ fontWeight: 600, color: 'var(--text-secondary)' }}>Select a study from the worklist to start drafting the report.</p>
          </div>
        )}

      </div>

    </div>
  );
}
