import fs from 'fs';
import path from 'path';
import {
  Participant,
  Team,
  Game,
  AIModel,
  Experiment,
  PromptItem,
  PromptCategoryItem,
  ProjectDocument,
  Task,
  GameVersion,
  TestSuite,
  TestEvaluation,
  ScheduleMilestone,
  AuditLog,
  SystemVersion,
  FutureSuggestion,
  UserRole,
} from '../src/types.js';

export interface DatabaseSchema {
  participants: Participant[];
  teams: Team[];
  games: Game[];
  ais: AIModel[];
  experiments: Experiment[];
  prompts: PromptItem[];
  promptCategoryItems: PromptCategoryItem[];
  documents: ProjectDocument[];
  tasks: Task[];
  versions: GameVersion[];
  testSuites: TestSuite[];
  testEvaluations: TestEvaluation[];
  scheduleMilestones: ScheduleMilestone[];
  auditLogs: AuditLog[];
  systemVersions: SystemVersion[];
  futureSuggestions: FutureSuggestion[];
  promptCategories: string[];
}

const DATA_DIR = process.env.VERCEL === '1' ? '/tmp' : path.join(process.cwd(), 'data');
const DB_FILE = path.join(DATA_DIR, 'database.json');

const INITIAL_CATEGORIES = [
  'Programação',
  'Correção de bugs',
  'Mecânicas',
  'Arte',
  'Interface',
  'Documentação',
  'Áudio',
  'Otimização',
  'Shader',
  'Diálogos',
];

export const INITIAL_PROMPT_CATEGORY_ITEMS: PromptCategoryItem[] = [
  { id: 'cat-1', nome: 'Programação', descricao: 'Geração de scripts, classes e algoritmos em C# e GDScript', ativa: true, createdAt: '2026-02-15T09:00:00.000Z' },
  { id: 'cat-2', nome: 'Correção de bugs', descricao: 'Análise de stacktraces e refatoração de código com erros', ativa: true, createdAt: '2026-02-15T09:00:00.000Z' },
  { id: 'cat-3', nome: 'Mecânicas', descricao: 'Regras de gameplay, balanceamento e geração procedural', ativa: true, createdAt: '2026-02-15T09:00:00.000Z' },
  { id: 'cat-4', nome: 'Arte', descricao: 'Conceito visual, modelagem e estilo artístico para assets', ativa: true, createdAt: '2026-02-15T09:00:00.000Z' },
  { id: 'cat-5', nome: 'Shader', descricao: 'Shaders gráficos em HLSL, GLSL e nós visuais de render', ativa: true, createdAt: '2026-02-15T09:00:00.000Z' },
  { id: 'cat-6', nome: 'Diálogos', descricao: 'Roteiros, árvores de diálogo e personas dinâmicas para NPCs', ativa: true, createdAt: '2026-02-15T09:00:00.000Z' },
  { id: 'cat-7', nome: 'Interface', descricao: 'Design de HUD, telas e acessibilidade do jogador', ativa: true, createdAt: '2026-02-15T09:00:00.000Z' },
  { id: 'cat-8', nome: 'Documentação', descricao: 'Elaboração de especificações e relatórios acadêmicos', ativa: true, createdAt: '2026-02-15T09:00:00.000Z' },
  { id: 'cat-9', nome: 'Áudio', descricao: 'Efeitos sonoros e trilhas adaptativas guiadas por IA', ativa: true, createdAt: '2026-02-15T09:00:00.000Z' },
];

export const INITIAL_DOCUMENTS: ProjectDocument[] = [
  {
    id: 'doc-1',
    titulo: 'Especificação Técnica: Geração Procedural com BSP em Chronos Realm',
    categoria: 'Especificação Técnica',
    descricao: 'Detalhamento do particionamento binário de espaço (BSP), conexões de corredores e integração com Unity URP.',
    conteudo: '## 1. Visão Geral da Arquitetura\nO jogo Chronos Realm utiliza algoritmos de Binary Space Partitioning (BSP) assistidos por IA para geração de labirintos e salas.\n\n## 2. Parâmetros Técnicos\n- Particionamento recursivo até 4 níveis\n- Largura mínima de sala: 6 tiles\n- Conexão ortogonal garantida através de grafo de adjacência\n\n## 3. Integração com Gemini 1.5 Pro\nA estrutura de dados de nós de salas foi prototipada via prompt estruturado e refinada pelos estudantes pesquisadores.',
    jogoId: 'game-1',
    jogoNome: 'Chronos Realm: Procedural Dungeon',
    autorId: 'part-coord-1',
    autorNome: 'Lucas Mendes',
    autorRole: 'coordenador_aluno',
    versao: 'v1.0.0',
    nivelAcesso: 'Todos',
    linkExterno: 'https://github.com/pesquisa-jogos/chronos-realm/docs/spec-bsp.md',
    tags: ['Unity', 'BSP', 'Procedural', 'Gemini'],
    dataCriacao: '2026-03-03',
    createdAt: '2026-03-03T14:00:00.000Z',
  },
  {
    id: 'doc-2',
    titulo: 'Manual de Engenharia de Prompts para Shaders URP',
    categoria: 'Manual',
    descricao: 'Guia de melhores práticas para prompts que instruem modelos de linguagem na escrita de shaders HLSL para Unity 2022+.',
    conteudo: '## 1. Diretrizes de Contexto em Shaders\nAo solicitar shaders em HLSL:\n- Especificar Universal Render Pipeline (URP 14+)\n- Solicitar includes essenciais (Packages/com.unity.render-pipelines.universal/ShaderLibrary/Core.hlsl)\n- Declarar propriedades de corte e emissão explicitamente.\n\n## 2. Parâmetros Recomendados\n- Temperature: 0.2 (redução drástica de erros sintáticos em GLSL/HLSL)\n- Validação por compilação incremental no Unity.',
    jogoId: 'game-1',
    jogoNome: 'Chronos Realm: Procedural Dungeon',
    autorId: 'part-aluno-1',
    autorNome: 'Gabriel Santos',
    autorRole: 'aluno',
    versao: 'v1.2.0',
    nivelAcesso: 'Todos',
    tags: ['Shader', 'HLSL', 'URP', 'Guia'],
    dataCriacao: '2026-03-09',
    createdAt: '2026-03-09T16:00:00.000Z',
  },
  {
    id: 'doc-3',
    titulo: 'Relatório de Progresso Acadêmico - Fases 1 e 2',
    categoria: 'Relatório de Progresso',
    descricao: 'Relatório preliminar de acompanhamento para os professores orientadores com consolidação das métricas de IA.',
    conteudo: '## 1. Resumo Executivo\nForam catalogadas 3 IAs principais (Gemini 1.5 Pro, Claude 3.5 Sonnet, GPT-4o). Todas as equipes atingiram a meta de prototipagem funcional.\n\n## 2. Dados de Avaliação Empírica\n- Satisfação média geral: 4.67/5\n- Redução no tempo de desenvolvimento de shaders: ~40%\n- Estabilidade de código: 85% de aceitação sem alterações maiores.',
    autorId: 'part-prof-1',
    autorNome: 'Prof. Dr. Alexandre Silva',
    autorRole: 'professor_orientador',
    versao: 'v1.0.0',
    nivelAcesso: 'Apenas Professores e Coordenador',
    tags: ['Relatório', 'Orientação', 'Métricas'],
    dataCriacao: '2026-03-12',
    createdAt: '2026-03-12T10:00:00.000Z',
  },
];

const INITIAL_SYSTEM_VERSIONS: SystemVersion[] = [
  {
    id: 'sys-v0.1.0',
    versao: 'v0.1.0',
    data: '2026-09-14',
    alteracao: 'Estrutura inicial da plataforma acadêmica de pesquisa em desenvolvimento de jogos com Inteligência Artificial.',
    responsavel: 'Coordenador Aluno',
  },
];

function getInitialDB(): DatabaseSchema {
  return {
    participants: [],
    teams: [],
    games: [],
    ais: [],
    experiments: [],
    prompts: [],
    promptCategoryItems: INITIAL_PROMPT_CATEGORY_ITEMS,
    documents: [],
    tasks: [],
    versions: [],
    testSuites: [],
    testEvaluations: [],
    scheduleMilestones: [],
    auditLogs: [],
    systemVersions: INITIAL_SYSTEM_VERSIONS,
    futureSuggestions: [],
    promptCategories: INITIAL_CATEGORIES,
  };
}

export function getInitialSeedData(): DatabaseSchema {
  const participants: Participant[] = [
    {
      id: 'part-coord-1',
      nome: 'Lucas Mendes',
      email: 'lucas.mendes@universidade.edu.br',
      funcao: 'coordenador_aluno',
      equipeId: 'team-1',
      equipeNome: 'Equipe Alpha - Shaders & Procedural',
      status: 'Ativo',
      dataEntrada: '2026-02-15',
      createdAt: '2026-02-15T09:00:00.000Z',
    },
    {
      id: 'part-prof-1',
      nome: 'Prof. Dr. Alexandre Silva',
      email: 'alexandre.silva@universidade.edu.br',
      funcao: 'professor_orientador',
      status: 'Ativo',
      dataEntrada: '2026-02-01',
      createdAt: '2026-02-01T09:00:00.000Z',
    },
    {
      id: 'part-prof-2',
      nome: 'Prof. Dra. Beatriz Ferreira',
      email: 'beatriz.ferreira@universidade.edu.br',
      funcao: 'professor_colaborador',
      status: 'Ativo',
      dataEntrada: '2026-02-10',
      createdAt: '2026-02-10T09:00:00.000Z',
    },
    {
      id: 'part-aluno-1',
      nome: 'Gabriel Santos',
      email: 'gabriel.santos@universidade.edu.br',
      funcao: 'aluno',
      equipeId: 'team-1',
      equipeNome: 'Equipe Alpha - Shaders & Procedural',
      status: 'Ativo',
      dataEntrada: '2026-02-20',
      createdAt: '2026-02-20T09:00:00.000Z',
    },
    {
      id: 'part-aluno-2',
      nome: 'Juliana Lima',
      email: 'juliana.lima@universidade.edu.br',
      funcao: 'aluno',
      equipeId: 'team-2',
      equipeNome: 'Equipe Beta - Diálogos & NPCs',
      status: 'Ativo',
      dataEntrada: '2026-02-20',
      createdAt: '2026-02-20T09:00:00.000Z',
    },
  ];

  const teams: Team[] = [
    {
      id: 'team-1',
      nome: 'Equipe Alpha - Shaders & Procedural',
      descricao: 'Desenvolvimento de algoritmos de geração procedural de masmorras e shaders HLSL assistidos por IA.',
      responsavelId: 'part-coord-1',
      responsavelNome: 'Lucas Mendes',
      participantesIds: ['part-coord-1', 'part-aluno-1'],
      areaAtuacao: 'Programação Gráfica e Geração Procedural',
      status: 'Ativa',
      createdAt: '2026-02-20T10:00:00.000Z',
    },
    {
      id: 'team-2',
      nome: 'Equipe Beta - Diálogos & NPCs',
      descricao: 'Exploração de Large Language Models (LLMs) para roteirização e diálogos contextuais em jogos de RPG.',
      responsavelId: 'part-coord-1',
      responsavelNome: 'Lucas Mendes',
      participantesIds: ['part-aluno-2'],
      areaAtuacao: 'Inteligência Artificial Generativa e Roteiro',
      status: 'Ativa',
      createdAt: '2026-02-20T10:30:00.000Z',
    },
  ];

  const games: Game[] = [
    {
      id: 'game-1',
      nome: 'Chronos Realm: Procedural Dungeon',
      descricao: 'Jogo roguelike de exploração onde salas, iluminação e shaders de ambiente são gerados com apoio de modelos de IA.',
      objetivo: 'Medir a eficácia, taxa de acerto e tempo economizado na criação de shaders e lógica procedural em Unity com IA.',
      equipeId: 'team-1',
      equipeNome: 'Equipe Alpha - Shaders & Procedural',
      participantesIds: ['part-coord-1', 'part-aluno-1'],
      tecnologiaUtilizada: 'Unity / C# / HLSL',
      versaoAtual: 'v0.2.1',
      status: 'Desenvolvimento',
      dataInicio: '2026-02-22',
      previsaoConclusao: '2026-11-30',
      linkProjeto: 'https://github.com/pesquisa-jogos/chronos-realm',
      observacoes: 'Projeto prioritário da pesquisa no primeiro semestre.',
      createdAt: '2026-02-22T14:00:00.000Z',
    },
    {
      id: 'game-2',
      nome: 'Nexus Rogue: Echoes of Mind',
      descricao: 'RPG tático baseado em turnos com NPCs inteligentes que mantêm memória dinâmica de interações anteriores.',
      objetivo: 'Analisar coerência narrativa, custo computacional e latência de respostas em tempo real para NPCs alimentados por LLMs.',
      equipeId: 'team-2',
      equipeNome: 'Equipe Beta - Diálogos & NPCs',
      participantesIds: ['part-aluno-2'],
      tecnologiaUtilizada: 'Godot Engine 4 / GDScript',
      versaoAtual: 'v0.1.0',
      status: 'Planejamento',
      dataInicio: '2026-03-01',
      previsaoConclusao: '2026-12-15',
      linkProjeto: 'https://github.com/pesquisa-jogos/nexus-rogue',
      observacoes: 'Focado em avaliação qualitativa com jogadores voluntários.',
      createdAt: '2026-03-01T11:00:00.000Z',
    },
  ];

  const ais: AIModel[] = [
    {
      id: 'ai-1',
      nome: 'Gemini 1.5 Pro',
      empresaProvedor: 'Google DeepMind',
      modelo: 'gemini-1.5-pro',
      versao: '1.5-pro-latest',
      tipo: 'código',
      finalidade: 'Geração e refatoração de algoritmos procedurais, scripts em C# e análise de complexidade.',
      pontosFortes: 'Janela de contexto extensa de até 2M tokens, ótimo suporte a código e raciocínio técnico.',
      limitacoes: 'Pequena latência em requisições de contexto muito longo.',
      licencaCusto: 'Freemium / Limites',
      observacoes: 'Utilizado principalmente para as mecânicas de Chronos Realm.',
      linkOficial: 'https://ai.google.dev/',
      createdAt: '2026-02-16T09:00:00.000Z',
    },
    {
      id: 'ai-2',
      nome: 'Claude 3.5 Sonnet',
      empresaProvedor: 'Anthropic',
      modelo: 'claude-3-5-sonnet',
      versao: '20241022',
      tipo: 'texto',
      finalidade: 'Criação de diálogos imersivos, árvores de decisão narrativa e personas de NPCs.',
      pontosFortes: 'Elevada sutileza estilística, respostas naturais e baixa taxa de alucinação de regras narrativas.',
      limitacoes: 'Custo por token em chamadas contínuas.',
      licencaCusto: 'Paga',
      observacoes: 'Modelo de referência para o módulo de NPCs de Nexus Rogue.',
      linkOficial: 'https://anthropic.com/',
      createdAt: '2026-02-17T10:00:00.000Z',
    },
    {
      id: 'ai-3',
      nome: 'ChatGPT (GPT-4o)',
      empresaProvedor: 'OpenAI',
      modelo: 'gpt-4o',
      versao: '2024-08-06',
      tipo: 'código',
      finalidade: 'Resolução de bugs, escrita de shaders GLSL/HLSL e conversão de lógica matemática.',
      pontosFortes: 'Velocidade de geração e versatilidade em sintaxes gráficas.',
      limitacoes: 'Eventuais inconsistências em APIs específicas do Unity 2023+.',
      licencaCusto: 'Paga',
      observacoes: 'Testado para tarefas de shaders de iluminação volumétrica.',
      linkOficial: 'https://openai.com/',
      createdAt: '2026-02-18T14:00:00.000Z',
    },
  ];

  const experiments: Experiment[] = [
    {
      id: 'exp-1',
      jogoId: 'game-1',
      jogoNome: 'Chronos Realm: Procedural Dungeon',
      alunoResponsavelId: 'part-aluno-1',
      alunoResponsavelNome: 'Gabriel Santos',
      iaId: 'ai-1',
      iaNome: 'Gemini 1.5 Pro',
      modelo: 'gemini-1.5-pro',
      data: '2026-03-02',
      finalidade: 'Geração do algoritmo de divisão binária do espaço (BSP) para posicionamento de salas',
      tarefaRealizada: 'Criação de classe C# para particionamento de grade e interconexão de corredores',
      prompt: 'Escreva um gerador de masmorra em C# para Unity usando Binary Space Partitioning (BSP). O código deve retornar uma lista de retângulos (salas) conectados por corredores ortogonais, com verificação de colisão.',
      resultadoObtido: 'A IA gerou a classe completa com separação de nós e método de subdivisão recursiva.',
      alteracoesManuais: 'Ajuste na largura mínima dos corredores e adição de restrição para evitar salas sobrepostas nas bordas.',
      problemasEncontrados: 'As salas menores estavam ficando coladas nas paredes externas.',
      tempoAproximadoMinutos: 25,
      avaliacao: 5,
      resultadoFinal: 'Aceito com pequenas alterações',
      resultadoAceito: 'Aceito com pequenas alterações',
      observacoes: 'Excelente base que poupou cerca de 4 horas de codificação manual.',
      createdAt: '2026-03-02T16:30:00.000Z',
    },
    {
      id: 'exp-2',
      jogoId: 'game-2',
      jogoNome: 'Nexus Rogue: Echoes of Mind',
      alunoResponsavelId: 'part-aluno-2',
      alunoResponsavelNome: 'Juliana Lima',
      iaId: 'ai-2',
      iaNome: 'Claude 3.5 Sonnet',
      modelo: 'claude-3-5-sonnet',
      data: '2026-03-05',
      finalidade: 'Definição de diálogo condicional para NPC Sentinela quando o jogador possui reputação negativa',
      tarefaRealizada: 'Prompt estruturado retornando formato JSON com falas e gatilhos de comportamento',
      prompt: 'Você é um roteirista de jogos. Gere em formato JSON válido as falas de um guarda sentinela com nível de desconfiança alto. Inclua fala inicial, duas opções de resposta do jogador e a respectiva reação.',
      resultadoObtido: 'JSON estritamente válido com texto coerente, tom ameaçador e variáveis claras de gatilho.',
      alteracoesManuais: 'Nenhuma alteração de texto necessária.',
      problemasEncontrados: 'Nenhum.',
      tempoAproximadoMinutos: 15,
      avaliacao: 5,
      resultadoFinal: 'Aceito sem alterações',
      resultadoAceito: 'Aceito sem alterações',
      observacoes: 'Formatado pronto para consumo direto no Godot Engine.',
      createdAt: '2026-03-05T11:00:00.000Z',
    },
    {
      id: 'exp-3',
      jogoId: 'game-1',
      jogoNome: 'Chronos Realm: Procedural Dungeon',
      alunoResponsavelId: 'part-aluno-1',
      alunoResponsavelNome: 'Gabriel Santos',
      iaId: 'ai-3',
      iaNome: 'ChatGPT (GPT-4o)',
      modelo: 'gpt-4o',
      data: '2026-03-08',
      finalidade: 'Shader HLSL de efeito de dissolução (dissolve effect) com ruído de Perlin para inimigos derrotados',
      tarefaRealizada: 'Geração de shader code HLSL para Universal Render Pipeline (URP)',
      prompt: 'Escreva um HLSL SubShader para Unity URP que realize efeito de dissolve baseado em textura de ruído e gradiente com Fresnel emitindo luz laranja nas bordas de corte.',
      resultadoObtido: 'Shader funcional com propriedades de corte e emissão.',
      alteracoesManuais: 'Correção de diretivas de include do URP Core.hlsl que estavam com caminho desatualizado.',
      problemasEncontrados: 'Caminho de include do shader URP antigo.',
      tempoAproximadoMinutos: 30,
      avaliacao: 4,
      resultadoFinal: 'Aceito com pequenas alterações',
      resultadoAceito: 'Aceito com pequenas alterações',
      observacoes: 'Resultado estético muito satisfatório.',
      createdAt: '2026-03-08T17:45:00.000Z',
    },
  ];

  const prompts: PromptItem[] = [
    {
      id: 'pmt-1',
      titulo: 'Shader HLSL Dissolve com Fresnel URP',
      autorId: 'part-aluno-1',
      autorNome: 'Gabriel Santos',
      iaId: 'ai-3',
      iaNome: 'ChatGPT (GPT-4o)',
      jogoId: 'game-1',
      jogoNome: 'Chronos Realm: Procedural Dungeon',
      categoria: 'Shader',
      promptCompleto: 'Escreva um HLSL SubShader para Unity URP que realize efeito de dissolve baseado em textura de ruído e gradiente com Fresnel emitindo luz laranja nas bordas de corte. Declare propriedades _Cutoff e _EdgeColor.',
      parametrosSugeridos: 'Temperature: 0.2, Top-P: 0.95',
      resultadoEsperado: 'Shader HLSL compilável em Unity URP 2022+ com Fresnel customizado.',
      avaliacao: 5,
      observacoes: 'Excelente prompt reutilizável para efeitos de morte ou desmaterialização de itens.',
      createdAt: '2026-03-08T18:00:00.000Z',
    },
    {
      id: 'pmt-2',
      titulo: 'Árvore de Diálogo de Sentinela em JSON',
      autorId: 'part-aluno-2',
      autorNome: 'Juliana Lima',
      iaId: 'ai-2',
      iaNome: 'Claude 3.5 Sonnet',
      jogoId: 'game-2',
      jogoNome: 'Nexus Rogue: Echoes of Mind',
      categoria: 'Diálogos',
      promptCompleto: 'Você é um roteirista de jogos. Gere em formato JSON válido as falas de um guarda sentinela com nível de desconfiança alto. Inclua fala inicial, duas opções de resposta do jogador e a respectiva reação com tag emocional.',
      parametrosSugeridos: 'Temperature: 0.7',
      resultadoEsperado: 'JSON estruturado contendo nós de diálogo, escolhas e pesos emocionais.',
      avaliacao: 5,
      observacoes: 'Padrão estabelecido para todas as árvores de conversa dos sentinelas.',
      createdAt: '2026-03-05T11:30:00.000Z',
    },
    {
      id: 'pmt-3',
      titulo: 'Algoritmo de BSP Dungeon Room Generator',
      autorId: 'part-aluno-1',
      autorNome: 'Gabriel Santos',
      iaId: 'ai-1',
      iaNome: 'Gemini 1.5 Pro',
      jogoId: 'game-1',
      jogoNome: 'Chronos Realm: Procedural Dungeon',
      categoria: 'Mecânica',
      promptCompleto: 'Escreva um gerador de masmorra em C# para Unity usando Binary Space Partitioning (BSP). O código deve retornar uma lista de retângulos (salas) conectados por corredores ortogonais.',
      parametrosSugeridos: 'Temperature: 0.3',
      resultadoEsperado: 'Algoritmo em C# com estrutura de árvore recursiva.',
      avaliacao: 4,
      observacoes: 'Código muito limpo com documentação de cada método.',
      createdAt: '2026-03-02T17:00:00.000Z',
    },
  ];

  const tasks: Task[] = [
    {
      id: 'task-1',
      titulo: 'Implementar e testar algoritmo BSP gerado por IA',
      descricao: 'Integrar a classe gerada no experimento exp-1 ao gerador de cenários do Unity e validar performance de renderização.',
      responsavelId: 'part-aluno-1',
      responsavelNome: 'Gabriel Santos',
      equipeId: 'team-1',
      equipeNome: 'Equipe Alpha - Shaders & Procedural',
      jogoId: 'game-1',
      jogoNome: 'Chronos Realm: Procedural Dungeon',
      prioridade: 'Alta',
      status: 'Concluída',
      prazo: '2026-03-10',
      dataConclusao: '2026-03-09',
      observacoes: 'Testado com 50 salas em 60 FPS estáveis.',
      createdAt: '2026-02-25T10:00:00.000Z',
    },
    {
      id: 'task-2',
      titulo: 'Integrar shader de dissolve aos prefabs de monstros',
      descricao: 'Aplicar material com o shader gerado pela IA em 4 tipos de inimigos na cena de masmorra.',
      responsavelId: 'part-aluno-1',
      responsavelNome: 'Gabriel Santos',
      equipeId: 'team-1',
      equipeNome: 'Equipe Alpha - Shaders & Procedural',
      jogoId: 'game-1',
      jogoNome: 'Chronos Realm: Procedural Dungeon',
      prioridade: 'Média',
      status: 'Em andamento',
      prazo: '2026-03-25',
      observacoes: 'Material configurado, faltando animação de acionamento.',
      createdAt: '2026-03-09T09:00:00.000Z',
    },
    {
      id: 'task-3',
      titulo: 'Desenvolver parser de árvore de diálogos JSON em Godot',
      descricao: 'Criar script GDScript para importar o JSON do Claude e exibir no componente de caixa de diálogos.',
      responsavelId: 'part-aluno-2',
      responsavelNome: 'Juliana Lima',
      equipeId: 'team-2',
      equipeNome: 'Equipe Beta - Diálogos & NPCs',
      jogoId: 'game-2',
      jogoNome: 'Nexus Rogue: Echoes of Mind',
      prioridade: 'Alta',
      status: 'Concluída',
      prazo: '2026-03-15',
      dataConclusao: '2026-03-14',
      observacoes: 'Parser totalmente funcional.',
      createdAt: '2026-03-06T10:00:00.000Z',
    },
    {
      id: 'task-4',
      titulo: 'Elaborar matriz de avaliação comparativa das IAs',
      descricao: 'Definir critérios objetivos de precisão sintática, tempo de execução e esforço de ajuste manual para o artigo científico.',
      responsavelId: 'part-coord-1',
      responsavelNome: 'Lucas Mendes',
      equipeId: 'team-1',
      equipeNome: 'Equipe Alpha - Shaders & Procedural',
      prioridade: 'Crítica',
      status: 'Em andamento',
      prazo: '2026-04-05',
      observacoes: 'Reunião com Prof. Alexandre agendada para revisão.',
      createdAt: '2026-03-10T14:00:00.000Z',
    },
  ];

  const versions: GameVersion[] = [
    {
      id: 'ver-1',
      jogoId: 'game-1',
      jogoNome: 'Chronos Realm: Procedural Dungeon',
      numero: 'v0.1.0',
      data: '2026-02-28',
      responsavelId: 'part-coord-1',
      responsavelNome: 'Lucas Mendes',
      alteracoes: 'Estrutura inicial do projeto em Unity, movimentação básica do personagem e câmera ortogonal.',
      funcionalidadesAdicionadas: 'Controlador de jogador, sistema de colisões e cena de teste.',
      bugsCorrigidos: 'N/A',
      linkArquivo: 'https://github.com/pesquisa-jogos/chronos-realm/releases/tag/v0.1.0',
      observacoes: 'Versão de baseline para início dos testes com IA.',
      createdAt: '2026-02-28T18:00:00.000Z',
    },
    {
      id: 'ver-2',
      jogoId: 'game-1',
      jogoNome: 'Chronos Realm: Procedural Dungeon',
      numero: 'v0.2.1',
      data: '2026-03-10',
      responsavelId: 'part-aluno-1',
      responsavelNome: 'Gabriel Santos',
      alteracoes: 'Inclusão do algoritmo de geração procedural de masmorras BSP gerado com IA e shaders de dissolução.',
      funcionalidadesAdicionadas: 'Geração procedural de salas, conectividade por corredores e shader URP de dissolução.',
      bugsCorrigidos: 'Correção de sobreposição de salas e inclusão de include de iluminação URP.',
      linkArquivo: 'https://github.com/pesquisa-jogos/chronos-realm/releases/tag/v0.2.1',
      observacoes: 'Primeira versão experimental incorporando artefatos de IA.',
      createdAt: '2026-03-10T19:00:00.000Z',
    },
    {
      id: 'ver-3',
      jogoId: 'game-2',
      jogoNome: 'Nexus Rogue: Echoes of Mind',
      numero: 'v0.1.0',
      data: '2026-03-08',
      responsavelId: 'part-aluno-2',
      responsavelNome: 'Juliana Lima',
      alteracoes: 'Protótipo inicial em Godot 4 com motor de diálogo JSON.',
      funcionalidadesAdicionadas: 'Interface de conversação e suporte a respostas contextuais com IA.',
      bugsCorrigidos: 'N/A',
      linkArquivo: 'https://github.com/pesquisa-jogos/nexus-rogue/releases/tag/v0.1.0',
      observacoes: 'Protótipo para testes de imersão de diálogo.',
      createdAt: '2026-03-08T15:00:00.000Z',
    },
  ];

  const testSuites: TestSuite[] = [
    {
      id: 'test-1',
      nome: 'Bateria de Testes de Jogabilidade e Imersão de NPCs',
      jogoId: 'game-2',
      jogoNome: 'Nexus Rogue: Echoes of Mind',
      versaoTestada: 'v0.1.0',
      tipo: 'jogabilidade',
      objetivo: 'Avaliar a naturalidade dos diálogos gerados com apoio de LLMs e a ausência de quebras de imersão.',
      responsavelId: 'part-aluno-2',
      responsavelNome: 'Juliana Lima',
      dataInicial: '2026-03-11',
      dataFinal: '2026-03-13',
      participantesIds: ['part-coord-1', 'part-aluno-1'],
      criterios: ['Jogabilidade', 'Estabilidade', 'Aceitação da IA'],
      status: 'Concluído',
      observacoes: 'Dois avaliadores completaram o formulário empírico.',
      createdAt: '2026-03-11T09:00:00.000Z',
    },
    {
      id: 'test-2',
      nome: 'Avaliação de Desempenho e FPS dos Shaders URP',
      jogoId: 'game-1',
      jogoNome: 'Chronos Realm: Procedural Dungeon',
      versaoTestada: 'v0.2.1',
      tipo: 'desempenho',
      objetivo: 'Medir taxa de quadros e consumo de memória com 20 entidades simultâneas ativando o shader de dissolve.',
      responsavelId: 'part-aluno-1',
      responsavelNome: 'Gabriel Santos',
      dataInicial: '2026-03-14',
      criterios: ['Desempenho', 'Estabilidade', 'Qualidade Visual'],
      status: 'Em andamento',
      observacoes: 'Testes em hardware integrado e GPU dedicada.',
      createdAt: '2026-03-14T08:00:00.000Z',
    },
  ];

  const testEvaluations: TestEvaluation[] = [
    {
      id: 'eval-1',
      testeId: 'test-1',
      jogoId: 'game-2',
      participanteId: 'part-aluno-1',
      participanteNome: 'Gabriel Santos',
      data: '2026-03-12',
      notas: {
        Jogabilidade: 4,
        Estabilidade: 5,
        'Aceitação da IA': 5,
      },
      comentarios: 'Os diálogos soam muito naturais e fluem perfeitamente dentro do contexto do jogo.',
      problemas: 'A fonte da caixa de texto poderia ser ligeiramente maior para monitores ultrawide.',
      sugestoes: 'Adicionar efeito sonoro de digitação enquanto o texto surge.',
      createdAt: '2026-03-12T14:00:00.000Z',
    },
    {
      id: 'eval-2',
      testeId: 'test-1',
      jogoId: 'game-2',
      participanteId: 'part-coord-1',
      participanteNome: 'Lucas Mendes',
      data: '2026-03-13',
      notas: {
        Jogabilidade: 5,
        Estabilidade: 4,
        'Aceitação da IA': 4,
      },
      comentarios: 'Excelente coerência de vocabulário do sentinela mantendo fidelidade à ambientação medieval-fantástica.',
      problemas: 'Pequena pausa de 200ms na transição entre a fala do guarda e as opções de escolha.',
      sugestoes: 'Pré-carregar as opções de escolha em background.',
      createdAt: '2026-03-13T16:30:00.000Z',
    },
  ];

  const scheduleMilestones: ScheduleMilestone[] = [
    {
      id: 'milestone-1',
      faseMarco: 'Fase 1: Revisão Bibliográfica e Seleção de Modelos de IA',
      descricao: 'Levantamento do estado da arte de LLMs e difusão em jogos digitais, mapeando licenças e custos.',
      dataPrevista: '2026-03-15',
      dataRealizada: '2026-03-10',
      responsavelId: 'part-coord-1',
      responsavelNome: 'Lucas Mendes',
      status: 'Concluído',
      observacoes: 'Modelos selecionados: Gemini 1.5 Pro, Claude 3.5 Sonnet e GPT-4o.',
      createdAt: '2026-02-15T10:00:00.000Z',
    },
    {
      id: 'milestone-2',
      faseMarco: 'Fase 2: Prototipagem e Experimentos de Código e Shaders',
      descricao: 'Criação dos repositórios dos jogos e execução dos primeiros experimentos com geração de código.',
      dataPrevista: '2026-05-30',
      responsavelId: 'part-coord-1',
      responsavelNome: 'Lucas Mendes',
      status: 'Em andamento',
      observacoes: 'Experimentos em andamento em Unity e Godot.',
      createdAt: '2026-02-15T10:00:00.000Z',
    },
    {
      id: 'milestone-3',
      faseMarco: 'Fase 3: Bateria de Testes e Avaliação Empírica de Jogabilidade',
      descricao: 'Aplicação de testes de jogabilidade, aceitação da IA e estabilidade com voluntários da universidade.',
      dataPrevista: '2026-09-15',
      responsavelId: 'part-aluno-2',
      responsavelNome: 'Juliana Lima',
      status: 'Não iniciado',
      observacoes: 'Coleta de dados via formulário padronizado da plataforma.',
      createdAt: '2026-02-15T10:00:00.000Z',
    },
    {
      id: 'milestone-4',
      faseMarco: 'Fase 4: Análise Comparativa e Redação do Artigo de Pesquisa',
      descricao: 'Consolidação estatística dos dados empíricos e redação do relatório final de Sistemas de Informação.',
      dataPrevista: '2026-11-30',
      responsavelId: 'part-prof-1',
      responsavelNome: 'Prof. Dr. Alexandre Silva',
      status: 'Não iniciado',
      observacoes: 'Submissão prevista para congresso de computação gráfica e entretenimento.',
      createdAt: '2026-02-15T10:00:00.000Z',
    },
  ];

  const auditLogs: AuditLog[] = [
    {
      id: 'audit-init-1',
      usuarioId: 'part-coord-1',
      usuarioNome: 'Lucas Mendes',
      usuarioRole: 'coordenador_aluno',
      acao: 'Criação',
      registroAfetado: 'Projeto de Pesquisa',
      tipoEntidade: 'System',
      entidadeId: 'sys-0',
      data: '2026-02-15',
      horario: '09:00:00',
      alteracaoRealizada: 'Inicialização da plataforma de pesquisa acadêmica em desenvolvimento de jogos com Inteligência Artificial.',
      timestamp: new Date('2026-02-15T09:00:00.000Z').getTime(),
    },
    {
      id: 'audit-init-2',
      usuarioId: 'part-coord-1',
      usuarioNome: 'Lucas Mendes',
      usuarioRole: 'coordenador_aluno',
      acao: 'Criação',
      registroAfetado: 'Equipes Alpha e Beta',
      tipoEntidade: 'Team',
      entidadeId: 'team-1',
      data: '2026-02-20',
      horario: '10:00:00',
      alteracaoRealizada: 'Cadastro e alocação de participantes nas equipes de desenvolvimento.',
      timestamp: new Date('2026-02-20T10:00:00.000Z').getTime(),
    },
    {
      id: 'audit-init-3',
      usuarioId: 'part-aluno-1',
      usuarioNome: 'Gabriel Santos',
      usuarioRole: 'aluno',
      acao: 'Criação',
      registroAfetado: 'Experimento BSP Dungeon (exp-1)',
      tipoEntidade: 'Experiment',
      entidadeId: 'exp-1',
      data: '2026-03-02',
      horario: '16:30:00',
      alteracaoRealizada: 'Registro do primeiro experimento com Gemini 1.5 Pro para geração de masmorras.',
      timestamp: new Date('2026-03-02T16:30:00.000Z').getTime(),
    },
    {
      id: 'audit-init-4',
      usuarioId: 'part-aluno-2',
      usuarioNome: 'Juliana Lima',
      usuarioRole: 'aluno',
      acao: 'Criação',
      registroAfetado: 'Experimento Diálogo de Sentinela (exp-2)',
      tipoEntidade: 'Experiment',
      entidadeId: 'exp-2',
      data: '2026-03-05',
      horario: '11:00:00',
      alteracaoRealizada: 'Registro de experimento com Claude 3.5 Sonnet para narrativa interativa.',
      timestamp: new Date('2026-03-05T11:00:00.000Z').getTime(),
    },
  ];

  const systemVersions: SystemVersion[] = [
    {
      id: 'sys-v0.1.0',
      versao: 'v0.1.0',
      data: '2026-09-14',
      alteracao: 'Estrutura inicial da plataforma acadêmica de pesquisa em desenvolvimento de jogos com Inteligência Artificial.',
      responsavel: 'Lucas Mendes (Coordenador Aluno)',
    },
    {
      id: 'sys-v0.2.0',
      versao: 'v0.2.0',
      data: '2026-09-14',
      alteracao: 'Harmonização dos módulos de autenticação, avaliação empírica de testes, consolidação de dados e biblioteca de prompts.',
      responsavel: 'Lucas Mendes (Coordenador Aluno)',
    },
  ];

  return {
    participants,
    teams,
    games,
    ais,
    experiments,
    prompts,
    promptCategoryItems: INITIAL_PROMPT_CATEGORY_ITEMS,
    documents: INITIAL_DOCUMENTS,
    tasks,
    versions,
    testSuites,
    testEvaluations,
    scheduleMilestones,
    auditLogs,
    systemVersions,
    futureSuggestions: [],
    promptCategories: INITIAL_CATEGORIES,
  };
}

export class Database {
  private static instance: Database;
  private data: DatabaseSchema;

  private constructor() {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }

    const initialSourceFile = path.join(process.cwd(), 'data', 'database.json');
    if (!fs.existsSync(DB_FILE) && fs.existsSync(initialSourceFile)) {
      try {
        fs.copyFileSync(initialSourceFile, DB_FILE);
      } catch (copyErr) {
        console.warn('Could not copy initial database to DB_FILE:', copyErr);
      }
    }

    if (fs.existsSync(DB_FILE)) {
      try {
        const raw = fs.readFileSync(DB_FILE, 'utf-8');
        this.data = JSON.parse(raw);
        // Ensure all arrays exist
        const initial = getInitialDB();
        for (const key of Object.keys(initial) as (keyof DatabaseSchema)[]) {
          if (!this.data[key]) {
            (this.data as any)[key] = initial[key];
          }
        }
        if (!this.data.documents || this.data.documents.length === 0) {
          this.data.documents = INITIAL_DOCUMENTS;
        }
        if (!this.data.promptCategoryItems || this.data.promptCategoryItems.length === 0) {
          this.data.promptCategoryItems = INITIAL_PROMPT_CATEGORY_ITEMS;
        }
        // Auto-seed if participants array is empty
        if (this.data.participants.length === 0) {
          this.data = getInitialSeedData();
          this.save();
        }
      } catch (err) {
        console.error('Error reading database file, initializing seed database', err);
        this.data = getInitialSeedData();
        this.save();
      }
    } else {
      this.data = getInitialSeedData();
      this.save();
    }
  }

  public seedDefaultData(): void {
    this.data = getInitialSeedData();
    this.save();
  }

  public static getInstance(): Database {
    if (!Database.instance) {
      Database.instance = new Database();
    }
    return Database.instance;
  }

  public getData(): DatabaseSchema {
    return this.data;
  }

  public save(): void {
    try {
      fs.writeFileSync(DB_FILE, JSON.stringify(this.data, null, 2), 'utf-8');
    } catch (err) {
      console.error('Failed to persist database file', err);
    }
  }

  // Audit Logging
  public logAudit(
    usuario: { id: string; nome: string; role: UserRole },
    acao: string,
    registroAfetado: string,
    tipoEntidade: string,
    entidadeId: string,
    alteracaoRealizada: string,
    moduloAfetado?: string,
    detalhes?: { campoAlterado?: string; valorAnterior?: string; novoValor?: string; descricaoCurta?: string }
  ): AuditLog {
    const now = new Date();
    const log: AuditLog = {
      id: `audit-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      usuarioId: usuario.id,
      usuarioNome: usuario.nome,
      usuarioRole: usuario.role,
      acao,
      registroAfetado,
      tipoEntidade,
      entidadeId,
      moduloAfetado: moduloAfetado || (tipoEntidade === 'Task' ? 'Tarefas' : tipoEntidade === 'Game' ? 'Jogos' : tipoEntidade),
      detalhes,
      data: now.toISOString().split('T')[0],
      horario: now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      alteracaoRealizada,
      timestamp: now.getTime(),
    };
    this.data.auditLogs.unshift(log);
    this.save();
    return log;
  }

  // Global Logger specifically for Tarefas and Jogos changes
  public logGlobalChange(
    usuario: { id: string; nome: string; role: UserRole },
    modulo: 'Tarefas' | 'Jogos',
    acao: 'Criação' | 'Atualização' | 'Mudança de Status' | 'Exclusão',
    registroAfetado: string,
    entidadeId: string,
    alteracaoRealizada: string,
    detalhes?: { campoAlterado?: string; valorAnterior?: string; novoValor?: string; descricaoCurta?: string }
  ): AuditLog {
    const tipoEntidade = modulo === 'Tarefas' ? 'Task' : 'Game';
    return this.logAudit(
      usuario,
      acao,
      registroAfetado,
      tipoEntidade,
      entidadeId,
      alteracaoRealizada,
      modulo,
      detalhes
    );
  }
}

export const db = Database.getInstance();
