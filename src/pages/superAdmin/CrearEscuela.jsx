import React, { useState } from 'react';
import { collection, addDoc } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
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

function CrearEscuela({ onEscuelaCreada }) {
  const [formData, setFormData] = useState({
    nombre: '',
    direccion: '',
    telefono: '',
    email: ''
  });
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setCargando(true);
    setError('');

    try {
      const auth = getAuth();
      const escuelaData = {
        ...formData,
        activa: true,
        fechaRegistro: new Date().toISOString().split('T')[0],
        creadoPor: auth.currentUser.uid
      };

      const docRef = await addDoc(collection(db, "escuelas"), escuelaData);
      
      alert(`✅ Escuela creada con ID: ${docRef.id}`);
      onEscuelaCreada && onEscuelaCreada();
      
      // Limpiar formulario
      setFormData({
        nombre: '',
        direccion: '',
        telefono: '',
        email: ''
      });
      
    } catch (error) {
      console.error("Error creando escuela:", error);
      setError("Error al crear la escuela: " + error.message);
    } finally {
      setCargando(false);
    }
  };

  return (
    <div style={{
      background: colores.tarjeta,
      borderRadius: '16px',
      padding: '30px',
      boxShadow: '0 4px 6px rgba(0, 0, 0, 0.05)',
      border: `1px solid ${colores.borde}`,
      maxWidth: '500px',
      margin: '0 auto'
    }}>
      <h2 style={{ color: colores.texto, marginBottom: '25px', fontSize: '24px' }}>
        🏫 Crear Nueva Escuela
      </h2>
      
      {error && (
        <div style={{
          background: colores.dangerLight,
          border: `1px solid ${colores.danger}`,
          borderRadius: '8px',
          padding: '12px',
          marginBottom: '20px',
          color: colores.danger
        }}>
          {error}
        </div>
      )}
      
      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom: '15px' }}>
          <label style={{ color: colores.textoSecundario, display: 'block', marginBottom: '5px' }}>
            Nombre de la Escuela *
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
              fontSize: '14px',
              transition: 'border-color 0.3s'
            }}
            onFocus={(e) => e.target.style.borderColor = colores.accent}
            onBlur={(e) => e.target.style.borderColor = colores.borde}
          />
        </div>
        
        <div style={{ marginBottom: '15px' }}>
          <label style={{ color: colores.textoSecundario, display: 'block', marginBottom: '5px' }}>
            Dirección
          </label>
          <input
            type="text"
            value={formData.direccion}
            onChange={(e) => setFormData({...formData, direccion: e.target.value})}
            style={{
              width: '100%',
              padding: '10px',
              background: colores.tarjeta,
              border: `1px solid ${colores.borde}`,
              borderRadius: '8px',
              color: colores.texto,
              fontSize: '14px',
              transition: 'border-color 0.3s'
            }}
            onFocus={(e) => e.target.style.borderColor = colores.accent}
            onBlur={(e) => e.target.style.borderColor = colores.borde}
          />
        </div>
        
        <div style={{ marginBottom: '15px' }}>
          <label style={{ color: colores.textoSecundario, display: 'block', marginBottom: '5px' }}>
            Teléfono
          </label>
          <input
            type="tel"
            value={formData.telefono}
            onChange={(e) => setFormData({...formData, telefono: e.target.value})}
            style={{
              width: '100%',
              padding: '10px',
              background: colores.tarjeta,
              border: `1px solid ${colores.borde}`,
              borderRadius: '8px',
              color: colores.texto,
              fontSize: '14px',
              transition: 'border-color 0.3s'
            }}
            onFocus={(e) => e.target.style.borderColor = colores.accent}
            onBlur={(e) => e.target.style.borderColor = colores.borde}
          />
        </div>
        
        <div style={{ marginBottom: '15px' }}>
          <label style={{ color: colores.textoSecundario, display: 'block', marginBottom: '5px' }}>
            Email de contacto
          </label>
          <input
            type="email"
            value={formData.email}
            onChange={(e) => setFormData({...formData, email: e.target.value})}
            style={{
              width: '100%',
              padding: '10px',
              background: colores.tarjeta,
              border: `1px solid ${colores.borde}`,
              borderRadius: '8px',
              color: colores.texto,
              fontSize: '14px',
              transition: 'border-color 0.3s'
            }}
            onFocus={(e) => e.target.style.borderColor = colores.accent}
            onBlur={(e) => e.target.style.borderColor = colores.borde}
          />
        </div>
        
        <button
          type="submit"
          disabled={cargando}
          style={{
            width: '100%',
            padding: '12px',
            background: cargando ? colores.textoSecundario : colores.success,
            border: 'none',
            borderRadius: '8px',
            color: 'white',
            fontSize: '16px',
            fontWeight: 'bold',
            cursor: cargando ? 'not-allowed' : 'pointer',
            marginTop: '10px',
            transition: 'all 0.3s',
            opacity: cargando ? 0.7 : 1
          }}
        >
          {cargando ? 'Creando...' : 'Crear Escuela'}
        </button>
      </form>
    </div>
  );
}

export default CrearEscuela;