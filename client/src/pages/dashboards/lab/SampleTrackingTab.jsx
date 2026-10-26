/**
 * Sample Tracking & Specimen Audit Timeline Tab
 * 
 * Full lifecycle tracking of biological specimens:
 * - Real timeline visualization based on actual backend timestamps
 * - Multi-stage filtering (Collected, Received, Processing, Verified, Rejected)
 * - Chain-of-custody tracking with responsible technicians
 */

import { useState, useEffect, useCallback } from 'react';
import {
  Activity,
  Barcode,
  Search,
  RefreshCw,
  X,
  ChevronRight,
} from 'lucide-react';
import { labService } from '../../../services/lab.service';

export default function SampleTrackingTab({ onNavigateTab }) {
  const [samples, setSamples] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [activeSearch, setActiveSearch] = useState('');
  const [stageFilter, setStageFilter] = useState('all');
  const [selectedSample, setSelectedSample] = useState(null);

  const fetchSamples = useCallback(() => {
    setLoading(true);
    labService.getSamples({
      stage: stageFilter !== 'all' ? stageFilter : undefined,
      search: activeSearch || undefined,
    })
      .then((res) => {
        setSamples(res.data || []);
      })
      .catch((err) => {
        console.error('Failed to load specimen tracking:', err);
      })
      .finally(() => {
        setLoading(false);
      });
  }, [activeSearch, stageFilter]);

  useEffect(() => {
    fetchSamples();
  }, [fetchSamples]);

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
            <Activity size={13} />
            <span>CHAIN OF CUSTODY & SPECIMEN AUDIT</span>
          </div>
          <h1 className="lab-header-title">Sample Tracking</h1>
          <p className="lab-header-subtitle">
            End-to-end biological specimen audit trail from collection to verified diagnostic report.
          </p>
        </div>
        <div className="lab-header-actions">
          <button
            type="button"
            className="lab-btn lab-btn--secondary"
            onClick={fetchSamples}
            disabled={loading}
          >
            <RefreshCw size={15} className={loading ? 'lab-spin' : ''} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* ── Stage Filter Pills & Search ── */}
      <div className="lab-filter-card">
        <form onSubmit={handleSearchSubmit} className="lab-filter-search" style={{ flex: 1 }}>
          <Search size={16} className="lab-filter-icon" />
          <input
            type="text"
            className="lab-input lab-input--search"
            placeholder="Search by Sample ID, Barcode, Request ID, or Patient..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <button type="submit" className="lab-btn lab-btn--primary lab-btn--sm">
            Search
          </button>
        </form>

        <div className="lab-pill-filters">
          {[
            { id: 'all', label: 'All Specimens' },
            { id: 'collected', label: 'Collected' },
            { id: 'processing', label: 'In Processing' },
            { id: 'completed', label: 'Verified & Done' },
            { id: 'rejected', label: 'Rejected' },
          ].map((pill) => (
            <button
              key={pill.id}
              type="button"
              className={`lab-filter-pill ${stageFilter === pill.id ? 'lab-filter-pill--active' : ''}`}
              onClick={() => setStageFilter(pill.id)}
            >
              {pill.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Specimen Table ── */}
      <div className="lab-card">
        <div className="lab-card__body lab-card__body--flush">
          {loading ? (
            <div className="lab-loading-block">
              <div className="lab-spinner" />
              <span>Querying specimen tracking ledger...</span>
            </div>
          ) : samples.length === 0 ? (
            <div className="lab-empty-state">
              <Barcode size={40} className="lab-empty-icon" />
              <p className="lab-empty-title">No Specimens Tracked</p>
              <p className="lab-empty-desc">
                {search || stageFilter !== 'all'
                  ? 'No specimens matched the specified filter.'
                  : 'No biological specimens are currently logged in the tracking system.'}
              </p>
            </div>
          ) : (
            <div className="lab-table-wrap">
              <table className="lab-table">
                <thead>
                  <tr>
                    <th>Sample Barcode</th>
                    <th>Request ID</th>
                    <th>Patient</th>
                    <th>Investigation</th>
                    <th>Specimen Type</th>
                    <th>Collected At</th>
                    <th>Current Stage</th>
                    <th>Status</th>
                    <th className="lab-col-right">Audit Trail</th>
                  </tr>
                </thead>
                <tbody>
                  {samples.map((s) => {
                    const statusClass =
                      s.status === 'Verified' || s.status === 'Completed'
                        ? 'green'
                        : s.status === 'Processing'
                        ? 'blue'
                        : s.status === 'Sample Collected'
                        ? 'cyan'
                        : s.status === 'Rejected'
                        ? 'red'
                        : 'amber';

                    return (
                      <tr key={s._id}>
                        <td>
                          <span className="lab-barcode-chip">
                            <Barcode size={13} />
                            <span>{s.sampleId || 'PENDING-ID'}</span>
                          </span>
                        </td>
                        <td>
                          <span className="lab-code-chip">{s.requestId}</span>
                        </td>
                        <td>
                          <div className="lab-cell-user">
                            <span className="lab-user-name">
                              {s.patient ? `${s.patient.firstName} ${s.patient.lastName}` : 'Walk-in'}
                            </span>
                            <span className="lab-user-sub">{s.patient?.gender || ''}</span>
                          </div>
                        </td>
                        <td>
                          <span className="lab-text-bold">{s.testName}</span>
                          <span className="lab-badge-cat">{s.category}</span>
                        </td>
                        <td>
                          <span>{s.sampleType || 'Whole Blood'}</span>
                          <span className="lab-sub-text">{s.sampleContainer}</span>
                        </td>
                        <td>
                          {s.sampleCollectedAt ? (
                            <span className="lab-sub-text">
                              {new Date(s.sampleCollectedAt).toLocaleString([], {
                                month: 'short',
                                day: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </span>
                          ) : (
                            <span className="lab-muted-text">Pending</span>
                          )}
                        </td>
                        <td>
                          <span className="lab-stage-badge">
                            {s.status === 'Sample Collected'
                              ? 'Accessioned / Ready'
                              : s.status === 'Processing'
                              ? 'Analyzer In-Vitro'
                              : s.status === 'Result Pending'
                              ? 'Results Entry'
                              : s.status === 'Verified'
                              ? 'Verified & Published'
                              : s.status === 'Rejected'
                              ? 'Rejected / Redraw'
                              : 'Pre-Analytical'}
                          </span>
                        </td>
                        <td>
                          <span className={`lab-status-badge lab-status-badge--${statusClass}`}>
                            {s.status}
                          </span>
                        </td>
                        <td className="lab-col-right">
                          <button
                            type="button"
                            className="lab-btn lab-btn--xs lab-btn--secondary"
                            onClick={() => setSelectedSample(s)}
                          >
                            <span>Timeline</span>
                            <ChevronRight size={13} />
                          </button>
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

      {/* ── Slide-Over Drawer: Specimen Timeline & Chain of Custody ── */}
      {selectedSample && (
        <div className="lab-drawer-overlay" onClick={() => setSelectedSample(null)}>
          <div className="lab-drawer" onClick={(e) => e.stopPropagation()}>
            <div className="lab-drawer__header">
              <div>
                <div className="lab-header-badge">SPECIMEN CHAIN OF CUSTODY</div>
                <h3 className="lab-drawer__title">{selectedSample.sampleId || selectedSample.requestId}</h3>
              </div>
              <button
                type="button"
                className="lab-drawer__close"
                onClick={() => setSelectedSample(null)}
              >
                <X size={18} />
              </button>
            </div>

            <div className="lab-drawer__content">
              {/* Specimen Summary */}
              <div className="lab-drawer-section">
                <h4 className="lab-drawer-section__title">Specimen Details</h4>
                <div className="lab-info-grid">
                  <div>
                    <span className="lab-info-label">Sample ID:</span>
                    <span className="lab-barcode-chip">
                      <Barcode size={13} />
                      <span>{selectedSample.sampleId || 'N/A'}</span>
                    </span>
                  </div>
                  <div>
                    <span className="lab-info-label">Sample Type:</span>
                    <span className="lab-info-value">{selectedSample.sampleType}</span>
                  </div>
                  <div>
                    <span className="lab-info-label">Container:</span>
                    <span className="lab-info-value">{selectedSample.sampleContainer}</span>
                  </div>
                  <div>
                    <span className="lab-info-label">Condition:</span>
                    <span className="lab-info-value">{selectedSample.sampleCondition || 'Acceptable'}</span>
                  </div>
                </div>
              </div>

              {/* Real Audit Lifecycle Timeline */}
              <div className="lab-drawer-section">
                <h4 className="lab-drawer-section__title">Chain of Custody Audit Trail</h4>
                <div className="lab-timeline">
                  {/* Step 1: Request Created */}
                  <div className="lab-timeline-step lab-timeline-step--completed">
                    <div className="lab-timeline-dot" />
                    <div className="lab-timeline-content">
                      <div className="lab-timeline-title">Request Ordered</div>
                      <div className="lab-timeline-time">
                        {new Date(selectedSample.createdAt).toLocaleString()}
                      </div>
                      <div className="lab-timeline-desc">
                        Ordered by {selectedSample.doctor ? `Dr. ${selectedSample.doctor.firstName} ${selectedSample.doctor.lastName}` : selectedSample.department}
                      </div>
                    </div>
                  </div>

                  {/* Step 2: Sample Collected */}
                  {selectedSample.sampleCollectedAt ? (
                    <div className="lab-timeline-step lab-timeline-step--completed">
                      <div className="lab-timeline-dot" />
                      <div className="lab-timeline-content">
                        <div className="lab-timeline-title">Specimen Collected</div>
                        <div className="lab-timeline-time">
                          {new Date(selectedSample.sampleCollectedAt).toLocaleString()}
                        </div>
                        <div className="lab-timeline-desc">
                          Phlebotomist logged specimen ({selectedSample.sampleType}, {selectedSample.sampleCondition})
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="lab-timeline-step">
                      <div className="lab-timeline-dot lab-timeline-dot--pending" />
                      <div className="lab-timeline-content">
                        <div className="lab-timeline-title">Specimen Collection Pending</div>
                      </div>
                    </div>
                  )}

                  {/* Step 3: In-Vitro Processing */}
                  {selectedSample.processingStartedAt ? (
                    <div className="lab-timeline-step lab-timeline-step--completed">
                      <div className="lab-timeline-dot" />
                      <div className="lab-timeline-content">
                        <div className="lab-timeline-title">In-Vitro Processing Started</div>
                        <div className="lab-timeline-time">
                          {new Date(selectedSample.processingStartedAt).toLocaleString()}
                        </div>
                        <div className="lab-timeline-desc">
                          Active analyzer assay initiated
                        </div>
                      </div>
                    </div>
                  ) : selectedSample.status === 'Processing' ? (
                    <div className="lab-timeline-step lab-timeline-step--active">
                      <div className="lab-timeline-dot lab-timeline-dot--active" />
                      <div className="lab-timeline-content">
                        <div className="lab-timeline-title">In-Vitro Processing in Progress</div>
                      </div>
                    </div>
                  ) : null}

                  {/* Step 4: Results Entered */}
                  {selectedSample.resultsEnteredAt ? (
                    <div className="lab-timeline-step lab-timeline-step--completed">
                      <div className="lab-timeline-dot" />
                      <div className="lab-timeline-content">
                        <div className="lab-timeline-title">Results Recorded</div>
                        <div className="lab-timeline-time">
                          {new Date(selectedSample.resultsEnteredAt).toLocaleString()}
                        </div>
                        <div className="lab-timeline-desc">
                          {selectedSample.results?.length || 0} parameter(s) recorded.
                          {selectedSample.isCritical && (
                            <span className="lab-color-red" style={{ display: 'block', fontWeight: 600 }}>
                              CRITICAL ALERT FLAGGED
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  ) : null}

                  {/* Step 5: Verified / Published */}
                  {selectedSample.verifiedAt ? (
                    <div className="lab-timeline-step lab-timeline-step--completed">
                      <div className="lab-timeline-dot lab-timeline-dot--verified" />
                      <div className="lab-timeline-content">
                        <div className="lab-timeline-title">Clinical Verification & Sign-off</div>
                        <div className="lab-timeline-time">
                          {new Date(selectedSample.verifiedAt).toLocaleString()}
                        </div>
                        <div className="lab-timeline-desc">
                          Verified by clinical pathologist. Final diagnostic report published.
                        </div>
                      </div>
                    </div>
                  ) : null}

                  {/* Step Rejection (if applicable) */}
                  {selectedSample.status === 'Rejected' && (
                    <div className="lab-timeline-step lab-timeline-step--rejected">
                      <div className="lab-timeline-dot lab-timeline-dot--rejected" />
                      <div className="lab-timeline-content">
                        <div className="lab-timeline-title lab-color-red">Specimen Rejected</div>
                        <div className="lab-timeline-desc">
                          {selectedSample.rejectionReason || 'Specimen did not meet laboratory accessioning criteria.'}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="lab-drawer__footer">
              <button
                type="button"
                className="lab-btn lab-btn--secondary"
                onClick={() => setSelectedSample(null)}
              >
                Close
              </button>
              {selectedSample.status === 'Sample Collected' && (
                <button
                  type="button"
                  className="lab-btn lab-btn--primary"
                  onClick={() => {
                    const s = selectedSample;
                    setSelectedSample(null);
                    onNavigateTab('processing', s);
                  }}
                >
                  <Activity size={15} />
                  <span>Start Processing</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
