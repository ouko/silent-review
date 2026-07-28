import { useState, useCallback } from "react";
import { api } from "../lib/api";

export interface UploadResult {
  url: string;
  thumbnailUrl: string | null;
  duration: number;
  variants: Array<{ label: string; url: string; width: number; height: number }>;
}

interface UseUploadOptions {
  onSuccess?: (result: UploadResult) => void;
  onError?: (error: Error) => void;
}

export function useUpload(options: UseUploadOptions = {}) {
  const [progress, setProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const upload = useCallback(
    async (file: File) => {
      setIsUploading(true);
      setProgress(0);
      setError(null);

      try {
        const formData = new FormData();
        formData.append("file", file);

        const { data } = await api.post<UploadResult>("/api/upload", formData, {
          headers: { "Content-Type": "multipart/form-data" },
          onUploadProgress: (event) => {
            if (event.total) {
              setProgress(Math.round((event.loaded * 100) / event.total));
            }
          },
        });

        setProgress(100);
        options.onSuccess?.(data);
        return data;
      } catch (err) {
        let message = "Upload failed";
        if (err && typeof err === "object" && "response" in err) {
          const response = (err as {
            response?: {
              data?: { error?: string; message?: string; details?: string[]; issues?: Array<{ path: string[]; message: string }> };
              statusText?: string;
            };
          }).response;
          const issues = response?.data?.issues;
          if (issues && issues.length > 0) {
            message = issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ");
          } else if (response?.data?.details && response.data.details.length > 0) {
            message = response.data.details.join("; ");
          } else {
            message = response?.data?.error || response?.data?.message || response?.statusText || message;
          }
        } else if (err instanceof Error) {
          message = err.message;
        }
        const error = new Error(message);
        setError(error);
        options.onError?.(error);
        throw error;
      } finally {
        setIsUploading(false);
      }
    },
    [options]
  );

  return { upload, progress, isUploading, error };
}
