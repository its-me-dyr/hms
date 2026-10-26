/**
 * Role Navigation Configuration and Helper
 * 
 * Maps every HMS role to its dedicated dashboard route and full navigation specification.
 */

import {
  LayoutDashboard,
  User,
  Calendar,
  Stethoscope,
  FileText,
  Pill,
  Microscope,
  Image,
  CreditCard,
  History,
  FileCheck,
  Bell,
  Clock,
  Users,
  Activity,
  ClipboardList,
  AlertTriangle,
  UserPlus,
  Ticket,
  LogIn,
  Bed,
  Search,
  Building2,
  Package,
  Layers,
  Settings,
  ShieldCheck,
  CheckCircle2,
  LogOut,
} from 'lucide-react';

export const ROLE_NAVIGATION = {
  super_admin: {
    portalName: 'Super Admin Portal',
    badgeColor: '#0891b2',
    basePath: '/dashboard/super-admin',
    sections: [
      {
        title: 'MAIN',
        items: [
          { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
          { id: 'hospitals', label: 'Hospital Management', icon: Building2 },
          { id: 'hospital-admins', label: 'Hospital Admin Management', icon: Users },
          { id: 'roles', label: 'Roles & Permissions', icon: ShieldCheck },
          { id: 'reports', label: 'Reports & Analytics', icon: FileText },
          { id: 'audit-logs', label: 'Audit Logs', icon: History },
          { id: 'notifications', label: 'Notifications', icon: Bell },
        ],
      },
      {
        title: 'ACCOUNT',
        items: [
          { id: 'profile', label: 'My Profile', icon: User },
          { id: 'settings', label: 'Settings', icon: Settings },
          { id: 'logout', label: 'Logout', icon: LogOut },
        ],
      },
    ],
    items: [
      { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
      { id: 'hospitals', label: 'Hospital Management', icon: Building2 },
      { id: 'hospital-admins', label: 'Hospital Admin Management', icon: Users },
      { id: 'roles', label: 'Roles & Permissions', icon: ShieldCheck },
      { id: 'reports', label: 'Reports & Analytics', icon: FileText },
      { id: 'audit-logs', label: 'Audit Logs', icon: History },
      { id: 'notifications', label: 'Notifications', icon: Bell },
      { id: 'profile', label: 'My Profile', icon: User },
      { id: 'settings', label: 'Settings', icon: Settings },
      { id: 'logout', label: 'Logout', icon: LogOut },
    ],
  },

  patient: {
    portalName: 'Patient Portal',
    badgeColor: 'var(--color-primary)',
    basePath: '/dashboard/patient',
    items: [
      { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
      { id: 'appointments', label: 'My Appointments', icon: Calendar },
      { id: 'book-appointment', label: 'Book Appointment', icon: Stethoscope },
      { id: 'medical-records', label: 'Medical Records', icon: History },
      { id: 'prescriptions', label: 'Prescriptions', icon: Pill },
      { id: 'lab-reports', label: 'Lab Reports', icon: Microscope },
      { id: 'radiology-reports', label: 'Radiology Reports', icon: Image },
      { id: 'bills', label: 'Bills & Payments', icon: CreditCard },
      { id: 'notifications', label: 'Notifications', icon: Bell },
      { id: 'profile', label: 'My Profile', icon: User },
      { id: 'settings', label: 'Settings', icon: Settings },
    ],
  },

  doctor: {
    portalName: 'Doctor Clinical Workspace',
    badgeColor: '#059669',
    basePath: '/dashboard/doctor',
    items: [
      { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
      { id: 'appointments', label: 'My Appointments', icon: Calendar },
      { id: 'queue', label: 'Patient Queue', icon: Clock },
      { id: 'my-patients', label: 'My Patients', icon: Users },
      { id: 'records', label: 'Patient Records', icon: FileText },
      { id: 'consultations', label: 'Consultations', icon: Stethoscope },
      { id: 'prescriptions', label: 'Prescriptions', icon: Pill },
      { id: 'investigations', label: 'Investigations', icon: Microscope },
      { id: 'follow-ups', label: 'Follow-ups', icon: History },
      { id: 'schedule', label: 'My Schedule', icon: Calendar },
      { id: 'leave', label: 'Leave', icon: Clock },
      { id: 'reports', label: 'Reports', icon: FileText },
      { id: 'profile', label: 'Profile', icon: User },
      { id: 'settings', label: 'Settings', icon: Settings },
    ],
  },

  nurse: {
    portalName: 'Nursing Care Station',
    badgeColor: '#0284c7',
    basePath: '/dashboard/nurse',
    items: [
      { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
      { id: 'patients', label: 'My Patients', icon: Users },
      { id: 'vitals', label: 'Vitals', icon: Activity },
      { id: 'notes', label: 'Nursing Notes', icon: ClipboardList },
      { id: 'medications', label: 'Medication Administration', icon: Pill },
      { id: 'instructions', label: 'Doctor Instructions', icon: FileText },
      { id: 'tasks', label: 'Care Tasks', icon: ClipboardList },
      { id: 'handover', label: 'Shift Handover', icon: Clock },
      { id: 'alerts', label: 'Emergency Alerts', icon: AlertTriangle },
      { id: 'monitoring', label: 'Monitoring History', icon: History },
      { id: 'settings', label: 'Settings', icon: Settings },
    ],
  },

  receptionist: {
    portalName: 'Reception & Front Desk',
    badgeColor: '#0891b2',
    basePath: '/dashboard/receptionist',
    items: [
      { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
      { id: 'register-patient', label: 'Patient Registration', icon: UserPlus },
      { id: 'patients', label: 'Patients', icon: Users },
      { id: 'appointments', label: 'Appointments', icon: Calendar },
      { id: 'check-in-out', label: 'Check-In / Check-Out', icon: LogIn },
      { id: 'queue-tokens', label: 'Queue & Tokens', icon: Ticket },
      { id: 'opd-registration', label: 'OPD Registration', icon: ClipboardList },
      { id: 'admission', label: 'Admission', icon: Bed },
      { id: 'billing-coord', label: 'Billing Coordination', icon: CreditCard },
      { id: 'search-patient', label: 'Patient Search', icon: Search },
      { id: 'notifications', label: 'Notifications', icon: Bell },
      { id: 'profile', label: 'My Profile', icon: User },
      { id: 'settings', label: 'Settings', icon: Settings },
    ],
  },

  hospital_admin: {
    portalName: 'Hospital Admin Portal',
    badgeColor: '#0891b2',
    basePath: '/dashboard/hospital-admin',
    sections: [
      {
        title: 'MAIN',
        items: [
          { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
          { id: 'hospital-settings', label: 'Hospital & Branch Settings', icon: Building2 },
          { id: 'departments', label: 'Departments', icon: Building2 },
          { id: 'services-charges', label: 'Services & Charges', icon: CreditCard },
          { id: 'users', label: 'Users & Staff', icon: Users },
          { id: 'operating-hours', label: 'Operating Hours & Holidays', icon: Clock },
          { id: 'branding', label: 'Hospital Branding', icon: Layers },
          { id: 'system-config', label: 'System Configuration', icon: Settings },
          { id: 'reports', label: 'Administrative Reports', icon: FileText },
        ],
      },
      {
        title: 'SYSTEM',
        items: [
          { id: 'notifications', label: 'Notifications', icon: Bell },
          { id: 'audit-logs', label: 'Audit Logs', icon: History },
        ],
      },
      {
        title: 'ACCOUNT',
        items: [
          { id: 'profile', label: 'My Profile', icon: User },
          { id: 'settings', label: 'Settings', icon: Settings },
          { id: 'logout', label: 'Logout', icon: LogOut },
        ],
      },
    ],
    items: [
      { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
      { id: 'hospital-settings', label: 'Hospital & Branch Settings', icon: Building2 },
      { id: 'departments', label: 'Departments', icon: Building2 },
      { id: 'services-charges', label: 'Services & Charges', icon: CreditCard },
      { id: 'users', label: 'Users & Staff', icon: Users },
      { id: 'operating-hours', label: 'Operating Hours & Holidays', icon: Clock },
      { id: 'branding', label: 'Hospital Branding', icon: Layers },
      { id: 'system-config', label: 'System Configuration', icon: Settings },
      { id: 'reports', label: 'Administrative Reports', icon: FileText },
      { id: 'notifications', label: 'Notifications', icon: Bell },
      { id: 'audit-logs', label: 'Audit Logs', icon: History },
      { id: 'profile', label: 'My Profile', icon: User },
      { id: 'settings', label: 'Settings', icon: Settings },
      { id: 'logout', label: 'Logout', icon: LogOut },
    ],
  },


  pharmacist: {
    portalName: 'Pharmacy Management',
    badgeColor: '#0891b2',
    basePath: '/dashboard/pharmacist',
    items: [
      { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
      { id: 'prescriptions', label: 'Prescriptions', icon: Pill },
      { id: 'dispensing', label: 'Dispensing', icon: CheckCircle2 },
      { id: 'medicines', label: 'Medicines', icon: Layers },
      { id: 'inventory', label: 'Inventory', icon: Package },
      { id: 'batches', label: 'Batches & Expiry', icon: Clock },
      { id: 'purchase-orders', label: 'Purchase Orders', icon: ClipboardList },
      { id: 'suppliers', label: 'Suppliers', icon: Building2 },
      { id: 'billing', label: 'Sales & Billing', icon: CreditCard },
      { id: 'returns', label: 'Returns', icon: History },
      { id: 'stock-adjustments', label: 'Stock Adjustments', icon: Activity },
      { id: 'low-stock', label: 'Low Stock Alerts', icon: AlertTriangle },
      { id: 'reports', label: 'Reports', icon: FileText },
      { id: 'notifications', label: 'Notifications', icon: Bell },
      { id: 'profile', label: 'My Profile', icon: User },
      { id: 'settings', label: 'Settings', icon: Settings },
    ],
  },

  lab_technician: {
    portalName: 'Laboratory Diagnostics',
    badgeColor: '#0891b2',
    basePath: '/dashboard/lab',
    items: [
      { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
      { id: 'requests', label: 'Lab Requests', icon: ClipboardList },
      { id: 'collection', label: 'Sample Collection', icon: Microscope },
      { id: 'tracking', label: 'Sample Tracking', icon: Activity },
      { id: 'catalog', label: 'Test Catalog', icon: Layers },
      { id: 'processing', label: 'Test Processing', icon: Clock },
      { id: 'results', label: 'Results Entry', icon: FileText },
      { id: 'verification', label: 'Result Verification', icon: CheckCircle2 },
      { id: 'reports', label: 'Lab Reports', icon: FileCheck },
      { id: 'patients', label: 'Patients', icon: Users },
      { id: 'critical', label: 'Critical Results', icon: AlertTriangle },
      { id: 'notifications', label: 'Notifications', icon: Bell },
      { id: 'profile', label: 'My Profile', icon: User },
      { id: 'settings', label: 'Settings', icon: Settings },
    ],
  },


  radiology_staff: {
    portalName: 'Radiology & Imaging',
    badgeColor: '#6366f1',
    basePath: '/dashboard/radiology',
    items: [
      { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
      { id: 'requests', label: 'Imaging Requests', icon: ClipboardList },
      { id: 'scheduling', label: 'Scheduling & Calendar', icon: Calendar },
      { id: 'preparation', label: 'Patient Preparation', icon: ShieldCheck },
      { id: 'queue', label: 'Imaging Queue', icon: Activity },
      { id: 'processing', label: 'Study Acquisition', icon: Image },
      { id: 'entry', label: 'Report Entry', icon: FileText },
      { id: 'verification', label: 'Report Verification', icon: CheckCircle2 },
      { id: 'critical', label: 'Critical Findings', icon: AlertTriangle },
      { id: 'reports', label: 'Reports Archive', icon: FileCheck },
      { id: 'patients', label: 'Patients Directory', icon: Users },
      { id: 'equipment', label: 'Equipment Status', icon: Layers },
      { id: 'notifications', label: 'Notifications', icon: Bell },
      { id: 'profile', label: 'My Profile', icon: User },
      { id: 'settings', label: 'Settings', icon: Settings },
    ],
  },

  ot_staff: {
    portalName: 'Operation Theatre',
    badgeColor: '#ec4899',
    basePath: '/dashboard/ot',
    items: [
      { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
      { id: 'surgeries', label: 'Scheduled Surgeries', icon: Calendar },
      { id: 'theatres', label: 'OT Room Status', icon: Bed },
      { id: 'teams', label: 'Surgical Teams', icon: Users },
      { id: 'recovery', label: 'Post-Op Recovery', icon: Activity },
      { id: 'settings', label: 'Settings', icon: Settings },
    ],
  },

  billing_staff: {
    portalName: 'Billing & Cashier',
    badgeColor: '#10b981',
    basePath: '/dashboard/billing',
    items: [
      { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
      { id: 'invoices', label: 'Invoices', icon: CreditCard },
      { id: 'payments', label: 'Receive Payment', icon: CheckCircle2 },
      { id: 'refunds', label: 'Refunds', icon: History },
      { id: 'reports', label: 'Daily Collection', icon: FileText },
      { id: 'settings', label: 'Settings', icon: Settings },
    ],
  },

  insurance_staff: {
    portalName: 'Insurance Desk',
    badgeColor: '#8b5cf6',
    basePath: '/dashboard/insurance',
    items: [
      { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
      { id: 'preauth', label: 'Pre-Authorizations', icon: ShieldCheck },
      { id: 'claims', label: 'Claims Processing', icon: CreditCard },
      { id: 'tpa', label: 'TPA Partners', icon: Building2 },
      { id: 'settings', label: 'Settings', icon: Settings },
    ],
  },

  hr_staff: {
    portalName: 'Human Resources',
    badgeColor: '#f59e0b',
    basePath: '/dashboard/hr',
    items: [
      { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
      { id: 'staff', label: 'Staff Directory', icon: Users },
      { id: 'rosters', label: 'Shift Rosters', icon: Calendar },
      { id: 'attendance', label: 'Attendance', icon: Clock },
      { id: 'leaves', label: 'Leave Requests', icon: ClipboardList },
      { id: 'settings', label: 'Settings', icon: Settings },
    ],
  },

  inventory_staff: {
    portalName: 'Hospital Inventory',
    badgeColor: '#14b8a6',
    basePath: '/dashboard/inventory',
    items: [
      { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
      { id: 'items', label: 'Item Master', icon: Package },
      { id: 'purchase', label: 'Purchase Orders', icon: CreditCard },
      { id: 'suppliers', label: 'Suppliers', icon: Building2 },
      { id: 'audit', label: 'Stock Audit', icon: ShieldCheck },
      { id: 'settings', label: 'Settings', icon: Settings },
    ],
  },

  blood_bank_staff: {
    portalName: 'Blood Bank',
    badgeColor: '#ef4444',
    basePath: '/dashboard/blood-bank',
    items: [
      { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
      { id: 'stock', label: 'Blood Units Stock', icon: Activity },
      { id: 'donors', label: 'Donor Registry', icon: Users },
      { id: 'requests', label: 'Issue Requests', icon: ClipboardList },
      { id: 'crossmatch', label: 'Crossmatching', icon: Microscope },
      { id: 'settings', label: 'Settings', icon: Settings },
    ],
  },

  emergency_staff: {
    portalName: 'Emergency & Ambulance',
    badgeColor: '#dc2626',
    basePath: '/dashboard/emergency',
    items: [
      { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
      { id: 'triage', label: 'Triage Queue', icon: AlertTriangle },
      { id: 'ambulances', label: 'Ambulance Fleet', icon: Activity },
      { id: 'admissions', label: 'Emergency Admissions', icon: Bed },
      { id: 'on-call', label: 'On-Call Specialists', icon: Stethoscope },
      { id: 'settings', label: 'Settings', icon: Settings },
    ],
  },
};

/**
 * Maps raw role string to normalized role key
 */
export function normalizeRoleKey(role) {
  const raw = typeof role === 'object' && role !== null
    ? (role.name || role.roleName || role.displayName || '')
    : role;
  const r = String(raw || '').toLowerCase().trim().replace(/[-\s]/g, '_');
  if (r === 'super_admin') return 'super_admin';
  if (r === 'hospital_admin') return 'hospital_admin';
  if (r === 'doctor') return 'doctor';
  if (r === 'nurse') return 'nurse';
  if (r === 'receptionist' || r === 'reception') return 'receptionist';
  if (r === 'pharmacist') return 'pharmacist';
  if (r === 'lab_technician' || r === 'lab_tech' || r === 'lab') return 'lab_technician';
  if (r === 'radiology_staff' || r === 'radiologist' || r === 'radiology') return 'radiology_staff';
  if (r === 'ot_staff' || r === 'ot') return 'ot_staff';
  if (r === 'billing_staff' || r === 'billing') return 'billing_staff';
  if (r === 'insurance_staff' || r === 'insurance') return 'insurance_staff';
  if (r === 'hr_staff' || r === 'hr') return 'hr_staff';
  if (r === 'inventory_staff' || r === 'inventory') return 'inventory_staff';
  if (r === 'blood_bank_staff' || r === 'blood_bank') return 'blood_bank_staff';
  if (r === 'emergency_staff' || r === 'emergency') return 'emergency_staff';
  return 'patient';
}

/**
 * Returns dashboard redirect path for role
 */
export function getDashboardPathForRole(role) {
  const key = normalizeRoleKey(role);
  return ROLE_NAVIGATION[key]?.basePath || '/dashboard/patient';
}
