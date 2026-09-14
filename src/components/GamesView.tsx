import React, { useEffect, useState } from 'react';
import { api } from '../services/api.js';
import { Game, GameStatus, Team, Participant } from '../types.js';
import { useAuth } from '../context/AuthContext.js';
import { EmptyState } from './EmptyState.js';
import {
  Plus,
  Edit2,
  Trash2,
  ExternalLink,
  ChevronRight,
  ArrowLeft,
  Calendar,
  Layers,
  Cpu,
  FlaskConical,
  MessageSquareCode,
  CheckSquare,
  GitCommit,
  FlaskRound as FlaskTest,
  BarChart3,
  History,
  Users,
} from 'lucide-react';

export const GamesView: React.FC = () => {
  const { canManageAdmin } = useAuth();
  const [games, setGames] = useState<Game[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [loading, setLoading] = useState(true);

  // Status filter
  const [statusFilter, setStatusFilter] = useState<string>('todos');

  // Selected game for detailed view (Rule 10)
  const [selectedGameId, setSelectedGameId] = useState<string | null>(null);
  const [gameDetails, setGameDetails] = useState<any | null>(null);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [activeSubTab, setActiveSubTab] = useState<
    'geral' | 'equipe' | 'tarefas' | 'versoes' | 'ias' | 'experimentos' | 'prompts' | 'testes' | 'resultados' | 'historico'
  >('geral');

  // Modal create/edit
  const [modalOpen, setModalOpen] = useState(false);
  const [editingGame, setEditingGame] = useState<Game | null>(null);

  // Form states
  const [nome, setNome] = useState('');
  const [descricao, setDescricao] = useState('');
  const [objetivo, setObjetivo] = useState('');
  const [equipeId, setEquipeId] = useState('');
  const [participantesIds, setParticipantesIds] = useState<string[]>([]);
  const [tecnologiaUtilizada, setTecnologiaUtilizada] = useState('');
  const [versaoAtual, setVersaoAtual] = useState('v0.1');
  const [status, setStatus] = useState<GameStatus>('Planejamento');
  const [dataInicio, setDataInicio] = useState(new Date().toISOString().split('T')[0]);
  const [previsaoConclusao, setPrevisaoConclusao] = useState('');
  const [linkProjeto, setLinkProjeto] = useState('');
  const [observacoes, setObservacoes] = useState('');
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);

  const loadData = async () => {
    try {
      setLoading(true);
      const [gamesData, teamsData, partsData] = await Promise.all([
        api.getGames(),
        api.getTeams(),
        api.getParticipants(),
      ]);
      setGames(gamesData);
      setTeams(teamsData);
      setParticipants(partsData);
    } catch (err) {
      console.error('Failed to load games', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const loadGameDetails = async (id: string) => {
    try {
      setDetailsLoading(true);
      setSelectedGameId(id);
      const details = await api.getGameDetails(id);
      setGameDetails(details);
      setActiveSubTab('geral');
    } catch (err) {
      console.error('Failed to load game details', err);
    } finally {
      setDetailsLoading(false);
    }
  };

  const openCreateModal = () => {
    setEditingGame(null);
    setNome('');
    setDescricao('');
    setObjetivo('');
    setEquipeId(teams.length > 0 ? teams[0].id : '');
    setParticipantesIds(teams.length > 0 ? teams[0].participantesIds : []);
    setTecnologiaUtilizada('');
    setVersaoAtual('v0.1');
    setStatus('Planejamento');
    setDataInicio(new Date().toISOString().split('T')[0]);
    setPrevisaoConclusao('');
    setLinkProjeto('');
    setObservacoes('');
    setFormError('');
    setModalOpen(true);
  };

  const openEditModal = (g: Game) => {
    setEditingGame(g);
    setNome(g.nome);
    setDescricao(g.descricao);
    setObjetivo(g.objetivo);
    setEquipeId(g.equipeId);
    setParticipantesIds(g.participantesIds || []);
    setTecnologiaUtilizada(g.tecnologiaUtilizada || '');
    setVersaoAtual(g.versaoAtual || 'v0.1');
    setStatus(g.status);
    setDataInicio(g.dataInicio);
    setPrevisaoConclusao(g.previsaoConclusao || '');
    setLinkProjeto(g.linkProjeto || '');
    setObservacoes(g.observacoes || '');
    setFormError('');
    setModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nome.trim() || !equipeId) {
      setFormError('Nome do jogo e equipe responsável são obrigatórios.');
      return;
    }

    try {
      setSaving(true);
      setFormError('');

      const payload = {
        nome: nome.trim(),
        descricao: descricao.trim(),
        objetivo: objetivo.trim(),
        equipeId,
        participantesIds,
        tecnologiaUtilizada: tecnologiaUtilizada.trim(),
        versaoAtual: versaoAtual.trim(),
        status,
        dataInicio,
        previsaoConclusao,
        linkProjeto: linkProjeto.trim(),
        observacoes: observacoes.trim(),
      };

      if (editingGame) {
        await api.updateGame(editingGame.id, payload);
      } else {
        await api.createGame(payload);
      }

      setModalOpen(false);
      await loadData();
      if (selectedGameId) {
        await loadGameDetails(selectedGameId);
      }
    } catch (err: any) {
      setFormError(err.message || 'Erro ao salvar jogo.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (g: Game) => {
    if (!confirm(`Deseja excluir o jogo "${g.nome}"? Certifique-se de que não há dados acadêmicos vitais vinculados.`)) return;

    try {
      await api.deleteGame(g.id);
      if (selectedGameId === g.id) {
        setSelectedGameId(null);
        setGameDetails(null);
      }
      await loadData();
    } catch (err: any) {
      alert(err.message || 'Erro ao excluir jogo.');
    }
  };

  const getStatusBadge = (s: GameStatus) => {
    switch (s) {
      case 'Planejamento':
        return <span className="px-2 py-0.5 text-xs font-semibold bg-slate-100 text-slate-700 rounded border border-slate-200">Planejamento</span>;
      case 'Desenvolvimento':
        return <span className="px-2 py-0.5 text-xs font-semibold bg-blue-100 text-blue-800 rounded border border-blue-200">Desenvolvimento</span>;
      case 'Testes':
        return <span className="px-2 py-0.5 text-xs font-semibold bg-amber-100 text-amber-800 rounded border border-amber-200">Testes</span>;
      case 'Finalizado':
        return <span className="px-2 py-0.5 text-xs font-semibold bg-emerald-100 text-emerald-800 rounded border border-emerald-200">Finalizado</span>;
      case 'Arquivado':
        return <span className="px-2 py-0.5 text-xs font-semibold bg-slate-200 text-slate-600 rounded border border-slate-300">Arquivado</span>;
      default:
        return s;
    }
  };

  const filteredGames = games.filter(g => {
    if (statusFilter === 'todos') return true;
    return g.status === statusFilter;
  });

  if (loading) {
    return <div className="p-8 text-center text-sm text-slate-500">Carregando jogos...</div>;
  }

  // ==================== DETAILED GAME VIEW (Rule 10) ====================
  if (selectedGameId && gameDetails) {
    const { game, team, participants: gameParts, tasks, versions, aisUsed, experiments, prompts, testSuites, evaluations, auditHistory } = gameDetails;

    return (
      <div className="space-y-6">
        {/* Back Navigation & Title */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                setSelectedGameId(null);
                setGameDetails(null);
              }}
              className="p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-md transition-colors"
              title="Voltar para a lista de jogos"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold text-slate-900 tracking-tight">{game.nome}</h1>
                <span className="font-mono text-xs font-semibold px-2 py-0.5 bg-slate-100 text-slate-700 rounded">
                  {game.versaoAtual}
                </span>
                {getStatusBadge(game.status)}
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Equipe: <span className="font-medium text-slate-700">{game.equipeNome || 'Não informada'}</span> • Início: {game.dataInicio}
              </p>
            </div>
          </div>

          {canManageAdmin && (
            <button
              onClick={() => openEditModal(game)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold rounded-md transition-colors"
            >
              <Edit2 className="w-3.5 h-3.5" /> Editar Jogo
            </button>
          )}
        </div>

        {/* Detailed Tabs: 10 required sections */}
        <div className="border-b border-slate-200">
          <nav className="flex space-x-2 overflow-x-auto pb-1 no-scrollbar">
            {[
              { id: 'geral', label: 'Geral', icon: Layers },
              { id: 'equipe', label: `Equipe (${gameParts?.length || 0})`, icon: Users },
              { id: 'tarefas', label: `Tarefas (${tasks?.length || 0})`, icon: CheckSquare },
              { id: 'versoes', label: `Versões (${versions?.length || 0})`, icon: GitCommit },
              { id: 'ias', label: `IAs Utilizadas (${aisUsed?.length || 0})`, icon: Cpu },
              { id: 'experimentos', label: `Experimentos (${experiments?.length || 0})`, icon: FlaskConical },
              { id: 'prompts', label: `Prompts (${prompts?.length || 0})`, icon: MessageSquareCode },
              { id: 'testes', label: `Testes (${testSuites?.length || 0})`, icon: FlaskTest },
              { id: 'resultados', label: `Resultados (${evaluations?.length || 0})`, icon: BarChart3 },
              { id: 'historico', label: `Histórico (${auditHistory?.length || 0})`, icon: History },
            ].map(tab => {
              const Icon = tab.icon;
              const isActive = activeSubTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveSubTab(tab.id as any)}
                  className={`flex items-center gap-1.5 px-3 py-2 text-xs font-medium border-b-2 whitespace-nowrap transition-colors ${
                    isActive
                      ? 'border-indigo-700 text-indigo-900 font-semibold'
                      : 'border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  {tab.label}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Tab Content */}
        <div className="bg-white border border-slate-200 rounded-lg p-6 shadow-xs">
          {activeSubTab === 'geral' && (
            <div className="space-y-4 text-sm">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Objetivo do Jogo</h2>
                  <p className="mt-1 text-slate-800 leading-relaxed font-medium">
                    {game.objetivo || 'Nenhum objetivo detalhado cadastrado.'}
                  </p>
                </div>
                <div>
                  <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Tecnologia Utilizada</h2>
                  <p className="mt-1 text-slate-800 font-mono text-xs">
                    {game.tecnologiaUtilizada || 'Não especificada'}
                  </p>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100">
                <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Descrição Completa</h2>
                <p className="mt-1 text-slate-700 leading-relaxed">
                  {game.descricao || 'Sem descrição.'}
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-3 border-t border-slate-100 text-xs">
                <div>
                  <span className="text-slate-500">Data de Início:</span>
                  <div className="font-semibold text-slate-800 mt-0.5">{game.dataInicio}</div>
                </div>
                <div>
                  <span className="text-slate-500">Previsão de Conclusão:</span>
                  <div className="font-semibold text-slate-800 mt-0.5">{game.previsaoConclusao || 'A definir'}</div>
                </div>
                <div>
                  <span className="text-slate-500">Repositório / Link do Projeto:</span>
                  <div className="mt-0.5">
                    {game.linkProjeto ? (
                      <a
                        href={game.linkProjeto}
                        target="_blank"
                        rel="noreferrer"
                        className="text-indigo-600 hover:underline inline-flex items-center gap-1 font-medium truncate max-w-full"
                      >
                        Abrir projeto <ExternalLink className="w-3 h-3" />
                      </a>
                    ) : (
                      <span className="text-slate-400 italic">Não informado</span>
                    )}
                  </div>
                </div>
              </div>

              {game.observacoes && (
                <div className="pt-3 border-t border-slate-100">
                  <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Observações Acadêmicas</h2>
                  <p className="mt-1 text-xs text-slate-600 bg-slate-50 p-3 rounded border border-slate-200">
                    {game.observacoes}
                  </p>
                </div>
              )}
            </div>
          )}

          {activeSubTab === 'equipe' && (
            <div className="space-y-4">
              <div className="p-4 bg-slate-50 rounded border border-slate-200">
                <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Equipe Responsável</h3>
                <div className="text-base font-bold text-slate-900 mt-1">{team ? team.nome : 'Sem equipe'}</div>
                {team?.descricao && <p className="text-xs text-slate-600 mt-1">{team.descricao}</p>}
                {team?.areaAtuacao && <p className="text-xs text-indigo-700 font-medium mt-1">Área: {team.areaAtuacao}</p>}
              </div>

              <div>
                <h4 className="text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
                  Participantes Vinculados a este Jogo ({gameParts.length})
                </h4>
                {gameParts.length === 0 ? (
                  <EmptyState message="Nenhum participante vinculado a este jogo." subMessage="Vincule participantes através da edição do jogo ou da equipe." />
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {gameParts.map((p: Participant) => (
                      <div key={p.id} className="p-3 bg-white border border-slate-200 rounded-md shadow-2xs">
                        <div className="font-semibold text-slate-900 text-xs">{p.nome}</div>
                        <div className="text-slate-500 text-[11px] font-mono">{p.email}</div>
                        <span className="inline-block mt-1 text-[10px] font-semibold text-indigo-700 bg-indigo-50 px-1.5 py-0.5 rounded">
                          {p.funcao}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {activeSubTab === 'tarefas' && (
            <div className="space-y-3">
              <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Tarefas deste Jogo ({tasks.length})</h3>
              {tasks.length === 0 ? (
                <EmptyState message="Nenhum registro encontrado." subMessage="Nenhuma tarefa vinculada a este jogo no momento." />
              ) : (
                <div className="space-y-2">
                  {tasks.map((t: any) => (
                    <div key={t.id} className="p-3 border border-slate-200 rounded-md flex items-center justify-between text-xs hover:bg-slate-50">
                      <div>
                        <div className="font-semibold text-slate-900">{t.titulo}</div>
                        <div className="text-slate-500 text-[11px] mt-0.5">Responsável: {t.responsavelNome} • Prazo: {t.prazo}</div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 bg-slate-100 text-slate-700 rounded text-[11px]">{t.prioridade}</span>
                        <span className="px-2 py-0.5 bg-indigo-50 text-indigo-800 font-medium rounded text-[11px]">{t.status}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeSubTab === 'versoes' && (
            <div className="space-y-3">
              <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Histórico de Versões do Jogo ({versions.length})</h3>
              {versions.length === 0 ? (
                <EmptyState message="Nenhum registro encontrado." subMessage="Cadastre o primeiro registro para começar." />
              ) : (
                <div className="space-y-3">
                  {versions.map((v: any) => (
                    <div key={v.id} className="p-4 border border-slate-200 rounded-md bg-slate-50/50">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-bold text-indigo-900 font-mono">{v.numero}</span>
                          <span className="text-xs text-slate-500">Data: {v.data}</span>
                        </div>
                        <span className="text-xs text-slate-600 font-medium">Por: {v.responsavelNome}</span>
                      </div>
                      {v.alteracoes && <p className="text-xs text-slate-700 mt-2"><strong>Alterações:</strong> {v.alteracoes}</p>}
                      {v.funcionalidadesAdicionadas && <p className="text-xs text-emerald-800 mt-1"><strong>Funcionalidades:</strong> {v.funcionalidadesAdicionadas}</p>}
                      {v.bugsCorrigidos && <p className="text-xs text-rose-800 mt-1"><strong>Bugs Corrigidos:</strong> {v.bugsCorrigidos}</p>}
                      {v.linkArquivo && (
                        <div className="mt-2">
                          <a href={v.linkArquivo} target="_blank" rel="noreferrer" className="text-xs text-indigo-600 hover:underline inline-flex items-center gap-1">
                            Link / Arquivo da versão <ExternalLink className="w-3 h-3" />
                          </a>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeSubTab === 'ias' && (
            <div className="space-y-3">
              <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Modelos de IA Empregados neste Jogo ({aisUsed.length})</h3>
              {aisUsed.length === 0 ? (
                <EmptyState message="Nenhum registro encontrado." subMessage="Nenhum experimento com IA registrado para este jogo até o momento." />
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {aisUsed.map((ai: any) => (
                    <div key={ai.id} className="p-4 border border-slate-200 rounded-md bg-white">
                      <div className="font-bold text-slate-900 text-sm">{ai.nome}</div>
                      <div className="text-xs text-indigo-800 font-medium">{ai.empresaProvedor} • {ai.modelo}</div>
                      <p className="text-xs text-slate-600 mt-1">{ai.finalidade}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeSubTab === 'experimentos' && (
            <div className="space-y-3">
              <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Experimentos Acadêmicos com IA ({experiments.length})</h3>
              {experiments.length === 0 ? (
                <EmptyState message="Nenhum registro encontrado." subMessage="Cadastre o primeiro registro para começar." />
              ) : (
                <div className="space-y-3">
                  {experiments.map((exp: any) => (
                    <div key={exp.id} className="p-4 border border-slate-200 rounded-md bg-slate-50/50 space-y-2 text-xs">
                      <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                        <div>
                          <span className="font-bold text-slate-900">{exp.tarefaRealizada || 'Experimento'}</span>
                          <span className="text-slate-500 ml-2">IA: {exp.iaNome} ({exp.modelo})</span>
                        </div>
                        <span className="font-semibold text-indigo-900 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200">
                          Avaliação: {exp.avaliacao}/5
                        </span>
                      </div>
                      <p className="text-slate-700"><strong>Finalidade:</strong> {exp.finalidade}</p>
                      <div className="bg-white p-2.5 rounded border border-slate-200 font-mono text-[11px] text-slate-800 whitespace-pre-wrap">
                        <strong>Prompt Utilizado:</strong><br />{exp.prompt}
                      </div>
                      <p className="text-slate-700"><strong>Resultado Obtido:</strong> {exp.resultadoObtido}</p>
                      {exp.alteracoesManuais && (
                        <p className="text-slate-700"><strong>Alterações Manuais:</strong> {exp.alteracoesManuais}</p>
                      )}
                      {exp.problemasEncontrados && (
                        <p className="text-rose-700"><strong>Problemas:</strong> {exp.problemasEncontrados}</p>
                      )}
                      <div className="text-slate-400 text-[10px] pt-1">
                        Responsável: {exp.alunoResponsavelNome} • Data: {exp.data} • Tempo: {exp.tempoAproximadoMinutos} min
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeSubTab === 'prompts' && (
            <div className="space-y-3">
              <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Prompts Registrados para este Jogo ({prompts.length})</h3>
              {prompts.length === 0 ? (
                <EmptyState message="Nenhum registro encontrado." subMessage="Cadastre o primeiro registro para começar." />
              ) : (
                <div className="space-y-3">
                  {prompts.map((p: any) => (
                    <div key={p.id} className="p-3 border border-slate-200 rounded-md bg-white text-xs space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-slate-900">{p.titulo}</span>
                        <span className="px-2 py-0.5 bg-slate-100 text-slate-700 rounded text-[10px] font-semibold">{p.categoria}</span>
                      </div>
                      <pre className="bg-slate-50 p-2 rounded border border-slate-200 font-mono text-[11px] text-slate-800 whitespace-pre-wrap">
                        {p.promptCompleto}
                      </pre>
                      <div className="text-slate-500 text-[11px]">
                        Autor: {p.autorNome} • IA: {p.iaNome} • Avaliação: {p.avaliacao}/5
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeSubTab === 'testes' && (
            <div className="space-y-3">
              <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Baterias de Testes ({testSuites.length})</h3>
              {testSuites.length === 0 ? (
                <EmptyState message="Nenhum registro encontrado." subMessage="Cadastre o primeiro registro para começar." />
              ) : (
                <div className="space-y-3">
                  {testSuites.map((ts: any) => (
                    <div key={ts.id} className="p-4 border border-slate-200 rounded-md bg-white text-xs space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-slate-900 text-sm">{ts.nome}</span>
                        <span className="px-2 py-0.5 bg-indigo-50 text-indigo-800 font-semibold rounded">{ts.status}</span>
                      </div>
                      <p className="text-slate-600"><strong>Objetivo:</strong> {ts.objetivo}</p>
                      <div className="flex flex-wrap gap-1">
                        <span className="text-slate-400 mr-1">Critérios:</span>
                        {ts.criterios.map((c: string) => (
                          <span key={c} className="px-1.5 py-0.5 bg-slate-100 text-slate-700 rounded text-[10px]">{c}</span>
                        ))}
                      </div>
                      <div className="text-slate-400 text-[10px]">
                        Período: {ts.dataInicial} até {ts.dataFinal || 'Indefinido'} • Responsável: {ts.responsavelNome}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeSubTab === 'resultados' && (
            <div className="space-y-4">
              <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Avaliações e Resultados deste Jogo ({evaluations.length})</h3>
              {evaluations.length === 0 ? (
                <div className="p-6 bg-slate-50 border border-slate-200 rounded-lg text-center">
                  <p className="text-xs text-slate-500 italic">«Dados insuficientes para gerar esta análise.»</p>
                  <p className="text-[11px] text-slate-400 mt-1">Nenhuma avaliação de teste registrada para este jogo.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {evaluations.map((ev: any) => (
                    <div key={ev.id} className="p-4 border border-slate-200 rounded-md bg-white text-xs space-y-2">
                      <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                        <span className="font-semibold text-slate-900">Avaliador: {ev.participanteNome}</span>
                        <span className="text-slate-400 text-[10px]">{ev.data}</span>
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 py-1">
                        {Object.entries(ev.notas).map(([crit, nota]: [string, any]) => (
                          <div key={crit} className="bg-slate-50 p-2 rounded border border-slate-200 text-center">
                            <span className="text-[10px] text-slate-500 block truncate">{crit}</span>
                            <span className="font-bold text-slate-900 text-sm">{nota}/5</span>
                          </div>
                        ))}
                      </div>
                      {ev.comentarios && <p className="text-slate-700"><strong>Comentários:</strong> {ev.comentarios}</p>}
                      {ev.problemas && <p className="text-rose-700"><strong>Problemas:</strong> {ev.problemas}</p>}
                      {ev.sugestoes && <p className="text-indigo-700"><strong>Sugestões:</strong> {ev.sugestoes}</p>}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeSubTab === 'historico' && (
            <div className="space-y-3">
              <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Histórico de Auditoria do Jogo ({auditHistory.length})</h3>
              {auditHistory.length === 0 ? (
                <EmptyState message="Nenhum registro encontrado." subMessage="Nenhuma ação auditada diretamente para este jogo." />
              ) : (
                <div className="space-y-2">
                  {auditHistory.map((a: any) => (
                    <div key={a.id} className="p-3 border border-slate-200 rounded-md text-xs flex items-start justify-between gap-3">
                      <div>
                        <div className="font-semibold text-slate-900">
                          {a.usuarioNome}: {a.acao} - {a.registroAfetado}
                        </div>
                        <div className="text-slate-500 text-[11px] mt-0.5">{a.alteracaoRealizada}</div>
                      </div>
                      <span className="text-[10px] text-slate-400 font-mono whitespace-nowrap">
                        {a.data} {a.horario}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    );
  }

  // ==================== LIST OF GAMES VIEW ====================
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">Jogos Desenvolvidos com IA</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Catálogo dos projetos de jogos, tecnologias, versões e acompanhamento experimental.
          </p>
        </div>

        {canManageAdmin && (
          <button
            onClick={openCreateModal}
            className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-900 hover:bg-indigo-800 text-white text-xs font-semibold rounded-md shadow-xs transition-colors self-start sm:self-auto"
          >
            <Plus className="w-4 h-4" />
            Novo Jogo
          </button>
        )}
      </div>

      {/* Filter by status */}
      <div className="flex items-center gap-2 text-xs">
        <span className="text-slate-500 font-medium">Filtrar por Status:</span>
        <div className="flex flex-wrap gap-1.5">
          {['todos', 'Planejamento', 'Desenvolvimento', 'Testes', 'Finalizado', 'Arquivado'].map(st => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-2.5 py-1 rounded-md font-medium transition-colors ${
                statusFilter === st
                  ? 'bg-slate-900 text-white'
                  : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
            >
              {st === 'todos' ? 'Todos' : st}
            </button>
          ))}
        </div>
      </div>

      {filteredGames.length === 0 ? (
        <EmptyState
          message="Nenhum registro encontrado."
          subMessage="Cadastre o primeiro registro para começar."
          actionLabel={canManageAdmin ? 'Cadastrar Novo Jogo' : undefined}
          onAction={canManageAdmin ? openCreateModal : undefined}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredGames.map(g => (
            <div
              key={g.id}
              className="bg-white border border-slate-200 rounded-lg p-5 shadow-xs flex flex-col justify-between hover:border-slate-300 transition-colors"
            >
              <div>
                <div className="flex items-start justify-between gap-2">
                  <h2 className="text-base font-bold text-slate-900 leading-snug">{g.nome}</h2>
                  {getStatusBadge(g.status)}
                </div>

                <div className="mt-1 flex items-center gap-2 text-xs">
                  <span className="font-mono font-medium text-indigo-900 bg-indigo-50 px-1.5 py-0.5 rounded">
                    {g.versaoAtual}
                  </span>
                  <span className="text-slate-400">•</span>
                  <span className="text-slate-600 font-medium">{g.equipeNome || 'Equipe a definir'}</span>
                </div>

                <p className="mt-2 text-xs text-slate-600 leading-relaxed line-clamp-2">
                  {g.objetivo || g.descricao || 'Sem objetivo detalhado.'}
                </p>

                <div className="mt-4 pt-3 border-t border-slate-100 space-y-1.5 text-xs text-slate-500">
                  <div>
                    <span className="font-medium">Tecnologia: </span>
                    <span className="text-slate-800">{g.tecnologiaUtilizada || 'Não especificada'}</span>
                  </div>
                  <div>
                    <span className="font-medium">Início: </span>
                    <span className="text-slate-800">{g.dataInicio}</span>
                  </div>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                <button
                  onClick={() => loadGameDetails(g.id)}
                  className="text-xs font-semibold text-indigo-900 hover:text-indigo-700 inline-flex items-center gap-1"
                >
                  Ver Detalhes do Jogo <ChevronRight className="w-3.5 h-3.5" />
                </button>

                {canManageAdmin && (
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => openEditModal(g)}
                      title="Editar Jogo"
                      className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded transition-colors"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleDelete(g)}
                      title="Excluir Jogo"
                      className="p-1.5 text-slate-400 hover:text-rose-700 hover:bg-rose-50 rounded transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal Cadastrar / Editar Jogo */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-white rounded-xl shadow-xl border border-slate-200 w-full max-w-xl max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between sticky top-0 z-10">
              <h2 className="text-base font-bold text-slate-900">
                {editingGame ? 'Editar Jogo' : 'Novo Jogo'}
              </h2>
              <button
                onClick={() => setModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 text-lg leading-none"
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleSave} className="p-6 space-y-4">
              {formError && (
                <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-md">
                  {formError}
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Nome do Jogo *
                </label>
                <input
                  type="text"
                  required
                  value={nome}
                  onChange={e => setNome(e.target.value)}
                  placeholder="Ex: ChronoQuest AI"
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-600"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Objetivo do Jogo *
                </label>
                <textarea
                  rows={2}
                  required
                  value={objetivo}
                  onChange={e => setObjetivo(e.target.value)}
                  placeholder="Objetivo principal, gênero e proposta de pesquisa..."
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-600"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Descrição do Jogo
                </label>
                <textarea
                  rows={2}
                  value={descricao}
                  onChange={e => setDescricao(e.target.value)}
                  placeholder="Descrição geral do projeto..."
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-600"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    Equipe Responsável *
                  </label>
                  <select
                    value={equipeId}
                    onChange={e => setEquipeId(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-indigo-600"
                  >
                    {teams.length === 0 && <option value="">Nenhuma equipe cadastrada</option>}
                    {teams.map(t => (
                      <option key={t.id} value={t.id}>
                        {t.nome}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    Status
                  </label>
                  <select
                    value={status}
                    onChange={e => setStatus(e.target.value as GameStatus)}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-indigo-600"
                  >
                    <option value="Planejamento">Planejamento</option>
                    <option value="Desenvolvimento">Desenvolvimento</option>
                    <option value="Testes">Testes</option>
                    <option value="Finalizado">Finalizado</option>
                    <option value="Arquivado">Arquivado</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    Tecnologia Utilizada
                  </label>
                  <input
                    type="text"
                    value={tecnologiaUtilizada}
                    onChange={e => setTecnologiaUtilizada(e.target.value)}
                    placeholder="Ex: Unity, Godot, Unreal, Phaser"
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-600"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    Versão Atual
                  </label>
                  <input
                    type="text"
                    value={versaoAtual}
                    onChange={e => setVersaoAtual(e.target.value)}
                    placeholder="Ex: v0.1"
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-600"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    Data de Início
                  </label>
                  <input
                    type="date"
                    value={dataInicio}
                    onChange={e => setDataInicio(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-600"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    Previsão de Conclusão
                  </label>
                  <input
                    type="date"
                    value={previsaoConclusao}
                    onChange={e => setPrevisaoConclusao(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-600"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Link do Projeto (Repositório / Build / Drive)
                </label>
                <input
                  type="url"
                  value={linkProjeto}
                  onChange={e => setLinkProjeto(e.target.value)}
                  placeholder="https://github.com/... ou https://..."
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-600"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Observações
                </label>
                <textarea
                  rows={2}
                  value={observacoes}
                  onChange={e => setObservacoes(e.target.value)}
                  placeholder="Notas adicionais sobre o desenvolvimento..."
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-600"
                />
              </div>

              <div className="pt-4 flex items-center justify-end gap-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 rounded-md transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-2 text-xs font-semibold text-white bg-indigo-900 hover:bg-indigo-800 rounded-md transition-colors shadow-xs disabled:opacity-50"
                >
                  {saving ? 'Salvando...' : 'Salvar Jogo'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
