import React, { useEffect, useState } from 'react';
import { api } from '../services/api.js';
import { Milestone, MilestoneStatus, Participant } from '../types.js';
import { useAuth } from '../context/AuthContext.js';
import { EmptyState } from './EmptyState.js';
import { Plus, Edit2, Trash2, Calendar, LayoutList, GitCommit, CheckCircle2, Clock, AlertTriangle } from 'lucide-react';

export const ScheduleView: React.FC = () => {
  const { currentUser, canManageAdmin } = useAuth();
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [loading, setLoading] = useState(true);

  // View Mode: lista or linha_do_tempo
  const [viewMode, setViewMode] = useState<'lista' | 'timeline'>('timeline');

  // Modal
  const [modalOpen, setModalOpen] = useState(false);
  const [editingMilestone, setEditingMilestone] = useState<Milestone | null>(null);

  // Form states
  const [faseMarco, setFaseMarco] = useState('');
  const [descricao, setDescricao] = useState('');
  const [dataPrevista, setDataPrevista] = useState(new Date().toISOString().split('T')[0]);
  const [dataRealizada, setDataRealizada] = useState('');
  const [responsavelId, setResponsavelId] = useState('');
  const [status, setStatus] = useState<MilestoneStatus>('Não iniciado');
  const [observacoes, setObservacoes] = useState('');
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);

  const loadData = async () => {
    try {
      setLoading(true);
      const [milestonesData, partsData] = await Promise.all([
        api.getMilestones(),
        api.getParticipants(),
      ]);
      setMilestones(milestonesData);
      setParticipants(partsData);
    } catch (err) {
      console.error('Failed to load milestones', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const openCreateModal = () => {
    setEditingMilestone(null);
    setFaseMarco('');
    setDescricao('');
    setDataPrevista(new Date().toISOString().split('T')[0]);
    setDataRealizada('');
    setResponsavelId(currentUser?.id || (participants.length > 0 ? participants[0].id : ''));
    setStatus('Não iniciado');
    setObservacoes('');
    setFormError('');
    setModalOpen(true);
  };

  const openEditModal = (m: Milestone) => {
    setEditingMilestone(m);
    setFaseMarco(m.faseMarco);
    setDescricao(m.descricao);
    setDataPrevista(m.dataPrevista);
    setDataRealizada(m.dataRealizada || '');
    setResponsavelId(m.responsavelId);
    setStatus(m.status);
    setObservacoes(m.observacoes || '');
    setFormError('');
    setModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!faseMarco.trim() || !dataPrevista || !responsavelId) {
      setFormError('Fase/Marco, data prevista e responsável são obrigatórios.');
      return;
    }

    try {
      setSaving(true);
      setFormError('');

      const payload = {
        faseMarco: faseMarco.trim(),
        descricao: descricao.trim(),
        dataPrevista,
        dataRealizada: dataRealizada || undefined,
        responsavelId,
        status,
        observacoes: observacoes.trim(),
      };

      if (editingMilestone) {
        await api.updateMilestone(editingMilestone.id, payload);
      } else {
        await api.createMilestone(payload);
      }

      setModalOpen(false);
      await loadData();
    } catch (err: any) {
      setFormError(err.message || 'Erro ao salvar marco.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (m: Milestone) => {
    if (!confirm(`Deseja excluir o marco "${m.faseMarco}"?`)) return;
    try {
      await api.deleteMilestone(m.id);
      await loadData();
    } catch (err: any) {
      alert(err.message || 'Erro ao excluir marco.');
    }
  };

  const getStatusBadge = (st: MilestoneStatus) => {
    switch (st) {
      case 'Não iniciado':
        return <span className="px-2 py-0.5 text-xs font-medium bg-slate-100 text-slate-700 rounded">Não iniciado</span>;
      case 'Em andamento':
        return <span className="px-2 py-0.5 text-xs font-semibold bg-blue-100 text-blue-800 rounded">Em andamento</span>;
      case 'Concluído':
        return <span className="px-2 py-0.5 text-xs font-semibold bg-emerald-100 text-emerald-800 rounded">Concluído</span>;
      case 'Atrasado':
        return <span className="px-2 py-0.5 text-xs font-bold bg-rose-100 text-rose-800 rounded">Atrasado</span>;
      default:
        return st;
    }
  };

  if (loading) {
    return <div className="p-8 text-center text-sm text-slate-500">Carregando cronograma acadêmico...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">Cronograma e Marcos do Projeto</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Acompanhamento das fases de desenvolvimento, entregas de relatórios e marcos acadêmicos.
          </p>
        </div>

        <div className="flex items-center gap-3 self-start sm:self-auto">
          {/* View toggle */}
          <div className="flex items-center bg-slate-100 p-0.5 rounded-lg border border-slate-200 text-xs">
            <button
              onClick={() => setViewMode('timeline')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md font-medium transition-colors ${
                viewMode === 'timeline' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <GitCommit className="w-3.5 h-3.5" /> Linha do Tempo
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
              Novo Marco
            </button>
          )}
        </div>
      </div>

      {milestones.length === 0 ? (
        <EmptyState
          message="Nenhum registro encontrado."
          subMessage="Cadastre o primeiro registro para começar o cronograma das atividades."
          actionLabel={canManageAdmin ? 'Cadastrar Primeiro Marco' : undefined}
          onAction={canManageAdmin ? openCreateModal : undefined}
        />
      ) : viewMode === 'timeline' ? (
        /* ==================== SIMPLE TIMELINE VIEW ==================== */
        <div className="bg-white border border-slate-200 rounded-lg p-6 shadow-xs">
          <div className="relative border-l-2 border-slate-200 ml-4 pl-6 space-y-6">
            {milestones.map((m, idx) => (
              <div key={m.id} className="relative">
                {/* Node Bullet */}
                <div
                  className={`absolute -left-[31px] top-1.5 w-4 h-4 rounded-full border-2 bg-white ${
                    m.status === 'Concluído'
                      ? 'border-emerald-600 bg-emerald-600'
                      : m.status === 'Em andamento'
                      ? 'border-blue-600 bg-blue-600'
                      : m.status === 'Atrasado'
                      ? 'border-rose-600 bg-rose-600'
                      : 'border-slate-400'
                  }`}
                />

                <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 hover:border-slate-300 transition-colors">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono font-bold text-slate-500">#{idx + 1}</span>
                      <h2 className="text-sm font-bold text-slate-900">{m.faseMarco}</h2>
                    </div>
                    {getStatusBadge(m.status)}
                  </div>

                  {m.descricao && (
                    <p className="mt-2 text-xs text-slate-600 leading-relaxed">{m.descricao}</p>
                  )}

                  <div className="mt-3 pt-3 border-t border-slate-200/60 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
                    <div className="flex items-center gap-4">
                      <span>Previsto: <strong className="font-mono text-slate-700">{m.dataPrevista}</strong></span>
                      {m.dataRealizada && (
                        <span>Realizado: <strong className="font-mono text-emerald-800">{m.dataRealizada}</strong></span>
                      )}
                      <span>Responsável: <strong className="text-slate-800">{m.responsavelNome}</strong></span>
                    </div>

                    {canManageAdmin && (
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => openEditModal(m)}
                          className="p-1 text-slate-400 hover:text-indigo-700 rounded"
                          title="Editar"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDelete(m)}
                          className="p-1 text-slate-400 hover:text-rose-700 rounded"
                          title="Excluir"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        /* ==================== LIST VIEW ==================== */
        <div className="bg-white border border-slate-200 rounded-lg shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-700 uppercase tracking-wider text-[11px] font-bold">
                <tr>
                  <th className="py-3 px-4">Fase / Marco</th>
                  <th className="py-3 px-4">Responsável</th>
                  <th className="py-3 px-4">Data Prevista</th>
                  <th className="py-3 px-4">Data Realizada</th>
                  <th className="py-3 px-4">Status</th>
                  {canManageAdmin && <th className="py-3 px-4 text-right">Ações</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 text-slate-800 text-xs">
                {milestones.map(m => (
                  <tr key={m.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3 px-4">
                      <div className="font-bold text-slate-900">{m.faseMarco}</div>
                      {m.descricao && <div className="text-slate-500 text-[11px] line-clamp-1">{m.descricao}</div>}
                    </td>
                    <td className="py-3 px-4 text-slate-700">{m.responsavelNome}</td>
                    <td className="py-3 px-4 font-mono text-slate-600">{m.dataPrevista}</td>
                    <td className="py-3 px-4 font-mono text-slate-600">{m.dataRealizada || '—'}</td>
                    <td className="py-3 px-4">{getStatusBadge(m.status)}</td>
                    {canManageAdmin && (
                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        <div className="inline-flex items-center gap-1.5">
                          <button
                            onClick={() => openEditModal(m)}
                            className="p-1.5 text-slate-400 hover:text-indigo-700 rounded"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDelete(m)}
                            className="p-1.5 text-slate-400 hover:text-rose-700 rounded"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal Novo / Editar Marco */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-white rounded-xl shadow-xl border border-slate-200 w-full max-w-lg overflow-y-auto max-h-[90vh]">
            <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between sticky top-0 z-10">
              <h2 className="text-base font-bold text-slate-900">
                {editingMilestone ? 'Editar Marco' : 'Novo Marco do Cronograma'}
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
                  Fase / Marco *
                </label>
                <input
                  type="text"
                  required
                  value={faseMarco}
                  onChange={e => setFaseMarco(e.target.value)}
                  placeholder="Ex: Entrega do Protótipo Alfa e Relatório Parcial"
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
                  placeholder="Detalhamento das entregas esperadas..."
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-600"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    Data Prevista *
                  </label>
                  <input
                    type="date"
                    required
                    value={dataPrevista}
                    onChange={e => setDataPrevista(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-600"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    Data Realizada (se concluído)
                  </label>
                  <input
                    type="date"
                    value={dataRealizada}
                    onChange={e => setDataRealizada(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-600"
                  />
                </div>
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
                    Status
                  </label>
                  <select
                    value={status}
                    onChange={e => setStatus(e.target.value as MilestoneStatus)}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-indigo-600"
                  >
                    <option value="Não iniciado">Não iniciado</option>
                    <option value="Em andamento">Em andamento</option>
                    <option value="Concluído">Concluído</option>
                    <option value="Atrasado">Atrasado</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Observações
                </label>
                <input
                  type="text"
                  value={observacoes}
                  onChange={e => setObservacoes(e.target.value)}
                  placeholder="Notas adicionais..."
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
                  {saving ? 'Salvando...' : 'Salvar Marco'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
