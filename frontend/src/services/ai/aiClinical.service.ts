import api from '../core/api';
import { API_ENDPOINTS } from '../../constants/apiEndpoints';

export interface OcrExtractedItem {
  medicineId?: string;
  name: string;
  generic_name?: string;
  strength?: string;
  quantity: number;
  unit?: string;
  dosage?: string;
  confidenceScore?: number;
  matchedSku?: any;
}

export interface PharmacistAdjustedItem {
  medicineId?: string;
  name: string;
  quantity: number;
  unit?: string;
  dosage?: string;
  price?: number;
  active_ingredient?: string;
  adjustmentNote?: string;
}

export interface PrescriptionOcrLogItem {
  _id?: string;
  scanId: string;
  branchId: string;
  imageUrls: string[];
  patient: {
    name?: string;
    age?: string | number;
    gender?: string;
    diagnosis?: string;
  };
  doctor: {
    name?: string;
    hospital?: string;
    specialty?: string;
  };
  rawExtractedItems: OcrExtractedItem[];
  pharmacistAdjustedItems: PharmacistAdjustedItem[];
  hasAdjustments: boolean;
  adjustmentSummary?: string;
  confidenceScore: number;
  pharmacistInfo?: {
    name?: string;
    license?: string;
    userId?: string;
    reviewedAt?: string;
  };
  auditCode?: string;
  orderCode?: number;
  status: 'SCANNED' | 'REVIEWED' | 'DISPENSED' | 'REJECTED';
  createdAt: string;
  updatedAt?: string;
}

export interface ConsultationAudioRecordItem {
  _id?: string;
  consultationId: string;
  branchId: string;
  audioUrl: string;
  audioDuration: number;
  transcription: string;
  aiOriginalSuggestion: {
    diagnosis?: string;
    recommended_drugs?: Array<{
      name: string;
      active_ingredient?: string;
      dosage?: string;
      confidence?: number;
      reason?: string;
    }>;
    warnings?: string[];
  };
  pharmacistFinalDecision: {
    selectedDrugs?: Array<{
      name: string;
      active_ingredient?: string;
      dosage?: string;
      quantity?: number;
      unit?: string;
      price?: number;
      isAlternative?: boolean;
      originalDrugReplaced?: string;
    }>;
    clinicalNotes?: string;
  };
  pharmacistAgreement: boolean;
  pharmacistInfo?: {
    name?: string;
    license?: string;
    userId?: string;
    confirmedAt?: string;
  };
  auditCode?: string;
  orderCode?: number;
  status: 'RECORDED' | 'CONFIRMED' | 'ORDERED';
  createdAt: string;
  updatedAt?: string;
}

export interface OcrHistoryQuery {
  branchId?: string;
  status?: string;
  search?: string;
  page?: number;
  limit?: number;
}

export interface ConsultationQuery {
  branchId?: string;
  status?: string;
  search?: string;
  page?: number;
  limit?: number;
}

export const aiClinicalService = {
  // ==========================================
  // UC-69: OCR SCANNING & AUDIT HISTORY
  // ==========================================

  /**
   * Upload prescription image files and perform multimodal AI vision scan
   */
  async scanPrescription(formData: FormData) {
    const response = await api.post(API_ENDPOINTS.AI.SCAN_PRESCRIPTION, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  /**
   * Query OCR scan audit history
   */
  async getOcrHistory(params?: OcrHistoryQuery) {
    const response = await api.get(API_ENDPOINTS.AI.OCR_HISTORY, { params });
    return response.data;
  },

  /**
   * Get single OCR log by scanId
   */
  async getOcrLogById(scanId: string) {
    const response = await api.get(API_ENDPOINTS.AI.OCR_HISTORY_DETAIL(scanId));
    return response.data;
  },

  /**
   * Save pharmacist manual adjustments to an OCR scanned record
   */
  async saveOcrAdjustment(
    scanId: string,
    payload: {
      pharmacistAdjustedItems: PharmacistAdjustedItem[];
      adjustmentSummary?: string;
      pharmacistInfo?: any;
      auditCode?: string;
      orderCode?: number;
      status?: string;
    }
  ) {
    const response = await api.put(API_ENDPOINTS.AI.OCR_HISTORY_ADJUST(scanId), payload);
    return response.data;
  },

  // ==========================================
  // UC-70: OFFLINE VOICE CONSULTATION
  // ==========================================

  /**
   * Record walk-in customer voice, run Whisper STT & RAG recommendation
   */
  async recordVoiceConsult(formData: FormData) {
    const response = await api.post(API_ENDPOINTS.AI.VOICE_CONSULT, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  },

  async getConsultations(params?: ConsultationQuery) {
    const response = await api.get(API_ENDPOINTS.AI.CONSULTATIONS, { params });
    return response.data;
  },

  /**
   * Get audio details and consultation transcript by ID
   */
  async getConsultationAudio(id: string) {
    const response = await api.get(API_ENDPOINTS.AI.CONSULT_AUDIO(id));
    return response.data;
  },

  /**
   * Confirm pharmacist clinical decision, save agreement checkbox, and sync with order
   */
  async confirmConsultation(
    consultationId: string,
    payload: {
      pharmacistFinalDecision: {
        selectedDrugs?: any[];
        clinicalNotes?: string;
      };
      pharmacistAgreement: boolean;
      pharmacistInfo?: any;
      auditCode: string;
      orderCode?: number;
    }
  ) {
    const response = await api.put(API_ENDPOINTS.AI.CONSULTATION_CONFIRM(consultationId), payload);
    return response.data;
  },
};
