'use client'

import { create } from 'zustand'

const EMPTY_DOC = {
  status: 'empty',
  originalFile: null,
  processedFile: null,
  originalSizeKB: 0,
  processedSizeKB: 0,
  originalPreviewUrl: '',
  processedPreviewUrl: '',
  aktFileName: '',
  faceDetected: null,
  warnings: [],
  error: null,
}

const MANDATORY_DOCS = ['photo', 'signature', '10th', '12th', 'tc', 'mc', 'aadhaar', 'admission']

const initialState = {
  student: {
    rollNumber: '',
    fullName: '',
    fatherName: '',
    branch: '',
    course: 'B.Tech',
    session: '2025-26',
  },
  documents: {
    photo: { ...EMPTY_DOC },
    signature: { ...EMPTY_DOC },
    thumb: { ...EMPTY_DOC },
    '10th': { ...EMPTY_DOC },
    '12th': { ...EMPTY_DOC },
    diploma: { ...EMPTY_DOC },
    tc: { ...EMPTY_DOC },
    mc: { ...EMPTY_DOC },
    aadhaar: { ...EMPTY_DOC },
    admission: { ...EMPTY_DOC },
    domicile: { ...EMPTY_DOC },
    caste: { ...EMPTY_DOC },
    income: { ...EMPTY_DOC },
    character: { ...EMPTY_DOC },
    gap: { ...EMPTY_DOC },
  },
}

export const useStore = create((set, get) => ({
  ...initialState,

  // ========== ACTIONS ==========

  setStudent: (data) =>
    set((state) => ({
      student: { ...state.student, ...data },
    })),

  setDocumentProcessing: (docType) =>
    set((state) => ({
      documents: {
        ...state.documents,
        [docType]: {
          ...state.documents[docType],
          status: 'processing',
        },
      },
    })),

  setDocumentDone: (docType, result) =>
    set((state) => ({
      documents: {
        ...state.documents,
        [docType]: {
          ...state.documents[docType],
          ...result,
          status: 'done',
          error: null,
        },
      },
    })),

  setDocumentError: (docType, error) =>
    set((state) => ({
      documents: {
        ...state.documents,
        [docType]: {
          ...state.documents[docType],
          status: 'error',
          error,
        },
      },
    })),

  setDocumentWarning: (docType, result) =>
    set((state) => ({
      documents: {
        ...state.documents,
        [docType]: {
          ...state.documents[docType],
          ...result,
          status: 'warning',
        },
      },
    })),

  clearDocument: (docType) =>
    set((state) => ({
      documents: {
        ...state.documents,
        [docType]: { ...EMPTY_DOC },
      },
    })),

  resetAll: () => set(initialState),

  // ========== COMPUTED GETTERS ==========

  readinessPercent: () => {
    const state = get()
    const mandatoryDone = MANDATORY_DOCS.filter(
      (docType) =>
        state.documents[docType].status === 'done' || state.documents[docType].status === 'warning',
    ).length
    return Math.round((mandatoryDone / MANDATORY_DOCS.length) * 100)
  },

  mandatoryComplete: () => {
    const state = get()
    return MANDATORY_DOCS.every(
      (docType) =>
        state.documents[docType].status === 'done' || state.documents[docType].status === 'warning',
    )
  },

  passedDocsCount: () => {
    const state = get()
    return Object.values(state.documents).filter(
      (doc) => doc.status === 'done' || doc.status === 'warning',
    ).length
  },

  allProcessedDocuments: () => {
    const state = get()
    return Object.entries(state.documents)
      .filter(([_, doc]) => doc.status === 'done' || doc.status === 'warning')
      .map(([docType, doc]) => ({
        docType,
        ...doc,
      }))
  },
}))
