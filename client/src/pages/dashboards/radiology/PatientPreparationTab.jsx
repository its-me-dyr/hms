/**
 * Patient Preparation & Safety Checklist Tab
 * 
 * Safety protocoling, contrast screening, and pre-scan verification:
 * - MRI implant screening (Pacemaker, metallic clips, cochlear implants)
 * - Contrast allergy & renal function verification (eGFR, Creatinine)
 * - Fasting and hydration protocol confirmation
 * - Informed consent documentation
 */

import { useState, useEffect, useCallback } from 'react';
import {
  ShieldCheck,
  Search,
  RefreshCw,
  AlertTriangle,
  CheckCircle2,
  X,
  AlertCircle,
} from 'lucide-react';
import { radiologyService } from '../../../services/radiology.service';

export default function PatientPreparationTab({ _onNavigateTab }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');

  // Selected item for active preparation modal
  const [activeItem, setActiveItem] = useState(null);
  const [checklist, setChecklist] = useState({
    fastingVerified: false,
    contrastAllergyChecked: false,
    egfrChecked: false,
    metallicImplantsCleared: false,
    pregnancyChecked: false,
    consentSigned: false,
    vitalSignsRecorded: false,
    preparationNotes: '',
  });
  const [saving, setSaving] = useState(false);

  const fetchPreparations = useCallback(() => {
    setLoading(true);
    setError('');
    radiologyService.getPreparations({ search })
      .then((res) => {
        const list = Array.isArray(res.data) ? res.data : (res.data?.preparations || res.data?.reports || []);
        setItems(list);
      })
      .catch((err) => {
        console.error('Failed to load preparations:', err);
        setError('Failed to fetch patient preparation queue.');
      })
      .finally(() => {
        setLoading(false);
      });
  }, [search]);

  useEffect(() => {
    fetchPreparations();
  }, [fetchPreparations]);

  const openPreparationModal = (item) => {
    setActiveItem(item);
    setChecklist({
      fastingVerified: item.preparationDetails?.fastingVerified ?? false,
      contrastAllergyChecked: item.preparationDetails?.contrastAllergyChecked ?? false,
      egfrChecked: item.preparationDetails?.egfrChecked ?? false,
      metallicImplantsCleared: item.preparationDetails?.metallicImplantsCleared ?? false,
      pregnancyChecked: item.preparationDetails?.pregnancyChecked ?? false,
      consentSigned: item.preparationDetails?.consentSigned ?? false,
      vitalSignsRecorded: item.preparationDetails?.vitalSignsRecorded ?? false,
      preparationNotes: item.preparationNotes || item.preparationDetails?.notes || '',
    });
  };

  const handleSavePreparation = async (markComplete = false) => {
    if (!activeItem) return;
    setSaving(true);
    try {
      await radiologyService.updatePreparation(activeItem._id || activeItem.id, {
        preparationCompleted: markComplete ? true : (activeItem.preparationCompleted || false),
        preparationDetails: checklist,
        preparationNotes: checklist.preparationNotes,
      });
      setActiveItem(null);
      fetchPreparations();
    } catch (err) {
      console.error('Failed to update preparation:', err);
      alert(err.response?.data?.message || 'Error updating patient preparation checklist.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="lab-container">
      {/* ── Page Header ── */}
      <div className="lab-header">
        <div className="lab-header-left">
          <div className="radiology-header-badge">
            <ShieldCheck size={13} />
            <span>CLINICAL SAFETY PROTOCOLING</span>
          </div>
          <h1 className="lab-header-title">Patient Preparation & Safety Checklist</h1>
          <p className="lab-header-subtitle">
            Pre-scan screening for MRI safety, IV contrast tolerance, fasting verification, and informed consent.
          </p>
        </div>
        <div className="lab-header-actions">
          <button className="lab-btn lab-btn-secondary" onClick={fetchPreparations} disabled={loading}>
            <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="lab-alert-banner lab-alert-banner-error" style={{ marginBottom: '1.5rem' }}>
          <AlertCircle size={18} />
          <span>{error}</span>
          <button className="lab-btn lab-btn-sm lab-btn-secondary" onClick={fetchPreparations} style={{ marginLeft: 'auto' }}>
            Retry
          </button>
        </div>
      )}

      {/* ── Search & Filter ── */}
      <div className="lab-card" style={{ marginBottom: '1.5rem', padding: '1rem' }}>
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
          <div style={{ flex: 1, position: 'relative' }}>
            <Search size={15} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
            <input
              type="text"
              placeholder="Filter by patient name, MRN, procedure, modality..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="lab-input"
              style={{ width: '100%', paddingLeft: '2rem' }}
            />
          </div>
          <button className="lab-btn lab-btn-secondary" onClick={fetchPreparations}>
            Filter
          </button>
        </div>
      </div>

      {/* ── Patient Preparation Table ── */}
      <div className="lab-card">
        <div className="lab-table-container">
          {loading ? (
            <div style={{ padding: '3rem', textAlign: 'center', color: '#94a3b8' }}>
              <RefreshCw size={28} className="animate-spin" style={{ margin: '0 auto 0.75rem' }} />
              <p>Loading preparation queue...</p>
            </div>
          ) : items.length === 0 ? (
            <div style={{ padding: '3rem', textAlign: 'center', color: '#94a3b8' }}>
              <ShieldCheck size={36} style={{ margin: '0 auto 0.75rem', opacity: 0.5 }} />
              <p style={{ fontWeight: 600, color: 'var(--text-secondary)' }}>No patients awaiting preparation protocoling.</p>
              <p style={{ fontSize: '0.85rem' }}>All active studies are cleared or no scheduled appointments found.</p>
            </div>
          ) : (
            <table className="lab-table">
              <thead>
                <tr>
                  <th>Accession / Ref</th>
                  <th>Patient</th>
                  <th>Procedure / Modality</th>
                  <th>Scheduled Time</th>
                  <th>Safety Status</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr key={item._id || item.id}>
                    <td>
                      <span className="font-mono text-xs font-bold" style={{ color: '#4338ca' }}>
                        {item.accessionNumber || 'N/A'}
                      </span>
                    </td>
                    <td>
                      <strong>{item.patient?.fullName || item.patient?.name || 'Patient'}</strong>
                      <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                        MRN: {item.patient?.medicalRecordNumber || 'N/A'} {item.patient?.gender ? `• ${item.patient.gender}` : ''}
                      </div>
                    </td>
                    <td>
                      <div style={{ fontWeight: 600 }}>{item.studyType || item.procedureName}</div>
                      <span className="lab-badge" style={{ background: '#e0e7ff', color: '#3730a3' }}>
                        {item.modality}
                      </span>
                    </td>
                    <td>
                      {item.scheduledTime ? (
                        <div>
                          <strong>{new Date(item.scheduledTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</strong>
                          <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                            {new Date(item.scheduledTime).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                          </div>
                        </div>
                      ) : (
                        <span style={{ color: '#94a3b8' }}>Not scheduled</span>
                      )}
                    </td>
                    <td>
                      {item.preparationCompleted ? (
                        <span className="lab-badge lab-badge-success">
                          <CheckCircle2 size={12} style={{ marginRight: '3px' }} />
                          CLEARED FOR SCAN
                        </span>
                      ) : (
                        <span className="lab-badge lab-badge-warning">
                          <AlertTriangle size={12} style={{ marginRight: '3px' }} />
                          CHECKLIST PENDING
                        </span>
                      )}
                    </td>
                    <td>
                      <button
                        className="lab-btn lab-btn-sm lab-btn-primary"
                        style={{ background: '#6366f1', borderColor: '#4f46e5' }}
                        onClick={() => openPreparationModal(item)}
                      >
                        <ShieldCheck size={13} />
                        <span>{item.preparationCompleted ? 'View / Edit Checklist' : 'Perform Protocol'}</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* ── Preparation Modal ── */}
      {activeItem && (
        <div className="lab-modal-overlay" onClick={() => setActiveItem(null)}>
          <div className="lab-modal" style={{ maxWidth: '600px' }} onClick={(e) => e.stopPropagation()}>
            <div className="lab-modal-header">
              <div>
                <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 700 }}>Pre-Scan Safety Protocoling</h3>
                <span style={{ fontSize: '0.8rem', color: '#64748b' }}>
                  {activeItem.patient?.fullName} • {activeItem.modality} ({activeItem.studyType})
                </span>
              </div>
              <button className="lab-btn-icon" onClick={() => setActiveItem(null)}>
                <X size={18} />
              </button>
            </div>
            <div className="lab-modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div style={{ background: 'var(--bg-surface)', padding: '0.85rem', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                <h4 style={{ margin: '0 0 0.3rem', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Exam Safety Requirements</h4>
                <div style={{ fontSize: '0.85rem', color: '#334155' }}>
                  Modality: <strong>{activeItem.modality}</strong> | Body Part: <strong>{activeItem.bodyPart || 'General'}</strong>
                </div>
                {activeItem.clinicalHistory && (
                  <div style={{ fontSize: '0.8rem', color: '#64748b', marginTop: '0.2rem' }}>
                    Indication: {activeItem.clinicalHistory}
                  </div>
                )}
              </div>

              {/* Checkboxes */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', cursor: 'pointer', fontSize: '0.9rem' }}>
                  <input
                    type="checkbox"
                    checked={checklist.fastingVerified}
                    onChange={(e) => setChecklist({ ...checklist, fastingVerified: e.target.checked })}
                    style={{ width: '17px', height: '17px' }}
                  />
                  <span><strong>Fasting / NPO Status:</strong> Verified patient adhered to fasting guidelines</span>
                </label>

                {activeItem.modality === 'MRI' && (
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', cursor: 'pointer', fontSize: '0.9rem', color: '#b91c1c' }}>
                    <input
                      type="checkbox"
                      checked={checklist.metallicImplantsCleared}
                      onChange={(e) => setChecklist({ ...checklist, metallicImplantsCleared: e.target.checked })}
                      style={{ width: '17px', height: '17px' }}
                    />
                    <span><strong>MRI Safety Clearance:</strong> No cardiac pacemaker, cochlear implants, or metallic clips</span>
                  </label>
                )}

                <label style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', cursor: 'pointer', fontSize: '0.9rem' }}>
                  <input
                    type="checkbox"
                    checked={checklist.contrastAllergyChecked}
                    onChange={(e) => setChecklist({ ...checklist, contrastAllergyChecked: e.target.checked })}
                    style={{ width: '17px', height: '17px' }}
                  />
                  <span><strong>Contrast Allergy Screen:</strong> No known severe anaphylactoid or contrast reactions</span>
                </label>

                <label style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', cursor: 'pointer', fontSize: '0.9rem' }}>
                  <input
                    type="checkbox"
                    checked={checklist.egfrChecked}
                    onChange={(e) => setChecklist({ ...checklist, egfrChecked: e.target.checked })}
                    style={{ width: '17px', height: '17px' }}
                  />
                  <span><strong>Renal Function (eGFR / Cr):</strong> Evaluated and within safe thresholds if IV contrast planned</span>
                </label>

                <label style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', cursor: 'pointer', fontSize: '0.9rem' }}>
                  <input
                    type="checkbox"
                    checked={checklist.pregnancyChecked}
                    onChange={(e) => setChecklist({ ...checklist, pregnancyChecked: e.target.checked })}
                    style={{ width: '17px', height: '17px' }}
                  />
                  <span><strong>Pregnancy Status:</strong> Screened (if applicable for ionizing radiation modalities)</span>
                </label>

                <label style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', cursor: 'pointer', fontSize: '0.9rem' }}>
                  <input
                    type="checkbox"
                    checked={checklist.consentSigned}
                    onChange={(e) => setChecklist({ ...checklist, consentSigned: e.target.checked })}
                    style={{ width: '17px', height: '17px' }}
                  />
                  <span><strong>Informed Consent:</strong> Procedure risks explained and patient/guardian consent signed</span>
                </label>
              </div>

              <div>
                <label style={{ fontSize: '0.85rem', fontWeight: 600, display: 'block', marginBottom: '0.3rem' }}>
                  Technician / Nurse Preparation Notes
                </label>
                <textarea
                  rows={2}
                  className="lab-textarea"
                  placeholder="e.g. 20G IV placed in right antecubital fossa, patient tolerated oral contrast well..."
                  value={checklist.preparationNotes}
                  onChange={(e) => setChecklist({ ...checklist, preparationNotes: e.target.value })}
                  style={{ width: '100%' }}
                />
              </div>
            </div>
            <div className="lab-modal-footer">
              <button className="lab-btn lab-btn-secondary" onClick={() => setActiveItem(null)}>
                Cancel
              </button>
              <button
                className="lab-btn lab-btn-secondary"
                onClick={() => handleSavePreparation(false)}
                disabled={saving}
              >
                Save Progress
              </button>
              <button
                className="lab-btn lab-btn-primary"
                style={{ background: '#10b981', borderColor: '#059669' }}
                onClick={() => handleSavePreparation(true)}
                disabled={saving}
              >
                <CheckCircle2 size={15} />
                <span>Mark Safety Cleared</span>
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
