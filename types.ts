
export enum PatientStatus {
  SCREENING = 'Screening',
  ENROLLED = 'Enrolled',
  ACTIVE = 'Active',
  COMPLETED = 'Completed',
  WITHDRAWN = 'Withdrawn',
  SCREEN_FAILED = 'Screen Failed'
}

export enum Gender {
  MALE = 'Male',
  FEMALE = 'Female',
  OTHER = 'Other'
}

export interface Visit {
  id: string;
  name: string;
  date: string; // ISO date string
  status: 'Scheduled' | 'Completed' | 'Missed' | 'Overdue';
  notes?: string;
}

export interface AdverseEvent {
  id: string;
  description: string;
  severity: 'Mild' | 'Moderate' | 'Severe' | 'Life-Threatening';
  dateReported: string;
  status: 'Resolved' | 'Ongoing';
}

// For AI Analysis
export interface EligibilityResult {
  isEligible: boolean;
  confidenceScore: number; // 0-100
  reasoning: string; // Simplified from string[] to string for easier storage/display
  flaggedCriteria: string[];
  timestamp?: string;
}

export interface Patient {
  id: string;
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  gender: Gender;
  address?: string;
  status: PatientStatus;
  siteId: string;
  studyId: string; // Linked to specific study
  enrollmentDate?: string;
  contactEmail?: string;
  contactPhone?: string;
  visits: Visit[];
  adverseEvents: AdverseEvent[];
  medicalHistorySummary?: string;
  eligibilityAnalysis?: EligibilityResult; // Persisted AI analysis
}

export interface Investigator {
  id: string;
  name: string;
  role: 'Principal Investigator' | 'Sub-Investigator' | 'Study Coordinator' | 'Nurse';
  email: string;
}

export interface StudyFile {
  name: string;
  type: string;
  content?: string; // Text content for AI analysis
}

export interface StudyDetails {
  id: string;
  protocolNumber: string;
  title: string;
  phase: 'I' | 'II' | 'III' | 'IV';
  sponsor: string;
  description: string;
  inclusionCriteria: string;
  exclusionCriteria: string;
  recruitmentTarget: number;
  status: 'Pending' | 'Active' | 'Closed';
  investigators: Investigator[];
  files: StudyFile[];
}

export interface Site {
  id: string;
  name: string;
  location: string;
  principalInvestigator: string;
}

// For Dashboard Alerts
export interface TaskAlert {
  id: string;
  category: 'Appointment' | 'Adverse Event' | 'New Patient' | 'Inquiry' | 'General';
  priority: 'High' | 'Medium' | 'Low';
  message: string;
  timestamp: string;
  read: boolean;
  patientId?: string;
  studyId?: string;
}

// AI Receptionist Configuration
export interface ReceptionistConfig {
  clinicName: string;
  botName: string;
  tone: 'Professional' | 'Empathetic' | 'Energetic' | 'Strict';
  customGreeting: string;
  emergencyContact: string;
  enableAfterHours: boolean;
}

// Calendar Integration Types
export interface CalendarIntegration {
  isConnected: boolean;
  provider: 'Google' | 'Outlook' | null;
  accountName: string | null;
  lastSynced: string | null;
  syncDirection: 'Two-Way' | 'Import Only';
}

export interface ExternalEvent {
  id: string;
  title: string;
  date: string;
  time: string;
  source: 'Google' | 'Outlook';
  isAllDay?: boolean;
}
