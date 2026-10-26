/**
 * Study Processing & Acquisition Workstation Tab
 * 
 * Technologist control console for scan acquisition and series capture:
 * - Exposure parameters, slice count, and radiation dose documentation (CTDIvol, DLP, DAP)
 * - Contrast administration tracking (agent, volume, route)
 * - DICOM acquisition preview simulator with interactive windowing and image controls
 * - Workflow completion to unlock Radiologist Reporting
 */

import { useState, useEffect, useCallback } from 'react';
import {
  Image,
  Play,
  CheckCircle2,
  Clock,
  RefreshCw,
  ZoomIn,
  ZoomOut,
  Sliders,
  RotateCw,
  FileText,
  AlertCircle,
} from 'lucide-react';
import { radiologyService } from '../../../services/radiology.service';

export default function StudyProcessingTab({ activeStudy, onNavigateTab }) {
  const [studies, setStudies] = useState([]);
  const [selectedStudy, setSelectedStudy] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Acquisition technical form
  const [techForm, setTechForm] = useState({
    seriesCount: 2,
    imagesAcquired: 120,
    contrastAdministered: false,
    contrastAgent: '',
    contrastVolume: '',
    radiationDoseDlp: '',
    technicianNotes: '',
  });
  const [submitting, setSubmitting] = useState(false);

  // PACS preview tools state
  const [zoomLevel, setZoomLevel] = useState(1);
  const [brightness, setBrightness] = useState(100);
  const [invert, setInvert] = useState(false);

  const fetchStudies = useCallback(() => {
    setLoading(true);
    setError('');
    radiologyService.getStudies()
      .then((res) => {
        const list = Array.isArray(res.data) ? res.data : (res.data?.studies || res.data?.reports || []);
        setStudies(list);
        if (activeStudy) {
          const match = list.find((s) => (s._id || s.id) === (activeStudy._id || activeStudy.id));
          setSelectedStudy(match || activeStudy);
        } else if (list.length > 0 && !selectedStudy) {
          setSelectedStudy(list[0]);
        }
      })
      .catch((err) => {
        console.error('Failed to load studies:', err);
        setError('Failed to fetch studies for acquisition.');
      })
      .finally(() => {
        setLoading(false);
      });
  }, [activeStudy, selectedStudy]);

  useEffect(() => {
    fetchStudies();
  }, [fetchStudies]);

  const handleStartStudy = async () => {
    if (!selectedStudy) return;
    setSubmitting(true);
    try {
      await radiologyService.startStudy(selectedStudy._id || selectedStudy.id, {});
      fetchStudies();
    } catch (err) {
      console.error('Failed to start study acquisition:', err);
      alert(err.response?.data?.message || 'Error starting study acquisition.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCompleteStudy = async () => {
    if (!selectedStudy) return;
    setSubmitting(true);
    try {
      await radiologyService.completeStudy(selectedStudy._id || selectedStudy.id, {
        seriesCount: Number(techForm.seriesCount) || 1,
        imagesAcquired: Number(techForm.imagesAcquired) || 1,
        contrastAdministered: techForm.contrastAdministered,
        contrastAgent: techForm.contrastAgent,
        contrastVolume: techForm.contrastVolume,
        radiationDoseDlp: techForm.radiationDoseDlp,
        technicianNotes: techForm.technicianNotes,
      });
      alert('Scan acquisition completed! The study is now ready for radiologist interpretation.');
      fetchStudies();
    } catch (err) {
      console.error('Failed to complete study:', err);
      alert(err.response?.data?.message || 'Error completing study acquisition.');
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
            <Image size={13} />
            <span>IMAGE ACQUISITION CONSOLE</span>
          </div>
          <h1 className="lab-header-title">Study Processing & Acquisition</h1>
          <p className="lab-header-subtitle">
            Technologist scanning workstation, protocol execution, series quality check, and radiation dose documentation.
          </p>
        </div>
        <div className="lab-header-actions">
          <button className="lab-btn lab-btn-secondary" onClick={fetchStudies} disabled={loading}>
            <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="lab-alert-banner lab-alert-banner-error" style={{ marginBottom: '1.5rem' }}>
          <AlertCircle size={18} />
          <span>{error}</span>
          <button className="lab-btn lab-btn-sm lab-btn-secondary" onClick={fetchStudies} style={{ marginLeft: 'auto' }}>
            Retry
          </button>
        </div>
      )}

      {/* ── Main Two-Column Layout ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '320px 1fr', gap: '1.5rem', alignItems: 'start' }}>
        
        {/* Left: Study Selection List */}
        <div className="lab-card" style={{ padding: 0 }}>
          <div className="lab-card-header" style={{ padding: '1rem', borderBottom: '1px solid #e2e8f0' }}>
            <h3 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 700 }}>Acquisition Worklist</h3>
            <span style={{ fontSize: '0.75rem', color: '#64748b' }}>{studies.length} studies</span>
          </div>
          <div style={{ maxHeight: '650px', overflowY: 'auto' }}>
            {studies.length === 0 ? (
              <div style={{ padding: '2rem', textAlign: 'center', color: '#94a3b8' }}>
                <Clock size={28} style={{ margin: '0 auto 0.5rem', opacity: 0.5 }} />
                <p style={{ margin: 0, fontSize: '0.85rem' }}>No studies in acquisition queue</p>
              </div>
            ) : (
              studies.map((s) => {
                const isSelected = selectedStudy && (selectedStudy._id || selectedStudy.id) === (s._id || s.id);
                return (
                  <div
                    key={s._id || s.id}
                    onClick={() => setSelectedStudy(s)}
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
                        {s.patient?.fullName || s.patient?.name || 'Patient'}
                      </strong>
                      <span className={`lab-badge ${
                        s.priority === 'emergency' ? 'lab-badge-danger' :
                        s.priority === 'urgent' ? 'lab-badge-warning' : 'lab-badge-secondary'
                      }`} style={{ fontSize: '0.65rem' }}>
                        {s.priority?.toUpperCase() || 'ROUTINE'}
                      </span>
                    </div>
                    <div style={{ fontSize: '0.8rem', fontWeight: 600, marginTop: '0.2rem' }}>
                      {s.studyType || s.procedureName}
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.3rem', fontSize: '0.75rem', color: '#64748b' }}>
                      <span>{s.modality}</span>
                      <span className="font-mono">{s.accessionNumber || 'N/A'}</span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right: Active Console & DICOM Simulator */}
        {selectedStudy ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            
            {/* Study Header & Controls */}
            <div className="lab-card" style={{ padding: '1.25rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.3rem' }}>
                    <span className="lab-badge" style={{ background: '#e0e7ff', color: '#3730a3', fontWeight: 700 }}>
                      {selectedStudy.modality}
                    </span>
                    <span className="font-mono text-xs font-bold" style={{ color: '#64748b' }}>
                      #{selectedStudy.accessionNumber || 'N/A'}
                    </span>
                    <span className={`lab-badge ${selectedStudy.status === 'in_progress' ? 'lab-badge-warning' : 'lab-badge-info'}`}>
                      {selectedStudy.status?.toUpperCase()}
                    </span>
                  </div>
                  <h2 style={{ margin: 0, fontSize: '1.3rem', fontWeight: 800 }}>
                    {selectedStudy.studyType || selectedStudy.procedureName}
                  </h2>
                  <div style={{ fontSize: '0.85rem', color: '#64748b', marginTop: '0.25rem' }}>
                    Patient: <strong>{selectedStudy.patient?.fullName || selectedStudy.patient?.name}</strong> • MRN: {selectedStudy.patient?.medicalRecordNumber || 'N/A'} • Age: {selectedStudy.patient?.age || 'N/A'}
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                  {selectedStudy.status !== 'in_progress' && selectedStudy.status !== 'completed' && (
                    <button
                      className="lab-btn lab-btn-primary"
                      style={{ background: '#6366f1', borderColor: '#4f46e5' }}
                      onClick={handleStartStudy}
                      disabled={submitting}
                    >
                      <Play size={15} />
                      <span>Start Acquisition</span>
                    </button>
                  )}
                  {selectedStudy.status === 'in_progress' && (
                    <button
                      className="lab-btn lab-btn-primary"
                      style={{ background: '#10b981', borderColor: '#059669' }}
                      onClick={handleCompleteStudy}
                      disabled={submitting}
                    >
                      <CheckCircle2 size={15} />
                      <span>{submitting ? 'Finalizing...' : 'Complete & Send to Reporting'}</span>
                    </button>
                  )}
                  <button
                    className="lab-btn lab-btn-secondary"
                    onClick={() => onNavigateTab('entry', selectedStudy)}
                  >
                    <FileText size={15} />
                    <span>Open Reporting</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Simulated High-Res PACS Viewer Component */}
            <div className="radiology-pacs-viewer">
              <div className="radiology-pacs-toolbar">
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                  <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#38bdf8' }}>PACS LIVE CONSOLE</span>
                  <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Series 1/2 • 120 Frames</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <button
                    className="lab-btn-icon"
                    onClick={() => setZoomLevel((z) => Math.min(2.5, z + 0.2))}
                    style={{ background: '#1e293b', color: '#f8fafc' }}
                    title="Zoom in"
                  >
                    <ZoomIn size={14} />
                  </button>
                  <button
                    className="lab-btn-icon"
                    onClick={() => setZoomLevel((z) => Math.max(0.6, z - 0.2))}
                    style={{ background: '#1e293b', color: '#f8fafc' }}
                    title="Zoom out"
                  >
                    <ZoomOut size={14} />
                  </button>
                  <button
                    className="lab-btn-icon"
                    onClick={() => setInvert((v) => !v)}
                    style={{ background: '#1e293b', color: '#f8fafc' }}
                    title="Invert grey scale"
                  >
                    <Sliders size={14} />
                  </button>
                  <button
                    className="lab-btn-icon"
                    onClick={() => { setZoomLevel(1); setBrightness(100); setInvert(false); }}
                    style={{ background: '#1e293b', color: '#f8fafc' }}
                    title="Reset viewport"
                  >
                    <RotateCw size={14} />
                  </button>
                </div>
              </div>

              {/* Viewport Canvas with Heads-up Display */}
              <div className="radiology-pacs-canvas">
                <div className="radiology-pacs-hud top-left">
                  <div>PAT: {selectedStudy.patient?.fullName?.toUpperCase() || 'PATIENT'}</div>
                  <div>MRN: {selectedStudy.patient?.medicalRecordNumber || '000000'}</div>
                  <div>AGE: {selectedStudy.patient?.age || '45'}Y / {selectedStudy.patient?.gender?.charAt(0) || 'M'}</div>
                </div>

                <div className="radiology-pacs-hud top-right">
                  <div>HOSPITAL MANAGEMENT SYSTEM</div>
                  <div>MOD: {selectedStudy.modality}</div>
                  <div>STUDY: {selectedStudy.bodyPart || 'CHEST'}</div>
                </div>

                <div className="radiology-pacs-hud bottom-left">
                  <div>ZOOM: {Math.round(zoomLevel * 100)}%</div>
                  <div>WL: 40 / WW: 400 (SOFT TISSUE)</div>
                  <div>STATUS: {selectedStudy.status === 'in_progress' ? 'ACQUIRING...' : 'SERIES CACHED'}</div>
                </div>

                <div className="radiology-pacs-hud bottom-right">
                  <div>ACC: {selectedStudy.accessionNumber || 'N/A'}</div>
                  <div>KVp: 120 | mA: 250</div>
                  <div>MATRIX: 512x512</div>
                </div>

                {/* Simulated Diagnostic Image Representation */}
                <div
                  style={{
                    transform: `scale(${zoomLevel})`,
                    filter: `${invert ? 'invert(1)' : 'none'} brightness(${brightness}%)`,
                    transition: 'transform 0.15s ease',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <div style={{
                    width: '260px',
                    height: '260px',
                    borderRadius: '16px',
                    background: 'radial-gradient(ellipse at center, #64748b 0%, #1e293b 50%, #020617 100%)',
                    border: '2px solid rgba(56, 189, 248, 0.3)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: '0 0 40px rgba(14, 165, 233, 0.15)',
                    position: 'relative',
                  }}>
                    <Image size={64} style={{ color: 'rgba(255, 255, 255, 0.4)' }} />
                    <div style={{
                      position: 'absolute',
                      fontSize: '0.75rem',
                      fontFamily: 'monospace',
                      color: 'rgba(255, 255, 255, 0.7)',
                      bottom: '12px',
                    }}>
                      [DICOM HIGH-RES PREVIEW]
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Technologist Parameters & Protocol Documentation Form */}
            <div className="lab-card" style={{ padding: '1.25rem' }}>
              <h3 style={{ margin: '0 0 1rem', fontSize: '1rem', fontWeight: 700 }}>
                Technologist Exposure & Administration Documentation
              </h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
                <div>
                  <label style={{ fontSize: '0.85rem', fontWeight: 600, display: 'block', marginBottom: '0.3rem' }}>
                    Acquired Series Count
                  </label>
                  <input
                    type="number"
                    className="lab-input"
                    value={techForm.seriesCount}
                    onChange={(e) => setTechForm({ ...techForm, seriesCount: e.target.value })}
                    style={{ width: '100%' }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '0.85rem', fontWeight: 600, display: 'block', marginBottom: '0.3rem' }}>
                    Total Slices / Projections
                  </label>
                  <input
                    type="number"
                    className="lab-input"
                    value={techForm.imagesAcquired}
                    onChange={(e) => setTechForm({ ...techForm, imagesAcquired: e.target.value })}
                    style={{ width: '100%' }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '0.85rem', fontWeight: 600, display: 'block', marginBottom: '0.3rem' }}>
                    Dose Index (DLP mGy·cm / DAP)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. 420 mGy·cm"
                    className="lab-input"
                    value={techForm.radiationDoseDlp}
                    onChange={(e) => setTechForm({ ...techForm, radiationDoseDlp: e.target.value })}
                    style={{ width: '100%' }}
                  />
                </div>
              </div>

              {/* Contrast Section */}
              <div style={{ marginTop: '1rem', padding: '1rem', background: 'var(--bg-surface)', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', marginBottom: '0.5rem' }}>
                  <input
                    type="checkbox"
                    checked={techForm.contrastAdministered}
                    onChange={(e) => setTechForm({ ...techForm, contrastAdministered: e.target.checked })}
                    style={{ width: '16px', height: '16px' }}
                  />
                  <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>Intravenous or Oral Contrast Administered</span>
                </label>
                {techForm.contrastAdministered && (
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginTop: '0.5rem' }}>
                    <div>
                      <input
                        type="text"
                        placeholder="Contrast Agent Name (e.g. Omnipaque 350, Dotarem)"
                        className="lab-input"
                        value={techForm.contrastAgent}
                        onChange={(e) => setTechForm({ ...techForm, contrastAgent: e.target.value })}
                        style={{ width: '100%' }}
                      />
                    </div>
                    <div>
                      <input
                        type="text"
                        placeholder="Volume in mL (e.g. 75 mL IV @ 3.0 mL/s)"
                        className="lab-input"
                        value={techForm.contrastVolume}
                        onChange={(e) => setTechForm({ ...techForm, contrastVolume: e.target.value })}
                        style={{ width: '100%' }}
                      />
                    </div>
                  </div>
                )}
              </div>

              <div style={{ marginTop: '1rem' }}>
                <label style={{ fontSize: '0.85rem', fontWeight: 600, display: 'block', marginBottom: '0.3rem' }}>
                  Technologist Operational Notes
                </label>
                <textarea
                  rows={2}
                  className="lab-textarea"
                  placeholder="e.g. Optimal positioning achieved. Patient held breath without motion artifacts..."
                  value={techForm.technicianNotes}
                  onChange={(e) => setTechForm({ ...techForm, technicianNotes: e.target.value })}
                  style={{ width: '100%' }}
                />
              </div>
            </div>

          </div>
        ) : (
          <div className="lab-card" style={{ padding: '3rem', textAlign: 'center', color: '#94a3b8' }}>
            <Image size={40} style={{ margin: '0 auto 0.75rem', opacity: 0.5 }} />
            <p style={{ fontWeight: 600, color: 'var(--text-secondary)' }}>Select a study from the acquisition worklist to open console.</p>
          </div>
        )}

      </div>

    </div>
  );
}
