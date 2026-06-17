import { useState, useCallback } from 'react';
import { readFileAsBase64 } from '@/lib/file-utils';

interface UseFileUploadOptions {
  maxSizeInBytes?: number;
  onError?: (error: string) => void;
}

export function useFileUpload(options: UseFileUploadOptions = {}) {
  const {
    maxSizeInBytes = 5 * 1024 * 1024, // 5MB default
    onError,
  } = options;

  const [isUploading, setIsUploading] = useState(false);

  const uploadFile = useCallback(
    async (file: File): Promise<string | null> => {
      if (!file) return null;

      if (file.size > maxSizeInBytes) {
        const errorMsg = `File size exceeds the limit of ${Math.round(maxSizeInBytes / (1024 * 1024))}MB`;
        if (onError) onError(errorMsg);
        return null;
      }

      setIsUploading(true);
      try {
        const base64 = await readFileAsBase64(file);
        return base64;
      } catch (err) {
        if (onError) onError('Failed to read file: ' + (err as Error).message);
        return null;
      } finally {
        setIsUploading(false);
      }
    },
    [maxSizeInBytes, onError]
  );

  return {
    uploadFile,
    isUploading,
  };
}
