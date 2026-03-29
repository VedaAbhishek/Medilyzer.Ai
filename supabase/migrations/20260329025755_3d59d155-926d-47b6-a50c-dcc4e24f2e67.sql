-- Allow patients to delete their own markers
CREATE POLICY "Patients can delete own markers"
ON public.markers FOR DELETE TO public
USING (EXISTS (
  SELECT 1 FROM patients
  WHERE patients.id = markers.patient_id AND patients.user_id = auth.uid()
));

-- Allow patients to delete their own summaries
CREATE POLICY "Patients can delete own summaries"
ON public.summaries FOR DELETE TO public
USING (EXISTS (
  SELECT 1 FROM patients
  WHERE patients.id = summaries.patient_id AND patients.user_id = auth.uid()
));

-- Allow patients to delete their own medications
CREATE POLICY "Patients can delete own medications"
ON public.medications FOR DELETE TO public
USING (EXISTS (
  SELECT 1 FROM patients
  WHERE patients.id = medications.patient_id AND patients.user_id = auth.uid()
));