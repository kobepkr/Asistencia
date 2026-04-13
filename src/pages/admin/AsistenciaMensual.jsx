import React, { useState, useEffect } from 'react';
import { collection, getDocs, query, where, doc, getDoc, updateDoc, addDoc, writeBatch } from 'firebase/firestore';
import { db } from '../../firebase';
import * as XLSX from 'xlsx';

// Paleta de colores suaves
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

function AsistenciaMensual({ user }) {
  const [cursos, setCursos] = useState([]);
  const [cursoSeleccionado, setCursoSeleccionado] = useState('');
  const [estudiantes, setEstudiantes] = useState([]);
  const [cargando, setCargando] = useState(false);
  const [configuracion, setConfiguracion] = useState(null);
  const [mesActual, setMesActual] = useState(new Date().getMonth());
  const [añoActual, setAñoActual] = useState(new Date().getFullYear());
  const [diasDelMes, setDiasDelMes] = useState([]);
  const [asistencias, setAsistencias] = useState({});
  const [seleccionColumna, setSeleccionColumna] = useState({});
  const [guardando, setGuardando] = useState(false);
  const [mensaje, setMensaje] = useState('');

  const meses = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
  const diasSemana = ['D', 'L', 'M', 'M', 'J', 'V', 'S'];

  useEffect(() => {
    cargarCursos();
    cargarConfiguracion();
  }, []);

  useEffect(() => {
    if (cursoSeleccionado) {
      cargarEstudiantesYAsistencias();
    }
  }, [cursoSeleccionado, mesActual, añoActual]);

  const cargarConfiguracion = async () => {
    try {
      const configRef = doc(db, "escuelas", user.escuelaId, "configuracion", "calendario");
      const configSnap = await getDoc(configRef);
      if (configSnap.exists()) {
        setConfiguracion(configSnap.data());
      }
    } catch (error) {
      console.error("Error cargando configuración:", error);
    }
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

  const generarDiasDelMes = (mes, año) => {
    const ultimoDia = new Date(año, mes + 1, 0);
    const dias = [];
    for (let i = 1; i <= ultimoDia.getDate(); i++) {
      const fechaDia = new Date(año, mes, i);
      const diaSemana = fechaDia.getDay();
      const fechaStr = `${año}-${String(mes + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
      const esFinde = diaSemana === 0 || diaSemana === 6;
      const esFestivo = configuracion?.diasSinClases?.includes(fechaStr) || false;
      const esHabil = !esFinde && !esFestivo;
      dias.push({ numero: i, diaSemana, esFinde, esFestivo, esHabil, fechaStr });
    }
    setDiasDelMes(dias);
  };

  useEffect(() => {
    generarDiasDelMes(mesActual, añoActual);
  }, [mesActual, añoActual, configuracion]);

  const cargarEstudiantesYAsistencias = async () => {
    if (!cursoSeleccionado) return;
    setCargando(true);
    setMensaje('');
    try {
      // Cargar estudiantes
      const estudiantesRef = collection(db, "escuelas", user.escuelaId, "estudiantes");
      const qEstudiantes = query(estudiantesRef, where("curso", "==", cursoSeleccionado));
      const estudiantesSnap = await getDocs(qEstudiantes);
      const listaEstudiantes = estudiantesSnap.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        nombreCompleto: `${doc.data().apellidoPaterno || ''} ${doc.data().nombres || ''}`.trim()
      }));
      listaEstudiantes.sort((a, b) => (a.apellidoPaterno || '').localeCompare(b.apellidoPaterno || ''));
      setEstudiantes(listaEstudiantes);
      
      if (listaEstudiantes.length === 0) {
        setCargando(false);
        return;
      }
      
      // Cargar asistencias del mes - usando consulta más simple
      const asistenciasRef = collection(db, "escuelas", user.escuelaId, "asistencias");
      const inicioMes = `${añoActual}-${String(mesActual + 1).padStart(2, '0')}-01`;
      const finMes = `${añoActual}-${String(mesActual + 1).padStart(2, '0')}-${diasDelMes.length}`;
      
      // Consulta sin el índice compuesto (más lenta pero funciona)
      const qAsistencias = query(asistenciasRef, where("fecha", ">=", inicioMes), where("fecha", "<=", finMes));
      const asistenciasSnap = await getDocs(qAsistencias);
      const asistenciasMap = {};
      
      asistenciasSnap.docs.forEach(doc => {
        const data = doc.data();
        if (data.estudianteCurso === cursoSeleccionado) {
          if (!asistenciasMap[data.estudianteId]) asistenciasMap[data.estudianteId] = {};
          asistenciasMap[data.estudianteId][data.fecha] = true;
        }
      });
      
      setAsistencias(asistenciasMap);
      setSeleccionColumna({});
    } catch (error) {
      console.error("Error cargando datos:", error);
      setMensaje(`❌ Error: ${error.message}`);
    } finally {
      setCargando(false);
    }
  };

  const toggleAsistencia = (estudianteId, fechaStr) => {
    const nuevaAsistencia = { ...asistencias };
    const estaPresente = nuevaAsistencia[estudianteId]?.[fechaStr];
    if (estaPresente) {
      delete nuevaAsistencia[estudianteId][fechaStr];
      if (Object.keys(nuevaAsistencia[estudianteId]).length === 0) delete nuevaAsistencia[estudianteId];
    } else {
      if (!nuevaAsistencia[estudianteId]) nuevaAsistencia[estudianteId] = {};
      nuevaAsistencia[estudianteId][fechaStr] = true;
    }
    setAsistencias(nuevaAsistencia);
  };

  const seleccionarTodosColumna = (diaIndex) => {
    const dia = diasDelMes[diaIndex];
    if (!dia.esHabil) return;
    const nuevoEstado = !seleccionColumna[diaIndex];
    setSeleccionColumna({ ...seleccionColumna, [diaIndex]: nuevoEstado });
    const nuevasAsistencias = { ...asistencias };
    estudiantes.forEach(est => {
      if (nuevoEstado) {
        if (!nuevasAsistencias[est.id]) nuevasAsistencias[est.id] = {};
        nuevasAsistencias[est.id][dia.fechaStr] = true;
      } else {
        if (nuevasAsistencias[est.id]) delete nuevasAsistencias[est.id][dia.fechaStr];
      }
    });
    setAsistencias(nuevasAsistencias);
  };



const guardarAsistencias = async () => {
  if (estudiantes.length === 0) {
    setMensaje("⚠️ No hay estudiantes para guardar");
    return;
  }
  
  setGuardando(true);
  setMensaje('💾 Procesando asistencias...');
  
  try {
    const asistenciasRef = collection(db, "escuelas", user.escuelaId, "asistencias");
    const batch = writeBatch(db);
    let contadorNuevas = 0;
    let contadorActualizadas = 0;
    
    // Obtener todas las fechas hábiles del mes
    const fechasHabiles = diasDelMes.filter(d => d.esHabil).map(d => d.fechaStr);
    
    // 🔥 OPTIMIZACIÓN CLAVE: Una sola consulta por estudiante para obtener TODAS sus asistencias del mes
    for (const estudiante of estudiantes) {
      // Consultar TODAS las asistencias del estudiante en el mes de una sola vez
      const q = query(
        asistenciasRef,
        where("estudianteId", "==", estudiante.id),
        where("fecha", ">=", `${añoActual}-${String(mesActual + 1).padStart(2, '0')}-01`),
        where("fecha", "<=", `${añoActual}-${String(mesActual + 1).padStart(2, '0')}-${diasDelMes.length}`)
      );
      const snapshot = await getDocs(q);
      
      // Crear un Set con las fechas donde ya tiene asistencia
      const fechasExistentes = new Set();
      const docsExistentes = {};
      snapshot.docs.forEach(doc => {
        const data = doc.data();
        fechasExistentes.add(data.fecha);
        docsExistentes[data.fecha] = doc.id;
      });
      
      // Procesar cada día del mes
      for (const dia of diasDelMes) {
        if (!dia.esHabil) continue;
        
        const debeEstarPresente = asistencias[estudiante.id]?.[dia.fechaStr] || false;
        const yaExiste = fechasExistentes.has(dia.fechaStr);
        
        if (debeEstarPresente && !yaExiste) {
          // Crear nueva asistencia
          const nuevaRef = doc(asistenciasRef);
          batch.set(nuevaRef, {
            qrCode: estudiante.qrCode || '',
            estudianteId: estudiante.id,
            estudianteNombre: estudiante.nombreCompleto,
            estudianteRut: estudiante.rut || '',
            estudianteCurso: cursoSeleccionado,
            fecha: dia.fechaStr,
            hora: "09:00:00",
            timestamp: new Date(dia.fechaStr + 'T12:00:00').toISOString(),
            presente: true,
            registradoPor: user.uid,
            registradoPorNombre: user.nombre,
            año: añoActual,
            mes: mesActual + 1,
            semana: Math.ceil(dia.numero / 7)
          });
          contadorNuevas++;
        } else if (!debeEstarPresente && yaExiste) {
          // Eliminar asistencia existente
          const asistenciaRef = doc(db, "escuelas", user.escuelaId, "asistencias", docsExistentes[dia.fechaStr]);
          batch.update(asistenciaRef, { presente: false });
          contadorActualizadas++;
        }
      }
    }
    
    if (contadorNuevas > 0 || contadorActualizadas > 0) {
      await batch.commit();
      setMensaje(`✅ Guardado: ${contadorNuevas} nuevas, ${contadorActualizadas} eliminadas`);
    } else {
      setMensaje(`ℹ️ No se detectaron cambios para guardar`);
    }
    
    // Recargar los datos
    setTimeout(() => {
      cargarEstudiantesYAsistencias();
    }, 500);
    
    setTimeout(() => setMensaje(''), 3000);
  } catch (error) {
    console.error("❌ Error guardando:", error);
    setMensaje(`❌ Error: ${error.message}`);
  } finally {
    setGuardando(false);
  }
};

  const mesAnterior = () => {
    if (mesActual === 0) { setMesActual(11); setAñoActual(añoActual - 1); }
    else { setMesActual(mesActual - 1); }
  };

  const mesSiguiente = () => {
    if (mesActual === 11) { setMesActual(0); setAñoActual(añoActual + 1); }
    else { setMesActual(mesActual + 1); }
  };

  const exportarAExcel = () => {
    const datos = estudiantes.map((est, idx) => {
      const fila = { 'N°': idx + 1, 'NOMBRE COMPLETO': est.nombreCompleto, 'RUT': est.rut };
      diasDelMes.forEach(dia => { if (dia.esHabil) fila[dia.numero] = asistencias[est.id]?.[dia.fechaStr] ? '✓' : ''; });
      return fila;
    });
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(datos);
    XLSX.utils.book_append_sheet(wb, ws, `Asistencia_${cursoSeleccionado}_${meses[mesActual]}_${añoActual}`);
    XLSX.writeFile(wb, `asistencia_${cursoSeleccionado}_${meses[mesActual]}_${añoActual}.xlsx`);
  };

  return (
    <div>
      <h2 style={{ color: colores.texto, marginTop: 0, marginBottom: '15px', fontSize: '18px' }}>📅 Asistencia Mensual por Curso</h2>

      {/* Selector */}
      <div style={{ background: colores.tarjeta, borderRadius: '12px', padding: '12px', marginBottom: '15px', border: `1px solid ${colores.borde}`, boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
        <div style={{ display: 'flex', gap: '15px', alignItems: 'center', flexWrap: 'wrap', justifyContent: 'space-between' }}>
          <div style={{ minWidth: '200px' }}>
            <label style={{ color: colores.textoSecundario, display: 'block', marginBottom: '4px', fontSize: '11px' }}>📚 Curso</label>
            <select value={cursoSeleccionado} onChange={(e) => setCursoSeleccionado(e.target.value)} style={{ width: '100%', padding: '6px 10px', border: `1px solid ${colores.borde}`, borderRadius: '6px', color: colores.texto, fontSize: '12px' }}>
              <option value="">Selecciona un curso</option>
              {cursos.map(curso => <option key={curso.id} value={curso.nombre}>{curso.nombre}</option>)}
            </select>
          </div>
          {cursoSeleccionado && (
            <div style={{ display: 'flex', gap: '5px', alignItems: 'center' }}>
              <button onClick={mesAnterior} style={{ background: colores.accentLight, border: `1px solid ${colores.accent}`, borderRadius: '4px', padding: '5px 10px', color: colores.accent, cursor: 'pointer', fontSize: '11px' }}>◀</button>
              <div style={{ textAlign: 'center', minWidth: '120px' }}><span style={{ color: colores.texto, fontWeight: 'bold', fontSize: '13px' }}>{meses[mesActual]} {añoActual}</span></div>
              <button onClick={mesSiguiente} style={{ background: colores.accentLight, border: `1px solid ${colores.accent}`, borderRadius: '4px', padding: '5px 10px', color: colores.accent, cursor: 'pointer', fontSize: '11px' }}>▶</button>
              <button onClick={exportarAExcel} style={{ background: colores.warning, border: 'none', borderRadius: '4px', padding: '5px 10px', color: 'white', cursor: 'pointer', fontSize: '11px' }}>📥</button>
            </div>
          )}
        </div>
      </div>

      {cursoSeleccionado && (
        <>
          {cargando ? (
            <div style={{ textAlign: 'center', padding: '40px' }}>
              <div style={{ width: '30px', height: '30px', border: `2px solid ${colores.borde}`, borderTopColor: colores.accent, borderRadius: '50%', margin: '0 auto 15px', animation: 'spin 1s linear infinite' }}></div>
              <p style={{ color: colores.textoSecundario, fontSize: '12px' }}>Cargando estudiantes...</p>
            </div>
          ) : estudiantes.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px', background: colores.accentLight, borderRadius: '8px' }}>
              <p style={{ color: colores.textoSecundario }}>No hay estudiantes en este curso</p>
            </div>
          ) : (
            <>
              <div style={{ overflowX: 'auto', border: `1px solid ${colores.borde}`, borderRadius: '8px' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '10px', minWidth: '600px' }}>
                  <thead>
                    <tr style={{ background: colores.accentLight }}>
                      <th style={{ padding: '6px 4px', borderBottom: `1px solid ${colores.borde}`, minWidth: '35px' }}>#</th>
                      <th style={{ padding: '6px 4px', borderBottom: `1px solid ${colores.borde}`, textAlign: 'left', minWidth: '150px' }}>Nombre</th>
                      {diasDelMes.map((dia, idx) => (
                        <th key={idx} style={{ padding: '3px 1px', borderBottom: `1px solid ${colores.borde}`, textAlign: 'center', minWidth: '28px', background: dia.esFinde || dia.esFestivo ? colores.dangerLight : 'transparent', fontSize: '9px' }}>
                          <div><strong>{dia.numero}</strong></div>
                          <div style={{ fontSize: '7px', color: colores.textoSecundario }}>{diasSemana[dia.diaSemana]}</div>
                          {dia.esHabil && <div><input type="checkbox" checked={seleccionColumna[idx] || false} onChange={() => seleccionarTodosColumna(idx)} style={{ marginTop: '2px', cursor: 'pointer', width: '10px', height: '10px' }} /></div>}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {estudiantes.map((est, idx) => (
                      <tr key={est.id}>
                        <td style={{ padding: '6px 4px', borderBottom: `1px solid ${colores.borde}`, textAlign: 'center' }}>{idx + 1}</td>
                        <td style={{ padding: '6px 4px', borderBottom: `1px solid ${colores.borde}`, whiteSpace: 'nowrap' }}>{est.nombreCompleto.length > 20 ? est.nombreCompleto.substring(0, 18) + '..' : est.nombreCompleto}</td>
                        {diasDelMes.map((dia, diaIdx) => (
                          <td key={diaIdx} style={{ padding: '3px 1px', borderBottom: `1px solid ${colores.borde}`, textAlign: 'center', background: dia.esFinde || dia.esFestivo ? colores.dangerLight : (asistencias[est.id]?.[dia.fechaStr] ? colores.successLight : 'transparent'), opacity: dia.esHabil ? 1 : 0.5 }}>
                            {dia.esHabil ? (
                              <div onClick={() => toggleAsistencia(est.id, dia.fechaStr)} style={{ width: '18px', height: '18px', margin: '0 auto', background: asistencias[est.id]?.[dia.fechaStr] ? colores.success : 'white', border: `1px solid ${asistencias[est.id]?.[dia.fechaStr] ? colores.success : colores.borde}`, borderRadius: '3px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                {asistencias[est.id]?.[dia.fechaStr] && <span style={{ color: 'white', fontSize: '10px' }}>✓</span>}
                              </div>
                            ) : <span style={{ color: colores.danger, fontSize: '8px' }}>●</span>}
                          </td>
                        ))}
                      </tr>
                    ))}
                                   </tbody>
                  
                  <tfoot>
                    <tr style={{ background: colores.accentLight, borderTop: `2px solid ${colores.accent}` }}>
                      <td colSpan="2" style={{ padding: '8px', fontWeight: 'bold', color: colores.texto }}>📊 Presentes / Ausentes</td>
                      {diasDelMes.map((dia, idx) => {
                        if (!dia.esHabil) return <td key={idx} style={{ padding: '6px 2px', textAlign: 'center', background: colores.dangerLight, fontSize: '10px' }}>—</td>;
                        let presentes = 0;
                        estudiantes.forEach(est => { if (asistencias[est.id]?.[dia.fechaStr]) presentes++; });
                        const ausentes = estudiantes.length - presentes;
                        return <td key={idx} style={{ padding: '6px 2px', textAlign: 'center', fontSize: '10px', background: colores.accentLight }}><div style={{ color: colores.success, fontWeight: 'bold' }}>✅ {presentes}</div><div style={{ color: colores.danger, fontSize: '9px' }}>❌ {ausentes}</div></td>;
                      })}
                    </tr>
                    <tr style={{ background: colores.accentLight }}>
                      <td colSpan="2" style={{ padding: '8px', fontWeight: 'bold', color: colores.texto }}>📊 % Asistencia</td>
                      {diasDelMes.map((dia, idx) => {
                        if (!dia.esHabil) return <td key={idx} style={{ padding: '6px 2px', textAlign: 'center', background: colores.dangerLight, fontSize: '10px' }}>—</td>;
                        let presentes = 0;
                        estudiantes.forEach(est => { if (asistencias[est.id]?.[dia.fechaStr]) presentes++; });
                        const porcentaje = estudiantes.length > 0 ? ((presentes / estudiantes.length) * 100).toFixed(0) : 0;
                        return <td key={idx} style={{ padding: '6px 2px', textAlign: 'center', fontSize: '10px', background: colores.accentLight }}><span style={{ color: porcentaje >= 85 ? colores.success : (porcentaje >= 50 ? colores.warning : colores.danger), fontWeight: 'bold' }}>{porcentaje}%</span></td>;
                      })}
                    </tr>
                  </tfoot>


                  

                </table>
              </div>
              
              {/* Botón Guardar Asistencia */}
              <div style={{ marginTop: '20px', display: 'flex', justifyContent: 'center' }}>
                <button
                  onClick={guardarAsistencias}
                  disabled={guardando}
                  style={{
                    background: guardando ? colores.textoSecundario : colores.success,
                    border: 'none',
                    borderRadius: '8px',
                    padding: '10px 30px',
                    color: 'white',
                    fontSize: '14px',
                    fontWeight: 'bold',
                    cursor: guardando ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    transition: 'all 0.3s'
                  }}
                >
                  {guardando ? (
                    <>
                      <div style={{ width: '16px', height: '16px', border: `2px solid white`, borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }}></div>
                      Guardando...
                    </>
                  ) : (
                    '💾 Enviar Asistencia'
                  )}
                </button>
              </div>
            </>
          )}
          
          {/* Mensaje de estado */}
          {mensaje && (
            <div style={{
              marginTop: '10px',
              padding: '8px',
              borderRadius: '6px',
              textAlign: 'center',
              background: mensaje.includes('✅') ? colores.successLight : (mensaje.includes('❌') ? colores.dangerLight : colores.accentLight),
              color: mensaje.includes('✅') ? colores.success : (mensaje.includes('❌') ? colores.danger : colores.texto),
              fontSize: '12px'
            }}>
              {mensaje}
            </div>
          )}
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

export default AsistenciaMensual;