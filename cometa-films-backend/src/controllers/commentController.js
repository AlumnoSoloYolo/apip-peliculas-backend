// controllers/commentController.js
const User = require('../models/user.model');
const mongoose = require('mongoose');

// Obtener comentarios de una reseña
exports.getComments = async (req, res) => {
  try {
    const { reviewId } = req.params;
    
    // Buscar usuario que tiene la reseña
    const result = await User.findOne(
      { "reviews._id": reviewId },
      { "reviews.$": 1, "username": 1, "avatar": 1 }
    );
    
    if (!result || !result.reviews || result.reviews.length === 0) {
      return res.status(404).json({ message: 'Reseña no encontrada' });
    }
    
    const review = result.reviews[0];
    
    // Para cada comentario, buscar y añadir información del usuario
    const commentsWithUserInfo = await Promise.all(review.comments.map(async (comment) => {
      const commentUser = await User.findById(comment.userId, 'username avatar');
      return {
        _id: comment._id,
        text: comment.text,
        userId: comment.userId,
        username: commentUser ? commentUser.username : 'Usuario desconocido',
        avatar: commentUser ? commentUser.avatar : 'avatar1',
        parentId: comment.parentId,
        createdAt: comment.createdAt,
        isEdited: comment.isEdited,
        editedAt: comment.editedAt
      };
    }));
    
    res.json(commentsWithUserInfo);
  } catch (error) {
    console.error('Error al obtener comentarios:', error);
    res.status(500).json({ 
      message: 'Error al obtener comentarios',
      error: error.message
    });
  }
};

// Añadir un comentario a una reseña
// En commentController.js - Método addComment
exports.addComment = async (req, res) => {
    try {
      const { reviewId } = req.params;
      const { text, parentId } = req.body;
      const userId = req.user.id;
      
      // Validar texto del comentario
      if (!text || text.trim().length === 0) {
        return res.status(400).json({ message: 'El comentario no puede estar vacío' });
      }
      
      if (text.length > 500) {
        return res.status(400).json({ message: 'El comentario no puede exceder los 500 caracteres' });
      }
      
      // Crear objeto de comentario
      const newComment = {
        userId,
        text,
        parentId: parentId || null,
        createdAt: new Date(),
        isEdited: false
      };
      
      // Primero buscar el usuario y la reseña
      const user = await User.findOne({ "reviews._id": reviewId });
      
      if (!user) {
        return res.status(404).json({ message: 'Reseña no encontrada' });
      }
      
      // Encontrar la reseña específica
      const review = user.reviews.find(r => r._id.toString() === reviewId);
      
      if (!review) {
        return res.status(404).json({ message: 'Reseña no encontrada' });
      }
      
      // Añadir el comentario a la reseña
      review.comments.push(newComment);
      
      // Guardar el documento actualizado
      await user.save();
      
      // Obtener el comentario recién añadido (el último en la matriz de comentarios)
      const addedComment = review.comments[review.comments.length - 1];
      
      // Buscar la información del usuario para incluirla en la respuesta
      const commentUser = await User.findById(userId, 'username avatar');
      
      // Devolver el comentario con información del usuario
      res.status(201).json({
        _id: addedComment._id,
        text: addedComment.text,
        userId: addedComment.userId,
        username: commentUser.username,
        avatar: commentUser.avatar,
        parentId: addedComment.parentId,
        createdAt: addedComment.createdAt,
        isEdited: addedComment.isEdited,
        editedAt: addedComment.editedAt
      });
    } catch (error) {
      console.error('Error al añadir comentario:', error);
      res.status(500).json({ 
        message: 'Error al añadir comentario',
        error: error.message
      });
    }
  };

// Editar un comentario
exports.editComment = async (req, res) => {
  try {
    const { reviewId, commentId } = req.params;
    const { text } = req.body;
    const userId = req.user.id;
    
    // Validar texto del comentario
    if (!text || text.trim().length === 0) {
      return res.status(400).json({ message: 'El comentario no puede estar vacío' });
    }
    
    if (text.length > 500) {
      return res.status(400).json({ message: 'El comentario no puede exceder los 500 caracteres' });
    }
    
    // Encontrar el usuario que tiene la reseña con el comentario
    const user = await User.findOne(
      {
        "reviews._id": reviewId,
        "reviews.comments._id": commentId
      }
    );
    
    if (!user) {
      return res.status(404).json({ message: 'Reseña o comentario no encontrado' });
    }
    
    // Encontrar la reseña
    const review = user.reviews.find(r => r._id.toString() === reviewId);
    if (!review) {
      return res.status(404).json({ message: 'Reseña no encontrada' });
    }
    
    // Encontrar el comentario
    const comment = review.comments.find(c => c._id.toString() === commentId);
    if (!comment) {
      return res.status(404).json({ message: 'Comentario no encontrado' });
    }
    
    // Verificar que el usuario sea el autor del comentario
    if (comment.userId.toString() !== userId) {
      return res.status(403).json({ message: 'No tienes permiso para editar este comentario' });
    }
    
    // Actualizar el comentario
    comment.text = text;
    comment.isEdited = true;
    comment.editedAt = new Date();
    
    await user.save();
    
    // Buscar información del usuario para incluir en la respuesta
    const commentUser = await User.findById(userId, 'username avatar');
    
    // Devolver el comentario actualizado
    res.json({
      _id: comment._id,
      text: comment.text,
      userId: comment.userId,
      username: commentUser.username,
      avatar: commentUser.avatar,
      parentId: comment.parentId,
      createdAt: comment.createdAt,
      isEdited: comment.isEdited,
      editedAt: comment.editedAt
    });
  } catch (error) {
    console.error('Error al editar comentario:', error);
    res.status(500).json({ 
      message: 'Error al editar comentario',
      error: error.message
    });
  }
};

// Eliminar un comentario
exports.deleteComment = async (req, res) => {
  try {
    const { reviewId, commentId } = req.params;
    const userId = req.user.id;
    
    // Encontrar el usuario que tiene la reseña
    const user = await User.findOne(
      { "reviews._id": reviewId }
    );
    
    if (!user) {
      return res.status(404).json({ message: 'Reseña no encontrada' });
    }
    
    // Encontrar la reseña
    const review = user.reviews.find(r => r._id.toString() === reviewId);
    if (!review) {
      return res.status(404).json({ message: 'Reseña no encontrada' });
    }
    
    // Encontrar el comentario
    const comment = review.comments.find(c => c._id.toString() === commentId);
    if (!comment) {
      return res.status(404).json({ message: 'Comentario no encontrado' });
    }
    
    // Verificar permisos (autor del comentario o de la reseña)
    const isCommentAuthor = comment.userId.toString() === userId;
    const isReviewAuthor = review.userId?.toString() === userId;
    
    if (!isCommentAuthor && !isReviewAuthor) {
      return res.status(403).json({ message: 'No tienes permiso para eliminar este comentario' });
    }
    
    // Eliminar el comentario del array
    review.comments = review.comments.filter(c => c._id.toString() !== commentId);
    
    await user.save();
    
    res.json({ message: 'Comentario eliminado correctamente' });
  } catch (error) {
    console.error('Error al eliminar comentario:', error);
    res.status(500).json({ 
      message: 'Error al eliminar comentario',
      error: error.message
    });
  }
};