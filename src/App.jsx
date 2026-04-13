import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { onAuthStateChanged } from 'firebase/auth';
import { collection, getDocs, doc, getDoc } from 'firebase/firestore';
import { auth, db } from './firebase';
import Login from './components/Login';
import SuperAdminDashboard from './pages/superAdmin/SuperAdminDashboard';
import AdminDashboard from './pages/admin/AdminDashboard';
import ProfesorLectorQR from './pages/profesor/ProfesorLectorQR';

function App() {
  const [user, setUser] = useState(null);
  const [cargando, setCargando] = useState(true);
 
  useEffect(() => {
    console.log("📌 useEffect de onAuthStateChanged ejecutándose");
    
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      console.log("📌 onAuthStateChanged disparado");
      console.log("firebaseUser:", firebaseUser);
      
      if (firebaseUser) {
        console.log("✅ Usuario autenticado en Auth:", firebaseUser.email);
        console.log("📌 UID:", firebaseUser.uid);
        
        try {
          // Verificar si es SUPER ADMIN (por email)
          if (firebaseUser.email === 'superadmin@asistencia.cl') {
            console.log("👑 Super Admin detectado por email");
            setUser({
              uid: firebaseUser.uid,
              email: firebaseUser.email,
              rol: 'superadmin'
            });
            console.log("✅ Super Admin configurado en estado");
            setCargando(false);
            return;
          }

          // Buscar en qué escuela está este usuario
          console.log("🔍 Buscando usuario en Firestore...");
          const escuelasRef = collection(db, "escuelas");
          const escuelasSnap = await getDocs(escuelasRef);
          console.log(`📚 Escuelas encontradas: ${escuelasSnap.size}`);
          
          if (escuelasSnap.empty) {
            console.log("⚠️ No hay escuelas en Firestore");
          }
          
          for (const escuelaDoc of escuelasSnap.docs) {
            const escuelaData = escuelaDoc.data();
            console.log(`- Escuela: ${escuelaData.nombre} (ID: ${escuelaDoc.id})`);
            
            // Buscar en la subcolección de usuarios
            const usuarioRef = doc(db, "escuelas", escuelaDoc.id, "usuarios", firebaseUser.uid);
            console.log(`🔎 Consultando: /escuelas/${escuelaDoc.id}/usuarios/${firebaseUser.uid}`);
            
            const usuarioSnap = await getDoc(usuarioRef);
            
            if (usuarioSnap.exists()) {
              const usuarioData = usuarioSnap.data();
              console.log(`✅ Usuario ENCONTRADO en escuela ${escuelaData.nombre}:`);
              console.log("   Datos completos:", usuarioData);
              
              // Verificar que tiene rol
              if (!usuarioData.rol) {
                console.error("❌ El usuario no tiene campo 'rol' definido");
              }
              
              setUser({
                uid: firebaseUser.uid,
                email: firebaseUser.email,
                escuelaId: escuelaDoc.id,
                escuelaNombre: escuelaData.nombre,
                ...usuarioData
              });
              console.log("✅ Usuario configurado en estado con rol:", usuarioData.rol);
              setCargando(false);
              return;
            } else {
              console.log(`❌ Usuario NO encontrado en escuela ${escuelaData.nombre}`);
            }
          }
          
          // Si llegamos aquí, no se encontró en ninguna escuela
          console.error("❌ Usuario NO encontrado en NINGUNA escuela");
          console.log("   El usuario existe en Auth pero no tiene documento en Firestore");
          console.log("   Debes crearlo manualmente en Firestore con el UID:", firebaseUser.uid);
          setUser(null);
          
        } catch (error) {
          console.error("🔥 Error GRAVE en onAuthStateChanged:", error);
          console.error("Stack:", error.stack);
          setUser(null);
        }
      } else {
        console.log("👤 Usuario NO autenticado (cerró sesión o no hay usuario)");
        setUser(null);
      }
      
      setCargando(false);
    });

    return () => unsubscribe();
  }, []);

  // Mostrar pantalla de carga mientras verificamos
if (cargando) {
  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #f0f7ff 0%, #e1eaf5 100%)',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center'
    }}>
      <div style={{
        background: 'white',
        borderRadius: '24px',
        padding: '40px',
        textAlign: 'center',
        boxShadow: '0 20px 40px rgba(0, 0, 0, 0.1)',
        border: '1px solid #d3e2f2',
        maxWidth: '300px'
      }}>
        {/* Logo animado */}
        <div style={{
          width: '80px',
          height: '80px',
          margin: '0 auto 20px',
          borderRadius: '20px',
          overflow: 'hidden',
          boxShadow: '0 5px 15px rgba(79, 126, 179, 0.2)',
          animation: 'pulse 1.5s ease-in-out infinite'
        }}>
          <img 
            src="/logo.png" 
            alt="Logo" 
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover'
            }}
          />
        </div>
        
        {/* Texto de carga */}
        <h3 style={{
          color: '#2c3e50',
          fontSize: '20px',
          fontWeight: 'bold',
          margin: '0 0 8px 0'
        }}>
          Educ Assist
        </h3>
        
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '4px',
          marginTop: '15px'
        }}>
          <span style={{
            width: '8px',
            height: '8px',
            background: '#4f7eb3',
            borderRadius: '50%',
            animation: 'dotPulse 1.4s infinite ease-in-out',
            animationDelay: '0ms'
          }}></span>
          <span style={{
            width: '8px',
            height: '8px',
            background: '#4f7eb3',
            borderRadius: '50%',
            animation: 'dotPulse 1.4s infinite ease-in-out',
            animationDelay: '200ms'
          }}></span>
          <span style={{
            width: '8px',
            height: '8px',
            background: '#4f7eb3',
            borderRadius: '50%',
            animation: 'dotPulse 1.4s infinite ease-in-out',
            animationDelay: '400ms'
          }}></span>
          <span style={{ color: '#5e6f8d', fontSize: '14px', marginLeft: '8px' }}>Cargando...</span>
        </div>
      </div>

      <style>{`
        @keyframes pulse {
          0%, 100% {
            transform: scale(1);
            opacity: 1;
          }
          50% {
            transform: scale(1.05);
            opacity: 0.9;
          }
        }
        
        @keyframes dotPulse {
          0%, 60%, 100% {
            transform: scale(0.8);
            opacity: 0.4;
          }
          30% {
            transform: scale(1.2);
            opacity: 1;
          }
        }
      `}</style>
    </div>
  );
}

  // Si no hay usuario, mostrar login
  if (!user) {
    console.log("🔐 No hay usuario, mostrando Login");
    return <Login />;
  }

  // Usuario autenticado - determinar rol
  console.log("🎯 Usuario final en App.jsx:", user);
  console.log("🎯 Rol detectado:", user.rol);

  // SUPER ADMIN
  if (user.rol === 'superadmin') {
    console.log("👑 Redirigiendo a SuperAdminDashboard");
    return (
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<SuperAdminDashboard />} />
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </BrowserRouter>
    );
  }

  // ADMIN DE ESCUELA
  if (user.rol === 'admin') {
    console.log("👨‍💼 Redirigiendo a AdminDashboard");
    return (
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<AdminDashboard user={user} />} />
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </BrowserRouter>
    );
  }

  // PROFESOR
  if (user.rol === 'profesor') {
    console.log("👨‍🏫 Redirigiendo a ProfesorLectorQR");
    return (
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<ProfesorLectorQR user={user} />} />
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </BrowserRouter>
    );
  }

  // Si llegamos aquí, el rol no es válido
  console.error("❌ Rol no reconocido:", user.rol);
  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      color: 'white',
      fontSize: '20px'
    }}>
      Error: Rol no reconocido ({user.rol})
    </div>
  );
}

export default App;