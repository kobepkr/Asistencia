import React, { useState } from "react";
import "./registroInstituciones.css";

const RegistroInstituciones: React.FC = () => {
  const [form, setForm] = useState({
    rbd: "",
    nombre: "",
    direccion: "",
    telefono: "",
    correo: "",
    sector: "",
    detalles: "",
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log("Datos de la institución:", form);
    alert("¡Institución registrada! (por ahora solo se muestra en consola)");
    setForm({
      rbd: "",
      nombre: "",
      direccion: "",
      telefono: "",
      correo: "",
      sector: "",
      detalles: "",
    });
  };

  return (
    <div className="registro-container">
      <h1>Nueva Institución</h1>
      <form className="registro-form" onSubmit={handleSubmit}>
        <div className="form-row">
          <div className="form-group">
            <label>RBD:</label>
            <input type="text" name="rbd" value={form.rbd} onChange={handleChange} required />
          </div>
          <div className="form-group">
            <label>Nombre:</label>
            <input type="text" name="nombre" value={form.nombre} onChange={handleChange} required />
          </div>
        </div>

        <div className="form-row">
          <div className="form-group">
            <label>Dirección:</label>
            <input type="text" name="direccion" value={form.direccion} onChange={handleChange} required />
          </div>
          <div className="form-group">
            <label>Sector / Comuna:</label>
            <input type="text" name="sector" value={form.sector} onChange={handleChange} />
          </div>
        </div>

        <div className="form-row">
          <div className="form-group">
            <label>Teléfono:</label>
            <input type="text" name="telefono" value={form.telefono} onChange={handleChange} />
          </div>
          <div className="form-group">
            <label>Correo:</label>
            <input type="email" name="correo" value={form.correo} onChange={handleChange} />
          </div>
        </div>

        <div className="form-row">
          <div className="form-group full-width">
            <label>Detalles adicionales:</label>
            <textarea name="detalles" value={form.detalles} onChange={handleChange}></textarea>
          </div>
        </div>

        <button type="submit">Guardar Institución</button>
      </form>
    </div>
  );
};

export default RegistroInstituciones;
