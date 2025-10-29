import React, { useEffect, useState } from "react";
import AlumnoList from "../Components/AlumnoList"; // Ruta exacta
import { fetchAlumnos } from "../api"; // tu archivo de funciones para backend

interface Alumno {
  nombre: string;
  curso: string;
  qr: string;
}

const Dashboard: React.FC = () => {
  const [alumnos, setAlumnos] = useState<Alumno[]>([]);

  useEffect(() => {
    const cargarAlumnos = async () => {
      try {
        const data = await fetchAlumnos(); // fetch al backend
        // mapear QR: por ejemplo usamos nombre+curso
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

  return (
    <div>
      <h1>Dashboard</h1>
      <AlumnoList alumnos={alumnos} />
    </div>
  );
};

export default Dashboard;
