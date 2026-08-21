require('dotenv').config();

process.env.TZ = process.env.TZ || 'America/Guayaquil';

module.exports = {
  PORT: Number(process.env.PORT || 3000),

  DB_HOST: process.env.DB_HOST || 'localhost',
  DB_PORT: Number(process.env.DB_PORT || 3306),
  DB_USER: process.env.DB_USER || 'root',
  DB_PASSWORD: process.env.DB_PASSWORD || '',
  DB_NAME: process.env.DB_NAME || 'sistema_asistencia_columbe',
  DB_SSL: String(process.env.DB_SSL || '').toLowerCase() === 'true',

  JWT_SECRET: process.env.JWT_SECRET || 'dev_secret_columbe',
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '8h',

  NODE_ENV: process.env.NODE_ENV || 'development',
  TZ: process.env.TZ || 'America/Guayaquil'
};
