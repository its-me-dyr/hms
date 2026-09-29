/**
 * Specialized Staff Dashboard Component
 * 
 * Supports Pharmacist, Lab Tech, Radiology, OT, Billing, Insurance,
 * HR, Inventory, Blood Bank, and Emergency department portals.
 */

import BaseRoleDashboard from './BaseRoleDashboard';

export default function StaffDashboard({ roleKey }) {
  return <BaseRoleDashboard roleKey={roleKey} />;
}
