import { useCallback } from 'react';
import { doc, setDoc } from 'firebase/firestore';
import { db } from '../lib/firebase.js';
import { useAuth } from '../context/AuthContext.js';
import { isAdmin } from '../utils/admin.js';
import { AuditLog } from '../types.js';

export interface AdminAuditEntry {
  acao: string;
  tipoEntidade: 'Equipe' | 'Tarefa' | 'Participante' | 'Jogo' | 'Documento' | 'Prompt' | 'Categoria' | 'Sistema' | string;
  entidadeId: string;
  registroAfetado: string;
  moduloAfetado?: 'Tarefas' | 'Jogos' | 'Prompts' | 'Documentos' | 'Participantes' | 'Equipes' | 'Experimentos' | 'Testes' | string;
  alteracaoRealizada?: string;
  detalhes?: {
    campoAlterado?: string;
    valorAnterior?: string;
    novoValor?: string;
    descricaoCurta?: string;
    [key: string]: any;
  };
}

/**
 * Administrative utility hook that logs sensitive operations (deletion of teams, tasks, users, etc.)
 * directly to the dedicated Firestore collection 'audit_logs' to ensure traceability and audit compliance.
 */
export function useAdminAudit() {
  const { currentUser, firebaseUser } = useAuth();

  const logAdminAction = useCallback(
    async (entry: AdminAuditEntry): Promise<AuditLog | null> => {
      try {
        const timestamp = Date.now();
        const dateObj = new Date(timestamp);
        const dateStr = dateObj.toISOString().split('T')[0];
        const timeStr = dateObj.toTimeString().split(' ')[0].substring(0, 5);

        const logId = `audit_${timestamp}_${Math.random().toString(36).substring(2, 7)}`;
        const userIsAdmin = isAdmin(currentUser) || (firebaseUser?.email || '').toLowerCase() === 'paulocauan39@gmail.com';

        const auditData: AuditLog = {
          id: logId,
          usuarioId: currentUser?.id || firebaseUser?.uid || 'admin_user',
          usuarioNome: currentUser?.nome || firebaseUser?.displayName || firebaseUser?.email || 'Administrador',
          usuarioRole: (userIsAdmin ? 'admin' : (currentUser?.funcao || 'aluno')) as any,
          acao: entry.acao,
          registroAfetado: entry.registroAfetado,
          tipoEntidade: entry.tipoEntidade,
          entidadeId: entry.entidadeId,
          moduloAfetado: entry.moduloAfetado || (entry.tipoEntidade as any),
          alteracaoRealizada: entry.alteracaoRealizada || `Operação administrativa [${entry.acao}] executada no registro ${entry.registroAfetado}.`,
          detalhes: entry.detalhes,
          data: dateStr,
          horario: timeStr,
          timestamp,
        };

        // Write directly to the dedicated Firestore collection 'audit_logs'
        try {
          const docRef = doc(db, 'audit_logs', logId);
          await setDoc(docRef, auditData);
          console.log(`[useAdminAudit] Log gravado com sucesso em 'audit_logs':`, logId, auditData.acao);
        } catch (firestoreErr: any) {
          console.warn(`[useAdminAudit] Aviso ao gravar em 'audit_logs':`, firestoreErr?.code || firestoreErr?.message || firestoreErr);
        }

        // Also write to 'auditLogs' for backward-compatible dashboard feed if needed
        try {
          const legacyDocRef = doc(db, 'auditLogs', logId);
          await setDoc(legacyDocRef, auditData);
        } catch (legacyErr: any) {
          // Ignored
        }

        return auditData;
      } catch (err) {
        console.error('[useAdminAudit] Erro inesperado ao registrar log de auditoria:', err);
        return null;
      }
    },
    [currentUser, firebaseUser]
  );

  /**
   * Helper method specifically for recording deletions of sensitive records (teams, tasks, users, etc.)
   */
  const logDeletion = useCallback(
    async (
      tipoEntidade: 'Equipe' | 'Tarefa' | 'Participante' | 'Jogo' | 'Documento' | 'Prompt' | string,
      entidadeId: string,
      nomeRegistro: string,
      extraDetails?: string
    ) => {
      return logAdminAction({
        acao: `Exclusão de ${tipoEntidade}`,
        tipoEntidade,
        entidadeId,
        registroAfetado: nomeRegistro,
        moduloAfetado: tipoEntidade === 'Equipe' ? 'Equipes' : tipoEntidade === 'Tarefa' ? 'Tarefas' : tipoEntidade === 'Participante' ? 'Participantes' : (tipoEntidade as any),
        alteracaoRealizada: extraDetails || `Exclusão definitiva de ${tipoEntidade.toLowerCase()} "${nomeRegistro}" realizada por administrador.`,
        detalhes: {
          descricaoCurta: `Registro excluído permanentemente (${tipoEntidade}: ${nomeRegistro})`,
        },
      });
    },
    [logAdminAction]
  );

  /**
   * Helper method for recording edits/modifications
   */
  const logEdit = useCallback(
    async (
      tipoEntidade: 'Equipe' | 'Tarefa' | 'Participante' | 'Jogo' | 'Documento' | 'Prompt' | string,
      entidadeId: string,
      nomeRegistro: string,
      changesSummary: string,
      detalhes?: any
    ) => {
      return logAdminAction({
        acao: `Edição de ${tipoEntidade}`,
        tipoEntidade,
        entidadeId,
        registroAfetado: nomeRegistro,
        moduloAfetado: tipoEntidade === 'Equipe' ? 'Equipes' : tipoEntidade === 'Tarefa' ? 'Tarefas' : tipoEntidade === 'Participante' ? 'Participantes' : (tipoEntidade as any),
        alteracaoRealizada: changesSummary,
        detalhes,
      });
    },
    [logAdminAction]
  );

  return {
    logAdminAction,
    logDeletion,
    logEdit,
  };
}
