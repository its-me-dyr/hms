/**
 * HMS Radiology & Imaging Diagnostics Workspace
 * 
 * Master Coordinator Component for all 14 Radiology operational modules:
 * 1.  dashboard      -> RadiologyOverviewTab
 * 2.  requests       -> ImagingRequestsTab
 * 3.  scheduling     -> SchedulingTab
 * 4.  preparation    -> PatientPreparationTab
 * 5.  queue          -> ImagingQueueTab
 * 6.  processing     -> StudyProcessingTab
 * 7.  entry          -> ReportEntryTab
 * 8.  verification   -> ReportVerificationTab
 * 9.  critical       -> CriticalFindingsTab
 * 10. reports        -> ImagingReportsTab
 * 11. patients       -> RadiologyPatientsTab
 * 12. equipment      -> EquipmentTab
 * 13. notifications  -> RadiologyNotificationsTab
 * 14. profile        -> RadiologyProfileTab
 */

import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '../../context/useAuth';

// Radiology Sub-Module Tabs
import RadiologyOverviewTab from './radiology/RadiologyOverviewTab';
import ImagingRequestsTab from './radiology/ImagingRequestsTab';
import SchedulingTab from './radiology/SchedulingTab';
import PatientPreparationTab from './radiology/PatientPreparationTab';
import ImagingQueueTab from './radiology/ImagingQueueTab';
import StudyProcessingTab from './radiology/StudyProcessingTab';
import ReportEntryTab from './radiology/ReportEntryTab';
import ReportVerificationTab from './radiology/ReportVerificationTab';
import CriticalFindingsTab from './radiology/CriticalFindingsTab';
import ImagingReportsTab from './radiology/ImagingReportsTab';
import RadiologyPatientsTab from './radiology/RadiologyPatientsTab';
import EquipmentTab from './radiology/EquipmentTab';
import RadiologyNotificationsTab from './radiology/RadiologyNotificationsTab';
import RadiologyProfileTab from './radiology/RadiologyProfileTab';

export default function RadiologyDashboard() {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get('tab') || 'dashboard';

  // Cross-module contextual state
  const [activeRequestForSchedule, setActiveRequestForSchedule] = useState(null);
  const [activeStudyForProcessing, setActiveStudyForProcessing] = useState(null);
  const [activeStudyForEntry, setActiveStudyForEntry] = useState(null);
  const [activeReportForVerification, setActiveReportForVerification] = useState(null);
  const [activeReportForView, setActiveReportForView] = useState(null);
  const [activePatientForHistory, setActivePatientForHistory] = useState(null);

  // Tab navigation handler
  const handleNavigateTab = (tabId, extraData = null) => {
    if (tabId === 'scheduling' && extraData) {
      setActiveRequestForSchedule(extraData);
    } else if (tabId === 'processing' && extraData) {
      setActiveStudyForProcessing(extraData);
    } else if (tabId === 'entry' && extraData) {
      setActiveStudyForEntry(extraData);
    } else if (tabId === 'verification' && extraData) {
      setActiveReportForVerification(extraData);
    } else if (tabId === 'reports' && extraData) {
      setActiveReportForView(extraData);
    } else if (tabId === 'patients' && extraData) {
      setActivePatientForHistory(extraData);
    }
    setSearchParams({ tab: tabId });
  };

  return (
    <div className="radiology-portal" style={{ minHeight: '100%', width: '100%', maxWidth: 'none' }}>
      {(() => {
        switch (activeTab) {
          case 'dashboard':
            return (
              <RadiologyOverviewTab
                user={user}
                onNavigateTab={handleNavigateTab}
              />
            );
          case 'requests':
            return (
              <ImagingRequestsTab
                onNavigateTab={handleNavigateTab}
              />
            );
          case 'scheduling':
            return (
              <SchedulingTab
                activeRequest={activeRequestForSchedule}
                onNavigateTab={handleNavigateTab}
              />
            );
          case 'preparation':
            return (
              <PatientPreparationTab
                onNavigateTab={handleNavigateTab}
              />
            );
          case 'queue':
            return (
              <ImagingQueueTab
                onNavigateTab={handleNavigateTab}
              />
            );
          case 'processing':
            return (
              <StudyProcessingTab
                activeStudy={activeStudyForProcessing}
                onNavigateTab={handleNavigateTab}
              />
            );
          case 'entry':
            return (
              <ReportEntryTab
                activeStudy={activeStudyForEntry}
                onNavigateTab={handleNavigateTab}
              />
            );
          case 'verification':
            return (
              <ReportVerificationTab
                activeReport={activeReportForVerification}
                onNavigateTab={handleNavigateTab}
              />
            );
          case 'critical':
            return (
              <CriticalFindingsTab
                onNavigateTab={handleNavigateTab}
              />
            );
          case 'reports':
            return (
              <ImagingReportsTab
                activeReport={activeReportForView}
                onNavigateTab={handleNavigateTab}
              />
            );
          case 'patients':
            return (
              <RadiologyPatientsTab
                activePatient={activePatientForHistory}
                onNavigateTab={handleNavigateTab}
              />
            );
          case 'equipment':
            return (
              <EquipmentTab
                onNavigateTab={handleNavigateTab}
              />
            );
          case 'notifications':
            return (
              <RadiologyNotificationsTab
                onNavigateTab={handleNavigateTab}
              />
            );
          case 'profile':
            return (
              <RadiologyProfileTab
                user={user}
              />
            );
          default:
            return (
              <RadiologyOverviewTab
                user={user}
                onNavigateTab={handleNavigateTab}
              />
            );
        }
      })()}
    </div>
  );
}
