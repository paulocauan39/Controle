import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext.js';
import { useTheme } from '../context/ThemeContext.js';
import { UserRole, Participant } from '../types.js';
import { api } from '../services/api.js';
import { LogIn, UserPlus, KeyRound, Shield, CheckCircle2, AlertCircle, Info, Gamepad2, ArrowRight, Sun, Moon } from 'lucide-react';

interface AuthViewProps {
  onLoginSuccess?: () => void;
}

export const AuthView: React.FC<AuthViewProps> = ({ onLoginSuccess }) => {
  const { usersList, refreshUsers, switchUser, signInWithGoogle } = useAuth();
  const { isDark, toggleTheme } = useTheme();
  const [tab, setTab] = useState<'login' | 'register' | 'recovery'>('login');

  // Ensure user list is synced from Firestore on mount
  useEffect(() => {
    refreshUsers().catch((e) => console.warn('[AuthView] Sync users:', e));
  }, []);

  // Login state
  const [selectedUserId, setSelectedUserId] = useState<string>('');
  const [loginEmail, setLoginEmail] = useState<string>('');
  const [loginMethod, setLoginMethod] = useState<'select' | 'email'>('select');

  // Register state
  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');
  const [funcao, setFuncao] = useState<UserRole>('aluno');
  const [equipeId, setEquipeId] = useState('');

  // Recovery state
  const [recoveryEmail, setRecoveryEmail] = useState('');
  const [recoverySent, setRecoverySent] = useState(false);

  // Status
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');

  // Update selectedUserId default when usersList loads
  useEffect(() => {
    if (usersList.length > 0 && !selectedUserId) {
      setSelectedUserId(usersList[0].id);
    }
  }, [usersList, selectedUserId]);

  const handleGoogleLogin = async () => {
    setError('');
    setLoading(true);
    try {
      await signInWithGoogle();
      if (onLoginSuccess) onLoginSuccess();
    } catch (err: any) {
      const code = err?.code || '';
      if (code === 'auth/popup-closed-by-user' || err?.message?.includes('popup-closed-by-user')) {
        setError('A janela de login do Google foi fechada antes de concluir a autenticação. Você pode tentar novamente ou selecionar um perfil abaixo.');
      } else if (code === 'auth/popup-blocked') {
        setError('A janela de pop-up foi bloqueada pelo navegador. Permita pop-ups ou abra a aplicação em uma nova aba.');
      } else if (code === 'auth/cancelled-popup-request') {
        setError('A tentativa de login anterior foi cancelada.');
      } else if (code === 'auth/unauthorized-domain') {
        setError('Domínio não autorizado no Firebase Authentication. Utilize o login por perfil institucional abaixo.');
      } else if (code === 'auth/network-request-failed') {
        setError('Falha de conexão com os servidores do Firebase Auth. Verifique sua conexão com a internet.');
      } else {
        setError(err.message || 'Falha ao autenticar com o Google via Firebase.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      if (loginMethod === 'select') {
        const targetId = selectedUserId || usersList[0]?.id;
        if (!targetId) {
          setError('Nenhum usuário selecionado.');
          setLoading(false);
          return;
        }
        await api.login({ userId: targetId });
        await switchUser(targetId);
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
      if (onLoginSuccess) onLoginSuccess();
    } catch (err: any) {
      setError(err.message || 'Falha ao autenticar no sistema NexoIF.');
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

      setSuccessMsg(`Usuário ${res.nome} cadastrado com sucesso! Redirecionando...`);
      await switchUser(res.id);
      await refreshUsers();
      if (onLoginSuccess) onLoginSuccess();
    } catch (err: any) {
      setError(err.message || 'Erro ao cadastrar novo usuário.');
    } finally {
      setLoading(false);
    }
  };

  const handleRecovery = (e: React.FormEvent) => {
    e.preventDefault();
    if (!recoveryEmail.trim()) {
      setError('Informe seu email para recuperação.');
      return;
    }
    setError('');
    setRecoverySent(true);
  };

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col justify-center items-center px-4 py-12 relative">
      {/* Top right Theme Toggle button */}
      <div className="absolute top-4 right-4">
        <button
          id="btn-auth-theme-toggle"
          type="button"
          onClick={toggleTheme}
          title={isDark ? 'Mudar para Modo Claro' : 'Mudar para Modo Escuro'}
          aria-label="Alternar tema"
          className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-amber-300 border border-slate-700 transition-colors shadow-sm flex items-center justify-center"
        >
          {isDark ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-slate-300" />}
        </button>
      </div>

      {/* Institutional Branding */}
      <div className="w-full max-w-md text-center mb-8">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-indigo-600 text-white font-black text-2xl shadow-lg shadow-indigo-600/30 mb-4 ring-4 ring-indigo-500/20">
          N
        </div>
        <h1 className="text-3xl font-black text-white tracking-tight">NexoIF</h1>
        <p className="text-sm text-slate-400 mt-1 font-medium">
          Sistema Integrado de Pesquisa e Desenvolvimento em Jogos com IA
        </p>
        <div className="mt-2 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-800 text-slate-300 text-xs border border-slate-700">
          <Gamepad2 className="w-3.5 h-3.5 text-indigo-400" />
          Ambiente de Acesso Restrito e Autenticado
        </div>
      </div>

      {/* Auth Card */}
      <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden">
        {/* Navigation Tabs: LOGIN | CADASTRO | RECUPERAÇÃO */}
        <div className="flex border-b border-slate-200 bg-slate-50">
          <button
            id="tab-login"
            type="button"
            onClick={() => {
              setTab('login');
              setError('');
              setSuccessMsg('');
            }}
            className={`flex-1 py-4 text-xs uppercase font-extrabold tracking-wider border-b-2 flex items-center justify-center gap-2 transition-all ${
              tab === 'login'
                ? 'border-indigo-600 text-indigo-700 bg-white shadow-xs'
                : 'border-transparent text-slate-500 hover:text-slate-900 hover:bg-slate-100/50'
            }`}
          >
            <LogIn className="w-4 h-4" />
            LOGIN
          </button>
          <button
            id="tab-register"
            type="button"
            onClick={() => {
              setTab('register');
              setError('');
              setSuccessMsg('');
            }}
            className={`flex-1 py-4 text-xs uppercase font-extrabold tracking-wider border-b-2 flex items-center justify-center gap-2 transition-all ${
              tab === 'register'
                ? 'border-indigo-600 text-indigo-700 bg-white shadow-xs'
                : 'border-transparent text-slate-500 hover:text-slate-900 hover:bg-slate-100/50'
            }`}
          >
            <UserPlus className="w-4 h-4" />
            CADASTRO
          </button>
          <button
            id="tab-recovery"
            type="button"
            onClick={() => {
              setTab('recovery');
              setError('');
              setSuccessMsg('');
            }}
            className={`py-4 px-3 text-[11px] uppercase font-bold tracking-wider border-b-2 flex items-center justify-center gap-1.5 transition-all ${
              tab === 'recovery'
                ? 'border-indigo-600 text-indigo-700 bg-white shadow-xs'
                : 'border-transparent text-slate-400 hover:text-slate-700'
            }`}
          >
            <KeyRound className="w-3.5 h-3.5" />
            Ajuda
          </button>
        </div>

        <div className="p-6">
          {error && (
            <div className="mb-4 p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-lg flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {successMsg && (
            <div className="mb-4 p-3 bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs rounded-lg flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* LOGIN TAB */}
          {tab === 'login' && (
            <div className="space-y-5">
              {/* Google Sign-In with Firebase Auth */}
              <div>
                <button
                  id="btn-google-login"
                  type="button"
                  disabled={loading}
                  onClick={handleGoogleLogin}
                  className="w-full inline-flex items-center justify-center gap-3 px-4 py-2.5 text-sm font-bold text-slate-700 bg-white hover:bg-slate-50 border border-slate-300 rounded-xl shadow-xs hover:border-slate-400 transition-all disabled:opacity-50"
                >
                  <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                    <path
                      fill="#4285F4"
                      d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.35 24 12 24z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 10.04 0 12s.45 3.82 1.25 5.42l4.03-3.15z"
                    />
                    <path
                      fill="#EA4335"
                      d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.35 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
                    />
                  </svg>
                  {loading ? 'Conectando ao Firebase Auth...' : 'Entrar com o Google'}
                </button>

                <div className="relative my-4">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-slate-200" />
                  </div>
                  <div className="relative flex justify-center text-[11px]">
                    <span className="bg-white px-2 text-slate-400 font-medium">ou acesse com conta institucional</span>
                  </div>
                </div>
              </div>

              <form onSubmit={handleLogin} className="space-y-4">
                <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
                  <span className="font-semibold text-slate-600">Modo de Acesso:</span>
                  <div className="flex gap-1 bg-slate-100 p-0.5 rounded-lg border border-slate-200">
                    <button
                      type="button"
                      onClick={() => setLoginMethod('select')}
                      className={`px-2.5 py-1 rounded-md text-[11px] font-bold transition-all ${
                        loginMethod === 'select'
                          ? 'bg-white text-indigo-900 shadow-xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      Selecionar Perfil
                    </button>
                    <button
                      type="button"
                      onClick={() => setLoginMethod('email')}
                      className={`px-2.5 py-1 rounded-md text-[11px] font-bold transition-all ${
                        loginMethod === 'email'
                          ? 'bg-white text-indigo-900 shadow-xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      Digitar E-mail
                    </button>
                  </div>
                </div>

                {loginMethod === 'select' ? (
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                      Perfil Cadastrado no Firestore
                    </label>
                    {usersList.length > 0 ? (
                      <select
                        id="login-select-user"
                        value={selectedUserId || usersList[0]?.id}
                        onChange={(e) => setSelectedUserId(e.target.value)}
                        className="w-full px-3 py-2.5 text-sm border border-slate-300 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-indigo-600 font-medium text-slate-800"
                      >
                        {usersList.map((u: Participant) => (
                          <option key={u.id} value={u.id}>
                            {u.nome} ({u.email || 'sem email'}) — {u.funcao === 'coordenador_aluno' ? 'Coordenador Aluno' : u.funcao === 'professor_orientador' ? 'Prof. Orientador' : u.funcao === 'professor_colaborador' ? 'Prof. Colaborador' : 'Aluno'}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-600">
                        Carregando contas cadastradas do Firestore... Se ainda não tiver conta, selecione <strong>Digitar E-mail</strong> ou clique em <strong>CADASTRO</strong>.
                      </div>
                    )}
                  </div>
                ) : (
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                      E-mail Institucional
                    </label>
                    <input
                      id="login-input-email"
                      type="email"
                      required
                      value={loginEmail}
                      onChange={(e) => setLoginEmail(e.target.value)}
                      placeholder="exemplo@universidade.edu.br"
                      className="w-full px-3 py-2.5 text-sm border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-600"
                    />
                  </div>
                )}

                <div className="pt-2">
                  <button
                    id="btn-login-submit"
                    type="submit"
                    disabled={loading}
                    className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition-all shadow-sm disabled:opacity-50"
                  >
                    <LogIn className="w-4 h-4" />
                    {loading ? 'Entrando no NexoIF...' : 'Entrar na Conta'}
                  </button>
                </div>
              </form>

              {/* Quick switch to register */}
              <div className="pt-3 border-t border-slate-100 text-center">
                <p className="text-xs text-slate-500">
                  Ainda não possui uma conta?{' '}
                  <button
                    type="button"
                    onClick={() => {
                      setTab('register');
                      setError('');
                      setSuccessMsg('');
                    }}
                    className="font-bold text-indigo-600 hover:text-indigo-800 hover:underline"
                  >
                    Cadastre-se aqui
                  </button>
                </p>
              </div>
            </div>
          )}

          {/* REGISTER TAB */}
          {tab === 'register' && (
            <div className="space-y-4">
              {/* Google Sign-Up */}
              <div>
                <button
                  id="btn-google-register"
                  type="button"
                  disabled={loading}
                  onClick={handleGoogleLogin}
                  className="w-full inline-flex items-center justify-center gap-3 px-4 py-2.5 text-sm font-bold text-slate-700 bg-white hover:bg-slate-50 border border-slate-300 rounded-xl shadow-xs hover:border-slate-400 transition-all disabled:opacity-50"
                >
                  <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                    <path
                      fill="#4285F4"
                      d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.35 24 12 24z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 10.04 0 12s.45 3.82 1.25 5.42l4.03-3.15z"
                    />
                    <path
                      fill="#EA4335"
                      d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.35 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
                    />
                  </svg>
                  {loading ? 'Conectando ao Firebase...' : 'Cadastrar com o Google'}
                </button>

                <div className="relative my-3">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-slate-200" />
                  </div>
                  <div className="relative flex justify-center text-[11px]">
                    <span className="bg-white px-2 text-slate-400 font-medium">ou preencha os dados institucionais</span>
                  </div>
                </div>
              </div>

              <form onSubmit={handleRegister} className="space-y-3.5">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Nome Completo *
                  </label>
                  <input
                    id="register-input-nome"
                    type="text"
                    required
                    value={nome}
                    onChange={(e) => setNome(e.target.value)}
                    placeholder="Ex: Carlos Eduardo Silva"
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-600"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    E-mail Institucional *
                  </label>
                  <input
                    id="register-input-email"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="carlos@universidade.edu.br"
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-600"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Perfil / Função no Projeto *
                  </label>
                  <select
                    id="register-select-funcao"
                    value={funcao}
                    onChange={(e) => setFuncao(e.target.value as UserRole)}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-indigo-600 font-medium text-slate-800"
                  >
                    <option value="aluno">Aluno (Desenvolvedor e Pesquisador)</option>
                    <option value="coordenador_aluno">Coordenador Aluno (Gestão Operacional)</option>
                    <option value="professor_orientador">Professor Orientador (Supervisão Acadêmica)</option>
                    <option value="professor_colaborador">Professor Colaborador (Supervisão Técnica)</option>
                  </select>
                  <div className="mt-1 flex items-center gap-1.5 text-[11px] text-slate-500">
                    <Shield className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                    Permissões de acesso são atribuídas conforme a função selecionada.
                  </div>
                </div>

                <div className="pt-2">
                  <button
                    id="btn-register-submit"
                    type="submit"
                    disabled={loading}
                    className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition-all shadow-sm disabled:opacity-50"
                  >
                    <UserPlus className="w-4 h-4" />
                    {loading ? 'Cadastrando no Firestore...' : 'Concluir Cadastro e Entrar'}
                  </button>
                </div>
              </form>

              {/* Quick switch to login */}
              <div className="pt-3 border-t border-slate-100 text-center">
                <p className="text-xs text-slate-500">
                  Já possui uma conta cadastrada?{' '}
                  <button
                    type="button"
                    onClick={() => {
                      setTab('login');
                      setError('');
                      setSuccessMsg('');
                    }}
                    className="font-bold text-indigo-600 hover:text-indigo-800 hover:underline"
                  >
                    Faça login aqui
                  </button>
                </p>
              </div>
            </div>
          )}

          {/* RECOVERY TAB */}
          {tab === 'recovery' && (
            <div className="space-y-4">
              <div className="p-4 bg-indigo-50 border border-indigo-200 rounded-xl space-y-2 text-xs text-indigo-900">
                <div className="flex items-center gap-1.5 font-bold text-indigo-950 text-sm">
                  <Info className="w-4 h-4 text-indigo-600" />
                  Recuperação Institucional de Acesso
                </div>
                <p className="leading-relaxed">
                  Por motivos de segurança acadêmica e controle de integridade de dados no <strong>NexoIF</strong>, a redefinição de acesso é gerenciada pelos responsáveis pelo projeto.
                </p>
                <div className="bg-white/80 p-3 rounded-lg border border-indigo-100 text-[11px] space-y-1">
                  <p><strong>Contatos de Suporte:</strong></p>
                  <p>• Coordenador Aluno: <code>paulocauan39@gmail.com</code></p>
                </div>
              </div>

              {recoverySent ? (
                <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-xl space-y-2">
                  <div className="flex items-center gap-1.5 font-bold text-emerald-900">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    Solicitação enviada com sucesso!
                  </div>
                  <p>
                    Uma notificação institucional foi registrada para <strong>{recoveryEmail}</strong>. Verifique sua caixa postal ou aguarde a confirmação.
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      setRecoverySent(false);
                      setTab('login');
                    }}
                    className="mt-2 text-indigo-700 font-bold hover:underline inline-flex items-center gap-1 text-xs"
                  >
                    Voltar para a tela de login <ArrowRight className="w-3 h-3" />
                  </button>
                </div>
              ) : (
                <form onSubmit={handleRecovery} className="space-y-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                      Email Institucional para Recuperação
                    </label>
                    <input
                      id="recovery-input-email"
                      type="email"
                      required
                      value={recoveryEmail}
                      onChange={(e) => setRecoveryEmail(e.target.value)}
                      placeholder="seu.email@universidade.edu.br"
                      className="w-full px-3 py-2 text-sm border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-600"
                    />
                  </div>
                  <button
                    id="btn-recovery-submit"
                    type="submit"
                    className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-bold text-indigo-900 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded-xl transition-colors"
                  >
                    <KeyRound className="w-4 h-4" />
                    Solicitar Instruções de Acesso
                  </button>
                </form>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Footer info */}
      <footer className="mt-8 text-center text-xs text-slate-500">
        NexoIF • Plataforma Oficial de Gestão e Pesquisa em Jogos com IA
      </footer>
    </div>
  );
};

