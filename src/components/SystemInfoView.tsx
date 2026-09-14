import React, { useState } from 'react';
import { Info, ShieldCheck, CheckCircle2, AlertTriangle, BookOpen, UserCheck, Database, Settings, Tag, Sun, Moon, Palette } from 'lucide-react';
import { useAuth } from '../context/AuthContext.js';
import { useTheme } from '../context/ThemeContext.js';
import { PromptCategoryManagerModal } from './PromptCategoryManagerModal.js';

export const SystemInfoView: React.FC = () => {
  const { isCoordenadorAluno } = useAuth();
  const { theme, isDark, toggleTheme } = useTheme();
  const [categoryModalOpen, setCategoryModalOpen] = useState(false);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">Diretrizes e Especificações do Sistema</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            NexoIF • Documentação institucional e governança operacional do projeto acadêmico.
          </p>
        </div>

        {isCoordenadorAluno && (
          <button
            onClick={() => setCategoryModalOpen(true)}
            className="inline-flex items-center gap-2 px-3.5 py-2 bg-indigo-900 hover:bg-indigo-800 text-white text-xs font-semibold rounded-md shadow-xs transition-colors self-start sm:self-auto"
          >
            <Tag className="w-4 h-4" />
            Gerenciar Categorias de Prompts
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Contexto do Projeto */}
        <div className="bg-white border border-slate-200 rounded-lg p-5 shadow-xs space-y-3">
          <div className="flex items-center gap-2 text-indigo-900 font-bold text-sm">
            <BookOpen className="w-4 h-4 text-indigo-700" />
            Contexto Acadêmico
          </div>
          <p className="text-xs text-slate-600 leading-relaxed">
            Plataforma oficial de organização, acompanhamento, documentação e análise de um projeto acadêmico de desenvolvimento de jogos com auxílio de Inteligência Artificial.
          </p>
          <div className="bg-slate-50 p-3 rounded border border-slate-200 text-xs space-y-1">
            <div><strong>Curso:</strong> Bacharelado em Sistemas de Informação</div>
            <div><strong>Supervisão:</strong> 1 Professor Orientador + 1 Professor Colaborador</div>
            <div><strong>Coordenação:</strong> Coordenador Aluno</div>
            <div><strong>Corpo Discente:</strong> Estudantes de Sistemas de Informação</div>
          </div>
        </div>

        {/* Regra 1: Não Ultrapasse o Escopo */}
        <div className="bg-white border border-slate-200 rounded-lg p-5 shadow-xs space-y-3">
          <div className="flex items-center gap-2 text-rose-900 font-bold text-sm">
            <AlertTriangle className="w-4 h-4 text-rose-600" />
            Regra Fundamental: Não Ultrapasse o Escopo
          </div>
          <p className="text-xs text-slate-600 leading-relaxed">
            A aplicação deve implementar somente aquilo que estiver especificado na definição do projeto. É estritamente vedada a adição de funcionalidades não solicitadas ou mecânicas supérfluas.
          </p>
          <div className="bg-rose-50/70 p-3 rounded border border-rose-100 text-[11px] text-rose-900 space-y-1">
            <div>• Sem simulações ou dados falsos ("dados reais").</div>
            <div>• Sem diagramas de Gantt pesados; cronograma em linha do tempo e lista.</div>
            <div>• Histórico e auditoria imutáveis (sem edição ou exclusão).</div>
          </div>
        </div>

        {/* Princípios de Implementação Conservadora */}
        <div className="bg-white border border-slate-200 rounded-lg p-5 shadow-xs space-y-3">
          <div className="flex items-center gap-2 text-slate-900 font-bold text-sm">
            <ShieldCheck className="w-4 h-4 text-emerald-700" />
            Princípio de Implementação Conservadora
          </div>
          <ul className="text-xs text-slate-600 space-y-2">
            <li className="flex items-start gap-2">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
              <span><strong>Simplicidade Robusta:</strong> Escolha da solução mais simples, manutenível e com menos dependências desnecessárias.</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
              <span><strong>Persistência Segura:</strong> Armazenamento estruturado de dados com integridade referencial mantida no servidor.</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
              <span><strong>Clareza em Estados Vazios:</strong> Mensagem padronizada: <em>«Nenhum registro encontrado. Cadastre o primeiro registro para começar.»</em></span>
            </li>
          </ul>
        </div>

        {/* Hierarquia de Permissões */}
        <div className="bg-white border border-slate-200 rounded-lg p-5 shadow-xs space-y-3">
          <div className="flex items-center gap-2 text-slate-900 font-bold text-sm">
            <UserCheck className="w-4 h-4 text-indigo-700" />
            Matriz de Funções e Permissões
          </div>
          <div className="space-y-2 text-xs">
            <div className="p-2 bg-indigo-50 border border-indigo-100 rounded">
              <strong className="text-indigo-900">Coordenador Aluno:</strong> Acesso administrativo operacional completo, cadastro de usuários, criação de equipes, tarefas, jogos e marcos.
            </div>
            <div className="p-2 bg-emerald-50 border border-emerald-100 rounded">
              <strong className="text-emerald-900">Professor Orientador:</strong> Supervisão acadêmica, visualização global, aprovação de marcos, relatórios e auditoria.
            </div>
            <div className="p-2 bg-teal-50 border border-teal-100 rounded">
              <strong className="text-teal-900">Professor Colaborador:</strong> Acompanhamento técnico, visualização de jogos, experimentos, testes e resultados.
            </div>
            <div className="p-2 bg-sky-50 border border-sky-100 rounded">
              <strong className="text-sky-900">Aluno:</strong> Visualização de suas tarefas, registro de experimentos e prompts, submissão de versões e preenchimento de testes.
            </div>
          </div>
        </div>

        {/* Preferências de Interface & Acessibilidade Visual */}
        <div className="bg-white border border-slate-200 rounded-lg p-5 shadow-xs space-y-3 md:col-span-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-slate-900 font-bold text-sm">
              <Palette className="w-4 h-4 text-indigo-600" />
              Acessibilidade Visual e Modo de Pesquisa Noturna
            </div>
            <button
              id="btn-system-toggle-theme"
              type="button"
              onClick={toggleTheme}
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-700 text-xs font-semibold text-slate-800 dark:text-slate-100 transition-colors shadow-xs"
            >
              {isDark ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-slate-600" />}
              {isDark ? 'Alternar para Modo Claro' : 'Alternar para Modo Escuro'}
            </button>
          </div>
          <p className="text-xs text-slate-600 leading-relaxed">
            O NexoIF oferece suporte nativo a temas Claro e Escuro (Dark Mode) para otimizar o conforto visual e reduzir a fadiga ocular durante longas sessões de leitura, análise de prompts e testes de inteligência artificial. Sua preferência é persistida localmente e respeita o padrão do seu sistema operacional.
          </p>
        </div>
      </div>

      {isCoordenadorAluno && (
        <PromptCategoryManagerModal
          isOpen={categoryModalOpen}
          onClose={() => setCategoryModalOpen(false)}
          onCategoriesChanged={() => {}}
        />
      )}
    </div>
  );
};
