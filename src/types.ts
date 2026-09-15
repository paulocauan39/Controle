export type UserRole = 
  | 'admin'
  | 'coordenador_aluno'
  | 'professor_orientador'
  | 'professor_colaborador'
  | 'aluno';

export interface Participant {
  id: string;
  nome: string;
  email: string;
  funcao: UserRole;
  isAdmin?: boolean;
  roles?: UserRole[];
  equipeId?: string;
  equipeNome?: string;
  status: 'Ativo' | 'Inativo';
  dataEntrada: string;
  createdAt: string;
}

export interface Team {
  id: string;
  nome: string;
  descricao: string;
  responsavelId: string;
  responsavelNome: string;
  participantesIds: string[];
  areaAtuacao: string;
  status: 'Ativa' | 'Inativa';
  createdAt: string;
}

export type GameStatus = 'Planejamento' | 'Desenvolvimento' | 'Testes' | 'Finalizado' | 'Arquivado';

export interface Game {
  id: string;
  nome: string;
  descricao: string;
  objetivo: string;
  equipeId: string;
  equipeNome?: string;
  participantesIds: string[];
  tecnologiaUtilizada: string;
  versaoAtual: string;
  status: GameStatus;
  dataInicio: string;
  previsaoConclusao: string;
  linkProjeto: string;
  observacoes: string;
  createdAt: string;
}

export type AIType = 'texto' | 'código' | 'imagem' | 'áudio' | '3D' | 'outro';
export type AILicense = 'Gratuita' | 'Paga' | 'Freemium / Limites' | 'Acadêmica';

export interface AIModel {
  id: string;
  nome: string;
  empresaProvedor: string;
  modelo: string;
  versao: string;
  tipo?: AIType;
  finalidade: string;
  pontosFortes?: string;
  limitacoes?: string;
  licencaCusto?: AILicense | string;
  observacoes: string;
  linkOficial: string;
  createdAt: string;
}

export type ExperimentAcceptance = 
  | 'Aprovado'
  | 'Aprovado com alterações'
  | 'Rejeitado'
  | 'Aceito sem alterações'
  | 'Aceito com pequenas alterações'
  | 'Aceito com muitas alterações'
  | 'Rejeitado / Inútil';

export interface Experiment {
  id: string;
  jogoId: string;
  jogoNome?: string;
  alunoResponsavelId: string;
  alunoResponsavelNome: string;
  iaId: string;
  iaNome?: string;
  modelo: string;
  data: string;
  finalidade: string;
  tarefaRealizada: string;
  prompt: string;
  resultadoObtido: string;
  alteracoesManuais: string;
  problemasEncontrados: string;
  tempoAproximadoMinutos: number;
  avaliacao: number; // 1 to 5
  resultadoFinal: ExperimentAcceptance | string;
  resultadoAceito?: ExperimentAcceptance;
  parametros?: string;
  observacoes: string;
  createdAt: string;
}

export type AIExperiment = Experiment;

export type PromptCategory = 
  | 'Roteiro'
  | 'Mecânica'
  | 'Diálogos'
  | 'Textura'
  | 'Áudio'
  | 'Balanceamento'
  | 'Shader'
  | 'Código'
  | 'Outra';

export interface PromptCategoryItem {
  id: string;
  nome: string;
  descricao?: string;
  ativa: boolean;
  createdAt: string;
}

export interface PromptItem {
  id: string;
  titulo: string;
  autorId: string;
  autorNome: string;
  iaId?: string;
  iaNome?: string;
  iaRecomendadaId?: string;
  jogoId?: string;
  jogoNome?: string;
  categoria: PromptCategory | string;
  promptCompleto: string;
  data?: string;
  parametrosSugeridos?: string;
  resultadoEsperado?: string;
  exemploSaidaReal?: string;
  resultado?: string;
  avaliacao: number; // 1 to 5
  observacoes?: string;
  createdAt: string;
}

export type TaskPriority = 'Baixa' | 'Média' | 'Alta' | 'Crítica';
export type TaskStatus = 'A fazer' | 'Em andamento' | 'Em revisão' | 'Concluída' | 'Cancelada';

export interface Task {
  id: string;
  titulo: string;
  descricao: string;
  responsavelId: string;
  responsavelNome: string;
  equipeId: string;
  equipeNome?: string;
  jogoId?: string;
  jogoNome?: string;
  prioridade: TaskPriority;
  status: TaskStatus;
  prazo: string;
  dataConclusao?: string;
  observacoes: string;
  createdAt: string;
}

export interface GameVersion {
  id: string;
  jogoId: string;
  jogoNome?: string;
  numero: string;
  data: string;
  responsavelId: string;
  responsavelNome: string;
  alteracoes: string;
  funcionalidadesAdicionadas?: string;
  bugsCorrigidos?: string;
  linkArquivo?: string;
  observacoes?: string;
  createdAt: string;
}

export type TestType = 'jogabilidade' | 'desempenho' | 'bugs' | 'usabilidade' | 'aceitação da IA' | 'balanceamento' | 'outro';
export type TestStatus = 'Planejado' | 'Em andamento' | 'Concluído' | 'Cancelado';
export type TestSuiteStatus = TestStatus;

export interface TestSuite {
  id: string;
  nome: string;
  jogoId: string;
  jogoNome?: string;
  versaoTestada?: string;
  tipo?: TestType;
  objetivo: string;
  responsavelId: string;
  responsavelNome: string;
  dataInicial: string;
  dataFinal?: string;
  participantesIds?: string[];
  participantesTestadoresIds?: string[];
  criterios: string[]; // e.g. ["Jogabilidade", "Estabilidade", "Desempenho"]
  status: TestStatus;
  observacoes?: string;
  createdAt: string;
}

export interface TestEvaluation {
  id: string;
  testeId: string;
  jogoId: string;
  participanteId: string;
  participanteNome?: string;
  data: string;
  notas: Record<string, number>; // criterio -> nota (1-5)
  comentarios: string;
  problemas: string;
  sugestoes: string;
  createdAt: string;
}

export type MilestoneStatus = 'Não iniciado' | 'Não iniciada' | 'Em andamento' | 'Concluído' | 'Concluída' | 'Atrasado' | 'Atrasada';

export interface Milestone {
  id: string;
  faseMarco?: string;
  descricao?: string;
  dataPrevista?: string;
  dataRealizada?: string;
  responsavelId: string;
  responsavelNome?: string;
  status: MilestoneStatus | string;
  observacoes?: string;
  createdAt: string;
  etapa?: string;
  tarefasIds?: string[];
  dataInicio?: string;
  prazo?: string;
}

export interface ScheduleMilestone {
  id: string;
  faseMarco?: string;
  descricao?: string;
  dataPrevista?: string;
  dataRealizada?: string;
  responsavelId: string;
  responsavelNome?: string;
  status: MilestoneStatus | string;
  observacoes?: string;
  createdAt: string;
  etapa?: string;
  tarefasIds?: string[];
  dataInicio?: string;
  prazo?: string;
}

export type DocumentCategory = 
  | 'Especificação Técnica'
  | 'Relatório de Progresso'
  | 'Manual'
  | 'Artigo Científico'
  | 'Ata de Reunião'
  | 'Outro';

export type DocumentAccessLevel = 
  | 'Todos'
  | 'Apenas Professores e Coordenador'
  | 'Restrito';

export interface ProjectDocument {
  id: string;
  titulo: string;
  categoria: DocumentCategory;
  descricao: string;
  conteudo: string;
  jogoId?: string;
  jogoNome?: string;
  autorId: string;
  autorNome: string;
  autorRole: UserRole;
  versao: string;
  nivelAcesso: DocumentAccessLevel;
  linkExterno?: string;
  tags?: string[];
  dataCriacao: string;
  dataAtualizacao?: string;
  createdAt: string;
}

export interface AuditLog {
  id: string;
  usuarioId: string;
  usuarioNome: string;
  usuarioRole: UserRole;
  acao: string;
  registroAfetado: string;
  tipoEntidade: string;
  entidadeId: string;
  moduloAfetado?: 'Tarefas' | 'Jogos' | 'Prompts' | 'Documentos' | 'Participantes' | 'Equipes' | 'Experimentos' | 'Testes' | string;
  detalhes?: {
    campoAlterado?: string;
    valorAnterior?: string;
    novoValor?: string;
    descricaoCurta?: string;
    [key: string]: any;
  };
  data: string;
  horario: string;
  alteracaoRealizada: string;
  timestamp: number;
}

export interface SystemVersion {
  id: string;
  versao: string;
  data: string;
  alteracao: string;
  responsavel: string;
}

export interface FutureSuggestion {
  id: string;
  titulo: string;
  descricao: string;
  autor: string;
  data: string;
  status: 'Registrada' | 'Aprovada para Futuro' | 'Descartada';
  createdAt: string;
}

export interface DashboardStats {
  progressoGeralPercentual: number;
  qtdJogos: number;
  qtdParticipantes: number;
  qtdEquipes: number;
  tarefasPendentes: number;
  tarefasEmAndamento: number;
  tarefasConcluidas: number;
  testesEmAndamento: number;
  testesConcluidos: number;
  proximasAtividades: Task[];
  ultimasAtividades: AuditLog[];
}
