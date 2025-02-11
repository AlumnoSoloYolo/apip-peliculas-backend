// backend/controllers/userMovieController.js
const User = require('../models/user.model');

exports.addPeliPendiente = async (req, res) => {
    try {
        const { movieId } = req.body;
        const userId = req.user.id; // Esto vendrá del middleware de autenticación

        // Verificamos si la película ya está en la lista de pendientes
        const user = await User.findById(userId);
        const yaExiste = user.pelisPendientes.some(peli => peli.movieId === movieId);

        if (yaExiste) {
            return res.status(400).json({
                message: 'Esta película ya está en tu lista de pendientes'
            });
        }

        // Añadimos la película a la lista
        const updatedUser = await User.findByIdAndUpdate(
            userId,
            {
                $push: {
                    pelisPendientes: {
                        movieId,
                        addedAt: new Date()
                    }
                }
            },
            { new: true } // Esto hace que nos devuelva el documento actualizado
        );

        res.json({
            message: 'Película añadida a pendientes',
            pelisPendientes: updatedUser.pelisPendientes
        });

    } catch (error) {
        res.status(500).json({
            message: 'Error al añadir la película a pendientes',
            error: error.message
        });
    }
};

exports.addPeliVista = async (req, res) => {
    try {
        const { movieId } = req.body;
        const userId = req.user.id;

        // Eliminamos de pendientes y añadimos a vistas
        const updatedUser = await User.findByIdAndUpdate(
            userId,
            {
                $pull: { pelisPendientes: { movieId } },
                $push: {
                    pelisVistas: {
                        movieId,
                        watchedAt: new Date()
                    }
                }
            },
            { new: true }
        );

        res.json({
            message: 'Película marcada como vista',
            user: updatedUser
        });
    } catch (error) {
        res.status(500).json({
            message: 'Error al actualizar la película',
            error: error.message
        });
    }
};

exports.addReview = async (req, res) => {
    try {
        const { movieId, rating, comment } = req.body;
        const userId = req.user.id;

        // Verificamos si ya existe una reseña para esta película
        const user = await User.findById(userId);
        const reviewExistente = user.reviews.find(review => review.movieId === movieId);

        if (reviewExistente) {
            return res.status(400).json({
                message: 'Ya has publicado una reseña para esta película'
            });
        }

        // Añadimos la reseña
        const updatedUser = await User.findByIdAndUpdate(
            userId,
            {
                $push: {
                    reviews: {
                        movieId,
                        rating,
                        comment,
                        createdAt: new Date()
                    }
                }
            },
            { new: true }
        );

        res.json({
            message: 'Reseña añadida correctamente',
            review: updatedUser.reviews.find(r => r.movieId === movieId)
        });

    } catch (error) {
        res.status(500).json({
            message: 'Error al añadir la reseña',
            error: error.message
        });
    }
};


exports.getUserProfile = async (req, res) => {
    try {
        const userId = req.user.id;
        const user = await User.findById(userId)
            .select('-password')
            .lean();

        if (!user) {
            return res.status(404).json({ message: 'Usuario no encontrado' });
        }

        console.log('Enviando datos de usuario:', user);
        res.json(user);
    } catch (error) {
        console.error('Error al obtener perfil:', error);
        res.status(500).json({
            message: 'Error al obtener el perfil del usuario',
            error: error.message
        });
    }
};