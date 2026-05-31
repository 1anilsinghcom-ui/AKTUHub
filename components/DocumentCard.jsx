'use client';

import { useCallback } from 'react';
import { Loader2, RotateCw, AlertCircle, CheckCircle2 } from 'lucide-react';

function BeforeAfterPreview({ docData }) {
  const originalSizeKB = docData.originalSizeKB || 0;
  const processedSizeKB = docData.processedSizeKB || 0;

  const isOriginalOverLimit = originalSizeKB > 50;

  return (
    <div className="flex flex-col items-center gap-3 md:flex-row md:justify-between">
      {/* Original */}
      <div className="flex flex-col items-center gap-2">
        <div className="rounded border border-gray-200 bg-gray-50 p-2">
          {docData.originalPreviewUrl ? (
            <img
              src={docData.originalPreviewUrl}
              alt="Original"
              className="h-auto w-24 object-cover rounded"
            />
          ) : (
            <div className="h-24 w-24 rounded bg-gray-200 flex items-center justify-center text-xs text-gray-500">
              No preview
            </div>
          )}
        </div>
        <p className="text-xs font-medium text-gray-600">Original</p>
        <p className={`text-sm font-semibold ${isOriginalOverLimit ? 'text-red-600' : 'text-gray-600'}`}>
          {originalSizeKB} KB
        </p>
      </div>

      {/* Arrow */}
      <div className="hidden text-gray-400 md:block">→</div>
      <div className="text-gray-400 md:hidden">↓</div>

      {/* Processed */}
      <div className="flex flex-col items-center gap-2">
        <div className="rounded border border-gray-200 bg-gray-50 p-2">
          {docData.processedPreviewUrl ? (
            <img
              src={docData.processedPreviewUrl}
              alt="Processed"
              className="h-auto w-24 object-cover rounded"
            />
          ) : (
            <div className="h-24 w-24 rounded bg-gray-200 flex items-center justify-center text-xs text-gray-500">
              No preview
            </div>
          )}
        </div>
        <p className="text-xs font-medium text-gray-600">Processed</p>
        <p className="text-sm font-semibold text-green-600">{processedSizeKB} KB</p>
        <p className="text-xs text-gray-500">(AKTU: 20–50 KB)</p>
      </div>
    </div>
  );
}

export default function DocumentCard({ docType, docData, rollNumber, onReupload }) {
  const handleReupload = useCallback(() => {
    onReupload?.(docType);
  }, [docType, onReupload]);

  const documentLabels = {
    photo: 'Passport Photo',
    signature: 'Signature',
    thumb: 'Thumb Impression',
    aadhaar: 'Aadhaar Card',
    '10th': '10th Marksheet',
    '12th': '12th Marksheet',
    diploma: 'Diploma',
    tc: 'Transfer Certificate',
    mc: 'Migration Certificate',
    admission: 'Admission Letter',
    domicile: 'Domicile Certificate',
    caste: 'Caste Certificate',
    income: 'Income Certificate',
    character: 'Character Certificate',
    gap: 'Gap Certificate',
  };

  const docLabel = documentLabels[docType] || docType;

  // EMPTY STATE
  if (docData.status === 'empty') {
    return (
      <div className="rounded-lg border-2 border-dashed border-gray-300 bg-gray-50 p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="font-medium text-gray-900">{docLabel}</p>
            <p className="text-sm text-gray-500">Not uploaded</p>
          </div>
        </div>
      </div>
    );
  }

  // PROCESSING STATE
  if (docData.status === 'processing') {
    return (
      <div className="rounded-lg border-2 border-blue-300 bg-blue-50 p-4">
        <div className="flex items-center gap-3">
          <Loader2 className="h-5 w-5 animate-spin text-blue-600" />
          <div className="flex-1">
            <p className="font-medium text-gray-900">{docLabel}</p>
            <p className="text-sm text-blue-700">{docData.processingStep || 'Processing...'}</p>
          </div>
        </div>
      </div>
    );
  }

  // ERROR STATE
  if (docData.status === 'error') {
    return (
      <div className="rounded-lg border-2 border-red-300 bg-red-50 p-4">
        <div className="space-y-3">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 flex-shrink-0 text-red-600 mt-0.5" />
            <div className="flex-1">
              <p className="font-bold text-base text-red-900">{docData.error}</p>
              <p className="text-sm text-gray-600 mt-1">Error occurred while processing</p>
            </div>
          </div>
          <button
            onClick={handleReupload}
            className="inline-flex items-center gap-2 rounded-lg bg-red-600 px-3 py-2 text-sm font-medium text-white hover:bg-red-700"
          >
            <RotateCw className="h-4 w-4" />
            Try Again
          </button>
        </div>
      </div>
    );
  }

  // DONE or WARNING STATE
  if (docData.status === 'done' || docData.status === 'warning') {
    const borderColor =
      docData.status === 'done' ? 'border-green-300' : 'border-yellow-300';
    const bgColor = docData.status === 'done' ? 'bg-green-50' : 'bg-yellow-50';
    const badgeBg =
      docData.status === 'done' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800';
    const badgeIcon = docData.status === 'done' ? '✓' : '⚠';
    const badgeText =
      docData.status === 'done' ? 'AKTU Spec Met' : 'Check Manually';

    const aktFileName =
      docData.aktFileName ||
      `${rollNumber}_${docType}.${docData.processedFile ? 'jpg' : 'pdf'}`;

    return (
      <div className={`rounded-lg border-2 ${borderColor} ${bgColor} p-4 space-y-3`}>
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <p className="font-medium text-gray-900">{docLabel}</p>
          </div>
          <span
            className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold ${badgeBg}`}
          >
            {badgeIcon} {badgeText}
          </span>
        </div>

        {/* AKTU Filename Badge */}
        <div className="rounded bg-white px-2 py-1 text-xs font-mono text-gray-700 border border-gray-200">
          {aktFileName}
        </div>

        {/* Before/After Preview */}
        <BeforeAfterPreview docData={docData} />

        {/* Warnings */}
        {docData.warnings && docData.warnings.length > 0 && (
          <div className="rounded bg-yellow-100 p-2 text-xs text-yellow-800">
            <p className="font-semibold mb-1">⚠ Warnings:</p>
            <ul className="list-disc list-inside space-y-0.5">
              {docData.warnings.map((warning, idx) => (
                <li key={idx}>{warning}</li>
              ))}
            </ul>
          </div>
        )}

        {/* Re-upload Button */}
        <button
          onClick={handleReupload}
          className={`inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
            docData.status === 'done'
              ? 'bg-green-600 text-white hover:bg-green-700'
              : 'bg-yellow-600 text-white hover:bg-yellow-700'
          }`}
        >
          <RotateCw className="h-4 w-4" />
          Re-upload
        </button>
      </div>
    );
  }

  // DEFAULT (shouldn't reach here)
  return null;
}
