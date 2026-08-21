function userPublic(row) {
  if (!row) return null;

  return {
    id_usuario: row.id_usuario,
    cedula: row.cedula,
    usuario: row.usuario,
    nombre_completo: row.nombre_completo,
    nombre: row.nombre_completo,
    primer_apellido: row.primer_apellido,
    segundo_apellido: row.segundo_apellido,
    primer_nombre: row.primer_nombre,
    segundo_nombre: row.segundo_nombre,
    rol: row.nombre_rol || row.rol,
    departamento: row.nombre_departamento || row.departamento,
    cargo: row.nombre_cargo || row.cargo,
    estado: row.estado,
    horario: row.nombre_horario || 'Horario institucional general'
  };
}

module.exports = {
  userPublic
};