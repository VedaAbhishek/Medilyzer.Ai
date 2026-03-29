import { useState, useRef } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Upload, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";

interface UploadButtonProps {
  patientId: string | null;
  onUploadComplete: () => void;
}

const UploadButton = ({ patientId, onUploadComplete }: UploadButtonProps) => {
  const { user } = useAuth();
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user || !patientId) return;

    if (file.type !== "application/pdf") {
      toast({ title: "Invalid file", description: "Please upload a PDF file.", variant: "destructive" });
      return;
    }

    setUploading(true);
    try {
      const filePath = `${user.id}/${Date.now()}_${file.name}`;
      const { error: uploadErr } = await supabase.storage
        .from("medical-records")
        .upload(filePath, file);

      if (uploadErr) throw uploadErr;

      const { data: urlData } = supabase.storage
        .from("medical-records")
        .getPublicUrl(filePath);

      const fileUrl = urlData.publicUrl;

      const { data, error: fnErr } = await supabase.functions.invoke("process-medical-pdf", {
        body: { file_url: fileUrl, patient_id: patientId },
      });

      if (fnErr) throw fnErr;

      toast({ title: "Your report has been analysed", description: `Found ${data.markers_count} markers and ${data.medications_count} medications.` });
      onUploadComplete();
    } catch (err: any) {
      console.error(err);
      toast({ title: "Upload failed", description: err.message || "Something went wrong", variant: "destructive" });
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  return (
    <Card className="flex items-center justify-center">
      <CardContent className="p-6 text-center space-y-3">
        <div className="mx-auto w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
          {uploading ? (
            <Loader2 className="h-5 w-5 text-primary animate-spin" />
          ) : (
            <Upload className="h-5 w-5 text-primary" />
          )}
        </div>
        <Button
          className="w-full"
          disabled={uploading || !patientId}
          onClick={() => fileRef.current?.click()}
        >
          {uploading ? "Analysing report…" : "Upload Lab Report or Prescription"}
        </Button>
        <p className="text-xs text-muted-foreground">PDF files only</p>
        <input
          ref={fileRef}
          type="file"
          accept=".pdf,application/pdf"
          className="hidden"
          onChange={handleFileChange}
        />
      </CardContent>
    </Card>
  );
};

export default UploadButton;
