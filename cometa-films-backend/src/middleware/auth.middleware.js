const jwt = require('jsonwebtoken');
const User = require('../models/user.model');

exports.auth = async (req, res, next) => {
    try {
        const authHeader = req.header('Authorization');
        if (!authHeader) {
            return res.status(401).json({ message: 'No hay token de autenticación' });
        }

        const token = authHeader.replace('Bearer ', '');
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        const user = await User.findById(decoded.id).select('-password');
        if (!user) {
            throw new Error('Usuario no encontrado');
        }

        req.user = user;
        next();
    } catch (error) {
        res.status(401).json({ message: 'Token inválido', error: error.message });
    }
};