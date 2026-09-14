import React, { useState, useEffect } from 'react';
import { ShieldAlert, ArrowLeft } from 'lucide-react';
import { AuthProvider, useAuth } from './context/AuthContext.js';
import { ThemeProvider } from './context/ThemeContext.js';
import { Navbar, ActiveTab } from './components/Navbar.js';
import { InitialSetup } from './components/InitialSetup.js';
import { AuthView } from './components/AuthView.js';
import { DashboardView } from './components/DashboardView.js';
import { ParticipantsView } from './components/ParticipantsView.js';
import { TeamsView } from './components/TeamsView.js';
import { GamesView } from './components/GamesView.js';
import { TasksView } from './components/TasksView.js';
import { AIsView } from './components/AIsView.js';
import { ExperimentsView } from './components/ExperimentsView.js';
import { PromptsView } from './components/PromptsView.js';
import { VersionsView } from './components/VersionsView.js';
import { TestsView } from './components/TestsView.js';
import { ResultsView } from './components/ResultsView.js';
import { AIComparisonView } from './components/AIComparisonView.js';
import { ScheduleView } from './components/ScheduleView.js';
import { DocumentsView } from './components/DocumentsView.js';
import { HistoryView } from './components/HistoryView.js';
import { ReportsView } from './components/ReportsView.js';
import { SystemInfoView } from './components/SystemInfoView.js';
import { UserRole } from './types.js';

const VALID_TABS: ActiveTab[] = [
  'dashboard',
  'participantes',
  'equipes',
  'jogos',
  'tarefas',
  'ias',
  'experimentos',
  'prompts',
  'versoes',
  'testes',
  'resultados',
  'comparacao',
  'cronograma',
  'documentacao',
  'historico',
  'relatorios',
  'sistema',
];

// Helper to check route permissions based on UserRole
const checkTabPermission = (tab: ActiveTab, role?: UserRole): { allowed: boolean; reason?: string } => {
  if (!role) return { allowed: false, reason: 'Usuário não autenticado.' };

  if (tab === 'participantes' && (role === 'aluno' || role === 'professor_colaborador')) {
    return {
      allowed: false,
      reason: 'O módulo de Participantes é restrito ao Coordenador Aluno e ao Professor Orientador.',
    };
  }

  if (tab === 'historico' && role === 'aluno') {
    return {
      allowed: false,
      reason: 'O registro de auditoria e histórico de logs é restrito aos perfis de coordenação e docentes.',
    };
  }

  return { allowed: true };
};

const AccessDeniedView: React.FC<{
  tab: ActiveTab;
  roleLabel: string;
  reason?: string;
  onGoBack: () => void;
}> = ({ tab, roleLabel, reason, onGoBack }) => (
  <div className="bg-white rounded-xl border border-red-200 shadow-sm p-8 text-center max-w-lg mx-auto my-12">
    <div className="w-14 h-14 bg-red-50 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4 ring-8 ring-red-50/50">
      <ShieldAlert className="w-7 h-7" />
    </div>
    <h2 className="text-xl font-bold text-slate-800 mb-2">Acesso Restrito</h2>
    <p className="text-sm text-slate-600 mb-4">
      {reason || `Seu perfil atual (${roleLabel}) não possui permissão para acessar o módulo "${tab}".`}
    </p>
    <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-500 mb-6 text-left">
      <div className="font-semibold text-slate-700 mb-1">Diretrizes de Segurança RBAC NexoIF:</div>
      <p>
        As permissões de acesso são validadas de acordo com a sua função acadêmica cadastrada no Firestore e autenticada via Firebase Auth.
      </p>
    </div>
    <button
      id="btn-return-dashboard"
      onClick={onGoBack}
      className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-sm transition-colors"
    >
      <ArrowLeft className="w-4 h-4" />
      Voltar para a Visão Geral
    </button>
  </div>
);

const ProfileUndefinedErrorView: React.FC<{
  userEmail?: string;
  onLogout: () => void;
  onRetry: () => void;
}> = ({ userEmail, onLogout, onRetry }) => (
  <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
    <div className="bg-white rounded-2xl border border-red-200 shadow-xl p-8 text-center max-w-lg w-full">
      <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4 ring-8 ring-red-50">
        <ShieldAlert className="w-8 h-8" />
      </div>
      <h2 className="text-xl font-bold text-slate-800 mb-2">Perfil Não Autorizado ou Indefinido</h2>
      <p className="text-sm text-slate-600 mb-4">
        A conta Google {userEmail ? <strong className="text-slate-800">({userEmail})</strong> : ''} foi autenticada, porém não possui um perfil acadêmico válido configurado na coleção do Firestore ou foi desativada.
      </p>
      <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-600 mb-6 text-left space-y-2">
        <div className="font-semibold text-slate-800">Procedimento para Liberação de Acesso:</div>
        <ul className="list-disc list-inside space-y-1 text-slate-500">
          <li>Solicite ao <strong>Coordenador Aluno</strong> ou ao <strong>Professor Orientador</strong> o cadastro do seu e-mail institucional no NexoIF.</li>
          <li>Após a vinculação do perfil acadêmico no Firestore (Coordenador, Professor ou Aluno), clique em "Tentar Novamente".</li>
        </ul>
      </div>
      <div className="flex flex-col sm:flex-row gap-3 justify-center">
        <button
          id="btn-retry-auth"
          onClick={onRetry}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-sm transition-colors"
        >
          Tentar Novamente
        </button>
        <button
          id="btn-logout-unauthorized"
          onClick={onLogout}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors"
        >
          Desconectar Conta
        </button>
      </div>
    </div>
  </div>
);

const MainLayout: React.FC = () => {
  const { currentUser, roleLabel, needsSetup, refreshAuth, logout, isLoading } = useAuth();
  const [activeTab, setActiveTabState] = useState<ActiveTab>(() => {
    const hash = window.location.hash.replace('#/', '').replace('#', '');
    return (VALID_TABS.includes(hash as ActiveTab) ? (hash as ActiveTab) : 'dashboard');
  });

  const [redirectAfterLogin, setRedirectAfterLogin] = useState<ActiveTab | null>(null);

  // Sync state with URL hash and protect routes
  useEffect(() => {
    const handleHashChange = () => {
      const raw = window.location.hash.replace('#/', '').replace('#', '');
      if (raw === 'login' || !raw) return;

      if (VALID_TABS.includes(raw as ActiveTab)) {
        if (!currentUser) {
          // If unauthenticated user attempts to access internal route, redirect to login
          setRedirectAfterLogin(raw as ActiveTab);
          window.location.hash = '#/login';
        } else {
          setActiveTabState(raw as ActiveTab);
        }
      }
    };

    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, [currentUser]);

  // When user is authenticated, reflect activeTab in the URL hash
  const setActiveTab = (tab: ActiveTab) => {
    setActiveTabState(tab);
    window.location.hash = `#/${tab}`;
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
        <div className="text-center space-y-3">
          <div className="w-10 h-10 border-3 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-xs font-semibold text-slate-300">Validando autenticação e permissões no Firestore...</p>
        </div>
      </div>
    );
  }

  // First-time setup screen (First User)
  if (needsSetup) {
    return <InitialSetup onSetupCompleted={refreshAuth} />;
  }

  // Mandatory Authentication Enforcement:
  // Unauthenticated users ONLY see login/registration/recovery. Zero internal system data is shown.
  if (!currentUser) {
    return (
      <AuthView
        onLoginSuccess={() => {
          if (redirectAfterLogin) {
            setActiveTab(redirectAfterLogin);
            setRedirectAfterLogin(null);
          } else {
            setActiveTab('dashboard');
          }
        }}
      />
    );
  }

  // Validate that currentUser profile has a valid defined role and active status
  const validRoles: UserRole[] = ['coordenador_aluno', 'professor_orientador', 'professor_colaborador', 'aluno'];
  const isProfileValid = currentUser.funcao && validRoles.includes(currentUser.funcao) && currentUser.status !== 'Inativo';

  if (!isProfileValid) {
    return (
      <ProfileUndefinedErrorView
        userEmail={currentUser.email}
        onLogout={logout}
        onRetry={refreshAuth}
      />
    );
  }

  // Permission verification for activeTab
  const permission = checkTabPermission(activeTab, currentUser.funcao);

  const renderContent = () => {
    if (!permission.allowed) {
      return (
        <AccessDeniedView
          tab={activeTab}
          roleLabel={roleLabel}
          reason={permission.reason}
          onGoBack={() => setActiveTab('dashboard')}
        />
      );
    }

    switch (activeTab) {
      case 'dashboard':
        return <DashboardView setActiveTab={setActiveTab} />;
      case 'participantes':
        return <ParticipantsView />;
      case 'equipes':
        return <TeamsView />;
      case 'jogos':
        return <GamesView />;
      case 'tarefas':
        return <TasksView />;
      case 'ias':
        return <AIsView />;
      case 'experimentos':
        return <ExperimentsView />;
      case 'prompts':
        return <PromptsView />;
      case 'versoes':
        return <VersionsView />;
      case 'testes':
        return <TestsView />;
      case 'resultados':
        return <ResultsView />;
      case 'comparacao':
        return <AIComparisonView />;
      case 'cronograma':
        return <ScheduleView />;
      case 'documentacao':
        return <DocumentsView />;
      case 'historico':
        return <HistoryView />;
      case 'relatorios':
        return <ReportsView />;
      case 'sistema':
        return <SystemInfoView />;
      default:
        return <DashboardView setActiveTab={setActiveTab} />;
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900 flex flex-col antialiased">
      <Navbar activeTab={activeTab} setActiveTab={setActiveTab} />
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {renderContent()}
      </main>
      <footer className="bg-white border-t border-slate-200 py-4 text-center text-xs text-slate-500">
        NexoIF • Plataforma Oficial de Gestão e Pesquisa em Jogos com Inteligência Artificial • Curso de Sistemas de Informação
      </footer>
    </div>
  );
};

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <MainLayout />
      </AuthProvider>
    </ThemeProvider>
  );
}
