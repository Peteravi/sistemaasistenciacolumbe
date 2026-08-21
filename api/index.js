// Vercel convierte este módulo de Express en una función serverless.
// No se llama a app.listen() ni se inicializa la base en cada arranque en frío.
module.exports = require('../backend/src/app');
