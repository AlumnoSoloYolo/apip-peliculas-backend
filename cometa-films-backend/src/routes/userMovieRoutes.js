
const express = require('express');
const router = express.Router();
const { auth } = require('../middleware/auth.middleware');
const {
    addPeliPendiente,
    addPeliVista,
    addReview,
    getUserProfile
} = require('../controllers/userMovieController');

// Todas las rutas requieren autenticación
router.use(auth);

router.post('/watchlist', addPeliPendiente);
router.post('/watched', addPeliVista);
router.post('/movies/:movieId/reviews', addReview);
router.get('/profile', auth, getUserProfile);

module.exports = router;