import React, { useState, useEffect } from 'react';
import { collection, getDocs, query, where, doc, getDoc, addDoc, writeBatch } from 'firebase/firestore';
import { db } from '../../firebase';
import Calendar from 'react-calendar';
import 'react-calendar/dist/Calendar.css';

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

function RellenarAsistencia({ user }) {
  const [cursos, setCursos] = useState([]);
  const [estudiantes, setEstudiantes] = useState([]);
  const [cursoSeleccionado, setCursoSeleccionado] = useState('');
  const [estudianteSeleccionado, setEstudianteSeleccionado] = useState(null);
  const [fechasSeleccionadas, setFechasSeleccionadas] = useState([]);
  const [fechasYaAsistidas, setFechasYaAsistidas] = useState([]);
  const [cargando, setCargando] = useState(false);
  const [mensaje, setMensaje] = useState('');
  const [configuracion, setConfiguracion] = useState(null);
  const [vista, setVista] = useState('curso');

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
      setMensaje("Error al cargar cursos");
    }
  };

  const cargarEstudiantes = async (cursoNombre) => {
    setCargando(true);
    try {
      const estudiantesRef = collection(db, "escuelas", user.escuelaId, "estudiantes");
      const q = query(estudiantesRef, where("curso", "==", cursoNombre));
      const snapshot = await getDocs(q);
      const lista = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        nombreCompleto: `${doc.data().nombres || ''} ${doc.data().apellidoPaterno || ''} ${doc.data().apellidoMaterno || ''}`.trim()
      }));
      lista.sort((a, b) => {
        const apellidoA = (a.apellidoPaterno || '').toLowerCase();
        const apellidoB = (b.apellidoPaterno || '').toLowerCase();
        if (apellidoA < apellidoB) return -1;
        if (apellidoA > apellidoB) return 1;
        return 0;
      });
      setEstudiantes(lista);
      setCursoSeleccionado(cursoNombre);
      setVista('estudiante');
    } catch (error) {
      console.error("Error cargando estudiantes:", error);
      setMensaje("Error al cargar estudiantes");
    } finally {
      setCargando(false);
    }
  };

  const cargarAsistenciasEstudiante = async (estudianteId) => {
    if (!configuracion) return [];
    
    try {
      const asistenciasRef = collection(db, "escuelas", user.escuelaId, "asistencias");
      const q = query(
        asistenciasRef,
        where("estudianteId", "==", estudianteId),
        where("fecha", ">=", configuracion.fechaInicioClases),
        where("fecha", "<=", configuracion.fechaFinClases)
      );
      const snapshot = await getDocs(q);
      const fechasAsistidas = snapshot.docs.map(doc => doc.data().fecha);
      return fechasAsistidas;
    } catch (error) {
      console.error("Error cargando asistencias:", error);
      return [];
    }
  };

  const seleccionarEstudiante = async (estudiante) => {
    setCargando(true);
    setEstudianteSeleccionado(estudiante);
    setFechasSeleccionadas([]);
    
    // Cargar las fechas donde ya tiene asistencia
    const fechasAsistidas = await cargarAsistenciasEstudiante(estudiante.id);
    setFechasYaAsistidas(fechasAsistidas);
    
    setCargando(false);
  };

  const toggleFecha = (fecha) => {
    const fechaStr = fecha.toISOString().split('T')[0];
    // No permitir seleccionar fechas que ya tienen asistencia
    if (fechasYaAsistidas.includes(fechaStr)) {
      setMensaje(`⚠️ Este día ya tiene asistencia registrada (${fechaStr})`);
      setTimeout(() => setMensaje(''), 2000);
      return;
    }
    
    if (fechasSeleccionadas.includes(fechaStr)) {
      setFechasSeleccionadas(fechasSeleccionadas.filter(f => f !== fechaStr));
    } else {
      setFechasSeleccionadas([...fechasSeleccionadas, fechaStr]);
    }
  };

  const guardarAsistencia = async () => {
    if (fechasSeleccionadas.length === 0) {
      setMensaje("❌ Selecciona al menos una fecha");
      return;
    }

    setCargando(true);
    setMensaje("");

    try {
      const asistenciasRef = collection(db, "escuelas", user.escuelaId, "asistencias");
      let contadorNuevas = 0;
      let contadorExistentes = 0;

      for (const fecha of fechasSeleccionadas) {
        // Verificar si ya existe asistencia para esa fecha
        const q = query(
          asistenciasRef,
          where("estudianteId", "==", estudianteSeleccionado.id),
          where("fecha", "==", fecha)
        );
        const snapshot = await getDocs(q);
        
        if (snapshot.empty) {
          const asistenciaData = {
            qrCode: estudianteSeleccionado.qrCode,
            estudianteId: estudianteSeleccionado.id,
            estudianteNombre: estudianteSeleccionado.nombreCompleto,
            estudianteRut: estudianteSeleccionado.rut,
            estudianteCurso: estudianteSeleccionado.curso,
            fecha: fecha,
            hora: "09:00:00",
            timestamp: new Date(fecha + 'T12:00:00').toISOString(),
            presente: true,
            registradoPor: user.uid,
            registradoPorNombre: user.nombre,
            año: parseInt(fecha.split('-')[0]),
            mes: parseInt(fecha.split('-')[1]),
            semana: Math.ceil(parseInt(fecha.split('-')[2]) / 7)
          };
          await addDoc(asistenciasRef, asistenciaData);
          contadorNuevas++;
        } else {
          contadorExistentes++;
        }
      }

      setMensaje(`✅ Asistencia guardada: ${contadorNuevas} nuevas, ${contadorExistentes} ya existían`);
      setFechasSeleccionadas([]);
      
      // Recargar las asistencias del estudiante para actualizar el calendario
      const fechasActualizadas = await cargarAsistenciasEstudiante(estudianteSeleccionado.id);
      setFechasYaAsistidas(fechasActualizadas);
      
    } catch (error) {
      console.error("Error guardando asistencia:", error);
      setMensaje(`❌ Error: ${error.message}`);
    } finally {
      setCargando(false);
    }
  };

  const volverACursos = () => {
    setVista('curso');
    setEstudianteSeleccionado(null);
    setFechasSeleccionadas([]);
    setFechasYaAsistidas([]);
  };

  const volverAListaEstudiantes = () => {
    setEstudianteSeleccionado(null);
    setFechasSeleccionadas([]);
    setFechasYaAsistidas([]);
  };

  const esFechaHabil = (date) => {
    if (!configuracion) return true;
    const fechaStr = date.toISOString().split('T')[0];
    const diaSemana = date.getDay();
    const diasSinClases = new Set(configuracion.diasSinClases || []);
    
    if (configuracion.fechaInicioClases && fechaStr < configuracion.fechaInicioClases) return false;
    if (configuracion.fechaFinClases && fechaStr > configuracion.fechaFinClases) return false;
    if (diaSemana === 0 || diaSemana === 6) return false;
    if (diasSinClases.has(fechaStr)) return false;
    return true;
  };

  return (
    <div>
      <h2 style={{ color: colores.texto, marginTop: 0, marginBottom: '20px' }}>
        📝 Rellenar Asistencia Retroactiva
      </h2>

      {mensaje && (
        <div style={{
          background: mensaje.includes('✅') ? colores.successLight : 
                      mensaje.includes('⚠️') ? colores.warningLight : colores.dangerLight,
          border: `1px solid ${mensaje.includes('✅') ? colores.success : 
                               mensaje.includes('⚠️') ? colores.warning : colores.danger}`,
          borderRadius: '8px',
          padding: '12px',
          marginBottom: '20px',
          color: mensaje.includes('✅') ? colores.success : 
                 mensaje.includes('⚠️') ? colores.warning : colores.danger
        }}>
          {mensaje}
        </div>
      )}

      {/* Vista de selección de curso */}
      {vista === 'curso' && (
        <div style={{
          background: colores.tarjeta,
          borderRadius: '16px',
          padding: '20px',
          border: `1px solid ${colores.borde}`,
          boxShadow: '0 4px 6px rgba(0, 0, 0, 0.05)'
        }}>
          <h3 style={{ color: colores.texto, marginTop: 0, marginBottom: '20px' }}>
            📚 Seleccionar Curso
          </h3>
          
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
            gap: '15px'
          }}>
            {cursos.map(curso => (
              <button
                key={curso.id}
                onClick={() => cargarEstudiantes(curso.nombre)}
                style={{
                  background: colores.accentLight,
                  border: `1px solid ${colores.accent}`,
                  borderRadius: '8px',
                  padding: '15px',
                  color: colores.accent,
                  cursor: 'pointer',
                  textAlign: 'left',
                  transition: 'all 0.3s'
                }}
                onMouseEnter={(e) => e.currentTarget.style.background = '#d4e4f7'}
                onMouseLeave={(e) => e.currentTarget.style.background = colores.accentLight}
              >
                <span style={{ fontSize: '24px', display: 'block', marginBottom: '5px' }}>📚</span>
                <strong style={{ fontSize: '16px' }}>{curso.nombre}</strong>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Vista de lista de estudiantes */}
      {vista === 'estudiante' && !estudianteSeleccionado && (
        <div style={{
          background: colores.tarjeta,
          borderRadius: '16px',
          padding: '20px',
          border: `1px solid ${colores.borde}`,
          boxShadow: '0 4px 6px rgba(0, 0, 0, 0.05)'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px' }}>
            <button
              onClick={volverACursos}
              style={{
                background: colores.accentLight,
                border: `1px solid ${colores.accent}`,
                borderRadius: '8px',
                padding: '8px 16px',
                color: colores.accent,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '5px'
              }}
            >
              <span>←</span> Volver a cursos
            </button>
            <h3 style={{ color: colores.texto, margin: 0 }}>
              Estudiantes de {cursoSeleccionado}
            </h3>
            <div style={{ width: '80px' }}></div>
          </div>

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
            <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
              {estudiantes.length === 0 ? (
                <p style={{ color: colores.textoSecundario, textAlign: 'center', padding: '40px' }}>
                  No hay estudiantes en este curso
                </p>
              ) : (
                estudiantes.map((est, index) => (
                  <div
                    key={est.id}
                    onClick={() => seleccionarEstudiante(est)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      padding: '12px',
                      marginBottom: '5px',
                      background: index % 2 === 0 ? colores.accentLight : 'transparent',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      transition: 'all 0.3s'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.background = '#d4e4f7'}
                    onMouseLeave={(e) => e.currentTarget.style.background = index % 2 === 0 ? colores.accentLight : 'transparent'}
                  >
                    <div style={{ flex: 1 }}>
                      <div style={{ color: colores.texto, fontWeight: 'bold' }}>
                        {est.apellidoPaterno}, {est.nombres}
                      </div>
                      <div style={{ color: colores.textoSecundario, fontSize: '12px' }}>
                        {est.rut}
                      </div>
                    </div>
                    <span style={{ fontSize: '20px', color: colores.accent }}>→</span>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      )}

      {/* Vista de calendario para marcar fechas */}
      {estudianteSeleccionado && (
        <div style={{
          background: colores.tarjeta,
          borderRadius: '16px',
          padding: '20px',
          border: `1px solid ${colores.borde}`,
          boxShadow: '0 4px 6px rgba(0, 0, 0, 0.05)'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px' }}>
            <button
              onClick={volverAListaEstudiantes}
              style={{
                background: colores.accentLight,
                border: `1px solid ${colores.accent}`,
                borderRadius: '8px',
                padding: '8px 16px',
                color: colores.accent,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '5px'
              }}
            >
              <span>←</span> Volver a estudiantes
            </button>
            <div style={{ textAlign: 'center' }}>
              <h3 style={{ color: colores.texto, margin: 0 }}>
                {estudianteSeleccionado.apellidoPaterno}, {estudianteSeleccionado.nombres}
              </h3>
              <p style={{ color: colores.textoSecundario, margin: '5px 0 0' }}>
                {estudianteSeleccionado.curso} • {estudianteSeleccionado.rut}
              </p>
            </div>
            <div style={{ width: '80px' }}></div>
          </div>

          <div style={{
            background: colores.accentLight,
            borderRadius: '12px',
            padding: '20px',
            marginBottom: '20px',
            textAlign: 'center'
          }}>
            <p style={{ color: colores.textoSecundario, marginBottom: '10px' }}>
              📅 Haz clic en las fechas para marcar días de asistencia
            </p>
            <div style={{ display: 'flex', justifyContent: 'center', gap: '20px', marginBottom: '10px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                <div style={{ width: '16px', height: '16px', background: colores.success, borderRadius: '4px' }}></div>
                <span style={{ color: colores.textoSecundario, fontSize: '12px' }}>Días con asistencia</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                <div style={{ width: '16px', height: '16px', background: colores.warning, borderRadius: '4px' }}></div>
                <span style={{ color: colores.textoSecundario, fontSize: '12px' }}>Días seleccionados</span>
              </div>
            </div>
            <p style={{ color: colores.textoSecundario, fontSize: '12px', margin: 0 }}>
              Días seleccionados: <strong style={{ color: colores.success }}>{fechasSeleccionadas.length}</strong> | 
              Días ya registrados: <strong style={{ color: colores.accent }}>{fechasYaAsistidas.length}</strong>
            </p>
          </div>

          <Calendar
            onChange={toggleFecha}
            value={new Date()}
            tileClassName={({ date }) => {
              const fechaStr = date.toISOString().split('T')[0];
              if (fechasYaAsistidas.includes(fechaStr)) {
                return 'fecha-asistida';
              }
              if (fechasSeleccionadas.includes(fechaStr)) {
                return 'fecha-seleccionada';
              }
              if (!esFechaHabil(date)) {
                return 'fecha-no-habil';
              }
              return '';
            }}
            minDate={configuracion?.fechaInicioClases ? new Date(configuracion.fechaInicioClases) : null}
            maxDate={configuracion?.fechaFinClases ? new Date(configuracion.fechaFinClases) : null}
          />

          <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
            <button
              onClick={() => setFechasSeleccionadas([])}
              style={{
                flex: 1,
                padding: '10px',
                background: 'transparent',
                border: `1px solid ${colores.borde}`,
                borderRadius: '8px',
                color: colores.textoSecundario,
                cursor: 'pointer'
              }}
            >
              Limpiar selección
            </button>
            <button
              onClick={guardarAsistencia}
              disabled={cargando || fechasSeleccionadas.length === 0}
              style={{
                flex: 2,
                padding: '10px',
                background: (cargando || fechasSeleccionadas.length === 0) ? colores.textoSecundario : colores.success,
                border: 'none',
                borderRadius: '8px',
                color: 'white',
                fontWeight: 'bold',
                cursor: (cargando || fechasSeleccionadas.length === 0) ? 'not-allowed' : 'pointer',
                opacity: (cargando || fechasSeleccionadas.length === 0) ? 0.7 : 1
              }}
            >
              {cargando ? 'Guardando...' : `Guardar asistencia (${fechasSeleccionadas.length} días)`}
            </button>
          </div>

          {/* Resumen de fechas seleccionadas */}
          {fechasSeleccionadas.length > 0 && (
            <div style={{
              marginTop: '20px',
              padding: '15px',
              background: colores.accentLight,
              borderRadius: '8px',
              maxHeight: '150px',
              overflowY: 'auto'
            }}>
              <p style={{ color: colores.texto, fontSize: '12px', marginBottom: '10px' }}>
                📅 Días seleccionados para agregar:
              </p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                {fechasSeleccionadas.sort().map(fecha => (
                  <span
                    key={fecha}
                    style={{
                      background: colores.warningLight,
                      color: colores.warning,
                      padding: '4px 10px',
                      borderRadius: '20px',
                      fontSize: '12px',
                      fontWeight: 'bold'
                    }}
                  >
                    {fecha}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Resumen de días ya asistidos */}
          {fechasYaAsistidas.length > 0 && (
            <div style={{
              marginTop: '15px',
              padding: '15px',
              background: colores.successLight,
              borderRadius: '8px',
              maxHeight: '150px',
              overflowY: 'auto'
            }}>
              <p style={{ color: colores.texto, fontSize: '12px', marginBottom: '10px' }}>
                ✅ Días con asistencia registrada (no se pueden modificar):
              </p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                {fechasYaAsistidas.sort().map(fecha => (
                  <span
                    key={fecha}
                    style={{
                      background: colores.successLight,
                      color: colores.success,
                      padding: '4px 10px',
                      borderRadius: '20px',
                      fontSize: '12px',
                      border: `1px solid ${colores.success}`
                    }}
                  >
                    {fecha}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      <style>{`
        .react-calendar {
          width: 100%;
          background: ${colores.tarjeta};
          border: 1px solid ${colores.borde};
          border-radius: 12px;
          padding: 10px;
          font-family: inherit;
        }
        .react-calendar__navigation {
          background: ${colores.accentLight};
          border-radius: 8px;
          margin-bottom: 10px;
          padding: 5px;
        }
        .react-calendar__navigation button {
          color: ${colores.texto};
          font-size: 16px;
          border-radius: 6px;
        }
        .react-calendar__navigation button:enabled:hover,
        .react-calendar__navigation button:enabled:focus {
          background: ${colores.accentLight};
          color: ${colores.accent};
        }
        .react-calendar__month-view__weekdays {
          color: ${colores.textoSecundario};
          font-weight: bold;
        }
        .react-calendar__month-view__weekdays__weekday {
          padding: 8px;
        }
        .react-calendar__tile {
          color: ${colores.texto};
          background: transparent;
          border-radius: 6px;
          padding: 10px;
        }
        .react-calendar__tile:enabled:hover,
        .react-calendar__tile:enabled:focus {
          background: ${colores.accentLight};
          color: ${colores.accent};
        }
        .react-calendar__tile--active {
          background: ${colores.accent} !important;
          color: white !important;
        }
        .fecha-asistida {
          background: ${colores.successLight} !important;
          color: ${colores.success} !important;
          border-radius: 6px;
          border: 1px solid ${colores.success} !important;
        }
        .fecha-seleccionada {
          background: ${colores.warningLight} !important;
          color: ${colores.warning} !important;
          border-radius: 6px;
          border: 1px solid ${colores.warning} !important;
        }
        .fecha-no-habil {
          background: ${colores.dangerLight} !important;
          color: ${colores.danger} !important;
          text-decoration: line-through;
          cursor: not-allowed;
          opacity: 0.6;
        }
        .react-calendar__tile--now {
          background: ${colores.accentLight} !important;
          border: 1px solid ${colores.accent} !important;
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}

export default RellenarAsistencia;