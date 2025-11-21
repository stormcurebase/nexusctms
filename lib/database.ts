import { supabase } from './supabase';
import { Patient, StudyDetails, Visit, AdverseEvent, TaskAlert, Investigator, StudyFile } from '../types';

// ============ STUDIES ============

export async function getAllStudies(): Promise<StudyDetails[]> {
  const { data: studies, error } = await supabase
    .from('studies')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching studies:', error);
    return [];
  }

  // Fetch investigators and files for each study
  const studiesWithDetails = await Promise.all(
    (studies || []).map(async (study) => {
      const investigators = await getInvestigatorsByStudyId(study.id);
      const files = await getFilesByStudyId(study.id);

      return {
        id: study.id,
        protocolNumber: study.protocol_number,
        title: study.title,
        phase: study.phase,
        sponsor: study.sponsor,
        description: study.description || '',
        inclusionCriteria: study.inclusion_criteria || '',
        exclusionCriteria: study.exclusion_criteria || '',
        recruitmentTarget: study.recruitment_target || 50,
        status: study.status,
        investigators,
        files
      } as StudyDetails;
    })
  );

  return studiesWithDetails;
}

export async function createStudy(study: Omit<StudyDetails, 'id'>): Promise<StudyDetails | null> {
  const { data, error } = await supabase
    .from('studies')
    .insert([{
      protocol_number: study.protocolNumber,
      title: study.title,
      phase: study.phase,
      sponsor: study.sponsor,
      description: study.description,
      inclusion_criteria: study.inclusionCriteria,
      exclusion_criteria: study.exclusionCriteria,
      recruitment_target: study.recruitmentTarget,
      status: study.status
    }])
    .select()
    .maybeSingle();

  if (error) {
    console.error('Error creating study:', error);
    return null;
  }

  if (!data) return null;

  // Create investigators and files
  if (study.investigators.length > 0) {
    await createInvestigators(data.id, study.investigators);
  }
  if (study.files.length > 0) {
    await createStudyFiles(data.id, study.files);
  }

  return {
    ...study,
    id: data.id
  };
}

export async function updateStudy(study: StudyDetails): Promise<boolean> {
  const { error } = await supabase
    .from('studies')
    .update({
      protocol_number: study.protocolNumber,
      title: study.title,
      phase: study.phase,
      sponsor: study.sponsor,
      description: study.description,
      inclusion_criteria: study.inclusionCriteria,
      exclusion_criteria: study.exclusionCriteria,
      recruitment_target: study.recruitmentTarget,
      status: study.status
    })
    .eq('id', study.id);

  if (error) {
    console.error('Error updating study:', error);
    return false;
  }

  // Update investigators (simple approach: delete and recreate)
  await supabase.from('investigators').delete().eq('study_id', study.id);
  if (study.investigators.length > 0) {
    await createInvestigators(study.id, study.investigators);
  }

  return true;
}

// ============ INVESTIGATORS ============

async function getInvestigatorsByStudyId(studyId: string): Promise<Investigator[]> {
  const { data, error } = await supabase
    .from('investigators')
    .select('*')
    .eq('study_id', studyId);

  if (error) {
    console.error('Error fetching investigators:', error);
    return [];
  }

  return (data || []).map(inv => ({
    id: inv.id,
    name: inv.name,
    role: inv.role,
    email: inv.email
  }));
}

async function createInvestigators(studyId: string, investigators: Investigator[]): Promise<void> {
  const { error } = await supabase
    .from('investigators')
    .insert(investigators.map(inv => ({
      study_id: studyId,
      name: inv.name,
      role: inv.role,
      email: inv.email
    })));

  if (error) {
    console.error('Error creating investigators:', error);
  }
}

// ============ STUDY FILES ============

async function getFilesByStudyId(studyId: string): Promise<StudyFile[]> {
  const { data, error } = await supabase
    .from('study_files')
    .select('*')
    .eq('study_id', studyId);

  if (error) {
    console.error('Error fetching files:', error);
    return [];
  }

  return (data || []).map(file => ({
    name: file.name,
    type: file.type,
    content: file.content
  }));
}

async function createStudyFiles(studyId: string, files: StudyFile[]): Promise<void> {
  const { error } = await supabase
    .from('study_files')
    .insert(files.map(file => ({
      study_id: studyId,
      name: file.name,
      type: file.type,
      content: file.content || ''
    })));

  if (error) {
    console.error('Error creating study files:', error);
  }
}

// ============ PATIENTS ============

export async function getPatientsByStudyId(studyId: string): Promise<Patient[]> {
  const { data: patients, error } = await supabase
    .from('patients')
    .select('*')
    .eq('study_id', studyId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching patients:', error);
    return [];
  }

  // Fetch visits and adverse events for each patient
  const patientsWithDetails = await Promise.all(
    (patients || []).map(async (patient) => {
      const visits = await getVisitsByPatientId(patient.id);
      const adverseEvents = await getAdverseEventsByPatientId(patient.id);

      return {
        id: patient.id,
        studyId: patient.study_id,
        firstName: patient.first_name,
        lastName: patient.last_name,
        dateOfBirth: patient.date_of_birth,
        gender: patient.gender,
        address: patient.address || '',
        status: patient.status,
        siteId: patient.site_id,
        enrollmentDate: patient.enrollment_date || '',
        contactEmail: patient.contact_email || '',
        contactPhone: patient.contact_phone || '',
        medicalHistorySummary: patient.medical_history_summary || '',
        eligibilityAnalysis: patient.eligibility_analysis,
        visits,
        adverseEvents
      } as Patient;
    })
  );

  return patientsWithDetails;
}

export async function createPatient(patient: Patient): Promise<boolean> {
  const { error } = await supabase
    .from('patients')
    .insert([{
      id: patient.id,
      study_id: patient.studyId,
      first_name: patient.firstName,
      last_name: patient.lastName,
      date_of_birth: patient.dateOfBirth,
      gender: patient.gender,
      address: patient.address || '',
      status: patient.status,
      site_id: patient.siteId,
      enrollment_date: patient.enrollmentDate || null,
      contact_email: patient.contactEmail || '',
      contact_phone: patient.contactPhone || '',
      medical_history_summary: patient.medicalHistorySummary || '',
      eligibility_analysis: patient.eligibilityAnalysis || null
    }]);

  if (error) {
    console.error('Error creating patient:', error);
    return false;
  }

  return true;
}

export async function updatePatient(patient: Patient): Promise<boolean> {
  const { error } = await supabase
    .from('patients')
    .update({
      first_name: patient.firstName,
      last_name: patient.lastName,
      date_of_birth: patient.dateOfBirth,
      gender: patient.gender,
      address: patient.address || '',
      status: patient.status,
      site_id: patient.siteId,
      enrollment_date: patient.enrollmentDate || null,
      contact_email: patient.contactEmail || '',
      contact_phone: patient.contactPhone || '',
      medical_history_summary: patient.medicalHistorySummary || '',
      eligibility_analysis: patient.eligibilityAnalysis || null
    })
    .eq('id', patient.id);

  if (error) {
    console.error('Error updating patient:', error);
    return false;
  }

  return true;
}

// ============ VISITS ============

async function getVisitsByPatientId(patientId: string): Promise<Visit[]> {
  const { data, error } = await supabase
    .from('visits')
    .select('*')
    .eq('patient_id', patientId)
    .order('date', { ascending: true });

  if (error) {
    console.error('Error fetching visits:', error);
    return [];
  }

  return (data || []).map(visit => ({
    id: visit.id,
    name: visit.name,
    date: visit.date,
    status: visit.status,
    notes: visit.notes || ''
  }));
}

export async function createVisit(patientId: string, visit: Omit<Visit, 'id'>): Promise<boolean> {
  const { error } = await supabase
    .from('visits')
    .insert([{
      patient_id: patientId,
      name: visit.name,
      date: visit.date,
      status: visit.status,
      notes: visit.notes || ''
    }]);

  if (error) {
    console.error('Error creating visit:', error);
    return false;
  }

  return true;
}

export async function updateVisit(visitId: string, updates: Partial<Visit>): Promise<boolean> {
  const updateData: any = {};
  if (updates.name !== undefined) updateData.name = updates.name;
  if (updates.date !== undefined) updateData.date = updates.date;
  if (updates.status !== undefined) updateData.status = updates.status;
  if (updates.notes !== undefined) updateData.notes = updates.notes;

  const { error } = await supabase
    .from('visits')
    .update(updateData)
    .eq('id', visitId);

  if (error) {
    console.error('Error updating visit:', error);
    return false;
  }

  return true;
}

// ============ ADVERSE EVENTS ============

async function getAdverseEventsByPatientId(patientId: string): Promise<AdverseEvent[]> {
  const { data, error } = await supabase
    .from('adverse_events')
    .select('*')
    .eq('patient_id', patientId)
    .order('date_reported', { ascending: false });

  if (error) {
    console.error('Error fetching adverse events:', error);
    return [];
  }

  return (data || []).map(ae => ({
    id: ae.id,
    description: ae.description,
    severity: ae.severity,
    dateReported: ae.date_reported,
    status: ae.status
  }));
}

export async function createAdverseEvent(patientId: string, ae: Omit<AdverseEvent, 'id'>): Promise<boolean> {
  const { error } = await supabase
    .from('adverse_events')
    .insert([{
      patient_id: patientId,
      description: ae.description,
      severity: ae.severity,
      date_reported: ae.dateReported,
      status: ae.status
    }]);

  if (error) {
    console.error('Error creating adverse event:', error);
    return false;
  }

  return true;
}

// ============ ALERTS ============

export async function getAlertsByStudyId(studyId: string): Promise<TaskAlert[]> {
  const { data, error } = await supabase
    .from('alerts')
    .select('*')
    .eq('study_id', studyId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching alerts:', error);
    return [];
  }

  return (data || []).map(alert => ({
    id: alert.id,
    category: alert.category,
    priority: alert.priority,
    message: alert.message,
    timestamp: alert.timestamp,
    read: alert.read,
    patientId: alert.patient_id,
    studyId: alert.study_id
  }));
}

export async function createAlert(alert: Omit<TaskAlert, 'id'>): Promise<boolean> {
  const { error } = await supabase
    .from('alerts')
    .insert([{
      study_id: alert.studyId,
      patient_id: alert.patientId || null,
      category: alert.category,
      priority: alert.priority,
      message: alert.message,
      timestamp: alert.timestamp,
      read: alert.read
    }]);

  if (error) {
    console.error('Error creating alert:', error);
    return false;
  }

  return true;
}

// ============ INITIALIZATION ============

export async function initializeDatabase(mockStudies: StudyDetails[], mockPatients: Patient[]): Promise<boolean> {
  try {
    // Check if we already have data
    const { data: existingStudies } = await supabase
      .from('studies')
      .select('id')
      .limit(1);

    if (existingStudies && existingStudies.length > 0) {
      console.log('Database already initialized');
      return true;
    }

    // Insert mock studies
    for (const study of mockStudies) {
      await createStudy(study);
    }

    // Insert mock patients
    for (const patient of mockPatients) {
      await createPatient(patient);

      // Create visits for this patient
      for (const visit of patient.visits) {
        await createVisit(patient.id, visit);
      }

      // Create adverse events for this patient
      for (const ae of patient.adverseEvents) {
        await createAdverseEvent(patient.id, ae);
      }
    }

    console.log('Database initialized with mock data');
    return true;
  } catch (error) {
    console.error('Error initializing database:', error);
    return false;
  }
}
