import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext.js';
import { UserRole, Participant } from '../types.js';
import { api } from '../services/api.js';
import { LogIn, UserPlus, LogOut, CheckCircle2, Shield, User } from 'lucide-react';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialMode?: 'login' | 'register';
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  initialMode = 'login',
}) => {
  const { currentUser, usersList, refreshUsers, switchUser } = useAuth();
  const [mode, setMode] = useState<'login' | 'register'>(initialMode);

  // Login form state
  const [selectedUserId, setSelectedUserId] = useState<string>(currentUser?.id || (usersList[0]?.id || ''));
  const [loginEmail, setLoginEmail] = useState<string>('');
  const [loginMethod, setLoginMethod] = useState<'select' | 'email'>('select');

  // Register form state
  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');
  const [funcao, setFuncao] = useState<UserRole>('aluno');
  const [equipeId, setEquipeId] = useState('');

  // Status
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');

  if (!isOpen) return null;

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      if (loginMethod === 'select') {
        if (!selectedUserId) {
          setError('Selecione um usuário para entrar.');
          setLoading(false);
          return;
        }
        await api.login({ userId: selectedUserId });
        await switchUser(selectedUserId);
      } else {
        if (!loginEmail.trim()) {
          setError('Informe seu email institucional.');
          setLoading(false);
          return;
        }
        const res = await api.login({ email: loginEmail.trim() });
        if (res.user) {
          await switchUser(res.user.id);
        }
      }
      await refreshUsers();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Erro ao realizar login.');
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      if (!nome.trim() || !email.trim()) {
        setError('Nome completo e email institucional são obrigatórios.');
        setLoading(false);
        return;
      }

      const res = await api.register({
        nome: nome.trim(),
        email: email.trim(),
        funcao,
        ...(equipeId ? { equipeId } : {}),
      });

      setSuccessMsg(`Usuário ${res.nome} cadastrado com sucesso!`);
      await switchUser(res.id);
      await refreshUsers();
      setTimeout(() => {
        onClose();
      }, 1000);
    } catch (err: any) {
      setError(err.message || 'Erro ao cadastrar usuário.');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      setLoading(true);
      await api.logout();
      await refreshUsers();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Erro ao deslogar.');
    } finally {
      setLoading(false);
    }
  };

  const getRoleLabel = (role: UserRole) => {
    switch (role) {
      case 'coordenador_aluno':
        return 'Coordenador Aluno';
      case 'professor_orientador':
        return 'Professor Orientador';
      case 'professor_colaborador':
        return 'Professor Colaborador';
      case 'aluno':
        return 'Aluno';
      default:
        return role;
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4 backdrop-blur-xs">
      <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header Tabs */}
        <div className="flex border-b border-slate-200 bg-slate-50">
          <button
            onClick={() => {
              setMode('login');
              setError('');
            }}
            className={`flex-1 py-3 text-xs font-bold border-b-2 flex items-center justify-center gap-1.5 transition-colors ${
              mode === 'login'
                ? 'border-indigo-600 text-indigo-900 bg-white'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <LogIn className="w-3.5 h-3.5" />
            Entrar no Sistema
          </button>
          <button
            onClick={() => {
              setMode('register');
              setError('');
            }}
            className={`flex-1 py-3 text-xs font-bold border-b-2 flex items-center justify-center gap-1.5 transition-colors ${
              mode === 'register'
                ? 'border-indigo-600 text-indigo-900 bg-white'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <UserPlus className="w-3.5 h-3.5" />
            Cadastrar Usuário
          </button>
          <button
            onClick={onClose}
            className="px-3 text-slate-400 hover:text-slate-600 text-lg font-bold"
          >
            &times;
          </button>
        </div>

        <div className="p-6">
          {error && (
            <div className="mb-4 p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-md">
              {error}
            </div>
          )}

          {successMsg && (
            <div className="mb-4 p-3 bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs rounded-md flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              {successMsg}
            </div>
          )}

          {mode === 'login' ? (
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="flex items-center justify-between text-xs text-slate-500 mb-2">
                <span>Modo de Login:</span>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setLoginMethod('select')}
                    className={`px-2 py-0.5 rounded text-[11px] font-semibold ${
                      loginMethod === 'select'
                        ? 'bg-indigo-100 text-indigo-900 border border-indigo-200'
                        : 'text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    Lista de Usuários
                  </button>
                  <button
                    type="button"
                    onClick={() => setLoginMethod('email')}
                    className={`px-2 py-0.5 rounded text-[11px] font-semibold ${
                      loginMethod === 'email'
                        ? 'bg-indigo-100 text-indigo-900 border border-indigo-200'
                        : 'text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    Digitar Email
                  </button>
                </div>
              </div>

              {loginMethod === 'select' ? (
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    Selecione o Usuário Cadastrado
                  </label>
                  <select
                    value={selectedUserId}
                    onChange={e => setSelectedUserId(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-indigo-600"
                  >
                    {usersList.map((u: Participant) => (
                      <option key={u.id} value={u.id}>
                        {u.nome} ({getRoleLabel(u.funcao)})
                      </option>
                    ))}
                  </select>
                  <p className="text-[11px] text-slate-500 mt-1">
                    Permite alternar entre os perfis acadêmicos e testar as permissões de cada função.
                  </p>
                </div>
              ) : (
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    Email Institucional
                  </label>
                  <input
                    type="email"
                    required
                    value={loginEmail}
                    onChange={e => setLoginEmail(e.target.value)}
                    placeholder="estudante@universidade.edu.br"
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-600"
                  />
                </div>
              )}

              <div className="pt-2 flex items-center justify-between gap-3">
                {currentUser && (
                  <button
                    type="button"
                    onClick={handleLogout}
                    disabled={loading}
                    className="inline-flex items-center gap-1 px-3 py-2 text-xs font-semibold text-rose-700 hover:bg-rose-50 border border-rose-200 rounded-md transition-colors"
                  >
                    <LogOut className="w-3.5 h-3.5" /> Desconectar
                  </button>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="ml-auto inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-indigo-900 hover:bg-indigo-800 rounded-md transition-colors shadow-xs disabled:opacity-50"
                >
                  <LogIn className="w-3.5 h-3.5" />
                  {loading ? 'Entrando...' : 'Entrar'}
                </button>
              </div>
            </form>
          ) : (
            <form onSubmit={handleRegister} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Nome Completo *
                </label>
                <input
                  type="text"
                  required
                  value={nome}
                  onChange={e => setNome(e.target.value)}
                  placeholder="Ex: Carlos Oliveira"
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-600"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Email Institucional *
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="carlos@universidade.edu.br"
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-600"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Perfil de Acesso / Função no Projeto *
                </label>
                <select
                  value={funcao}
                  onChange={e => setFuncao(e.target.value as UserRole)}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-indigo-600"
                >
                  <option value="aluno">Aluno (Desenvolvedor / Pesquisador)</option>
                  <option value="coordenador_aluno">Coordenador Aluno (Gestão e Administração)</option>
                  <option value="professor_orientador">Professor Orientador (Supervisão Geral)</option>
                  <option value="professor_colaborador">Professor Colaborador (Supervisão Técnica)</option>
                </select>
                <div className="mt-1 flex items-center gap-1 text-[11px] text-slate-500">
                  <Shield className="w-3 h-3 text-indigo-600" />
                  As permissões do sistema são atreladas diretamente a esta função.
                </div>
              </div>

              <div className="pt-2 flex items-center justify-end gap-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-md transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-indigo-900 hover:bg-indigo-800 rounded-md transition-colors shadow-xs disabled:opacity-50"
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  {loading ? 'Cadastrando...' : 'Cadastrar e Entrar'}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
