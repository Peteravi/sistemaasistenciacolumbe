const app = require('./app');
const { PORT } = require('./config/env');
const { pool } = require('./config/db');
const { ensureDatabase } = require('./config/database-init');

async function startServer() {
  try {
    // La creación del esquema es una tarea explícita. En serverless nunca debe
    // ejecutarse durante un arranque en frío.
    if (String(process.env.INIT_DB_ON_START || '').toLowerCase() === 'true') {
      await ensureDatabase();
    }

    await pool.query('SELECT 1');

    app.listen(PORT, () => {
      console.log(`Backend y frontend ejecutándose en http://localhost:${PORT}`);
      console.log(`API disponible en http://localhost:${PORT}/api`);
      console.log(`Prueba backend: http://localhost:${PORT}/api/health`);
    });
  } catch (error) {
    console.error('No se pudo iniciar el servidor.');
    console.error('Verifica MySQL, la base de datos y el archivo .env.');
    console.error(error.message);
    process.exit(1);
  }
}

startServer();
