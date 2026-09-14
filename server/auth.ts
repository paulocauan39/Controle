import { Request, Response, NextFunction } from 'express';
import { db } from './db.js';
import { UserRole, Participant } from '../src/types.js';

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    nome: string;
    email: string;
    role: UserRole;
    isAdmin?: boolean;
    roles?: UserRole[];
    equipeId?: string;
  };
}

export function authMiddleware(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  let userId = req.headers['x-user-id'] as string;
  const data = db.getData();

  // Public/Setup routes that bypass user verification
  const publicPaths = [
    '/api/auth/status',
    '/api/auth/current',
    '/api/auth/users',
    '/api/auth/register',
    '/api/auth/login',
    '/api/auth/logout',
    '/api/setup/initial-user',
    '/api/setup/seed',
  ];

  if (publicPaths.includes(req.path)) {
    return next();
  }

  if (!userId) {
    return res.status(401).json({ error: 'Autenticação necessária. Faça login para acessar o sistema NexoIF.' });
  }

  let participant = data.participants.find(p => p.id === userId || (p.email && p.email.toLowerCase() === userId.toLowerCase()));
  if (!participant) {
    if (userId.includes('@') || userId.length >= 10) {
      const email = userId.includes('@') ? userId.toLowerCase() : `${userId}@nexoif.pclp.com.br`;
      participant = {
        id: userId,
        nome: userId.includes('@') ? userId.split('@')[0] : 'Pesquisador NexoIF',
        email,
        funcao: (email === 'paulocauan39@gmail.com' || userId.includes('coord')) ? 'coordenador_aluno' : 'aluno',
        status: 'Ativo',
        dataEntrada: new Date().toISOString().split('T')[0],
        createdAt: new Date().toISOString(),
      };
      data.participants.push(participant);
      db.save();
    } else {
      return res.status(401).json({ error: 'Sessão inválida ou expirada. Faça login novamente no NexoIF.' });
    }
  }

  if (participant.status === 'Inativo') {
    return res.status(403).json({ error: 'Este participante está desativado no projeto.' });
  }

  const isPaulo = participant.email?.toLowerCase() === 'paulocauan39@gmail.com';
  const isAdmin = participant.funcao === 'admin' || participant.isAdmin === true || participant.roles?.includes('admin') || isPaulo;

  req.user = {
    id: participant.id,
    nome: participant.nome,
    email: participant.email,
    role: participant.funcao,
    isAdmin,
    roles: participant.roles || (isAdmin ? [participant.funcao, 'admin'] : [participant.funcao]),
    equipeId: participant.equipeId,
  };

  next();
}

export function requireRoles(...allowedRoles: UserRole[]) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Autenticação necessária.' });
    }

    // Administrador possui poderes administrativos totais sobre o sistema
    if (req.user.isAdmin || req.user.role === 'admin' || req.user.roles?.includes('admin')) {
      return next();
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        error: `Acesso negado: Perfil '${getRoleLabel(req.user.role)}' não possui permissão para esta ação.`,
      });
    }

    next();
  };
}

export function getRoleLabel(role: UserRole): string {
  switch (role) {
    case 'admin':
      return 'Administrador';
    case 'coordenador_aluno':
      return 'Coordenador Aluno';
    case 'professor_orientador':
      return 'Professor Orientador';
    case 'professor_colaborador':
      return 'Professor Colaborador';
    case 'aluno':
      return 'Aluno';
    default:
      return role;
  }
}
