import React, { useEffect, useState } from "react";

interface Usuario {
  _id: string;
  nombre: string;
  email: string;
}

const Usuarios: React.FC = () => {
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);

  useEffect(() => {
    const fetchUsuarios = async () => {
      const res = await fetch("http://localhost:5000/usuarios");
      const data = await res.json();
      setUsuarios(data);
    };
    fetchUsuarios();
  }, []);

  return (
    <div style={{ maxWidth: "600px", margin: "50px auto", textAlign: "center" }}>
      <h2>Lista de Usuarios Registrados</h2>
      <table style={{ width: "100%", borderCollapse: "collapse", marginTop: "20px" }}>
        <thead>
          <tr style={{ background: "#4b6cb7", color: "#fff" }}>
            <th style={{ padding: "10px" }}>Nombre</th>
            <th style={{ padding: "10px" }}>Email</th>
          </tr>
        </thead>
        <tbody>
          {usuarios.map((u) => (
            <tr key={u._id} style={{ borderBottom: "1px solid #ddd" }}>
              <td style={{ padding: "10px" }}>{u.nombre}</td>
              <td style={{ padding: "10px" }}>{u.email}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default Usuarios;
