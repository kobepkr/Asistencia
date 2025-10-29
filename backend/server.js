// backend/server.js
import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';

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

app.listen(5000, () => console.log('Servidor corriendo en http://localhost:5000'));
