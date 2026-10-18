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
      localStorage.setItem('dbs_last_user_email', response.email || username);
      if (response.name) localStorage.setItem('dbs_last_user_name', response.name);
      localStorage.setItem('dbs_last_active_time', Date.now().toString());
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
            name: username.split('@')[0] ? username.split('@')[0].replace('.', ' ').toUpperCase() : CURRENT_STUDENT.name,
            email: username.includes('@') ? username : `${username}@dbs.edu.in`,
            role: 'STUDENT',
            rollNo: CURRENT_STUDENT.rollNo,
            department: 'B.Tech CSE',
            avatarUrl: CURRENT_STUDENT.avatarUrl,
            token: `DBS_AUTH_JWT_${Date.now()}_STUDENT`,
          };

      localStorage.setItem('dbs_auth_token', session.token);
      localStorage.setItem('dbs_user_session', JSON.stringify(session));
      localStorage.setItem('dbs_last_user_email', session.email || username);
      if (session.name) localStorage.setItem('dbs_last_user_name', session.name);
      localStorage.setItem('dbs_last_active_time', Date.now().toString());
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
      localStorage.setItem('dbs_last_user_email', response.email || data.email);
      localStorage.setItem('dbs_last_user_name', response.name || data.fullName);
      localStorage.setItem('dbs_last_active_time', Date.now().toString());
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
      localStorage.setItem('dbs_last_user_email', session.email);
      localStorage.setItem('dbs_last_user_name', session.name);
      localStorage.setItem('dbs_last_active_time', Date.now().toString());
      return session;
    }
  },

  getCurrentSession(): UserSession | null {
    const raw = localStorage.getItem('dbs_user_session');
    if (!raw) return null;
    try {
      const session: UserSession = JSON.parse(raw);
      
      // Inactivity check: 7 days session inactivity expiration
      const INACTIVITY_TIMEOUT_MS = 7 * 24 * 60 * 60 * 1000;
      const lastActive = localStorage.getItem('dbs_last_active_time');
      if (lastActive) {
        const elapsed = Date.now() - parseInt(lastActive, 10);
        if (elapsed > INACTIVITY_TIMEOUT_MS) {
          // Expired due to inactivity: preserve email for "Welcome Back" greeting
          if (session.email) {
            localStorage.setItem('dbs_last_user_email', session.email);
            if (session.name) localStorage.setItem('dbs_last_user_name', session.name);
          }
          localStorage.removeItem('dbs_auth_token');
          localStorage.removeItem('dbs_user_session');
          return null;
        }
      }
      
      // Heartbeat update
      localStorage.setItem('dbs_last_active_time', Date.now().toString());
      return session;
    } catch {
      return null;
    }
  },

  logout(): void {
    // Retain previous session email so login screen greets returning user
    const raw = localStorage.getItem('dbs_user_session');
    if (raw) {
      try {
        const session: UserSession = JSON.parse(raw);
        if (session.email) {
          localStorage.setItem('dbs_last_user_email', session.email);
          if (session.name) localStorage.setItem('dbs_last_user_name', session.name);
        }
      } catch {
        // ignore
      }
    }
    localStorage.removeItem('dbs_auth_token');
    localStorage.removeItem('dbs_user_session');
  },
};
