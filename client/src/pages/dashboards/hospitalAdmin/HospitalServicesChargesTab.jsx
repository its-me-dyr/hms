/**
 * Hospital Admin Portal — Services & Charges
 * 
 * Clean, production-ready, backend-integrated hospital service and charge catalogue management.
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  CreditCard,
  Search,
  Plus,
  Edit2,
  Trash2,
  CheckCircle2,
  AlertCircle,
  X,
  ShieldAlert,
  Loader2,
} from 'lucide-react';
import { hospitalAdminService } from '../../../services/hospitalAdmin.service';

const SUPPORTED_CATEGORIES = [
  'Consultation',
  'Diagnostic',
  'Laboratory',
  'Radiology',
  'Surgery',
  'Emergency',
  'General',
];

export default function HospitalServicesChargesTab({
  onServiceChange,
  currencySymbol = '$',
  _currencyCode = 'USD',
}) {
  // ─── 1. State ───
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // ─── 2. Search & Filter State ───
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');

  // ─── 3. Modal & Form State ───
  const [modalOpen, setModalOpen] = useState(false);
  const [editingService, setEditingService] = useState(null);
  const [saving, setSaving] = useState(false);
  const [formErrors, setFormErrors] = useState({});

  const [formData, setFormData] = useState({
    name: '',
    code: '',
    category: 'Consultation',
    charge: 50,
    description: '',
  });

  // ─── 4. Delete Confirmation State ───
  const [deleteConfirmService, setDeleteConfirmService] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // ─── 5. Dynamic Currency Detection ───
  const [activeCurrencySymbol, setActiveCurrencySymbol] = useState(currencySymbol || '$');

  useEffect(() => {
    if (currencySymbol && currencySymbol !== '$') {
      setActiveCurrencySymbol(currencySymbol);
      return;
    }
    let isMounted = true;
    hospitalAdminService
      .getHospitalSettings()
      .then((res) => {
        if (isMounted && res.data?.data?.currencySymbol) {
          setActiveCurrencySymbol(res.data.data.currencySymbol);
        }
      })
      .catch(() => {});
    return () => {
      isMounted = false;
    };
  }, [currencySymbol]);

  // ─── Feedback Helpers ───
  const showSuccess = (msg) => {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(''), 4500);
  };

  // ─── Format Charge Helper ───
  const formatCharge = (amount) => {
    const sym = activeCurrencySymbol || currencySymbol || '$';
    const num = Number(amount || 0);
    return `${sym}${num.toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  };

  // ─── Fetch Services ───
  const fetchServices = useCallback(async (isSilent = false) => {
    if (!isSilent) setLoading(true);
    setErrorMsg('');

    try {
      const params = {};
      if (searchTerm.trim()) params.search = searchTerm.trim();
      if (categoryFilter !== 'all') params.category = categoryFilter;

      const res = await hospitalAdminService.getServicesAndCharges(params);
      const data = res?.data?.data || res?.data || [];
      const list = Array.isArray(data) ? data : (data.services || []);
      setServices(list);
    } catch (err) {
      console.error('Failed to load services & charges:', err);
      setErrorMsg(
        err.response?.data?.message || 'Unable to load services and charges. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  }, [searchTerm, categoryFilter]);

  // Initial Fetch
  useEffect(() => {
    fetchServices();
  }, [fetchServices]);

  // ─── Responsive Client Search Filter ───
  const filteredServices = useMemo(() => {
    return services.filter((svc) => {
      const term = searchTerm.toLowerCase().trim();
      const matchesSearch =
        !term ||
        svc.name?.toLowerCase().includes(term) ||
        svc.code?.toLowerCase().includes(term);

      const matchesCategory =
        categoryFilter === 'all' ||
        svc.category?.toLowerCase() === categoryFilter.toLowerCase();

      return matchesSearch && matchesCategory;
    });
  }, [services, searchTerm, categoryFilter]);

  // ─── Modal Open Handlers ───
  const handleOpenAdd = () => {
    setEditingService(null);
    setFormData({
      name: '',
      code: '',
      category: 'Consultation',
      charge: 50,
      description: '',
    });
    setFormErrors({});
    setModalOpen(true);
  };

  const handleOpenEdit = (svc) => {
    setEditingService(svc);
    setFormData({
      name: svc.name || '',
      code: svc.code || '',
      category: svc.category || 'General',
      charge: svc.charge !== undefined ? svc.charge : 0,
      description: svc.description || '',
    });
    setFormErrors({});
    setModalOpen(true);
  };

  // ─── Form Submission (Add / Edit) ───
  const handleSubmitForm = async (e) => {
    e.preventDefault();
    const errors = {};

    if (!formData.name.trim()) {
      errors.name = 'Service Name is required.';
    }
    if (!formData.code.trim()) {
      errors.code = 'Service Code is required.';
    }
    if (!formData.category) {
      errors.category = 'Please select a valid category.';
    }
    const numCharge = Number(formData.charge);
    if (isNaN(numCharge) || numCharge < 0) {
      errors.charge = 'Charge must be a valid non-negative amount.';
    }

    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }

    setSaving(true);
    setFormErrors({});

    try {
      const payload = {
        name: formData.name.trim(),
        code: formData.code.trim().toUpperCase(),
        category: formData.category,
        charge: numCharge,
        description: formData.description.trim(),
      };

      if (editingService) {
        const targetId = editingService._id || editingService.id;
        await hospitalAdminService.updateServiceCharge(targetId, payload);
        showSuccess('Service and charge updated successfully.');
      } else {
        await hospitalAdminService.saveServiceCharge(payload);
        showSuccess('Service and charge added successfully.');
      }

      setModalOpen(false);
      await fetchServices(true);
      if (onServiceChange) onServiceChange();
    } catch (err) {
      const msg =
        err.response?.data?.message || 'Failed to save service. Please check your inputs.';
      setFormErrors({ submit: msg });
    } finally {
      setSaving(false);
    }
  };

  // ─── Delete Service Handler ───
  const handleConfirmDelete = async () => {
    if (!deleteConfirmService) return;
    const targetId = deleteConfirmService._id || deleteConfirmService.id;
    setIsDeleting(true);

    try {
      await hospitalAdminService.deleteServiceCharge(targetId);
      showSuccess(`Service '${deleteConfirmService.name}' deleted successfully.`);
      setDeleteConfirmService(null);
      await fetchServices(true);
      if (onServiceChange) onServiceChange();
    } catch (err) {
      console.error('Delete service failed:', err);
      setErrorMsg(
        err.response?.data?.message || 'Unable to delete service. Please try again.'
      );
      setDeleteConfirmService(null);
    } finally {
      setIsDeleting(false);
    }
  };

  // ─── Category Badge Colors ───
  const getCategoryBadgeClass = (category) => {
    switch ((category || '').toLowerCase()) {
      case 'consultation':
        return 'ha-badge--primary';
      case 'diagnostic':
        return 'ha-badge--info';
      case 'laboratory':
        return 'ha-badge--warning';
      case 'radiology':
        return 'ha-badge--purple';
      case 'surgery':
      case 'emergency':
        return 'ha-badge--danger';
      default:
        return 'ha-badge--secondary';
    }
  };

  return (
    <div className="ha-services-container" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      {/* ── Page Header ── */}
      <div className="ha-page-header">
        <h1 style={{ fontSize: '1.25rem', fontWeight: 700, margin: '0 0 0.25rem 0', color: 'var(--text-primary)' }}>
          Services & Charges
        </h1>
        <p style={{ margin: 0, fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
          Manage the hospital's standard service catalogue and charges.
        </p>
      </div>

      {/* ── Feedback Notifications ── */}
      {successMsg && (
        <div className="ha-alert ha-alert--success" role="alert" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <CheckCircle2 size={16} />
          <span>{successMsg}</span>
        </div>
      )}
      {errorMsg && (
        <div className="ha-alert ha-alert--error" role="alert" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <AlertCircle size={16} />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* ── Main Service Catalogue Panel ── */}
      <div className="ha-panel">
        <div
          className="ha-panel__header"
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '0.75rem',
            padding: '1rem 1.25rem',
          }}
        >
          <h2 style={{ fontSize: '1rem', fontWeight: 600, margin: 0, color: 'var(--text-primary)' }}>
            Services & Charges
          </h2>

          {/* Search, Filter & Add Actions Toolbar */}
          <div className="ha-toolbar" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
            {/* Search Box */}
            <div className="ha-search-box" style={{ minWidth: '180px', flex: '1 1 180px' }}>
              <Search size={14} color="#64748b" />
              <input
                type="text"
                placeholder="Search services..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                aria-label="Search services by name or code"
              />
              {searchTerm && (
                <button
                  type="button"
                  onClick={() => setSearchTerm('')}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b', padding: '0 4px' }}
                  title="Clear search"
                >
                  <X size={12} />
                </button>
              )}
            </div>

            {/* Category Filter */}
            <select
              className="ha-filter-select"
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              aria-label="Filter services by category"
              style={{
                background: 'var(--bg-input)',
                color: 'var(--text-primary)',
                border: '1px solid var(--border-color)',
                borderRadius: '0.375rem',
                padding: '0.45rem 0.65rem',
                fontSize: '0.8125rem',
                minWidth: '120px',
              }}
            >
              <option value="all">All</option>
              {SUPPORTED_CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>

            {/* Add Service CTA */}
            <button
              className="ha-btn ha-btn--primary ha-btn--sm"
              onClick={handleOpenAdd}
              style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', fontWeight: 600, whiteSpace: 'nowrap' }}
            >
              <Plus size={14} />
              <span>Add Service</span>
            </button>
          </div>
        </div>

        {/* ── Table & Content Section ── */}
        <div className="ha-panel__body" style={{ padding: 0 }}>
          {loading ? (
            <div style={{ textAlign: 'center', padding: '3rem 1rem', color: 'var(--text-secondary)' }}>
              <Loader2 size={24} className="spin-animation" style={{ color: '#0891b2', margin: '0 auto 0.5rem auto' }} />
              <p style={{ margin: 0, fontSize: '0.875rem' }}>Loading services & charges...</p>
            </div>
          ) : filteredServices.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '2.5rem 1.5rem', color: 'var(--text-secondary)' }}>
              <CreditCard size={32} style={{ color: '#94a3b8', margin: '0 auto 0.5rem auto', opacity: 0.8 }} />
              {services.length === 0 ? (
                <>
                  <p style={{ margin: '0 0 0.25rem 0', fontWeight: 600, fontSize: '0.9375rem', color: 'var(--text-primary)' }}>
                    No services configured yet.
                  </p>
                  <p style={{ margin: '0 0 1rem 0', fontSize: '0.8125rem' }}>
                    Add your first hospital service to start building the standard charge catalogue.
                  </p>
                  <button className="ha-btn ha-btn--primary ha-btn--sm" onClick={handleOpenAdd}>
                    <Plus size={14} /> Add Service
                  </button>
                </>
              ) : (
                <>
                  <p style={{ margin: '0 0 0.25rem 0', fontWeight: 600, fontSize: '0.9375rem', color: 'var(--text-primary)' }}>
                    No services match your search.
                  </p>
                  <p style={{ margin: '0 0 1rem 0', fontSize: '0.8125rem' }}>
                    Try adjusting your search query or category filter.
                  </p>
                  <button
                    className="ha-btn ha-btn--secondary ha-btn--sm"
                    onClick={() => {
                      setSearchTerm('');
                      setCategoryFilter('all');
                    }}
                  >
                    Reset Filters
                  </button>
                </>
              )}
            </div>
          ) : (
            <div className="ha-table-container">
              <table className="ha-table">
                <thead>
                  <tr>
                    <th style={{ width: '30%' }}>Service Name</th>
                    <th style={{ width: '20%' }}>Service Code</th>
                    <th style={{ width: '22%' }}>Category</th>
                    <th style={{ width: '16%', textAlign: 'right' }}>Charge</th>
                    <th style={{ width: '12%', textAlign: 'center' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredServices.map((svc) => {
                    const svcId = svc._id || svc.id;

                    return (
                      <tr key={svcId}>
                        {/* Service Name & Description */}
                        <td>
                          <div style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '0.875rem' }}>
                            {svc.name}
                          </div>
                          {svc.description && (
                            <div
                              style={{
                                fontSize: '0.75rem',
                                color: 'var(--text-secondary)',
                                marginTop: '0.125rem',
                                whiteSpace: 'nowrap',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                maxWidth: '300px',
                              }}
                              title={svc.description}
                            >
                              {svc.description}
                            </div>
                          )}
                        </td>

                        {/* Service Code */}
                        <td>
                          <code
                            style={{
                              background: 'var(--bg-input, rgba(148, 163, 184, 0.15))',
                              padding: '0.2rem 0.4rem',
                              borderRadius: '0.25rem',
                              fontWeight: 700,
                              fontSize: '0.8125rem',
                              color: '#0891b2',
                            }}
                          >
                            {svc.code}
                          </code>
                        </td>

                        {/* Category */}
                        <td>
                          <span className={`ha-badge ${getCategoryBadgeClass(svc.category)}`}>
                            {svc.category || 'General'}
                          </span>
                        </td>

                        {/* Standard Charge Formatted with Hospital Currency */}
                        <td style={{ textAlign: 'right', fontWeight: 600, color: 'var(--text-primary)', fontSize: '0.875rem' }}>
                          {formatCharge(svc.charge)}
                        </td>

                        {/* Actions: Edit & Delete */}
                        <td style={{ textAlign: 'center' }}>
                          <div style={{ display: 'flex', gap: '0.375rem', justifyContent: 'center', alignItems: 'center' }}>
                            <button
                              type="button"
                              className="ha-btn ha-btn--secondary ha-btn--sm"
                              onClick={() => handleOpenEdit(svc)}
                              title="Edit Service"
                              style={{ padding: '0.3rem 0.5rem', display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.75rem' }}
                            >
                              <Edit2 size={12} />
                              <span>Edit</span>
                            </button>
                            <button
                              type="button"
                              className="ha-btn ha-btn--danger ha-btn--sm"
                              onClick={() => setDeleteConfirmService(svc)}
                              title="Delete Service"
                              style={{ padding: '0.3rem 0.5rem', display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.75rem' }}
                            >
                              <Trash2 size={12} />
                              <span>Delete</span>
                            </button>
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

      {/* ── Add / Edit Service Modal ── */}
      {modalOpen && (
        <div className="ha-modal-overlay" role="dialog" aria-modal="true">
          <div className="ha-modal" style={{ maxWidth: '500px', width: '100%' }}>
            <div className="ha-modal__header">
              <h3 className="ha-modal__title">
                {editingService ? 'Edit Service' : 'Add Service'}
              </h3>
              <button
                type="button"
                className="ha-btn ha-btn--secondary ha-btn--sm"
                onClick={() => setModalOpen(false)}
                disabled={saving}
                style={{ padding: '0.2rem 0.5rem' }}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmitForm}>
              <div className="ha-modal__body" style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
                {formErrors.submit && (
                  <div className="ha-alert ha-alert--error" style={{ fontSize: '0.8125rem', padding: '0.5rem 0.75rem' }}>
                    <AlertCircle size={14} />
                    <span>{formErrors.submit}</span>
                  </div>
                )}

                {/* Service Name */}
                <div className="ha-form-group">
                  <label style={{ display: 'block', marginBottom: '0.25rem', fontSize: '0.8125rem', fontWeight: 600 }}>
                    Service Name <span style={{ color: '#ef4444' }}>*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. General Consultation"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    style={{ width: '100%' }}
                  />
                  {formErrors.name && (
                    <span style={{ fontSize: '0.75rem', color: '#ef4444', marginTop: '0.2rem', display: 'block' }}>
                      {formErrors.name}
                    </span>
                  )}
                </div>

                {/* Service Code */}
                <div className="ha-form-group">
                  <label style={{ display: 'block', marginBottom: '0.25rem', fontSize: '0.8125rem', fontWeight: 600 }}>
                    Service Code <span style={{ color: '#ef4444' }}>*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. CONS001"
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                    style={{ width: '100%', textTransform: 'uppercase' }}
                  />
                  {formErrors.code && (
                    <span style={{ fontSize: '0.75rem', color: '#ef4444', marginTop: '0.2rem', display: 'block' }}>
                      {formErrors.code}
                    </span>
                  )}
                </div>

                {/* Category & Charge Grid */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                  <div className="ha-form-group">
                    <label style={{ display: 'block', marginBottom: '0.25rem', fontSize: '0.8125rem', fontWeight: 600 }}>
                      Category <span style={{ color: '#ef4444' }}>*</span>
                    </label>
                    <select
                      value={formData.category}
                      onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                      style={{
                        width: '100%',
                        background: 'var(--bg-input)',
                        color: 'var(--text-primary)',
                        border: '1px solid var(--border-color)',
                        borderRadius: '0.375rem',
                        padding: '0.5rem',
                        fontSize: '0.8125rem',
                      }}
                    >
                      {SUPPORTED_CATEGORIES.map((cat) => (
                        <option key={cat} value={cat}>
                          {cat}
                        </option>
                      ))}
                    </select>
                    {formErrors.category && (
                      <span style={{ fontSize: '0.75rem', color: '#ef4444', marginTop: '0.2rem', display: 'block' }}>
                        {formErrors.category}
                      </span>
                    )}
                  </div>

                  <div className="ha-form-group">
                    <label style={{ display: 'block', marginBottom: '0.25rem', fontSize: '0.8125rem', fontWeight: 600 }}>
                      Charge ({activeCurrencySymbol || currencySymbol || '$'}) <span style={{ color: '#ef4444' }}>*</span>
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      required
                      placeholder="50.00"
                      value={formData.charge}
                      onChange={(e) => setFormData({ ...formData, charge: e.target.value })}
                      style={{ width: '100%' }}
                    />
                    {formErrors.charge && (
                      <span style={{ fontSize: '0.75rem', color: '#ef4444', marginTop: '0.2rem', display: 'block' }}>
                        {formErrors.charge}
                      </span>
                    )}
                  </div>
                </div>

                {/* Description */}
                <div className="ha-form-group">
                  <label style={{ display: 'block', marginBottom: '0.25rem', fontSize: '0.8125rem', fontWeight: 600 }}>
                    Description
                  </label>
                  <textarea
                    rows="2"
                    placeholder="Brief description of service (optional)..."
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    style={{
                      width: '100%',
                      background: 'var(--bg-input)',
                      color: 'var(--text-primary)',
                      border: '1px solid var(--border-color)',
                      borderRadius: '0.375rem',
                      padding: '0.5rem',
                      fontSize: '0.8125rem',
                      resize: 'vertical',
                    }}
                  />
                </div>
              </div>

              <div className="ha-modal__footer" style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.625rem' }}>
                <button
                  type="button"
                  className="ha-btn ha-btn--secondary"
                  onClick={() => setModalOpen(false)}
                  disabled={saving}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="ha-btn ha-btn--primary"
                  disabled={saving}
                  style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}
                >
                  {saving ? (
                    <>
                      <Loader2 size={13} className="spin-animation" />
                      <span>Saving...</span>
                    </>
                  ) : (
                    <span>{editingService ? 'Save Changes' : 'Add Service'}</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Delete Confirmation Modal ── */}
      {deleteConfirmService && (
        <div className="ha-modal-overlay" role="dialog" aria-modal="true">
          <div className="ha-modal" style={{ maxWidth: '420px', width: '100%' }}>
            <div className="ha-modal__header">
              <h3 className="ha-modal__title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <ShieldAlert size={18} color="#ef4444" />
                <span>Delete this service?</span>
              </h3>
              <button
                type="button"
                className="ha-btn ha-btn--secondary ha-btn--sm"
                onClick={() => setDeleteConfirmService(null)}
                disabled={isDeleting}
              >
                ✕
              </button>
            </div>
            <div className="ha-modal__body" style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
              <p style={{ margin: '0 0 0.5rem 0' }}>
                Are you sure you want to delete <strong style={{ color: 'var(--text-primary)' }}>{deleteConfirmService.name}</strong> ({deleteConfirmService.code})?
              </p>
              <p style={{ margin: 0, fontSize: '0.8125rem', color: '#ef4444' }}>
                This service will be removed from the hospital's service catalogue.
              </p>
            </div>
            <div className="ha-modal__footer" style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.625rem' }}>
              <button
                type="button"
                className="ha-btn ha-btn--secondary"
                onClick={() => setDeleteConfirmService(null)}
                disabled={isDeleting}
              >
                Cancel
              </button>
              <button
                type="button"
                className="ha-btn ha-btn--danger"
                onClick={handleConfirmDelete}
                disabled={isDeleting}
                style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}
              >
                {isDeleting ? (
                  <>
                    <Loader2 size={13} className="spin-animation" />
                    <span>Deleting...</span>
                  </>
                ) : (
                  <span>Delete Service</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
