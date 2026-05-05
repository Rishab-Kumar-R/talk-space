"use client";

import { useState, useRef, useCallback } from "react";
import { uploadFile } from "../api";

type FilePayload = {
  fileUrl: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  messageType: "image" | "file";
};

export function useUpload(onSend: (payload: FilePayload) => void) {
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const handleFileSelect = useCallback(async (file: File) => {
    setUploadError("");
    setUploading(true);
    try {
      const result = await uploadFile(file);
      onSend({
        fileUrl: result.url,
        fileName: result.fileName,
        fileSize: result.fileSize,
        mimeType: result.mimeType,
        messageType: result.messageType,
      });
    } catch (e) {
      setUploadError(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }, [onSend]);

  const handlePaste = useCallback((e: React.ClipboardEvent) => {
    const file = Array.from(e.clipboardData.files)[0];
    if (file) { e.preventDefault(); handleFileSelect(file); }
  }, [handleFileSelect]);

  return {
    uploading,
    uploadError,
    fileInputRef,
    handleFileSelect,
    handlePaste,
  };
}
