import { api } from './api.js';
import { AuditLog } from '../types.js';

export interface LogEntryPayload {
  acao: string;
  registroAfetado: string;
  tipoEntidade?: string;
  entidadeId?: string;
  alteracaoRealizada?: string;
  moduloAfetado?: string;
  detalhes?: {
    campoAlterado?: string;
    valorAnterior?: string;
    novoValor?: string;
    descricaoCurta?: string;
  };
}

/**
 * Serviço centralizado de auditoria e logging de alterações do NexoIF.
 * Registra eventos e modificações em conformidade com as regras de governança do projeto.
 */
class CentralizedAuditLogger {
  /**
   * Registra uma alteração de forma centralizada.
   */
  async log(entry: LogEntryPayload): Promise<AuditLog | null> {
    try {
      return await api.createAuditLog(entry);
    } catch (err) {
      console.warn('Centralized audit log error:', err);
      return null;
    }
  }

  /**
   * Recupera a trilha completa de auditoria cronológica imutável.
   */
  async getLogs(): Promise<AuditLog[]> {
    return api.getAuditLogs();
  }
}

export const logger = new CentralizedAuditLogger();
