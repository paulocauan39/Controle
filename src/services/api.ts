const API_BASE = '/api';

export function getStoredUserId(): string | null {
  return localStorage.getItem('pesquisa_jogos_user_id');
}

export function setStoredUserId(id: string | null) {
  if (id) {
    localStorage.setItem('pesquisa_jogos_user_id', id);
  } else {
    localStorage.removeItem('pesquisa_jogos_user_id');
  }
}

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const userId = getStoredUserId();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> || {}),
  };

  if (userId) {
    headers['x-user-id'] = userId;
  }

  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    let errorMsg = `Erro na requisição (${response.status})`;
    try {
      const errorData = await response.json();
      if (errorData.error) errorMsg = errorData.error;
    } catch {
      // fallback
    }
    throw new Error(errorMsg);
  }

  return response.json();
}

export const api = {
  // Auth & Setup
  getAuthStatus: () => request<{ initialized: boolean; totalParticipants: number; currentUser: any }>('/auth/status'),
  getUsers: () => request<any[]>('/auth/users'),
  login: (data: { email?: string; userId?: string }) => request<any>('/auth/login', { method: 'POST', body: JSON.stringify(data) }),
  loginWithGoogle: (data: { email: string; displayName?: string | null; photoURL?: string | null; uid?: string }) =>
    request<any>('/auth/google', { method: 'POST', body: JSON.stringify(data) }),
  register: (data: any) => request<any>('/auth/register', { method: 'POST', body: JSON.stringify(data) }),
  logout: () => request<any>('/auth/logout', { method: 'POST' }),
  setupInitialUser: (data: any) => request<any>('/setup/initial-user', { method: 'POST', body: JSON.stringify(data) }),
  seedData: () => request<{ message: string; coordinator: any }>('/setup/seed', { method: 'POST' }),

  // Dashboard
  getDashboard: () => request<any>('/dashboard'),

  // Participants
  getParticipants: () => request<any[]>('/participants'),
  createParticipant: (data: any) => request<any>('/participants', { method: 'POST', body: JSON.stringify(data) }),
  updateParticipant: (id: string, data: any) => request<any>(`/participants/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deactivateParticipant: (id: string) => request<any>(`/participants/${id}/deactivate`, { method: 'PATCH' }),

  // Teams
  getTeams: () => request<any[]>('/teams'),
  createTeam: (data: any) => request<any>('/teams', { method: 'POST', body: JSON.stringify(data) }),
  updateTeam: (id: string, data: any) => request<any>(`/teams/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteTeam: (id: string) => request<any>(`/teams/${id}`, { method: 'DELETE' }),

  // Games
  getGames: () => request<any[]>('/games'),
  getGameDetails: (id: string) => request<any>(`/games/${id}/details`),
  createGame: (data: any) => request<any>('/games', { method: 'POST', body: JSON.stringify(data) }),
  updateGame: (id: string, data: any) => request<any>(`/games/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteGame: (id: string) => request<any>(`/games/${id}`, { method: 'DELETE' }),

  // AIs
  getAIs: () => request<any[]>('/ais'),
  createAI: (data: any) => request<any>('/ais', { method: 'POST', body: JSON.stringify(data) }),
  updateAI: (id: string, data: any) => request<any>(`/ais/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteAI: (id: string) => request<any>(`/ais/${id}`, { method: 'DELETE' }),

  // Experiments
  getExperiments: () => request<any[]>('/experiments'),
  createExperiment: (data: any) => request<any>('/experiments', { method: 'POST', body: JSON.stringify(data) }),
  updateExperiment: (id: string, data: any) => request<any>(`/experiments/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteExperiment: (id: string) => request<any>(`/experiments/${id}`, { method: 'DELETE' }),

  // Prompts
  getPrompts: () => request<any[]>('/prompts'),
  getPromptCategories: () => request<string[]>('/prompts/categories'),
  getPromptCategoryItems: () => request<any[]>('/prompts/categories/items'),
  createPromptCategory: (categoriaOrData: string | { nome: string; descricao?: string; ativa?: boolean }) => {
    const payload = typeof categoriaOrData === 'string' ? { nome: categoriaOrData } : categoriaOrData;
    return request<any>('/prompts/categories', { method: 'POST', body: JSON.stringify(payload) });
  },
  updatePromptCategory: (id: string, data: any) => request<any>(`/prompts/categories/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deletePromptCategory: (id: string) => request<any>(`/prompts/categories/${id}`, { method: 'DELETE' }),
  createPrompt: (data: any) => request<any>('/prompts', { method: 'POST', body: JSON.stringify(data) }),
  updatePrompt: (id: string, data: any) => request<any>(`/prompts/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deletePrompt: (id: string) => request<any>(`/prompts/${id}`, { method: 'DELETE' }),

  // Tasks
  getTasks: () => request<any[]>('/tasks'),
  createTask: (data: any) => request<any>('/tasks', { method: 'POST', body: JSON.stringify(data) }),
  updateTask: (id: string, data: any) => request<any>(`/tasks/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  updateTaskStatus: (id: string, status: string, dataConclusao?: string, observacoes?: string) =>
    request<any>(`/tasks/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status, dataConclusao, observacoes }) }),
  deleteTask: (id: string) => request<any>(`/tasks/${id}`, { method: 'DELETE' }),

  // Versions
  getVersions: () => request<any[]>('/versions'),
  createVersion: (data: any) => request<any>('/versions', { method: 'POST', body: JSON.stringify(data) }),
  updateVersion: (id: string, data: any) => request<any>(`/versions/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteVersion: (id: string) => request<any>(`/versions/${id}`, { method: 'DELETE' }),

  // Tests / TestSuites
  getTests: () => request<any[]>('/tests'),
  getTestSuites: () => request<any[]>('/tests'),
  createTest: (data: any) => request<any>('/tests', { method: 'POST', body: JSON.stringify(data) }),
  createTestSuite: (data: any) => request<any>('/tests', { method: 'POST', body: JSON.stringify(data) }),
  updateTest: (id: string, data: any) => request<any>(`/tests/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  updateTestSuite: (id: string, data: any) => request<any>(`/tests/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteTest: (id: string) => request<any>(`/tests/${id}`, { method: 'DELETE' }),
  deleteTestSuite: (id: string) => request<any>(`/tests/${id}`, { method: 'DELETE' }),
  getTestEvaluations: (testId: string) => request<any[]>(`/tests/${testId}/evaluations`),
  submitTestEvaluation: (testId: string, data: any) => request<any>(`/tests/${testId}/evaluations`, { method: 'POST', body: JSON.stringify(data) }),
  submitEvaluation: (data: { testeId: string; [k: string]: any }) => request<any>(`/tests/${data.testeId}/evaluations`, { method: 'POST', body: JSON.stringify(data) }),

  // Results & AI Comparison
  getResults: () => request<any>('/results'),
  getGameResults: (gameId: string) => request<any>(`/results?gameId=${encodeURIComponent(gameId)}`),
  getAIComparison: () => request<any>('/ai-comparison'),

  // Schedule & Milestones
  getSchedule: () => request<any[]>('/schedule'),
  getMilestones: () => request<any[]>('/schedule'),
  createScheduleMilestone: (data: any) => request<any>('/schedule', { method: 'POST', body: JSON.stringify(data) }),
  createMilestone: (data: any) => request<any>('/schedule', { method: 'POST', body: JSON.stringify(data) }),
  updateScheduleMilestone: (id: string, data: any) => request<any>(`/schedule/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  updateMilestone: (id: string, data: any) => request<any>(`/schedule/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteScheduleMilestone: (id: string) => request<any>(`/schedule/${id}`, { method: 'DELETE' }),
  deleteMilestone: (id: string) => request<any>(`/schedule/${id}`, { method: 'DELETE' }),

  // Audit Logs
  getAuditLogs: () => request<any[]>('/audit-logs'),
  createAuditLog: (data: any) => request<any>('/audit-logs', { method: 'POST', body: JSON.stringify(data) }),

  // Reports
  getReport: (paramsOrType: string | { type: string; gameId?: string; teamId?: string }) => {
    if (typeof paramsOrType === 'string') {
      return request<any>(`/reports/${paramsOrType}`);
    }
    const { type, gameId, teamId } = paramsOrType;
    let url = `/reports/${type}`;
    const searchParams = new URLSearchParams();
    if (gameId) searchParams.append('gameId', gameId);
    if (teamId) searchParams.append('teamId', teamId);
    const query = searchParams.toString();
    if (query) url += `?${query}`;
    return request<any>(url);
  },

  // Documents
  getDocuments: () => request<any[]>('/documents'),
  getDocumentById: (id: string) => request<any>(`/documents/${id}`),
  createDocument: (data: any) => request<any>('/documents', { method: 'POST', body: JSON.stringify(data) }),
  updateDocument: (id: string, data: any) => request<any>(`/documents/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteDocument: (id: string) => request<any>(`/documents/${id}`, { method: 'DELETE' }),

  // System Versions (Rule 26)
  getSystemVersions: () => request<any[]>('/system-versions'),
  createSystemVersion: (data: any) => request<any>('/system-versions', { method: 'POST', body: JSON.stringify(data) }),

  // Future Suggestions (Rule 1)
  getFutureSuggestions: () => request<any[]>('/future-suggestions'),
  createFutureSuggestion: (data: any) => request<any>('/future-suggestions', { method: 'POST', body: JSON.stringify(data) }),
  updateFutureSuggestionStatus: (id: string, status: string) =>
    request<any>(`/future-suggestions/${id}/status`, { method: 'PUT', body: JSON.stringify({ status }) }),
};
