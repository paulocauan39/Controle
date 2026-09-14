import React, { useEffect, useState } from 'react';
import { api } from '../services/api.js';
import { AuditLog } from '../types.js';
import { EmptyState } from './EmptyState.js';
import { History, Shield, Search } from 'lucide-react';

export const HistoryView: React.FC = () => {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [moduleFilter, setModuleFilter] = useState('todos');

  const loadData = async () => {
    try {
      setLoading(true);
      const data = await api.getAuditLogs();
      setLogs(data);
    } catch (err) {
      console.error('Failed to load audit logs', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const modules = Array.from(new Set(logs.map(l => l.moduloAfetado)));

  const filteredLogs = logs.filter(l => {
    const matchesModule = moduleFilter === 'todos' || l.moduloAfetado === moduleFilter;
    const matchesSearch =
      l.usuarioNome.toLowerCase().includes(searchTerm.toLowerCase()) ||
      l.acao.toLowerCase().includes(searchTerm.toLowerCase()) ||
      l.registroAfetado.toLowerCase().includes(searchTerm.toLowerCase()) ||
      l.alteracaoRealizada.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesModule && matchesSearch;
  });

  if (loading) {
    return <div className="p-8 text-center text-sm text-slate-500">Carregando trilha de auditoria...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">Histórico e Auditoria do Sistema</h1>
            <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-slate-100 border border-slate-200 rounded text-[11px] font-semibold text-slate-700">
              <Shield className="w-3 h-3 text-indigo-700" /> Registro Imutável
            </span>
          </div>
          <p className="text-sm text-slate-500 mt-0.5">
            Trilha de auditoria cronológica das atividades acadêmicas. Os registros não podem ser alterados ou excluídos.
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row items-center gap-3">
        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Buscar por usuário, ação..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-white border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-600"
          />
        </div>

        <div className="flex items-center gap-2 text-xs w-full sm:w-auto">
          <span className="text-slate-500 font-medium whitespace-nowrap">Módulo:</span>
          <select
            value={moduleFilter}
            onChange={e => setModuleFilter(e.target.value)}
            className="bg-white border border-slate-300 rounded px-2.5 py-1.5 text-xs text-slate-800 font-medium focus:outline-none focus:ring-2 focus:ring-indigo-600 w-full sm:w-auto"
          >
            <option value="todos">Todos os Módulos</option>
            {modules.map(m => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>
        </div>
      </div>

      {filteredLogs.length === 0 ? (
        <EmptyState
          message="Nenhum registro encontrado."
          subMessage="Nenhuma atividade auditada foi localizada no período."
        />
      ) : (
        <div className="bg-white border border-slate-200 rounded-lg shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-700 uppercase tracking-wider text-[11px] font-bold">
                <tr>
                  <th className="py-3 px-4">Data / Horário</th>
                  <th className="py-3 px-4">Usuário</th>
                  <th className="py-3 px-4">Ação</th>
                  <th className="py-3 px-4">Módulo</th>
                  <th className="py-3 px-4">Registro Afetado</th>
                  <th className="py-3 px-4">Alteração Realizada</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 text-slate-800 text-xs font-normal">
                {filteredLogs.map(log => (
                  <tr key={log.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3 px-4 font-mono text-slate-500 whitespace-nowrap">
                      {log.data} <span className="text-slate-400">{log.horario}</span>
                    </td>
                    <td className="py-3 px-4 font-semibold text-slate-900 whitespace-nowrap">
                      {log.usuarioNome}
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                        log.acao.includes('CRIAR') || log.acao.includes('CADASTRO')
                          ? 'bg-emerald-100 text-emerald-800'
                          : log.acao.includes('EDITAR') || log.acao.includes('ATUALIZAR')
                          ? 'bg-blue-100 text-blue-800'
                          : log.acao.includes('EXCLUIR') || log.acao.includes('DESATIVAR')
                          ? 'bg-rose-100 text-rose-800'
                          : 'bg-slate-100 text-slate-700'
                      }`}>
                        {log.acao}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-medium text-slate-700 whitespace-nowrap">
                      {log.moduloAfetado}
                    </td>
                    <td className="py-3 px-4 font-medium text-indigo-900 whitespace-nowrap">
                      {log.registroAfetado}
                    </td>
                    <td className="py-3 px-4 text-slate-600 max-w-xs truncate">
                      {log.alteracaoRealizada}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
