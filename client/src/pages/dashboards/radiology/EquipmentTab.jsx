/**
 * Radiology Equipment Status & Maintenance Tab
 * 
 * Hardware uptime, quality assurance, preventative maintenance, and scanner availability:
 * - Real-time operational status (Operational, Calibration Needed, In Maintenance, Offline)
 * - Service logs, manufacturer info, and room allocations
 * - Quick toggle and maintenance log entry
 */

import { useState, useEffect, useCallback } from 'react';
import {
  Layers,
  RefreshCw,
  Wrench,
  AlertCircle,
  X,
} from 'lucide-react';
import { radiologyService } from '../../../services/radiology.service';

export default function EquipmentTab({ _onNavigateTab }) {
  const [equipmentList, setEquipmentList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Maintenance Modal
  const [selectedEquip, setSelectedEquip] = useState(null);
  const [statusForm, setStatusForm] = useState({
    status: 'operational',
    maintenanceNotes: '',
    calibrationDate: new Date().toISOString().split('T')[0],
  });
  const [saving, setSaving] = useState(false);

  const fetchEquipment = useCallback(() => {
    setLoading(true);
    setError('');
    radiologyService.getEquipment()
      .then((res) => {
        const list = Array.isArray(res.data) ? res.data : (res.data?.equipment || []);
        setEquipmentList(list);
      })
      .catch((err) => {
        console.error('Failed to load equipment:', err);
        setError('Failed to fetch radiology equipment registry.');
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  useEffect(() => {
    fetchEquipment();
  }, [fetchEquipment]);

  const openStatusModal = (eq) => {
    setSelectedEquip(eq);
    setStatusForm({
      status: eq.status || 'operational',
      maintenanceNotes: eq.maintenanceNotes || '',
      calibrationDate: eq.lastCalibrationDate
        ? new Date(eq.lastCalibrationDate).toISOString().split('T')[0]
        : new Date().toISOString().split('T')[0],
    });
  };

  const handleUpdateStatus = async (e) => {
    e.preventDefault();
    if (!selectedEquip) return;
    setSaving(true);
    try {
      await radiologyService.updateEquipment(selectedEquip._id || selectedEquip.id, {
        status: statusForm.status,
        maintenanceNotes: statusForm.maintenanceNotes,
        lastCalibrationDate: new Date(statusForm.calibrationDate).toISOString(),
      });
      alert('Equipment status and calibration schedule updated successfully!');
      setSelectedEquip(null);
      fetchEquipment();
    } catch (err) {
      console.error('Failed to update equipment:', err);
      alert(err.response?.data?.message || 'Error updating equipment status.');
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
            <Layers size={13} />
            <span>MODALITY FLEET & QA SURVEILLANCE</span>
          </div>
          <h1 className="lab-header-title">Radiology Equipment & Scanners</h1>
          <p className="lab-header-subtitle">
            Diagnostic scanner availability, scheduled calibration, preventative maintenance logs, and room status.
          </p>
        </div>
        <div className="lab-header-actions">
          <button className="lab-btn lab-btn-secondary" onClick={fetchEquipment} disabled={loading}>
            <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="lab-alert-banner lab-alert-banner-error" style={{ marginBottom: '1.5rem' }}>
          <AlertCircle size={18} />
          <span>{error}</span>
          <button className="lab-btn lab-btn-sm lab-btn-secondary" onClick={fetchEquipment} style={{ marginLeft: 'auto' }}>
            Retry
          </button>
        </div>
      )}

      {/* ── Equipment Grid ── */}
      {loading ? (
        <div className="lab-card" style={{ padding: '3rem', textAlign: 'center', color: '#94a3b8' }}>
          <RefreshCw size={28} className="animate-spin" style={{ margin: '0 auto 0.75rem' }} />
          <p>Polling scanner telemetry and fleet status...</p>
        </div>
      ) : equipmentList.length === 0 ? (
        <div className="lab-card" style={{ padding: '3rem', textAlign: 'center', color: '#94a3b8' }}>
          <Layers size={36} style={{ margin: '0 auto 0.75rem', opacity: 0.5 }} />
          <p style={{ fontWeight: 600, color: '#475569' }}>No equipment registered in system.</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.25rem' }}>
          {equipmentList.map((eq) => {
            const isOperational = eq.status === 'operational';
            const isMaintenance = eq.status === 'maintenance';
            const isCalibration = eq.status === 'calibration_needed';
            return (
              <div
                key={eq._id || eq.id}
                className="lab-card"
                style={{
                  borderTop: isOperational
                    ? '4px solid #10b981'
                    : isMaintenance
                    ? '4px solid #f59e0b'
                    : isCalibration
                    ? '4px solid #6366f1'
                    : '4px solid #ef4444',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
                  <div>
                    <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800 }}>{eq.name}</h3>
                    <div style={{ fontSize: '0.8rem', color: '#64748b', marginTop: '0.15rem' }}>
                      Room: <strong>{eq.room || 'Suite 1'}</strong> • {eq.modality}
                    </div>
                  </div>
                  <span
                    className={`lab-badge ${
                      isOperational ? 'lab-badge-success' : isMaintenance ? 'lab-badge-warning' : 'lab-badge-danger'
                    }`}
                  >
                    {eq.status?.toUpperCase() || 'OPERATIONAL'}
                  </span>
                </div>

                <div style={{ fontSize: '0.85rem', color: '#475569', display: 'flex', flexDirection: 'column', gap: '0.35rem', marginBottom: '1rem' }}>
                  <div>Model: <strong>{eq.model || 'Standard Medical Imaging Unit'}</strong></div>
                  <div>Manufacturer: <strong>{eq.manufacturer || 'OEM Hospital Grade'}</strong></div>
                  <div>
                    Last Calibration: <strong>{eq.lastCalibrationDate ? new Date(eq.lastCalibrationDate).toLocaleDateString() : 'Current'}</strong>
                  </div>
                  {eq.maintenanceNotes && (
                    <div style={{ background: '#f8fafc', padding: '0.5rem', borderRadius: '6px', fontSize: '0.8rem', color: '#334155' }}>
                      Notes: {eq.maintenanceNotes}
                    </div>
                  )}
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', borderTop: '1px solid #f1f5f9', paddingTop: '0.75rem' }}>
                  <button
                    className="lab-btn lab-btn-sm lab-btn-secondary"
                    onClick={() => openStatusModal(eq)}
                  >
                    <Wrench size={13} />
                    <span>Manage Status / QA</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Status / Calibration Modal ── */}
      {selectedEquip && (
        <div className="lab-modal-overlay" onClick={() => setSelectedEquip(null)}>
          <div className="lab-modal" style={{ maxWidth: '480px' }} onClick={(e) => e.stopPropagation()}>
            <div className="lab-modal-header">
              <div>
                <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700 }}>Update Equipment Status</h3>
                <span style={{ fontSize: '0.8rem', color: '#64748b' }}>{selectedEquip.name} ({selectedEquip.room})</span>
              </div>
              <button className="lab-btn-icon" onClick={() => setSelectedEquip(null)}>
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleUpdateStatus}>
              <div className="lab-modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div>
                  <label style={{ fontSize: '0.85rem', fontWeight: 600, display: 'block', marginBottom: '0.3rem' }}>
                    Operational Status *
                  </label>
                  <select
                    className="lab-select"
                    value={statusForm.status}
                    onChange={(e) => setStatusForm({ ...statusForm, status: e.target.value })}
                    style={{ width: '100%' }}
                  >
                    <option value="operational">Operational / Available</option>
                    <option value="maintenance">Under Maintenance / Servicing</option>
                    <option value="calibration_needed">Calibration Required</option>
                    <option value="offline">Offline / Out of Service</option>
                  </select>
                </div>

                <div>
                  <label style={{ fontSize: '0.85rem', fontWeight: 600, display: 'block', marginBottom: '0.3rem' }}>
                    QA / Calibration Verification Date
                  </label>
                  <input
                    type="date"
                    className="lab-input"
                    value={statusForm.calibrationDate}
                    onChange={(e) => setStatusForm({ ...statusForm, calibrationDate: e.target.value })}
                    style={{ width: '100%' }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: '0.85rem', fontWeight: 600, display: 'block', marginBottom: '0.3rem' }}>
                    Maintenance & Service Log Notes
                  </label>
                  <textarea
                    rows={3}
                    className="lab-textarea"
                    placeholder="e.g. Helium level 88%, RF coil tuned, monthly phantom QA check passed..."
                    value={statusForm.maintenanceNotes}
                    onChange={(e) => setStatusForm({ ...statusForm, maintenanceNotes: e.target.value })}
                    style={{ width: '100%' }}
                  />
                </div>
              </div>
              <div className="lab-modal-footer">
                <button type="button" className="lab-btn lab-btn-secondary" onClick={() => setSelectedEquip(null)}>
                  Cancel
                </button>
                <button
                  type="submit"
                  className="lab-btn lab-btn-primary"
                  style={{ background: '#6366f1', borderColor: '#4f46e5' }}
                  disabled={saving}
                >
                  {saving ? 'Updating...' : 'Save Equipment Status'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
