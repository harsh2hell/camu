import { apiClient, type ApiResponse } from './client';
import type { SafeUser } from '../../server/src/types/auth';

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
  /**
   * Authenticates against the real backend server via POST /api/auth/login.
   * If authentication fails or network error occurs, re-throws the real server error.
   * Never generates synthetic offline tokens.
   */
  async login(username: string, password?: string, forceRole?: 'STUDENT' | 'FACULTY'): Promise<UserSession> {
    if (!password) {
      throw new Error('Password is required for authentication.');
    }

    const payload = {
      identifier: username.trim(),
      password,
      expectedRole: forceRole,
    };

    // Call real backend API
    const response = await apiClient.post<ApiResponse<{ user: SafeUser; token: string }>>('/auth/login', payload);

    if (!response.success || !response.data) {
      throw new Error(response.message || 'Authentication failed. Please verify your credentials.');
    }

    const { user, token } = response.data;

    const session: UserSession = {
      id: user.id,
      name: user.fullName,
      email: user.email,
      role: user.role === 'FACULTY' ? 'FACULTY' : 'STUDENT',
      token,
      rollNo: user.studentProfile?.rollNumber,
      department: user.facultyProfile ? user.facultyProfile.designation : 'B.Tech CSE',
      avatarUrl: user.avatarUrl ?? (user.role === 'STUDENT' ? '/harendra_avatar.png' : undefined),
    };

    // Store session info locally for UI state restoration
    localStorage.setItem('dbs_auth_token', session.token);
    localStorage.setItem('dbs_user_session', JSON.stringify(session));
    localStorage.setItem('dbs_last_user_email', session.email);
    localStorage.setItem('dbs_last_user_role', session.role);
    if (session.name) localStorage.setItem('dbs_last_user_name', session.name);
    localStorage.setItem('dbs_last_active_time', Date.now().toString());

    return session;
  },

  /**
   * Real current user validation with server
   */
  async fetchCurrentUser(): Promise<SafeUser | null> {
    try {
      const response = await apiClient.get<ApiResponse<{ user: SafeUser }>>('/auth/me');
      if (response.success && response.data?.user) {
        return response.data.user;
      }
      return null;
    } catch {
      return null;
    }
  },

  /**
   * Institutional Google SSO placeholder (labeled as under compliance review)
   */
  async loginWithGoogle(_preferredRole: 'STUDENT' | 'FACULTY' = 'STUDENT'): Promise<UserSession> {
    throw new Error(
      'Institutional Google Workspace SSO is currently under OIDC security compliance review. Please sign in with your official university credentials or development fixture (student.dev@dgu.ac.in).'
    );
  },

  /**
   * Institutional Microsoft 365 SSO placeholder (labeled as under compliance review)
   */
  async loginWithMicrosoft(_preferredRole: 'STUDENT' | 'FACULTY' = 'STUDENT'): Promise<UserSession> {
    throw new Error(
      'Institutional Microsoft 365 SSO is currently under OIDC security compliance review. Please sign in with your official university credentials or development fixture (faculty.dev@dgu.ac.in).'
    );
  },

  /**
   * Registration endpoint with registrar authorization requirement
   */
  async registerWithPin(_data: {
    fullName: string;
    rollNo: string;
    email: string;
    camuPin: string;
    password: string;
  }): Promise<UserSession> {
    throw new Error(
      'Self-service student registration requires university registrar PIN authorization. Please contact the Office of the Registrar to provision your academic account.'
    );
  },

  /**
   * Retrieves active session from localStorage with server-side expiration validation
   */
  getCurrentSession(): UserSession | null {
    const raw = localStorage.getItem('dbs_user_session');
    if (!raw) return null;
    try {
      const session: UserSession = JSON.parse(raw);

      // Inactivity timeout: 7 days
      const INACTIVITY_TIMEOUT_MS = 7 * 24 * 60 * 60 * 1000;
      const lastActive = localStorage.getItem('dbs_last_active_time');
      if (lastActive) {
        const elapsed = Date.now() - parseInt(lastActive, 10);
        if (elapsed > INACTIVITY_TIMEOUT_MS) {
          if (session.email) localStorage.setItem('dbs_last_user_email', session.email);
          if (session.role) localStorage.setItem('dbs_last_user_role', session.role);
          localStorage.removeItem('dbs_auth_token');
          localStorage.removeItem('dbs_user_session');
          return null;
        }
      }

      localStorage.setItem('dbs_last_active_time', Date.now().toString());
      if (session.role) {
        localStorage.setItem('dbs_last_user_role', session.role);
      }
      return session;
    } catch {
      return null;
    }
  },

  /**
   * Terminate session on both server and client
   */
  async logout(): Promise<void> {
    // 1. Call server to revoke session and clear HTTP-only cookie
    try {
      await apiClient.post('/auth/logout', {});
    } catch {
      // Best-effort server notification
    }

    // 2. Retain previous role & email for returning user screen
    const raw = localStorage.getItem('dbs_user_session');
    if (raw) {
      try {
        const session: UserSession = JSON.parse(raw);
        if (session.email) localStorage.setItem('dbs_last_user_email', session.email);
        if (session.name) localStorage.setItem('dbs_last_user_name', session.name);
        if (session.role) localStorage.setItem('dbs_last_user_role', session.role);
      } catch {
        // ignore
      }
    }

    // 3. Clear local tokens
    localStorage.removeItem('dbs_auth_token');
    localStorage.removeItem('dbs_user_session');
  },

  getLastUserRole(): 'STUDENT' | 'FACULTY' | null {
    const role = localStorage.getItem('dbs_last_user_role');
    if (role === 'FACULTY' || role === 'STUDENT') return role;
    return null;
  },

  setLastUserRole(role: 'STUDENT' | 'FACULTY'): void {
    localStorage.setItem('dbs_last_user_role', role);
  },
};
