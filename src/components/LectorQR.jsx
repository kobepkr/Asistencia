import React, { useState, useEffect } from 'react';
import { Html5QrcodeScanner } from 'html5-qrcode';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '../firebase';
import { signOut } from 'firebase/auth';
import { useNavigate, Link } from 'react-router-dom';

function LectorQR() {
  const [scanResult, setScanResult] = useState(null);
  const [scanner, setScanner] = useState(null);
  const [isScanning, setIsScanning] = useState(false);
  const [lastScan, setLastScan] = useState(null);
  const [mensaje, setMensaje] = useState('');
  const [currentTime, setCurrentTime] = useState(new Date());
  const [animacion, setAnimacion] = useState(false);
  const [confeti, setConfeti] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const startScanner = () => {
    const html5QrcodeScanner = new Html5QrcodeScanner(
      "reader", 
      { 
        fps: 5,
        qrbox: { width: 250, height: 250 },
        rememberLastUsedCamera: true,
        showTorchButtonIfSupported: true,
        videoConstraints: { facingMode: "environment" }
      },
      false
    );
    
    html5QrcodeScanner.render(onScanSuccess, onScanError);
    setScanner(html5QrcodeScanner);
    setIsScanning(true);
    setMensaje('🎯 Cámara activada');
  };

  const stopScanner = () => {
    if (scanner) {
      scanner.clear();
      setIsScanning(false);
      setMensaje('⏸️ Cámara detenida');
    }
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
    setTimeout(() => setAnimacion(false), 3000);
    setConfeti(true);
    setTimeout(() => setConfeti(false), 3000);
    if (navigator.vibrate) navigator.vibrate([200, 100, 200]);
  };

  const onScanSuccess = async (decodedText) => {
    if (lastScan && lastScan.text === decodedText && (Date.now() - lastScan.time) < 5000) return;
    
    setLastScan({ text: decodedText, time: Date.now() });
    setScanResult(decodedText);
    mostrarAnimacion();
    
    try {
      const docRef = await addDoc(collection(db, "asistencias"), {
        qrCode: decodedText,
        fecha: new Date().toISOString().split('T')[0],
        hora: new Date().toLocaleTimeString(),
        timestamp: serverTimestamp(),
        presente: true
      });
      
      setMensaje(`✨ ¡Asistencia registrada!`);
      console.log("Documento guardado con ID:", docRef.id);
      
    } catch (error) {
      console.error("Error guardando en Firebase:", error);
      setMensaje(`❌ Error: ${error.message}`);
    }
  };

  const onScanError = (error) => {
    if (error.toString().includes("NotFoundException")) {
      setMensaje('📸 Buscando QR...');
    }
  };

  return (
    <>
      <div style={{
        minHeight: '100vh',
        width: '100%',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        padding: '16px',
        position: 'relative',
        overflow: 'hidden'
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

        {/* Contenedor principal */}
        <div style={{
          position: 'relative',
          zIndex: 10,
          width: '100%',
          maxWidth: '400px',
          margin: '0 auto'
        }}>
          
          {/* Header */}
          <div style={{
            background: 'rgba(255,255,255,0.1)',
            backdropFilter: 'blur(10px)',
            borderRadius: '24px',
            padding: '20px',
            marginBottom: '16px',
            border: '1px solid rgba(255,255,255,0.2)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{
                  width: '48px',
                  height: '48px',
                  background: 'linear-gradient(135deg, #fbbf24, #f59e0b)',
                  borderRadius: '16px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '24px'
                }}>
                  📱
                </div>
                <div>
                  <h1 style={{ color: 'white', fontSize: '20px', fontWeight: 'bold', margin: 0 }}>QR Assist</h1>
                  <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '12px', margin: 0 }}>Control de asistencia</p>
                </div>
              </div>
              
              <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ color: 'white', fontWeight: 'bold', fontSize: '16px' }}>{currentTime.toLocaleTimeString()}</div>
                  <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: '10px' }}>{currentTime.toLocaleDateString()}</div>
                </div>
                <button
                  onClick={handleLogout}
                  style={{
                    background: 'rgba(255,255,255,0.1)',
                    border: '1px solid rgba(255,255,255,0.2)',
                    borderRadius: '50px',
                    padding: '8px 16px',
                    color: 'white',
                    fontSize: '12px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    transition: 'all 0.3s'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.2)'}
                  onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'}
                >
                  <span>🚪</span> Salir
                </button>
              </div>
            </div>
          </div>

          {/* Botón Panel */}
          <Link to="/panel" style={{ textDecoration: 'none' }}>
            <button style={{
              width: '100%',
              background: 'linear-gradient(135deg, #10b981, #059669)',
              border: 'none',
              borderRadius: '16px',
              padding: '16px',
              marginBottom: '16px',
              color: 'white',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              cursor: 'pointer',
              boxShadow: '0 10px 25px -5px rgba(0,0,0,0.3)',
              transition: 'all 0.3s'
            }}
            onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-2px)'}
            onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{
                  width: '40px',
                  height: '40px',
                  background: 'rgba(255,255,255,0.2)',
                  borderRadius: '12px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '20px'
                }}>
                  📊
                </div>
                <div style={{ textAlign: 'left' }}>
                  <div style={{ fontWeight: 'bold', fontSize: '16px' }}>Panel de Control</div>
                  <div style={{ fontSize: '10px', opacity: 0.8 }}>Ver estadísticas y estudiantes</div>
                </div>
              </div>
              <span style={{ fontSize: '24px' }}>→</span>
            </button>
          </Link>

          {/* Escáner */}
          <div style={{
            background: 'rgba(255, 255, 255, 0.1)',
            backdropFilter: 'blur(10px)',
            borderRadius: '24px',
            padding: '20px',
            marginBottom: '16px',
            border: '1px solid rgba(255, 255, 255, 0.2)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
              <div style={{
                width: '40px',
                height: '40px',
                background: 'linear-gradient(135deg, #3b82f6, #06b6d4)',
                borderRadius: '12px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '20px'
              }}>
                📸
              </div>
              <div>
                <h3 style={{ color: 'white', fontSize: '16px', fontWeight: 'bold', margin: 0 }}>Escáner QR</h3>
                <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '10px', margin: 0 }}>Coloca el código frente a la cámara</p>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
              {!isScanning ? (
                <button
                  onClick={startScanner}
                  style={{
                    flex: 1,
                    background: 'linear-gradient(135deg, #3b82f6, #2563eb)',
                    border: 'none',
                    borderRadius: '12px',
                    padding: '12px',
                    color: 'white',
                    fontWeight: 'bold',
                    fontSize: '14px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '4px',
                    transition: 'all 0.3s'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.background = 'linear-gradient(135deg, #2563eb, #1d4ed8)'}
                  onMouseLeave={(e) => e.currentTarget.style.background = 'linear-gradient(135deg, #3b82f6, #2563eb)'}
                >
                  <span>🎥</span> Iniciar
                </button>
              ) : (
                <button
                  onClick={stopScanner}
                  style={{
                    flex: 1,
                    background: 'linear-gradient(135deg, #ef4444, #dc2626)',
                    border: 'none',
                    borderRadius: '12px',
                    padding: '12px',
                    color: 'white',
                    fontWeight: 'bold',
                    fontSize: '14px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '4px',
                    position: 'relative',
                    transition: 'all 0.3s'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.background = 'linear-gradient(135deg, #dc2626, #b91c1c)'}
                  onMouseLeave={(e) => e.currentTarget.style.background = 'linear-gradient(135deg, #ef4444, #dc2626)'}
                >
                  <span>⏹️</span> Detener
                  {isScanning && (
                    <div style={{
                      position: 'absolute',
                      top: -5,
                      right: -5,
                      width: 15,
                      height: 15,
                      background: '#4ade80',
                      borderRadius: '50%',
                      animation: 'pulse 1s infinite',
                      boxShadow: '0 0 10px #4ade80'
                    }} />
                  )}
                </button>
              )}
            </div>

            <div style={{ display: 'flex', justifyContent: 'center' }}>
              <div id="reader" style={{ width: '280px', height: '280px' }}></div>
            </div>

            {mensaje && (
              <div style={{
                marginTop: '16px',
                padding: '12px',
                borderRadius: '12px',
                background: mensaje.includes('✨') ? 'rgba(16,185,129,0.2)' : 
                            mensaje.includes('❌') ? 'rgba(239,68,68,0.2)' : 
                            'rgba(59,130,246,0.2)',
                border: `1px solid ${mensaje.includes('✨') ? 'rgba(16,185,129,0.3)' : 
                                      mensaje.includes('❌') ? 'rgba(239,68,68,0.3)' : 
                                      'rgba(59,130,246,0.3)'}`,
                color: mensaje.includes('✨') ? '#a7f3d0' : 
                       mensaje.includes('❌') ? '#fecaca' : 
                       '#bfdbfe'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span>{mensaje.includes('✨') ? '✅' : mensaje.includes('🎯') ? '📸' : 'ℹ️'}</span>
                  <span style={{ fontSize: '14px' }}>{mensaje}</span>
                </div>
              </div>
            )}
          </div>

          {/* Último escaneo */}
          {scanResult && (
            <div style={{
              background: 'linear-gradient(135deg, rgba(139,92,246,0.3), rgba(236,72,153,0.3))',
              backdropFilter: 'blur(10px)',
              borderRadius: '24px',
              padding: '20px',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              animation: 'slideUp 0.5s ease-out'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                <div style={{
                  width: '40px',
                  height: '40px',
                  background: 'rgba(255,255,255,0.2)',
                  borderRadius: '12px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '20px'
                }}>
                  🎯
                </div>
                <h3 style={{ color: 'white', fontSize: '16px', fontWeight: 'bold', margin: 0 }}>Último escaneo</h3>
              </div>
              <div style={{
                background: 'rgba(255,255,255,0.1)',
                borderRadius: '12px',
                padding: '12px'
              }}>
                <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: '10px', marginBottom: '4px' }}>ID Estudiante</div>
                <div style={{ color: 'white', fontFamily: 'monospace', fontSize: '14px', fontWeight: 'bold', marginBottom: '8px', wordBreak: 'break-all' }}>
                  {scanResult}
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                  <div>
                    <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: '10px' }}>Hora</div>
                    <div style={{ color: 'white', fontSize: '12px', fontWeight: 'bold' }}>{new Date().toLocaleTimeString()}</div>
                  </div>
                  <div>
                    <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: '10px' }}>Estado</div>
                    <div style={{ color: '#4ade80', fontSize: '12px', fontWeight: 'bold' }}>✅ Presente</div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Footer */}
          <div style={{ marginTop: '16px', textAlign: 'center' }}>
            <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: '10px' }}>Sistema de Asistencia QR v2.0</p>
          </div>
        </div>

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
              background: 'linear-gradient(135deg, #10b981, #059669)',
              color: 'white',
              padding: '40px 70px',
              borderRadius: '80px',
              fontSize: '56px',
              fontWeight: 'bold',
              boxShadow: '0 20px 40px rgba(0,0,0,0.3)',
              animation: 'popIn 0.5s ease-out, glow 2s ease-in-out infinite',
              display: 'flex',
              alignItems: 'center',
              gap: '30px',
              border: '4px solid rgba(255,255,255,0.5)'
            }}>
              <span style={{ fontSize: '80px', animation: 'spin 2s linear infinite' }}>✅</span>
              <span>ESCANEADO!</span>
            </div>
          </div>
        )}

        {/* Confeti */}
        {confeti && (
          <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            pointerEvents: 'none',
            zIndex: 9998,
            overflow: 'hidden'
          }}>
            {[...Array(50)].map((_, i) => (
              <div key={i} style={{
                position: 'absolute',
                left: `${Math.random() * 100}%`,
                width: `${Math.random() * 10 + 5}px`,
                height: `${Math.random() * 15 + 10}px`,
                background: `hsl(${Math.random() * 360}, 80%, 60%)`,
                borderRadius: '2px',
                animation: `confetti ${Math.random() * 2 + 1}s ease-out forwards`,
                transform: `rotate(${Math.random() * 360}deg)`,
                top: '-10%'
              }} />
            ))}
          </div>
        )}

        <style>{`
          @keyframes float {
            0%, 100% { transform: translate(0, 0); }
            50% { transform: translate(30px, 30px); }
          }
          @keyframes popIn {
            0% { transform: scale(0.3); opacity: 0; }
            80% { transform: scale(1.1); }
            100% { transform: scale(1); opacity: 1; }
          }
          @keyframes glow {
            0%, 100% { box-shadow: 0 20px 40px rgba(0,0,0,0.3), 0 0 30px #10b981; }
            50% { box-shadow: 0 20px 60px rgba(0,0,0,0.4), 0 0 60px #4ade80; }
          }
          @keyframes spin {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
          }
          @keyframes confetti {
            0% { transform: translateY(0) rotate(0deg); opacity: 1; }
            100% { transform: translateY(100vh) rotate(720deg); opacity: 0; }
          }
          @keyframes pulse {
            0%, 100% { transform: scale(1); opacity: 1; }
            50% { transform: scale(1.2); opacity: 0.8; }
          }
          @keyframes slideUp {
            from { opacity: 0; transform: translateY(20px); }
            to { opacity: 1; transform: translateY(0); }
          }
        `}</style>
      </div>
    </>
  );
}

export default LectorQR;