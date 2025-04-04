// controllers/userSocialController.js
const User = require('../models/user.model');

// Obtener todos los usuarios (paginados)
exports.getAllUsers = async (req, res) => {
    try {
        // Parámetros de paginación
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 12;
        const skip = (page - 1) * limit;

        // Obtener usuarios (excluyendo al usuario actual)
        const users = await User.find({ _id: { $ne: req.user.id } })
            .select('username avatar pelisVistas pelisPendientes reviews following followers')
            .skip(skip)
            .limit(limit)
            .lean();

        // Enriquecer datos para el frontend
        const usersWithInfo = users.map(user => {
            // Verificar si el usuario actual sigue a este usuario
            const isFollowing = req.user.following?.includes(user._id);

            return {
                ...user,
                pelisVistasCount: user.pelisVistas?.length || 0,
                pelisPendientesCount: user.pelisPendientes?.length || 0,
                reviewsCount: user.reviews?.length || 0,
                followersCount: user.followers?.length || 0,
                followingCount: user.following?.length || 0,
                isFollowing: !!isFollowing
            };
        });

        // Contar total para paginación
        const total = await User.countDocuments({ _id: { $ne: req.user.id } });

        res.json({
            users: usersWithInfo,
            pagination: {
                total,
                page,
                totalPages: Math.ceil(total / limit),
                hasMore: page < Math.ceil(total / limit)
            }
        });
    } catch (error) {
        console.error('Error al obtener usuarios:', error);
        res.status(500).json({
            message: 'Error al obtener usuarios',
            error: error.message
        });
    }
};

// Buscar usuarios por nombre de usuario
exports.searchUsers = async (req, res) => {
    try {
        const { username } = req.query;

        if (!username) {
            return res.status(400).json({ message: 'Se requiere un término de búsqueda' });
        }

        // Búsqueda con expresión regular para ser más flexible
        const users = await User.find({
            _id: { $ne: req.user.id },
            username: { $regex: username, $options: 'i' }
        })
            .select('username avatar pelisVistas pelisPendientes reviews following followers')
            .limit(20)
            .lean();

        // Enriquecer datos para el frontend
        const usersWithInfo = users.map(user => {
            // Verificar si el usuario actual sigue a este usuario
            const isFollowing = req.user.following?.includes(user._id);

            return {
                ...user,
                pelisVistasCount: user.pelisVistas?.length || 0,
                pelisPendientesCount: user.pelisPendientes?.length || 0,
                reviewsCount: user.reviews?.length || 0,
                followersCount: user.followers?.length || 0,
                followingCount: user.following?.length || 0,
                isFollowing: !!isFollowing
            };
        });

        res.json(usersWithInfo);
    } catch (error) {
        console.error('Error al buscar usuarios:', error);
        res.status(500).json({
            message: 'Error al buscar usuarios',
            error: error.message
        });
    }
};

// Obtener perfil público de un usuario
exports.getUserPublicProfile = async (req, res) => {
    try {
        const { userId } = req.params;

        // Verificar si el usuario existe
        const user = await User.findById(userId)
            .select('-password -email')
            .lean();

        if (!user) {
            return res.status(404).json({ message: 'Usuario no encontrado' });
        }

        // Verificar si el usuario actual sigue a este usuario
        const isFollowing = req.user.following?.includes(user._id);

        // Añadir estadísticas y flag de seguimiento
        const enrichedUser = {
            ...user,
            stats: {
                pelisVistasCount: user.pelisVistas?.length || 0,
                pelisPendientesCount: user.pelisPendientes?.length || 0,
                reviewsCount: user.reviews?.length || 0,
                followersCount: user.followers?.length || 0,
                followingCount: user.following?.length || 0
            },
            isFollowing: !!isFollowing
        };

        res.json(enrichedUser);
    } catch (error) {
        console.error('Error al obtener perfil de usuario:', error);
        res.status(500).json({
            message: 'Error al obtener perfil de usuario',
            error: error.message
        });
    }
};



// Seguir a un usuario
exports.followUser = async (req, res) => {
    try {
        const { userId } = req.params; // ID del usuario a seguir
        const currentUserId = req.user.id; // ID del usuario actual

        // Validaciones
        if (userId === currentUserId) {
            return res.status(400).json({ message: 'No puedes seguirte a ti mismo' });
        }

        // Verificar si el usuario a seguir existe
        const userToFollow = await User.findById(userId);
        if (!userToFollow) {
            return res.status(404).json({ message: 'Usuario no encontrado' });
        }

        // Verificar si ya se sigue a este usuario
        const currentUser = await User.findById(currentUserId);
        const alreadyFollowing = currentUser.following &&
            currentUser.following.some(id => id.toString() === userId);

        if (alreadyFollowing) {
            return res.status(400).json({ message: 'Ya sigues a este usuario' });
        }

        // Actualizar al usuario actual: añadir a following
        await User.findByIdAndUpdate(currentUserId, {
            $addToSet: { following: userId }
        });

        // Actualizar al usuario seguido: añadir a followers
        await User.findByIdAndUpdate(userId, {
            $addToSet: { followers: currentUserId }
        });

        res.json({ message: 'Usuario seguido con éxito' });
    } catch (error) {
        console.error('Error al seguir usuario:', error);
        res.status(500).json({
            message: 'Error al seguir al usuario',
            error: error.message
        });
    }
};

// Dejar de seguir a un usuario
exports.unfollowUser = async (req, res) => {
    try {
        const { userId } = req.params; // ID del usuario a dejar de seguir
        const currentUserId = req.user.id; // ID del usuario actual

        // Validaciones
        if (userId === currentUserId) {
            return res.status(400).json({ message: 'No puedes dejar de seguirte a ti mismo' });
        }

        // Verificar si el usuario existe
        const userToUnfollow = await User.findById(userId);
        if (!userToUnfollow) {
            return res.status(404).json({ message: 'Usuario no encontrado' });
        }

        // Actualizar al usuario actual: eliminar de following
        await User.findByIdAndUpdate(currentUserId, {
            $pull: { following: userId }
        });

        // Actualizar al usuario dejado de seguir: eliminar de followers
        await User.findByIdAndUpdate(userId, {
            $pull: { followers: currentUserId }
        });

        res.json({ message: 'Has dejado de seguir al usuario' });
    } catch (error) {
        console.error('Error al dejar de seguir usuario:', error);
        res.status(500).json({
            message: 'Error al dejar de seguir al usuario',
            error: error.message
        });
    }
};