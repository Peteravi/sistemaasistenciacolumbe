const { pool } = require('../config/db');
const { normalizeText } = require('../utils/text.util');

async function findOrCreateDepartamento(nombre) {
  if (!nombre) return null;

  const value = String(nombre).trim();

  const [rows] = await pool.query(
    'SELECT id_departamento FROM departamentos WHERE nombre_departamento = ? LIMIT 1',
    [value]
  );

  if (rows.length) return rows[0].id_departamento;

  const [result] = await pool.query(
    'INSERT INTO departamentos (nombre_departamento, descripcion) VALUES (?, ?)',
    [value, `Departamento ${value}`]
  );

  return result.insertId;
}

async function findOrCreateCargo(nombre) {
  if (!nombre) return null;

  const value = normalizeText(nombre);

  const [rows] = await pool.query(
    'SELECT id_cargo FROM cargos WHERE nombre_cargo = ? LIMIT 1',
    [value]
  );

  if (rows.length) return rows[0].id_cargo;

  const [result] = await pool.query(
    'INSERT INTO cargos (nombre_cargo, descripcion) VALUES (?, ?)',
    [value, `Cargo ${value}`]
  );

  return result.insertId;
}

async function getRoleId(nombreRol) {
  const [rows] = await pool.query(
    'SELECT id_rol FROM roles WHERE nombre_rol = ? AND estado = 1 LIMIT 1',
    [normalizeText(nombreRol)]
  );

  return rows[0]?.id_rol || null;
}

module.exports = {
  findOrCreateDepartamento,
  findOrCreateCargo,
  getRoleId
};