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
export async function getParticipantFromFirestore(uidOrEmail: string, optionalEmail?: string): Promise<Participant | null> {
  const uid = uidOrEmail.trim();
  const email = (optionalEmail || (uidOrEmail.includes('@') ? uidOrEmail : '')).trim().toLowerCase();

  // 1. Check in 'usuarios' collection by UID (direct doc access)
  if (uid) {
    try {
      console.log(`[FirestoreFetch] getDoc: /usuarios/${uid}`);
      const userDocRef = doc(db, 'usuarios', uid);
      const userDocSnap = await getDoc(userDocRef);
      if (userDocSnap.exists()) {
        const data = userDocSnap.data();
        console.log(`[FirestoreFetch] Documento encontrado em /usuarios/${uid}:`, data);
        return {
          id: data.id || uid,
          nome: data.nome || data.displayName || data.name || (email ? email.split('@')[0] : 'Usuário'),
          email: data.email || email,
          funcao: (data.funcao || data.perfil || data.role || 'aluno'),
          status: data.status || 'Ativo',
          dataEntrada: data.dataEntrada || new Date().toISOString().split('T')[0],
          ...data,
        } as Participant;
      }
    } catch (errUserDoc: any) {
      console.warn(`[FirestoreFetch] Erro getDoc /usuarios/${uid}:`, errUserDoc?.code || errUserDoc?.message || errUserDoc);
    }
  }

  // 2. Check in 'usuarios' collection by email if different from uid
  if (email && email !== uid) {
    try {
      console.log(`[FirestoreFetch] getDoc: /usuarios/${email}`);
      const userEmailRef = doc(db, 'usuarios', email);
      const userEmailSnap = await getDoc(userEmailRef);
      if (userEmailSnap.exists()) {
        const data = userEmailSnap.data();
        console.log(`[FirestoreFetch] Documento encontrado em /usuarios/${email}:`, data);
        return {
          id: data.id || email,
          nome: data.nome || data.displayName || data.name || email.split('@')[0],
          email: data.email || email,
          funcao: (data.funcao || data.perfil || data.role || 'aluno'),
          status: data.status || 'Ativo',
          dataEntrada: data.dataEntrada || new Date().toISOString().split('T')[0],
          ...data,
        } as Participant;
      }
    } catch (errUserEmail: any) {
      console.warn(`[FirestoreFetch] Erro getDoc /usuarios/${email}:`, errUserEmail?.code || errUserEmail?.message || errUserEmail);
    }
  }

  // 3. Check in 'participants' collection by doc ID (email or uid)
  if (email || uid) {
    const targetKey = email || uid;
    try {
      console.log(`[FirestoreFetch] getDoc: /participants/${targetKey}`);
      const partDocRef = doc(db, 'participants', targetKey);
      const partDocSnap = await getDoc(partDocRef);
      if (partDocSnap.exists()) {
        const data = partDocSnap.data();
        console.log(`[FirestoreFetch] Documento encontrado em /participants/${targetKey}:`, data);
        return data as Participant;
      }
    } catch (errPartDoc: any) {
      console.warn(`[FirestoreFetch] Erro getDoc /participants/${targetKey}:`, errPartDoc?.code || errPartDoc?.message || errPartDoc);
    }
  }

  return null;
}

// Helper to save/sync user and participant profile in Firestore
export async function syncParticipantToFirestore(participant: Participant, uid?: string): Promise<void> {
  try {
    const docData: Record<string, any> = {
      id: participant.id,
      nome: participant.nome,
      email: participant.email,
      funcao: participant.funcao,
      perfil: participant.funcao,
      status: participant.status,
      dataEntrada: participant.dataEntrada,
      createdAt: participant.createdAt,
      updatedAt: new Date().toISOString(),
    };

    if (participant.equipeId) {
      docData.equipeId = participant.equipeId;
    }
    if (participant.equipeNome) {
      docData.equipeNome = participant.equipeNome;
    }

    // Sanitize any remaining undefined properties
    for (const key of Object.keys(docData)) {
      if (docData[key] === undefined) {
        delete docData[key];
      }
    }

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

