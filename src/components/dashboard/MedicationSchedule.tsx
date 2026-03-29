import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Pill, Sun, SunMedium, Moon } from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";

interface MedicationWithFreq {
  name: string;
  dosage: string | null;
  frequency: string | null;
  id?: string;
}

interface MedicationScheduleProps {
  medications: MedicationWithFreq[];
  patientId?: string | null;
}

type TimeSlot = "morning" | "noon" | "evening";

const slotConfig: Record<TimeSlot, { label: string; icon: typeof Sun }> = {
  morning: { label: "Morning", icon: Sun },
  noon: { label: "Noon", icon: SunMedium },
  evening: { label: "Evening", icon: Moon },
};

function classifyTimeSlots(freq: string | null): TimeSlot[] {
  if (!freq) return ["morning"];
  const f = freq.toLowerCase().trim();

  const morning = ["once daily", "od", "every morning", "breakfast", "am", "daily", "once a day"];
  const noon = ["afternoon", "lunch", "midday"];
  const evening = ["night", "bedtime", "dinner", "pm", "hs", "at bedtime", "evening"];
  const multi2 = ["bd", "twice daily", "twice a day", "bid"];
  const multi3 = ["tds", "tid", "three times a day", "3 times a day"];
  const multi4 = ["qid", "qds", "four times a day", "4 times a day"];

  if (multi4.some((k) => f.includes(k))) return ["morning", "noon", "evening"];
  if (multi3.some((k) => f.includes(k))) return ["morning", "noon", "evening"];
  if (multi2.some((k) => f.includes(k))) return ["morning", "evening"];
  if (evening.some((k) => f.includes(k))) return ["evening"];
  if (noon.some((k) => f.includes(k))) return ["noon"];
  if (morning.some((k) => f.includes(k))) return ["morning"];

  return ["morning"];
}

function parseFoodInstruction(freq: string | null, dosage: string | null): { label: string; className: string } {
  const text = `${freq || ""} ${dosage || ""}`.toLowerCase();

  if (text.includes("before food") || text.includes("before meal") || text.includes("empty stomach") || text.includes("before eating"))
    return { label: "Before food", className: "bg-amber-100 text-amber-700 border-amber-200" };
  if (text.includes("after food") || text.includes("after meal") || text.includes("after eating"))
    return { label: "After food", className: "bg-primary/10 text-primary border-primary/20" };
  if (text.includes("with food") || text.includes("with meal") || text.includes("during meal"))
    return { label: "With food", className: "bg-blue-100 text-blue-700 border-blue-200" };

  return { label: "With or without food", className: "bg-muted text-muted-foreground border-border" };
}

const MedicationSchedule = ({ medications, patientId }: MedicationScheduleProps) => {
  const [openSlot, setOpenSlot] = useState<TimeSlot>("morning");
  const [purposes, setPurposes] = useState<Record<string, string>>({});

  // Fetch or generate one-line purposes for each medication
  useEffect(() => {
    if (!patientId || medications.length === 0) return;

    const fetchPurposes = async () => {
      // First check existing drug_descriptions for cached purposes
      const { data: meds } = await supabase
        .from("medications")
        .select("id, name")
        .eq("patient_id", patientId);

      if (!meds || meds.length === 0) return;

      const medMap = new Map<string, string>();
      meds.forEach(m => medMap.set(m.name.toLowerCase(), m.id));

      // Fetch existing descriptions
      const medIds = meds.map(m => m.id);
      const { data: existing } = await supabase
        .from("drug_descriptions")
        .select("medication_id, plain_description")
        .in("medication_id", medIds);

      const existingMap = new Map<string, string>();
      const idToName = new Map<string, string>();
      meds.forEach(m => idToName.set(m.id, m.name));

      existing?.forEach(d => {
        const name = idToName.get(d.medication_id);
        if (name && d.plain_description) {
          existingMap.set(name.toLowerCase(), d.plain_description);
        }
      });

      // Set cached ones immediately
      const cached: Record<string, string> = {};
      existingMap.forEach((desc, name) => { cached[name] = desc; });
      if (Object.keys(cached).length > 0) setPurposes(prev => ({ ...prev, ...cached }));

      // Generate missing ones
      for (const med of medications) {
        const key = med.name.toLowerCase();
        if (existingMap.has(key)) continue;
        const medId = medMap.get(key);
        if (!medId) continue;

        try {
          const { data } = await supabase.functions.invoke("describe-drug", {
            body: { medication_id: medId, medication_name: med.name, dosage: med.dosage, patient_id: patientId },
          });
          if (data?.plain_description) {
            setPurposes(prev => ({ ...prev, [key]: data.plain_description }));
          }
        } catch {
          // ignore failures silently
        }
      }
    };

    fetchPurposes();
  }, [patientId, medications]);

  const slotMeds: Record<TimeSlot, MedicationWithFreq[]> = {
    morning: [],
    noon: [],
    evening: [],
  };

  medications.forEach((med) => {
    const slots = classifyTimeSlots(med.frequency);
    slots.forEach((s) => slotMeds[s].push(med));
  });

  const slots: TimeSlot[] = ["morning", "noon", "evening"];

  return (
    <div className="space-y-5">
      <h2 className="text-2xl font-bold text-foreground">Current Medications</h2>

      {medications.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <p className="text-base text-muted-foreground">No medications on record yet.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {/* Time slot selector cards */}
          <div className="grid grid-cols-3 gap-3">
            {slots.map((slot) => {
              const config = slotConfig[slot];
              const Icon = config.icon;
              const count = slotMeds[slot].length;
              const isOpen = openSlot === slot;

              return (
                <button
                  key={slot}
                  onClick={() => setOpenSlot(slot)}
                  className={cn(
                    "flex flex-col items-center gap-2 rounded-xl border p-5 transition-all cursor-pointer",
                    isOpen
                      ? "border-primary bg-primary/5 shadow-md ring-2 ring-primary/20"
                      : "border-border bg-card hover:border-primary/30 hover:bg-primary/5"
                  )}
                >
                  <Icon className={cn("h-7 w-7", isOpen ? "text-primary" : "text-muted-foreground")} />
                  <span className={cn("text-base font-bold", isOpen ? "text-primary" : "text-foreground")}>{config.label}</span>
                  <span className="text-xs text-muted-foreground">
                    {count} {count === 1 ? "medication" : "medications"}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Expanded medication list */}
          <Card className="border-primary/20">
            <CardContent className="p-6 space-y-3">
              {slotMeds[openSlot].length === 0 ? (
                <p className="text-base text-muted-foreground text-center py-4">No medications at this time</p>
              ) : (
                <>
                  {slotMeds[openSlot].map((med, i) => {
                    const food = parseFoodInstruction(med.frequency, med.dosage);
                    const purpose = purposes[med.name.toLowerCase()];
                    return (
                      <div key={`${med.name}-${i}`} className="flex items-center justify-between py-3 border-b border-border last:border-0">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                            <Pill className="h-4 w-4 text-primary" />
                          </div>
                          <div>
                            <p className="text-base font-bold text-foreground">{med.name}</p>
                            {med.dosage && <p className="text-sm text-muted-foreground">{med.dosage}</p>}
                            {purpose && <p className="text-sm italic text-muted-foreground">{purpose}</p>}
                          </div>
                        </div>
                        <Badge variant="outline" className={cn("text-xs font-semibold shrink-0", food.className)}>
                          {food.label}
                        </Badge>
                      </div>
                    );
                  })}
                </>
              )}
              <p className="text-xs text-muted-foreground pt-3 border-t border-border">
                These are based on your latest prescription. Talk to your doctor about any changes.
              </p>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};

export default MedicationSchedule;
