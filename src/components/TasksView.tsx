import React, { useEffect, useState } from 'react';
import { api } from '../services/api.js';
import { Task, TaskPriority, TaskStatus, Participant, Team, Game } from '../types.js';
import { useAuth } from '../context/AuthContext.js';
import { EmptyState } from './EmptyState.js';
import {
  Plus,
  LayoutList,
  Kanban,
  Edit2,
  Trash2,
  CheckCircle,
  Clock,
  AlertCircle,
  ChevronDown,
} from 'lucide-react';

export const TasksView: React.FC = () => {
  const { currentUser, canManageAdmin, isAluno } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [games, setGames] = useState<Game[]>([]);
  const [loading, setLoading] = useState(true);

  // View mode: lista or kanban
  const [viewMode, setViewMode] = useState<'lista' | 'kanban'>('kanban');

  // Modal create/edit
  const [modalOpen, setModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);

  // Form states
  const [titulo, setTitulo] = useState('');
  const [descricao, setDescricao] = useState('');
  const [responsavelId, setResponsavelId] = useState('');
  const [equipeId, setEquipeId] = useState('');
  const [jogoId, setJogoId] = useState('');
  const [prioridade, setPrioridade] = useState<TaskPriority>('Média');
  const [status, setStatus] = useState<TaskStatus>('A fazer');
  const [prazo, setPrazo] = useState(new Date().toISOString().split('T')[0]);
  const [dataConclusao, setDataConclusao] = useState('');
  const [observacoes, setObservacoes] = useState('');
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);

  // Status transition to 'Concluída' modal
  const [completionModalTask, setCompletionModalTask] = useState<Task | null>(null);
  const [completionDateInput, setCompletionDateInput] = useState(new Date().toISOString().split('T')[0]);
  const [completionNotesInput, setCompletionNotesInput] = useState('');
  const [completionError, setCompletionError] = useState('');
  const [completionSaving, setCompletionSaving] = useState(false);

  const loadData = async () => {
    try {
      setLoading(true);
      const [tasksData, partsData, teamsData, gamesData] = await Promise.all([
        api.getTasks(),
        api.getParticipants(),
        api.getTeams(),
        api.getGames(),
      ]);
      setTasks(tasksData);
      setParticipants(partsData);
      setTeams(teamsData);
      setGames(gamesData);
    } catch (err) {
      console.error('Failed to load tasks', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const openCreateModal = () => {
    setEditingTask(null);
    setTitulo('');
    setDescricao('');
    setResponsavelId(currentUser?.id || (participants.length > 0 ? participants[0].id : ''));
    setEquipeId(teams.length > 0 ? teams[0].id : '');
    setJogoId(games.length > 0 ? games[0].id : '');
    setPrioridade('Média');
    setStatus('A fazer');
    setPrazo(new Date().toISOString().split('T')[0]);
    setDataConclusao('');
    setObservacoes('');
    setFormError('');
    setModalOpen(true);
  };

  const openEditModal = (t: Task) => {
    setEditingTask(t);
    setTitulo(t.titulo);
    setDescricao(t.descricao);
    setResponsavelId(t.responsavelId);
    setEquipeId(t.equipeId || '');
    setJogoId(t.jogoId || '');
    setPrioridade(t.prioridade);
    setStatus(t.status);
    setPrazo(t.prazo);
    setDataConclusao(t.dataConclusao || (t.status === 'Concluída' ? new Date().toISOString().split('T')[0] : ''));
    setObservacoes(t.observacoes || '');
    setFormError('');
    setModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!titulo.trim() || !responsavelId) {
      setFormError('Título e responsável são obrigatórios.');
      return;
    }

    if (status === 'Concluída' && !dataConclusao.trim()) {
      setFormError("A regra de transição exige o preenchimento da Data de Conclusão para tarefas com status 'Concluída'.");
      return;
    }

    try {
      setSaving(true);
      setFormError('');

      const payload = {
        titulo: titulo.trim(),
        descricao: descricao.trim(),
        responsavelId,
        equipeId: equipeId || undefined,
        jogoId: jogoId || undefined,
        prioridade,
        status,
        prazo,
        dataConclusao: status === 'Concluída' ? dataConclusao.trim() : undefined,
        observacoes: observacoes.trim(),
      };

      if (editingTask) {
        await api.updateTask(editingTask.id, payload);
      } else {
        await api.createTask(payload);
      }

      setModalOpen(false);
      await loadData();
    } catch (err: any) {
      setFormError(err.message || 'Erro ao salvar tarefa.');
    } finally {
      setSaving(false);
    }
  };

  const handleQuickStatus = async (task: Task, newStatus: TaskStatus) => {
    if (newStatus === 'Concluída') {
      setCompletionModalTask(task);
      setCompletionDateInput(task.dataConclusao || new Date().toISOString().split('T')[0]);
      setCompletionNotesInput(task.observacoes || '');
      setCompletionError('');
      return;
    }

    try {
      await api.updateTaskStatus(task.id, newStatus);
      await loadData();
    } catch (err: any) {
      alert(err.message || 'Erro ao atualizar status da tarefa.');
    }
  };

  const handleConfirmCompletion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!completionModalTask) return;

    if (!completionDateInput.trim()) {
      setCompletionError('A data de conclusão é estritamente obrigatória para concluir uma tarefa.');
      return;
    }

    try {
      setCompletionSaving(true);
      setCompletionError('');
      await api.updateTaskStatus(
        completionModalTask.id,
        'Concluída',
        completionDateInput.trim(),
        completionNotesInput.trim() || undefined
      );
      setCompletionModalTask(null);
      await loadData();
    } catch (err: any) {
      setCompletionError(err.message || 'Erro ao concluir tarefa.');
    } finally {
      setCompletionSaving(false);
    }
  };

  const handleDelete = async (t: Task) => {
    if (!confirm(`Deseja excluir a tarefa "${t.titulo}"?`)) return;
    try {
      await api.deleteTask(t.id);
      await loadData();
    } catch (err: any) {
      alert(err.message || 'Erro ao excluir tarefa.');
    }
  };

  const getPriorityBadge = (p: TaskPriority) => {
    switch (p) {
      case 'Crítica':
        return <span className="px-1.5 py-0.5 text-[10px] font-bold bg-rose-100 text-rose-800 rounded">Crítica</span>;
      case 'Alta':
        return <span className="px-1.5 py-0.5 text-[10px] font-semibold bg-amber-100 text-amber-800 rounded">Alta</span>;
      case 'Média':
        return <span className="px-1.5 py-0.5 text-[10px] font-medium bg-blue-100 text-blue-800 rounded">Média</span>;
      case 'Baixa':
        return <span className="px-1.5 py-0.5 text-[10px] font-medium bg-slate-100 text-slate-700 rounded">Baixa</span>;
      default:
        return p;
    }
  };

  const kanbanColumns: TaskStatus[] = ['A fazer', 'Em andamento', 'Em revisão', 'Concluída', 'Cancelada'];

  if (loading) {
    return <div className="p-8 text-center text-sm text-slate-500">Carregando tarefas...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">Quadro de Tarefas</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Distribuição e acompanhamento de tarefas do projeto de desenvolvimento dos jogos.
          </p>
        </div>

        <div className="flex items-center gap-3 self-start sm:self-auto">
          {/* View mode toggle */}
          <div className="flex items-center bg-slate-100 p-0.5 rounded-lg border border-slate-200 text-xs">
            <button
              onClick={() => setViewMode('kanban')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md font-medium transition-colors ${
                viewMode === 'kanban' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Kanban className="w-3.5 h-3.5" /> Kanban
            </button>
            <button
              onClick={() => setViewMode('lista')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md font-medium transition-colors ${
                viewMode === 'lista' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <LayoutList className="w-3.5 h-3.5" /> Lista
            </button>
          </div>

          {canManageAdmin && (
            <button
              onClick={openCreateModal}
              className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-900 hover:bg-indigo-800 text-white text-xs font-semibold rounded-md shadow-xs transition-colors"
            >
              <Plus className="w-4 h-4" />
              Nova Tarefa
            </button>
          )}
        </div>
      </div>

      {tasks.length === 0 ? (
        <EmptyState
          message="Nenhum registro encontrado."
          subMessage="Cadastre o primeiro registro para começar."
          actionLabel={canManageAdmin ? 'Criar Nova Tarefa' : undefined}
          onAction={canManageAdmin ? openCreateModal : undefined}
        />
      ) : viewMode === 'kanban' ? (
        /* ==================== KANBAN VIEW ==================== */
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
          {kanbanColumns.map(col => {
            const colTasks = tasks.filter(t => t.status === col);
            return (
              <div key={col} className="bg-slate-50 border border-slate-200 rounded-lg p-3 flex flex-col min-h-[450px]">
                <div className="flex items-center justify-between pb-2 mb-3 border-b border-slate-200">
                  <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">{col}</h3>
                  <span className="text-[11px] font-semibold text-slate-500 bg-white px-2 py-0.5 rounded border border-slate-200">
                    {colTasks.length}
                  </span>
                </div>

                <div className="space-y-2.5 flex-1 overflow-y-auto">
                  {colTasks.length === 0 ? (
                    <div className="text-[11px] text-slate-400 py-6 text-center italic">
                      Nenhuma tarefa nesta coluna.
                    </div>
                  ) : (
                    colTasks.map(task => {
                      const canEditThis = canManageAdmin || (isAluno && task.responsavelId === currentUser?.id);
                      return (
                        <div
                          key={task.id}
                          className="bg-white p-3 rounded-md border border-slate-200 shadow-2xs space-y-2 hover:border-slate-300 transition-colors"
                        >
                          <div className="flex items-start justify-between gap-1">
                            <h4 className="text-xs font-bold text-slate-900 leading-snug">{task.titulo}</h4>
                            {getPriorityBadge(task.prioridade)}
                          </div>

                          {task.descricao && (
                            <p className="text-[11px] text-slate-600 line-clamp-2">{task.descricao}</p>
                          )}

                          <div className="pt-2 border-t border-slate-100 text-[10px] text-slate-500 space-y-1">
                            {task.jogoNome && (
                              <div className="font-semibold text-indigo-900 truncate">
                                Jogo: {task.jogoNome}
                              </div>
                            )}
                            <div>Resp: <span className="font-medium text-slate-700">{task.responsavelNome}</span></div>
                            <div>Prazo: <span className="font-mono text-slate-700">{task.prazo}</span></div>
                          </div>

                          {/* Quick status dropdown / actions */}
                          {canEditThis && (
                            <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                              <select
                                value={task.status}
                                onChange={e => handleQuickStatus(task, e.target.value as TaskStatus)}
                                className="text-[10px] font-semibold text-slate-700 bg-slate-50 border border-slate-200 rounded px-1.5 py-1 focus:outline-none"
                              >
                                {kanbanColumns.map(c => (
                                  <option key={c} value={c}>
                                    {c}
                                  </option>
                                ))}
                              </select>

                              {canManageAdmin && (
                                <div className="flex items-center gap-1">
                                  <button
                                    onClick={() => openEditModal(task)}
                                    className="p-1 text-slate-400 hover:text-slate-700"
                                    title="Editar"
                                  >
                                    <Edit2 className="w-3 h-3" />
                                  </button>
                                  <button
                                    onClick={() => handleDelete(task)}
                                    className="p-1 text-slate-400 hover:text-rose-700"
                                    title="Excluir"
                                  >
                                    <Trash2 className="w-3 h-3" />
                                  </button>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* ==================== LIST VIEW ==================== */
        <div className="bg-white border border-slate-200 rounded-lg shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-700 uppercase tracking-wider text-[11px] font-bold">
                <tr>
                  <th className="py-3 px-4">Tarefa</th>
                  <th className="py-3 px-4">Jogo</th>
                  <th className="py-3 px-4">Responsável</th>
                  <th className="py-3 px-4">Prioridade</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Prazo</th>
                  <th className="py-3 px-4 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 text-slate-800">
                {tasks.map(t => {
                  const canEditThis = canManageAdmin || (isAluno && t.responsavelId === currentUser?.id);
                  return (
                    <tr key={t.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3 px-4">
                        <div className="font-semibold text-slate-900 text-xs">{t.titulo}</div>
                        {t.descricao && <div className="text-slate-500 text-[11px] line-clamp-1">{t.descricao}</div>}
                      </td>
                      <td className="py-3 px-4 text-xs font-medium text-indigo-900">{t.jogoNome || '—'}</td>
                      <td className="py-3 px-4 text-xs text-slate-700">{t.responsavelNome}</td>
                      <td className="py-3 px-4">{getPriorityBadge(t.prioridade)}</td>
                      <td className="py-3 px-4">
                        {canEditThis ? (
                          <select
                            value={t.status}
                            onChange={e => handleQuickStatus(t, e.target.value as TaskStatus)}
                            className="text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded px-2 py-0.5 focus:outline-none"
                          >
                            {kanbanColumns.map(c => (
                              <option key={c} value={c}>{c}</option>
                            ))}
                          </select>
                        ) : (
                          <span className="text-xs font-medium text-slate-700">{t.status}</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-xs font-mono text-slate-600">{t.prazo}</td>
                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        {canManageAdmin && (
                          <div className="inline-flex items-center gap-1.5">
                            <button
                              onClick={() => openEditModal(t)}
                              className="p-1.5 text-slate-400 hover:text-indigo-700 hover:bg-indigo-50 rounded"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleDelete(t)}
                              className="p-1.5 text-slate-400 hover:text-rose-700 hover:bg-rose-50 rounded"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal Nova / Editar Tarefa */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-white rounded-xl shadow-xl border border-slate-200 w-full max-w-lg overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
              <h2 className="text-base font-bold text-slate-900">
                {editingTask ? 'Editar Tarefa' : 'Nova Tarefa'}
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
                  Título da Tarefa *
                </label>
                <input
                  type="text"
                  required
                  value={titulo}
                  onChange={e => setTitulo(e.target.value)}
                  placeholder="Ex: Treinar modelo para geração de diálogos de NPCs"
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-600"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Descrição
                </label>
                <textarea
                  rows={2}
                  value={descricao}
                  onChange={e => setDescricao(e.target.value)}
                  placeholder="Detalhamento técnico da tarefa..."
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-600"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    Responsável *
                  </label>
                  <select
                    value={responsavelId}
                    onChange={e => setResponsavelId(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-indigo-600"
                  >
                    {participants.map(p => (
                      <option key={p.id} value={p.id}>
                        {p.nome}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    Jogo Vinculado
                  </label>
                  <select
                    value={jogoId}
                    onChange={e => setJogoId(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-indigo-600"
                  >
                    <option value="">Nenhum jogo vinculado</option>
                    {games.map(g => (
                      <option key={g.id} value={g.id}>
                        {g.nome}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    Prioridade
                  </label>
                  <select
                    value={prioridade}
                    onChange={e => setPrioridade(e.target.value as TaskPriority)}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-indigo-600"
                  >
                    <option value="Baixa">Baixa</option>
                    <option value="Média">Média</option>
                    <option value="Alta">Alta</option>
                    <option value="Crítica">Crítica</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    Status
                  </label>
                  <select
                    value={status}
                    onChange={e => {
                      const newStatus = e.target.value as TaskStatus;
                      setStatus(newStatus);
                      if (newStatus === 'Concluída' && !dataConclusao) {
                        setDataConclusao(new Date().toISOString().split('T')[0]);
                      }
                    }}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-indigo-600"
                  >
                    {kanbanColumns.map(c => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    Prazo
                  </label>
                  <input
                    type="date"
                    value={prazo}
                    onChange={e => setPrazo(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-600"
                  />
                </div>
              </div>

              {status === 'Concluída' && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg space-y-1">
                  <label className="block text-xs font-bold text-emerald-900 uppercase tracking-wider">
                    Data de Conclusão * (Obrigatória para tarefas concluídas)
                  </label>
                  <input
                    type="date"
                    required
                    value={dataConclusao}
                    onChange={e => setDataConclusao(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-emerald-300 rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-emerald-600 font-medium text-emerald-950"
                  />
                  <p className="text-[11px] text-emerald-700">
                    Conforme a regra de transição de status, a data de conclusão é obrigatória.
                  </p>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Observações
                </label>
                <textarea
                  rows={2}
                  value={observacoes}
                  onChange={e => setObservacoes(e.target.value)}
                  placeholder="Notas adicionais sobre a entrega..."
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
                  {saving ? 'Salvando...' : 'Salvar Tarefa'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal de Conclusão Obrigatória com Data de Conclusão */}
      {completionModalTask && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200 bg-emerald-50 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-emerald-950">Concluir Tarefa</h3>
                <p className="text-xs text-emerald-800">
                  {completionModalTask.titulo}
                </p>
              </div>
              <button
                onClick={() => setCompletionModalTask(null)}
                className="text-emerald-700 hover:text-emerald-900 text-lg font-bold"
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleConfirmCompletion} className="p-6 space-y-4">
              {completionError && (
                <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-md">
                  {completionError}
                </div>
              )}

              <div className="p-3 bg-slate-50 border border-slate-200 rounded-md text-xs text-slate-600 space-y-1">
                <div className="font-semibold text-slate-800">Regra de Transição de Status:</div>
                <div>
                  Uma tarefa só pode ser transicionada para <strong>Concluída</strong> se a sua <strong>Data de Conclusão</strong> estiver devidamente preenchida.
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider mb-1">
                  Data de Conclusão *
                </label>
                <input
                  type="date"
                  required
                  value={completionDateInput}
                  onChange={e => setCompletionDateInput(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-600 font-medium"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Observação de Entrega (opcional)
                </label>
                <textarea
                  rows={2}
                  value={completionNotesInput}
                  onChange={e => setCompletionNotesInput(e.target.value)}
                  placeholder="Ex: Concluído conforme checklist de aceitação..."
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-600"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setCompletionModalTask(null)}
                  className="px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-md"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={completionSaving}
                  className="px-4 py-1.5 text-xs font-semibold text-white bg-emerald-700 hover:bg-emerald-800 rounded-md shadow-xs disabled:opacity-50"
                >
                  {completionSaving ? 'Concluindo...' : 'Confirmar Conclusão'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
