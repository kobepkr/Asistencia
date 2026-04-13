import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { auth } from '../../firebase';
import { signOut } from 'firebase/auth';
import GestionarProfesores from './GestionarProfesores';
import GestionarCursos from './GestionarCursos';
import GestionarEstudiantes from './GestionarEstudiantes';
import AdminLectorQR from './AdminLectorQR';
import ReportesEscuela from './ReportesEscuela';
import CalendarioEscolar from './CalendarioEscolar';
import RellenarAsistencia from './RellenarAsistencia';
import ReporteCurso from './ReporteCurso';
import AsistenciaMensual from './AsistenciaMensual';



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

function AdminDashboard({ user }) {
  const [pestañaActiva, setPestañaActiva] = useState('asistencia');
  const [currentTime, setCurrentTime] = useState(new Date());
  const navigate = useNavigate();

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const handleLogout = async () => {
    try {
      await signOut(auth);
      navigate('/');
    } catch (error) {
      console.error("Error al cerrar sesión:", error);
    }
  };

  const pestañas = [
    { id: 'asistencia', nombre: 'Tomar Asistencia', icono: '📷' },
    { id: 'profesores', nombre: 'Profesores', icono: '👥' },
    { id: 'cursos', nombre: 'Cursos', icono: '📚' },
    { id: 'estudiantes', nombre: 'Estudiantes', icono: '👨‍🎓' },
    { id: 'calendario', nombre: 'Calendario', icono: '📅' }, 
    { id: 'reportes', nombre: 'Reportes', icono: '📊' },
    { id: 'asistencia_mensual', nombre: 'Asistencia Mensual', icono: '📅' },
    { id: 'rellenar', nombre: 'Rellenar Asistencia', icono: '📝' },
    { id: 'reporte_curso', nombre: 'Asistencia por Curso', icono: '🏆' } 
  ];

  const renderContenido = () => {
  switch(pestañaActiva) {
    case 'asistencia':
      return <AdminLectorQR user={user} />;
    case 'profesores':
      return <GestionarProfesores user={user} />;
    case 'cursos':
      return <GestionarCursos user={user} />;
    case 'estudiantes':
      return <GestionarEstudiantes user={user} />;
    case 'calendario':
      return <CalendarioEscolar user={user} />;
    case 'rellenar':
      return <RellenarAsistencia user={user} />;
    case 'reportes':
      return <ReportesEscuela user={user} />;
    // 👇 PON EL NUEVO CASO AQUÍ, DESPUÉS DE LOS OTROS
    case 'reporte_curso':
      return <ReporteCurso user={user} />;
    case 'asistencia_mensual':
      return <AsistenciaMensual user={user} />;
    default:
      return <AdminLectorQR user={user} />;
  }
};

  return (
    <div style={{
      minHeight: '100vh',
      width: '100%',
      background: colores.fondo,
      position: 'relative',
      overflow: 'hidden'
    }}>
      {/* Fondo animado suave */}
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
          background: 'rgba(79, 126, 179, 0.1)',
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
          background: 'rgba(46, 139, 87, 0.1)',
          borderRadius: '50%',
          filter: 'blur(80px)',
          animation: 'float 20s infinite reverse'
        }}></div>
      </div>

      {/* Contenido principal */}
      <div style={{
        position: 'relative',
        zIndex: 10,
        maxWidth: '1400px',
        margin: '0 auto',
        padding: '20px'
      }}>
        
        {/* Header */}
        <div style={{
          background: colores.tarjeta,
          borderRadius: '16px',
          padding: '15px 25px',
          marginBottom: '25px',
          boxShadow: '0 4px 6px rgba(0, 0, 0, 0.05)',
          border: `1px solid ${colores.borde}`,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
            <div style={{
              width: '50px',
              height: '50px',
              background: colores.accent,
              borderRadius: '12px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '24px',
              color: 'white'
            }}>
              🏫
            </div>
            <div>
              <h1 style={{ color: colores.texto, fontSize: '24px', margin: 0 }}>Admin Dashboard</h1>
              <p style={{ color: colores.textoSecundario, fontSize: '14px', margin: 0 }}>
                {user.escuelaNombre} • {user.nombre}
              </p>
            </div>
          </div>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
            <div style={{ textAlign: 'right' }}>
              <div style={{ color: colores.texto, fontWeight: 'bold' }}>{currentTime.toLocaleTimeString()}</div>
              <div style={{ color: colores.textoSecundario, fontSize: '12px' }}>{currentTime.toLocaleDateString()}</div>
            </div>
            <button
              onClick={handleLogout}
              style={{
                background: 'transparent',
                border: `1px solid ${colores.borde}`,
                borderRadius: '30px',
                padding: '8px 20px',
                color: colores.textoSecundario,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                transition: 'all 0.3s'
              }}
            >
              <span>🚪</span> Salir
            </button>
          </div>
        </div>

        {/* Pestañas de navegación */}
        <div style={{
          display: 'flex',
          gap: '10px',
          marginBottom: '25px',
          flexWrap: 'wrap'
        }}>
          {pestañas.map(pest => (
            <button
              key={pest.id}
              onClick={() => setPestañaActiva(pest.id)}
              style={{
                background: pestañaActiva === pest.id ? colores.accent : colores.tarjeta,
                border: `1px solid ${colores.borde}`,
                borderRadius: '30px',
                padding: '10px 20px',
                color: pestañaActiva === pest.id ? 'white' : colores.texto,
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: pestañaActiva === pest.id ? 'bold' : 'normal',
                transition: 'all 0.3s',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                boxShadow: pestañaActiva === pest.id ? '0 2px 4px rgba(0, 0, 0, 0.1)' : 'none'
              }}
            >
              <span>{pest.icono}</span> {pest.nombre}
            </button>
          ))}
        </div>

        {/* Contenido de la pestaña activa */}
        <div style={{
          background: colores.tarjeta,
          borderRadius: '16px',
          padding: '25px',
          boxShadow: '0 4px 6px rgba(0, 0, 0, 0.05)',
          border: `1px solid ${colores.borde}`
        }}>
          {renderContenido()}
          
        </div>

      </div>

      <style>{`
        @keyframes float {
          0%, 100% { transform: translate(0, 0); }
          50% { transform: translate(30px, 30px); }
        }
      `}</style>
    </div>
  );
}

export default AdminDashboard;