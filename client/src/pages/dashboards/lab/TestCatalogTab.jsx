/**
 * Laboratory Test Catalog Tab
 * 
 * Standardized diagnostic test definitions:
 * - Test codes, categories, required specimen tubes
 * - Clinical parameters, reference ranges, critical thresholds
 * - Turnaround times and departmental pricing
 * - Add/Edit test modal with parameter builder
 */

import { useState, useEffect } from 'react';
import {
  Layers,
  Search,
  Plus,
  Edit2,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  X,
  Trash2,
} from 'lucide-react';
import { labService } from '../../../services/lab.service';

export default function TestCatalogTab() {
  const [tests, setTests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [feedback, setFeedback] = useState(null);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('ALL');

  // Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [editingTest, setEditingTest] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);

  // Form State
  const [testCode, setTestCode] = useState('');
  const [testName, setTestName] = useState('');
  const [category, setCategory] = useState('Biochemistry');
  const [department, setDepartment] = useState('Central Diagnostic Laboratory');
  const [description, setDescription] = useState('');
  const [sampleType, setSampleType] = useState('Serum');
  const [sampleContainer, setSampleContainer] = useState('SST Gel Separator (Yellow top)');
  const [requiredQuantity, setRequiredQuantity] = useState('3 mL');
  const [fastingRequired, setFastingRequired] = useState(false);
  const [turnaroundTimeHours, setTurnaroundTimeHours] = useState(4);
  const [price, setPrice] = useState(500);
  const [parameters, setParameters] = useState([
    { name: '', unit: '', referenceRange: '', criticalLow: '', criticalHigh: '' },
  ]);

  const fetchTests = () => {
    setLoading(true);
    labService.getTests({
      search: search || undefined,
      category: categoryFilter !== 'ALL' ? categoryFilter : undefined,
    })
      .then((res) => {
        setTests(res.data || []);
      })
      .catch((err) => {
        console.error('Failed to load test catalog:', err);
        setFeedback({ type: 'error', message: 'Unable to load test catalog.' });
      })
      .finally(() => {
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchTests();
  }, [categoryFilter]);

  const openAddModal = () => {
    setEditingTest(null);
    setTestCode('');
    setTestName('');
    setCategory('Biochemistry');
    setDepartment('Central Diagnostic Laboratory');
    setDescription('');
    setSampleType('Serum');
    setSampleContainer('SST Gel Separator (Yellow top)');
    setRequiredQuantity('3 mL');
    setFastingRequired(false);
    setTurnaroundTimeHours(4);
    setPrice(500);
    setParameters([
      { name: '', unit: '', referenceRange: '', criticalLow: '', criticalHigh: '' },
    ]);
    setModalOpen(true);
  };

  const openEditModal = (test) => {
    setEditingTest(test);
    setTestCode(test.testCode);
    setTestName(test.testName);
    setCategory(test.category || 'General');
    setDepartment(test.department || 'Central Diagnostic Laboratory');
    setDescription(test.description || '');
    setSampleType(test.sampleType || 'Serum');
    setSampleContainer(test.sampleContainer || 'Standard Container');
    setRequiredQuantity(test.requiredQuantity || '3 mL');
    setFastingRequired(Boolean(test.fastingRequired));
    setTurnaroundTimeHours(test.turnaroundTimeHours || 4);
    setPrice(test.price || 0);
    setParameters(
      test.parameters && test.parameters.length > 0
        ? test.parameters.map((p) => ({
            name: p.name,
            unit: p.unit || '',
            referenceRange: p.referenceRange || '',
            criticalLow: p.criticalLow != null ? p.criticalLow : '',
            criticalHigh: p.criticalHigh != null ? p.criticalHigh : '',
          }))
        : [{ name: '', unit: '', referenceRange: '', criticalLow: '', criticalHigh: '' }]
    );
    setModalOpen(true);
  };

  const handleAddParam = () => {
    setParameters([
      ...parameters,
      { name: '', unit: '', referenceRange: '', criticalLow: '', criticalHigh: '' },
    ]);
  };

  const handleRemoveParam = (index) => {
    setParameters(parameters.filter((_, idx) => idx !== index));
  };

  const handleParamChange = (index, field, val) => {
    const updated = [...parameters];
    updated[index][field] = val;
    setParameters(updated);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!testCode.trim() || !testName.trim() || !sampleType.trim()) return;

    setActionLoading(true);
    try {
      const payload = {
        testCode: testCode.trim().toUpperCase(),
        testName: testName.trim(),
        category,
        department,
        description,
        sampleType,
        sampleContainer,
        requiredQuantity,
        fastingRequired,
        turnaroundTimeHours: Number(turnaroundTimeHours),
        price: Number(price),
        parameters: parameters.filter((p) => p.name.trim()),
      };

      if (editingTest) {
        await labService.updateTest(editingTest._id, payload);
        setFeedback({ type: 'success', message: `Test '${payload.testName}' updated successfully.` });
      } else {
        await labService.createTest(payload);
        setFeedback({ type: 'success', message: `New test '${payload.testName}' added to catalog.` });
      }

      setModalOpen(false);
      fetchTests();
    } catch (err) {
      console.error('Catalog save error:', err);
      setFeedback({
        type: 'error',
        message: err.response?.data?.message || 'Failed to save test catalog entry.',
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
            <Layers size={13} />
            <span>DIAGNOSTIC TEST REPOSITORY</span>
          </div>
          <h1 className="lab-header-title">Diagnostic Test Catalog</h1>
          <p className="lab-header-subtitle">
            Configure investigation definitions, specimen container protocols, reference values, and critical ranges.
          </p>
        </div>
        <div className="lab-header-actions">
          <button
            type="button"
            className="lab-btn lab-btn--secondary"
            onClick={fetchTests}
            disabled={loading}
          >
            <RefreshCw size={15} className={loading ? 'lab-spin' : ''} />
            <span>Refresh</span>
          </button>
          <button
            type="button"
            className="lab-btn lab-btn--primary"
            onClick={openAddModal}
          >
            <Plus size={16} />
            <span>Add Test Definition</span>
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

      {/* ── Search & Filter ── */}
      <div className="lab-filter-card">
        <div className="lab-filter-search" style={{ flex: 1 }}>
          <Search size={16} className="lab-filter-icon" />
          <input
            type="text"
            className="lab-input lab-input--search"
            placeholder="Search by Test Name, Test Code, Department..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="lab-select-wrap">
          <label className="lab-filter-label">Category:</label>
          <select
            className="lab-select"
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
          >
            <option value="ALL">All Categories</option>
            <option value="Hematology">Hematology</option>
            <option value="Biochemistry">Biochemistry</option>
            <option value="Microbiology">Microbiology</option>
            <option value="Immunology">Immunology</option>
            <option value="Pathology">Pathology</option>
            <option value="Urinalysis">Urinalysis</option>
          </select>
        </div>
      </div>

      {/* ── Test Catalog Grid / Table ── */}
      <div className="lab-card">
        <div className="lab-card__body lab-card__body--flush">
          {loading ? (
            <div className="lab-loading-block">
              <div className="lab-spinner" />
              <span>Loading test definitions...</span>
            </div>
          ) : tests.length === 0 ? (
            <div className="lab-empty-state">
              <Layers size={40} className="lab-empty-icon" />
              <p className="lab-empty-title">No Tests Found</p>
              <p className="lab-empty-desc">No diagnostic tests matched your search criteria.</p>
            </div>
          ) : (
            <div className="lab-table-wrap">
              <table className="lab-table">
                <thead>
                  <tr>
                    <th>Test Code</th>
                    <th>Test Name</th>
                    <th>Category</th>
                    <th>Specimen Type</th>
                    <th>Collection Tube</th>
                    <th>TAT</th>
                    <th>Price</th>
                    <th>Parameters</th>
                    <th className="lab-col-right">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {tests.map((t) => (
                    <tr key={t._id}>
                      <td>
                        <span className="lab-code-chip">{t.testCode}</span>
                      </td>
                      <td>
                        <span className="lab-text-bold">{t.testName}</span>
                        {t.description && <span className="lab-sub-text">{t.description}</span>}
                      </td>
                      <td>
                        <span className="lab-badge-cat">{t.category}</span>
                      </td>
                      <td>
                        <span>{t.sampleType}</span>
                      </td>
                      <td>
                        <span className="lab-tube-pill">{t.sampleContainer}</span>
                      </td>
                      <td>
                        <span className="lab-sub-text">{t.turnaroundTimeHours} hrs</span>
                      </td>
                      <td>
                        <span className="lab-text-bold">${t.price}</span>
                      </td>
                      <td>
                        <span className="lab-sub-text">
                          {t.parameters?.length || 0} parameter(s)
                        </span>
                      </td>
                      <td className="lab-col-right">
                        <button
                          type="button"
                          className="lab-action-btn"
                          title="Edit Test Configuration"
                          onClick={() => openEditModal(t)}
                        >
                          <Edit2 size={15} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* ── Modal: Add / Edit Test Definition ── */}
      {modalOpen && (
        <div className="lab-modal-overlay">
          <div className="lab-modal lab-modal--lg">
            <div className="lab-modal__header">
              <div className="lab-modal__title-group">
                <Layers size={18} className="lab-color-cyan" />
                <h3 className="lab-modal__title">
                  {editingTest ? `Edit Test Definition: ${editingTest.testCode}` : 'Create Diagnostic Test Definition'}
                </h3>
              </div>
              <button
                type="button"
                className="lab-modal__close"
                onClick={() => setModalOpen(false)}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="lab-modal__body">
                <div className="lab-form-grid">
                  <div className="lab-form-group">
                    <label className="lab-form-label">Test Code *</label>
                    <input
                      type="text"
                      className="lab-input"
                      placeholder="e.g. CBC-01, LFT-02"
                      value={testCode}
                      onChange={(e) => setTestCode(e.target.value.toUpperCase())}
                      required
                    />
                  </div>

                  <div className="lab-form-group">
                    <label className="lab-form-label">Test Name *</label>
                    <input
                      type="text"
                      className="lab-input"
                      placeholder="e.g. Complete Blood Count (CBC)"
                      value={testName}
                      onChange={(e) => setTestName(e.target.value)}
                      required
                    />
                  </div>

                  <div className="lab-form-group">
                    <label className="lab-form-label">Category</label>
                    <select
                      className="lab-select"
                      value={category}
                      onChange={(e) => setCategory(e.target.value)}
                    >
                      <option value="Hematology">Hematology</option>
                      <option value="Biochemistry">Biochemistry</option>
                      <option value="Microbiology">Microbiology</option>
                      <option value="Immunology">Immunology</option>
                      <option value="Pathology">Pathology</option>
                      <option value="Urinalysis">Urinalysis</option>
                      <option value="General">General</option>
                    </select>
                  </div>

                  <div className="lab-form-group">
                    <label className="lab-form-label">Department</label>
                    <input
                      type="text"
                      className="lab-input"
                      value={department}
                      onChange={(e) => setDepartment(e.target.value)}
                    />
                  </div>

                  <div className="lab-form-group">
                    <label className="lab-form-label">Specimen Type *</label>
                    <input
                      type="text"
                      className="lab-input"
                      placeholder="e.g. Whole Blood, Serum, Urine"
                      value={sampleType}
                      onChange={(e) => setSampleType(e.target.value)}
                      required
                    />
                  </div>

                  <div className="lab-form-group">
                    <label className="lab-form-label">Collection Tube / Container</label>
                    <input
                      type="text"
                      className="lab-input"
                      placeholder="e.g. EDTA Vacutainer (Lavender), SST Yellow"
                      value={sampleContainer}
                      onChange={(e) => setSampleContainer(e.target.value)}
                    />
                  </div>

                  <div className="lab-form-group">
                    <label className="lab-form-label">Turnaround Time (Hours)</label>
                    <input
                      type="number"
                      className="lab-input"
                      min="1"
                      value={turnaroundTimeHours}
                      onChange={(e) => setTurnaroundTimeHours(e.target.value)}
                    />
                  </div>

                  <div className="lab-form-group">
                    <label className="lab-form-label">Test Charge / Price ($)</label>
                    <input
                      type="number"
                      className="lab-input"
                      min="0"
                      value={price}
                      onChange={(e) => setPrice(e.target.value)}
                    />
                  </div>
                </div>

                {/* Description */}
                <div className="lab-form-group" style={{ marginTop: '0.85rem' }}>
                  <label className="lab-form-label">Clinical Description / Indication</label>
                  <textarea
                    className="lab-textarea"
                    rows={2}
                    placeholder="Brief description of clinical utility..."
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                  />
                </div>

                {/* Parameters Sub-Form */}
                <div style={{ marginTop: '1.25rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.65rem' }}>
                    <label className="lab-form-label" style={{ margin: 0 }}>
                      Configured Parameters ({parameters.length})
                    </label>
                    <button
                      type="button"
                      className="lab-btn lab-btn--xs lab-btn--secondary"
                      onClick={handleAddParam}
                    >
                      <Plus size={13} />
                      <span>Add Parameter</span>
                    </button>
                  </div>

                  <div className="lab-param-builder">
                    {parameters.map((param, pIdx) => (
                      <div key={pIdx} className="lab-param-row">
                        <input
                          type="text"
                          className="lab-input lab-input--sm"
                          placeholder="Parameter (e.g. Hemoglobin)"
                          value={param.name}
                          onChange={(e) => handleParamChange(pIdx, 'name', e.target.value)}
                          required
                        />
                        <input
                          type="text"
                          className="lab-input lab-input--sm"
                          placeholder="Unit (e.g. g/dL)"
                          value={param.unit}
                          onChange={(e) => handleParamChange(pIdx, 'unit', e.target.value)}
                          style={{ maxWidth: '100px' }}
                        />
                        <input
                          type="text"
                          className="lab-input lab-input--sm"
                          placeholder="Ref Range (e.g. 13.0 - 17.5)"
                          value={param.referenceRange}
                          onChange={(e) => handleParamChange(pIdx, 'referenceRange', e.target.value)}
                        />
                        <input
                          type="number"
                          className="lab-input lab-input--sm"
                          placeholder="Crit Low"
                          value={param.criticalLow}
                          onChange={(e) => handleParamChange(pIdx, 'criticalLow', e.target.value)}
                          style={{ maxWidth: '90px' }}
                        />
                        <input
                          type="number"
                          className="lab-input lab-input--sm"
                          placeholder="Crit High"
                          value={param.criticalHigh}
                          onChange={(e) => handleParamChange(pIdx, 'criticalHigh', e.target.value)}
                          style={{ maxWidth: '90px' }}
                        />
                        {parameters.length > 1 && (
                          <button
                            type="button"
                            className="lab-action-btn lab-action-btn--danger"
                            onClick={() => handleRemoveParam(pIdx)}
                          >
                            <Trash2 size={14} />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="lab-modal__footer">
                <button
                  type="button"
                  className="lab-btn lab-btn--secondary"
                  onClick={() => setModalOpen(false)}
                  disabled={actionLoading}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="lab-btn lab-btn--primary"
                  disabled={actionLoading}
                >
                  {editingTest ? 'Update Test' : 'Save Test Definition'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
