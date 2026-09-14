import React, { useEffect, useState } from 'react';
import { api } from '../services/api.js';
import { AIExperiment, Game, AIModel, Participant, ExperimentAcceptance } from '../types.js';
import { useAuth } from '../context/AuthContext.js';
import { EmptyState } from './EmptyState.js';
import { Plus, Edit2, Trash2, FlaskConical, Star, Clock, AlertTriangle, CheckCircle2 } from 'lucide-react';

export const ExperimentsView: React.FC = () => {
  const { currentUser, canManageAdmin, canRegisterExperiments } = useAuth();
  const [experiments, setExperiments] = useState<AIExperiment[]>([]);
  const [games, setGames] = useState<Game[]>([]);
  const [ais, setAis] = useState<AIModel[]>([]);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal
  const [modalOpen, setModalOpen] = useState(false);
  const [editingExp, setEditingExp] = useState<AIExperiment | null>(null);

  // Form states
  const [jogoId, setJogoId] = useState('');
  const [tarefaRealizada, setTarefaRealizada] = useState('');
  const [iaId, setIaId] = useState('');
  const [modelo, setModelo] = useState('');
  const [prompt, setPrompt] = useState('');
  const [parametros, setParametros] = useState('temperatura=0.7');
  const [resultadoObtido, setResultadoObtido] = useState('');
  const [resultadoAceito, setResultadoAceito] = useState<ExperimentAcceptance>('Aceito com pequenas alterações');
  const [alteracoesManuais, setAlteracoesManuais] = useState('');
  const [problemasEncontrados, setProblemasEncontrados] = useState('');
  const [avaliacao, setAvaliacao] = useState<number>(4);
  const [tempoAproximadoMinutos, setTempoAproximadoMinutos] = useState<number>(30);
  const [data, setData] = useState(new Date().toISOString().split('T')[0]);
  const [alunoResponsavelId, setAlunoResponsavelId] = useState('');
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);

  const loadData = async () => {
    try {
      setLoading(true);
      const [expsData, gamesData, aisData, partsData] = await Promise.all([
        api.getExperiments(),
        api.getGames(),
        api.getAIs(),
        api.getParticipants(),
      ]);
      setExperiments(expsData);
      setGames(gamesData);
      setAis(aisData);
      setParticipants(partsData);
    } catch (err) {
      console.error('Failed to load experiments', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const openCreateModal = () => {
    setEditingExp(null);
    setJogoId(games.length > 0 ? games[0].id : '');
    setTarefaRealizada('');
    const firstAI = ais.length > 0 ? ais[0] : null;
    setIaId(firstAI ? firstAI.id : '');
    setModelo(firstAI ? firstAI.modelo : '');
    setPrompt('');
    setParametros('temperatura=0.7');
    setResultadoObtido('');
    setResultadoAceito('Aceito com pequenas alterações');
    setAlteracoesManuais('');
    setProblemasEncontrados('');
    setAvaliacao(4);
    setTempoAproximadoMinutos(30);
    setData(new Date().toISOString().split('T')[0]);
    setAlunoResponsavelId(currentUser?.id || (participants.length > 0 ? participants[0].id : ''));
    setFormError('');
    setModalOpen(true);
  };

  const openEditModal = (exp: AIExperiment) => {
    setEditingExp(exp);
    setJogoId(exp.jogoId);
    setTarefaRealizada(exp.tarefaRealizada);
    setIaId(exp.iaId);
    setModelo(exp.modelo);
    setPrompt(exp.prompt);
    setParametros(exp.parametros || '');
    setResultadoObtido(exp.resultadoObtido);
    setResultadoAceito(exp.resultadoAceito);
    setAlteracoesManuais(exp.alteracoesManuais || '');
    setProblemasEncontrados(exp.problemasEncontrados || '');
    setAvaliacao(exp.avaliacao);
    setTempoAproximadoMinutos(exp.tempoAproximadoMinutos);
    setData(exp.data);
    setAlunoResponsavelId(exp.alunoResponsavelId);
    setFormError('');
    setModalOpen(true);
  };

  const handleSelectAI = (selectedId: string) => {
    setIaId(selectedId);
    const selected = ais.find(a => a.id === selectedId);
    if (selected) {
      setModelo(selected.modelo);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!jogoId || !iaId || !tarefaRealizada.trim() || !prompt.trim() || !resultadoObtido.trim()) {
      setFormError('Jogo, IA, tarefa realizada, prompt e resultado são obrigatórios.');
      return;
    }

    try {
      setSaving(true);
      setFormError('');

      const payload = {
        jogoId,
        tarefaRealizada: tarefaRealizada.trim(),
        iaId,
        modelo: modelo.trim(),
        prompt: prompt.trim(),
        parametros: parametros.trim(),
        resultadoObtido: resultadoObtido.trim(),
        resultadoAceito,
        alteracoesManuais: alteracoesManuais.trim(),
        problemasEncontrados: problemasEncontrados.trim(),
        avaliacao: Number(avaliacao),
        tempoAproximadoMinutos: Number(tempoAproximadoMinutos),
        data,
        alunoResponsavelId,
      };

      if (editingExp) {
        await api.updateExperiment(editingExp.id, payload);
      } else {
        await api.createExperiment(payload);
      }

      setModalOpen(false);
      await loadData();
    } catch (err: any) {
      setFormError(err.message || 'Erro ao salvar experimento.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (exp: AIExperiment) => {
    if (!confirm(`Deseja excluir o experimento "${exp.tarefaRealizada}"?`)) return;
    try {
      await api.deleteExperiment(exp.id);
      await loadData();
    } catch (err: any) {
      alert(err.message || 'Erro ao excluir experimento.');
    }
  };

  const getAcceptanceBadge = (acc: ExperimentAcceptance) => {
    switch (acc) {
      case 'Aceito sem alterações':
        return <span className="px-2 py-0.5 text-[11px] font-semibold bg-emerald-100 text-emerald-800 rounded">Aceito sem alterações</span>;
      case 'Aceito com pequenas alterações':
        return <span className="px-2 py-0.5 text-[11px] font-semibold bg-blue-100 text-blue-800 rounded">Pequenas alterações</span>;
      case 'Aceito com muitas alterações':
        return <span className="px-2 py-0.5 text-[11px] font-semibold bg-amber-100 text-amber-800 rounded">Muitas alterações</span>;
      case 'Rejeitado':
        return <span className="px-2 py-0.5 text-[11px] font-semibold bg-rose-100 text-rose-800 rounded">Rejeitado</span>;
      default:
        return acc;
    }
  };

  const canEdit = canManageAdmin || canRegisterExperiments;

  if (loading) {
    return <div className="p-8 text-center text-sm text-slate-500">Carregando experimentos acadêmicos...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">Experimentos com Inteligência Artificial</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Registro experimental dos prompts, parâmetros, resultados, esforço de ajuste manual e eficácia das IAs.
          </p>
        </div>

        {canEdit && (
          <button
            onClick={openCreateModal}
            className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-900 hover:bg-indigo-800 text-white text-xs font-semibold rounded-md shadow-xs transition-colors self-start sm:self-auto"
          >
            <Plus className="w-4 h-4" />
            Novo Experimento
          </button>
        )}
      </div>

      {experiments.length === 0 ? (
        <EmptyState
          message="Nenhum registro encontrado."
          subMessage="Cadastre o primeiro registro para começar. Este módulo é fundamental para a pesquisa científica do projeto."
          actionLabel={canEdit ? 'Registrar Primeiro Experimento' : undefined}
          onAction={canEdit ? openCreateModal : undefined}
        />
      ) : (
        <div className="space-y-4">
          {experiments.map(exp => (
            <div
              key={exp.id}
              className="bg-white border border-slate-200 rounded-lg p-5 shadow-xs space-y-3 hover:border-slate-300 transition-colors"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-900 text-sm">{exp.tarefaRealizada}</span>
                    <span className="text-slate-400">•</span>
                    <span className="text-xs font-semibold text-indigo-900">Jogo: {exp.jogoNome}</span>
                  </div>
                  <div className="text-xs text-slate-500 mt-0.5">
                    IA: <span className="font-semibold text-slate-700">{exp.iaNome}</span> ({exp.modelo})
                    {exp.parametros && <span className="font-mono text-slate-400 ml-2">[{exp.parametros}]</span>}
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  {getAcceptanceBadge(exp.resultadoAceito)}
                  <div className="flex items-center gap-1 bg-amber-50 px-2 py-0.5 rounded border border-amber-200 text-xs font-bold text-amber-900">
                    <Star className="w-3.5 h-3.5 fill-amber-500 text-amber-500" />
                    {exp.avaliacao}/5
                  </div>
                </div>
              </div>

              {/* Prompt and Output */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                <div>
                  <span className="font-semibold text-slate-500 uppercase tracking-wider text-[10px] block mb-1">
                    Prompt Utilizado
                  </span>
                  <pre className="bg-slate-50 p-3 rounded border border-slate-200 font-mono text-[11px] text-slate-800 whitespace-pre-wrap max-h-36 overflow-y-auto">
                    {exp.prompt}
                  </pre>
                </div>

                <div>
                  <span className="font-semibold text-slate-500 uppercase tracking-wider text-[10px] block mb-1">
                    Resultado Obtido pela IA
                  </span>
                  <div className="bg-slate-50 p-3 rounded border border-slate-200 text-slate-700 max-h-36 overflow-y-auto whitespace-pre-wrap leading-relaxed">
                    {exp.resultadoObtido}
                  </div>
                </div>
              </div>

              {/* Changes & Problems */}
              {(exp.alteracoesManuais || exp.problemasEncontrados) && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 text-xs">
                  {exp.alteracoesManuais && (
                    <div className="p-2.5 bg-blue-50/50 rounded border border-blue-100 text-slate-700">
                      <span className="font-bold text-blue-900">Alterações Manuais Necessárias: </span>
                      {exp.alteracoesManuais}
                    </div>
                  )}
                  {exp.problemasEncontrados && (
                    <div className="p-2.5 bg-rose-50/50 rounded border border-rose-100 text-slate-700">
                      <span className="font-bold text-rose-900">Problemas / Alucinações: </span>
                      {exp.problemasEncontrados}
                    </div>
                  )}
                </div>
              )}

              {/* Footer info & actions */}
              <div className="pt-3 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-slate-500">
                <div className="flex items-center gap-4">
                  <span>Responsável: <strong className="text-slate-800">{exp.alunoResponsavelNome}</strong></span>
                  <span>Data: <strong className="font-mono text-slate-700">{exp.data}</strong></span>
                  <span className="flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5" /> {exp.tempoAproximadoMinutos} min
                  </span>
                </div>

                {canEdit && (
                  <div className="flex items-center gap-2 self-end sm:self-auto">
                    <button
                      onClick={() => openEditModal(exp)}
                      className="p-1 text-slate-400 hover:text-indigo-700 hover:bg-indigo-50 rounded text-xs inline-flex items-center gap-1 font-medium"
                    >
                      <Edit2 className="w-3 h-3" /> Editar
                    </button>
                    {canManageAdmin && (
                      <button
                        onClick={() => handleDelete(exp)}
                        className="p-1 text-slate-400 hover:text-rose-700 hover:bg-rose-50 rounded text-xs inline-flex items-center gap-1 font-medium"
                      >
                        <Trash2 className="w-3 h-3" /> Excluir
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal Novo / Editar Experimento */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-white rounded-xl shadow-xl border border-slate-200 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between sticky top-0 z-10">
              <h2 className="text-base font-bold text-slate-900">
                {editingExp ? 'Editar Experimento' : 'Novo Experimento com IA'}
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
                    Jogo Vinculado *
                  </label>
                  <select
                    value={jogoId}
                    onChange={e => setJogoId(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-indigo-600"
                  >
                    {games.length === 0 && <option value="">Nenhum jogo cadastrado</option>}
                    {games.map(g => (
                      <option key={g.id} value={g.id}>
                        {g.nome}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    Tarefa Realizada *
                  </label>
                  <input
                    type="text"
                    required
                    value={tarefaRealizada}
                    onChange={e => setTarefaRealizada(e.target.value)}
                    placeholder="Ex: Geração de diálogo para NPC Alquimista"
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-600"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    IA Utilizada *
                  </label>
                  <select
                    value={iaId}
                    onChange={e => handleSelectAI(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-indigo-600"
                  >
                    {ais.length === 0 && <option value="">Nenhuma IA cadastrada</option>}
                    {ais.map(a => (
                      <option key={a.id} value={a.id}>
                        {a.nome} ({a.empresaProvedor})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    Versão / Modelo *
                  </label>
                  <input
                    type="text"
                    required
                    value={modelo}
                    onChange={e => setModelo(e.target.value)}
                    placeholder="Ex: Gemini 2.5 Flash"
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-600"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    Parâmetros
                  </label>
                  <input
                    type="text"
                    value={parametros}
                    onChange={e => setParametros(e.target.value)}
                    placeholder="temperatura=0.7, top_p=0.9"
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-600 font-mono text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Prompt Utilizado *
                </label>
                <textarea
                  rows={3}
                  required
                  value={prompt}
                  onChange={e => setPrompt(e.target.value)}
                  placeholder="Texto exato do prompt enviado à IA..."
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-600 font-mono text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Resultado Obtido pela IA *
                </label>
                <textarea
                  rows={3}
                  required
                  value={resultadoObtido}
                  onChange={e => setResultadoObtido(e.target.value)}
                  placeholder="Resposta gerada pela IA..."
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-600 text-sm"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    Resultado Aceito? *
                  </label>
                  <select
                    value={resultadoAceito}
                    onChange={e => setResultadoAceito(e.target.value as ExperimentAcceptance)}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-indigo-600"
                  >
                    <option value="Aceito sem alterações">Aceito sem alterações</option>
                    <option value="Aceito com pequenas alterações">Aceito com pequenas alterações</option>
                    <option value="Aceito com muitas alterações">Aceito com muitas alterações</option>
                    <option value="Rejeitado">Rejeitado</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    Avaliação do Aluno (1 a 5) *
                  </label>
                  <select
                    value={avaliacao}
                    onChange={e => setAvaliacao(Number(e.target.value))}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-indigo-600 font-semibold"
                  >
                    <option value={5}>5 - Excelente eficácia</option>
                    <option value={4}>4 - Boa eficácia</option>
                    <option value={3}>3 - Regular / Mediano</option>
                    <option value={2}>2 - Baixa eficácia</option>
                    <option value={1}>1 - Muito Ruim / Inútil</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    Tempo Gasto (minutos)
                  </label>
                  <input
                    type="number"
                    min={1}
                    value={tempoAproximadoMinutos}
                    onChange={e => setTempoAproximadoMinutos(Number(e.target.value))}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-600"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    Alterações Manuais Necessárias
                  </label>
                  <textarea
                    rows={2}
                    value={alteracoesManuais}
                    onChange={e => setAlteracoesManuais(e.target.value)}
                    placeholder="Quais ajustes foram feitos manualmente pelos alunos..."
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-600 text-xs"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    Problemas Encontrados
                  </label>
                  <textarea
                    rows={2}
                    value={problemasEncontrados}
                    onChange={e => setProblemasEncontrados(e.target.value)}
                    placeholder="Bugs, falhas lógicas, incoerências..."
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-600 text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    Data do Experimento
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
                    Aluno Responsável
                  </label>
                  <select
                    value={alunoResponsavelId}
                    onChange={e => setAlunoResponsavelId(e.target.value)}
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
                  {saving ? 'Salvando...' : 'Salvar Experimento'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
