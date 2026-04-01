import React, { useState, useEffect } from 'react';
import { collection, getDocs, addDoc, query, where } from 'firebase/firestore';
import { db } from '../../firebase';
import logoColegio from '../../assets/logo-colegio.png';

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

function GestionarEstudiantes({ user }) {
  const [estudiantes, setEstudiantes] = useState([]);
  const [estudiantesFiltrados, setEstudiantesFiltrados] = useState([]);
  const [cursos, setCursos] = useState([]);
  const [cargando, setCargando] = useState(false);
  const [mostrarForm, setMostrarForm] = useState(false);
  const [error, setError] = useState('');
  const [exito, setExito] = useState('');
  const [busqueda, setBusqueda] = useState('');
  const [filtroCurso, setFiltroCurso] = useState('todos');
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
      setCursos(listaCursos.sort((a, b) => a.nombre.localeCompare(b.nombre)));

      // Cargar estudiantes
      const estudiantesRef = collection(db, "escuelas", user.escuelaId, "estudiantes");
      const estudiantesSnap = await getDocs(estudiantesRef);
      const listaEstudiantes = estudiantesSnap.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        nombreCompleto: `${doc.data().nombres || ''} ${doc.data().apellidoPaterno || ''} ${doc.data().apellidoMaterno || ''}`.trim(),
        apellidoPaterno: doc.data().apellidoPaterno || '',
        nombres: doc.data().nombres || ''
      }));
      
      // Ordenar por apellido paterno y luego por nombre
      listaEstudiantes.sort((a, b) => {
        const apellidoA = a.apellidoPaterno.toLowerCase();
        const apellidoB = b.apellidoPaterno.toLowerCase();
        if (apellidoA < apellidoB) return -1;
        if (apellidoA > apellidoB) return 1;
        // Si el apellido es igual, ordenar por nombre
        const nombreA = a.nombres.toLowerCase();
        const nombreB = b.nombres.toLowerCase();
        if (nombreA < nombreB) return -1;
        if (nombreA > nombreB) return 1;
        return 0;
      });
      
      setEstudiantes(listaEstudiantes);
      setEstudiantesFiltrados(listaEstudiantes);
    } catch (error) {
      console.error("Error cargando datos:", error);
    }
  };

  useEffect(() => {
    cargarDatos();
  }, []);

  // Filtrar estudiantes por búsqueda y curso
  useEffect(() => {
    let filtrados = [...estudiantes];
    
    // Filtrar por curso
    if (filtroCurso !== 'todos') {
      filtrados = filtrados.filter(est => est.curso === filtroCurso);
    }
    
    // Filtrar por búsqueda (nombre, apellido, RUT)
    if (busqueda.trim()) {
      const busquedaLower = busqueda.toLowerCase();
      filtrados = filtrados.filter(est => 
        est.nombres?.toLowerCase().includes(busquedaLower) ||
        est.apellidoPaterno?.toLowerCase().includes(busquedaLower) ||
        est.apellidoMaterno?.toLowerCase().includes(busquedaLower) ||
        est.rut?.toLowerCase().includes(busquedaLower) ||
        est.nombreCompleto?.toLowerCase().includes(busquedaLower)
      );
    }
    
    setEstudiantesFiltrados(filtrados);
  }, [busqueda, filtroCurso, estudiantes]);

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

  const descargarQR = async (estudiante) => {
    try {
      const nombreCompleto = `${estudiante.nombres} ${estudiante.apellidoPaterno}`;
      const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(estudiante.qrCode)}`;
      const logoBase64 = await imagenABase64(logoColegio);
      
      const html = `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body { font-family: 'Arial', sans-serif; background: #f0f4fa; display: flex; justify-content: center; align-items: center; min-height: 100vh; padding: 20px; }
            .qr-card { background: white; width: 380px; border-radius: 24px; padding: 25px; box-shadow: 0 20px 40px rgba(0,0,0,0.1); text-align: center; }
            .logo-container { width: 100px; height: 100px; margin: 0 auto 15px; border-radius: 50%; overflow: hidden; border: 3px solid #4f7eb3; padding: 5px; background: white; }
            .logo-container img { width: 100%; height: 100%; object-fit: contain; }
            .school-name { color: #2c3e50; font-size: 20px; font-weight: bold; margin-bottom: 5px; }
            .qr-container { background: #e6f0fa; padding: 20px; border-radius: 16px; margin: 20px 0; }
            .qr-container img { width: 200px; height: 200px; display: block; margin: 0 auto; }
            .student-name { font-size: 22px; font-weight: bold; color: #2c3e50; margin-bottom: 10px; }
            .student-info { background: #f8fafd; border-radius: 12px; padding: 15px; border: 1px solid #d3e2f2; }
            .student-detail { color: #5e6f8d; font-size: 14px; margin: 5px 0; }
            .footer { margin-top: 20px; font-size: 11px; color: #a0b8cc; }
          </style>
        </head>
        <body>
          <div class="qr-card">
            <div class="logo-container"><img src="${logoBase64}" alt="Logo Colegio"></div>
            <div class="school-name">${user.escuelaNombre || 'Colegio'}</div>
            <div class="qr-container"><img src="${qrUrl}" alt="QR Code"></div>
            <div class="student-name">${nombreCompleto}</div>
            <div class="student-info">
              <div class="student-detail">📚 Curso: ${estudiante.curso || 'No asignado'}</div>
              <div class="student-detail">🆔 RUT: ${estudiante.rut || 'Sin RUT'}</div>
            </div>
            <div class="footer"><p>🎓 Código de asistencia - Escanea para registrar</p></div>
          </div>
        </body>
        </html>
      `;
      
      const ventana = window.open('', '_blank');
      ventana.document.write(html);
      ventana.document.close();
    } catch (error) {
      console.error("Error generando QR:", error);
      const nombreCompleto = `${estudiante.nombres} ${estudiante.apellidoPaterno}`;
      const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(estudiante.qrCode)}`;
      const html = `<!DOCTYPE html><html><head><style>body{font-family:Arial;background:#f0f4fa;display:flex;justify-content:center;align-items:center;min-height:100vh;margin:0;padding:20px}.qr-card{background:white;border-radius:20px;padding:30px;box-shadow:0 10px 30px rgba(0,0,0,0.1);text-align:center;max-width:400px}h1{color:#2c3e50;font-size:24px}.sub{color:#5e6f8d;margin-bottom:20px}.name{font-size:28px;font-weight:bold;color:#4f7eb3;margin:20px 0 10px}.info{color:#5e6f8d;margin:5px 0}.footer{margin-top:20px;font-size:12px;color:#a0b8cc}</style></head><body><div class="qr-card"><h1>🏫 ${user.escuelaNombre}</h1><div class="sub">Código de Asistencia</div><img src="${qrUrl}" style="width:250px;height:250px"><div class="name">${nombreCompleto}</div><div class="info">RUT: ${estudiante.rut}</div><div class="info">Curso: ${estudiante.curso}</div><div class="footer">Escanea para registrar tu asistencia</div></div></body></html>`;
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

      {/* Filtros y buscador */}
      <div style={{
        display: 'flex',
        gap: '15px',
        marginBottom: '20px',
        flexWrap: 'wrap',
        background: colores.tarjeta,
        borderRadius: '12px',
        padding: '15px',
        border: `1px solid ${colores.borde}`
      }}>
        <div style={{ flex: 2 }}>
          <label style={{ color: colores.textoSecundario, fontSize: '12px', display: 'block', marginBottom: '5px' }}>
            🔍 Buscar
          </label>
          <input
            type="text"
            placeholder="Buscar por nombre, apellido o RUT..."
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            style={{
              width: '100%',
              padding: '8px 12px',
              border: `1px solid ${colores.borde}`,
              borderRadius: '8px',
              color: colores.texto,
              fontSize: '14px'
            }}
          />
        </div>
        <div style={{ flex: 1 }}>
          <label style={{ color: colores.textoSecundario, fontSize: '12px', display: 'block', marginBottom: '5px' }}>
            📚 Filtrar por curso
          </label>
          <select
            value={filtroCurso}
            onChange={(e) => setFiltroCurso(e.target.value)}
            style={{
              width: '100%',
              padding: '8px 12px',
              border: `1px solid ${colores.borde}`,
              borderRadius: '8px',
              color: colores.texto,
              fontSize: '14px'
            }}
          >
            <option value="todos">Todos los cursos</option>
            {cursos.map(curso => (
              <option key={curso.id} value={curso.nombre}>{curso.nombre}</option>
            ))}
          </select>
        </div>
        <div style={{ flex: 1 }}>
          <label style={{ color: colores.textoSecundario, fontSize: '12px', display: 'block', marginBottom: '5px' }}>
            📊 Total estudiantes
          </label>
          <div style={{
            background: colores.accentLight,
            padding: '8px 12px',
            borderRadius: '8px',
            textAlign: 'center',
            fontWeight: 'bold',
            color: colores.texto
          }}>
            {estudiantesFiltrados.length} / {estudiantes.length}
          </div>
        </div>
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
                <label style={{ color: colores.textoSecundario, display: 'block', marginBottom: '5px' }}>Nombres *</label>
                <input type="text" required value={formData.nombres} onChange={(e) => setFormData({...formData, nombres: e.target.value})} style={{ width: '100%', padding: '10px', background: colores.tarjeta, border: `1px solid ${colores.borde}`, borderRadius: '8px', color: colores.texto }} />
              </div>
              <div>
                <label style={{ color: colores.textoSecundario, display: 'block', marginBottom: '5px' }}>Apellido Paterno *</label>
                <input type="text" required value={formData.apellidoPaterno} onChange={(e) => setFormData({...formData, apellidoPaterno: e.target.value})} style={{ width: '100%', padding: '10px', background: colores.tarjeta, border: `1px solid ${colores.borde}`, borderRadius: '8px', color: colores.texto }} />
              </div>
              <div>
                <label style={{ color: colores.textoSecundario, display: 'block', marginBottom: '5px' }}>Apellido Materno</label>
                <input type="text" value={formData.apellidoMaterno} onChange={(e) => setFormData({...formData, apellidoMaterno: e.target.value})} style={{ width: '100%', padding: '10px', background: colores.tarjeta, border: `1px solid ${colores.borde}`, borderRadius: '8px', color: colores.texto }} />
              </div>
              <div>
                <label style={{ color: colores.textoSecundario, display: 'block', marginBottom: '5px' }}>RUT *</label>
                <input type="text" required placeholder="12.345.678-9" value={formData.rut} onChange={(e) => setFormData({...formData, rut: e.target.value})} style={{ width: '100%', padding: '10px', background: colores.tarjeta, border: `1px solid ${colores.borde}`, borderRadius: '8px', color: colores.texto }} />
              </div>
              <div>
                <label style={{ color: colores.textoSecundario, display: 'block', marginBottom: '5px' }}>Curso *</label>
                <select required value={formData.cursoId} onChange={(e) => setFormData({...formData, cursoId: e.target.value})} style={{ width: '100%', padding: '10px', background: colores.tarjeta, border: `1px solid ${colores.borde}`, borderRadius: '8px', color: colores.texto }}>
                  <option value="">Seleccionar curso</option>
                  {cursos.map(curso => <option key={curso.id} value={curso.id}>{curso.nombre}</option>)}
                </select>
              </div>
              <div>
                <label style={{ color: colores.textoSecundario, display: 'block', marginBottom: '5px' }}>Fecha Nacimiento</label>
                <input type="date" value={formData.fechaNacimiento} onChange={(e) => setFormData({...formData, fechaNacimiento: e.target.value})} style={{ width: '100%', padding: '10px', background: colores.tarjeta, border: `1px solid ${colores.borde}`, borderRadius: '8px', color: colores.texto }} />
              </div>
            </div>
            <button type="submit" disabled={cargando} style={{ marginTop: '20px', background: cargando ? colores.textoSecundario : colores.accent, border: 'none', borderRadius: '8px', padding: '12px 20px', color: 'white', cursor: cargando ? 'not-allowed' : 'pointer', opacity: cargando ? 0.7 : 1, width: '100%', fontSize: '16px', fontWeight: 'bold' }}>
              {cargando ? 'Guardando...' : 'Agregar Estudiante'}
            </button>
          </form>
        </div>
      )}

      {/* Lista de estudiantes */}
      <div style={{
        background: colores.tarjeta,
        borderRadius: '16px',
        padding: '20px',
        border: `1px solid ${colores.borde}`,
        boxShadow: '0 4px 6px rgba(0, 0, 0, 0.05)'
      }}>
        <div style={{ maxHeight: '500px', overflowY: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead style={{ background: colores.accentLight, position: 'sticky', top: 0 }}>
              <tr>
                <th style={{ padding: '12px', textAlign: 'left', color: colores.texto }}>#</th>
                <th style={{ padding: '12px', textAlign: 'left', color: colores.texto }}>Nombre</th>
                <th style={{ padding: '12px', textAlign: 'left', color: colores.texto }}>Apellido Paterno</th>
                <th style={{ padding: '12px', textAlign: 'left', color: colores.texto }}>RUT</th>
                <th style={{ padding: '12px', textAlign: 'left', color: colores.texto }}>Curso</th>
                <th style={{ padding: '12px', textAlign: 'center', color: colores.texto }}>QR</th>
                <th style={{ padding: '12px', textAlign: 'center', color: colores.texto }}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {estudiantesFiltrados.length === 0 ? (
                <tr>
                  <td colSpan="7" style={{ padding: '40px', textAlign: 'center', color: colores.textoSecundario }}>
                    {busqueda || filtroCurso !== 'todos' ? 'No hay estudiantes que coincidan con los filtros' : 'No hay estudiantes registrados'}
                  </td>
                </tr>
              ) : (
                estudiantesFiltrados.map((est, index) => (
                  <tr key={est.id} style={{ borderBottom: `1px solid ${colores.borde}`, background: index % 2 === 0 ? 'transparent' : colores.accentLight }}>
                    <td style={{ padding: '12px', color: colores.textoSecundario }}>{index + 1}</td>
                    <td style={{ padding: '12px', color: colores.texto, fontWeight: '500' }}>{est.nombres}</td>
                    <td style={{ padding: '12px', color: colores.texto, fontWeight: '500' }}>{est.apellidoPaterno}</td>
                    <td style={{ padding: '12px', color: colores.textoSecundario }}>{est.rut}</td>
                    <td style={{ padding: '12px', color: colores.textoSecundario }}>{est.curso || getCursoNombre(est.cursoId)}</td>
                    <td style={{ padding: '12px', textAlign: 'center' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                        <img src={`https://api.qrserver.com/v1/create-qr-code/?size=40x40&data=${encodeURIComponent(est.qrCode)}`} alt="QR" style={{ width: '35px', height: '35px', marginBottom: '5px', borderRadius: '4px', border: `1px solid ${colores.borde}` }} />
                        <button onClick={() => descargarQR(est)} style={{ background: colores.accentLight, border: `1px solid ${colores.accent}`, borderRadius: '4px', padding: '2px 6px', color: colores.accent, fontSize: '10px', cursor: 'pointer' }}>📥 QR</button>
                      </div>
                    </td>
                    <td style={{ padding: '12px', textAlign: 'center' }}>
                      <button onClick={() => descargarQR(est)} style={{ background: colores.accent, border: 'none', borderRadius: '5px', padding: '5px 12px', color: 'white', cursor: 'pointer', fontSize: '12px' }}>Ver QR</button>
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

export default GestionarEstudiantes;