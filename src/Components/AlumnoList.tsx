// src/components/AlumnoList.tsx
import React from "react";
import { QRCodeSVG } from "qrcode.react"; // <- import correcto

interface Alumno {
  nombre: string;
  curso: string;
  qr: string;
}

interface Props {
  alumnos: Alumno[];
}

const AlumnoList: React.FC<Props> = ({ alumnos }) => {
  return (
    <div>
      <h2>Lista de Alumnos</h2>
      <ul>
        {alumnos.map((alumno, index) => (
          <li key={index} style={{ marginBottom: "20px" }}>
            <strong>{alumno.nombre}</strong> - {alumno.curso} <br />
            <QRCodeSVG value={alumno.qr} size={128} /> {/* <-- QR generado */}
          </li>
        ))}
      </ul>
    </div>
  );
};

export default AlumnoList;
