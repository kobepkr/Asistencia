console.log("🚀 INICIANDO SCRIPT DE GENERACIÓN DE DATOS");
console.log("==========================================");

import { initializeApp } from "firebase/app";
import { getFirestore, collection, addDoc } from "firebase/firestore";

console.log("📦 Importando Firebase...");

const firebaseConfig = {
  apiKey: "AIzaSyDiJhJLyOb4kWBE1DWArkIWRq6WE5k8phE",
  authDomain: "sistemaasistencia-c1129.firebaseapp.com",
  projectId: "sistemaasistencia-c1129",
  storageBucket: "sistemaasistencia-c1129.firebasestorage.app",
  messagingSenderId: "604892660776",
  appId: "1:604892660776:web:33d6e0afeb51ada45a611d"
};

console.log("🔥 Inicializando Firebase...");
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const ESCUELA_ID = "hWZc7HyGZQj5rneemacI";

console.log(`📌 Escuela ID: ${ESCUELA_ID}`);
console.log("==========================================");

async function generarDatos() {
  console.log("🚀 Comenzando a generar datos...");
  
  try {
    // Crear 5 estudiantes de prueba
    const estudiantes = [
      { nombre: "Juan", apellido: "Pérez", rut: "11111111-1", curso: "8° A" },
      { nombre: "María", apellido: "González", rut: "22222222-2", curso: "8° A" },
      { nombre: "Carlos", apellido: "Rodríguez", rut: "33333333-3", curso: "7° B" },
      { nombre: "Ana", apellido: "Martínez", rut: "44444444-4", curso: "7° B" },
      { nombre: "Luis", apellido: "Soto", rut: "55555555-5", curso: "6° A" }
    ];
    
    for (let i = 0; i < estudiantes.length; i++) {
      const est = estudiantes[i];
      console.log(`📝 Creando estudiante ${i+1}: ${est.nombre} ${est.apellido}...`);
      
      const estudianteData = {
        nombres: est.nombre,
        apellidoPaterno: est.apellido,
        apellidoMaterno: "",
        rut: est.rut,
        curso: est.curso,
        activo: true,
        fechaRegistro: new Date().toISOString().split('T')[0],
        qrCode: `${ESCUELA_ID}_${est.curso}_${est.rut.replace(/[^0-9]/g, '')}`
      };
      
      const docRef = await addDoc(collection(db, "escuelas", ESCUELA_ID, "estudiantes"), estudianteData);
      console.log(`   ✅ Creado con ID: ${docRef.id}`);
    }
    
    console.log("==========================================");
    console.log("🎉 DATOS GENERADOS EXITOSAMENTE!");
    console.log(`✅ Total estudiantes creados: ${estudiantes.length}`);
    
  } catch (error) {
    console.error("❌ ERROR:", error);
  }
}

console.log("🔄 Ejecutando función principal...");
generarDatos().then(() => {
  console.log("✨ Proceso completado");
}).catch(error => {
  console.error("💥 Error fatal:", error);
});