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

  // Sync Firebase Auth state listener
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setFirebaseUser(user);
      if (user && user.email) {
        try {
          // 1. Try querying Firestore for the participant's assigned role and details
          const firestoreParticipant = await getParticipantFromFirestore(user.email);

          // 2. Synchronize with backend API to ensure user is registered in project data
          const res = await api.loginWithGoogle({
            email: user.email,
            displayName: user.displayName,
            photoURL: user.photoURL,
            uid: user.uid,
          });

          if (res.user) {
            const finalParticipant: Participant = {
              ...res.user,
              // If firestore has a custom role override, respect it
              funcao: firestoreParticipant?.funcao || res.user.funcao,
              status: firestoreParticipant?.status || res.user.status,
            };

            setStoredUserId(finalParticipant.id);
            setCurrentUser(finalParticipant);

            // 3. Persist/update in Firestore collection
            await syncParticipantToFirestore(finalParticipant);
          }
        } catch (err) {
          console.error('Erro ao sincronizar usuário do Firebase com o Firestore:', err);
        }
      }
    });

    return () => unsubscribe();
  }, []);

  const refreshUsers = async () => {
    try {
      const status = await api.getAuthStatus();
      setIsInitialized(status.initialized);

      if (!status.initialized) {
        setCurrentUser(null);
        setUsersList([]);
        return;
      }

      const users = await api.getUsers();
      setUsersList(users);

      const savedId = getStoredUserId();
      const matched = savedId ? users.find((u: Participant) => u.id === savedId) : null;

      if (savedId && !matched) {
        setStoredUserId('');
      }

      setCurrentUser(matched || null);
    } catch (err) {
      console.error('Failed to load users/status', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    refreshUsers();
  }, []);

  const signInWithGoogle = async (): Promise<Participant> => {
    setIsLoading(true);
    try {
      const fbUser = await firebaseGoogleLogin();
      if (!fbUser || !fbUser.email) {
        throw new Error('Não foi possível obter os dados da conta Google.');
      }

      // Check Firestore document
      const firestoreParticipant = await getParticipantFromFirestore(fbUser.email);

      const res = await api.loginWithGoogle({
        email: fbUser.email,
        displayName: fbUser.displayName,
        photoURL: fbUser.photoURL,
        uid: fbUser.uid,
      });

      if (!res.user) {
        throw new Error('Falha ao autenticar o usuário no sistema NexoIF.');
      }

      const finalParticipant: Participant = {
        ...res.user,
        funcao: firestoreParticipant?.funcao || res.user.funcao,
        status: firestoreParticipant?.status || res.user.status,
      };

      setStoredUserId(finalParticipant.id);
      setCurrentUser(finalParticipant);
      await syncParticipantToFirestore(finalParticipant);
      await refreshUsers();
      return finalParticipant;
    } catch (err: any) {
      if (err?.code !== 'auth/popup-closed-by-user' && err?.code !== 'auth/cancelled-popup-request') {
        console.error('Erro no login com Google:', err);
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
    switch (currentUser.funcao) {
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

  const isCoordenadorAluno = currentUser?.funcao === 'coordenador_aluno';
  const isProfessorOrientador = currentUser?.funcao === 'professor_orientador';
  const isProfessorColaborador = currentUser?.funcao === 'professor_colaborador';
  const isAluno = currentUser?.funcao === 'aluno';

  const canManageAdmin = isCoordenadorAluno;
  const canRegisterExperiments = isCoordenadorAluno || isAluno;
  const canSubmitEvaluations = isCoordenadorAluno || isAluno;

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

