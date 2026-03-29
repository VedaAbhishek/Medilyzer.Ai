import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Pill, Loader2, AlertTriangle, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogClose,
} from "@/components/ui/dialog";

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
  const [modalMed, setModalMed] = useState<Medication | null>(null);

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
    setModalMed(med);

    if (descriptions[med.id]) return;

    setLoadingId(med.id);
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
      setModalMed(null);
    } finally {
      setLoadingId(null);
    }
  };

  if (loading) {
    return (
      <div className="space-y-5">
        <h2 className="text-2xl font-bold text-foreground flex items-center gap-3">
          <Pill className="h-7 w-7 text-primary" />
          My Medications
        </h2>
        <p className="text-base text-muted-foreground">Loading your medications…</p>
      </div>
    );
  }

  if (medications.length === 0) return null;

  const desc = modalMed ? descriptions[modalMed.id] : null;
  const isModalLoading = modalMed ? loadingId === modalMed.id : false;

  return (
    <div className="space-y-5">
      <h2 className="text-2xl font-bold text-foreground flex items-center gap-3">
        <Pill className="h-7 w-7 text-primary" />
        My Medications
      </h2>

      {/* Tile grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {medications.map((med) => (
          <Card
            key={med.id}
            className="flex flex-col items-center text-center border-border"
          >
            <CardContent className="flex flex-col items-center justify-between p-6 h-full w-full space-y-4">
              <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center">
                <Pill className="h-7 w-7 text-primary" />
              </div>

              <div className="space-y-1 flex-1">
                <p className="text-lg font-bold text-foreground">{med.name}</p>
                <p className="text-sm text-muted-foreground">
                  {[med.dosage, friendlyFrequency(med.frequency)]
                    .filter(Boolean)
                    .join(" · ") || "No dosage info"}
                </p>
              </div>

              <Button
                onClick={() => handleDescribe(med)}
                disabled={loadingId === med.id}
                size="sm"
                className="text-sm font-semibold px-5"
              >
                {loadingId === med.id ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-1.5" />
                    Loading…
                  </>
                ) : (
                  "Explain this to me"
                )}
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Explanation modal */}
      <Dialog open={!!modalMed} onOpenChange={(open) => !open && setModalMed(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-foreground">
              {modalMed?.name}
            </DialogTitle>
          </DialogHeader>

          {isModalLoading && (
            <div className="flex items-center gap-3 py-8 justify-center text-base text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin" />
              Writing a simple explanation…
            </div>
          )}

          {desc && (
            <div className="space-y-5 py-2">
              {desc.plain_description && (
                <div className="space-y-1">
                  <p className="text-sm font-semibold text-primary">What it does</p>
                  <p className="text-base text-foreground leading-relaxed">{desc.plain_description}</p>
                </div>
              )}

              {desc.side_effects && (
                <div className="space-y-2">
                  <p className="text-sm font-semibold text-primary">Side effects</p>
                  <div className="flex flex-wrap gap-2">
                    {desc.side_effects.split(", ").map((se, i) => (
                      <span
                        key={i}
                        className="inline-flex items-center rounded-full bg-secondary border border-border px-3 py-1 text-sm text-foreground"
                      >
                        {se}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {desc.avoid && (
                <div className="space-y-1">
                  <p className="text-sm font-semibold text-primary">What to avoid</p>
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="h-5 w-5 text-amber-600 mt-0.5 shrink-0" />
                    <p className="text-base text-foreground">{desc.avoid}</p>
                  </div>
                </div>
              )}

              <p className="text-sm text-muted-foreground italic pt-3 border-t">
                Always consult your doctor before making any changes to your medication.
              </p>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default MedicationsList;
