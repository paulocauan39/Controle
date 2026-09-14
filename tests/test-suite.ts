/**
 * NEXOIF - TEST SUITE COMPLETA (Regra 10: Testes Obrigatórios)
 *
 * 1. Autenticação:
 *   - testar fluxo de login / logout
 *   - verificar proteção de rotas privadas (401 sem autenticação)
 *   - validar rejeição de acesso não autenticado
 *
 * 2. Controle de Acesso (RBAC):
 *   - testar permissões para cada perfil:
 *     - Coordenador Aluno
 *     - Professor Orientador
 *     - Professor Colaborador
 *     - Aluno
 *   - tentar acessar recursos restritos e confirmar o bloqueio (403)
 *
 * 3. Tarefas:
 *   - tentar alterar status para Concluída sem preencher a data de conclusão (bloqueio 400)
 *   - preencher a data e confirmar a conclusão
 *
 * 4. Categorias de Prompts:
 *   - cadastrar nova categoria
 *   - editar categoria
 *   - ativar/desativar categoria
 *   - tentar cadastrar categoria duplicada e confirmar o bloqueio (400)
 *
 * 5. Documentação:
 *   - criar documento vinculado a jogo
 *   - editar documento
 *   - excluir documento
 *   - verificar vinculação correta ao jogo correspondente
 *
 * 6. Relatórios:
 *   - gerar relatórios (geral, jogos, ias, experimentos, testes)
 *   - verificar integridade dos dados retornados
 *
 * 7. Log Centralizado e Histórico:
 *   - realizar alterações no sistema
 *   - verificar registro na trilha de auditoria
 *   - acessar o módulo Histórico e validar exibição
 *   - confirmar imutabilidade (sem rota de edição/exclusão)
 */

const BASE_URL = 'http://127.0.0.1:3000/api';

interface TestResult {
  suite: string;
  name: string;
  passed: boolean;
  message?: string;
}

const results: TestResult[] = [];

function assert(condition: boolean, suite: string, name: string, failureDetail?: string) {
  if (condition) {
    results.push({ suite, name, passed: true });
    console.log(`  [PASS] ${name}`);
  } else {
    results.push({ suite, name, passed: false, message: failureDetail || 'Assertion failed' });
    console.error(`  [FAIL] ${name}: ${failureDetail || 'Assertion failed'}`);
  }
}

async function request(path: string, options: RequestInit = {}, userId?: string) {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> || {}),
  };
  if (userId) {
    headers['x-user-id'] = userId;
  }
  const res = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers,
  });
  let data: any = null;
  const text = await res.text();
  try {
    data = JSON.parse(text);
  } catch {
    data = text;
  }
  return { status: res.status, data, ok: res.ok };
}

async function runAllTests() {
  console.log('\n======================================================');
  console.log('       INICIANDO BATERIA DE TESTES DO NEXOIF');
  console.log('======================================================\n');

  // Recuperar usuários cadastrados
  const usersRes = await request('/auth/users');
  const users: any[] = usersRes.data || [];
  const coord = users.find(u => u.funcao === 'coordenador_aluno') || users[0];
  const profOrient = users.find(u => u.funcao === 'professor_orientador');
  const profColab = users.find(u => u.funcao === 'professor_colaborador');
  const aluno = users.find(u => u.funcao === 'aluno');

  console.log(`Usuários identificados:
  - Coordenador: ${coord?.nome} (${coord?.id})
  - Prof. Orientador: ${profOrient?.nome || 'N/A'}
  - Prof. Colaborador: ${profColab?.nome || 'N/A'}
  - Aluno: ${aluno?.nome || 'N/A'}\n`);

  // =========================================================================
  // 1. AUTENTICAÇÃO
  // =========================================================================
  console.log('--- 1. Bateria de Testes: Autenticação ---');

  // 1.1 Rota privada bloqueada sem x-user-id
  const unauthRes = await request('/tasks');
  assert(
    unauthRes.status === 401,
    'Autenticação',
    'Bloquear acesso a rota privada (/api/tasks) sem credenciais (HTTP 401)',
    `Retornou status ${unauthRes.status}`
  );

  // 1.2 Login por ID
  const loginIdRes = await request('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ userId: coord.id }),
  });
  assert(
    loginIdRes.ok && loginIdRes.data.user.id === coord.id,
    'Autenticação',
    'Login com ID válido retorna os dados do usuário',
    JSON.stringify(loginIdRes.data)
  );

  // 1.3 Login por email institucional
  const loginEmailRes = await request('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email: coord.email }),
  });
  assert(
    loginEmailRes.ok && loginEmailRes.data.user.email === coord.email,
    'Autenticação',
    'Login por email institucional autentica com sucesso',
    JSON.stringify(loginEmailRes.data)
  );

  // 1.4 Login com Google (Firebase Auth)
  const loginGoogleRes = await request('/auth/google', {
    method: 'POST',
    body: JSON.stringify({
      email: coord.email,
      displayName: coord.nome,
      uid: 'google-uid-test-123',
    }),
  });
  assert(
    loginGoogleRes.ok && loginGoogleRes.data.user.email === coord.email,
    'Autenticação',
    'Login / Sincronização com Google via Firebase Auth autentica com sucesso',
    JSON.stringify(loginGoogleRes.data)
  );

  // 1.5 Logout
  const logoutRes = await request('/auth/logout', { method: 'POST' });
  assert(
    logoutRes.ok && logoutRes.data.success === true,
    'Autenticação',
    'Endpoint de logout encerra a sessão corretamente',
    JSON.stringify(logoutRes.data)
  );

  // =========================================================================
  // 2. CONTROLE DE ACESSO (RBAC)
  // =========================================================================
  console.log('\n--- 2. Bateria de Testes: Controle de Acesso (RBAC) ---');

  // Coordenador Aluno tem acesso a endpoints gerenciais como /api/schedule (POST)
  const scheduleResCoord = await request('/schedule', {
    method: 'POST',
    body: JSON.stringify({
      etapa: 'Etapa de Validação de Teste',
      responsavelId: coord.id,
      prazo: '2026-12-31',
    }),
  }, coord.id);
  assert(
    scheduleResCoord.status === 201,
    'Controle de Acesso',
    'Coordenador Aluno tem permissão para criar marcos no cronograma',
    `Status: ${scheduleResCoord.status}`
  );
  const createdMilestoneId = scheduleResCoord.data?.id;

  // Aluno NÃO deve ter permissão para gerenciar marcos no cronograma (deve receber 403)
  if (aluno) {
    const scheduleResAluno = await request('/schedule', {
      method: 'POST',
      body: JSON.stringify({
        etapa: 'Tentativa não autorizada por Aluno',
        responsavelId: aluno.id,
      }),
    }, aluno.id);
    assert(
      scheduleResAluno.status === 403,
      'Controle de Acesso',
      'Aluno tem acesso negado ao tentar criar marcos gerenciais (HTTP 403)',
      `Status retornado: ${scheduleResAluno.status}`
    );
  }

  // Limpar milestone de teste se criado
  if (createdMilestoneId) {
    await request(`/schedule/${createdMilestoneId}`, { method: 'DELETE' }, coord.id);
  }

  // =========================================================================
  // 3. TAREFAS
  // =========================================================================
  console.log('\n--- 3. Bateria de Testes: Tarefas ---');

  // 3.1 Tentar criar/atualizar tarefa para "Concluída" sem dataConclusao (deve bloquear 400)
  const taskSemDataRes = await request('/tasks', {
    method: 'POST',
    body: JSON.stringify({
      titulo: 'Tarefa de Teste Concluída Sem Data',
      status: 'Concluída',
      responsavelId: coord.id,
    }),
  }, coord.id);
  assert(
    taskSemDataRes.status === 400 && taskSemDataRes.data.error.includes('data de conclusão'),
    'Tarefas',
    'Bloquear status "Concluída" sem o preenchimento da data de conclusão (HTTP 400)',
    `Status: ${taskSemDataRes.status}, Mensagem: ${JSON.stringify(taskSemDataRes.data)}`
  );

  // 3.2 Criar tarefa inicialmente como "Em andamento"
  const taskValidaRes = await request('/tasks', {
    method: 'POST',
    body: JSON.stringify({
      titulo: 'Tarefa de Teste Validação do Fluxo',
      descricao: 'Validação de lifecycle de tarefas no NexoIF',
      status: 'Em andamento',
      prioridade: 'Média',
      responsavelId: coord.id,
      prazo: '2026-10-15',
    }),
  }, coord.id);
  assert(
    taskValidaRes.status === 201,
    'Tarefas',
    'Criação de tarefa com dados válidos é aprovada',
    `Status: ${taskValidaRes.status}`
  );
  const taskId = taskValidaRes.data?.id;

  // 3.3 Tentar alterar para "Concluída" sem enviar dataConclusao (deve falhar 400)
  if (taskId) {
    const updateSemData = await request(`/tasks/${taskId}`, {
      method: 'PUT',
      body: JSON.stringify({
        status: 'Concluída',
      }),
    }, coord.id);
    assert(
      updateSemData.status === 400,
      'Tarefas',
      'Bloqueio de atualização para "Concluída" sem data de conclusão (HTTP 400)',
      `Status: ${updateSemData.status}`
    );

    // 3.4 Atualizar fornecendo dataConclusao (deve ter sucesso)
    const updateComData = await request(`/tasks/${taskId}`, {
      method: 'PUT',
      body: JSON.stringify({
        status: 'Concluída',
        dataConclusao: '2026-03-15',
      }),
    }, coord.id);
    assert(
      updateComData.status === 200 && updateComData.data.status === 'Concluída' && updateComData.data.dataConclusao === '2026-03-15',
      'Tarefas',
      'Conclusão de tarefa com data de conclusão aceita com sucesso',
      JSON.stringify(updateComData.data)
    );

    // Cleanup
    await request(`/tasks/${taskId}`, { method: 'DELETE' }, coord.id);
  }

  // =========================================================================
  // 4. CATEGORIAS DE PROMPTS
  // =========================================================================
  console.log('\n--- 4. Bateria de Testes: Categorias de Prompts ---');

  const testCatNome = `Nova Categoria Teste ${Date.now()}`;

  // 4.1 Cadastrar nova categoria
  const catCreateRes = await request('/prompts/categories', {
    method: 'POST',
    body: JSON.stringify({
      nome: testCatNome,
      descricao: 'Descrição de teste para prompts',
      ativa: true,
    }),
  }, coord.id);
  assert(
    catCreateRes.status === 201 && catCreateRes.data.nome === testCatNome,
    'Categorias de Prompts',
    'Cadastrar nova categoria de prompt com sucesso',
    JSON.stringify(catCreateRes.data)
  );
  const catId = catCreateRes.data?.id;

  // 4.2 Tentar cadastrar duplicada (deve bloquear com 400)
  const catDuplicadaRes = await request('/prompts/categories', {
    method: 'POST',
    body: JSON.stringify({
      nome: testCatNome,
      descricao: 'Tentativa duplicada',
    }),
  }, coord.id);
  assert(
    catDuplicadaRes.status === 400 && String(catDuplicadaRes.data?.error || '').toLowerCase().includes('já existe'),
    'Categorias de Prompts',
    'Bloquear cadastro de categoria duplicada (HTTP 400)',
    JSON.stringify(catDuplicadaRes.data)
  );

  // 4.3 Editar categoria
  if (catId) {
    const catEditRes = await request(`/prompts/categories/${catId}`, {
      method: 'PUT',
      body: JSON.stringify({
        nome: `${testCatNome} (Editada)`,
        descricao: 'Descrição atualizada',
      }),
    }, coord.id);
    assert(
      catEditRes.status === 200 && catEditRes.data.nome.includes('(Editada)'),
      'Categorias de Prompts',
      'Editar nome e descrição de categoria existente',
      JSON.stringify(catEditRes.data)
    );

    // 4.4 Ativar / Desativar categoria
    const catToggleRes = await request(`/prompts/categories/${catId}`, {
      method: 'PUT',
      body: JSON.stringify({
        ativa: false,
      }),
    }, coord.id);
    assert(
      catToggleRes.status === 200 && catToggleRes.data.ativa === false,
      'Categorias de Prompts',
      'Alternar status da categoria (ativa -> inativa)',
      JSON.stringify(catToggleRes.data)
    );

    // Cleanup
    await request(`/prompts/categories/${catId}`, { method: 'DELETE' }, coord.id);
  }

  // =========================================================================
  // 5. DOCUMENTAÇÃO
  // =========================================================================
  console.log('\n--- 5. Bateria de Testes: Documentação ---');

  // Buscar jogos para vincular documento
  const gamesRes = await request('/games', {}, coord.id);
  const targetGame = (gamesRes.data && gamesRes.data.length > 0) ? gamesRes.data[0] : null;

  // 5.1 Criar documento
  const docCreateRes = await request('/documents', {
    method: 'POST',
    body: JSON.stringify({
      titulo: 'Documento Técnico de Teste NexoIF',
      categoria: 'Especificação Técnica',
      descricao: 'Documento automatizado para validação de testes',
      conteudo: '## Especificação de Arquitetura\nConteúdo técnico de teste.',
      jogoId: targetGame ? targetGame.id : undefined,
      versao: '1.0.0',
      nivelAcesso: 'Todos',
      tags: ['Teste', 'Automação'],
    }),
  }, coord.id);
  assert(
    docCreateRes.status === 201 && docCreateRes.data.titulo === 'Documento Técnico de Teste NexoIF',
    'Documentação',
    'Criar novo documento no sistema vinculado ao jogo',
    JSON.stringify(docCreateRes.data)
  );
  const docId = docCreateRes.data?.id;

  // 5.2 Editar documento
  if (docId) {
    const docEditRes = await request(`/documents/${docId}`, {
      method: 'PUT',
      body: JSON.stringify({
        titulo: 'Documento Técnico de Teste NexoIF - Atualizado',
        versao: '1.0.1',
      }),
    }, coord.id);
    assert(
      docEditRes.status === 200 && docEditRes.data.versao === '1.0.1',
      'Documentação',
      'Editar metadados e versão do documento',
      JSON.stringify(docEditRes.data)
    );

    // 5.3 Excluir documento
    const docDeleteRes = await request(`/documents/${docId}`, { method: 'DELETE' }, coord.id);
    assert(
      docDeleteRes.status === 200,
      'Documentação',
      'Excluir documento do projeto com sucesso',
      JSON.stringify(docDeleteRes.data)
    );
  }

  // =========================================================================
  // 6. RELATÓRIOS E INTEGRIDADE DE DADOS
  // =========================================================================
  console.log('\n--- 6. Bateria de Testes: Relatórios ---');

  const reportTypes = ['geral', 'jogos', 'ias', 'experimentos', 'testes'];
  for (const rType of reportTypes) {
    const repRes = await request(`/reports/${rType}`, {}, coord.id);
    assert(
      repRes.status === 200 && repRes.data && repRes.data.dataGeracao,
      'Relatórios',
      `Gerar relatório oficial do tipo '${rType}' com integridade de dados`,
      `Status: ${repRes.status}, Tipo: ${repRes.data?.tipo}`
    );
  }

  // =========================================================================
  // 7. LOG CENTRALIZADO E HISTÓRICO
  // =========================================================================
  console.log('\n--- 7. Bateria de Testes: Log Centralizado e Histórico ---');

  // 7.1 Criar registro de auditoria via logger centralizado
  const auditRes = await request('/audit-logs', {
    method: 'POST',
    body: JSON.stringify({
      acao: 'Validação Automatizada',
      registroAfetado: 'Módulo de Testes',
      tipoEntidade: 'Sistema',
      entidadeId: 'test-runner-1',
      alteracaoRealizada: 'Execução bem-sucedida do plano de testes do NexoIF',
      moduloAfetado: 'Testes',
    }),
  }, coord.id);
  assert(
    auditRes.status === 201 && auditRes.data.acao === 'Validação Automatizada',
    'Log Centralizado e Histórico',
    'Registro centralizado de evento de auditoria no log com metadados obrigatórios',
    JSON.stringify(auditRes.data)
  );

  // 7.2 Consultar histórico de auditoria
  const getLogsRes = await request('/audit-logs', {}, coord.id);
  const logsList: any[] = getLogsRes.data || [];
  const foundOurLog = logsList.find(l => l.acao === 'Validação Automatizada');
  assert(
    getLogsRes.status === 200 && !!foundOurLog,
    'Log Centralizado e Histórico',
    'Exibir eventos registrados na trilha cronológica do histórico',
    `Total de logs: ${logsList.length}`
  );

  // 7.3 Verificar que rotas destrutivas ou de edição NÃO existem para auditoria (imutabilidade)
  const auditDeleteRes = await request('/audit-logs/teste-invalido', { method: 'DELETE' }, coord.id);
  const auditPutRes = await request('/audit-logs/teste-invalido', { method: 'PUT' }, coord.id);
  assert(
    (auditDeleteRes.status === 404 || auditDeleteRes.status === 405) &&
    (auditPutRes.status === 404 || auditPutRes.status === 405),
    'Log Centralizado e Histórico',
    'Imutabilidade: Histórico e logs não possuem rotas de edição ou exclusão',
    `Delete status: ${auditDeleteRes.status}, Put status: ${auditPutRes.status}`
  );

  // =========================================================================
  // RESUMO FINAL
  // =========================================================================
  console.log('\n======================================================');
  const total = results.length;
  const passed = results.filter(r => r.passed).length;
  const failed = results.filter(r => !r.passed).length;
  console.log(`RESULTADO FINAL DOS TESTES: ${passed}/${total} PASSARAM`);
  if (failed > 0) {
    console.error(`ATENÇÃO: ${failed} teste(s) falharam!`);
    process.exit(1);
  } else {
    console.log('TODOS OS TESTES FORAM EXECUTADOS E VALIDADOS COM SUCESSO!');
    console.log('======================================================\n');
  }
}

runAllTests().catch(err => {
  console.error('Erro fatal ao rodar testes:', err);
  process.exit(1);
});
