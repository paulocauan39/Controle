import React, { useEffect, useState } from 'react';
import { api } from '../services/api.js';
import { Scale, Clock, Star, CheckCircle, AlertCircle } from 'lucide-react';

export const AIComparisonView: React.FC = () => {
  const [comparisonData, setComparisonData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    try {
      setLoading(true);
      const data = await api.getAIComparison();
      setComparisonData(data);
    } catch (err) {
      console.error('Failed to load AI comparison', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  if (loading) {
    return <div className="p-8 text-center text-sm text-slate-500">Compilando comparações reais entre IAs...</div>;
  }

  const hasData = comparisonData.length > 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="border-b border-slate-200 pb-4">
        <h1 className="text-xl font-bold text-slate-900 tracking-tight">Comparação Científica entre IAs</h1>
        <p className="text-sm text-slate-500 mt-0.5">
          Análise comparativa de desempenho, índice de aceitação e esforço de intervenção manual baseado em dados reais de experimentos.
        </p>
      </div>

      {!hasData ? (
        <div className="bg-white border border-slate-200 rounded-xl p-12 text-center shadow-xs">
          <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 mx-auto mb-3">
            <Scale className="w-6 h-6" />
          </div>
          <h2 className="text-base font-bold text-slate-800 tracking-tight">
            «Dados insuficientes para gerar esta análise.»
          </h2>
          <p className="text-xs text-slate-500 max-w-md mx-auto mt-2 leading-relaxed">
            Nenhum experimento com IA foi registrado ainda. A comparação é gerada estritamente com base nos dados reais dos experimentos registrados pela equipe.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Comparative Table */}
          <div className="bg-white border border-slate-200 rounded-lg shadow-xs overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-200 bg-slate-50">
              <h2 className="text-sm font-bold text-slate-900">
                Tabela Comparativa de Eficácia dos Modelos
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Calculado a partir de {comparisonData.reduce((acc, curr) => acc + curr.totalExperimentos, 0)} experimentos executados.
              </p>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-700 uppercase tracking-wider text-[11px] font-bold">
                  <tr>
                    <th className="py-3 px-4">IA / Modelo</th>
                    <th className="py-3 px-4">Tipo</th>
                    <th className="py-3 px-4 text-center">Experimentos</th>
                    <th className="py-3 px-4 text-center">Tempo Médio</th>
                    <th className="py-3 px-4 text-center">Índice Aceitação</th>
                    <th className="py-3 px-4 text-center">Ajustes Manuais</th>
                    <th className="py-3 px-4 text-center">Nota Média</th>
                    <th className="py-3 px-4">Custo-Benefício</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 text-slate-800 text-xs">
                  {comparisonData.map(ai => (
                    <tr key={ai.iaId} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3 px-4">
                        <div className="font-bold text-slate-900">{ai.iaNome}</div>
                        <div className="text-[11px] text-slate-500 font-mono">{ai.modelo}</div>
                      </td>
                      <td className="py-3 px-4 uppercase text-[10px] font-semibold text-slate-600">
                        {ai.tipo}
                      </td>
                      <td className="py-3 px-4 text-center font-mono font-bold text-slate-700">
                        {ai.totalExperimentos}
                      </td>
                      <td className="py-3 px-4 text-center font-mono text-slate-600">
                        {ai.tempoMedioMinutos} min
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className={`inline-block px-2 py-0.5 rounded font-bold font-mono text-[11px] ${
                          ai.indiceAceitacaoPercentual >= 70
                            ? 'bg-emerald-100 text-emerald-800'
                            : ai.indiceAceitacaoPercentual >= 40
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-rose-100 text-rose-800'
                        }`}>
                          {ai.indiceAceitacaoPercentual}%
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className={`inline-block px-2 py-0.5 rounded text-[11px] font-medium ${
                          ai.necessidadeAlteracaoManual === 'Baixa'
                            ? 'bg-emerald-50 text-emerald-800'
                            : ai.necessidadeAlteracaoManual === 'Moderada'
                            ? 'bg-blue-50 text-blue-800'
                            : 'bg-amber-50 text-amber-800'
                        }`}>
                          {ai.necessidadeAlteracaoManual}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <div className="inline-flex items-center gap-1 font-bold text-indigo-900 bg-indigo-50 px-2 py-0.5 rounded">
                          <Star className="w-3.5 h-3.5 fill-amber-500 text-amber-500" />
                          {ai.notaMediaAlunos}
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-semibold text-slate-800">{ai.custoBeneficioObservado}</div>
                        <div className="text-[10px] text-slate-400">Licença: {ai.licenca}</div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
