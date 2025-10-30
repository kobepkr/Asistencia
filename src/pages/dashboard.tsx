// src/pages/dashboard.tsx
import React, { useEffect, useState } from "react";
import AlumnoList from "../Components/AlumnoList"; // Lista de alumnos con QR
import { fetchAlumnos } from "../api"; // funciones del backend

interface Alumno {
  nombre: string;
  curso: string;
  qr: string;
}

interface Usuario {
  _id: string;
  nombre: string;
  email: string;
}

const Dashboard: React.FC = () => {
  const [alumnos, setAlumnos] = useState<Alumno[]>([]);
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);

  // 🔹 Cargar alumnos con QR
  useEffect(() => {
    const cargarAlumnos = async () => {
      try {
        const data = await fetchAlumnos();
        const alumnosConQR = data.map((a: any) => ({
          ...a,
          qr: `${a.nombre} - ${a.curso}`,
        }));
        setAlumnos(alumnosConQR);
      } catch (error) {
        console.error("Error al cargar alumnos:", error);
      }
    };

    cargarAlumnos();
  }, []);

  // 🔹 Cargar usuarios registrados
  useEffect(() => {
    const cargarUsuarios = async () => {
      try {
        const res = await fetch("http://localhost:5000/usuarios");
        const data = await res.json();
        setUsuarios(data);
      } catch (error) {
        console.error("Error al cargar usuarios:", error);
      }
    };

    cargarUsuarios();
  }, []);

  return (
    <div style={{ padding: "20px" }}>
      <h1>Dashboard</h1>

      {/* Sección de alumnos */}
      <section style={{ marginBottom: "40px" }}>
        
        <AlumnoList alumnos={alumnos} />
      </section>

      {/* Sección de usuarios */}
      <section>
        <h2>Usuarios Registrados</h2>
        {usuarios.length === 0 ? (
          <p>No hay usuarios registrados aún.</p>
        ) : (
          <ul style={{ listStyle: "none", padding: 0 }}>
            {usuarios.map((u) => (
              <li
                key={u._id}
                style={{
                  background: "#f5f5f5",
                  marginBottom: "10px",
                  padding: "10px",
                  borderRadius: "8px",
                }}
              >
                <strong>{u.nombre}</strong> <br />
                <small>{u.email}</small>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
};

export default Dashboard;
