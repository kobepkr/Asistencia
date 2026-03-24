import { signInWithEmailAndPassword } from 'firebase/auth';
import { collection, query, where, getDocs, doc, getDoc, updateDoc } from 'firebase/firestore';
import { auth, db } from '../firebase';

export const loginMultiTenant = async (email, password) => {
  try {
    // 1. Autenticar con Firebase Auth
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;
    
    // 2. Buscar en qué escuela está este usuario
    const escuelasRef = collection(db, "escuelas");
    const escuelasSnapshot = await getDocs(escuelasRef);
    
    for (const escuelaDoc of escuelasSnapshot.docs) {
      // Buscar en la subcolección de usuarios de cada escuela
      const usuarioRef = doc(db, "escuelas", escuelaDoc.id, "usuarios", user.uid);
      const usuarioSnap = await getDoc(usuarioRef);
      
      if (usuarioSnap.exists()) {
        const usuarioData = usuarioSnap.data();
        
        // Actualizar último acceso
        await updateDoc(usuarioRef, {
          ultimoAcceso: new Date().toISOString()
        });
        
        // Devolver datos completos del usuario
        return {
          uid: user.uid,
          email: user.email,
          escuelaId: escuelaDoc.id,
          escuelaNombre: escuelaDoc.data().nombre,
          ...usuarioData
        };
      }
    }
    
    // Si no se encontró en ninguna escuela
    throw new Error("Usuario no autorizado en ninguna escuela");
    
  } catch (error) {
    console.error("Error en login:", error);
    throw error;
  }
};