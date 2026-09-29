/**
 * Doctor Dashboard Component
 * 
 * Clinical workspace for physicians and medical officers.
 */

import BaseRoleDashboard from './BaseRoleDashboard';
import { Calendar, Users, Clock, FileText, Pill, Stethoscope } from 'lucide-react';

const DOCTOR_CARDS = [
  {
    title: "Today's OPD Queue",
    value: 'No data available yet',
    subtext: '0 patients waiting in triage queue',
    icon: Clock,
    color: '#059669',
    bg: 'rgba(5, 150, 105, 0.1)',
  },
  {
    title: 'Assigned Inpatients',
    value: 'No data available yet',
    subtext: '0 IPD admissions under care',
    icon: Users,
    color: 'var(--color-primary)',
    bg: 'rgba(8, 145, 178, 0.1)',
  },
  {
    title: 'Pending Lab Reviews',
    value: 'No data available yet',
    subtext: '0 diagnostic investigations pending review',
    icon: FileText,
    color: 'var(--color-info)',
    bg: 'rgba(37, 99, 235, 0.1)',
  },
  {
    title: 'Follow-ups Scheduled',
    value: 'No data available yet',
    subtext: '0 follow-up visits today',
    icon: Calendar,
    color: '#d97706',
    bg: 'rgba(217, 119, 6, 0.1)',
  },
];

const DOCTOR_QUICK_ACTIONS = [
  { label: 'Start Next Consultation', targetTab: 'consultations', icon: Stethoscope },
  { label: 'Open Patient Queue', targetTab: 'queue', icon: Clock },
  { label: 'Write Prescription', targetTab: 'prescriptions', icon: Pill },
  { label: 'View Appointment Calendar', targetTab: 'appointments', icon: Calendar },
];

export default function DoctorDashboard() {
  return (
    <BaseRoleDashboard
      roleKey="doctor"
      customCards={DOCTOR_CARDS}
      quickActions={DOCTOR_QUICK_ACTIONS}
    />
  );
}
