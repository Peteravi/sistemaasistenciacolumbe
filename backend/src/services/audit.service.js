const { pool } = require('../config/db');
const { getClientIp } = require('../utils/ip.util');

async function audit({
  usuarioId,
  accion,
  tabla,
  idRegistro,
  descripcion,
  datosAnteriores,
  datosNuevos,
  req
}) {
  try {
    await pool.query(
      `INSERT INTO auditoria
       (id_usuario, accion, tabla_afectada, id_registro_afectado, descripcion, datos_anteriores, datos_nuevos, ip_origen, user_agent)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        usuarioId || null,
        accion,
        tabla || null,
        idRegistro || null,
        descripcion || null,
        datosAnteriores ? JSON.stringify(datosAnteriores) : null,
        datosNuevos ? JSON.stringify(datosNuevos) : null,
        req ? getClientIp(req) : null,
        req ? req.headers['user-agent'] || null : null
      ]
    );
  } catch (error) {
    console.error('No se pudo guardar auditoría:', error.message);
  }
}

module.exports = {
  audit
};