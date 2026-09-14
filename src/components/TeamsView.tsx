import React, { useEffect, useState } from 'react';
import { api } from '../services/api.js';
import { Team, Participant } from '../types.js';
import { useAuth } from '../context/AuthContext.js';
import { EmptyState } from './EmptyState.js';
import { Plus, Edit2, Trash2, Users } from 'lucide-react';

export const TeamsView: React.FC = () => {
  const { canManageAdmin } = useAuth();
  const [teams, setTeams] = useState<Team[]>([]);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal
  const [modalOpen, setModalOpen] = useState(false);
  const [editingTeam, setEditingTeam] = useState<Team | null>(null);

  // Form
  const [nome, setNome] = useState('');
  const [descricao, setDescricao] = useState('');
  const [responsavelId, setResponsavelId] = useState('');
  const [participantesIds, setParticipantesIds] = useState<string[]>([]);
  const [areaAtuacao, setAreaAtuacao] = useState('');
  const [status, setStatus] = useState<'Ativa' | 'Inativa'>('Ativa');
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);

  const loadData = async () => {
    try {
      setLoading(true);
      const [teamsData, partsData] = await Promise.all([
        api.getTeams(),
        api.getParticipants(),
      ]);
      setTeams(teamsData);
      setParticipants(partsData);
    } catch (err) {
      console.error('Failed to load teams', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const openCreateModal = () => {
    setEditingTeam(null);
    setNome('');
    setDescricao('');
    setResponsavelId(participants.length > 0 ? participants[0].id : '');
    setParticipantesIds([]);
    setAreaAtuacao('');
    setStatus('Ativa');
    setFormError('');
    setModalOpen(true);
  };

  const openEditModal = (t: Team) => {
    setEditingTeam(t);
    setNome(t.nome);
    setDescricao(t.descricao);
    setResponsavelId(t.responsavelId);
    setParticipantesIds(t.participantesIds || []);
    setAreaAtuacao(t.areaAtuacao || '');
    setStatus(t.status);
    setFormError('');
    setModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nome.trim() || !responsavelId) {
      setFormError('Nome da equipe e responsável são obrigatórios.');
      return;
    }

    try {
      setSaving(true);
      setFormError('');

      if (editingTeam) {
        await api.updateTeam(editingTeam.id, {
          nome: nome.trim(),
          descricao: descricao.trim(),
          responsavelId,
          participantesIds,
          areaAtuacao: areaAtuacao.trim(),
          status,
        });
      } else {
        await api.createTeam({
          nome: nome.trim(),
          descricao: descricao.trim(),
          responsavelId,
          participantesIds,
          areaAtuacao: areaAtuacao.trim(),
          status,
        });
      }

      setModalOpen(false);
      await loadData();
    } catch (err: any) {
      setFormError(err.message || 'Erro ao salvar equipe.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (t: Team) => {
    if (!confirm(`Deseja excluir permanentemente a equipe "${t.nome}"?`)) return;

    try {
      await api.deleteTeam(t.id);
      await loadData();
    } catch (err: any) {
      alert(err.message || 'Erro ao excluir equipe.');
    }
  };

  const toggleParticipantSelection = (pId: string) => {
    if (participantesIds.includes(pId)) {
      setParticipantesIds(participantesIds.filter(id => id !== pId));
    } else {
      setParticipantesIds([...participantesIds, pId]);
    }
  };

  if (loading) {
    return <div className="p-8 text-center text-sm text-slate-500">Carregando equipes...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">Equipes de Desenvolvimento</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Grupos interdisciplinares responsáveis pela execução dos jogos e experimentos.
          </p>
        </div>

        {canManageAdmin && (
          <button
            onClick={openCreateModal}
            className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-900 hover:bg-indigo-800 text-white text-xs font-semibold rounded-md shadow-xs transition-colors self-start sm:self-auto"
          >
            <Plus className="w-4 h-4" />
            Nova Equipe
          </button>
        )}
      </div>

      {teams.length === 0 ? (
        <EmptyState
          message="Nenhum registro encontrado."
          subMessage="Cadastre o primeiro registro para começar."
          actionLabel={canManageAdmin ? 'Cadastrar Equipe' : undefined}
          onAction={canManageAdmin ? openCreateModal : undefined}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {teams.map(t => {
            const teamMembers = participants.filter(p => t.participantesIds.includes(p.id));
            return (
              <div
                key={t.id}
                className="bg-white border border-slate-200 rounded-lg p-5 shadow-xs flex flex-col justify-between hover:border-slate-300 transition-colors"
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <h2 className="text-base font-bold text-slate-900 leading-snug">{t.nome}</h2>
                    <span
                      className={`px-2 py-0.5 text-[10px] font-semibold rounded ${
                        t.status === 'Ativa'
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      {t.status}
                    </span>
                  </div>

                  {t.areaAtuacao && (
                    <div className="mt-1 text-xs font-medium text-indigo-800">
                      Área: {t.areaAtuacao}
                    </div>
                  )}

                  <p className="mt-2 text-xs text-slate-600 leading-relaxed line-clamp-3">
                    {t.descricao || 'Sem descrição cadastrada.'}
                  </p>

                  <div className="mt-4 pt-3 border-t border-slate-100 space-y-2 text-xs">
                    <div>
                      <span className="text-slate-500 font-medium">Responsável: </span>
                      <span className="text-slate-800 font-semibold">{t.responsavelNome}</span>
                    </div>

                    <div>
                      <div className="text-slate-500 font-medium flex items-center gap-1 mb-1">
                        <Users className="w-3.5 h-3.5" />
                        Participantes ({teamMembers.length}):
                      </div>
                      {teamMembers.length === 0 ? (
                        <span className="text-slate-400 italic text-[11px]">Nenhum participante vinculado.</span>
                      ) : (
                        <div className="flex flex-wrap gap-1">
                          {teamMembers.map(m => (
                            <span
                              key={m.id}
                              className="px-2 py-0.5 bg-slate-100 text-slate-700 rounded text-[11px] font-medium"
                            >
                              {m.nome}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {canManageAdmin && (
                  <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                    <button
                      onClick={() => openEditModal(t)}
                      className="p-1.5 text-slate-500 hover:text-indigo-700 hover:bg-indigo-50 rounded transition-colors text-xs inline-flex items-center gap-1 font-medium"
                    >
                      <Edit2 className="w-3.5 h-3.5" /> Editar
                    </button>
                    <button
                      onClick={() => handleDelete(t)}
                      className="p-1.5 text-slate-500 hover:text-rose-700 hover:bg-rose-50 rounded transition-colors text-xs inline-flex items-center gap-1 font-medium"
                    >
                      <Trash2 className="w-3.5 h-3.5" /> Excluir
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Modal Nova / Editar Equipe */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-white rounded-xl shadow-xl border border-slate-200 w-full max-w-lg overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
              <h2 className="text-base font-bold text-slate-900">
                {editingTeam ? 'Editar Equipe' : 'Cadastrar Equipe'}
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
                  Nome da Equipe *
                </label>
                <input
                  type="text"
                  required
                  value={nome}
                  onChange={e => setNome(e.target.value)}
                  placeholder="Ex: Equipe Alpha - Mecânicas e IA"
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-600"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Área de Atuação
                </label>
                <input
                  type="text"
                  value={areaAtuacao}
                  onChange={e => setAreaAtuacao(e.target.value)}
                  placeholder="Ex: Jogabilidade, Arte Generativa, Áudio, Balanceamento"
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
                  placeholder="Objetivos e escopo de atuação da equipe..."
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-600"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    Responsável da Equipe *
                  </label>
                  <select
                    value={responsavelId}
                    onChange={e => setResponsavelId(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-indigo-600"
                  >
                    {participants.length === 0 && <option value="">Nenhum participante disponível</option>}
                    {participants.map(p => (
                      <option key={p.id} value={p.id}>
                        {p.nome} ({p.funcao})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    Status da Equipe
                  </label>
                  <select
                    value={status}
                    onChange={e => setStatus(e.target.value as 'Ativa' | 'Inativa')}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-indigo-600"
                  >
                    <option value="Ativa">Ativa</option>
                    <option value="Inativa">Inativa</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Selecionar Participantes da Equipe
                </label>
                <div className="max-h-36 overflow-y-auto border border-slate-200 rounded-md p-2 divide-y divide-slate-100 bg-slate-50/50">
                  {participants.map(p => (
                    <label key={p.id} className="flex items-center gap-2 py-1.5 px-2 text-xs text-slate-700 hover:bg-slate-100 rounded cursor-pointer">
                      <input
                        type="checkbox"
                        checked={participantesIds.includes(p.id)}
                        onChange={() => toggleParticipantSelection(p.id)}
                        className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                      />
                      <span className="font-medium text-slate-800">{p.nome}</span>
                      <span className="text-slate-400 text-[10px]">({p.email})</span>
                    </label>
                  ))}
                </div>
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
                  {saving ? 'Salvando...' : 'Salvar Equipe'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
