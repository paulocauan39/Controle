import React, { useEffect, useState } from 'react';
import { jsPDF } from 'jspdf';
import { api } from '../services/api.js';
import { Game, Team, AIModel } from '../types.js';
import { useAuth } from '../context/AuthContext.js';
import { FileText, Download, FileSpreadsheet, Eye, Printer, FileDown } from 'lucide-react';

export const ReportsView: React.FC = () => {
  const { currentUser } = useAuth();
  const [reportType, setReportType] = useState<string>('geral');
  const [games, setGames] = useState<Game[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [selectedGameId, setSelectedGameId] = useState<string>('');
  const [selectedTeamId, setSelectedTeamId] = useState<string>('');
  const [reportData, setReportData] = useState<any | null>(null);
  const [loading, setLoading] = useState(false);
  const [pdfDownloading, setPdfDownloading] = useState(false);

  const loadOptions = async () => {
    try {
      const [gamesData, teamsData] = await Promise.all([
        api.getGames(),
        api.getTeams(),
      ]);
      setGames(gamesData);
      setTeams(teamsData);
      if (gamesData.length > 0) setSelectedGameId(gamesData[0].id);
      if (teamsData.length > 0) setSelectedTeamId(teamsData[0].id);
    } catch (err) {
      console.error('Failed to load report options', err);
    }
  };

  useEffect(() => {
    loadOptions();
  }, []);

  const generateReport = async () => {
    try {
      setLoading(true);
      const params: any = { type: reportType };
      if (reportType === 'jogo' && selectedGameId) params.gameId = selectedGameId;
      if (reportType === 'equipe' && selectedTeamId) params.teamId = selectedTeamId;

      const data = await api.getReport(params);
      setReportData(data);
    } catch (err) {
      console.error('Failed to generate report', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    generateReport();
  }, [reportType, selectedGameId, selectedTeamId]);

  const exportJSON = () => {
    if (!reportData) return;
    const blob = new Blob([JSON.stringify(reportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `relatorio_${reportType}_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportCSV = () => {
    if (!reportData) return;
    let csvContent = 'data:text/csv;charset=utf-8,';
    csvContent += `Relatório: ${reportData.titulo}\n`;
    csvContent += `Data de Emissão: ${reportData.geradoEm}\n\n`;

    if (reportType === 'geral') {
      csvContent += 'Métrica,Valor\n';
      Object.entries(reportData.resumoGeral || {}).forEach(([k, v]) => {
        csvContent += `"${k}","${v}"\n`;
      });
    } else if (reportType === 'ias') {
      csvContent += 'IA,Modelo,Tipo,Experimentos,Nota Média,Custo-Benefício\n';
      (reportData.analiseComparativa || []).forEach((row: any) => {
        csvContent += `"${row.iaNome}","${row.modelo}","${row.tipo}","${row.totalExperimentos}","${row.notaMediaAlunos}","${row.custoBeneficioObservado}"\n`;
      });
    } else {
      csvContent += JSON.stringify(reportData);
    }

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `relatorio_${reportType}_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const exportDirectPDF = () => {
    if (!reportData) return;
    try {
      setPdfDownloading(true);
      const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      const margin = 15;
      const contentWidth = pageWidth - margin * 2;
      let y = 18;

      const checkPageBreak = (neededHeight: number) => {
        if (y + neededHeight > pageHeight - 20) {
          doc.addPage();
          y = 20;
          addPageHeader();
        }
      };

      const addPageHeader = () => {
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(8);
        doc.setTextColor(100, 116, 139);
        doc.text('NEXOIF • SISTEMA OFICIAL DE GESTÃO E PESQUISA EM JOGOS COM IA', margin, 12);
        doc.setDrawColor(226, 232, 240);
        doc.line(margin, 14, pageWidth - margin, 14);
      };

      // Header Institucional
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(14);
      doc.setTextColor(30, 27, 75); // indigo-950
      doc.text('NexoIF — Plataforma Acadêmica de Jogos com IA', margin, y);
      y += 6;

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.setTextColor(71, 85, 105);
      doc.text('Curso de Bacharelado em Sistemas de Informação • Acompanhamento e Avaliação Docente', margin, y);
      y += 4;
      doc.text('Orientação: Prof. Dr. Alexandre Silva & Profa. Dra. Mariana Santos', margin, y);
      y += 5;

      doc.setDrawColor(79, 70, 229); // indigo-600
      doc.setLineWidth(0.8);
      doc.line(margin, y, pageWidth - margin, y);
      y += 7;

      // Metadados do Relatório
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(13);
      doc.setTextColor(15, 23, 42);
      doc.text(String(reportData.titulo || 'Relatório Acadêmico'), margin, y);
      y += 6;

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8.5);
      doc.setTextColor(100, 116, 139);
      const dataEmissao = new Date(reportData.geradoEm || Date.now()).toLocaleString('pt-BR');
      const emitente = currentUser ? `${currentUser.nome} (${currentUser.funcao})` : 'Usuário Autenticado';
      doc.text(`Data de Geração: ${dataEmissao}    |    Emitido por: ${emitente}`, margin, y);
      y += 7;

      doc.setDrawColor(226, 232, 240);
      doc.setLineWidth(0.4);
      doc.line(margin, y, pageWidth - margin, y);
      y += 8;

      // Seções Consolidadas por Módulo
      if (reportType === 'geral') {
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(11);
        doc.setTextColor(30, 41, 59);
        doc.text('1. Resumo Quantitativo Geral do Projeto', margin, y);
        y += 6;

        const resumo = reportData.resumoGeral || {};
        const entries = Object.entries(resumo);

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(9);

        // Render summary items in a clean grid
        entries.forEach(([key, val]) => {
          checkPageBreak(7);
          doc.setFillColor(248, 250, 252);
          doc.rect(margin, y - 4, contentWidth, 6.5, 'F');
          doc.setFont('helvetica', 'bold');
          doc.setTextColor(51, 65, 85);
          doc.text(String(key), margin + 3, y);
          doc.setFont('helvetica', 'normal');
          doc.setTextColor(15, 23, 42);
          doc.text(String(val), pageWidth - margin - 5, y, { align: 'right' });
          y += 7.5;
        });

        y += 5;
        checkPageBreak(15);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(11);
        doc.setTextColor(30, 41, 59);
        doc.text(`2. Jogos em Desenvolvimento (${reportData.jogos?.length || 0})`, margin, y);
        y += 6;

        (reportData.jogos || []).forEach((j: Game) => {
          checkPageBreak(9);
          doc.setFillColor(255, 255, 255);
          doc.setDrawColor(226, 232, 240);
          doc.rect(margin, y - 4, contentWidth, 8, 'D');
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(9);
          doc.setTextColor(15, 23, 42);
          doc.text(`${j.nome} (Versão: ${j.versaoAtual})`, margin + 3, y);
          doc.setFont('helvetica', 'normal');
          doc.setFontSize(8);
          doc.setTextColor(71, 85, 105);
          doc.text(`Status: ${j.status}`, pageWidth - margin - 4, y, { align: 'right' });
          y += 9.5;
        });
      } else if (reportType === 'ias') {
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(11);
        doc.setTextColor(30, 41, 59);
        doc.text('Análise Científica de Desempenho dos Modelos de IA', margin, y);
        y += 7;

        const rows = reportData.analiseComparativa || [];
        if (rows.length === 0) {
          doc.setFont('helvetica', 'italic');
          doc.setFontSize(9);
          doc.setTextColor(100, 116, 139);
          doc.text('Nenhum dado experimental comparativo registrado até o momento.', margin, y);
          y += 7;
        } else {
          rows.forEach((row: any) => {
            checkPageBreak(16);
            doc.setFillColor(248, 250, 252);
            doc.setDrawColor(226, 232, 240);
            doc.rect(margin, y - 4, contentWidth, 14, 'FD');

            doc.setFont('helvetica', 'bold');
            doc.setFontSize(9.5);
            doc.setTextColor(15, 23, 42);
            doc.text(`${row.iaNome} — Modelo: ${row.modelo} (${row.tipo})`, margin + 3, y);

            doc.setFont('helvetica', 'normal');
            doc.setFontSize(8.5);
            doc.setTextColor(71, 85, 105);
            y += 5.5;
            doc.text(
              `Experimentos: ${row.totalExperimentos}   |   Nota Média: ${row.notaMediaAlunos}/5   |   Aceitação: ${row.indiceAceitacaoPercentual}%   |   Custo-Benefício: ${row.custoBeneficioObservado}`,
              margin + 3,
              y
            );
            y += 8.5;
          });
        }
      } else if (reportType === 'jogo') {
        if (reportData.jogo) {
          const j = reportData.jogo;
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(12);
          doc.setTextColor(15, 23, 42);
          doc.text(`Ficha Consolidada do Jogo: ${j.nome}`, margin, y);
          y += 6;

          doc.setFont('helvetica', 'normal');
          doc.setFontSize(9);
          doc.setTextColor(71, 85, 105);
          doc.text(`Objetivo: ${j.objetivo}`, margin, y);
          y += 5;
          doc.text(`Versão Atual: ${j.versaoAtual}   |   Status: ${j.status}   |   Data de Início: ${j.dataInicio}`, margin, y);
          y += 8;

          checkPageBreak(14);
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(10);
          doc.setTextColor(30, 41, 59);
          doc.text('Métricas Associadas:', margin, y);
          y += 5;

          const metrics = [
            `Total de Tarefas Vinculadas: ${reportData.tarefas?.length || 0}`,
            `Experimentos com IA Realizados: ${reportData.experimentos?.length || 0}`,
            `Versões Lançadas: ${reportData.versoes?.length || 0}`,
          ];

          metrics.forEach(m => {
            checkPageBreak(6);
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(8.5);
            doc.text(`• ${m}`, margin + 4, y);
            y += 5;
          });
        }
      } else if (reportType === 'equipe') {
        if (reportData.equipe) {
          const eq = reportData.equipe;
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(12);
          doc.setTextColor(15, 23, 42);
          doc.text(`Relatório da Equipe: ${eq.nome}`, margin, y);
          y += 6;

          doc.setFont('helvetica', 'normal');
          doc.setFontSize(9);
          doc.setTextColor(71, 85, 105);
          doc.text(`Área de Atuação: ${eq.areaAtuacao}   |   Responsável: ${eq.responsavelNome}   |   Status: ${eq.status}`, margin, y);
          y += 8;

          checkPageBreak(12);
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(10);
          doc.setTextColor(30, 41, 59);
          doc.text(`Jogos Atribuídos (${reportData.jogos?.length || 0}):`, margin, y);
          y += 5;

          (reportData.jogos || []).forEach((jg: Game) => {
            checkPageBreak(6);
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(8.5);
            doc.text(`• ${jg.nome} (Versão: ${jg.versaoAtual}) — Status: ${jg.status}`, margin + 4, y);
            y += 5;
          });
        }
      } else if (reportType === 'testes') {
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(11);
        doc.setTextColor(30, 41, 59);
        doc.text(`Baterias de Testes Registradas (${reportData.baterias?.length || 0})`, margin, y);
        y += 6;

        (reportData.baterias || []).forEach((b: any) => {
          checkPageBreak(12);
          doc.setFillColor(248, 250, 252);
          doc.setDrawColor(226, 232, 240);
          doc.rect(margin, y - 3.5, contentWidth, 10, 'FD');
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(9);
          doc.setTextColor(15, 23, 42);
          doc.text(`${b.nome} (${b.versaoTestada || 'v1.0'})`, margin + 3, y);
          y += 4.5;
          doc.setFont('helvetica', 'normal');
          doc.setFontSize(8);
          doc.setTextColor(71, 85, 105);
          doc.text(`Tipo: ${b.tipo || 'Geral'}   |   Status: ${b.status}   |   Período: ${b.dataInicial} a ${b.dataFinal || 'Atual'}`, margin + 3, y);
          y += 6.5;
        });
      }

      // Rodapé em todas as páginas
      const totalPages = doc.getNumberOfPages();
      for (let i = 1; i <= totalPages; i++) {
        doc.setPage(i);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(7.5);
        doc.setTextColor(148, 163, 184);
        doc.setDrawColor(226, 232, 240);
        doc.line(margin, pageHeight - 12, pageWidth - margin, pageHeight - 12);
        doc.text('NexoIF • Documento Institucional de Acompanhamento Científico • Dados Reais Auditados', margin, pageHeight - 8);
        doc.text(`Página ${i} de ${totalPages}`, pageWidth - margin, pageHeight - 8, { align: 'right' });
      }

      const filename = `relatorio_${reportType}_${new Date().toISOString().split('T')[0]}.pdf`;
      doc.save(filename);
    } catch (err) {
      console.error('Erro ao gerar relatório em PDF:', err);
      alert('Ocorreu um erro ao gerar o arquivo PDF do relatório.');
    } finally {
      setPdfDownloading(false);
    }
  };

  const exportPDF = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4 print:hidden">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">Relatórios e Exportações Acadêmicas</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            NexoIF • Geração de relatórios consolidados em tela com exportação direta para PDF, CSV e JSON.
          </p>
        </div>

        {reportData && (
          <div className="flex items-center gap-2 self-start sm:self-auto flex-wrap">
            <button
              id="export-pdf-report-btn"
              onClick={exportDirectPDF}
              disabled={pdfDownloading}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-indigo-900 hover:bg-indigo-800 text-white text-xs font-semibold rounded-md shadow-2xs transition-colors disabled:opacity-50"
              title="Baixar arquivo PDF com cabeçalho institucional e dados consolidados"
            >
              <FileDown className="w-3.5 h-3.5" />
              {pdfDownloading ? 'Gerando PDF...' : 'Baixar PDF'}
            </button>
            <button
              onClick={exportPDF}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-md shadow-2xs transition-colors"
              title="Abrir diálogo de impressão do navegador"
            >
              <Printer className="w-3.5 h-3.5" />
              Imprimir
            </button>
            <button
              onClick={exportCSV}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-md shadow-2xs transition-colors"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-700" />
              Exportar CSV
            </button>
            <button
              onClick={exportJSON}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-md shadow-2xs transition-colors"
            >
              <Download className="w-3.5 h-3.5 text-indigo-700" />
              Exportar JSON
            </button>
          </div>
        )}
      </div>

      {/* Printable Academic Header for Professors Delivery */}
      <div className="hidden print:block border-b-2 border-slate-800 pb-4 mb-6">
        <div className="flex justify-between items-start">
          <div>
            <h2 className="text-lg font-bold text-slate-900 uppercase">
              Projeto Acadêmico: Desenvolvimento de Jogos com IA
            </h2>
            <p className="text-xs text-slate-600">
              Curso de Bacharelado em Sistemas de Informação • Acompanhamento e Avaliação Docente
            </p>
            <p className="text-xs text-slate-600">
              Professores Orientadores: Prof. Dr. Carlos Silva & Profa. Dra. Marina Santos
            </p>
          </div>
          <div className="text-right text-xs text-slate-500 font-mono">
            <div>Data de Emissão: {new Date().toLocaleDateString('pt-BR')}</div>
            <div>Relatório: {reportData?.titulo || 'Geral'}</div>
          </div>
        </div>
      </div>

      {/* Report Type Selector */}
      <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-xs flex flex-wrap items-center gap-4 text-xs">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-slate-700">Tipo de Relatório:</span>
          <select
            value={reportType}
            onChange={e => setReportType(e.target.value)}
            className="bg-slate-50 border border-slate-300 rounded px-3 py-1.5 font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-600"
          >
            <option value="geral">Relatório Geral do Projeto</option>
            <option value="jogo">Relatório por Jogo</option>
            <option value="equipe">Relatório por Equipe</option>
            <option value="ias">Relatório de Uso das IAs</option>
            <option value="testes">Relatório de Testes e Resultados</option>
          </select>
        </div>

        {reportType === 'jogo' && (
          <div className="flex items-center gap-2">
            <span className="font-semibold text-slate-700">Selecionar Jogo:</span>
            <select
              value={selectedGameId}
              onChange={e => setSelectedGameId(e.target.value)}
              className="bg-slate-50 border border-slate-300 rounded px-3 py-1.5 font-medium text-slate-800 focus:outline-none"
            >
              {games.map(g => (
                <option key={g.id} value={g.id}>
                  {g.nome}
                </option>
              ))}
            </select>
          </div>
        )}

        {reportType === 'equipe' && (
          <div className="flex items-center gap-2">
            <span className="font-semibold text-slate-700">Selecionar Equipe:</span>
            <select
              value={selectedTeamId}
              onChange={e => setSelectedTeamId(e.target.value)}
              className="bg-slate-50 border border-slate-300 rounded px-3 py-1.5 font-medium text-slate-800 focus:outline-none"
            >
              {teams.map(t => (
                <option key={t.id} value={t.id}>
                  {t.nome}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Report Canvas / Screen Preview (Printable) */}
      {loading ? (
        <div className="p-12 text-center text-sm text-slate-500">Compilando relatório...</div>
      ) : !reportData ? (
        <div className="p-8 text-center text-sm text-slate-500">Nenhum dado gerado para o relatório selecionado.</div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-lg p-8 shadow-xs space-y-6">
          <div className="border-b border-slate-200 pb-4">
            <div className="flex items-start justify-between">
              <div>
                <span className="text-[10px] font-bold text-indigo-800 uppercase tracking-widest">
                  Documento Oficial • Projeto Acadêmico SI
                </span>
                <h2 className="text-xl font-bold text-slate-900 mt-1">{reportData.titulo}</h2>
              </div>
              <span className="text-xs font-mono text-slate-500">
                Gerado em: {new Date(reportData.geradoEm).toLocaleString('pt-BR')}
              </span>
            </div>
          </div>

          {/* Type specific visualizations */}
          {reportType === 'geral' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-3">
                  Resumo Quantitativo do Projeto
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
                  {Object.entries(reportData.resumoGeral || {}).map(([key, val]: [string, any]) => (
                    <div key={key} className="p-3 bg-slate-50 border border-slate-200 rounded-md">
                      <span className="text-slate-500 block truncate">{key}</span>
                      <span className="text-xl font-bold text-slate-900 mt-1 block">{String(val)}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                  Jogos em Desenvolvimento ({reportData.jogos?.length || 0})
                </h3>
                <div className="space-y-2 text-xs">
                  {(reportData.jogos || []).map((j: Game) => (
                    <div key={j.id} className="p-3 border border-slate-200 rounded-md flex items-center justify-between">
                      <div>
                        <span className="font-bold text-slate-900">{j.nome}</span>
                        <span className="text-slate-500 ml-2">({j.versaoAtual})</span>
                      </div>
                      <span className="text-slate-600">Status: {j.status}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {reportType === 'ias' && (
            <div className="space-y-4 text-xs">
              <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                Desempenho Científico dos Modelos de IA
              </h3>
              {(reportData.analiseComparativa || []).length === 0 ? (
                <p className="text-slate-500 italic py-4">«Dados insuficientes para gerar esta análise.»</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead className="bg-slate-50 border-b border-slate-200 text-slate-700 uppercase font-bold text-[10px]">
                      <tr>
                        <th className="py-2.5 px-3">IA</th>
                        <th className="py-2.5 px-3">Modelo</th>
                        <th className="py-2.5 px-3">Tipo</th>
                        <th className="py-2.5 px-3">Experimentos</th>
                        <th className="py-2.5 px-3">Aceitação</th>
                        <th className="py-2.5 px-3">Nota Média</th>
                        <th className="py-2.5 px-3">Custo-Benefício</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {reportData.analiseComparativa.map((row: any) => (
                        <tr key={row.iaId}>
                          <td className="py-2 px-3 font-semibold">{row.iaNome}</td>
                          <td className="py-2 px-3 font-mono">{row.modelo}</td>
                          <td className="py-2 px-3 uppercase text-[10px]">{row.tipo}</td>
                          <td className="py-2 px-3">{row.totalExperimentos}</td>
                          <td className="py-2 px-3 font-bold text-emerald-800">{row.indiceAceitacaoPercentual}%</td>
                          <td className="py-2 px-3 font-bold">{row.notaMediaAlunos}/5</td>
                          <td className="py-2 px-3">{row.custoBeneficioObservado}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {reportType === 'jogo' && (
            <div className="space-y-4 text-xs">
              {reportData.jogo ? (
                <div className="space-y-4">
                  <div className="p-4 bg-slate-50 border border-slate-200 rounded-md">
                    <h3 className="text-sm font-bold text-slate-900">{reportData.jogo.nome}</h3>
                    <p className="text-slate-600 mt-1">Objetivo: {reportData.jogo.objetivo}</p>
                    <div className="mt-2 text-slate-500 font-mono text-[11px]">
                      Versão: {reportData.jogo.versaoAtual} • Status: {reportData.jogo.status} • Início: {reportData.jogo.dataInicio}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="p-3 bg-slate-50 border border-slate-200 rounded">
                      <span className="text-slate-500">Tarefas Vinculadas</span>
                      <div className="text-lg font-bold text-slate-900 mt-0.5">{reportData.tarefas?.length || 0}</div>
                    </div>
                    <div className="p-3 bg-slate-50 border border-slate-200 rounded">
                      <span className="text-slate-500">Experimentos com IA</span>
                      <div className="text-lg font-bold text-slate-900 mt-0.5">{reportData.experimentos?.length || 0}</div>
                    </div>
                    <div className="p-3 bg-slate-50 border border-slate-200 rounded">
                      <span className="text-slate-500">Versões Lançadas</span>
                      <div className="text-lg font-bold text-slate-900 mt-0.5">{reportData.versoes?.length || 0}</div>
                    </div>
                  </div>
                </div>
              ) : (
                <p className="text-slate-500 italic">Nenhum dado encontrado para o jogo selecionado.</p>
              )}
            </div>
          )}

          {reportType === 'equipe' && (
            <div className="space-y-4 text-xs">
              {reportData.equipe ? (
                <div className="space-y-4">
                  <div className="p-4 bg-slate-50 border border-slate-200 rounded-md">
                    <h3 className="text-sm font-bold text-slate-900">{reportData.equipe.nome}</h3>
                    <p className="text-slate-600 mt-1">Área: {reportData.equipe.areaAtuacao}</p>
                    <div className="mt-2 text-slate-500">
                      Responsável: {reportData.equipe.responsavelNome} • Status: {reportData.equipe.status}
                    </div>
                  </div>

                  <div>
                    <h4 className="font-bold text-slate-800 mb-2">Jogos da Equipe ({reportData.jogos?.length || 0}):</h4>
                    <div className="space-y-1">
                      {(reportData.jogos || []).map((j: Game) => (
                        <div key={j.id} className="p-2 border border-slate-200 rounded">
                          {j.nome} ({j.versaoAtual}) - {j.status}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                <p className="text-slate-500 italic">Nenhuma equipe selecionada.</p>
              )}
            </div>
          )}

          {reportType === 'testes' && (
            <div className="space-y-4 text-xs">
              <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                Baterias de Testes Registradas ({reportData.baterias?.length || 0})
              </h3>
              <div className="space-y-3">
                {(reportData.baterias || []).map((b: any) => (
                  <div key={b.id} className="p-3 border border-slate-200 rounded-md">
                    <div className="font-bold text-slate-900">{b.nome} ({b.versaoTestada})</div>
                    <div className="text-slate-500 text-[11px] mt-0.5">
                      Tipo: {b.tipo} • Status: {b.status} • Período: {b.dataInicial} até {b.dataFinal || 'Atual'}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Printable Signature Section for Academic Evaluation */}
          <div className="hidden print:block pt-12 mt-8 border-t border-slate-300">
            <div className="grid grid-cols-2 gap-8 text-center text-xs">
              <div className="space-y-1">
                <div className="border-t border-slate-700 w-3/4 mx-auto pt-1 font-semibold text-slate-900">
                  Prof. Dr. Carlos Silva / Profa. Dra. Marina Santos
                </div>
                <div className="text-[10px] text-slate-500">Professores Orientadores / Avaliadores</div>
              </div>
              <div className="space-y-1">
                <div className="border-t border-slate-700 w-3/4 mx-auto pt-1 font-semibold text-slate-900">
                  Coordenação Discente do Projeto
                </div>
                <div className="text-[10px] text-slate-500">Sistemas de Informação</div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
