
import React, { useState, useMemo, useEffect } from 'react';
import { Sidebar } from './components/Sidebar';
import { Dashboard } from './components/Dashboard';
import { PatientManager } from './components/PatientManager';
import { CalendarView } from './components/CalendarView';
import { ReportsView } from './components/ReportsView';
import { SettingsView } from './components/SettingsView';
import { StudyManager } from './components/StudyManager';
import { VoiceReceptionist } from './components/VoiceReceptionist';
import { AddStudyModal } from './components/AddStudyModal';
import { GoogleOAuthCallback } from './components/GoogleOAuthCallback';
import { MOCK_PATIENTS, MOCK_STUDIES } from './constants';
import { Patient, Visit, TaskAlert, ReceptionistConfig, StudyDetails, AdverseEvent, CalendarIntegration, ExternalEvent } from './types';
import { GoogleCalendarService } from './services/googleCalendarService';

const App: React.FC = () => {
  const [currentView, setCurrentView] = useState('dashboard');
  
  // Multi-Study State
  const [studies, setStudies] = useState<StudyDetails[]>(MOCK_STUDIES);
  const [currentStudyId, setCurrentStudyId] = useState<string>(MOCK_STUDIES[0].id);
  const [isAddStudyModalOpen, setIsAddStudyModalOpen] = useState(false);

  // UI Modal State (Lifted for Voice Control)
  const [isAddPatientModalOpen, setIsAddPatientModalOpen] = useState(false);
  const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false);

  // Patient State
  const [patients, setPatients] = useState<Patient[]>(MOCK_PATIENTS);
  const [selectedPatientId, setSelectedPatientId] = useState<string | null>(null);
  
  // Derived State
  const currentStudy = useMemo(() => 
    studies.find(s => s.id === currentStudyId) || studies[0]
  , [studies, currentStudyId]);

  const currentStudyPatients = useMemo(() => 
    patients.filter(p => p.studyId === currentStudyId)
  , [patients, currentStudyId]);

  const [currentUserId] = useState('demo-user-1');
  const calendarService = useMemo(() => new GoogleCalendarService(currentUserId), [currentUserId]);

  // Calendar Integration State
  const [calendarIntegration, setCalendarIntegration] = useState<CalendarIntegration>({
    isConnected: false,
    provider: null,
    accountName: null,
    lastSynced: null,
    syncDirection: 'Two-Way',
    userId: currentUserId
  });

  const [externalEvents, setExternalEvents] = useState<ExternalEvent[]>([]);
  const [isOAuthInProgress, setIsOAuthInProgress] = useState(false);

  useEffect(() => {
    const checkCalendarConnection = async () => {
      const status = await calendarService.getConnectionStatus();
      if (status.connected) {
        setCalendarIntegration({
          isConnected: true,
          provider: 'Google',
          accountName: status.email || null,
          lastSynced: status.lastSynced || null,
          syncDirection: 'Two-Way',
          userId: currentUserId
        });
        await fetchCalendarEvents();
      }
    };
    checkCalendarConnection();
  }, [calendarService, currentUserId]);

  useEffect(() => {
    const handleOAuthCode = async (event: any) => {
      const { code } = event.detail;
      const result = await calendarService.handleOAuthCallback(code);

      if (result.success && result.email) {
        setCalendarIntegration({
          isConnected: true,
          provider: 'Google',
          accountName: result.email,
          lastSynced: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
          syncDirection: 'Two-Way',
          userId: currentUserId
        });
        await fetchCalendarEvents();
        setIsOAuthInProgress(false);
      }
    };

    window.addEventListener('google-oauth-code', handleOAuthCode);
    return () => window.removeEventListener('google-oauth-code', handleOAuthCode);
  }, [calendarService, currentUserId]);

  const fetchCalendarEvents = async () => {
    try {
      const today = new Date();
      const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
      const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);

      const events = await calendarService.fetchEvents(startOfMonth, endOfMonth);
      setExternalEvents(events);
    } catch (error) {
      console.error('Failed to fetch calendar events:', error);
    }
  };

  // Alerts State
  // We start with manual alerts, but we will also generate system alerts dynamically
  const [manualAlerts, setManualAlerts] = useState<TaskAlert[]>([
    { 
      id: 'ALT-001', 
      category: 'Adverse Event', 
      priority: 'High', 
      message: 'Patient 101-002 reported "severe migraine" during screening call.', 
      timestamp: '10:30 AM', 
      read: false, 
      patientId: '101-002',
      studyId: 'STUDY-001'
    }
  ]);

  // Dynamic System Alerts Generation
  const systemAlerts = useMemo(() => {
    const alerts: TaskAlert[] = [];
    const today = new Date();
    today.setHours(0,0,0,0);

    patients.forEach(p => {
      // 1. Check for Overdue Visits
      p.visits.forEach(v => {
        if (v.status === 'Scheduled') {
          const vDate = new Date(v.date);
          // Check if date is strictly before today (Overdue)
          // Note: v.date is YYYY-MM-DD string, new Date(v.date) treats as UTC usually, but comparing to local today needs care.
          // Simple string comparison for YYYY-MM-DD works well for "past date"
          const visitDateString = v.date; 
          const todayString = today.toISOString().split('T')[0];

          if (visitDateString < todayString) {
            alerts.push({
              id: `sys-overdue-${p.id}-${v.id}`,
              category: 'Appointment',
              priority: 'High',
              message: `OVERDUE: ${p.firstName} ${p.lastName} - ${v.name} (${v.date})`,
              timestamp: '08:00 AM',
              read: false,
              patientId: p.id,
              studyId: p.studyId
            });
          } else if (visitDateString === todayString) {
            alerts.push({
              id: `sys-today-${p.id}-${v.id}`,
              category: 'Appointment',
              priority: 'Medium',
              message: `Visit Today: ${p.firstName} ${p.lastName} - ${v.name}`,
              timestamp: '09:00 AM',
              read: false,
              patientId: p.id,
              studyId: p.studyId
            });
          }
        }
      });

      // 2. Check for Screening Patients needing Eligibility Check
      if (p.status === 'Screening' && !p.eligibilityAnalysis) {
        alerts.push({
          id: `sys-screen-${p.id}`,
          category: 'New Patient',
          priority: 'Medium',
          message: `Action Required: Eligibility Check for ${p.firstName} ${p.lastName}`,
          timestamp: 'Pending',
          read: false,
          patientId: p.id,
          studyId: p.studyId
        });
      }
    });
    
    // Sort by priority (High first)
    return alerts.sort((a, b) => (a.priority === 'High' ? -1 : 1));
  }, [patients]);

  // Combine Manual and System Alerts
  const allAlerts = useMemo(() => {
    return [...manualAlerts, ...systemAlerts];
  }, [manualAlerts, systemAlerts]);

  const currentStudyAlerts = useMemo(() => 
    allAlerts.filter(a => !a.studyId || a.studyId === currentStudyId)
  , [allAlerts, currentStudyId]);
  
  // AI Receptionist Configuration State
  const [receptionistConfig, setReceptionistConfig] = useState<ReceptionistConfig>({
    clinicName: 'Nexus Clinical Trials',
    botName: 'Nexus',
    tone: 'Professional',
    customGreeting: 'Thank you for calling Nexus Clinical. How can I help you today?',
    emergencyContact: '911',
    enableAfterHours: false
  });

  // Actions
  const handleAddStudy = (newStudy: StudyDetails) => {
    setStudies(prev => [...prev, newStudy]);
    setCurrentStudyId(newStudy.id);
    setIsAddStudyModalOpen(false);
  };

  const handleUpdateStudy = (updatedStudy: StudyDetails) => {
    setStudies(prev => prev.map(s => s.id === updatedStudy.id ? updatedStudy : s));
  };

  const handleAddPatient = (newPatient: Patient) => {
    const patientWithStudy = { ...newPatient, studyId: currentStudyId };
    setPatients(prev => [...prev, patientWithStudy]);
    
    handleAddAlert({
      category: 'New Patient',
      priority: 'Medium',
      message: `New patient registered: ${newPatient.firstName} ${newPatient.lastName}`,
      patientId: newPatient.id,
      studyId: currentStudyId
    });
  };

  const handleUpdatePatient = (updatedPatient: Patient) => {
    setPatients(prev => prev.map(p => p.id === updatedPatient.id ? updatedPatient : p));
  };

  const handleScheduleVisit = async (patientId: string, newVisit: Omit<Visit, 'id'>) => {
    const visit: Visit = {
      ...newVisit,
      id: `V-${Date.now()}`
    };

    const patient = patients.find(p => p.id === patientId);

    if (calendarIntegration.isConnected && patient) {
      const result = await calendarService.createEvent(
        visit,
        `${patient.firstName} ${patient.lastName}`,
        patient.studyId,
        patient.id
      );

      if (result.success && result.eventId) {
        visit.googleEventId = result.eventId;
      }
    }

    setPatients(prev => prev.map(p => {
      if (p.id === patientId) {
        const updatedVisits = [...p.visits, visit].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
        return { ...p, visits: updatedVisits };
      }
      return p;
    }));

    handleAddAlert({
      category: 'Appointment',
      priority: 'Low',
      message: `Visit scheduled for ${patient?.firstName} ${patient?.lastName} on ${newVisit.date}`,
      patientId,
      studyId: patient?.studyId
    });
  };

  const handleRescheduleVisit = (patientId: string, visitId: string, newDate: string) => {
    setPatients(prev => prev.map(p => {
      if (p.id === patientId) {
        const updatedVisits = p.visits.map(v => {
          if (v.id === visitId) {
            return { ...v, date: newDate, status: 'Scheduled' as const };
          }
          return v;
        }).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
        return { ...p, visits: updatedVisits };
      }
      return p;
    }));
    
    const patient = patients.find(p => p.id === patientId);
    handleAddAlert({
      category: 'Appointment',
      priority: 'Medium',
      message: `Visit rescheduled for ${patient?.firstName} ${patient?.lastName} to ${newDate}`,
      patientId,
      studyId: patient?.studyId
    });
  };

  const handleAddAdverseEvent = (patientId: string, aeData: Omit<AdverseEvent, 'id'>) => {
    setPatients(prev => prev.map(p => {
      if (p.id === patientId) {
        const newAe: AdverseEvent = {
          ...aeData,
          id: `AE-${Date.now()}`
        };
        return { ...p, adverseEvents: [newAe, ...p.adverseEvents] };
      }
      return p;
    }));

    const patient = patients.find(p => p.id === patientId);
    handleAddAlert({
      category: 'Adverse Event',
      priority: aeData.severity === 'Severe' || aeData.severity === 'Life-Threatening' ? 'High' : 'Medium',
      message: `New Adverse Event: ${aeData.description} (${aeData.severity})`,
      patientId,
      studyId: patient?.studyId
    });
  };

  const handleAddAlert = (alertData: Omit<TaskAlert, 'id' | 'timestamp' | 'read'>) => {
    const newAlert: TaskAlert = {
      ...alertData,
      id: `ALT-${Date.now()}`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      read: false
    };
    setManualAlerts(prev => [newAlert, ...prev]);
  };

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden font-sans text-slate-900">
      <Sidebar 
        activeView={currentView} 
        onChangeView={setCurrentView} 
        studies={studies}
        currentStudyId={currentStudyId}
        onSwitchStudy={setCurrentStudyId}
        onAddStudy={() => setIsAddStudyModalOpen(true)}
      />
      
      <main className="flex-1 flex flex-col h-full overflow-hidden relative">
        <div className="flex-1 p-6 overflow-hidden">
          {currentView === 'dashboard' && (
            <Dashboard 
              patients={currentStudyPatients} 
              alerts={currentStudyAlerts} 
              studyDetails={currentStudy}
              onChangeView={setCurrentView}
            />
          )}
          {currentView === 'study' && (
            <StudyManager 
              study={currentStudy} 
              onUpdateStudy={handleUpdateStudy} 
            />
          )}
          {currentView === 'patients' && (
            <PatientManager 
              patients={currentStudyPatients} 
              studyDetails={currentStudy}
              onAddPatient={handleAddPatient}
              onUpdatePatient={handleUpdatePatient}
              selectedPatientId={selectedPatientId}
              setSelectedPatientId={setSelectedPatientId}
              isAddModalOpen={isAddPatientModalOpen}
              setIsAddModalOpen={setIsAddPatientModalOpen}
            />
          )}
          {currentView === 'visits' && (
            <CalendarView
              patients={currentStudyPatients}
              onScheduleVisit={handleScheduleVisit}
              isScheduleModalOpen={isScheduleModalOpen}
              setIsScheduleModalOpen={setIsScheduleModalOpen}
              externalEvents={externalEvents}
              calendarIntegration={calendarIntegration}
              onConnectCalendar={() => {
                const authUrl = calendarService.getAuthUrl();
                window.location.href = authUrl;
                setIsOAuthInProgress(true);
              }}
              onRefreshCalendar={fetchCalendarEvents}
            />
          )}
          {currentView === 'reports' && (
             <ReportsView 
               patients={currentStudyPatients} 
               onReportAE={handleAddAdverseEvent}
             />
          )}
          {currentView === 'settings' && (
             <SettingsView
                receptionistConfig={receptionistConfig}
                onUpdateConfig={setReceptionistConfig}
                calendarIntegration={calendarIntegration}
                onConnectCalendar={async () => {
                  const authUrl = calendarService.getAuthUrl();
                  window.location.href = authUrl;
                  setIsOAuthInProgress(true);
                }}
                onDisconnectCalendar={async () => {
                  await calendarService.disconnect();
                  setCalendarIntegration({
                    isConnected: false,
                    provider: null,
                    accountName: null,
                    lastSynced: null,
                    syncDirection: 'Two-Way',
                    userId: currentUserId
                  });
                  setExternalEvents([]);
                }}
                onRefreshCalendar={fetchCalendarEvents}
             />
          )}
        </div>

        {/* Global Voice Assistant - Aware of current study context and UI control */}
        <VoiceReceptionist 
          patients={currentStudyPatients}
          studyDetails={currentStudy}
          receptionistConfig={receptionistConfig}
          onScheduleVisit={handleScheduleVisit}
          onRescheduleVisit={handleRescheduleVisit}
          onAddPatient={handleAddPatient}
          onAddAlert={(alert) => handleAddAlert({...alert, studyId: currentStudyId})}
          onReportAE={handleAddAdverseEvent}
          onChangeView={setCurrentView}
          onSelectPatient={setSelectedPatientId}
          onOpenModal={(type) => {
            if (type === 'add_patient') setIsAddPatientModalOpen(true);
            if (type === 'schedule_visit') setIsScheduleModalOpen(true);
          }}
        />

        {/* OAuth Callback Handler */}
        {(window.location.search.includes('code=') || isOAuthInProgress) && (
          <GoogleOAuthCallback
            onSuccess={(email) => {
              console.log('OAuth success:', email);
            }}
            onError={(error) => {
              console.error('OAuth error:', error);
              setIsOAuthInProgress(false);
            }}
          />
        )}

        {/* Modals */}
        {isAddStudyModalOpen && (
          <AddStudyModal
            onClose={() => setIsAddStudyModalOpen(false)}
            onAdd={handleAddStudy}
          />
        )}
      </main>
    </div>
  );
};

export default App;
