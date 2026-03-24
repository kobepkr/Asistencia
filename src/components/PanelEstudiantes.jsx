import React, { useState, useEffect } from 'react';
import { collection, query, getDocs, where, orderBy } from 'firebase/firestore';
import { db } from '../firebase';
import { useNavigate } from 'react-router-dom';

function PanelEstudiantes() {
  const [estudiantes, setEstudiantes] = useState([]);
  const [asistenciasHoy, setAsistenciasHoy] = useState({});
  const [cargando, setCargando] = useState(false);
  const [filtroCurso, setFiltroCurso] = useState('');
  const [cursos, setCursos] = useState([]);
  const [fechaSeleccionada, setFechaSeleccionada] = useState(
    new Date().toISOString().split('T')[0]
  );
  const [estadisticas, setEstadisticas] = useState({
    presentes: 0,
    ausentes: 0,
    total: 0,
    porcentaje: 0
  });
  const [vista, setVista] = useState('tabla'); // 'tabla' o 'tarjetas'
  const [busqueda, setBusqueda] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    cargarCursos();
  }, []);

  useEffect(() => {
    if (filtroCurso) {
      cargarEstudiantesYAsistencias();
    } else {
      setEstudiantes([]);
      setAsistenciasHoy({});
      setEstadisticas({
        presentes: 0,
        ausentes: 0,
        total: 0,
        porcentaje: 0
      });
    }
  }, [filtroCurso, fechaSeleccionada]);

  const cargarCursos = async () => {
    try {
      const querySnapshot = await getDocs(collection(db, "estudiantes"));
      const cursosSet = new Set();
      
      querySnapshot.forEach(doc => {
        const data = doc.data();
        if (data.curso) cursosSet.add(data.curso);
      });
      
      setCursos(['todos', ...Array.from(cursosSet).sort()]);
    } catch (error) {
      console.error("Error cargando cursos:", error);
    }
  };

  const cargarEstudiantesYAsistencias = async () => {
    if (!filtroCurso) return;
    
    setCargando(true);
    try {
      const estudiantesQuery = filtroCurso === 'todos' 
        ? query(collection(db, "estudiantes"), orderBy('nombre'))
        : query(collection(db, "estudiantes"), where('curso', '==', filtroCurso), orderBy('nombre'));
      
      const estudiantesSnapshot = await getDocs(estudiantesQuery);
      const estudiantesList = [];
      
      estudiantesSnapshot.forEach(doc => {
        const data = doc.data();
        estudiantesList.push({ id: doc.id, ...data });
      });
      
      setEstudiantes(estudiantesList);

      const asistenciasQuery = query(
        collection(db, "asistencias"),
        where('fecha', '==', fechaSeleccionada)
      );
      
      const asistenciasSnapshot = await getDocs(asistenciasQuery);
      const asistenciasMap = {};
      
      asistenciasSnapshot.forEach(doc => {
        const data = doc.data();
        if (data.qrCode) {
          asistenciasMap[data.qrCode] = {
            presente: true,
            hora: data.hora,
            id: doc.id
          };
        }
      });
      
      setAsistenciasHoy(asistenciasMap);

      const presentes = estudiantesList.filter(e => asistenciasMap[e.qrCode]).length;
      setEstadisticas({
        presentes,
        ausentes: estudiantesList.length - presentes,
        total: estudiantesList.length,
        porcentaje: estudiantesList.length > 0 ? (presentes / estudiantesList.length * 100) : 0
      });

    } catch (error) {
      console.error("Error cargando datos:", error);
    } finally {
      setCargando(false);
    }
  };

  const cambiarFecha = (dias) => {
    const fecha = new Date(fechaSeleccionada);
    fecha.setDate(fecha.getDate() + dias);
    setFechaSeleccionada(fecha.toISOString().split('T')[0]);
  };

  const formatearFecha = (fechaStr) => {
    const [year, month, day] = fechaStr.split('-').map(Number);
    const fecha = new Date(Date.UTC(year, month - 1, day));
    return fecha.toLocaleDateString('es-ES', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      timeZone: 'UTC'
    });
  };

  const formatearFechaAmigable = (fechaStr) => {
    const [year, month, day] = fechaStr.split('-').map(Number);
    const fecha = new Date(Date.UTC(year, month - 1, day));
    
    const hoy = new Date();
    hoy.setUTCHours(0, 0, 0, 0);
    
    const ayer = new Date(hoy);
    ayer.setUTCDate(ayer.getUTCDate() - 1);
    
    const mañana = new Date(hoy);
    mañana.setUTCDate(mañana.getUTCDate() + 1);
    
    const fechaUTC = new Date(Date.UTC(year, month - 1, day));
    
    if (fechaUTC.getTime() === hoy.getTime()) return 'Hoy';
    if (fechaUTC.getTime() === ayer.getTime()) return 'Ayer';
    if (fechaUTC.getTime() === mañana.getTime()) return 'Mañana';
    
    return fecha.toLocaleDateString('es-ES', { 
      day: 'numeric', 
      month: 'short',
      timeZone: 'UTC'
    });
  };

const estudiantesFiltrados = estudiantes.filter(estudiante => {
  if (filtroCurso === 'todos') return true;
  return estudiante.curso === filtroCurso;
}).filter(estudiante => {
  if (!busqueda) return true;
  
  // Crear nombre completo manejando valores null/undefined
  const nombrePartes = [
    estudiante.nombre || '',
    estudiante.apellidoPaterno || '',
    estudiante.apellidoMaterno || ''
  ];
  
  const nombreCompleto = nombrePartes
    .filter(parte => parte.trim() !== '') // Eliminar partes vacías
    .join(' ')
    .toLowerCase();
  
  return nombreCompleto.includes(busqueda.toLowerCase());
});
  if (cargando) {
    return (
      <div style={{
        minHeight: '100vh',
        width: '100%',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        padding: '16px'
      }}>
        <div style={{
          background: 'rgba(255,255,255,0.1)',
          backdropFilter: 'blur(10px)',
          borderRadius: '24px',
          padding: '40px',
          textAlign: 'center',
          border: '1px solid rgba(255,255,255,0.2)'
        }}>
          <div style={{
            width: '60px',
            height: '60px',
            border: '3px solid rgba(255,255,255,0.3)',
            borderTopColor: 'white',
            borderRadius: '50%',
            margin: '0 auto 20px',
            animation: 'spin 1s linear infinite'
          }}></div>
          <p style={{ color: 'white', fontSize: '18px', margin: 0 }}>Cargando estudiantes...</p>
        </div>
      </div>
    );
  }

  return (
    <div style={{
      minHeight: '100vh',
      width: '100%',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      padding: '20px',
      position: 'relative',
      overflow: 'hidden'
    }}>
      {/* Fondo animado */}
      <div style={{
        position: 'fixed',
        inset: 0,
        overflow: 'hidden',
        pointerEvents: 'none'
      }}>
        <div style={{
          position: 'absolute',
          top: '-10%',
          left: '-10%',
          width: '500px',
          height: '500px',
          background: 'rgba(168, 85, 247, 0.3)',
          borderRadius: '50%',
          filter: 'blur(80px)',
          animation: 'float 20s infinite'
        }}></div>
        <div style={{
          position: 'absolute',
          bottom: '-10%',
          right: '-10%',
          width: '500px',
          height: '500px',
          background: 'rgba(236, 72, 153, 0.3)',
          borderRadius: '50%',
          filter: 'blur(80px)',
          animation: 'float 20s infinite reverse'
        }}></div>
      </div>

      {/* Contenedor principal */}
      <div style={{
        position: 'relative',
        zIndex: 10,
        maxWidth: '1200px',
        margin: '0 auto'
      }}>
        
        {/* Header con botón volver y título */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '25px',
          background: 'rgba(255,255,255,0.1)',
          backdropFilter: 'blur(10px)',
          borderRadius: '50px',
          padding: '10px 20px',
          border: '1px solid rgba(255,255,255,0.2)'
        }}>
          <button
            onClick={() => navigate('/')}
            style={{
              background: 'rgba(255,255,255,0.15)',
              border: 'none',
              borderRadius: '40px',
              padding: '10px 25px',
              color: 'white',
              fontSize: '14px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              transition: 'all 0.3s',
              fontWeight: '500'
            }}
            onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.25)'}
            onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.15)'}
          >
            <span style={{ fontSize: '18px' }}>←</span>
            Volver al Escáner
          </button>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ color: 'white', fontSize: '18px' }}>📊</span>
            <span style={{ color: 'white', fontSize: '16px', fontWeight: 'bold' }}>Panel de Control</span>
          </div>

          <div style={{ 
            background: 'rgba(255,255,255,0.15)', 
            borderRadius: '40px', 
            padding: '8px 20px',
            color: 'white',
            fontSize: '14px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            <span>📅</span>
            {formatearFechaAmigable(fechaSeleccionada)}
          </div>
        </div>

        {/* Tarjetas de estadísticas con diseño mejorado */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '16px',
          marginBottom: '25px'
        }}>
          {/* Tarjeta Total */}
          <div style={{
            background: 'linear-gradient(135deg, #3b82f6, #2563eb)',
            borderRadius: '20px',
            padding: '20px',
            boxShadow: '0 15px 30px -10px rgba(59,130,246,0.5)',
            border: '1px solid rgba(255,255,255,0.2)',
            backdropFilter: 'blur(10px)',
            transition: 'transform 0.3s'
          }}
          onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-5px)'}
          onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '15px' }}>
              <div style={{
                width: '40px',
                height: '40px',
                background: 'rgba(255,255,255,0.2)',
                borderRadius: '12px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '20px'
              }}>
                👥
              </div>
              <div style={{ fontSize: '14px', color: 'rgba(255,255,255,0.9)' }}>Total</div>
            </div>
            <div style={{ fontSize: '36px', fontWeight: 'bold', color: 'white', marginBottom: '5px' }}>{estadisticas.total}</div>
            <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.7)' }}>estudiantes</div>
          </div>

          {/* Tarjeta Presentes */}
          <div style={{
            background: 'linear-gradient(135deg, #10b981, #059669)',
            borderRadius: '20px',
            padding: '20px',
            boxShadow: '0 15px 30px -10px rgba(16,185,129,0.5)',
            border: '1px solid rgba(255,255,255,0.2)',
            backdropFilter: 'blur(10px)',
            transition: 'transform 0.3s'
          }}
          onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-5px)'}
          onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '15px' }}>
              <div style={{
                width: '40px',
                height: '40px',
                background: 'rgba(255,255,255,0.2)',
                borderRadius: '12px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '20px'
              }}>
                ✅
              </div>
              <div style={{ fontSize: '14px', color: 'rgba(255,255,255,0.9)' }}>Presentes</div>
            </div>
            <div style={{ fontSize: '36px', fontWeight: 'bold', color: 'white', marginBottom: '5px' }}>{estadisticas.presentes}</div>
            <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.7)' }}>hoy</div>
          </div>

          {/* Tarjeta Ausentes */}
          <div style={{
            background: 'linear-gradient(135deg, #ef4444, #dc2626)',
            borderRadius: '20px',
            padding: '20px',
            boxShadow: '0 15px 30px -10px rgba(239,68,68,0.5)',
            border: '1px solid rgba(255,255,255,0.2)',
            backdropFilter: 'blur(10px)',
            transition: 'transform 0.3s'
          }}
          onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-5px)'}
          onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '15px' }}>
              <div style={{
                width: '40px',
                height: '40px',
                background: 'rgba(255,255,255,0.2)',
                borderRadius: '12px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '20px'
              }}>
                ❌
              </div>
              <div style={{ fontSize: '14px', color: 'rgba(255,255,255,0.9)' }}>Ausentes</div>
            </div>
            <div style={{ fontSize: '36px', fontWeight: 'bold', color: 'white', marginBottom: '5px' }}>{estadisticas.ausentes}</div>
            <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.7)' }}>hoy</div>
          </div>

          {/* Tarjeta Porcentaje */}
          <div style={{
            background: 'linear-gradient(135deg, #f59e0b, #d97706)',
            borderRadius: '20px',
            padding: '20px',
            boxShadow: '0 15px 30px -10px rgba(245,158,11,0.5)',
            border: '1px solid rgba(255,255,255,0.2)',
            backdropFilter: 'blur(10px)',
            transition: 'transform 0.3s'
          }}
          onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-5px)'}
          onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '15px' }}>
              <div style={{
                width: '40px',
                height: '40px',
                background: 'rgba(255,255,255,0.2)',
                borderRadius: '12px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '20px'
              }}>
                📊
              </div>
              <div style={{ fontSize: '14px', color: 'rgba(255,255,255,0.9)' }}>Asistencia</div>
            </div>
            <div style={{ fontSize: '36px', fontWeight: 'bold', color: 'white', marginBottom: '5px' }}>{estadisticas.porcentaje.toFixed(1)}%</div>
            <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.7)' }}>porcentaje</div>
          </div>
        </div>

             {/* Filtros mejorados */}
        <div style={{
          background: 'rgba(255,255,255,0.1)',
          backdropFilter: 'blur(10px)',
          borderRadius: '20px',
          padding: '20px',
          marginBottom: '25px',
          border: '1px solid rgba(255,255,255,0.2)'
        }}>
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(4, 1fr)', 
            gap: '16px',
            alignItems: 'end'  // Alinea los elementos al fondo
          }}>
            
            {/* Selector de fecha */}
            <div>
              <div style={{ color: 'white', fontSize: '12px', marginBottom: '8px', opacity: 0.8 }}>
                📅 Fecha
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  onClick={() => cambiarFecha(-1)}
                  style={{
                    width: '40px',
                    height: '40px',
                    background: 'rgba(255,255,255,0.15)',
                    border: '1px solid rgba(255,255,255,0.2)',
                    borderRadius: '10px',
                    color: 'white',
                    fontSize: '18px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    transition: 'all 0.3s',
                    flexShrink: 0
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.25)'}
                  onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.15)'}
                >←</button>
                
                <input
                  type="date"
                  value={fechaSeleccionada}
                  onChange={(e) => setFechaSeleccionada(e.target.value)}
                  style={{
                    flex: 1,
                    minWidth: 0,  // Permite que el input se encoja
                    background: 'rgba(255,255,255,0.15)',
                    border: '1px solid rgba(255,255,255,0.2)',
                    borderRadius: '10px',
                    padding: '0 12px',
                    color: 'white',
                    fontSize: '14px',
                    outline: 'none',
                    height: '40px'
                  }}
                />
                
                <button
                  onClick={() => cambiarFecha(1)}
                  style={{
                    width: '40px',
                    height: '40px',
                    background: 'rgba(255,255,255,0.15)',
                    border: '1px solid rgba(255,255,255,0.2)',
                    borderRadius: '10px',
                    color: 'white',
                    fontSize: '18px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    transition: 'all 0.3s',
                    flexShrink: 0
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.25)'}
                  onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.15)'}
                >→</button>
              </div>
            </div>

            {/* Selector de curso */}
            <div>
              <div style={{ color: 'white', fontSize: '12px', marginBottom: '8px', opacity: 0.8 }}>
                🏫 Curso
              </div>
              <select
                value={filtroCurso}
                onChange={(e) => setFiltroCurso(e.target.value)}
                style={{
                  width: '100%',
                  height: '40px',
                  background: 'rgba(255,255,255,0.15)',
                  border: '1px solid rgba(255,255,255,0.2)',
                  borderRadius: '10px',
                  padding: '0 12px',
                  color: 'white',
                  fontSize: '14px',
                  outline: 'none',
                  cursor: 'pointer'
                }}
              >
                <option value="" disabled style={{ background: '#1a1a2e' }}>🔍 Seleccionar un curso</option>
                {cursos.map(curso => (
                  <option key={curso} value={curso} style={{ background: '#1a1a2e' }}>
                    {curso === 'todos' ? '📋 Todos los cursos' : `📚 ${curso}`}
                  </option>
                ))}
              </select>
            </div>

            {/* Buscador */}
            <div>
              <div style={{ color: 'white', fontSize: '12px', marginBottom: '8px', opacity: 0.8 }}>
                🔍 Buscar estudiante
              </div>
              <input
                type="text"
                placeholder="Nombre o apellido..."
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                style={{
                  width: '100%',
                  height: '40px',
                  background: 'rgba(255,255,255,0.15)',
                  border: '1px solid rgba(255,255,255,0.2)',
                  borderRadius: '10px',
                  padding: '0 12px',
                  color: 'white',
                  fontSize: '14px',
                  outline: 'none',
                  boxSizing: 'border-box'
                }}
              />
            </div>

            {/* Selector de vista */}
            <div>
              <div style={{ color: 'white', fontSize: '12px', marginBottom: '8px', opacity: 0.8 }}>
                👁️ Vista
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  onClick={() => setVista('tabla')}
                  style={{
                    flex: 1,
                    height: '40px',
                    background: vista === 'tabla' ? 'rgba(255,255,255,0.25)' : 'rgba(255,255,255,0.1)',
                    border: '1px solid rgba(255,255,255,0.2)',
                    borderRadius: '10px',
                    color: 'white',
                    fontSize: '14px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '5px',
                    transition: 'all 0.3s',
                    whiteSpace: 'nowrap',
                    padding: '0 8px'
                  }}
                >
                  <span>📋</span> Tabla
                </button>
                <button
                  onClick={() => setVista('tarjetas')}
                  style={{
                    flex: 1,
                    height: '40px',
                    background: vista === 'tarjetas' ? 'rgba(255,255,255,0.25)' : 'rgba(255,255,255,0.1)',
                    border: '1px solid rgba(255,255,255,0.2)',
                    borderRadius: '10px',
                    color: 'white',
                    fontSize: '14px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '5px',
                    transition: 'all 0.3s',
                    whiteSpace: 'nowrap',
                    padding: '0 8px'
                  }}
                >
                  <span>🃏</span> Tarjetas
                </button>
              </div>
            </div>
          </div>
        </div>
                {/* Vista de estudiantes */}
        {!filtroCurso ? (
          <div style={{
            background: 'rgba(255,255,255,0.1)',
            backdropFilter: 'blur(10px)',
            borderRadius: '24px',
            padding: '60px 20px',
            textAlign: 'center',
            border: '1px solid rgba(255,255,255,0.2)'
          }}>
            <span style={{ fontSize: '64px', display: 'block', marginBottom: '20px', opacity: 0.8 }}>👆</span>
            <h3 style={{ color: 'white', fontSize: '24px', margin: '0 0 10px 0' }}>Selecciona un curso</h3>
            <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '14px', margin: 0 }}>
              Elige un curso del selector para ver los estudiantes
            </p>
          </div>
        ) : estudiantesFiltrados.length === 0 ? (
          <div style={{
            background: 'rgba(255,255,255,0.1)',
            backdropFilter: 'blur(10px)',
            borderRadius: '24px',
            padding: '60px 20px',
            textAlign: 'center',
            border: '1px solid rgba(255,255,255,0.2)'
          }}>
            <span style={{ fontSize: '64px', display: 'block', marginBottom: '20px', opacity: 0.8 }}>📭</span>
            <h3 style={{ color: 'white', fontSize: '24px', margin: '0 0 10px 0' }}>No hay estudiantes</h3>
            <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '14px', margin: 0 }}>
              {busqueda ? 'No hay resultados para tu búsqueda' : 
               filtroCurso === 'todos' ? 'No hay estudiantes cargados' : `No hay estudiantes en el curso ${filtroCurso}`}
            </p>
          </div>
        ) : vista === 'tabla' ? (
          /* Vista Tabla */
          <div style={{
            background: 'rgba(255,255,255,0.1)',
            backdropFilter: 'blur(10px)',
            borderRadius: '20px',
            overflow: 'hidden',
            border: '1px solid rgba(255,255,255,0.2)'
          }}>
            <div style={{ maxHeight: '500px', overflowY: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead style={{
                  background: 'rgba(0,0,0,0.3)',
                  position: 'sticky',
                  top: 0
                }}>
                  <tr>
                    <th style={{ padding: '15px', textAlign: 'left', color: 'rgba(255,255,255,0.8)', fontSize: '12px', fontWeight: '600' }}>Estado</th>
                    <th style={{ padding: '15px', textAlign: 'left', color: 'rgba(255,255,255,0.8)', fontSize: '12px', fontWeight: '600' }}>Nombre</th>
                    <th style={{ padding: '15px', textAlign: 'left', color: 'rgba(255,255,255,0.8)', fontSize: '12px', fontWeight: '600' }}>Curso</th>
                    <th style={{ padding: '15px', textAlign: 'left', color: 'rgba(255,255,255,0.8)', fontSize: '12px', fontWeight: '600' }}>Hora</th>
                  </tr>
                </thead>
                <tbody>
                  {estudiantesFiltrados.map((estudiante, index) => {
                    const asistencia = asistenciasHoy[estudiante.qrCode];
                    return (
                      <tr key={estudiante.id} style={{
                        background: index % 2 === 0 ? 'rgba(255,255,255,0.05)' : 'transparent',
                        borderBottom: '1px solid rgba(255,255,255,0.1)',
                        transition: 'all 0.3s ease',
                        cursor: 'pointer'
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.15)'}
                      onMouseLeave={(e) => e.currentTarget.style.background = index % 2 === 0 ? 'rgba(255,255,255,0.05)' : 'transparent'}
                      >
                        <td style={{ padding: '12px 15px' }}>
                          {asistencia ? (
                            <span style={{
                              background: 'rgba(16,185,129,0.2)',
                              color: '#4ade80',
                              padding: '6px 12px',
                              borderRadius: '20px',
                              fontSize: '12px',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '6px',
                              border: '1px solid rgba(16,185,129,0.3)',
                              fontWeight: '500'
                            }}>
                              <span>✅</span> Presente
                            </span>
                          ) : (
                            <span style={{
                              background: 'rgba(239,68,68,0.2)',
                              color: '#f87171',
                              padding: '6px 12px',
                              borderRadius: '20px',
                              fontSize: '12px',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '6px',
                              border: '1px solid rgba(239,68,68,0.3)',
                              fontWeight: '500'
                            }}>
                              <span>❌</span> Ausente
                            </span>
                          )}
                        </td>
                        <td style={{ padding: '12px 15px', color: 'white', fontSize: '14px', fontWeight: '500' }}>
                            {[
                              estudiante.nombre,
                              estudiante.apellidoPaterno,
                              estudiante.apellidoMaterno
                            ].filter(Boolean).join(' ')}
                          </td>
                        <td style={{ padding: '12px 15px', color: 'rgba(255,255,255,0.7)', fontSize: '14px', fontWeight: '500' }}>
                          {estudiante.curso || '-'}
                        </td>
                        <td style={{ padding: '12px 15px', color: 'rgba(255,255,255,0.7)', fontSize: '14px', fontWeight: '500' }}>
                          {asistencia ? asistencia.hora : '-'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>




        ) : (
          /* Vista Tarjetas */
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))',
            gap: '16px'
          }}>
            {estudiantesFiltrados.map((estudiante) => {
              const asistencia = asistenciasHoy[estudiante.qrCode];
              return (
                <div
                  key={estudiante.id}
                  style={{
                    background: asistencia 
                      ? 'linear-gradient(135deg, rgba(16,185,129,0.2), rgba(16,185,129,0.1))'
                      : 'linear-gradient(135deg, rgba(239,68,68,0.2), rgba(239,68,68,0.1))',
                    backdropFilter: 'blur(10px)',
                    borderRadius: '16px',
                    padding: '16px',
                    border: `1px solid ${asistencia ? 'rgba(16,185,129,0.3)' : 'rgba(239,68,68,0.3)'}`,
                    transition: 'all 0.3s',
                    cursor: 'pointer'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-5px)'}
                  onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
                    <div style={{
                      width: '40px',
                      height: '40px',
                      background: asistencia ? 'rgba(16,185,129,0.3)' : 'rgba(239,68,68,0.3)',
                      borderRadius: '12px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '20px'
                    }}>
                      {asistencia ? '✅' : '❌'}
                    </div>
                    <div>
                      <div style={{ color: 'white', fontSize: '14px', fontWeight: 'bold' }}>
                        {estudiante.nombre} {estudiante.apellidoPaterno}
                      </div>
                      <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: '12px' }}>
                        {estudiante.curso || 'Sin curso'}
                      </div>
                    </div>
                  </div>
                  {asistencia && (
                    <div style={{
                      marginTop: '10px',
                      paddingTop: '10px',
                      borderTop: '1px solid rgba(255,255,255,0.1)'
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', color: 'rgba(255,255,255,0.7)', fontSize: '12px' }}>
                        <span>🕐 Hora:</span>
                        <span style={{ color: '#4ade80', fontWeight: 'bold' }}>{asistencia.hora}</span>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Leyenda y estadísticas */}
        <div style={{
          marginTop: '25px',
          display: 'flex',
          flexWrap: 'wrap',
          gap: '15px',
          justifyContent: 'center',
          background: 'rgba(255,255,255,0.1)',
          backdropFilter: 'blur(10px)',
          borderRadius: '50px',
          padding: '15px 25px',
          border: '1px solid rgba(255,255,255,0.2)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{
              width: '12px',
              height: '12px',
              background: '#4ade80',
              borderRadius: '50%',
              boxShadow: '0 0 10px #4ade80'
            }}></div>
            <span style={{ color: 'rgba(255,255,255,0.8)', fontSize: '13px' }}>Presente: {estadisticas.presentes}</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{
              width: '12px',
              height: '12px',
              background: '#f87171',
              borderRadius: '50%',
              boxShadow: '0 0 10px #f87171'
            }}></div>
            <span style={{ color: 'rgba(255,255,255,0.8)', fontSize: '13px' }}>Ausente: {estadisticas.ausentes}</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: '13px' }}>|</span>
            <span style={{ color: 'rgba(255,255,255,0.8)', fontSize: '13px' }}>Total: {estadisticas.total}</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: '13px' }}>|</span>
            <span style={{ color: 'rgba(255,255,255,0.8)', fontSize: '13px' }}>Asistencia: {estadisticas.porcentaje.toFixed(1)}%</span>
          </div>
        </div>

      </div>

      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        @keyframes float {
          0%, 100% { transform: translate(0, 0); }
          50% { transform: translate(30px, 30px); }
        }
      `}</style>
    </div>
  );
}

export default PanelEstudiantes;