// backend/models/User.js
const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    username: {
        type: String,
        required: true,
        unique: true,
        trim: true,
        minlength: 3
    },
    email: {
        type: String,
        required: true,
        unique: true,
        trim: true,
        lowercase: true
    },
    password: {
        type: String,
        required: true
    },
    avatar: {
        type: String,
        enum: [
            'avatar1', 'avatar2', 'avatar3', 'avatar4',
            'avatar5', 'avatar6', 'avatar7', 'avatar8'
        ],
        default: 'avatar1'
    },
    // Lista de películas pendientes por ver
    pelisPendientes: [{
        movieId: String,
        addedAt: {
            type: Date,
            default: Date.now
        }
    }],
    // Lista de películas ya vistas
    pelisVistas: [{
        movieId: String,
        watchedAt: {
            type: Date,
            default: Date.now
        }
    }],
    // Reseñas de películas
    reviews: [{
        movieId: String,
        rating: {
            type: Number,
            required: true,
            min: 1,
            max: 5
        },
        comment: {
            type: String,
            required: true
        },
        createdAt: {
            type: Date,
            default: Date.now
        }
    }]
}, {
    timestamps: true // Esto añadirá automáticamente createdAt y updatedAt
});

module.exports = mongoose.model('User', userSchema);