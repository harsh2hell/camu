import { apiClient, type ApiResponse } from './client';

export interface AdmissionApplication {
  id: string;
  applicationNumber: string;
  applicantName: string;
  applicantEmail: string;
  applicantPhone: string;
  programId: string;
  academicYear: string;
  status: 'SUBMITTED' | 'UNDER_REVIEW' | 'DOCUMENTS_PENDING' | 'OFFER_MADE' | 'OFFER_ACCEPTED' | 'ENROLLED' | 'REJECTED' | 'WITHDRAWN';
  highSchoolPercentage?: number | null;
  intermediatePercentage?: number | null;
  entranceExamScore?: number | null;
  documents: Array<{ name: string; url: string; verified?: boolean }>;
  reviewNotes: string[];
  decisionReason?: string | null;
  enrolledStudentProfileId?: string | null;
  createdAt: string;
  updatedAt: string;
  program: {
    id: string;
    name: string;
    code: string;
    department?: { name: string };
  };
}

export const admissionsApi = {
  async getApplications(params?: { search?: string; status?: string; programId?: string }) {
    const query = new URLSearchParams();
    if (params?.search) query.set('search', params.search);
    if (params?.status) query.set('status', params.status);
    if (params?.programId) query.set('programId', params.programId);
    return apiClient.get<ApiResponse<AdmissionApplication[]>>(`/admissions/applications?${query.toString()}`);
  },

  async getApplicationById(id: string) {
    return apiClient.get<ApiResponse<AdmissionApplication>>(`/admissions/applications/${id}`);
  },

  async createApplication(data: {
    applicantName: string;
    applicantEmail: string;
    applicantPhone: string;
    programId: string;
    academicYear?: string;
    highSchoolPercentage?: number;
    intermediatePercentage?: number;
    entranceExamScore?: number;
    documents?: Array<{ name: string; url: string }>;
  }) {
    return apiClient.post<ApiResponse<AdmissionApplication>>('/admissions/applications', data);
  },

  async updateStatus(id: string, status: string, reason?: string) {
    return apiClient.patch<ApiResponse<AdmissionApplication>>(`/admissions/applications/${id}/status`, { status, reason });
  },

  async addReviewNote(id: string, note: string) {
    return apiClient.post<ApiResponse<AdmissionApplication>>(`/admissions/applications/${id}/notes`, { note });
  },

  async enrollApplicant(id: string, rollNumber?: string, sectionId?: string) {
    return apiClient.post<ApiResponse<{ studentUser: any; studentProfile: any; invoice: any }>>(
      `/admissions/applications/${id}/enroll`,
      { rollNumber, sectionId }
    );
  },

  async getAuditLogs(applicationId: string) {
    return apiClient.get<ApiResponse<any[]>>(`/admissions/applications/${applicationId}/audit-logs`);
  },
};
