import { useState, useRef } from "react";
import { Card, CardContent } from "@/components/ui/card";
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
      toast({ title: "Wrong file type", description: "Please choose a PDF file.", variant: "destructive" });
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
    <Card
      className="border-2 border-dashed border-primary/30 hover:border-primary/50 transition-colors cursor-pointer"
      onClick={() => !uploading && fileRef.current?.click()}
    >
      <CardContent className="p-10 flex flex-col items-center justify-center text-center space-y-4">
        <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
          {uploading ? (
            <Loader2 className="h-8 w-8 text-primary animate-spin" />
          ) : (
            <Upload className="h-8 w-8 text-primary" />
          )}
        </div>
        <div className="space-y-1">
          <p className="text-lg font-semibold text-foreground">
            {uploading ? "Reading your report…" : "Tap here to upload your medical report"}
          </p>
          <p className="text-base text-muted-foreground">
            {uploading ? "This may take a moment" : "PDF files only — lab reports or prescriptions"}
          </p>
        </div>
        <input
          ref={fileRef}
          type="file"
          accept=".pdf,application/pdf"
          className="hidden"
          onChange={handleFileChange}
          onClick={(e) => e.stopPropagation()}
        />
      </CardContent>
    </Card>
  );
};

export default UploadButton;
