const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const config = require('./config/config');

// Importamos las rutas
const authRoutes = require('./routes/auth.routes');
const userMovieRoutes = require('./routes/userMovieRoutes');
const userSocialRoutes = require('./routes/userSocialRoutes');
const commentRoutes = require('./routes/commentRoutes');
const movieListRoutes = require('./routes/movieListRoutes');
const likeRoutes = require('./routes/likeRoutes');

const app = express();

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' })); // Aumentamos el límite para posibles subidas de imágenes, etc.

// Conexión a MongoDB
mongoose.connect(config.mongodb.uri, {
    useNewUrlParser: true,
    useUnifiedTopology: true
})
    .then(() => console.log('Conectado a MongoDB'))
    .catch(err => console.error('Error conectando a MongoDB:', err));

// Rutas 
app.use('/auth', authRoutes);
app.use('/user-movies', userMovieRoutes);
app.use('/social', userSocialRoutes);
app.use('/comments', commentRoutes);
app.use('/movie-lists', movieListRoutes);
app.use('/likes', likeRoutes);

// Ruta para prueba de salud del API
app.get('/', (req, res) => {
    res.send('API funcionando correctamente');
});

// Manejador de errores global
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({
        message: 'Algo salió mal!',
        error: process.env.NODE_ENV === 'development' ? err.message : 'Error del servidor'
    });
});

// Iniciamos el servidor
app.listen(config.port, () => {
    console.log(`Servidor corriendo en el puerto ${config.port}`);
});