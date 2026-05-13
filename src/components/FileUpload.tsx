import React, { useRef } from "react";
import { Upload, FileText, CheckCircle2, AlertCircle, Loader2 } from "lucide-react";
import { cn } from "../lib/utils";

interface FileUploadProps {
  label: string;
  accept: string;
  onFileSelect: (file: File) => void;
  isProcessing?: boolean;
  status?: "idle" | "success" | "error";
  error?: string;
  fileName?: string;
}

export function FileUpload({
  label,
  accept,
  onFileSelect,
  isProcessing,
  status = "idle",
  error,
  fileName,
}: FileUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const file = e.dataTransfer.files[0];
    if (file) onFileSelect(file);
  };

  return (
    <div className="flex flex-col gap-2">
      <label className="text-sm font-medium text-slate-700">{label}</label>
      <div
        onClick={() => inputRef.current?.click()}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        className={cn(
          "relative flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-xl cursor-pointer transition-all duration-200",
          status === "idle" && "border-slate-300 hover:border-blue-400 hover:bg-blue-50/50",
          status === "success" && "border-emerald-400 bg-emerald-50/50",
          status === "error" && "border-rose-400 bg-rose-50/50",
          isProcessing && "opacity-60 cursor-wait"
        )}
      >
        <input
          ref={inputRef}
          type="file"
          accept={accept}
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) onFileSelect(file);
          }}
          disabled={isProcessing}
        />

        <div className="flex flex-col items-center gap-2 px-4 text-center">
          {isProcessing ? (
            <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
          ) : status === "success" ? (
            <CheckCircle2 className="w-8 h-8 text-emerald-500" />
          ) : status === "error" ? (
            <AlertCircle className="w-8 h-8 text-rose-500" />
          ) : (
            <Upload className="w-8 h-8 text-slate-400" />
          )}

          <div className="flex flex-col">
            <span className="text-sm font-medium text-slate-600">
              {fileName || "Kéo thả hoặc click để tải lên"}
            </span>
            <span className="text-xs text-slate-400">
              {accept.split(",").join(" / ")}
            </span>
          </div>
        </div>
      </div>
      {error && <p className="text-xs text-rose-500 mt-1">{error}</p>}
    </div>
  );
}
