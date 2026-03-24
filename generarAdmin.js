console.log("🔥 INICIANDO SCRIPT CON ADMIN SDK");
console.log("=================================");

import { readFileSync } from 'fs';
import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

// Cargar la clave de servicio
const serviceAccount = JSON.parse(
  readFileSync('./firebase-key.json', 'utf8')
);

// Inicializar Firebase Admin
const app = initializeApp({
  credential: cert(serviceAccount)
});

const db = getFirestore(app);

const ESCUELA_ID = "hWZc7HyGZQj5rneemacI";

async function generarDatos() {
  console.log("📝 Creando estudiantes de prueba...");
  
  const estudiantes = [
    { 
      nombres: "Juan", 
      apellidoPaterno: "Pérez", 
      apellidoMaterno: "González", 
      rut: "11111111-1", 
      curso: "8° A" 
    },
    { 
      nombres: "María", 
      apellidoPaterno: "González", 
      apellidoMaterno: "Rodríguez", 
      rut: "22222222-2", 
      curso: "8° A" 
    },
    { 
      nombres: "Carlos", 
      apellidoPaterno: "Rodríguez", 
      apellidoMaterno: "Martínez", 
      rut: "33333333-3", 
      curso: "7° B" 
    },
    { 
      nombres: "Ana", 
      apellidoPaterno: "Martínez", 
      apellidoMaterno: "Soto", 
      rut: "44444444-4", 
      curso: "7° B" 
    }
  ];
  
  let contador = 0;
  
  for (const est of estudiantes) {
    try {
      console.log(`📌 Creando: ${est.nombres} ${est.apellidoPaterno}...`);
      
      const estudianteData = {
        ...est,
        activo: true,
        fechaRegistro: new Date().toISOString().split('T')[0],
        qrCode: `${ESCUELA_ID}_${est.curso.replace(/\s+/g, '_')}_${est.rut.replace(/[^0-9]/g, '')}`
      };
      
      const docRef = await db.collection("escuelas").doc(ESCUELA_ID)
        .collection("estudiantes").add(estudianteData);
      
      console.log(`   ✅ Creado con ID: ${docRef.id}`);
      contador++;
      
    } catch (error) {
      console.error(`   ❌ Error con ${est.nombres}:`, error.message);
    }
  }
  
  console.log("=================================");
  console.log(`🎉 COMPLETADO: ${contador} estudiantes creados`);
}

// Ejecutar
generarDatos().catch(console.error);