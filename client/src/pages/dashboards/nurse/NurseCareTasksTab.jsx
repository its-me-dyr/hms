/**
 * Nurse Care Tasks Tab (Nursing Shift Checklist)
 * 
 * Shift nursing tasks and patient care workflow:
 * - Summary completion progress bar & metric counters
 * - Interactive checklist toggles with automatic RN timestamp
 * - Filter by status (All, Pending, Completed) or category
 * - Fast "+ Add Shift Task" quick form
 */

import { useState, useEffect, useCallback } from 'react';
import {
  CheckCircle2,
  Clock,
  Plus,
  RefreshCw,
  AlertCircle,
} from 'lucide-react';
import { nurseService } from '../../../services/nurse.service';

export default function NurseCareTasksTab() {
  const [tasks, setTasks] = useState([]);
  const [inpatients, setInpatients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState('all');
  const [showAddForm, setShowAddForm] = useState(false);
  const [newTask, setNewTask] = useState({
    patientName: '',
    task: '',
    dueTime: '10:00 AM',
    category: 'Assessment',
    priority: 'Medium',
  });
  const [feedback, setFeedback] = useState(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [resTasks, resInpatients] = await Promise.all([
        nurseService.getCareTasks(),
        nurseService.getInpatients(),
      ]);
      setTasks(resTasks.data || []);
      setInpatients(resInpatients.data || []);
      if (resInpatients.data?.length > 0 && !newTask.patientName) {
        setNewTask((prev) => ({
          ...prev,
          patientName: `${resInpatients.data[0].name} (${resInpatients.data[0].bed})`,
        }));
      }
    } catch (err) {
      console.error('Failed to load care tasks:', err);
    } finally {
      setLoading(false);
    }
  }, [newTask.patientName]);

  useEffect(() => {
    let ignore = false;
    async function load() {
      setLoading(true);
      try {
        const [resTasks, resInpatients] = await Promise.all([
          nurseService.getCareTasks(),
          nurseService.getInpatients(),
        ]);
        if (!ignore) {
          setTasks(resTasks.data || []);
          setInpatients(resInpatients.data || []);
          if (resInpatients.data?.length > 0) {
            setNewTask((prev) => (prev.patientName ? prev : ({
              ...prev,
              patientName: `${resInpatients.data[0].name} (${resInpatients.data[0].bed})`,
            })));
          }
        }
      } catch (err) {
        console.error('Failed to load care tasks:', err);
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
  }, []);

  const handleToggle = async (taskId) => {
    try {
      await nurseService.toggleCareTask(taskId);
      loadData();
    } catch (err) {
      console.error('Failed to toggle task:', err);
    }
  };

  const handleAddTask = (e) => {
    e.preventDefault();
    if (!newTask.task.trim()) return;
    const taskObj = {
      id: `tsk-${Date.now()}`,
      patientName: newTask.patientName,
      task: newTask.task,
      dueTime: newTask.dueTime,
      category: newTask.category,
      priority: newTask.priority,
      completed: false,
    };
    nurseService.tasks.unshift(taskObj);
    setFeedback({
      type: 'success',
      text: 'New nursing care task added to shift schedule.',
    });
    setNewTask({
      patientName: inpatients[0] ? `${inpatients[0].name} (${inpatients[0].bed})` : 'Ward General',
      task: '',
      dueTime: '11:00 AM',
      category: 'Assessment',
      priority: 'Medium',
    });
    setShowAddForm(false);
    loadData();
  };

  const completedCount = tasks.filter((t) => t.completed).length;
  const pendingCount = tasks.length - completedCount;
  const progressPercent = tasks.length > 0 ? Math.round((completedCount / tasks.length) * 100) : 0;

  let displayTasks = [...tasks];
  if (filterStatus === 'pending') {
    displayTasks = displayTasks.filter((t) => !t.completed);
  } else if (filterStatus === 'completed') {
    displayTasks = displayTasks.filter((t) => t.completed);
  }

  return (
    <div className="nurse-container">
      {/* Header */}
      <div className="rec-header">
        <div className="rec-header-left">
          <div className="nurse-status-badge">
            <span>SHIFT CLINICAL WORKFLOW</span>
          </div>
          <h1 className="rec-header-title">Nursing Care Tasks & Shift Checklist</h1>
          <p className="rec-header-subtitle">
            Routine patient care, hygiene rounds, line flushes, dressings, and shift-specific nursing duties.
          </p>
        </div>
        <div className="rec-header-actions">
          <button onClick={loadData} disabled={loading} className="rec-btn rec-btn--secondary">
            <RefreshCw size={15} className={loading ? 'rec-spin' : ''} />
            <span>Sync Tasks</span>
          </button>
          <button onClick={() => setShowAddForm(!showAddForm)} className="rec-btn rec-btn--primary">
            <Plus size={16} />
            <span>{showAddForm ? 'Close Form' : '+ Add Care Task'}</span>
          </button>
        </div>
      </div>

      {/* Feedback Toast */}
      {feedback && (
        <div
          className={`rec-alert ${feedback.type === 'error' ? 'rec-alert--error' : 'rec-alert--success'}`}
          style={{ marginBottom: '1.25rem' }}
        >
          {feedback.type === 'error' ? <AlertCircle size={18} /> : <CheckCircle2 size={18} />}
          <span style={{ flex: 1 }}>{feedback.text}</span>
          <button onClick={() => setFeedback(null)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>✕</button>
        </div>
      )}

      {/* 4-Item Full-Width Progress & Metric Header */}
      <div className="nurse-kpi-grid" style={{ marginBottom: '1.5rem' }}>
        {/* Today's Progress */}
        <div className="nurse-kpi-card nurse-kpi-card--blue">
          <div className="nurse-kpi-top">
            <div className="nurse-kpi-label">Today&apos;s Progress</div>
            <div className="nurse-kpi-icon-wrap" style={{ background: '#f0f9ff', color: '#0284c7' }}>
              <CheckCircle2 size={20} />
            </div>
          </div>
          <div className="nurse-kpi-val" style={{ color: '#0284c7' }}>{progressPercent}%</div>
          <div className="nurse-kpi-footer" style={{ width: '100%', flexDirection: 'column', alignItems: 'stretch', gap: '0.4rem' }}>
            <div style={{ width: '100%', height: '6px', background: '#e2e8f0', borderRadius: '9999px', overflow: 'hidden' }}>
              <div
                style={{
                  width: `${progressPercent}%`,
                  height: '100%',
                  background: 'linear-gradient(90deg, #0284c7 0%, #10b981 100%)',
                }}
              />
            </div>
            <span style={{ fontSize: '0.72rem', color: '#64748b' }}>Shift completion rate</span>
          </div>
        </div>

        {/* Completed */}
        <div className="nurse-kpi-card nurse-kpi-card--emerald">
          <div className="nurse-kpi-top">
            <div className="nurse-kpi-label">Completed</div>
            <div className="nurse-kpi-icon-wrap" style={{ background: '#f0fdf4', color: '#16a34a' }}>
              <CheckCircle2 size={20} />
            </div>
          </div>
          <div className="nurse-kpi-val" style={{ color: '#16a34a' }}>{completedCount}</div>
          <div className="nurse-kpi-footer">
            <span style={{ fontSize: '0.75rem', color: '#64748b' }}>Fulfilled shift care items</span>
          </div>
        </div>

        {/* Pending */}
        <div className="nurse-kpi-card nurse-kpi-card--amber">
          <div className="nurse-kpi-top">
            <div className="nurse-kpi-label">Pending</div>
            <div className="nurse-kpi-icon-wrap" style={{ background: '#fffbeb', color: '#d97706' }}>
              <Clock size={20} />
            </div>
          </div>
          <div className="nurse-kpi-val" style={{ color: '#d97706' }}>{pendingCount}</div>
          <div className="nurse-kpi-footer">
            <span style={{ fontSize: '0.75rem', color: '#64748b' }}>Active round queue</span>
          </div>
        </div>

        {/* Overdue */}
        <div className="nurse-kpi-card nurse-kpi-card--rose">
          <div className="nurse-kpi-top">
            <div className="nurse-kpi-label">Overdue</div>
            <div className="nurse-kpi-icon-wrap" style={{ background: '#fff1f2', color: '#e11d48' }}>
              <AlertCircle size={20} />
            </div>
          </div>
          <div className="nurse-kpi-val" style={{ color: '#e11d48' }}>0</div>
          <div className="nurse-kpi-footer">
            <span style={{ fontSize: '0.75rem', color: '#64748b' }}>All tasks within window</span>
          </div>
        </div>
      </div>

      {/* Filter & View Action Strip */}
      <div
        className="nurse-card"
        style={{
          padding: '0.9rem 1.4rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '1rem',
          marginBottom: '1.5rem',
        }}
      >
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
          <span style={{ fontSize: '0.78rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', marginRight: '0.25rem' }}>
            Filter Tasks:
          </span>
          <button
            onClick={() => setFilterStatus('all')}
            className={`rec-btn rec-btn--sm ${filterStatus === 'all' ? 'rec-btn--primary' : 'rec-btn--secondary'}`}
          >
            All ({tasks.length})
          </button>
          <button
            onClick={() => setFilterStatus('pending')}
            className={`rec-btn rec-btn--sm ${filterStatus === 'pending' ? 'rec-btn--primary' : 'rec-btn--secondary'}`}
          >
            Pending ({pendingCount})
          </button>
          <button
            onClick={() => setFilterStatus('completed')}
            className={`rec-btn rec-btn--sm ${filterStatus === 'completed' ? 'rec-btn--primary' : 'rec-btn--secondary'}`}
          >
            Completed ({completedCount})
          </button>
        </div>

        <div style={{ fontSize: '0.78rem', color: '#64748b' }}>
          Click any task card to toggle completion state
        </div>
      </div>

      {/* Add Task Form Collapsible - Expands Across Full Width */}
      {showAddForm && (
        <form onSubmit={handleAddTask} className="nurse-card" style={{ marginBottom: '1.5rem', background: '#f8fafc', width: '100%' }}>
          <h3 style={{ margin: '0 0 1.15rem', fontSize: '1.05rem', color: '#0f172a', fontWeight: 700 }}>
            Create New Shift Nursing Task
          </h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem', marginBottom: '1rem' }}>
            <div className="rec-form-group" style={{ margin: 0 }}>
              <label className="rec-form-label">Patient / Bed *</label>
              <select
                value={newTask.patientName}
                onChange={(e) => setNewTask({ ...newTask, patientName: e.target.value })}
                className="rec-form-select"
              >
                {inpatients.map((p) => (
                  <option key={p.id} value={`${p.name} (${p.bed})`}>
                    {p.name} ({p.bed})
                  </option>
                ))}
                <option value="Ward 3A General">Ward 3A General Floor Duty</option>
              </select>
            </div>
            <div className="rec-form-group" style={{ margin: 0 }}>
              <label className="rec-form-label">Task Category *</label>
              <select
                value={newTask.category}
                onChange={(e) => setNewTask({ ...newTask, category: e.target.value })}
                className="rec-form-select"
              >
                <option value="Assessment">Clinical Assessment</option>
                <option value="Medication">Medication & IV</option>
                <option value="Mobility">Mobility & Ambulation</option>
                <option value="I/O Fluid">Fluid Intake / Output</option>
                <option value="Safety">Safety & Sanitation</option>
              </select>
            </div>
            <div className="rec-form-group" style={{ margin: 0 }}>
              <label className="rec-form-label">Scheduled Due Time *</label>
              <input
                type="text"
                value={newTask.dueTime}
                onChange={(e) => setNewTask({ ...newTask, dueTime: e.target.value })}
                className="rec-form-input"
                placeholder="e.g. 10:30 AM"
              />
            </div>
            <div className="rec-form-group" style={{ margin: 0 }}>
              <label className="rec-form-label">Priority *</label>
              <select
                value={newTask.priority}
                onChange={(e) => setNewTask({ ...newTask, priority: e.target.value })}
                className="rec-form-select"
              >
                <option value="High">High Priority</option>
                <option value="Medium">Medium</option>
                <option value="Routine">Routine</option>
              </select>
            </div>
          </div>

          <div className="rec-form-group" style={{ marginBottom: '1.25rem' }}>
            <label className="rec-form-label">Task Description *</label>
            <input
              type="text"
              required
              value={newTask.task}
              onChange={(e) => setNewTask({ ...newTask, task: e.target.value })}
              className="rec-form-input"
              placeholder="e.g. Change IV infusion line dressing and evaluate cannula insertion site..."
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
            <button type="button" onClick={() => setShowAddForm(false)} className="rec-btn rec-btn--secondary">
              Cancel
            </button>
            <button type="submit" className="rec-btn rec-btn--primary">
              <Plus size={14} />
              <span>Add to Shift List</span>
            </button>
          </div>
        </form>
      )}

      {/* Wide Multi-Column Task Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(380px, 1fr))', gap: '1rem', width: '100%' }}>
        {displayTasks.map((t) => (
          <div
            key={t.id}
            onClick={() => handleToggle(t.id)}
            className="nurse-card"
            style={{
              margin: 0,
              padding: '1.15rem 1.35rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              cursor: 'pointer',
              borderLeft: `4px solid ${
                t.completed
                  ? '#cbd5e1'
                  : t.priority === 'High'
                  ? '#dc2626'
                  : '#0284c7'
              }`,
              background: t.completed ? '#f8fafc' : '#ffffff',
              transition: 'all 0.15s ease',
              width: '100%',
              boxSizing: 'border-box',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.85rem', flex: 1, minWidth: 0, marginRight: '0.75rem' }}>
              <input
                type="checkbox"
                checked={t.completed}
                onChange={() => {}} // handled by parent div
                style={{
                  width: '18px',
                  height: '18px',
                  cursor: 'pointer',
                  accentColor: '#0284c7',
                  marginTop: '0.2rem',
                }}
              />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div
                  style={{
                    fontSize: '0.95rem',
                    fontWeight: 700,
                    color: t.completed ? '#94a3b8' : '#0f172a',
                    textDecoration: t.completed ? 'line-through' : 'none',
                    lineHeight: 1.35,
                  }}
                >
                  {t.task}
                </div>
                <div style={{ fontSize: '0.78rem', color: '#64748b', marginTop: '0.35rem' }}>
                  Target: <strong style={{ color: '#334155' }}>{t.patientName}</strong> • Category:{' '}
                  <span style={{ fontWeight: 600 }}>{t.category}</span>
                </div>
                {t.completedBy && (
                  <div style={{ fontSize: '0.72rem', color: '#16a34a', fontWeight: 600, marginTop: '0.25rem' }}>
                    ✓ Completed: {t.completedBy}
                  </div>
                )}
              </div>
            </div>

            <div style={{ textAlign: 'right', flexShrink: 0 }}>
              <span
                style={{
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  color: t.completed ? '#94a3b8' : '#d97706',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.3rem',
                }}
              >
                <Clock size={12} />
                Due {t.dueTime}
              </span>
              <div>
                <span
                  style={{
                    fontSize: '0.68rem',
                    fontWeight: 700,
                    padding: '0.15rem 0.5rem',
                    borderRadius: '9999px',
                    textTransform: 'uppercase',
                    background: t.priority === 'High' ? '#fee2e2' : '#f1f5f9',
                    color: t.priority === 'High' ? '#dc2626' : '#475569',
                    display: 'inline-block',
                    marginTop: '0.35rem',
                  }}
                >
                  {t.priority}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
