/**
 * Medicines Catalog Tab
 * 
 * Comprehensive hospital formulary and medicine catalog:
 * - Search by Name, Generic Name, Brand, or Medicine ID
 * - Filters by Category, Dosage Form, and Stock Status
 * - In-depth medicine inspection modal
 * - Add Medicine modal for registering new drugs into the hospital catalog
 */

import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Layers,
  Search,
  Plus,
  RefreshCw,
  Eye,
  Package,
  X,
  AlertCircle,
} from 'lucide-react';
import { pharmacyService } from '../../../services/pharmacy.service';

export default function MedicinesTab({ onNavigateTab }) {
  const [searchParams] = useSearchParams();
  const urlSearch = searchParams.get('q') || '';
  const [medicines, setMedicines] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState(urlSearch);
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedMed, setSelectedMed] = useState(null);
  const [showAddModal, setShowAddModal] = useState(false);

  // Form State
  const [newMed, setNewMed] = useState({
    name: '',
    genericName: '',
    brand: '',
    strength: '',
    dosageForm: 'Tablet',
    category: 'Antibiotics',
    manufacturer: '',
    unit: 'Box of 100',
    unitPrice: '',
    reorderLevel: '30',
    initialStock: '100',
    description: '',
  });
  const [submitting, setSubmitting] = useState(false);

  const fetchMedicines = (searchOverride) => {
    setLoading(true);
    setError('');
    const query = typeof searchOverride === 'string' ? searchOverride : (urlSearch || search);
    pharmacyService.getMedicines({ search: query, category: categoryFilter, status: statusFilter })
      .then((res) => {
        const list = res.data?.medicines || res.data || [];
        setMedicines(Array.isArray(list) ? list : []);
      })
      .catch((err) => {
        console.error('Failed to load medicines:', err);
        setError('Unable to load medicine catalog.');
      })
      .finally(() => {
        setLoading(false);
      });
  };

  useEffect(() => {
    let active = true;
    pharmacyService.getMedicines({ search: urlSearch || search, category: categoryFilter, status: statusFilter })
      .then((res) => {
        if (!active) return;
        const list = res.data?.medicines || res.data || [];
        setMedicines(Array.isArray(list) ? list : []);
        setLoading(false);
      })
      .catch((err) => {
        if (!active) return;
        console.error('Failed to load medicines:', err);
        setError('Unable to load medicine catalog.');
        setLoading(false);
      });
    return () => { active = false; };
  }, [urlSearch, categoryFilter, statusFilter, search]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchMedicines();
  };

  const handleAddSubmit = (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');

    pharmacyService.addMedicine(newMed)
      .then(() => {
        setShowAddModal(false);
        setNewMed({
          name: '',
          genericName: '',
          brand: '',
          strength: '',
          dosageForm: 'Tablet',
          category: 'Antibiotics',
          manufacturer: '',
          unit: 'Box of 100',
          unitPrice: '',
          reorderLevel: '30',
          initialStock: '100',
          description: '',
        });
        fetchMedicines();
      })
      .catch((err) => {
        setError(err.response?.data?.message || err.message || 'Failed to add medicine.');
      })
      .finally(() => {
        setSubmitting(false);
      });
  };

  return (
    <div className="pharm-container">
      {/* ── Page Header ── */}
      <div className="pharm-header">
        <div className="pharm-header-left">
          <div className="pharm-header-badge">HOSPITAL PHARMACEUTICAL FORMULARY</div>
          <h1 className="pharm-header-title">Medicine Catalog</h1>
          <p className="pharm-header-subtitle">
            Master repository of authorized hospital pharmaceuticals, dosage formulations, and reorder levels.
          </p>
        </div>
        <div className="pharm-header-actions">
          <button
            type="button"
            className="pharm-btn pharm-btn--secondary"
            onClick={fetchMedicines}
            disabled={loading}
          >
            <RefreshCw size={16} className={loading ? 'rec-spin' : ''} />
            <span>Refresh</span>
          </button>
          <button
            type="button"
            className="pharm-btn pharm-btn--primary"
            onClick={() => setShowAddModal(true)}
          >
            <Plus size={16} />
            <span>Add Medicine</span>
          </button>
        </div>
      </div>

      {/* ── Filter & Search Bar ── */}
      <div className="pharm-filter-bar">
        <form onSubmit={handleSearchSubmit} style={{ display: 'flex', flex: 1, gap: '0.75rem', flexWrap: 'wrap' }}>
          <div style={{ position: 'relative', flex: 1, minWidth: '240px' }}>
            <Search
              size={18}
              style={{
                position: 'absolute',
                left: '12px',
                top: '50%',
                transform: 'translateY(-50%)',
                color: 'var(--text-secondary)',
              }}
            />
            <input
              type="text"
              className="pharm-form-input"
              placeholder="Search by Medicine Name, Generic Name, Brand, Code..."
              style={{ paddingLeft: '38px' }}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <button type="submit" className="pharm-btn pharm-btn--primary">
            Search
          </button>
        </form>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
          <select
            className="pharm-form-select"
            style={{ width: '160px', padding: '0.45rem 0.65rem', fontSize: '0.82rem' }}
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
          >
            <option value="all">All Categories</option>
            <option value="Antibiotics">Antibiotics</option>
            <option value="Cardiovascular">Cardiovascular</option>
            <option value="Endocrinology / Diabetes">Endocrinology</option>
            <option value="Analgesics & Antipyretics">Analgesics</option>
            <option value="Gastroenterology">Gastroenterology</option>
            <option value="Respiratory / Pulmonology">Respiratory</option>
          </select>

          <select
            className="pharm-form-select"
            style={{ width: '140px', padding: '0.45rem 0.65rem', fontSize: '0.82rem' }}
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="all">All Status</option>
            <option value="In Stock">In Stock</option>
            <option value="Low Stock">Low Stock</option>
            <option value="Out of Stock">Out of Stock</option>
          </select>
        </div>
      </div>

      {/* ── Error Banner ── */}
      {error && (
        <div style={{ padding: '0.85rem 1rem', background: '#fee2e2', borderRadius: '8px', color: '#b91c1c', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <AlertCircle size={16} />
          <span>{error}</span>
        </div>
      )}

      {/* ── Catalog Table ── */}
      <div className="pharm-card">
        <div className="pharm-card-body" style={{ padding: 0 }}>
          <div className="pharm-table-wrap" style={{ border: 'none' }}>
            <table className="pharm-table">
              <thead>
                <tr>
                  <th>Medicine Name</th>
                  <th>Generic Name</th>
                  <th>Strength</th>
                  <th>Dosage Form</th>
                  <th>Category</th>
                  <th>Available Stock</th>
                  <th>Reorder Level</th>
                  <th>Unit Price</th>
                  <th>Status</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={10} style={{ textAlign: 'center', padding: '3.5rem', color: 'var(--text-secondary)' }}>
                      <RefreshCw size={28} className="rec-spin" style={{ margin: '0 auto 0.75rem', color: '#0891b2' }} />
                      <p style={{ margin: 0, fontWeight: 600 }}>Loading medicine catalog...</p>
                    </td>
                  </tr>
                ) : medicines.length === 0 ? (
                  <tr>
                    <td colSpan={10} style={{ textAlign: 'center', padding: '3.5rem', color: 'var(--text-secondary)' }}>
                      <Layers size={40} style={{ color: 'var(--border-color)', margin: '0 auto 0.75rem' }} />
                      <div style={{ fontWeight: 700, fontSize: '1.05rem', color: 'var(--text-primary)' }}>No medicines found</div>
                      <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
                        No pharmaceutical entries matched your search filters.
                      </div>
                    </td>
                  </tr>
                ) : (
                  medicines.map((m) => (
                    <tr key={m.id}>
                      <td>
                        <div style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{m.name}</div>
                        <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>Code: {m.id}</div>
                      </td>
                      <td style={{ color: 'var(--text-secondary)' }}>{m.genericName}</td>
                      <td style={{ fontWeight: 600 }}>{m.strength}</td>
                      <td>
                        <span className="pharm-badge pharm-badge--info" style={{ fontSize: '0.72rem' }}>
                          {m.dosageForm}
                        </span>
                      </td>
                      <td style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>{m.category}</td>
                      <td>
                        <strong
                          style={{
                            color: m.totalStock === 0 ? '#dc2626' : m.totalStock <= m.reorderLevel ? '#d97706' : 'var(--text-primary)',
                            fontSize: '1rem',
                          }}
                        >
                          {m.totalStock}
                        </strong>
                      </td>
                      <td style={{ color: 'var(--text-secondary)' }}>{m.reorderLevel}</td>
                      <td style={{ fontWeight: 700, color: '#059669' }}>${Number(m.unitPrice).toFixed(2)}</td>
                      <td>
                        <span
                          className={`pharm-badge ${
                            m.status === 'In Stock'
                              ? 'pharm-badge--success'
                              : m.status === 'Low Stock'
                              ? 'pharm-badge--warning'
                              : 'pharm-badge--danger'
                          }`}
                        >
                          {m.status}
                        </span>
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <div style={{ display: 'inline-flex', gap: '0.4rem' }}>
                          <button
                            type="button"
                            className="pharm-btn pharm-btn--secondary pharm-btn--sm"
                            onClick={() => setSelectedMed(m)}
                            title="View Full Details"
                          >
                            <Eye size={14} />
                            <span>View</span>
                          </button>
                          <button
                            type="button"
                            className="pharm-btn pharm-btn--secondary pharm-btn--sm"
                            onClick={() => onNavigateTab('inventory')}
                            title="Check Stock & Adjustments"
                          >
                            <Package size={14} />
                            <span>Stock</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* ── Medicine Details Modal ── */}
      {selectedMed && (
        <div className="pharm-modal-overlay" onClick={() => setSelectedMed(null)}>
          <div className="pharm-modal" style={{ maxWidth: '640px' }} onClick={(e) => e.stopPropagation()}>
            <div className="pharm-modal-header">
              <div>
                <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#0891b2', textTransform: 'uppercase' }}>Medicine Profile</div>
                <h3 className="pharm-modal-title">{selectedMed.name}</h3>
              </div>
              <button
                type="button"
                className="pharm-btn pharm-btn--secondary pharm-btn--sm"
                onClick={() => setSelectedMed(null)}
              >
                <X size={16} />
              </button>
            </div>
            <div className="pharm-modal-body">
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1rem', marginBottom: '1.25rem' }}>
                <div style={{ background: 'var(--bg-hover)', padding: '0.85rem', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>GENERIC NAME</div>
                  <div style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{selectedMed.genericName}</div>
                </div>
                <div style={{ background: 'var(--bg-hover)', padding: '0.85rem', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>BRAND / TRADE</div>
                  <div style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{selectedMed.brand || selectedMed.name}</div>
                </div>
                <div style={{ background: 'var(--bg-hover)', padding: '0.85rem', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>STRENGTH & FORM</div>
                  <div style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{selectedMed.strength} • {selectedMed.dosageForm}</div>
                </div>
                <div style={{ background: 'var(--bg-hover)', padding: '0.85rem', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>THERAPEUTIC CATEGORY</div>
                  <div style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{selectedMed.category}</div>
                </div>
                <div style={{ background: 'var(--bg-hover)', padding: '0.85rem', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>MANUFACTURER</div>
                  <div style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{selectedMed.manufacturer || 'Standard'}</div>
                </div>
                <div style={{ background: 'var(--bg-hover)', padding: '0.85rem', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>DISPENSING UNIT & PRICE</div>
                  <div style={{ fontWeight: 700, color: '#059669' }}>{selectedMed.unit} • ${Number(selectedMed.unitPrice).toFixed(2)}</div>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem', marginBottom: '1.25rem' }}>
                <div style={{ textAlign: 'center', background: '#f0f9ff', padding: '0.75rem', borderRadius: '8px' }}>
                  <div style={{ fontSize: '0.75rem', color: '#0284c7' }}>CURRENT STOCK</div>
                  <div style={{ fontSize: '1.35rem', fontWeight: 800, color: '#0369a1' }}>{selectedMed.totalStock}</div>
                </div>
                <div style={{ textAlign: 'center', background: 'var(--bg-hover)', padding: '0.75rem', borderRadius: '8px' }}>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>REORDER POINT</div>
                  <div style={{ fontSize: '1.35rem', fontWeight: 800, color: 'var(--text-primary)' }}>{selectedMed.reorderLevel}</div>
                </div>
                <div style={{ textAlign: 'center', background: selectedMed.status === 'In Stock' ? '#ecfdf5' : '#fef2f2', padding: '0.75rem', borderRadius: '8px' }}>
                  <div style={{ fontSize: '0.75rem', color: selectedMed.status === 'In Stock' ? '#059669' : '#dc2626' }}>STATUS</div>
                  <div style={{ fontSize: '1rem', fontWeight: 800, color: selectedMed.status === 'In Stock' ? '#047857' : '#b91c1c' }}>{selectedMed.status}</div>
                </div>
              </div>

              {selectedMed.description && (
                <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.5, background: 'var(--bg-hover)', padding: '0.85rem', borderRadius: '8px' }}>
                  <strong>Description & Indications:</strong> {selectedMed.description}
                </div>
              )}
            </div>
            <div className="pharm-modal-footer">
              <button
                type="button"
                className="pharm-btn pharm-btn--secondary"
                onClick={() => setSelectedMed(null)}
              >
                Close
              </button>
              <button
                type="button"
                className="pharm-btn pharm-btn--primary"
                onClick={() => {
                  setSelectedMed(null);
                  onNavigateTab('inventory');
                }}
              >
                <Package size={16} />
                <span>Manage Inventory</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Add Medicine Modal ── */}
      {showAddModal && (
        <div className="pharm-modal-overlay" onClick={() => setShowAddModal(false)}>
          <div className="pharm-modal" style={{ maxWidth: '680px' }} onClick={(e) => e.stopPropagation()}>
            <form onSubmit={handleAddSubmit}>
              <div className="pharm-modal-header">
                <h3 className="pharm-modal-title">Register New Medicine</h3>
                <button
                  type="button"
                  className="pharm-btn pharm-btn--secondary pharm-btn--sm"
                  onClick={() => setShowAddModal(false)}
                >
                  <X size={16} />
                </button>
              </div>
              <div className="pharm-modal-body">
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1rem', marginBottom: '1rem' }}>
                  <div>
                    <label className="pharm-form-label">Brand / Trade Name *</label>
                    <input
                      type="text"
                      required
                      className="pharm-form-input"
                      placeholder="e.g. Augmentin"
                      value={newMed.name}
                      onChange={(e) => setNewMed({ ...newMed, name: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="pharm-form-label">Generic / Active Ingredient *</label>
                    <input
                      type="text"
                      required
                      className="pharm-form-input"
                      placeholder="e.g. Amoxicillin + Clavulanate"
                      value={newMed.genericName}
                      onChange={(e) => setNewMed({ ...newMed, genericName: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="pharm-form-label">Strength *</label>
                    <input
                      type="text"
                      required
                      className="pharm-form-input"
                      placeholder="e.g. 625 mg"
                      value={newMed.strength}
                      onChange={(e) => setNewMed({ ...newMed, strength: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="pharm-form-label">Dosage Form *</label>
                    <select
                      className="pharm-form-select"
                      value={newMed.dosageForm}
                      onChange={(e) => setNewMed({ ...newMed, dosageForm: e.target.value })}
                    >
                      <option value="Tablet">Tablet</option>
                      <option value="Capsule">Capsule</option>
                      <option value="Syrup">Syrup / Suspension</option>
                      <option value="Injection">Injection (Vial/Ampoule)</option>
                      <option value="Inhaler">Inhaler / Respule</option>
                      <option value="Ointment">Topical Ointment/Cream</option>
                      <option value="Drops">Eye/Ear Drops</option>
                    </select>
                  </div>
                  <div>
                    <label className="pharm-form-label">Therapeutic Category</label>
                    <select
                      className="pharm-form-select"
                      value={newMed.category}
                      onChange={(e) => setNewMed({ ...newMed, category: e.target.value })}
                    >
                      <option value="Antibiotics">Antibiotics</option>
                      <option value="Cardiovascular">Cardiovascular</option>
                      <option value="Endocrinology / Diabetes">Endocrinology / Diabetes</option>
                      <option value="Analgesics & Antipyretics">Analgesics & Antipyretics</option>
                      <option value="Gastroenterology">Gastroenterology</option>
                      <option value="Respiratory / Pulmonology">Respiratory / Pulmonology</option>
                      <option value="Neurology / Psychiatric">Neurology / Psychiatric</option>
                      <option value="Emergency & Resuscitation">Emergency & Resuscitation</option>
                    </select>
                  </div>
                  <div>
                    <label className="pharm-form-label">Manufacturer</label>
                    <input
                      type="text"
                      className="pharm-form-input"
                      placeholder="e.g. GlaxoSmithKline"
                      value={newMed.manufacturer}
                      onChange={(e) => setNewMed({ ...newMed, manufacturer: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="pharm-form-label">Dispensing Unit</label>
                    <input
                      type="text"
                      className="pharm-form-input"
                      placeholder="e.g. Strip of 10"
                      value={newMed.unit}
                      onChange={(e) => setNewMed({ ...newMed, unit: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="pharm-form-label">Retail Unit Price ($)</label>
                    <input
                      type="number"
                      step="0.01"
                      className="pharm-form-input"
                      placeholder="e.g. 14.50"
                      value={newMed.unitPrice}
                      onChange={(e) => setNewMed({ ...newMed, unitPrice: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="pharm-form-label">Initial Stock Quantity</label>
                    <input
                      type="number"
                      className="pharm-form-input"
                      value={newMed.initialStock}
                      onChange={(e) => setNewMed({ ...newMed, initialStock: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="pharm-form-label">Reorder Point Threshold</label>
                    <input
                      type="number"
                      className="pharm-form-input"
                      value={newMed.reorderLevel}
                      onChange={(e) => setNewMed({ ...newMed, reorderLevel: e.target.value })}
                    />
                  </div>
                </div>

                <div>
                  <label className="pharm-form-label">Clinical Description / Indications</label>
                  <textarea
                    rows="2"
                    className="pharm-form-textarea"
                    placeholder="Brief clinical indications and administration notes..."
                    value={newMed.description}
                    onChange={(e) => setNewMed({ ...newMed, description: e.target.value })}
                  />
                </div>
              </div>
              <div className="pharm-modal-footer">
                <button
                  type="button"
                  className="pharm-btn pharm-btn--secondary"
                  onClick={() => setShowAddModal(false)}
                  disabled={submitting}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="pharm-btn pharm-btn--primary"
                  disabled={submitting}
                >
                  {submitting ? <RefreshCw size={16} className="rec-spin" /> : <Plus size={16} />}
                  <span>{submitting ? 'Registering...' : 'Add to Catalog'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
