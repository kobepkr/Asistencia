console.log("🔥 INICIANDO SCRIPT");
console.log("===================");

import { initializeApp } from "firebase/app";
import { getFirestore, collection, addDoc } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyDiJhJLyOb4kWBE1DWArkIWRq6WE5k8phE",
  authDomain: "sistemaasistencia-c1129.firebaseapp.com",
  projectId: "sistemaasistencia-c1129",
  storageBucket: "sistemaasistencia-c1129.firebasestorage.app",
  messagingSenderId: "604892660776",
  appId: "1:604892660776:web:33d6e0afeb51ada45a611d"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const ESCUELA_ID = "hWZc7HyGZQj5rneemacI";

async function generar() {
  console.log("📝 Creando estudiantes...");
  
  const estudiantes = [
    { nombre: "Juan", apellido: "Pérez", rut: "11111111-1", curso: "8° A" },
    { nombre: "María", apellido: "González", rut: "22222222-2", curso: "8° A" }
  ];
  
  for (const est of estudiantes) {
    const data = {
      nombres: est.nombre,
      apellidoPaterno: est.apellido,
      rut: est.rut,
      curso: est.curso,
      activo: true,
      fechaRegistro: new Date().toISOString().split('T')[0]
    };
    
    await addDoc(collection(db, "escuelas", ESCUELA_ID, "estudiantes"), data);
    console.log(`✅ Creado: ${est.nombre} ${est.apellido}`);
  }
  
  console.log("🎉 Listo!");
}

generar().catch(console.error);