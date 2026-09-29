/**
 * Nurse Doctor Instructions Tab (Attending Physician Orders)
 * 
 * Attending physician clinical orders and nursing instructions:
 * - STAT vs Routine priority tags
 * - Categories: Labs & Diagnostics, IV Therapy, Diet/NPO, Ambulation & Wound Care
 * - 1-Click "Acknowledge Order" and "Mark Completed" workflows
 */

import { useState, useEffect, useCallback } from 'react';
import {
  Stethoscope,
  CheckCircle2,
  AlertTriangle,
  Clock,
  RefreshCw,
  Check,
  FileCheck,
} from 'lucide-react';
import { nurseService } from '../../../services/nurse.service';

export default function NurseDoctorInstructionsTab() {
  const [instructions, setInstructions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [priorityFilter, setPriorityFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [processingId, setProcessingId] = useState(null);
  const [feedback, setFeedback] = useState(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await nurseService.getDoctorInstructions();
      let list = res.data || [];
      if (priorityFilter) {
        list = list.filter((i) => i.priority === priorityFilter);
      }
      if (statusFilter) {
        list = list.filter((i) => i.status === statusFilter);
      }
      setInstructions(list);
    } catch (err) {
      console.error('Failed to load doctor instructions:', err);
    } finally {
      setLoading(false);
    }
  }, [priorityFilter, statusFilter]);

  useEffect(() => {
    let ignore = false;
    async function load() {
      setLoading(true);
      try {
        const res = await nurseService.getDoctorInstructions();
        if (!ignore) {
          let list = res.data || [];
          if (priorityFilter) {
            list = list.filter((i) => i.priority === priorityFilter);
          }
          if (statusFilter) {
            list = list.filter((i) => i.status === statusFilter);
          }
          setInstructions(list);
        }
      } catch (err) {
        console.error('Failed to load doctor instructions:', err);
      } finally {
        if (!ignore) {
          setLoading(false);
        }
      }
    }
    load();
    return () => {
      ignore = true;
    };
  }, [priorityFilter, statusFilter]);

  const handleAcknowledge = async (id) => {
    setProcessingId(id);
    setFeedback(null);
    try {
      await nurseService.acknowledgeInstruction(id);
      setFeedback({
        type: 'success',
        text: 'Doctor instruction acknowledged.',
      });
      loadData();
    } catch (err) {
      setFeedback({
        type: 'error',
        text: err.message || 'Failed to acknowledge instruction.',
      });
    } finally {
      setProcessingId(null);
    }
  };

  const handleComplete = async (id) => {
    setProcessingId(id);
    setFeedback(null);
    try {
      await nurseService.completeInstruction(id);
      setFeedback({
        type: 'success',
        text: 'Doctor order marked as Completed.',
      });
      loadData();
    } catch (err) {
      setFeedback({
        type: 'error',
        text: err.message || 'Failed to complete instruction.',
      });
    } finally {
      setProcessingId(null);
    }
  };

  const statCount = instructions.filter((i) => i.priority === 'STAT' && i.status !== 'Completed').length;
  const activeCount = instructions.filter((i) => i.status === 'Active').length;
  const completedCount = instructions.filter((i) => i.status === 'Completed').length;

  return (
    <div className="nurse-container">
      {/* Header */}
      <div className="rec-header">
        <div className="rec-header-left">
          <div className="nurse-status-badge">
            <span>PHYSICIAN ORDERS MANAGEMENT</span>
          </div>
          <h1 className="rec-header-title">Doctor Instructions & Clinical Orders</h1>
          <p className="rec-header-subtitle">
            Attending physician orders, STAT interventions, laboratory requisitions, and nursing care directives.
          </p>
        </div>
        <div className="rec-header-actions">
          <button onClick={loadData} disabled={loading} className="rec-btn rec-btn--secondary">
            <RefreshCw size={15} className={loading ? 'rec-spin' : ''} />
            <span>Sync Orders</span>
          </button>
        </div>
      </div>

      {/* Feedback Toast */}
      {feedback && (
        <div
          className={`rec-alert ${feedback.type === 'error' ? 'rec-alert--error' : 'rec-alert--success'}`}
          style={{ marginBottom: '1.25rem' }}
        >
          {feedback.type === 'error' ? <AlertTriangle size={18} /> : <CheckCircle2 size={18} />}
          <span style={{ flex: 1 }}>{feedback.text}</span>
          <button onClick={() => setFeedback(null)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>✕</button>
        </div>
      )}

      {/* Metric Counters & Top Filter/Action Bar */}
      <div
        className="nurse-card"
        style={{
          padding: '1.15rem 1.4rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '1rem',
          marginBottom: '1.5rem',
        }}
      >
        {/* Filter Pills */}
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
          {[
            { id: 'all', label: 'All Orders', count: instructions.length },
            { id: 'STAT', label: 'STAT Priority', count: statCount, isDanger: true },
            { id: 'Active', label: 'Pending / Active', count: activeCount, isWarning: true },
            { id: 'Acknowledged', label: 'Acknowledged', count: instructions.filter((i) => i.status === 'Acknowledged').length },
            { id: 'Completed', label: 'Completed', count: completedCount, isSuccess: true },
          ].map((tab) => {
            const isActive =
              (tab.id === 'all' && !statusFilter && !priorityFilter) ||
              (tab.id === 'STAT' && priorityFilter === 'STAT') ||
              (statusFilter === tab.id);

            return (
              <button
                key={tab.id}
                onClick={() => {
                  if (tab.id === 'all') {
                    setStatusFilter('');
                    setPriorityFilter('');
                  } else if (tab.id === 'STAT') {
                    setStatusFilter('');
                    setPriorityFilter('STAT');
                  } else {
                    setPriorityFilter('');
                    setStatusFilter(tab.id);
                  }
                }}
                className={`rec-btn rec-btn--sm ${isActive ? 'rec-btn--primary' : 'rec-btn--secondary'}`}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.45rem',
                  fontSize: '0.8rem',
                  padding: '0.35rem 0.8rem',
                }}
              >
                <span>{tab.label}</span>
                <span
                  style={{
                    fontSize: '0.7rem',
                    fontWeight: 700,
                    background: isActive ? 'rgba(255, 255, 255, 0.25)' : '#e2e8f0',
                    color: isActive ? '#ffffff' : '#475569',
                    padding: '0.1rem 0.45rem',
                    borderRadius: '9999px',
                  }}
                >
                  {tab.count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Quick Search or Secondary Status */}
        <div style={{ fontSize: '0.8rem', color: '#64748b' }}>
          Live Floor Sync: <strong>Ward 3A & 3B Station</strong>
        </div>
      </div>

      {/* Main Full-Width Order Table */}
      <div className="nurse-card">
        <div className="nurse-card-header">
          <h2 className="nurse-card-title">
            <Stethoscope size={18} style={{ color: '#0284c7' }} />
            <span>Attending Physician Clinical Orders Directory</span>
          </h2>
          <span style={{ fontSize: '0.78rem', color: '#64748b' }}>
            Full-width clinical order registry with 1-click execution workflows
          </span>
        </div>

        {loading ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: '#94a3b8' }}>
            <RefreshCw size={24} className="rec-spin" style={{ margin: '0 auto 0.5rem', display: 'block', color: '#0284c7' }} />
            <span>Loading physician orders...</span>
          </div>
        ) : instructions.length === 0 ? (
          <div className="rec-empty-state" style={{ padding: '2.5rem' }}>
            <Stethoscope size={36} style={{ color: '#94a3b8', margin: '0 auto 0.5rem', display: 'block' }} />
            <div className="rec-empty-state-title">No Orders Match Current Criteria</div>
            <p className="rec-empty-state-desc">All physician orders in this category have been processed.</p>
          </div>
        ) : (
          <div className="nurse-table-wrap">
            <table className="nurse-table">
              <thead>
                <tr>
                  <th>Priority</th>
                  <th>Patient / Bed</th>
                  <th>Order Directive / Clinical Instruction</th>
                  <th>Category</th>
                  <th>Prescribing Doctor</th>
                  <th>Ordered Time</th>
                  <th>Status</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {instructions.map((inst) => {
                  const isStat = inst.priority === 'STAT';

                  return (
                    <tr
                      key={inst.id}
                      style={{
                        background: isStat && inst.status !== 'Completed' ? '#fff5f5' : undefined,
                      }}
                    >
                      <td>
                        {isStat ? (
                          <span
                            className="nurse-badge nurse-badge--stat"
                            style={{
                              fontSize: '0.75rem',
                              padding: '0.25rem 0.7rem',
                              boxShadow: '0 0 0 2px rgba(239, 68, 68, 0.25)',
                              animation: inst.status === 'Active' ? 'nurseCodePulse 1.5s infinite alternate' : 'none',
                            }}
                          >
                            <AlertTriangle size={12} style={{ display: 'inline', marginRight: '0.25rem' }} />
                            STAT
                          </span>
                        ) : (
                          <span className="nurse-badge nurse-badge--routine">
                            Routine
                          </span>
                        )}
                      </td>
                      <td>
                        <div style={{ fontWeight: 700, color: '#0f172a' }}>{inst.patientName}</div>
                        <div style={{ fontSize: '0.72rem', color: '#0284c7', fontWeight: 600 }}>{inst.roomBed}</div>
                      </td>
                      <td style={{ maxWidth: '340px' }}>
                        <div style={{ fontSize: '0.85rem', color: '#1e293b', lineHeight: 1.4, fontWeight: isStat ? 600 : 500 }}>
                          {inst.instruction}
                        </div>
                        {inst.completedAt && (
                          <div style={{ fontSize: '0.7rem', color: '#16a34a', marginTop: '0.25rem', fontWeight: 600 }}>
                            Fulfilled at {inst.completedAt}
                          </div>
                        )}
                      </td>
                      <td>
                        <span
                          style={{
                            fontSize: '0.72rem',
                            background: '#f1f5f9',
                            color: '#475569',
                            padding: '0.2rem 0.55rem',
                            borderRadius: '6px',
                            fontWeight: 600,
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {inst.type}
                        </span>
                      </td>
                      <td>
                        <div style={{ fontWeight: 600, color: '#0f172a', fontSize: '0.82rem' }}>{inst.doctor}</div>
                        <div style={{ fontSize: '0.7rem', color: '#64748b' }}>{inst.department}</div>
                      </td>
                      <td>
                        <div style={{ fontSize: '0.8rem', color: '#334155', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}>
                          <Clock size={12} style={{ color: '#64748b' }} />
                          {inst.timeOrdered}
                        </div>
                      </td>
                      <td>
                        <span
                          className={`nurse-badge nurse-badge--${
                            inst.status === 'Completed'
                              ? 'given'
                              : inst.status === 'Acknowledged'
                              ? 'monitoring'
                              : 'due'
                          }`}
                        >
                          {inst.status === 'Active' ? 'Pending' : inst.status}
                        </span>
                      </td>
                      <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                        <div style={{ display: 'inline-flex', gap: '0.4rem', justifyContent: 'flex-end' }}>
                          {inst.status === 'Active' && (
                            <button
                              onClick={() => handleAcknowledge(inst.id)}
                              disabled={processingId === inst.id}
                              className="rec-btn rec-btn--primary rec-btn--sm"
                              style={{ fontSize: '0.72rem', padding: '0.25rem 0.65rem' }}
                            >
                              {processingId === inst.id ? <RefreshCw size={12} className="rec-spin" /> : <Check size={12} />}
                              <span>Acknowledge</span>
                            </button>
                          )}
                          {inst.status === 'Acknowledged' && (
                            <button
                              onClick={() => handleComplete(inst.id)}
                              disabled={processingId === inst.id}
                              className="rec-btn rec-btn--success rec-btn--sm"
                              style={{ fontSize: '0.72rem', padding: '0.25rem 0.65rem' }}
                            >
                              {processingId === inst.id ? <RefreshCw size={12} className="rec-spin" /> : <FileCheck size={12} />}
                              <span>Complete</span>
                            </button>
                          )}
                          {inst.status === 'Completed' && (
                            <span style={{ fontSize: '0.75rem', color: '#16a34a', fontWeight: 700 }}>
                              ✓ Fulfilled
                            </span>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
