import React, { useEffect, useState } from 'react';
import { api } from '../services/api.js';
import { PromptItem, PromptCategory, Game, AIModel, Participant } from '../types.js';
import { useAuth } from '../context/AuthContext.js';
import { EmptyState } from './EmptyState.js';
import { Plus, Edit2, Trash2, Copy, Check, Star, MessageSquareCode, Settings } from 'lucide-react';
import { PromptCategoryManagerModal } from './PromptCategoryManagerModal.js';

export const PromptsView: React.FC = () => {
  const { currentUser, canManageAdmin, canRegisterExperiments, isCoordenadorAluno } = useAuth();
  const [prompts, setPrompts] = useState<PromptItem[]>([]);
  const [games, setGames] = useState<Game[]>([]);
  const [ais, setAis] = useState<AIModel[]>([]);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [categories, setCategories] = useState<string[]>([
    'Roteiro',
    'Mecânica',
    'Diálogos',
    'Textura',
    'Áudio',
    'Balanceamento',
    'Shader',
    'Código',
    'Programação',
    'Arte',
    'Outra',
  ]);
  const [loading, setLoading] = useState(true);

  // Filter
  const [categoryFilter, setCategoryFilter] = useState<string>('todos');

  // Copy feedback state
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Modal
  const [modalOpen, setModalOpen] = useState(false);
  const [categoryModalOpen, setCategoryModalOpen] = useState(false);
  const [editingPrompt, setEditingPrompt] = useState<PromptItem | null>(null);

  // Form states
  const [titulo, setTitulo] = useState('');
  const [categoria, setCategoria] = useState<PromptCategory>('Roteiro');
  const [promptCompleto, setPromptCompleto] = useState('');
  const [iaRecomendadaId, setIaRecomendadaId] = useState('');
  const [jogoId, setJogoId] = useState('');
  const [parametrosSugeridos, setParametrosSugeridos] = useState('');
  const [resultadoEsperado, setResultadoEsperado] = useState('');
  const [exemploSaidaReal, setExemploSaidaReal] = useState('');
  const [avaliacao, setAvaliacao] = useState<number>(5);
  const [autorId, setAutorId] = useState('');
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);

  const loadData = async () => {
    try {
      setLoading(true);
      const [promptsData, gamesData, aisData, partsData, catsData] = await Promise.all([
        api.getPrompts(),
        api.getGames(),
        api.getAIs(),
        api.getParticipants(),
        api.getPromptCategories(),
      ]);
      setPrompts(promptsData);
      setGames(gamesData);
      setAis(aisData);
      setParticipants(partsData);
      if (catsData && catsData.length > 0) {
        setCategories(catsData);
      }
    } catch (err) {
      console.error('Failed to load prompts', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const openCreateModal = () => {
    setEditingPrompt(null);
    setTitulo('');
    setCategoria('Roteiro');
    setPromptCompleto('');
    setIaRecomendadaId(ais.length > 0 ? ais[0].id : '');
    setJogoId(games.length > 0 ? games[0].id : '');
    setParametrosSugeridos('temperatura=0.7');
    setResultadoEsperado('');
    setExemploSaidaReal('');
    setAvaliacao(5);
    setAutorId(currentUser?.id || (participants.length > 0 ? participants[0].id : ''));
    setFormError('');
    setModalOpen(true);
  };

  const openEditModal = (p: PromptItem) => {
    setEditingPrompt(p);
    setTitulo(p.titulo);
    setCategoria(p.categoria);
    setPromptCompleto(p.promptCompleto);
    setIaRecomendadaId(p.iaRecomendadaId || '');
    setJogoId(p.jogoId || '');
    setParametrosSugeridos(p.parametrosSugeridos || '');
    setResultadoEsperado(p.resultadoEsperado || '');
    setExemploSaidaReal(p.exemploSaidaReal || '');
    setAvaliacao(p.avaliacao);
    setAutorId(p.autorId);
    setFormError('');
    setModalOpen(true);
  };

  const handleCopy = (p: PromptItem) => {
    navigator.clipboard.writeText(p.promptCompleto);
    setCopiedId(p.id);
    setTimeout(() => {
      setCopiedId(null);
    }, 2000);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!titulo.trim() || !promptCompleto.trim() || !autorId) {
      setFormError('Título, prompt completo e autor são obrigatórios.');
      return;
    }

    try {
      setSaving(true);
      setFormError('');

      const payload = {
        titulo: titulo.trim(),
        categoria,
        promptCompleto: promptCompleto.trim(),
        iaRecomendadaId: iaRecomendadaId || undefined,
        jogoId: jogoId || undefined,
        parametrosSugeridos: parametrosSugeridos.trim(),
        resultadoEsperado: resultadoEsperado.trim(),
        exemploSaidaReal: exemploSaidaReal.trim(),
        avaliacao: Number(avaliacao),
        autorId,
      };

      if (editingPrompt) {
        await api.updatePrompt(editingPrompt.id, payload);
      } else {
        await api.createPrompt(payload);
      }

      setModalOpen(false);
      await loadData();
    } catch (err: any) {
      setFormError(err.message || 'Erro ao salvar prompt.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (p: PromptItem) => {
    if (!confirm(`Deseja excluir o prompt "${p.titulo}"?`)) return;
    try {
      await api.deletePrompt(p.id);
      await loadData();
    } catch (err: any) {
      alert(err.message || 'Erro ao excluir prompt.');
    }
  };

  const filteredPrompts = prompts.filter(p => {
    if (categoryFilter === 'todos') return true;
    return p.categoria === categoryFilter;
  });

  const canEdit = canManageAdmin || canRegisterExperiments;

  if (loading) {
    return <div className="p-8 text-center text-sm text-slate-500">Carregando repositório de prompts...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">Repositório de Prompts de IA</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Biblioteca de engenharia de prompts catalogados, categorizados e testados pela equipe.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          {(canManageAdmin || isCoordenadorAluno) && (
            <button
              onClick={() => setCategoryModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-2 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-md shadow-2xs transition-colors"
              title="Gerenciar categorias de prompts"
            >
              <Settings className="w-3.5 h-3.5 text-indigo-700" />
              Gerenciar Categorias
            </button>
          )}

          {canEdit && (
            <button
              onClick={openCreateModal}
              className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-900 hover:bg-indigo-800 text-white text-xs font-semibold rounded-md shadow-xs transition-colors"
            >
              <Plus className="w-4 h-4" />
              Novo Prompt
            </button>
          )}
        </div>
      </div>

      {/* Category filters */}
      <div className="flex items-center gap-2 text-xs overflow-x-auto pb-1">
        <span className="text-slate-500 font-medium shrink-0">Categoria:</span>
        <div className="flex items-center gap-1.5 flex-nowrap">
          <button
            onClick={() => setCategoryFilter('todos')}
            className={`px-2.5 py-1 rounded-md font-medium whitespace-nowrap transition-colors ${
              categoryFilter === 'todos'
                ? 'bg-slate-900 text-white'
                : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
            }`}
          >
            Todas
          </button>
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => setCategoryFilter(cat)}
              className={`px-2.5 py-1 rounded-md font-medium whitespace-nowrap transition-colors ${
                categoryFilter === cat
                  ? 'bg-indigo-900 text-white'
                  : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {filteredPrompts.length === 0 ? (
        <EmptyState
          message="Nenhum registro encontrado."
          subMessage="Cadastre o primeiro registro para começar a construir a biblioteca de prompts."
          actionLabel={canEdit ? 'Cadastrar Novo Prompt' : undefined}
          onAction={canEdit ? openCreateModal : undefined}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {filteredPrompts.map(p => (
            <div
              key={p.id}
              className="bg-white border border-slate-200 rounded-lg p-5 shadow-xs flex flex-col justify-between hover:border-slate-300 transition-colors"
            >
              <div className="space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <span className="px-2 py-0.5 text-[10px] font-bold bg-indigo-50 text-indigo-800 rounded uppercase">
                      {p.categoria}
                    </span>
                    <h2 className="text-base font-bold text-slate-900 mt-1 leading-snug">{p.titulo}</h2>
                  </div>

                  <div className="flex items-center gap-1 bg-amber-50 px-2 py-0.5 rounded border border-amber-200 text-xs font-bold text-amber-900 shrink-0">
                    <Star className="w-3.5 h-3.5 fill-amber-500 text-amber-500" />
                    {p.avaliacao}/5
                  </div>
                </div>

                {/* Prompt Box with Quick Copy */}
                <div className="relative">
                  <pre className="bg-slate-900 text-slate-100 p-3.5 rounded-md font-mono text-xs overflow-x-auto max-h-48 whitespace-pre-wrap leading-relaxed">
                    {p.promptCompleto}
                  </pre>
                  <button
                    onClick={() => handleCopy(p)}
                    className="absolute top-2 right-2 p-1.5 bg-slate-800 hover:bg-slate-700 text-white rounded text-xs inline-flex items-center gap-1 shadow-xs transition-colors"
                    title="Cópia rápida do prompt"
                  >
                    {copiedId === p.id ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                        <span className="text-[10px] text-emerald-400">Copiado!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span className="text-[10px]">Copiar</span>
                      </>
                    )}
                  </button>
                </div>

                {/* Details */}
                <div className="text-xs space-y-1.5 text-slate-600 pt-1">
                  {p.iaNome && (
                    <div>
                      <span className="font-semibold text-slate-700">IA Recomendada: </span>
                      <span className="text-indigo-900 font-medium">{p.iaNome}</span>
                    </div>
                  )}
                  {p.jogoNome && (
                    <div>
                      <span className="font-semibold text-slate-700">Jogo: </span>
                      <span>{p.jogoNome}</span>
                    </div>
                  )}
                  {p.parametrosSugeridos && (
                    <div>
                      <span className="font-semibold text-slate-700">Parâmetros: </span>
                      <span className="font-mono text-slate-500">{p.parametrosSugeridos}</span>
                    </div>
                  )}
                  {p.resultadoEsperado && (
                    <div className="pt-1 text-slate-500">
                      <strong>Esperado:</strong> {p.resultadoEsperado}
                    </div>
                  )}
                  {p.exemploSaidaReal && (
                    <div className="p-2 bg-slate-50 rounded border border-slate-200 text-[11px] text-slate-700">
                      <strong className="block text-slate-900 text-[10px] uppercase tracking-wider mb-0.5">
                        Exemplo de Saída Real:
                      </strong>
                      <p className="line-clamp-3">{p.exemploSaidaReal}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Footer */}
              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                <span>Autor: <strong className="text-slate-700">{p.autorNome}</strong></span>

                {canEdit && (
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => openEditModal(p)}
                      className="p-1 text-slate-400 hover:text-indigo-700 rounded"
                      title="Editar Prompt"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    {canManageAdmin && (
                      <button
                        onClick={() => handleDelete(p)}
                        className="p-1 text-slate-400 hover:text-rose-700 rounded"
                        title="Excluir Prompt"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal Novo / Editar Prompt */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-white rounded-xl shadow-xl border border-slate-200 w-full max-w-xl max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between sticky top-0 z-10">
              <h2 className="text-base font-bold text-slate-900">
                {editingPrompt ? 'Editar Prompt' : 'Novo Prompt de IA'}
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
                    Título do Prompt *
                  </label>
                  <input
                    type="text"
                    required
                    value={titulo}
                    onChange={e => setTitulo(e.target.value)}
                    placeholder="Ex: Gerador de Perfil e Motivação de Vilão"
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-600"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    Categoria *
                  </label>
                  <select
                    value={categoria}
                    onChange={e => setCategoria(e.target.value as PromptCategory)}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-indigo-600"
                  >
                    {categories.map(cat => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Prompt Completo *
                </label>
                <textarea
                  rows={4}
                  required
                  value={promptCompleto}
                  onChange={e => setPromptCompleto(e.target.value)}
                  placeholder="Instruções completas e estruturadas do prompt..."
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md font-mono text-xs focus:outline-none focus:ring-2 focus:ring-indigo-600"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    IA Recomendada
                  </label>
                  <select
                    value={iaRecomendadaId}
                    onChange={e => setIaRecomendadaId(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-indigo-600"
                  >
                    <option value="">Qualquer IA</option>
                    {ais.map(a => (
                      <option key={a.id} value={a.id}>
                        {a.nome} ({a.empresaProvedor})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    Jogo Relacionado
                  </label>
                  <select
                    value={jogoId}
                    onChange={e => setJogoId(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-indigo-600"
                  >
                    <option value="">Geral / Sem jogo específico</option>
                    {games.map(g => (
                      <option key={g.id} value={g.id}>
                        {g.nome}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    Parâmetros Sugeridos
                  </label>
                  <input
                    type="text"
                    value={parametrosSugeridos}
                    onChange={e => setParametrosSugeridos(e.target.value)}
                    placeholder="temperatura=0.7, top_p=0.9"
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-600"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    Avaliação do Prompt (1 a 5)
                  </label>
                  <select
                    value={avaliacao}
                    onChange={e => setAvaliacao(Number(e.target.value))}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-indigo-600 font-semibold"
                  >
                    <option value={5}>5 estrelas (Excelente)</option>
                    <option value={4}>4 estrelas (Bom)</option>
                    <option value={3}>3 estrelas (Regular)</option>
                    <option value={2}>2 estrelas (Fraco)</option>
                    <option value={1}>1 estrela (Ineficaz)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Resultado Esperado
                </label>
                <input
                  type="text"
                  value={resultadoEsperado}
                  onChange={e => setResultadoEsperado(e.target.value)}
                  placeholder="Ex: Tabela JSON com atributos de combate"
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-600"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Exemplo de Saída Real
                </label>
                <textarea
                  rows={3}
                  value={exemploSaidaReal}
                  onChange={e => setExemploSaidaReal(e.target.value)}
                  placeholder="Cole aqui um trecho real da saída gerada com este prompt..."
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-600 text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Autor do Prompt *
                </label>
                <select
                  value={autorId}
                  onChange={e => setAutorId(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-indigo-600"
                >
                  {participants.map(p => (
                    <option key={p.id} value={p.id}>
                      {p.nome}
                    </option>
                  ))}
                </select>
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
                  {saving ? 'Salvando...' : 'Salvar Prompt'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Modal Gerenciamento de Categorias */}
      <PromptCategoryManagerModal
        isOpen={categoryModalOpen}
        onClose={() => setCategoryModalOpen(false)}
        onCategoriesChanged={loadData}
      />
    </div>
  );
};
