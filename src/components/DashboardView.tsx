import React, { useEffect, useState } from 'react';
import { api } from '../services/api.js';
import { DashboardStats } from '../types.js';
import { useAuth } from '../context/AuthContext.js';
import {
  Gamepad2,
  Users,
  Briefcase,
  CheckCircle2,
  Clock,
  FlaskRound as FlaskTest,
  Calendar,
  History,
  TrendingUp,
  ShieldCheck,
  ArrowRight,
} from 'lucide-react';
import { ActiveTab } from './Navbar.js';
import { EmptyState } from './EmptyState.js';

interface DashboardViewProps {
  setActiveTab?: (tab: ActiveTab) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({ setActiveTab }) => {
  const { isAdmin } = useAuth();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  const loadStats = async () => {
    try {
      setLoading(true);
      const data = await api.getDashboard();
      setStats(data);
    } catch (err) {
      console.error('Failed to load dashboard', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStats();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-sm font-medium text-slate-500">Carregando dados do projeto...</div>
      </div>
    );
  }

  if (!stats) return null;

  const hasAnyData = stats.qtdJogos > 0 || stats.qtdParticipantes > 0 || stats.tarefasConcluidas > 0 || stats.tarefasPendentes > 0;

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="border-b border-slate-200 pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">
            Painel de Acompanhamento Acadêmico
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Indicadores operacionais e registro em tempo real das atividades do projeto de jogos com IA.
          </p>
        </div>

        {isAdmin && setActiveTab && (
          <button
            id="btn-goto-admin"
            onClick={() => setActiveTab('administracao')}
            className="inline-flex items-center gap-2 px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-lg shadow-xs transition-colors self-start sm:self-auto border border-slate-700"
          >
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            Painel de Administração
            <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
          </button>
        )}
      </div>

      {!hasAnyData && (
        <EmptyState
          message="Nenhum registro encontrado."
          subMessage="Cadastre o primeiro registro para começar. Comece cadastrando equipes, participantes e jogos."
          actionLabel="Ir para Jogos"
          onAction={() => setActiveTab('jogos')}
        />
      )}

      {/* Metrics Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
        {/* Progresso Geral */}
        <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold uppercase tracking-wider">
            <span>Progresso Geral</span>
            <TrendingUp className="w-4 h-4 text-indigo-600" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-slate-900">{stats.progressoGeralPercentual}%</span>
          </div>
          <div className="w-full bg-slate-100 rounded-full h-1.5 mt-3 overflow-hidden">
            <div
              className="bg-indigo-600 h-1.5 rounded-full transition-all duration-300"
              style={{ width: `${stats.progressoGeralPercentual}%` }}
            />
          </div>
        </div>

        {/* Quantidade de Jogos */}
        <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-xs cursor-pointer hover:border-slate-300 transition-colors" onClick={() => setActiveTab('jogos')}>
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold uppercase tracking-wider">
            <span>Jogos</span>
            <Gamepad2 className="w-4 h-4 text-slate-600" />
          </div>
          <div className="mt-2">
            <span className="text-2xl font-bold text-slate-900">{stats.qtdJogos}</span>
          </div>
          <p className="text-[11px] text-slate-500 mt-1">Em desenvolvimento / pesquisa</p>
        </div>

        {/* Quantidade de Participantes */}
        <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold uppercase tracking-wider">
            <span>Participantes</span>
            <Users className="w-4 h-4 text-slate-600" />
          </div>
          <div className="mt-2">
            <span className="text-2xl font-bold text-slate-900">{stats.qtdParticipantes}</span>
          </div>
          <p className="text-[11px] text-slate-500 mt-1">Pesquisadores e orientadores</p>
        </div>

        {/* Quantidade de Equipes */}
        <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-xs cursor-pointer hover:border-slate-300 transition-colors" onClick={() => setActiveTab('equipes')}>
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold uppercase tracking-wider">
            <span>Equipes</span>
            <Briefcase className="w-4 h-4 text-slate-600" />
          </div>
          <div className="mt-2">
            <span className="text-2xl font-bold text-slate-900">{stats.qtdEquipes}</span>
          </div>
          <p className="text-[11px] text-slate-500 mt-1">Grupos interdisciplinares</p>
        </div>

        {/* Tarefas Pendentes */}
        <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-xs cursor-pointer hover:border-slate-300 transition-colors" onClick={() => setActiveTab('tarefas')}>
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold uppercase tracking-wider">
            <span>Tarefas a Fazer</span>
            <Clock className="w-4 h-4 text-amber-600" />
          </div>
          <div className="mt-2">
            <span className="text-2xl font-bold text-amber-700">{stats.tarefasPendentes}</span>
          </div>
          <p className="text-[11px] text-slate-500 mt-1">Aguardando início</p>
        </div>

        {/* Tarefas em Andamento */}
        <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-xs cursor-pointer hover:border-slate-300 transition-colors" onClick={() => setActiveTab('tarefas')}>
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold uppercase tracking-wider">
            <span>Em Andamento</span>
            <Clock className="w-4 h-4 text-blue-600" />
          </div>
          <div className="mt-2">
            <span className="text-2xl font-bold text-blue-700">{stats.tarefasEmAndamento}</span>
          </div>
          <p className="text-[11px] text-slate-500 mt-1">Em execução ou revisão</p>
        </div>

        {/* Tarefas Concluídas */}
        <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-xs cursor-pointer hover:border-slate-300 transition-colors" onClick={() => setActiveTab('tarefas')}>
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold uppercase tracking-wider">
            <span>Tarefas Concluídas</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="mt-2">
            <span className="text-2xl font-bold text-emerald-700">{stats.tarefasConcluidas}</span>
          </div>
          <p className="text-[11px] text-slate-500 mt-1">Entregas validadas</p>
        </div>

        {/* Testes (Em andamento / Concluídos) */}
        <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-xs cursor-pointer hover:border-slate-300 transition-colors" onClick={() => setActiveTab('testes')}>
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold uppercase tracking-wider">
            <span>Baterias de Testes</span>
            <FlaskTest className="w-4 h-4 text-indigo-600" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-slate-900">{stats.testesEmAndamento}</span>
            <span className="text-xs text-slate-500">em andamento ({stats.testesConcluidos} conc.)</span>
          </div>
          <p className="text-[11px] text-slate-500 mt-1">Avaliações experimentais</p>
        </div>
      </div>

      {/* Two-Column Section: Próximas Atividades & Últimas Atividades */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
        {/* Próximas Atividades */}
        <div className="bg-white rounded-lg border border-slate-200 p-5 shadow-xs">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Calendar className="w-4 h-4 text-indigo-600" />
              Próximas Atividades
            </h2>
            <button
              onClick={() => setActiveTab('tarefas')}
              className="text-xs text-indigo-700 hover:text-indigo-900 font-medium"
            >
              Ver todas
            </button>
          </div>

          <div className="mt-4">
            {stats.proximasAtividades.length === 0 ? (
              <p className="text-xs text-slate-400 py-6 text-center italic">
                Nenhuma atividade pendente cadastrada no cronograma.
              </p>
            ) : (
              <div className="space-y-2.5">
                {stats.proximasAtividades.map(task => (
                  <div
                    key={task.id}
                    className="p-3 bg-slate-50 border border-slate-200 rounded-md flex items-center justify-between hover:bg-slate-100/70 transition-colors"
                  >
                    <div>
                      <div className="text-xs font-semibold text-slate-800">{task.titulo}</div>
                      <div className="text-[11px] text-slate-500 mt-0.5">
                        {task.jogoNome ? `Jogo: ${task.jogoNome} • ` : ''}
                        Responsável: {task.responsavelNome}
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <span className="text-[11px] font-mono font-medium text-slate-600 block">
                        Prazo: {task.prazo}
                      </span>
                      <span className={`inline-block px-1.5 py-0.5 text-[10px] font-medium rounded mt-1 ${
                        task.prioridade === 'Crítica' ? 'bg-rose-100 text-rose-800' :
                        task.prioridade === 'Alta' ? 'bg-amber-100 text-amber-800' :
                        'bg-slate-200 text-slate-700'
                      }`}>
                        {task.prioridade}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Últimas Atividades (Auditoria) */}
        <div className="bg-white rounded-lg border border-slate-200 p-5 shadow-xs">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <History className="w-4 h-4 text-indigo-600" />
              Últimas Atividades Registradas
            </h2>
            <button
              onClick={() => setActiveTab('historico')}
              className="text-xs text-indigo-700 hover:text-indigo-900 font-medium"
            >
              Ver histórico completo
            </button>
          </div>

          <div className="mt-4">
            {stats.ultimasAtividades.length === 0 ? (
              <p className="text-xs text-slate-400 py-6 text-center italic">
                Nenhuma atividade auditada recentemente.
              </p>
            ) : (
              <div className="space-y-2.5">
                {stats.ultimasAtividades.map(log => (
                  <div
                    key={log.id}
                    className="p-3 bg-slate-50 border border-slate-200 rounded-md text-xs flex items-start justify-between gap-3"
                  >
                    <div>
                      <div className="font-medium text-slate-800">
                        <span className="font-semibold text-indigo-900">{log.usuarioNome}</span>: {log.acao} - {log.registroAfetado}
                      </div>
                      <div className="text-slate-500 text-[11px] mt-0.5">
                        {log.alteracaoRealizada}
                      </div>
                    </div>
                    <span className="text-[10px] text-slate-400 font-mono whitespace-nowrap">
                      {log.data} {log.horario}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
