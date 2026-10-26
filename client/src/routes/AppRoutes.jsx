/**
 * Application Routes
 * 
 * Central routing definitions with authentication and role-based guards.
 */

import { Routes, Route, Navigate } from 'react-router-dom';
import ProtectedRoute from './ProtectedRoute';
import RoleRoute from './RoleRoute';

// Layouts
import DashboardLayout from '../layouts/DashboardLayout';

// Public Pages
import LandingPage from '../pages/Landing/LandingPage';
import LoginPage from '../pages/auth/LoginPage';
import ForceChangePasswordPage from '../pages/auth/ForceChangePasswordPage';
import NotFoundPage from '../pages/NotFoundPage';
import UnauthorizedPage from '../pages/UnauthorizedPage';

// Dashboards
import DashboardRedirect from '../pages/dashboards/DashboardRedirect';
import PatientDashboard from '../pages/dashboards/PatientDashboard';
import DoctorDashboard from '../pages/dashboards/DoctorDashboard';
import NurseDashboard from '../pages/dashboards/NurseDashboard';
import ReceptionistDashboard from '../pages/dashboards/ReceptionistDashboard';
import HospitalAdminDashboard from '../pages/dashboards/HospitalAdminDashboard';
import SuperAdminDashboard from '../pages/dashboards/SuperAdminDashboard';
import StaffDashboard from '../pages/dashboards/StaffDashboard';
import PharmacyDashboard from '../pages/dashboards/PharmacyDashboard';
import LabTechnicianDashboard from '../pages/dashboards/LabTechnicianDashboard';
import RadiologyDashboard from '../pages/dashboards/RadiologyDashboard';
import SettingsPage from '../pages/settings/SettingsPage';


export default function AppRoutes() {
  return (
    <Routes>
      {/* ─── Public Landing Page ────────────────────────────── */}
      <Route path="/" element={<LandingPage />} />

      {/* ─── Public Auth Pages (Staff and patients are provisioned by staff) ──────────────── */}
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<Navigate to="/login" replace />} />

      {/* ─── Forced Password Change for Temporary Passwords ──────────────── */}
      <Route
        path="/force-change-password"
        element={
          <ProtectedRoute>
            <ForceChangePasswordPage />
          </ProtectedRoute>
        }
      />

      {/* ─── Protected Role-Based Dashboards ────────────────── */}
      <Route
        element={
          <ProtectedRoute>
            <DashboardLayout />
          </ProtectedRoute>
        }
      >
        {/* Automatic Role-Based Redirector */}
        <Route path="/dashboard" element={<DashboardRedirect />} />

        {/* Global Settings for All Authenticated Roles */}
        <Route path="/dashboard/settings" element={<SettingsPage />} />

        {/* Dedicated Role Dashboards with Role Guards */}
        <Route
          path="/dashboard/patient"
          element={
            <RoleRoute roles={['patient']}>
              <PatientDashboard />
            </RoleRoute>
          }
        />
        <Route
          path="/dashboard/doctor"
          element={
            <RoleRoute roles={['doctor']}>
              <DoctorDashboard />
            </RoleRoute>
          }
        />
        <Route
          path="/dashboard/nurse"
          element={
            <RoleRoute roles={['nurse']}>
              <NurseDashboard />
            </RoleRoute>
          }
        />
        <Route
          path="/dashboard/receptionist"
          element={
            <RoleRoute roles={['receptionist']}>
              <ReceptionistDashboard />
            </RoleRoute>
          }
        />
        <Route
          path="/dashboard/hospital-admin"
          element={
            <RoleRoute roles={['hospital_admin']}>
              <HospitalAdminDashboard />
            </RoleRoute>
          }
        />
        <Route
          path="/dashboard/super-admin"
          element={
            <RoleRoute roles={['super_admin']}>
              <SuperAdminDashboard />
            </RoleRoute>
          }
        />

        {/* Specialized Staff Dashboards */}
        <Route
          path="/dashboard/pharmacist"
          element={
            <RoleRoute roles={['pharmacist', 'super_admin']}>
              <PharmacyDashboard />
            </RoleRoute>
          }
        />
        <Route
          path="/dashboard/pharmacy"
          element={
            <RoleRoute roles={['pharmacist', 'super_admin']}>
              <PharmacyDashboard />
            </RoleRoute>
          }
        />
        <Route
          path="/dashboard/lab"
          element={
            <RoleRoute roles={['lab_technician', 'super_admin']}>
              <LabTechnicianDashboard />
            </RoleRoute>
          }
        />
        <Route
          path="/dashboard/lab-technician"
          element={
            <RoleRoute roles={['lab_technician', 'super_admin']}>
              <LabTechnicianDashboard />
            </RoleRoute>
          }
        />

        <Route
          path="/dashboard/radiology"
          element={
            <RoleRoute roles={['radiology_staff', 'radiologist', 'radiology', 'super_admin']}>
              <RadiologyDashboard />
            </RoleRoute>
          }
        />
        <Route
          path="/dashboard/ot"
          element={
            <RoleRoute roles={['ot_staff']}>
              <StaffDashboard roleKey="ot_staff" />
            </RoleRoute>
          }
        />
        <Route
          path="/dashboard/billing"
          element={
            <RoleRoute roles={['billing_staff']}>
              <StaffDashboard roleKey="billing_staff" />
            </RoleRoute>
          }
        />
        <Route
          path="/dashboard/insurance"
          element={
            <RoleRoute roles={['insurance_staff']}>
              <StaffDashboard roleKey="insurance_staff" />
            </RoleRoute>
          }
        />
        <Route
          path="/dashboard/hr"
          element={
            <RoleRoute roles={['hr_staff']}>
              <StaffDashboard roleKey="hr_staff" />
            </RoleRoute>
          }
        />
        <Route
          path="/dashboard/inventory"
          element={
            <RoleRoute roles={['inventory_staff']}>
              <StaffDashboard roleKey="inventory_staff" />
            </RoleRoute>
          }
        />
        <Route
          path="/dashboard/blood-bank"
          element={
            <RoleRoute roles={['blood_bank_staff']}>
              <StaffDashboard roleKey="blood_bank_staff" />
            </RoleRoute>
          }
        />
        <Route
          path="/dashboard/emergency"
          element={
            <RoleRoute roles={['emergency_staff']}>
              <StaffDashboard roleKey="emergency_staff" />
            </RoleRoute>
          }
        />
      </Route>

      {/* ─── Utility Fallbacks ──────────────────────────────── */}
      <Route path="/unauthorized" element={<UnauthorizedPage />} />
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}
