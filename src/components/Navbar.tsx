import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext.js';
import {
  LayoutDashboard,
  Users,
  Briefcase,
  Gamepad2,
  CheckSquare,
  Cpu,
  FlaskConical,
  MessageSquareCode,
  GitCommit,
  FlaskRound as FlaskTest,
  BarChart3,
  Scale,
  Calendar,
  History,
  FileText,
  Info,
  ChevronDown,
  Menu,
  X,
  UserCircle,
  BookOpen,
  LogOut,
} from 'lucide-react';
import { UserRole } from '../types.js';

export type ActiveTab =
  | 'dashboard'
  | 'participantes'
  | 'equipes'
  | 'jogos'
  | 'tarefas'
  | 'ias'
  | 'experimentos'
  | 'prompts'
  | 'versoes'
  | 'testes'
  | 'resultados'
  | 'comparacao'
  | 'cronograma'
  | 'documentacao'
  | 'historico'
  | 'relatorios'
  | 'sistema';

interface NavbarProps {
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
}

export const Navbar: React.FC<NavbarProps> = ({ activeTab, setActiveTab }) => {
  const { currentUser, firebaseUser, usersList, switchUser, logout, isAluno, isProfessorColaborador } = useAuth();
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const getRoleBadge = (role?: UserRole) => {
    switch (role) {
      case 'coordenador_aluno':
        return <span className="px-2 py-0.5 text-[11px] font-semibold bg-indigo-100 text-indigo-800 rounded border border-indigo-200">Coordenador Aluno</span>;
      case 'professor_orientador':
        return <span className="px-2 py-0.5 text-[11px] font-semibold bg-emerald-100 text-emerald-800 rounded border border-emerald-200">Prof. Orientador</span>;
      case 'professor_colaborador':
        return <span className="px-2 py-0.5 text-[11px] font-semibold bg-teal-100 text-teal-800 rounded border border-teal-200">Prof. Colaborador</span>;
      case 'aluno':
        return <span className="px-2 py-0.5 text-[11px] font-semibold bg-sky-100 text-sky-800 rounded border border-sky-200">Aluno</span>;
      default:
        return null;
    }
  };

  const navItems = [
    { id: 'dashboard' as ActiveTab, label: 'Visão Geral', icon: LayoutDashboard },
    ...(!isAluno && !isProfessorColaborador ? [{ id: 'participantes' as ActiveTab, label: 'Participantes', icon: Users }] : []),
    { id: 'equipes' as ActiveTab, label: 'Equipes', icon: Briefcase },
    { id: 'jogos' as ActiveTab, label: 'Jogos', icon: Gamepad2 },
    { id: 'tarefas' as ActiveTab, label: 'Tarefas', icon: CheckSquare },
    { id: 'ias' as ActiveTab, label: 'IAs', icon: Cpu },
    { id: 'experimentos' as ActiveTab, label: 'Experimentos', icon: FlaskConical },
    { id: 'prompts' as ActiveTab, label: 'Prompts', icon: MessageSquareCode },
    { id: 'versoes' as ActiveTab, label: 'Versões', icon: GitCommit },
    { id: 'testes' as ActiveTab, label: 'Testes', icon: FlaskTest },
    { id: 'resultados' as ActiveTab, label: 'Resultados', icon: BarChart3 },
    { id: 'comparacao' as ActiveTab, label: 'Comparação IAs', icon: Scale },
    { id: 'cronograma' as ActiveTab, label: 'Cronograma', icon: Calendar },
    { id: 'documentacao' as ActiveTab, label: 'Documentação', icon: BookOpen },
    ...(!isAluno ? [{ id: 'historico' as ActiveTab, label: 'Histórico', icon: History }] : []),
    { id: 'relatorios' as ActiveTab, label: 'Relatórios', icon: FileText },
    { id: 'sistema' as ActiveTab, label: 'Sistema', icon: Info },
  ];

  return (
    <header className="bg-slate-900 text-slate-100 border-b border-slate-800 sticky top-0 z-30 shadow-xs">
      {/* Top institution and user row */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo & Title */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-indigo-600 flex items-center justify-center text-white font-black text-xl shadow-xs tracking-tight">
              N
            </div>
            <div>
              <div className="text-base font-bold tracking-tight text-white leading-tight">
                NexoIF
              </div>
              <div className="text-xs text-slate-400 font-medium">
                Gestão e Pesquisa em Jogos com IA
              </div>
            </div>
          </div>

          {/* User Profile & Switcher */}
          <div className="hidden md:flex items-center gap-4">
            {currentUser ? (
              <div className="relative">
                <button
                  onClick={() => setUserMenuOpen(!userMenuOpen)}
                  className="flex items-center gap-2.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700/80 border border-slate-700 text-sm transition-colors text-left"
                >
                  {firebaseUser?.photoURL ? (
                    <img
                      src={firebaseUser.photoURL}
                      alt={currentUser.nome}
                      referrerPolicy="no-referrer"
                      className="w-7 h-7 rounded-full object-cover ring-1 ring-indigo-400"
                    />
                  ) : (
                    <div className="w-7 h-7 rounded-full bg-slate-700 flex items-center justify-center text-indigo-400 font-semibold text-xs">
                      {currentUser.nome.substring(0, 2).toUpperCase()}
                    </div>
                  )}
                  <div className="flex flex-col">
                    <span className="text-xs font-medium text-slate-200 max-w-[140px] truncate">
                      {currentUser.nome}
                    </span>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      {getRoleBadge(currentUser.funcao)}
                    </div>
                  </div>
                  <ChevronDown className="w-4 h-4 text-slate-400 ml-1" />
                </button>

                {userMenuOpen && (
                  <div className="absolute right-0 mt-2 w-72 bg-white rounded-lg shadow-xl border border-slate-200 py-2 z-50 text-slate-800">
                    <div className="px-4 py-2 border-b border-slate-100">
                      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                        Perfil Ativo
                      </p>
                      <p className="text-sm font-bold text-slate-900 truncate">{currentUser.nome}</p>
                      <p className="text-xs text-slate-500 truncate">{currentUser.email}</p>
                      <div className="mt-1">{getRoleBadge(currentUser.funcao)}</div>
                    </div>

                    <div className="px-4 py-1.5 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                      Alternar Perfil para Teste
                    </div>

                    <div className="max-h-56 overflow-y-auto">
                      {usersList.map(u => (
                        <button
                          key={u.id}
                          onClick={() => {
                            switchUser(u.id);
                            setUserMenuOpen(false);
                          }}
                          className={`w-full text-left px-4 py-2 text-xs flex items-center justify-between hover:bg-slate-50 transition-colors ${
                            u.id === currentUser.id ? 'bg-indigo-50 font-medium text-indigo-900' : 'text-slate-700'
                          }`}
                        >
                          <div className="truncate">
                            <div className="truncate">{u.nome}</div>
                            <div className="text-[10px] text-slate-400 truncate">{u.email}</div>
                          </div>
                          <div className="shrink-0 ml-2">{getRoleBadge(u.funcao)}</div>
                        </button>
                      ))}
                    </div>

                    <div className="border-t border-slate-100 mt-2 pt-1">
                      <button
                        id="navbar-logout-btn"
                        onClick={() => {
                          setUserMenuOpen(false);
                          logout();
                        }}
                        className="w-full text-left px-4 py-2 text-xs font-semibold text-rose-700 hover:bg-rose-50 flex items-center gap-2 transition-colors"
                      >
                        <LogOut className="w-3.5 h-3.5 text-rose-600" />
                        Desconectar da Sessão
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-xs text-slate-400 flex items-center gap-1">
                <UserCircle className="w-4 h-4" /> Nenhum usuário conectado
              </div>
            )}
          </div>

          {/* Mobile menu button */}
          <div className="flex md:hidden items-center gap-2">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-md text-slate-400 hover:text-white hover:bg-slate-800 focus:outline-none"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Desktop Horizontal Navigation Tabs */}
      <div className="hidden md:block bg-slate-950 border-t border-slate-800/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <nav className="flex space-x-1 overflow-x-auto py-2 no-scrollbar">
            {navItems.map(item => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`flex items-center gap-2 px-3 py-1.5 text-xs font-medium rounded-md whitespace-nowrap transition-colors ${
                    isActive
                      ? 'bg-indigo-700 text-white shadow-xs'
                      : 'text-slate-300 hover:text-white hover:bg-slate-800'
                  }`}
                >
                  <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                  {item.label}
                </button>
              );
            })}
          </nav>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-slate-950 border-t border-slate-800 px-4 pt-2 pb-4 space-y-1">
          {currentUser && (
            <div className="p-3 mb-2 bg-slate-900 rounded-lg border border-slate-800">
              <div className="text-xs text-slate-400">Usuário ativo:</div>
              <div className="text-sm font-semibold text-white">{currentUser.nome}</div>
              <div className="mt-1">{getRoleBadge(currentUser.funcao)}</div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-1 py-2">
            {navItems.map(item => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    setActiveTab(item.id);
                    setMobileMenuOpen(false);
                  }}
                  className={`flex items-center gap-2 px-3 py-2 text-xs font-medium rounded-md transition-colors ${
                    isActive
                      ? 'bg-indigo-700 text-white'
                      : 'text-slate-300 hover:bg-slate-900'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {item.label}
                </button>
              );
            })}
          </div>

          {currentUser && (
            <div className="pt-2 border-t border-slate-800">
              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  logout();
                }}
                className="w-full py-2 px-3 flex items-center justify-center gap-2 text-xs font-semibold text-rose-400 bg-rose-950/40 border border-rose-800/60 rounded-md hover:bg-rose-900/60 transition-colors"
              >
                <LogOut className="w-4 h-4" />
                Desconectar da Sessão
              </button>
            </div>
          )}
        </div>
      )}
    </header>
  );
};
