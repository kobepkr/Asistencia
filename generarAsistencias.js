console.log("🔥 GENERANDO ASISTENCIAS DE PRUEBA");
console.log("==================================");

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

// Función para generar hora aleatoria
function generarHora() {
  const hora = Math.floor(Math.random() * 4) + 8; // 8 a 11 AM
  const minuto = Math.floor(Math.random() * 60);
  const segundo = Math.floor(Math.random() * 60);
  return `${hora.toString().padStart(2, '0')}:${minuto.toString().padStart(2, '0')}:${segundo.toString().padStart(2, '0')}`;
}

// Calendario escolar (copiado de tu configuración)
const CALENDARIO = {
  fechaInicio: "2026-03-04",
  fechaFin: "2026-12-11",
  diasSinClases: [
    // Fines de semana
    "2026-03-07", "2026-03-08", "2026-03-14", "2026-03-15",
    "2026-03-21", "2026-03-22", "2026-03-28", "2026-03-29",
    "2026-04-04", "2026-04-05", "2026-04-11", "2026-04-12",
    "2026-04-18", "2026-04-19", "2026-04-25", "2026-04-26",
    "2026-05-02", "2026-05-03", "2026-05-09", "2026-05-10",
    "2026-05-16", "2026-05-17", "2026-05-23", "2026-05-24",
    "2026-05-30", "2026-05-31", "2026-06-06", "2026-06-07",
    "2026-06-13", "2026-06-14", "2026-06-20", "2026-06-21",
    "2026-06-27", "2026-06-28", "2026-07-04", "2026-07-05",
    "2026-07-11", "2026-07-12", "2026-07-18", "2026-07-19",
    "2026-07-25", "2026-07-26", "2026-08-01", "2026-08-02",
    "2026-08-08", "2026-08-09", "2026-08-15", "2026-08-16",
    "2026-08-22", "2026-08-23", "2026-08-29", "2026-08-30",
    "2026-09-05", "2026-09-06", "2026-09-12", "2026-09-13",
    "2026-09-19", "2026-09-20", "2026-09-26", "2026-09-27",
    "2026-10-03", "2026-10-04", "2026-10-10", "2026-10-11",
    "2026-10-17", "2026-10-18", "2026-10-24", "2026-10-25",
    "2026-10-31", "2026-11-01", "2026-11-07", "2026-11-08",
    "2026-11-14", "2026-11-15", "2026-11-21", "2026-11-22",
    "2026-11-28", "2026-11-29", "2026-12-05", "2026-12-06",
    // Festivos
    "2026-04-10", "2026-05-01", "2026-05-21", "2026-06-29",
    "2026-07-16", "2026-08-15", "2026-09-18", "2026-09-19",
    "2026-10-12", "2026-10-31", "2026-11-01", "2026-12-08"
  ]
};

// Función para obtener días hábiles del período
function getDiasHabiles() {
  const inicio = new Date(CALENDARIO.fechaInicio);
  const fin = new Date(CALENDARIO.fechaFin);
  const dias = [];
  const diasSinClasesSet = new Set(CALENDARIO.diasSinClases);
  
  let currentDate = new Date(inicio);
  while (currentDate <= fin) {
    const fechaStr = currentDate.toISOString().split('T')[0];
    
    // Si no está en días sin clases
    if (!diasSinClasesSet.has(fechaStr)) {
      dias.push(fechaStr);
    }
    
    currentDate.setDate(currentDate.getDate() + 1);
  }
  
  return dias;
}

async function generarAsistencias() {
  console.log("📚 Obteniendo estudiantes...");
  
  // Obtener todos los estudiantes de la escuela
  const estudiantesSnapshot = await db
    .collection("escuelas")
    .doc(ESCUELA_ID)
    .collection("estudiantes")
    .get();
  
  const estudiantes = [];
  estudiantesSnapshot.forEach(doc => {
    estudiantes.push({
      id: doc.id,
      ...doc.data()
    });
  });
  
  console.log(`✅ Encontrados ${estudiantes.length} estudiantes`);
  
  const diasHabiles = getDiasHabiles();
  console.log(`📅 Días hábiles totales: ${diasHabiles.length}`);
  
  let totalAsistencias = 0;
  
  // Para cada estudiante, generar asistencias aleatorias
  for (const estudiante of estudiantes) {
    console.log(`\n📌 Procesando: ${estudiante.nombres} ${estudiante.apellidoPaterno}`);
    
    // Porcentaje de asistencia aleatorio (entre 50% y 100%)
    const porcentajeAsistencia = Math.floor(Math.random() * 50) + 50; // 50-100%
    const diasPresente = Math.floor(diasHabiles.length * (porcentajeAsistencia / 100));
    
    console.log(`   🎯 Porcentaje objetivo: ${porcentajeAsistencia}% (${diasPresente} días)`);
    
    // Seleccionar días aleatorios para las asistencias
    const copiaDias = [...diasHabiles];
    const diasSeleccionados = [];
    
    for (let i = 0; i < diasPresente; i++) {
      if (copiaDias.length === 0) break;
      const randomIndex = Math.floor(Math.random() * copiaDias.length);
      diasSeleccionados.push(copiaDias[randomIndex]);
      copiaDias.splice(randomIndex, 1);
    }
    
    // Ordenar días
    diasSeleccionados.sort();
    
    // Crear asistencias
    let contador = 0;
    for (const fecha of diasSeleccionados) {
      try {
        const asistenciaData = {
          qrCode: estudiante.qrCode || 'QR_' + estudiante.id,
          estudianteId: estudiante.id,
          estudianteNombre: `${estudiante.nombres} ${estudiante.apellidoPaterno}`.trim(),
          estudianteCurso: estudiante.curso,
          fecha: fecha,
          hora: generarHora(),
          timestamp: new Date(fecha + 'T' + generarHora()).toISOString(),
          presente: true,
          año: parseInt(fecha.split('-')[0]),
          mes: parseInt(fecha.split('-')[1]),
          semana: Math.ceil(parseInt(fecha.split('-')[2]) / 7),
          registradoPor: "sistema_prueba",
          registradoPorNombre: "Script de Prueba"
        };
        
        await db
          .collection("escuelas")
          .doc(ESCUELA_ID)
          .collection("asistencias")
          .add(asistenciaData);
        
        contador++;
      } catch (error) {
        console.error(`   ❌ Error con fecha ${fecha}:`, error.message);
      }
    }
    
    console.log(`   ✅ Generadas ${contador} asistencias (${((contador/diasHabiles.length)*100).toFixed(1)}% real)`);
    totalAsistencias += contador;
  }
  
  console.log("\n=================================");
  console.log(`🎉 TOTAL GENERADO: ${totalAsistencias} asistencias`);
  console.log(`📊 Promedio por estudiante: ${(totalAsistencias/estudiantes.length).toFixed(1)}`);
}

// Ejecutar
generarAsistencias().catch(console.error);