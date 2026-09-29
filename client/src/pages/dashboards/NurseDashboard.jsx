/**
 * Nurse Dashboard Master Component
 * 
 * Central controller for all 10 Clinical Nursing Station modules:
 * 1.  dashboard     -> NurseOverviewTab (Station Command Center)
 * 2.  patients      -> NursePatientsTab (Inpatient Ward Directory)
 * 3.  vitals        -> NurseVitalsTab (Vitals Recording & Alerts)
 * 4.  notes         -> NurseNotesTab (SOAP Progress Notes)
 * 5.  medications   -> NurseMedicationsTab (eMAR Administration)
 * 6.  instructions  -> NurseDoctorInstructionsTab (Physician Orders)
 * 7.  tasks         -> NurseCareTasksTab (Shift Care Tasks Checklist)
 * 8.  handover      -> NurseHandoverTab (SBAR Handover Tool)
 * 9.  alerts        -> NurseAlertsTab (Emergency Call Bell Monitor)
 * 10. monitoring    -> NurseMonitoringTab (Fluid Balance I/O Tracker)
 */

import { useSearchParams } from 'react-router-dom';
import { useAuth } from '../../context/useAuth';

// Clinical Tab Subcomponents
import NurseOverviewTab from './nurse/NurseOverviewTab';
import NursePatientsTab from './nurse/NursePatientsTab';
import NurseVitalsTab from './nurse/NurseVitalsTab';
import NurseNotesTab from './nurse/NurseNotesTab';
import NurseMedicationsTab from './nurse/NurseMedicationsTab';
import NurseDoctorInstructionsTab from './nurse/NurseDoctorInstructionsTab';
import NurseCareTasksTab from './nurse/NurseCareTasksTab';
import NurseHandoverTab from './nurse/NurseHandoverTab';
import NurseAlertsTab from './nurse/NurseAlertsTab';
import NurseMonitoringTab from './nurse/NurseMonitoringTab';

export default function NurseDashboard() {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get('tab') || 'dashboard';

  const handleNavigateTab = (tabId) => {
    setSearchParams({ tab: tabId });
  };

  return (
    <div className="nurse-portal" style={{ minHeight: '100%', width: '100%' }}>
      {(() => {
        switch (activeTab) {
          case 'dashboard':
            return (
              <NurseOverviewTab
                user={user}
                onNavigateTab={handleNavigateTab}
                onOpenRecordVitals={() => handleNavigateTab('vitals')}
              />
            );

          case 'patients':
            return <NursePatientsTab onNavigateTab={handleNavigateTab} />;

          case 'vitals':
            return <NurseVitalsTab />;

          case 'notes':
            return <NurseNotesTab />;

          case 'medications':
            return <NurseMedicationsTab />;

          case 'instructions':
            return <NurseDoctorInstructionsTab />;

          case 'tasks':
            return <NurseCareTasksTab />;

          case 'handover':
            return <NurseHandoverTab user={user} />;

          case 'alerts':
            return <NurseAlertsTab />;

          case 'monitoring':
            return <NurseMonitoringTab />;

          default:
            return (
              <NurseOverviewTab
                user={user}
                onNavigateTab={handleNavigateTab}
                onOpenRecordVitals={() => handleNavigateTab('vitals')}
              />
            );
        }
      })()}
    </div>
  );
}
