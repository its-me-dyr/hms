/**
 * Reception Billing Coordination Tab
 * 
 * Front-desk cashier & billing coordination console:
 * - Search bills by Patient Name, ID, or Invoice #
 * - Status filters: All, Unpaid, Partially Paid, Paid
 * - Financial summary KPI metrics (Desk Collections, Outstanding Due, Pending Bills)
 * - Itemized invoice breakdown viewer
 * - Fast front-desk payment collection modal (Cash, Card, UPI)
 * - Printable payment receipt generator
 */

import { useState, useEffect } from 'react';
import {
  CreditCard,
  Search,
  DollarSign,
  CheckCircle2,
  Clock,
  AlertCircle,
  Printer,
  Eye,
  RefreshCw,
  Plus,
  Building,
  User,
  ShieldCheck,
} from 'lucide-react';
import { receptionService } from '../../../services/reception.service';

export default function BillingCoordinationTab({ onSelectPatient }) {
  const [bills, setBills] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [feedback, setFeedback] = useState(null);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  // Modals
  const [selectedBill, setSelectedBill] = useState(null);
  const [paymentModal, setPaymentModal] = useState({
    open: false,
    bill: null,
    amount: '',
    paymentMethod: 'Cash at Desk',
    referenceNumber: '',
  });
  const [receiptModal, setReceiptModal] = useState(null);
  const [collecting, setCollecting] = useState(false);

  const loadBills = async () => {
    setLoading(true);
    setError('');
    try {
      const params = {};
      if (statusFilter) params.status = statusFilter;
      if (searchQuery.trim()) params.search = searchQuery.trim();

      const res = await receptionService.getBills(params);
      const list = res.data?.bills || res.data || [];
      setBills(Array.isArray(list) ? list : []);
    } catch (err) {
      console.error('Failed to load bills:', err);
      setError(err.message || 'Unable to retrieve billing invoices.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBills();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter]);

  // Handle Search submit
  const handleSearch = (e) => {
    e.preventDefault();
    loadBills();
  };

  // Open Payment Modal
  const openCollectModal = (bill) => {
    const due = Math.max(0, (bill.totalAmount || 0) - (bill.paidAmount || 0));
    setPaymentModal({
      open: true,
      bill,
      amount: due,
      paymentMethod: 'Cash at Desk',
      referenceNumber: `REC-${Date.now().toString().slice(-6)}`,
    });
  };

  // Submit Payment
  const handlePaymentSubmit = async (e) => {
    e.preventDefault();
    setCollecting(true);
    try {
      const payload = {
        amount: Number(paymentModal.amount),
        paymentMethod: paymentModal.paymentMethod,
        reference: paymentModal.referenceNumber,
      };
      await receptionService.collectPayment(paymentModal.bill._id, payload);

      setReceiptModal({
        receiptNumber: `RCP-${Date.now().toString().slice(-6)}`,
        date: new Date().toLocaleDateString(),
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        patientName: paymentModal.bill.patient
          ? `${paymentModal.bill.patient.firstName} ${paymentModal.bill.patient.lastName}`
          : 'Valued Patient',
        patientId: paymentModal.bill.patient?.patientId || 'N/A',
        billNumber: paymentModal.bill.billNumber || paymentModal.bill._id,
        amountPaid: Number(paymentModal.amount),
        paymentMethod: paymentModal.paymentMethod,
        remainingDue: Math.max(
          0,
          (paymentModal.bill.totalAmount || 0) -
            ((paymentModal.bill.paidAmount || 0) + Number(paymentModal.amount))
        ),
      });

      setPaymentModal({ open: false, bill: null, amount: '', paymentMethod: 'Cash at Desk', referenceNumber: '' });
      setFeedback({
        type: 'success',
        text: `Payment of ₹${payload.amount} collected successfully! Receipt generated.`,
      });
      loadBills();
    } catch (err) {
      alert(err.message || 'Failed to collect payment.');
    } finally {
      setCollecting(false);
    }
  };

  // Calculate top KPI totals
  const totalCollections = bills.reduce((acc, b) => acc + (b.paidAmount || 0), 0);
  const totalDue = bills.reduce(
    (acc, b) => acc + Math.max(0, (b.totalAmount || 0) - (b.paidAmount || 0)),
    0
  );
  const unpaidCount = bills.filter((b) => b.paymentStatus === 'Unpaid' || b.paymentStatus === 'Partially Paid').length;

  return (
    <div className="rec-container">
      {/* Header */}
      <div className="rec-header">
        <div className="rec-header-left">
          <div className="rec-header-badge">CASHIER & BILLING</div>
          <h1 className="rec-header-title">Billing Coordination</h1>
          <p className="rec-header-subtitle">
            Look up patient invoices, itemized consultation and ward bills, and collect front-desk payments.
          </p>
        </div>
        <div className="rec-header-actions">
          <button
            type="button"
            className="rec-btn rec-btn--secondary"
            onClick={loadBills}
            disabled={loading}
          >
            <RefreshCw size={16} className={loading ? 'rec-spin' : ''} />
            <span>Refresh Bills</span>
          </button>
        </div>
      </div>

      {/* Feedback Banner */}
      {feedback && (
        <div
          className={`rec-alert ${
            feedback.type === 'error' ? 'rec-alert--error' : 'rec-alert--success'
          }`}
          style={{ marginBottom: '1.5rem' }}
        >
          {feedback.type === 'error' ? <AlertCircle size={18} /> : <CheckCircle2 size={18} />}
          <span style={{ flex: 1 }}>{feedback.text}</span>
          <button
            type="button"
            onClick={() => setFeedback(null)}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'inherit' }}
          >
            ×
          </button>
        </div>
      )}

      {/* Summary KPI Cards */}
      <div className="rec-kpi-grid" style={{ marginBottom: '1.5rem' }}>
        <div className="rec-kpi-card" style={{ borderLeft: '4px solid #16a34a' }}>
          <div className="rec-kpi-title">Collected Revenue (Desk)</div>
          <div className="rec-kpi-value" style={{ color: '#16a34a' }}>₹ {totalCollections.toLocaleString()}</div>
          <div className="rec-kpi-subtext">Total received across records</div>
        </div>
        <div className="rec-kpi-card" style={{ borderLeft: '4px solid #ef4444' }}>
          <div className="rec-kpi-title">Pending Receivables</div>
          <div className="rec-kpi-value" style={{ color: '#dc2626' }}>₹ {totalDue.toLocaleString()}</div>
          <div className="rec-kpi-subtext">Outstanding balances due</div>
        </div>
        <div className="rec-kpi-card" style={{ borderLeft: '4px solid #f59e0b' }}>
          <div className="rec-kpi-title">Invoices Awaiting Payment</div>
          <div className="rec-kpi-value" style={{ color: '#d97706' }}>{unpaidCount}</div>
          <div className="rec-kpi-subtext">Requires front-desk collection</div>
        </div>
      </div>

      {/* Search & Filters */}
      <div className="rec-card" style={{ marginBottom: '1.5rem', padding: '1rem 1.25rem' }}>
        <form onSubmit={handleSearch} style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', alignItems: 'center' }}>
          <div style={{ flex: '1 1 280px', position: 'relative' }}>
            <Search
              size={18}
              style={{
                position: 'absolute',
                left: '12px',
                top: '50%',
                transform: 'translateY(-50%)',
                color: '#94a3b8',
              }}
            />
            <input
              type="text"
              placeholder="Search by patient name, ID, or Invoice #..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="rec-form-input"
              style={{ paddingLeft: '38px', width: '100%' }}
            />
          </div>

          <div style={{ minWidth: '180px' }}>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="rec-form-select"
            >
              <option value="">All Payment Statuses</option>
              <option value="Unpaid">Unpaid Only</option>
              <option value="Partially Paid">Partially Paid</option>
              <option value="Paid">Fully Paid</option>
            </select>
          </div>

          <button type="submit" className="rec-btn rec-btn--primary">
            <Search size={16} />
            <span>Search Invoices</span>
          </button>
        </form>
      </div>

      {/* Invoices Table Card */}
      <div className="rec-card">
        <div className="rec-card-header">
          <div>
            <h2 className="rec-card-title">Patient Invoices Registry</h2>
            <p className="rec-card-subtitle">Showing {bills.length} invoices matching filters</p>
          </div>
        </div>

        {loading ? (
          <div style={{ padding: '3.5rem', textAlign: 'center', color: '#64748b' }}>
            <RefreshCw size={32} className="rec-spin" style={{ margin: '0 auto 1rem', color: '#0891b2' }} />
            <p>Loading invoice records...</p>
          </div>
        ) : error ? (
          <div style={{ padding: '2rem' }}>
            <div className="rec-alert rec-alert--error">
              <AlertCircle size={18} />
              <span>{error}</span>
            </div>
          </div>
        ) : bills.length === 0 ? (
          <div className="rec-empty-state">
            <CreditCard size={48} className="rec-empty-state-icon" />
            <div className="rec-empty-state-title">No invoices found</div>
            <div className="rec-empty-state-desc">
              No bills match your query. Patient consultations and admissions generate bills automatically.
            </div>
          </div>
        ) : (
          <div className="rec-table-wrapper">
            <table className="rec-table">
              <thead>
                <tr>
                  <th>Invoice #</th>
                  <th>Patient Details</th>
                  <th>Date</th>
                  <th>Total (₹)</th>
                  <th>Paid (₹)</th>
                  <th>Balance Due (₹)</th>
                  <th>Status</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {bills.map((b) => {
                  const pName = b.patient
                    ? `${b.patient.firstName || ''} ${b.patient.lastName || ''}`.trim()
                    : 'Unknown Patient';
                  const total = b.totalAmount || 0;
                  const paid = b.paidAmount || 0;
                  const due = Math.max(0, total - paid);
                  const isPaid = due === 0 || b.paymentStatus === 'Paid';

                  return (
                    <tr key={b._id}>
                      <td>
                        <div style={{ fontWeight: 700, color: '#0f172a' }}>
                          {b.billNumber || b._id?.slice(-8).toUpperCase()}
                        </div>
                        <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
                          Type: {b.billType || 'Consultation'}
                        </div>
                      </td>
                      <td>
                        <div
                          style={{ fontWeight: 600, color: '#0f172a', cursor: 'pointer' }}
                          onClick={() => b.patient && onSelectPatient && onSelectPatient(b.patient)}
                        >
                          {pName}
                        </div>
                        <div style={{ fontSize: '0.78rem', color: '#64748b' }}>
                          ID: {b.patient?.patientId || 'Pending'} • {b.patient?.phone || 'N/A'}
                        </div>
                      </td>
                      <td>
                        <div style={{ fontSize: '0.85rem', color: '#334155' }}>
                          {b.createdAt ? new Date(b.createdAt).toLocaleDateString() : 'Today'}
                        </div>
                      </td>
                      <td style={{ fontWeight: 700, color: '#0f172a' }}>
                        ₹ {total.toLocaleString()}
                      </td>
                      <td style={{ color: '#16a34a', fontWeight: 600 }}>
                        ₹ {paid.toLocaleString()}
                      </td>
                      <td style={{ color: due > 0 ? '#dc2626' : '#64748b', fontWeight: 700 }}>
                        ₹ {due.toLocaleString()}
                      </td>
                      <td>
                        <span
                          className={`rec-badge ${
                            isPaid
                              ? 'rec-badge--completed'
                              : paid > 0
                              ? 'rec-badge--waiting'
                              : 'rec-badge--danger'
                          }`}
                        >
                          {isPaid ? 'Paid' : paid > 0 ? 'Partially Paid' : 'Unpaid'}
                        </span>
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}>
                          <button
                            type="button"
                            className="rec-btn rec-btn--secondary rec-btn--sm"
                            onClick={() => setSelectedBill(b)}
                            title="View Itemized Breakdown"
                          >
                            <Eye size={14} />
                            <span>Details</span>
                          </button>

                          {!isPaid && (
                            <button
                              type="button"
                              className="rec-btn rec-btn--primary rec-btn--sm"
                              onClick={() => openCollectModal(b)}
                            >
                              <CreditCard size={14} />
                              <span>Collect</span>
                            </button>
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

      {/* Bill Details Modal */}
      {selectedBill && (
        <div className="rec-modal-overlay" onClick={() => setSelectedBill(null)}>
          <div className="rec-modal-card" style={{ maxWidth: '620px' }} onClick={(e) => e.stopPropagation()}>
            <div className="rec-modal-header">
              <div>
                <h3 className="rec-modal-title">Itemized Invoice Breakdown</h3>
                <div style={{ fontSize: '0.8rem', color: '#64748b' }}>
                  Invoice: {selectedBill.billNumber || selectedBill._id}
                </div>
              </div>
              <button
                type="button"
                className="rec-modal-close"
                onClick={() => setSelectedBill(null)}
              >
                ×
              </button>
            </div>
            <div className="rec-modal-body">
              {/* Patient info */}
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.85rem', backgroundColor: '#f8fafc', borderRadius: '8px', marginBottom: '1rem' }}>
                <div>
                  <div style={{ fontWeight: 700, color: '#0f172a' }}>
                    {selectedBill.patient?.firstName} {selectedBill.patient?.lastName}
                  </div>
                  <div style={{ fontSize: '0.8rem', color: '#64748b' }}>
                    ID: {selectedBill.patient?.patientId} • Phone: {selectedBill.patient?.phone}
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '0.8rem', color: '#64748b' }}>Date Issued</div>
                  <div style={{ fontWeight: 600, color: '#0f172a' }}>
                    {selectedBill.createdAt ? new Date(selectedBill.createdAt).toLocaleDateString() : 'Today'}
                  </div>
                </div>
              </div>

              {/* Items Table */}
              <div style={{ border: '1px solid var(--border-color)', borderRadius: '8px', overflow: 'hidden', marginBottom: '1rem' }}>
                <table className="rec-table" style={{ margin: 0 }}>
                  <thead>
                    <tr>
                      <th>Service / Item</th>
                      <th style={{ textAlign: 'center' }}>Qty</th>
                      <th style={{ textAlign: 'right' }}>Amount (₹)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(selectedBill.items && selectedBill.items.length > 0
                      ? selectedBill.items
                      : [
                          { name: 'Doctor Consultation Fee', qty: 1, amount: selectedBill.totalAmount || 500 },
                        ]
                    ).map((item, i) => (
                      <tr key={i}>
                        <td style={{ fontWeight: 500 }}>{item.name || item.description || 'Clinical Service'}</td>
                        <td style={{ textAlign: 'center' }}>{item.quantity || item.qty || 1}</td>
                        <td style={{ textAlign: 'right', fontWeight: 600 }}>₹ {item.amount || item.total || 500}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Totals */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.9rem', borderTop: '2px solid #e2e8f0', paddingTop: '0.75rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#64748b' }}>Gross Total:</span>
                  <strong>₹ {selectedBill.totalAmount || 0}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#64748b' }}>Paid to Date:</span>
                  <strong style={{ color: '#16a34a' }}>₹ {selectedBill.paidAmount || 0}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '1.1rem', fontWeight: 800 }}>
                  <span style={{ color: '#0f172a' }}>Balance Due:</span>
                  <span style={{ color: '#dc2626' }}>
                    ₹ {Math.max(0, (selectedBill.totalAmount || 0) - (selectedBill.paidAmount || 0))}
                  </span>
                </div>
              </div>
            </div>
            <div className="rec-modal-footer">
              <button
                type="button"
                className="rec-btn rec-btn--secondary"
                onClick={() => setSelectedBill(null)}
              >
                Close
              </button>
              {Math.max(0, (selectedBill.totalAmount || 0) - (selectedBill.paidAmount || 0)) > 0 && (
                <button
                  type="button"
                  className="rec-btn rec-btn--primary"
                  onClick={() => {
                    const b = selectedBill;
                    setSelectedBill(null);
                    openCollectModal(b);
                  }}
                >
                  <CreditCard size={16} />
                  <span>Collect Payment</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Collect Payment Modal */}
      {paymentModal.open && (
        <div className="rec-modal-overlay" onClick={() => setPaymentModal({ ...paymentModal, open: false })}>
          <div className="rec-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="rec-modal-header">
              <h3 className="rec-modal-title">Collect Payment at Desk</h3>
              <button
                type="button"
                className="rec-modal-close"
                onClick={() => setPaymentModal({ ...paymentModal, open: false })}
              >
                ×
              </button>
            </div>
            <form onSubmit={handlePaymentSubmit}>
              <div className="rec-modal-body">
                <p style={{ fontSize: '0.9rem', color: '#64748b', marginBottom: '1.25rem' }}>
                  Receiving payment for{' '}
                  <strong style={{ color: '#0f172a' }}>
                    {paymentModal.bill?.patient?.firstName} {paymentModal.bill?.patient?.lastName}
                  </strong>{' '}
                  (Invoice: {paymentModal.bill?.billNumber || paymentModal.bill?._id})
                </p>

                <div className="rec-form-group">
                  <label className="rec-form-label">Payment Amount (₹) *</label>
                  <input
                    type="number"
                    required
                    min={1}
                    value={paymentModal.amount}
                    onChange={(e) => setPaymentModal({ ...paymentModal, amount: e.target.value })}
                    className="rec-form-input"
                  />
                </div>

                <div className="rec-form-group">
                  <label className="rec-form-label">Payment Method *</label>
                  <select
                    value={paymentModal.paymentMethod}
                    onChange={(e) => setPaymentModal({ ...paymentModal, paymentMethod: e.target.value })}
                    className="rec-form-select"
                  >
                    <option value="Cash at Desk">Cash at Desk</option>
                    <option value="Credit / Debit Card">Credit / Debit Card</option>
                    <option value="UPI / QR Code">UPI / QR Code</option>
                    <option value="Direct Bank Transfer">Direct Bank Transfer</option>
                  </select>
                </div>

                <div className="rec-form-group">
                  <label className="rec-form-label">Receipt / Transaction Ref Number</label>
                  <input
                    type="text"
                    value={paymentModal.referenceNumber}
                    onChange={(e) => setPaymentModal({ ...paymentModal, referenceNumber: e.target.value })}
                    className="rec-form-input"
                  />
                </div>
              </div>
              <div className="rec-modal-footer">
                <button
                  type="button"
                  className="rec-btn rec-btn--secondary"
                  onClick={() => setPaymentModal({ ...paymentModal, open: false })}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rec-btn rec-btn--primary"
                  disabled={collecting}
                >
                  Confirm & Print Receipt
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Generated Receipt Slip Modal */}
      {receiptModal && (
        <div className="rec-modal-overlay" onClick={() => setReceiptModal(null)}>
          <div className="rec-modal-card" style={{ maxWidth: '480px', padding: 0 }} onClick={(e) => e.stopPropagation()}>
            <div className="rec-print-area" style={{ padding: '2rem', backgroundColor: 'var(--bg-card)', borderRadius: '12px' }}>
              <div style={{ textAlign: 'center', borderBottom: '2px solid #0891b2', paddingBottom: '0.75rem', marginBottom: '1rem' }}>
                <div style={{ fontWeight: 800, fontSize: '1.2rem', color: '#0f172a' }}>HEALTHCARE MEDICAL SYSTEM</div>
                <div style={{ fontSize: '0.8rem', color: '#64748b' }}>OFFICIAL FRONT-DESK PAYMENT RECEIPT</div>
                <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Receipt: {receiptModal.receiptNumber}</div>
              </div>

              <div style={{ fontSize: '0.85rem', display: 'flex', flexDirection: 'column', gap: '0.45rem', marginBottom: '1rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#64748b' }}>Date & Time:</span>
                  <span>{receiptModal.date} {receiptModal.time}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#64748b' }}>Patient Name:</span>
                  <strong>{receiptModal.patientName}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#64748b' }}>Patient ID:</span>
                  <span>{receiptModal.patientId}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#64748b' }}>Payment Mode:</span>
                  <span>{receiptModal.paymentMethod}</span>
                </div>
                <hr style={{ border: 'none', borderTop: '1px dashed #e2e8f0', margin: '0.25rem 0' }} />
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '1.15rem', fontWeight: 800 }}>
                  <span style={{ color: '#0f172a' }}>Amount Paid:</span>
                  <span style={{ color: '#16a34a' }}>₹ {receiptModal.amountPaid.toLocaleString()}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                  <span style={{ color: '#64748b' }}>Remaining Balance Due:</span>
                  <span style={{ color: receiptModal.remainingDue > 0 ? '#dc2626' : '#16a34a', fontWeight: 600 }}>
                    ₹ {receiptModal.remainingDue.toLocaleString()}
                  </span>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1.5rem' }}>
                <button
                  type="button"
                  className="rec-btn rec-btn--secondary"
                  style={{ flex: 1 }}
                  onClick={() => setReceiptModal(null)}
                >
                  Close
                </button>
                <button
                  type="button"
                  className="rec-btn rec-btn--primary"
                  style={{ flex: 1 }}
                  onClick={() => window.print()}
                >
                  <Printer size={16} />
                  <span>Print Receipt</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
