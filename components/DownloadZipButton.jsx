'use client';

import { useState, useCallback } from 'react';
import { Loader2, Download, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { useStore } from '@/lib/useStore';
import { useZipBuilder } from '@/hooks/useZipBuilder';

function sanitizeName(name) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '')
    .slice(0, 20);
}

export default function DownloadZipButton() {
  const [isBuilding, setIsBuilding] = useState(false);
  const [isDone, setIsDone] = useState(false);

  const student = useStore((state) => state.student);
  const mandatoryComplete = useStore((state) => state.mandatoryComplete());
  const passedDocsCount = useStore((state) => state.passedDocsCount());
  const allProcessedDocuments = useStore((state) => state.allProcessedDocuments());

  const { buildEnrollmentZip } = useZipBuilder();

  const handleDownload = useCallback(async () => {
    if (!student.rollNumber || passedDocsCount === 0) return;

    setIsBuilding(true);
    try {
      const result = await buildEnrollmentZip(
        student.rollNumber,
        student.fullName,
        allProcessedDocuments,
      );

      if (result.success) {
        setIsDone(true);
        setTimeout(() => setIsDone(false), 3000);
      }
    } catch (err) {
      console.error('Download error:', err);
    } finally {
      setIsBuilding(false);
    }
  }, [student.rollNumber, student.fullName, passedDocsCount, allProcessedDocuments, buildEnrollmentZip]);

  // Disabled state: no rollNumber or no documents
  const isDisabled = !student.rollNumber || passedDocsCount === 0;

  // Button variants
  const isPartial = passedDocsCount > 0 && !mandatoryComplete;
  const isComplete = mandatoryComplete;

  let buttonClass = 'inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2 font-semibold transition-all';

  if (isDisabled) {
    buttonClass += ' bg-gray-300 text-gray-500 cursor-not-allowed';
  } else if (isComplete) {
    buttonClass += ' bg-green-600 text-white hover:bg-green-700 active:scale-95';
  } else if (isPartial) {
    buttonClass += ' bg-amber-500 text-white hover:bg-amber-600 active:scale-95';
  }

  const cleanName = sanitizeName(student.fullName);
  const expectedZipName = `${student.rollNumber}_${cleanName}_enrollment.zip`;

  return (
    <div className="space-y-2">
      {/* Success Message */}
      {isDone && (
        <div className="flex items-center gap-2 rounded-lg bg-green-50 p-3 text-sm text-green-800 border border-green-200">
          <CheckCircle2 className="h-4 w-4 flex-shrink-0" />
          <span>ZIP download ho gaya! ✓</span>
        </div>
      )}

      {/* Button */}
      <button
        onClick={handleDownload}
        disabled={isDisabled || isBuilding}
        className={buttonClass}
      >
        {isBuilding && <Loader2 className="h-4 w-4 animate-spin" />}

        {isDisabled && (
          <>
            <Download className="h-4 w-4" />
            <span>Documents upload karein pehle</span>
          </>
        )}

        {!isDisabled && isPartial && (
          <>
            <AlertTriangle className="h-4 w-4" />
            <span>⚠ Partial ZIP Download ({passedDocsCount}/8)</span>
          </>
        )}

        {!isDisabled && isComplete && (
          <>
            <Download className="h-4 w-4" />
            <span>✓ Download Enrollment ZIP</span>
          </>
        )}

        {isBuilding && <span>ZIP bana rahe hain...</span>}
      </button>

      {/* Subtitle */}
      {!isDisabled && isPartial && (
        <p className="text-xs text-amber-700 ml-1">Kuch documents missing hain</p>
      )}

      {!isDisabled && isComplete && (
        <p className="text-xs text-gray-600 ml-1">{expectedZipName}</p>
      )}
    </div>
  );
}
