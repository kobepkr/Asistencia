import React, { useState } from 'react';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../firebase';

// Paleta de colores suaves (igual que el resto del sistema)
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

function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [cargando, setCargando] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setCargando(true);
    setError('');

    try {
      await signInWithEmailAndPassword(auth, email, password);
      console.log("Login exitoso, esperando redirección...");
    } catch (error) {
      console.error("Error de login:", error);
      setError("Email o contraseña incorrectos");
    } finally {
      setCargando(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      width: '100%',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      background: colores.fondo,
      padding: '16px'
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

      {/* Tarjeta de login */}
      <div style={{
        position: 'relative',
        zIndex: 10,
        width: '100%',
        maxWidth: '400px',
        background: colores.tarjeta,
        borderRadius: '24px',
        padding: '40px',
        border: `1px solid ${colores.borde}`,
        boxShadow: '0 20px 40px rgba(0, 0, 0, 0.1)'
      }}>
        {/* Logo */}
        <div style={{
          textAlign: 'center',
          marginBottom: '30px'
        }}>

          <div> 
        
     
          <div style={{
              width: '80px',
              height: '80px',
              margin: '0 auto 20px',
              borderRadius: '20px',
              overflow: 'hidden',
              background: colores.accentLight,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 5px 15px rgba(79, 126, 179, 0.2)'
            }}>
              <img 
                src="/logo.png" 
                alt="Logo Colegio" 
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover'
                }}
              />
            </div>
          </div>
          <h1 style={{
            color: colores.texto,
            fontSize: '28px',
            fontWeight: 'bold',
            margin: '0 0 8px 0'
          }}>Educ Assist</h1>
          <p style={{
            color: colores.textoSecundario,
            fontSize: '14px',
            margin: 0
          }}>Sistema de Control de Asistencia</p>
        </div>

        {/* Formulario */}
        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '20px' }}>
            <label style={{
              color: colores.textoSecundario,
              fontSize: '12px',
              marginBottom: '8px',
              display: 'block'
            }}>
              📧 Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="superadmin@asistencia.cl"
              style={{
                width: '100%',
                padding: '12px 16px',
                background: colores.tarjeta,
                border: `1px solid ${colores.borde}`,
                borderRadius: '12px',
                color: colores.texto,
                fontSize: '14px',
                outline: 'none',
                transition: 'all 0.3s'
              }}
              onFocus={(e) => e.target.style.borderColor = colores.accent}
              onBlur={(e) => e.target.style.borderColor = colores.borde}
            />
          </div>

          <div style={{ marginBottom: '30px' }}>
            <label style={{
              color: colores.textoSecundario,
              fontSize: '12px',
              marginBottom: '8px',
              display: 'block'
            }}>
              🔒 Contraseña
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              placeholder="••••••••"
              style={{
                width: '100%',
                padding: '12px 16px',
                background: colores.tarjeta,
                border: `1px solid ${colores.borde}`,
                borderRadius: '12px',
                color: colores.texto,
                fontSize: '14px',
                outline: 'none',
                transition: 'all 0.3s'
              }}
              onFocus={(e) => e.target.style.borderColor = colores.accent}
              onBlur={(e) => e.target.style.borderColor = colores.borde}
            />
          </div>

          {error && (
            <div style={{
              background: colores.dangerLight,
              border: `1px solid ${colores.danger}`,
              borderRadius: '12px',
              padding: '12px',
              marginBottom: '20px',
              color: colores.danger,
              fontSize: '14px',
              textAlign: 'center'
            }}>
              ❌ {error}
            </div>
          )}

          <button
            type="submit"
            disabled={cargando}
            style={{
              width: '100%',
              padding: '14px',
              background: cargando ? colores.textoSecundario : `linear-gradient(135deg, ${colores.accent}, ${colores.texto})`,
              border: 'none',
              borderRadius: '12px',
              color: 'white',
              fontSize: '16px',
              fontWeight: 'bold',
              cursor: cargando ? 'not-allowed' : 'pointer',
              transition: 'all 0.3s',
              opacity: cargando ? 0.7 : 1
            }}
          >
            {cargando ? 'Iniciando sesión...' : 'Iniciar Sesión'}
          </button>
        </form>

        {/* Demo credentials */}
        <div style={{
          marginTop: '30px',
          textAlign: 'center',
          padding: '20px',
          background: colores.accentLight,
          borderRadius: '12px',
          border: `1px solid ${colores.borde}`
        }}>
          <p style={{
            color: colores.textoSecundario,
            fontSize: '12px',
            margin: '0 0 8px 0'
          }}>
            🔑 Para recuperar contraseña hablar con el administrador
          </p>
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

export default Login;