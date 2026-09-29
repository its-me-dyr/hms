/**
 * HMS Pharmacy Management Workspace
 * 
 * Master Coordinator Component for all 15 Pharmacy operational modules:
 * 1.  dashboard          -> PharmacyOverviewTab
 * 2.  prescriptions      -> PrescriptionsTab
 * 3.  dispensing         -> DispensingTab
 * 4.  medicines          -> MedicinesTab
 * 5.  inventory          -> InventoryTab
 * 6.  batches            -> BatchesExpiryTab
 * 7.  purchase-orders    -> PurchaseOrdersTab
 * 8.  suppliers          -> SuppliersTab
 * 9.  billing            -> SalesBillingTab
 * 10. returns            -> ReturnsTab
 * 11. stock-adjustments  -> StockAdjustmentsTab
 * 12. low-stock          -> LowStockAlertsTab
 * 13. reports            -> ReportsTab
 * 14. notifications      -> NotificationsTab
 * 15. profile            -> PharmacyProfileTab
 */

import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '../../context/useAuth';

// 15 Sub-Module Tabs
import PharmacyOverviewTab from './pharmacy/PharmacyOverviewTab';
import PrescriptionsTab from './pharmacy/PrescriptionsTab';
import DispensingTab from './pharmacy/DispensingTab';
import MedicinesTab from './pharmacy/MedicinesTab';
import InventoryTab from './pharmacy/InventoryTab';
import BatchesExpiryTab from './pharmacy/BatchesExpiryTab';
import PurchaseOrdersTab from './pharmacy/PurchaseOrdersTab';
import SuppliersTab from './pharmacy/SuppliersTab';
import SalesBillingTab from './pharmacy/SalesBillingTab';
import ReturnsTab from './pharmacy/ReturnsTab';
import StockAdjustmentsTab from './pharmacy/StockAdjustmentsTab';
import LowStockAlertsTab from './pharmacy/LowStockAlertsTab';
import ReportsTab from './pharmacy/ReportsTab';
import NotificationsTab from './pharmacy/NotificationsTab';
import PharmacyProfileTab from './pharmacy/PharmacyProfileTab';

export default function PharmacyDashboard() {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get('tab') || 'dashboard';

  // Cross-module state for selecting a prescription to dispense immediately
  const [activePrescriptionForDispensing, setActivePrescriptionForDispensing] = useState(null);

  // Tab switching helper
  const handleNavigateTab = (tabId, extraData = null) => {
    if (tabId === 'dispensing' && extraData) {
      setActivePrescriptionForDispensing(extraData);
    }
    setSearchParams({ tab: tabId });
  };

  const handleSelectPrescription = (rx) => {
    setActivePrescriptionForDispensing(rx);
    setSearchParams({ tab: 'dispensing' });
  };

  return (
    <div className="pharmacy-portal" style={{ minHeight: '100%', width: '100%', maxWidth: 'none' }}>
      {(() => {
        switch (activeTab) {
          case 'dashboard':
            return (
              <PharmacyOverviewTab
                user={user}
                onNavigateTab={handleNavigateTab}
                onSelectPrescription={handleSelectPrescription}
              />
            );
          case 'prescriptions':
            return (
              <PrescriptionsTab
                onNavigateTab={handleNavigateTab}
                onSelectPrescription={handleSelectPrescription}
              />
            );
          case 'dispensing':
            return (
              <DispensingTab
                activePrescription={activePrescriptionForDispensing}
                onNavigateTab={handleNavigateTab}
              />
            );
          case 'medicines':
            return <MedicinesTab onNavigateTab={handleNavigateTab} />;
          case 'inventory':
            return <InventoryTab onNavigateTab={handleNavigateTab} />;
          case 'batches':
            return <BatchesExpiryTab onNavigateTab={handleNavigateTab} />;
          case 'purchase-orders':
            return <PurchaseOrdersTab onNavigateTab={handleNavigateTab} />;
          case 'suppliers':
            return <SuppliersTab onNavigateTab={handleNavigateTab} />;
          case 'billing':
            return <SalesBillingTab onNavigateTab={handleNavigateTab} />;
          case 'returns':
            return <ReturnsTab onNavigateTab={handleNavigateTab} />;
          case 'stock-adjustments':
            return <StockAdjustmentsTab onNavigateTab={handleNavigateTab} />;
          case 'low-stock':
            return <LowStockAlertsTab onNavigateTab={handleNavigateTab} />;
          case 'reports':
            return <ReportsTab onNavigateTab={handleNavigateTab} />;
          case 'notifications':
            return <NotificationsTab onNavigateTab={handleNavigateTab} />;
          case 'profile':
            return <PharmacyProfileTab />;
          default:
            return (
              <PharmacyOverviewTab
                user={user}
                onNavigateTab={handleNavigateTab}
                onSelectPrescription={handleSelectPrescription}
              />
            );
        }
      })()}
    </div>
  );
}
