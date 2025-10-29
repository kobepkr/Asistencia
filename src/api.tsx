// src/api.ts

// Definimos un tipo para los alumnos
export interface AlumnoInput {
  nombre: string;
  curso: string;
}

// Obtener todos los alumnos
export const fetchAlumnos = async (): Promise<AlumnoInput[]> => {
  const res = await fetch('http://localhost:5000/alumnos');
  return res.json();
};

// Agregar un nuevo alumno
export const agregarAlumno = async (alumno: AlumnoInput): Promise<AlumnoInput> => {
  const res = await fetch('http://localhost:5000/alumnos', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(alumno)
  });
  return res.json();
};
