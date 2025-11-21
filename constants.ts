
import { Patient, PatientStatus, Gender, Site, StudyDetails } from './types';

export const MOCK_SITES: Site[] = [
  { id: 'SITE-001', name: 'General Hospital - Oncology', location: 'Boston, MA', principalInvestigator: 'Dr. Sarah Chen' },
];

export const MOCK_STUDIES: StudyDetails[] = [
  {
    id: 'STUDY-001',
    protocolNumber: 'NEXUS-X01',
    title: 'Phase II Study of Novel Immunotherapy in Solid Tumors',
    phase: 'II',
    sponsor: 'BioGen Nexus',
    description: 'A multicenter, open-label study to evaluate the safety and efficacy of NX-202 in patients with advanced solid tumors.',
    inclusionCriteria: '1. Age >= 18 years.\n2. Histologically confirmed solid tumor.\n3. ECOG Performance Status 0-1.\n4. Adequate organ function.',
    exclusionCriteria: '1. Active infection requiring IV antibiotics.\n2. History of cardiac disease (NYHA Class III/IV).\n3. Pregnant or breastfeeding.\n4. Prior treatment with investigational agent within 4 weeks.',
    recruitmentTarget: 50,
    status: 'Active',
    investigators: [
      { id: 'INV-001', name: 'Dr. Sarah Chen', role: 'Principal Investigator', email: 'schen@nexus.test' },
      { id: 'INV-002', name: 'James Wilson', role: 'Study Coordinator', email: 'jwilson@nexus.test' }
    ],
    files: [
        { name: 'NEXUS-X01-Protocol-v3.pdf', type: 'protocol', content: 'Protocol content...' }
    ]
  },
  {
    id: 'STUDY-002',
    protocolNumber: 'CARDIO-Z99',
    title: 'Phase III Evaluation of Lipid Lowering Agent',
    phase: 'III',
    sponsor: 'HeartHealth Inc.',
    description: 'Randomized, double-blind study comparing Z99 to placebo in high-risk cardiac patients.',
    inclusionCriteria: '1. Age 45-80.\n2. LDL > 160 mg/dL.\n3. History of MI.',
    exclusionCriteria: '1. Liver disease.\n2. Uncontrolled hypertension.',
    recruitmentTarget: 200,
    status: 'Pending',
    investigators: [
       { id: 'INV-003', name: 'Dr. Emily Blunt', role: 'Principal Investigator', email: 'eblunt@nexus.test' }
    ],
    files: []
  }
];

export const MOCK_PATIENTS: Patient[] = [
  {
    id: '101-001',
    firstName: 'John',
    lastName: 'Doe',
    dateOfBirth: '1985-04-12',
    gender: Gender.MALE,
    status: PatientStatus.ACTIVE,
    siteId: 'SITE-001',
    studyId: 'STUDY-001',
    enrollmentDate: '2023-11-01',
    contactEmail: 'j.doe@example.com',
    medicalHistorySummary: 'Hypertension diagnosed 2018. No known allergies. Previous surgery: Appendectomy (2005).',
    visits: [
      { id: 'V1', name: 'Screening', date: '2023-10-25', status: 'Completed', notes: 'Eligible. Consented.' },
      { id: 'V2', name: 'Baseline', date: '2023-11-01', status: 'Completed' },
      { id: 'V3', name: 'Week 4', date: '2023-11-29', status: 'Completed' },
      { id: 'V4', name: 'Week 8', date: '2023-12-27', status: 'Completed' },
      { id: 'V5', name: 'Week 12', date: '2024-01-24', status: 'Scheduled' },
    ],
    adverseEvents: []
  },
  {
    id: '101-002',
    firstName: 'Alice',
    lastName: 'Smith',
    dateOfBirth: '1979-09-23',
    gender: Gender.FEMALE,
    status: PatientStatus.SCREENING,
    siteId: 'SITE-001',
    studyId: 'STUDY-001',
    contactEmail: 'alice.s@example.com',
    medicalHistorySummary: 'Type 2 Diabetes (controlled). BMI 28.',
    visits: [
      { id: 'V1', name: 'Screening', date: '2024-01-10', status: 'Completed', notes: 'Labs pending review.' },
    ],
    adverseEvents: []
  },
  {
    id: '101-003',
    firstName: 'Robert',
    lastName: 'Jones',
    dateOfBirth: '1965-11-30',
    gender: Gender.MALE,
    status: PatientStatus.COMPLETED,
    siteId: 'SITE-001',
    studyId: 'STUDY-001',
    enrollmentDate: '2023-06-01',
    medicalHistorySummary: 'Post-menopausal. Osteoporosis.',
    visits: [
      { id: 'V1', name: 'Screening', date: '2023-05-20', status: 'Completed' },
      { id: 'VEnd', name: 'End of Study', date: '2023-12-01', status: 'Completed' },
    ],
    adverseEvents: []
  }
];
