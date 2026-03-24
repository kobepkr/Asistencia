// migrarAsistencias.js
import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs, updateDoc, doc } from 'firebase/firestore';

// Tu configuración de Firebase
const firebaseConfig = {
  apiKey: "AIzaSyDiJhJLyOb4kWBE1DWArkIWRq6WE5k8phE",
  authDomain: "sistemaasistencia-c1129.firebaseapp.com",
  projectId: "sistemaasistencia-c1129",
  storageBucket: "sistemaasistencia-c1129.firebasestorage.app",
  messagingSenderId: "604892660776",
  appId: "1:604892660776:web:33d6e0afeb51ada45a611d"
};

// Inicializar Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function migrarAsistencias() {
  console.log("🔄 Migrando asistencias...");
  
  try {
    const asistenciasSnapshot = await getDocs(collection(db, "asistencias"));
    let contador = 0;
    
    if (asistenciasSnapshot.empty) {
      console.log("📭 No hay asistencias para migrar");
      return;
    }
    
    console.log(`📊 Encontradas ${asistenciasSnapshot.size} asistencias`);
    
    for (const documento of asistenciasSnapshot.docs) {
      const data = documento.data();
      console.log(`Procesando: ${documento.id}`, data);
      
      // Si tiene idEstudiante pero no qrCode
      if (data.idEstudiante && !data.qrCode) {
        await updateDoc(doc(db, "asistencias", documento.id), {
          qrCode: data.idEstudiante
        });
        contador++;
        console.log(`✅ Actualizado: ${data.idEstudiante}`);
      } else if (data.idEstudiante && data.qrCode) {
        console.log(`⏩ Ya tiene qrCode: ${data.qrCode}`);
      } else {
        console.log(`⚠️ Formato no reconocido:`, data);
      }
    }
    
    console.log(`🎉 Migración completa. ${contador} documentos actualizados.`);
    
  } catch (error) {
    console.error("❌ Error:", error);
  }
}

// Ejecutar la función
migrarAsistencias();