import React, { useState } from 'react';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../firebase';



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
      // No necesitamos hacer nada más, onAuthStateChanged en App.jsx se encargará
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
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      padding: '16px'
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

      {/* Tarjeta de login */}
      <div style={{
        position: 'relative',
        zIndex: 10,
        width: '100%',
        maxWidth: '400px',
        background: 'rgba(255,255,255,0.1)',
        backdropFilter: 'blur(10px)',
        borderRadius: '24px',
        padding: '40px',
        border: '1px solid rgba(255,255,255,0.2)',
        boxShadow: '0 20px 40px rgba(0,0,0,0.2)'
      }}>
        {/* Logo */}
        <div style={{
          textAlign: 'center',
          marginBottom: '30px'
        }}>
          <div style={{
            width: '80px',
            height: '80px',

            borderRadius: '20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '40px',
            margin: '0 auto 20px'
          }}>
<div> 
  <img src="/logo.png" alt="Logo" style={{
    width: '80px',
    height: '80px',
    borderRadius: '20px',
    objectFit: 'cover'
  }} />
</div>
          </div>
          <h1 style={{
            color: 'white',
            fontSize: '28px',
            fontWeight: 'bold',
            margin: '0 0 8px 0'
          }}>Educ Assist</h1>
          <p style={{
            color: 'rgba(255,255,255,0.7)',
            fontSize: '14px',
            margin: 0
          }}>Inicia sesión para continuar</p>
        </div>

        {/* Formulario */}
        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '20px' }}>
            <label style={{
              color: 'white',
              fontSize: '12px',
              marginBottom: '8px',
              display: 'block',
              opacity: 0.8
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
                background: 'rgba(255,255,255,0.1)',
                border: '1px solid rgba(255,255,255,0.2)',
                borderRadius: '12px',
                color: 'white',
                fontSize: '14px',
                outline: 'none',
                transition: 'all 0.3s'
              }}
              onFocus={(e) => e.target.style.borderColor = '#667eea'}
              onBlur={(e) => e.target.style.borderColor = 'rgba(255,255,255,0.2)'}
            />
          </div>

          <div style={{ marginBottom: '30px' }}>
            <label style={{
              color: 'white',
              fontSize: '12px',
              marginBottom: '8px',
              display: 'block',
              opacity: 0.8
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
                background: 'rgba(255,255,255,0.1)',
                border: '1px solid rgba(255,255,255,0.2)',
                borderRadius: '12px',
                color: 'white',
                fontSize: '14px',
                outline: 'none',
                transition: 'all 0.3s'
              }}
              onFocus={(e) => e.target.style.borderColor = '#667eea'}
              onBlur={(e) => e.target.style.borderColor = 'rgba(255,255,255,0.2)'}
            />
          </div>

          {error && (
            <div style={{
              background: 'rgba(239,68,68,0.2)',
              border: '1px solid rgba(239,68,68,0.3)',
              borderRadius: '12px',
              padding: '12px',
              marginBottom: '20px',
              color: '#fecaca',
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
              background: cargando ? 'rgba(255,255,255,0.2)' : 'linear-gradient(135deg, #667eea, #764ba2)',
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
          background: 'rgba(255,255,255,0.05)',
          borderRadius: '12px',
          border: '1px solid rgba(255,255,255,0.1)'
        }}>
          <p style={{
            color: 'rgba(255,255,255,0.6)',
            fontSize: '12px',
            margin: '0 0 8px 0'
          }}>
            🔑 Para recuperar la contraseña hablar con el  admin
          </p>
          <p style={{
            color: 'rgba(255,255,255,0.8)',
            fontSize: '12px',
            margin: '4px 0',
            fontFamily: 'monospace'
          }}>
            
          </p>
          <p style={{
            color: 'rgba(255,255,255,0.8)',
            fontSize: '12px',
            margin: '4px 0',
            fontFamily: 'monospace'
          }}>
            
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