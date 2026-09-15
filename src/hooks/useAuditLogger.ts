import { useCallback } from 'react';
import { doc, setDoc } from 'firebase/firestore';
import { db } from '../lib/firebase.js';
import { useAuth } from '../context/AuthContext.js';
import { isAdmin } from '../utils/admin.js';
import { AuditLog, UserRole } from '../types.js';

export interface AuditLoggerEntry {
  acao: string;
  tipoEntidade: 'usuarios' | 'participants' | 'teams' | 'games' | 'tasks' | 'ais' | 'experiments' | 'prompts' | 'promptCategories' | 'documents' | 'Equipe' | 'Tarefa' | 'Participante' | 'Jogo' | 'Documento' | 'Prompt' | 'Categoria' | 'Sistema' | string;
  entidadeId: string;
  registroAfetado: string;
  moduloAfetado?: 'Admin / Usuários' | 'Participantes' | 'Equipes' | 'Jogos' | 'Tarefas' | 'Prompts' | 'Documentos' | 'Experimentos' | 'Testes' | string;
  alteracaoRealizada?: string;
  detalhes?: {
    campoAlterado?: string;
    valorAnterior?: string;
    novoValor?: string;
    descricaoCurta?: string;
    motivo?: string;
    documentPath?: string;
    [key: string]: any;
  };
}

/**
 * Custom hook 'useAuditLogger' that writes directly to the 'audit_logs' collection in Firestore.
 * Ensures complete accountability for all administrative and data-altering operations (such as deleteDoc).
 */
export function useAuditLogger() {
  const { currentUser, firebaseUser } = useAuth();

  const logOperation = useCallback(
    async (entry: AuditLoggerEntry): Promise<AuditLog | null> => {
      try {
        const timestamp = Date.now();
        const dateObj = new Date(timestamp);
        const dateStr = dateObj.toISOString().split('T')[0];
        const timeStr = dateObj.toTimeString().split(' ')[0];

        const logId = `audit_${timestamp}_${Math.random().toString(36).substring(2, 7)}`;
        const userIsAdmin = isAdmin(currentUser) || (firebaseUser?.email || '').toLowerCase() === 'paulocauan39@gmail.com';

        const userId = currentUser?.id || firebaseUser?.uid || 'admin_user';
        const userEmail = currentUser?.email || firebaseUser?.email || '';
        const userName = currentUser?.nome || firebaseUser?.displayName || userEmail || 'Administrador';
        const userRole: UserRole = (userIsAdmin ? 'admin' : (currentUser?.funcao || 'aluno')) as UserRole;

        const auditData: AuditLog = {
          id: logId,
          usuarioId: userId,
          usuarioNome: userName,
          usuarioRole: userRole,
          acao: entry.acao,
          registroAfetado: entry.registroAfetado,
          tipoEntidade: entry.tipoEntidade,
          entidadeId: entry.entidadeId,
          moduloAfetado: entry.moduloAfetado || (entry.tipoEntidade as any),
          alteracaoRealizada: entry.alteracaoRealizada || `Operação [${entry.acao}] executada no registro "${entry.registroAfetado}" (${entry.tipoEntidade}).`,
          detalhes: {
            ...entry.detalhes,
            executorEmail: userEmail,
            executorUid: userId,
            executorRole: userRole,
            documentPath: entry.detalhes?.documentPath || `${entry.tipoEntidade}/${entry.entidadeId}`,
            timestampISO: dateObj.toISOString(),
          },
          data: dateStr,
          horario: timeStr,
          timestamp,
        };

        // Write directly to 'audit_logs' in Firestore
        try {
          const docRef = doc(db, 'audit_logs', logId);
          await setDoc(docRef, auditData);
        } catch (err: any) {
          console.warn(`[useAuditLogger] Aviso ao gravar em 'audit_logs':`, err?.code || err?.message || err);
        }

        // Secondary fallback to 'auditLogs' for backward compatibility
        try {
          const legacyRef = doc(db, 'auditLogs', logId);
          await setDoc(legacyRef, auditData);
        } catch {}

        return auditData;
      } catch (err) {
        console.error('[useAuditLogger] Erro ao registrar log de auditoria no Firestore:', err);
        return null;
      }
    },
    [currentUser, firebaseUser]
  );

  /**
   * Specifically logs 'deleteDoc' operations performed by users with the admin role.
   */
  const logDeletion = useCallback(
    async (
      tipoEntidade: string,
      entidadeId: string,
      nomeRegistro: string,
      extraDetails?: string,
      detalhes?: any
    ) => {
      return logOperation({
        acao: `deleteDoc: Exclusão de ${tipoEntidade}`,
        tipoEntidade,
        entidadeId,
        registroAfetado: nomeRegistro,
        moduloAfetado: tipoEntidade === 'usuarios' || tipoEntidade === 'Participante' ? 'Admin / Usuários' : (tipoEntidade as any),
        alteracaoRealizada: extraDetails || `Exclusão permanente (deleteDoc) do documento "${nomeRegistro}" (ID: ${entidadeId}) executada por usuário com privilégio de administrador.`,
        detalhes: {
          ...detalhes,
          operationType: 'deleteDoc',
          entidadeId,
          nomeRegistro,
        },
      });
    },
    [logOperation]
  );

  /**
   * Specifically logs update / edit operations.
   */
  const logEdit = useCallback(
    async (
      tipoEntidade: string,
      entidadeId: string,
      nomeRegistro: string,
      changesSummary: string,
      detalhes?: any
    ) => {
      return logOperation({
        acao: `Edição de ${tipoEntidade}`,
        tipoEntidade,
        entidadeId,
        registroAfetado: nomeRegistro,
        moduloAfetado: tipoEntidade === 'usuarios' || tipoEntidade === 'Participante' ? 'Admin / Usuários' : (tipoEntidade as any),
        alteracaoRealizada: changesSummary,
        detalhes,
      });
    },
    [logOperation]
  );

  /**
   * General admin action logger.
   */
  const logAdminAction = useCallback(
    async (entry: AuditLoggerEntry) => {
      return logOperation(entry);
    },
    [logOperation]
  );

  return {
    logOperation,
    logDeletion,
    logEdit,
    logAdminAction,
  };
}
