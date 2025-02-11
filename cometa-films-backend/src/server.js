const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const config = require('./config/config');

// Importamos las rutas
const authRoutes = require('./routes/auth.routes');
const userMovieRoutes = require('./routes/userMovieRoutes');


const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Conexión a MongoDB
mongoose.connect(config.mongodb.uri)
    .then(() => console.log('Conectado a MongoDB'))
    .catch(err => console.error('Error conectando a MongoDB:', err));

// Rutas
app.use('/auth', authRoutes);
app.use('/user-movies', userMovieRoutes);


// Manejador de errores global
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({
        message: 'Algo salió mal!',
        error: process.env.NODE_ENV === 'development' ? err.message : {}
    });
});

// Iniciamos el servidor
app.listen(config.port, () => {
    console.log(`Servidor corriendo en el puerto ${config.port}`);
});