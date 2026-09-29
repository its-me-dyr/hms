/**
 * Suppliers & Vendor Directory Tab
 * 
 * Pharmaceutical vendor management:
 * - Comprehensive supplier directory (tax ID, contact person, phone, email, terms)
 * - Supplier profile and purchase history inspection modal
 * - Add Supplier modal for provisioning new distributor relationships
 */

import { useState, useEffect } from 'react';
import {
  Building2,
  Search,
  Plus,
  RefreshCw,
  Eye,
  X,
  Phone,
  Mail,
  MapPin,
  CreditCard,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';
import { pharmacyService } from '../../../services/pharmacy.service';

export default function SuppliersTab({ onNavigateTab }) {
  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [selectedSup, setSelectedSup] = useState(null);
  const [showAddModal, setShowAddModal] = useState(false);

  // New Supplier Form State
  const [newSup, setNewSup] = useState({
    companyName: '',
    contactPerson: '',
    phone: '',
    email: '',
    address: '',
    taxId: '',
    paymentTerms: 'Net 30',
  });
  const [submitting, setSubmitting] = useState(false);

  const fetchSuppliers = () => {
    setLoading(true);
    setError('');
    pharmacyService.getSuppliers({ search })
      .then((res) => {
        const list = res.data || [];
        setSuppliers(Array.isArray(list) ? list : []);
      })
      .catch((err) => {
        console.error('Failed to load suppliers:', err);
        setError('Failed to fetch supplier directory.');
      })
      .finally(() => {
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchSuppliers();
  }, []);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchSuppliers();
  };

  const handleAddSubmit = (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');

    pharmacyService.addSupplier(newSup)
      .then(() => {
        setShowAddModal(false);
        setNewSup({
          companyName: '',
          contactPerson: '',
          phone: '',
          email: '',
          address: '',
          taxId: '',
          paymentTerms: 'Net 30',
        });
        fetchSuppliers();
      })
      .catch((err) => {
        setError(err.response?.data?.message || err.message || 'Failed to register supplier.');
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
          <div className="pharm-header-badge">VENDOR & DISTRIBUTOR DIRECTORY</div>
          <h1 className="pharm-header-title">Pharmaceutical Suppliers</h1>
          <p className="pharm-header-subtitle">
            Maintain active manufacturer accounts, distributor contact agreements, and credit terms.
          </p>
        </div>
        <div className="pharm-header-actions">
          <button
            type="button"
            className="pharm-btn pharm-btn--secondary"
            onClick={fetchSuppliers}
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
            <span>Add Supplier</span>
          </button>
        </div>
      </div>

      {/* ── Search Bar ── */}
      <div className="pharm-filter-bar">
        <form onSubmit={handleSearchSubmit} style={{ display: 'flex', flex: 1, gap: '0.75rem', flexWrap: 'wrap' }}>
          <div style={{ position: 'relative', flex: 1, minWidth: '260px' }}>
            <Search
              size={18}
              style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }}
            />
            <input
              type="text"
              className="pharm-form-input"
              placeholder="Search vendor by company name, contact rep, or phone..."
              style={{ paddingLeft: '38px' }}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <button type="submit" className="pharm-btn pharm-btn--primary">
            Search
          </button>
        </form>
      </div>

      {/* ── Error Banner ── */}
      {error && (
        <div style={{ padding: '0.85rem 1rem', background: '#fee2e2', borderRadius: '8px', color: '#b91c1c', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <AlertCircle size={16} />
          <span>{error}</span>
        </div>
      )}

      {/* ── Suppliers Table ── */}
      <div className="pharm-card">
        <div className="pharm-card-body" style={{ padding: 0 }}>
          <div className="pharm-table-wrap" style={{ border: 'none' }}>
            <table className="pharm-table">
              <thead>
                <tr>
                  <th>Vendor / Company</th>
                  <th>Primary Contact</th>
                  <th>Phone</th>
                  <th>Email</th>
                  <th>Payment Terms</th>
                  <th>Status</th>
                  <th>Last Order</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={8} style={{ textAlign: 'center', padding: '3.5rem', color: 'var(--text-secondary)' }}>
                      <RefreshCw size={28} className="rec-spin" style={{ margin: '0 auto 0.75rem', color: '#0891b2' }} />
                      <p style={{ margin: 0, fontWeight: 600 }}>Loading supplier network...</p>
                    </td>
                  </tr>
                ) : suppliers.length === 0 ? (
                  <tr>
                    <td colSpan={8} style={{ textAlign: 'center', padding: '3.5rem', color: 'var(--text-secondary)' }}>
                      <Building2 size={40} style={{ color: 'var(--border-color)', margin: '0 auto 0.75rem' }} />
                      <div style={{ fontWeight: 700, fontSize: '1.05rem', color: 'var(--text-primary)' }}>No suppliers registered</div>
                    </td>
                  </tr>
                ) : (
                  suppliers.map((s) => (
                    <tr key={s.id}>
                      <td>
                        <div style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{s.companyName}</div>
                        <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>Tax ID: {s.taxId}</div>
                      </td>
                      <td style={{ fontWeight: 600, color: 'var(--text-secondary)' }}>{s.contactPerson}</td>
                      <td>{s.phone}</td>
                      <td style={{ color: '#0891b2' }}>{s.email}</td>
                      <td>
                        <span className="pharm-badge pharm-badge--info">{s.paymentTerms}</span>
                      </td>
                      <td>
                        <span className="pharm-badge pharm-badge--success">{s.status || 'Active'}</span>
                      </td>
                      <td style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{s.lastOrderDate || 'Recent'}</td>
                      <td style={{ textAlign: 'right' }}>
                        <button
                          type="button"
                          className="pharm-btn pharm-btn--secondary pharm-btn--sm"
                          onClick={() => setSelectedSup(s)}
                          title="View Supplier Profile"
                        >
                          <Eye size={14} />
                          <span>View</span>
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* ── Supplier Profile Modal ── */}
      {selectedSup && (
        <div className="pharm-modal-overlay" onClick={() => setSelectedSup(null)}>
          <div className="pharm-modal" style={{ maxWidth: '600px' }} onClick={(e) => e.stopPropagation()}>
            <div className="pharm-modal-header">
              <div>
                <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#0891b2', textTransform: 'uppercase' }}>Vendor Record</div>
                <h3 className="pharm-modal-title">{selectedSup.companyName}</h3>
              </div>
              <button
                type="button"
                className="pharm-btn pharm-btn--secondary pharm-btn--sm"
                onClick={() => setSelectedSup(null)}
              >
                <X size={16} />
              </button>
            </div>
            <div className="pharm-modal-body">
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1rem', marginBottom: '1.25rem' }}>
                <div style={{ background: 'var(--bg-hover)', padding: '0.85rem', borderRadius: '8px' }}>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>CONTACT PERSON</div>
                  <div style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{selectedSup.contactPerson}</div>
                </div>
                <div style={{ background: 'var(--bg-hover)', padding: '0.85rem', borderRadius: '8px' }}>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>TAX / GST REGISTRATION</div>
                  <div style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{selectedSup.taxId}</div>
                </div>
                <div style={{ background: 'var(--bg-hover)', padding: '0.85rem', borderRadius: '8px' }}>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>DIRECT PHONE</div>
                  <div style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{selectedSup.phone}</div>
                </div>
                <div style={{ background: 'var(--bg-hover)', padding: '0.85rem', borderRadius: '8px' }}>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>DISPATCH EMAIL</div>
                  <div style={{ fontWeight: 700, color: '#0891b2' }}>{selectedSup.email}</div>
                </div>
              </div>

              <div style={{ background: 'var(--bg-hover)', padding: '0.85rem', borderRadius: '8px', marginBottom: '1.25rem' }}>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '0.2rem' }}>WAREHOUSE & BILLING ADDRESS</div>
                <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{selectedSup.address}</div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#ecfdf5', padding: '0.85rem 1rem', borderRadius: '8px' }}>
                <span style={{ fontSize: '0.85rem', color: '#065f46', fontWeight: 600 }}>Agreed Payment Terms:</span>
                <span className="pharm-badge pharm-badge--success" style={{ fontSize: '0.85rem' }}>{selectedSup.paymentTerms}</span>
              </div>
            </div>
            <div className="pharm-modal-footer">
              <button
                type="button"
                className="pharm-btn pharm-btn--secondary"
                onClick={() => setSelectedSup(null)}
              >
                Close
              </button>
              <button
                type="button"
                className="pharm-btn pharm-btn--primary"
                onClick={() => {
                  setSelectedSup(null);
                  onNavigateTab('purchase-orders');
                }}
              >
                <span>Issue Purchase Order</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Add Supplier Modal ── */}
      {showAddModal && (
        <div className="pharm-modal-overlay" onClick={() => setShowAddModal(false)}>
          <div className="pharm-modal" style={{ maxWidth: '600px' }} onClick={(e) => e.stopPropagation()}>
            <form onSubmit={handleAddSubmit}>
              <div className="pharm-modal-header">
                <h3 className="pharm-modal-title">Provision New Supplier</h3>
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
                    <label className="pharm-form-label">Company Name *</label>
                    <input
                      type="text"
                      required
                      className="pharm-form-input"
                      placeholder="e.g. Apex Pharma Distributors"
                      value={newSup.companyName}
                      onChange={(e) => setNewSup({ ...newSup, companyName: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="pharm-form-label">Contact Person</label>
                    <input
                      type="text"
                      className="pharm-form-input"
                      placeholder="e.g. Marcus Vance"
                      value={newSup.contactPerson}
                      onChange={(e) => setNewSup({ ...newSup, contactPerson: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="pharm-form-label">Phone Number *</label>
                    <input
                      type="text"
                      required
                      className="pharm-form-input"
                      placeholder="+1 (555) 234-8891"
                      value={newSup.phone}
                      onChange={(e) => setNewSup({ ...newSup, phone: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="pharm-form-label">Email Address *</label>
                    <input
                      type="email"
                      required
                      className="pharm-form-input"
                      placeholder="orders@apexpharma.com"
                      value={newSup.email}
                      onChange={(e) => setNewSup({ ...newSup, email: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="pharm-form-label">Tax / GST ID</label>
                    <input
                      type="text"
                      className="pharm-form-input"
                      placeholder="US-TAX-889201"
                      value={newSup.taxId}
                      onChange={(e) => setNewSup({ ...newSup, taxId: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="pharm-form-label">Payment Terms</label>
                    <select
                      className="pharm-form-select"
                      value={newSup.paymentTerms}
                      onChange={(e) => setNewSup({ ...newSup, paymentTerms: e.target.value })}
                    >
                      <option value="Net 30">Net 30 Days</option>
                      <option value="Net 45">Net 45 Days</option>
                      <option value="Net 60">Net 60 Days</option>
                      <option value="Immediate / Card">Immediate / Card</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="pharm-form-label">Warehouse Address</label>
                  <textarea
                    rows="2"
                    className="pharm-form-textarea"
                    placeholder="Street address, city, state, postal code..."
                    value={newSup.address}
                    onChange={(e) => setNewSup({ ...newSup, address: e.target.value })}
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
                  <span>{submitting ? 'Adding...' : 'Register Vendor'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
