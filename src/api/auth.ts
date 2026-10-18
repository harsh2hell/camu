import { apiClient } from './client';
import { CURRENT_STUDENT } from '../data/mockData';

export interface UserSession {
  id: string;
  name: string;
  email: string;
  role: 'STUDENT' | 'FACULTY' | 'ADMIN';
  token: string;
  rollNo?: string;
  department?: string;
  avatarUrl?: string;
}

export const authApi = {
  // Real login API call with fallback for client-side persistence
  async login(username: string, password?: string): Promise<UserSession> {
    try {
      const response = await apiClient.post<UserSession>('/auth/login', { username, password });
      localStorage.setItem('dbs_auth_token', response.token);
      localStorage.setItem('dbs_user_session', JSON.stringify(response));
      return response;
    } catch {
      // Local simulated response for testing before backend connection
      const isFaculty = username.toLowerCase().includes('faculty') || username.toLowerCase().includes('sharma');
      const session: UserSession = isFaculty
        ? {
            id: 'FAC-108',
            name: 'Dr. Rajesh Sharma',
            email: 'rajesh.sharma@dbs.edu.in',
            role: 'FACULTY',
            department: 'Computer Science & Engineering',
            token: `DBS_AUTH_JWT_${Date.now()}_FACULTY`,
          }
        : {
            id: 'STU-042',
            name: CURRENT_STUDENT.name,
            email: 'harsh.23cse@dbs.edu.in',
            role: 'STUDENT',
            rollNo: CURRENT_STUDENT.rollNo,
            department: 'B.Tech CSE',
            avatarUrl: CURRENT_STUDENT.avatarUrl,
            token: `DBS_AUTH_JWT_${Date.now()}_STUDENT`,
          };

      localStorage.setItem('dbs_auth_token', session.token);
      localStorage.setItem('dbs_user_session', JSON.stringify(session));
      return session;
    }
  },

  async loginWithGoogle(): Promise<UserSession> {
    // Google SSO simulation for DBS Global University Workspace (@dbs.edu.in)
    return this.login('harsh.23cse@dbs.edu.in');
  },

  async loginWithMicrosoft(): Promise<UserSession> {
    // Microsoft Office 365 SSO
    return this.login('harsh.23cse@dbs.edu.in');
  },

  async registerWithPin(data: {
    fullName: string;
    rollNo: string;
    email: string;
    camuPin: string;
    password: string;
  }): Promise<UserSession> {
    try {
      const response = await apiClient.post<UserSession>('/auth/register', data);
      localStorage.setItem('dbs_auth_token', response.token);
      localStorage.setItem('dbs_user_session', JSON.stringify(response));
      return response;
    } catch {
      const session: UserSession = {
        id: `STU-${Math.floor(100 + Math.random() * 900)}`,
        name: data.fullName,
        email: data.email,
        role: 'STUDENT',
        rollNo: data.rollNo,
        department: 'B.Tech CSE',
        token: `DBS_AUTH_JWT_${Date.now()}_NEW`,
      };
      localStorage.setItem('dbs_auth_token', session.token);
      localStorage.setItem('dbs_user_session', JSON.stringify(session));
      return session;
    }
  },

  getCurrentSession(): UserSession | null {
    const raw = localStorage.getItem('dbs_user_session');
    if (!raw) return null;
    try {
      return JSON.parse(raw);
    } catch {
      return null;
    }
  },

  logout(): void {
    localStorage.removeItem('dbs_auth_token');
    localStorage.removeItem('dbs_user_session');
  },
};
