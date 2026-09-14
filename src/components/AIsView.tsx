import React, { useEffect, useState } from 'react';
import { api } from '../services/api.js';
import { AIModel, AIType, AILicense } from '../types.js';
import { useAuth } from '../context/AuthContext.js';
import { EmptyState } from './EmptyState.js';
import { Plus, Edit2, Trash2, Cpu, CheckCircle2, AlertTriangle } from 'lucide-react';

export const AIsView: React.FC = () => {
  const { canManageAdmin, canRegisterExperiments } = useAuth();
  const [ais, setAis] = useState<AIModel[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal
  const [modalOpen, setModalOpen] = useState(false);
  const [editingAI, setEditingAI] = useState<AIModel | null>(null);

  // Form
  const [nome, setNome] = useState('');
  const [tipo, setTipo] = useState<AIType>('texto');
  const [modelo, setModelo] = useState('');
  const [empresaProvedor, setEmpresaProvedor] = useState('');
  const [finalidade, setFinalidade] = useState('');
  const [licencaCusto, setLicencaCusto] = useState<AILicense>('Gratuita');
  const [pontosFortes, setPontosFortes] = useState('');
  const [limitacoes, setLimitacoes] = useState('');
  const [observacoes, setObservacoes] = useState('');
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);

  const loadData = async () => {
    try {
      setLoading(true);
      const data = await api.getAIs();
      setAis(data);
    } catch (err) {
      console.error('Failed to load AIs', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const openCreateModal = () => {
    setEditingAI(null);
    setNome('');
    setTipo('texto');
    setModelo('');
    setEmpresaProvedor('');
    setFinalidade('');
    setLicencaCusto('Gratuita');
    setPontosFortes('');
    setLimitacoes('');
    setObservacoes('');
    setFormError('');
    setModalOpen(true);
  };

  const openEditModal = (ai: AIModel) => {
    setEditingAI(ai);
    setNome(ai.nome);
    setTipo(ai.tipo);
    setModelo(ai.modelo);
    setEmpresaProvedor(ai.empresaProvedor);
    setFinalidade(ai.finalidade);
    setLicencaCusto(ai.licencaCusto);
    setPontosFortes(ai.pontosFortes || '');
    setLimitacoes(ai.limitacoes || '');
    setObservacoes(ai.observacoes || '');
    setFormError('');
    setModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nome.trim() || !modelo.trim() || !empresaProvedor.trim()) {
      setFormError('Nome, modelo e provedor são obrigatórios.');
      return;
    }

    try {
      setSaving(true);
      setFormError('');

      const payload = {
        nome: nome.trim(),
        tipo,
        modelo: modelo.trim(),
        empresaProvedor: empresaProvedor.trim(),
        finalidade: finalidade.trim(),
        licencaCusto,
        pontosFortes: pontosFortes.trim(),
        limitacoes: limitacoes.trim(),
        observacoes: observacoes.trim(),
      };

      if (editingAI) {
        await api.updateAI(editingAI.id, payload);
      } else {
        await api.createAI(payload);
      }

      setModalOpen(false);
      await loadData();
    } catch (err: any) {
      setFormError(err.message || 'Erro ao salvar IA.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (ai: AIModel) => {
    if (!confirm(`Deseja excluir o registro da IA "${ai.nome}"?`)) return;
    try {
      await api.deleteAI(ai.id);
      await loadData();
    } catch (err: any) {
      alert(err.message || 'Erro ao excluir IA.');
    }
  };

  const canEditOrAdd = canManageAdmin || canRegisterExperiments;

  if (loading) {
    return <div className="p-8 text-center text-sm text-slate-500">Carregando IAs...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">IAs Utilizadas na Pesquisa</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Registro real de modelos de inteligência artificial aplicados no desenvolvimento dos jogos.
          </p>
        </div>

        {canEditOrAdd && (
          <button
            onClick={openCreateModal}
            className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-900 hover:bg-indigo-800 text-white text-xs font-semibold rounded-md shadow-xs transition-colors self-start sm:self-auto"
          >
            <Plus className="w-4 h-4" />
            Cadastrar IA
          </button>
        )}
      </div>

      {ais.length === 0 ? (
        <EmptyState
          message="Nenhum registro encontrado."
          subMessage="Cadastre o primeiro registro para começar. As IAs deverão ser cadastradas à medida que forem sendo utilizadas."
          actionLabel={canEditOrAdd ? 'Cadastrar Primeira IA' : undefined}
          onAction={canEditOrAdd ? openCreateModal : undefined}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {ais.map(ai => (
            <div
              key={ai.id}
              className="bg-white border border-slate-200 rounded-lg p-5 shadow-xs flex flex-col justify-between hover:border-slate-300 transition-colors"
            >
              <div>
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <div className="p-2 bg-slate-100 rounded-md text-slate-700">
                      <Cpu className="w-4 h-4" />
                    </div>
                    <div>
                      <h2 className="text-base font-bold text-slate-900 leading-snug">{ai.nome}</h2>
                      <p className="text-xs text-slate-500 font-medium">{ai.empresaProvedor}</p>
                    </div>
                  </div>
                  <span className="px-2 py-0.5 text-[10px] font-semibold bg-slate-100 text-slate-700 rounded border border-slate-200 uppercase">
                    {ai.tipo}
                  </span>
                </div>

                <div className="mt-3 flex items-center gap-2 text-xs">
                  <span className="font-mono bg-indigo-50 text-indigo-900 px-2 py-0.5 rounded font-medium">
                    {ai.modelo}
                  </span>
                  <span className="px-2 py-0.5 text-[10px] font-semibold bg-emerald-50 text-emerald-800 rounded">
                    {ai.licencaCusto}
                  </span>
                </div>

                <div className="mt-3 text-xs text-slate-600">
                  <span className="font-medium text-slate-700">Finalidade: </span>
                  {ai.finalidade || 'Não especificada'}
                </div>

                {/* Strengths and Weaknesses */}
                <div className="mt-4 pt-3 border-t border-slate-100 space-y-2 text-xs">
                  {ai.pontosFortes && (
                    <div className="flex items-start gap-1.5 text-emerald-800 bg-emerald-50/60 p-2 rounded">
                      <CheckCircle2 className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                      <div>
                        <span className="font-bold">Pontos Fortes: </span>
                        {ai.pontosFortes}
                      </div>
                    </div>
                  )}

                  {ai.limitacoes && (
                    <div className="flex items-start gap-1.5 text-amber-900 bg-amber-50/60 p-2 rounded">
                      <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5 text-amber-700" />
                      <div>
                        <span className="font-bold">Limitações: </span>
                        {ai.limitacoes}
                      </div>
                    </div>
                  )}

                  {ai.observacoes && (
                    <p className="text-slate-500 text-[11px] italic mt-1">
                      Obs: {ai.observacoes}
                    </p>
                  )}
                </div>
              </div>

              {canEditOrAdd && (
                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                  <button
                    onClick={() => openEditModal(ai)}
                    className="p-1.5 text-slate-500 hover:text-indigo-700 hover:bg-indigo-50 rounded transition-colors text-xs inline-flex items-center gap-1 font-medium"
                  >
                    <Edit2 className="w-3.5 h-3.5" /> Editar
                  </button>
                  {canManageAdmin && (
                    <button
                      onClick={() => handleDelete(ai)}
                      className="p-1.5 text-slate-500 hover:text-rose-700 hover:bg-rose-50 rounded transition-colors text-xs inline-flex items-center gap-1 font-medium"
                    >
                      <Trash2 className="w-3.5 h-3.5" /> Excluir
                    </button>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Modal Cadastrar / Editar IA */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-white rounded-xl shadow-xl border border-slate-200 w-full max-w-lg overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
              <h2 className="text-base font-bold text-slate-900">
                {editingAI ? 'Editar IA' : 'Cadastrar IA Utilizada'}
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
                    Nome da IA *
                  </label>
                  <input
                    type="text"
                    required
                    value={nome}
                    onChange={e => setNome(e.target.value)}
                    placeholder="Ex: Gemini, Claude, Stable Diffusion"
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-600"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    Tipo de Conteúdo *
                  </label>
                  <select
                    value={tipo}
                    onChange={e => setTipo(e.target.value as AIType)}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-indigo-600"
                  >
                    <option value="texto">Texto (Narrativa / Diálogos)</option>
                    <option value="imagem">Imagem (Concept / Texturas)</option>
                    <option value="áudio">Áudio (Efeitos / Trilha)</option>
                    <option value="código">Código (Scripts / Shaders)</option>
                    <option value="3D">3D (Modelagem / Meshes)</option>
                    <option value="animação">Animação</option>
                    <option value="outra">Outra</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    Versão / Modelo Específico *
                  </label>
                  <input
                    type="text"
                    required
                    value={modelo}
                    onChange={e => setModelo(e.target.value)}
                    placeholder="Ex: Gemini 2.5 Flash, SDXL 1.0"
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-600"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    Empresa / Provedor *
                  </label>
                  <input
                    type="text"
                    required
                    value={empresaProvedor}
                    onChange={e => setEmpresaProvedor(e.target.value)}
                    placeholder="Ex: Google, Anthropic, Stability AI"
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-600"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    Licença / Custo
                  </label>
                  <select
                    value={licencaCusto}
                    onChange={e => setLicencaCusto(e.target.value as AILicense)}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-indigo-600"
                  >
                    <option value="Gratuita">Gratuita</option>
                    <option value="Paga">Paga</option>
                    <option value="Open Source">Open Source</option>
                    <option value="Acadêmica">Acadêmica</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    Finalidade no Projeto
                  </label>
                  <input
                    type="text"
                    value={finalidade}
                    onChange={e => setFinalidade(e.target.value)}
                    placeholder="Ex: Geração de roteiro e assets 2D"
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-600"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Pontos Fortes Observados
                </label>
                <textarea
                  rows={2}
                  value={pontosFortes}
                  onChange={e => setPontosFortes(e.target.value)}
                  placeholder="Rapidez, coerência, respeito aos parâmetros..."
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-600"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Limitações Observadas
                </label>
                <textarea
                  rows={2}
                  value={limitacoes}
                  onChange={e => setLimitacoes(e.target.value)}
                  placeholder="Alucinações, artefatos visuais, limite de tokens..."
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-600"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Observações Acadêmicas
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
                  {saving ? 'Salvando...' : 'Salvar IA'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
