import React, { useState, useEffect } from 'react';
import { collection, getDocs, doc, setDoc, query, where, updateDoc } from 'firebase/firestore';
import { db } from '../../firebase';

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

function GestionarProfesores({ user }) {
  const [profesores, setProfesores] = useState([]);
  const [cursos, setCursos] = useState([]);
  const [cargando, setCargando] = useState(false);
  const [mostrarForm, setMostrarForm] = useState(false);
  const [error, setError] = useState('');
  const [exito, setExito] = useState('');
  const [formData, setFormData] = useState({
    email: '',
    nombre: '',
    password: '123456',
    cursosAsignados: []
  });

  const cargarDatos = async () => {
    try {
      // Cargar profesores
      const profesoresRef = collection(db, "escuelas", user.escuelaId, "usuarios");
      const q = query(profesoresRef, where("rol", "==", "profesor"));
      const profesoresSnap = await getDocs(q);
      const listaProfesores = profesoresSnap.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setProfesores(listaProfesores);

      // Cargar cursos
      const cursosRef = collection(db, "escuelas", user.escuelaId, "cursos");
      const cursosSnap = await getDocs(cursosRef);
      const listaCursos = cursosSnap.docs.map(doc => ({
        id: doc.id,
        nombre: doc.data().nombre || `${doc.data().grado}° ${doc.data().letra}`
      }));
      setCursos(listaCursos);
    } catch (error) {
      console.error("Error cargando datos:", error);
      setError("Error al cargar datos");
    }
  };

  useEffect(() => {
    cargarDatos();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setCargando(true);
    setError('');
    setExito('');

    try {
      console.log("📝 Creando profesor para escuela:", user.escuelaId);
      console.log("   - Email:", formData.email);
      console.log("   - Nombre:", formData.nombre);

      // 1. Crear usuario usando la API REST (sin cambiar sesión)
      const apiKey = "AIzaSyDiJhJLyOb4kWBE1DWArkIWRq6WE5k8phE";
      
      const response = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${apiKey}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: formData.email,
          password: formData.password,
          returnSecureToken: false
        })
      });

      const data = await response.json();
      
      if (data.error) {
        throw new Error(data.error.message);
      }

      const uid = data.localId;
      console.log("✅ Usuario creado en Auth con UID:", uid);

      // 2. Guardar en Firestore como profesor
      const profesorData = {
        email: formData.email,
        nombre: formData.nombre,
        rol: "profesor",
        activo: true,
        escuelaId: user.escuelaId,
        cursosAsignados: formData.cursosAsignados || [],
        fechaRegistro: new Date().toISOString().split('T')[0],
        ultimoAcceso: null
      };

      console.log("📤 Guardando en Firestore...");
      console.log("   - Ruta:", `escuelas/${user.escuelaId}/usuarios/${uid}`);

      await setDoc(
        doc(db, "escuelas", user.escuelaId, "usuarios", uid),
        profesorData
      );

      console.log("✅ Profesor guardado en Firestore");

      setExito(`✅ Profesor ${formData.nombre} creado exitosamente`);
      setMostrarForm(false);
      setFormData({
        email: '',
        nombre: '',
        password: '123456',
        cursosAsignados: []
      });
      
      cargarDatos();

    } catch (error) {
      console.error("❌ Error creando profesor:", error);
      
      if (error.message.includes('EMAIL_EXISTS')) {
        setError("Este email ya está registrado");
      } else if (error.message.includes('WEAK_PASSWORD')) {
        setError("La contraseña debe tener al menos 6 caracteres");
      } else {
        setError("Error: " + error.message);
      }
    } finally {
      setCargando(false);
    }
  };

  const handleCursoChange = (e) => {
    const selectedOptions = Array.from(e.target.selectedOptions, option => option.value);
    setFormData({...formData, cursosAsignados: selectedOptions});
  };

  const handleToggleActivo = async (profesorId, activo) => {
    try {
      await updateDoc(
        doc(db, "escuelas", user.escuelaId, "usuarios", profesorId),
        { activo: !activo }
      );
      cargarDatos();
      setExito(`Profesor ${!activo ? 'activado' : 'desactivado'}`);
    } catch (error) {
      console.error("Error actualizando profesor:", error);
      setError("Error al actualizar profesor");
    }
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px' }}>
        <h2 style={{ color: colores.texto, margin: 0 }}>👥 Gestión de Profesores</h2>
        <button
          onClick={() => {
            setMostrarForm(!mostrarForm);
            setError('');
            setExito('');
          }}
          style={{
            background: mostrarForm ? colores.danger : colores.success,
            border: 'none',
            borderRadius: '8px',
            padding: '10px 20px',
            color: 'white',
            cursor: 'pointer',
            fontSize: '14px',
            fontWeight: 'bold',
            transition: 'all 0.3s'
          }}
        >
          {mostrarForm ? '✕ Cancelar' : '+ Nuevo Profesor'}
        </button>
      </div>

      {error && (
        <div style={{
          background: colores.dangerLight,
          border: `1px solid ${colores.danger}`,
          borderRadius: '8px',
          padding: '12px',
          marginBottom: '20px',
          color: colores.danger
        }}>
          ❌ {error}
        </div>
      )}

      {exito && (
        <div style={{
          background: colores.successLight,
          border: `1px solid ${colores.success}`,
          borderRadius: '8px',
          padding: '12px',
          marginBottom: '20px',
          color: colores.success
        }}>
          ✅ {exito}
        </div>
      )}

      {mostrarForm && (
        <div style={{
          background: colores.tarjeta,
          borderRadius: '16px',
          padding: '20px',
          marginBottom: '20px',
          border: `1px solid ${colores.borde}`,
          boxShadow: '0 4px 6px rgba(0, 0, 0, 0.05)'
        }}>
          <h3 style={{ color: colores.texto, marginTop: 0 }}>Nuevo Profesor</h3>
          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: '15px' }}>
              <label style={{ color: colores.textoSecundario, display: 'block', marginBottom: '5px' }}>
                Nombre completo *
              </label>
              <input
                type="text"
                required
                value={formData.nombre}
                onChange={(e) => setFormData({...formData, nombre: e.target.value})}
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

            <div style={{ marginBottom: '15px' }}>
              <label style={{ color: colores.textoSecundario, display: 'block', marginBottom: '5px' }}>
                Email *
              </label>
              <input
                type="email"
                required
                value={formData.email}
                onChange={(e) => setFormData({...formData, email: e.target.value})}
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

            <div style={{ marginBottom: '15px' }}>
              <label style={{ color: colores.textoSecundario, display: 'block', marginBottom: '5px' }}>
                Contraseña
              </label>
              <input
                type="text"
                value={formData.password}
                onChange={(e) => setFormData({...formData, password: e.target.value})}
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
              <p style={{ color: colores.textoSecundario, fontSize: '12px', margin: '5px 0 0' }}>
                Por defecto: 123456
              </p>
            </div>

            <div style={{ marginBottom: '15px' }}>
              <label style={{ color: colores.textoSecundario, display: 'block', marginBottom: '5px' }}>
                Cursos asignados
              </label>
              <select
                multiple
                value={formData.cursosAsignados}
                onChange={handleCursoChange}
                style={{
                  width: '100%',
                  padding: '10px',
                  background: colores.tarjeta,
                  border: `1px solid ${colores.borde}`,
                  borderRadius: '8px',
                  color: colores.texto,
                  minHeight: '100px',
                  fontSize: '14px'
                }}
              >
                {cursos.map(curso => (
                  <option key={curso.id} value={curso.nombre} style={{ padding: '5px' }}>
                    {curso.nombre}
                  </option>
                ))}
              </select>
              <p style={{ color: colores.textoSecundario, fontSize: '12px', margin: '5px 0 0' }}>
                Ctrl+Click para seleccionar múltiples
              </p>
            </div>

            <button
              type="submit"
              disabled={cargando}
              style={{
                marginTop: '10px',
                background: cargando ? colores.textoSecundario : colores.accent,
                border: 'none',
                borderRadius: '8px',
                padding: '12px 20px',
                color: 'white',
                cursor: cargando ? 'not-allowed' : 'pointer',
                opacity: cargando ? 0.7 : 1,
                width: '100%',
                fontSize: '16px',
                fontWeight: 'bold',
                transition: 'all 0.3s'
              }}
            >
              {cargando ? 'Creando...' : 'Crear Profesor'}
            </button>
          </form>
        </div>
      )}

      {/* Lista de profesores */}
      <div style={{
        background: colores.tarjeta,
        borderRadius: '16px',
        padding: '20px',
        border: `1px solid ${colores.borde}`,
        boxShadow: '0 4px 6px rgba(0, 0, 0, 0.05)'
      }}>
        <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead style={{ background: colores.accentLight }}>
              <tr>
                <th style={{ padding: '12px', textAlign: 'left', color: colores.texto }}>Nombre</th>
                <th style={{ padding: '12px', textAlign: 'left', color: colores.texto }}>Email</th>
                <th style={{ padding: '12px', textAlign: 'left', color: colores.texto }}>Cursos</th>
                <th style={{ padding: '12px', textAlign: 'left', color: colores.texto }}>Estado</th>
                <th style={{ padding: '12px', textAlign: 'left', color: colores.texto }}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {profesores.length === 0 ? (
                <tr>
                  <td colSpan="5" style={{ padding: '20px', textAlign: 'center', color: colores.textoSecundario }}>
                    No hay profesores registrados
                  </td>
                </tr>
              ) : (
                profesores.map((prof, index) => (
                  <tr key={prof.id} style={{ 
                    borderBottom: `1px solid ${colores.borde}`,
                    background: index % 2 === 0 ? 'transparent' : colores.accentLight
                  }}>
                    <td style={{ padding: '12px', color: colores.texto }}>{prof.nombre}</td>
                    <td style={{ padding: '12px', color: colores.textoSecundario }}>{prof.email}</td>
                    <td style={{ padding: '12px', color: colores.textoSecundario }}>
                      {prof.cursosAsignados?.length > 0 ? prof.cursosAsignados.join(', ') : 'Sin cursos'}
                    </td>
                    <td style={{ padding: '12px' }}>
                      <span style={{
                        background: prof.activo ? colores.successLight : colores.dangerLight,
                        color: prof.activo ? colores.success : colores.danger,
                        padding: '4px 8px',
                        borderRadius: '12px',
                        fontSize: '12px',
                        fontWeight: 'bold'
                      }}>
                        {prof.activo ? 'Activo' : 'Inactivo'}
                      </span>
                    </td>
                    <td style={{ padding: '12px' }}>
                      <button
                        onClick={() => handleToggleActivo(prof.id, prof.activo)}
                        style={{
                          background: prof.activo ? colores.dangerLight : colores.successLight,
                          border: `1px solid ${prof.activo ? colores.danger : colores.success}`,
                          borderRadius: '8px',
                          padding: '5px 10px',
                          color: prof.activo ? colores.danger : colores.success,
                          cursor: 'pointer',
                          fontSize: '12px',
                          fontWeight: 'bold',
                          transition: 'all 0.3s'
                        }}
                      >
                        {prof.activo ? 'Desactivar' : 'Activar'}
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default GestionarProfesores;