import React, { useEffect, useState } from 'react';
import { api } from '../services/api.js';
import { GameVersion, Game, Participant } from '../types.js';
import { useAuth } from '../context/AuthContext.js';
import { EmptyState } from './EmptyState.js';
import { Plus, Edit2, Trash2, ExternalLink, GitCommit } from 'lucide-react';

export const VersionsView: React.FC = () => {
  const { currentUser, canManageAdmin, canRegisterExperiments } = useAuth();
  const [versions, setVersions] = useState<GameVersion[]>([]);
  const [games, setGames] = useState<Game[]>([]);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [loading, setLoading] = useState(true);

  // Filter
  const [selectedGameFilter, setSelectedGameFilter] = useState<string>('todos');

  // Modal
  const [modalOpen, setModalOpen] = useState(false);
  const [editingVer, setEditingVer] = useState<GameVersion | null>(null);

  // Form states
  const [jogoId, setJogoId] = useState('');
  const [numero, setNumero] = useState('v0.1');
  const [data, setData] = useState(new Date().toISOString().split('T')[0]);
  const [responsavelId, setResponsavelId] = useState('');
  const [alteracoes, setAlteracoes] = useState('');
  const [funcionalidadesAdicionadas, setFuncionalidadesAdicionadas] = useState('');
  const [bugsCorrigidos, setBugsCorrigidos] = useState('');
  const [linkArquivo, setLinkArquivo] = useState('');
  const [observacoes, setObservacoes] = useState('');
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);

  const loadData = async () => {
    try {
      setLoading(true);
      const [versionsData, gamesData, partsData] = await Promise.all([
        api.getVersions(),
        api.getGames(),
        api.getParticipants(),
      ]);
      setVersions(versionsData);
      setGames(gamesData);
      setParticipants(partsData);
    } catch (err) {
      console.error('Failed to load versions', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const openCreateModal = () => {
    setEditingVer(null);
    setJogoId(games.length > 0 ? games[0].id : '');
    setNumero('v0.1');
    setData(new Date().toISOString().split('T')[0]);
    setResponsavelId(currentUser?.id || (participants.length > 0 ? participants[0].id : ''));
    setAlteracoes('');
    setFuncionalidadesAdicionadas('');
    setBugsCorrigidos('');
    setLinkArquivo('');
    setObservacoes('');
    setFormError('');
    setModalOpen(true);
  };

  const openEditModal = (v: GameVersion) => {
    setEditingVer(v);
    setJogoId(v.jogoId);
    setNumero(v.numero);
    setData(v.data);
    setResponsavelId(v.responsavelId);
    setAlteracoes(v.alteracoes);
    setFuncionalidadesAdicionadas(v.funcionalidadesAdicionadas || '');
    setBugsCorrigidos(v.bugsCorrigidos || '');
    setLinkArquivo(v.linkArquivo || '');
    setObservacoes(v.observacoes || '');
    setFormError('');
    setModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!jogoId || !numero.trim() || !alteracoes.trim() || !responsavelId) {
      setFormError('Jogo, versão, responsável e alterações são obrigatórios.');
      return;
    }

    try {
      setSaving(true);
      setFormError('');

      const payload = {
        jogoId,
        numero: numero.trim(),
        data,
        responsavelId,
        alteracoes: alteracoes.trim(),
        funcionalidadesAdicionadas: funcionalidadesAdicionadas.trim(),
        bugsCorrigidos: bugsCorrigidos.trim(),
        linkArquivo: linkArquivo.trim(),
        observacoes: observacoes.trim(),
      };

      if (editingVer) {
        await api.updateVersion(editingVer.id, payload);
      } else {
        await api.createVersion(payload);
      }

      setModalOpen(false);
      await loadData();
    } catch (err: any) {
      setFormError(err.message || 'Erro ao salvar versão.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (v: GameVersion) => {
    if (!confirm(`Deseja excluir o registro da versão "${v.numero}"?`)) return;
    try {
      await api.deleteVersion(v.id);
      await loadData();
    } catch (err: any) {
      alert(err.message || 'Erro ao excluir versão.');
    }
  };

  const canEdit = canManageAdmin || canRegisterExperiments;

  const filteredVersions = versions.filter(v => {
    if (selectedGameFilter === 'todos') return true;
    return v.jogoId === selectedGameFilter;
  });

  if (loading) {
    return <div className="p-8 text-center text-sm text-slate-500">Carregando versões...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">Controle de Versões dos Jogos</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Registro cronológico das entregas, builds, correções e novas funcionalidades.
          </p>
        </div>

        {canEdit && (
          <button
            onClick={openCreateModal}
            className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-900 hover:bg-indigo-800 text-white text-xs font-semibold rounded-md shadow-xs transition-colors self-start sm:self-auto"
          >
            <Plus className="w-4 h-4" />
            Nova Versão
          </button>
        )}
      </div>

      {/* Filter by Game */}
      <div className="flex items-center gap-2 text-xs">
        <span className="text-slate-500 font-medium">Filtrar por Jogo:</span>
        <select
          value={selectedGameFilter}
          onChange={e => setSelectedGameFilter(e.target.value)}
          className="bg-white border border-slate-200 rounded px-2.5 py-1 text-slate-700 font-medium focus:outline-none"
        >
          <option value="todos">Todos os Jogos</option>
          {games.map(g => (
            <option key={g.id} value={g.id}>
              {g.nome}
            </option>
          ))}
        </select>
      </div>

      {filteredVersions.length === 0 ? (
        <EmptyState
          message="Nenhum registro encontrado."
          subMessage="Cadastre o primeiro registro para começar."
          actionLabel={canEdit ? 'Registrar Primeira Versão' : undefined}
          onAction={canEdit ? openCreateModal : undefined}
        />
      ) : (
        <div className="space-y-4">
          {filteredVersions.map(v => (
            <div
              key={v.id}
              className="bg-white border border-slate-200 rounded-lg p-5 shadow-xs flex flex-col justify-between hover:border-slate-300 transition-colors"
            >
              <div className="space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-slate-100 text-indigo-900 rounded">
                      <GitCommit className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-sm font-bold text-indigo-900">{v.numero}</span>
                        <span className="text-slate-400">•</span>
                        <span className="text-xs font-bold text-slate-900">{v.jogoNome}</span>
                      </div>
                      <span className="text-[11px] text-slate-500 font-mono">Data: {v.data}</span>
                    </div>
                  </div>

                  <span className="text-xs text-slate-600">
                    Responsável: <strong className="text-slate-800">{v.responsavelNome}</strong>
                  </span>
                </div>

                <div className="text-xs space-y-2">
                  <div>
                    <strong className="text-slate-700 block mb-0.5">Principais Alterações:</strong>
                    <p className="text-slate-800 leading-relaxed">{v.alteracoes}</p>
                  </div>

                  {v.funcionalidadesAdicionadas && (
                    <div className="p-2.5 bg-emerald-50/70 border border-emerald-100 rounded text-slate-800">
                      <strong className="text-emerald-900 block mb-0.5">Funcionalidades Adicionadas:</strong>
                      <p>{v.funcionalidadesAdicionadas}</p>
                    </div>
                  )}

                  {v.bugsCorrigidos && (
                    <div className="p-2.5 bg-rose-50/70 border border-rose-100 rounded text-slate-800">
                      <strong className="text-rose-900 block mb-0.5">Bugs Corrigidos:</strong>
                      <p>{v.bugsCorrigidos}</p>
                    </div>
                  )}

                  {v.observacoes && (
                    <p className="text-[11px] text-slate-500 italic">
                      Observações: {v.observacoes}
                    </p>
                  )}
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                <div>
                  {v.linkArquivo ? (
                    <a
                      href={v.linkArquivo}
                      target="_blank"
                      rel="noreferrer"
                      className="text-xs text-indigo-700 hover:text-indigo-900 font-medium inline-flex items-center gap-1"
                    >
                      Acessar Build / Arquivo <ExternalLink className="w-3 h-3" />
                    </a>
                  ) : (
                    <span className="text-[11px] text-slate-400 italic">Nenhum link anexado</span>
                  )}
                </div>

                {canEdit && (
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => openEditModal(v)}
                      className="p-1 text-slate-400 hover:text-indigo-700 rounded text-xs inline-flex items-center gap-1 font-medium"
                    >
                      <Edit2 className="w-3.5 h-3.5" /> Editar
                    </button>
                    {canManageAdmin && (
                      <button
                        onClick={() => handleDelete(v)}
                        className="p-1 text-slate-400 hover:text-rose-700 rounded text-xs inline-flex items-center gap-1 font-medium"
                      >
                        <Trash2 className="w-3.5 h-3.5" /> Excluir
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal Nova / Editar Versão */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-white rounded-xl shadow-xl border border-slate-200 w-full max-w-lg overflow-y-auto max-h-[90vh]">
            <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between sticky top-0 z-10">
              <h2 className="text-base font-bold text-slate-900">
                {editingVer ? 'Editar Versão' : 'Registrar Nova Versão'}
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

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    Jogo *
                  </label>
                  <select
                    value={jogoId}
                    onChange={e => setJogoId(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-indigo-600"
                  >
                    {games.map(g => (
                      <option key={g.id} value={g.id}>
                        {g.nome}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    Número da Versão *
                  </label>
                  <input
                    type="text"
                    required
                    value={numero}
                    onChange={e => setNumero(e.target.value)}
                    placeholder="Ex: v0.2, v1.0-alpha"
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md font-mono focus:outline-none focus:ring-2 focus:ring-indigo-600"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    Data da Versão
                  </label>
                  <input
                    type="date"
                    value={data}
                    onChange={e => setData(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-600"
                  />
                </div>

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
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Principais Alterações Realizadas *
                </label>
                <textarea
                  rows={2}
                  required
                  value={alteracoes}
                  onChange={e => setAlteracoes(e.target.value)}
                  placeholder="Resumo das modificações..."
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-600"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Funcionalidades Adicionadas
                </label>
                <textarea
                  rows={2}
                  value={funcionalidadesAdicionadas}
                  onChange={e => setFuncionalidadesAdicionadas(e.target.value)}
                  placeholder="Novos sistemas, fases ou mecânicas implementadas..."
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-600"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Bugs Corrigidos
                </label>
                <textarea
                  rows={2}
                  value={bugsCorrigidos}
                  onChange={e => setBugsCorrigidos(e.target.value)}
                  placeholder="Problemas solucionados nesta versão..."
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-600"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Link do Arquivo / Executável / Build
                </label>
                <input
                  type="url"
                  value={linkArquivo}
                  onChange={e => setLinkArquivo(e.target.value)}
                  placeholder="https://..."
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-600"
                />
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
                  {saving ? 'Salvando...' : 'Salvar Versão'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
