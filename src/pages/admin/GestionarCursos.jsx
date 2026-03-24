import React, { useState, useEffect } from 'react';
import { collection, getDocs, addDoc, deleteDoc, doc, query, where } from 'firebase/firestore';
import { db } from '../../firebase';

// Paleta de colores suaves (igual que en los demás componentes)
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

function GestionarCursos({ user }) {
  const [cursos, setCursos] = useState([]);
  const [estudiantes, setEstudiantes] = useState([]);
  const [cargando, setCargando] = useState(false);
  const [mostrarForm, setMostrarForm] = useState(false);
  const [error, setError] = useState('');
  const [exito, setExito] = useState('');
  const [cursoSeleccionado, setCursoSeleccionado] = useState(null);
  const [vista, setVista] = useState('lista');
  const [formData, setFormData] = useState({
    nivel: 'Preescolar',
    grado: '',
    letra: '',
    año: new Date().getFullYear()
  });

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
      setError("Error al cargar cursos: " + error.message);
    }
  };

  const cargarEstudiantes = async (cursoId, cursoNombre) => {
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
      setEstudiantes(lista);
      setCursoSeleccionado({ id: cursoId, nombre: cursoNombre });
      setVista('detalle');
    } catch (error) {
      console.error("Error cargando estudiantes:", error);
      setError("Error al cargar estudiantes");
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    cargarCursos();
  }, []);

  const getGradosPorNivel = () => {
    switch(formData.nivel) {
      case 'Preescolar':
        return [
          { value: 'Pre-Kinder', label: 'Pre-Kinder' },
          { value: 'Kinder', label: 'Kinder' }
        ];
      case 'Básica':
        return [1, 2, 3, 4, 5, 6, 7, 8].map(g => ({ 
          value: g, 
          label: `${g}° Básico` 
        }));
      case 'Media':
        return [1, 2, 3, 4].map(g => ({ 
          value: g, 
          label: `${g}° Medio` 
        }));
      default:
        return [];
    }
  };

  const getLetrasDisponibles = () => {
    return ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K'].map(letra => ({
      value: letra,
      label: letra
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setCargando(true);
    setError('');
    setExito('');

    if (!formData.grado || !formData.letra) {
      setError("El grado y la letra son obligatorios");
      setCargando(false);
      return;
    }

    try {
      let nombreCurso = '';
      if (formData.nivel === 'Preescolar') {
        nombreCurso = formData.grado === 'Pre-Kinder' ? 'Pre-Kinder' : 'Kinder';
        if (formData.letra) {
          nombreCurso += ` ${formData.letra}`;
        }
      } else {
        nombreCurso = `${formData.grado}° ${formData.letra}`;
      }

      const cursoData = {
        nivel: formData.nivel,
        grado: formData.grado,
        letra: formData.letra.toUpperCase(),
        año: formData.año,
        nombre: nombreCurso,
        fechaCreacion: new Date().toISOString().split('T')[0]
      };

      const cursosRef = collection(db, "escuelas", user.escuelaId, "cursos");
      await addDoc(cursosRef, cursoData);
      
      setExito(`✅ Curso ${nombreCurso} creado exitosamente`);
      setMostrarForm(false);
      setFormData({
        nivel: 'Preescolar',
        grado: '',
        letra: '',
        año: new Date().getFullYear()
      });
      cargarCursos();

    } catch (error) {
      console.error("Error creando curso:", error);
      setError("Error al crear curso: " + error.message);
    } finally {
      setCargando(false);
    }
  };

  const handleEliminar = async (cursoId, cursoNombre) => {
    if (!window.confirm(`¿Estás seguro de eliminar el curso ${cursoNombre}?`)) return;

    try {
      await deleteDoc(doc(db, "escuelas", user.escuelaId, "cursos", cursoId));
      setExito(`Curso ${cursoNombre} eliminado`);
      cargarCursos();
    } catch (error) {
      console.error("Error eliminando curso:", error);
      setError("Error al eliminar curso: " + error.message);
    }
  };

  const volverALista = () => {
    setVista('lista');
    setCursoSeleccionado(null);
    setEstudiantes([]);
  };

  // Vista de detalle del curso (estudiantes)
  if (vista === 'detalle' && cursoSeleccionado) {
    return (
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <button
            onClick={volverALista}
            style={{
              padding: '10px 20px',
              background: colores.accent,
              border: 'none',
              borderRadius: '8px',
              color: 'white',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              fontSize: '14px',
              transition: 'all 0.3s'
            }}
          >
            <span>←</span> Volver a cursos
          </button>
          <h2 style={{ color: colores.texto, margin: 0, fontSize: '1.5rem' }}>
            📚 Estudiantes de {cursoSeleccionado.nombre}
          </h2>
          <div style={{ width: '100px' }}></div>
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
          <div style={{
            background: colores.tarjeta,
            borderRadius: '16px',
            padding: '20px',
            border: `1px solid ${colores.borde}`,
            boxShadow: '0 4px 6px rgba(0, 0, 0, 0.05)'
          }}>
            {estudiantes.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px' }}>
                <p style={{ color: colores.textoSecundario }}>No hay estudiantes en este curso</p>
              </div>
            ) : (
              <>
                <div style={{ marginBottom: '15px', color: colores.textoSecundario }}>
                  Total: {estudiantes.length} estudiantes
                </div>
                <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead style={{ background: colores.accentLight }}>
                      <tr>
                        <th style={{ padding: '12px', textAlign: 'left', color: colores.texto }}>#</th>
                        <th style={{ padding: '12px', textAlign: 'left', color: colores.texto }}>Nombre</th>
                        <th style={{ padding: '12px', textAlign: 'left', color: colores.texto }}>RUT</th>
                        <th style={{ padding: '12px', textAlign: 'left', color: colores.texto }}>QR Code</th>
                      </tr>
                    </thead>
                    <tbody>
                      {estudiantes.map((est, index) => (
                        <tr key={est.id} style={{
                          borderBottom: `1px solid ${colores.borde}`,
                          background: index % 2 === 0 ? 'transparent' : colores.accentLight
                        }}>
                          <td style={{ padding: '12px', color: colores.textoSecundario }}>{index + 1}</td>
                          <td style={{ padding: '12px', color: colores.texto }}>{est.nombreCompleto}</td>
                          <td style={{ padding: '12px', color: colores.textoSecundario }}>{est.rut}</td>
                          <td style={{ padding: '12px' }}>
                            <code style={{
                              background: colores.accentLight,
                              padding: '4px 8px',
                              borderRadius: '4px',
                              color: colores.accent,
                              fontSize: '11px',
                              border: `1px solid ${colores.borde}`
                            }}>
                              {est.qrCode}
                            </code>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    );
  }

  // Vista de lista de cursos
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px' }}>
        <h2 style={{ color: colores.texto, margin: 0 }}>📚 Gestión de Cursos</h2>
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
          {mostrarForm ? '✕ Cancelar' : '+ Nuevo Curso'}
        </button>
      </div>

      {/* Mensajes de error/éxito */}
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
          <h3 style={{ color: colores.texto, marginTop: 0 }}>Nuevo Curso</h3>
          <form onSubmit={handleSubmit}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
              
              <div>
                <label style={{ color: colores.textoSecundario, display: 'block', marginBottom: '5px' }}>
                  Nivel *
                </label>
                <select
                  required
                  value={formData.nivel}
                  onChange={(e) => {
                    setFormData({
                      ...formData,
                      nivel: e.target.value,
                      grado: '',
                      letra: ''
                    });
                  }}
                  style={{
                    width: '100%',
                    padding: '10px',
                    background: colores.tarjeta,
                    border: `1px solid ${colores.borde}`,
                    borderRadius: '8px',
                    color: colores.texto,
                    fontSize: '14px',
                    cursor: 'pointer'
                  }}
                >
                  <option value="Preescolar" style={{ background: colores.tarjeta, color: colores.texto }}>🏫 Preescolar</option>
                  <option value="Básica" style={{ background: colores.tarjeta, color: colores.texto }}>📚 Enseñanza Básica</option>
                  <option value="Media" style={{ background: colores.tarjeta, color: colores.texto }}>🎓 Enseñanza Media</option>
                </select>
              </div>

              <div>
                <label style={{ color: colores.textoSecundario, display: 'block', marginBottom: '5px' }}>
                  Grado *
                </label>
                <select
                  required
                  value={formData.grado}
                  onChange={(e) => setFormData({...formData, grado: e.target.value})}
                  style={{
                    width: '100%',
                    padding: '10px',
                    background: colores.tarjeta,
                    border: `1px solid ${colores.borde}`,
                    borderRadius: '8px',
                    color: colores.texto,
                    fontSize: '14px',
                    cursor: 'pointer'
                  }}
                >
                  <option value="" style={{ background: colores.tarjeta, color: colores.texto }}>Seleccionar grado</option>
                  {getGradosPorNivel().map(opcion => (
                    <option key={opcion.value} value={opcion.value} style={{ background: colores.tarjeta, color: colores.texto }}>
                      {opcion.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ color: colores.textoSecundario, display: 'block', marginBottom: '5px' }}>
                  Letra *
                </label>
                <select
                  required
                  value={formData.letra}
                  onChange={(e) => setFormData({...formData, letra: e.target.value})}
                  style={{
                    width: '100%',
                    padding: '10px',
                    background: colores.tarjeta,
                    border: `1px solid ${colores.borde}`,
                    borderRadius: '8px',
                    color: colores.texto,
                    fontSize: '14px',
                    cursor: 'pointer'
                  }}
                >
                  <option value="" style={{ background: colores.tarjeta, color: colores.texto }}>Seleccionar letra</option>
                  {getLetrasDisponibles().map(opcion => (
                    <option key={opcion.value} value={opcion.value} style={{ background: colores.tarjeta, color: colores.texto }}>
                      {opcion.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ color: colores.textoSecundario, display: 'block', marginBottom: '5px' }}>
                  Año
                </label>
                <input
                  type="number"
                  value={formData.año}
                  onChange={(e) => setFormData({...formData, año: parseInt(e.target.value)})}
                  min="2020"
                  max="2030"
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

            <button
              type="submit"
              disabled={cargando}
              style={{
                marginTop: '20px',
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
              {cargando ? 'Creando...' : 'Crear Curso'}
            </button>
          </form>
        </div>
      )}

      {/* Lista de cursos */}
      <div style={{ display: 'grid', gap: '10px' }}>
        {cursos.length === 0 ? (
          <div style={{
            background: colores.accentLight,
            borderRadius: '16px',
            padding: '40px',
            textAlign: 'center',
            color: colores.textoSecundario,
            border: `1px solid ${colores.borde}`
          }}>
            <span style={{ fontSize: '48px', display: 'block', marginBottom: '10px' }}>📚</span>
            <p>No hay cursos creados aún. ¡Crea tu primer curso!</p>
          </div>
        ) : (
          cursos.map(curso => (
            <div
              key={curso.id}
              style={{
                background: colores.accentLight,
                borderRadius: '12px',
                padding: '15px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                border: `1px solid ${colores.borde}`,
                transition: 'all 0.3s'
              }}
              onMouseEnter={(e) => e.currentTarget.style.background = '#d4e4f7'}
              onMouseLeave={(e) => e.currentTarget.style.background = colores.accentLight}
            >
              <div>
                <h3 style={{ color: colores.texto, margin: '0 0 5px 0' }}>
                  {curso.nombre}
                </h3>
                <p style={{ color: colores.textoSecundario, margin: 0, fontSize: '12px' }}>
                  {curso.nivel || 'Sin nivel'} • {curso.año || 'Año no especificado'}
                </p>
              </div>
              <div style={{ display: 'flex', gap: '10px' }}>
                <button
                  onClick={() => cargarEstudiantes(curso.id, curso.nombre)}
                  style={{
                    background: colores.accent,
                    border: 'none',
                    borderRadius: '8px',
                    padding: '8px 15px',
                    color: 'white',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '5px',
                    fontSize: '13px',
                    transition: 'all 0.3s'
                  }}
                >
                  <span>👥</span> Ver estudiantes
                </button>
                <button
                  onClick={() => handleEliminar(curso.id, curso.nombre)}
                  style={{
                    background: colores.dangerLight,
                    border: `1px solid ${colores.danger}`,
                    borderRadius: '8px',
                    padding: '8px 15px',
                    color: colores.danger,
                    cursor: 'pointer',
                    fontSize: '13px',
                    transition: 'all 0.3s'
                  }}
                >
                  Eliminar
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Resumen de cursos */}
      {cursos.length > 0 && (
        <div style={{
          marginTop: '20px',
          padding: '15px',
          background: colores.accentLight,
          borderRadius: '8px',
          textAlign: 'center',
          color: colores.textoSecundario,
          fontSize: '14px',
          border: `1px solid ${colores.borde}`
        }}>
          📊 Total de cursos: {cursos.length}
        </div>
      )}
    </div>
  );
}

export default GestionarCursos;