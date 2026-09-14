import React, { useEffect, useState } from 'react';
import { api } from '../services/api.js';
import { TestSuite, TestEvaluation, Game, Participant, TestType, TestSuiteStatus } from '../types.js';
import { useAuth } from '../context/AuthContext.js';
import { EmptyState } from './EmptyState.js';
import { Plus, Edit2, Trash2, FlaskRound as FlaskTest, ClipboardCheck, Star, Calendar } from 'lucide-react';

export const TestsView: React.FC = () => {
  const { currentUser, canManageAdmin, canSubmitEvaluations } = useAuth();
  const [testSuites, setTestSuites] = useState<TestSuite[]>([]);
  const [games, setGames] = useState<Game[]>([]);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal create/edit test suite
  const [suiteModalOpen, setSuiteModalOpen] = useState(false);
  const [editingSuite, setEditingSuite] = useState<TestSuite | null>(null);

  // Modal evaluate test
  const [evalModalOpen, setEvalModalOpen] = useState(false);
  const [targetSuiteForEval, setTargetSuiteForEval] = useState<TestSuite | null>(null);

  // Form states - Suite
  const [nome, setNome] = useState('');
  const [jogoId, setJogoId] = useState('');
  const [versaoTestada, setVersaoTestada] = useState('v0.1');
  const [tipo, setTipo] = useState<TestType>('jogabilidade');
  const [objetivo, setObjetivo] = useState('');
  const [criteriosInput, setCriteriosInput] = useState('Jogabilidade, Gráficos, Eficácia da IA, Balanceamento');
  const [participantesTestadoresIds, setParticipantesTestadoresIds] = useState<string[]>([]);
  const [responsavelId, setResponsavelId] = useState('');
  const [dataInicial, setDataInicial] = useState(new Date().toISOString().split('T')[0]);
  const [dataFinal, setDataFinal] = useState('');
  const [status, setStatus] = useState<TestSuiteStatus>('Planejado');
  const [observacoes, setObservacoes] = useState('');
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);

  // Form states - Evaluation (Rule 16: Permitir que participantes preencham formulário de avaliação)
  const [evalNotas, setEvalNotas] = useState<{ [crit: string]: number }>({});
  const [evalComentarios, setEvalComentarios] = useState('');
  const [evalProblemas, setEvalProblemas] = useState('');
  const [evalSugestoes, setEvalSugestoes] = useState('');
  const [evalError, setEvalError] = useState('');
  const [evalSaving, setEvalSaving] = useState(false);

  const loadData = async () => {
    try {
      setLoading(true);
      const [suitesData, gamesData, partsData] = await Promise.all([
        api.getTestSuites(),
        api.getGames(),
        api.getParticipants(),
      ]);
      setTestSuites(suitesData);
      setGames(gamesData);
      setParticipants(partsData);
    } catch (err) {
      console.error('Failed to load test suites', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const openCreateSuiteModal = () => {
    setEditingSuite(null);
    setNome('');
    setJogoId(games.length > 0 ? games[0].id : '');
    setVersaoTestada('v0.1');
    setTipo('jogabilidade');
    setObjetivo('');
    setCriteriosInput('Jogabilidade, Gráficos, Eficácia da IA, Balanceamento');
    setParticipantesTestadoresIds([]);
    setResponsavelId(currentUser?.id || (participants.length > 0 ? participants[0].id : ''));
    setDataInicial(new Date().toISOString().split('T')[0]);
    setDataFinal('');
    setStatus('Planejado');
    setObservacoes('');
    setFormError('');
    setSuiteModalOpen(true);
  };

  const openEditSuiteModal = (s: TestSuite) => {
    setEditingSuite(s);
    setNome(s.nome);
    setJogoId(s.jogoId);
    setVersaoTestada(s.versaoTestada);
    setTipo(s.tipo);
    setObjetivo(s.objetivo);
    setCriteriosInput((s.criterios || []).join(', '));
    setParticipantesTestadoresIds(s.participantesTestadoresIds || []);
    setResponsavelId(s.responsavelId);
    setDataInicial(s.dataInicial);
    setDataFinal(s.dataFinal || '');
    setStatus(s.status);
    setObservacoes(s.observacoes || '');
    setFormError('');
    setSuiteModalOpen(true);
  };

  const handleSaveSuite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nome.trim() || !jogoId || !responsavelId) {
      setFormError('Nome da bateria, jogo e responsável são obrigatórios.');
      return;
    }

    try {
      setSaving(true);
      setFormError('');

      const criterios = criteriosInput
        .split(',')
        .map(c => c.trim())
        .filter(Boolean);

      const payload = {
        nome: nome.trim(),
        jogoId,
        versaoTestada: versaoTestada.trim(),
        tipo,
        objetivo: objetivo.trim(),
        criterios,
        participantesTestadoresIds,
        responsavelId,
        dataInicial,
        dataFinal: dataFinal || undefined,
        status,
        observacoes: observacoes.trim(),
      };

      if (editingSuite) {
        await api.updateTestSuite(editingSuite.id, payload);
      } else {
        await api.createTestSuite(payload);
      }

      setSuiteModalOpen(false);
      await loadData();
    } catch (err: any) {
      setFormError(err.message || 'Erro ao salvar bateria de testes.');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteSuite = async (s: TestSuite) => {
    if (!confirm(`Deseja excluir a bateria de testes "${s.nome}"?`)) return;
    try {
      await api.deleteTestSuite(s.id);
      await loadData();
    } catch (err: any) {
      alert(err.message || 'Erro ao excluir bateria de testes.');
    }
  };

  // Open Evaluate modal
  const openEvaluateModal = (s: TestSuite) => {
    setTargetSuiteForEval(s);
    const initialNotas: { [k: string]: number } = {};
    (s.criterios || []).forEach(c => {
      initialNotas[c] = 4;
    });
    setEvalNotas(initialNotas);
    setEvalComentarios('');
    setEvalProblemas('');
    setEvalSugestoes('');
    setEvalError('');
    setEvalModalOpen(true);
  };

  const handleSaveEvaluation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetSuiteForEval || !currentUser) return;

    try {
      setEvalSaving(true);
      setEvalError('');

      await api.submitEvaluation({
        testeId: targetSuiteForEval.id,
        jogoId: targetSuiteForEval.jogoId,
        participanteId: currentUser.id,
        notas: evalNotas,
        comentarios: evalComentarios.trim(),
        problemas: evalProblemas.trim(),
        sugestoes: evalSugestoes.trim(),
        data: new Date().toISOString().split('T')[0],
      });

      setEvalModalOpen(false);
      alert('Avaliação de teste registrada com sucesso!');
    } catch (err: any) {
      setEvalError(err.message || 'Erro ao registrar avaliação.');
    } finally {
      setEvalSaving(false);
    }
  };

  const getStatusBadge = (st: TestSuiteStatus) => {
    switch (st) {
      case 'Planejado':
        return <span className="px-2 py-0.5 text-[11px] font-semibold bg-slate-100 text-slate-700 rounded">Planejado</span>;
      case 'Em andamento':
        return <span className="px-2 py-0.5 text-[11px] font-semibold bg-blue-100 text-blue-800 rounded">Em andamento</span>;
      case 'Concluído':
        return <span className="px-2 py-0.5 text-[11px] font-semibold bg-emerald-100 text-emerald-800 rounded">Concluído</span>;
      case 'Cancelado':
        return <span className="px-2 py-0.5 text-[11px] font-semibold bg-rose-100 text-rose-800 rounded">Cancelado</span>;
      default:
        return st;
    }
  };

  if (loading) {
    return <div className="p-8 text-center text-sm text-slate-500">Carregando baterias de testes...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">Baterias de Testes dos Jogos</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Planejamento de testes, critérios de avaliação de usabilidade e aceitação das IAs.
          </p>
        </div>

        {canManageAdmin && (
          <button
            onClick={openCreateSuiteModal}
            className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-900 hover:bg-indigo-800 text-white text-xs font-semibold rounded-md shadow-xs transition-colors self-start sm:self-auto"
          >
            <Plus className="w-4 h-4" />
            Nova Bateria de Testes
          </button>
        )}
      </div>

      {testSuites.length === 0 ? (
        <EmptyState
          message="Nenhum registro encontrado."
          subMessage="Cadastre o primeiro registro para começar."
          actionLabel={canManageAdmin ? 'Cadastrar Primeira Bateria' : undefined}
          onAction={canManageAdmin ? openCreateSuiteModal : undefined}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {testSuites.map(s => (
            <div
              key={s.id}
              className="bg-white border border-slate-200 rounded-lg p-5 shadow-xs flex flex-col justify-between hover:border-slate-300 transition-colors"
            >
              <div className="space-y-3">
                <div className="flex items-start justify-between gap-2 border-b border-slate-100 pb-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-900 text-sm">{s.nome}</span>
                      <span className="text-xs font-mono bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded">
                        {s.versaoTestada}
                      </span>
                    </div>
                    <div className="text-xs text-indigo-900 font-semibold mt-0.5">
                      Jogo: {s.jogoNome}
                    </div>
                  </div>
                  {getStatusBadge(s.status)}
                </div>

                <div className="text-xs space-y-2">
                  <p className="text-slate-700">
                    <strong>Objetivo:</strong> {s.objetivo || 'Não informado'}
                  </p>

                  <div>
                    <strong className="text-slate-600 block mb-1">Critérios de Avaliação:</strong>
                    <div className="flex flex-wrap gap-1">
                      {s.criterios.map(c => (
                        <span
                          key={c}
                          className="px-2 py-0.5 bg-slate-100 text-slate-700 rounded text-[11px] font-medium"
                        >
                          {c}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="pt-2 text-[11px] text-slate-500 space-y-0.5">
                    <div>Tipo: <strong className="text-slate-700 capitalize">{s.tipo}</strong></div>
                    <div>Responsável: <strong className="text-slate-700">{s.responsavelNome}</strong></div>
                    <div>
                      Período: <span className="font-mono text-slate-700">{s.dataInicial}</span> até{' '}
                      <span className="font-mono text-slate-700">{s.dataFinal || 'Indefinido'}</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                {/* Submit evaluation button for students and coordinators */}
                {canSubmitEvaluations && (
                  <button
                    onClick={() => openEvaluateModal(s)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-900 rounded-md text-xs font-semibold transition-colors"
                  >
                    <ClipboardCheck className="w-3.5 h-3.5 text-indigo-700" />
                    Preencher Avaliação
                  </button>
                )}

                {canManageAdmin && (
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => openEditSuiteModal(s)}
                      className="p-1 text-slate-400 hover:text-indigo-700 rounded text-xs inline-flex items-center gap-1 font-medium"
                    >
                      <Edit2 className="w-3.5 h-3.5" /> Editar
                    </button>
                    <button
                      onClick={() => handleDeleteSuite(s)}
                      className="p-1 text-slate-400 hover:text-rose-700 rounded text-xs inline-flex items-center gap-1 font-medium"
                    >
                      <Trash2 className="w-3.5 h-3.5" /> Excluir
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal Nova / Editar Bateria de Testes */}
      {suiteModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-white rounded-xl shadow-xl border border-slate-200 w-full max-w-xl max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between sticky top-0 z-10">
              <h2 className="text-base font-bold text-slate-900">
                {editingSuite ? 'Editar Bateria de Testes' : 'Nova Bateria de Testes'}
              </h2>
              <button
                onClick={() => setSuiteModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 text-lg leading-none"
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleSaveSuite} className="p-6 space-y-4">
              {formError && (
                <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-md">
                  {formError}
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Nome da Bateria de Testes *
                </label>
                <input
                  type="text"
                  required
                  value={nome}
                  onChange={e => setNome(e.target.value)}
                  placeholder="Ex: Teste Alfa de Jogabilidade e Coerência da IA"
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-600"
                />
              </div>

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
                    Versão Testada
                  </label>
                  <input
                    type="text"
                    value={versaoTestada}
                    onChange={e => setVersaoTestada(e.target.value)}
                    placeholder="Ex: v0.1"
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md font-mono focus:outline-none focus:ring-2 focus:ring-indigo-600"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    Tipo de Teste
                  </label>
                  <select
                    value={tipo}
                    onChange={e => setTipo(e.target.value as TestType)}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-indigo-600"
                  >
                    <option value="jogabilidade">Jogabilidade</option>
                    <option value="desempenho">Desempenho</option>
                    <option value="bugs">Bugs</option>
                    <option value="usabilidade">Usabilidade</option>
                    <option value="aceitação da IA">Aceitação da IA</option>
                    <option value="balanceamento">Balanceamento</option>
                    <option value="outro">Outro</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    Status
                  </label>
                  <select
                    value={status}
                    onChange={e => setStatus(e.target.value as TestSuiteStatus)}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-indigo-600"
                  >
                    <option value="Planejado">Planejado</option>
                    <option value="Em andamento">Em andamento</option>
                    <option value="Concluído">Concluído</option>
                    <option value="Cancelado">Cancelado</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Objetivo do Teste
                </label>
                <textarea
                  rows={2}
                  value={objetivo}
                  onChange={e => setObjetivo(e.target.value)}
                  placeholder="Defina o escopo a ser validado..."
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-600"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Critérios de Avaliação (separados por vírgula)
                </label>
                <input
                  type="text"
                  value={criteriosInput}
                  onChange={e => setCriteriosInput(e.target.value)}
                  placeholder="Ex: Jogabilidade, Coerência da IA, Performance, Dificuldade"
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-600"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    Data Inicial
                  </label>
                  <input
                    type="date"
                    value={dataInicial}
                    onChange={e => setDataInicial(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-600"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    Data Final (opcional)
                  </label>
                  <input
                    type="date"
                    value={dataFinal}
                    onChange={e => setDataFinal(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-600"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Responsável pela Bateria *
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

              <div className="pt-4 flex items-center justify-end gap-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setSuiteModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 rounded-md transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-2 text-xs font-semibold text-white bg-indigo-900 hover:bg-indigo-800 rounded-md transition-colors shadow-xs disabled:opacity-50"
                >
                  {saving ? 'Salvando...' : 'Salvar Bateria'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Formulário de Avaliação do Teste (Rule 16) */}
      {evalModalOpen && targetSuiteForEval && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-white rounded-xl shadow-xl border border-slate-200 w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between sticky top-0 z-10">
              <div>
                <h2 className="text-base font-bold text-slate-900">Formulário de Avaliação de Teste</h2>
                <p className="text-xs text-slate-500 mt-0.5">{targetSuiteForEval.nome}</p>
              </div>
              <button
                onClick={() => setEvalModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 text-lg leading-none"
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleSaveEvaluation} className="p-6 space-y-4">
              {evalError && (
                <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-md">
                  {evalError}
                </div>
              )}

              <div className="bg-slate-50 p-3 rounded border border-slate-200 text-xs space-y-1">
                <div>Avaliador: <strong className="text-slate-800">{currentUser?.nome}</strong> ({currentUser?.funcao})</div>
                <div>Jogo: <strong className="text-slate-800">{targetSuiteForEval.jogoNome}</strong></div>
              </div>

              {/* Critérios rating */}
              <div className="space-y-3">
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">
                  Notas por Critério (1 a 5)
                </label>
                {(targetSuiteForEval.criterios || []).map(c => (
                  <div key={c} className="flex items-center justify-between gap-4 p-2 bg-slate-50 rounded border border-slate-200 text-xs">
                    <span className="font-semibold text-slate-800">{c}</span>
                    <div className="flex items-center gap-1">
                      {[1, 2, 3, 4, 5].map(star => (
                        <button
                          type="button"
                          key={star}
                          onClick={() => setEvalNotas({ ...evalNotas, [c]: star })}
                          className={`w-7 h-7 rounded text-xs font-bold transition-colors ${
                            (evalNotas[c] || 0) >= star
                              ? 'bg-amber-400 text-slate-900 shadow-2xs'
                              : 'bg-white border border-slate-200 text-slate-500 hover:bg-slate-100'
                          }`}
                        >
                          {star}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Comentários Gerais
                </label>
                <textarea
                  rows={2}
                  value={evalComentarios}
                  onChange={e => setEvalComentarios(e.target.value)}
                  placeholder="Impressões sobre o teste e a experiência..."
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-600 text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Problemas Encontrados (Bugs / Incoerências)
                </label>
                <textarea
                  rows={2}
                  value={evalProblemas}
                  onChange={e => setEvalProblemas(e.target.value)}
                  placeholder="Falhas detectadas durante a partida..."
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-600 text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Sugestões de Melhoria
                </label>
                <textarea
                  rows={2}
                  value={evalSugestoes}
                  onChange={e => setEvalSugestoes(e.target.value)}
                  placeholder="Sugestões para as próximas versões..."
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-600 text-xs"
                />
              </div>

              <div className="pt-4 flex items-center justify-end gap-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEvalModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 rounded-md transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={evalSaving}
                  className="px-4 py-2 text-xs font-semibold text-white bg-indigo-900 hover:bg-indigo-800 rounded-md transition-colors shadow-xs disabled:opacity-50"
                >
                  {evalSaving ? 'Enviando...' : 'Registrar Avaliação'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
