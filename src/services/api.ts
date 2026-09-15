import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
} from 'firebase/firestore';
import { db, auth } from '../lib/firebase.js';
import {
  Participant,
  Team,
  Game,
  AIModel,
  Experiment,
  PromptItem,
  PromptCategoryItem,
  ProjectDocument,
  Task,
  GameVersion,
  TestSuite,
  TestEvaluation,
  ScheduleMilestone,
  AuditLog,
  SystemVersion,
  FutureSuggestion,
  DashboardStats,
  UserRole,
} from '../types.js';

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

// Helper to strictly prevent sending 'undefined' to Firestore
export function sanitizeFirestoreDoc<T extends Record<string, any>>(obj: T): Record<string, any> {
  const clean: Record<string, any> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v !== undefined) {
      if (v !== null && typeof v === 'object' && !Array.isArray(v) && !(v instanceof Date)) {
        clean[k] = sanitizeFirestoreDoc(v);
      } else {
        clean[k] = v;
      }
    }
  }
  return clean;
}

// Generate unique ID with prefix
function generateId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
}

export const api = {
  // ==================== AUTH & SETUP ====================

  getAuthStatus: async (): Promise<{ initialized: boolean; totalParticipants: number; currentUser: Participant | null }> => {
    try {
      const participants = await api.getParticipants();
      const currentUserId = getStoredUserId() || auth.currentUser?.uid;
      let currentUser: Participant | null = null;

      if (currentUserId) {
        currentUser = participants.find(p => p.id === currentUserId || p.email?.toLowerCase() === currentUserId.toLowerCase()) || null;
      }
      if (!currentUser && auth.currentUser?.email) {
        const userEmail = auth.currentUser.email.toLowerCase();
        currentUser = participants.find(p => p.email?.toLowerCase() === userEmail) || null;
      }

      return {
        initialized: participants.length > 0,
        totalParticipants: participants.length,
        currentUser,
      };
    } catch (err) {
      console.error('[API] getAuthStatus error:', err);
      return { initialized: false, totalParticipants: 0, currentUser: null };
    }
  },

  getUsers: async (): Promise<Participant[]> => {
    return api.getParticipants();
  },

  login: async (data: { email?: string; userId?: string }): Promise<{ user: Participant }> => {
    const participants = await api.getParticipants();
    let found: Participant | undefined;

    if (data.userId) {
      found = participants.find(p => p.id === data.userId);
    }
    if (!found && data.email) {
      const emailLower = data.email.trim().toLowerCase();
      found = participants.find(p => p.email?.toLowerCase() === emailLower);
    }

    if (!found) {
      throw new Error('Usuário não encontrado no Firestore.');
    }

    setStoredUserId(found.id);
    return { user: found };
  },

  loginWithGoogle: async (data: { email: string; displayName?: string | null; photoURL?: string | null; uid?: string }): Promise<{ user: Participant }> => {
    const emailLower = data.email.trim().toLowerCase();
    const participants = await api.getParticipants();
    let found = participants.find(p => p.email?.toLowerCase() === emailLower);

    const isPaulo = emailLower === 'paulocauan39@gmail.com';

    if (!found) {
      const newParticipant: Participant = {
        id: data.uid || generateId('part'),
        nome: data.displayName || emailLower.split('@')[0],
        email: emailLower,
        funcao: isPaulo ? 'coordenador_aluno' : 'aluno',
        isAdmin: isPaulo,
        roles: isPaulo ? ['coordenador_aluno', 'admin'] : ['aluno'],
        status: 'Ativo',
        dataEntrada: new Date().toISOString().split('T')[0],
        createdAt: new Date().toISOString(),
      };
      await api.createParticipant(newParticipant);
      found = newParticipant;
    }

    setStoredUserId(found.id);
    return { user: found };
  },

  register: async (data: any): Promise<Participant & { user: Participant }> => {
    const newParticipant = await api.createParticipant(data);
    setStoredUserId(newParticipant.id);
    return Object.assign(newParticipant, { user: newParticipant });
  },

  logout: async (): Promise<{ success: boolean }> => {
    setStoredUserId(null);
    return { success: true };
  },

  setupInitialUser: async (data: any): Promise<Participant> => {
    const created = await api.createParticipant({
      ...data,
      funcao: data.funcao || 'coordenador_aluno',
      status: 'Ativo',
      dataEntrada: data.dataEntrada || new Date().toISOString().split('T')[0],
    });
    setStoredUserId(created.id);
    return created;
  },

  seedData: async (): Promise<{ message: string; coordinator: any }> => {
    const participants = await api.getParticipants();
    const coordinator = participants.find(p => p.funcao === 'coordenador_aluno' || p.isAdmin) || participants[0] || null;
    return {
      message: 'Sistema conectado diretamente ao banco de dados Firestore em tempo real.',
      coordinator,
    };
  },

  // ==================== PARTICIPANTS & USERS ====================

  getParticipants: async (): Promise<Participant[]> => {
    try {
      const [partsSnap, usersSnap] = await Promise.all([
        getDocs(collection(db, 'participants')).catch(() => ({ docs: [], empty: true, forEach: () => {} })),
        getDocs(collection(db, 'usuarios')).catch(() => ({ docs: [], empty: true, forEach: () => {} })),
      ]);

      const map = new Map<string, Participant>();

      // Read from /participants collection
      partsSnap.forEach((d: any) => {
        const data = d.data() || {};
        const isPaulo = (data.email || '').toLowerCase().trim() === 'paulocauan39@gmail.com';
        const item: Participant = {
          id: d.id || data.id,
          nome: data.nome || data.displayName || data.name || (data.email ? data.email.split('@')[0] : 'Participante'),
          email: data.email || '',
          funcao: (data.funcao || data.perfil || data.role || (isPaulo ? 'coordenador_aluno' : 'aluno')) as UserRole,
          status: data.status || 'Ativo',
          dataEntrada: data.dataEntrada || new Date().toISOString().split('T')[0],
          createdAt: data.createdAt || new Date().toISOString(),
          ...(data.equipeId ? { equipeId: data.equipeId } : {}),
          ...(data.equipeNome ? { equipeNome: data.equipeNome } : {}),
          ...(data.isAdmin !== undefined || isPaulo ? { isAdmin: data.isAdmin ?? isPaulo } : {}),
          ...(data.roles ? { roles: data.roles } : {}),
        };
        const key = (item.email || item.id).toLowerCase();
        map.set(key, item);
      });

      // Merge from /usuarios collection (ensures all Google Auth registered students appear)
      usersSnap.forEach((d: any) => {
        const data = d.data() || {};
        const emailKey = (data.email || d.id || '').toLowerCase();
        const existing = map.get(emailKey) || map.get(d.id.toLowerCase());
        const isPaulo = (data.email || '').toLowerCase().trim() === 'paulocauan39@gmail.com';

        const item: Participant = {
          id: existing?.id || d.id || data.id,
          nome: existing?.nome || data.nome || data.displayName || data.name || (data.email ? data.email.split('@')[0] : 'Usuário'),
          email: existing?.email || data.email || '',
          funcao: (existing?.funcao || data.funcao || data.perfil || data.role || (isPaulo ? 'coordenador_aluno' : 'aluno')) as UserRole,
          status: existing?.status || data.status || 'Ativo',
          dataEntrada: existing?.dataEntrada || data.dataEntrada || new Date().toISOString().split('T')[0],
          createdAt: existing?.createdAt || data.createdAt || new Date().toISOString(),
          ...(existing?.equipeId || data.equipeId ? { equipeId: existing?.equipeId || data.equipeId } : {}),
          ...(existing?.equipeNome || data.equipeNome ? { equipeNome: existing?.equipeNome || data.equipeNome } : {}),
          ...(existing?.isAdmin !== undefined || data.isAdmin !== undefined || isPaulo
            ? { isAdmin: existing?.isAdmin ?? data.isAdmin ?? isPaulo }
            : {}),
          ...(existing?.roles || data.roles ? { roles: existing?.roles || data.roles } : {}),
        };

        map.set(emailKey || d.id, item);
      });

      return Array.from(map.values());
    } catch (err: any) {
      console.error('[API] getParticipants error:', err);
      throw new Error(err.message || 'Erro ao consultar participantes no Firestore');
    }
  },

  createParticipant: async (data: any): Promise<Participant> => {
    try {
      const id = data.id || generateId('part');
      const emailLower = (data.email || '').trim().toLowerCase();
      const isPaulo = emailLower === 'paulocauan39@gmail.com';

      const participant: Participant = {
        id,
        nome: (data.nome || '').trim(),
        email: emailLower,
        funcao: data.funcao || (isPaulo ? 'coordenador_aluno' : 'aluno'),
        status: data.status || 'Ativo',
        dataEntrada: data.dataEntrada || new Date().toISOString().split('T')[0],
        createdAt: new Date().toISOString(),
        ...(data.equipeId ? { equipeId: data.equipeId } : {}),
        ...(data.equipeNome ? { equipeNome: data.equipeNome } : {}),
        ...(data.isAdmin !== undefined || isPaulo ? { isAdmin: data.isAdmin ?? isPaulo } : {}),
        ...(data.roles ? { roles: data.roles } : {}),
      };

      const docData = sanitizeFirestoreDoc(participant);

      await Promise.all([
        setDoc(doc(db, 'participants', id), docData, { merge: true }),
        setDoc(doc(db, 'usuarios', id), docData, { merge: true }),
      ]);

      await api.createAuditLog({
        acao: 'Criação',
        registroAfetado: participant.nome,
        tipoEntidade: 'Participant',
        entidadeId: participant.id,
        alteracaoRealizada: `Cadastro do participante ${participant.nome} (${participant.email}) com função ${participant.funcao}.`,
        moduloAfetado: 'Participantes',
      });

      return participant;
    } catch (err: any) {
      console.error('[API] createParticipant error:', err);
      throw new Error(err.message || 'Erro ao cadastrar participante no Firestore');
    }
  },

  updateParticipant: async (id: string, data: any): Promise<Participant> => {
    try {
      const existing = (await api.getParticipants()).find(p => p.id === id);
      const isPaulo = (data.email || existing?.email || '').trim().toLowerCase() === 'paulocauan39@gmail.com';

      const updated: Participant = {
        ...(existing || { id, nome: '', email: '', funcao: 'aluno', status: 'Ativo', dataEntrada: '', createdAt: new Date().toISOString() }),
        ...data,
        id,
        updatedAt: new Date().toISOString(),
        ...(data.isAdmin !== undefined || isPaulo ? { isAdmin: data.isAdmin ?? isPaulo } : {}),
      };

      const docData = sanitizeFirestoreDoc(updated);

      await Promise.all([
        setDoc(doc(db, 'participants', id), docData, { merge: true }),
        setDoc(doc(db, 'usuarios', id), docData, { merge: true }),
      ]);

      await api.createAuditLog({
        acao: 'Atualização',
        registroAfetado: updated.nome,
        tipoEntidade: 'Participant',
        entidadeId: updated.id,
        alteracaoRealizada: `Atualização dos dados do participante ${updated.nome}.`,
        moduloAfetado: 'Participantes',
      });

      return updated;
    } catch (err: any) {
      console.error('[API] updateParticipant error:', err);
      throw new Error(err.message || 'Erro ao atualizar participante no Firestore');
    }
  },

  deactivateParticipant: async (id: string): Promise<Participant> => {
    return api.updateParticipant(id, { status: 'Inativo' });
  },

  deleteParticipant: async (id: string, executorUser?: { funcao?: string; isAdmin?: boolean; email?: string } | null): Promise<{ success: boolean; message: string }> => {
    return api.deleteUserDoc(id, executorUser);
  },

  deleteUserDoc: async (uid: string, executorUser?: { funcao?: string; isAdmin?: boolean; email?: string } | null): Promise<{ success: boolean; message: string }> => {
    try {
      // Role check: If executor is provided, verify admin role
      if (executorUser) {
        const isAdm = executorUser.isAdmin === true || executorUser.funcao === 'admin' || (executorUser.email || '').toLowerCase().trim() === 'paulocauan39@gmail.com';
        if (!isAdm) {
          throw new Error('Acesso negado: apenas usuários com perfil de Administrador podem excluir registros de usuários no Firestore.');
        }
      }

      // Fetch user data before deletion for audit record
      let targetName = `Usuário ${uid}`;
      let targetEmail = '';
      try {
        const userDoc = await getDoc(doc(db, 'usuarios', uid));
        if (userDoc.exists()) {
          const data = userDoc.data();
          targetName = data.nome || data.displayName || targetName;
          targetEmail = data.email || '';
        } else {
          const partDoc = await getDoc(doc(db, 'participants', uid));
          if (partDoc.exists()) {
            const data = partDoc.data();
            targetName = data.nome || targetName;
            targetEmail = data.email || '';
          }
        }
      } catch (e) {
        console.warn('Could not read user data before delete:', e);
      }

      // 1. Delete from /usuarios collection by UID
      try {
        await deleteDoc(doc(db, 'usuarios', uid));
      } catch (e) {
        console.warn('[API] Delete doc in /usuarios by uid:', e);
      }

      // 2. Delete from /participants collection by UID
      try {
        await deleteDoc(doc(db, 'participants', uid));
      } catch (e) {
        console.warn('[API] Delete doc in /participants by uid:', e);
      }

      // 3. Delete by email if targetEmail exists and was used as doc id
      if (targetEmail && targetEmail !== uid) {
        try {
          await deleteDoc(doc(db, 'usuarios', targetEmail));
        } catch {}
        try {
          await deleteDoc(doc(db, 'participants', targetEmail));
        } catch {}
      }

      // 4. Record in audit_logs collection
      await api.createAuditLog({
        acao: 'deleteDoc: Exclusão de Usuário',
        registroAfetado: targetName,
        tipoEntidade: 'usuarios',
        entidadeId: uid,
        alteracaoRealizada: `Exclusão permanente (deleteDoc) do usuário "${targetName}" (${targetEmail || 'UID: ' + uid}) executada por administrador.`,
        moduloAfetado: 'Admin / Usuários',
        detalhes: {
          uid,
          targetEmail,
          targetName,
        },
      });

      return { success: true, message: `Usuário "${targetName}" excluído com sucesso do Firestore.` };
    } catch (err: any) {
      console.error('[API] deleteUserDoc error:', err);
      throw new Error(err.message || 'Erro ao excluir usuário no Firestore');
    }
  },

  // ==================== TEAMS ====================

  getTeams: async (): Promise<Team[]> => {
    try {
      const snap = await getDocs(collection(db, 'teams'));
      return snap.docs.map(d => ({ id: d.id, ...d.data() } as Team));
    } catch (err: any) {
      console.error('[API] getTeams error:', err);
      throw new Error(err.message || 'Erro ao buscar equipes no Firestore');
    }
  },

  createTeam: async (data: any): Promise<Team> => {
    try {
      const id = data.id || generateId('team');
      const team: Team = {
        ...data,
        id,
        status: data.status || 'Ativa',
        createdAt: new Date().toISOString(),
      };
      const clean = sanitizeFirestoreDoc(team);
      await setDoc(doc(db, 'teams', id), clean);

      await api.createAuditLog({
        acao: 'Criação',
        registroAfetado: team.nome,
        tipoEntidade: 'Team',
        entidadeId: team.id,
        alteracaoRealizada: `Criação da equipe ${team.nome}.`,
        moduloAfetado: 'Equipes',
      });

      return team;
    } catch (err: any) {
      console.error('[API] createTeam error:', err);
      throw new Error(err.message || 'Erro ao criar equipe no Firestore');
    }
  },

  updateTeam: async (id: string, data: any): Promise<Team> => {
    try {
      const clean = sanitizeFirestoreDoc({ ...data, id, updatedAt: new Date().toISOString() });
      await setDoc(doc(db, 'teams', id), clean, { merge: true });

      await api.createAuditLog({
        acao: 'Atualização',
        registroAfetado: data.nome || id,
        tipoEntidade: 'Team',
        entidadeId: id,
        alteracaoRealizada: `Atualização dos dados da equipe ${data.nome || id}.`,
        moduloAfetado: 'Equipes',
      });

      const snap = await getDoc(doc(db, 'teams', id));
      return { id, ...snap.data() } as Team;
    } catch (err: any) {
      console.error('[API] updateTeam error:', err);
      throw new Error(err.message || 'Erro ao atualizar equipe no Firestore');
    }
  },

  deleteTeam: async (id: string): Promise<{ success: boolean; message: string }> => {
    try {
      const snap = await getDoc(doc(db, 'teams', id));
      const teamData = snap.exists() ? snap.data() : null;
      await deleteDoc(doc(db, 'teams', id));

      await api.createAuditLog({
        acao: 'Exclusão',
        registroAfetado: teamData?.nome || `Equipe ${id}`,
        tipoEntidade: 'Team',
        entidadeId: id,
        alteracaoRealizada: `Exclusão permanente da equipe ${teamData?.nome || id} do Firestore.`,
        moduloAfetado: 'Equipes',
      });

      return { success: true, message: 'Equipe excluída com sucesso.' };
    } catch (err: any) {
      console.error('[API] deleteTeam error:', err);
      throw new Error(err.message || 'Erro ao excluir equipe no Firestore');
    }
  },

  // ==================== GAMES ====================

  getGames: async (): Promise<Game[]> => {
    try {
      const snap = await getDocs(collection(db, 'games'));
      return snap.docs.map(d => ({ id: d.id, ...d.data() } as Game));
    } catch (err: any) {
      console.error('[API] getGames error:', err);
      throw new Error(err.message || 'Erro ao buscar jogos no Firestore');
    }
  },

  getGameDetails: async (id: string): Promise<any> => {
    try {
      const gameSnap = await getDoc(doc(db, 'games', id));
      if (!gameSnap.exists()) {
        throw new Error('Jogo não encontrado.');
      }
      const game = { id: gameSnap.id, ...gameSnap.data() } as Game;

      const [tasks, experiments, versions, suites] = await Promise.all([
        api.getTasks().then(t => t.filter(x => x.equipeId === game.equipeId || (x as any).jogoId === game.id)),
        api.getExperiments().then(e => e.filter(x => x.jogoId === game.id)),
        api.getVersions().then(v => v.filter(x => x.jogoId === game.id)),
        api.getTestSuites().then(s => s.filter(x => x.jogoId === game.id)),
      ]);

      return {
        game,
        tasks,
        experiments,
        versions,
        testSuites: suites,
      };
    } catch (err: any) {
      console.error('[API] getGameDetails error:', err);
      throw new Error(err.message || 'Erro ao buscar detalhes do jogo');
    }
  },

  createGame: async (data: any): Promise<Game> => {
    try {
      const id = data.id || generateId('game');
      const game: Game = {
        ...data,
        id,
        status: data.status || 'Planejamento',
        createdAt: new Date().toISOString(),
      };
      const clean = sanitizeFirestoreDoc(game);
      await setDoc(doc(db, 'games', id), clean);

      await api.createAuditLog({
        acao: 'Criação',
        registroAfetado: game.nome,
        tipoEntidade: 'Game',
        entidadeId: game.id,
        alteracaoRealizada: `Cadastro do jogo ${game.nome}.`,
        moduloAfetado: 'Jogos',
      });

      return game;
    } catch (err: any) {
      console.error('[API] createGame error:', err);
      throw new Error(err.message || 'Erro ao cadastrar jogo no Firestore');
    }
  },

  updateGame: async (id: string, data: any): Promise<Game> => {
    try {
      const clean = sanitizeFirestoreDoc({ ...data, id, updatedAt: new Date().toISOString() });
      await setDoc(doc(db, 'games', id), clean, { merge: true });

      await api.createAuditLog({
        acao: 'Atualização',
        registroAfetado: data.nome || id,
        tipoEntidade: 'Game',
        entidadeId: id,
        alteracaoRealizada: `Atualização dos dados do jogo ${data.nome || id}.`,
        moduloAfetado: 'Jogos',
      });

      const snap = await getDoc(doc(db, 'games', id));
      return { id, ...snap.data() } as Game;
    } catch (err: any) {
      console.error('[API] updateGame error:', err);
      throw new Error(err.message || 'Erro ao atualizar jogo no Firestore');
    }
  },

  deleteGame: async (id: string): Promise<{ success: boolean; message: string }> => {
    try {
      const snap = await getDoc(doc(db, 'games', id));
      const gameData = snap.exists() ? snap.data() : null;
      await deleteDoc(doc(db, 'games', id));

      await api.createAuditLog({
        acao: 'Exclusão',
        registroAfetado: gameData?.nome || `Jogo ${id}`,
        tipoEntidade: 'Game',
        entidadeId: id,
        alteracaoRealizada: `Exclusão permanente do jogo ${gameData?.nome || id} do Firestore.`,
        moduloAfetado: 'Jogos',
      });

      return { success: true, message: 'Jogo excluído com sucesso.' };
    } catch (err: any) {
      console.error('[API] deleteGame error:', err);
      throw new Error(err.message || 'Erro ao excluir jogo no Firestore');
    }
  },

  // ==================== AIS ====================

  getAIs: async (): Promise<AIModel[]> => {
    try {
      const snap = await getDocs(collection(db, 'ais'));
      return snap.docs.map(d => ({ id: d.id, ...d.data() } as AIModel));
    } catch (err: any) {
      console.error('[API] getAIs error:', err);
      throw new Error(err.message || 'Erro ao buscar IAs no Firestore');
    }
  },

  createAI: async (data: any): Promise<AIModel> => {
    try {
      const id = data.id || generateId('ai');
      const ai: AIModel = { ...data, id, createdAt: new Date().toISOString() };
      const clean = sanitizeFirestoreDoc(ai);
      await setDoc(doc(db, 'ais', id), clean);
      return ai;
    } catch (err: any) {
      console.error('[API] createAI error:', err);
      throw new Error(err.message || 'Erro ao cadastrar IA no Firestore');
    }
  },

  updateAI: async (id: string, data: any): Promise<AIModel> => {
    try {
      const clean = sanitizeFirestoreDoc({ ...data, id, updatedAt: new Date().toISOString() });
      await setDoc(doc(db, 'ais', id), clean, { merge: true });
      const snap = await getDoc(doc(db, 'ais', id));
      return { id, ...snap.data() } as AIModel;
    } catch (err: any) {
      console.error('[API] updateAI error:', err);
      throw new Error(err.message || 'Erro ao atualizar IA no Firestore');
    }
  },

  deleteAI: async (id: string): Promise<{ success: boolean; message: string }> => {
    try {
      await deleteDoc(doc(db, 'ais', id));
      return { success: true, message: 'IA excluída com sucesso.' };
    } catch (err: any) {
      console.error('[API] deleteAI error:', err);
      throw new Error(err.message || 'Erro ao excluir IA no Firestore');
    }
  },

  // ==================== EXPERIMENTS ====================

  getExperiments: async (): Promise<Experiment[]> => {
    try {
      const snap = await getDocs(collection(db, 'experiments'));
      return snap.docs.map(d => ({ id: d.id, ...d.data() } as Experiment));
    } catch (err: any) {
      console.error('[API] getExperiments error:', err);
      throw new Error(err.message || 'Erro ao buscar experimentos no Firestore');
    }
  },

  createExperiment: async (data: any): Promise<Experiment> => {
    try {
      const id = data.id || generateId('exp');
      const exp: Experiment = { ...data, id, createdAt: new Date().toISOString() };
      const clean = sanitizeFirestoreDoc(exp);
      await setDoc(doc(db, 'experiments', id), clean);

      await api.createAuditLog({
        acao: 'Criação',
        registroAfetado: `Experimento ${id}`,
        tipoEntidade: 'Experiment',
        entidadeId: id,
        alteracaoRealizada: `Registro de novo experimento acadêmico com IA.`,
        moduloAfetado: 'Experimentos',
      });

      return exp;
    } catch (err: any) {
      console.error('[API] createExperiment error:', err);
      throw new Error(err.message || 'Erro ao registrar experimento no Firestore');
    }
  },

  updateExperiment: async (id: string, data: any): Promise<Experiment> => {
    try {
      const clean = sanitizeFirestoreDoc({ ...data, id, updatedAt: new Date().toISOString() });
      await setDoc(doc(db, 'experiments', id), clean, { merge: true });
      const snap = await getDoc(doc(db, 'experiments', id));
      return { id, ...snap.data() } as Experiment;
    } catch (err: any) {
      console.error('[API] updateExperiment error:', err);
      throw new Error(err.message || 'Erro ao atualizar experimento no Firestore');
    }
  },

  deleteExperiment: async (id: string): Promise<{ success: boolean; message: string }> => {
    try {
      await deleteDoc(doc(db, 'experiments', id));
      return { success: true, message: 'Experimento excluído com sucesso.' };
    } catch (err: any) {
      console.error('[API] deleteExperiment error:', err);
      throw new Error(err.message || 'Erro ao excluir experimento no Firestore');
    }
  },

  // ==================== PROMPTS & CATEGORIES ====================

  getPrompts: async (): Promise<PromptItem[]> => {
    try {
      const snap = await getDocs(collection(db, 'prompts'));
      return snap.docs.map(d => ({ id: d.id, ...d.data() } as PromptItem));
    } catch (err: any) {
      console.error('[API] getPrompts error:', err);
      throw new Error(err.message || 'Erro ao buscar prompts no Firestore');
    }
  },

  getPromptCategories: async (): Promise<string[]> => {
    try {
      const items = await api.getPromptCategoryItems();
      if (items.length > 0) {
        return items.filter(i => i.ativa !== false).map(i => i.nome);
      }
      return ['Programação', 'Correção de bugs', 'Mecânicas', 'Arte', 'Interface', 'Documentação', 'Áudio', 'Shader', 'Diálogos'];
    } catch (err) {
      return ['Programação', 'Correção de bugs', 'Mecânicas', 'Arte', 'Interface', 'Documentação', 'Áudio', 'Shader', 'Diálogos'];
    }
  },

  getPromptCategoryItems: async (): Promise<PromptCategoryItem[]> => {
    try {
      const snap = await getDocs(collection(db, 'promptCategories'));
      return snap.docs.map(d => ({ id: d.id, ...d.data() } as PromptCategoryItem));
    } catch (err: any) {
      console.error('[API] getPromptCategoryItems error:', err);
      return [];
    }
  },

  createPromptCategory: async (categoriaOrData: string | { nome: string; descricao?: string; ativa?: boolean }): Promise<PromptCategoryItem> => {
    try {
      const id = generateId('cat');
      const item: PromptCategoryItem = typeof categoriaOrData === 'string'
        ? { id, nome: categoriaOrData, ativa: true, createdAt: new Date().toISOString() }
        : { id, nome: categoriaOrData.nome, descricao: categoriaOrData.descricao, ativa: categoriaOrData.ativa ?? true, createdAt: new Date().toISOString() };
      const clean = sanitizeFirestoreDoc(item);
      await setDoc(doc(db, 'promptCategories', id), clean);
      return item;
    } catch (err: any) {
      console.error('[API] createPromptCategory error:', err);
      throw new Error(err.message || 'Erro ao cadastrar categoria de prompt no Firestore');
    }
  },

  updatePromptCategory: async (id: string, data: any): Promise<PromptCategoryItem> => {
    try {
      const clean = sanitizeFirestoreDoc({ ...data, id, updatedAt: new Date().toISOString() });
      await setDoc(doc(db, 'promptCategories', id), clean, { merge: true });
      const snap = await getDoc(doc(db, 'promptCategories', id));
      return { id, ...snap.data() } as PromptCategoryItem;
    } catch (err: any) {
      console.error('[API] updatePromptCategory error:', err);
      throw new Error(err.message || 'Erro ao atualizar categoria de prompt');
    }
  },

  deletePromptCategory: async (id: string): Promise<{ success: boolean; message: string }> => {
    try {
      await deleteDoc(doc(db, 'promptCategories', id));
      return { success: true, message: 'Categoria excluída com sucesso.' };
    } catch (err: any) {
      console.error('[API] deletePromptCategory error:', err);
      throw new Error(err.message || 'Erro ao excluir categoria');
    }
  },

  createPrompt: async (data: any): Promise<PromptItem> => {
    try {
      const id = data.id || generateId('prompt');
      const prompt: PromptItem = { ...data, id, createdAt: new Date().toISOString() };
      const clean = sanitizeFirestoreDoc(prompt);
      await setDoc(doc(db, 'prompts', id), clean);
      return prompt;
    } catch (err: any) {
      console.error('[API] createPrompt error:', err);
      throw new Error(err.message || 'Erro ao cadastrar prompt no Firestore');
    }
  },

  updatePrompt: async (id: string, data: any): Promise<PromptItem> => {
    try {
      const clean = sanitizeFirestoreDoc({ ...data, id, updatedAt: new Date().toISOString() });
      await setDoc(doc(db, 'prompts', id), clean, { merge: true });
      const snap = await getDoc(doc(db, 'prompts', id));
      return { id, ...snap.data() } as PromptItem;
    } catch (err: any) {
      console.error('[API] updatePrompt error:', err);
      throw new Error(err.message || 'Erro ao atualizar prompt');
    }
  },

  deletePrompt: async (id: string): Promise<{ success: boolean; message: string }> => {
    try {
      await deleteDoc(doc(db, 'prompts', id));
      return { success: true, message: 'Prompt excluído com sucesso.' };
    } catch (err: any) {
      console.error('[API] deletePrompt error:', err);
      throw new Error(err.message || 'Erro ao excluir prompt');
    }
  },

  // ==================== TASKS ====================

  getTasks: async (): Promise<Task[]> => {
    try {
      const snap = await getDocs(collection(db, 'tasks'));
      return snap.docs.map(d => ({ id: d.id, ...d.data() } as Task));
    } catch (err: any) {
      console.error('[API] getTasks error:', err);
      throw new Error(err.message || 'Erro ao buscar tarefas no Firestore');
    }
  },

  createTask: async (data: any): Promise<Task> => {
    try {
      const id = data.id || generateId('task');
      const task: Task = {
        ...data,
        id,
        status: data.status || 'A fazer',
        prioridade: data.prioridade || 'Média',
        createdAt: new Date().toISOString(),
      };
      const clean = sanitizeFirestoreDoc(task);
      await setDoc(doc(db, 'tasks', id), clean);

      await api.createAuditLog({
        acao: 'Criação',
        registroAfetado: task.titulo,
        tipoEntidade: 'Task',
        entidadeId: task.id,
        alteracaoRealizada: `Criação da tarefa "${task.titulo}".`,
        moduloAfetado: 'Tarefas',
      });

      return task;
    } catch (err: any) {
      console.error('[API] createTask error:', err);
      throw new Error(err.message || 'Erro ao criar tarefa no Firestore');
    }
  },

  updateTask: async (id: string, data: any): Promise<Task> => {
    try {
      const clean = sanitizeFirestoreDoc({ ...data, id, updatedAt: new Date().toISOString() });
      await setDoc(doc(db, 'tasks', id), clean, { merge: true });

      await api.createAuditLog({
        acao: 'Atualização',
        registroAfetado: data.titulo || id,
        tipoEntidade: 'Task',
        entidadeId: id,
        alteracaoRealizada: `Atualização da tarefa "${data.titulo || id}".`,
        moduloAfetado: 'Tarefas',
      });

      const snap = await getDoc(doc(db, 'tasks', id));
      return { id, ...snap.data() } as Task;
    } catch (err: any) {
      console.error('[API] updateTask error:', err);
      throw new Error(err.message || 'Erro ao atualizar tarefa no Firestore');
    }
  },

  updateTaskStatus: async (id: string, status: string, dataConclusao?: string, observacoes?: string): Promise<Task> => {
    const payload: any = { status, updatedAt: new Date().toISOString() };
    if (dataConclusao) payload.dataConclusao = dataConclusao;
    if (observacoes) payload.observacoes = observacoes;
    return api.updateTask(id, payload);
  },

  deleteTask: async (id: string): Promise<{ success: boolean; message: string }> => {
    try {
      const snap = await getDoc(doc(db, 'tasks', id));
      const taskData = snap.exists() ? snap.data() : null;
      await deleteDoc(doc(db, 'tasks', id));

      await api.createAuditLog({
        acao: 'Exclusão',
        registroAfetado: taskData?.titulo || `Tarefa ${id}`,
        tipoEntidade: 'Task',
        entidadeId: id,
        alteracaoRealizada: `Exclusão permanente da tarefa "${taskData?.titulo || id}" do Firestore.`,
        moduloAfetado: 'Tarefas',
      });

      return { success: true, message: 'Tarefa excluída com sucesso.' };
    } catch (err: any) {
      console.error('[API] deleteTask error:', err);
      throw new Error(err.message || 'Erro ao excluir tarefa no Firestore');
    }
  },

  // ==================== VERSIONS ====================

  getVersions: async (): Promise<GameVersion[]> => {
    try {
      const snap = await getDocs(collection(db, 'versions'));
      return snap.docs.map(d => ({ id: d.id, ...d.data() } as GameVersion));
    } catch (err: any) {
      console.error('[API] getVersions error:', err);
      return [];
    }
  },

  createVersion: async (data: any): Promise<GameVersion> => {
    try {
      const id = data.id || generateId('ver');
      const version: GameVersion = { ...data, id, createdAt: new Date().toISOString() };
      const clean = sanitizeFirestoreDoc(version);
      await setDoc(doc(db, 'versions', id), clean);
      return version;
    } catch (err: any) {
      console.error('[API] createVersion error:', err);
      throw new Error(err.message || 'Erro ao cadastrar versão');
    }
  },

  updateVersion: async (id: string, data: any): Promise<GameVersion> => {
    try {
      const clean = sanitizeFirestoreDoc({ ...data, id, updatedAt: new Date().toISOString() });
      await setDoc(doc(db, 'versions', id), clean, { merge: true });
      const snap = await getDoc(doc(db, 'versions', id));
      return { id, ...snap.data() } as GameVersion;
    } catch (err: any) {
      console.error('[API] updateVersion error:', err);
      throw new Error(err.message || 'Erro ao atualizar versão');
    }
  },

  deleteVersion: async (id: string): Promise<{ success: boolean; message: string }> => {
    try {
      await deleteDoc(doc(db, 'versions', id));
      return { success: true, message: 'Versão excluída com sucesso.' };
    } catch (err: any) {
      console.error('[API] deleteVersion error:', err);
      throw new Error(err.message || 'Erro ao excluir versão');
    }
  },

  // ==================== TESTS & EVALUATIONS ====================

  getTests: async (): Promise<TestSuite[]> => api.getTestSuites(),
  getTestSuites: async (): Promise<TestSuite[]> => {
    try {
      const snap = await getDocs(collection(db, 'testSuites'));
      return snap.docs.map(d => ({ id: d.id, ...d.data() } as TestSuite));
    } catch (err: any) {
      console.error('[API] getTestSuites error:', err);
      return [];
    }
  },

  createTest: async (data: any): Promise<TestSuite> => api.createTestSuite(data),
  createTestSuite: async (data: any): Promise<TestSuite> => {
    try {
      const id = data.id || generateId('suite');
      const suite: TestSuite = { ...data, id, createdAt: new Date().toISOString() };
      const clean = sanitizeFirestoreDoc(suite);
      await setDoc(doc(db, 'testSuites', id), clean);
      return suite;
    } catch (err: any) {
      console.error('[API] createTestSuite error:', err);
      throw new Error(err.message || 'Erro ao cadastrar suíte de testes');
    }
  },

  updateTest: async (id: string, data: any): Promise<TestSuite> => api.updateTestSuite(id, data),
  updateTestSuite: async (id: string, data: any): Promise<TestSuite> => {
    try {
      const clean = sanitizeFirestoreDoc({ ...data, id, updatedAt: new Date().toISOString() });
      await setDoc(doc(db, 'testSuites', id), clean, { merge: true });
      const snap = await getDoc(doc(db, 'testSuites', id));
      return { id, ...snap.data() } as TestSuite;
    } catch (err: any) {
      console.error('[API] updateTestSuite error:', err);
      throw new Error(err.message || 'Erro ao atualizar suíte de testes');
    }
  },

  deleteTest: async (id: string): Promise<{ success: boolean; message: string }> => api.deleteTestSuite(id),
  deleteTestSuite: async (id: string): Promise<{ success: boolean; message: string }> => {
    try {
      await deleteDoc(doc(db, 'testSuites', id));
      return { success: true, message: 'Suíte de testes excluída com sucesso.' };
    } catch (err: any) {
      console.error('[API] deleteTestSuite error:', err);
      throw new Error(err.message || 'Erro ao excluir suíte de testes');
    }
  },

  getTestEvaluations: async (testId: string): Promise<TestEvaluation[]> => {
    try {
      const snap = await getDocs(query(collection(db, 'testEvaluations'), where('testeId', '==', testId)));
      return snap.docs.map(d => ({ id: d.id, ...d.data() } as TestEvaluation));
    } catch (err: any) {
      console.error('[API] getTestEvaluations error:', err);
      return [];
    }
  },

  submitTestEvaluation: async (testId: string, data: any): Promise<TestEvaluation> => {
    return api.submitEvaluation({ ...data, testeId: testId });
  },

  submitEvaluation: async (data: { testeId: string; [k: string]: any }): Promise<TestEvaluation> => {
    try {
      const id = data.id || generateId('eval');
      const evaluation: TestEvaluation = {
        ...data,
        id,
        testeId: data.testeId,
        dataAvaliacao: data.dataAvaliacao || new Date().toISOString().split('T')[0],
        createdAt: new Date().toISOString(),
      } as any;
      const clean = sanitizeFirestoreDoc(evaluation);
      await setDoc(doc(db, 'testEvaluations', id), clean);
      return evaluation;
    } catch (err: any) {
      console.error('[API] submitEvaluation error:', err);
      throw new Error(err.message || 'Erro ao enviar avaliação de teste');
    }
  },

  // ==================== RESULTS & AI COMPARISON ====================

  getResults: async (): Promise<any> => {
    const games = await api.getGames();
    return {
      totalGames: games.length,
      games,
    };
  },

  getGameResults: async (gameId: string): Promise<any> => {
    const [games, experiments, suites] = await Promise.all([
      api.getGames(),
      api.getExperiments(),
      api.getTestSuites(),
    ]);

    const game = games.find(g => g.id === gameId);
    const gameExperiments = experiments.filter(e => e.jogoId === gameId);
    const gameSuites = suites.filter(s => s.jogoId === gameId);

    const satisfacoes = gameExperiments.map(e => e.avaliacao || 5);
    const mediaSatisfacao = satisfacoes.length > 0 ? satisfacoes.reduce((a, b) => a + b, 0) / satisfacoes.length : 0;

    return {
      game,
      totalExperimentos: gameExperiments.length,
      totalSuites: gameSuites.length,
      mediaSatisfacao: Number(mediaSatisfacao.toFixed(2)),
      experiments: gameExperiments,
      testSuites: gameSuites,
    };
  },

  getAIComparison: async (): Promise<any> => {
    const [ais, experiments] = await Promise.all([
      api.getAIs(),
      api.getExperiments(),
    ]);

    const comparison = ais.map(ai => {
      const aiExps = experiments.filter(e => e.iaId === ai.id || e.iaNome?.toLowerCase() === ai.nome.toLowerCase());
      const notas = aiExps.map(e => e.avaliacao || 5);
      const media = notas.length > 0 ? notas.reduce((a, b) => a + b, 0) / notas.length : 0;

      return {
        id: ai.id,
        nome: ai.nome,
        empresaProvedor: ai.empresaProvedor,
        modelo: ai.modelo,
        totalExperimentos: aiExps.length,
        mediaAvaliacao: Number(media.toFixed(2)),
      };
    });

    return {
      ais: comparison,
      totalExperimentos: experiments.length,
    };
  },

  // ==================== SCHEDULE & MILESTONES ====================

  getSchedule: async (): Promise<ScheduleMilestone[]> => api.getMilestones(),
  getMilestones: async (): Promise<ScheduleMilestone[]> => {
    try {
      const snap = await getDocs(collection(db, 'schedule'));
      return snap.docs.map(d => ({ id: d.id, ...d.data() } as ScheduleMilestone));
    } catch (err: any) {
      console.error('[API] getMilestones error:', err);
      return [];
    }
  },

  createScheduleMilestone: async (data: any): Promise<ScheduleMilestone> => api.createMilestone(data),
  createMilestone: async (data: any): Promise<ScheduleMilestone> => {
    try {
      const id = data.id || generateId('mile');
      const milestone: ScheduleMilestone = {
        ...data,
        id,
        status: data.status || 'Pendente',
        createdAt: new Date().toISOString(),
      };
      const clean = sanitizeFirestoreDoc(milestone);
      await setDoc(doc(db, 'schedule', id), clean);
      return milestone;
    } catch (err: any) {
      console.error('[API] createMilestone error:', err);
      throw new Error(err.message || 'Erro ao cadastrar marco');
    }
  },

  updateScheduleMilestone: async (id: string, data: any): Promise<ScheduleMilestone> => api.updateMilestone(id, data),
  updateMilestone: async (id: string, data: any): Promise<ScheduleMilestone> => {
    try {
      const clean = sanitizeFirestoreDoc({ ...data, id, updatedAt: new Date().toISOString() });
      await setDoc(doc(db, 'schedule', id), clean, { merge: true });
      const snap = await getDoc(doc(db, 'schedule', id));
      return { id, ...snap.data() } as ScheduleMilestone;
    } catch (err: any) {
      console.error('[API] updateMilestone error:', err);
      throw new Error(err.message || 'Erro ao atualizar marco');
    }
  },

  deleteScheduleMilestone: async (id: string): Promise<{ success: boolean; message: string }> => api.deleteMilestone(id),
  deleteMilestone: async (id: string): Promise<{ success: boolean; message: string }> => {
    try {
      await deleteDoc(doc(db, 'schedule', id));
      return { success: true, message: 'Marco excluído com sucesso.' };
    } catch (err: any) {
      console.error('[API] deleteMilestone error:', err);
      throw new Error(err.message || 'Erro ao excluir marco');
    }
  },

  // ==================== AUDIT LOGS ====================

  getAuditLogs: async (): Promise<AuditLog[]> => {
    try {
      const [snap1, snap2] = await Promise.all([
        getDocs(collection(db, 'audit_logs')).catch(() => ({ docs: [] })),
        getDocs(collection(db, 'auditLogs')).catch(() => ({ docs: [] })),
      ]);

      const map = new Map<string, AuditLog>();

      snap1.docs.forEach((d: any) => {
        map.set(d.id, { id: d.id, ...d.data() } as AuditLog);
      });
      snap2.docs.forEach((d: any) => {
        if (!map.has(d.id)) {
          map.set(d.id, { id: d.id, ...d.data() } as AuditLog);
        }
      });

      return Array.from(map.values()).sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
    } catch (err: any) {
      console.error('[API] getAuditLogs error:', err);
      return [];
    }
  },

  createAuditLog: async (data: any): Promise<AuditLog> => {
    try {
      const id = data.id || generateId('audit');
      const now = new Date();
      const user = auth.currentUser;

      const log: AuditLog = {
        ...data,
        id,
        usuarioId: data.usuarioId || user?.uid || 'anonimo',
        usuarioNome: data.usuarioNome || user?.displayName || user?.email?.split('@')[0] || 'Sistema',
        usuarioRole: data.usuarioRole || 'admin',
        data: data.data || now.toISOString().split('T')[0],
        horario: data.horario || now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
        timestamp: data.timestamp || now.getTime(),
      };

      const clean = sanitizeFirestoreDoc(log);
      await setDoc(doc(db, 'audit_logs', id), clean);
      return log;
    } catch (err: any) {
      console.warn('[API] createAuditLog notice (non-fatal):', err);
      return data as AuditLog;
    }
  },

  // ==================== REPORTS ====================

  getReport: async (paramsOrType: string | { type: string; gameId?: string; teamId?: string }): Promise<any> => {
    const type = typeof paramsOrType === 'string' ? paramsOrType : paramsOrType.type;
    const [games, participants, teams, tasks, experiments, ais] = await Promise.all([
      api.getGames(),
      api.getParticipants(),
      api.getTeams(),
      api.getTasks(),
      api.getExperiments(),
      api.getAIs(),
    ]);

    return {
      type,
      generatedAt: new Date().toISOString(),
      summary: {
        totalGames: games.length,
        totalParticipants: participants.length,
        totalTeams: teams.length,
        totalTasks: tasks.length,
        completedTasks: tasks.filter(t => t.status === 'Concluída').length,
        totalExperiments: experiments.length,
        totalAIs: ais.length,
      },
      games,
      participants,
      teams,
      tasks,
      experiments,
    };
  },

  // ==================== DOCUMENTS ====================

  getDocuments: async (): Promise<ProjectDocument[]> => {
    try {
      const snap = await getDocs(collection(db, 'documents'));
      return snap.docs.map(d => ({ id: d.id, ...d.data() } as ProjectDocument));
    } catch (err: any) {
      console.error('[API] getDocuments error:', err);
      return [];
    }
  },

  getDocumentById: async (id: string): Promise<ProjectDocument> => {
    try {
      const snap = await getDoc(doc(db, 'documents', id));
      if (!snap.exists()) throw new Error('Documento não encontrado.');
      return { id: snap.id, ...snap.data() } as ProjectDocument;
    } catch (err: any) {
      console.error('[API] getDocumentById error:', err);
      throw new Error(err.message || 'Erro ao carregar documento');
    }
  },

  createDocument: async (data: any): Promise<ProjectDocument> => {
    try {
      const id = data.id || generateId('doc');
      const projectDoc: ProjectDocument = {
        ...data,
        id,
        dataCriacao: data.dataCriacao || new Date().toISOString().split('T')[0],
        createdAt: new Date().toISOString(),
      };
      const clean = sanitizeFirestoreDoc(projectDoc);
      await setDoc(doc(db, 'documents', id), clean);

      await api.createAuditLog({
        acao: 'Criação',
        registroAfetado: projectDoc.titulo,
        tipoEntidade: 'Document',
        entidadeId: projectDoc.id,
        alteracaoRealizada: `Criação do documento acadêmico "${projectDoc.titulo}".`,
        moduloAfetado: 'Documentação',
      });

      return projectDoc;
    } catch (err: any) {
      console.error('[API] createDocument error:', err);
      throw new Error(err.message || 'Erro ao criar documento no Firestore');
    }
  },

  updateDocument: async (id: string, data: any): Promise<ProjectDocument> => {
    try {
      const clean = sanitizeFirestoreDoc({ ...data, id, updatedAt: new Date().toISOString() });
      await setDoc(doc(db, 'documents', id), clean, { merge: true });

      await api.createAuditLog({
        acao: 'Atualização',
        registroAfetado: data.titulo || id,
        tipoEntidade: 'Document',
        entidadeId: id,
        alteracaoRealizada: `Atualização do documento "${data.titulo || id}".`,
        moduloAfetado: 'Documentação',
      });

      const snap = await getDoc(doc(db, 'documents', id));
      return { id, ...snap.data() } as ProjectDocument;
    } catch (err: any) {
      console.error('[API] updateDocument error:', err);
      throw new Error(err.message || 'Erro ao atualizar documento no Firestore');
    }
  },

  deleteDocument: async (id: string): Promise<{ success: boolean; message: string }> => {
    try {
      const snap = await getDoc(doc(db, 'documents', id));
      const docData = snap.exists() ? snap.data() : null;
      await deleteDoc(doc(db, 'documents', id));

      await api.createAuditLog({
        acao: 'Exclusão',
        registroAfetado: docData?.titulo || `Documento ${id}`,
        tipoEntidade: 'Document',
        entidadeId: id,
        alteracaoRealizada: `Exclusão permanente do documento "${docData?.titulo || id}" do Firestore.`,
        moduloAfetado: 'Documentação',
      });

      return { success: true, message: 'Documento excluído com sucesso.' };
    } catch (err: any) {
      console.error('[API] deleteDocument error:', err);
      throw new Error(err.message || 'Erro ao excluir documento no Firestore');
    }
  },

  // ==================== DASHBOARD ====================

  getDashboard: async (): Promise<DashboardStats> => {
    try {
      const [games, participants, teams, tasks, experiments, suites, ais, logs] = await Promise.all([
        api.getGames().catch(() => []),
        api.getParticipants().catch(() => []),
        api.getTeams().catch(() => []),
        api.getTasks().catch(() => []),
        api.getExperiments().catch(() => []),
        api.getTestSuites().catch(() => []),
        api.getAIs().catch(() => []),
        api.getAuditLogs().catch(() => []),
      ]);

      const concluidas = tasks.filter(t => t.status === 'Concluída').length;
      const pendentes = tasks.filter(t => t.status !== 'Concluída' && t.status !== 'Cancelada').length;
      const progresso = tasks.length > 0 ? Math.round((concluidas / tasks.length) * 100) : 0;

      const statusesGame = ['Planejamento', 'Desenvolvimento', 'Testes', 'Finalizado', 'Arquivado'];
      const jogosPorStatus = statusesGame.map(st => ({
        status: st,
        quantidade: games.filter(g => g.status === st).length,
      }));

      const statusesTask = ['A fazer', 'Em andamento', 'Em revisão', 'Concluída', 'Cancelada'];
      const tarefasPorStatus = statusesTask.map(st => ({
        status: st,
        quantidade: tasks.filter(t => t.status === st).length,
      }));

      const atividadesRecentes = logs.slice(0, 10).map(l => ({
        id: l.id,
        usuarioNome: l.usuarioNome,
        acao: l.acao,
        registroAfetado: l.registroAfetado,
        moduloAfetado: l.moduloAfetado || l.tipoEntidade,
        horario: l.horario,
        data: l.data,
      }));

      const tarefasEmAndamento = tasks.filter(t => t.status === 'Em andamento').length;
      const testesEmAndamento = suites.filter(s => s.status === 'Em andamento').length;
      const testesConcluidos = suites.filter(s => s.status === 'Concluído').length;

      return {
        progressoGeralPercentual: progresso,
        qtdJogos: games.length,
        qtdParticipantes: participants.length,
        qtdEquipes: teams.length,
        tarefasPendentes: pendentes,
        tarefasEmAndamento,
        tarefasConcluidas: concluidas,
        testesEmAndamento,
        testesConcluidos,
        proximasAtividades: tasks.filter(t => t.status !== 'Concluída').slice(0, 5),
        ultimasAtividades: logs.slice(0, 10),
      };
    } catch (err: any) {
      console.error('[API] getDashboard error:', err);
      return {
        progressoGeralPercentual: 0,
        qtdJogos: 0,
        qtdParticipantes: 0,
        qtdEquipes: 0,
        tarefasPendentes: 0,
        tarefasEmAndamento: 0,
        tarefasConcluidas: 0,
        testesEmAndamento: 0,
        testesConcluidos: 0,
        proximasAtividades: [],
        ultimasAtividades: [],
      };
    }
  },

  // ==================== SYSTEM VERSIONS & SUGGESTIONS ====================

  getSystemVersions: async (): Promise<SystemVersion[]> => {
    try {
      const snap = await getDocs(collection(db, 'systemVersions'));
      if (snap.empty) {
        return [
          {
            id: 'sys-v1.0.0',
            versao: 'v1.0.0',
            data: '2026-09-14',
            alteracao: 'Plataforma NexoIF integrada ao banco de dados Firestore.',
            responsavel: 'Paulo Cauan',
          },
        ];
      }
      return snap.docs.map(d => ({ id: d.id, ...d.data() } as SystemVersion));
    } catch (err) {
      return [];
    }
  },

  createSystemVersion: async (data: any): Promise<SystemVersion> => {
    try {
      const id = data.id || generateId('sysver');
      const item: SystemVersion = { ...data, id };
      const clean = sanitizeFirestoreDoc(item);
      await setDoc(doc(db, 'systemVersions', id), clean);
      return item;
    } catch (err: any) {
      throw new Error(err.message || 'Erro ao criar versão do sistema');
    }
  },

  getFutureSuggestions: async (): Promise<FutureSuggestion[]> => {
    try {
      const snap = await getDocs(collection(db, 'futureSuggestions'));
      return snap.docs.map(d => ({ id: d.id, ...d.data() } as FutureSuggestion));
    } catch (err) {
      return [];
    }
  },

  createFutureSuggestion: async (data: any): Promise<FutureSuggestion> => {
    try {
      const id = data.id || generateId('sug');
      const item: FutureSuggestion = {
        ...data,
        id,
        status: data.status || 'Pendente',
        dataSugerida: data.dataSugerida || new Date().toISOString().split('T')[0],
      };
      const clean = sanitizeFirestoreDoc(item);
      await setDoc(doc(db, 'futureSuggestions', id), clean);
      return item;
    } catch (err: any) {
      throw new Error(err.message || 'Erro ao registrar sugestão futura');
    }
  },

  updateFutureSuggestionStatus: async (id: string, status: string): Promise<FutureSuggestion> => {
    try {
      const clean = sanitizeFirestoreDoc({ id, status, updatedAt: new Date().toISOString() });
      await setDoc(doc(db, 'futureSuggestions', id), clean, { merge: true });
      const snap = await getDoc(doc(db, 'futureSuggestions', id));
      return { id, ...snap.data() } as FutureSuggestion;
    } catch (err: any) {
      throw new Error(err.message || 'Erro ao atualizar status da sugestão');
    }
  },
};
