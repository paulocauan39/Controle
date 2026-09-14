import { initializeApp } from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
  setPersistence,
  browserLocalPersistence,
} from 'firebase/auth';
import {
  getFirestore,
  doc,
  getDoc,
  setDoc,
  getDocFromServer,
  collection,
  query,
  where,
  getDocs,
} from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';
import { Participant } from '../types.js';

export const app = initializeApp(firebaseConfig);

// CRITICAL: Must pass firebaseConfig.firestoreDatabaseId
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
googleProvider.addScope('email');
googleProvider.addScope('profile');
googleProvider.setCustomParameters({ prompt: 'select_account' });

// Configure authentication persistence for browser sessions
setPersistence(auth, browserLocalPersistence).catch((err) => {
  console.warn('Firebase Auth persistence setup notice:', err);
});

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || [],
    },
    operationType,
    path,
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// Helper to fetch user/participant profile directly from Firestore (checking both 'usuarios' and 'participants')
export async function getParticipantFromFirestore(emailOrIdOrUid: string): Promise<Participant | null> {
  try {
    const clean = emailOrIdOrUid.trim().toLowerCase();

    // 1. Check in 'usuarios' collection by doc ID (e.g. UID or email or ID)
    try {
      const userDocRef = doc(db, 'usuarios', emailOrIdOrUid);
      const userDocSnap = await getDoc(userDocRef);
      if (userDocSnap.exists()) {
        const data = userDocSnap.data();
        return {
          id: data.id || emailOrIdOrUid,
          nome: data.nome || data.displayName || data.name || clean.split('@')[0],
          email: data.email || clean,
          funcao: (data.funcao || data.perfil || data.role || 'aluno'),
          status: data.status || 'Ativo',
          dataEntrada: data.dataEntrada || new Date().toISOString().split('T')[0],
          ...data,
        } as Participant;
      }
    } catch (errUserDoc) {
      console.warn('Consulta no Firestore (usuarios por id):', errUserDoc);
    }

    // 2. Check in 'usuarios' collection by email
    try {
      const qUsuarios = query(collection(db, 'usuarios'), where('email', '==', clean));
      const querySnapshotUsuarios = await getDocs(qUsuarios);
      if (!querySnapshotUsuarios.empty) {
        const data = querySnapshotUsuarios.docs[0].data();
        return {
          id: data.id || querySnapshotUsuarios.docs[0].id,
          nome: data.nome || data.displayName || data.name || clean.split('@')[0],
          email: data.email || clean,
          funcao: (data.funcao || data.perfil || data.role || 'aluno'),
          status: data.status || 'Ativo',
          dataEntrada: data.dataEntrada || new Date().toISOString().split('T')[0],
          ...data,
        } as Participant;
      }
    } catch (errUserQuery) {
      console.warn('Consulta no Firestore (usuarios por email):', errUserQuery);
    }

    // 3. Check in 'participants' collection by doc ID
    try {
      const partDocRef = doc(db, 'participants', emailOrIdOrUid);
      const partDocSnap = await getDoc(partDocRef);
      if (partDocSnap.exists()) {
        return partDocSnap.data() as Participant;
      }
    } catch (errPartDoc) {
      console.warn('Consulta no Firestore (participants por id):', errPartDoc);
    }

    // 4. Check in 'participants' collection by email
    try {
      const qParticipants = query(collection(db, 'participants'), where('email', '==', clean));
      const querySnapshotPart = await getDocs(qParticipants);
      if (!querySnapshotPart.empty) {
        return querySnapshotPart.docs[0].data() as Participant;
      }
    } catch (errPartQuery) {
      console.warn('Consulta no Firestore (participants por email):', errPartQuery);
    }
  } catch (err) {
    console.warn('Consulta ao Firestore de usuários/participantes retornou:', err);
  }
  return null;
}

// Helper to save/sync user and participant profile in Firestore
export async function syncParticipantToFirestore(participant: Participant, uid?: string): Promise<void> {
  try {
    const docData = {
      ...participant,
      perfil: participant.funcao,
      updatedAt: new Date().toISOString(),
    };

    // Save in 'participants' collection
    try {
      const partRef = doc(db, 'participants', participant.id);
      await setDoc(partRef, docData, { merge: true });
    } catch (errPart) {
      console.warn('Sincronização em participants:', errPart);
    }

    // Save in 'usuarios' collection (both by participant.id and uid if provided)
    try {
      const usuarioRef = doc(db, 'usuarios', participant.id);
      await setDoc(usuarioRef, docData, { merge: true });
    } catch (errUser) {
      console.warn('Sincronização em usuarios:', errUser);
    }

    if (uid && uid !== participant.id) {
      try {
        const usuarioUidRef = doc(db, 'usuarios', uid);
        await setDoc(usuarioUidRef, docData, { merge: true });
      } catch (errUid) {
        console.warn('Sincronização em usuarios por uid:', errUid);
      }
    }
  } catch (err) {
    console.warn('Sincronização do participante no Firestore:', err);
  }
}

// Connection check
export async function testConnection() {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.warn('Firebase Firestore: check client configuration or offline state.');
    }
  }
}

testConnection();

export async function loginWithGoogle() {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    return result.user;
  } catch (error: any) {
    if (error?.code !== 'auth/popup-closed-by-user' && error?.code !== 'auth/cancelled-popup-request') {
      console.error('Erro no login com Google (Firebase):', error);
    }
    throw error;
  }
}

export async function logoutFirebase() {
  try {
    await signOut(auth);
  } catch (error) {
    console.error('Erro no logout Firebase:', error);
    throw error;
  }
}

