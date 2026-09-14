import React, { useEffect, useState } from 'react';
import { api } from '../services/api.js';
import { ProjectDocument, DocumentCategory, DocumentAccessLevel, Game } from '../types.js';
import { useAuth } from '../context/AuthContext.js';
import { EmptyState } from './EmptyState.js';
import {
  FileText,
  Plus,
  Search,
  BookOpen,
  Lock,
  Globe,
  ExternalLink,
  Edit2,
  Trash2,
  Clock,
  User,
  Tag,
  Gamepad2,
  Printer,
  ChevronRight,
  ShieldAlert,
} from 'lucide-react';

export const DocumentsView: React.FC = () => {
  const { currentUser, isCoordenadorAluno, isProfessorOrientador, isProfessorColaborador, isAluno, isAdmin } = useAuth();
  const [documents, setDocuments] = useState<ProjectDocument[]>([]);
  const [games, setGames] = useState<Game[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('todos');
  const [gameFilter, setGameFilter] = useState<string>('todos');

  // Reader Modal
  const [viewingDoc, setViewingDoc] = useState<ProjectDocument | null>(null);

  // Form Modal
  const [modalOpen, setModalOpen] = useState(false);
  const [editingDoc, setEditingDoc] = useState<ProjectDocument | null>(null);

  // Form fields
  const [titulo, setTitulo] = useState('');
  const [categoria, setCategoria] = useState<DocumentCategory>('Especificação Técnica');
  const [descricao, setDescricao] = useState('');
  const [conteudo, setConteudo] = useState('');
  const [jogoId, setJogoId] = useState('');
  const [versao, setVersao] = useState('1.0');
  const [nivelAcesso, setNivelAcesso] = useState<DocumentAccessLevel>('Todos');
  const [linkExterno, setLinkExterno] = useState('');
  const [tagsInput, setTagsInput] = useState('');
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);

  const canManagePrivileged = isAdmin || isCoordenadorAluno || isProfessorOrientador || isProfessorColaborador;

  const loadData = async () => {
    try {
      setLoading(true);
      const [docsData, gamesData] = await Promise.all([
        api.getDocuments(),
        api.getGames(),
      ]);
      setDocuments(docsData);
      setGames(gamesData);
    } catch (err) {
      console.error('Failed to load documents', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const openCreateModal = () => {
    setEditingDoc(null);
    setTitulo('');
    setCategoria('Especificação Técnica');
    setDescricao('');
    setConteudo('');
    setJogoId(games.length > 0 ? games[0].id : '');
    setVersao('1.0');
    setNivelAcesso('Todos');
    setLinkExterno('');
    setTagsInput('');
    setFormError('');
    setModalOpen(true);
  };

  const openEditModal = (doc: ProjectDocument) => {
    setEditingDoc(doc);
    setTitulo(doc.titulo);
    setCategoria(doc.categoria);
    setDescricao(doc.descricao);
    setConteudo(doc.conteudo);
    setJogoId(doc.jogoId || '');
    setVersao(doc.versao || '1.0');
    setNivelAcesso(doc.nivelAcesso || 'Todos');
    setLinkExterno(doc.linkExterno || '');
    setTagsInput((doc.tags || []).join(', '));
    setFormError('');
    setModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!titulo.trim() || !conteudo.trim()) {
      setFormError('Título e conteúdo são obrigatórios.');
      return;
    }

    try {
      setSaving(true);
      setFormError('');

      const tags = tagsInput
        .split(',')
        .map(t => t.trim())
        .filter(t => t.length > 0);

      const payload = {
        titulo: titulo.trim(),
        categoria,
        descricao: descricao.trim(),
        conteudo: conteudo.trim(),
        jogoId: jogoId || undefined,
        versao: versao.trim() || '1.0',
        nivelAcesso,
        linkExterno: linkExterno.trim() || undefined,
        tags,
      };

      if (editingDoc) {
        await api.updateDocument(editingDoc.id, payload);
      } else {
        await api.createDocument(payload);
      }

      setModalOpen(false);
      await loadData();
    } catch (err: any) {
      setFormError(err.message || 'Erro ao salvar documento.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (doc: ProjectDocument) => {
    if (!confirm(`Deseja excluir o documento "${doc.titulo}"?`)) return;
    try {
      await api.deleteDocument(doc.id);
      await loadData();
      if (viewingDoc?.id === doc.id) {
        setViewingDoc(null);
      }
    } catch (err: any) {
      alert(err.message || 'Erro ao excluir documento.');
    }
  };

  const categories: DocumentCategory[] = [
    'Especificação Técnica',
    'Relatório de Progresso',
    'Manual',
    'Artigo Científico',
    'Ata de Reunião',
    'Outro',
  ];

  const filteredDocs = documents.filter(doc => {
    const matchesCategory = categoryFilter === 'todos' || doc.categoria === categoryFilter;
    const matchesGame = gameFilter === 'todos' || doc.jogoId === gameFilter;
    const searchLower = searchTerm.toLowerCase();
    const matchesSearch =
      doc.titulo.toLowerCase().includes(searchLower) ||
      doc.descricao.toLowerCase().includes(searchLower) ||
      doc.autorNome.toLowerCase().includes(searchLower) ||
      (doc.tags && doc.tags.some(t => t.toLowerCase().includes(searchLower)));

    return matchesCategory && matchesGame && matchesSearch;
  });

  const getCategoryBadge = (cat: DocumentCategory) => {
    switch (cat) {
      case 'Especificação Técnica':
        return <span className="px-2 py-0.5 text-[11px] font-semibold bg-blue-50 text-blue-700 border border-blue-200 rounded">Especificação</span>;
      case 'Relatório de Progresso':
        return <span className="px-2 py-0.5 text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 rounded">Progresso</span>;
      case 'Manual':
        return <span className="px-2 py-0.5 text-[11px] font-semibold bg-amber-50 text-amber-700 border border-amber-200 rounded">Manual</span>;
      case 'Artigo Científico':
        return <span className="px-2 py-0.5 text-[11px] font-semibold bg-purple-50 text-purple-700 border border-purple-200 rounded">Artigo</span>;
      case 'Ata de Reunião':
        return <span className="px-2 py-0.5 text-[11px] font-semibold bg-slate-100 text-slate-700 border border-slate-200 rounded">Ata</span>;
      default:
        return <span className="px-2 py-0.5 text-[11px] font-semibold bg-slate-50 text-slate-600 border border-slate-200 rounded">{cat}</span>;
    }
  };

  if (loading) {
    return <div className="p-8 text-center text-sm text-slate-500">Carregando acervo de documentação...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">Módulo de Documentação</h1>
            <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-indigo-50 border border-indigo-200 rounded text-[11px] font-semibold text-indigo-700">
              <BookOpen className="w-3 h-3" /> Acervo do Projeto
            </span>
          </div>
          <p className="text-sm text-slate-500 mt-0.5">
            Registro, organização e controle de acesso de especificações técnicas, relatórios e manuais.
          </p>
        </div>

        <button
          onClick={openCreateModal}
          className="inline-flex items-center gap-1.5 px-4 py-2 bg-indigo-900 hover:bg-indigo-800 text-white text-xs font-semibold rounded-md shadow-xs transition-colors self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          Novo Documento
        </button>
      </div>

      {/* Role Notice */}
      {isAluno && (
        <div className="p-3 bg-sky-50 border border-sky-200 rounded-lg text-xs text-sky-800 flex items-start gap-2">
          <Globe className="w-4 h-4 shrink-0 text-sky-600 mt-0.5" />
          <div>
            <strong>Visibilidade por Permissão:</strong> Você tem acesso aos documentos públicos, da sua equipe e criados por você. Documentos de governança exclusivos de professores e coordenador permanecem restritos.
          </div>
        </div>
      )}

      {/* Filters Bar */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 bg-white p-3 rounded-lg border border-slate-200 shadow-2xs">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Buscar por título, descrição, autor ou tags..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-white border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-600"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2 text-xs">
          <select
            value={categoryFilter}
            onChange={e => setCategoryFilter(e.target.value)}
            className="bg-white border border-slate-300 rounded px-2.5 py-1.5 text-xs text-slate-800 font-medium focus:outline-none focus:ring-2 focus:ring-indigo-600"
          >
            <option value="todos">Todas as Categorias</option>
            {categories.map(c => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>

          <select
            value={gameFilter}
            onChange={e => setGameFilter(e.target.value)}
            className="bg-white border border-slate-300 rounded px-2.5 py-1.5 text-xs text-slate-800 font-medium focus:outline-none focus:ring-2 focus:ring-indigo-600"
          >
            <option value="todos">Todos os Jogos</option>
            {games.map(g => (
              <option key={g.id} value={g.id}>{g.nome}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Document Grid */}
      {filteredDocs.length === 0 ? (
        <EmptyState
          message="Nenhum documento encontrado."
          subMessage="Adicione especificações técnicas, manuais ou relatórios de progresso para a equipe."
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredDocs.map(doc => {
            const canEditThis = canManagePrivileged || doc.autorId === currentUser?.id;
            const isRestricted = doc.nivelAcesso === 'Apenas Professores e Coordenador';

            return (
              <div
                key={doc.id}
                className="bg-white rounded-lg border border-slate-200 shadow-2xs hover:shadow-xs transition-shadow flex flex-col justify-between overflow-hidden"
              >
                <div className="p-4 space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex flex-wrap items-center gap-1.5">
                      {getCategoryBadge(doc.categoria)}
                      <span className="text-[10px] font-mono font-semibold px-1.5 py-0.5 bg-slate-100 text-slate-600 rounded">
                        v{doc.versao}
                      </span>
                    </div>

                    {isRestricted ? (
                      <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 bg-amber-50 text-amber-800 border border-amber-200 rounded">
                        <Lock className="w-2.5 h-2.5" /> Restrito
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 bg-slate-50 text-slate-600 border border-slate-200 rounded">
                        <Globe className="w-2.5 h-2.5" /> Público
                      </span>
                    )}
                  </div>

                  <div>
                    <h3 className="text-sm font-bold text-slate-900 leading-snug line-clamp-1 hover:text-indigo-900 transition-colors">
                      {doc.titulo}
                    </h3>
                    {doc.descricao && (
                      <p className="text-xs text-slate-600 line-clamp-2 mt-1">
                        {doc.descricao}
                      </p>
                    )}
                  </div>

                  {doc.jogoNome && (
                    <div className="flex items-center gap-1 text-[11px] font-medium text-indigo-900 bg-indigo-50/70 px-2 py-1 rounded">
                      <Gamepad2 className="w-3.5 h-3.5 text-indigo-700 shrink-0" />
                      <span className="truncate">{doc.jogoNome}</span>
                    </div>
                  )}

                  {doc.tags && doc.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {doc.tags.map((t, idx) => (
                        <span
                          key={idx}
                          className="inline-flex items-center gap-0.5 text-[10px] px-1.5 py-0.5 bg-slate-100 text-slate-600 rounded"
                        >
                          <Tag className="w-2.5 h-2.5 text-slate-400" />
                          {t}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                <div className="px-4 py-2.5 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                  <div className="flex items-center gap-1.5 text-[11px] truncate max-w-[150px]">
                    <User className="w-3 h-3 text-slate-400 shrink-0" />
                    <span className="truncate font-medium text-slate-700">{doc.autorNome}</span>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    {canEditThis && (
                      <>
                        <button
                          onClick={() => openEditModal(doc)}
                          className="p-1 text-slate-400 hover:text-slate-700 transition-colors"
                          title="Editar documento"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDelete(doc)}
                          className="p-1 text-slate-400 hover:text-rose-700 transition-colors"
                          title="Excluir documento"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </>
                    )}

                    <button
                      onClick={() => setViewingDoc(doc)}
                      className="inline-flex items-center gap-1 px-2.5 py-1 bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 font-semibold text-[11px] rounded transition-colors shadow-2xs ml-1"
                    >
                      Ler <ChevronRight className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Reader Modal */}
      {viewingDoc && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  {getCategoryBadge(viewingDoc.categoria)}
                  <span className="text-xs font-mono font-semibold px-2 py-0.5 bg-slate-200 text-slate-700 rounded">
                    v{viewingDoc.versao}
                  </span>
                  <span className="text-xs text-slate-500 font-medium">
                    Criado em {viewingDoc.dataCriacao}
                  </span>
                </div>
                <h2 className="text-lg font-bold text-slate-900 mt-1">
                  {viewingDoc.titulo}
                </h2>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => window.print()}
                  className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded hover:bg-slate-100 transition-colors"
                  title="Imprimir documento"
                >
                  <Printer className="w-3.5 h-3.5" /> Imprimir
                </button>
                <button
                  onClick={() => setViewingDoc(null)}
                  className="text-slate-400 hover:text-slate-600 text-xl font-bold px-2 py-1 leading-none"
                >
                  &times;
                </button>
              </div>
            </div>

            {/* Metadata banner */}
            <div className="px-6 py-2 bg-slate-100/70 border-b border-slate-200 text-xs flex flex-wrap items-center justify-between gap-2 text-slate-600">
              <div className="flex items-center gap-4">
                <span>Autor: <strong className="text-slate-800">{viewingDoc.autorNome}</strong></span>
                {viewingDoc.jogoNome && (
                  <span>Jogo: <strong className="text-indigo-900">{viewingDoc.jogoNome}</strong></span>
                )}
                <span>Acesso: <strong className="text-slate-800">{viewingDoc.nivelAcesso}</strong></span>
              </div>
              {viewingDoc.linkExterno && (
                <a
                  href={viewingDoc.linkExterno}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 text-indigo-700 hover:text-indigo-900 font-semibold"
                >
                  <ExternalLink className="w-3 h-3" /> Link Externo
                </a>
              )}
            </div>

            {/* Modal Body / Document Content */}
            <div className="p-6 overflow-y-auto flex-1 space-y-4">
              {viewingDoc.descricao && (
                <div className="p-3 bg-slate-50 border-l-4 border-indigo-600 rounded-r text-xs text-slate-700 italic">
                  {viewingDoc.descricao}
                </div>
              )}

              <div className="prose prose-sm max-w-none text-slate-800 font-sans whitespace-pre-wrap leading-relaxed">
                {viewingDoc.conteudo}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-3 border-t border-slate-200 bg-slate-50 flex items-center justify-between">
              <div className="text-[11px] text-slate-500">
                Identificador: <span className="font-mono">{viewingDoc.id}</span>
              </div>
              <button
                onClick={() => setViewingDoc(null)}
                className="px-4 py-1.5 text-xs font-semibold bg-slate-900 hover:bg-slate-800 text-white rounded-md transition-colors"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Criar / Editar Documento */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-white rounded-xl shadow-xl border border-slate-200 w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
              <h2 className="text-base font-bold text-slate-900">
                {editingDoc ? 'Editar Documento' : 'Novo Documento'}
              </h2>
              <button
                onClick={() => setModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 text-lg leading-none"
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleSave} className="p-6 space-y-4 overflow-y-auto flex-1">
              {formError && (
                <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-md">
                  {formError}
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    Título do Documento *
                  </label>
                  <input
                    type="text"
                    required
                    value={titulo}
                    onChange={e => setTitulo(e.target.value)}
                    placeholder="Ex: Especificação de Integração do Modelo Claude 3.5 com Godot"
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-600"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    Versão
                  </label>
                  <input
                    type="text"
                    value={versao}
                    onChange={e => setVersao(e.target.value)}
                    placeholder="Ex: 1.0"
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-600 font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    Categoria *
                  </label>
                  <select
                    value={categoria}
                    onChange={e => setCategoria(e.target.value as DocumentCategory)}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-indigo-600"
                  >
                    {categories.map(c => (
                      <option key={c} value={c}>{c}</option>
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
                    <option value="">Geral (Sem jogo específico)</option>
                    {games.map(g => (
                      <option key={g.id} value={g.id}>{g.nome}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    Nível de Acesso
                  </label>
                  <select
                    value={nivelAcesso}
                    onChange={e => setNivelAcesso(e.target.value as DocumentAccessLevel)}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-indigo-600"
                  >
                    <option value="Todos">Todos (Público no Projeto)</option>
                    <option value="Apenas Professores e Coordenador">Apenas Professores e Coordenador</option>
                    <option value="Restrito">Restrito</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Resumo / Descrição Curta
                </label>
                <input
                  type="text"
                  value={descricao}
                  onChange={e => setDescricao(e.target.value)}
                  placeholder="Breve sumário do propósito deste documento..."
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-600"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Conteúdo do Documento *
                </label>
                <textarea
                  rows={8}
                  required
                  value={conteudo}
                  onChange={e => setConteudo(e.target.value)}
                  placeholder="Escreva a especificação, relatório, manual ou ata detalhada aqui..."
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-600 font-mono"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    Tags (separadas por vírgula)
                  </label>
                  <input
                    type="text"
                    value={tagsInput}
                    onChange={e => setTagsInput(e.target.value)}
                    placeholder="godot, ia, api, tutorial"
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-600"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    Link Externo (Drive, Repo, Artigo)
                  </label>
                  <input
                    type="url"
                    value={linkExterno}
                    onChange={e => setLinkExterno(e.target.value)}
                    placeholder="https://drive.google.com/..."
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
                  {saving ? 'Salvando...' : 'Salvar Documento'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
