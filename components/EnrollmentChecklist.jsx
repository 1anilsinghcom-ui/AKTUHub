'use client';

import { useStore } from '@/lib/useStore';
import { CheckCircle2, AlertCircle, XCircle, Loader2 } from 'lucide-react';

const MANDATORY_DOCS = [
  { type: 'photo', label: 'Passport Photo', spec: 'JPG, 20-50 KB' },
  { type: 'signature', label: 'Signature', spec: 'JPG, 10-20 KB' },
  { type: '10th', label: '10th Marksheet', spec: 'PDF, max 500 KB' },
  { type: '12th', label: '12th Marksheet', spec: 'PDF, max 500 KB' },
  { type: 'tc', label: 'Transfer Certificate', spec: 'PDF, max 500 KB' },
  { type: 'mc', label: 'Migration Certificate', spec: 'PDF, max 500 KB' },
  { type: 'aadhaar', label: 'Aadhaar Card', spec: 'PDF, max 500 KB' },
  { type: 'admission', label: 'Admission / Allotment Letter', spec: 'PDF, max 500 KB' },
];

function StatusIcon({ status }) {
  switch (status) {
    case 'processing':
      return <Loader2 className="h-5 w-5 animate-spin text-blue-500" />;
    case 'done':
      return <CheckCircle2 className="h-5 w-5 text-green-500" />;
    case 'warning':
      return <AlertCircle className="h-5 w-5 text-yellow-500" />;
    case 'error':
      return <XCircle className="h-5 w-5 text-red-500" />;
    default:
      return <div className="h-5 w-5 rounded-full border-2 border-gray-300" />;
  }
}

export default function EnrollmentChecklist() {
  const documents = useStore((state) => state.documents);
  const readinessPercent = useStore((state) => state.readinessPercent());

  const doneCount = MANDATORY_DOCS.filter((doc) => {
    const docData = documents[doc.type];
    return docData.status === 'done' || docData.status === 'warning';
  }).length;

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-md space-y-4">
      {/* Header */}
      <h3 className="text-lg font-bold text-gray-900">Enrollment Checklist</h3>

      {/* Progress Section */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium text-gray-700">
            {doneCount} of {MANDATORY_DOCS.length} mandatory documents ready
          </p>
          <span className="text-sm font-bold text-gray-900">{Math.round(readinessPercent)}%</span>
        </div>

        {/* Progress Bar */}
        <div className="h-2 w-full rounded-full bg-gray-200 overflow-hidden">
          <div
            className="h-full bg-green-500 rounded-full transition-all duration-300 ease-out"
            style={{ width: `${readinessPercent}%` }}
          />
        </div>
      </div>

      {/* Documents List */}
      <div className="space-y-2">
        {MANDATORY_DOCS.map((doc) => {
          const docData = documents[doc.type];
          const status = docData?.status || 'empty';
          const processedSizeKB = docData?.processedSizeKB;

          return (
            <div
              key={doc.type}
              className="flex items-center justify-between rounded-lg border border-gray-100 bg-gray-50 p-3 hover:bg-gray-100 transition-colors"
            >
              {/* Left: Icon + Labels */}
              <div className="flex items-center gap-3 flex-1">
                <div className="flex-shrink-0">
                  <StatusIcon status={status} />
                </div>

                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900">{doc.label}</p>
                  <p className="text-xs text-gray-500">{doc.spec}</p>
                </div>
              </div>

              {/* Right: File Size (if done) */}
              {(status === 'done' || status === 'warning') && processedSizeKB ? (
                <div className="flex-shrink-0 text-right">
                  <p className="text-sm font-semibold text-green-600">{processedSizeKB} KB</p>
                </div>
              ) : null}
            </div>
          );
        })}
      </div>

      {/* Footer Info */}
      {readinessPercent === 100 && (
        <div className="rounded-lg bg-green-50 border border-green-200 p-3 text-center">
          <p className="text-sm font-semibold text-green-800">
            ✓ All mandatory documents ready for submission
          </p>
        </div>
      )}
    </div>
  );
}
