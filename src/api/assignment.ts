import { apiClient, type ApiResponse } from './client';
import type { 
  StudentAssignmentItemDTO, 
  FacultyAssignmentItemDTO, 
  SubmissionDetailsDTO 
} from '../../server/src/types/assignment';

export interface CreateAssignmentPayload {
  courseOfferingId: string;
  title: string;
  description?: string;
  attachmentUrl?: string;
  dueDate: string;
  totalMarks?: number;
  isPublished?: boolean;
}

export interface UpdateAssignmentPayload {
  title?: string;
  description?: string;
  attachmentUrl?: string;
  dueDate?: string;
  totalMarks?: number;
  isPublished?: boolean;
}

export interface SubmitAssignmentPayload {
  submissionFileUrl?: string;
  submissionText?: string;
}

export interface GradeSubmissionPayload {
  score: number;
  feedback?: string;
}

export const assignmentApi = {
  /**
   * Retrieves all assignments for the student's enrolled courses
   */
  async getStudentAssignments(): Promise<StudentAssignmentItemDTO[]> {
    const res = await apiClient.get<ApiResponse<StudentAssignmentItemDTO[]>>('/assignments/student');
    return res.data || [];
  },

  /**
   * Retrieves detailed assignment information
   */
  async getAssignmentDetails(id: string) {
    const res = await apiClient.get<ApiResponse<any>>(`/assignments/${id}`);
    return res.data;
  },

  /**
   * Submits a student's solution (file and/or text)
   */
  async submitAssignment(id: string, payload: SubmitAssignmentPayload) {
    const res = await apiClient.post<ApiResponse<any>>(`/assignments/${id}/submit`, payload);
    return res;
  },

  /**
   * Retrieves student's own submission for an assignment
   */
  async getMySubmission(id: string) {
    const res = await apiClient.get<ApiResponse<any>>(`/assignments/${id}/submission`);
    return res.data;
  },

  /**
   * Faculty: Retrieves all assignments for faculty's assigned courses
   */
  async getFacultyAssignments(courseOfferingId?: string): Promise<FacultyAssignmentItemDTO[]> {
    const qs = courseOfferingId ? `?courseOfferingId=${courseOfferingId}` : '';
    const res = await apiClient.get<ApiResponse<FacultyAssignmentItemDTO[]>>(`/assignments/faculty${qs}`);
    return res.data || [];
  },

  /**
   * Faculty: Creates a new assignment
   */
  async createAssignment(payload: CreateAssignmentPayload) {
    const res = await apiClient.post<ApiResponse<any>>('/assignments', payload);
    return res.data;
  },

  /**
   * Faculty: Updates an assignment
   */
  async updateAssignment(id: string, payload: UpdateAssignmentPayload) {
    const res = await apiClient.put<ApiResponse<any>>(`/assignments/${id}`, payload);
    return res.data;
  },

  /**
   * Faculty: Retrieves all submissions for an assignment
   */
  async getAssignmentSubmissions(id: string): Promise<SubmissionDetailsDTO[]> {
    const res = await apiClient.get<ApiResponse<SubmissionDetailsDTO[]>>(`/assignments/${id}/submissions`);
    return res.data || [];
  },

  /**
   * Faculty: Grades a submission
   */
  async gradeSubmission(id: string, submissionId: string, payload: GradeSubmissionPayload) {
    const res = await apiClient.post<ApiResponse<any>>(`/assignments/${id}/submissions/${submissionId}/grade`, payload);
    return res.data;
  },

  /**
   * Uploads a file payload (returns uploaded file URL)
   */
  async uploadFile(fileName: string, fileData: string, mimeType?: string) {
    const res = await apiClient.post<ApiResponse<{ fileUrl: string; originalName: string; sizeBytes: number }>>(
      '/assignments/upload',
      { fileName, fileData, mimeType }
    );
    return res.data;
  },

  /**
   * Resolves a backend-relative or absolute file URL to a fully qualified URL
   */
  resolveFileUrl(url: string | null | undefined): string {
    if (!url) return '';
    if (url.startsWith('http://') || url.startsWith('https://')) return url;
    const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';
    const serverOrigin = baseUrl.replace(/\/api\/?$/, '');
    return `${serverOrigin}${url.startsWith('/') ? '' : '/'}${url}`;
  },

  /**
   * Securely downloads an authenticated file stream
   */
  async downloadFile(url: string, filename?: string): Promise<void> {
    const fullUrl = this.resolveFileUrl(url);
    const response = await fetch(fullUrl, {
      method: 'GET',
      credentials: 'include',
    });
    if (!response.ok) {
      throw new Error(`Failed to download file: ${response.status} ${response.statusText}`);
    }
    const blob = await response.blob();
    const downloadUrl = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = downloadUrl;
    if (filename) a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.URL.revokeObjectURL(downloadUrl);
  },
};
