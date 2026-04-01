import React, { useState, useEffect } from 'react';
import { collection, getDocs, query, where, doc, getDoc } from 'firebase/firestore';
import { db } from '../../firebase';
import * as XLSX from 'xlsx';

const colores = {
  fondo: 'linear-gradient(135deg, #f0f7ff 0%, #e1eaf5 100%)',
  tarjeta: '#ffffff',
  texto: '#2c3e50',
  textoSecundario: '#5e6f8d',
  borde: '#d3e2f2',
  accent: '#4f7eb3',
  accentLight: '#e6f0fa',
  success: '#2e8b57',
  successLight: '#e3f5eb',
  danger: '#b84a4a',
  dangerLight: '#fae6e6',
  warning: '#d9a13b',
  warningLight: '#fef3e0'
};

function ReporteCurso({ user }) {
  const [cursos, setCursos] = useState([]);
  const [cursoSeleccionado, setCursoSeleccionado] = useState('');
  const [estudiantes, setEstudiantes] = useState([]);
  const [asistencias, setAsistencias] = useState({});
  const [cargando, setCargando] = useState(false);
  const [configuracion, setConfiguracion] = useState(null);
  const [diasHabiles, setDiasHabiles] = useState(0);
  const [estadisticasCurso, setEstadisticasCurso] = useState({
    totalEstudiantes: 0,
    totalAsistencias: 0,
    promedioCurso: 0,
    mayorAsistencia: 0,
    menorAsistencia: 100
  });

  useEffect(() => {
    cargarCursos();
    cargarConfiguracion();
  }, []);

  const cargarConfiguracion = async () => {
    try {
      const configRef = doc(db, "escuelas", user.escuelaId, "configuracion", "calendario");
      const configSnap = await getDoc(configRef);
      if (configSnap.exists()) {
        setConfiguracion(configSnap.data());
        calcularDiasHabiles(configSnap.data());
      }
    } catch (error) {
      console.error("Error cargando configuración:", error);
    }
  };

  const calcularDiasHabiles = (config) => {
    const hoy = new Date();
    hoy.setHours(12, 0, 0, 0);
    const inicio = new Date(config.fechaInicioClases + 'T12:00:00');
    const diasSinClases = new Set(config.diasSinClases || []);
    let count = 0;
    let currentDate = new Date(inicio);
    while (currentDate <= hoy) {
      const diaSemana = currentDate.getDay();
      const fechaStr = currentDate.toISOString().split('T')[0];
      if (diaSemana !== 0 && diaSemana !== 6 && !diasSinClases.has(fechaStr)) {
        count++;
      }
      currentDate.setDate(currentDate.getDate() + 1);
    }
    setDiasHabiles(count);
  };

  const cargarCursos = async () => {
    try {
      const cursosRef = collection(db, "escuelas", user.escuelaId, "cursos");
      const snapshot = await getDocs(cursosRef);
      const lista = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        nombre: doc.data().nombre || `${doc.data().grado}° ${doc.data().letra}`
      }));
      setCursos(lista.sort((a, b) => a.nombre.localeCompare(b.nombre)));
    } catch (error) {
      console.error("Error cargando cursos:", error);
    }
  };

  const cargarEstudiantesCurso = async () => {
    if (!cursoSeleccionado) return;

    setCargando(true);
    try {
      // 1. Obtener estudiantes del curso
      const estudiantesRef = collection(db, "escuelas", user.escuelaId, "estudiantes");
      const qEstudiantes = query(estudiantesRef, where("curso", "==", cursoSeleccionado));
      const estudiantesSnap = await getDocs(qEstudiantes);
      
      const listaEstudiantes = estudiantesSnap.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        nombreCompleto: `${doc.data().nombres || ''} ${doc.data().apellidoPaterno || ''} ${doc.data().apellidoMaterno || ''}`.trim()
      }));
      
      listaEstudiantes.sort((a, b) => {
        const apellidoA = (a.apellidoPaterno || '').toLowerCase();
        const apellidoB = (b.apellidoPaterno || '').toLowerCase();
        if (apellidoA < apellidoB) return -1;
        if (apellidoA > apellidoB) return 1;
        return 0;
      });
      
      setEstudiantes(listaEstudiantes);

      // 2. Obtener asistencias de cada estudiante
      const asistenciasRef = collection(db, "escuelas", user.escuelaId, "asistencias");
      const asistenciasMap = {};
      let totalAsistenciasCurso = 0;
      let mayor = 0;
      let menor = 100;
      
      for (const estudiante of listaEstudiantes) {
        const qAsistencias = query(
          asistenciasRef,
          where("estudianteId", "==", estudiante.id),
          where("fecha", ">=", configuracion.fechaInicioClases),
          where("fecha", "<=", new Date().toISOString().split('T')[0])
        );
        const asistenciasSnap = await getDocs(qAsistencias);
        const asistenciasCount = asistenciasSnap.size;
        const porcentaje = diasHabiles > 0 ? ((asistenciasCount / diasHabiles) * 100).toFixed(1) : 0;
        
        asistenciasMap[estudiante.id] = {
          presentes: asistenciasCount,
          porcentaje: parseFloat(porcentaje)
        };
        
        totalAsistenciasCurso += asistenciasCount;
        if (parseFloat(porcentaje) > mayor) mayor = parseFloat(porcentaje);
        if (parseFloat(porcentaje) < menor) menor = parseFloat(porcentaje);
      }
      
      setAsistencias(asistenciasMap);
      
      const promedioCurso = listaEstudiantes.length > 0 
        ? (totalAsistenciasCurso / listaEstudiantes.length / diasHabiles * 100).toFixed(1)
        : 0;
      
      setEstadisticasCurso({
        totalEstudiantes: listaEstudiantes.length,
        totalAsistencias: totalAsistenciasCurso,
        promedioCurso: parseFloat(promedioCurso),
        mayorAsistencia: mayor,
        menorAsistencia: menor
      });
      
    } catch (error) {
      console.error("Error cargando datos del curso:", error);
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    if (cursoSeleccionado && configuracion) {
      cargarEstudiantesCurso();
    }
  }, [cursoSeleccionado, configuracion]);

  const exportarAExcel = () => {
    const datosExportar = estudiantes.map(est => ({
      'Nombre': est.nombreCompleto,
      'RUT': est.rut,
      'Días hábiles': diasHabiles,
      'Días presente': asistencias[est.id]?.presentes || 0,
      'Días ausente': diasHabiles - (asistencias[est.id]?.presentes || 0),
      'Porcentaje': `${asistencias[est.id]?.porcentaje || 0}%`
    }));
    
    // Agregar resumen al final
    datosExportar.push({});
    datosExportar.push({ 'Nombre': '📊 RESUMEN DEL CURSO', 'RUT': '', 'Días hábiles': '', 'Días presente': '', 'Días ausente': '', 'Porcentaje': '' });
    datosExportar.push({ 'Nombre': 'Total estudiantes:', 'RUT': estadisticasCurso.totalEstudiantes, 'Días hábiles': '', 'Días presente': '', 'Días ausente': '', 'Porcentaje': '' });
    datosExportar.push({ 'Nombre': 'Total asistencias:', 'RUT': estadisticasCurso.totalAsistencias, 'Días hábiles': '', 'Días presente': '', 'Días ausente': '', 'Porcentaje': '' });
    datosExportar.push({ 'Nombre': 'Promedio del curso:', 'RUT': `${estadisticasCurso.promedioCurso}%`, 'Días hábiles': '', 'Días presente': '', 'Días ausente': '', 'Porcentaje': '' });
    datosExportar.push({ 'Nombre': 'Mayor asistencia:', 'RUT': `${estadisticasCurso.mayorAsistencia}%`, 'Días hábiles': '', 'Días presente': '', 'Días ausente': '', 'Porcentaje': '' });
    datosExportar.push({ 'Nombre': 'Menor asistencia:', 'RUT': `${estadisticasCurso.menorAsistencia}%`, 'Días hábiles': '', 'Días presente': '', 'Días ausente': '', 'Porcentaje': '' });

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(datosExportar);
    XLSX.utils.book_append_sheet(wb, ws, `Asistencia_${cursoSeleccionado}`);
    XLSX.writeFile(wb, `asistencia_${cursoSeleccionado}_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  return (
    <div>
      <h2 style={{ color: colores.texto, marginTop: 0, marginBottom: '20px' }}>
        🏆 Asistencia por Curso
      </h2>

      {/* Selector de curso */}
      <div style={{
        background: colores.tarjeta,
        borderRadius: '16px',
        padding: '20px',
        marginBottom: '20px',
        border: `1px solid ${colores.borde}`,
        boxShadow: '0 2px 4px rgba(0, 0, 0, 0.05)'
      }}>
        <div style={{ display: 'flex', gap: '15px', alignItems: 'flex-end', flexWrap: 'wrap' }}>
          <div style={{ flex: 1 }}>
            <label style={{ color: colores.textoSecundario, display: 'block', marginBottom: '5px' }}>
              📚 Seleccionar curso
            </label>
            <select
              value={cursoSeleccionado}
              onChange={(e) => setCursoSeleccionado(e.target.value)}
              style={{
                width: '100%',
                padding: '10px',
                border: `1px solid ${colores.borde}`,
                borderRadius: '8px',
                color: colores.texto,
                fontSize: '14px'
              }}
            >
              <option value="">Selecciona un curso</option>
              {cursos.map(curso => (
                <option key={curso.id} value={curso.nombre}>{curso.nombre}</option>
              ))}
            </select>
          </div>
          
          <div>
            <div style={{ background: colores.accentLight, padding: '8px 15px', borderRadius: '20px', border: `1px solid ${colores.accent}` }}>
              <span style={{ color: colores.accent, fontSize: '14px' }}>📊</span>
              <span style={{ color: colores.texto, fontWeight: 'bold' }}> Días hábiles: {diasHabiles}</span>
            </div>
          </div>
        </div>
      </div>

      {cursoSeleccionado && (
        <>
          {/* Tarjetas de estadísticas del curso */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
            gap: '15px',
            marginBottom: '20px'
          }}>
            <div style={{
              background: `linear-gradient(135deg, ${colores.accent}, ${colores.texto})`,
              borderRadius: '12px',
              padding: '15px',
              color: 'white'
            }}>
              <div style={{ fontSize: '12px', opacity: 0.8 }}>Total estudiantes</div>
              <div style={{ fontSize: '28px', fontWeight: 'bold' }}>{estadisticasCurso.totalEstudiantes}</div>
            </div>
            
            <div style={{
              background: `linear-gradient(135deg, ${colores.success}, #1e6f3f)`,
              borderRadius: '12px',
              padding: '15px',
              color: 'white'
            }}>
              <div style={{ fontSize: '12px', opacity: 0.8 }}>Promedio de asistencia</div>
              <div style={{ fontSize: '28px', fontWeight: 'bold' }}>{estadisticasCurso.promedioCurso}%</div>
            </div>
            
            <div style={{
              background: `linear-gradient(135deg, ${colores.warning}, #b86f2c)`,
              borderRadius: '12px',
              padding: '15px',
              color: 'white'
            }}>
              <div style={{ fontSize: '12px', opacity: 0.8 }}>Mayor asistencia</div>
              <div style={{ fontSize: '28px', fontWeight: 'bold' }}>{estadisticasCurso.mayorAsistencia}%</div>
            </div>
            
            <div style={{
              background: `linear-gradient(135deg, ${colores.danger}, #9b2c2c)`,
              borderRadius: '12px',
              padding: '15px',
              color: 'white'
            }}>
              <div style={{ fontSize: '12px', opacity: 0.8 }}>Menor asistencia</div>
              <div style={{ fontSize: '28px', fontWeight: 'bold' }}>{estadisticasCurso.menorAsistencia}%</div>
            </div>
          </div>

          {/* Botón exportar */}
          {estudiantes.length > 0 && (
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '15px' }}>
              <button
                onClick={exportarAExcel}
                style={{
                  background: colores.warning,
                  border: 'none',
                  borderRadius: '8px',
                  padding: '8px 20px',
                  color: 'white',
                  fontWeight: 'bold',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}
              >
                📥 Exportar a Excel
              </button>
            </div>
          )}

          {/* Tabla de estudiantes */}
          <div style={{
            background: colores.tarjeta,
            borderRadius: '16px',
            padding: '20px',
            border: `1px solid ${colores.borde}`,
            boxShadow: '0 2px 4px rgba(0, 0, 0, 0.05)'
          }}>
            <h3 style={{ color: colores.texto, marginTop: 0, marginBottom: '15px' }}>
              📋 Lista de estudiantes - {cursoSeleccionado}
            </h3>
            
            {cargando ? (
              <div style={{ textAlign: 'center', padding: '40px' }}>
                <div style={{
                  width: '40px',
                  height: '40px',
                  border: `2px solid ${colores.borde}`,
                  borderTopColor: colores.accent,
                  borderRadius: '50%',
                  margin: '0 auto 20px',
                  animation: 'spin 1s linear infinite'
                }}></div>
                <p style={{ color: colores.textoSecundario }}>Cargando estudiantes...</p>
              </div>
            ) : (
              <div style={{ maxHeight: '500px', overflowY: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead style={{ background: colores.accentLight, position: 'sticky', top: 0 }}>
                    <tr>
                      <th style={{ padding: '12px', textAlign: 'left', color: colores.texto }}>#</th>
                      <th style={{ padding: '12px', textAlign: 'left', color: colores.texto }}>Nombre</th>
                      <th style={{ padding: '12px', textAlign: 'left', color: colores.texto }}>RUT</th>
                      <th style={{ padding: '12px', textAlign: 'center', color: colores.texto }}>Presente</th>
                      <th style={{ padding: '12px', textAlign: 'center', color: colores.texto }}>Ausente</th>
                      <th style={{ padding: '12px', textAlign: 'center', color: colores.texto }}>%</th>
                    </tr>
                  </thead>
                  <tbody>
                    {estudiantes.length === 0 ? (
                      <tr>
                        <td colSpan="6" style={{ padding: '40px', textAlign: 'center', color: colores.textoSecundario }}>
                          No hay estudiantes en este curso
                        </td>
                      </tr>
                    ) : (
                      estudiantes.map((est, index) => {
                        const asis = asistencias[est.id] || { presentes: 0, porcentaje: 0 };
                        const ausentes = diasHabiles - asis.presentes;
                        return (
                          <tr key={est.id} style={{
                            borderBottom: `1px solid ${colores.borde}`,
                            background: index % 2 === 0 ? 'transparent' : colores.accentLight
                          }}>
                            <td style={{ padding: '12px', color: colores.textoSecundario }}>{index + 1}</td>
                            <td style={{ padding: '12px', color: colores.texto, fontWeight: '500' }}>
                              {est.apellidoPaterno}, {est.nombres}
                            </td>
                            <td style={{ padding: '12px', color: colores.textoSecundario }}>{est.rut}</td>
                            <td style={{ padding: '12px', textAlign: 'center', color: colores.success, fontWeight: 'bold' }}>
                              {asis.presentes}
                            </td>
                            <td style={{ padding: '12px', textAlign: 'center', color: colores.danger, fontWeight: 'bold' }}>
                              {ausentes}
                            </td>
                            <td style={{ padding: '12px', textAlign: 'center' }}>
                              <span style={{
                                background: asis.porcentaje >= 85 ? colores.successLight : colores.dangerLight,
                                color: asis.porcentaje >= 85 ? colores.success : colores.danger,
                                padding: '4px 10px',
                                borderRadius: '20px',
                                fontSize: '12px',
                                fontWeight: 'bold'
                              }}>
                                {asis.porcentaje}%
                              </span>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}

      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}

export default ReporteCurso;