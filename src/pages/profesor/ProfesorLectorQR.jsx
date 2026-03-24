import React, { useState, useEffect, useRef } from 'react';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';
import { collection, addDoc, serverTimestamp, getDocs, query, where, doc, getDoc, writeBatch } from 'firebase/firestore';
import { db } from '../../firebase';
import { signOut } from 'firebase/auth';
import { auth } from '../../firebase';
import { useNavigate } from 'react-router-dom';

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

function ProfesorLectorQR({ user }) {
  const [scanResult, setScanResult] = useState(null);
  const [isScanning, setIsScanning] = useState(false);
  const [mensaje, setMensaje] = useState('');
  const [animacion, setAnimacion] = useState(false);
  const [confeti, setConfeti] = useState(false);
  const [estudianteInfo, setEstudianteInfo] = useState(null);
  const [vistaActiva, setVistaActiva] = useState('lector');
  const [estudiantesCurso, setEstudiantesCurso] = useState([]);
  const [asistenciasHoy, setAsistenciasHoy] = useState({});
  const [configuracion, setConfiguracion] = useState(null);
  const [cargandoAsistencia, setCargandoAsistencia] = useState(false);
  const [diasHabiles, setDiasHabiles] = useState(0);
  const [cursoSeleccionado, setCursoSeleccionado] = useState(
    user.cursosAsignados && user.cursosAsignados.length > 0 ? user.cursosAsignados[0] : ''
  );
  
  // Estados para el modo selector
  const [seleccionados, setSeleccionados] = useState({});
  const [seleccionarTodos, setSeleccionarTodos] = useState(false);
  const [guardandoAsistencia, setGuardandoAsistencia] = useState(false);
  
  const qrCodeRegionId = "reader";
  const html5QrcodeRef = useRef(null);
  const navigate = useNavigate();

  // Inicialización
  useEffect(() => {
    console.log("📌 ProfesorLectorQR montado");
    console.log("📌 Datos del usuario:", user);
    console.log("📌 Cursos asignados:", user.cursosAsignados);
    
    html5QrcodeRef.current = new Html5Qrcode(qrCodeRegionId, {
      verbose: false,
      formatsToSupport: [Html5QrcodeSupportedFormats.QR_CODE],
      useBarCodeDetectorIfSupported: true
    });
    
    const inicializar = async () => {
      await cargarConfiguracion();
      if (cursoSeleccionado) {
        await cargarDatosCurso();
      }
    };
    
    inicializar();
    
    return () => {
      if (html5QrcodeRef.current && html5QrcodeRef.current.isScanning) {
        html5QrcodeRef.current.stop().catch(console.error);
      }
    };
  }, []);

  // Cargar datos del curso cuando cambia el curso seleccionado
  useEffect(() => {
    if (cursoSeleccionado && configuracion) {
      cargarDatosCurso();
    }
  }, [cursoSeleccionado, configuracion]);

  // Cuando se cargan los estudiantes, inicializar seleccionados
  useEffect(() => {
    const nuevosSeleccionados = {};
    estudiantesCurso.forEach(est => {
      // Por defecto, marcar como seleccionados (presentes)
      nuevosSeleccionados[est.id] = true;
    });
    setSeleccionados(nuevosSeleccionados);
    setSeleccionarTodos(true);
  }, [estudiantesCurso]);

  const cargarConfiguracion = async () => {
    try {
      const configRef = doc(db, "escuelas", user.escuelaId, "configuracion", "calendario");
      const configSnap = await getDoc(configRef);
      
      if (configSnap.exists()) {
        console.log("✅ Configuración cargada:", configSnap.data());
        setConfiguracion(configSnap.data());
        calcularDiasHabiles(configSnap.data());
      } else {
        console.warn("⚠️ No existe configuración de calendario");
      }
    } catch (error) {
      console.error("Error cargando configuración:", error);
    }
  };

  const calcularDiasHabiles = (config) => {
    const hoy = new Date();
    hoy.setHours(12, 0, 0, 0);
    const inicio = new Date(config.fechaInicioClases + 'T12:00:00');
    const diasSinClases = new Set(config.diasSinClases || []);
    
    let count = 0;
    let currentDate = new Date(inicio);

    while (currentDate <= hoy) {
      const diaSemana = currentDate.getDay();
      const fechaStr = currentDate.toISOString().split('T')[0];
      
      if (diaSemana !== 0 && diaSemana !== 6 && !diasSinClases.has(fechaStr)) {
        count++;
      }
      
      currentDate.setDate(currentDate.getDate() + 1);
    }
    
    console.log(`📊 Días hábiles calculados: ${count}`);
    setDiasHabiles(count);
  };

  const cargarDatosCurso = async () => {
    if (!cursoSeleccionado) return;
    
    setCargandoAsistencia(true);
    try {
      console.log("📚 Cargando estudiantes del curso:", cursoSeleccionado);
      
      const estudiantesRef = collection(db, "escuelas", user.escuelaId, "estudiantes");
      const qEstudiantes = query(estudiantesRef, where("curso", "==", cursoSeleccionado));
      const estudiantesSnap = await getDocs(qEstudiantes);
      
      const listaEstudiantes = estudiantesSnap.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        nombreCompleto: `${doc.data().nombres || ''} ${doc.data().apellidoPaterno || ''} ${doc.data().apellidoMaterno || ''}`.trim()
      }));
      
      // Ordenar por apellido paterno alfabéticamente
      listaEstudiantes.sort((a, b) => {
        const apellidoA = (a.apellidoPaterno || '').toLowerCase();
        const apellidoB = (b.apellidoPaterno || '').toLowerCase();
        if (apellidoA < apellidoB) return -1;
        if (apellidoA > apellidoB) return 1;
        return 0;
      });
      
      console.log(`✅ Encontrados ${listaEstudiantes.length} estudiantes`);
      setEstudiantesCurso(listaEstudiantes);

      const estudiantesIds = listaEstudiantes.map(e => e.id);
      
      if (estudiantesIds.length === 0) {
        setAsistenciasHoy({});
        setCargandoAsistencia(false);
        return;
      }

      // Obtener asistencias de HOY
      const hoy = new Date().toISOString().split('T')[0];
      const asistenciasRef = collection(db, "escuelas", user.escuelaId, "asistencias");
      
      const asistenciasMap = {};
      
      for (let i = 0; i < estudiantesIds.length; i += 10) {
        const batch = estudiantesIds.slice(i, i + 10);
        const qAsistencias = query(
          asistenciasRef,
          where("estudianteId", "in", batch),
          where("fecha", "==", hoy)
        );
        
        const asistenciasSnap = await getDocs(qAsistencias);
        asistenciasSnap.docs.forEach(doc => {
          const data = doc.data();
          asistenciasMap[data.estudianteId] = {
            presente: true,
            hora: data.hora
          };
        });
      }
      
      console.log(`✅ Asistencias hoy en el curso: ${Object.keys(asistenciasMap).length}`);
      setAsistenciasHoy(asistenciasMap);

      if (!configuracion) {
        console.warn("⚠️ No hay configuración de calendario. Esperando...");
        const estudiantesTemp = listaEstudiantes.map(est => ({
          ...est,
          asistenciasAcumuladas: 0,
          porcentajeAcumulado: '0.0'
        }));
        setEstudiantesCurso(estudiantesTemp);
        setCargandoAsistencia(false);
        return;
      }

      await calcularAsistenciasAcumuladas(listaEstudiantes, estudiantesIds, configuracion.fechaInicioClases);
      
    } catch (error) {
      console.error("Error cargando datos del curso:", error);
    } finally {
      setCargandoAsistencia(false);
    }
  };

  const calcularAsistenciasAcumuladas = async (estudiantesLista, estudiantesIds, fechaInicio) => {
    try {
      const hoy = new Date().toISOString().split('T')[0];
      const asistenciasRef = collection(db, "escuelas", user.escuelaId, "asistencias");
      
      const asistenciasAcumuladas = {};
      
      for (let i = 0; i < estudiantesIds.length; i += 10) {
        const batch = estudiantesIds.slice(i, i + 10);
        const qAsistencias = query(
          asistenciasRef,
          where("estudianteId", "in", batch),
          where("fecha", ">=", fechaInicio),
          where("fecha", "<=", hoy)
        );
        
        const asistenciasSnap = await getDocs(qAsistencias);
        asistenciasSnap.docs.forEach(doc => {
          const data = doc.data();
          if (!asistenciasAcumuladas[data.estudianteId]) {
            asistenciasAcumuladas[data.estudianteId] = 0;
          }
          asistenciasAcumuladas[data.estudianteId]++;
        });
      }
      
      const estudiantesConAsistencia = estudiantesLista.map(est => {
        const asistencias = asistenciasAcumuladas[est.id] || 0;
        const porcentaje = diasHabiles > 0 ? ((asistencias / diasHabiles) * 100).toFixed(1) : '0.0';
        
        return {
          ...est,
          asistenciasAcumuladas: asistencias,
          porcentajeAcumulado: porcentaje
        };
      });
      
      setEstudiantesCurso(estudiantesConAsistencia);
      
    } catch (error) {
      console.error("Error calculando asistencias acumuladas:", error);
    }
  };

  // Función para marcar/desmarcar un estudiante
  const toggleSeleccion = (estudianteId) => {
    setSeleccionados(prev => ({
      ...prev,
      [estudianteId]: !prev[estudianteId]
    }));
  };

  // Función para seleccionar/deseleccionar todos
  const toggleSeleccionarTodos = () => {
    const nuevoEstado = !seleccionarTodos;
    setSeleccionarTodos(nuevoEstado);
    
    const nuevosSeleccionados = {};
    estudiantesCurso.forEach(est => {
      nuevosSeleccionados[est.id] = nuevoEstado;
    });
    setSeleccionados(nuevosSeleccionados);
  };

  // Función para guardar la asistencia de los seleccionados
  const guardarAsistenciaSeleccionada = async () => {
    setGuardandoAsistencia(true);
    setMensaje('📝 Guardando asistencia...');
    
    try {
      const hoy = new Date().toISOString().split('T')[0];
      const fechaActualObj = new Date();
      const asistenciasRef = collection(db, "escuelas", user.escuelaId, "asistencias");
      const batch = writeBatch(db);
      
      let contadorGuardados = 0;
      let contadorYaPresentes = 0;
      
      // Primero, verificar qué asistencias ya existen hoy
      const estudiantesIds = estudiantesCurso.map(e => e.id);
      const asistenciasExistentes = {};
      
      for (let i = 0; i < estudiantesIds.length; i += 10) {
        const batchIds = estudiantesIds.slice(i, i + 10);
        const q = query(
          asistenciasRef,
          where("estudianteId", "in", batchIds),
          where("fecha", "==", hoy)
        );
        const snapshot = await getDocs(q);
        snapshot.docs.forEach(doc => {
          asistenciasExistentes[doc.data().estudianteId] = true;
        });
      }
      
      // Guardar las nuevas asistencias
      for (const estudiante of estudiantesCurso) {
        const estaSeleccionado = seleccionados[estudiante.id];
        
        if (estaSeleccionado && !asistenciasExistentes[estudiante.id]) {
          const asistenciaData = {
            qrCode: estudiante.qrCode,
            estudianteId: estudiante.id,
            estudianteNombre: `${estudiante.nombres || ''} ${estudiante.apellidoPaterno || ''} ${estudiante.apellidoMaterno || ''}`.trim(),
            estudianteRut: estudiante.rut,
            estudianteCurso: estudiante.curso,
            fecha: hoy,
            hora: fechaActualObj.toLocaleTimeString(),
            timestamp: serverTimestamp(),
            presente: true,
            registradoPor: user.uid,
            registradoPorNombre: user.nombre,
            año: fechaActualObj.getFullYear(),
            mes: fechaActualObj.getMonth() + 1,
            semana: getWeekNumber(fechaActualObj)
          };
          
          await addDoc(asistenciasRef, asistenciaData);
          contadorGuardados++;
        } else if (estaSeleccionado && asistenciasExistentes[estudiante.id]) {
          contadorYaPresentes++;
        }
      }
      
      setMensaje(`✅ Asistencia guardada: ${contadorGuardados} nuevos registros. ${contadorYaPresentes} ya estaban presentes.`);
      
      // Recargar asistencias
      await cargarDatosCurso();
      
      // Mostrar animación
      setAnimacion(true);
      setTimeout(() => setAnimacion(false), 2000);
      setConfeti(true);
      setTimeout(() => setConfeti(false), 2000);
      if (navigator.vibrate) navigator.vibrate([200, 100, 200]);
      
    } catch (error) {
      console.error("❌ Error guardando asistencia:", error);
      setMensaje(`❌ Error: ${error.message}`);
    } finally {
      setGuardandoAsistencia(false);
    }
  };

  const startScanner = async () => {
    if (!html5QrcodeRef.current) {
      setMensaje('❌ Escáner no inicializado');
      return;
    }

    setMensaje('📸 Solicitando permiso de cámara...');
    setIsScanning(true);

    const config = {
      fps: 30,
      qrbox: { width: 250, height: 250 },
      aspectRatio: 1.0,
      disableFlip: false,
      videoConstraints: {
        facingMode: "user",
        width: { min: 640, ideal: 1280, max: 1920 },
        height: { min: 480, ideal: 720, max: 1080 }
      }
    };

    try {
      await html5QrcodeRef.current.start(
        { facingMode: "user" },
        config,
        onScanSuccess,
        onScanError
      );
      setMensaje('🎯 Cámara activada');
    } catch (error) {
      console.log("Cámara frontal no disponible, intentando con otra...");
      try {
        await html5QrcodeRef.current.start(
          { facingMode: "environment" },
          { ...config, videoConstraints: { facingMode: "environment" } },
          onScanSuccess,
          onScanError
        );
        setMensaje('🎯 Cámara activada');
      } catch (error2) {
        console.error("Error iniciando cámara:", error2);
        setMensaje('❌ No se pudo acceder a la cámara');
        setIsScanning(false);
      }
    }
  };

  const stopScanner = async () => {
    if (html5QrcodeRef.current && html5QrcodeRef.current.isScanning) {
      try {
        await html5QrcodeRef.current.stop();
        setMensaje('⏸️ Cámara detenida');
      } catch (error) {
        console.error("Error deteniendo cámara:", error);
      }
    }
    setIsScanning(false);
    setEstudianteInfo(null);
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      navigate('/');
    } catch (error) {
      console.error("Error al cerrar sesión:", error);
    }
  };

  const mostrarAnimacion = () => {
    setAnimacion(true);
    setTimeout(() => setAnimacion(false), 2000);
    setConfeti(true);
    setTimeout(() => setConfeti(false), 2000);
    if (navigator.vibrate) navigator.vibrate([200, 100, 200]);
  };

  const buscarEstudiantePorQR = async (qrCode) => {
    console.log("🔍 Buscando estudiante con QR:", qrCode);
    
    try {
      const estudiantesRef = collection(db, "escuelas", user.escuelaId, "estudiantes");
      const q = query(estudiantesRef, where("qrCode", "==", qrCode));
      const querySnapshot = await getDocs(q);
      
      if (!querySnapshot.empty) {
        const estudianteData = querySnapshot.docs[0].data();
        console.log("✅ Estudiante encontrado:", estudianteData);
        return {
          id: querySnapshot.docs[0].id,
          ...estudianteData
        };
      } else {
        console.log("❌ Estudiante no encontrado para QR:", qrCode);
        return null;
      }
    } catch (error) {
      console.error("Error buscando estudiante:", error);
      return null;
    }
  };

  const getWeekNumber = (date) => {
    const firstDayOfYear = new Date(date.getFullYear(), 0, 1);
    const pastDaysOfYear = (date - firstDayOfYear) / 86400000;
    return Math.ceil((pastDaysOfYear + firstDayOfYear.getDay() + 1) / 7);
  };

  const onScanSuccess = async (decodedText) => {
    console.log("=".repeat(50));
    console.log("📌 QR ESCANEADO:", decodedText);
    
    setScanResult(decodedText);
    setEstudianteInfo(null);
    mostrarAnimacion();
    
    try {
      const estudiante = await buscarEstudiantePorQR(decodedText);
      
      if (!estudiante) {
        console.log("⚠️ QR no corresponde a ningún estudiante registrado");
        setMensaje(`⚠️ QR no registrado: ${decodedText}`);
        return;
      }
      
      console.log("📌 Objeto estudiante completo:", estudiante);
      
      const fechaActual = new Date().toISOString().split('T')[0];
      
      const asistenciasRef = collection(db, "escuelas", user.escuelaId, "asistencias");
      const q = query(
        asistenciasRef,
        where("estudianteId", "==", estudiante.id),
        where("fecha", "==", fechaActual)
      );
      
      const asistenciasSnap = await getDocs(q);
      
      if (!asistenciasSnap.empty) {
        console.log("⚠️ El estudiante YA TIENE ASISTENCIA registrada hoy");
        setMensaje(`⚠️ ${estudiante.nombres} ya registró asistencia hoy a las ${asistenciasSnap.docs[0].data().hora}`);
        return;
      }
      
      let nombreCurso = 'Sin curso';
      if (estudiante.cursoId) {
        try {
          const cursoRef = doc(db, "escuelas", user.escuelaId, "cursos", estudiante.cursoId);
          const cursoSnap = await getDoc(cursoRef);
          if (cursoSnap.exists()) {
            nombreCurso = cursoSnap.data().nombre || 'Curso sin nombre';
          }
        } catch (error) {
          console.error("Error obteniendo curso:", error);
        }
      }
      
      setEstudianteInfo(estudiante);
      
      const fechaActualObj = new Date();
      const asistenciaData = {
        qrCode: decodedText,
        estudianteId: estudiante.id,
        estudianteNombre: `${estudiante.nombres || ''} ${estudiante.apellidoPaterno || ''} ${estudiante.apellidoMaterno || ''}`.trim(),
        estudianteRut: estudiante.rut,
        estudianteCurso: nombreCurso,
        estudianteCursoId: estudiante.cursoId,
        fecha: fechaActual,
        hora: fechaActualObj.toLocaleTimeString(),
        timestamp: serverTimestamp(),
        presente: true,
        registradoPor: user.uid,
        registradoPorNombre: user.nombre,
        año: fechaActualObj.getFullYear(),
        mes: fechaActualObj.getMonth() + 1,
        semana: getWeekNumber(fechaActualObj)
      };
      
      console.log("📌 Datos a guardar:", asistenciaData);
      
      const docRef = await addDoc(asistenciasRef, asistenciaData);
      
      console.log("✅ Asistencia guardada con ID:", docRef.id);
      
      setMensaje(`✨ Asistencia de ${asistenciaData.estudianteNombre} registrada`);
      
      // Actualizar la lista de asistencias
      await cargarDatosCurso();
      
    } catch (error) {
      console.error("❌ Error:", error);
      setMensaje(`❌ Error: ${error.message}`);
    }
    
    console.log("=".repeat(50));
  };

  const onScanError = (error) => {
    if (error && error.toString().includes("NotFoundException")) {
      // No hay QR, ignorar
    } else {
      console.log("Error de escaneo:", error);
    }
  };

  if (!user.cursosAsignados || user.cursosAsignados.length === 0) {
    return (
      <div style={{
        minHeight: '100vh',
        background: colores.fondo,
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        padding: '20px'
      }}>
        <div style={{
          background: colores.tarjeta,
          borderRadius: '20px',
          padding: '40px',
          textAlign: 'center',
          color: colores.texto,
          maxWidth: '400px',
          boxShadow: '0 4px 6px rgba(0, 0, 0, 0.05)',
          border: `1px solid ${colores.borde}`
        }}>
          <span style={{ fontSize: '48px', display: 'block', marginBottom: '20px' }}>⚠️</span>
          <h2>Sin cursos asignados</h2>
          <p>No tienes cursos asignados. Contacta al administrador.</p>
          <button
            onClick={handleLogout}
            style={{
              marginTop: '20px',
              padding: '10px 30px',
              background: colores.danger,
              border: 'none',
              borderRadius: '8px',
              color: 'white',
              cursor: 'pointer'
            }}
          >
            Cerrar sesión
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: colores.fondo,
      padding: '16px'
    }}>
      <div style={{ maxWidth: '500px', margin: '0 auto' }}>
        
        {/* Header */}
        <div style={{
          background: colores.tarjeta,
          borderRadius: '20px',
          padding: '20px',
          marginBottom: '20px',
          boxShadow: '0 4px 6px rgba(0, 0, 0, 0.05)',
          border: `1px solid ${colores.borde}`
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
            <div>
              <h2 style={{ color: colores.texto, margin: 0, fontSize: '1.5rem' }}>
                👩‍🏫 {user.nombre}
              </h2>
              <p style={{ color: colores.textoSecundario, margin: '5px 0 0' }}>
                {user.escuelaNombre}
              </p>
            </div>
            <button
              onClick={handleLogout}
              style={{
                background: 'transparent',
                border: `1px solid ${colores.borde}`,
                borderRadius: '30px',
                padding: '8px 16px',
                color: colores.textoSecundario,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                transition: 'all 0.3s'
              }}
            >
              <span>🚪</span> Salir
            </button>
          </div>

          {/* Selector de curso */}
          {user.cursosAsignados.length > 1 && (
            <div style={{ marginBottom: '15px' }}>
              <label style={{ color: colores.textoSecundario, fontSize: '12px', marginBottom: '5px', display: 'block' }}>
                Seleccionar curso:
              </label>
              <select
                value={cursoSeleccionado}
                onChange={(e) => setCursoSeleccionado(e.target.value)}
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
                {user.cursosAsignados.map(curso => (
                  <option key={curso} value={curso}>
                    {curso}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Pestañas de navegación */}
          <div style={{
            display: 'flex',
            gap: '10px'
          }}>
            <button
              onClick={() => setVistaActiva('lector')}
              style={{
                flex: 1,
                padding: '10px',
                background: vistaActiva === 'lector' ? colores.accent : 'transparent',
                border: `1px solid ${vistaActiva === 'lector' ? colores.accent : colores.borde}`,
                borderRadius: '10px',
                color: vistaActiva === 'lector' ? 'white' : colores.texto,
                cursor: 'pointer',
                fontSize: '14px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '5px',
                transition: 'all 0.3s'
              }}
            >
              <span>📷</span> Escáner QR
            </button>
            <button
              onClick={() => setVistaActiva('asistencia')}
              style={{
                flex: 1,
                padding: '10px',
                background: vistaActiva === 'asistencia' ? colores.accent : 'transparent',
                border: `1px solid ${vistaActiva === 'asistencia' ? colores.accent : colores.borde}`,
                borderRadius: '10px',
                color: vistaActiva === 'asistencia' ? 'white' : colores.texto,
                cursor: 'pointer',
                fontSize: '14px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '5px',
                transition: 'all 0.3s'
              }}
            >
              <span>📊</span> Asistencia del Curso
            </button>
            <button
              onClick={() => setVistaActiva('selector')}
              style={{
                flex: 1,
                padding: '10px',
                background: vistaActiva === 'selector' ? colores.accent : 'transparent',
                border: `1px solid ${vistaActiva === 'selector' ? colores.accent : colores.borde}`,
                borderRadius: '10px',
                color: vistaActiva === 'selector' ? 'white' : colores.texto,
                cursor: 'pointer',
                fontSize: '14px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '5px',
                transition: 'all 0.3s'
              }}
            >
              <span>✅</span> Modo Selector
            </button>
          </div>
        </div>

        {/* Vista de Escáner QR */}
        {vistaActiva === 'lector' && (
          <div style={{
            background: colores.tarjeta,
            borderRadius: '20px',
            padding: '20px',
            boxShadow: '0 4px 6px rgba(0, 0, 0, 0.05)',
            border: `1px solid ${colores.borde}`
          }}>
            
            <div style={{ textAlign: 'center', marginBottom: '20px' }}>
              {!isScanning ? (
                <button
                  onClick={startScanner}
                  style={{
                    padding: '12px 30px',
                    background: colores.accent,
                    border: 'none',
                    borderRadius: '8px',
                    color: 'white',
                    fontSize: '16px',
                    cursor: 'pointer'
                  }}
                >
                  🎥 Iniciar Cámara
                </button>
              ) : (
                <button
                  onClick={stopScanner}
                  style={{
                    padding: '12px 30px',
                    background: colores.danger,
                    border: 'none',
                    borderRadius: '8px',
                    color: 'white',
                    fontSize: '16px',
                    cursor: 'pointer'
                  }}
                >
                  ⏹️ Detener Cámara
                </button>
              )}
            </div>

            <div style={{
              width: '300px',
              height: '300px',
              margin: '0 auto',
              borderRadius: '12px',
              overflow: 'hidden',
              backgroundColor: colores.accentLight,
              border: `1px solid ${colores.borde}`
            }}>
              <div id={qrCodeRegionId} style={{ width: '100%', height: '100%' }}></div>
            </div>

            {mensaje && (
              <div style={{
                marginTop: '20px',
                padding: '10px',
                borderRadius: '5px',
                background: mensaje.includes('✅') || mensaje.includes('✨') ? colores.successLight : 
                            mensaje.includes('❌') ? colores.dangerLight : 
                            colores.accentLight,
                color: mensaje.includes('✅') || mensaje.includes('✨') ? colores.success : 
                       mensaje.includes('❌') ? colores.danger : 
                       colores.accent,
                textAlign: 'center'
              }}>
                {mensaje}
              </div>
            )}

            {estudianteInfo && (
              <div style={{
                marginTop: '20px',
                padding: '15px',
                background: colores.successLight,
                borderRadius: '8px',
                border: `1px solid ${colores.success}`
              }}>
                <p style={{ color: colores.success, margin: '0 0 10px 0', fontWeight: 'bold' }}>
                  ✅ Último estudiante escaneado:
                </p>
                <p style={{ color: colores.texto, margin: '5px 0' }}>
                  {estudianteInfo.nombres} {estudianteInfo.apellidoPaterno}
                </p>
                <p style={{ color: colores.textoSecundario, margin: '5px 0' }}>
                  {estudianteInfo.curso}
                </p>
              </div>
            )}
          </div>
        )}

        {/* Vista de Asistencia del Curso */}
{vistaActiva === 'asistencia' && (
  <div style={{
    background: colores.tarjeta,
    borderRadius: '20px',
    padding: '20px',
    boxShadow: '0 4px 6px rgba(0, 0, 0, 0.05)',
    border: `1px solid ${colores.borde}`
  }}>
    
    <div style={{
      background: colores.accentLight,
      borderRadius: '10px',
      padding: '15px',
      marginBottom: '20px',
      border: `1px solid ${colores.accent}`
    }}>
      <h3 style={{ color: colores.texto, margin: '0 0 10px 0' }}>
        📊 Resumen de {cursoSeleccionado}
      </h3>
      <div style={{
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: '10px'
      }}>
        <div>
          <span style={{ color: colores.textoSecundario }}>Total estudiantes:</span>
          <span style={{ color: colores.texto, marginLeft: '5px', fontWeight: 'bold' }}>
            {estudiantesCurso.length}
          </span>
        </div>
        <div>
          <span style={{ color: colores.textoSecundario }}>Días hábiles:</span>
          <span style={{ color: colores.texto, marginLeft: '5px', fontWeight: 'bold' }}>
            {diasHabiles}
          </span>
        </div>
        <div>
          <span style={{ color: colores.textoSecundario }}>Presentes hoy:</span>
          <span style={{ color: colores.success, marginLeft: '5px', fontWeight: 'bold' }}>
            {Object.keys(asistenciasHoy).length}
          </span>
        </div>
        <div>
          <span style={{ color: colores.textoSecundario }}>Ausentes hoy:</span>
          <span style={{ color: colores.danger, marginLeft: '5px', fontWeight: 'bold' }}>
            {estudiantesCurso.length - Object.keys(asistenciasHoy).length}
          </span>
        </div>
      </div>
      <div style={{
        marginTop: '15px',
        textAlign: 'center',
        padding: '10px',
        background: colores.tarjeta,
        borderRadius: '5px'
      }}>
        <span style={{ color: colores.textoSecundario }}>Asistencia del curso hoy:</span>
        <span style={{
          color: colores.accent,
          fontSize: '24px',
          fontWeight: 'bold',
          marginLeft: '10px'
        }}>
          {estudiantesCurso.length > 0 
            ? ((Object.keys(asistenciasHoy).length / estudiantesCurso.length) * 100).toFixed(1)
            : 0}%
        </span>
      </div>
    </div>

    <h4 style={{ color: colores.texto, margin: '0 0 10px 0' }}>
      📋 Lista de estudiantes
    </h4>
    
    {cargandoAsistencia ? (
      <div style={{ textAlign: 'center', padding: '20px' }}>
        <div style={{
          width: '30px',
          height: '30px',
          border: `2px solid ${colores.borde}`,
          borderTopColor: colores.accent,
          borderRadius: '50%',
          margin: '0 auto 10px',
          animation: 'spin 1s linear infinite'
        }}></div>
        <p style={{ color: colores.textoSecundario }}>Cargando estudiantes...</p>
      </div>
    ) : (
      <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
        {estudiantesCurso.length === 0 ? (
          <p style={{ color: colores.textoSecundario, textAlign: 'center', padding: '20px' }}>
            No hay estudiantes en este curso
          </p>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead style={{ background: colores.accentLight, position: 'sticky', top: 0 }}>
              <tr>
                <th style={{ padding: '12px', textAlign: 'left', color: colores.texto }}>Nombre</th>
                <th style={{ padding: '12px', textAlign: 'center', color: colores.texto }}>Acumulado</th>
                <th style={{ padding: '12px', textAlign: 'center', color: colores.texto }}>HOY</th>
              </tr>
            </thead>
            <tbody>
              {estudiantesCurso.map((est, index) => {
                const asistencia = asistenciasHoy[est.id];
                return (
                  <tr key={est.id} style={{
                    borderBottom: `1px solid ${colores.borde}`,
                    background: index % 2 === 0 ? 'transparent' : colores.accentLight
                  }}>
                    <td style={{ padding: '12px', color: colores.texto }}>
                      {est.apellidoPaterno}, {est.nombres}
                      <div style={{ color: colores.textoSecundario, fontSize: '12px' }}>
                        {est.rut}
                      </div>
                    </td>
                    <td style={{ padding: '12px', textAlign: 'center' }}>
                      <div style={{
                        background: parseFloat(est.porcentajeAcumulado) >= 85 
                          ? colores.successLight 
                          : colores.dangerLight,
                        color: parseFloat(est.porcentajeAcumulado) >= 85 ? colores.success : colores.danger,
                        padding: '6px 10px',
                        borderRadius: '12px',
                        fontSize: '12px',
                        fontWeight: 'bold',
                        display: 'inline-flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        minWidth: '90px'
                      }}>
                        <span>{est.porcentajeAcumulado}%</span>
                        <span style={{ fontSize: '10px', opacity: 0.8 }}>
                          ({est.asistenciasAcumuladas || 0}/{diasHabiles} días)
                        </span>
                        {diasHabiles > (est.asistenciasAcumuladas || 0) && (
                          <span style={{ 
                            fontSize: '9px', 
                            opacity: 0.7,
                            marginTop: '2px',
                            color: '#f87171'
                          }}>
                            Falto {diasHabiles - (est.asistenciasAcumuladas || 0)} días
                          </span>
                        )}
                      </div>
                    </td>
                    <td style={{ padding: '12px', textAlign: 'center' }}>
                      {asistencia ? (
                        <span style={{
                          background: colores.successLight,
                          color: colores.success,
                          padding: '4px 10px',
                          borderRadius: '12px',
                          fontSize: '12px',
                          fontWeight: 'bold',
                          display: 'inline-block'
                        }}>
                          ✅ {asistencia.hora}
                        </span>
                      ) : (
                        <span style={{
                          background: colores.dangerLight,
                          color: colores.danger,
                          padding: '4px 10px',
                          borderRadius: '12px',
                          fontSize: '12px',
                          fontWeight: 'bold',
                          display: 'inline-block'
                        }}>
                          ❌ Ausente
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    )}
  </div>
)}
        {/* Vista de Modo Selector */}
        {vistaActiva === 'selector' && (
          <div style={{
            background: colores.tarjeta,
            borderRadius: '20px',
            padding: '20px',
            boxShadow: '0 4px 6px rgba(0, 0, 0, 0.05)',
            border: `1px solid ${colores.borde}`
          }}>
            
            <div style={{
              background: colores.accentLight,
              borderRadius: '10px',
              padding: '15px',
              marginBottom: '20px',
              border: `1px solid ${colores.accent}`
            }}>
              <h3 style={{ color: colores.texto, margin: '0 0 10px 0' }}>
                ✅ Modo Selector - {cursoSeleccionado}
              </h3>
              <p style={{ color: colores.textoSecundario, fontSize: '13px', marginBottom: '10px' }}>
                Marca a los estudiantes que asistieron hoy. Los que no marques quedarán como ausentes.
              </p>
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginTop: '10px'
              }}>
                <div>
                  <span style={{ color: colores.success, fontWeight: 'bold' }}>
                    ✅ Presentes: {Object.values(seleccionados).filter(v => v).length}
                  </span>
                  <span style={{ color: colores.danger, marginLeft: '15px', fontWeight: 'bold' }}>
                    ❌ Ausentes: {Object.values(seleccionados).filter(v => !v).length}
                  </span>
                </div>
                <button
                  onClick={toggleSeleccionarTodos}
                  style={{
                    background: seleccionarTodos ? colores.accent : 'transparent',
                    border: `1px solid ${colores.accent}`,
                    borderRadius: '5px',
                    padding: '5px 12px',
                    color: seleccionarTodos ? 'white' : colores.accent,
                    cursor: 'pointer',
                    fontSize: '12px',
                    transition: 'all 0.3s'
                  }}
                >
                  {seleccionarTodos ? 'Deseleccionar todos' : 'Seleccionar todos'}
                </button>
              </div>
            </div>

            <h4 style={{ color: colores.texto, margin: '0 0 10px 0' }}>
              📋 Lista de estudiantes
            </h4>
            
            {cargandoAsistencia ? (
              <div style={{ textAlign: 'center', padding: '20px' }}>
                <div style={{
                  width: '30px',
                  height: '30px',
                  border: `2px solid ${colores.borde}`,
                  borderTopColor: colores.accent,
                  borderRadius: '50%',
                  margin: '0 auto 10px',
                  animation: 'spin 1s linear infinite'
                }}></div>
                <p style={{ color: colores.textoSecundario }}>Cargando estudiantes...</p>
              </div>
            ) : (
              <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
                {estudiantesCurso.length === 0 ? (
                  <p style={{ color: colores.textoSecundario, textAlign: 'center', padding: '20px' }}>
                    No hay estudiantes en este curso
                  </p>
                ) : (
                  estudiantesCurso.map((est, index) => {
                    const yaPresente = asistenciasHoy[est.id];
                    const estaSeleccionado = seleccionados[est.id];
                    const estaDeshabilitado = yaPresente && estaSeleccionado;
                    
                    return (
                      <div
                        key={est.id}
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          padding: '10px',
                          marginBottom: '5px',
                          background: yaPresente ? colores.successLight : (index % 2 === 0 ? colores.accentLight : 'transparent'),
                          borderRadius: '8px',
                          opacity: yaPresente ? 0.7 : 1,
                          cursor: yaPresente ? 'default' : 'pointer'
                        }}
                        onClick={() => {
                          if (!yaPresente) {
                            toggleSeleccion(est.id);
                          }
                        }}
                      >
                        <div style={{ flex: 1 }}>
                          <div style={{ color: colores.texto, fontWeight: 'bold' }}>
                            {est.apellidoPaterno}, {est.nombres}
                          </div>
                          <div style={{ color: colores.textoSecundario, fontSize: '12px' }}>
                            {est.rut}
                          </div>
                        </div>
                        
                        {yaPresente ? (
                          <div style={{
                            background: colores.success,
                            padding: '4px 12px',
                            borderRadius: '20px',
                            color: 'white',
                            fontSize: '12px',
                            fontWeight: 'bold'
                          }}>
                            ✅ YA REGISTRADO
                          </div>
                        ) : (
                          <div
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleSeleccion(est.id);
                            }}
                            style={{
                              width: '24px',
                              height: '24px',
                              borderRadius: '4px',
                              background: estaSeleccionado ? colores.success : 'transparent',
                              border: `2px solid ${estaSeleccionado ? colores.success : colores.borde}`,
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              transition: 'all 0.2s'
                            }}
                          >
                            {estaSeleccionado && <span style={{ color: 'white', fontSize: '14px' }}>✓</span>}
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            )}

            <button
              onClick={guardarAsistenciaSeleccionada}
              disabled={guardandoAsistencia || cargandoAsistencia}
              style={{
                width: '100%',
                marginTop: '20px',
                padding: '12px',
                background: (guardandoAsistencia || cargandoAsistencia) ? colores.textoSecundario : colores.success,
                border: 'none',
                borderRadius: '8px',
                color: 'white',
                fontSize: '16px',
                fontWeight: 'bold',
                cursor: (guardandoAsistencia || cargandoAsistencia) ? 'not-allowed' : 'pointer',
                transition: 'all 0.3s',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px'
              }}
            >
              {guardandoAsistencia ? (
                <>
                  <div style={{
                    width: '18px',
                    height: '18px',
                    border: `2px solid white`,
                    borderTopColor: 'transparent',
                    borderRadius: '50%',
                    animation: 'spin 0.8s linear infinite'
                  }}></div>
                  Guardando...
                </>
              ) : (
                '📝 Tomar Asistencia'
              )}
            </button>
          </div>
        )}

        {/* Animación de éxito */}
        {animacion && (
          <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            pointerEvents: 'none',
            zIndex: 9999
          }}>
            <div style={{
              background: colores.success,
              color: 'white',
              padding: '20px 40px',
              borderRadius: '60px',
              fontSize: '24px',
              fontWeight: 'bold',
              boxShadow: '0 20px 40px rgba(0, 0, 0, 0.1)',
              animation: 'popIn 0.3s ease-out, fadeOut 2s forwards',
              display: 'flex',
              alignItems: 'center',
              gap: '10px'
            }}>
              <span style={{ fontSize: '32px' }}>✅</span>
              <span>REGISTRADO</span>
            </div>
          </div>
        )}
      </div>

      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        @keyframes popIn {
          0% { transform: scale(0.3); opacity: 0; }
          100% { transform: scale(1); opacity: 1; }
        }
        @keyframes fadeOut {
          0% { opacity: 1; }
          70% { opacity: 1; }
          100% { opacity: 0; }
        }
      `}</style>
    </div>
  );
}

export default ProfesorLectorQR;