'use client';

import { useEffect, useState, useCallback } from 'react';
import * as faceapi from 'face-api.js';
import { RotateCw, AlertCircle } from 'lucide-react';
import UploadZone from '@/components/UploadZone';
import DocumentCard from '@/components/DocumentCard';
import EnrollmentChecklist from '@/components/EnrollmentChecklist';
import DownloadZipButton from '@/components/DownloadZipButton';
import { useStore } from '@/lib/useStore';

const BRANCHES = ['CSE', 'ECE', 'ME', 'CE', 'EEE', 'IT', 'Other'];
const COURSES = ['B.Tech', 'MCA', 'MBA', 'B.Pharm', 'M.Tech'];

export default function EnrollmentTool() {
  const [modelsLoaded, setModelsLoaded] = useState(false);
  const [confirmingReset, setConfirmingReset] = useState(false);

  const student = useStore((state) => state.student);
  const documents = useStore((state) => state.documents);
  const readinessPercent = useStore((state) => state.readinessPercent());
  const passedDocsCount = useStore((state) => state.passedDocsCount());
  const setStudent = useStore((state) => state.setStudent);
  const resetAll = useStore((state) => state.resetAll);
  const clearDocument = useStore((state) => state.clearDocument);

  // Load face-api models
  useEffect(() => {
    const loadModels = async () => {
      try {
        await faceapi.nets.tinyFaceDetector.loadFromUri('/models');
        await faceapi.nets.faceLandmark68TinyNet.loadFromUri('/models');
        setModelsLoaded(true);
      } catch (err) {
        console.error('Failed to load face-api models:', err);
      }
    };

    loadModels();
  }, []);

  const handleRollNumberChange = useCallback(
    (e) => {
      const value = e.target.value;
      if (value === '' || /^\d*$/.test(value)) {
        setStudent({ rollNumber: value });
      }
    },
    [setStudent],
  );

  const handleResetClick = useCallback(() => {
    setConfirmingReset(true);
  }, []);

  const handleConfirmReset = useCallback(() => {
    resetAll();
    setConfirmingReset(false);
  }, [resetAll]);

  const handleCancelReset = useCallback(() => {
    setConfirmingReset(false);
  }, []);

  const handleReupload = useCallback(
    (docType) => {
      clearDocument(docType);
    },
    [clearDocument],
  );

  // Count stats
  const totalFiles = Object.values(documents).filter((d) => d.status !== 'empty').length;
  const warningCount = Object.values(documents).filter((d) => d.status === 'warning').length;
  const errorCount = Object.values(documents).filter((d) => d.status === 'error').length;

  // Get all non-empty documents for display
  const processedDocs = Object.entries(documents).filter(([, d]) => d.status !== 'empty');

  const rollNumberValid = student.rollNumber.length === 7;
  const rollNumberWarning = student.rollNumber === '' && totalFiles === 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Header */}
        <div className="rounded-2xl border border-white/10 bg-white/80 backdrop-blur-sm shadow-lg p-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <h1 className="text-4xl font-black text-gray-900">Enrollment Tool</h1>
              <div className="mt-3 inline-flex items-center gap-2 rounded-full border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-700">
                ✓ Processed in Browser — Your files never leave your device
              </div>
            </div>

            <button
              onClick={handleResetClick}
              className="inline-flex items-center gap-2 rounded-lg bg-red-100 px-4 py-2 text-sm font-semibold text-red-700 hover:bg-red-200 transition-colors"
            >
              <RotateCw className="h-4 w-4" />
              New Student
            </button>
          </div>
        </div>

        {/* Reset Confirmation Modal */}
        {confirmingReset && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="rounded-lg bg-white shadow-xl max-w-sm w-full p-6 space-y-4">
              <h3 className="text-lg font-bold text-gray-900">Clear Everything?</h3>
              <p className="text-sm text-gray-600">Sab clear ho jayega, sure ho?</p>
              <div className="flex gap-3 justify-end">
                <button
                  onClick={handleCancelReset}
                  className="rounded-lg px-4 py-2 text-sm font-medium border border-gray-300 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleConfirmReset}
                  className="rounded-lg px-4 py-2 text-sm font-medium bg-red-600 text-white hover:bg-red-700"
                >
                  Clear All
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Student Form */}
        <div className="rounded-2xl border border-gray-200 bg-white shadow-lg p-6 space-y-5">
          <h2 className="text-2xl font-bold text-gray-900">Student Information</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Roll Number */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">
                Roll Number <span className="text-red-600">*</span>
              </label>
              <input
                type="text"
                inputMode="numeric"
                maxLength="7"
                placeholder="2520001"
                value={student.rollNumber}
                onChange={handleRollNumberChange}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
              />
              {student.rollNumber && !rollNumberValid && (
                <p className="text-xs text-red-600">Roll number 7 digit ka hona chahiye</p>
              )}
              {rollNumberWarning && (
                <div className="flex items-start gap-2 rounded-lg bg-amber-50 p-2 text-xs text-amber-800 border border-amber-200">
                  <AlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5" />
                  <span>Roll number bharo — AKTU file naming ke liye zaroori hai</span>
                </div>
              )}
            </div>

            {/* Full Name */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">
                Full Name <span className="text-red-600">*</span>
              </label>
              <input
                type="text"
                placeholder="Student full name"
                value={student.fullName}
                onChange={(e) => setStudent({ fullName: e.target.value })}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
              />
            </div>

            {/* Father's Name */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">Father's Name</label>
              <input
                type="text"
                placeholder="Father's full name"
                value={student.fatherName || ''}
                onChange={(e) => setStudent({ fatherName: e.target.value })}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
              />
            </div>

            {/* Branch */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">Branch</label>
              <select
                value={student.branch}
                onChange={(e) => setStudent({ branch: e.target.value })}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
              >
                <option value="">Select branch</option>
                {BRANCHES.map((branch) => (
                  <option key={branch} value={branch}>
                    {branch}
                  </option>
                ))}
              </select>
            </div>

            {/* Course */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">Course</label>
              <select
                value={student.course}
                onChange={(e) => setStudent({ course: e.target.value })}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
              >
                {COURSES.map((course) => (
                  <option key={course} value={course}>
                    {course}
                  </option>
                ))}
              </select>
            </div>

            {/* Session (readonly) */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">Session</label>
              <input
                type="text"
                value={student.session}
                readOnly
                className="w-full rounded-lg border border-gray-300 bg-gray-50 px-3 py-2 text-sm text-gray-600"
              />
            </div>
          </div>
        </div>

        {/* Readiness Dashboard */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <div className="rounded-xl border border-gray-200 bg-white shadow-md p-4 text-center">
            <p className="text-xs font-medium text-gray-600 mb-1">Total Files</p>
            <p className="text-2xl font-bold text-gray-900">{totalFiles}</p>
          </div>
          <div className="rounded-xl border border-gray-200 bg-white shadow-md p-4 text-center">
            <p className="text-xs font-medium text-gray-600 mb-1">Ready</p>
            <p className="text-2xl font-bold text-green-600">{passedDocsCount}</p>
          </div>
          <div className="rounded-xl border border-gray-200 bg-white shadow-md p-4 text-center">
            <p className="text-xs font-medium text-gray-600 mb-1">Warnings</p>
            <p className="text-2xl font-bold text-yellow-600">{warningCount}</p>
          </div>
          <div className="rounded-xl border border-gray-200 bg-white shadow-md p-4 text-center">
            <p className="text-xs font-medium text-gray-600 mb-1">Failed</p>
            <p className="text-2xl font-bold text-red-600">{errorCount}</p>
          </div>
          <div className="rounded-xl border-2 border-blue-400 bg-blue-50 shadow-md p-4 text-center">
            <p className="text-xs font-medium text-blue-600 mb-1">Readiness</p>
            <p className="text-3xl font-black text-blue-600">{Math.round(readinessPercent)}%</p>
          </div>
        </div>

        {/* Upload Zone */}
        <div className="rounded-2xl border border-gray-200 bg-white shadow-lg p-6">
          <h2 className="text-lg font-bold text-gray-900 mb-4">Upload Documents</h2>
          <UploadZone
            rollNumber={student.rollNumber}
            disabled={!student.rollNumber}
            onFilesProcessed={() => {}}
          />
        </div>

        {/* Processed Documents Grid */}
        {processedDocs.length > 0 && (
          <div className="rounded-2xl border border-gray-200 bg-white shadow-lg p-6">
            <h2 className="text-lg font-bold text-gray-900 mb-4">
              Processed Documents ({processedDocs.length})
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {processedDocs.map(([docType, docData]) => (
                <DocumentCard
                  key={docType}
                  docType={docType}
                  docData={docData}
                  rollNumber={student.rollNumber}
                  onReupload={handleReupload}
                />
              ))}
            </div>
          </div>
        )}

        {/* Enrollment Checklist */}
        <EnrollmentChecklist />

        {/* Download Button */}
        <div className="rounded-2xl border border-gray-200 bg-white shadow-lg p-6">
          <h2 className="text-lg font-bold text-gray-900 mb-4">Ready to Submit?</h2>
          <DownloadZipButton />
        </div>
      </div>
    </div>
  );
}
