const { NODE_ENV } = require('../config/env');

function notFoundHandler(req, res) {
  res.status(404).json({
    message: 'Ruta no encontrada.'
  });
}

function errorHandler(error, _req, res, _next) {
  console.error(error);

  res.status(500).json({
    message: 'Error interno del servidor.',
    detail: NODE_ENV === 'production' ? undefined : error.message
  });
}

module.exports = {
  notFoundHandler,
  errorHandler
};