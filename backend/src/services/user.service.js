const { pool } = require('../config/db');
const { getClientIp } = require('../utils/ip.util');

async function getAuthUser(req) {
  const [rows] = await pool.query(
    `SELECT
        u.id_usuario,
        u.cedula,
        u.usuario,
        CONCAT_WS(' ', u.primer_apellido, u.segundo_apellido, u.primer_nombre, u.segundo_nombre) AS nombre_completo,
        u.primer_apellido,
        u.segundo_apellido,
        u.primer_nombre,
        u.segundo_nombre,
        u.estado,
        r.nombre_rol,
        d.nombre_departamento,
        c.nombre_cargo,
        h.nombre_horario
     FROM usuarios u
     INNER JOIN roles r ON r.id_rol = u.id_rol
     LEFT JOIN departamentos d ON d.id_departamento = u.id_departamento
     LEFT JOIN cargos c ON c.id_cargo = u.id_cargo
     LEFT JOIN usuarios_horarios uh ON uh.id_usuario = u.id_usuario AND uh.estado = 1 AND uh.fecha_fin IS NULL
     LEFT JOIN horarios h ON h.id_horario = uh.id_horario
     WHERE u.id_usuario = ?
     LIMIT 1`,
    [req.auth.id_usuario]
  );

  return rows[0] || null;
}

async function logLoginAttempt({ cedula, idUsuario, resultado, mensaje, req }) {
  await pool.query(
    `INSERT INTO intentos_login
      (cedula_ingresada, id_usuario, ip_origen, user_agent, resultado, mensaje)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [
      cedula,
      idUsuario || null,
      getClientIp(req),
      req.headers['user-agent'] || null,
      resultado,
      mensaje
    ]
  );
}

module.exports = {
  getAuthUser,
  logLoginAttempt
};