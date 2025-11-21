
import React, { useState, useRef, useEffect } from 'react';
import { Mic, MicOff, Loader2, Volume2, MessageSquare, Phone, User, ShieldCheck, Smartphone, X, Zap } from 'lucide-react';
import { GoogleGenAI, LiveServerMessage, Modality, Type, FunctionDeclaration } from "@google/genai";
import { Patient, Visit, PatientStatus, Gender, TaskAlert, ReceptionistConfig, StudyDetails, AdverseEvent } from '../types';

interface VoiceReceptionistProps {
  patients: Patient[];
  studyDetails: StudyDetails;
  receptionistConfig: ReceptionistConfig;
  onScheduleVisit: (patientId: string, visit: Omit<Visit, 'id'>) => void;
  onRescheduleVisit: (patientId: string, visitId: string, newDate: string) => void;
  onAddPatient: (patient: Patient) => void;
  onAddAlert: (alert: Omit<TaskAlert, 'id' | 'timestamp' | 'read'>) => void;
  onReportAE: (patientId: string, ae: Omit<AdverseEvent, 'id'>) => void;
  onChangeView: (view: string) => void;
  onSelectPatient: (id: string | null) => void;
  onOpenModal: (type: 'add_patient' | 'schedule_visit') => void;
}

type ReceptionistMode = 'idle' | 'staff' | 'patient_simulator';

export const VoiceReceptionist: React.FC<VoiceReceptionistProps> = ({ 
  patients, 
  studyDetails,
  receptionistConfig,
  onScheduleVisit,
  onRescheduleVisit,
  onAddPatient,
  onAddAlert,
  onReportAE,
  onChangeView,
  onSelectPatient,
  onOpenModal
}) => {
  const [mode, setMode] = useState<ReceptionistMode>('idle');
  const [isConnecting, setIsConnecting] = useState(false);
  const [audioLevel, setAudioLevel] = useState(0);
  const [activePatientId, setActivePatientId] = useState<string | null>(null);
  
  // Refs to handle stale closures in callbacks
  const patientsRef = useRef(patients);
  const activePatientIdRef = useRef<string | null>(null);

  useEffect(() => {
    patientsRef.current = patients;
  }, [patients]);

  useEffect(() => {
    activePatientIdRef.current = activePatientId;
  }, [activePatientId]);
  
  // Audio Context Refs
  const audioContextRef = useRef<AudioContext | null>(null);
  const inputSourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const nextStartTimeRef = useRef<number>(0);
  const sourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());
  
  // Session Ref
  const sessionRef = useRef<any>(null);
  const connectionTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Tools Definition
  const tools: FunctionDeclaration[] = [
    {
      name: 'navigate_app',
      description: 'Navigate the application to a specific main view (dashboard, patients, visits, reports, study, settings).',
      parameters: {
        type: Type.OBJECT,
        properties: {
          view: { type: Type.STRING, enum: ['dashboard', 'patients', 'visits', 'reports', 'study', 'settings'] }
        },
        required: ['view']
      }
    },
    {
      name: 'open_action_modal',
      description: 'Open a specific action modal in the UI to help the user perform a task visually. Use this when the user wants to manually add a patient or manually schedule a visit.',
      parameters: {
        type: Type.OBJECT,
        properties: {
          modalType: { type: Type.STRING, enum: ['add_patient', 'schedule_visit'] }
        },
        required: ['modalType']
      }
    },
    {
      name: 'view_patient_details',
      description: 'Navigate to the patient detail view for a specific patient ID.',
      parameters: {
        type: Type.OBJECT,
        properties: {
          patientId: { type: Type.STRING }
        },
        required: ['patientId']
      }
    },
    {
      name: 'verify_patient',
      description: 'Verify a patient identity by name and date of birth. Upon success, the patient is considered "verified" for the remainder of the session, and you can perform actions for them without asking for ID again.',
      parameters: {
        type: Type.OBJECT,
        properties: {
          name: { type: Type.STRING, description: 'The full name of the patient.' },
          dob: { type: Type.STRING, description: 'The date of birth (YYYY-MM-DD) or approximate year.' }
        },
        required: ['name']
      }
    },
    {
      name: 'register_new_patient',
      description: 'Register a new patient in the system. Use this when a caller identifies as a new patient. After registration, the patient is automatically verified.',
      parameters: {
        type: Type.OBJECT,
        properties: {
          firstName: { type: Type.STRING },
          lastName: { type: Type.STRING },
          dateOfBirth: { type: Type.STRING, description: 'YYYY-MM-DD' },
          gender: { type: Type.STRING, enum: ['Male', 'Female', 'Other'], description: "Inferred from voice or 'Other' if unknown." }
        },
        required: ['firstName', 'lastName', 'dateOfBirth']
      }
    },
    {
      name: 'get_my_visits',
      description: 'Get a list of past and upcoming visits for the currently verified patient. Use this if the user asks "When is my next appointment?" or "What visits have I done?".',
      parameters: {
        type: Type.OBJECT,
        properties: {
          dummy: { type: Type.STRING, description: "Optional parameter to ensure schema validity" }
        }, 
      }
    },
    {
      name: 'find_patient_internal', // For staff mode only
      description: 'Look up a patient by name to retrieve status and details (Staff Internal Use Only). Sets the context to this patient for follow-up questions.',
      parameters: {
        type: Type.OBJECT,
        properties: {
          name: { type: Type.STRING }
        },
        required: ['name']
      }
    },
    {
      name: 'schedule_visit',
      description: 'Schedule a new visit. If the patient is already verified in this session, you do NOT need to ask for their name/ID again.',
      parameters: {
        type: Type.OBJECT,
        properties: {
          patientId: { type: Type.STRING, description: 'The patient ID (optional if patient is already verified)' },
          date: { type: Type.STRING, description: 'YYYY-MM-DD format' },
          visitType: { type: Type.STRING }
        },
        required: ['date', 'visitType']
      }
    },
    {
      name: 'reschedule_visit',
      description: 'Reschedule an existing visit. If the patient is already verified, ID is not required.',
      parameters: {
        type: Type.OBJECT,
        properties: {
          patientId: { type: Type.STRING, description: 'The patient ID (optional if patient is already verified)' },
          visitId: { type: Type.STRING, description: 'The ID of the visit to reschedule (optional, AI can infer if only one upcoming visit)' },
          newDate: { type: Type.STRING, description: 'YYYY-MM-DD format' }
        },
        required: ['newDate']
      }
    },
    {
      name: 'log_call_outcome',
      description: 'Log the outcome of a call as a dashboard alert/task.',
      parameters: {
        type: Type.OBJECT,
        properties: {
          category: { type: Type.STRING, enum: ['Adverse Event', 'New Patient', 'Inquiry', 'Appointment', 'General'] },
          priority: { type: Type.STRING, enum: ['High', 'Medium', 'Low'] },
          message: { type: Type.STRING, description: "A concise summary of the alert." },
          patientId: { type: Type.STRING, description: "Optional patient ID if known." }
        },
        required: ['category', 'priority', 'message']
      }
    },
    {
      name: 'report_adverse_event',
      description: 'Report a clinical Adverse Event. Use this when a patient reports side effects, pain, hospitalization, or new medical conditions.',
      parameters: {
        type: Type.OBJECT,
        properties: {
          patientId: { type: Type.STRING, description: "Optional patient ID if known." },
          description: { type: Type.STRING, description: "Description of the event" },
          severity: { type: Type.STRING, enum: ['Mild', 'Moderate', 'Severe', 'Life-Threatening'] }
        },
        required: ['description', 'severity']
      }
    },
    {
      name: 'get_study_details',
      description: 'Get details about the current clinical study, including title, phase, description, status, and recruitment progress. Useful for answering general inquiries.',
      parameters: {
        type: Type.OBJECT,
        properties: {
           query: { type: Type.STRING, description: "Specific aspect of study to retrieve, or null for general summary" }
        }, 
      }
    }
  ];

  // Tool Implementations
  const handleToolCall = (functionCalls: any[], currentMode: ReceptionistMode) => {
    if (!functionCalls || functionCalls.length === 0) return;

    const functionResponses = functionCalls.map(fc => {
      let result;
      try {
        // Use Refs to access current state inside callback closure
        const currentPatients = patientsRef.current;
        const currentActiveId = activePatientIdRef.current;
        
        // Context aware patient ID
        const targetPatientId = fc.args.patientId || currentActiveId;

        switch (fc.name) {
          case 'navigate_app':
            onChangeView(fc.args.view);
            result = { success: true, message: `Navigated to ${fc.args.view} view.` };
            break;

          case 'open_action_modal':
            if (fc.args.modalType === 'add_patient') {
              onChangeView('patients');
              onOpenModal('add_patient');
              result = { success: true, message: "Navigated to Patients view and opened 'Add Patient' form." };
            } else if (fc.args.modalType === 'schedule_visit') {
              onChangeView('visits');
              onOpenModal('schedule_visit');
              result = { success: true, message: "Navigated to Calendar view and opened 'Schedule Visit' modal." };
            } else {
              result = { success: false, message: "Unknown modal type" };
            }
            break;
            
          case 'view_patient_details':
            onSelectPatient(fc.args.patientId);
            onChangeView('patients');
            const pt = currentPatients.find(p => p.id === fc.args.patientId);
            result = { success: true, message: `Navigated to details for patient ${pt ? pt.firstName + ' ' + pt.lastName : fc.args.patientId}` };
            break;

          case 'verify_patient':
            const searchName = fc.args.name.toLowerCase();
            const found = currentPatients.find(p => {
              const fullName = `${p.firstName} ${p.lastName}`.toLowerCase();
              return fullName.includes(searchName) || 
                     (p.contactEmail && p.contactEmail.toLowerCase().includes(searchName));
            });
            
            if (found) {
              setActivePatientId(found.id);
              activePatientIdRef.current = found.id; // Update ref immediately for subsequent tools in same turn
              result = { 
                success: true, 
                message: `Identity verified. Patient: ${found.firstName} ${found.lastName} (ID: ${found.id}). You may now proceed with scheduling, checking visits, or reporting events for this patient.`, 
                patientId: found.id 
              };
            } else {
              result = { success: false, message: "Patient not found with those details. Please ask for clarification or spelling." };
            }
            break;

          case 'register_new_patient':
            const newId = `106-${Math.floor(Math.random() * 10000)}`;
            const newPatient: Patient = {
                id: newId,
                firstName: fc.args.firstName,
                lastName: fc.args.lastName,
                dateOfBirth: fc.args.dateOfBirth,
                gender: (fc.args.gender as Gender) || Gender.OTHER,
                status: PatientStatus.SCREENING,
                siteId: 'SITE-001', // Default to first site
                studyId: studyDetails.id,
                enrollmentDate: new Date().toISOString().split('T')[0],
                visits: [],
                adverseEvents: []
            };
            onAddPatient(newPatient);
            
            // Update local state refs immediately so subsequent tools (like schedule_visit) can use it
            setActivePatientId(newId);
            activePatientIdRef.current = newId;
            
            result = { 
                success: true, 
                patientId: newId, 
                message: `Patient ${fc.args.firstName} ${fc.args.lastName} registered with ID ${newId}. You can now schedule their Screening visit.` 
            };
            break;

          case 'find_patient_internal':
             const internalMatches = currentPatients.filter(p => 
                `${p.firstName} ${p.lastName}`.toLowerCase().includes(fc.args.name.toLowerCase())
             );
             if (internalMatches.length === 1) {
               setActivePatientId(internalMatches[0].id);
               activePatientIdRef.current = internalMatches[0].id;
               // Auto navigate to patient if only one found? Optional, but cool.
               onSelectPatient(internalMatches[0].id);
               onChangeView('patients');
             }
             result = { 
                count: internalMatches.length,
                patients: internalMatches.map(p => ({ 
                    id: p.id, 
                    name: `${p.firstName} ${p.lastName}`,
                    status: p.status,
                    dob: p.dateOfBirth
                })),
                message: internalMatches.length === 1 ? `One patient found: ${internalMatches[0].firstName} ${internalMatches[0].lastName}. I have pulled up their record.` : "Multiple patients found. Please clarify."
             };
             break;
          
          case 'get_my_visits':
            if (!targetPatientId) {
              result = { error: "No patient verified. Please verify identity first." };
            } else {
              // Use ref to find patient to ensure we see newly added ones
              const p = patientsRef.current.find(pt => pt.id === targetPatientId);
              result = p ? { 
                  patientName: `${p.firstName} ${p.lastName}`,
                  visits: p.visits,
                  message: `Found ${p.visits.length} visits for ${p.firstName} ${p.lastName}.`
              } : { error: "Patient not found" };
            }
            break;

          case 'schedule_visit':
            if (!targetPatientId && !fc.args.patientId) {
              result = { error: "Patient identity missing." };
            } else {
              onScheduleVisit(targetPatientId || fc.args.patientId, {
                name: fc.args.visitType,
                date: fc.args.date,
                status: 'Scheduled',
                notes: currentMode === 'patient_simulator' ? 'Scheduled via Phone' : 'Scheduled via Staff Voice'
              });
              result = { success: true, message: `Visit scheduled for ${fc.args.date}.` };
            }
            break;

          case 'reschedule_visit':
            if (!targetPatientId && !fc.args.patientId) {
               result = { error: "Patient identity missing." };
            } else {
               onRescheduleVisit(targetPatientId || fc.args.patientId, fc.args.visitId || 'V1', fc.args.newDate);
               result = { success: true, message: `Visit rescheduled to ${fc.args.newDate}.` };
            }
            break;

          case 'log_call_outcome':
            onAddAlert({
              category: fc.args.category,
              priority: fc.args.priority,
              message: fc.args.message,
              patientId: fc.args.patientId
            });
            result = { success: true, message: "Alert logged to dashboard." };
            break;

          case 'report_adverse_event':
            if (!targetPatientId) {
               result = { error: "Patient identity missing. Verify patient first." };
            } else {
               onReportAE(targetPatientId, {
                  description: fc.args.description,
                  severity: fc.args.severity,
                  dateReported: new Date().toISOString().split('T')[0],
                  status: 'Ongoing'
               });
               result = { success: true, message: "Adverse Event reported and logged." };
            }
            break;

          case 'get_study_details':
             const enrolledCount = currentPatients.filter(p => ['Active', 'Completed', 'Enrolled'].includes(p.status)).length;
             result = {
               title: studyDetails.title,
               protocolNumber: studyDetails.protocolNumber,
               phase: studyDetails.phase,
               status: studyDetails.status,
               description: studyDetails.description,
               recruitment: {
                 enrolled: enrolledCount,
                 target: studyDetails.recruitmentTarget,
                 percentage: Math.round((enrolledCount / studyDetails.recruitmentTarget) * 100) + '%'
               },
               sponsor: studyDetails.sponsor
             };
             break;

          default:
            result = { error: 'Unknown function' };
        }
      } catch (e) {
        console.error("Tool execution error:", e);
        result = { error: String(e) };
      }

      return {
        id: fc.id,
        name: fc.name,
        response: { result }
      };
    });

    if (sessionRef.current) {
      sessionRef.current.then((session: any) => {
        session.sendToolResponse({ functionResponses });
      });
    }
  };

  const triggerGreeting = async () => {
     if (sessionRef.current) {
         try {
             // Removing session.send as it is not supported in LiveSession
             // const session = await sessionRef.current;
             // session.send({ parts: [{ text: "User connected. Say your greeting now." }] });
         } catch (e) {
             console.error("Failed to trigger manual greeting", e);
         }
     }
  };

  const startSession = async (selectedMode: ReceptionistMode) => {
    setIsConnecting(true);
    setActivePatientId(null); // Reset verified patient on new call
    activePatientIdRef.current = null;
    
    // Set connection timeout
    if (connectionTimeoutRef.current) clearTimeout(connectionTimeoutRef.current);
    connectionTimeoutRef.current = setTimeout(() => {
        if (isConnecting) {
            console.warn("Connection timed out");
            setIsConnecting(false);
            setMode('idle');
            alert("Connection timed out. Please check your network or permissions.");
            stopSession();
        }
    }, 15000);

    try {
      const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
      if (!apiKey) {
        alert('Gemini API key not configured. Voice features require a valid API key.');
        setIsConnecting(false);
        setMode('idle');
        return;
      }
      const ai = new GoogleGenAI({ apiKey });
      
      // Initialize Audio
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
      // Explicitly resume AudioContext as browsers often suspend it
      await audioContextRef.current.resume();

      streamRef.current = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      // Input Pipeline
      const inputContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
      await inputContext.resume();
      
      inputSourceRef.current = inputContext.createMediaStreamSource(streamRef.current);
      processorRef.current = inputContext.createScriptProcessor(4096, 1, 1);
      
      // Determine Instruction based on Mode and Dynamic Study Data
      let systemInstruction = "";
      let voiceName = "Kore"; 
      
      // Get today's date for relative date calculations
      const todayStr = new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

      const protocolContext = `
        ACTIVE STUDY: ${studyDetails.title} (${studyDetails.protocolNumber})
        DESCRIPTION: ${studyDetails.description}
        
        INCLUSION CRITERIA (For Reference only - answer questions if asked, but do not enforce screening):
        ${studyDetails.inclusionCriteria}

        EXCLUSION CRITERIA (For Reference only):
        ${studyDetails.exclusionCriteria}
      `;

      if (selectedMode === 'patient_simulator') {
        voiceName = "Fenrir"; 
        systemInstruction = `
          You are ${receptionistConfig.botName}, the automated telephone receptionist for ${receptionistConfig.clinicName}.
          You are answering an incoming phone call from a patient regarding the study: ${studyDetails.title}.
          
          CURRENT DATE: ${todayStr}. Use this to calculate dates for "next Tuesday", "tomorrow", etc.

          YOUR TONE:
          ${receptionistConfig.tone}

          YOUR GOAL:
          Provide excellent customer service, verify patient identity securely, and assist with scheduling.
          Do NOT perform complex medical screening or eligibility checks unless the patient specifically asks if they qualify. 
          Focus on registering them and getting them on the calendar.

          CONTEXT AWARENESS & MEMORY:
          - You MUST remember details provided earlier in the conversation (e.g., name, symptoms, preferred times).
          - Once a patient is verified via 'verify_patient' or registered via 'register_new_patient', you assume that identity for the rest of the call.
          - Do NOT ask for the patient's name or ID again for subsequent actions like 'schedule_visit' or 'get_my_visits' once verified.

          BEHAVIOR GUIDELINES:
          1. GREETING: Start immediately with "${receptionistConfig.customGreeting}".
          2. SECURITY: If the user wants to check THEIR schedule or change appointments, you MUST ask for their "Full Name" and "Date of Birth" to verify them using the 'verify_patient' tool.
          3. NEW PATIENTS: If they say they are new, welcome them. Ask for First Name, Last Name, and DOB. Use 'register_new_patient'. Once registered, IMMEDIATELY offer to schedule their "Screening Visit".
          4. EMERGENCIES: If the patient mentions a life-threatening emergency, tell them to hang up and dial ${receptionistConfig.emergencyContact}.
          5. SAFETY: If the patient mentions any side effect, pain, or adverse event, ask for details and use 'report_adverse_event' tool immediately.
          6. INQUIRIES: If the patient asks about the study status or details, use the 'get_study_details' tool to provide accurate information.
          
          ${protocolContext}
        `;
      } else {
        // Staff Mode
        voiceName = "Kore";
        systemInstruction = `
          You are a highly efficient Clinical Research Assistant for the study staff at ${receptionistConfig.clinicName}.
          
          CURRENT DATE: ${todayStr}
          
          CAPABILITIES:
          - **NAVIGATION**: You can navigate the application interface for the user. If they say "Go to dashboard" or "Show me the calendar", use 'navigate_app'.
          - **UI CONTROL**: If the user wants to perform a specific action like "Add a patient" or "Schedule a visit", you can open the relevant modal forms for them using 'open_action_modal'.
          - **PATIENT LOOKUP**: Look up patients by name using 'find_patient_internal'. If a single patient is found, the app will automatically navigate to their record.
          - Schedule visits.
          - Answer complex protocol questions based on the text below.
          - Report Adverse Events using 'report_adverse_event' tool.
          - Create alerts/tasks.
          - Retrieve study status and progress using 'get_study_details'.
          
          CONTEXT AWARENESS:
          - If you find a patient using 'find_patient_internal', assume that patient is the context for subsequent questions (like "When is their next visit?").
          - If the user says "I want to add a patient", you should call "open_action_modal(modalType='add_patient')" immediately.
          - If the user says "I need to schedule a visit", call "open_action_modal(modalType='schedule_visit')".
          
          TONE: Concise, direct, professional.
          
          ${protocolContext}
        `;
      }

      // Connect to Gemini Live
      const sessionPromise = ai.live.connect({
        model: 'gemini-2.5-flash-native-audio-preview-09-2025',
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName } }
          },
          systemInstruction,
          tools: [{ functionDeclarations: tools }]
        },
        callbacks: {
          onopen: async () => {
            if (connectionTimeoutRef.current) clearTimeout(connectionTimeoutRef.current);
            setIsConnecting(false);
            setMode(selectedMode);
            
            // Start Audio Streaming
            processorRef.current!.onaudioprocess = (e) => {
              const inputData = e.inputBuffer.getChannelData(0);
              // Calculate volume for visualizer
              let sum = 0;
              for (let i = 0; i < inputData.length; i++) sum += inputData[i] * inputData[i];
              setAudioLevel(Math.sqrt(sum / inputData.length));

              // Convert to PCM16 and Send
              const pcm16 = new Int16Array(inputData.length);
              for (let i = 0; i < inputData.length; i++) {
                pcm16[i] = inputData[i] * 32767;
              }
              
              const uint8 = new Uint8Array(pcm16.buffer);
              const base64 = btoa(String.fromCharCode.apply(null, Array.from(uint8)));
              
              sessionPromise.then(session => {
                session.sendRealtimeInput({
                  media: {
                    mimeType: 'audio/pcm;rate=16000',
                    data: base64
                  }
                });
              });
            };
            
            inputSourceRef.current!.connect(processorRef.current!);
            processorRef.current!.connect(inputContext.destination);

            // Try to trigger the greeting for patient simulator
            if (selectedMode === 'patient_simulator') {
               try {
                 // Removing session.send as it is not supported in LiveSession
                 // const session = await sessionPromise;
                 // session.send({ parts: [{ text: "User connected. Start speaking greeting now." }] });
               } catch (e) {
                 console.log("Could not auto-trigger greeting via text injection:", e);
               }
            }
          },
          onmessage: async (msg: LiveServerMessage) => {
            if (msg.toolCall) {
              handleToolCall(msg.toolCall.functionCalls, selectedMode);
            }

            const audioData = msg.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
            if (audioData) {
               const binaryString = atob(audioData);
               const bytes = new Uint8Array(binaryString.length);
               for (let i = 0; i < binaryString.length; i++) {
                 bytes[i] = binaryString.charCodeAt(i);
               }
               
               const float32 = new Float32Array(bytes.buffer.byteLength / 2);
               const dataInt16 = new Int16Array(bytes.buffer);
               for (let i = 0; i < dataInt16.length; i++) {
                 float32[i] = dataInt16[i] / 32768.0;
               }

               const buffer = audioContextRef.current!.createBuffer(1, float32.length, 24000);
               buffer.getChannelData(0).set(float32);
               
               const source = audioContextRef.current!.createBufferSource();
               source.buffer = buffer;
               source.connect(audioContextRef.current!.destination);
               
               const currentTime = audioContextRef.current!.currentTime;
               const startTime = Math.max(currentTime, nextStartTimeRef.current);
               source.start(startTime);
               nextStartTimeRef.current = startTime + buffer.duration;
               
               sourcesRef.current.add(source);
               source.onended = () => sourcesRef.current.delete(source);
            }
          },
          onclose: () => {
            setMode('idle');
            setActivePatientId(null);
            activePatientIdRef.current = null;
          },
          onerror: (err) => {
            console.error(err);
            setMode('idle');
            setActivePatientId(null);
            activePatientIdRef.current = null;
          }
        }
      });
      
      // Handle connection failure gracefully
      sessionPromise.catch(err => {
        console.error("Failed to connect to Gemini Live:", err);
        setIsConnecting(false);
        setMode('idle');
        alert("Network Error: Could not connect to Gemini Live service. Please check your internet connection or try again.");
        stopSession();
      });

      sessionRef.current = sessionPromise;

    } catch (error) {
      console.error("Failed to start voice session", error);
      setIsConnecting(false);
      setMode('idle');
      alert("Failed to initialize voice session.");
    }
  };

  const stopSession = () => {
    if (connectionTimeoutRef.current) clearTimeout(connectionTimeoutRef.current);
    
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
    }
    if (inputSourceRef.current) inputSourceRef.current.disconnect();
    if (processorRef.current) processorRef.current.disconnect();
    if (audioContextRef.current) audioContextRef.current.close();

    sourcesRef.current.forEach(s => s.stop());
    sourcesRef.current.clear();

    setMode('idle');
    setIsConnecting(false);
    setAudioLevel(0);
    setActivePatientId(null);
    activePatientIdRef.current = null;
  };

  return (
    <>
      {/* Idle Controls */}
      {mode === 'idle' && !isConnecting && (
        <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-3 animate-in fade-in slide-in-from-bottom-4">
          {/* Patient Call Simulator Trigger */}
          <button
            onClick={() => startSession('patient_simulator')}
            className="flex items-center gap-3 px-5 py-3 bg-white text-slate-700 rounded-full shadow-xl border border-slate-200 hover:bg-slate-50 hover:shadow-2xl transition-all group"
            title="Simulate an incoming call from a patient"
          >
             <div className="bg-green-100 text-green-600 p-2 rounded-full group-hover:scale-110 transition-transform">
               <Smartphone size={20} />
             </div>
             <span className="font-semibold text-sm">Simulate Patient Call</span>
          </button>

          {/* Staff Assistant Trigger */}
          <button
            onClick={() => startSession('staff')}
            className="flex items-center gap-3 px-5 py-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-full shadow-xl hover:shadow-2xl hover:scale-[1.02] transition-all group"
            title="Activate Staff Voice Assistant"
          >
            <Mic size={24} className="animate-pulse" />
            <span className="font-bold tracking-wide">Voice Assistant</span>
          </button>
        </div>
      )}

      {/* Connecting Overlay */}
      {isConnecting && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white px-6 py-4 rounded-xl shadow-2xl flex items-center gap-3 animate-pulse">
          <Loader2 className="animate-spin" size={20} />
          <span className="font-medium">Connecting to Nexus AI...</span>
        </div>
      )}

      {/* Active Call UI */}
      {mode !== 'idle' && !isConnecting && (
        <div className={`fixed bottom-6 right-6 z-50 w-80 rounded-2xl shadow-2xl overflow-hidden border animate-in slide-in-from-bottom-10 ${
          mode === 'patient_simulator' ? 'bg-slate-900 border-slate-700' : 'bg-indigo-900 border-indigo-700'
        }`}>
          {/* Header */}
          <div className={`p-4 flex justify-between items-center ${
            mode === 'patient_simulator' ? 'bg-green-600' : 'bg-indigo-600'
          }`}>
            <div className="flex items-center gap-2 text-white">
              {mode === 'patient_simulator' ? <Phone size={18} /> : <Mic size={18} />}
              <span className="font-bold text-sm">
                {mode === 'patient_simulator' ? 'Incoming Patient Call' : 'Staff Voice Assistant'}
              </span>
            </div>
            <button onClick={stopSession} className="text-white/80 hover:text-white hover:bg-white/20 rounded-full p-1 transition-colors">
              <X size={18} />
            </button>
          </div>

          {/* Content */}
          <div className="p-6 flex flex-col items-center justify-center gap-6">
            {/* Visualizer */}
            <div className="relative w-24 h-24 flex items-center justify-center">
               <div className={`absolute inset-0 rounded-full opacity-20 animate-ping ${
                 mode === 'patient_simulator' ? 'bg-green-400' : 'bg-indigo-400'
               }`}></div>
               <div className={`relative z-10 w-20 h-20 rounded-full flex items-center justify-center transition-all duration-100 ${
                 mode === 'patient_simulator' ? 'bg-green-500' : 'bg-indigo-500'
               }`} style={{ transform: `scale(${1 + audioLevel * 2})` }}>
                  {mode === 'patient_simulator' ? <User size={32} className="text-white" /> : <Volume2 size={32} className="text-white" />}
               </div>
            </div>

            {/* Context Info */}
            <div className="text-center">
              <p className="text-white font-medium text-lg">{receptionistConfig.botName}</p>
              <p className="text-slate-400 text-sm">
                {mode === 'patient_simulator' 
                  ? 'Simulating Patient Interaction' 
                  : 'Listening for Commands...'}
              </p>
              
              {mode === 'patient_simulator' && (
                <div className="mt-2 flex flex-col gap-2">
                    <p className="text-green-400 text-xs animate-pulse font-bold">
                    Listening... 
                    </p>
                    <button 
                        onClick={triggerGreeting}
                        className="text-xs bg-green-800/50 hover:bg-green-800 text-green-200 px-3 py-1 rounded border border-green-700/50 flex items-center justify-center gap-1"
                    >
                        <Zap size={10} /> Start Greeting
                    </button>
                </div>
              )}

              {activePatientId && (
                <div className="mt-2 inline-flex items-center gap-1.5 px-2 py-1 rounded bg-white/10 border border-white/20 text-xs text-white/90">
                   <ShieldCheck size={12} className="text-green-400" />
                   Verified: {activePatientId}
                </div>
              )}
            </div>

            {/* Controls */}
            <div className="flex gap-4 w-full">
              <button 
                onClick={stopSession}
                className="flex-1 py-2 bg-red-500/20 hover:bg-red-500/30 border border-red-500/50 text-red-200 rounded-lg text-sm font-medium transition-colors"
              >
                End Session
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
