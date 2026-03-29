import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  FileText,
  Trash2,
  Eye,
  Download,
  Stethoscope,
  ClipboardList,
  Pill,
  BarChart3,
  Search,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";
import { format } from "date-fns";
import SecondOpinionModal from "./SecondOpinionModal";

interface ReportCardProps {
  report: {
    id: string;
    file_url: string | null;
    type: string;
    upload_date: string;
    raw_text: string | null;
  };
  patientId: string;
  onDeleteComplete: () => void;
}

interface MarkerInfo {
  name: string;
  value: number;
  unit: string | null;
  status: string | null;
}

interface MedInfo {
  name: string;
  dosage: string | null;
}

interface DoctorInfo {
  doctor_name: string | null;
  clinic_name: string | null;
  visit_date: string | null;
}

const friendlyName = (name: string) =>
  name
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());

const statusBadge = (status: string | null) => {
  if (!status) return null;
  const s = status.toLowerCase();
  if (s === "normal")
    return <Badge className="bg-green-600 text-white text-xs">This is Normal</Badge>;
  if (s === "low")
    return <Badge className="bg-destructive text-destructive-foreground text-xs">This is Low</Badge>;
  if (s === "high")
    return <Badge className="bg-orange-500 text-white text-xs">This is High</Badge>;
  return <Badge variant="secondary" className="text-xs">{status}</Badge>;
};

const ReportCard = ({ report, patientId, onDeleteComplete }: ReportCardProps) => {
  const { user } = useAuth();
  const [summary, setSummary] = useState<string | null>(null);
  const [markers, setMarkers] = useState<MarkerInfo[]>([]);
  const [meds, setMeds] = useState<MedInfo[]>([]);
  const [doctorInfo, setDoctorInfo] = useState<DoctorInfo | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showPdf, setShowPdf] = useState(false);
  const [showSecondOpinion, setShowSecondOpinion] = useState(false);

  useEffect(() => {
    const fetchDetails = async () => {
      const [summRes, markRes, medRes] = await Promise.all([
        supabase.from("summaries").select("plain_text").eq("record_id", report.id).limit(1),
        supabase.from("markers").select("name, value, unit, status").eq("record_id", report.id),
        supabase.from("medications").select("name, dosage").eq("patient_id", patientId),
      ]);
      setSummary(summRes.data?.[0]?.plain_text || null);
      setMarkers(markRes.data || []);
      setMeds(medRes.data || []);

      // Try to extract doctor info from raw_text
      if (report.raw_text) {
        const text = report.raw_text;
        const drMatch = text.match(/(?:Dr\.?|Doctor)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)/);
        const clinicMatch = text.match(/(?:Clinic|Hospital|Centre|Center|Lab|Laboratory)[:\s]+([^\n,]+)/i);
        const dateMatch = text.match(/(?:Date|Visit|Collected)[:\s]+(\d{1,2}[\/-]\d{1,2}[\/-]\d{2,4})/i);
        setDoctorInfo({
          doctor_name: drMatch?.[1] || null,
          clinic_name: clinicMatch?.[1]?.trim() || null,
          visit_date: dateMatch?.[1] || null,
        });
      }
    };
    fetchDetails();
  }, [report.id, patientId, report.raw_text]);

  const getFileName = (url: string | null) => {
    if (!url) return "Unknown file";
    const parts = url.split("/");
    const raw = parts[parts.length - 1];
    const match = raw.match(/^\d+_(.+)$/);
    return match ? decodeURIComponent(match[1]) : decodeURIComponent(raw);
  };

  const getStoragePath = (url: string | null) => {
    if (!url || !user) return null;
    const match = url.match(/\/medical-records\/(.+)$/);
    return match ? decodeURIComponent(match[1]) : null;
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      const storagePath = getStoragePath(report.file_url);
      if (storagePath) {
        await supabase.storage.from("medical-records").remove([storagePath]);
      }
      await supabase.from("markers").delete().eq("record_id", report.id);
      await supabase.from("summaries").delete().eq("record_id", report.id);
      await supabase.from("medical_records").delete().eq("id", report.id);
      toast({ title: "Report deleted successfully" });
      setShowDeleteConfirm(false);
      onDeleteComplete();
    } catch (err: any) {
      toast({ title: "Delete failed", description: err.message, variant: "destructive" });
    } finally {
      setDeleting(false);
    }
  };

  const formatDate = (dateStr: string) => {
    try {
      return format(new Date(dateStr), "MMM d, yyyy 'at' h:mm a");
    } catch {
      return dateStr;
    }
  };

  const hasDoctorInfo = doctorInfo && (doctorInfo.doctor_name || doctorInfo.clinic_name || doctorInfo.visit_date);

  return (
    <>
      <Card className="overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-border">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
              <FileText className="h-5 w-5 text-primary" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-base font-bold text-foreground truncate">
                  {getFileName(report.file_url)}
                </h3>
                <Badge variant="secondary" className="text-xs shrink-0">
                  {report.type === "prescription" ? "Prescription" : "Lab Report"}
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground">{formatDate(report.upload_date)}</p>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="text-primary border-primary hover:bg-primary/10 shrink-0"
            onClick={() => setShowPdf(true)}
          >
            <Eye className="h-4 w-4 mr-1" />
            View PDF
          </Button>
        </div>

        {/* Details */}
        <CardContent className="p-5 space-y-5">
          {/* Doctor Info */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
              <Stethoscope className="h-4 w-4 text-primary" />
              Doctor Information
            </div>
            {hasDoctorInfo ? (
              <div className="pl-6 text-sm text-muted-foreground space-y-1">
                {doctorInfo!.doctor_name && <p>Dr. {doctorInfo!.doctor_name}</p>}
                {doctorInfo!.clinic_name && <p>{doctorInfo!.clinic_name}</p>}
                {doctorInfo!.visit_date && <p>Visit: {doctorInfo!.visit_date}</p>}
              </div>
            ) : (
              <p className="pl-6 text-sm text-muted-foreground">Doctor information not found in this report</p>
            )}
          </div>

          {/* Summary */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
              <ClipboardList className="h-4 w-4 text-primary" />
              Summary
            </div>
            <p className="pl-6 text-base text-muted-foreground leading-relaxed">
              {summary || "No summary available"}
            </p>
          </div>

          {/* Medications */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
              <Pill className="h-4 w-4 text-primary" />
              Medications from this report
            </div>
            {meds.length > 0 ? (
              <div className="pl-6 space-y-1">
                {meds.map((m, i) => (
                  <p key={i} className="text-sm text-muted-foreground">
                    <span className="font-medium text-foreground">{m.name}</span>
                    {m.dosage && <span> — {m.dosage}</span>}
                  </p>
                ))}
              </div>
            ) : (
              <p className="pl-6 text-sm text-muted-foreground">No medications found in this report</p>
            )}
          </div>

          {/* Test Results */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
              <BarChart3 className="h-4 w-4 text-primary" />
              Key test results from this report
            </div>
            {markers.length > 0 ? (
              <div className="pl-6 space-y-2">
                {markers.map((m, i) => (
                  <div key={i} className="flex items-center justify-between gap-2">
                    <span className="text-sm text-foreground">{friendlyName(m.name)}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-foreground">
                        {m.value} {m.unit || ""}
                      </span>
                      {statusBadge(m.status)}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="pl-6 text-sm text-muted-foreground">No test results found in this report</p>
            )}
          </div>
        </CardContent>

        {/* Footer buttons */}
        <div className="flex items-center gap-3 p-5 pt-0">
          <Button
            variant="outline"
            className="text-destructive border-destructive hover:bg-destructive/10"
            onClick={() => setShowDeleteConfirm(true)}
          >
            <Trash2 className="h-4 w-4 mr-1" />
            Delete Report
          </Button>
          <Button onClick={() => setShowSecondOpinion(true)}>
            <Search className="h-4 w-4 mr-1" />
            Looking for a second opinion?
          </Button>
        </div>
      </Card>

      {/* Delete confirmation */}
      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete report?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this report? This will also remove all markers and data extracted from it.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={deleting}>
              {deleting ? "Deleting…" : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* PDF Viewer */}
      <Dialog open={showPdf} onOpenChange={setShowPdf}>
        <DialogContent className="max-w-[80vw] w-[80vw] h-[85vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>{getFileName(report.file_url)}</DialogTitle>
          </DialogHeader>
          <div className="flex-1 min-h-0">
            {report.file_url && (
              <iframe src={report.file_url} className="w-full h-full rounded border" title="PDF Viewer" />
            )}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              className="text-primary border-primary hover:bg-primary/10"
              onClick={() => {
                if (report.file_url) {
                  const a = document.createElement("a");
                  a.href = report.file_url;
                  a.download = getFileName(report.file_url);
                  a.target = "_blank";
                  a.click();
                }
              }}
            >
              <Download className="h-4 w-4 mr-1" />
              Download
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Second Opinion Modal */}
      <SecondOpinionModal
        open={showSecondOpinion}
        onOpenChange={setShowSecondOpinion}
        recordId={report.id}
        patientId={patientId}
      />
    </>
  );
};

export default ReportCard;
