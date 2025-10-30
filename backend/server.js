// backend/server.js
import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import Usuario from "./models/Usuarios.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

const app = express();
app.use(cors());
app.use(express.json());

// Conectar MongoDB
mongoose.connect('mongodb://127.0.0.1:27017/vlAsistencia')
  .then(() => console.log('✅ Conectado a MongoDB'))
  .catch(err => console.log('❌ Error al conectar:', err));

// Esquema y modelo
const AlumnoSchema = new mongoose.Schema({ nombre: String, curso: String });
const Alumno = mongoose.model('Alumno', AlumnoSchema);

// Endpoints
app.get('/alumnos', async (req, res) => {
  const alumnos = await Alumno.find();
  res.json(alumnos);
});

app.post('/alumnos', async (req, res) => {
  const nuevoAlumno = new Alumno(req.body);
  await nuevoAlumno.save();
  res.json(nuevoAlumno);
});

// Test
app.get('/test', (req, res) => {
  res.json({ mensaje: "✅ Backend funcionando y conectado a MongoDB!" });


});

// POST /login
app.post('/login', async (req, res) => {
  const { email, password } = req.body;

  try {
    const usuario = await Usuario.findOne({ email, password });
    if (!usuario) return res.status(401).json({ mensaje: 'Credenciales incorrectas' });

    res.json({ mensaje: 'Login exitoso', usuario });
  } catch (err) {
    res.status(500).json({ mensaje: 'Error en el servidor' });
  }
});


// 🔐 Registrar un nuevo usuario
app.post("/register", async (req, res) => {
  try {
    const { nombre, email, password } = req.body;

    const existe = await Usuario.findOne({ email });
    if (existe) return res.status(400).json({ mensaje: "El usuario ya existe" });

    const hashed = await bcrypt.hash(password, 10);

    const nuevoUsuario = new Usuario({ nombre, email, password: hashed });
    await nuevoUsuario.save();

    res.json({ mensaje: "Usuario registrado correctamente" });
  } catch (err) {
    res.status(500).json({ mensaje: "Error en el servidor", error: err });
  }
});

// Obtener todos los usuarios
app.get('/usuarios', async (req, res) => {
  try {
    const usuarios = await Usuario.find();
    res.json(usuarios);
  } catch (err) {
    res.status(500).json({ error: 'Error al obtener usuarios' });
  }
});



// 🔑 Iniciar sesión
app.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    const usuario = await Usuario.findOne({ email });
    if (!usuario) return res.status(400).json({ mensaje: "Usuario no encontrado" });

    const esValido = await bcrypt.compare(password, usuario.password);
    if (!esValido) return res.status(401).json({ mensaje: "Contraseña incorrecta" });

    // Generar token JWT
    const token = jwt.sign(
      { id: usuario._id, nombre: usuario.nombre },
      "secreto123", // Cambia por una variable de entorno más segura
      { expiresIn: "2h" }
    );

    res.json({ mensaje: "Login exitoso", token });
  } catch (err) {
    res.status(500).json({ mensaje: "Error en el servidor", error: err });
  }
});



app.listen(5000, () => console.log('Servidor corriendo en http://localhost:5000'));
