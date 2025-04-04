const express = require('express');
const router = express.Router();
const { auth } = require('../middleware/auth.middleware');
const {
    getAllUsers,
    searchUsers,
    getUserPublicProfile,
    followUser,
    unfollowUser
} = require('../controllers/userSocialController');

// Todas las rutas requieren autenticación
router.use(auth);

// Rutas para la funcionalidad social
router.get('/users', getAllUsers);
router.get('/users/search', searchUsers);
router.get('/users/:userId', getUserPublicProfile);
router.post('/follow/:userId', followUser);
router.delete('/follow/:userId', unfollowUser);

module.exports = router;