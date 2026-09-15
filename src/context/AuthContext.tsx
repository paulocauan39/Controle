import React, { createContext, useContext, useEffect, useState, useMemo } from 'react';
import { onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import { Participant, UserRole } from '../types.js';
import { api, getStoredUserId, setStoredUserId } from '../services/api.js';
import {
  auth,
  loginWithGoogle as firebaseGoogleLogin,
  logoutFirebase,
  getParticipantFromFirestore,
  syncParticipantToFirestore,
} from '../lib/firebase.js';

interface AuthContextType {
  currentUser: Participant | null;
  firebaseUser: FirebaseUser | null;
  usersList: Participant[];
  isInitialized: boolean;
  isLoading: boolean;
  loading: boolean;
  needsSetup: boolean;
  switchUser: (userId: string) => Promise<void>;
  signInWithGoogle: () => Promise<Participant>;
  logout: () => Promise<void>;
  refreshUsers: () => Promise<void>;
  refreshAuth: () => Promise<void>;
  setupInitialUser: (data: { nome: string; email: string; funcao: UserRole; dataEntrada?: string }) => Promise<void>;
  roleLabel: string;
  isAdmin: boolean;
  isCoordenadorAluno: boolean;
  isProfessorOrientador: boolean;
  isProfessorColaborador: boolean;
  isAluno: boolean;
  canManageAdmin: boolean;
  canRegisterExperiments: boolean;
  canSubmitEvaluations: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [currentUser, setCurrentUser] = useState<Participant | null>(null);
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [usersList, setUsersList] = useState<Participant[]>([]);
  const [isInitialized, setIsInitialized] = useState<boolean>(true);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Sync Firebase Auth state listener as primary source of truth
  useEffect(() => {
    let isMounted = true;

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      console.log('[AuthFlow] 1. onAuthStateChanged triggered:', user ? { uid: user.uid, email: user.email, displayName: user.displayName } : null);
      setFirebaseUser(user);

      if (user && user.email) {
        setIsLoading(true);
        try {
          // 1. Check custom claims from Firebase Auth token
          let hasAdminClaim = false;
          try {
            const tokenResult = await user.getIdTokenResult();
            hasAdminClaim = Boolean(
              tokenResult?.claims?.admin === true ||
              tokenResult?.claims?.role === 'admin' ||
              tokenResult?.claims?.isAdmin === true
            );
          } catch (claimErr) {
            console.warn('[AuthFlow] Token claims inspection notice:', claimErr);
          }

          // 2. Fetch participant profile if any from Firestore
          let firestoreParticipant: Participant | null = null;
          try {
            console.log('[AuthFlow] 2. Starting Firestore fetch for user profile...', { uid: user.uid, email: user.email });
            firestoreParticipant = await getParticipantFromFirestore(user.uid, user.email);
            console.log('[AuthFlow] 3. Result of Firestore fetch:', firestoreParticipant);
          } catch (firestoreErr: any) {
            console.error('[AuthFlow] 3. Error during Firestore fetch (handled without dropping session):', firestoreErr?.code || firestoreErr?.message || firestoreErr);
          }

          if (isMounted) {
            const isPaulo = (user.email || '').toLowerCase().trim() === 'paulocauan39@gmail.com';
            const hasAdminDocField = Boolean(
              firestoreParticipant?.funcao === 'admin' ||
              firestoreParticipant?.isAdmin === true ||
              (firestoreParticipant as any)?.admin === true ||
              (firestoreParticipant as any)?.role === 'admin' ||
              firestoreParticipant?.roles?.includes('admin')
            );
            const isAdminUser = hasAdminClaim || hasAdminDocField || isPaulo;

            const existingRoles = firestoreParticipant?.roles || [firestoreParticipant?.funcao || (isPaulo ? 'coordenador_aluno' : 'aluno')];
            const finalRoles = isAdminUser && !existingRoles.includes('admin') ? [...existingRoles, 'admin' as UserRole] : existingRoles;

            const finalParticipant: Participant = {
              id: firestoreParticipant?.id || user.uid,
              nome: firestoreParticipant?.nome || user.displayName || (user.email ? user.email.split('@')[0] : 'Usuário'),
              email: user.email,
              funcao: firestoreParticipant?.funcao || (isPaulo ? 'coordenador_aluno' : 'aluno'),
              isAdmin: isAdminUser,
              roles: finalRoles,
              status: firestoreParticipant?.status || 'Ativo',
              dataEntrada: firestoreParticipant?.dataEntrada || new Date().toISOString().split('T')[0],
              createdAt: firestoreParticipant?.createdAt || new Date().toISOString(),
              ...(firestoreParticipant?.equipeId ? { equipeId: firestoreParticipant.equipeId } : {}),
              ...(firestoreParticipant?.equipeNome ? { equipeNome: firestoreParticipant.equipeNome } : {}),
            };

            setStoredUserId(finalParticipant.id);
            console.log('[AuthFlow] 4. Final setting of user state (currentUser):', finalParticipant);
            setCurrentUser(finalParticipant);

            // Update users list in background
            api.getUsers()
              .then((allUsers) => {
                if (isMounted) setUsersList(allUsers);
              })
              .catch((e) => {
                console.warn('[AuthFlow] Atualização da lista de usuários:', e);
              });

            // 3. Persist in Firestore (non-blocking)
            syncParticipantToFirestore(finalParticipant, user.uid).catch((err) => {
              console.warn('[AuthFlow] Falha silenciosa ao sincronizar Firestore:', err);
            });
          }
        } catch (err) {
          console.error('[AuthFlow] Erro ao sincronizar sessão autenticada:', err);
        } finally {
          if (isMounted) {
            setIsLoading(false);
          }
        }
      } else {
        // Firebase Auth reports no active Firebase user
        console.log('[AuthFlow] No active Firebase Auth user. Fetching initial local status...');
        try {
          const status = await api.getAuthStatus();
          if (isMounted) setIsInitialized(status.initialized);

          if (status.initialized) {
            const allUsers = await api.getUsers();
            if (isMounted) setUsersList(allUsers);

            const savedId = getStoredUserId();
            const matched = savedId ? allUsers.find((u: Participant) => u.id === savedId) : null;
            if (isMounted) {
              console.log('[AuthFlow] Setting state for local user session:', matched);
              setCurrentUser(matched || null);
            }
          } else {
            if (isMounted) {
              console.log('[AuthFlow] System not initialized, clearing currentUser.');
              setCurrentUser(null);
              setUsersList([]);
            }
          }
        } catch (err) {
          console.warn('[AuthFlow] Verificação de estado inicial:', err);
        } finally {
          if (isMounted) {
            setIsLoading(false);
          }
        }
      }
    });

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, []);

  const refreshUsers = async () => {
    try {
      const status = await api.getAuthStatus();
      setIsInitialized(status.initialized);

      if (!status.initialized) {
        setUsersList([]);
        return;
      }

      const users = await api.getUsers();
      setUsersList(users);

      const savedId = getStoredUserId();
      if (savedId) {
        const matched = users.find((u: Participant) => u.id === savedId);
        if (matched) {
          setCurrentUser((prev) => (prev ? { ...prev, ...matched } : matched));
        }
      }
    } catch (err) {
      console.error('Failed to load users/status', err);
    }
  };

  const signInWithGoogle = async (): Promise<Participant> => {
    setIsLoading(true);
    try {
      console.log('[AuthFlow] signInWithGoogle initiated...');
      const fbUser = await firebaseGoogleLogin();
      if (!fbUser || !fbUser.email) {
        throw new Error('Não foi possível obter os dados da conta Google.');
      }
      console.log('[AuthFlow] signInWithGoogle popup success:', { uid: fbUser.uid, email: fbUser.email });

      // Check custom claims & Firestore document
      let hasAdminClaim = false;
      try {
        const tokenResult = await fbUser.getIdTokenResult();
        hasAdminClaim = Boolean(
          tokenResult?.claims?.admin === true ||
          tokenResult?.claims?.role === 'admin' ||
          tokenResult?.claims?.isAdmin === true
        );
      } catch (claimErr) {
        console.warn('[AuthFlow] Token claims inspection notice in signInWithGoogle:', claimErr);
      }

      let firestoreParticipant: Participant | null = null;
      try {
        console.log('[AuthFlow] Starting Firestore fetch in signInWithGoogle...', { uid: fbUser.uid, email: fbUser.email });
        firestoreParticipant = await getParticipantFromFirestore(fbUser.uid, fbUser.email);
        console.log('[AuthFlow] Firestore fetch result in signInWithGoogle:', firestoreParticipant);
      } catch (fErr: any) {
        console.warn('[AuthFlow] Firestore fetch error in signInWithGoogle:', fErr?.code || fErr?.message || fErr);
      }

      const isPaulo = (fbUser.email || '').toLowerCase().trim() === 'paulocauan39@gmail.com';
      const hasAdminDocField = Boolean(
        firestoreParticipant?.funcao === 'admin' ||
        firestoreParticipant?.isAdmin === true ||
        (firestoreParticipant as any)?.admin === true ||
        (firestoreParticipant as any)?.role === 'admin' ||
        firestoreParticipant?.roles?.includes('admin')
      );
      const isAdminUser = hasAdminClaim || hasAdminDocField || isPaulo;

      const existingRoles = firestoreParticipant?.roles || [firestoreParticipant?.funcao || (isPaulo ? 'coordenador_aluno' : 'aluno')];
      const finalRoles = isAdminUser && !existingRoles.includes('admin') ? [...existingRoles, 'admin' as UserRole] : existingRoles;

      const finalParticipant: Participant = {
        id: firestoreParticipant?.id || fbUser.uid,
        nome: firestoreParticipant?.nome || fbUser.displayName || (fbUser.email ? fbUser.email.split('@')[0] : 'Usuário'),
        email: fbUser.email,
        funcao: firestoreParticipant?.funcao || (isPaulo ? 'coordenador_aluno' : 'aluno'),
        isAdmin: isAdminUser,
        roles: finalRoles,
        status: firestoreParticipant?.status || 'Ativo',
        dataEntrada: firestoreParticipant?.dataEntrada || new Date().toISOString().split('T')[0],
        createdAt: firestoreParticipant?.createdAt || new Date().toISOString(),
        ...(firestoreParticipant?.equipeId ? { equipeId: firestoreParticipant.equipeId } : {}),
        ...(firestoreParticipant?.equipeNome ? { equipeNome: firestoreParticipant.equipeNome } : {}),
      };

      setStoredUserId(finalParticipant.id);
      console.log('[AuthFlow] Final setting of user state in signInWithGoogle (currentUser):', finalParticipant);
      setCurrentUser(finalParticipant);

      // Sincronizar Firestore em segundo plano
      syncParticipantToFirestore(finalParticipant, fbUser.uid).catch((err) => {
        console.warn('[AuthFlow] Sincronização secundária Firestore pós-login:', err);
      });

      // Atualizar lista sem apagar o usuário atual
      api.getUsers().then((users) => {
        setUsersList(users);
      }).catch(console.warn);

      return finalParticipant;
    } catch (err: any) {
      if (err?.code !== 'auth/popup-closed-by-user' && err?.code !== 'auth/cancelled-popup-request') {
        console.error('[AuthFlow] Erro no login com Google:', err);
      }
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const switchUser = async (userId: string) => {
    const target = usersList.find(u => u.id === userId);
    if (target) {
      setStoredUserId(target.id);
      setCurrentUser(target);
    }
  };

  const logout = async () => {
    try {
      await api.logout();
    } catch (err) {
      console.error('Logout API error', err);
    }
    try {
      await logoutFirebase();
    } catch (err) {
      console.error('Logout Firebase error', err);
    }
    setStoredUserId('');
    setCurrentUser(null);
    setFirebaseUser(null);
  };

  const setupInitialUser = async (data: { nome: string; email: string; funcao: UserRole; dataEntrada?: string }) => {
    const created = await api.setupInitialUser(data);
    setStoredUserId(created.id);
    await refreshUsers();
  };

  const roleLabel = useMemo(() => {
    if (!currentUser) return '';
    const hasAdmin = currentUser.isAdmin || currentUser.roles?.includes('admin') || currentUser.funcao === 'admin';
    const isCoord = currentUser.funcao === 'coordenador_aluno' || currentUser.roles?.includes('coordenador_aluno');
    if (hasAdmin && isCoord) {
      return 'Coordenador Aluno & Administrador';
    }
    switch (currentUser.funcao) {
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
        return currentUser.funcao;
    }
  }, [currentUser]);

  const isAdmin = Boolean(
    currentUser?.funcao === 'admin' ||
    currentUser?.isAdmin === true ||
    currentUser?.roles?.includes('admin') ||
    currentUser?.email?.toLowerCase() === 'paulocauan39@gmail.com'
  );
  const isCoordenadorAluno = Boolean(currentUser?.funcao === 'coordenador_aluno' || currentUser?.roles?.includes('coordenador_aluno'));
  const isProfessorOrientador = currentUser?.funcao === 'professor_orientador';
  const isProfessorColaborador = currentUser?.funcao === 'professor_colaborador';
  const isAluno = currentUser?.funcao === 'aluno';

  // Administrador tem poderes de gestão total sobre todos os módulos
  const canManageAdmin = isAdmin || isCoordenadorAluno;
  const canRegisterExperiments = isAdmin || isCoordenadorAluno || isAluno;
  const canSubmitEvaluations = isAdmin || isCoordenadorAluno || isAluno;

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        firebaseUser,
        usersList,
        isInitialized,
        isLoading,
        loading: isLoading,
        needsSetup: !isInitialized,
        switchUser,
        signInWithGoogle,
        logout,
        refreshUsers,
        refreshAuth: refreshUsers,
        setupInitialUser,
        roleLabel,
        isAdmin,
        isCoordenadorAluno,
        isProfessorOrientador,
        isProfessorColaborador,
        isAluno,
        canManageAdmin,
        canRegisterExperiments,
        canSubmitEvaluations,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

