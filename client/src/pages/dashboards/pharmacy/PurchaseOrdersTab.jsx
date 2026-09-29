/**
 * Purchase Orders & Procurement Tab
 * 
 * Pharmacy procurement and vendor requisition workflow:
 * - Filter orders by Status (Draft, Pending, Ordered, Received, Cancelled) & Supplier
 * - Create Purchase Order modal with automatic subtotal, tax, and grand total calculations
 * - View Purchase Order modal with full line-item breakdowns
 */

import { useState, useEffect } from 'react';
import {
  ClipboardList,
  Search,
  Plus,
  Filter,
  RefreshCw,
  Eye,
  X,
  Truck,
  Building2,
  Calendar,
  AlertCircle,
  CheckCircle2,
} from 'lucide-react';
import { pharmacyService } from '../../../services/pharmacy.service';

export default function PurchaseOrdersTab({ onNavigateTab }) {
  const [orders, setOrders] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [medicines, setMedicines] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedPO, setSelectedPO] = useState(null);
  const [showCreateModal, setShowCreateModal] = useState(false);

  // New PO State
  const [supplierName, setSupplierName] = useState('Apex Pharma Distributors');
  const [expectedDate, setExpectedDate] = useState('');
  const [orderItems, setOrderItems] = useState([
    { medicineName: 'Metformin Hydrochloride 500mg', quantity: 100, unitPrice: 9.00 },
  ]);
  const [discount, setDiscount] = useState('0');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fetchOrders = () => {
    setLoading(true);
    setError('');
    Promise.all([
      pharmacyService.getPurchaseOrders({ status: statusFilter }),
      pharmacyService.getSuppliers(),
      pharmacyService.getMedicines(),
    ])
      .then(([poRes, supRes, medRes]) => {
        setOrders(poRes.data || []);
        setSuppliers(supRes.data || []);
        setMedicines(medRes.data || []);
      })
      .catch((err) => {
        console.error('Failed to load purchase orders:', err);
        setError('Unable to load purchase orders.');
      })
      .finally(() => {
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchOrders();
  }, [statusFilter]);

  const handleAddItemRow = () => {
    setOrderItems([...orderItems, { medicineName: 'Amoxicillin & Clavulanate 625mg', quantity: 50, unitPrice: 11.20 }]);
  };

  const handleRemoveItemRow = (index) => {
    if (orderItems.length > 1) {
      setOrderItems(orderItems.filter((_, i) => i !== index));
    }
  };

  const handleItemChange = (index, field, val) => {
    const updated = [...orderItems];
    updated[index] = { ...updated[index], [field]: val };
    setOrderItems(updated);
  };

  const subtotal = orderItems.reduce((sum, item) => sum + (parseFloat(item.unitPrice) || 0) * (parseInt(item.quantity, 10) || 0), 0);
  const tax = subtotal * 0.05;
  const grandTotal = subtotal + tax - (parseFloat(discount) || 0);

  const handleCreateSubmit = (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');

    const payload = {
      supplierName,
      expectedDate,
      items: orderItems,
      discount: parseFloat(discount) || 0,
      notes,
    };

    pharmacyService.createPurchaseOrder(payload)
      .then(() => {
        setShowCreateModal(false);
        fetchOrders();
      })
      .catch((err) => {
        setError(err.response?.data?.message || err.message || 'Failed to submit PO.');
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
          <div className="pharm-header-badge">PROCUREMENT & SUPPLY CHAIN</div>
          <h1 className="pharm-header-title">Purchase Orders</h1>
          <p className="pharm-header-subtitle">
            Manage requisition orders, vendor delivery terms, and stock replenishment pipelines.
          </p>
        </div>
        <div className="pharm-header-actions">
          <button
            type="button"
            className="pharm-btn pharm-btn--secondary"
            onClick={fetchOrders}
            disabled={loading}
          >
            <RefreshCw size={16} className={loading ? 'rec-spin' : ''} />
            <span>Refresh</span>
          </button>
          <button
            type="button"
            className="pharm-btn pharm-btn--primary"
            onClick={() => setShowCreateModal(true)}
          >
            <Plus size={16} />
            <span>Create Purchase Order</span>
          </button>
        </div>
      </div>

      {/* ── Filter Bar ── */}
      <div className="pharm-filter-bar">
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
          <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Filter by Status:</span>
          {['all', 'Ordered', 'Pending', 'Received'].map((st) => (
            <button
              key={st}
              type="button"
              className={`pharm-btn pharm-btn--sm ${
                statusFilter === st ? 'pharm-btn--primary' : 'pharm-btn--secondary'
              }`}
              onClick={() => setStatusFilter(st)}
            >
              {st === 'all' ? 'All Orders' : st}
            </button>
          ))}
        </div>
      </div>

      {/* ── Error Banner ── */}
      {error && (
        <div style={{ padding: '0.85rem 1rem', background: '#fee2e2', borderRadius: '8px', color: '#b91c1c', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <AlertCircle size={16} />
          <span>{error}</span>
        </div>
      )}

      {/* ── Orders Table ── */}
      <div className="pharm-card">
        <div className="pharm-card-body" style={{ padding: 0 }}>
          <div className="pharm-table-wrap" style={{ border: 'none' }}>
            <table className="pharm-table">
              <thead>
                <tr>
                  <th>PO Number</th>
                  <th>Supplier</th>
                  <th>Order Date</th>
                  <th>Expected Delivery</th>
                  <th>Items Count</th>
                  <th>Grand Total</th>
                  <th>Status</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={8} style={{ textAlign: 'center', padding: '3.5rem', color: 'var(--text-secondary)' }}>
                      <RefreshCw size={28} className="rec-spin" style={{ margin: '0 auto 0.75rem', color: '#0891b2' }} />
                      <p style={{ margin: 0, fontWeight: 600 }}>Loading purchase orders...</p>
                    </td>
                  </tr>
                ) : orders.length === 0 ? (
                  <tr>
                    <td colSpan={8} style={{ textAlign: 'center', padding: '3.5rem', color: 'var(--text-secondary)' }}>
                      <ClipboardList size={40} style={{ color: 'var(--border-color)', margin: '0 auto 0.75rem' }} />
                      <div style={{ fontWeight: 700, fontSize: '1.05rem', color: 'var(--text-primary)' }}>No purchase orders found</div>
                    </td>
                  </tr>
                ) : (
                  orders.map((po) => (
                    <tr key={po.id || po.poNumber}>
                      <td style={{ fontWeight: 700, color: '#0891b2' }}>{po.poNumber}</td>
                      <td>
                        <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{po.supplierName}</div>
                      </td>
                      <td>{po.orderDate}</td>
                      <td>{po.expectedDate}</td>
                      <td>
                        <span className="pharm-badge pharm-badge--info">
                          {po.items ? po.items.length : 1} Products
                        </span>
                      </td>
                      <td style={{ fontWeight: 700, color: '#059669', fontSize: '1rem' }}>
                        ${Number(po.grandTotal).toFixed(2)}
                      </td>
                      <td>
                        <span
                          className={`pharm-badge ${
                            po.status === 'Received'
                              ? 'pharm-badge--success'
                              : po.status === 'Ordered'
                              ? 'pharm-badge--info'
                              : 'pharm-badge--warning'
                          }`}
                        >
                          {po.status}
                        </span>
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <button
                          type="button"
                          className="pharm-btn pharm-btn--secondary pharm-btn--sm"
                          onClick={() => setSelectedPO(po)}
                          title="View PO Breakdown"
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

      {/* ── Create PO Modal ── */}
      {showCreateModal && (
        <div className="pharm-modal-overlay" onClick={() => setShowCreateModal(false)}>
          <div className="pharm-modal" style={{ maxWidth: '680px' }} onClick={(e) => e.stopPropagation()}>
            <form onSubmit={handleCreateSubmit}>
              <div className="pharm-modal-header">
                <h3 className="pharm-modal-title">Create Purchase Order</h3>
                <button
                  type="button"
                  className="pharm-btn pharm-btn--secondary pharm-btn--sm"
                  onClick={() => setShowCreateModal(false)}
                >
                  <X size={16} />
                </button>
              </div>
              <div className="pharm-modal-body">
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                  <div>
                    <label className="pharm-form-label">Select Vendor / Supplier *</label>
                    <select
                      className="pharm-form-select"
                      value={supplierName}
                      onChange={(e) => setSupplierName(e.target.value)}
                    >
                      {suppliers.map((s) => (
                        <option key={s.id} value={s.companyName}>{s.companyName}</option>
                      ))}
                      {suppliers.length === 0 && (
                        <option value="Apex Pharma Distributors">Apex Pharma Distributors</option>
                      )}
                    </select>
                  </div>
                  <div>
                    <label className="pharm-form-label">Expected Delivery Date *</label>
                    <input
                      type="date"
                      required
                      className="pharm-form-input"
                      value={expectedDate}
                      onChange={(e) => setExpectedDate(e.target.value)}
                    />
                  </div>
                </div>

                <div style={{ marginBottom: '1rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                    <label className="pharm-form-label" style={{ margin: 0 }}>Line Items to Order:</label>
                    <button
                      type="button"
                      className="pharm-btn pharm-btn--secondary pharm-btn--sm"
                      onClick={handleAddItemRow}
                    >
                      <Plus size={14} />
                      <span>Add Item</span>
                    </button>
                  </div>

                  {orderItems.map((item, idx) => (
                    <div key={idx} style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem', alignItems: 'center' }}>
                      <input
                        type="text"
                        required
                        className="pharm-form-input"
                        placeholder="Medicine Name / Strength"
                        style={{ flex: 2 }}
                        value={item.medicineName}
                        onChange={(e) => handleItemChange(idx, 'medicineName', e.target.value)}
                      />
                      <input
                        type="number"
                        required
                        min="1"
                        className="pharm-form-input"
                        placeholder="Qty"
                        style={{ width: '80px' }}
                        value={item.quantity}
                        onChange={(e) => handleItemChange(idx, 'quantity', e.target.value)}
                      />
                      <input
                        type="number"
                        step="0.01"
                        required
                        className="pharm-form-input"
                        placeholder="Price"
                        style={{ width: '90px' }}
                        value={item.unitPrice}
                        onChange={(e) => handleItemChange(idx, 'unitPrice', e.target.value)}
                      />
                      <span style={{ width: '80px', fontWeight: 700, textAlign: 'right', fontSize: '0.85rem' }}>
                        ${((parseFloat(item.unitPrice) || 0) * (parseInt(item.quantity, 10) || 0)).toFixed(2)}
                      </span>
                      {orderItems.length > 1 && (
                        <button
                          type="button"
                          className="pharm-btn pharm-btn--danger pharm-btn--sm"
                          onClick={() => handleRemoveItemRow(idx)}
                        >
                          <X size={14} />
                        </button>
                      )}
                    </div>
                  ))}
                </div>

                <div style={{ background: 'var(--bg-hover)', padding: '1rem', borderRadius: '10px', border: '1px solid var(--border-color)', marginBottom: '1rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.35rem', fontSize: '0.85rem' }}>
                    <span>Subtotal:</span>
                    <strong>${subtotal.toFixed(2)}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.35rem', fontSize: '0.85rem' }}>
                    <span>Estimated Tax (5%):</span>
                    <strong>${tax.toFixed(2)}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem', fontSize: '0.85rem' }}>
                    <span>Vendor Discount ($):</span>
                    <input
                      type="number"
                      step="0.01"
                      className="pharm-form-input"
                      style={{ width: '100px', padding: '0.2rem 0.5rem', height: '28px' }}
                      value={discount}
                      onChange={(e) => setDiscount(e.target.value)}
                    />
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '1.1rem', fontWeight: 800, color: '#059669', borderTop: '1px solid var(--border-color)', paddingTop: '0.5rem' }}>
                    <span>Grand Total:</span>
                    <span>${grandTotal.toFixed(2)}</span>
                  </div>
                </div>

                <div>
                  <label className="pharm-form-label">Procurement Notes / Instructions</label>
                  <textarea
                    rows="2"
                    className="pharm-form-textarea"
                    placeholder="Delivery instructions or warehouse dock requirements..."
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                  />
                </div>
              </div>
              <div className="pharm-modal-footer">
                <button
                  type="button"
                  className="pharm-btn pharm-btn--secondary"
                  onClick={() => setShowCreateModal(false)}
                  disabled={submitting}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="pharm-btn pharm-btn--primary"
                  disabled={submitting}
                >
                  {submitting ? <RefreshCw size={16} className="rec-spin" /> : <CheckCircle2 size={16} />}
                  <span>{submitting ? 'Submitting...' : 'Issue Purchase Order'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── View PO Breakdown Modal ── */}
      {selectedPO && (
        <div className="pharm-modal-overlay" onClick={() => setSelectedPO(null)}>
          <div className="pharm-modal" style={{ maxWidth: '640px' }} onClick={(e) => e.stopPropagation()}>
            <div className="pharm-modal-header">
              <div>
                <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#0891b2', textTransform: 'uppercase' }}>Procurement Record</div>
                <h3 className="pharm-modal-title">{selectedPO.poNumber}</h3>
              </div>
              <button
                type="button"
                className="pharm-btn pharm-btn--secondary pharm-btn--sm"
                onClick={() => setSelectedPO(null)}
              >
                <X size={16} />
              </button>
            </div>
            <div className="pharm-modal-body">
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1rem', marginBottom: '1.25rem' }}>
                <div style={{ background: 'var(--bg-hover)', padding: '0.85rem', borderRadius: '8px' }}>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>SUPPLIER</div>
                  <div style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{selectedPO.supplierName}</div>
                </div>
                <div style={{ background: 'var(--bg-hover)', padding: '0.85rem', borderRadius: '8px' }}>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>ORDER DATES</div>
                  <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>Placed: {selectedPO.orderDate} • Due: {selectedPO.expectedDate}</div>
                </div>
              </div>

              <h4 style={{ fontSize: '0.9rem', fontWeight: 700, marginBottom: '0.5rem' }}>Ordered Products</h4>
              <div className="pharm-table-wrap" style={{ marginBottom: '1rem' }}>
                <table className="pharm-table">
                  <thead>
                    <tr>
                      <th>Product</th>
                      <th>Quantity</th>
                      <th>Unit Price</th>
                      <th style={{ textAlign: 'right' }}>Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(selectedPO.items || []).map((item, i) => (
                      <tr key={i}>
                        <td style={{ fontWeight: 600 }}>{item.medicineName}</td>
                        <td>{item.quantity} units</td>
                        <td>${Number(item.unitPrice).toFixed(2)}</td>
                        <td style={{ textAlign: 'right', fontWeight: 700, color: '#059669' }}>
                          ${Number(item.total).toFixed(2)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div style={{ background: 'var(--bg-hover)', padding: '0.85rem', borderRadius: '8px', fontSize: '0.85rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                  <span>Subtotal:</span>
                  <strong>${Number(selectedPO.subtotal).toFixed(2)}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                  <span>Tax:</span>
                  <strong>${Number(selectedPO.tax || 0).toFixed(2)}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '1.05rem', fontWeight: 800, color: '#059669', borderTop: '1px solid var(--border-color)', paddingTop: '0.35rem' }}>
                  <span>Grand Total:</span>
                  <span>${Number(selectedPO.grandTotal).toFixed(2)}</span>
                </div>
              </div>
            </div>
            <div className="pharm-modal-footer">
              <button
                type="button"
                className="pharm-btn pharm-btn--secondary"
                onClick={() => setSelectedPO(null)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
