import React, { useEffect, useState } from 'react';
import { api } from '../services/api.js';
import { Participant, Team, UserRole } from '../types.js';
import { useAuth } from '../context/AuthContext.js';
import { EmptyState } from './EmptyState.js';
import { Plus, UserX, Edit2, CheckCircle2, XCircle } from 'lucide-react';

export const ParticipantsView: React.FC = () => {
  const { canManageAdmin, refreshUsers } = useAuth();
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal states
  const [modalOpen, setModalOpen] = useState(false);
  const [editingParticipant, setEditingParticipant] = useState<Participant | null>(null);

  // Form states
  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');
  const [funcao, setFuncao] = useState<UserRole>('aluno');
  const [equipeId, setEquipeId] = useState('');
  const [status, setStatus] = useState<'Ativo' | 'Inativo'>('Ativo');
  const [dataEntrada, setDataEntrada] = useState(new Date().toISOString().split('T')[0]);
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);

  const loadData = async () => {
    try {
      setLoading(true);
      const [partsData, teamsData] = await Promise.all([
        api.getParticipants(),
        api.getTeams(),
      ]);
      setParticipants(partsData);
      setTeams(teamsData);
    } catch (err) {
      console.error('Failed to load participants/teams', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const openCreateModal = () => {
    setEditingParticipant(null);
    setNome('');
    setEmail('');
    setFuncao('aluno');
    setEquipeId('');
    setStatus('Ativo');
    setDataEntrada(new Date().toISOString().split('T')[0]);
    setFormError('');
    setModalOpen(true);
  };

  const openEditModal = (p: Participant) => {
    setEditingParticipant(p);
    setNome(p.nome);
    setEmail(p.email);
    setFuncao(p.funcao);
    setEquipeId(p.equipeId || '');
    setStatus(p.status);
    setDataEntrada(p.dataEntrada);
    setFormError('');
    setModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nome.trim() || !email.trim()) {
      setFormError('Nome e e-mail são obrigatórios.');
      return;
    }

    try {
      setSaving(true);
      setFormError('');

      if (editingParticipant) {
        await api.updateParticipant(editingParticipant.id, {
          nome: nome.trim(),
          email: email.trim(),
          funcao,
          equipeId: equipeId || undefined,
          status,
          dataEntrada,
        });
      } else {
        await api.createParticipant({
          nome: nome.trim(),
          email: email.trim(),
          funcao,
          equipeId: equipeId || undefined,
          status,
          dataEntrada,
        });
      }

      setModalOpen(false);
      await loadData();
      await refreshUsers();
    } catch (err: any) {
      setFormError(err.message || 'Erro ao salvar participante.');
    } finally {
      setSaving(false);
    }
  };

  const handleDeactivate = async (p: Participant) => {
    if (!confirm(`Deseja desativar o participante "${p.nome}"? Por exigência de auditoria do projeto, participantes não são excluídos permanentemente.`)) {
      return;
    }

    try {
      await api.deactivateParticipant(p.id);
      await loadData();
      await refreshUsers();
    } catch (err: any) {
      alert(err.message || 'Erro ao desativar participante.');
    }
  };

  const getRoleBadge = (role: UserRole) => {
    switch (role) {
      case 'coordenador_aluno':
        return <span className="px-2 py-0.5 text-xs font-semibold bg-indigo-100 text-indigo-800 rounded">Coordenador Aluno</span>;
      case 'professor_orientador':
        return <span className="px-2 py-0.5 text-xs font-semibold bg-emerald-100 text-emerald-800 rounded">Professor Orientador</span>;
      case 'professor_colaborador':
        return <span className="px-2 py-0.5 text-xs font-semibold bg-teal-100 text-teal-800 rounded">Professor Colaborador</span>;
      case 'aluno':
        return <span className="px-2 py-0.5 text-xs font-semibold bg-sky-100 text-sky-800 rounded">Aluno</span>;
      default:
        return role;
    }
  };

  if (loading) {
    return <div className="p-8 text-center text-sm text-slate-500">Carregando participantes...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">Participantes do Projeto</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Cadastro, atribuição de equipes e controle de acesso acadêmico.
          </p>
        </div>

        {canManageAdmin && (
          <button
            onClick={openCreateModal}
            className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-900 hover:bg-indigo-800 text-white text-xs font-semibold rounded-md shadow-xs transition-colors self-start sm:self-auto"
          >
            <Plus className="w-4 h-4" />
            Novo Participante
          </button>
        )}
      </div>

      {participants.length === 0 ? (
        <EmptyState
          message="Nenhum registro encontrado."
          subMessage="Cadastre o primeiro registro para começar."
          actionLabel={canManageAdmin ? 'Cadastrar Participante' : undefined}
          onAction={canManageAdmin ? openCreateModal : undefined}
        />
      ) : (
        <div className="bg-white border border-slate-200 rounded-lg shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-700 uppercase tracking-wider text-[11px] font-bold">
                <tr>
                  <th className="py-3 px-4">Nome</th>
                  <th className="py-3 px-4">E-mail</th>
                  <th className="py-3 px-4">Função</th>
                  <th className="py-3 px-4">Equipe</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Entrada</th>
                  {canManageAdmin && <th className="py-3 px-4 text-right">Ações</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 text-slate-800">
                {participants.map(p => (
                  <tr key={p.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3 px-4 font-semibold text-slate-900">{p.nome}</td>
                    <td className="py-3 px-4 text-slate-600 font-mono text-xs">{p.email}</td>
                    <td className="py-3 px-4">{getRoleBadge(p.funcao)}</td>
                    <td className="py-3 px-4 text-slate-600">{p.equipeNome || '—'}</td>
                    <td className="py-3 px-4">
                      {p.status === 'Ativo' ? (
                        <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">
                          <CheckCircle2 className="w-3.5 h-3.5" /> Ativo
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-xs font-medium text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                          <XCircle className="w-3.5 h-3.5" /> Inativo
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-slate-500 font-mono text-xs">{p.dataEntrada}</td>
                    {canManageAdmin && (
                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        <div className="inline-flex items-center gap-2">
                          <button
                            onClick={() => openEditModal(p)}
                            title="Editar Participante"
                            className="p-1.5 text-slate-500 hover:text-indigo-700 hover:bg-indigo-50 rounded transition-colors"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          {p.status === 'Ativo' && (
                            <button
                              onClick={() => handleDeactivate(p)}
                              title="Desativar Participante (não exclui histórico)"
                              className="p-1.5 text-slate-500 hover:text-rose-700 hover:bg-rose-50 rounded transition-colors"
                            >
                              <UserX className="w-4 h-4" />
                            </button>
                          )}
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

      {/* Modal Cadastrar / Editar */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-white rounded-xl shadow-xl border border-slate-200 w-full max-w-lg overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
              <h2 className="text-base font-bold text-slate-900">
                {editingParticipant ? 'Editar Participante' : 'Novo Participante'}
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
                  Nome Completo *
                </label>
                <input
                  type="text"
                  required
                  value={nome}
                  onChange={e => setNome(e.target.value)}
                  placeholder="Nome do participante"
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-600"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  E-mail *
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="email@instituicao.edu.br"
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-600"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    Função no Projeto *
                  </label>
                  <select
                    value={funcao}
                    onChange={e => setFuncao(e.target.value as UserRole)}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-indigo-600"
                  >
                    <option value="coordenador_aluno">Coordenador Aluno</option>
                    <option value="professor_orientador">Professor Orientador</option>
                    <option value="professor_colaborador">Professor Colaborador</option>
                    <option value="aluno">Aluno</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    Equipe
                  </label>
                  <select
                    value={equipeId}
                    onChange={e => setEquipeId(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-indigo-600"
                  >
                    <option value="">Nenhuma equipe atribuída</option>
                    {teams.map(t => (
                      <option key={t.id} value={t.id}>
                        {t.nome} ({t.areaAtuacao || 'Geral'})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    Status
                  </label>
                  <select
                    value={status}
                    onChange={e => setStatus(e.target.value as 'Ativo' | 'Inativo')}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-indigo-600"
                  >
                    <option value="Ativo">Ativo</option>
                    <option value="Inativo">Inativo</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    Data de Entrada
                  </label>
                  <input
                    type="date"
                    value={dataEntrada}
                    onChange={e => setDataEntrada(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-600"
                  />
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
                  {saving ? 'Salvando...' : 'Salvar Participante'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
