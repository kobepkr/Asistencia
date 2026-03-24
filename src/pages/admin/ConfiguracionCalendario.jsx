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

function ConfiguracionCalendario({ user }) {
  const [fechaInicio, setFechaInicio] = useState('');
  const [fechaFin, setFechaFin] = useState('');
  const [diasSinClases, setDiasSinClases] = useState([]);
  const [cargando, setCargando] = useState(false);
  const [mensaje, setMensaje] = useState('');
  const [vista, setVista] = useState('inicio');

  useEffect(() => {
    cargarConfiguracion();
  }, []);

  const cargarConfiguracion = async () => {
    try {
      const configRef = doc(db, "escuelas", user.escuelaId, "configuracion", "calendario");
      const configSnap = await getDoc(configRef);
      
      if (configSnap.exists()) {
        const data = configSnap.data();
        setFechaInicio(data.fechaInicioClases || '');
        setFechaFin(data.fechaFinClases || '');
        setDiasSinClases(data.diasSinClases || []);
      }
    } catch (error) {
      console.error("Error cargando configuración:", error);
    }
  };

  const guardarConfiguracion = async () => {
    setCargando(true);
    setMensaje('');

    try {
      const configRef = doc(db, "escuelas", user.escuelaId, "configuracion", "calendario");
      
      await setDoc(configRef, {
        año: new Date().getFullYear(),
        fechaInicioClases: fechaInicio,
        fechaFinClases: fechaFin,
        diasSinClases: diasSinClases.sort(),
        ultimaActualizacion: new Date().toISOString()
      });

      setMensaje('✅ Calendario guardado exitosamente');
    } catch (error) {
      console.error("Error guardando configuración:", error);
      setMensaje('❌ Error al guardar el calendario');
    } finally {
      setCargando(false);
    }
  };

  const toggleDiaSinClases = (fecha) => {
    const fechaStr = fecha.toISOString().split('T')[0];
    
    if (diasSinClases.includes(fechaStr)) {
      setDiasSinClases(diasSinClases.filter(d => d !== fechaStr));
    } else {
      setDiasSinClases([...diasSinClases, fechaStr]);
    }
  };

  const marcarFindesSemana = () => {
    if (!fechaInicio || !fechaFin) {
      alert('Primero configura las fechas de inicio y fin');
      return;
    }

    const inicio = new Date(fechaInicio);
    const fin = new Date(fechaFin);
    const nuevosFestivos = [...diasSinClases];
    
    let currentDate = new Date(inicio);
    while (currentDate <= fin) {
      const diaSemana = currentDate.getDay();
      const fechaStr = currentDate.toISOString().split('T')[0];
      
      if (diaSemana === 0 || diaSemana === 6) {
        if (!nuevosFestivos.includes(fechaStr)) {
          nuevosFestivos.push(fechaStr);
        }
      }
      
      currentDate.setDate(currentDate.getDate() + 1);
    }
    
    setDiasSinClases(nuevosFestivos.sort());
  };

  return (
    <div>
      <h2 style={{ color: colores.texto, marginTop: 0, marginBottom: '20px' }}>
        📅 Configuración del Calendario Escolar
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

      {/* Selector de vista */}
      <div style={{
        display: 'flex',
        gap: '10px',
        marginBottom: '20px',
        background: colores.tarjeta,
        borderRadius: '10px',
        padding: '10px',
        border: `1px solid ${colores.borde}`
      }}>
        <button
          onClick={() => setVista('inicio')}
          style={{
            flex: 1,
            padding: '10px',
            background: vista === 'inicio' ? colores.accent : 'transparent',
            border: 'none',
            borderRadius: '5px',
            color: vista === 'inicio' ? 'white' : colores.texto,
            cursor: 'pointer',
            transition: 'all 0.3s'
          }}
        >
          📅 Período Escolar
        </button>
        <button
          onClick={() => setVista('festivos')}
          style={{
            flex: 1,
            padding: '10px',
            background: vista === 'festivos' ? colores.accent : 'transparent',
            border: 'none',
            borderRadius: '5px',
            color: vista === 'festivos' ? 'white' : colores.texto,
            cursor: 'pointer',
            transition: 'all 0.3s'
          }}
        >
          🚫 Días sin clases
        </button>
      </div>

      {vista === 'inicio' && (
        <div style={{
          background: colores.tarjeta,
          borderRadius: '16px',
          padding: '20px',
          border: `1px solid ${colores.borde}`,
          boxShadow: '0 4px 6px rgba(0, 0, 0, 0.05)'
        }}>
          <h3 style={{ color: colores.texto, marginTop: 0 }}>Período Escolar</h3>
          
          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '20px',
            marginBottom: '20px'
          }}>
            <div>
              <label style={{ color: colores.textoSecundario, display: 'block', marginBottom: '5px' }}>
                Fecha de inicio de clases
              </label>
              <input
                type="date"
                value={fechaInicio}
                onChange={(e) => setFechaInicio(e.target.value)}
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
                Fecha de término de clases
              </label>
              <input
                type="date"
                value={fechaFin}
                onChange={(e) => setFechaFin(e.target.value)}
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
        </div>
      )}

      {vista === 'festivos' && (
        <div style={{
          background: colores.tarjeta,
          borderRadius: '16px',
          padding: '20px',
          border: `1px solid ${colores.borde}`,
          boxShadow: '0 4px 6px rgba(0, 0, 0, 0.05)'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px' }}>
            <h3 style={{ color: colores.texto, margin: 0 }}>🚫 Días sin clases</h3>
            <button
              onClick={marcarFindesSemana}
              style={{
                padding: '8px 15px',
                background: colores.warning,
                border: 'none',
                borderRadius: '8px',
                color: 'white',
                cursor: 'pointer',
                transition: 'all 0.3s'
              }}
            >
              Marcar fines de semana
            </button>
          </div>

          <p style={{ color: colores.textoSecundario, marginBottom: '20px' }}>
            Haz clic en las fechas para marcarlas como días sin clases
          </p>

          <Calendar
            onChange={toggleDiaSinClases}
            value={new Date()}
            tileClassName={({ date }) => {
              const fechaStr = date.toISOString().split('T')[0];
              return diasSinClases.includes(fechaStr) ? 'sin-clases' : '';
            }}
            minDate={fechaInicio ? new Date(fechaInicio) : null}
            maxDate={fechaFin ? new Date(fechaFin) : null}
          />

          <div style={{ marginTop: '20px' }}>
            <h4 style={{ color: colores.texto }}>Días sin clases seleccionados:</h4>
            <div style={{ 
              display: 'flex', 
              flexWrap: 'wrap', 
              gap: '10px',
              maxHeight: '200px',
              overflowY: 'auto',
              background: colores.accentLight,
              padding: '15px',
              borderRadius: '8px',
              marginTop: '10px'
            }}>
              {diasSinClases.sort().map(fecha => (
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
      )}

      {/* Botón guardar */}
      <button
        onClick={guardarConfiguracion}
        disabled={cargando}
        style={{
          marginTop: '20px',
          width: '100%',
          padding: '12px',
          background: cargando ? colores.textoSecundario : colores.success,
          border: 'none',
          borderRadius: '8px',
          color: 'white',
          fontSize: '16px',
          fontWeight: 'bold',
          cursor: cargando ? 'not-allowed' : 'pointer',
          opacity: cargando ? 0.7 : 1,
          transition: 'all 0.3s'
        }}
      >
        {cargando ? 'Guardando...' : 'Guardar Calendario'}
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

export default ConfiguracionCalendario;