const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');

const {
    DB_HOST,
    DB_PORT,
    DB_USER,
    DB_PASSWORD,
    DB_NAME,
    DB_SSL
} = require('./env');

const REQUIRED_TABLES = [
    'instituciones',
    'roles',
    'permisos',
    'roles_permisos',
    'departamentos',
    'cargos',
    'usuarios',
    'horarios',
    'horario_detalles',
    'usuarios_horarios',
    'dias_no_laborables',
    'ips_autorizadas',
    'tipos_marcacion',
    'marcaciones',
    'intentos_login',
    'intentos_marcacion',
    'asistencia_diaria',
    'justificaciones',
    'sesiones',
    'auditoria',
    'reportes_generados',
    'configuracion_sistema'
];

const REQUIRED_VIEWS = [
    'vista_usuarios_activos',
    'vista_marcaciones_diarias',
    'vista_reporte_asistencia'
];

function getInitSqlPath() {
    return path.join(__dirname, '../../../database/init.sql');
}

async function createRootConnection() {
    return mysql.createConnection({
        host: DB_HOST,
        port: DB_PORT,
        user: DB_USER,
        password: DB_PASSWORD,
        multipleStatements: true,
        dateStrings: true,
        ssl: DB_SSL ? { rejectUnauthorized: true } : undefined
    });
}

async function databaseExists(connection) {
    const [rows] = await connection.query(
        `SELECT SCHEMA_NAME
     FROM INFORMATION_SCHEMA.SCHEMATA
     WHERE SCHEMA_NAME = ?`,
        [DB_NAME]
    );

    return rows.length > 0;
}

async function runInitSql(connection) {
    const initPath = getInitSqlPath();

    if (!fs.existsSync(initPath)) {
        throw new Error(`No se encontró el archivo init.sql en: ${initPath}`);
    }

    const sql = fs.readFileSync(initPath, 'utf8');

    console.log('Creando base de datos desde database/init.sql...');
    await connection.query(sql);
    console.log('Base de datos creada correctamente.');
}

async function getExistingObjects(connection, objectType) {
    const [rows] = await connection.query(
        `SELECT TABLE_NAME
     FROM INFORMATION_SCHEMA.TABLES
     WHERE TABLE_SCHEMA = ?
       AND TABLE_TYPE = ?`,
        [DB_NAME, objectType]
    );

    return rows.map((row) => row.TABLE_NAME);
}

async function verifyTables(connection) {
    const existingTables = await getExistingObjects(connection, 'BASE TABLE');
    const missingTables = REQUIRED_TABLES.filter(
        (table) => !existingTables.includes(table)
    );

    return {
        existingTables,
        missingTables
    };
}

async function verifyViews(connection) {
    const existingViews = await getExistingObjects(connection, 'VIEW');
    const missingViews = REQUIRED_VIEWS.filter(
        (view) => !existingViews.includes(view)
    );

    return {
        existingViews,
        missingViews
    };
}

async function verifyInitialData(connection) {
    const checks = [];

    const [[roles]] = await connection.query(
        `SELECT COUNT(*) AS total FROM ${mysql.escapeId(DB_NAME)}.roles`
    );

    checks.push({
        name: 'roles',
        ok: Number(roles.total) > 0,
        message: `Roles registrados: ${roles.total}`
    });

    const [[tiposMarcacion]] = await connection.query(
        `SELECT COUNT(*) AS total FROM ${mysql.escapeId(DB_NAME)}.tipos_marcacion`
    );

    checks.push({
        name: 'tipos_marcacion',
        ok: Number(tiposMarcacion.total) >= 4,
        message: `Tipos de marcación registrados: ${tiposMarcacion.total}`
    });

    const [[usuarios]] = await connection.query(
        `SELECT COUNT(*) AS total FROM ${mysql.escapeId(DB_NAME)}.usuarios`
    );

    checks.push({
        name: 'usuarios',
        ok: Number(usuarios.total) > 0,
        message: `Usuarios registrados: ${usuarios.total}`
    });

    const [[horarios]] = await connection.query(
        `SELECT COUNT(*) AS total FROM ${mysql.escapeId(DB_NAME)}.horarios`
    );

    checks.push({
        name: 'horarios',
        ok: Number(horarios.total) > 0,
        message: `Horarios registrados: ${horarios.total}`
    });

    return checks;
}

async function ensureDatabase() {
    let connection;

    try {
        connection = await createRootConnection();

        console.log('Verificando conexión con MySQL...');
        await connection.query('SELECT 1');
        console.log('Conexión con MySQL correcta.');

        const exists = await databaseExists(connection);

        if (!exists) {
            console.log(`La base de datos ${DB_NAME} no existe.`);
            await runInitSql(connection);
            return;
        }

        console.log(`La base de datos ${DB_NAME} ya existe. Verificando estructura...`);

        const tableResult = await verifyTables(connection);
        const viewResult = await verifyViews(connection);

        if (tableResult.missingTables.length > 0 || viewResult.missingViews.length > 0) {
            console.error('La base de datos existe, pero está incompleta.');

            if (tableResult.missingTables.length > 0) {
                console.error('Tablas faltantes:');
                tableResult.missingTables.forEach((table) => {
                    console.error(`- ${table}`);
                });
            }

            if (viewResult.missingViews.length > 0) {
                console.error('Vistas faltantes:');
                viewResult.missingViews.forEach((view) => {
                    console.error(`- ${view}`);
                });
            }

            if (String(process.env.AUTO_REPAIR_DB || '').toLowerCase() === 'true') {
                console.warn('AUTO_REPAIR_DB=true detectado. Se recreará la base de datos.');
                console.warn('Advertencia: esto elimina los datos existentes porque init.sql contiene DROP DATABASE.');
                await runInitSql(connection);
                return;
            }

            throw new Error(
                'La base de datos está incompleta. Revísala manualmente o usa AUTO_REPAIR_DB=true para recrearla.'
            );
        }

        const dataChecks = await verifyInitialData(connection);
        const failedChecks = dataChecks.filter((check) => !check.ok);

        console.log('Verificación de datos iniciales:');
        dataChecks.forEach((check) => {
            console.log(`- ${check.message}`);
        });

        if (failedChecks.length > 0) {
            console.error('La base existe, pero faltan datos iniciales importantes.');

            failedChecks.forEach((check) => {
                console.error(`- ${check.name}`);
            });

            throw new Error('Datos iniciales incompletos.');
        }

        console.log('Base de datos verificada correctamente.');
    } finally {
        if (connection) {
            await connection.end();
        }
    }
}

if (require.main === module) {
    ensureDatabase()
        .then(() => {
            console.log('Inicialización finalizada.');
            process.exit(0);
        })
        .catch((error) => {
            console.error('Error inicializando la base de datos:');
            console.error(error.message);
            process.exit(1);
        });
}

module.exports = {
    ensureDatabase
};
