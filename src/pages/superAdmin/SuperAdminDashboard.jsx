import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, getDocs, doc, setDoc, getDoc } from 'firebase/firestore';
import { getAuth, createUserWithEmailAndPassword, signOut, signInWithEmailAndPassword } from 'firebase/auth';
import { auth, db } from '../../firebase';
import CrearEscuela from './CrearEscuela';
import AdminDashboard from '../admin/AdminDashboard';

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

function SuperAdminDashboard() {
  const [escuelas, setEscuelas] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [mostrarForm, setMostrarForm] = useState(false);
  const [mostrarFormAdmin, setMostrarFormAdmin] = useState(false);
  const [escuelaSeleccionada, setEscuelaSeleccionada] = useState(null);
  const [escuelaParaAdmin, setEscuelaParaAdmin] = useState(null);
  const [modoVista, setModoVista] = useState('lista');
  const [formAdmin, setFormAdmin] = useState({
    email: '',
    nombre: '',
    password: '123456'
  });
  const [cargandoAdmin, setCargandoAdmin] = useState(false);
  const [errorAdmin, setErrorAdmin] = useState('');
  const [exitoAdmin, setExitoAdmin] = useState('');
  
  const navigate = useNavigate();

  const cargarEscuelas = async () => {
    setCargando(true);
    try {
      const snapshot = await getDocs(collection(db, "escuelas"));
      const lista = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setEscuelas(lista);
    } catch (error) {
      console.error("Error cargando escuelas:", error);
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    cargarEscuelas();
  }, []);

  const handleEscuelaCreada = () => {
    setMostrarForm(false);
    cargarEscuelas();
  };

  const verEscuelaComoAdmin = (escuela) => {
    const mockUser = {
      uid: 'super-admin-mock',
      email: 'super@admin.com',
      escuelaId: escuela.id,
      escuelaNombre: escuela.nombre,
      rol: 'admin',
      nombre: 'Super Admin (Vista Admin)'
    };
    setEscuelaSeleccionada(mockUser);
    setModoVista('escuela');
  };

  const volverALista = () => {
    setEscuelaSeleccionada(null);
    setModoVista('lista');
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      navigate('/');
    } catch (error) {
      console.error("Error al cerrar sesión:", error);
    }
  };

  // Función para crear admin de una escuela específica
  const crearAdminEscuela = async (escuela) => {
    setEscuelaParaAdmin(escuela);
    setMostrarFormAdmin(true);
    setErrorAdmin('');
    setExitoAdmin('');
    setFormAdmin({
      email: '',
      nombre: '',
      password: '123456'
    });
  };

const handleSubmitAdmin = async (e) => {
  e.preventDefault();
  setCargandoAdmin(true);
  setErrorAdmin('');
  setExitoAdmin('');

  try {
    // Verificar que el Super Admin está autenticado
    if (!auth.currentUser) {
      throw new Error("No hay sesión de Super Admin");
    }

    console.log("📝 Iniciando creación de admin...");
    console.log("   - Super Admin UID:", auth.currentUser.uid);
    console.log("   - Super Admin email:", auth.currentUser.email);
    console.log("   - Escuela seleccionada:", escuelaParaAdmin?.nombre);
    console.log("   - Escuela ID:", escuelaParaAdmin?.id);
    console.log("   - Nuevo admin email:", formAdmin.email);
    
    // Verificar que la escuela existe en Firestore
    const escuelaRef = doc(db, "escuelas", escuelaParaAdmin.id);
    const escuelaSnap = await getDoc(escuelaRef);
    
    if (!escuelaSnap.exists()) {
      throw new Error(`La escuela con ID ${escuelaParaAdmin.id} no existe en Firestore`);
    }
    
    console.log("✅ Escuela verificada en Firestore");

    // 1. Crear usuario usando la API REST de Firebase (sin cambiar sesión)
    const apiKey = "AIzaSyDiJhJLyOb4kWBE1DWArkIWRq6WE5k8phE";
    
    const response = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${apiKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: formAdmin.email,
        password: formAdmin.password,
        returnSecureToken: false  // ← ESTO EVITA QUE CAMBIE LA SESIÓN
      })
    });

    const data = await response.json();
    
    if (data.error) {
      throw new Error(data.error.message);
    }

    const uid = data.localId;
    console.log("✅ Usuario creado en Auth con UID:", uid);
    console.log("   (La sesión del Super Admin NO se perdió)");

    // 2. Guardar en Firestore como admin de la escuela
    const adminData = {
      email: formAdmin.email,
      nombre: formAdmin.nombre,
      rol: "admin",
      activo: true,
      escuelaId: escuelaParaAdmin.id,
      fechaRegistro: new Date().toISOString().split('T')[0],
      ultimoAcceso: null
    };

    console.log("📤 Escribiendo en Firestore...");
    console.log("   - Ruta:", `escuelas/${escuelaParaAdmin.id}/usuarios/${uid}`);
    console.log("   - Datos:", adminData);

    await setDoc(
      doc(db, "escuelas", escuelaParaAdmin.id, "usuarios", uid),
      adminData
    );

    console.log("✅ Documento creado en Firestore");

    setExitoAdmin(`✅ Admin ${formAdmin.nombre} creado exitosamente para ${escuelaParaAdmin.nombre}`);
    setMostrarFormAdmin(false);
    setFormAdmin({
      email: '',
      nombre: '',
      password: '123456'
    });
    
    // Recargar la lista de escuelas (opcional)
    cargarEscuelas();

  } catch (error) {
    console.error("❌ Error completo:", error);
    
    if (error.message.includes('EMAIL_EXISTS')) {
      setErrorAdmin("Este email ya está registrado");
    } else if (error.message.includes('WEAK_PASSWORD')) {
      setErrorAdmin("La contraseña debe tener al menos 6 caracteres");
    } else {
      setErrorAdmin("Error: " + error.message);
    }
  } finally {
    setCargandoAdmin(false);
  }
};

  if (modoVista === 'escuela' && escuelaSeleccionada) {
    return (
      <div>
        {/* Barra superior fija */}
        <div style={{
          background: colores.tarjeta,
          boxShadow: '0 2px 4px rgba(0, 0, 0, 0.05)',
          padding: '10px 20px',
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          zIndex: 1000,
          borderBottom: `1px solid ${colores.borde}`,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <button
            onClick={volverALista}
            style={{
              background: colores.accentLight,
              border: `1px solid ${colores.accent}`,
              borderRadius: '8px',
              padding: '8px 15px',
              color: colores.accent,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '5px',
              fontWeight: '500',
              transition: 'all 0.3s'
            }}
          >
            <span>←</span> Volver a lista de escuelas
          </button>
          
          <button
            onClick={handleLogout}
            style={{
              background: colores.dangerLight,
              border: `1px solid ${colores.danger}`,
              borderRadius: '8px',
              padding: '8px 15px',
              color: colores.danger,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '5px',
              fontWeight: '500',
              transition: 'all 0.3s'
            }}
          >
            <span>🚪</span> Cerrar Sesión
          </button>
        </div>
        
        <div style={{ height: '60px' }}></div>
        <AdminDashboard user={escuelaSeleccionada} />
      </div>
    );
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: colores.fondo,
      padding: '20px'
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

      <div style={{ 
        position: 'relative',
        zIndex: 10,
        maxWidth: '1200px', 
        margin: '0 auto' 
      }}>
        
        {/* Header */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '30px',
          background: colores.tarjeta,
          borderRadius: '16px',
          padding: '15px 25px',
          boxShadow: '0 4px 6px rgba(0, 0, 0, 0.05)',
          border: `1px solid ${colores.borde}`
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
              👑
            </div>
            <div>
              <h1 style={{ color: colores.texto, margin: 0, fontSize: '24px' }}>Super Admin Dashboard</h1>
              <p style={{ color: colores.textoSecundario, margin: 0, fontSize: '14px' }}>
                Gestión de Escuelas y Admins
              </p>
            </div>
          </div>
          
          <div style={{ display: 'flex', gap: '10px' }}>
            <button
              onClick={() => setMostrarForm(!mostrarForm)}
              style={{
                background: mostrarForm ? colores.danger : colores.success,
                border: 'none',
                borderRadius: '30px',
                padding: '10px 20px',
                color: 'white',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: 'bold'
              }}
            >
              {mostrarForm ? '✕ Cancelar' : '+ Nueva Escuela'}
            </button>
            
            <button
              onClick={handleLogout}
              style={{
                background: 'transparent',
                border: `1px solid ${colores.borde}`,
                borderRadius: '30px',
                padding: '10px 20px',
                color: colores.textoSecundario,
                cursor: 'pointer',
                fontSize: '14px',
                display: 'flex',
                alignItems: 'center',
                gap: '5px',
                transition: 'all 0.3s'
              }}
            >
              <span>🚪</span> Salir
            </button>
          </div>
        </div>

        {/* Formulario de nueva escuela */}
        {mostrarForm && (
          <div style={{ marginBottom: '30px' }}>
            <CrearEscuela onEscuelaCreada={handleEscuelaCreada} />
          </div>
        )}

        {/* Formulario para crear admin de escuela */}
        {mostrarFormAdmin && escuelaParaAdmin && (
          <div style={{
            background: colores.tarjeta,
            borderRadius: '16px',
            padding: '25px',
            marginBottom: '30px',
            boxShadow: '0 4px 6px rgba(0, 0, 0, 0.05)',
            border: `1px solid ${colores.borde}`
          }}>
            <h3 style={{ color: colores.texto, marginTop: 0 }}>
              Crear Admin para: {escuelaParaAdmin.nombre}
            </h3>
            
            {errorAdmin && (
              <div style={{
                background: colores.dangerLight,
                border: `1px solid ${colores.danger}`,
                borderRadius: '8px',
                padding: '12px',
                marginBottom: '20px',
                color: colores.danger
              }}>
                ❌ {errorAdmin}
              </div>
            )}
            
            {exitoAdmin && (
              <div style={{
                background: colores.successLight,
                border: `1px solid ${colores.success}`,
                borderRadius: '8px',
                padding: '12px',
                marginBottom: '20px',
                color: colores.success
              }}>
                ✅ {exitoAdmin}
              </div>
            )}

            <form onSubmit={handleSubmitAdmin}>
              <div style={{ marginBottom: '15px' }}>
                <label style={{ color: colores.textoSecundario, display: 'block', marginBottom: '5px' }}>
                  Nombre del Admin *
                </label>
                <input
                  type="text"
                  required
                  value={formAdmin.nombre}
                  onChange={(e) => setFormAdmin({...formAdmin, nombre: e.target.value})}
                  style={{
                    width: '100%',
                    padding: '10px',
                    background: colores.tarjeta,
                    border: `1px solid ${colores.borde}`,
                    borderRadius: '8px',
                    color: colores.texto
                  }}
                />
              </div>

              <div style={{ marginBottom: '15px' }}>
                <label style={{ color: colores.textoSecundario, display: 'block', marginBottom: '5px' }}>
                  Email *
                </label>
                <input
                  type="email"
                  required
                  value={formAdmin.email}
                  onChange={(e) => setFormAdmin({...formAdmin, email: e.target.value})}
                  style={{
                    width: '100%',
                    padding: '10px',
                    background: colores.tarjeta,
                    border: `1px solid ${colores.borde}`,
                    borderRadius: '8px',
                    color: colores.texto
                  }}
                />
              </div>

              <div style={{ marginBottom: '15px' }}>
                <label style={{ color: colores.textoSecundario, display: 'block', marginBottom: '5px' }}>
                  Contraseña (por defecto: 123456)
                </label>
                <input
                  type="text"
                  value={formAdmin.password}
                  onChange={(e) => setFormAdmin({...formAdmin, password: e.target.value})}
                  style={{
                    width: '100%',
                    padding: '10px',
                    background: colores.tarjeta,
                    border: `1px solid ${colores.borde}`,
                    borderRadius: '8px',
                    color: colores.texto
                  }}
                />
              </div>

              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  onClick={() => setMostrarFormAdmin(false)}
                  style={{
                    background: 'transparent',
                    border: `1px solid ${colores.borde}`,
                    borderRadius: '8px',
                    padding: '10px 20px',
                    color: colores.textoSecundario,
                    cursor: 'pointer'
                  }}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={cargandoAdmin}
                  style={{
                    background: cargandoAdmin ? colores.textoSecundario : colores.accent,
                    border: 'none',
                    borderRadius: '8px',
                    padding: '10px 20px',
                    color: 'white',
                    cursor: cargandoAdmin ? 'not-allowed' : 'pointer',
                    opacity: cargandoAdmin ? 0.7 : 1
                  }}
                >
                  {cargandoAdmin ? 'Creando...' : 'Crear Admin'}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Lista de escuelas */}
        <div style={{
          background: colores.tarjeta,
          borderRadius: '16px',
          padding: '25px',
          boxShadow: '0 4px 6px rgba(0, 0, 0, 0.05)',
          border: `1px solid ${colores.borde}`
        }}>
          <h2 style={{ color: colores.texto, marginBottom: '20px', fontSize: '20px' }}>
            📋 Escuelas Registradas ({escuelas.length})
          </h2>
          
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
              <p style={{ color: colores.textoSecundario }}>Cargando escuelas...</p>
            </div>
          ) : escuelas.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '60px 20px' }}>
              <span style={{ fontSize: '64px', display: 'block', marginBottom: '20px', opacity: 0.5 }}>🏫</span>
              <p style={{ color: colores.textoSecundario, fontSize: '18px' }}>No hay escuelas registradas</p>
              <p style={{ color: colores.textoSecundario, fontSize: '14px' }}>
                Haz clic en "Nueva Escuela" para comenzar
              </p>
            </div>
          ) : (
            <div style={{ display: 'grid', gap: '15px' }}>
              {escuelas.map(escuela => (
                <div
                  key={escuela.id}
                  style={{
                    background: colores.accentLight,
                    borderRadius: '12px',
                    padding: '20px',
                    border: `1px solid ${colores.borde}`,
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    transition: 'all 0.3s'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.background = '#d4e4f7'}
                  onMouseLeave={(e) => e.currentTarget.style.background = colores.accentLight}
                >
                  <div>
                    <h3 style={{ color: colores.texto, margin: '0 0 5px 0', fontSize: '18px' }}>
                      {escuela.nombre}
                    </h3>
                    <p style={{ color: colores.textoSecundario, margin: 0, fontSize: '14px' }}>
                      📍 {escuela.direccion || 'Sin dirección'} | 📧 {escuela.email || 'Sin email'}
                    </p>
                  </div>
                  <div style={{ display: 'flex', gap: '10px' }}>
                    <button
                      onClick={() => crearAdminEscuela(escuela)}
                      style={{
                        background: colores.successLight,
                        border: `1px solid ${colores.success}`,
                        borderRadius: '8px',
                        padding: '10px 15px',
                        color: colores.success,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '5px',
                        transition: 'all 0.3s'
                      }}
                    >
                      <span>➕</span> Crear Admin
                    </button>
                    <button
                      onClick={() => verEscuelaComoAdmin(escuela)}
                      style={{
                        background: colores.accentLight,
                        border: `1px solid ${colores.accent}`,
                        borderRadius: '8px',
                        padding: '10px 20px',
                        color: colores.accent,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '5px',
                        transition: 'all 0.3s'
                      }}
                    >
                      <span>👤</span> Ver como Admin
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <style>{`
        @keyframes float {
          0%, 100% { transform: translate(0, 0); }
          50% { transform: translate(30px, 30px); }
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}

export default SuperAdminDashboard;