import React, { useState, useEffect, useRef } from 'react';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';
import { collection, addDoc, serverTimestamp, getDocs, query, where, doc, getDoc } from 'firebase/firestore';
import { db } from '../../firebase';

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

function AdminLectorQR({ user }) {
  const [scanResult, setScanResult] = useState(null);
  const [isScanning, setIsScanning] = useState(false);
  const [mensaje, setMensaje] = useState('');
  const [animacion, setAnimacion] = useState(false);
  const [confeti, setConfeti] = useState(false);
  const [estudianteInfo, setEstudianteInfo] = useState(null);
  
  const qrCodeRegionId = "reader";
  const html5QrcodeRef = useRef(null);

  // Inicializar escáner
  useEffect(() => {
    html5QrcodeRef.current = new Html5Qrcode(qrCodeRegionId, {
      verbose: false,
      formatsToSupport: [Html5QrcodeSupportedFormats.QR_CODE],
      useBarCodeDetectorIfSupported: true
    });
    
    return () => {
      if (html5QrcodeRef.current && html5QrcodeRef.current.isScanning) {
        html5QrcodeRef.current.stop().catch(console.error);
      }
    };
  }, []);

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
        facingMode: "environment",
        width: { min: 640, ideal: 1280, max: 1920 },
        height: { min: 480, ideal: 720, max: 1080 }
      }
    };

    try {
      await html5QrcodeRef.current.start(
        { facingMode: "environment" },
        config,
        onScanSuccess,
        onScanError
      );
      setMensaje('🎯 Cámara activada');
    } catch (error) {
      console.log("Cámara trasera no disponible, intentando con frontal...");
      try {
        await html5QrcodeRef.current.start(
          { facingMode: "user" },
          { ...config, videoConstraints: { facingMode: "user" } },
          onScanSuccess,
          onScanError
        );
        setMensaje('🎯 Cámara frontal activada');
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
        setMensaje(`⚠️ ${estudiante.nombres} ya registró asistencia hoy`);
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

  return (
    <div style={{
      background: 'transparent',
      padding: '20px',
      maxWidth: '500px',
      margin: '0 auto'
    }}>
      
      {/* Título */}
      <h2 style={{ 
        color: colores.texto, 
        marginTop: 0, 
        marginBottom: '20px',
        fontSize: '1.5rem',
        fontWeight: 'bold'
      }}>
        📷 Tomar Asistencia
      </h2>
      
      {/* Controles centrados */}
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center',
        marginBottom: '20px'
      }}>
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
              cursor: 'pointer',
              fontWeight: 'bold',
              transition: 'all 0.3s',
              boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)'
            }}
            onMouseEnter={(e) => e.currentTarget.style.opacity = '0.9'}
            onMouseLeave={(e) => e.currentTarget.style.opacity = '1'}
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
              cursor: 'pointer',
              fontWeight: 'bold',
              transition: 'all 0.3s',
              boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)'
            }}
            onMouseEnter={(e) => e.currentTarget.style.opacity = '0.9'}
            onMouseLeave={(e) => e.currentTarget.style.opacity = '1'}
          >
            ⏹️ Detener Cámara
          </button>
        )}
      </div>

      {/* Contenedor del escáner - TAMAÑO FIJO Y CENTRADO */}
      <div style={{
        width: '300px',
        height: '300px',
        margin: '0 auto',
        borderRadius: '12px',
        overflow: 'hidden',
        backgroundColor: colores.accentLight,
        border: `1px solid ${colores.borde}`,
        boxShadow: '0 4px 6px rgba(0, 0, 0, 0.05)',
        position: 'relative'
      }}>
        <div id={qrCodeRegionId} style={{ 
          width: '100%', 
          height: '100%'
        }}></div>
        
        {/* Overlay decorativo para guiar el escaneo */}
        {isScanning && (
          <>
            <div style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              width: '250px',
              height: '250px',
              border: `2px solid ${colores.accent}`,
              borderRadius: '8px',
              pointerEvents: 'none',
              boxShadow: '0 0 20px rgba(79, 126, 179, 0.3)'
            }}></div>
            <div style={{
              position: 'absolute',
              top: '50%',
              left: '20px',
              right: '20px',
              height: '2px',
              background: colores.accent,
              opacity: 0.5,
              transform: 'translateY(-50%)',
              animation: 'scanLine 2s linear infinite'
            }}></div>
          </>
        )}
      </div>

      {/* Mensajes de estado */}
      {mensaje && (
        <div style={{
          marginTop: '20px',
          padding: '12px',
          borderRadius: '8px',
          background: mensaje.includes('✅') || mensaje.includes('✨') ? colores.successLight : 
                      mensaje.includes('❌') ? colores.dangerLight : 
                      colores.accentLight,
          color: mensaje.includes('✅') || mensaje.includes('✨') ? colores.success : 
                 mensaje.includes('❌') ? colores.danger : 
                 colores.accent,
          textAlign: 'center',
          fontWeight: 'bold'
        }}>
          {mensaje}
        </div>
      )}

      {/* Información del último escaneo */}
      {estudianteInfo && (
        <div style={{
          marginTop: '20px',
          padding: '15px',
          background: colores.accentLight,
          borderRadius: '8px',
          border: `1px solid ${colores.accent}`
        }}>
          <p style={{ color: colores.accent, margin: '0 0 10px 0', fontWeight: 'bold' }}>
            ✅ Último estudiante escaneado:
          </p>
          <p style={{ color: colores.texto, margin: '5px 0' }}>
            {estudianteInfo.nombres} {estudianteInfo.apellidoPaterno}
          </p>
          <p style={{ color: colores.textoSecundario, margin: '5px 0' }}>
            {estudianteInfo.curso}
          </p>
          <p style={{ color: colores.textoSecundario, margin: '5px 0', fontSize: '12px' }}>
            {estudianteInfo.rut}
          </p>
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

      <style>{`
        @keyframes scanLine {
          0% { transform: translateY(-50%) scaleX(0); opacity: 0; }
          50% { transform: translateY(-50%) scaleX(1); opacity: 0.8; }
          100% { transform: translateY(-50%) scaleX(0); opacity: 0; }
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
        #${qrCodeRegionId} video {
          width: 100% !important;
          height: 100% !important;
          object-fit: cover !important;
        }
      `}</style>
    </div>
  );
}

export default AdminLectorQR;