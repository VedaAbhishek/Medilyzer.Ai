import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Pill, Loader2, AlertTriangle } from "lucide-react";
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
}

interface MedicationsListProps {
  patientId: string | null;
}

const friendlyFrequency = (freq: string | null): string => {
  if (!freq) return "";
  const lower = freq.toLowerCase().trim();
  const map: Record<string, string> = {
    od: "Once a day",
    bd: "Twice a day",
    tds: "3 times a day",
    qid: "4 times a day",
    qds: "4 times a day",
    prn: "As needed",
    hs: "At bedtime",
    stat: "Right away (one time)",
    "once daily": "Once a day",
    "twice daily": "Twice a day",
  };
  return map[lower] || freq;
};

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
      toast({ title: "Could not get explanation", description: err.message, variant: "destructive" });
      setExpandedId(null);
    } finally {
      setLoadingId(null);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-3 text-xl">
            <Pill className="h-6 w-6 text-primary" />
            My Medications
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-base text-muted-foreground">Loading your medications…</p>
        </CardContent>
      </Card>
    );
  }

  if (medications.length === 0) return null;

  return (
    <div className="space-y-5">
      <h2 className="text-2xl font-bold text-foreground flex items-center gap-3">
        <Pill className="h-7 w-7 text-primary" />
        My Medications
      </h2>

      <div className="space-y-4">
        {medications.map((med) => {
          const desc = descriptions[med.id];
          const isExpanded = expandedId === med.id;
          const isLoading = loadingId === med.id;

          return (
            <Card key={med.id} className="overflow-hidden">
              <CardContent className="p-0">
                {/* Main medication info */}
                <div className="flex items-start gap-5 p-6">
                  <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center shrink-0 mt-1">
                    <Pill className="h-7 w-7 text-primary" />
                  </div>
                  <div className="flex-1 space-y-1">
                    <p className="text-lg font-bold text-foreground">{med.name}</p>
                    <p className="text-base text-muted-foreground">
                      {[med.dosage, friendlyFrequency(med.frequency)]
                        .filter(Boolean)
                        .join(" · ") || "No dosage information available"}
                    </p>
                  </div>
                </div>

                {/* Action button */}
                <div className="px-6 pb-6">
                  <Button
                    onClick={() => handleDescribe(med)}
                    disabled={isLoading}
                    className="w-full text-base py-6 font-semibold"
                    variant={isExpanded ? "secondary" : "default"}
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="h-5 w-5 animate-spin mr-2" />
                        Getting explanation…
                      </>
                    ) : isExpanded ? (
                      "Hide explanation"
                    ) : (
                      "Explain this medication to me"
                    )}
                  </Button>
                </div>

                {/* Loading state */}
                {isExpanded && isLoading && (
                  <div className="px-6 pb-6">
                    <div className="rounded-xl bg-[hsl(var(--warm-yellow))] border border-[hsl(var(--warm-yellow-border))] p-6">
                      <div className="flex items-center gap-3 text-base text-muted-foreground">
                        <Loader2 className="h-5 w-5 animate-spin" />
                        Writing a simple explanation for you…
                      </div>
                    </div>
                  </div>
                )}

                {/* Expanded description */}
                {isExpanded && desc && (
                  <div className="px-6 pb-6">
                    <div className="rounded-xl bg-[hsl(var(--warm-yellow))] border border-[hsl(var(--warm-yellow-border))] p-6 space-y-5">
                      {desc.plain_description && (
                        <p className="text-base text-foreground leading-relaxed">
                          {desc.plain_description}
                        </p>
                      )}

                      {desc.side_effects && (
                        <div className="space-y-2">
                          <p className="text-base font-semibold text-foreground">
                            Possible side effects:
                          </p>
                          <div className="flex flex-wrap gap-2">
                            {desc.side_effects.split(", ").map((se, i) => (
                              <span
                                key={i}
                                className="inline-flex items-center rounded-full bg-background border px-4 py-1.5 text-sm font-medium text-foreground"
                              >
                                {se}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      {desc.avoid && (
                        <div className="flex items-start gap-3">
                          <AlertTriangle className="h-5 w-5 text-amber-600 mt-0.5 shrink-0" />
                          <p className="text-base text-foreground">{desc.avoid}</p>
                        </div>
                      )}

                      <p className="text-sm text-muted-foreground italic pt-2 border-t">
                        Always consult your doctor before making any changes to your medication.
                      </p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
};

export default MedicationsList;
