/**
 * Imaging Queue & Modality Room Assignment Tab
 * 
 * Active patient waiting room tracker and scanner room queue:
 * - Real-time queue position and waiting duration
 * - Room and equipment unit assignment
 * - Fast-track STAT / Emergency queuing
 * - One-click transition to Study Acquisition
 */

import { useState, useEffect, useCallback } from 'react';
import {
  Activity,
  RefreshCw,
  Clock,
  Play,
  CheckCircle2,
  AlertCircle,
  Volume2,
} from 'lucide-react';
import { radiologyService } from '../../../services/radiology.service';

export default function ImagingQueueTab({ onNavigateTab }) {
  const [queue, setQueue] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [modalityFilter, setModalityFilter] = useState('');

  const fetchQueue = useCallback(() => {
    setLoading(true);
    setError('');
    radiologyService.getQueue({ modality: modalityFilter })
      .then((res) => {
        const list = Array.isArray(res.data) ? res.data : (res.data?.queue || res.data?.reports || []);
        setQueue(list);
      })
      .catch((err) => {
        console.error('Failed to load queue:', err);
        setError('Failed to fetch active imaging queue.');
      })
      .finally(() => {
        setLoading(false);
      });
  }, [modalityFilter]);

  useEffect(() => {
    fetchQueue();
  }, [fetchQueue]);

  const handleCallPatient = async (id) => {
    try {
      await radiologyService.updateQueueStatus(id, { queueStatus: 'called_in_room' });
      fetchQueue();
    } catch (err) {
      console.error('Failed to call patient:', err);
      alert('Error updating patient queue status.');
    }
  };

  return (
    <div className="lab-container">
      {/* ── Page Header ── */}
      <div className="lab-header">
        <div className="lab-header-left">
          <div className="radiology-header-badge">
            <Activity size={13} />
            <span>ACTIVE SCANNER WORKLIST</span>
          </div>
          <h1 className="lab-header-title">Imaging Queue & Room Assignment</h1>
          <p className="lab-header-subtitle">
            Manage checked-in patients awaiting scan acquisition across diagnostic imaging suites.
          </p>
        </div>
        <div className="lab-header-actions">
          <button className="lab-btn lab-btn-secondary" onClick={fetchQueue} disabled={loading}>
            <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="lab-alert-banner lab-alert-banner-error" style={{ marginBottom: '1.5rem' }}>
          <AlertCircle size={18} />
          <span>{error}</span>
          <button className="lab-btn lab-btn-sm lab-btn-secondary" onClick={fetchQueue} style={{ marginLeft: 'auto' }}>
            Retry
          </button>
        </div>
      )}

      {/* ── Filter Bar ── */}
      <div className="lab-card" style={{ marginBottom: '1.5rem', padding: '1rem' }}>
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
          <div style={{ minWidth: '180px' }}>
            <select
              className="lab-select"
              value={modalityFilter}
              onChange={(e) => setModalityFilter(e.target.value)}
            >
              <option value="">All Active Modalities</option>
              <option value="X-Ray">X-Ray (CR/DR)</option>
              <option value="CT">CT Suites</option>
              <option value="MRI">MRI Suites</option>
              <option value="Ultrasound">Ultrasound Rooms</option>
              <option value="Mammography">Mammography</option>
            </select>
          </div>
          <span style={{ fontSize: '0.85rem', color: '#64748b' }}>
            {queue.length} patient{queue.length === 1 ? '' : 's'} in queue
          </span>
        </div>
      </div>

      {/* ── Queue Table ── */}
      <div className="lab-card">
        <div className="lab-table-container">
          {loading ? (
            <div style={{ padding: '3rem', textAlign: 'center', color: '#94a3b8' }}>
              <RefreshCw size={28} className="animate-spin" style={{ margin: '0 auto 0.75rem' }} />
              <p>Refreshing live scanner queue...</p>
            </div>
          ) : queue.length === 0 ? (
            <div style={{ padding: '3rem', textAlign: 'center', color: '#94a3b8' }}>
              <Clock size={36} style={{ margin: '0 auto 0.75rem', opacity: 0.5 }} />
              <p style={{ fontWeight: 600, color: '#475569' }}>No patients waiting in queue.</p>
              <p style={{ fontSize: '0.85rem' }}>Patients will appear here once checked in from Scheduling or Requests.</p>
            </div>
          ) : (
            <table className="lab-table">
              <thead>
                <tr>
                  <th>Queue # / Priority</th>
                  <th>Patient</th>
                  <th>Procedure / Modality</th>
                  <th>Assigned Suite</th>
                  <th>Checklist</th>
                  <th>Current State</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {queue.map((item, idx) => (
                  <tr key={item._id || item.id} style={{ background: item.priority === 'emergency' ? 'rgba(254, 242, 242, 0.4)' : undefined }}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <span style={{ fontWeight: 800, fontSize: '1.1rem', color: '#6366f1' }}>#{idx + 1}</span>
                        <span className={`lab-badge ${
                          item.priority === 'emergency' || item.priority === 'stat' ? 'lab-badge-danger' :
                          item.priority === 'urgent' ? 'lab-badge-warning' : 'lab-badge-secondary'
                        }`}>
                          {item.priority?.toUpperCase() || 'ROUTINE'}
                        </span>
                      </div>
                      <div className="font-mono text-xs" style={{ color: '#64748b', marginTop: '0.2rem' }}>
                        {item.accessionNumber || 'N/A'}
                      </div>
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
                      <div style={{ fontSize: '0.85rem', fontWeight: 500 }}>
                        {item.room || item.equipment?.name || 'Unassigned'}
                      </div>
                    </td>
                    <td>
                      {item.preparationCompleted ? (
                        <span className="lab-badge lab-badge-success">
                          <CheckCircle2 size={12} style={{ marginRight: '3px' }} />
                          CLEARED
                        </span>
                      ) : (
                        <span className="lab-badge lab-badge-warning">
                          CHECKLIST
                        </span>
                      )}
                    </td>
                    <td>
                      <span className={`lab-badge ${
                        item.status === 'in_progress' ? 'lab-badge-warning' : 'lab-badge-info'
                      }`}>
                        {item.status === 'in_progress' ? 'SCANNING' : 'WAITING'}
                      </span>
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: '0.4rem' }}>
                        <button
                          className="lab-btn lab-btn-sm lab-btn-secondary"
                          onClick={() => handleCallPatient(item._id || item.id)}
                          title="Call patient into scanner room"
                        >
                          <Volume2 size={13} />
                          <span>Call In</span>
                        </button>
                        <button
                          className="lab-btn lab-btn-sm lab-btn-primary"
                          style={{ background: '#6366f1', borderColor: '#4f46e5' }}
                          onClick={() => onNavigateTab('processing', item)}
                          title="Open acquisition workstation"
                        >
                          <Play size={13} />
                          <span>Acquisition</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

    </div>
  );
}
