import axios from 'axios';
import {
  User,
  Institution,
  Deposit,
  DocumentItem,
  ExtractedField,
  VerificationEvent,
  TrustLadder,
  Task,
  ReleaseRequest,
  ChecklistResult,
  AuditEvent,
  DashboardStats,
  PriorityQueueItem,
  MaturityCalendarItem,
  PassportEvent,
  ConsistencyResult,
  ChainNode,
} from '../types';

export const apiClient = axios.create({
  baseURL: '',
});

apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    if (!config.headers) {
      config.headers = {} as any;
    }
    if (typeof config.headers.set === 'function') {
      config.headers.set('Authorization', `Bearer ${token}`);
    }
    config.headers['Authorization'] = `Bearer ${token}`;
  }
  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    const isMeRequest = error.config && error.config.url && error.config.url.includes('/api/auth/me');
    if (error.response && error.response.status === 401 && isMeRequest) {
      if (window.location.pathname !== '/login') {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

// Auth
export const login = async (username: string, password: string): Promise<{ access_token: string }> => {
  const res = await apiClient.post('/api/auth/login', { username, password });
  return res.data;
};

export const getMe = async (): Promise<User> => {
  const res = await apiClient.get('/api/auth/me');
  return res.data;
};

export const listUsers = async (): Promise<User[]> => {
  const res = await apiClient.get('/api/auth/users');
  return res.data;
};

// Institutions
export const getInstitutions = async (params?: { search?: string; region?: string; status?: string }): Promise<Institution[]> => {
  const res = await apiClient.get('/api/institutions', { params });
  return res.data;
};

export const createInstitution = async (data: Partial<Institution>): Promise<Institution> => {
  const res = await apiClient.post('/api/institutions', data);
  return res.data;
};

export const getInstitution = async (id: number): Promise<Institution> => {
  const res = await apiClient.get(`/api/institutions/${id}`);
  return res.data;
};

export const updateInstitution = async (id: number, data: Partial<Institution>): Promise<Institution> => {
  const res = await apiClient.put(`/api/institutions/${id}`, data);
  return res.data;
};

// Deposits
export const getDeposits = async (params?: {
  status?: string;
  bank?: string;
  institution_id?: number;
  search?: string;
}): Promise<Deposit[]> => {
  const res = await apiClient.get('/api/deposits', { params });
  return res.data;
};

export const createDeposit = async (data: any): Promise<Deposit> => {
  const res = await apiClient.post('/api/deposits', data);
  return res.data;
};

export const getDeposit = async (id: number): Promise<Deposit> => {
  const res = await apiClient.get(`/api/deposits/${id}`);
  return res.data;
};

export const updateDeposit = async (id: number, data: any): Promise<Deposit> => {
  const res = await apiClient.put(`/api/deposits/${id}`, data);
  return res.data;
};

export const createReplacement = async (id: number, data: any): Promise<Deposit> => {
  const res = await apiClient.post(`/api/deposits/${id}/replace`, data);
  return res.data;
};

export const getDepositChain = async (id: number): Promise<ChainNode[]> => {
  const res = await apiClient.get(`/api/deposits/${id}/chain`);
  return res.data;
};

export const getDepositPassport = async (id: number): Promise<PassportEvent[]> => {
  const res = await apiClient.get(`/api/deposits/${id}/passport`);
  return res.data;
};

export const runConsistencyCheck = async (id: number): Promise<ConsistencyResult[]> => {
  const res = await apiClient.post(`/api/deposits/${id}/consistency-check`);
  return res.data;
};

// Documents
export const uploadDocument = async (depositId: number, documentType: string, file: File): Promise<DocumentItem> => {
  const formData = new FormData();
  formData.append('deposit_id', depositId.toString());
  formData.append('document_type', documentType);
  formData.append('file', file);
  const res = await apiClient.post('/api/documents/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return res.data;
};

export const getDocument = async (id: number): Promise<{ document: DocumentItem; extracted_fields: ExtractedField[] }> => {
  const res = await apiClient.get(`/api/documents/${id}`);
  return res.data;
};

export const extractFields = async (id: number): Promise<{ message: string; fields: ExtractedField[] }> => {
  const res = await apiClient.post(`/api/documents/${id}/extract`);
  return res.data;
};

export const correctField = async (docId: number, fieldId: number, correctedValue: string): Promise<any> => {
  const res = await apiClient.put(`/api/documents/${docId}/fields/${fieldId}/correct`, {
    corrected_value: correctedValue,
  });
  return res.data;
};

export const listDepositDocuments = async (depositId: number): Promise<DocumentItem[]> => {
  const res = await apiClient.get(`/api/documents/by-deposit/${depositId}`);
  return res.data;
};

export const getDocumentDownloadUrl = (docId: number) => `/api/documents/${docId}/download`;

// Verification
export const runVerification = async (depositId: number): Promise<VerificationEvent> => {
  const res = await apiClient.post(`/api/verification/verify/${depositId}`);
  return res.data;
};

export const getVerificationHistory = async (depositId: number): Promise<VerificationEvent[]> => {
  const res = await apiClient.get(`/api/verification/history/${depositId}`);
  return res.data;
};

export const getTrustLadder = async (depositId: number): Promise<TrustLadder> => {
  const res = await apiClient.get(`/api/verification/trust-ladder/${depositId}`);
  return res.data;
};

export const confirmHumanScrutiny = async (depositId: number, remarks: string): Promise<TrustLadder> => {
  const res = await apiClient.post(`/api/verification/confirm-human/${depositId}`, { remarks });
  return res.data;
};

// Tasks
export const getTasks = async (params?: { status?: string; task_type?: string }): Promise<Task[]> => {
  const res = await apiClient.get('/api/tasks', { params });
  return res.data;
};

export const getMyTasks = async (): Promise<Task[]> => {
  const res = await apiClient.get('/api/tasks/my-tasks');
  return res.data;
};

export const acknowledgeTask = async (id: number): Promise<any> => {
  const res = await apiClient.put(`/api/tasks/${id}/acknowledge`);
  return res.data;
};

export const closeTask = async (id: number, reason: string): Promise<any> => {
  const res = await apiClient.put(`/api/tasks/${id}/close`, { reason });
  return res.data;
};

export const reassignTask = async (id: number, newOwnerId: number): Promise<any> => {
  const res = await apiClient.put(`/api/tasks/${id}/reassign`, { new_owner_id: newOwnerId });
  return res.data;
};

export const generateMaturityAlerts = async (): Promise<{ message: string; alerts_created: number }> => {
  const res = await apiClient.post('/api/tasks/generate-maturity-alerts');
  return res.data;
};

// Release Requests
export const getReleases = async (): Promise<ReleaseRequest[]> => {
  const res = await apiClient.get('/api/releases');
  return res.data;
};

export const createRelease = async (depositId: number): Promise<ReleaseRequest> => {
  const res = await apiClient.post('/api/releases', { deposit_id: depositId });
  return res.data;
};

export const getRelease = async (id: number): Promise<ReleaseRequest> => {
  const res = await apiClient.get(`/api/releases/${id}`);
  return res.data;
};

export const updateReleaseStatus = async (id: number, status: string, notes?: string): Promise<any> => {
  const res = await apiClient.put(`/api/releases/${id}/status`, { status, notes });
  return res.data;
};

export const submitRelease = async (id: number): Promise<any> => {
  const res = await apiClient.post(`/api/releases/${id}/submit`);
  return res.data;
};

export const approveRelease = async (id: number): Promise<any> => {
  const res = await apiClient.post(`/api/releases/${id}/approve`);
  return res.data;
};

export const rejectRelease = async (id: number, reason: string): Promise<any> => {
  const res = await apiClient.post(`/api/releases/${id}/reject`, { reason });
  return res.data;
};

export const getReleaseChecklist = async (id: number): Promise<ChecklistResult[]> => {
  const res = await apiClient.get(`/api/releases/${id}/checklist`);
  return res.data;
};

export const updateChecklistResult = async (relId: number, resultId: number, data: { status: string; document_id?: number; notes?: string }): Promise<any> => {
  const res = await apiClient.put(`/api/releases/${relId}/checklist/${resultId}`, data);
  return res.data;
};

// Dashboard
export const getDashboardStats = async (): Promise<DashboardStats> => {
  const res = await apiClient.get('/api/dashboard/stats');
  return res.data;
};

export const getMaturityCalendar = async (): Promise<MaturityCalendarItem[]> => {
  const res = await apiClient.get('/api/dashboard/maturity-calendar');
  return res.data;
};

export const getPriorityQueue = async (): Promise<PriorityQueueItem[]> => {
  const res = await apiClient.get('/api/dashboard/priority-queue');
  return res.data;
};

export const getRecentActivity = async (): Promise<AuditEvent[]> => {
  const res = await apiClient.get('/api/dashboard/recent-activity');
  return res.data;
};

// Audit
export const getAuditEvents = async (params?: { object_type?: string; actor?: string; limit?: number }): Promise<AuditEvent[]> => {
  const res = await apiClient.get('/api/audit', { params });
  return res.data;
};

export const getDepositAudit = async (depositId: string): Promise<AuditEvent[]> => {
  const res = await apiClient.get(`/api/audit/deposit/${depositId}`);
  return res.data;
};
