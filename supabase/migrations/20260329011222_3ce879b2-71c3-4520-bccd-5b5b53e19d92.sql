
-- Create role enum
CREATE TYPE public.app_role AS ENUM ('patient', 'doctor');

-- Profiles table
CREATE TABLE public.profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  role app_role NOT NULL DEFAULT 'patient',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = user_id);

-- Patients table
CREATE TABLE public.patients (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  dob DATE,
  blood_type TEXT,
  conditions TEXT[] DEFAULT '{}',
  allergies TEXT[] DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.patients ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Patients can view own data" ON public.patients FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Patients can insert own data" ON public.patients FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Patients can update own data" ON public.patients FOR UPDATE USING (auth.uid() = user_id);

-- Medical records table
CREATE TABLE public.medical_records (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  upload_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  file_url TEXT,
  raw_text TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.medical_records ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Patients can view own records" ON public.medical_records FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.patients WHERE patients.id = medical_records.patient_id AND patients.user_id = auth.uid())
);
CREATE POLICY "Patients can insert own records" ON public.medical_records FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.patients WHERE patients.id = medical_records.patient_id AND patients.user_id = auth.uid())
);
CREATE POLICY "Patients can update own records" ON public.medical_records FOR UPDATE USING (
  EXISTS (SELECT 1 FROM public.patients WHERE patients.id = medical_records.patient_id AND patients.user_id = auth.uid())
);
CREATE POLICY "Patients can delete own records" ON public.medical_records FOR DELETE USING (
  EXISTS (SELECT 1 FROM public.patients WHERE patients.id = medical_records.patient_id AND patients.user_id = auth.uid())
);

-- Markers table
CREATE TABLE public.markers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  record_id UUID REFERENCES public.medical_records(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  value NUMERIC NOT NULL,
  unit TEXT,
  ref_min NUMERIC,
  ref_max NUMERIC,
  status TEXT,
  date DATE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.markers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Patients can view own markers" ON public.markers FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.patients WHERE patients.id = markers.patient_id AND patients.user_id = auth.uid())
);
CREATE POLICY "Patients can insert own markers" ON public.markers FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.patients WHERE patients.id = markers.patient_id AND patients.user_id = auth.uid())
);

-- Medications table
CREATE TABLE public.medications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  dosage TEXT,
  frequency TEXT,
  start_date DATE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.medications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Patients can view own medications" ON public.medications FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.patients WHERE patients.id = medications.patient_id AND patients.user_id = auth.uid())
);
CREATE POLICY "Patients can insert own medications" ON public.medications FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.patients WHERE patients.id = medications.patient_id AND patients.user_id = auth.uid())
);

-- Summaries table
CREATE TABLE public.summaries (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  record_id UUID REFERENCES public.medical_records(id) ON DELETE SET NULL,
  plain_text TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.summaries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Patients can view own summaries" ON public.summaries FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.patients WHERE patients.id = summaries.patient_id AND patients.user_id = auth.uid())
);
CREATE POLICY "Patients can insert own summaries" ON public.summaries FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.patients WHERE patients.id = summaries.patient_id AND patients.user_id = auth.uid())
);

-- Diet recommendations table
CREATE TABLE public.diet_recommendations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.diet_recommendations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Patients can view own diet recs" ON public.diet_recommendations FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.patients WHERE patients.id = diet_recommendations.patient_id AND patients.user_id = auth.uid())
);
CREATE POLICY "Patients can insert own diet recs" ON public.diet_recommendations FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.patients WHERE patients.id = diet_recommendations.patient_id AND patients.user_id = auth.uid())
);

-- Drug descriptions table
CREATE TABLE public.drug_descriptions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  medication_id UUID NOT NULL REFERENCES public.medications(id) ON DELETE CASCADE,
  plain_description TEXT,
  side_effects TEXT,
  avoid TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.drug_descriptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Patients can view own drug descriptions" ON public.drug_descriptions FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.medications m
    JOIN public.patients p ON p.id = m.patient_id
    WHERE m.id = drug_descriptions.medication_id AND p.user_id = auth.uid()
  )
);
CREATE POLICY "Patients can insert own drug descriptions" ON public.drug_descriptions FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.medications m
    JOIN public.patients p ON p.id = m.patient_id
    WHERE m.id = drug_descriptions.medication_id AND p.user_id = auth.uid()
  )
);

-- Symptom checks table
CREATE TABLE public.symptom_checks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  symptoms_text TEXT NOT NULL,
  recommended_specialty TEXT,
  ai_reasoning TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.symptom_checks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Patients can view own symptom checks" ON public.symptom_checks FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.patients WHERE patients.id = symptom_checks.patient_id AND patients.user_id = auth.uid())
);
CREATE POLICY "Patients can insert own symptom checks" ON public.symptom_checks FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.patients WHERE patients.id = symptom_checks.patient_id AND patients.user_id = auth.uid())
);

-- Trigger function for auto-creating profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (user_id, name, role)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'name', ''), COALESCE((NEW.raw_user_meta_data->>'role')::app_role, 'patient'));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
