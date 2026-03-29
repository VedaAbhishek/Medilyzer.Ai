import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Pill, ChevronDown, ChevronUp, Loader2, AlertTriangle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

interface Medication {
  id: string;
  name: string;
  dosage: string | null;
  frequency: string | null;
}

interface DrugDescription {
  plain_description: string | null;
  side_effects: string | null;
  avoid: string | null;
  _ai?: {
    what_it_does?: string;
    how_it_works?: string;
    common_side_effects?: string[];
    what_to_avoid?: string;
    important_note?: string;
  };
}

interface MedicationsListProps {
  patientId: string | null;
}

const MedicationsList = ({ patientId }: MedicationsListProps) => {
  const [medications, setMedications] = useState<Medication[]>([]);
  const [loading, setLoading] = useState(true);
  const [descriptions, setDescriptions] = useState<Record<string, DrugDescription>>({});
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    if (!patientId) return;
    const fetchMeds = async () => {
      setLoading(true);
      const { data } = await supabase
        .from("medications")
        .select("id, name, dosage, frequency")
        .eq("patient_id", patientId);
      setMedications(data || []);
      setLoading(false);
    };
    fetchMeds();
  }, [patientId]);

  const handleDescribe = async (med: Medication) => {
    if (expandedId === med.id) {
      setExpandedId(null);
      return;
    }

    if (descriptions[med.id]) {
      setExpandedId(med.id);
      return;
    }

    setLoadingId(med.id);
    setExpandedId(med.id);

    try {
      // Check DB first
      const { data: existing } = await supabase
        .from("drug_descriptions")
        .select("plain_description, side_effects, avoid")
        .eq("medication_id", med.id)
        .maybeSingle();

      if (existing) {
        setDescriptions((prev) => ({ ...prev, [med.id]: existing }));
        setLoadingId(null);
        return;
      }

      const { data, error } = await supabase.functions.invoke("describe-drug", {
        body: {
          medication_id: med.id,
          medication_name: med.name,
          dosage: med.dosage,
          patient_id: patientId,
        },
      });

      if (error) throw error;
      setDescriptions((prev) => ({ ...prev, [med.id]: data }));
    } catch (err: any) {
      console.error(err);
      toast({ title: "Failed to get description", description: err.message, variant: "destructive" });
      setExpandedId(null);
    } finally {
      setLoadingId(null);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><Pill className="h-5 w-5 text-primary" /> My Medications</CardTitle></CardHeader>
        <CardContent><p className="text-sm text-muted-foreground">Loading…</p></CardContent>
      </Card>
    );
  }

  if (medications.length === 0) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Pill className="h-5 w-5 text-primary" />
          My Medications
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {medications.map((med) => {
          const desc = descriptions[med.id];
          const isExpanded = expandedId === med.id;
          const isLoading = loadingId === med.id;

          return (
            <div key={med.id} className="border rounded-lg overflow-hidden">
              <div className="flex items-center justify-between p-4">
                <div>
                  <p className="font-medium text-foreground">{med.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {[med.dosage, med.frequency].filter(Boolean).join(" · ") || "No dosage info"}
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleDescribe(med)}
                  disabled={isLoading}
                  className="shrink-0"
                >
                  {isLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-1" />
                  ) : isExpanded ? (
                    <ChevronUp className="h-4 w-4 mr-1" />
                  ) : (
                    <ChevronDown className="h-4 w-4 mr-1" />
                  )}
                  What is this?
                </Button>
              </div>

              {isExpanded && desc && (
                <div className="px-4 pb-4 space-y-3 border-t bg-muted/30 pt-3">
                  {desc.plain_description && (
                    <p className="text-sm text-foreground">{desc.plain_description}</p>
                  )}
                  {desc.side_effects && (
                    <div>
                      <p className="text-xs font-medium text-muted-foreground mb-1">Common side effects</p>
                      <div className="flex flex-wrap gap-1.5">
                        {desc.side_effects.split(", ").map((se, i) => (
                          <Badge key={i} variant="secondary" className="text-xs">{se}</Badge>
                        ))}
                      </div>
                    </div>
                  )}
                  {desc.avoid && (
                    <div className="flex items-start gap-2 text-sm">
                      <AlertTriangle className="h-4 w-4 text-amber-500 mt-0.5 shrink-0" />
                      <span className="text-foreground">{desc.avoid}</span>
                    </div>
                  )}
                  <p className="text-xs text-muted-foreground italic">
                    Always consult your doctor before making any changes to your medication.
                  </p>
                </div>
              )}

              {isExpanded && isLoading && (
                <div className="px-4 pb-4 border-t bg-muted/30 pt-3">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Getting plain-language explanation…
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
};

export default MedicationsList;
