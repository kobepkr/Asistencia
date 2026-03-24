import React, { useState, useEffect } from 'react';
import { collection, getDocs, query, where, orderBy, doc, getDoc } from 'firebase/firestore';
import { db } from '../../firebase';
import * as XLSX from 'xlsx';

// Paleta de colores suaves (consistente con los demás componentes)
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

function ReportesEscuela({ user }) {
  const [estudiantes, setEstudiantes] = useState([]);
  const [cargando, setCargando] = useState(false);
  const [configuracion, setConfiguracion] = useState(null);
  
  // Estados para búsqueda por RUT
  const [rutBusqueda, setRutBusqueda] = useState('');
  const [estudianteEncontrado, setEstudianteEncontrado] = useState(null);
  const [asistenciasEstudiante, setAsistenciasEstudiante] = useState([]);
  const [buscando, setBuscando] = useState(false);
  
  // Estados para filtros de porcentaje
  const [filtroPorcentaje, setFiltroPorcentaje] = useState('todos');
  const [resultadosFiltrados, setResultadosFiltrados] = useState([]);
  const [filtroAplicado, setFiltroAplicado] = useState(false);
  const [diasHabilesActuales, setDiasHabilesActuales] = useState(0);
  const [estadisticasGlobales, setEstadisticasGlobales] = useState({
    totalEstudiantes: 0,
    mayor85: 0,
    menor85: 0
  });
  
  // Cargar datos al inicio
  useEffect(() => {
    const cargarTodo = async () => {
      await cargarConfiguracion();
      await cargarEstudiantes();
    };
    cargarTodo();
  }, []);

  // Calcular días hábiles cuando cambia la configuración
  useEffect(() => {
    if (configuracion) {
      const dias = calcularDiasHabilesHoy();
      setDiasHabilesActuales(dias);
      console.log(`📅 Días hábiles calculados: ${dias}`);
    }
  }, [configuracion]);

  const calcularDiasHabilesHoy = () => {
    if (!configuracion) return 0;

    const hoy = new Date();
    hoy.setHours(12, 0, 0, 0);
    
    const inicio = new Date(configuracion.fechaInicioClases + 'T12:00:00');
    const diasSinClases = new Set(configuracion.diasSinClases || []);
    
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
    
    return count;
  };

  // Función para probar días hábiles (puedes eliminarla después)
  const probarDiasHabiles = (fechaPrueba) => {
    if (!configuracion) return;

    const fecha = new Date(fechaPrueba + 'T12:00:00');
    const inicio = new Date(configuracion.fechaInicioClases + 'T12:00:00');
    const diasSinClases = new Set(configuracion.diasSinClases || []);
    
    let count = 0;
    let currentDate = new Date(inicio);

    while (currentDate <= fecha) {
      const diaSemana = currentDate.getDay();
      const fechaStr = currentDate.toISOString().split('T')[0];
      
      if (diaSemana !== 0 && diaSemana !== 6 && !diasSinClases.has(fechaStr)) {
        count++;
      }
      
      currentDate.setDate(currentDate.getDate() + 1);
    }
    
    console.log(`📅 Para fecha ${fechaPrueba}: ${count} días hábiles`);
    return count;
  };

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

  const cargarEstudiantes = async () => {
    try {
      const estudiantesRef = collection(db, "escuelas", user.escuelaId, "estudiantes");
      const estudiantesSnap = await getDocs(estudiantesRef);
      const listaEstudiantes = estudiantesSnap.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        nombreCompleto: `${doc.data().nombres || ''} ${doc.data().apellidoPaterno || ''}`.trim()
      }));
      setEstudiantes(listaEstudiantes);
      
    } catch (error) {
      console.error("Error cargando estudiantes:", error);
    }
  };

  // Buscar por RUT
  const buscarPorRut = async () => {
    if (!rutBusqueda.trim()) {
      alert('Ingresa un RUT para buscar');
      return;
    }

    setBuscando(true);
    setEstudianteEncontrado(null);
    setAsistenciasEstudiante([]);
    
    try {
      const rutLimpio = rutBusqueda.replace(/[^0-9kK]/g, '').toLowerCase();
      
      const estudiante = estudiantes.find(est => {
        const estRutLimpio = est.rut?.replace(/[^0-9kK]/g, '').toLowerCase();
        return estRutLimpio === rutLimpio;
      });

      if (estudiante) {
        const hoy = new Date().toISOString().split('T')[0];
        
        const asistenciasRef = collection(db, "escuelas", user.escuelaId, "asistencias");
        const q = query(
          asistenciasRef,
          where("estudianteId", "==", estudiante.id),
          where("fecha", ">=", configuracion.fechaInicioClases),
          where("fecha", "<=", hoy),
          orderBy("fecha", "desc")
        );
        
        const asistenciasSnap = await getDocs(q);
        const listaAsistencias = asistenciasSnap.docs.map(doc => doc.data());
        setAsistenciasEstudiante(listaAsistencias);
        
        const diasPresentes = listaAsistencias.length;
        const porcentaje = diasHabilesActuales > 0 
          ? ((diasPresentes / diasHabilesActuales) * 100).toFixed(1) 
          : 0;
        
        setEstudianteEncontrado({
          ...estudiante,
          diasHabiles: diasHabilesActuales,
          diasPresentes,
          diasAusentes: diasHabilesActuales - diasPresentes,
          porcentaje: parseFloat(porcentaje)
        });
        
      } else {
        alert('No se encontró ningún estudiante con ese RUT');
      }
    } catch (error) {
      console.error("Error en búsqueda:", error);
    } finally {
      setBuscando(false);
    }
  };

  // Aplicar filtro por porcentaje
  // Aplicar filtro por porcentaje
const aplicarFiltroPorcentaje = async () => {
  setCargando(true);
  setFiltroAplicado(false);
  
  try {
    const hoy = new Date().toISOString().split('T')[0];
    const resultados = [];
    let mayores85 = 0;
    let menores85 = 0;
    
    for (const estudiante of estudiantes) {
      const asistenciasRef = collection(db, "escuelas", user.escuelaId, "asistencias");
      const q = query(
        asistenciasRef,
        where("estudianteId", "==", estudiante.id),
        where("fecha", ">=", configuracion.fechaInicioClases),
        where("fecha", "<=", hoy)
      );
      
      const asistenciasSnap = await getDocs(q);
      const diasPresentes = asistenciasSnap.size;
      const porcentaje = diasHabilesActuales > 0 
        ? ((diasPresentes / diasHabilesActuales) * 100).toFixed(1) 
        : 0;
      const porcentajeNum = parseFloat(porcentaje);
      
      const estudianteConStats = {
        ...estudiante,
        diasHabiles: diasHabilesActuales,
        diasPresentes,
        diasAusentes: diasHabilesActuales - diasPresentes,
        porcentaje: porcentajeNum
      };
      
      if (filtroPorcentaje === 'todos') {
        resultados.push(estudianteConStats);
        if (porcentajeNum >= 85) {
          mayores85++;
        } else {
          menores85++;
        }
      } else if (filtroPorcentaje === 'mayor85' && porcentajeNum >= 85) {
        resultados.push(estudianteConStats);
        mayores85++;
      } else if (filtroPorcentaje === 'menor85' && porcentajeNum < 85) {
        resultados.push(estudianteConStats);
        menores85++;
      }
    }
    
    resultados.sort((a, b) => b.porcentaje - a.porcentaje);
    setResultadosFiltrados(resultados);
    setFiltroAplicado(true);
    
    setEstadisticasGlobales({
      totalEstudiantes: estudiantes.length,
      mayor85: mayores85,
      menor85: menores85
    });
    
  } catch (error) {
    console.error("Error aplicando filtro:", error);
  } finally {
    setCargando(false);
  }
};




  const exportarAExcel = () => {
    const datosExportar = resultadosFiltrados.map(est => ({
      'Nombre': est.nombreCompleto,
      'RUT': est.rut,
      'Curso': est.curso,
      'Días hábiles': est.diasHabiles,
      'Días presente': est.diasPresentes,
      'Días ausente': est.diasAusentes,
      'Porcentaje': `${est.porcentaje}%`
    }));

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(datosExportar);
    XLSX.utils.book_append_sheet(wb, ws, 'Reporte');
    XLSX.writeFile(wb, `reporte_asistencia_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  return (
    <div>
      <h2 style={{ color: colores.texto, marginTop: 0, marginBottom: '20px' }}>
        📊 Reportes de Asistencia
      </h2>

      {/* Información del período */}
      {configuracion && (
        <div style={{
          background: colores.tarjeta,
          borderRadius: '12px',
          padding: '15px',
          marginBottom: '20px',
          border: `1px solid ${colores.borde}`,
          boxShadow: '0 2px 4px rgba(0, 0, 0, 0.05)'
        }}>
          <div style={{ 
            display: 'flex', 
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '10px'
          }}>
            <div style={{ color: colores.texto }}>
              📅 Período: {configuracion.fechaInicioClases} → {configuracion.fechaFinClases}
            </div>
            <div style={{ 
              background: colores.successLight,
              padding: '8px 15px',
              borderRadius: '20px',
              border: `1px solid ${colores.success}`,
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px'
            }}>
              <span style={{ color: colores.success, fontSize: '14px' }}>📊</span>
              <span style={{ color: colores.texto, fontWeight: 'bold' }}>
                Días hábiles hasta hoy: {diasHabilesActuales}
              </span>
            </div>
          </div>
          
          {configuracion.fechaFinClases && (
            <div style={{ marginTop: '10px' }}>
              <div style={{
                width: '100%',
                height: '4px',
                background: colores.accentLight,
                borderRadius: '2px',
                overflow: 'hidden'
              }}>
                <div style={{
                  width: `${Math.min(100, (diasHabilesActuales / 200) * 100)}%`,
                  height: '100%',
                  background: `linear-gradient(90deg, ${colores.success}, ${colores.accent})`,
                  borderRadius: '2px',
                  transition: 'width 0.3s'
                }}></div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Buscador por RUT */}
      <div style={{
        background: colores.tarjeta,
        borderRadius: '12px',
        padding: '20px',
        marginBottom: '20px',
        border: `1px solid ${colores.borde}`,
        boxShadow: '0 2px 4px rgba(0, 0, 0, 0.05)'
      }}>
        <h3 style={{ color: colores.texto, marginTop: 0, marginBottom: '15px', fontSize: '1.1rem' }}>
          🔍 Buscar estudiante por RUT
        </h3>
        <div style={{ display: 'flex', gap: '10px' }}>
          <input
            type="text"
            value={rutBusqueda}
            onChange={(e) => setRutBusqueda(e.target.value)}
            placeholder="Ej: 12.345.678-9"
            style={{
              flex: 1,
              height: '40px',
              background: colores.tarjeta,
              border: `1px solid ${colores.borde}`,
              borderRadius: '8px',
              padding: '0 12px',
              color: colores.texto,
              fontSize: '14px'
            }}
            onKeyPress={(e) => e.key === 'Enter' && buscarPorRut()}
          />
          <button
            onClick={buscarPorRut}
            disabled={buscando}
            style={{
              height: '40px',
              padding: '0 25px',
              background: buscando ? colores.textoSecundario : colores.accent,
              border: 'none',
              borderRadius: '8px',
              color: 'white',
              fontSize: '14px',
              fontWeight: 'bold',
              cursor: buscando ? 'not-allowed' : 'pointer',
              opacity: buscando ? 0.7 : 1,
              transition: 'all 0.3s'
            }}
          >
            {buscando ? 'Buscando...' : 'Buscar'}
          </button>
        </div>

        {/* Resultado de búsqueda */}
        {estudianteEncontrado && (
          <div style={{
            marginTop: '20px',
            background: colores.successLight,
            borderRadius: '8px',
            padding: '15px',
            border: `1px solid ${colores.success}`
          }}>
            <h4 style={{ color: colores.success, margin: '0 0 10px 0', fontWeight: 'bold' }}>
              ✅ Resultado de búsqueda
            </h4>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <div>
                <span style={{ color: colores.textoSecundario }}>Nombre:</span>
                <span style={{ color: colores.texto, marginLeft: '10px', fontWeight: '500' }}>{estudianteEncontrado.nombreCompleto}</span>
              </div>
              <div>
                <span style={{ color: colores.textoSecundario }}>RUT:</span>
                <span style={{ color: colores.texto, marginLeft: '10px' }}>{estudianteEncontrado.rut}</span>
              </div>
              <div>
                <span style={{ color: colores.textoSecundario }}>Curso:</span>
                <span style={{ color: colores.texto, marginLeft: '10px' }}>{estudianteEncontrado.curso}</span>
              </div>
              <div>
                <span style={{ color: colores.textoSecundario }}>Asistencia:</span>
                <span style={{
                  color: estudianteEncontrado.porcentaje >= 85 ? colores.success : colores.danger,
                  marginLeft: '10px',
                  fontWeight: 'bold'
                }}>
                  {estudianteEncontrado.porcentaje}% ({estudianteEncontrado.diasPresentes}/{diasHabilesActuales} días)
                </span>
              </div>
            </div>

            {asistenciasEstudiante.length > 0 && (
              <div style={{ marginTop: '15px' }}>
                <p style={{ color: colores.texto, margin: '0 0 10px 0', fontWeight: '500' }}>📋 Últimas asistencias:</p>
                <div style={{ maxHeight: '150px', overflowY: 'auto' }}>
                  {asistenciasEstudiante.slice(0, 10).map((asis, idx) => (
                    <div key={idx} style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      padding: '8px 10px',
                      background: idx % 2 === 0 ? colores.accentLight : 'transparent',
                      borderRadius: '4px',
                      marginBottom: '2px'
                    }}>
                      <span style={{ color: colores.texto }}>{asis.fecha}</span>
                      <span style={{ color: colores.textoSecundario }}>{asis.hora}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Filtros por porcentaje */}
      <div style={{
        background: colores.tarjeta,
        borderRadius: '12px',
        padding: '20px',
        marginBottom: '20px',
        border: `1px solid ${colores.borde}`,
        boxShadow: '0 2px 4px rgba(0, 0, 0, 0.05)'
      }}>
        <h3 style={{ color: colores.texto, marginTop: 0, marginBottom: '15px', fontSize: '1.1rem' }}>
          📊 Filtrar por porcentaje de asistencia
        </h3>
        
        <div style={{ display: 'flex', gap: '10px', marginBottom: '15px' }}>
          <select
            value={filtroPorcentaje}
            onChange={(e) => setFiltroPorcentaje(e.target.value)}
            style={{
              flex: 1,
              height: '40px',
              background: colores.tarjeta,
              border: `1px solid ${colores.borde}`,
              borderRadius: '8px',
              padding: '0 12px',
              color: colores.texto,
              fontSize: '14px',
              cursor: 'pointer'
            }}
          >
            <option value="todos" style={{ color: colores.texto }}>📋 Todos los estudiantes</option>
            <option value="mayor85" style={{ color: colores.texto }}>🏆 Mayor o igual a 85% asistencia</option>
            <option value="menor85" style={{ color: colores.texto }}>⚠️ Menor a 85% asistencia</option>
          </select>
          
          <button
            onClick={aplicarFiltroPorcentaje}
            disabled={cargando}
            style={{
              height: '40px',
              padding: '0 25px',
              background: cargando ? colores.textoSecundario : colores.accent,
              border: 'none',
              borderRadius: '8px',
              color: 'white',
              fontSize: '14px',
              fontWeight: 'bold',
              cursor: cargando ? 'not-allowed' : 'pointer',
              opacity: cargando ? 0.7 : 1,
              transition: 'all 0.3s'
            }}
          >
            {cargando ? 'Calculando...' : 'Aplicar filtro'}
          </button>
        </div>
      </div>

      {/* Resultados del filtro */}
      {filtroAplicado && (
        <div style={{
          background: colores.tarjeta,
          borderRadius: '12px',
          padding: '20px',
          border: `1px solid ${colores.borde}`,
          boxShadow: '0 2px 4px rgba(0, 0, 0, 0.05)'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '15px' }}>
            <h3 style={{ color: colores.texto, margin: 0, fontSize: '1.1rem' }}>
              {filtroPorcentaje === 'mayor85' ? '🏆 Estudiantes con ≥85% asistencia' :
               filtroPorcentaje === 'menor85' ? '⚠️ Estudiantes con <85% asistencia' :
               '📋 Todos los estudiantes'}
            </h3>
            {resultadosFiltrados.length > 0 && (
              <button
                onClick={exportarAExcel}
                style={{
                  height: '36px',
                  padding: '0 20px',
                  background: colores.warning,
                  border: 'none',
                  borderRadius: '8px',
                  color: 'white',
                  fontSize: '14px',
                  fontWeight: 'bold',
                  cursor: 'pointer',
                  transition: 'all 0.3s'
                }}
              >
                📥 Excel
              </button>
            )}
          </div>

          {resultadosFiltrados.length > 0 ? (
            <div style={{ maxHeight: '400px', overflowY: 'auto', border: `1px solid ${colores.borde}`, borderRadius: '8px' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead style={{ background: colores.accentLight, position: 'sticky', top: 0 }}>
                  <tr>
                    <th style={{ padding: '12px', textAlign: 'left', color: colores.texto }}>#</th>
                    <th style={{ padding: '12px', textAlign: 'left', color: colores.texto }}>Nombre</th>
                    <th style={{ padding: '12px', textAlign: 'left', color: colores.texto }}>RUT</th>
                    <th style={{ padding: '12px', textAlign: 'left', color: colores.texto }}>Curso</th>
                    <th style={{ padding: '12px', textAlign: 'left', color: colores.texto }}>Presente</th>
                    <th style={{ padding: '12px', textAlign: 'left', color: colores.texto }}>Ausente</th>
                    <th style={{ padding: '12px', textAlign: 'left', color: colores.texto }}>%</th>
                  </tr>
                </thead>
                <tbody>
                  {resultadosFiltrados.map((est, index) => (
                    <tr key={est.id} style={{
                      borderBottom: `1px solid ${colores.borde}`,
                      background: index % 2 === 0 ? 'transparent' : colores.accentLight
                    }}>
                      <td style={{ padding: '12px', color: colores.textoSecundario }}>{index + 1}</td>
                      <td style={{ padding: '12px', color: colores.texto }}>{est.nombreCompleto}</td>
                      <td style={{ padding: '12px', color: colores.textoSecundario }}>{est.rut}</td>
                      <td style={{ padding: '12px', color: colores.textoSecundario }}>{est.curso}</td>
                      <td style={{ padding: '12px', color: colores.success, fontWeight: 'bold' }}>{est.diasPresentes}</td>
                      <td style={{ padding: '12px', color: colores.danger, fontWeight: 'bold' }}>{est.diasAusentes}</td>
                      <td style={{ padding: '12px' }}>
                        <span style={{
                          background: est.porcentaje >= 85 ? colores.successLight : colores.dangerLight,
                          color: est.porcentaje >= 85 ? colores.success : colores.danger,
                          padding: '4px 10px',
                          borderRadius: '20px',
                          fontSize: '12px',
                          fontWeight: 'bold'
                        }}>
                          {est.porcentaje}%
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p style={{ color: colores.textoSecundario, textAlign: 'center', padding: '20px' }}>
              No hay estudiantes que cumplan con el filtro seleccionado
            </p>
          )}
        </div>
      )}
    </div>
  );
}

export default ReportesEscuela;