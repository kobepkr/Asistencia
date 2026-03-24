import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

admin.initializeApp();

export const crearUsuario = functions.https.onCall(async (request) => {
  // Verificar que el usuario está autenticado
  if (!request.auth) {
    throw new functions.https.HttpsError(
      'unauthenticated',
      'Debes iniciar sesión para crear usuarios'
    );
  }

  const data = request.data;
  
  // Verificar que data tiene los campos necesarios
  if (!data.escuelaId || !data.email || !data.password || !data.nombre) {
    throw new functions.https.HttpsError(
      'invalid-argument',
      'Faltan datos requeridos'
    );
  }

  try {
    // Verificar que el usuario es admin
    const callerDoc = await admin.firestore()
      .doc(`escuelas/${data.escuelaId}/usuarios/${request.auth.uid}`)
      .get();
    
    if (!callerDoc.exists) {
      throw new functions.https.HttpsError(
        'permission-denied',
        'Usuario no encontrado en esta escuela'
      );
    }

    const callerData = callerDoc.data();
    if (!callerData || callerData.rol !== 'admin') {
      throw new functions.https.HttpsError(
        'permission-denied',
        'Se requieren permisos de admin'
      );
    }

    // Crear usuario en Firebase Auth
    const user = await admin.auth().createUser({
      email: data.email,
      password: data.password,
      displayName: data.nombre,
      disabled: false
    });

    // Guardar en Firestore
    await admin.firestore()
      .doc(`escuelas/${data.escuelaId}/usuarios/${user.uid}`)
      .set({
        email: data.email,
        nombre: data.nombre,
        rol: 'profesor',
        activo: true,
        cursosAsignados: data.cursosAsignados || [],
        fechaRegistro: new Date().toISOString().split('T')[0],
        ultimoAcceso: null
      });

    return { 
      success: true, 
      uid: user.uid,
      message: 'Usuario creado exitosamente' 
    };

  } catch (error: any) {
    console.error('Error creando usuario:', error);
    
    if (error.code === 'auth/email-already-exists') {
      throw new functions.https.HttpsError(
        'already-exists',
        'El email ya está registrado'
      );
    }
    
    throw new functions.https.HttpsError('internal', error.message);
  }
});