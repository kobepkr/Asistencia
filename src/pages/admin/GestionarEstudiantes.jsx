import React, { useState, useEffect } from 'react';
import { collection, getDocs, addDoc, query, where } from 'firebase/firestore';
import { db } from '../../firebase';
import logoColegio from '../../assets/logo-colegio.png'; // Importa el logo (asegúrate de tenerlo en src/assets/)

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

function GestionarEstudiantes({ user }) {
  const [estudiantes, setEstudiantes] = useState([]);
  const [cursos, setCursos] = useState([]);
  const [cargando, setCargando] = useState(false);
  const [mostrarForm, setMostrarForm] = useState(false);
  const [error, setError] = useState('');
  const [exito, setExito] = useState('');
  const [formData, setFormData] = useState({
    nombres: '',
    apellidoPaterno: '',
    apellidoMaterno: '',
    rut: '',
    cursoId: '',
    fechaNacimiento: ''
  });

  const cargarDatos = async () => {
    try {
      // Cargar cursos
      const cursosRef = collection(db, "escuelas", user.escuelaId, "cursos");
      const cursosSnap = await getDocs(cursosRef);
      const listaCursos = cursosSnap.docs.map(doc => ({
        id: doc.id,
        nombre: doc.data().nombre || `${doc.data().grado}° ${doc.data().letra}`
      }));
      setCursos(listaCursos);

      // Cargar estudiantes
      const estudiantesRef = collection(db, "escuelas", user.escuelaId, "estudiantes");
      const estudiantesSnap = await getDocs(estudiantesRef);
      const listaEstudiantes = estudiantesSnap.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setEstudiantes(listaEstudiantes);
    } catch (error) {
      console.error("Error cargando datos:", error);
    }
  };

  useEffect(() => {
    cargarDatos();
  }, []);

  const generarQRCode = (rut, curso) => {
    const rutLimpio = rut.replace(/[^0-9kK]/g, '').toLowerCase();
    const cursoLimpio = curso.replace(/\s+/g, '').toLowerCase();
    return `${user.escuelaId}_${cursoLimpio}_${rutLimpio}`;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setCargando(true);
    setError('');
    setExito('');

    try {
      const cursoSeleccionado = cursos.find(c => c.id === formData.cursoId);
      const qrCode = generarQRCode(formData.rut, cursoSeleccionado.nombre);

      const estudianteData = {
        nombres: formData.nombres,
        apellidoPaterno: formData.apellidoPaterno,
        apellidoMaterno: formData.apellidoMaterno || '',
        rut: formData.rut,
        curso: cursoSeleccionado.nombre,
        cursoId: formData.cursoId,
        qrCode: qrCode,
        activo: true,
        fechaRegistro: new Date().toISOString().split('T')[0]
      };

      await addDoc(collection(db, "escuelas", user.escuelaId, "estudiantes"), estudianteData);
      
      setExito(`✅ Estudiante agregado exitosamente.\nQR: ${qrCode}`);
      setMostrarForm(false);
      setFormData({
        nombres: '',
        apellidoPaterno: '',
        apellidoMaterno: '',
        rut: '',
        cursoId: '',
        fechaNacimiento: ''
      });
      cargarDatos();

    } catch (error) {
      console.error("Error agregando estudiante:", error);
      setError("Error: " + error.message);
    } finally {
      setCargando(false);
    }
  };

  // Función para convertir imagen a Base64
  const imagenABase64 = (img) => {
    return new Promise((resolve) => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const image = new Image();
      image.crossOrigin = 'anonymous';
      image.src = img;
      image.onload = () => {
        canvas.width = image.width;
        canvas.height = image.height;
        ctx.drawImage(image, 0, 0);
        resolve(canvas.toDataURL('image/png'));
      };
    });
  };

  // Función mejorada para descargar QR con logo
  const descargarQR = async (estudiante) => {
    try {
      const nombreCompleto = `${estudiante.nombres} ${estudiante.apellidoPaterno}`;
      const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(estudiante.qrCode)}`;
      
      // Convertir el logo a Base64
      const logoBase64 = await imagenABase64(logoColegio);
      
      const html = `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            * {
              margin: 0;
              padding: 0;
              box-sizing: border-box;
            }
            
            body {
              font-family: 'Arial', sans-serif;
              background: ${colores.accentLight};
              display: flex;
              justify-content: center;
              align-items: center;
              min-height: 100vh;
              padding: 20px;
            }
            
            .qr-card {
              background: ${colores.tarjeta};
              width: 400px;
              border-radius: 24px;
              padding: 25px;
              box-shadow: 0 20px 40px rgba(0,0,0,0.1);
              text-align: center;
              border: 2px solid ${colores.accent};
              position: relative;
            }
            
            .card-header {
              display: flex;
              flex-direction: column;
              align-items: center;
              margin-bottom: 15px;
            }
            
            .logo-container {
              width: 90px;
              height: 90px;
              margin-bottom: 10px;
              border-radius: 50%;
              overflow: hidden;
              border: 3px solid ${colores.accent};
              padding: 5px;
              background: white;
              box-shadow: 0 5px 15px rgba(79, 126, 179, 0.3);
            }
            
            .logo-container img {
              width: 100%;
              height: 100%;
              object-fit: contain;
            }
            
            .school-name {
              color: ${colores.texto};
              font-size: 22px;
              font-weight: bold;
              margin-bottom: 3px;
            }
            
            .school-subtitle {
              color: ${colores.textoSecundario};
              font-size: 12px;
              text-transform: uppercase;
              letter-spacing: 1px;
            }
            
            .qr-container {
              background: ${colores.accentLight};
              padding: 20px;
              border-radius: 16px;
              margin: 15px 0;
              border: 2px dashed ${colores.accent};
            }
            
            .qr-container img {
              width: 200px;
              height: 200px;
              display: block;
              margin: 0 auto;
            }
            
            .student-info {
              background: linear-gradient(135deg, ${colores.accent}, ${colores.texto});
              border-radius: 16px;
              padding: 15px;
              color: white;
              margin-top: 10px;
            }
            
            .student-name {
              font-size: 22px;
              font-weight: bold;
              margin-bottom: 10px;
              text-transform: uppercase;
              letter-spacing: 0.5px;
            }
            
            .student-details {
              display: flex;
              flex-direction: column;
              gap: 8px;
            }
            
            .student-detail {
              background: rgba(255,255,255,0.2);
              padding: 8px 15px;
              border-radius: 30px;
              font-size: 14px;
            }
            
            .footer {
              margin-top: 15px;
              font-size: 11px;
              color: ${colores.textoSecundario};
              border-top: 1px solid ${colores.borde};
              padding-top: 15px;
            }
            
            .footer p {
              margin: 2px 0;
            }
            
            @media print {
              body {
                background: white;
                padding: 0;
              }
              .qr-card {
                box-shadow: none;
                border: 1px solid #ccc;
              }
            }
          </style>
        </head>
        <body>
          <div class="qr-card">
            <div class="card-header">
              <div class="logo-container">
                <img src="${logoBase64}" alt="Logo Colegio">
              </div>
              <div class="school-name">${user.escuelaNombre || 'Colegio'}</div>
              <div class="school-subtitle">CÓDIGO DE ASISTENCIA</div>
            </div>
            
            <div class="qr-container">
              <img src="${qrUrl}" alt="QR Code">
            </div>
            
            <div class="student-info">
              <div class="student-name">${nombreCompleto}</div>
              <div class="student-details">
                <div class="student-detail">📚 Curso: ${estudiante.curso || 'No asignado'}</div>
                <div class="student-detail">🆔 RUT: ${estudiante.rut || 'Sin RUT'}</div>
              </div>
            </div>
            
            <div class="footer">
              <p>🎓 Este código es personal e intransferible</p>
              <p>📱 Escanea para registrar tu asistencia</p>
            </div>
          </div>
        </body>
        </html>
      `;
      
      const ventana = window.open('', '_blank');
      ventana.document.write(html);
      ventana.document.close();
    } catch (error) {
      console.error("Error generando QR con logo:", error);
      // Fallback: usar el método anterior si falla
      const nombreCompleto = `${estudiante.nombres} ${estudiante.apellidoPaterno}`;
      const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(estudiante.qrCode)}`;
      
      const html = `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; display: flex; justify-content: center; align-items: center; min-height: 100vh; background: #f0f4fa; margin: 0; padding: 20px; }
            .qr-card { background: white; border-radius: 20px; padding: 30px; box-shadow: 0 10px 30px rgba(0,0,0,0.1); text-align: center; max-width: 400px; }
            h1 { color: #2c3e50; font-size: 24px; margin-bottom: 5px; }
            .sub { color: #5e6f8d; font-size: 14px; margin-bottom: 20px; }
            .name { font-size: 28px; font-weight: bold; color: #4f7eb3; margin: 20px 0 10px; }
            .info { color: #5e6f8d; font-size: 16px; margin: 5px 0; }
            .footer { margin-top: 20px; font-size: 12px; color: #a0b8cc; }
          </style>
        </head>
        <body>
          <div class="qr-card">
            <h1>🏫 ${user.escuelaNombre}</h1>
            <div class="sub">Código de Asistencia</div>
            <img src="${qrUrl}" alt="QR" style="width: 250px; height: 250px;">
            <div class="name">${nombreCompleto}</div>
            <div class="info">RUT: ${estudiante.rut}</div>
            <div class="info">Curso: ${estudiante.curso}</div>
            <div class="footer">Escanea para registrar tu asistencia</div>
          </div>
        </body>
        </html>
      `;
      
      const ventana = window.open('', '_blank');
      ventana.document.write(html);
      ventana.document.close();
    }
  };

  const getCursoNombre = (cursoId) => {
    const curso = cursos.find(c => c.id === cursoId);
    return curso ? curso.nombre : 'N/A';
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px' }}>
        <h2 style={{ color: colores.texto, margin: 0 }}>👨‍🎓 Gestión de Estudiantes</h2>
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
          {mostrarForm ? '✕ Cancelar' : '+ Nuevo Estudiante'}
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
          color: colores.danger,
          whiteSpace: 'pre-line'
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
          color: colores.success,
          whiteSpace: 'pre-line'
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
          <h3 style={{ color: colores.texto, marginTop: 0 }}>Nuevo Estudiante</h3>
          <form onSubmit={handleSubmit}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
              <div>
                <label style={{ color: colores.textoSecundario, display: 'block', marginBottom: '5px' }}>
                  Nombres *
                </label>
                <input
                  type="text"
                  required
                  value={formData.nombres}
                  onChange={(e) => setFormData({...formData, nombres: e.target.value})}
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
                  Apellido Paterno *
                </label>
                <input
                  type="text"
                  required
                  value={formData.apellidoPaterno}
                  onChange={(e) => setFormData({...formData, apellidoPaterno: e.target.value})}
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
                  Apellido Materno
                </label>
                <input
                  type="text"
                  value={formData.apellidoMaterno}
                  onChange={(e) => setFormData({...formData, apellidoMaterno: e.target.value})}
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
                  RUT *
                </label>
                <input
                  type="text"
                  required
                  placeholder="12.345.678-9"
                  value={formData.rut}
                  onChange={(e) => setFormData({...formData, rut: e.target.value})}
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
                  Curso *
                </label>
                <select
                  required
                  value={formData.cursoId}
                  onChange={(e) => setFormData({...formData, cursoId: e.target.value})}
                  style={{
                    width: '100%',
                    padding: '10px',
                    background: colores.tarjeta,
                    border: `1px solid ${colores.borde}`,
                    borderRadius: '8px',
                    color: colores.texto,
                    fontSize: '14px'
                  }}
                >
                  <option value="" style={{ color: colores.textoSecundario }}>Seleccionar curso</option>
                  {cursos.map(curso => (
                    <option key={curso.id} value={curso.id} style={{ color: colores.texto }}>
                      {curso.nombre}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ color: colores.textoSecundario, display: 'block', marginBottom: '5px' }}>
                  Fecha Nacimiento
                </label>
                <input
                  type="date"
                  value={formData.fechaNacimiento}
                  onChange={(e) => setFormData({...formData, fechaNacimiento: e.target.value})}
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
              {cargando ? 'Guardando...' : 'Agregar Estudiante'}
            </button>
          </form>
        </div>
      )}

      {/* Lista de estudiantes con QR */}
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
                <th style={{ padding: '12px', textAlign: 'left', color: colores.texto }}>RUT</th>
                <th style={{ padding: '12px', textAlign: 'left', color: colores.texto }}>Curso</th>
                <th style={{ padding: '12px', textAlign: 'left', color: colores.texto }}>QR Code</th>
                <th style={{ padding: '12px', textAlign: 'left', color: colores.texto }}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {estudiantes.length === 0 ? (
                <tr>
                  <td colSpan="5" style={{ padding: '20px', textAlign: 'center', color: colores.textoSecundario }}>
                    No hay estudiantes registrados
                  </td>
                </tr>
              ) : (
                estudiantes.map((est, index) => (
                  <tr key={est.id} style={{ 
                    borderBottom: `1px solid ${colores.borde}`,
                    background: index % 2 === 0 ? 'transparent' : colores.accentLight
                  }}>
                    <td style={{ padding: '12px', color: colores.texto }}>
                      {est.nombres} {est.apellidoPaterno}
                    </td>
                    <td style={{ padding: '12px', color: colores.textoSecundario }}>{est.rut}</td>
                    <td style={{ padding: '12px', color: colores.textoSecundario }}>
                      {est.curso || getCursoNombre(est.cursoId)}
                    </td>
                    <td style={{ padding: '12px' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                        <img 
                          src={`https://api.qrserver.com/v1/create-qr-code/?size=50x50&data=${encodeURIComponent(est.qrCode)}`}
                          alt="QR"
                          style={{ 
                            width: '40px', 
                            height: '40px', 
                            marginBottom: '5px', 
                            borderRadius: '6px',
                            border: `1px solid ${colores.borde}`
                          }}
                        />
                        <button
                          onClick={() => descargarQR(est)}
                          style={{
                            background: colores.accentLight,
                            border: `1px solid ${colores.accent}`,
                            borderRadius: '5px',
                            padding: '3px 8px',
                            color: colores.accent,
                            fontSize: '11px',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '3px',
                            transition: 'all 0.3s'
                          }}
                        >
                          <span>📥</span> QR
                        </button>
                      </div>
                    </td>
                    <td style={{ padding: '12px' }}>
                      <button
                        onClick={() => descargarQR(est)}
                        style={{
                          background: colores.accent,
                          border: 'none',
                          borderRadius: '5px',
                          padding: '5px 10px',
                          color: 'white',
                          cursor: 'pointer',
                          fontSize: '12px',
                          transition: 'all 0.3s'
                        }}
                      >
                        Ver QR
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Estadísticas rápidas */}
      {estudiantes.length > 0 && (
        <div style={{
          marginTop: '20px',
          background: colores.accentLight,
          borderRadius: '8px',
          padding: '15px',
          display: 'flex',
          justifyContent: 'space-between',
          color: colores.textoSecundario,
          fontSize: '14px',
          border: `1px solid ${colores.borde}`
        }}>
          <span>📊 Total estudiantes: {estudiantes.length}</span>
          <span>🏫 Cursos: {new Set(estudiantes.map(e => e.curso)).size}</span>
        </div>
      )}
    </div>
  );
}

export default GestionarEstudiantes;