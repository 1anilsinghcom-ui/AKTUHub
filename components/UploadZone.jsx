'use client';

import { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, AlertCircle, CheckCircle, Loader2, Camera } from 'lucide-react';
import { useDocumentDetector } from '@/hooks/useDocumentDetector';
import { useImageProcessor } from '@/hooks/useImageProcessor';
import { useStore } from '@/lib/useStore';

const ACCEPTED_TYPES = {
  'image/jpeg': ['.jpg', '.jpeg'],
  'image/png': ['.png'],
  'image/webp': ['.webp'],
  'image/heic': ['.heic', '.heif'],
  'application/pdf': ['.pdf'],
};

const MAX_SIZE = 10 * 1024 * 1024; // 10MB

export default function UploadZone({ onFilesProcessed, rollNumber, disabled }) {
  const [processing, setProcessing] = useState(false);
  const [errors, setErrors] = useState([]);
  const [pendingFiles, setPendingFiles] = useState([]);
  const [processingSteps, setProcessingSteps] = useState({});
  const [fileDropdowns, setFileDropdowns] = useState({});

  const { detectDocumentType } = useDocumentDetector();
  const { processImage } = useImageProcessor();
  const { setDocumentProcessing, setDocumentDone, setDocumentError, setDocumentWarning } = useStore();

  const updateStep = useCallback((fileId, step) => {
    setProcessingSteps((prev) => ({
      ...prev,
      [fileId]: step,
    }));
  }, []);

  const processFile = useCallback(
    async (file, selectedType = null) => {
      const fileId = `${file.name}-${Date.now()}`;

      try {
        // Step 1: Detect type
        const detection = detectDocumentType(file);
        const docType = selectedType || detection.detectedType;

        updateStep(fileId, 'Format check kar rahe hain... / Format checking...');

        // Step 2: Blur detection
        updateStep(fileId, 'Sharpness check kar rahe hain... / Sharpness checking...');

        // Step 3: Face detection (if photo)
        if (docType === 'photo') {
          updateStep(fileId, 'Face dhundh rahe hain... / Detecting face...');
        }

        // Step 4: Compression
        updateStep(fileId, 'AKTU size mein compress kar rahe hain... / Compressing to AKTU size...');

        // Set processing in store
        setDocumentProcessing(docType);

        // Process the image
        const result = await processImage(file);

        if (result.error) {
          // Error case
          setDocumentError(docType, result.error);
          updateStep(fileId, `Error: ${result.error}`);
          return;
        }

        // Success or warnings
        if (result.warnings && result.warnings.length > 0) {
          setDocumentWarning(docType, result);
        } else {
          setDocumentDone(docType, result);
        }

        updateStep(fileId, 'Ho gaya ✓ / Done ✓');

        // Cleanup after short delay
        setTimeout(() => {
          setPendingFiles((prev) => prev.filter((f) => f.id !== fileId));
          setProcessingSteps((prev) => {
            const newSteps = { ...prev };
            delete newSteps[fileId];
            return newSteps;
          });
        }, 1500);

        onFilesProcessed?.();
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : 'Processing failed';
        setDocumentError(selectedType || detectDocumentType(file).detectedType, errorMsg);
        updateStep(fileId, `Error: ${errorMsg}`);
      }
    },
    [detectDocumentType, processImage, setDocumentProcessing, setDocumentDone, setDocumentError, setDocumentWarning, updateStep, onFilesProcessed],
  );

  const onDrop = useCallback(
    (acceptedFiles, rejectedFiles) => {
      // Check rollNumber first
      if (!rollNumber || rollNumber.trim() === '') {
        setErrors([
          {
            type: 'rollNumber',
            message: 'Pehle roll number dalein / Please enter roll number first',
          },
        ]);
        setTimeout(() => setErrors([]), 5000);
        return;
      }

      // Handle rejected files
      const rejectionErrors = rejectedFiles.map((rejection) => {
        const file = rejection.file;
        let reason = 'Invalid file type / Yeh file type accept nahi hota';

        if (rejection.errors.some((e) => e.code === 'file-too-large')) {
          reason = `File bahut badi hai — max 10MB / File too large — max 10MB`;
        } else if (rejection.errors.some((e) => e.code === 'file-invalid-type')) {
          reason = 'Invalid file type / Yeh file type accept nahi hota';
        }

        return {
          type: 'rejection',
          fileName: file.name,
          message: reason,
        };
      });

      if (rejectionErrors.length > 0) {
        setErrors(rejectionErrors);
        setTimeout(() => setErrors([]), 5000);
      }

      // Process accepted files
      acceptedFiles.forEach((file) => {
        const fileId = `${file.name}-${Date.now()}`;
        const detection = detectDocumentType(file);

        if (detection.requiresConfirmation) {
          // Add to pending with dropdown
          setPendingFiles((prev) => [
            ...prev,
            {
              id: fileId,
              file,
              fileName: file.name,
              needsSelection: true,
              detectedType: detection.detectedType,
            },
          ]);
          setFileDropdowns((prev) => ({
            ...prev,
            [fileId]: detection.detectedType,
          }));
        } else {
          // Start processing immediately
          setProcessing(true);
          setPendingFiles((prev) => [
            ...prev,
            {
              id: fileId,
              file,
              fileName: file.name,
              processing: true,
              detectedType: detection.detectedType,
            },
          ]);

          processFile(file, detection.detectedType).then(() => {
            setProcessing(false);
          });
        }
      });
    },
    [rollNumber, detectDocumentType, processFile],
  );

  const handleSelectType = useCallback(
    (fileId, selectedType) => {
      const fileObj = pendingFiles.find((f) => f.id === fileId);
      if (!fileObj) return;

      setProcessing(true);
      setPendingFiles((prev) =>
        prev.map((f) =>
          f.id === fileId
            ? {
                ...f,
                needsSelection: false,
                processing: true,
              }
            : f,
        ),
      );

      processFile(fileObj.file, selectedType).then(() => {
        setProcessing(false);
      });
    },
    [pendingFiles, processFile],
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: ACCEPTED_TYPES,
    maxSize: MAX_SIZE,
    disabled: disabled || processing,
  });

  const docTypes = [
    'photo',
    'signature',
    'thumb',
    'aadhaar',
    '10th',
    '12th',
    'diploma',
    'tc',
    'mc',
    'admission',
    'domicile',
    'caste',
    'income',
    'character',
    'gap',
  ];

  return (
    <div className="space-y-4">
      {/* Error Messages */}
      {errors.length > 0 && (
        <div className="space-y-2">
          {errors.map((err, idx) => (
            <div
              key={idx}
              className="flex items-center gap-2 rounded-lg bg-red-50 p-3 text-sm text-red-700 border border-red-200"
            >
              <AlertCircle className="h-4 w-4 flex-shrink-0" />
              <span>{err.message}</span>
            </div>
          ))}
        </div>
      )}

      {/* Drop Zone */}
      <div
        {...getRootProps()}
        className={`relative rounded-xl border-2 border-dashed p-8 transition-all ${
          isDragActive
            ? 'border-blue-500 bg-blue-50'
            : disabled || processing
              ? 'border-gray-300 bg-gray-50 cursor-not-allowed opacity-60'
              : 'border-gray-300 bg-white hover:border-gray-400 hover:bg-gray-50 cursor-pointer'
        }`}
      >
        <input {...getInputProps()} />

        {disabled && !rollNumber && (
          <div className="absolute inset-0 flex items-center justify-center rounded-xl bg-gray-900/20 backdrop-blur-sm">
            <div className="rounded-lg bg-white p-4 text-center">
              <p className="text-sm font-medium text-gray-900">
                Pehle roll number dalein / Enter roll number first
              </p>
            </div>
          </div>
        )}

        <div className="flex flex-col items-center justify-center gap-3">
          <Upload className="h-10 w-10 text-gray-400" />
          <div className="text-center">
            <p className="text-base font-semibold text-gray-900">
              {isDragActive
                ? 'Yahan drop karein / Drop here'
                : 'Documents yahan drop karein ya click karein'}
            </p>
            <p className="mt-1 text-sm text-gray-500">
              JPG, PNG, WebP, HEIC, PDF — max 10MB each
            </p>
          </div>

          {/* Mobile Camera Button */}
          <div className="mt-2 md:hidden">
            <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg bg-blue-50 px-3 py-2 text-sm font-medium text-blue-600 hover:bg-blue-100">
              <Camera className="h-4 w-4" />
              📷 Camera se lo
              <input
                type="file"
                accept="image/*"
                capture="environment"
                onChange={(e) => {
                  if (e.target.files?.[0]) {
                    onDrop([e.target.files[0]], []);
                  }
                }}
                className="hidden"
              />
            </label>
          </div>
        </div>
      </div>

      {/* Pending Files with Selection Dropdowns */}
      {pendingFiles.length > 0 && (
        <div className="space-y-3">
          {pendingFiles.map((fileObj) => (
            <div
              key={fileObj.id}
              className="flex items-center justify-between rounded-lg border border-gray-200 bg-gray-50 p-3"
            >
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-900 truncate">{fileObj.fileName}</p>
              </div>

              {fileObj.needsSelection ? (
                <select
                  value={fileDropdowns[fileObj.id] || ''}
                  onChange={(e) => handleSelectType(fileObj.id, e.target.value)}
                  className="ml-2 rounded border border-gray-300 px-2 py-1 text-xs"
                >
                  <option value="">Select type...</option>
                  {docTypes.map((type) => (
                    <option key={type} value={type}>
                      {type}
                    </option>
                  ))}
                </select>
              ) : fileObj.processing ? (
                <div className="ml-2 flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin text-blue-500" />
                  <span className="text-xs text-gray-600">
                    {processingSteps[fileObj.id] || 'Processing...'}
                  </span>
                </div>
              ) : (
                <CheckCircle className="ml-2 h-4 w-4 text-green-500" />
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
