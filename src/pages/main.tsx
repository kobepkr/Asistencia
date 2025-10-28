import React, { useState } from "react";
import { useNavigate } from "react-router-dom"; // Importar useNavigate
import "./main.css";

// Importar imágenes desde assets
import logoGaspar from "../assets/logogaspar.jpg";
import agregarImg from "../assets/botonAgregar.png";

interface Escuela {
  id: number;
  nombre: string;
  foto: string;
}

const Main: React.FC = () => {
  const navigate = useNavigate(); // Inicializar navigate

  const [escuelas, setEscuelas] = useState<Escuela[]>([
    { id: 1, nombre: "Escuela Gaspar Cabrales", foto: logoGaspar },
  ]);

  // Función para redirigir a la página de registro
  const irRegistro = () => {
    navigate("/registro-instituciones");
  };

  return (
    <div className="main-container">
      <h1>Sistema de Asistencia de Educación Pública</h1>

      <div className="escuelas">
        {escuelas.map((escuela) => (
          <div key={escuela.id} className="escuela-card">
            <img src={escuela.foto} alt={escuela.nombre} />
            <h3>{escuela.nombre}</h3>
          </div>
        ))}
      </div>

      <div className="agregar-card" onClick={irRegistro}>
        <img src={agregarImg} alt="Agregar nueva institución" />
        <h3>Agregar Nueva Institución</h3>
      </div>
    </div>
  );
};

export default Main;
