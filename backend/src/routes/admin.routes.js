const router = require('express').Router();

const { pool } = require('../config/db');
const { requireAuth, allowRoles } = require('../middlewares/auth.middleware');
const { normalizeText, splitNombreCompleto, buildInitialPassword } = require('../utils/text.util');
const { sha256 } = require('../utils/crypto.util');
const { userPublic } = require('../utils/user.util');
const { audit } = require('../services/audit.service');
const {
  findOrCreateDepartamento,
  findOrCreateCargo,
  getRoleId
} = require('../services/catalog.service');

// ===============================
// USUARIOS
// ===============================
router.get('/usuarios', requireAuth, allowRoles('ADMINISTRADOR', 'TALENTO_HUMANO'), async (req, res, next) => {
  try {
    const actorRol = req.auth.rol;

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
       ${actorRol === 'TALENTO_HUMANO' ? "WHERE r.nombre_rol IN ('FUNCIONARIO', 'CONSULTA')" : ''}
       ORDER BY u.primer_apellido, u.primer_nombre`
    );

    res.json({
      usuarios: rows.map(userPublic)
    });
  } catch (error) {
    next(error);
  }
});

router.post('/usuarios', requireAuth, allowRoles('ADMINISTRADOR', 'TALENTO_HUMANO'), async (req, res, next) => {
  try {
    const {
      cedula,
      nombre,
      cargo,
      departamento,
      rol = 'FUNCIONARIO',
      estado = 'ACTIVO'
    } = req.body;

    const cleanCedula = String(cedula || '').trim();
    const cleanRol = normalizeText(rol);

    if (!/^\d{9,10}$/.test(cleanCedula)) {
      return res.status(400).json({
        message: 'La cédula debe contener entre 9 y 10 dígitos.'
      });
    }

    if (!nombre || !cargo || !departamento) {
      return res.status(400).json({
        message: 'Complete nombre, cargo y departamento.'
      });
    }

    if (req.auth.rol === 'TALENTO_HUMANO' && !['FUNCIONARIO', 'CONSULTA'].includes(cleanRol)) {
      return res.status(403).json({
        message: 'Talento Humano solo puede crear funcionarios o usuarios de consulta.'
      });
    }

    const idRol = await getRoleId(cleanRol);

    if (!idRol) {
      return res.status(400).json({
        message: 'Rol no válido.'
      });
    }

    const idDepartamento = await findOrCreateDepartamento(departamento);
    const idCargo = await findOrCreateCargo(cargo);
    const names = splitNombreCompleto(nombre);

    const initialPassword = buildInitialPassword(
      cleanCedula,
      names.primer_nombre,
      names.primer_apellido
    );

    const [result] = await pool.query(
      `INSERT INTO usuarios
        (cedula, usuario, primer_apellido, segundo_apellido, primer_nombre, segundo_nombre, id_rol, id_departamento, id_cargo, password_hash, estado)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        cleanCedula,
        cleanCedula,
        names.primer_apellido,
        names.segundo_apellido,
        names.primer_nombre,
        names.segundo_nombre,
        idRol,
        idDepartamento,
        idCargo,
        sha256(initialPassword),
        normalizeText(estado) || 'ACTIVO'
      ]
    );

    const [[schedule]] = await pool.query(
      'SELECT id_horario FROM horarios WHERE nombre_horario = ? LIMIT 1',
      ['Horario institucional general']
    );

    if (schedule?.id_horario) {
      await pool.query(
        'INSERT INTO usuarios_horarios (id_usuario, id_horario, fecha_inicio, estado) VALUES (?, ?, CURDATE(), 1)',
        [result.insertId, schedule.id_horario]
      );
    }

    await audit({
      usuarioId: req.auth.id_usuario,
      accion: 'CREAR_USUARIO',
      tabla: 'usuarios',
      idRegistro: result.insertId,
      descripcion: `Creó usuario ${cleanCedula}`,
      datosNuevos: req.body,
      req
    });

    res.status(201).json({
      message: 'Usuario creado correctamente.',
      id_usuario: result.insertId,
      password_inicial: initialPassword
    });
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({
        message: 'Ya existe un usuario con esa cédula.'
      });
    }

    next(error);
  }
});

router.put('/usuarios/:id', requireAuth, allowRoles('ADMINISTRADOR', 'TALENTO_HUMANO'), async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const { nombre, cargo, departamento, rol, estado } = req.body;

    const [[existing]] = await pool.query(
      `SELECT u.*, r.nombre_rol 
       FROM usuarios u 
       INNER JOIN roles r ON r.id_rol = u.id_rol 
       WHERE u.id_usuario = ?`,
      [id]
    );

    if (!existing) {
      return res.status(404).json({
        message: 'Usuario no encontrado.'
      });
    }

    if (req.auth.rol === 'TALENTO_HUMANO') {
      const targetRol = rol ? normalizeText(rol) : existing.nombre_rol;

      if (![existing.nombre_rol, targetRol].every((r) => ['FUNCIONARIO', 'CONSULTA'].includes(r))) {
        return res.status(403).json({
          message: 'Talento Humano no puede modificar administradores ni talento humano.'
        });
      }
    }

    const names = nombre ? splitNombreCompleto(nombre) : existing;
    const idRol = rol ? await getRoleId(rol) : existing.id_rol;
    const idDepartamento = departamento
      ? await findOrCreateDepartamento(departamento)
      : existing.id_departamento;

    const idCargo = cargo
      ? await findOrCreateCargo(cargo)
      : existing.id_cargo;

    await pool.query(
      `UPDATE usuarios
       SET primer_apellido = ?, 
           segundo_apellido = ?, 
           primer_nombre = ?, 
           segundo_nombre = ?,
           id_rol = ?, 
           id_departamento = ?, 
           id_cargo = ?, 
           estado = ?
       WHERE id_usuario = ?`,
      [
        names.primer_apellido,
        names.segundo_apellido,
        names.primer_nombre,
        names.segundo_nombre,
        idRol,
        idDepartamento,
        idCargo,
        estado ? normalizeText(estado) : existing.estado,
        id
      ]
    );

    await audit({
      usuarioId: req.auth.id_usuario,
      accion: 'EDITAR_USUARIO',
      tabla: 'usuarios',
      idRegistro: id,
      descripcion: `Editó usuario ${existing.cedula}`,
      datosAnteriores: existing,
      datosNuevos: req.body,
      req
    });

    res.json({
      message: 'Usuario actualizado correctamente.'
    });
  } catch (error) {
    next(error);
  }
});

router.delete('/usuarios/:id', requireAuth, allowRoles('ADMINISTRADOR'), async (req, res, next) => {
  try {
    const id = Number(req.params.id);

    if (id === req.auth.id_usuario) {
      return res.status(400).json({
        message: 'No puede eliminar o desactivar su propia cuenta.'
      });
    }

    await pool.query(
      "UPDATE usuarios SET estado = 'INACTIVO' WHERE id_usuario = ?",
      [id]
    );

    await audit({
      usuarioId: req.auth.id_usuario,
      accion: 'DESACTIVAR_USUARIO',
      tabla: 'usuarios',
      idRegistro: id,
      descripcion: `Desactivó usuario ${id}`,
      req
    });

    res.json({
      message: 'Usuario desactivado correctamente.'
    });
  } catch (error) {
    next(error);
  }
});

// ===============================
// CATÁLOGOS
// ===============================
router.get('/catalogos', requireAuth, allowRoles('ADMINISTRADOR', 'TALENTO_HUMANO'), async (_req, res, next) => {
  try {
    const [roles] = await pool.query(
      'SELECT id_rol, nombre_rol FROM roles WHERE estado = 1 ORDER BY nombre_rol'
    );

    const [departamentos] = await pool.query(
      'SELECT id_departamento, nombre_departamento FROM departamentos WHERE estado = 1 ORDER BY nombre_departamento'
    );

    const [cargos] = await pool.query(
      'SELECT id_cargo, nombre_cargo FROM cargos WHERE estado = 1 ORDER BY nombre_cargo'
    );

    const [horarios] = await pool.query(
      'SELECT id_horario, nombre_horario, tolerancia_entrada_minutos FROM horarios WHERE estado = 1 ORDER BY nombre_horario'
    );

    res.json({
      roles,
      departamentos,
      cargos,
      horarios
    });
  } catch (error) {
    next(error);
  }
});

// ===============================
// HORARIOS
// ===============================
router.get('/horarios', requireAuth, allowRoles('ADMINISTRADOR', 'TALENTO_HUMANO'), async (_req, res, next) => {
  try {
    const [rows] = await pool.query(
      `SELECT
          h.id_horario,
          h.nombre_horario AS nombre,
          h.descripcion,
          h.tolerancia_entrada_minutos AS tolerancia,
          MAX(CASE WHEN hd.dia_semana = 1 THEN hd.hora_entrada END) AS entrada,
          MAX(CASE WHEN hd.dia_semana = 1 THEN hd.hora_salida_almuerzo END) AS salidaAlmuerzo,
          MAX(CASE WHEN hd.dia_semana = 1 THEN hd.hora_retorno_almuerzo END) AS retornoAlmuerzo,
          MAX(CASE WHEN hd.dia_semana = 1 THEN hd.hora_salida END) AS salida
       FROM horarios h
       LEFT JOIN horario_detalles hd ON hd.id_horario = h.id_horario
       WHERE h.estado = 1
       GROUP BY h.id_horario
       ORDER BY h.nombre_horario`
    );

    res.json({
      horarios: rows
    });
  } catch (error) {
    next(error);
  }
});

router.post('/horarios', requireAuth, allowRoles('ADMINISTRADOR', 'TALENTO_HUMANO'), async (req, res, next) => {
  const conn = await pool.getConnection();

  try {
    const {
      nombre,
      entrada,
      salidaAlmuerzo,
      retornoAlmuerzo,
      salida,
      tolerancia = 10
    } = req.body;

    if (!nombre || !entrada || !salidaAlmuerzo || !retornoAlmuerzo || !salida) {
      return res.status(400).json({
        message: 'Complete todos los campos del horario.'
      });
    }

    await conn.beginTransaction();

    const [result] = await conn.query(
      `INSERT INTO horarios 
       (nombre_horario, descripcion, tolerancia_entrada_minutos, tolerancia_retorno_almuerzo_minutos)
       VALUES (?, ?, ?, ?)`,
      [nombre, `Horario ${nombre}`, Number(tolerancia), Number(tolerancia)]
    );

    for (let day = 1; day <= 7; day += 1) {
      const laborable = day <= 5 ? 1 : 0;

      await conn.query(
        `INSERT INTO horario_detalles
          (id_horario, dia_semana, es_laborable, hora_entrada, hora_salida_almuerzo, hora_retorno_almuerzo, hora_salida)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          result.insertId,
          day,
          laborable,
          laborable ? entrada : null,
          laborable ? salidaAlmuerzo : null,
          laborable ? retornoAlmuerzo : null,
          laborable ? salida : null
        ]
      );
    }

    await conn.commit();

    res.status(201).json({
      message: 'Horario creado correctamente.',
      id_horario: result.insertId
    });
  } catch (error) {
    await conn.rollback();
    next(error);
  } finally {
    conn.release();
  }
});

// ===============================
// DEPARTAMENTOS
// ===============================
router.get('/departamentos', requireAuth, allowRoles('ADMINISTRADOR', 'TALENTO_HUMANO'), async (_req, res, next) => {
  try {
    const [rows] = await pool.query(
      'SELECT id_departamento, nombre_departamento AS nombre FROM departamentos WHERE estado = 1 ORDER BY nombre_departamento'
    );

    res.json({
      departamentos: rows
    });
  } catch (error) {
    next(error);
  }
});

router.post('/departamentos', requireAuth, allowRoles('ADMINISTRADOR', 'TALENTO_HUMANO'), async (req, res, next) => {
  try {
    const nombre = String(req.body.nombre || '').trim();

    if (!nombre) {
      return res.status(400).json({
        message: 'Ingrese el nombre del departamento.'
      });
    }

    const id = await findOrCreateDepartamento(nombre);

    res.status(201).json({
      message: 'Departamento guardado correctamente.',
      id_departamento: id
    });
  } catch (error) {
    next(error);
  }
});

// ===============================
// CARGOS
// ===============================
router.get('/cargos', requireAuth, allowRoles('ADMINISTRADOR', 'TALENTO_HUMANO'), async (_req, res, next) => {
  try {
    const [rows] = await pool.query(
      'SELECT id_cargo, nombre_cargo AS nombre FROM cargos WHERE estado = 1 ORDER BY nombre_cargo'
    );

    res.json({
      cargos: rows
    });
  } catch (error) {
    next(error);
  }
});

router.post('/cargos', requireAuth, allowRoles('ADMINISTRADOR', 'TALENTO_HUMANO'), async (req, res, next) => {
  try {
    const nombre = String(req.body.nombre || '').trim();

    if (!nombre) {
      return res.status(400).json({
        message: 'Ingrese el nombre del cargo.'
      });
    }

    const id = await findOrCreateCargo(nombre);

    res.status(201).json({
      message: 'Cargo guardado correctamente.',
      id_cargo: id
    });
  } catch (error) {
    next(error);
  }
});

// ===============================
// IPS AUTORIZADAS
// ===============================
router.get('/ips', requireAuth, allowRoles('ADMINISTRADOR'), async (_req, res, next) => {
  try {
    const [rows] = await pool.query(
      `SELECT 
          id_ip_autorizada, 
          nombre_red AS nombre, 
          descripcion, 
          tipo, 
          ip_inicio AS inicio, 
          ip_fin AS fin, 
          cidr, 
          estado
       FROM ips_autorizadas
       WHERE estado = 1
       ORDER BY id_ip_autorizada DESC`
    );

    res.json({
      ips: rows
    });
  } catch (error) {
    next(error);
  }
});

router.post('/ips', requireAuth, allowRoles('ADMINISTRADOR'), async (req, res, next) => {
  try {
    const {
      nombre,
      tipo = 'IP_EXACTA',
      inicio,
      fin = null,
      cidr = null,
      descripcion = null
    } = req.body;

    if (!nombre || !inicio) {
      return res.status(400).json({
        message: 'Ingrese nombre e IP inicial.'
      });
    }

    const [result] = await pool.query(
      `INSERT INTO ips_autorizadas 
       (nombre_red, descripcion, tipo, ip_inicio, ip_fin, cidr, estado)
       VALUES (?, ?, ?, ?, ?, ?, 1)`,
      [
        nombre,
        descripcion,
        tipo,
        inicio,
        fin || null,
        cidr || null
      ]
    );

    res.status(201).json({
      message: 'IP autorizada guardada correctamente.',
      id_ip_autorizada: result.insertId
    });
  } catch (error) {
    next(error);
  }
});

// ===============================
// EDITAR / ELIMINAR HORARIOS
// ===============================
router.put('/horarios/:id', requireAuth, allowRoles('ADMINISTRADOR'), async (req, res, next) => {
  const conn = await pool.getConnection();

  try {
    const id = Number(req.params.id);
    const {
      nombre,
      entrada,
      salidaAlmuerzo,
      retornoAlmuerzo,
      salida,
      tolerancia = 10
    } = req.body;

    if (!id || !nombre || !entrada || !salidaAlmuerzo || !retornoAlmuerzo || !salida) {
      return res.status(400).json({
        message: 'Complete todos los campos del horario.'
      });
    }

    await conn.beginTransaction();

    await conn.query(
      `UPDATE horarios
       SET nombre_horario = ?,
           descripcion = ?,
           tolerancia_entrada_minutos = ?,
           tolerancia_retorno_almuerzo_minutos = ?
       WHERE id_horario = ?`,
      [
        nombre,
        `Horario ${nombre}`,
        Number(tolerancia),
        Number(tolerancia),
        id
      ]
    );

    for (let day = 1; day <= 7; day += 1) {
      const laborable = day <= 5 ? 1 : 0;

      await conn.query(
        `UPDATE horario_detalles
         SET es_laborable = ?,
             hora_entrada = ?,
             hora_salida_almuerzo = ?,
             hora_retorno_almuerzo = ?,
             hora_salida = ?
         WHERE id_horario = ? AND dia_semana = ?`,
        [
          laborable,
          laborable ? entrada : null,
          laborable ? salidaAlmuerzo : null,
          laborable ? retornoAlmuerzo : null,
          laborable ? salida : null,
          id,
          day
        ]
      );
    }

    await conn.commit();

    res.json({
      message: 'Horario actualizado correctamente.'
    });
  } catch (error) {
    await conn.rollback();
    next(error);
  } finally {
    conn.release();
  }
});

router.delete('/horarios/:id', requireAuth, allowRoles('ADMINISTRADOR'), async (req, res, next) => {
  try {
    const id = Number(req.params.id);

    await pool.query(
      'UPDATE horarios SET estado = 0 WHERE id_horario = ?',
      [id]
    );

    res.json({
      message: 'Horario eliminado correctamente.'
    });
  } catch (error) {
    next(error);
  }
});

// ===============================
// EDITAR / ELIMINAR DEPARTAMENTOS
// ===============================
router.put('/departamentos/:id', requireAuth, allowRoles('ADMINISTRADOR'), async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const nombre = String(req.body.nombre || '').trim();

    if (!nombre) {
      return res.status(400).json({
        message: 'Ingrese el nombre del departamento.'
      });
    }

    await pool.query(
      'UPDATE departamentos SET nombre_departamento = ? WHERE id_departamento = ?',
      [nombre, id]
    );

    res.json({
      message: 'Departamento actualizado correctamente.'
    });
  } catch (error) {
    next(error);
  }
});

router.delete('/departamentos/:id', requireAuth, allowRoles('ADMINISTRADOR'), async (req, res, next) => {
  try {
    const id = Number(req.params.id);

    await pool.query(
      'UPDATE departamentos SET estado = 0 WHERE id_departamento = ?',
      [id]
    );

    res.json({
      message: 'Departamento eliminado correctamente.'
    });
  } catch (error) {
    next(error);
  }
});

// ===============================
// EDITAR / ELIMINAR CARGOS
// ===============================
router.put('/cargos/:id', requireAuth, allowRoles('ADMINISTRADOR'), async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const nombre = String(req.body.nombre || '').trim().toUpperCase();

    if (!nombre) {
      return res.status(400).json({
        message: 'Ingrese el nombre del cargo.'
      });
    }

    await pool.query(
      'UPDATE cargos SET nombre_cargo = ? WHERE id_cargo = ?',
      [nombre, id]
    );

    res.json({
      message: 'Cargo actualizado correctamente.'
    });
  } catch (error) {
    next(error);
  }
});

router.delete('/cargos/:id', requireAuth, allowRoles('ADMINISTRADOR'), async (req, res, next) => {
  try {
    const id = Number(req.params.id);

    await pool.query(
      'UPDATE cargos SET estado = 0 WHERE id_cargo = ?',
      [id]
    );

    res.json({
      message: 'Cargo eliminado correctamente.'
    });
  } catch (error) {
    next(error);
  }
});

// ===============================
// EDITAR / ELIMINAR IPS
// ===============================
router.put('/ips/:id', requireAuth, allowRoles('ADMINISTRADOR'), async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const {
      nombre,
      tipo = 'IP_EXACTA',
      inicio,
      fin = null,
      cidr = null,
      descripcion = null
    } = req.body;

    if (!nombre || !inicio) {
      return res.status(400).json({
        message: 'Ingrese nombre e IP inicial.'
      });
    }

    await pool.query(
      `UPDATE ips_autorizadas
       SET nombre_red = ?,
           descripcion = ?,
           tipo = ?,
           ip_inicio = ?,
           ip_fin = ?,
           cidr = ?
       WHERE id_ip_autorizada = ?`,
      [
        nombre,
        descripcion,
        tipo,
        inicio,
        fin || null,
        cidr || null,
        id
      ]
    );

    res.json({
      message: 'IP autorizada actualizada correctamente.'
    });
  } catch (error) {
    next(error);
  }
});

router.delete('/ips/:id', requireAuth, allowRoles('ADMINISTRADOR'), async (req, res, next) => {
  try {
    const id = Number(req.params.id);

    if (!id) {
      return res.status(400).json({
        message: 'ID de IP no válido.'
      });
    }

    const [result] = await pool.query(
      'UPDATE ips_autorizadas SET estado = 0 WHERE id_ip_autorizada = ?',
      [id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({
        message: 'La IP autorizada no existe.'
      });
    }

    res.json({
      message: 'IP autorizada eliminada correctamente.'
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;