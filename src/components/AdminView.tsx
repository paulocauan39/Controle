import React, { useEffect, useState, useMemo } from 'react';
import { collection, onSnapshot, doc, query, orderBy, getDocs } from 'firebase/firestore';
import { db } from '../lib/firebase.js';
import { api } from '../services/api.js';
import { Participant, Team, Game, Task, UserRole, AuditLog } from '../types.js';
import { useAuth } from '../context/AuthContext.js';
import { useAuditLogger } from '../hooks/useAuditLogger.js';
import { isAdmin as checkIsAdmin } from '../utils/admin.js';
import { EmptyState } from './EmptyState.js';
import { PromptCategoryManagerModal } from './PromptCategoryManagerModal.js';
import {
  ShieldCheck,
  ShieldAlert,
  Users,
  Briefcase,
  Gamepad2,
  CheckSquare,
  History,
  Tag,
  BookOpen,
  Search,
  Plus,
  Edit2,
  Trash2,
  UserCheck,
  UserX,
  AlertTriangle,
  RefreshCw,
  Sliders,
  CheckCircle2,
  XCircle,
  Database,
  Lock,
  FileText,
  Activity
} from 'lucide-react';

interface AdminViewProps {
  onNavigateToTab?: (tab: string) => void;
}

export const AdminView: React.FC<AdminViewProps> = ({ onNavigateToTab }) => {
  const { currentUser, refreshAuth } = useAuth();
  const { logDeletion, logEdit, logAdminAction } = useAuditLogger();

  const [activeSubTab, setActiveSubTab] = useState<'visao_geral' | 'usuarios' | 'auditoria' | 'configuracoes'>('visao_geral');
  const [loading, setLoading] = useState(true);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [games, setGames] = useState<Game[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);

  // Category Modal
  const [categoryModalOpen, setCategoryModalOpen] = useState(false);

  // User Edit / Role Management Modal
  const [userModalOpen, setUserModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<Participant | null>(null);
  const [editNome, setEditNome] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editFuncao, setEditFuncao] = useState<UserRole>('aluno');
  const [editEquipeId, setEditEquipeId] = useState('');
  const [editStatus, setEditStatus] = useState<'Ativo' | 'Inativo'>('Ativo');
  const [isSavingUser, setIsSavingUser] = useState(false);
  const [userModalError, setUserModalError] = useState('');

  // Delete User Modal with Confirmation Flow
  const [deleteUserModalOpen, setDeleteUserModalOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState<Participant | null>(null);
  const [isDeletingUser, setIsDeletingUser] = useState(false);
  const [deleteError, setDeleteError] = useState('');

  // Search & Filter
  const [userSearch, setUserSearch] = useState('');
  const [userRoleFilter, setUserRoleFilter] = useState('todos');
  const [auditSearch, setAuditSearch] = useState('');

  const isCurrentAdmin = checkIsAdmin(currentUser);

  // Direct onSnapshot listeners on Firestore collections (Real-time sync for usuarios and participants)
  useEffect(() => {
    setLoading(true);

    let usuariosDocs: any[] = [];
    let participantsDocs: any[] = [];

    const mergeAndSetUsers = () => {
      const map = new Map<string, Participant>();

      // 1. Process /participants docs
      participantsDocs.forEach((d) => {
        const data = d.data() || {};
        const email = (data.email || '').trim();
        const isPaulo = email.toLowerCase() === 'paulocauan39@gmail.com';
        const hasAdminRole = Boolean(
          isPaulo ||
          data.isAdmin === true ||
          data.admin === true ||
          data.funcao === 'admin' ||
          data.perfil === 'admin' ||
          data.role === 'admin' ||
          data.roles?.includes('admin')
        );

        const item: Participant = {
          id: d.id || data.id,
          nome: data.nome || data.displayName || data.name || (email ? email.split('@')[0] : 'Participante'),
          email: email,
          funcao: (data.funcao || data.perfil || data.role || (isPaulo ? 'coordenador_aluno' : 'aluno')) as UserRole,
          isAdmin: hasAdminRole,
          roles: data.roles || (hasAdminRole ? ['coordenador_aluno', 'admin'] : [data.funcao || 'aluno']),
          status: (data.status as 'Ativo' | 'Inativo') || 'Ativo',
          dataEntrada: data.dataEntrada || (data.createdAt ? String(data.createdAt).split('T')[0] : new Date().toISOString().split('T')[0]),
          createdAt: data.createdAt || new Date().toISOString(),
          ...(data.equipeId ? { equipeId: data.equipeId } : {}),
          ...(data.equipeNome ? { equipeNome: data.equipeNome } : {}),
        };

        const key = (email || item.id).toLowerCase();
        map.set(key, item);
      });

      // 2. Process /usuarios docs (merge or add)
      usuariosDocs.forEach((d) => {
        const data = d.data() || {};
        const uid = d.id;
        const email = (data.email || '').trim();
        const emailKey = (email || uid).toLowerCase();
        const existing = map.get(emailKey) || map.get(uid.toLowerCase());
        const isPaulo = email.toLowerCase() === 'paulocauan39@gmail.com';
        const hasAdminRole = Boolean(
          isPaulo ||
          existing?.isAdmin === true ||
          data.isAdmin === true ||
          data.admin === true ||
          data.funcao === 'admin' ||
          data.perfil === 'admin' ||
          data.role === 'admin' ||
          data.roles?.includes('admin')
        );

        const item: Participant = {
          id: existing?.id || uid,
          nome: existing?.nome || data.nome || data.displayName || data.name || (email ? email.split('@')[0] : 'Usuário'),
          email: existing?.email || email,
          funcao: (existing?.funcao || data.funcao || data.perfil || data.role || (isPaulo ? 'coordenador_aluno' : 'aluno')) as UserRole,
          isAdmin: hasAdminRole,
          roles: existing?.roles || data.roles || (hasAdminRole ? ['coordenador_aluno', 'admin'] : [data.funcao || 'aluno']),
          status: existing?.status || (data.status as 'Ativo' | 'Inativo') || 'Ativo',
          dataEntrada: existing?.dataEntrada || data.dataEntrada || (data.createdAt ? String(data.createdAt).split('T')[0] : new Date().toISOString().split('T')[0]),
          createdAt: existing?.createdAt || data.createdAt || new Date().toISOString(),
          equipeId: existing?.equipeId || data.equipeId || undefined,
          equipeNome: existing?.equipeNome || data.equipeNome || undefined,
        };

        map.set(emailKey, item);
      });

      const usersList = Array.from(map.values());
      usersList.sort((a, b) => a.nome.localeCompare(b.nome));

      console.log('[AdminView:Diagnostic] Sincronização em tempo real Firestore:', {
        usuariosCount: usuariosDocs.length,
        participantsCount: participantsDocs.length,
        totalMerged: usersList.length,
        docIds: usersList.map((u) => u.id),
        emails: usersList.map((u) => u.email),
      });

      setParticipants(usersList);
      setLoading(false);
    };

    // 1. Real-time listener on 'usuarios' collection
    const unsubscribeUsuarios = onSnapshot(
      collection(db, 'usuarios'),
      (snapshot) => {
        usuariosDocs = snapshot.docs;
        mergeAndSetUsers();
      },
      (err) => {
        console.error('[AdminView] Erro no listener onSnapshot /usuarios:', err);
        mergeAndSetUsers();
      }
    );

    // 2. Real-time listener on 'participants' collection
    const unsubscribeParticipants = onSnapshot(
      collection(db, 'participants'),
      (snapshot) => {
        participantsDocs = snapshot.docs;
        mergeAndSetUsers();
      },
      (err) => {
        console.error('[AdminView] Erro no listener onSnapshot /participants:', err);
        mergeAndSetUsers();
      }
    );

    // 3. Direct real-time listener on 'audit_logs' collection
    const unsubscribeAudit = onSnapshot(
      collection(db, 'audit_logs'),
      (snapshot) => {
        const logsList: AuditLog[] = snapshot.docs.map((docSnap) => ({
          id: docSnap.id,
          ...docSnap.data(),
        } as AuditLog));

        // Sort logs by timestamp descending
        logsList.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
        setAuditLogs(logsList);
      },
      (err) => {
        console.warn('[AdminView] Erro no listener onSnapshot /audit_logs:', err);
      }
    );

    // 4. Real-time listener on 'teams' collection
    const unsubscribeTeams = onSnapshot(
      collection(db, 'teams'),
      (snapshot) => {
        const teamsList: Team[] = snapshot.docs.map((d) => ({
          id: d.id,
          ...d.data(),
        } as Team));
        setTeams(teamsList);
      },
      (err) => {
        console.warn('[AdminView] Erro no listener onSnapshot /teams:', err);
      }
    );

    // 5. Real-time listener on 'tasks' collection
    const unsubscribeTasks = onSnapshot(
      collection(db, 'tasks'),
      (snapshot) => {
        const tasksList: Task[] = snapshot.docs.map((d) => ({
          id: d.id,
          ...d.data(),
        } as Task));
        setTasks(tasksList);
      },
      (err) => {
        console.warn('[AdminView] Erro no listener onSnapshot /tasks:', err);
      }
    );

    // 6. Real-time listener on 'games' collection
    const unsubscribeGames = onSnapshot(
      collection(db, 'games'),
      (snapshot) => {
        const gamesList: Game[] = snapshot.docs.map((d) => ({
          id: d.id,
          ...d.data(),
        } as Game));
        setGames(gamesList);
      },
      (err) => {
        console.warn('[AdminView] Erro no listener onSnapshot /games:', err);
      }
    );

    return () => {
      unsubscribeUsuarios();
      unsubscribeParticipants();
      unsubscribeAudit();
      unsubscribeTeams();
      unsubscribeTasks();
      unsubscribeGames();
    };
  }, []);

  // Filtered Participants based on search query and role filter
  const filteredParticipants = useMemo(() => {
    return participants.filter((p) => {
      const isPaulo = (p.email || '').toLowerCase().trim() === 'paulocauan39@gmail.com';
      const hasAdminRole = Boolean(p.isAdmin || p.funcao === 'admin' || isPaulo);
      const matchRole =
        userRoleFilter === 'todos' ||
        p.funcao === userRoleFilter ||
        (userRoleFilter === 'admin' && hasAdminRole);
      const matchSearch =
        p.nome.toLowerCase().includes(userSearch.toLowerCase()) ||
        p.email.toLowerCase().includes(userSearch.toLowerCase()) ||
        (p.equipeNome || '').toLowerCase().includes(userSearch.toLowerCase()) ||
        p.id.toLowerCase().includes(userSearch.toLowerCase()) ||
        (p.funcao || '').toLowerCase().includes(userSearch.toLowerCase());
      return matchRole && matchSearch;
    });
  }, [participants, userRoleFilter, userSearch]);

  // Filtered Audit Logs
  const filteredAuditLogs = useMemo(() => {
    return auditLogs.filter((l) => {
      const q = auditSearch.toLowerCase();
      return (
        (l.usuarioNome || '').toLowerCase().includes(q) ||
        (l.acao || '').toLowerCase().includes(q) ||
        (l.registroAfetado || '').toLowerCase().includes(q) ||
        (l.moduloAfetado || '').toLowerCase().includes(q) ||
        (l.alteracaoRealizada || '').toLowerCase().includes(q) ||
        (l.entidadeId || '').toLowerCase().includes(q)
      );
    });
  }, [auditLogs, auditSearch]);

  // User Edit Modal Handlers
  const handleOpenEditUser = (p: Participant) => {
    setEditingUser(p);
    setEditNome(p.nome);
    setEditEmail(p.email);
    setEditFuncao(p.funcao || 'aluno');
    setEditEquipeId(p.equipeId || '');
    setEditStatus(p.status || 'Ativo');
    setUserModalError('');
    setUserModalOpen(true);
  };

  const handleOpenCreateUser = () => {
    setEditingUser(null);
    setEditNome('');
    setEditEmail('');
    setEditFuncao('aluno');
    setEditEquipeId('');
    setEditStatus('Ativo');
    setUserModalError('');
    setUserModalOpen(true);
  };

  const handleSaveUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editNome.trim() || !editEmail.trim()) {
      setUserModalError('Nome e E-mail são campos obrigatórios.');
      return;
    }

    if (!isCurrentAdmin) {
      setUserModalError('Apenas administradores podem modificar dados de usuários.');
      return;
    }

    try {
      setIsSavingUser(true);
      setUserModalError('');

      if (editingUser) {
        await api.updateParticipant(editingUser.id, {
          nome: editNome.trim(),
          email: editEmail.trim(),
          funcao: editFuncao,
          equipeId: editEquipeId || null,
          status: editStatus,
        });

        await logEdit(
          'usuarios',
          editingUser.id,
          editNome.trim(),
          `Administrador alterou perfil do usuário ${editNome.trim()} (Função: ${editFuncao}, Status: ${editStatus}, Equipe: ${editEquipeId || 'Nenhuma'}).`,
          {
            targetUid: editingUser.id,
            targetEmail: editEmail.trim(),
            novaFuncao: editFuncao,
            novoStatus: editStatus,
          }
        );
      } else {
        const created = await api.createParticipant({
          nome: editNome.trim(),
          email: editEmail.trim(),
          funcao: editFuncao,
          ...(editEquipeId ? { equipeId: editEquipeId } : {}),
          status: editStatus,
          dataEntrada: new Date().toISOString().split('T')[0],
        });

        await logAdminAction({
          acao: 'CADASTRO_USUARIO_ADMIN',
          tipoEntidade: 'usuarios',
          registroAfetado: editNome.trim(),
          entidadeId: created?.id || 'new_uid',
          alteracaoRealizada: `Administrador cadastrou novo usuário no Firestore: ${editNome.trim()} (${editEmail.trim()}) com papel ${editFuncao}.`,
          detalhes: {
            email: editEmail.trim(),
            funcao: editFuncao,
            status: editStatus,
          },
        });
      }

      setUserModalOpen(false);
      await refreshAuth();
    } catch (err: any) {
      console.error('[AdminView] Erro ao salvar usuário no Firestore:', err);
      setUserModalError(err.message || 'Erro ao persistir usuário.');
    } finally {
      setIsSavingUser(false);
    }
  };

  const handleToggleStatus = async (p: Participant) => {
    if (!isCurrentAdmin) {
      alert('Apenas administradores podem alterar o status de acesso.');
      return;
    }

    const newStatus = p.status === 'Ativo' ? 'Inativo' : 'Ativo';
    if (!confirm(`Deseja alterar o status de "${p.nome}" para ${newStatus}?`)) return;

    try {
      if (newStatus === 'Inativo') {
        await api.deactivateParticipant(p.id);
      } else {
        await api.updateParticipant(p.id, { ...p, status: 'Ativo' });
      }

      await logEdit(
        'usuarios',
        p.id,
        p.nome,
        `Status do usuário ${p.nome} alterado para "${newStatus}" por ação administrativa.`,
        {
          targetUid: p.id,
          targetEmail: p.email,
          statusAnterior: p.status,
          novoStatus: newStatus,
        }
      );
      await refreshAuth();
    } catch (err: any) {
      alert(err.message || 'Erro ao alterar status no Firestore.');
    }
  };

  // Robust Deletion Flow with Admin Role Check and Audit Logging
  const handleDeleteUser = async () => {
    if (!userToDelete) return;

    // Strict admin role verification
    if (!isCurrentAdmin) {
      setDeleteError('Acesso negado: apenas administradores possuem privilégios para executar a exclusão permanente de registros.');
      return;
    }

    try {
      setIsDeletingUser(true);
      setDeleteError('');

      // 1. Call robust delete service function
      await api.deleteUserDoc(userToDelete.id, currentUser);

      // 2. Log 'deleteDoc' operation using useAuditLogger hook to ensure accountability
      await logDeletion(
        'usuarios',
        userToDelete.id,
        userToDelete.nome,
        `Exclusão permanente (deleteDoc) do documento de usuário UID "${userToDelete.id}" (${userToDelete.nome} - ${userToDelete.email}) efetuada por administrador.`,
        {
          targetUid: userToDelete.id,
          targetEmail: userToDelete.email,
          targetName: userToDelete.nome,
          targetRole: userToDelete.funcao,
          targetTeam: userToDelete.equipeId || 'Sem equipe',
          deletedAt: new Date().toISOString(),
          operationType: 'deleteDoc',
        }
      );

      setDeleteUserModalOpen(false);
      setUserToDelete(null);
      await refreshAuth();
    } catch (err: any) {
      console.error('[AdminView] Erro ao executar deleteDoc de usuário:', err);
      setDeleteError(err.message || 'Erro ao excluir usuário no Firestore.');
    } finally {
      setIsDeletingUser(false);
    }
  };

  if (!isCurrentAdmin) {
    return (
      <div className="bg-white rounded-xl border border-red-200 shadow-sm p-8 text-center max-w-lg mx-auto my-12">
        <div className="w-14 h-14 bg-red-50 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4 ring-8 ring-red-50/50">
          <ShieldAlert className="w-7 h-7" />
        </div>
        <h2 className="text-xl font-bold text-slate-800 mb-2">Painel Restrito a Administradores</h2>
        <p className="text-sm text-slate-600 mb-4">
          Você não possui privilégios de Administrador Geral para visualizar esta área de governança e controle do sistema.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Banner / Header */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white rounded-xl p-6 shadow-md border border-slate-800">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-indigo-600/30 border border-indigo-500/40 rounded-lg text-indigo-400">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <h1 className="text-2xl font-bold tracking-tight text-white">Painel de Administração & Governança</h1>
              <span className="px-2.5 py-0.5 text-xs font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 rounded-full flex items-center gap-1">
                <Lock className="w-3 h-3" /> Firestore Live Sync
              </span>
            </div>
            <p className="text-xs text-slate-300 max-w-2xl leading-relaxed">
              Gestão centralizada e em tempo real de contas da coleção <code>usuarios</code>, controle de acessos e trilha imutável de auditoria.
            </p>
          </div>

          <div className="flex items-center gap-2 self-start md:self-auto">
            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-950/60 border border-emerald-800/80 rounded-lg text-emerald-300 text-xs font-medium">
              <Activity className="w-3.5 h-3.5 animate-pulse text-emerald-400" />
              <span>onSnapshot Ativo</span>
            </div>
            <button
              id="btn-admin-manage-categories"
              type="button"
              onClick={() => setCategoryModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-lg transition-colors shadow-xs"
            >
              <Tag className="w-3.5 h-3.5" />
              Categorias de Prompts
            </button>
          </div>
        </div>

        {/* Global Statistics Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mt-6 pt-5 border-t border-slate-800/80">
          <div className="bg-slate-800/50 border border-slate-700/60 rounded-lg p-3">
            <div className="flex items-center justify-between text-slate-400 text-xs">
              <span>Usuários (UID)</span>
              <Users className="w-3.5 h-3.5 text-indigo-400" />
            </div>
            <div className="text-xl font-bold text-white mt-1">{participants.length}</div>
            <div className="text-[10px] text-slate-400">
              {participants.filter(p => p.status === 'Ativo').length} ativos
            </div>
          </div>

          <div className="bg-slate-800/50 border border-slate-700/60 rounded-lg p-3">
            <div className="flex items-center justify-between text-slate-400 text-xs">
              <span>Equipes</span>
              <Briefcase className="w-3.5 h-3.5 text-emerald-400" />
            </div>
            <div className="text-xl font-bold text-white mt-1">{teams.length}</div>
            <div className="text-[10px] text-slate-400">
              {teams.filter(t => t.status === 'Ativa').length} ativas
            </div>
          </div>

          <div className="bg-slate-800/50 border border-slate-700/60 rounded-lg p-3">
            <div className="flex items-center justify-between text-slate-400 text-xs">
              <span>Jogos</span>
              <Gamepad2 className="w-3.5 h-3.5 text-amber-400" />
            </div>
            <div className="text-xl font-bold text-white mt-1">{games.length}</div>
            <div className="text-[10px] text-slate-400">Projetos cadastrados</div>
          </div>

          <div className="bg-slate-800/50 border border-slate-700/60 rounded-lg p-3">
            <div className="flex items-center justify-between text-slate-400 text-xs">
              <span>Tarefas</span>
              <CheckSquare className="w-3.5 h-3.5 text-sky-400" />
            </div>
            <div className="text-xl font-bold text-white mt-1">{tasks.length}</div>
            <div className="text-[10px] text-slate-400">
              {tasks.filter(t => t.status === 'Concluída').length} concluídas
            </div>
          </div>

          <div className="bg-slate-800/50 border border-slate-700/60 rounded-lg p-3">
            <div className="flex items-center justify-between text-slate-400 text-xs">
              <span>Auditoria</span>
              <History className="w-3.5 h-3.5 text-purple-400" />
            </div>
            <div className="text-xl font-bold text-white mt-1">{auditLogs.length}</div>
            <div className="text-[10px] text-slate-400">Logs imutáveis</div>
          </div>

          <div className="bg-slate-800/50 border border-slate-700/60 rounded-lg p-3">
            <div className="flex items-center justify-between text-slate-400 text-xs">
              <span>Papel Ativo</span>
              <ShieldCheck className="w-3.5 h-3.5 text-rose-400" />
            </div>
            <div className="text-xs font-bold text-indigo-300 mt-1 truncate" title={currentUser?.email || ''}>
              Coord. & Admin
            </div>
            <div className="text-[10px] text-emerald-400">Acesso Irrestrito</div>
          </div>
        </div>
      </div>

      {/* Navigation Sub-Tabs */}
      <div className="border-b border-slate-200 flex items-center gap-2 overflow-x-auto pb-px">
        <button
          id="tab-admin-overview"
          onClick={() => setActiveSubTab('visao_geral')}
          className={`px-4 py-2.5 text-xs font-semibold border-b-2 flex items-center gap-2 whitespace-nowrap transition-colors ${
            activeSubTab === 'visao_geral'
              ? 'border-indigo-600 text-indigo-600 bg-indigo-50/50 rounded-t-lg'
              : 'border-transparent text-slate-600 hover:text-slate-900 hover:border-slate-300'
          }`}
        >
          <Sliders className="w-4 h-4" />
          Visão Geral & Governança
        </button>

        <button
          id="tab-admin-users"
          onClick={() => setActiveSubTab('usuarios')}
          className={`px-4 py-2.5 text-xs font-semibold border-b-2 flex items-center gap-2 whitespace-nowrap transition-colors ${
            activeSubTab === 'usuarios'
              ? 'border-indigo-600 text-indigo-600 bg-indigo-50/50 rounded-t-lg'
              : 'border-transparent text-slate-600 hover:text-slate-900 hover:border-slate-300'
          }`}
        >
          <Users className="w-4 h-4" />
          Coleção 'usuarios' em Tempo Real ({participants.length})
        </button>

        <button
          id="tab-admin-audit"
          onClick={() => setActiveSubTab('auditoria')}
          className={`px-4 py-2.5 text-xs font-semibold border-b-2 flex items-center gap-2 whitespace-nowrap transition-colors ${
            activeSubTab === 'auditoria'
              ? 'border-indigo-600 text-indigo-600 bg-indigo-50/50 rounded-t-lg'
              : 'border-transparent text-slate-600 hover:text-slate-900 hover:border-slate-300'
          }`}
        >
          <History className="w-4 h-4" />
          Trilha de Auditoria 'audit_logs' ({auditLogs.length})
        </button>

        <button
          id="tab-admin-config"
          onClick={() => setActiveSubTab('configuracoes')}
          className={`px-4 py-2.5 text-xs font-semibold border-b-2 flex items-center gap-2 whitespace-nowrap transition-colors ${
            activeSubTab === 'configuracoes'
              ? 'border-indigo-600 text-indigo-600 bg-indigo-50/50 rounded-t-lg'
              : 'border-transparent text-slate-600 hover:text-slate-900 hover:border-slate-300'
          }`}
        >
          <Database className="w-4 h-4" />
          Segurança & Políticas
        </button>
      </div>

      {/* Content for Sub-Tab: VISÃO GERAL */}
      {activeSubTab === 'visao_geral' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Direct Navigation Card */}
            <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs md:col-span-2 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <BookOpen className="w-4 h-4 text-indigo-600" />
                  Acesso Direto aos Módulos Acadêmicos
                </h3>
                <span className="text-xs text-slate-500">Permissão de Controle Ativa</span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {[
                  { id: 'participantes', label: 'Participantes', icon: Users, desc: 'Gerenciar membros' },
                  { id: 'equipes', label: 'Equipes', icon: Briefcase, desc: 'Estrutura de grupos' },
                  { id: 'jogos', label: 'Jogos', icon: Gamepad2, desc: 'Catálogo de projetos' },
                  { id: 'tarefas', label: 'Tarefas', icon: CheckSquare, desc: 'Quadro & Cronograma' },
                  { id: 'prompts', label: 'Prompts & IAs', icon: Tag, desc: 'Engenharia de prompts' },
                  { id: 'documentacao', label: 'Documentos', icon: FileText, desc: 'GDDs & Artigos' },
                ].map((mod) => (
                  <button
                    key={mod.id}
                    onClick={() => onNavigateToTab && onNavigateToTab(mod.id)}
                    className="flex flex-col text-left p-3 rounded-lg border border-slate-200 hover:border-indigo-300 hover:bg-indigo-50/30 transition-all group"
                  >
                    <div className="flex items-center gap-2 text-slate-800 font-semibold text-xs group-hover:text-indigo-700">
                      <mod.icon className="w-4 h-4 text-slate-500 group-hover:text-indigo-600" />
                      {mod.label}
                    </div>
                    <span className="text-[11px] text-slate-500 mt-1">{mod.desc}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Admin Policy Summary */}
            <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-3">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                Matriz de Governança NexoIF
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Sua conta possui credenciais de <strong>Coordenador Aluno</strong> associadas ao privilégio de <strong>Administrador</strong>.
              </p>
              <div className="space-y-2 text-xs">
                <div className="p-2 bg-emerald-50 border border-emerald-100 rounded text-emerald-900">
                  <strong>onSnapshot em Tempo Real:</strong> As alterações na coleção <code>usuarios</code> são sincronizadas instantaneamente sem recarregar a página.
                </div>
                <div className="p-2 bg-indigo-50 border border-indigo-100 rounded text-indigo-900">
                  <strong>Trilha de Auditoria com useAuditLogger:</strong> Cada exclusão de documento (<code>deleteDoc</code>) é registrada na coleção <code>audit_logs</code>.
                </div>
              </div>
            </div>
          </div>

          {/* Recent Audit Highlights */}
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <History className="w-4 h-4 text-purple-600" />
                Últimas Atividades Registradas na Auditoria (Live)
              </h3>
              <button
                onClick={() => setActiveSubTab('auditoria')}
                className="text-xs text-indigo-600 hover:text-indigo-800 font-medium"
              >
                Ver todos os registros ({auditLogs.length}) →
              </button>
            </div>

            {auditLogs.length === 0 ? (
              <EmptyState message="Nenhum log de auditoria recente encontrado." />
            ) : (
              <div className="divide-y divide-slate-100 text-xs">
                {auditLogs.slice(0, 5).map((log) => (
                  <div key={log.id} className="py-2.5 flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                        log.acao.includes('deleteDoc') || log.acao.includes('EXCLU') ? 'bg-rose-100 text-rose-800' :
                        log.acao.includes('CRIAR') || log.acao.includes('CADASTRO') ? 'bg-emerald-100 text-emerald-800' :
                        'bg-blue-100 text-blue-800'
                      }`}>
                        {log.acao}
                      </span>
                      <span className="font-semibold text-slate-900">{log.usuarioNome}</span>
                      <span className="text-slate-500">• {log.moduloAfetado || log.tipoEntidade} ({log.registroAfetado})</span>
                    </div>
                    <span className="text-slate-400 font-mono text-[11px] whitespace-nowrap">
                      {log.data} {log.horario}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Content for Sub-Tab: GESTÃO DE USUÁRIOS */}
      {activeSubTab === 'usuarios' && (
        <div className="bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden space-y-4 p-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-slate-900">Usuários no Firestore (/usuarios)</h3>
                <span className="px-2 py-0.5 text-[10px] font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200 rounded">
                  Live onSnapshot
                </span>
              </div>
              <p className="text-xs text-slate-500">
                Consulta direta e em tempo real dos documentos indexados por UID no Firestore.
              </p>
            </div>
            <button
              id="btn-admin-create-user"
              type="button"
              onClick={handleOpenCreateUser}
              className="inline-flex items-center gap-1.5 px-3 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-lg transition-colors shadow-xs self-start sm:self-auto"
            >
              <Plus className="w-4 h-4" />
              Novo Usuário no Firestore
            </button>
          </div>

          {/* Filters */}
          <div className="flex flex-col sm:flex-row items-center gap-3">
            <div className="relative w-full sm:w-80">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Buscar por UID, nome, e-mail..."
                value={userSearch}
                onChange={(e) => setUserSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-600"
              />
            </div>

            <div className="flex items-center gap-2 text-xs w-full sm:w-auto">
              <span className="text-slate-500 font-medium whitespace-nowrap">Função:</span>
              <select
                value={userRoleFilter}
                onChange={(e) => setUserRoleFilter(e.target.value)}
                className="bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 font-medium focus:outline-none focus:ring-2 focus:ring-indigo-600 w-full sm:w-auto"
              >
                <option value="todos">Todas as Funções</option>
                <option value="admin">Administrador</option>
                <option value="coordenador_aluno">Coordenador Aluno</option>
                <option value="professor_orientador">Professor Orientador</option>
                <option value="professor_colaborador">Professor Colaborador</option>
                <option value="aluno">Aluno</option>
              </select>
            </div>
          </div>

          {/* Table of Users */}
          {loading ? (
            <div className="py-12 flex flex-col items-center justify-center text-slate-500 gap-2">
              <RefreshCw className="w-6 h-6 animate-spin text-indigo-600" />
              <span className="text-xs">Sincronizando com a coleção /usuarios...</span>
            </div>
          ) : filteredParticipants.length === 0 ? (
            <EmptyState message="Nenhum usuário encontrado na coleção do Firestore." subMessage="Cadastre um novo usuário ou verifique os filtros." />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-700 uppercase tracking-wider text-[11px] font-bold">
                  <tr>
                    <th className="py-3 px-4">Usuário / E-mail</th>
                    <th className="py-3 px-4">UID Firestore</th>
                    <th className="py-3 px-4">Função / Privilégio</th>
                    <th className="py-3 px-4">Equipe</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Ações Administrativas</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-800 text-xs">
                  {filteredParticipants.map((p) => {
                    const isPaulo = (p.email || '').toLowerCase().trim() === 'paulocauan39@gmail.com';
                    const hasAdminPrivilege = isPaulo || p.funcao === 'admin' || p.isAdmin === true;

                    return (
                      <tr key={p.id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="py-3 px-4">
                          <div className="font-semibold text-slate-900">{p.nome}</div>
                          <div className="text-slate-500 text-[11px]">{p.email}</div>
                        </td>
                        <td className="py-3 px-4 font-mono text-[11px] text-slate-500 select-all" title={p.id}>
                          {p.id.length > 18 ? `${p.id.substring(0, 18)}...` : p.id}
                        </td>
                        <td className="py-3 px-4 whitespace-nowrap">
                          {hasAdminPrivilege ? (
                            <span className="px-2 py-0.5 text-[11px] font-semibold bg-purple-100 text-purple-800 rounded border border-purple-200 inline-flex items-center gap-1">
                              <ShieldCheck className="w-3 h-3 text-purple-600" />
                              {p.funcao === 'coordenador_aluno' ? 'Coord. & Admin' : 'Admin'}
                            </span>
                          ) : p.funcao === 'coordenador_aluno' ? (
                            <span className="px-2 py-0.5 text-[11px] font-semibold bg-indigo-100 text-indigo-800 rounded">
                              Coordenador Aluno
                            </span>
                          ) : p.funcao === 'professor_orientador' ? (
                            <span className="px-2 py-0.5 text-[11px] font-semibold bg-emerald-100 text-emerald-800 rounded">
                              Prof. Orientador
                            </span>
                          ) : p.funcao === 'professor_colaborador' ? (
                            <span className="px-2 py-0.5 text-[11px] font-semibold bg-teal-100 text-teal-800 rounded">
                              Prof. Colaborador
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 text-[11px] font-semibold bg-sky-100 text-sky-800 rounded">
                              Aluno
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-slate-600">
                          {p.equipeNome || (p.equipeId ? `Equipe #${p.equipeId}` : 'Sem equipe')}
                        </td>
                        <td className="py-3 px-4">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                            p.status === 'Ativo' ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                          }`}>
                            {p.status || 'Ativo'}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right whitespace-nowrap">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => handleToggleStatus(p)}
                              title={p.status === 'Ativo' ? 'Desativar usuário' : 'Ativar usuário'}
                              className={`p-1.5 rounded transition-colors ${
                                p.status === 'Ativo'
                                  ? 'text-amber-600 hover:bg-amber-50'
                                  : 'text-emerald-600 hover:bg-emerald-50'
                              }`}
                            >
                              {p.status === 'Ativo' ? <UserX className="w-4 h-4" /> : <UserCheck className="w-4 h-4" />}
                            </button>
                            <button
                              onClick={() => handleOpenEditUser(p)}
                              title="Editar Perfil / Função"
                              className="p-1.5 text-indigo-600 hover:bg-indigo-50 rounded transition-colors"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => {
                                setDeleteError('');
                                setUserToDelete(p);
                                setDeleteUserModalOpen(true);
                              }}
                              title="Excluir Permanentemente (deleteDoc)"
                              className="p-1.5 text-rose-600 hover:bg-rose-50 rounded transition-colors"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Content for Sub-Tab: AUDITORIA */}
      {activeSubTab === 'auditoria' && (
        <div className="bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden space-y-4 p-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <History className="w-4 h-4 text-indigo-600" />
                  Trilha de Auditoria (Coleção 'audit_logs')
                </h3>
                <span className="px-2 py-0.5 text-[10px] font-semibold bg-purple-50 text-purple-700 border border-purple-200 rounded">
                  onSnapshot em Tempo Real
                </span>
              </div>
              <p className="text-xs text-slate-500">
                Registro detalhado e imutável de todas as exclusões (<code>deleteDoc</code>) e modificações administrativas no Firestore.
              </p>
            </div>
            <div className="relative w-full sm:w-72">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Filtrar logs por ação, usuário, UID..."
                value={auditSearch}
                onChange={(e) => setAuditSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-600"
              />
            </div>
          </div>

          {filteredAuditLogs.length === 0 ? (
            <EmptyState message="Nenhum registro de auditoria encontrado na coleção 'audit_logs'." />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-700 uppercase tracking-wider text-[11px] font-bold">
                  <tr>
                    <th className="py-3 px-4">Data / Horário</th>
                    <th className="py-3 px-4">Executor</th>
                    <th className="py-3 px-4">Ação</th>
                    <th className="py-3 px-4">Módulo / Coleção</th>
                    <th className="py-3 px-4">Registro Afetado</th>
                    <th className="py-3 px-4">Detalhes da Operação</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-800 text-xs font-normal">
                  {filteredAuditLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3 px-4 font-mono text-slate-500 whitespace-nowrap">
                        {log.data} <span className="text-slate-400">{log.horario}</span>
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        <div className="font-semibold text-slate-900">{log.usuarioNome}</div>
                        <span className="text-[10px] text-purple-700 font-mono">[{log.usuarioRole || 'admin'}]</span>
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                          log.acao.includes('deleteDoc') || log.acao.includes('EXCLU') ? 'bg-rose-100 text-rose-800' :
                          log.acao.includes('CRIAR') || log.acao.includes('CADASTRO') ? 'bg-emerald-100 text-emerald-800' :
                          log.acao.includes('EDITAR') || log.acao.includes('ATUALIZAR') ? 'bg-blue-100 text-blue-800' :
                          'bg-slate-100 text-slate-700'
                        }`}>
                          {log.acao}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-medium text-slate-700 whitespace-nowrap">
                        {log.moduloAfetado || log.tipoEntidade}
                      </td>
                      <td className="py-3 px-4 font-medium text-indigo-900 whitespace-nowrap">
                        {log.registroAfetado}
                      </td>
                      <td className="py-3 px-4 text-slate-600 max-w-sm truncate" title={log.alteracaoRealizada}>
                        {log.alteracaoRealizada}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Content for Sub-Tab: CONFIGURAÇÕES & SEGURANÇA */}
      {activeSubTab === 'configuracoes' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-4">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2 border-b border-slate-100 pb-3">
              <Database className="w-4 h-4 text-indigo-600" />
              Políticas de Segurança do Firestore
            </h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              O controle de acesso baseado em funções (RBAC) garante que somente administradores autenticados possam executar operações de exclusão (<code>deleteDoc</code>) e modificação em massa.
            </p>
            <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 text-xs font-mono space-y-1 text-slate-700">
              <div>• Administrador: <strong>paulocauan39@gmail.com</strong></div>
              <div>• Coleção de Auditoria: <strong>audit_logs</strong></div>
              <div>• Coleção Principal de Usuários: <strong>usuarios</strong></div>
              <div>• Padrão de Exclusão: <strong>Verificação de Admin + Modal de Confirmação + Log</strong></div>
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-4">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2 border-b border-slate-100 pb-3">
              <Tag className="w-4 h-4 text-indigo-600" />
              Taxonomia e Categorias de Prompts
            </h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Gerencie os eixos temáticos e categorias de prompts utilizadas pelos alunos e pesquisadores durante a geração de conteúdo com IA.
            </p>
            <button
              onClick={() => setCategoryModalOpen(true)}
              className="inline-flex items-center gap-2 px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-lg shadow-xs transition-colors"
            >
              <Tag className="w-4 h-4" />
              Abrir Gerenciador de Categorias
            </button>
          </div>
        </div>
      )}

      {/* Modal de Criação / Edição de Usuário */}
      {userModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-150">
          <div className="bg-white rounded-xl shadow-xl border border-slate-200 w-full max-w-md p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-900">
                {editingUser ? 'Editar Perfil / Função do Usuário' : 'Novo Usuário do Firestore'}
              </h3>
              <button
                onClick={() => setUserModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            {userModalError && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700">
                {userModalError}
              </div>
            )}

            <form onSubmit={handleSaveUser} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Nome Completo *</label>
                <input
                  type="text"
                  required
                  value={editNome}
                  onChange={(e) => setEditNome(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-600"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">E-mail Institucional *</label>
                <input
                  type="email"
                  required
                  value={editEmail}
                  onChange={(e) => setEditEmail(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-600"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Função / Perfil Acadêmico *</label>
                <select
                  value={editFuncao}
                  onChange={(e) => setEditFuncao(e.target.value as UserRole)}
                  className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-600"
                >
                  <option value="aluno">Aluno (Pesquisador)</option>
                  <option value="coordenador_aluno">Coordenador Aluno</option>
                  <option value="professor_orientador">Professor Orientador</option>
                  <option value="professor_colaborador">Professor Colaborador</option>
                  <option value="admin">Administrador Geral</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Equipe Vinculada (Opcional)</label>
                <select
                  value={editEquipeId}
                  onChange={(e) => setEditEquipeId(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-600"
                >
                  <option value="">Sem Equipe Atribuída</option>
                  {teams.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.nome} ({t.areaAtuacao || 'Geral'})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Status da Conta</label>
                <select
                  value={editStatus}
                  onChange={(e) => setEditStatus(e.target.value as 'Ativo' | 'Inativo')}
                  className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-600"
                >
                  <option value="Ativo">Ativo (Acesso Permitido)</option>
                  <option value="Inativo">Inativo (Bloqueado)</option>
                </select>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setUserModalOpen(false)}
                  className="px-3.5 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSavingUser}
                  className="px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-xs transition-colors flex items-center gap-1.5"
                >
                  {isSavingUser && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                  {editingUser ? 'Salvar Alterações' : 'Cadastrar no Firestore'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Confirmation Flow UI Modal for User Deletion */}
      {deleteUserModalOpen && userToDelete && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-150">
          <div className="bg-white rounded-xl shadow-2xl border border-red-200 w-full max-w-md p-6 space-y-4">
            <div className="flex items-center gap-3 text-red-600">
              <div className="p-2.5 bg-red-100 rounded-full">
                <AlertTriangle className="w-6 h-6 text-red-600" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">Confirmar Exclusão de Usuário</h3>
                <p className="text-xs text-rose-700 font-medium">Operação deleteDoc com registro de auditoria</p>
              </div>
            </div>

            <div className="bg-red-50/70 border border-red-100 rounded-lg p-3.5 text-xs text-slate-700 space-y-2">
              <p>
                Você está prestes a excluir permanentemente o documento do usuário:
              </p>
              <div className="font-mono text-[11px] bg-white p-2.5 rounded border border-red-200 text-slate-800 space-y-1">
                <div><strong>Nome:</strong> {userToDelete.nome}</div>
                <div><strong>E-mail:</strong> {userToDelete.email}</div>
                <div><strong>UID:</strong> {userToDelete.id}</div>
                <div><strong>Função:</strong> {userToDelete.funcao}</div>
              </div>
              <p className="text-[11px] text-red-800 font-semibold">
                ⚠️ Esta ação executará um <code>deleteDoc</code> no Firestore e registrará sua identidade em <code>audit_logs</code>. Esta operação não pode ser desfeita.
              </p>
            </div>

            {deleteError && (
              <div className="p-2.5 bg-red-100 border border-red-300 rounded text-xs text-red-800">
                {deleteError}
              </div>
            )}

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                disabled={isDeletingUser}
                onClick={() => {
                  setDeleteUserModalOpen(false);
                  setUserToDelete(null);
                }}
                className="px-3.5 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={isDeletingUser}
                onClick={handleDeleteUser}
                className="px-4 py-2 text-xs font-semibold text-white bg-red-600 hover:bg-red-700 rounded-lg shadow-xs transition-colors flex items-center gap-1.5 disabled:opacity-50"
              >
                {isDeletingUser && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                Confirmar e Excluir Definitivamente
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Gerenciador de Categorias de Prompts */}
      <PromptCategoryManagerModal
        isOpen={categoryModalOpen}
        onClose={() => setCategoryModalOpen(false)}
      />
    </div>
  );
};
