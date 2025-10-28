import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import "./main.css";

import logoGaspar from "../assets/logogaspar.jpg";
import agregarImg from "../assets/botonAgregar.png";

interface Escuela {
  id: number;
  nombre: string;
  foto: string;
  direccion?: string;
  telefono?: string;
  nombreDirector?: string;
  correoDirector?: string;
}

const Main: React.FC = () => {
  const navigate = useNavigate();

  const [escuelas, setEscuelas] = useState<Escuela[]>([
    {
      id: 1,
      nombre: "Escuela Gaspar Cabrales",
      foto: logoGaspar,
      direccion: "Almte. Simpson 103, Valparaíso",
      telefono: "322111222",
      nombreDirector: "Pia Moraga",
      correoDirector: "piamoraga@escuelagasparcabrales.cl"
    },
  ]);

  const [seleccionada, setSeleccionada] = useState<Escuela | null>(null);

  const irRegistro = () => {
    navigate("/registro-instituciones");
  };

  const eliminarEscuela = (id: number) => {
    if (window.confirm("¿Seguro que deseas eliminar esta institución?")) {
      setEscuelas(escuelas.filter((e) => e.id !== id));
      if (seleccionada?.id === id) setSeleccionada(null);
    }
  };

  const actualizarEscuela = (escuela: Escuela) => {
    // Redirige al formulario de registro con la escuela seleccionada para editar
    navigate("/registro-instituciones", { state: { escuela } });
  };

  // 🧠 Efecto para manejar el botón "Atrás" del navegador
  useEffect(() => {
    const handlePopState = () => {
      setSeleccionada(null);
    };

    if (seleccionada) {
      window.history.pushState({ detalle: true }, "");
      window.addEventListener("popstate", handlePopState);
    }

    return () => {
      window.removeEventListener("popstate", handlePopState);
    };
  }, [seleccionada]);

  return (
    <div className="main-container">
      <h1>Sistema de Asistencia de Educación Pública</h1>

      {seleccionada ? (
        <div className="detalle-container">
          <button className="btn-volver" onClick={() => setSeleccionada(null)}>
            ← Volver
          </button>

          <div className="detalle-card">
            <img
              src={seleccionada.foto}
              alt={seleccionada.nombre}
              className="detalle-logo"
            />
            <h2>{seleccionada.nombre}</h2>
            <p><strong>Dirección:</strong> {seleccionada.direccion}</p>
            <p><strong>Teléfono:</strong> {seleccionada.telefono}</p>
            <p><strong>Nombre Director:</strong> {seleccionada.nombreDirector}</p>
            <p><strong>Correo Director:</strong> {seleccionada.correoDirector}</p>

            <div className="acciones-detalle">
              <button
                className="btn-actualizar"
                onClick={() => actualizarEscuela(seleccionada)}
              >
                ✏️ Actualizar Datos
              </button>

              <button
                className="btn-eliminar"
                onClick={() => eliminarEscuela(seleccionada.id)}
              >
                🗑 Eliminar Institución
              </button>
            </div>
          </div>
        </div>
      ) : (
        <>
          <div className="escuelas">
            {escuelas.map((escuela) => (
              <div
                key={escuela.id}
                className="escuela-card"
                onClick={() => setSeleccionada(escuela)}
              >
                <img src={escuela.foto} alt={escuela.nombre} />
                <h3>{escuela.nombre}</h3>
                <button
                  className="btn-eliminar-small"
                  onClick={(e) => {
                    e.stopPropagation();
                    eliminarEscuela(escuela.id);
                  }}
                >
                  Eliminar
                </button>
              </div>
            ))}

            <div className="agregar-card" onClick={irRegistro}>
              <img src={agregarImg} alt="Agregar nueva institución" />
              <h3>Agregar Nueva Institución</h3>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default Main;
