/**
 * Laboratory Results Entry Workstation Tab
 * 
 * Parameterized clinical findings entry:
 * - Real-time critical threshold detection
 * - Reference range validation & flags (Normal, Low, High, Critical, Abnormal)
 * - Automated critical alert generation for physician
 * - Forwarding to clinical verification workstation
 */

import { useState, useEffect, useCallback } from 'react';
import {
  FileText,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Plus,
  Trash2,
  X,
  ShieldAlert,
} from 'lucide-react';
import { labService } from '../../../services/lab.service';

export default function ResultsEntryTab({ activeTest, onNavigateTab }) {
  const [pendingTests, setPendingTests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [feedback, setFeedback] = useState(null);
  const [catalogTests, setCatalogTests] = useState([]);

  // Active investigation selected for results entry
  const [selectedTest, setSelectedTest] = useState(activeTest || null);
  const [actionLoading, setActionLoading] = useState(false);

  // Form State
  const [parameters, setParameters] = useState([]);
  const [technicianNotes, setTechnicianNotes] = useState('');
  const [hasCriticalFlag, setHasCriticalFlag] = useState(false);

  const checkCriticalState = (paramsList) => {
    const critical = paramsList.some((p) => p.flag === 'Critical');
    setHasCriticalFlag(critical);
  };

  const loadTestForEntry = useCallback((test, catalogList = catalogTests) => {
    setSelectedTest(test);
    setTechnicianNotes(test.technicianNotes || '');

    // If test already has entered results, load them
    if (test.results && test.results.length > 0) {
      setParameters(
        test.results.map((r) => ({
          parameter: r.parameter,
          result: r.result,
          unit: r.unit || '',
          referenceRange: r.referenceRange || '',
          flag: r.flag || 'Normal',
          method: r.method || '',
        }))
      );
      checkCriticalState(test.results);
      return;
    }

    // Try finding matching test definition in catalog to prefill parameters
    const matchedCatalog = catalogList.find(
      (c) => c.testCode === test.testCode || c.testName.toLowerCase() === test.testName.toLowerCase()
    );

    if (matchedCatalog && matchedCatalog.parameters?.length > 0) {
      setParameters(
        matchedCatalog.parameters.map((p) => ({
          parameter: p.name,
          result: '',
          unit: p.unit || '',
          referenceRange: p.referenceRange || '',
          flag: 'Normal',
          method: '',
        }))
      );
    } else {
      // Default initial parameter row
      setParameters([
        { parameter: test.testName || 'Primary Assay', result: '', unit: '', referenceRange: '', flag: 'Normal', method: '' },
      ]);
    }
    setHasCriticalFlag(false);
  }, [catalogTests]);

  useEffect(() => {
    if (activeTest) {
      loadTestForEntry(activeTest);
    }
  }, [activeTest, loadTestForEntry]);

  const fetchPendingResults = useCallback(() => {
    setLoading(true);
    Promise.all([
      labService.getResultsPending(),
      labService.getTests(),
    ])
      .then(([resPending, resCatalog]) => {
        const tests = resPending.data || [];
        const catalog = resCatalog.data || [];
        setPendingTests(tests);
        setCatalogTests(catalog);
        setSelectedTest((current) => {
          if (!current && tests.length > 0) {
            loadTestForEntry(tests[0], catalog);
            return tests[0];
          }
          return current;
        });
      })
      .catch((err) => {
        console.error('Failed to load pending results:', err);
        setFeedback({ type: 'error', message: 'Unable to load results entry queue.' });
      })
      .finally(() => {
        setLoading(false);
      });
  }, [loadTestForEntry]);

  useEffect(() => {
    fetchPendingResults();
  }, [fetchPendingResults]);


  const handleParamChange = (index, field, val) => {
    const updated = [...parameters];
    updated[index][field] = val;

    // Real-time Flag auto-detection if numeric and referenceRange is formatted as "min - max"
    if (field === 'result' && updated[index].referenceRange) {
      const match = updated[index].referenceRange.match(/([0-9.]+)\s*-\s*([0-9.]+)/);
      const numVal = parseFloat(val);
      if (match && !isNaN(numVal)) {
        const min = parseFloat(match[1]);
        const max = parseFloat(match[2]);
        if (numVal < min) {
          updated[index].flag = numVal < min * 0.5 ? 'Critical' : 'Low';
        } else if (numVal > max) {
          updated[index].flag = numVal > max * 1.8 ? 'Critical' : 'High';
        } else {
          updated[index].flag = 'Normal';
        }
      }
    }

    setParameters(updated);
    checkCriticalState(updated);
  };

  const handleAddParam = () => {
    const updated = [
      ...parameters,
      { parameter: '', result: '', unit: '', referenceRange: '', flag: 'Normal', method: '' },
    ];
    setParameters(updated);
  };

  const handleRemoveParam = (index) => {
    const updated = parameters.filter((_, idx) => idx !== index);
    setParameters(updated);
    checkCriticalState(updated);
  };

  const handleSubmitResults = async (e) => {
    e.preventDefault();
    if (!selectedTest) return;

    // Validate parameters
    const validParams = parameters.filter((p) => p.parameter.trim() && p.result.trim());
    if (validParams.length === 0) {
      setFeedback({ type: 'error', message: 'Please enter at least one complete parameter result.' });
      return;
    }

    setActionLoading(true);
    try {
      const res = await labService.enterResults({
        id: selectedTest._id,
        results: validParams,
        technicianNotes,
      });

      setFeedback({
        type: 'success',
        message: res.message || 'Results successfully recorded and forwarded to Verification.',
      });

      fetchPendingResults();
      // Forward to verification tab
      onNavigateTab('verification', res.data);
    } catch (err) {
      console.error('Results entry error:', err);
      setFeedback({
        type: 'error',
        message: err.response?.data?.message || 'Failed to record test results.',
      });
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="lab-container">
      {/* ── Page Header ── */}
      <div className="lab-header">
        <div className="lab-header-left">
          <div className="lab-header-badge">
            <FileText size={13} />
            <span>DIAGNOSTIC RESULTS RECORDING</span>
          </div>
          <h1 className="lab-header-title">Results Entry Workstation</h1>
          <p className="lab-header-subtitle">
            Enter clinical parameter findings, verify against normal reference ranges, and flag critical alerts.
          </p>
        </div>
        <div className="lab-header-actions">
          <button
            type="button"
            className="lab-btn lab-btn--secondary"
            onClick={fetchPendingResults}
            disabled={loading}
          >
            <RefreshCw size={15} className={loading ? 'lab-spin' : ''} />
            <span>Refresh Queue</span>
          </button>
        </div>
      </div>

      {feedback && (
        <div className={`lab-alert lab-alert--${feedback.type}`} style={{ marginBottom: '1rem' }}>
          {feedback.type === 'success' ? <CheckCircle2 size={18} /> : <AlertTriangle size={18} />}
          <span>{feedback.message}</span>
          <button
            type="button"
            className="lab-alert-close"
            onClick={() => setFeedback(null)}
          >
            <X size={14} />
          </button>
        </div>
      )}

      {/* ── Dual Workspace Layout ── */}
      <div className="lab-grid-3col-aside">
        {/* Left Column: Pending Queue List */}
        <div className="lab-card lab-card--aside">
          <div className="lab-card__header">
            <div className="lab-card__title-group">
              <FileText size={16} className="lab-color-purple" />
              <h3 className="lab-card__title">Pending Results</h3>
              <span className="lab-count-badge">{pendingTests.length}</span>
            </div>
          </div>

          <div className="lab-card__body lab-card__body--flush">
            {loading ? (
              <div className="lab-loading-block">
                <div className="lab-spinner" />
                <span>Loading queue...</span>
              </div>
            ) : pendingTests.length === 0 ? (
              <div className="lab-empty-state" style={{ padding: '2rem 1rem' }}>
                <CheckCircle2 size={32} className="lab-empty-icon lab-color-green" />
                <p className="lab-empty-title">No Pending Results</p>
                <p className="lab-empty-desc">All processed specimens have results entered.</p>
              </div>
            ) : (
              <div className="lab-queue-list">
                {pendingTests.map((t) => {
                  const isSelected = selectedTest?._id === t._id;
                  return (
                    <div
                      key={t._id}
                      className={`lab-queue-item ${isSelected ? 'lab-queue-item--active' : ''}`}
                      onClick={() => loadTestForEntry(t)}
                    >
                      <div className="lab-queue-item__top">
                        <span className="lab-code-chip">{t.requestId}</span>
                        <span className={`lab-priority-pill lab-priority-pill--${(t.priority || 'Routine').toLowerCase()}`}>
                          {t.priority || 'Routine'}
                        </span>
                      </div>
                      <div className="lab-queue-item__name">{t.testName}</div>
                      <div className="lab-queue-item__meta">
                        <span>{t.patient ? `${t.patient.firstName} ${t.patient.lastName}` : 'Walk-in'}</span>
                        <span className="lab-sub-text">{t.sampleId || 'Specimen'}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Parameter Entry Form */}
        <div className="lab-card lab-card--main">
          {selectedTest ? (
            <form onSubmit={handleSubmitResults}>
              <div className="lab-card__header">
                <div>
                  <div className="lab-header-badge">RECORDING RESULTS FOR</div>
                  <h2 className="lab-card__title" style={{ fontSize: '1.25rem' }}>
                    {selectedTest.testName}
                  </h2>
                  <div className="lab-card__subtext" style={{ marginTop: '0.25rem' }}>
                    <strong>Patient:</strong>{' '}
                    {selectedTest.patient
                      ? `${selectedTest.patient.firstName} ${selectedTest.patient.lastName}`
                      : 'Direct Patient'}{' '}
                    | <strong>Sample ID:</strong> {selectedTest.sampleId || 'N/A'} |{' '}
                    <strong>Priority:</strong> {selectedTest.priority || 'Routine'}
                  </div>
                </div>
              </div>

              <div className="lab-card__body">
                {/* Critical Value Alert Banner */}
                {hasCriticalFlag && (
                  <div className="lab-alert lab-alert--critical" style={{ marginBottom: '1.25rem' }}>
                    <ShieldAlert size={20} />
                    <div>
                      <strong>CRITICAL VALUE DETECTED:</strong> One or more parameters are flagged as Critical.
                      Upon saving, this finding will immediately alert the ordering physician.
                    </div>
                  </div>
                )}

                {/* Parameters Table */}
                <div className="lab-table-wrap">
                  <table className="lab-table">
                    <thead>
                      <tr>
                        <th style={{ width: '28%' }}>Parameter *</th>
                        <th style={{ width: '20%' }}>Result Value *</th>
                        <th style={{ width: '12%' }}>Unit</th>
                        <th style={{ width: '20%' }}>Reference Range</th>
                        <th style={{ width: '15%' }}>Clinical Flag</th>
                        <th className="lab-col-right" style={{ width: '5%' }}></th>
                      </tr>
                    </thead>
                    <tbody>
                      {parameters.map((p, idx) => (
                        <tr key={idx}>
                          <td>
                            <input
                              type="text"
                              className="lab-input lab-input--sm"
                              placeholder="Parameter"
                              value={p.parameter}
                              onChange={(e) => handleParamChange(idx, 'parameter', e.target.value)}
                              required
                            />
                          </td>
                          <td>
                            <input
                              type="text"
                              className={`lab-input lab-input--sm ${p.flag === 'Critical' ? 'lab-input--critical' : p.flag === 'High' || p.flag === 'Low' ? 'lab-input--abnormal' : ''}`}
                              placeholder="e.g. 14.2"
                              value={p.result}
                              onChange={(e) => handleParamChange(idx, 'result', e.target.value)}
                              required
                            />
                          </td>
                          <td>
                            <input
                              type="text"
                              className="lab-input lab-input--sm"
                              placeholder="Unit"
                              value={p.unit}
                              onChange={(e) => handleParamChange(idx, 'unit', e.target.value)}
                            />
                          </td>
                          <td>
                            <input
                              type="text"
                              className="lab-input lab-input--sm"
                              placeholder="Ref Range"
                              value={p.referenceRange}
                              onChange={(e) => handleParamChange(idx, 'referenceRange', e.target.value)}
                            />
                          </td>
                          <td>
                            <select
                              className={`lab-select lab-select--sm lab-flag-select--${p.flag.toLowerCase()}`}
                              value={p.flag}
                              onChange={(e) => handleParamChange(idx, 'flag', e.target.value)}
                            >
                              <option value="Normal">Normal</option>
                              <option value="Low">Low</option>
                              <option value="High">High</option>
                              <option value="Critical">Critical</option>
                              <option value="Abnormal">Abnormal</option>
                            </select>
                          </td>
                          <td className="lab-col-right">
                            {parameters.length > 1 && (
                              <button
                                type="button"
                                className="lab-action-btn lab-action-btn--danger"
                                onClick={() => handleRemoveParam(idx)}
                              >
                                <Trash2 size={14} />
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div style={{ marginTop: '0.75rem', display: 'flex', justifyContent: 'flex-start' }}>
                  <button
                    type="button"
                    className="lab-btn lab-btn--xs lab-btn--secondary"
                    onClick={handleAddParam}
                  >
                    <Plus size={13} />
                    <span>Add Parameter Row</span>
                  </button>
                </div>

                {/* Technician Notes */}
                <div className="lab-form-group" style={{ marginTop: '1.25rem' }}>
                  <label className="lab-form-label">Technician Laboratory Notes / Smear Observations</label>
                  <textarea
                    className="lab-textarea"
                    rows={3}
                    placeholder="e.g. Analyzed on automated hematology counter. Smear examined under oil immersion; platelets confirmed in clusters..."
                    value={technicianNotes}
                    onChange={(e) => setTechnicianNotes(e.target.value)}
                  />
                </div>
              </div>

              <div className="lab-card__footer">
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span className="lab-sub-text">Status will advance to:</span>
                  <span className="lab-status-badge lab-status-badge--purple">Awaiting Verification</span>
                </div>
                <div style={{ display: 'flex', gap: '0.75rem' }}>
                  <button
                    type="submit"
                    className={`lab-btn ${hasCriticalFlag ? 'lab-btn--danger' : 'lab-btn--primary'}`}
                    disabled={actionLoading}
                  >
                    <CheckCircle2 size={16} />
                    <span>{hasCriticalFlag ? 'Save with STAT Critical Flag' : 'Save & Forward to Verification'}</span>
                  </button>
                </div>
              </div>
            </form>
          ) : (
            <div className="lab-empty-state" style={{ padding: '4rem 2rem' }}>
              <FileText size={48} className="lab-empty-icon" />
              <p className="lab-empty-title">Select an Investigation</p>
              <p className="lab-empty-desc">Choose a test from the pending queue on the left to record its parameter findings.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
