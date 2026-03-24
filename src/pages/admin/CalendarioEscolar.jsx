import React, { useState, useEffect } from 'react';
import { doc, getDoc, setDoc } from 'firebase/firestore';
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

function CalendarioEscolar({ user }) {
  const [configuracion, setConfiguracion] = useState({
    fechaInicio: '',
    fechaFin: '',
    diasSinClases: [],
    festivosFijos: [
      '01-01', // Año Nuevo
      '04-10', // Viernes Santo (variable, ejemplo)
      '04-11', // Sábado Santo
      '05-01', // Día del Trabajo
      '05-21', // Glorias Navales
      '06-29', // San Pedro y San Pablo
      '07-16', // Virgen del Carmen
      '08-15', // Asunción
      '09-18', // Independencia
      '09-19', // Glorias del Ejército
      '10-12', // Encuentro de Dos Mundos
      '10-31', // Día de las Iglesias
      '11-01', // Todos los Santos
      '12-08', // Inmaculada Concepción
      '12-25', // Navidad
    ]
  });

  const [cargando, setCargando] = useState(false);
  const [mensaje, setMensaje] = useState('');
  const [vista, setVista] = useState('inicio');
  const [diasPersonalizados, setDiasPersonalizados] = useState([]);

  useEffect(() => {
    cargarConfiguracion();
  }, []);

  const cargarConfiguracion = async () => {
    try {
      const configRef = doc(db, "escuelas", user.escuelaId, "configuracion", "calendario");
      const configSnap = await getDoc(configRef);
      
      if (configSnap.exists()) {
        const data = configSnap.data();
        setConfiguracion(prev => ({
          ...prev,
          fechaInicio: data.fechaInicioClases || '',
          fechaFin: data.fechaFinClases || '',
          diasSinClases: data.diasSinClases || []
        }));
        setDiasPersonalizados(data.diasSinClases || []);
      } else {
        console.log("No hay configuración previa, se creará al guardar");
      }
    } catch (error) {
      console.error("Error cargando configuración:", error);
      if (error.code === 'permission-denied') {
        setMensaje('❌ Error de permisos. Verifica las reglas de Firestore.');
      }
    }
  };

  const guardarConfiguracion = async () => {
    if (!configuracion.fechaInicio || !configuracion.fechaFin) {
      setMensaje('❌ Debes configurar las fechas de inicio y fin');
      return;
    }

    setCargando(true);
    setMensaje('');

    try {
      const configRef = doc(db, "escuelas", user.escuelaId, "configuracion", "calendario");
      
      const todosDiasSinClases = [...new Set([...diasPersonalizados])].sort();

      await setDoc(configRef, {
        año: new Date().getFullYear(),
        fechaInicioClases: configuracion.fechaInicio,
        fechaFinClases: configuracion.fechaFin,
        diasSinClases: todosDiasSinClases,
        ultimaActualizacion: new Date().toISOString()
      });

      setMensaje('✅ Calendario guardado exitosamente');
    } catch (error) {
      console.error("Error guardando:", error);
      setMensaje('❌ Error al guardar');
    } finally {
      setCargando(false);
    }
  };

  const toggleDiaSinClases = (fecha) => {
    const fechaStr = fecha.toISOString().split('T')[0];
    
    if (diasPersonalizados.includes(fechaStr)) {
      setDiasPersonalizados(diasPersonalizados.filter(d => d !== fechaStr));
    } else {
      setDiasPersonalizados([...diasPersonalizados, fechaStr]);
    }
  };

  const marcarFindesSemana = () => {
    if (!configuracion.fechaInicio || !configuracion.fechaFin) {
      setMensaje('❌ Primero configura las fechas de inicio y fin');
      return;
    }

    const inicio = new Date(configuracion.fechaInicio + 'T12:00:00');
    const fin = new Date(configuracion.fechaFin + 'T12:00:00');
    const nuevos = [...diasPersonalizados];
    
    let currentDate = new Date(inicio);
    
    while (currentDate <= fin) {
      const diaSemana = currentDate.getDay();
      const año = currentDate.getFullYear();
      const mes = String(currentDate.getMonth() + 1).padStart(2, '0');
      const dia = String(currentDate.getDate()).padStart(2, '0');
      const fechaStr = `${año}-${mes}-${dia}`;
      
      if (diaSemana === 0 || diaSemana === 6) {
        if (!nuevos.includes(fechaStr)) {
          nuevos.push(fechaStr);
        }
      }
      
      currentDate.setDate(currentDate.getDate() + 1);
    }
    
    setDiasPersonalizados(nuevos.sort());
  };

  const marcarFestivos = () => {
    if (!configuracion.fechaInicio || !configuracion.fechaFin) {
      setMensaje('❌ Primero configura las fechas de inicio y fin');
      return;
    }

    const inicio = new Date(configuracion.fechaInicio);
    const fin = new Date(configuracion.fechaFin);
    const nuevos = [...diasPersonalizados];
    
    configuracion.festivosFijos.forEach(festivo => {
      const [mes, dia] = festivo.split('-');
      
      for (let año = inicio.getFullYear(); año <= fin.getFullYear(); año++) {
        const fechaStr = `${año}-${mes}-${dia}`;
        const fecha = new Date(fechaStr);
        
        if (fecha >= inicio && fecha <= fin) {
          if (!nuevos.includes(fechaStr)) {
            nuevos.push(fechaStr);
          }
        }
      }
    });
    
    setDiasPersonalizados(nuevos.sort());
  };

  const marcarVacaciones = () => {
    if (!configuracion.fechaInicio || !configuracion.fechaFin) {
      setMensaje('❌ Primero configura las fechas de inicio y fin');
      return;
    }

    const inicio = new Date(configuracion.fechaInicio);
    const fin = new Date(configuracion.fechaFin);
    const nuevos = [...diasPersonalizados];
    
    for (let año = inicio.getFullYear(); año <= fin.getFullYear(); año++) {
      for (let mes = 1; mes <= 2; mes++) {
        const diasMes = new Date(año, mes, 0).getDate();
        for (let dia = 1; dia <= diasMes; dia++) {
          const fechaStr = `${año}-${String(mes).padStart(2, '0')}-${String(dia).padStart(2, '0')}`;
          const fecha = new Date(fechaStr);
          
          if (fecha >= inicio && fecha <= fin) {
            if (!nuevos.includes(fechaStr)) {
              nuevos.push(fechaStr);
            }
          }
        }
      }
    }
    
    setDiasPersonalizados(nuevos.sort());
  };

  const limpiarTodo = () => {
    setDiasPersonalizados([]);
  };

  return (
    <div style={{ background: 'transparent' }}>
      <h2 style={{ color: colores.texto, marginTop: 0, marginBottom: '20px' }}>
        📅 Calendario Escolar
      </h2>

      {mensaje && (
        <div style={{
          background: mensaje.includes('✅') ? colores.successLight : colores.dangerLight,
          border: `1px solid ${mensaje.includes('✅') ? colores.success : colores.danger}`,
          borderRadius: '8px',
          padding: '12px',
          marginBottom: '20px',
          color: mensaje.includes('✅') ? colores.success : colores.danger
        }}>
          {mensaje}
        </div>
      )}

      {/* Período Escolar */}
      <div style={{
        background: colores.tarjeta,
        borderRadius: '16px',
        padding: '20px',
        marginBottom: '20px',
        boxShadow: '0 4px 6px rgba(0, 0, 0, 0.05)',
        border: `1px solid ${colores.borde}`
      }}>
        <h3 style={{ color: colores.texto, marginTop: 0 }}>
          📆 Período Escolar {new Date().getFullYear()}
        </h3>
        
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '20px',
          marginBottom: '20px'
        }}>
          <div>
            <label style={{ color: colores.textoSecundario, display: 'block', marginBottom: '5px' }}>
              Fecha de inicio
            </label>
            <input
              type="date"
              value={configuracion.fechaInicio}
              onChange={(e) => setConfiguracion({...configuracion, fechaInicio: e.target.value})}
              style={{
                width: '100%',
                padding: '10px',
                background: colores.tarjeta,
                border: `1px solid ${colores.borde}`,
                borderRadius: '8px',
                color: colores.texto,
                fontSize: '14px'
              }}
            />
          </div>
          <div>
            <label style={{ color: colores.textoSecundario, display: 'block', marginBottom: '5px' }}>
              Fecha de término
            </label>
            <input
              type="date"
              value={configuracion.fechaFin}
              onChange={(e) => setConfiguracion({...configuracion, fechaFin: e.target.value})}
              style={{
                width: '100%',
                padding: '10px',
                background: colores.tarjeta,
                border: `1px solid ${colores.borde}`,
                borderRadius: '8px',
                color: colores.texto,
                fontSize: '14px'
              }}
            />
          </div>
        </div>

        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <button
            onClick={marcarFindesSemana}
            style={{
              padding: '8px 15px',
              background: colores.accent,
              border: 'none',
              borderRadius: '8px',
              color: 'white',
              cursor: 'pointer',
              fontSize: '14px',
              transition: 'all 0.3s'
            }}
          >
            Marcar fines de semana
          </button>
          <button
            onClick={marcarFestivos}
            style={{
              padding: '8px 15px',
              background: colores.warning,
              border: 'none',
              borderRadius: '8px',
              color: 'white',
              cursor: 'pointer',
              fontSize: '14px',
              transition: 'all 0.3s'
            }}
          >
            Marcar festivos
          </button>
          <button
            onClick={marcarVacaciones}
            style={{
              padding: '8px 15px',
              background: colores.danger,
              border: 'none',
              borderRadius: '8px',
              color: 'white',
              cursor: 'pointer',
              fontSize: '14px',
              transition: 'all 0.3s'
            }}
          >
            Marcar vacaciones (Ene-Feb)
          </button>
          <button
            onClick={limpiarTodo}
            style={{
              padding: '8px 15px',
              background: 'transparent',
              border: `1px solid ${colores.borde}`,
              borderRadius: '8px',
              color: colores.textoSecundario,
              cursor: 'pointer',
              fontSize: '14px',
              transition: 'all 0.3s'
            }}
          >
            Limpiar todo
          </button>
        </div>
      </div>

      {/* Calendario interactivo */}
      <div style={{
        background: colores.tarjeta,
        borderRadius: '16px',
        padding: '20px',
        marginBottom: '20px',
        boxShadow: '0 4px 6px rgba(0, 0, 0, 0.05)',
        border: `1px solid ${colores.borde}`
      }}>
        <h3 style={{ color: colores.texto, marginTop: 0 }}>🗓️ Marcar días sin clases</h3>
        
        <p style={{ color: colores.textoSecundario, marginBottom: '20px' }}>
          Haz clic en los días para marcarlos como <span style={{ color: colores.danger }}>🚫 sin clases</span>
        </p>

        <Calendar
          onChange={toggleDiaSinClases}
          value={new Date()}
          tileClassName={({ date }) => {
            const fechaStr = date.toISOString().split('T')[0];
            return diasPersonalizados.includes(fechaStr) ? 'sin-clases' : '';
          }}
          minDate={configuracion.fechaInicio ? new Date(configuracion.fechaInicio) : null}
          maxDate={configuracion.fechaFin ? new Date(configuracion.fechaFin) : null}
        />

        <div style={{ marginTop: '20px' }}>
          <h4 style={{ color: colores.texto, marginBottom: '10px' }}>
            📋 Días sin clases seleccionados ({diasPersonalizados.length})
          </h4>
          <div style={{ 
            display: 'flex', 
            flexWrap: 'wrap', 
            gap: '10px',
            maxHeight: '200px',
            overflowY: 'auto',
            background: colores.accentLight,
            padding: '15px',
            borderRadius: '8px'
          }}>
            {diasPersonalizados.sort().map(fecha => (
              <div
                key={fecha}
                style={{
                  background: colores.dangerLight,
                  border: `1px solid ${colores.danger}`,
                  borderRadius: '20px',
                  padding: '5px 12px',
                  color: colores.danger,
                  fontSize: '12px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '5px'
                }}
              >
                {fecha}
                <button
                  onClick={() => toggleDiaSinClases(new Date(fecha))}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: colores.danger,
                    cursor: 'pointer',
                    fontSize: '14px',
                    padding: '0 2px',
                    fontWeight: 'bold'
                  }}
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Botón guardar */}
      <button
        onClick={guardarConfiguracion}
        disabled={cargando}
        style={{
          width: '100%',
          padding: '15px',
          background: cargando ? colores.textoSecundario : colores.success,
          border: 'none',
          borderRadius: '8px',
          color: 'white',
          fontSize: '16px',
          fontWeight: 'bold',
          cursor: cargando ? 'not-allowed' : 'pointer',
          opacity: cargando ? 0.7 : 1,
          marginTop: '10px',
          transition: 'all 0.3s'
        }}
      >
        {cargando ? 'Guardando...' : '💾 Guardar Calendario'}
      </button>

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
        .sin-clases {
          background: ${colores.dangerLight} !important;
          color: ${colores.danger} !important;
          border-radius: 6px;
        }
        .react-calendar__tile--now {
          background: ${colores.successLight} !important;
          color: ${colores.success} !important;
        }
      `}</style>
    </div>
  );
}

export default CalendarioEscolar;