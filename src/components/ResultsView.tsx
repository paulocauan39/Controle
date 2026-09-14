import React, { useEffect, useState } from 'react';
import { api } from '../services/api.js';
import { Game } from '../types.js';
import { BarChart3, TrendingUp, AlertCircle, Star, MessageSquare } from 'lucide-react';

export const ResultsView: React.FC = () => {
  const [games, setGames] = useState<Game[]>([]);
  const [selectedGameId, setSelectedGameId] = useState<string>('');
  const [resultAnalysis, setResultAnalysis] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);

  const loadGames = async () => {
    try {
      setLoading(true);
      const gamesData = await api.getGames();
      setGames(gamesData);
      if (gamesData.length > 0) {
        setSelectedGameId(gamesData[0].id);
        await loadAnalysis(gamesData[0].id);
      }
    } catch (err) {
      console.error('Failed to load games for results', err);
    } finally {
      setLoading(false);
    }
  };

  const loadAnalysis = async (gameId: string) => {
    try {
      setAnalyzing(true);
      const data = await api.getGameResults(gameId);
      setResultAnalysis(data);
    } catch (err) {
      console.error('Failed to load game results', err);
    } finally {
      setAnalyzing(false);
    }
  };

  useEffect(() => {
    loadGames();
  }, []);

  const handleSelectGame = (gameId: string) => {
    setSelectedGameId(gameId);
    loadAnalysis(gameId);
  };

  if (loading) {
    return <div className="p-8 text-center text-sm text-slate-500">Carregando resultados consolidados...</div>;
  }

  if (games.length === 0) {
    return (
      <div className="bg-white border border-slate-200 rounded-lg p-12 text-center">
        <p className="text-base font-semibold text-slate-800">Nenhum jogo cadastrado.</p>
        <p className="text-xs text-slate-500 mt-1">
          Cadastre jogos e realize testes com avaliações para consolidar as métricas de pesquisa.
        </p>
      </div>
    );
  }

  const hasSufficientData = resultAnalysis && resultAnalysis.hasSufficientData;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">Resultados e Avaliações Consolidadas</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Consolidação das notas por critério, análise qualitativa e evolução por versão do jogo.
          </p>
        </div>

        {/* Game Selector */}
        <div className="flex items-center gap-2 text-xs self-start sm:self-auto">
          <span className="text-slate-500 font-medium">Jogo Selecionado:</span>
          <select
            value={selectedGameId}
            onChange={e => handleSelectGame(e.target.value)}
            className="bg-white border border-slate-300 rounded px-3 py-1.5 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-600"
          >
            {games.map(g => (
              <option key={g.id} value={g.id}>
                {g.nome}
              </option>
            ))}
          </select>
        </div>
      </div>

      {analyzing ? (
        <div className="p-12 text-center text-sm text-slate-500">Analisando dados reais do jogo...</div>
      ) : !hasSufficientData ? (
        /* Rule 17: Se não houver dados suficientes, exibir mensagem clara: «Dados insuficientes para gerar esta análise.» */
        <div className="bg-white border border-slate-200 rounded-xl p-12 text-center shadow-xs">
          <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 mx-auto mb-3">
            <AlertCircle className="w-6 h-6" />
          </div>
          <h2 className="text-base font-bold text-slate-800 tracking-tight">
            «Dados insuficientes para gerar esta análise.»
          </h2>
          <p className="text-xs text-slate-500 max-w-md mx-auto mt-2 leading-relaxed">
            O jogo selecionado ainda não possui o número mínimo de avaliações preenchidas pelos testadores e alunos para consolidação estatística.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Summary Banner */}
          <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 flex flex-wrap items-center justify-between gap-4">
            <div>
              <span className="text-xs text-slate-500 uppercase font-semibold">Total de Avaliações Registradas</span>
              <div className="text-2xl font-bold text-slate-900 mt-0.5">{resultAnalysis.totalAvaliadores}</div>
            </div>
            <div className="text-xs text-slate-500 max-w-sm">
              Métricas consolidadas a partir de formulários oficiais submetidos nas baterias de testes.
            </div>
          </div>

          {/* 1. Média das Notas por Critério */}
          <div className="bg-white border border-slate-200 rounded-lg p-5 shadow-xs">
            <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2 mb-4">
              <Star className="w-4 h-4 text-amber-500" />
              Média das Notas por Critério de Avaliação
            </h2>

            <div className="space-y-3">
              {Object.entries(resultAnalysis.mediasPorCriterio).map(([crit, avg]: [string, any]) => {
                const percentage = (avg / 5) * 100;
                return (
                  <div key={crit} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-slate-800">{crit}</span>
                      <span className="font-bold text-indigo-900">{avg.toFixed(1)} / 5.0</span>
                    </div>
                    <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                      <div
                        className="bg-indigo-600 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* 2. Qualitative Columns: Problemas mais frequentes & Sugestões recorrentes */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Problemas mais frequentes */}
            <div className="bg-white border border-slate-200 rounded-lg p-5 shadow-xs">
              <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2 mb-3">
                <AlertCircle className="w-4 h-4 text-rose-600" />
                Problemas e Bugs Mais Frequentes
              </h2>
              {resultAnalysis.problemasFrequentes.length === 0 ? (
                <p className="text-xs text-slate-400 italic py-4">Nenhum problema recorrente reportado.</p>
              ) : (
                <div className="space-y-2">
                  {resultAnalysis.problemasFrequentes.map((prob: string, idx: number) => (
                    <div key={idx} className="p-2.5 bg-rose-50/50 border border-rose-100 rounded text-xs text-rose-900 leading-relaxed">
                      • {prob}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Sugestões Recorrentes */}
            <div className="bg-white border border-slate-200 rounded-lg p-5 shadow-xs">
              <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2 mb-3">
                <MessageSquare className="w-4 h-4 text-indigo-600" />
                Sugestões Recorrentes dos Testadores
              </h2>
              {resultAnalysis.sugestoesRecorrentes.length === 0 ? (
                <p className="text-xs text-slate-400 italic py-4">Nenhuma sugestão registrada.</p>
              ) : (
                <div className="space-y-2">
                  {resultAnalysis.sugestoesRecorrentes.map((sug: string, idx: number) => (
                    <div key={idx} className="p-2.5 bg-indigo-50/50 border border-indigo-100 rounded text-xs text-indigo-900 leading-relaxed">
                      • {sug}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* 3. Evolução das Notas por Versão do Jogo */}
          <div className="bg-white border border-slate-200 rounded-lg p-5 shadow-xs">
            <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2 mb-4">
              <TrendingUp className="w-4 h-4 text-emerald-600" />
              Evolução das Notas por Versão do Jogo
            </h2>

            {Object.keys(resultAnalysis.evolucaoPorVersao).length === 0 ? (
              <p className="text-xs text-slate-400 italic py-4">Dados de evolução ainda não disponíveis.</p>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {Object.entries(resultAnalysis.evolucaoPorVersao).map(([versao, avg]: [string, any]) => (
                  <div key={versao} className="p-4 bg-slate-50 border border-slate-200 rounded-lg text-center">
                    <span className="font-mono text-xs font-bold text-slate-500 uppercase">{versao}</span>
                    <div className="text-2xl font-bold text-slate-900 mt-1">{avg.toFixed(1)}</div>
                    <span className="text-[10px] text-slate-400">Média Geral / 5.0</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
