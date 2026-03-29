import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon, ChevronLeft, ChevronRight, X } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface ProfileData {
  name: string;
  dob: Date | undefined;
  sex: string;
  blood_type: string;
  height_value: string;
  height_unit: "imperial" | "metric";
  height_ft: string;
  height_in: string;
  weight_value: string;
  weight_unit: "lbs" | "kg";
  conditions: string[];
  allergies: string[];
  smoker: string;
  alcohol: string;
  exercise: string;
  pregnant: string;
  last_period: Date | undefined;
  cycle_length: number;
  periods_regular: string;
  pcos_diagnosed: string;
  hormonal_contraception: string;
  contraception_type: string;
  menopause: string;
  emergency_contact_name: string;
  emergency_contact_phone: string;
  emergency_contact_relationship: string;
  doctor_name: string;
  doctor_clinic: string;
  insurance_provider: string;
  insurance_member_id: string;
}

const COMMON_CONDITIONS = ["Diabetes", "PCOS", "Thyroid disorder", "Hypertension", "Asthma", "Arthritis", "Heart disease", "Depression", "Anxiety"];
const COMMON_ALLERGIES = ["Penicillin", "Sulfa drugs", "Aspirin", "Ibuprofen", "Latex", "Peanuts", "Shellfish", "Dairy", "Gluten"];
const BLOOD_TYPES = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-", "I don't know"];
const SEX_OPTIONS = [
  { value: "male", label: "Male", emoji: "👨" },
  { value: "female", label: "Female", emoji: "👩" },
  { value: "prefer_not_to_say", label: "Prefer not to say", emoji: "🤝" },
];

const STEP_INFO = [
  { heading: "Let's start with the basics", sub: "This helps doctors understand your background at a glance" },
  { heading: "Tell us about your health", sub: "So we can give you more relevant insights from your reports" },
  { heading: "A few more details", sub: "This information helps us personalise your health insights" },
  { heading: "Almost done!", sub: "Emergency contacts and doctor info — just in case" },
];

const SetupProfile = () => {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);
  const [loadingExisting, setLoadingExisting] = useState(true);
  const [conditionInput, setConditionInput] = useState("");
  const [allergyInput, setAllergyInput] = useState("");

  const [data, setData] = useState<ProfileData>({
    name: "",
    dob: undefined,
    sex: "",
    blood_type: "",
    height_value: "",
    height_unit: "metric",
    height_ft: "",
    height_in: "",
    weight_value: "",
    weight_unit: "kg",
    conditions: [],
    allergies: [],
    smoker: "",
    alcohol: "",
    exercise: "",
    pregnant: "",
    last_period: undefined,
    cycle_length: 28,
    periods_regular: "",
    pcos_diagnosed: "",
    hormonal_contraception: "",
    contraception_type: "",
    menopause: "",
    emergency_contact_name: "",
    emergency_contact_phone: "",
    emergency_contact_relationship: "",
    doctor_name: "",
    doctor_clinic: "",
    insurance_provider: "",
    insurance_member_id: "",
  });

  // Load existing patient data for edit mode
  useEffect(() => {
    if (!user) return;
    const load = async () => {
      const { data: p } = await supabase
        .from("patients")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();

      if (p) {
        setData((prev) => ({
          ...prev,
          name: p.name || prev.name,
          dob: p.dob ? new Date(p.dob + "T00:00:00") : undefined,
          sex: (p as any).sex || "",
          blood_type: p.blood_type || "",
          height_value: (p as any).height_cm ? String((p as any).height_cm) : "",
          weight_value: (p as any).weight_kg ? String((p as any).weight_kg) : "",
          conditions: p.conditions || [],
          allergies: p.allergies || [],
          smoker: (p as any).smoker || "",
          alcohol: (p as any).alcohol || "",
          exercise: (p as any).exercise || "",
          pregnant: (p as any).pregnant || "",
          last_period: (p as any).last_period ? new Date((p as any).last_period + "T00:00:00") : undefined,
          cycle_length: (p as any).cycle_length || 28,
          periods_regular: (p as any).periods_regular || "",
          pcos_diagnosed: (p as any).pcos_diagnosed || "",
          hormonal_contraception: (p as any).hormonal_contraception || "",
          contraception_type: (p as any).contraception_type || "",
          menopause: (p as any).menopause || "",
          emergency_contact_name: (p as any).emergency_contact_name || "",
          emergency_contact_phone: (p as any).emergency_contact_phone || "",
          emergency_contact_relationship: (p as any).emergency_contact_relationship || "",
          doctor_name: (p as any).doctor_name || "",
          doctor_clinic: (p as any).doctor_clinic || "",
          insurance_provider: (p as any).insurance_provider || "",
          insurance_member_id: (p as any).insurance_member_id || "",
        }));
      }

      // Pre-fill name from profile if empty
      if (!p?.name && profile?.name) {
        setData((prev) => ({ ...prev, name: profile.name }));
      }

      setLoadingExisting(false);
    };
    load();
  }, [user, profile]);

  const totalSteps = data.sex === "female" ? 4 : 3;
  const adjustedStep = data.sex !== "female" && step >= 3 ? step + 1 : step;
  const displayStep = step;

  const update = <K extends keyof ProfileData>(key: K, value: ProfileData[K]) =>
    setData((prev) => ({ ...prev, [key]: value }));

  const addTag = (key: "conditions" | "allergies", value: string) => {
    const trimmed = value.trim();
    if (trimmed && !data[key].includes(trimmed)) {
      update(key, [...data[key], trimmed]);
    }
  };

  const removeTag = (key: "conditions" | "allergies", value: string) => {
    update(key, data[key].filter((t) => t !== value));
  };

  const getHeightCm = (): number | null => {
    if (data.height_unit === "metric") {
      return data.height_value ? Number(data.height_value) : null;
    }
    const ft = Number(data.height_ft) || 0;
    const inc = Number(data.height_in) || 0;
    if (ft === 0 && inc === 0) return null;
    return Math.round(ft * 30.48 + inc * 2.54);
  };

  const getWeightKg = (): number | null => {
    if (!data.weight_value) return null;
    if (data.weight_unit === "kg") return Number(data.weight_value);
    return Math.round(Number(data.weight_value) * 0.453592);
  };

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);

    const updatePayload: Record<string, any> = {
      name: data.name,
      dob: data.dob ? format(data.dob, "yyyy-MM-dd") : null,
      sex: data.sex || null,
      blood_type: data.blood_type === "I don't know" ? null : data.blood_type || null,
      height_cm: getHeightCm(),
      weight_kg: getWeightKg(),
      conditions: data.conditions.length > 0 ? data.conditions : null,
      allergies: data.allergies.length > 0 ? data.allergies : null,
      smoker: data.smoker || null,
      alcohol: data.alcohol || null,
      exercise: data.exercise || null,
      pregnant: data.sex === "female" ? data.pregnant || null : null,
      last_period: data.sex === "female" && data.last_period ? format(data.last_period, "yyyy-MM-dd") : null,
      cycle_length: data.sex === "female" ? data.cycle_length : null,
      periods_regular: data.sex === "female" ? data.periods_regular || null : null,
      pcos_diagnosed: data.sex === "female" ? data.pcos_diagnosed || null : null,
      hormonal_contraception: data.sex === "female" ? data.hormonal_contraception || null : null,
      contraception_type: data.sex === "female" && data.hormonal_contraception === "yes" ? data.contraception_type || null : null,
      menopause: data.sex === "female" ? data.menopause || null : null,
      emergency_contact_name: data.emergency_contact_name || null,
      emergency_contact_phone: data.emergency_contact_phone || null,
      emergency_contact_relationship: data.emergency_contact_relationship || null,
      doctor_name: data.doctor_name || null,
      doctor_clinic: data.doctor_clinic || null,
      insurance_provider: data.insurance_provider || null,
      insurance_member_id: data.insurance_member_id || null,
      profile_completed: true,
    };

    const { error } = await supabase
      .from("patients")
      .update(updatePayload)
      .eq("user_id", user.id);

    if (error) {
      toast.error("Something went wrong. Please try again.");
      console.error(error);
    } else {
      toast.success("Your profile has been saved!");
      navigate("/dashboard");
    }
    setSaving(false);
  };

  const nextStep = () => {
    if (step < totalSteps) setStep(step + 1);
  };
  const prevStep = () => {
    if (step > 1) setStep(step - 1);
  };

  // Determine actual content step
  const getContentStep = () => {
    if (data.sex !== "female") {
      if (step === 1) return 1;
      if (step === 2) return 2;
      if (step === 3) return 4; // skip step 3 (female-only)
    }
    return step;
  };

  const contentStep = getContentStep();
  const stepInfo = STEP_INFO[contentStep - 1];

  if (loadingExisting) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted">
        <p className="text-lg text-muted-foreground">Loading…</p>
      </div>
    );
  }

  const SelectableCard = ({ selected, onClick, children, className = "" }: { selected: boolean; onClick: () => void; children: React.ReactNode; className?: string }) => (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-xl border-2 p-4 text-center transition-all cursor-pointer",
        selected ? "border-primary bg-primary/5 shadow-sm" : "border-border bg-card hover:border-primary/40",
        className
      )}
    >
      {children}
    </button>
  );

  const ChipSelect = ({ options, selected, onSelect }: { options: string[]; selected: string; onSelect: (v: string) => void }) => (
    <div className="flex flex-wrap gap-2">
      {options.map((opt) => (
        <button
          key={opt}
          type="button"
          onClick={() => onSelect(opt)}
          className={cn(
            "rounded-full px-4 py-2 text-sm font-medium border transition-all",
            selected === opt
              ? "bg-primary text-primary-foreground border-primary"
              : "bg-card text-foreground border-border hover:border-primary/40"
          )}
        >
          {opt}
        </button>
      ))}
    </div>
  );

  const OptionButtons = ({ options, selected, onSelect }: { options: { value: string; label: string }[]; selected: string; onSelect: (v: string) => void }) => (
    <div className="flex flex-wrap gap-3">
      {options.map((opt) => (
        <button
          key={opt.value}
          type="button"
          onClick={() => onSelect(opt.value)}
          className={cn(
            "rounded-xl border-2 px-5 py-3 text-base font-medium transition-all",
            selected === opt.value
              ? "border-primary bg-primary/5"
              : "border-border bg-card hover:border-primary/40"
          )}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );

  const TagInput = ({ label, tags, suggestions, input, setInput, onAdd, onRemove }: {
    label: string; tags: string[]; suggestions: string[]; input: string; setInput: (v: string) => void; onAdd: (v: string) => void; onRemove: (v: string) => void;
  }) => (
    <div className="space-y-3">
      <Label className="text-base font-medium">{label}</Label>
      <div className="flex flex-wrap gap-2 mb-2">
        {tags.map((t) => (
          <Badge key={t} variant="secondary" className="text-sm px-3 py-1.5 gap-1">
            {t}
            <button type="button" onClick={() => onRemove(t)} className="ml-1 hover:text-destructive"><X className="h-3 w-3" /></button>
          </Badge>
        ))}
      </div>
      <div className="flex gap-2">
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Type and press Enter…"
          className="text-base h-11"
          onKeyDown={(e) => {
            if (e.key === "Enter") { e.preventDefault(); onAdd(input); setInput(""); }
          }}
        />
      </div>
      <div className="flex flex-wrap gap-2 mt-2">
        {suggestions.filter((s) => !tags.includes(s)).map((s) => (
          <button key={s} type="button" onClick={() => onAdd(s)} className="rounded-full border border-dashed border-primary/40 px-3 py-1.5 text-sm text-primary hover:bg-primary/5 transition-colors">
            + {s}
          </button>
        ))}
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-muted flex items-start justify-center px-4 py-8 sm:py-12">
      <div className="w-full max-w-2xl space-y-6">
        {/* Logo */}
        <h1 className="text-2xl font-bold text-primary text-center">Medilyzer</h1>

        {/* Progress bar */}
        <div className="space-y-2">
          <p className="text-sm text-muted-foreground text-center">Step {displayStep} of {totalSteps}</p>
          <div className="w-full h-2 bg-border rounded-full overflow-hidden">
            <div className="h-full bg-primary rounded-full transition-all duration-500" style={{ width: `${(displayStep / totalSteps) * 100}%` }} />
          </div>
        </div>

        {/* Step heading */}
        <div className="text-center space-y-1">
          <h2 className="text-2xl font-bold text-foreground">{stepInfo.heading}</h2>
          <p className="text-base text-muted-foreground">{stepInfo.sub}</p>
        </div>

        <Card>
          <CardContent className="p-6 sm:p-8 space-y-6">
            {/* STEP 1 — Basic Information */}
            {contentStep === 1 && (
              <>
                <div className="space-y-2">
                  <Label className="text-base font-medium">Full name</Label>
                  <Input value={data.name} onChange={(e) => update("name", e.target.value)} className="text-base h-12" placeholder="Your full name" />
                </div>

                <div className="space-y-2">
                  <Label className="text-base font-medium">Date of birth</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className={cn("w-full h-12 text-base justify-start", !data.dob && "text-muted-foreground")}>
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {data.dob ? format(data.dob, "PPP") : "Pick your date of birth"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={data.dob}
                        onSelect={(d) => update("dob", d)}
                        disabled={(d) => d > new Date() || d < new Date("1900-01-01")}
                        initialFocus
                        captionLayout="dropdown-buttons"
                        fromYear={1930}
                        toYear={new Date().getFullYear()}
                        className="p-3 pointer-events-auto"
                      />
                    </PopoverContent>
                  </Popover>
                </div>

                <div className="space-y-2">
                  <Label className="text-base font-medium">Biological sex</Label>
                  <div className="grid grid-cols-3 gap-3">
                    {SEX_OPTIONS.map((opt) => (
                      <SelectableCard key={opt.value} selected={data.sex === opt.value} onClick={() => update("sex", opt.value)}>
                        <span className="text-2xl block mb-1">{opt.emoji}</span>
                        <span className="text-base font-medium">{opt.label}</span>
                      </SelectableCard>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-base font-medium">Blood type</Label>
                  <ChipSelect options={BLOOD_TYPES} selected={data.blood_type} onSelect={(v) => update("blood_type", v)} />
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-base font-medium">Height</Label>
                    <button type="button" onClick={() => update("height_unit", data.height_unit === "metric" ? "imperial" : "metric")} className="text-sm text-primary font-medium hover:underline">
                      Switch to {data.height_unit === "metric" ? "ft/in" : "cm"}
                    </button>
                  </div>
                  {data.height_unit === "metric" ? (
                    <Input value={data.height_value} onChange={(e) => update("height_value", e.target.value)} className="text-base h-12" placeholder="Height in cm" type="number" />
                  ) : (
                    <div className="flex gap-3">
                      <Input value={data.height_ft} onChange={(e) => update("height_ft", e.target.value)} className="text-base h-12" placeholder="Feet" type="number" />
                      <Input value={data.height_in} onChange={(e) => update("height_in", e.target.value)} className="text-base h-12" placeholder="Inches" type="number" />
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-base font-medium">Weight</Label>
                    <button type="button" onClick={() => update("weight_unit", data.weight_unit === "kg" ? "lbs" : "kg")} className="text-sm text-primary font-medium hover:underline">
                      Switch to {data.weight_unit === "kg" ? "lbs" : "kg"}
                    </button>
                  </div>
                  <Input value={data.weight_value} onChange={(e) => update("weight_value", e.target.value)} className="text-base h-12" placeholder={`Weight in ${data.weight_unit}`} type="number" />
                </div>
              </>
            )}

            {/* STEP 2 — Health Background */}
            {contentStep === 2 && (
              <>
                <TagInput
                  label="Chronic conditions"
                  tags={data.conditions}
                  suggestions={COMMON_CONDITIONS}
                  input={conditionInput}
                  setInput={setConditionInput}
                  onAdd={(v) => addTag("conditions", v)}
                  onRemove={(v) => removeTag("conditions", v)}
                />

                <TagInput
                  label="Known allergies"
                  tags={data.allergies}
                  suggestions={COMMON_ALLERGIES}
                  input={allergyInput}
                  setInput={setAllergyInput}
                  onAdd={(v) => addTag("allergies", v)}
                  onRemove={(v) => removeTag("allergies", v)}
                />

                <div className="space-y-2">
                  <Label className="text-base font-medium">Do you smoke?</Label>
                  <OptionButtons
                    options={[{ value: "no", label: "No" }, { value: "yes", label: "Yes" }, { value: "former", label: "Former smoker" }]}
                    selected={data.smoker}
                    onSelect={(v) => update("smoker", v)}
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-base font-medium">Alcohol consumption?</Label>
                  <OptionButtons
                    options={[{ value: "never", label: "Never" }, { value: "occasionally", label: "Occasionally" }, { value: "regularly", label: "Regularly" }]}
                    selected={data.alcohol}
                    onSelect={(v) => update("alcohol", v)}
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-base font-medium">Do you exercise?</Label>
                  <OptionButtons
                    options={[{ value: "never", label: "Never" }, { value: "sometimes", label: "Sometimes" }, { value: "regularly", label: "Regularly" }]}
                    selected={data.exercise}
                    onSelect={(v) => update("exercise", v)}
                  />
                </div>
              </>
            )}

            {/* STEP 3 — Female-only */}
            {contentStep === 3 && (
              <>
                <div className="space-y-2">
                  <Label className="text-base font-medium">Are you currently pregnant?</Label>
                  <OptionButtons
                    options={[{ value: "yes", label: "Yes" }, { value: "no", label: "No" }]}
                    selected={data.pregnant}
                    onSelect={(v) => update("pregnant", v)}
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-base font-medium">First day of your last period</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className={cn("w-full h-12 text-base justify-start", !data.last_period && "text-muted-foreground")}>
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {data.last_period ? format(data.last_period, "PPP") : "Select date"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={data.last_period}
                        onSelect={(d) => update("last_period", d)}
                        disabled={(d) => d > new Date()}
                        initialFocus
                        className="p-3 pointer-events-auto"
                      />
                    </PopoverContent>
                  </Popover>
                </div>

                <div className="space-y-3">
                  <Label className="text-base font-medium">Average cycle length: {data.cycle_length} days</Label>
                  <Slider
                    value={[data.cycle_length]}
                    onValueChange={(v) => update("cycle_length", v[0])}
                    min={21}
                    max={35}
                    step={1}
                    className="py-2"
                  />
                  <div className="flex justify-between text-sm text-muted-foreground">
                    <span>21 days</span>
                    <span>35 days</span>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-base font-medium">Are your periods regular?</Label>
                  <OptionButtons
                    options={[{ value: "yes", label: "Yes" }, { value: "no", label: "No" }, { value: "sometimes", label: "Sometimes" }]}
                    selected={data.periods_regular}
                    onSelect={(v) => update("periods_regular", v)}
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-base font-medium">Have you been diagnosed with PCOS?</Label>
                  <OptionButtons
                    options={[{ value: "yes", label: "Yes" }, { value: "no", label: "No" }, { value: "not_sure", label: "Not sure" }]}
                    selected={data.pcos_diagnosed}
                    onSelect={(v) => update("pcos_diagnosed", v)}
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-base font-medium">Are you on any hormonal contraception?</Label>
                  <OptionButtons
                    options={[{ value: "yes", label: "Yes" }, { value: "no", label: "No" }]}
                    selected={data.hormonal_contraception}
                    onSelect={(v) => update("hormonal_contraception", v)}
                  />
                  {data.hormonal_contraception === "yes" && (
                    <div className="mt-3 space-y-2">
                      <Label className="text-sm text-muted-foreground">Which type?</Label>
                      <ChipSelect
                        options={["Pill", "IUD", "Implant", "Injection", "Patch", "Other"]}
                        selected={data.contraception_type}
                        onSelect={(v) => update("contraception_type", v)}
                      />
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <Label className="text-base font-medium">Have you gone through menopause?</Label>
                  <OptionButtons
                    options={[{ value: "yes", label: "Yes" }, { value: "no", label: "No" }]}
                    selected={data.menopause}
                    onSelect={(v) => update("menopause", v)}
                  />
                </div>
              </>
            )}

            {/* STEP 4 — Emergency & Doctor */}
            {contentStep === 4 && (
              <>
                <div className="space-y-2">
                  <Label className="text-base font-medium">Emergency contact name</Label>
                  <Input value={data.emergency_contact_name} onChange={(e) => update("emergency_contact_name", e.target.value)} className="text-base h-12" placeholder="e.g. John Smith" />
                </div>

                <div className="space-y-2">
                  <Label className="text-base font-medium">Emergency contact phone</Label>
                  <Input value={data.emergency_contact_phone} onChange={(e) => update("emergency_contact_phone", e.target.value)} className="text-base h-12" placeholder="Phone number" type="tel" />
                </div>

                <div className="space-y-2">
                  <Label className="text-base font-medium">Relationship</Label>
                  <ChipSelect
                    options={["Spouse", "Parent", "Sibling", "Friend", "Other"]}
                    selected={data.emergency_contact_relationship}
                    onSelect={(v) => update("emergency_contact_relationship", v)}
                  />
                </div>

                <div className="border-t border-border my-4" />

                <div className="space-y-2">
                  <Label className="text-base font-medium">Primary care doctor <span className="text-muted-foreground font-normal">(optional)</span></Label>
                  <Input value={data.doctor_name} onChange={(e) => update("doctor_name", e.target.value)} className="text-base h-12" placeholder="Doctor's name" />
                </div>

                <div className="space-y-2">
                  <Label className="text-base font-medium">Clinic or hospital <span className="text-muted-foreground font-normal">(optional)</span></Label>
                  <Input value={data.doctor_clinic} onChange={(e) => update("doctor_clinic", e.target.value)} className="text-base h-12" placeholder="Clinic or hospital name" />
                </div>

                <div className="border-t border-border my-4" />

                <div className="space-y-2">
                  <Label className="text-base font-medium">Insurance provider <span className="text-muted-foreground font-normal">(optional)</span></Label>
                  <Input value={data.insurance_provider} onChange={(e) => update("insurance_provider", e.target.value)} className="text-base h-12" placeholder="Insurance company" />
                </div>

                <div className="space-y-2">
                  <Label className="text-base font-medium">Insurance member ID <span className="text-muted-foreground font-normal">(optional)</span></Label>
                  <Input value={data.insurance_member_id} onChange={(e) => update("insurance_member_id", e.target.value)} className="text-base h-12" placeholder="Member ID" />
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Navigation */}
        <div className="flex justify-between items-center gap-4">
          {step > 1 ? (
            <Button variant="outline" onClick={prevStep} className="h-12 px-6 text-base gap-2">
              <ChevronLeft className="h-4 w-4" /> Back
            </Button>
          ) : (
            <div />
          )}

          {step < totalSteps ? (
            <Button onClick={nextStep} className="h-12 px-8 text-base gap-2 bg-primary hover:bg-primary/90 text-primary-foreground">
              Next <ChevronRight className="h-4 w-4" />
            </Button>
          ) : (
            <Button onClick={handleSave} disabled={saving} className="h-12 px-8 text-base bg-primary hover:bg-primary/90 text-primary-foreground">
              {saving ? "Saving…" : "Complete My Profile ✨"}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};

export default SetupProfile;
