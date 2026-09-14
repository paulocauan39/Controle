import express, { Request, Response } from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { db } from './server/db.js';
import { authMiddleware, requireRoles, AuthenticatedRequest, getRoleLabel } from './server/auth.js';
import {
  UserRole,
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
  FutureSuggestion,
  SystemVersion,
} from './src/types.js';

const app = express();
const PORT = 3000;

app.use(express.json());

// Request logger for debugging & trace
app.use((req, res, next) => {
  next();
});

// ==================== AUTH & SETUP ROUTES ====================

app.get('/api/auth/status', (req: Request, res: Response) => {
  const data = db.getData();
  const currentUserId = req.headers['x-user-id'] as string;
  let currentUser = null;
  if (currentUserId) {
    currentUser = data.participants.find(p => p.id === currentUserId) || null;
  }
  res.json({
    initialized: data.participants.length > 0,
    totalParticipants: data.participants.length,
    currentUser,
  });
});

app.get('/api/auth/users', (req: Request, res: Response) => {
  const data = db.getData();
  const activeParticipants = data.participants.map(p => ({
    id: p.id,
    nome: p.nome,
    email: p.email,
    funcao: p.funcao,
    equipeId: p.equipeId,
    equipeNome: p.equipeNome,
    status: p.status,
  }));
  res.json(activeParticipants);
});

app.post('/api/setup/initial-user', (req: Request, res: Response) => {
  const data = db.getData();
  if (data.participants.length > 0) {
    return res.status(400).json({ error: 'O sistema já possui participantes cadastrados.' });
  }

  const { nome, email, funcao, dataEntrada } = req.body;
  if (!nome || !email) {
    return res.status(400).json({ error: 'Nome e e-mail são obrigatórios.' });
  }

  const newParticipant: Participant = {
    id: `part-${Date.now()}`,
    nome: nome.trim(),
    email: email.trim(),
    funcao: funcao || 'coordenador_aluno',
    status: 'Ativo',
    dataEntrada: dataEntrada || new Date().toISOString().split('T')[0],
    createdAt: new Date().toISOString(),
  };

  data.participants.push(newParticipant);
  db.save();

  db.logAudit(
    { id: newParticipant.id, nome: newParticipant.nome, role: newParticipant.funcao },
    'Criação',
    `Usuário Inicial: ${newParticipant.nome}`,
    'Participant',
    newParticipant.id,
    'Configuração inicial do sistema e cadastro do primeiro usuário coordenador.'
  );

  res.status(201).json(newParticipant);
});

app.post('/api/setup/seed', (req: Request, res: Response) => {
  db.seedDefaultData();
  const data = db.getData();
  const coordinator = data.participants.find(p => p.funcao === 'coordenador_aluno') || data.participants[0];
  res.json({ message: 'Dados de demonstração carregados com sucesso.', coordinator });
});

// Authentication System (Login, Register, Logout)
app.post('/api/auth/register', (req: Request, res: Response) => {
  const data = db.getData();
  const { nome, email, funcao, equipeId, dataEntrada } = req.body;

  if (!nome || !email) {
    return res.status(400).json({ error: 'Nome e e-mail são obrigatórios para o cadastro.' });
  }

  const emailTrim = email.trim().toLowerCase();
  const existing = data.participants.find(p => p.email.toLowerCase() === emailTrim);
  if (existing) {
    return res.status(400).json({ error: 'Já existe um participante cadastrado com este e-mail.' });
  }

  const team = equipeId ? data.teams.find(t => t.id === equipeId) : undefined;

  const newParticipant: Participant = {
    id: `part-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    nome: nome.trim(),
    email: emailTrim,
    funcao: funcao || 'aluno',
    equipeId: equipeId || undefined,
    equipeNome: team ? team.nome : undefined,
    status: 'Ativo',
    dataEntrada: dataEntrada || new Date().toISOString().split('T')[0],
    createdAt: new Date().toISOString(),
  };

  data.participants.push(newParticipant);

  // If team was selected, link participant to team
  if (team && !team.participantesIds.includes(newParticipant.id)) {
    team.participantesIds.push(newParticipant.id);
  }

  db.save();

  db.logAudit(
    { id: newParticipant.id, nome: newParticipant.nome, role: newParticipant.funcao },
    'Criação',
    `Cadastro de Usuário: ${newParticipant.nome}`,
    'Participant',
    newParticipant.id,
    `Usuário auto-cadastrado com perfil ${getRoleLabel(newParticipant.funcao)}.`
  );

  res.status(201).json(newParticipant);
});

app.post('/api/auth/login', (req: Request, res: Response) => {
  const data = db.getData();
  const { email, userId } = req.body;

  let participant = null;
  if (userId) {
    participant = data.participants.find(p => p.id === userId);
  } else if (email) {
    participant = data.participants.find(p => p.email.toLowerCase() === email.trim().toLowerCase());
  }

  if (!participant) {
    return res.status(404).json({ error: 'Usuário não encontrado com as credenciais informadas.' });
  }

  if (participant.status === 'Inativo') {
    return res.status(403).json({ error: 'Conta de participante inativa. Contate o Coordenador Aluno.' });
  }

  res.json({
    message: 'Login realizado com sucesso.',
    user: participant,
  });
});

app.post('/api/auth/google', (req: Request, res: Response) => {
  const data = db.getData();
  const { email, displayName, photoURL, uid } = req.body;

  if (!email) {
    return res.status(400).json({ error: 'Email do Google não fornecido.' });
  }

  const emailTrim = email.trim().toLowerCase();
  let participant = data.participants.find(p => p.email.toLowerCase() === emailTrim);

  if (!participant) {
    // Se o usuário ainda não existe, cadastrá-lo automaticamente
    const isFirst = data.participants.length === 0;
    const defaultFuncao: UserRole = isFirst ? 'coordenador_aluno' : 'aluno';

    participant = {
      id: `part-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      nome: displayName?.trim() || emailTrim.split('@')[0],
      email: emailTrim,
      funcao: defaultFuncao,
      status: 'Ativo',
      dataEntrada: new Date().toISOString().split('T')[0],
      createdAt: new Date().toISOString(),
    };

    data.participants.push(participant);
    db.save();

    db.logAudit(
      { id: participant.id, nome: participant.nome, role: participant.funcao },
      'Criação',
      `Cadastro Google: ${participant.nome}`,
      'Participant',
      participant.id,
      `Usuário autenticado via Firebase Auth com Google (${getRoleLabel(participant.funcao)}).`
    );
  }

  if (participant.status === 'Inativo') {
    return res.status(403).json({ error: 'Conta de participante inativa. Contate o Coordenador Aluno.' });
  }

  res.json({
    message: 'Login com Google realizado com sucesso.',
    user: participant,
  });
});

app.post('/api/auth/logout', (req: Request, res: Response) => {
  res.json({ success: true, message: 'Logout efetuado com sucesso.' });
});

// Protect all following /api/* routes with authMiddleware
app.use('/api', authMiddleware as any);

// ==================== DASHBOARD ROUTE ====================

app.get('/api/dashboard', (req: AuthenticatedRequest, res: Response) => {
  const data = db.getData();

  const totalTasks = data.tasks.length;
  const completedTasks = data.tasks.filter(t => t.status === 'Concluída').length;
  const progressoGeral = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  // Próximas atividades: tarefas não concluídas ordenadas por prazo
  const proximasAtividades = data.tasks
    .filter(t => t.status !== 'Concluída' && t.status !== 'Cancelada')
    .sort((a, b) => (a.prazo > b.prazo ? 1 : -1))
    .slice(0, 5);

  // Últimas atividades: auditoria
  const ultimasAtividades = data.auditLogs.slice(0, 10);

  res.json({
    progressoGeralPercentual: progressoGeral,
    qtdJogos: data.games.length,
    qtdParticipantes: data.participants.filter(p => p.status === 'Ativo').length,
    qtdEquipes: data.teams.filter(t => t.status === 'Ativa').length,
    tarefasPendentes: data.tasks.filter(t => t.status === 'A fazer').length,
    tarefasEmAndamento: data.tasks.filter(t => t.status === 'Em andamento' || t.status === 'Em revisão').length,
    tarefasConcluidas: completedTasks,
    testesEmAndamento: data.testSuites.filter(t => t.status === 'Em andamento').length,
    testesConcluidos: data.testSuites.filter(t => t.status === 'Concluído').length,
    proximasAtividades,
    ultimasAtividades,
  });
});

// ==================== PARTICIPANTS ROUTES ====================

app.get('/api/participants', (req: AuthenticatedRequest, res: Response) => {
  // Professor Colaborador can view according to hierarchy or Coordenador/Orientador
  const data = db.getData();
  res.json(data.participants);
});

app.post('/api/participants', requireRoles('coordenador_aluno'), (req: AuthenticatedRequest, res: Response) => {
  const data = db.getData();
  const { nome, email, funcao, equipeId, status, dataEntrada } = req.body;

  if (!nome || !email || !funcao) {
    return res.status(400).json({ error: 'Nome, e-mail e função são obrigatórios.' });
  }

  const existing = data.participants.find(p => p.email.toLowerCase() === email.toLowerCase());
  if (existing) {
    return res.status(400).json({ error: 'Já existe um participante com este e-mail.' });
  }

  let equipeNome = undefined;
  if (equipeId) {
    const equipe = data.teams.find(t => t.id === equipeId);
    if (equipe) equipeNome = equipe.nome;
  }

  const newPart: Participant = {
    id: `part-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    nome: nome.trim(),
    email: email.trim(),
    funcao,
    equipeId: equipeId || undefined,
    equipeNome,
    status: status || 'Ativo',
    dataEntrada: dataEntrada || new Date().toISOString().split('T')[0],
    createdAt: new Date().toISOString(),
  };

  data.participants.push(newPart);

  // If assigned to team, update team's member array
  if (newPart.equipeId) {
    const team = data.teams.find(t => t.id === newPart.equipeId);
    if (team && !team.participantesIds.includes(newPart.id)) {
      team.participantesIds.push(newPart.id);
    }
  }

  db.save();

  db.logAudit(
    req.user!,
    'Criação',
    `Participante: ${newPart.nome} (${getRoleLabel(newPart.funcao)})`,
    'Participant',
    newPart.id,
    `Cadastrado participante com e-mail ${newPart.email}`
  );

  res.status(201).json(newPart);
});

app.put('/api/participants/:id', requireRoles('coordenador_aluno'), (req: AuthenticatedRequest, res: Response) => {
  const data = db.getData();
  const index = data.participants.findIndex(p => p.id === req.params.id);
  if (index === -1) {
    return res.status(404).json({ error: 'Participante não encontrado.' });
  }

  const current = data.participants[index];
  const { nome, email, funcao, equipeId, status, dataEntrada } = req.body;

  let equipeNome = undefined;
  if (equipeId) {
    const equipe = data.teams.find(t => t.id === equipeId);
    if (equipe) equipeNome = equipe.nome;
  }

  const updated: Participant = {
    ...current,
    nome: nome !== undefined ? nome.trim() : current.nome,
    email: email !== undefined ? email.trim() : current.email,
    funcao: funcao || current.funcao,
    equipeId: equipeId !== undefined ? equipeId : current.equipeId,
    equipeNome: equipeNome !== undefined ? equipeNome : current.equipeNome,
    status: status || current.status,
    dataEntrada: dataEntrada || current.dataEntrada,
  };

  data.participants[index] = updated;

  // Sync team memberships
  data.teams.forEach(t => {
    if (t.id === updated.equipeId) {
      if (!t.participantesIds.includes(updated.id)) t.participantesIds.push(updated.id);
    } else {
      t.participantesIds = t.participantesIds.filter(id => id !== updated.id);
    }
  });

  db.save();

  db.logAudit(
    req.user!,
    'Atualização',
    `Participante: ${updated.nome}`,
    'Participant',
    updated.id,
    'Atualização de dados cadastrais do participante.'
  );

  res.json(updated);
});

// Rule 8: Não excluir permanentemente um participante que possua histórico relevante.
app.patch('/api/participants/:id/deactivate', requireRoles('coordenador_aluno'), (req: AuthenticatedRequest, res: Response) => {
  const data = db.getData();
  const participant = data.participants.find(p => p.id === req.params.id);
  if (!participant) {
    return res.status(404).json({ error: 'Participante não encontrado.' });
  }

  participant.status = 'Inativo';
  db.save();

  db.logAudit(
    req.user!,
    'Desativação',
    `Participante: ${participant.nome}`,
    'Participant',
    participant.id,
    'Participante marcado como Inativo no projeto.'
  );

  res.json(participant);
});

// ==================== TEAMS ROUTES ====================

app.get('/api/teams', (req: AuthenticatedRequest, res: Response) => {
  const data = db.getData();
  res.json(data.teams);
});

app.post('/api/teams', requireRoles('coordenador_aluno'), (req: AuthenticatedRequest, res: Response) => {
  const data = db.getData();
  const { nome, descricao, responsavelId, participantesIds, areaAtuacao, status } = req.body;

  if (!nome || !responsavelId) {
    return res.status(400).json({ error: 'Nome e responsável são obrigatórios para cadastrar uma equipe.' });
  }

  const resp = data.participants.find(p => p.id === responsavelId);
  const responsavelNome = resp ? resp.nome : 'Não especificado';

  const newTeam: Team = {
    id: `team-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    nome: nome.trim(),
    descricao: (descricao || '').trim(),
    responsavelId,
    responsavelNome,
    participantesIds: participantesIds || [],
    areaAtuacao: (areaAtuacao || '').trim(),
    status: status || 'Ativa',
    createdAt: new Date().toISOString(),
  };

  data.teams.push(newTeam);

  // Update participant's team references
  if (newTeam.participantesIds && newTeam.participantesIds.length > 0) {
    newTeam.participantesIds.forEach(pId => {
      const p = data.participants.find(part => part.id === pId);
      if (p) {
        p.equipeId = newTeam.id;
        p.equipeNome = newTeam.nome;
      }
    });
  }

  db.save();

  db.logAudit(
    req.user!,
    'Criação',
    `Equipe: ${newTeam.nome}`,
    'Team',
    newTeam.id,
    `Cadastro de nova equipe na área de ${newTeam.areaAtuacao || 'Geral'}`
  );

  res.status(201).json(newTeam);
});

app.put('/api/teams/:id', requireRoles('coordenador_aluno'), (req: AuthenticatedRequest, res: Response) => {
  const data = db.getData();
  const index = data.teams.findIndex(t => t.id === req.params.id);
  if (index === -1) {
    return res.status(404).json({ error: 'Equipe não encontrada.' });
  }

  const current = data.teams[index];
  const { nome, descricao, responsavelId, participantesIds, areaAtuacao, status } = req.body;

  let responsavelNome = current.responsavelNome;
  if (responsavelId) {
    const resp = data.participants.find(p => p.id === responsavelId);
    if (resp) responsavelNome = resp.nome;
  }

  const updated: Team = {
    ...current,
    nome: nome !== undefined ? nome.trim() : current.nome,
    descricao: descricao !== undefined ? descricao.trim() : current.descricao,
    responsavelId: responsavelId || current.responsavelId,
    responsavelNome,
    participantesIds: participantesIds || current.participantesIds,
    areaAtuacao: areaAtuacao !== undefined ? areaAtuacao.trim() : current.areaAtuacao,
    status: status || current.status,
  };

  data.teams[index] = updated;

  // Update participant backreferences
  data.participants.forEach(p => {
    if (updated.participantesIds.includes(p.id)) {
      p.equipeId = updated.id;
      p.equipeNome = updated.nome;
    } else if (p.equipeId === updated.id) {
      p.equipeId = undefined;
      p.equipeNome = undefined;
    }
  });

  db.save();

  db.logAudit(
    req.user!,
    'Atualização',
    `Equipe: ${updated.nome}`,
    'Team',
    updated.id,
    'Atualização dos dados da equipe.'
  );

  res.json(updated);
});

app.delete('/api/teams/:id', requireRoles('coordenador_aluno'), (req: AuthenticatedRequest, res: Response) => {
  const data = db.getData();
  const team = data.teams.find(t => t.id === req.params.id);
  if (!team) {
    return res.status(404).json({ error: 'Equipe não encontrada.' });
  }

  // Prevent orphaned records
  const linkedGames = data.games.filter(g => g.equipeId === team.id);
  if (linkedGames.length > 0) {
    return res.status(400).json({
      error: `Não é possível remover a equipe pois ela está vinculada ao(s) jogo(s): ${linkedGames.map(g => g.nome).join(', ')}.`,
    });
  }

  data.teams = data.teams.filter(t => t.id !== team.id);
  // Clear from participants
  data.participants.forEach(p => {
    if (p.equipeId === team.id) {
      p.equipeId = undefined;
      p.equipeNome = undefined;
    }
  });

  db.save();

  db.logAudit(
    req.user!,
    'Exclusão',
    `Equipe: ${team.nome}`,
    'Team',
    team.id,
    'Exclusão da equipe do sistema.'
  );

  res.json({ success: true, message: 'Equipe removida com sucesso.' });
});

// ==================== GAMES ROUTES ====================

app.get('/api/games', (req: AuthenticatedRequest, res: Response) => {
  const data = db.getData();
  res.json(data.games);
});

app.get('/api/games/:id', (req: AuthenticatedRequest, res: Response) => {
  const data = db.getData();
  const game = data.games.find(g => g.id === req.params.id);
  if (!game) {
    return res.status(404).json({ error: 'Jogo não encontrado.' });
  }
  res.json(game);
});

app.get('/api/games/:id/details', (req: AuthenticatedRequest, res: Response) => {
  const data = db.getData();
  const game = data.games.find(g => g.id === req.params.id);
  if (!game) {
    return res.status(404).json({ error: 'Jogo não encontrado.' });
  }

  const team = data.teams.find(t => t.id === game.equipeId) || null;
  const participants = data.participants.filter(p => game.participantesIds.includes(p.id));
  const tasks = data.tasks.filter(t => t.jogoId === game.id);
  const versions = data.versions.filter(v => v.jogoId === game.id).sort((a, b) => (a.data > b.data ? -1 : 1));
  const experiments = data.experiments.filter(e => e.jogoId === game.id).sort((a, b) => (a.data > b.data ? -1 : 1));
  const prompts = data.prompts.filter(p => p.jogoId === game.id);
  const testSuites = data.testSuites.filter(t => t.jogoId === game.id);
  const evaluations = data.testEvaluations.filter(ev => ev.jogoId === game.id);
  const auditHistory = data.auditLogs.filter(a => a.entidadeId === game.id || a.registroAfetado.includes(game.nome));

  // Extract unique AIs used in experiments of this game
  const aiIds = Array.from(new Set(experiments.map(e => e.iaId)));
  const aisUsed = data.ais.filter(a => aiIds.includes(a.id));

  res.json({
    game,
    team,
    participants,
    tasks,
    versions,
    aisUsed,
    experiments,
    prompts,
    testSuites,
    evaluations,
    auditHistory,
  });
});

app.post('/api/games', requireRoles('coordenador_aluno'), (req: AuthenticatedRequest, res: Response) => {
  const data = db.getData();
  const {
    nome,
    descricao,
    objetivo,
    equipeId,
    participantesIds,
    tecnologiaUtilizada,
    versaoAtual,
    status,
    dataInicio,
    previsaoConclusao,
    linkProjeto,
    observacoes,
  } = req.body;

  if (!nome || !equipeId) {
    return res.status(400).json({ error: 'Nome do jogo e equipe responsável são obrigatórios.' });
  }

  const team = data.teams.find(t => t.id === equipeId);
  const equipeNome = team ? team.nome : undefined;

  const newGame: Game = {
    id: `game-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    nome: nome.trim(),
    descricao: (descricao || '').trim(),
    objetivo: (objetivo || '').trim(),
    equipeId,
    equipeNome,
    participantesIds: participantesIds || (team ? team.participantesIds : []),
    tecnologiaUtilizada: (tecnologiaUtilizada || '').trim(),
    versaoAtual: (versaoAtual || 'v0.1').trim(),
    status: status || 'Planejamento',
    dataInicio: dataInicio || new Date().toISOString().split('T')[0],
    previsaoConclusao: previsaoConclusao || '',
    linkProjeto: (linkProjeto || '').trim(),
    observacoes: (observacoes || '').trim(),
    createdAt: new Date().toISOString(),
  };

  data.games.push(newGame);
  db.save();

  db.logGlobalChange(
    req.user!,
    'Jogos',
    'Criação',
    `Jogo: ${newGame.nome}`,
    newGame.id,
    `Jogo "${newGame.nome}" cadastrado na equipe ${equipeNome || 'Geral'}. Status inicial: ${newGame.status}`,
    {
      campoAlterado: 'novo_registro',
      novoValor: newGame.nome,
      descricaoCurta: `Criado jogo "${newGame.nome}" (Status: ${newGame.status}, Versão: ${newGame.versaoAtual})`,
    }
  );

  res.status(201).json(newGame);
});

app.put('/api/games/:id', requireRoles('coordenador_aluno'), (req: AuthenticatedRequest, res: Response) => {
  const data = db.getData();
  const index = data.games.findIndex(g => g.id === req.params.id);
  if (index === -1) {
    return res.status(404).json({ error: 'Jogo não encontrado.' });
  }

  const current = data.games[index];
  const {
    nome,
    descricao,
    objetivo,
    equipeId,
    participantesIds,
    tecnologiaUtilizada,
    versaoAtual,
    status,
    dataInicio,
    previsaoConclusao,
    linkProjeto,
    observacoes,
  } = req.body;

  let equipeNome = current.equipeNome;
  if (equipeId) {
    const t = data.teams.find(team => team.id === equipeId);
    if (t) equipeNome = t.nome;
  }

  const statusChanged = status && status !== current.status;
  const oldStatus = current.status;

  const updated: Game = {
    ...current,
    nome: nome !== undefined ? nome.trim() : current.nome,
    descricao: descricao !== undefined ? descricao.trim() : current.descricao,
    objetivo: objetivo !== undefined ? objetivo.trim() : current.objetivo,
    equipeId: equipeId || current.equipeId,
    equipeNome,
    participantesIds: participantesIds || current.participantesIds,
    tecnologiaUtilizada: tecnologiaUtilizada !== undefined ? tecnologiaUtilizada.trim() : current.tecnologiaUtilizada,
    versaoAtual: versaoAtual !== undefined ? versaoAtual.trim() : current.versaoAtual,
    status: status || current.status,
    dataInicio: dataInicio || current.dataInicio,
    previsaoConclusao: previsaoConclusao !== undefined ? previsaoConclusao : current.previsaoConclusao,
    linkProjeto: linkProjeto !== undefined ? linkProjeto.trim() : current.linkProjeto,
    observacoes: observacoes !== undefined ? observacoes.trim() : current.observacoes,
  };

  data.games[index] = updated;
  db.save();

  db.logGlobalChange(
    req.user!,
    'Jogos',
    statusChanged ? 'Mudança de Status' : 'Atualização',
    `Jogo: ${updated.nome}`,
    updated.id,
    statusChanged
      ? `Status alterado de "${oldStatus}" para "${updated.status}". Versão atual: ${updated.versaoAtual}`
      : `Dados do jogo atualizados. Versão: ${updated.versaoAtual}, Tecnologia: ${updated.tecnologiaUtilizada}`,
    {
      campoAlterado: statusChanged ? 'status' : 'dados_jogo',
      valorAnterior: statusChanged ? oldStatus : undefined,
      novoValor: statusChanged ? updated.status : updated.versaoAtual,
      descricaoCurta: `Jogo "${updated.nome}" - Status: ${updated.status} (v${updated.versaoAtual})`,
    }
  );

  res.json(updated);
});

app.delete('/api/games/:id', requireRoles('coordenador_aluno'), (req: AuthenticatedRequest, res: Response) => {
  const data = db.getData();
  const game = data.games.find(g => g.id === req.params.id);
  if (!game) {
    return res.status(404).json({ error: 'Jogo não encontrado.' });
  }

  // Prevent orphaned data check
  const hasExperiments = data.experiments.some(e => e.jogoId === game.id);
  const hasTests = data.testSuites.some(t => t.jogoId === game.id);
  if (hasExperiments || hasTests) {
    return res.status(400).json({
      error: 'Não é recomendado excluir jogos que já possuem experimentos ou testes associados. Altere o status para "Arquivado".',
    });
  }

  data.games = data.games.filter(g => g.id !== game.id);
  db.save();

  db.logGlobalChange(
    req.user!,
    'Jogos',
    'Exclusão',
    `Jogo: ${game.nome}`,
    game.id,
    `Jogo "${game.nome}" removido do sistema pelo Coordenador Aluno.`,
    {
      campoAlterado: 'exclusao',
      valorAnterior: game.nome,
      descricaoCurta: `Exclusão do jogo "${game.nome}"`,
    }
  );

  res.json({ success: true, message: 'Jogo removido com sucesso.' });
});

// ==================== ARTIFICIAL INTELLIGENCES (IAs) ROUTES ====================

app.get('/api/ais', (req: AuthenticatedRequest, res: Response) => {
  const data = db.getData();
  res.json(data.ais);
});

app.post('/api/ais', (req: AuthenticatedRequest, res: Response) => {
  const data = db.getData();
  const { nome, empresaProvedor, modelo, versao, finalidade, observacoes, linkOficial } = req.body;

  if (!nome || !modelo) {
    return res.status(400).json({ error: 'Nome e modelo da IA são obrigatórios.' });
  }

  const newAI: AIModel = {
    id: `ai-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    nome: nome.trim(),
    empresaProvedor: (empresaProvedor || '').trim(),
    modelo: modelo.trim(),
    versao: (versao || '').trim(),
    finalidade: (finalidade || '').trim(),
    observacoes: (observacoes || '').trim(),
    linkOficial: (linkOficial || '').trim(),
    createdAt: new Date().toISOString(),
  };

  data.ais.push(newAI);
  db.save();

  db.logAudit(
    req.user!,
    'Criação',
    `IA: ${newAI.nome} (${newAI.modelo})`,
    'AIModel',
    newAI.id,
    `Registro de modelo de IA da empresa ${newAI.empresaProvedor || 'Não especificada'}`
  );

  res.status(201).json(newAI);
});

app.put('/api/ais/:id', requireRoles('coordenador_aluno'), (req: AuthenticatedRequest, res: Response) => {
  const data = db.getData();
  const index = data.ais.findIndex(a => a.id === req.params.id);
  if (index === -1) {
    return res.status(404).json({ error: 'IA não encontrada.' });
  }

  const current = data.ais[index];
  const { nome, empresaProvedor, modelo, versao, finalidade, observacoes, linkOficial } = req.body;

  const updated: AIModel = {
    ...current,
    nome: nome !== undefined ? nome.trim() : current.nome,
    empresaProvedor: empresaProvedor !== undefined ? empresaProvedor.trim() : current.empresaProvedor,
    modelo: modelo !== undefined ? modelo.trim() : current.modelo,
    versao: versao !== undefined ? versao.trim() : current.versao,
    finalidade: finalidade !== undefined ? finalidade.trim() : current.finalidade,
    observacoes: observacoes !== undefined ? observacoes.trim() : current.observacoes,
    linkOficial: linkOficial !== undefined ? linkOficial.trim() : current.linkOficial,
  };

  data.ais[index] = updated;
  db.save();

  db.logAudit(
    req.user!,
    'Atualização',
    `IA: ${updated.nome}`,
    'AIModel',
    updated.id,
    'Atualização dos dados do modelo de IA.'
  );

  res.json(updated);
});

app.delete('/api/ais/:id', requireRoles('coordenador_aluno'), (req: AuthenticatedRequest, res: Response) => {
  const data = db.getData();
  const ai = data.ais.find(a => a.id === req.params.id);
  if (!ai) {
    return res.status(404).json({ error: 'IA não encontrada.' });
  }

  const hasExp = data.experiments.some(e => e.iaId === ai.id);
  if (hasExp) {
    return res.status(400).json({ error: 'Não é possível remover esta IA pois há experimentos acadêmicos vinculados a ela.' });
  }

  data.ais = data.ais.filter(a => a.id !== ai.id);
  db.save();

  db.logAudit(
    req.user!,
    'Exclusão',
    `IA: ${ai.nome}`,
    'AIModel',
    ai.id,
    'Remoção do catálogo de IAs.'
  );

  res.json({ success: true });
});

// ==================== EXPERIMENTS WITH AI ROUTES ====================
// Tracking process: IA -> Prompt -> Resultado -> Alterações humanas -> Resultado final -> Avaliação

app.get('/api/experiments', (req: AuthenticatedRequest, res: Response) => {
  const data = db.getData();
  res.json(data.experiments);
});

app.post('/api/experiments', (req: AuthenticatedRequest, res: Response) => {
  const data = db.getData();
  const {
    jogoId,
    alunoResponsavelId,
    iaId,
    modelo,
    data: expData,
    finalidade,
    tarefaRealizada,
    prompt,
    resultadoObtido,
    alteracoesManuais,
    problemasEncontrados,
    tempoAproximadoMinutos,
    avaliacao,
    resultadoFinal,
    observacoes,
  } = req.body;

  if (!jogoId || !iaId || !prompt || !resultadoObtido) {
    return res.status(400).json({ error: 'Jogo, IA, Prompt e Resultado Obtido são obrigatórios.' });
  }

  const game = data.games.find(g => g.id === jogoId);
  const ai = data.ais.find(a => a.id === iaId);
  const student = data.participants.find(p => p.id === (alunoResponsavelId || req.user?.id));

  const newExp: Experiment = {
    id: `exp-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    jogoId,
    jogoNome: game ? game.nome : undefined,
    alunoResponsavelId: student ? student.id : req.user!.id,
    alunoResponsavelNome: student ? student.nome : req.user!.nome,
    iaId,
    iaNome: ai ? ai.nome : undefined,
    modelo: modelo || (ai ? ai.modelo : 'Não especificado'),
    data: expData || new Date().toISOString().split('T')[0],
    finalidade: (finalidade || '').trim(),
    tarefaRealizada: (tarefaRealizada || '').trim(),
    prompt: (prompt || '').trim(),
    resultadoObtido: (resultadoObtido || '').trim(),
    alteracoesManuais: (alteracoesManuais || '').trim(),
    problemasEncontrados: (problemasEncontrados || '').trim(),
    tempoAproximadoMinutos: Number(tempoAproximadoMinutos) || 0,
    avaliacao: Math.min(5, Math.max(1, Number(avaliacao) || 3)),
    resultadoFinal: (resultadoFinal || '').trim(),
    observacoes: (observacoes || '').trim(),
    createdAt: new Date().toISOString(),
  };

  data.experiments.push(newExp);
  db.save();

  db.logAudit(
    req.user!,
    'Registro de Experimento',
    `Experimento no jogo ${game ? game.nome : 'Jogo'} com IA ${ai ? ai.nome : 'IA'}`,
    'Experiment',
    newExp.id,
    `Finalidade: ${newExp.finalidade}. Avaliação: ${newExp.avaliacao}/5`
  );

  res.status(201).json(newExp);
});

app.put('/api/experiments/:id', (req: AuthenticatedRequest, res: Response) => {
  const data = db.getData();
  const index = data.experiments.findIndex(e => e.id === req.params.id);
  if (index === -1) {
    return res.status(404).json({ error: 'Experimento não encontrado.' });
  }

  const current = data.experiments[index];
  // Students can edit their own experiments; coordinators can edit any
  if (req.user?.role === 'aluno' && current.alunoResponsavelId !== req.user.id) {
    return res.status(403).json({ error: 'Você só pode alterar experimentos registrados por você.' });
  }

  const {
    finalidade,
    tarefaRealizada,
    prompt,
    resultadoObtido,
    alteracoesManuais,
    problemasEncontrados,
    tempoAproximadoMinutos,
    avaliacao,
    resultadoFinal,
    observacoes,
  } = req.body;

  const updated: Experiment = {
    ...current,
    finalidade: finalidade !== undefined ? finalidade.trim() : current.finalidade,
    tarefaRealizada: tarefaRealizada !== undefined ? tarefaRealizada.trim() : current.tarefaRealizada,
    prompt: prompt !== undefined ? prompt.trim() : current.prompt,
    resultadoObtido: resultadoObtido !== undefined ? resultadoObtido.trim() : current.resultadoObtido,
    alteracoesManuais: alteracoesManuais !== undefined ? alteracoesManuais.trim() : current.alteracoesManuais,
    problemasEncontrados: problemasEncontrados !== undefined ? problemasEncontrados.trim() : current.problemasEncontrados,
    tempoAproximadoMinutos: tempoAproximadoMinutos !== undefined ? Number(tempoAproximadoMinutos) : current.tempoAproximadoMinutos,
    avaliacao: avaliacao !== undefined ? Math.min(5, Math.max(1, Number(avaliacao))) : current.avaliacao,
    resultadoFinal: resultadoFinal !== undefined ? resultadoFinal.trim() : current.resultadoFinal,
    observacoes: observacoes !== undefined ? observacoes.trim() : current.observacoes,
  };

  data.experiments[index] = updated;
  db.save();

  db.logAudit(
    req.user!,
    'Atualização',
    `Experimento: ${updated.id}`,
    'Experiment',
    updated.id,
    'Atualização de registro do experimento de IA.'
  );

  res.json(updated);
});

app.delete('/api/experiments/:id', requireRoles('coordenador_aluno'), (req: AuthenticatedRequest, res: Response) => {
  const data = db.getData();
  const exp = data.experiments.find(e => e.id === req.params.id);
  if (!exp) return res.status(404).json({ error: 'Experimento não encontrado.' });

  data.experiments = data.experiments.filter(e => e.id !== exp.id);
  db.save();

  db.logAudit(
    req.user!,
    'Exclusão',
    `Experimento: ${exp.id}`,
    'Experiment',
    exp.id,
    'Exclusão do registro de experimento.'
  );

  res.json({ success: true });
});

// ==================== PROMPTS REPOSITORY ROUTES ====================

app.get('/api/prompts', (req: AuthenticatedRequest, res: Response) => {
  const data = db.getData();
  res.json(data.prompts);
});

// Returns active category names for dropdowns, or detailed if requested
app.get('/api/prompts/categories', (req: AuthenticatedRequest, res: Response) => {
  const data = db.getData();
  if (req.query.detailed === 'true') {
    return res.json(data.promptCategoryItems);
  }
  // Return active category names
  const activeNames = (data.promptCategoryItems || [])
    .filter(c => c.ativa !== false)
    .map(c => c.nome);
  
  // Fallback to promptCategories if items not populated
  if (activeNames.length === 0) {
    return res.json(data.promptCategories);
  }
  res.json(activeNames);
});

// Dedicated administrative endpoint for Prompt Categories (Coordenador Aluno)
app.get('/api/prompts/categories/items', (req: AuthenticatedRequest, res: Response) => {
  const data = db.getData();
  res.json(data.promptCategoryItems || []);
});

app.post('/api/prompts/categories', requireRoles('coordenador_aluno'), (req: AuthenticatedRequest, res: Response) => {
  const data = db.getData();
  const { nome, categoria, descricao, ativa } = req.body;
  const categoryName = (nome || categoria || '').trim();

  if (!categoryName) {
    return res.status(400).json({ error: 'Nome da categoria é obrigatório.' });
  }

  if (!data.promptCategoryItems) {
    data.promptCategoryItems = [];
  }

  const existing = data.promptCategoryItems.find(
    c => c.nome.toLowerCase() === categoryName.toLowerCase()
  );

  if (existing) {
    return res.status(400).json({ error: 'Já existe uma categoria de prompt com este nome.' });
  }

  const newItem: PromptCategoryItem = {
    id: `cat-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    nome: categoryName,
    descricao: (descricao || '').trim(),
    ativa: ativa !== undefined ? Boolean(ativa) : true,
    createdAt: new Date().toISOString(),
  };

  data.promptCategoryItems.push(newItem);

  if (!data.promptCategories.includes(categoryName)) {
    data.promptCategories.push(categoryName);
  }

  db.save();

  db.logAudit(
    req.user!,
    'Criação',
    `Categoria de Prompts: ${newItem.nome}`,
    'PromptCategory',
    newItem.id,
    `Nova categoria de prompt criada pelo Coordenador Aluno. Status: ${newItem.ativa ? 'Ativa' : 'Inativa'}.`
  );

  res.status(201).json(newItem);
});

app.put('/api/prompts/categories/:id', requireRoles('coordenador_aluno'), (req: AuthenticatedRequest, res: Response) => {
  const data = db.getData();
  if (!data.promptCategoryItems) data.promptCategoryItems = [];

  const index = data.promptCategoryItems.findIndex(c => c.id === req.params.id);
  if (index === -1) {
    return res.status(404).json({ error: 'Categoria de prompt não encontrada.' });
  }

  const current = data.promptCategoryItems[index];
  const { nome, descricao, ativa } = req.body;

  const oldName = current.nome;
  const newName = nome !== undefined ? nome.trim() : current.nome;

  if (newName && newName.toLowerCase() !== oldName.toLowerCase()) {
    const duplicate = data.promptCategoryItems.find(
      c => c.id !== current.id && c.nome.toLowerCase() === newName.toLowerCase()
    );
    if (duplicate) {
      return res.status(400).json({ error: 'Já existe outra categoria com este nome.' });
    }
  }

  const updated: PromptCategoryItem = {
    ...current,
    nome: newName || current.nome,
    descricao: descricao !== undefined ? descricao.trim() : current.descricao,
    ativa: ativa !== undefined ? Boolean(ativa) : current.ativa,
  };

  data.promptCategoryItems[index] = updated;

  // Sync string array
  if (oldName !== updated.nome) {
    data.promptCategories = data.promptCategories.map(c => (c === oldName ? updated.nome : c));
  }

  db.save();

  db.logAudit(
    req.user!,
    'Atualização',
    `Categoria de Prompts: ${updated.nome}`,
    'PromptCategory',
    updated.id,
    `Categoria editada pelo Coordenador Aluno. Status: ${updated.ativa ? 'Ativa' : 'Desativada'}.`
  );

  res.json(updated);
});

app.delete('/api/prompts/categories/:id', requireRoles('coordenador_aluno'), (req: AuthenticatedRequest, res: Response) => {
  const data = db.getData();
  if (!data.promptCategoryItems) data.promptCategoryItems = [];

  const item = data.promptCategoryItems.find(c => c.id === req.params.id);
  if (!item) {
    return res.status(404).json({ error: 'Categoria de prompt não encontrada.' });
  }

  // Soft-disable category to preserve historical prompts
  item.ativa = false;
  db.save();

  db.logAudit(
    req.user!,
    'Desativação',
    `Categoria de Prompts: ${item.nome}`,
    'PromptCategory',
    item.id,
    `Categoria desativada pelo Coordenador Aluno.`
  );

  res.json({ message: 'Categoria desativada com sucesso.', item });
});

app.post('/api/prompts', (req: AuthenticatedRequest, res: Response) => {
  const data = db.getData();
  const { titulo, autorId, iaId, jogoId, categoria, promptCompleto, data: pData, resultado, avaliacao, observacoes } = req.body;

  if (!titulo || !promptCompleto || !iaId) {
    return res.status(400).json({ error: 'Título, IA e prompt completo são obrigatórios.' });
  }

  const author = data.participants.find(p => p.id === (autorId || req.user?.id));
  const ai = data.ais.find(a => a.id === iaId);
  const game = data.games.find(g => g.id === jogoId);

  const newPrompt: PromptItem = {
    id: `prompt-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    titulo: titulo.trim(),
    autorId: author ? author.id : req.user!.id,
    autorNome: author ? author.nome : req.user!.nome,
    iaId,
    iaNome: ai ? ai.nome : undefined,
    jogoId: jogoId || undefined,
    jogoNome: game ? game.nome : undefined,
    categoria: (categoria || 'Geral').trim(),
    promptCompleto: promptCompleto.trim(),
    data: pData || new Date().toISOString().split('T')[0],
    resultado: (resultado || '').trim(),
    avaliacao: Math.min(5, Math.max(1, Number(avaliacao) || 3)),
    observacoes: (observacoes || '').trim(),
    createdAt: new Date().toISOString(),
  };

  data.prompts.push(newPrompt);
  db.save();

  db.logAudit(
    req.user!,
    'Criação',
    `Prompt: ${newPrompt.titulo}`,
    'PromptItem',
    newPrompt.id,
    `Cadastro de prompt na categoria ${newPrompt.categoria}`
  );

  res.status(201).json(newPrompt);
});

app.put('/api/prompts/:id', (req: AuthenticatedRequest, res: Response) => {
  const data = db.getData();
  const index = data.prompts.findIndex(p => p.id === req.params.id);
  if (index === -1) return res.status(404).json({ error: 'Prompt não encontrado.' });

  const current = data.prompts[index];
  if (req.user?.role === 'aluno' && current.autorId !== req.user.id) {
    return res.status(403).json({ error: 'Você só pode editar prompts cadastrados por você.' });
  }

  const { titulo, categoria, promptCompleto, resultado, avaliacao, observacoes } = req.body;

  const updated: PromptItem = {
    ...current,
    titulo: titulo !== undefined ? titulo.trim() : current.titulo,
    categoria: categoria !== undefined ? categoria.trim() : current.categoria,
    promptCompleto: promptCompleto !== undefined ? promptCompleto.trim() : current.promptCompleto,
    resultado: resultado !== undefined ? resultado.trim() : current.resultado,
    avaliacao: avaliacao !== undefined ? Math.min(5, Math.max(1, Number(avaliacao))) : current.avaliacao,
    observacoes: observacoes !== undefined ? observacoes.trim() : current.observacoes,
  };

  data.prompts[index] = updated;
  db.save();

  db.logAudit(
    req.user!,
    'Atualização',
    `Prompt: ${updated.titulo}`,
    'PromptItem',
    updated.id,
    'Atualização do prompt cadastrado.'
  );

  res.json(updated);
});

app.delete('/api/prompts/:id', requireRoles('coordenador_aluno'), (req: AuthenticatedRequest, res: Response) => {
  const data = db.getData();
  const prompt = data.prompts.find(p => p.id === req.params.id);
  if (!prompt) return res.status(404).json({ error: 'Prompt não encontrado.' });

  data.prompts = data.prompts.filter(p => p.id !== prompt.id);
  db.save();

  db.logAudit(
    req.user!,
    'Exclusão',
    `Prompt: ${prompt.titulo}`,
    'PromptItem',
    prompt.id,
    'Exclusão do prompt do repositório.'
  );

  res.json({ success: true });
});

// ==================== TASKS ROUTES ====================

app.get('/api/tasks', (req: AuthenticatedRequest, res: Response) => {
  const data = db.getData();
  res.json(data.tasks);
});

app.post('/api/tasks', requireRoles('coordenador_aluno'), (req: AuthenticatedRequest, res: Response) => {
  const data = db.getData();
  const { titulo, descricao, responsavelId, equipeId, jogoId, prioridade, status, prazo, dataConclusao, observacoes } = req.body;

  if (!titulo || !responsavelId) {
    return res.status(400).json({ error: 'Título e responsável são obrigatórios para a tarefa.' });
  }

  const taskStatus = status || 'A fazer';
  if (taskStatus === 'Concluída' && (!dataConclusao || !dataConclusao.trim())) {
    return res.status(400).json({
      error: "Para definir o status como 'Concluída', a data de conclusão deve ser obrigatoriamente preenchida.",
    });
  }

  const resp = data.participants.find(p => p.id === responsavelId);
  const team = equipeId ? data.teams.find(t => t.id === equipeId) : undefined;
  const game = jogoId ? data.games.find(g => g.id === jogoId) : undefined;

  const newTask: Task = {
    id: `task-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    titulo: titulo.trim(),
    descricao: (descricao || '').trim(),
    responsavelId,
    responsavelNome: resp ? resp.nome : 'Não especificado',
    equipeId: equipeId || (resp ? resp.equipeId || '' : ''),
    equipeNome: team ? team.nome : (resp ? resp.equipeNome : undefined),
    jogoId: jogoId || undefined,
    jogoNome: game ? game.nome : undefined,
    prioridade: prioridade || 'Média',
    status: taskStatus,
    prazo: prazo || new Date().toISOString().split('T')[0],
    dataConclusao: taskStatus === 'Concluída' ? dataConclusao.trim() : undefined,
    observacoes: (observacoes || '').trim(),
    createdAt: new Date().toISOString(),
  };

  data.tasks.push(newTask);
  db.save();

  db.logGlobalChange(
    req.user!,
    'Tarefas',
    'Criação',
    `Tarefa: ${newTask.titulo}`,
    newTask.id,
    `Nova tarefa criada para ${newTask.responsavelNome}. Prazo: ${newTask.prazo}, Prioridade: ${newTask.prioridade}`,
    {
      campoAlterado: 'novo_registro',
      novoValor: newTask.titulo,
      descricaoCurta: `Criada tarefa "${newTask.titulo}" (${newTask.prioridade}, Status: ${newTask.status})`,
    }
  );

  res.status(201).json(newTask);
});

app.put('/api/tasks/:id', requireRoles('coordenador_aluno'), (req: AuthenticatedRequest, res: Response) => {
  const data = db.getData();
  const index = data.tasks.findIndex(t => t.id === req.params.id);
  if (index === -1) return res.status(404).json({ error: 'Tarefa não encontrada.' });

  const current = data.tasks[index];
  const { titulo, descricao, responsavelId, equipeId, jogoId, prioridade, status, prazo, dataConclusao, observacoes } = req.body;

  // RULE: Concluída requires dataConclusao
  const newStatus = status || current.status;
  if (newStatus === 'Concluída') {
    const finalConclusao = dataConclusao || current.dataConclusao;
    if (!finalConclusao || !finalConclusao.trim()) {
      return res.status(400).json({
        error: "Para definir o status como 'Concluída', a data de conclusão deve ser obrigatoriamente preenchida.",
      });
    }
  }

  let responsavelNome = current.responsavelNome;
  if (responsavelId) {
    const p = data.participants.find(part => part.id === responsavelId);
    if (p) responsavelNome = p.nome;
  }

  let equipeNome = current.equipeNome;
  if (equipeId) {
    const t = data.teams.find(team => team.id === equipeId);
    if (t) equipeNome = t.nome;
  }

  let jogoNome = current.jogoNome;
  if (jogoId) {
    const g = data.games.find(game => game.id === jogoId);
    if (g) jogoNome = g.nome;
  }

  const statusChanged = status && status !== current.status;
  const oldStatus = current.status;

  const updated: Task = {
    ...current,
    titulo: titulo !== undefined ? titulo.trim() : current.titulo,
    descricao: descricao !== undefined ? descricao.trim() : current.descricao,
    responsavelId: responsavelId || current.responsavelId,
    responsavelNome,
    equipeId: equipeId !== undefined ? equipeId : current.equipeId,
    equipeNome,
    jogoId: jogoId !== undefined ? jogoId : current.jogoId,
    jogoNome,
    prioridade: prioridade || current.prioridade,
    status: newStatus,
    prazo: prazo || current.prazo,
    dataConclusao: newStatus === 'Concluída' ? (dataConclusao || current.dataConclusao || new Date().toISOString().split('T')[0]) : undefined,
    observacoes: observacoes !== undefined ? observacoes.trim() : current.observacoes,
  };

  data.tasks[index] = updated;
  db.save();

  db.logGlobalChange(
    req.user!,
    'Tarefas',
    statusChanged ? 'Mudança de Status' : 'Atualização',
    `Tarefa: ${updated.titulo}`,
    updated.id,
    statusChanged
      ? `Transição de status: "${oldStatus}" ➔ "${updated.status}".${updated.dataConclusao ? ` Data de Conclusão: ${updated.dataConclusao}` : ''}`
      : `Tarefa atualizada: Prioridade ${updated.prioridade}, Prazo ${updated.prazo}`,
    {
      campoAlterado: statusChanged ? 'status' : 'dados_tarefa',
      valorAnterior: statusChanged ? oldStatus : undefined,
      novoValor: statusChanged ? updated.status : updated.prioridade,
      descricaoCurta: `Tarefa "${updated.titulo}" - Status: ${updated.status}${updated.dataConclusao ? ` (Concluída em ${updated.dataConclusao})` : ''}`,
    }
  );

  res.json(updated);
});

// Students can update the status/observations of their own tasks
app.patch('/api/tasks/:id/status', (req: AuthenticatedRequest, res: Response) => {
  const data = db.getData();
  const task = data.tasks.find(t => t.id === req.params.id);
  if (!task) return res.status(404).json({ error: 'Tarefa não encontrada.' });

  // If role is aluno, can only update if assigned
  if (req.user?.role === 'aluno' && task.responsavelId !== req.user.id) {
    return res.status(403).json({ error: 'Você só pode atualizar tarefas sob sua responsabilidade.' });
  }

  const { status, dataConclusao, observacoes } = req.body;
  const oldStatus = task.status;

  if (status) {
    // RULE: Concluída requires dataConclusao
    if (status === 'Concluída') {
      const finalDate = dataConclusao || task.dataConclusao;
      if (!finalDate || !finalDate.trim()) {
        return res.status(400).json({
          error: "Para definir a tarefa como 'Concluída', a data de conclusão deve ser obrigatoriamente informada.",
        });
      }
      task.status = status;
      task.dataConclusao = finalDate.trim();
    } else {
      task.status = status;
      task.dataConclusao = undefined;
    }
  }

  if (observacoes !== undefined) {
    task.observacoes = observacoes.trim();
  }

  db.save();

  db.logGlobalChange(
    req.user!,
    'Tarefas',
    'Mudança de Status',
    `Tarefa: ${task.titulo}`,
    task.id,
    `Transição de status pelo estudante: "${oldStatus}" ➔ "${task.status}".${task.dataConclusao ? ` Data Conclusão: ${task.dataConclusao}` : ''}`,
    {
      campoAlterado: 'status',
      valorAnterior: oldStatus,
      novoValor: task.status,
      descricaoCurta: `Tarefa "${task.titulo}" transicionada para ${task.status}${task.dataConclusao ? ` (Data: ${task.dataConclusao})` : ''}`,
    }
  );

  res.json(task);
});

app.delete('/api/tasks/:id', requireRoles('coordenador_aluno'), (req: AuthenticatedRequest, res: Response) => {
  const data = db.getData();
  const task = data.tasks.find(t => t.id === req.params.id);
  if (!task) return res.status(404).json({ error: 'Tarefa não encontrada.' });

  data.tasks = data.tasks.filter(t => t.id !== task.id);
  db.save();

  db.logGlobalChange(
    req.user!,
    'Tarefas',
    'Exclusão',
    `Tarefa: ${task.titulo}`,
    task.id,
    `Tarefa "${task.titulo}" excluída do cronograma.`,
    {
      campoAlterado: 'exclusao',
      valorAnterior: task.titulo,
      descricaoCurta: `Exclusão da tarefa "${task.titulo}"`,
    }
  );

  res.json({ success: true });
});

// ==================== GAME VERSIONS ROUTES ====================

app.get('/api/versions', (req: AuthenticatedRequest, res: Response) => {
  const data = db.getData();
  res.json(data.versions);
});

app.post('/api/versions', requireRoles('coordenador_aluno'), (req: AuthenticatedRequest, res: Response) => {
  const data = db.getData();
  const { jogoId, numero, data: vData, responsavelId, alteracoes, funcionalidadesAdicionadas, bugsCorrigidos, linkArquivo, observacoes } = req.body;

  if (!jogoId || !numero) {
    return res.status(400).json({ error: 'Jogo e número da versão são obrigatórios.' });
  }

  const game = data.games.find(g => g.id === jogoId);
  const resp = data.participants.find(p => p.id === (responsavelId || req.user?.id));

  const newVersion: GameVersion = {
    id: `ver-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    jogoId,
    numero: numero.trim(),
    data: vData || new Date().toISOString().split('T')[0],
    responsavelId: resp ? resp.id : req.user!.id,
    responsavelNome: resp ? resp.nome : req.user!.nome,
    alteracoes: (alteracoes || '').trim(),
    funcionalidadesAdicionadas: (funcionalidadesAdicionadas || '').trim(),
    bugsCorrigidos: (bugsCorrigidos || '').trim(),
    linkArquivo: (linkArquivo || '').trim(),
    observacoes: (observacoes || '').trim(),
    createdAt: new Date().toISOString(),
  };

  data.versions.push(newVersion);

  // Update current version in game
  if (game) {
    game.versaoAtual = newVersion.numero;
  }

  db.save();

  db.logAudit(
    req.user!,
    'Criação',
    `Versão ${newVersion.numero} do Jogo ${game ? game.nome : ''}`,
    'GameVersion',
    newVersion.id,
    `Registro da versão ${newVersion.numero}`
  );

  res.status(201).json(newVersion);
});

app.put('/api/versions/:id', requireRoles('coordenador_aluno'), (req: AuthenticatedRequest, res: Response) => {
  const data = db.getData();
  const index = data.versions.findIndex(v => v.id === req.params.id);
  if (index === -1) return res.status(404).json({ error: 'Versão não encontrada.' });

  const current = data.versions[index];
  const { numero, data: vData, responsavelId, alteracoes, funcionalidadesAdicionadas, bugsCorrigidos, linkArquivo, observacoes } = req.body;

  let responsavelNome = current.responsavelNome;
  if (responsavelId) {
    const p = data.participants.find(part => part.id === responsavelId);
    if (p) responsavelNome = p.nome;
  }

  const updated: GameVersion = {
    ...current,
    numero: numero !== undefined ? numero.trim() : current.numero,
    data: vData || current.data,
    responsavelId: responsavelId || current.responsavelId,
    responsavelNome,
    alteracoes: alteracoes !== undefined ? alteracoes.trim() : current.alteracoes,
    funcionalidadesAdicionadas: funcionalidadesAdicionadas !== undefined ? funcionalidadesAdicionadas.trim() : current.funcionalidadesAdicionadas,
    bugsCorrigidos: bugsCorrigidos !== undefined ? bugsCorrigidos.trim() : current.bugsCorrigidos,
    linkArquivo: linkArquivo !== undefined ? linkArquivo.trim() : current.linkArquivo,
    observacoes: observacoes !== undefined ? observacoes.trim() : current.observacoes,
  };

  data.versions[index] = updated;
  db.save();

  db.logAudit(
    req.user!,
    'Atualização',
    `Versão ${updated.numero}`,
    'GameVersion',
    updated.id,
    'Atualização das informações da versão do jogo.'
  );

  res.json(updated);
});

app.delete('/api/versions/:id', requireRoles('coordenador_aluno'), (req: AuthenticatedRequest, res: Response) => {
  const data = db.getData();
  const ver = data.versions.find(v => v.id === req.params.id);
  if (!ver) return res.status(404).json({ error: 'Versão não encontrada.' });

  data.versions = data.versions.filter(v => v.id !== ver.id);
  db.save();

  db.logAudit(
    req.user!,
    'Exclusão',
    `Versão ${ver.numero}`,
    'GameVersion',
    ver.id,
    'Exclusão do registro de versão.'
  );

  res.json({ success: true });
});

// ==================== TEST BATTERIES & EVALUATIONS ROUTES ====================

app.get('/api/tests', (req: AuthenticatedRequest, res: Response) => {
  const data = db.getData();
  res.json(data.testSuites);
});

app.post('/api/tests', requireRoles('coordenador_aluno'), (req: AuthenticatedRequest, res: Response) => {
  const data = db.getData();
  const { nome, jogoId, objetivo, responsavelId, dataInicial, dataFinal, participantesIds, criterios, status } = req.body;

  if (!nome || !jogoId) {
    return res.status(400).json({ error: 'Nome do teste e jogo são obrigatórios.' });
  }

  const game = data.games.find(g => g.id === jogoId);
  const resp = data.participants.find(p => p.id === (responsavelId || req.user?.id));

  const defaultCriterios = ['Jogabilidade', 'Estabilidade', 'Mecânicas', 'Desempenho', 'Interface'];

  const newTest: TestSuite = {
    id: `test-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    nome: nome.trim(),
    jogoId,
    jogoNome: game ? game.nome : undefined,
    objetivo: (objetivo || '').trim(),
    responsavelId: resp ? resp.id : req.user!.id,
    responsavelNome: resp ? resp.nome : req.user!.nome,
    dataInicial: dataInicial || new Date().toISOString().split('T')[0],
    dataFinal: dataFinal || '',
    participantesIds: participantesIds || [],
    criterios: criterios && criterios.length > 0 ? criterios : defaultCriterios,
    status: status || 'Planejado',
    createdAt: new Date().toISOString(),
  };

  data.testSuites.push(newTest);
  db.save();

  db.logAudit(
    req.user!,
    'Criação',
    `Bateria de Testes: ${newTest.nome}`,
    'TestSuite',
    newTest.id,
    `Criada para o jogo ${game ? game.nome : 'Jogo'}`
  );

  res.status(201).json(newTest);
});

app.put('/api/tests/:id', requireRoles('coordenador_aluno'), (req: AuthenticatedRequest, res: Response) => {
  const data = db.getData();
  const index = data.testSuites.findIndex(t => t.id === req.params.id);
  if (index === -1) return res.status(404).json({ error: 'Bateria de testes não encontrada.' });

  const current = data.testSuites[index];
  const { nome, objetivo, responsavelId, dataInicial, dataFinal, participantesIds, criterios, status } = req.body;

  let responsavelNome = current.responsavelNome;
  if (responsavelId) {
    const p = data.participants.find(part => part.id === responsavelId);
    if (p) responsavelNome = p.nome;
  }

  const updated: TestSuite = {
    ...current,
    nome: nome !== undefined ? nome.trim() : current.nome,
    objetivo: objetivo !== undefined ? objetivo.trim() : current.objetivo,
    responsavelId: responsavelId || current.responsavelId,
    responsavelNome,
    dataInicial: dataInicial || current.dataInicial,
    dataFinal: dataFinal !== undefined ? dataFinal : current.dataFinal,
    participantesIds: participantesIds || current.participantesIds,
    criterios: criterios || current.criterios,
    status: status || current.status,
  };

  data.testSuites[index] = updated;
  db.save();

  db.logAudit(
    req.user!,
    'Atualização',
    `Bateria de Testes: ${updated.nome}`,
    'TestSuite',
    updated.id,
    `Status atual: ${updated.status}`
  );

  res.json(updated);
});

app.delete('/api/tests/:id', requireRoles('coordenador_aluno'), (req: AuthenticatedRequest, res: Response) => {
  const data = db.getData();
  const test = data.testSuites.find(t => t.id === req.params.id);
  if (!test) return res.status(404).json({ error: 'Bateria de testes não encontrada.' });

  data.testSuites = data.testSuites.filter(t => t.id !== test.id);
  data.testEvaluations = data.testEvaluations.filter(ev => ev.testeId !== test.id);
  db.save();

  db.logAudit(
    req.user!,
    'Exclusão',
    `Bateria de Testes: ${test.nome}`,
    'TestSuite',
    test.id,
    'Exclusão da bateria de testes e avaliações associadas.'
  );

  res.json({ success: true });
});

// Test Evaluations
app.get('/api/tests/:id/evaluations', (req: AuthenticatedRequest, res: Response) => {
  const data = db.getData();
  const evals = data.testEvaluations.filter(ev => ev.testeId === req.params.id);
  res.json(evals);
});

app.post('/api/tests/:id/evaluations', (req: AuthenticatedRequest, res: Response) => {
  const data = db.getData();
  const test = data.testSuites.find(t => t.id === req.params.id);
  if (!test) return res.status(404).json({ error: 'Bateria de testes não encontrada.' });

  const { notas, comentarios, problemas, sugestoes } = req.body;

  const newEval: TestEvaluation = {
    id: `eval-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    testeId: test.id,
    jogoId: test.jogoId,
    participanteId: req.user!.id,
    participanteNome: req.user!.nome,
    data: new Date().toISOString().split('T')[0],
    notas: notas || {},
    comentarios: (comentarios || '').trim(),
    problemas: (problemas || '').trim(),
    sugestoes: (sugestoes || '').trim(),
    createdAt: new Date().toISOString(),
  };

  data.testEvaluations.push(newEval);
  db.save();

  db.logAudit(
    req.user!,
    'Registro de Avaliação',
    `Avaliação na Bateria: ${test.nome}`,
    'TestEvaluation',
    newEval.id,
    `Notas registradas por ${newEval.participanteNome}`
  );

  res.status(201).json(newEval);
});

// ==================== RESULTS CONSOLIDATION ROUTE (Rule 17) ====================
// "Mostrar médias, quantidade de participantes, testes concluídos, problemas encontrados, observações, evolução entre versões.
// Somente utilizar dados realmente registrados. Caso não existam dados suficientes: «Dados insuficientes para gerar esta análise.»"

app.get('/api/results', (req: AuthenticatedRequest, res: Response) => {
  const data = db.getData();
  const gameId = req.query.gameId as string;

  if (gameId) {
    const game = data.games.find(g => g.id === gameId);
    const gameEvaluations = data.testEvaluations.filter(ev => ev.jogoId === gameId);
    
    // Rule 17: If less than 1 evaluation, not sufficient
    if (gameEvaluations.length === 0) {
      return res.json({
        hasSufficientData: false,
        message: 'Dados insuficientes para gerar esta análise.',
        totalAvaliadores: 0,
        mediasPorCriterio: {},
        problemasFrequentes: [],
        sugestoesRecorrentes: [],
        evolucaoPorVersao: {},
      });
    }

    const uniqueParticipants = Array.from(new Set(gameEvaluations.map(e => e.participanteId))).length;

    // Medias por criterio
    const criteriaSums: Record<string, { total: number; count: number }> = {};
    gameEvaluations.forEach(ev => {
      Object.entries(ev.notas || {}).forEach(([criterio, nota]) => {
        if (!criteriaSums[criterio]) criteriaSums[criterio] = { total: 0, count: 0 };
        criteriaSums[criterio].total += nota;
        criteriaSums[criterio].count += 1;
      });
    });

    const mediasPorCriterio: Record<string, number> = {};
    Object.entries(criteriaSums).forEach(([criterio, obj]) => {
      mediasPorCriterio[criterio] = Number((obj.total / obj.count).toFixed(1));
    });

    // Problemas frequentes
    const problemasFrequentes = gameEvaluations
      .map(e => e.problemas?.trim())
      .filter((p): p is string => Boolean(p && p.length > 0));

    // Sugestoes recorrentes
    const sugestoesRecorrentes = gameEvaluations
      .map(e => e.sugestoes?.trim())
      .filter((s): s is string => Boolean(s && s.length > 0));

    // Evolucao por versao
    const evolucaoPorVersao: Record<string, number> = {};
    const suites = data.testSuites.filter(s => s.jogoId === gameId);
    suites.forEach(s => {
      const suiteEvals = gameEvaluations.filter(ev => ev.testeId === s.id);
      if (suiteEvals.length > 0) {
        let sum = 0;
        let count = 0;
        suiteEvals.forEach(ev => {
          Object.values(ev.notas || {}).forEach(n => {
            sum += n;
            count += 1;
          });
        });
        if (count > 0) {
          const vNum = s.versaoTestada || (game ? game.versaoAtual : 'v0.1');
          evolucaoPorVersao[vNum] = Number((sum / count).toFixed(1));
        }
      }
    });

    return res.json({
      hasSufficientData: true,
      totalAvaliadores: uniqueParticipants,
      totalAvaliacoes: gameEvaluations.length,
      mediasPorCriterio,
      problemasFrequentes,
      sugestoesRecorrentes,
      evolucaoPorVersao,
      jogoNome: game ? game.nome : 'Jogo',
    });
  }

  const totalEvaluations = data.testEvaluations.length;
  if (totalEvaluations === 0) {
    return res.json({
      hasData: false,
      message: 'Dados insuficientes para gerar esta análise.',
      jogosComResultados: [],
    });
  }

  // Group by game
  const resultsByGame = data.games.map(game => {
    const gameEvaluations = data.testEvaluations.filter(ev => ev.jogoId === game.id);
    const gameTests = data.testSuites.filter(t => t.jogoId === game.id);
    const completedTests = gameTests.filter(t => t.status === 'Concluído').length;

    if (gameEvaluations.length === 0) {
      return {
        jogoId: game.id,
        jogoNome: game.nome,
        versaoAtual: game.versaoAtual,
        hasData: false,
        message: 'Dados insuficientes para gerar esta análise.',
        avaliacoesCount: 0,
      };
    }

    // Unique participants who evaluated
    const uniqueParticipants = Array.from(new Set(gameEvaluations.map(e => e.participanteId))).length;

    // Calculate averages per criterion
    const criteriaSums: Record<string, { total: number; count: number }> = {};
    gameEvaluations.forEach(ev => {
      Object.entries(ev.notas).forEach(([criterio, nota]) => {
        if (!criteriaSums[criterio]) criteriaSums[criterio] = { total: 0, count: 0 };
        criteriaSums[criterio].total += nota;
        criteriaSums[criterio].count += 1;
      });
    });

    const mediasPorCriterio: Record<string, number> = {};
    let sumAll = 0;
    let countAll = 0;
    Object.entries(criteriaSums).forEach(([criterio, obj]) => {
      mediasPorCriterio[criterio] = Number((obj.total / obj.count).toFixed(2));
      sumAll += obj.total;
      countAll += obj.count;
    });

    const mediaGeral = countAll > 0 ? Number((sumAll / countAll).toFixed(2)) : 0;

    // List of problems and suggestions found
    const problemas = gameEvaluations
      .filter(e => e.problemas && e.problemas.trim() !== '')
      .map(e => ({ avaliador: e.participanteNome, problema: e.problemas, data: e.data }));

    const sugestoes = gameEvaluations
      .filter(e => e.sugestoes && e.sugestoes.trim() !== '')
      .map(e => ({ avaliador: e.participanteNome, sugestao: e.sugestoes, data: e.data }));

    // Versions of this game for tracking evolution
    const gameVersions = data.versions
      .filter(v => v.jogoId === game.id)
      .sort((a, b) => (a.data > b.data ? 1 : -1));

    return {
      jogoId: game.id,
      jogoNome: game.nome,
      versaoAtual: game.versaoAtual,
      hasData: true,
      quantidadeParticipantes: uniqueParticipants,
      totalAvaliacoes: gameEvaluations.length,
      testesConcluidos: completedTests,
      totalTestes: gameTests.length,
      mediaGeral,
      mediasPorCriterio,
      problemasEncontrados: problemas,
      sugestoes,
      evolucoesVersoes: gameVersions,
    };
  });

  res.json({
    hasData: true,
    totalAvaliacoesGeral: totalEvaluations,
    jogosComResultados: resultsByGame,
  });
});

// ==================== AI COMPARISON ROUTE (Rule 18) ====================
// "Permitir comparar IAs com base em dados registrados: avaliação, tempo gasto, quantidade de correções, quantidade de problemas, resultado final. A plataforma deve apresentar os dados de forma neutra. Não afirmar que uma IA é 'melhor' com base em poucos registros."

app.get('/api/ai-comparison', (req: AuthenticatedRequest, res: Response) => {
  const data = db.getData();

  if (data.ais.length === 0 || data.experiments.length === 0) {
    return res.json({
      hasData: false,
      message: 'Dados insuficientes para gerar esta análise. Registre modelos de IA e experimentos práticos para visualizar a comparação.',
      comparativo: [],
    });
  }

  const comparativo = data.ais.map(ai => {
    const experiments = data.experiments.filter(e => e.iaId === ai.id);
    const prompts = data.prompts.filter(p => p.iaId === ai.id);

    if (experiments.length === 0) {
      return {
        iaId: ai.id,
        nome: ai.nome,
        empresaProvedor: ai.empresaProvedor,
        modelo: ai.modelo,
        totalExperimentos: 0,
        totalPrompts: prompts.length,
        hasData: false,
        message: 'Nenhum experimento registrado para esta IA.',
      };
    }

    const totalExp = experiments.length;
    const somaAvaliacoes = experiments.reduce((acc, curr) => acc + (curr.avaliacao || 0), 0);
    const avaliacaoMedia = Number((somaAvaliacoes / totalExp).toFixed(2));

    const somaTempo = experiments.reduce((acc, curr) => acc + (curr.tempoAproximadoMinutos || 0), 0);
    const tempoMedioMinutos = Number((somaTempo / totalExp).toFixed(1));

    const correcoesManuais = experiments.filter(e => e.alteracoesManuais && e.alteracoesManuais.trim().length > 0).length;
    const problemasRelatados = experiments.filter(e => e.problemasEncontrados && e.problemasEncontrados.trim().length > 0).length;

    return {
      iaId: ai.id,
      nome: ai.nome,
      empresaProvedor: ai.empresaProvedor,
      modelo: ai.modelo,
      totalExperimentos: totalExp,
      totalPrompts: prompts.length,
      hasData: true,
      avaliacaoMedia, // 1 to 5
      tempoMedioMinutos,
      quantidadeCorrecoesManuais: correcoesManuais,
      quantidadeProblemasRelatados: problemasRelatados,
      amostraPequenaAviso: totalExp < 5 ? 'Amostra inicial reduzida. Dados estatísticos preliminares.' : undefined,
    };
  });

  res.json({
    hasData: true,
    comparativo,
  });
});

// ==================== SCHEDULE / CRONOGRAMA ROUTES (Rule 19) ====================

app.get('/api/schedule', (req: AuthenticatedRequest, res: Response) => {
  const data = db.getData();
  res.json(data.scheduleMilestones);
});

app.post('/api/schedule', requireRoles('coordenador_aluno'), (req: AuthenticatedRequest, res: Response) => {
  const data = db.getData();
  const { etapa, tarefasIds, responsavelId, dataInicio, prazo, status, observacoes } = req.body;

  if (!etapa || !responsavelId) {
    return res.status(400).json({ error: 'Nome da etapa e responsável são obrigatórios.' });
  }

  const resp = data.participants.find(p => p.id === responsavelId);

  const newMilestone: ScheduleMilestone = {
    id: `sched-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    etapa: etapa.trim(),
    tarefasIds: tarefasIds || [],
    responsavelId,
    responsavelNome: resp ? resp.nome : 'Não especificado',
    dataInicio: dataInicio || new Date().toISOString().split('T')[0],
    prazo: prazo || new Date().toISOString().split('T')[0],
    status: status || 'Não iniciada',
    observacoes: (observacoes || '').trim(),
    createdAt: new Date().toISOString(),
  };

  data.scheduleMilestones.push(newMilestone);
  db.save();

  db.logAudit(
    req.user!,
    'Criação',
    `Etapa do Cronograma: ${newMilestone.etapa}`,
    'ScheduleMilestone',
    newMilestone.id,
    `Prazo estabelecido até ${newMilestone.prazo}`
  );

  res.status(201).json(newMilestone);
});

app.put('/api/schedule/:id', requireRoles('coordenador_aluno'), (req: AuthenticatedRequest, res: Response) => {
  const data = db.getData();
  const index = data.scheduleMilestones.findIndex(m => m.id === req.params.id);
  if (index === -1) return res.status(404).json({ error: 'Etapa não encontrada.' });

  const current = data.scheduleMilestones[index];
  const { etapa, tarefasIds, responsavelId, dataInicio, prazo, status, observacoes } = req.body;

  let responsavelNome = current.responsavelNome;
  if (responsavelId) {
    const p = data.participants.find(part => part.id === responsavelId);
    if (p) responsavelNome = p.nome;
  }

  const updated: ScheduleMilestone = {
    ...current,
    etapa: etapa !== undefined ? etapa.trim() : current.etapa,
    tarefasIds: tarefasIds || current.tarefasIds,
    responsavelId: responsavelId || current.responsavelId,
    responsavelNome,
    dataInicio: dataInicio || current.dataInicio,
    prazo: prazo || current.prazo,
    status: status || current.status,
    observacoes: observacoes !== undefined ? observacoes.trim() : current.observacoes,
  };

  data.scheduleMilestones[index] = updated;
  db.save();

  db.logAudit(
    req.user!,
    'Atualização',
    `Etapa do Cronograma: ${updated.etapa}`,
    'ScheduleMilestone',
    updated.id,
    `Status atual: ${updated.status}`
  );

  res.json(updated);
});

app.delete('/api/schedule/:id', requireRoles('coordenador_aluno'), (req: AuthenticatedRequest, res: Response) => {
  const data = db.getData();
  const ms = data.scheduleMilestones.find(m => m.id === req.params.id);
  if (!ms) return res.status(404).json({ error: 'Etapa não encontrada.' });

  data.scheduleMilestones = data.scheduleMilestones.filter(m => m.id !== ms.id);
  db.save();

  db.logAudit(
    req.user!,
    'Exclusão',
    `Etapa do Cronograma: ${ms.etapa}`,
    'ScheduleMilestone',
    ms.id,
    'Exclusão da etapa do cronograma.'
  );

  res.json({ success: true });
});

// ==================== AUDIT / HISTÓRICO ROUTES (Rule 20) ====================

app.get('/api/audit-logs', (req: AuthenticatedRequest, res: Response) => {
  const data = db.getData();
  res.json(data.auditLogs);
});

app.post('/api/audit-logs', (req: AuthenticatedRequest, res: Response) => {
  const { acao, registroAfetado, tipoEntidade, entidadeId, alteracaoRealizada, moduloAfetado, detalhes } = req.body;

  if (!acao || !registroAfetado) {
    return res.status(400).json({ error: 'Ação e registro afetado são obrigatórios.' });
  }

  const log = db.logAudit(
    req.user!,
    acao,
    registroAfetado,
    tipoEntidade || 'Sistema',
    entidadeId || 'id-n/a',
    alteracaoRealizada || acao,
    moduloAfetado,
    detalhes
  );

  res.status(201).json(log);
});

// ==================== SYSTEM CHANGELOG / VERSIONS (Rule 26) ====================

app.get('/api/system-versions', (req: AuthenticatedRequest, res: Response) => {
  const data = db.getData();
  res.json(data.systemVersions);
});

app.post('/api/system-versions', requireRoles('coordenador_aluno'), (req: AuthenticatedRequest, res: Response) => {
  const data = db.getData();
  const { versao, data: sData, alteracao, responsavel } = req.body;

  if (!versao || !alteracao) {
    return res.status(400).json({ error: 'Versão e alteração são obrigatórias.' });
  }

  const newSysVer: SystemVersion = {
    id: `sys-${Date.now()}`,
    versao: versao.trim(),
    data: sData || new Date().toISOString().split('T')[0],
    alteracao: alteracao.trim(),
    responsavel: responsavel || req.user?.nome || 'Coordenador Aluno',
  };

  data.systemVersions.unshift(newSysVer);
  db.save();

  db.logAudit(
    req.user!,
    'Criação',
    `Versão do Sistema: ${newSysVer.versao}`,
    'SystemVersion',
    newSysVer.id,
    `Registro da versão do sistema: ${newSysVer.alteracao}`
  );

  res.status(201).json(newSysVer);
});

// ==================== FUTURE SUGGESTIONS (Rule 1) ====================

app.get('/api/future-suggestions', (req: AuthenticatedRequest, res: Response) => {
  const data = db.getData();
  res.json(data.futureSuggestions);
});

app.post('/api/future-suggestions', (req: AuthenticatedRequest, res: Response) => {
  const data = db.getData();
  const { titulo, descricao } = req.body;

  if (!titulo || !descricao) {
    return res.status(400).json({ error: 'Título e descrição da sugestão são obrigatórios.' });
  }

  const newSug: FutureSuggestion = {
    id: `sug-${Date.now()}`,
    titulo: titulo.trim(),
    descricao: descricao.trim(),
    autor: req.user ? `${req.user.nome} (${getRoleLabel(req.user.role)})` : 'Usuário',
    data: new Date().toISOString().split('T')[0],
    status: 'Registrada',
    createdAt: new Date().toISOString(),
  };

  data.futureSuggestions.push(newSug);
  db.save();

  db.logAudit(
    req.user!,
    'Criação',
    `Sugestão Futura: ${newSug.titulo}`,
    'FutureSuggestion',
    newSug.id,
    'Registro formal de sugestão futura para apreciação.'
  );

  res.status(201).json(newSug);
});

app.put('/api/future-suggestions/:id/status', requireRoles('coordenador_aluno'), (req: AuthenticatedRequest, res: Response) => {
  const data = db.getData();
  const sug = data.futureSuggestions.find(s => s.id === req.params.id);
  if (!sug) return res.status(404).json({ error: 'Sugestão não encontrada.' });

  const { status } = req.body;
  if (status) {
    sug.status = status;
    db.save();
    db.logAudit(
      req.user!,
      'Atualização',
      `Sugestão Futura: ${sug.titulo}`,
      'FutureSuggestion',
      sug.id,
      `Status alterado para ${sug.status}`
    );
  }

  res.json(sug);
});

// ==================== PROJECT DOCUMENTS ROUTES ====================

app.get('/api/documents', (req: AuthenticatedRequest, res: Response) => {
  const data = db.getData();
  const user = req.user;
  const docs = data.documents || [];

  // Filter based on role permissions
  let accessibleDocs = docs;
  if (user && user.role === 'aluno') {
    accessibleDocs = docs.filter(doc => {
      // Aluno can view docs with nivelAcesso === 'Todos' or their own authored docs
      if (doc.nivelAcesso === 'Apenas Professores e Coordenador') {
        return doc.autorId === user.id;
      }
      return true;
    });
  }

  res.json(accessibleDocs);
});

app.get('/api/documents/:id', (req: AuthenticatedRequest, res: Response) => {
  const data = db.getData();
  const user = req.user;
  const doc = (data.documents || []).find(d => d.id === req.params.id);

  if (!doc) {
    return res.status(404).json({ error: 'Documento não encontrado.' });
  }

  if (user && user.role === 'aluno' && doc.nivelAcesso === 'Apenas Professores e Coordenador' && doc.autorId !== user.id) {
    return res.status(403).json({ error: 'Acesso restrito: Este documento é exclusivo para Professores e Coordenador.' });
  }

  res.json(doc);
});

app.post('/api/documents', (req: AuthenticatedRequest, res: Response) => {
  const data = db.getData();
  const { titulo, categoria, descricao, conteudo, jogoId, versao, nivelAcesso, linkExterno, tags } = req.body;

  if (!titulo || !categoria || !conteudo) {
    return res.status(400).json({ error: 'Título, categoria e conteúdo são obrigatórios.' });
  }

  if (!data.documents) {
    data.documents = [];
  }

  const game = jogoId ? data.games.find(g => g.id === jogoId) : undefined;
  const now = new Date().toISOString();

  const newDoc: ProjectDocument = {
    id: `doc-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    titulo: titulo.trim(),
    categoria,
    descricao: (descricao || '').trim(),
    conteudo: conteudo.trim(),
    jogoId: jogoId || undefined,
    jogoNome: game ? game.nome : undefined,
    autorId: req.user!.id,
    autorNome: req.user!.nome,
    autorRole: req.user!.role,
    versao: (versao || '1.0').trim(),
    nivelAcesso: nivelAcesso || 'Todos',
    linkExterno: (linkExterno || '').trim() || undefined,
    tags: Array.isArray(tags) ? tags : [],
    dataCriacao: now.split('T')[0],
    dataAtualizacao: now.split('T')[0],
    createdAt: now,
  };

  data.documents.push(newDoc);
  db.save();

  db.logAudit(
    req.user!,
    'Criação',
    `Documento: ${newDoc.titulo}`,
    'Document',
    newDoc.id,
    `Novo documento (${newDoc.categoria}) cadastrado com nível de acesso '${newDoc.nivelAcesso}'.`
  );

  res.status(201).json(newDoc);
});

app.put('/api/documents/:id', (req: AuthenticatedRequest, res: Response) => {
  const data = db.getData();
  if (!data.documents) data.documents = [];

  const index = data.documents.findIndex(d => d.id === req.params.id);
  if (index === -1) {
    return res.status(404).json({ error: 'Documento não encontrado.' });
  }

  const current = data.documents[index];

  // Permission check: Coordinator, Professors, or original Author can edit
  const isPrivileged = ['coordenador_aluno', 'professor_orientador', 'professor_colaborador'].includes(req.user?.role || '');
  const isAuthor = current.autorId === req.user?.id;

  if (!isPrivileged && !isAuthor) {
    return res.status(403).json({ error: 'Você não possui permissão para editar este documento.' });
  }

  const { titulo, categoria, descricao, conteudo, jogoId, versao, nivelAcesso, linkExterno, tags } = req.body;
  const game = jogoId ? data.games.find(g => g.id === jogoId) : undefined;
  const now = new Date().toISOString();

  const updated: ProjectDocument = {
    ...current,
    titulo: titulo !== undefined ? titulo.trim() : current.titulo,
    categoria: categoria || current.categoria,
    descricao: descricao !== undefined ? descricao.trim() : current.descricao,
    conteudo: conteudo !== undefined ? conteudo.trim() : current.conteudo,
    jogoId: jogoId !== undefined ? (jogoId || undefined) : current.jogoId,
    jogoNome: game ? game.nome : (jogoId === '' ? undefined : current.jogoNome),
    versao: versao !== undefined ? versao.trim() : current.versao,
    nivelAcesso: nivelAcesso || current.nivelAcesso,
    linkExterno: linkExterno !== undefined ? (linkExterno.trim() || undefined) : current.linkExterno,
    tags: Array.isArray(tags) ? tags : current.tags,
    dataAtualizacao: now.split('T')[0],
  };

  data.documents[index] = updated;
  db.save();

  db.logAudit(
    req.user!,
    'Atualização',
    `Documento: ${updated.titulo}`,
    'Document',
    updated.id,
    `Documento atualizado. Versão: ${updated.versao}.`
  );

  res.json(updated);
});

app.delete('/api/documents/:id', (req: AuthenticatedRequest, res: Response) => {
  const data = db.getData();
  if (!data.documents) data.documents = [];

  const doc = data.documents.find(d => d.id === req.params.id);
  if (!doc) {
    return res.status(404).json({ error: 'Documento não encontrado.' });
  }

  const isPrivileged = ['coordenador_aluno', 'professor_orientador', 'professor_colaborador'].includes(req.user?.role || '');
  const isAuthor = doc.autorId === req.user?.id;

  if (!isPrivileged && !isAuthor) {
    return res.status(403).json({ error: 'Você não possui permissão para excluir este documento.' });
  }

  data.documents = data.documents.filter(d => d.id !== doc.id);
  db.save();

  db.logAudit(
    req.user!,
    'Exclusão',
    `Documento: ${doc.titulo}`,
    'Document',
    doc.id,
    `Documento removido do projeto.`
  );

  res.json({ message: 'Documento removido com sucesso.' });
});

// ==================== REPORTS ROUTE (Rule 21) ====================

app.get('/api/reports/:type', (req: AuthenticatedRequest, res: Response) => {
  const data = db.getData();
  const { type } = req.params;

  switch (type) {
    case 'geral':
      return res.json({
        tipo: 'Relatório Geral do Projeto',
        dataGeracao: new Date().toISOString(),
        totalJogos: data.games.length,
        totalParticipantes: data.participants.length,
        totalEquipes: data.teams.length,
        totalTarefas: data.tasks.length,
        totalExperimentos: data.experiments.length,
        totalTestes: data.testSuites.length,
        jogos: data.games.map(g => ({
          nome: g.nome,
          status: g.status,
          versaoAtual: g.versaoAtual,
          equipe: g.equipeNome,
        })),
        tarefasPorStatus: {
          aFazer: data.tasks.filter(t => t.status === 'A fazer').length,
          emAndamento: data.tasks.filter(t => t.status === 'Em andamento').length,
          emRevisao: data.tasks.filter(t => t.status === 'Em revisão').length,
          concluidas: data.tasks.filter(t => t.status === 'Concluída').length,
        },
      });

    case 'jogos':
      return res.json({
        tipo: 'Relatório Consolidado de Jogos',
        dataGeracao: new Date().toISOString(),
        jogos: data.games.map(g => ({
          ...g,
          tarefasCount: data.tasks.filter(t => t.jogoId === g.id).length,
          experimentosCount: data.experiments.filter(e => e.jogoId === g.id).length,
          testesCount: data.testSuites.filter(t => t.jogoId === g.id).length,
          versoesCount: data.versions.filter(v => v.jogoId === g.id).length,
        })),
      });

    case 'ias':
      return res.json({
        tipo: 'Relatório de Utilização de IAs',
        dataGeracao: new Date().toISOString(),
        ias: data.ais.map(ai => ({
          ...ai,
          experimentosRealizados: data.experiments.filter(e => e.iaId === ai.id).length,
          promptsCadastrados: data.prompts.filter(p => p.iaId === ai.id).length,
        })),
      });

    case 'experimentos':
      return res.json({
        tipo: 'Relatório Completo de Experimentos Acadêmicos',
        dataGeracao: new Date().toISOString(),
        experimentos: data.experiments,
      });

    case 'testes':
      return res.json({
        tipo: 'Relatório Consolidado de Baterias de Testes',
        dataGeracao: new Date().toISOString(),
        testes: data.testSuites.map(t => ({
          ...t,
          avaliacoes: data.testEvaluations.filter(ev => ev.testeId === t.id),
        })),
      });

    default:
      return res.status(400).json({ error: 'Tipo de relatório não reconhecido.' });
  }
});

// ==================== VITE MIDDLEWARE / STATIC ASSETS ====================

async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
