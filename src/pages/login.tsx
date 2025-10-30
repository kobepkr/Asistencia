import React, { useState } from "react";
import "./login.css";
import logo from "../assets/vl.png";
import { useNavigate } from "react-router-dom";

const Login: React.FC = () => {
  const [usuario, setUsuario] = useState("");
  const [password, setPassword] = useState("");
  const [mensaje, setMensaje] = useState("");
  const [exito, setExito] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [nombreUsuario, setNombreUsuario] = useState("");
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const res = await fetch("http://localhost:5000/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: usuario, password }),
      });

      const data = await res.json();

      if (res.ok) {
        setExito(true);
        setNombreUsuario(data.nombre);
        setShowModal(true); // Mostrar modal
        setTimeout(() => {
          setShowModal(false);
          navigate("/main");
        }, 2000); // 2 segundos
      } else {
        setExito(false);
        setMensaje(data.mensaje);
      }
    } catch (err) {
      console.error(err);
      setExito(false);
      setMensaje("Error al iniciar sesión");
    }
  };

  return (
    <div className="login-container">
      <div className="login-box">
        <img src={logo} alt="Logo" className="login-logo" />
        <h2>Sistema de Asistencia</h2>

        <form onSubmit={handleSubmit}>
          <div className="input-group">
            <label htmlFor="usuario">Usuario</label>
            <input
              type="text"
              id="usuario"
              placeholder="Ingresa tu usuario"
              value={usuario}
              onChange={(e) => setUsuario(e.target.value)}
              required
            />
          </div>

          <div className="input-group">
            <label htmlFor="password">Contraseña</label>
            <input
              type="password"
              id="password"
              placeholder="Ingresa tu contraseña"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          <button type="submit" className="btn-login">
            Iniciar Sesión
          </button>
        </form>

        {mensaje && !exito && (
          <p className="mensaje-error">{mensaje}</p>
        )}

        <div className="forgot-password">
          <a href="/recuperarContrasena">¿Olvidaste tu contraseña?</a>
        </div>
      </div>

      {showModal && (
        <div className="modal-bienvenida">
          <div className="modal-content">
            <h3>¡Bienvenido, {nombreUsuario}!</h3>
            <p>Redirigiendo a tu panel...</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default Login;
