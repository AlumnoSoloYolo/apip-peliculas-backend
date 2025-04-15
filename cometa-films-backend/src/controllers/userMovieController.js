const mongoose = require('mongoose');
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
    console.log('Entrando a addReview');
    console.log('Body recibido:', req.body);
    console.log('Usuario:', req.user);

    try {
        const { movieId, rating, comment } = req.body;
        const userId = req.user.id;
        const username = req.user.username; // Nombre del usuario autenticado
        const avatar = req.user.avatar; // Avatar del usuario autenticado

        // Verificamos si ya existe una reseña para esta película
        const user = await User.findById(userId);
        const reviewExistente = user.reviews.find(review => review.movieId === movieId);

        if (reviewExistente) {
            return res.status(400).json({
                message: 'Ya has publicado una reseña para esta película'
            });
        }

        // Añadimos la reseña con todos los campos necesarios
        const updatedUser = await User.findByIdAndUpdate(
            userId,
            {
                $push: {
                    reviews: {
                        movieId,
                        rating,
                        comment,
                        username,
                        avatar,
                        createdAt: new Date()
                    }
                }
            },
            { new: true } // Esto hace que nos devuelva el documento actualizado
        );

        // Buscamos la reseña recién creada para devolverla en la respuesta
        const nuevaReview = updatedUser.reviews.find(r => r.movieId === movieId);

        res.json({
            message: 'Reseña añadida correctamente',
            review: nuevaReview
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


exports.removePeliPendiente = async (req, res) => {
    try {
        const { movieId } = req.body;
        const userId = req.user.id;

        // Eliminamos la película de la lista de pendientes
        const updatedUser = await User.findByIdAndUpdate(
            userId,
            {
                $pull: {
                    pelisPendientes: { movieId }
                }
            },
            { new: true }
        );

        if (!updatedUser) {
            return res.status(404).json({
                message: 'Usuario no encontrado'
            });
        }

        res.json({
            message: 'Película eliminada de pendientes',
            pelisPendientes: updatedUser.pelisPendientes
        });

    } catch (error) {
        res.status(500).json({
            message: 'Error al eliminar la película de pendientes',
            error: error.message
        });
    }
};

exports.removePeliVista = async (req, res) => {
    try {
        const { movieId } = req.body;
        const userId = req.user.id;

        // Eliminamos la película de la lista de vistas
        const updatedUser = await User.findByIdAndUpdate(
            userId,
            {
                $pull: {
                    pelisVistas: { movieId }
                }
            },
            { new: true }
        );

        if (!updatedUser) {
            return res.status(404).json({
                message: 'Usuario no encontrado'
            });
        }

        res.json({
            message: 'Película eliminada de vistas',
            pelisVistas: updatedUser.pelisVistas
        });

    } catch (error) {
        res.status(500).json({
            message: 'Error al eliminar la película de vistas',
            error: error.message
        });
    }
};



exports.getUserReviews = async (req, res) => {
    try {
        const userId = req.user.id;
        const user = await User.findById(userId);

        if (!user) {
            return res.status(404).json({ message: 'Usuario no encontrado' });
        }

        res.json(user.reviews);
    } catch (error) {
        res.status(500).json({
            message: 'Error al obtener las reseñas',
            error: error.message
        });
    }
};


exports.getReviewsByMovieId = async (req, res) => {
    try {
        const movieId = req.params.movieId;

        console.log(`Solicitud recibida para obtener reseñas de la película con ID: ${movieId}`);

        // Buscar todos los usuarios que tienen reseñas para la película solicitada
        const usersWithReviews = await User.find({ 'reviews.movieId': movieId }, 'reviews username avatar');

        console.log(`Se encontraron ${usersWithReviews.length} usuarios con reseñas para la película ID: ${movieId}`);

        // Obtener todas las reseñas de esa película
        const reviews = usersWithReviews.flatMap(user =>
            user.reviews.filter(review => review.movieId === movieId).map(review => ({
                username: user.username,
                avatar: user.avatar,
                rating: review.rating,
                comment: review.comment,
                createdAt: review.createdAt
            }))
        );

        console.log(`Se encontraron ${reviews.length} reseñas para la película ID: ${movieId}`);

        if (reviews.length === 0) {
            console.log(`No se encontraron reseñas para la película con ID: ${movieId}`);
            return res.status(404).json({ message: 'No se encontraron reseñas para esta película' });
        }

        // Devolver las reseñas
        res.json(reviews);

    } catch (error) {
        console.error(`Error al obtener las reseñas para la película con ID: ${req.params.movieId}`, error);
        res.status(500).json({
            message: 'Error al obtener las reseñas',
            error: error.message
        });
    }
};




exports.getMovieReviews = async (req, res) => {
    try {
        const { movieId } = req.params;

        // Buscamos todos los usuarios que tienen una reseña para esta película
        const users = await User.find({
            'reviews.movieId': movieId
        }).select('username avatar reviews'); // Incluimos avatar y las reseñas en la selección

        // Filtramos y formateamos las reseñas
        const movieReviews = users.flatMap(user =>
            user.reviews
                .filter(review => review.movieId === movieId)
                .map(review => ({
                    username: user.username,
                    avatar: user.avatar, // Incluir el avatar del usuario
                    reviewId: review._id, // Aseguramos que el reviewId esté presente
                    movieId: review.movieId,
                    rating: review.rating,
                    comment: review.comment,
                    createdAt: review.createdAt,
                    userId: user._id
                }))
        );

        // Ordenamos las reseñas por fecha, las más recientes primero
        movieReviews.sort((a, b) => b.createdAt - a.createdAt);

        // Respondemos con el total de reseñas y las reseñas formateadas
        res.json({
            movie: movieId,
            totalReviews: movieReviews.length,
            reviews: movieReviews
        });

    } catch (error) {
        console.error('Error al obtener las reseñas de la película:', error);
        res.status(500).json({
            message: 'Error al obtener las reseñas de la película',
            error: error.message
        });
    }
};


// // Obtener una reseña específica
exports.getReview = async (req, res) => {
    try {
        const { movieId, reviewId } = req.params;

        // Buscar la reseña específica
        const user = await User.findById(req.user.id);
        if (!user) {
            return res.status(404).json({ message: 'Usuario no encontrado' });
        }

        // Buscar en todas las reseñas (no solo las del usuario actual)
        const allUsersWithReview = await User.find({
            "reviews._id": reviewId,
            "reviews.movieId": movieId
        }).select('username avatar reviews');

        if (allUsersWithReview.length === 0) {
            return res.status(404).json({ message: 'Reseña no encontrada' });
        }

        // Encontrar la reseña específica
        const userWithReview = allUsersWithReview[0];
        const review = userWithReview.reviews.find(
            r => r._id.toString() === reviewId && r.movieId === movieId
        );

        if (!review) {
            return res.status(404).json({ message: 'Reseña no encontrada' });
        }

        // Devolver la reseña con datos del usuario
        res.json({
            _id: review._id,
            movieId: review.movieId,
            rating: review.rating,
            comment: review.comment,
            createdAt: review.createdAt,
            username: userWithReview.username,
            avatar: userWithReview.avatar,
            userId: userWithReview._id
        });
    } catch (error) {
        console.error('Error al obtener reseña:', error);
        res.status(500).json({
            message: 'Error al obtener reseña',
            error: error.message
        });
    }
};


exports.getReviewById = async (req, res) => {
    try {
        const { reviewId } = req.params;

        const objectId = new mongoose.Types.ObjectId(reviewId);

        const user = await User.findOne(
            { "reviews._id": objectId },
            { "username": 1, "avatar": 1, "reviews.$": 1 }
        );

        if (!user || !user.reviews || user.reviews.length === 0) {
            return res.status(404).json({ message: 'Reseña no encontrada' });
        }

        const review = user.reviews[0];

        res.json({
            _id: review._id,
            movieId: review.movieId,
            rating: review.rating,
            comment: review.comment,
            createdAt: review.createdAt,
            username: user.username,
            avatar: user.avatar,
            userId: user._id
        });
    } catch (error) {
        console.error('Error al obtener reseña:', error);
        res.status(500).json({
            message: 'Error al obtener reseña',
            error: error.message
        });
    }
};

// Actualizar una reseña
exports.updateReview = async (req, res) => {
    try {
        const { movieId } = req.params; // Obtener el movieId de los parámetros de la ruta
        const { rating, comment } = req.body; // Obtener el rating y el comment del cuerpo de la solicitud
        const userId = req.user.id; // Obtener el userId del usuario autenticado

        // Buscar el usuario en la base de datos
        const user = await User.findById(userId);

        // Encontrar el índice de la reseña que coincide con el movieId
        const reviewIndex = user.reviews.findIndex(r => r.movieId === movieId);

        // Si no se encuentra la reseña, devolver un error
        if (reviewIndex === -1) {
            return res.status(404).json({ message: 'Reseña no encontrada' });
        }

        // Actualizar la reseña manteniendo el movieId
        user.reviews[reviewIndex] = {
            ...user.reviews[reviewIndex], // Mantener todos los campos existentes
            movieId: user.reviews[reviewIndex].movieId, // Asegurarse de que el movieId se mantenga
            rating,
            comment,
            updatedAt: new Date() // Actualizar la fecha de modificación
        };

        // Guardar los cambios en la base de datos
        await user.save();

        // Devolver la reseña actualizada
        res.json({
            message: 'Reseña actualizada correctamente',
            review: user.reviews[reviewIndex] // Incluir el movieId en la respuesta
        });
    } catch (error) {
        // Manejar errores
        res.status(500).json({
            message: 'Error al actualizar la reseña',
            error: error.message
        });
    }
};

// Eliminar una reseña
exports.deleteReview = async (req, res) => {
    try {
        const { movieId } = req.params;
        const userId = req.user.id;

        const updatedUser = await User.findByIdAndUpdate(
            userId,
            {
                $pull: {
                    reviews: { movieId }
                }
            },
            { new: true }
        );

        if (!updatedUser) {
            return res.status(404).json({ message: 'Usuario no encontrado' });
        }

        res.json({
            message: 'Reseña eliminada correctamente'
        });
    } catch (error) {
        res.status(500).json({
            message: 'Error al eliminar la reseña',
            error: error.message
        });
    }
};