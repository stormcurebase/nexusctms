-- Initial Clinical Trial Management System Schema

-- Create studies table
CREATE TABLE IF NOT EXISTS studies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  protocol_number text UNIQUE NOT NULL,
  title text NOT NULL,
  phase text NOT NULL CHECK (phase IN ('I', 'II', 'III', 'IV')),
  sponsor text NOT NULL,
  description text DEFAULT '',
  inclusion_criteria text DEFAULT '',
  exclusion_criteria text DEFAULT '',
  recruitment_target integer DEFAULT 50,
  status text NOT NULL DEFAULT 'Active' CHECK (status IN ('Pending', 'Active', 'Closed')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create investigators table
CREATE TABLE IF NOT EXISTS investigators (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  study_id uuid NOT NULL REFERENCES studies(id) ON DELETE CASCADE,
  name text NOT NULL,
  role text NOT NULL,
  email text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Create study_files table
CREATE TABLE IF NOT EXISTS study_files (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  study_id uuid NOT NULL REFERENCES studies(id) ON DELETE CASCADE,
  name text NOT NULL,
  type text NOT NULL,
  content text DEFAULT '',
  created_at timestamptz DEFAULT now()
);

-- Create patients table
CREATE TABLE IF NOT EXISTS patients (
  id text PRIMARY KEY,
  study_id uuid NOT NULL REFERENCES studies(id) ON DELETE CASCADE,
  first_name text NOT NULL,
  last_name text NOT NULL,
  date_of_birth date NOT NULL,
  gender text NOT NULL CHECK (gender IN ('Male', 'Female', 'Other')),
  address text DEFAULT '',
  status text NOT NULL DEFAULT 'Screening' CHECK (status IN ('Screening', 'Enrolled', 'Active', 'Completed', 'Withdrawn', 'Screen Failed')),
  site_id text NOT NULL,
  enrollment_date date,
  contact_email text DEFAULT '',
  contact_phone text DEFAULT '',
  medical_history_summary text DEFAULT '',
  eligibility_analysis jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create visits table
CREATE TABLE IF NOT EXISTS visits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id text NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  name text NOT NULL,
  date date NOT NULL,
  status text NOT NULL DEFAULT 'Scheduled' CHECK (status IN ('Scheduled', 'Completed', 'Missed', 'Overdue')),
  notes text DEFAULT '',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create adverse_events table
CREATE TABLE IF NOT EXISTS adverse_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id text NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  description text NOT NULL,
  severity text NOT NULL CHECK (severity IN ('Mild', 'Moderate', 'Severe', 'Life-Threatening')),
  date_reported date NOT NULL,
  status text NOT NULL DEFAULT 'Ongoing' CHECK (status IN ('Ongoing', 'Resolved')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create alerts table
CREATE TABLE IF NOT EXISTS alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  study_id uuid REFERENCES studies(id) ON DELETE CASCADE,
  patient_id text REFERENCES patients(id) ON DELETE CASCADE,
  category text NOT NULL CHECK (category IN ('Appointment', 'Adverse Event', 'New Patient', 'Inquiry', 'General')),
  priority text NOT NULL CHECK (priority IN ('High', 'Medium', 'Low')),
  message text NOT NULL,
  timestamp text NOT NULL,
  read boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_investigators_study_id ON investigators(study_id);
CREATE INDEX IF NOT EXISTS idx_study_files_study_id ON study_files(study_id);
CREATE INDEX IF NOT EXISTS idx_patients_study_id ON patients(study_id);
CREATE INDEX IF NOT EXISTS idx_patients_status ON patients(status);
CREATE INDEX IF NOT EXISTS idx_visits_patient_id ON visits(patient_id);
CREATE INDEX IF NOT EXISTS idx_visits_date ON visits(date);
CREATE INDEX IF NOT EXISTS idx_adverse_events_patient_id ON adverse_events(patient_id);
CREATE INDEX IF NOT EXISTS idx_alerts_study_id ON alerts(study_id);
CREATE INDEX IF NOT EXISTS idx_alerts_read ON alerts(read);

-- Enable Row Level Security
ALTER TABLE studies ENABLE ROW LEVEL SECURITY;
ALTER TABLE investigators ENABLE ROW LEVEL SECURITY;
ALTER TABLE study_files ENABLE ROW LEVEL SECURITY;
ALTER TABLE patients ENABLE ROW LEVEL SECURITY;
ALTER TABLE visits ENABLE ROW LEVEL SECURITY;
ALTER TABLE adverse_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE alerts ENABLE ROW LEVEL SECURITY;

-- Create policies (allow all for development - no auth yet)
CREATE POLICY "Allow all on studies" ON studies FOR ALL TO public USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on investigators" ON investigators FOR ALL TO public USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on study_files" ON study_files FOR ALL TO public USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on patients" ON patients FOR ALL TO public USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on visits" ON visits FOR ALL TO public USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on adverse_events" ON adverse_events FOR ALL TO public USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on alerts" ON alerts FOR ALL TO public USING (true) WITH CHECK (true);

-- Create function for updated_at triggers
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers
CREATE TRIGGER update_studies_updated_at BEFORE UPDATE ON studies
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_patients_updated_at BEFORE UPDATE ON patients
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_visits_updated_at BEFORE UPDATE ON visits
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_adverse_events_updated_at BEFORE UPDATE ON adverse_events
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
