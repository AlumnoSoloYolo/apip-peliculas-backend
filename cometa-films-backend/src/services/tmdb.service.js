
const axios = require('axios');

exports.getMovieDetails = async (movieId) => {
    try {
        const response = await axios.get(
            `https://api.themoviedb.org/3/movie/${movieId}`,
            {
                headers: {
                    Authorization: `Bearer ${process.env.TMDB_API_KEY}`,
                    accept: 'application/json'
                }
            }
        );

        return {
            tmdbId: movieId,
            title: response.data.title,
            posterPath: response.data.poster_path
        };
    } catch (error) {
        console.error(`Error al obtener detalles de película ${movieId}:`, error);
        return {
            tmdbId: movieId,
            title: 'Película desconocida',
            posterPath: null
        };
    }
};