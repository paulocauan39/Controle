import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext.js';
import { ShieldCheck, UserCheck, ArrowRight, Database } from 'lucide-react';
import { UserRole } from '../types.js';
import { api, setStoredUserId } from '../services/api.js';

interface InitialSetupProps {
  onSetupCompleted?: () => void;
}

export const InitialSetup: React.FC<InitialSetupProps> = ({ onSetupCompleted }) => {
  const { setupInitialUser, refreshUsers } = useAuth();
  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');
  const [funcao, setFuncao] = useState<UserRole>('coordenador_aluno');
  const [dataEntrada, setDataEntrada] = useState(new Date().toISOString().split('T')[0]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingSeed, setLoadingSeed] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nome.trim() || !email.trim()) {
      setError('Por favor, preencha o nome e o e-mail.');
      return;
    }

    try {
      setLoading(true);
      setError('');
      await setupInitialUser({
        nome: nome.trim(),
        email: email.trim(),
        funcao,
        dataEntrada,
      });
      if (onSetupCompleted) onSetupCompleted();
    } catch (err: any) {
      setError(err.message || 'Erro ao registrar usuário inicial.');
    } finally {
      setLoading(false);
    }
  };

  const handleSeedDemo = async () => {
    try {
      setLoadingSeed(true);
      setError('');
      const res = await api.seedData();
      if (res.coordinator?.id) {
        setStoredUserId(res.coordinator.id);
      }
      await refreshUsers();
      if (onSetupCompleted) onSetupCompleted();
    } catch (err: any) {
      setError(err.message || 'Erro ao carregar dados de demonstração.');
    } finally {
      setLoadingSeed(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-xl shadow-md border border-slate-200 p-8">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-3 bg-indigo-50 text-indigo-700 rounded-lg">
            <ShieldCheck className="w-8 h-8" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900 leading-tight">
              Plataforma de Pesquisa
            </h1>
            <p className="text-xs text-slate-500 font-medium">
              Desenvolvimento de Jogos com IA • Sistemas de Informação
            </p>
          </div>
        </div>

        <div className="mb-6 bg-slate-50 p-4 rounded-lg border border-slate-200">
          <h2 className="text-sm font-semibold text-slate-800 flex items-center gap-2">
            <UserCheck className="w-4 h-4 text-indigo-600" />
            Configuração Inicial do Projeto
          </h2>
          <p className="text-xs text-slate-600 mt-1 leading-relaxed">
            Nenhum registro encontrado. Cadastre o primeiro participante para iniciar os trabalhos acadêmicos da plataforma.
          </p>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-md">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Nome Completo *
            </label>
            <input
              type="text"
              required
              value={nome}
              onChange={e => setNome(e.target.value)}
              placeholder="Ex: Carlos Eduardo (Estudante SI)"
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              E-mail Institucional *
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="exemplo@universidade.edu.br"
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Função Hierárquica no Projeto
            </label>
            <select
              value={funcao}
              onChange={e => setFuncao(e.target.value as UserRole)}
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:border-transparent"
            >
              <option value="coordenador_aluno">Coordenador Aluno (Coordenação Operacional)</option>
              <option value="professor_orientador">Professor Orientador</option>
              <option value="professor_colaborador">Professor Colaborador</option>
              <option value="aluno">Aluno (Pesquisador / Desenvolvedor)</option>
            </select>
            <p className="text-[11px] text-slate-500 mt-1">
              Recomendado iniciar com o <strong>Coordenador Aluno</strong> para configuração dos módulos.
            </p>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Data de Entrada no Projeto
            </label>
            <input
              type="date"
              value={dataEntrada}
              onChange={e => setDataEntrada(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:border-transparent"
            />
          </div>

          <button
            type="submit"
            disabled={loading || loadingSeed}
            className="w-full mt-4 flex items-center justify-center gap-2 py-2.5 px-4 bg-indigo-900 hover:bg-indigo-800 text-white text-sm font-medium rounded-md shadow-xs transition-colors disabled:opacity-50"
          >
            {loading ? 'Cadastrando...' : 'Cadastrar e Iniciar Plataforma'}
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        <div className="mt-5 pt-4 border-t border-slate-200 text-center">
          <button
            type="button"
            onClick={handleSeedDemo}
            disabled={loading || loadingSeed}
            className="w-full flex items-center justify-center gap-2 py-2 px-3 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-md border border-slate-300 transition-colors disabled:opacity-50"
          >
            <Database className="w-3.5 h-3.5 text-indigo-700" />
            {loadingSeed ? 'Carregando dados...' : 'Carregar Dados de Exemplo da Pesquisa (Demonstração)'}
          </button>
          <p className="text-[11px] text-slate-500 mt-2">
            Pré-carrega equipes, jogos, IAs catalogadas, tarefas e experimentos acadêmicos.
          </p>
        </div>
      </div>
    </div>
  );
};
