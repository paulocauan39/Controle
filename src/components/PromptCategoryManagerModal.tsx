import React, { useState, useEffect } from 'react';
import { api } from '../services/api.js';
import { PromptCategoryItem } from '../types.js';
import { Plus, Edit2, Trash2, Power, Shield, Tag, Check, X, AlertCircle } from 'lucide-react';

interface PromptCategoryManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCategoriesChanged: () => void;
}

export const PromptCategoryManagerModal: React.FC<PromptCategoryManagerModalProps> = ({
  isOpen,
  onClose,
  onCategoriesChanged,
}) => {
  const [categories, setCategories] = useState<PromptCategoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Add / Edit form
  const [isEditing, setIsEditing] = useState<string | null>(null);
  const [editNome, setEditNome] = useState('');
  const [editDescricao, setEditDescricao] = useState('');
  const [editAtiva, setEditAtiva] = useState(true);

  // New category form
  const [newNome, setNewNome] = useState('');
  const [newDescricao, setNewDescricao] = useState('');

  const loadCategories = async () => {
    try {
      setLoading(true);
      const items = await api.getPromptCategoryItems();
      setCategories(items);
    } catch (err: any) {
      setError(err.message || 'Erro ao carregar categorias.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadCategories();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNome.trim()) {
      setError('O nome da categoria é obrigatório.');
      return;
    }
    setError('');
    setSuccess('');
    try {
      await api.createPromptCategory({
        nome: newNome.trim(),
        descricao: newDescricao.trim(),
        ativa: true,
      });
      setNewNome('');
      setNewDescricao('');
      setSuccess('Categoria criada com sucesso!');
      await loadCategories();
      onCategoriesChanged();
    } catch (err: any) {
      setError(err.message || 'Erro ao criar categoria.');
    }
  };

  const startEdit = (cat: PromptCategoryItem) => {
    setIsEditing(cat.id);
    setEditNome(cat.nome);
    setEditDescricao(cat.descricao || '');
    setEditAtiva(cat.ativa);
    setError('');
  };

  const cancelEdit = () => {
    setIsEditing(null);
    setEditNome('');
    setEditDescricao('');
    setEditAtiva(true);
  };

  const handleSaveEdit = async (catId: string) => {
    if (!editNome.trim()) {
      setError('O nome não pode ficar vazio.');
      return;
    }
    setError('');
    try {
      await api.updatePromptCategory(catId, {
        nome: editNome.trim(),
        descricao: editDescricao.trim(),
        ativa: editAtiva,
      });
      setIsEditing(null);
      setSuccess('Categoria atualizada com sucesso!');
      await loadCategories();
      onCategoriesChanged();
    } catch (err: any) {
      setError(err.message || 'Erro ao atualizar categoria.');
    }
  };

  const handleToggleActive = async (cat: PromptCategoryItem) => {
    try {
      setError('');
      await api.updatePromptCategory(cat.id, {
        ativa: !cat.ativa,
      });
      await loadCategories();
      onCategoriesChanged();
    } catch (err: any) {
      setError(err.message || 'Erro ao alternar status da categoria.');
    }
  };

  const handleDelete = async (cat: PromptCategoryItem) => {
    if (!confirm(`Deseja realmente remover a categoria "${cat.nome}"?`)) return;
    try {
      setError('');
      await api.deletePromptCategory(cat.id);
      await loadCategories();
      onCategoriesChanged();
    } catch (err: any) {
      setError(err.message || 'Erro ao excluir categoria.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4 backdrop-blur-xs">
      <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-slate-900">
                Gerenciamento Administrativo de Categorias de Prompts
              </h2>
              <span className="px-2 py-0.5 bg-indigo-100 text-indigo-800 border border-indigo-200 rounded text-[11px] font-semibold flex items-center gap-1">
                <Shield className="w-3 h-3" /> Coordenador Aluno
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Crie, renomeie, edite descrições e ative/desative categorias para a biblioteca de prompts (ex: Programação, Arte, etc).
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 text-xl font-bold px-2 py-1 leading-none"
          >
            &times;
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-md flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              {error}
            </div>
          )}

          {success && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs rounded-md flex items-center gap-2">
              <Check className="w-4 h-4 shrink-0" />
              {success}
            </div>
          )}

          {/* New Category Form */}
          <form onSubmit={handleCreate} className="p-4 bg-slate-50 border border-slate-200 rounded-lg space-y-3">
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
              <Plus className="w-3.5 h-3.5 text-indigo-700" />
              Adicionar Nova Categoria
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 uppercase mb-1">
                  Nome da Categoria *
                </label>
                <input
                  type="text"
                  required
                  value={newNome}
                  onChange={e => setNewNome(e.target.value)}
                  placeholder="Ex: Programação, Arte, Áudio..."
                  className="w-full px-3 py-1.5 text-xs bg-white border border-slate-300 rounded focus:outline-none focus:ring-2 focus:ring-indigo-600"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-600 uppercase mb-1">
                  Descrição (opcional)
                </label>
                <input
                  type="text"
                  value={newDescricao}
                  onChange={e => setNewDescricao(e.target.value)}
                  placeholder="Ex: Prompts focados em scripts, shaders e mecânica de jogo"
                  className="w-full px-3 py-1.5 text-xs bg-white border border-slate-300 rounded focus:outline-none focus:ring-2 focus:ring-indigo-600"
                />
              </div>
            </div>

            <div className="flex justify-end">
              <button
                type="submit"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-900 hover:bg-indigo-800 text-white text-xs font-semibold rounded shadow-xs transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                Cadastrar Categoria
              </button>
            </div>
          </form>

          {/* Categories List */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
              Categorias Existentes ({categories.length})
            </h3>

            {loading ? (
              <div className="text-xs text-slate-500 py-4 text-center">Carregando categorias...</div>
            ) : categories.length === 0 ? (
              <div className="text-xs text-slate-500 py-4 text-center">Nenhuma categoria cadastrada.</div>
            ) : (
              <div className="divide-y divide-slate-200 border border-slate-200 rounded-lg overflow-hidden bg-white shadow-2xs">
                {categories.map(cat => {
                  const editingThis = isEditing === cat.id;

                  if (editingThis) {
                    return (
                      <div key={cat.id} className="p-3 bg-indigo-50/50 space-y-3">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div>
                            <label className="block text-[10px] font-semibold text-slate-600 uppercase mb-0.5">
                              Nome *
                            </label>
                            <input
                              type="text"
                              value={editNome}
                              onChange={e => setEditNome(e.target.value)}
                              className="w-full px-2.5 py-1 text-xs bg-white border border-slate-300 rounded focus:outline-none focus:ring-2 focus:ring-indigo-600"
                            />
                          </div>
                          <div>
                            <label className="block text-[10px] font-semibold text-slate-600 uppercase mb-0.5">
                              Descrição
                            </label>
                            <input
                              type="text"
                              value={editDescricao}
                              onChange={e => setEditDescricao(e.target.value)}
                              className="w-full px-2.5 py-1 text-xs bg-white border border-slate-300 rounded focus:outline-none focus:ring-2 focus:ring-indigo-600"
                            />
                          </div>
                        </div>

                        <div className="flex items-center justify-between pt-1">
                          <label className="flex items-center gap-2 text-xs font-medium text-slate-700 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={editAtiva}
                              onChange={e => setEditAtiva(e.target.checked)}
                              className="rounded text-indigo-600 focus:ring-indigo-500"
                            />
                            Categoria Ativa
                          </label>

                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={cancelEdit}
                              className="px-2.5 py-1 text-xs font-medium text-slate-600 hover:bg-slate-200 rounded"
                            >
                              Cancelar
                            </button>
                            <button
                              type="button"
                              onClick={() => handleSaveEdit(cat.id)}
                              className="px-3 py-1 text-xs font-semibold bg-indigo-900 hover:bg-indigo-800 text-white rounded"
                            >
                              Salvar
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  }

                  return (
                    <div
                      key={cat.id}
                      className={`p-3 flex items-center justify-between gap-3 transition-colors ${
                        cat.ativa ? 'hover:bg-slate-50' : 'bg-slate-50/70 opacity-75'
                      }`}
                    >
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-slate-900">{cat.nome}</span>
                          {cat.ativa ? (
                            <span className="px-1.5 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded text-[10px] font-semibold">
                              Ativa
                            </span>
                          ) : (
                            <span className="px-1.5 py-0.5 bg-slate-100 text-slate-500 border border-slate-200 rounded text-[10px] font-semibold">
                              Desativada
                            </span>
                          )}
                        </div>
                        {cat.descricao && (
                          <p className="text-[11px] text-slate-500">{cat.descricao}</p>
                        )}
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          onClick={() => handleToggleActive(cat)}
                          className={`px-2 py-1 text-[11px] font-semibold rounded border transition-colors flex items-center gap-1 ${
                            cat.ativa
                              ? 'border-amber-200 text-amber-800 hover:bg-amber-50'
                              : 'border-emerald-200 text-emerald-800 hover:bg-emerald-50'
                          }`}
                          title={cat.ativa ? 'Desativar categoria' : 'Ativar categoria'}
                        >
                          <Power className="w-3 h-3" />
                          {cat.ativa ? 'Desativar' : 'Ativar'}
                        </button>

                        <button
                          onClick={() => startEdit(cat)}
                          className="p-1.5 text-slate-400 hover:text-slate-700 rounded hover:bg-slate-100 transition-colors"
                          title="Editar categoria"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>

                        <button
                          onClick={() => handleDelete(cat)}
                          className="p-1.5 text-slate-400 hover:text-rose-700 rounded hover:bg-rose-50 transition-colors"
                          title="Excluir categoria"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-slate-200 bg-slate-50 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-1.5 text-xs font-semibold bg-slate-900 hover:bg-slate-800 text-white rounded-md transition-colors"
          >
            Concluir
          </button>
        </div>
      </div>
    </div>
  );
};
