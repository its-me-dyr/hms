/**
 * HMS Laboratory Diagnostics Workspace
 * 
 * Master Coordinator Component for all 13 Laboratory operational modules:
 * 1.  dashboard      -> LabOverviewTab
 * 2.  requests       -> LabRequestsTab
 * 3.  collection     -> SampleCollectionTab
 * 4.  tracking       -> SampleTrackingTab
 * 5.  catalog        -> TestCatalogTab
 * 6.  processing     -> TestProcessingTab
 * 7.  results        -> ResultsEntryTab
 * 8.  verification   -> ResultVerificationTab
 * 9.  reports        -> LabReportsTab
 * 10. patients       -> LabPatientsTab
 * 11. critical       -> CriticalResultsTab
 * 12. notifications  -> LabNotificationsTab
 * 13. profile        -> LabProfileTab
 */

import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '../../context/useAuth';

// Laboratory Sub-Module Tabs
import LabOverviewTab from './lab/LabOverviewTab';
import LabRequestsTab from './lab/LabRequestsTab';
import SampleCollectionTab from './lab/SampleCollectionTab';
import SampleTrackingTab from './lab/SampleTrackingTab';
import TestCatalogTab from './lab/TestCatalogTab';
import TestProcessingTab from './lab/TestProcessingTab';
import ResultsEntryTab from './lab/ResultsEntryTab';
import ResultVerificationTab from './lab/ResultVerificationTab';
import LabReportsTab from './lab/LabReportsTab';
import LabPatientsTab from './lab/LabPatientsTab';
import CriticalResultsTab from './lab/CriticalResultsTab';
import LabNotificationsTab from './lab/LabNotificationsTab';
import LabProfileTab from './lab/LabProfileTab';

export default function LabTechnicianDashboard() {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get('tab') || 'dashboard';

  // Cross-module contextual state
  const [activeRequestForCollection, setActiveRequestForCollection] = useState(null);
  const [activeSampleForProcessing, setActiveSampleForProcessing] = useState(null);
  const [activeTestForResults, setActiveTestForResults] = useState(null);
  const [activeReportForView, setActiveReportForView] = useState(null);

  // Tab navigation handler
  const handleNavigateTab = (tabId, extraData = null) => {
    if (tabId === 'collection' && extraData) {
      setActiveRequestForCollection(extraData);
    } else if (tabId === 'processing' && extraData) {
      setActiveSampleForProcessing(extraData);
    } else if (tabId === 'results' && extraData) {
      setActiveTestForResults(extraData);
    } else if (tabId === 'reports' && extraData) {
      setActiveReportForView(extraData);
    }
    setSearchParams({ tab: tabId });
  };

  return (
    <div className="lab-portal" style={{ minHeight: '100%', width: '100%', maxWidth: 'none' }}>
      {(() => {
        switch (activeTab) {
          case 'dashboard':
            return (
              <LabOverviewTab
                user={user}
                onNavigateTab={handleNavigateTab}
              />
            );
          case 'requests':
            return (
              <LabRequestsTab
                onNavigateTab={handleNavigateTab}
              />
            );
          case 'collection':
            return (
              <SampleCollectionTab
                activeRequest={activeRequestForCollection}
                onNavigateTab={handleNavigateTab}
              />
            );
          case 'tracking':
            return (
              <SampleTrackingTab
                onNavigateTab={handleNavigateTab}
              />
            );
          case 'catalog':
            return (
              <TestCatalogTab
                onNavigateTab={handleNavigateTab}
              />
            );
          case 'processing':
            return (
              <TestProcessingTab
                activeSample={activeSampleForProcessing}
                onNavigateTab={handleNavigateTab}
              />
            );
          case 'results':
            return (
              <ResultsEntryTab
                activeTest={activeTestForResults}
                onNavigateTab={handleNavigateTab}
              />
            );
          case 'verification':
            return (
              <ResultVerificationTab
                onNavigateTab={handleNavigateTab}
              />
            );
          case 'reports':
            return (
              <LabReportsTab
                activeReport={activeReportForView}
                onNavigateTab={handleNavigateTab}
              />
            );
          case 'patients':
            return (
              <LabPatientsTab
                onNavigateTab={handleNavigateTab}
              />
            );
          case 'critical':
            return (
              <CriticalResultsTab
                onNavigateTab={handleNavigateTab}
              />
            );
          case 'notifications':
            return (
              <LabNotificationsTab
                onNavigateTab={handleNavigateTab}
              />
            );
          case 'profile':
            return (
              <LabProfileTab
                user={user}
              />
            );
          default:
            return (
              <LabOverviewTab
                user={user}
                onNavigateTab={handleNavigateTab}
              />
            );
        }
      })()}
    </div>
  );
}
