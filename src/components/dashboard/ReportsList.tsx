import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { FileText, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";
import { format } from "date-fns";

interface Report {
  id: string;
  file_url: string | null;
  type: string;
  upload_date: string;
}

interface ReportsListProps {
  patientId: string | null;
  onDeleteComplete: () => void;
}

const ReportsList = ({ patientId, onDeleteComplete }: ReportsListProps) => {
  const { user } = useAuth();
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const fetchReports = async () => {
    if (!patientId) return;
    const { data } = await supabase
      .from("medical_records")
      .select("id, file_url, type, upload_date")
      .eq("patient_id", patientId)
      .order("upload_date", { ascending: false });
    setReports(data || []);
    setLoading(false);
  };

  useEffect(() => {
    fetchReports();
  }, [patientId]);

  const getFileName = (url: string | null) => {
    if (!url) return "Unknown file";
    const parts = url.split("/");
    const raw = parts[parts.length - 1];
    // Remove timestamp prefix (e.g. "1234567890_filename.pdf")
    const match = raw.match(/^\d+_(.+)$/);
    return match ? decodeURIComponent(match[1]) : decodeURIComponent(raw);
  };

  const getStoragePath = (url: string | null) => {
    if (!url || !user) return null;
    // Extract path after /medical-records/
    const match = url.match(/\/medical-records\/(.+)$/);
    return match ? decodeURIComponent(match[1]) : null;
  };

  const handleDelete = async () => {
    if (!deleteId || !patientId) return;
    setDeleting(true);

    try {
      const report = reports.find((r) => r.id === deleteId);

      // Delete from storage
      const storagePath = getStoragePath(report?.file_url ?? null);
      if (storagePath) {
        await supabase.storage.from("medical-records").remove([storagePath]);
      }

      // Delete related markers, summaries, then the record itself
      await supabase.from("markers").delete().eq("record_id", deleteId);
      await supabase.from("summaries").delete().eq("record_id", deleteId);
      await supabase.from("medical_records").delete().eq("id", deleteId);

      toast({ title: "Report deleted successfully" });
      setDeleteId(null);
      await fetchReports();
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

  const typeBadge = (type: string) => {
    const label = type === "prescription" ? "Prescription" : "Lab Report";
    return (
      <Badge variant="secondary" className="text-xs">
        {label}
      </Badge>
    );
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">My Uploaded Reports</CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : reports.length === 0 ? (
          <p className="text-sm text-muted-foreground">No reports uploaded yet</p>
        ) : (
          <div className="space-y-3">
            {reports.map((report) => (
              <div
                key={report.id}
                className="flex items-center justify-between gap-3 rounded-lg border p-3"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <FileText className="h-5 w-5 shrink-0 text-primary" />
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">
                      {getFileName(report.file_url)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {formatDate(report.upload_date)}
                    </p>
                  </div>
                  {typeBadge(report.type)}
                </div>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => setDeleteId(report.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </CardContent>

      <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
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
    </Card>
  );
};

export default ReportsList;
