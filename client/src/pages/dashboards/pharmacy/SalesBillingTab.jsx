/**
 * Sales & Pharmacy Billing Tab
 * 
 * Retail counter & inpatient pharmacy invoicing:
 * - Search by Bill Number (INV-PHARM-...), Patient Name, Prescription
 * - Payment Status Filters (Paid, Partially Paid, Unpaid, Refunded)
 * - View Invoice Breakdown modal with line items
 * - Collect Payment modal with payment history tracking and receipt printing
 */

import { useState, useEffect } from 'react';
import {
  CreditCard,
  Search,
  RefreshCw,
  Eye,
  DollarSign,
  Printer,
  X,
  CheckCircle2,
  AlertCircle,
  FileText,
} from 'lucide-react';
import { pharmacyService } from '../../../services/pharmacy.service';

export default function SalesBillingTab({ onNavigateTab }) {
  const [bills, setBills] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  // Payment & Invoice Modals
  const [selectedBill, setSelectedBill] = useState(null);
  const [payModalBill, setPayModalBill] = useState(null);
  const [payAmount, setPayAmount] = useState('');
  const [payMethod, setPayMethod] = useState('Cash');
  const [processingPay, setProcessingPay] = useState(false);

  const fetchBills = () => {
    setLoading(true);
    setError('');
    pharmacyService.getBills({ search, status: statusFilter })
      .then((res) => {
        const list = res.data || [];
        setBills(Array.isArray(list) ? list : []);
      })
      .catch((err) => {
        console.error('Failed to load pharmacy bills:', err);
        setError('Failed to fetch pharmacy sales invoices.');
      })
      .finally(() => {
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchBills();
  }, [statusFilter]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchBills();
  };

  const handleOpenPay = (bill) => {
    setPayModalBill(bill);
    setPayAmount(bill.outstanding > 0 ? String(bill.outstanding) : String(bill.total));
    setPayMethod('Cash');
    setError('');
  };

  const handlePaySubmit = (e) => {
    e.preventDefault();
    setProcessingPay(true);
    setError('');

    pharmacyService.collectPayment(payModalBill.id, {
      amount: parseFloat(payAmount),
      paymentMethod: payMethod,
    })
      .then(() => {
        setPayModalBill(null);
        fetchBills();
      })
      .catch((err) => {
        setError(err.response?.data?.message || err.message || 'Payment collection failed.');
      })
      .finally(() => {
        setProcessingPay(false);
      });
  };

  return (
    <div className="pharm-container">
      {/* ── Page Header ── */}
      <div className="pharm-header">
        <div className="pharm-header-left">
          <div className="pharm-header-badge">POINT OF SALE & INVOICING</div>
          <h1 className="pharm-header-title">Pharmacy Sales & Billing</h1>
          <p className="pharm-header-subtitle">
            Dispensed pharmaceutical invoices, cashier payment reconciliation, and patient billing records.
          </p>
        </div>
        <div className="pharm-header-actions">
          <button
            type="button"
            className="pharm-btn pharm-btn--secondary"
            onClick={fetchBills}
            disabled={loading}
          >
            <RefreshCw size={16} className={loading ? 'rec-spin' : ''} />
            <span>Refresh Bills</span>
          </button>
          <button
            type="button"
            className="pharm-btn pharm-btn--primary"
            onClick={() => onNavigateTab('dispensing')}
          >
            <CreditCard size={16} />
            <span>Dispense & Bill</span>
          </button>
        </div>
      </div>

      {/* ── Search & Filter Bar ── */}
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
              placeholder="Search invoice number (INV-PHARM-...) or patient name..."
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
          {['all', 'Paid', 'Unpaid', 'Partially Paid'].map((st) => (
            <button
              key={st}
              type="button"
              className={`pharm-btn pharm-btn--sm ${
                statusFilter === st ? 'pharm-btn--primary' : 'pharm-btn--secondary'
              }`}
              onClick={() => setStatusFilter(st)}
            >
              {st === 'all' ? 'All Invoices' : st}
            </button>
          ))}
        </div>
      </div>

      {/* ── Error Alert ── */}
      {error && (
        <div style={{ padding: '0.85rem 1rem', background: '#fee2e2', borderRadius: '8px', color: '#b91c1c', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <AlertCircle size={16} />
          <span>{error}</span>
        </div>
      )}

      {/* ── Bills Table ── */}
      <div className="pharm-card">
        <div className="pharm-card-body" style={{ padding: 0 }}>
          <div className="pharm-table-wrap" style={{ border: 'none' }}>
            <table className="pharm-table">
              <thead>
                <tr>
                  <th>Invoice Number</th>
                  <th>Patient</th>
                  <th>Date</th>
                  <th>Items</th>
                  <th>Subtotal</th>
                  <th>Net Total</th>
                  <th>Paid</th>
                  <th>Outstanding</th>
                  <th>Payment Status</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={10} style={{ textAlign: 'center', padding: '3.5rem', color: 'var(--text-secondary)' }}>
                      <RefreshCw size={28} className="rec-spin" style={{ margin: '0 auto 0.75rem', color: '#0891b2' }} />
                      <p style={{ margin: 0, fontWeight: 600 }}>Loading sales & billing ledger...</p>
                    </td>
                  </tr>
                ) : bills.length === 0 ? (
                  <tr>
                    <td colSpan={10} style={{ textAlign: 'center', padding: '3.5rem', color: 'var(--text-secondary)' }}>
                      <CreditCard size={40} style={{ color: 'var(--border-color)', margin: '0 auto 0.75rem' }} />
                      <div style={{ fontWeight: 700, fontSize: '1.05rem', color: 'var(--text-primary)' }}>No billing invoices found</div>
                    </td>
                  </tr>
                ) : (
                  bills.map((b) => (
                    <tr key={b.id || b.billNumber}>
                      <td style={{ fontWeight: 700, color: '#0891b2' }}>{b.billNumber}</td>
                      <td>
                        <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{b.patient}</div>
                      </td>
                      <td>{b.date}</td>
                      <td>
                        <span className="pharm-badge pharm-badge--info">
                          {b.itemsCount || (b.items ? b.items.length : 1)} Items
                        </span>
                      </td>
                      <td>${Number(b.subtotal).toFixed(2)}</td>
                      <td>
                        <strong style={{ fontSize: '1rem', color: 'var(--text-primary)' }}>
                          ${Number(b.total).toFixed(2)}
                        </strong>
                      </td>
                      <td style={{ color: '#059669', fontWeight: 600 }}>${Number(b.paid || 0).toFixed(2)}</td>
                      <td style={{ color: b.outstanding > 0 ? '#dc2626' : 'var(--text-secondary)', fontWeight: b.outstanding > 0 ? 700 : 400 }}>
                        ${Number(b.outstanding || 0).toFixed(2)}
                      </td>
                      <td>
                        <span
                          className={`pharm-badge ${
                            b.paymentStatus === 'Paid'
                              ? 'pharm-badge--success'
                              : b.paymentStatus === 'Partially Paid'
                              ? 'pharm-badge--warning'
                              : 'pharm-badge--danger'
                          }`}
                        >
                          {b.paymentStatus}
                        </span>
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <div style={{ display: 'inline-flex', gap: '0.4rem' }}>
                          <button
                            type="button"
                            className="pharm-btn pharm-btn--secondary pharm-btn--sm"
                            onClick={() => setSelectedBill(b)}
                            title="View Invoice"
                          >
                            <Eye size={14} />
                            <span>View</span>
                          </button>
                          {b.paymentStatus !== 'Paid' && (
                            <button
                              type="button"
                              className="pharm-btn pharm-btn--primary pharm-btn--sm"
                              onClick={() => handleOpenPay(b)}
                              title="Collect Payment"
                            >
                              <DollarSign size={14} />
                              <span>Collect</span>
                            </button>
                          )}
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

      {/* ── Invoice Details Modal ── */}
      {selectedBill && (
        <div className="pharm-modal-overlay" onClick={() => setSelectedBill(null)}>
          <div className="pharm-modal" style={{ maxWidth: '640px' }} onClick={(e) => e.stopPropagation()}>
            <div className="pharm-modal-header">
              <div>
                <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#0891b2', textTransform: 'uppercase' }}>Sales Invoice</div>
                <h3 className="pharm-modal-title">{selectedBill.billNumber}</h3>
              </div>
              <button
                type="button"
                className="pharm-btn pharm-btn--secondary pharm-btn--sm"
                onClick={() => setSelectedBill(null)}
              >
                <X size={16} />
              </button>
            </div>
            <div className="pharm-modal-body">
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1rem', marginBottom: '1.25rem' }}>
                <div style={{ background: 'var(--bg-hover)', padding: '0.85rem', borderRadius: '8px' }}>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>PATIENT</div>
                  <div style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{selectedBill.patient}</div>
                </div>
                <div style={{ background: 'var(--bg-hover)', padding: '0.85rem', borderRadius: '8px' }}>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>BILL DATE</div>
                  <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{selectedBill.date}</div>
                </div>
              </div>

              <h4 style={{ fontSize: '0.9rem', fontWeight: 700, marginBottom: '0.5rem' }}>Invoice Line Items</h4>
              <div className="pharm-table-wrap" style={{ marginBottom: '1.25rem' }}>
                <table className="pharm-table">
                  <thead>
                    <tr>
                      <th>Description</th>
                      <th>Quantity</th>
                      <th>Unit Price</th>
                      <th style={{ textAlign: 'right' }}>Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(selectedBill.items || []).map((item, i) => (
                      <tr key={i}>
                        <td style={{ fontWeight: 600 }}>{item.medicineName || item.description || 'Medication'}</td>
                        <td>{item.qty || item.quantity || 1}</td>
                        <td>${Number(item.unitPrice || 10).toFixed(2)}</td>
                        <td style={{ textAlign: 'right', fontWeight: 700 }}>
                          ${Number(item.total || item.totalPrice || item.unitPrice || 10).toFixed(2)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div style={{ background: 'var(--bg-hover)', padding: '1rem', borderRadius: '10px', border: '1px solid var(--border-color)', fontSize: '0.875rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.35rem' }}>
                  <span>Subtotal:</span>
                  <strong>${Number(selectedBill.subtotal).toFixed(2)}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.35rem' }}>
                  <span>Paid to Date:</span>
                  <strong style={{ color: '#059669' }}>${Number(selectedBill.paid || 0).toFixed(2)}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '1.1rem', fontWeight: 800, color: 'var(--text-primary)', borderTop: '1px solid var(--border-color)', paddingTop: '0.5rem' }}>
                  <span>Net Outstanding Balance:</span>
                  <span style={{ color: selectedBill.outstanding > 0 ? '#dc2626' : '#059669' }}>
                    ${Number(selectedBill.outstanding || 0).toFixed(2)}
                  </span>
                </div>
              </div>
            </div>
            <div className="pharm-modal-footer">
              <button
                type="button"
                className="pharm-btn pharm-btn--secondary"
                onClick={() => window.print()}
              >
                <Printer size={16} />
                <span>Print Invoice</span>
              </button>
              <button
                type="button"
                className="pharm-btn pharm-btn--primary"
                onClick={() => setSelectedBill(null)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Collect Payment Modal ── */}
      {payModalBill && (
        <div className="pharm-modal-overlay" onClick={() => setPayModalBill(null)}>
          <div className="pharm-modal" style={{ maxWidth: '500px' }} onClick={(e) => e.stopPropagation()}>
            <form onSubmit={handlePaySubmit}>
              <div className="pharm-modal-header">
                <h3 className="pharm-modal-title">Collect Counter Payment</h3>
                <button
                  type="button"
                  className="pharm-btn pharm-btn--secondary pharm-btn--sm"
                  onClick={() => setPayModalBill(null)}
                >
                  <X size={16} />
                </button>
              </div>
              <div className="pharm-modal-body">
                <div style={{ background: 'var(--bg-hover)', padding: '0.85rem', borderRadius: '8px', marginBottom: '1rem' }}>
                  <div><strong>Invoice:</strong> {payModalBill.billNumber}</div>
                  <div><strong>Patient:</strong> {payModalBill.patient}</div>
                  <div><strong>Outstanding Due:</strong> ${Number(payModalBill.outstanding || payModalBill.total).toFixed(2)}</div>
                </div>

                <div style={{ marginBottom: '1rem' }}>
                  <label className="pharm-form-label">Payment Amount ($) *</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    min="0.01"
                    className="pharm-form-input"
                    value={payAmount}
                    onChange={(e) => setPayAmount(e.target.value)}
                  />
                </div>

                <div>
                  <label className="pharm-form-label">Payment Method *</label>
                  <select
                    className="pharm-form-select"
                    value={payMethod}
                    onChange={(e) => setPayMethod(e.target.value)}
                  >
                    <option value="Cash">Cash at Counter</option>
                    <option value="Credit / Debit Card">Credit / Debit Card (POS)</option>
                    <option value="UPI / QR Code">UPI / Digital QR Code</option>
                    <option value="Hospital Health Insurance">Hospital Health Insurance</option>
                  </select>
                </div>
              </div>
              <div className="pharm-modal-footer">
                <button
                  type="button"
                  className="pharm-btn pharm-btn--secondary"
                  onClick={() => setPayModalBill(null)}
                  disabled={processingPay}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="pharm-btn pharm-btn--primary"
                  disabled={processingPay}
                >
                  {processingPay ? <RefreshCw size={16} className="rec-spin" /> : <CheckCircle2 size={16} />}
                  <span>{processingPay ? 'Processing...' : 'Authorize Receipt'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
