DROP DATABASE IF EXISTS sistema_asistencia_columbe;
CREATE DATABASE sistema_asistencia_columbe
CHARACTER SET utf8mb4
COLLATE utf8mb4_unicode_ci;

USE sistema_asistencia_columbe;

SET NAMES utf8mb4;
SET time_zone = '-05:00';

-- ============================================================
-- SISTEMA DE CONTROL DE JORNADA LABORAL
-- GAD PARROQUIAL RURAL DE COLUMBE
-- TECNOLOGÍAS: HTML, CSS, JS, NODE.JS, MYSQL
-- ============================================================

-- ============================================================
-- 1. INSTITUCIÓN
-- ============================================================

CREATE TABLE instituciones (
    id_institucion INT AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(180) NOT NULL,
    ruc VARCHAR(13),
    provincia VARCHAR(80),
    canton VARCHAR(80),
    parroquia VARCHAR(80),
    direccion VARCHAR(250),
    telefono VARCHAR(30),
    correo VARCHAR(120),
    sitio_web VARCHAR(180),
    estado TINYINT(1) DEFAULT 1,
    fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    fecha_actualizacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- ============================================================
-- 2. ROLES
-- ============================================================

CREATE TABLE roles (
    id_rol INT AUTO_INCREMENT PRIMARY KEY,
    nombre_rol VARCHAR(50) NOT NULL UNIQUE,
    descripcion VARCHAR(250),
    estado TINYINT(1) DEFAULT 1,
    fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================
-- 3. PERMISOS
-- ============================================================

CREATE TABLE permisos (
    id_permiso INT AUTO_INCREMENT PRIMARY KEY,
    codigo_permiso VARCHAR(80) NOT NULL UNIQUE,
    nombre_permiso VARCHAR(120) NOT NULL,
    descripcion VARCHAR(250),
    fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE roles_permisos (
    id_rol_permiso INT AUTO_INCREMENT PRIMARY KEY,
    id_rol INT NOT NULL,
    id_permiso INT NOT NULL,
    fecha_asignacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    UNIQUE (id_rol, id_permiso),

    CONSTRAINT fk_roles_permisos_rol
        FOREIGN KEY (id_rol) REFERENCES roles(id_rol)
        ON UPDATE CASCADE ON DELETE RESTRICT,

    CONSTRAINT fk_roles_permisos_permiso
        FOREIGN KEY (id_permiso) REFERENCES permisos(id_permiso)
        ON UPDATE CASCADE ON DELETE RESTRICT
);

-- ============================================================
-- 4. DEPARTAMENTOS
-- ============================================================

CREATE TABLE departamentos (
    id_departamento INT AUTO_INCREMENT PRIMARY KEY,
    nombre_departamento VARCHAR(120) NOT NULL UNIQUE,
    descripcion VARCHAR(250),
    estado TINYINT(1) DEFAULT 1,
    fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================
-- 5. CARGOS
-- ============================================================

CREATE TABLE cargos (
    id_cargo INT AUTO_INCREMENT PRIMARY KEY,
    nombre_cargo VARCHAR(150) NOT NULL UNIQUE,
    descripcion VARCHAR(250),
    estado TINYINT(1) DEFAULT 1,
    fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================
-- 6. USUARIOS / FUNCIONARIOS
-- Contraseña guardada con SHA2.
-- El usuario de acceso será la cédula.
-- ============================================================

CREATE TABLE usuarios (
    id_usuario INT AUTO_INCREMENT PRIMARY KEY,

    cedula VARCHAR(10) NOT NULL UNIQUE,
    usuario VARCHAR(20) NOT NULL UNIQUE,

    primer_apellido VARCHAR(80) NOT NULL,
    segundo_apellido VARCHAR(80),
    primer_nombre VARCHAR(80) NOT NULL,
    segundo_nombre VARCHAR(80),

    correo VARCHAR(120),
    telefono VARCHAR(30),

    id_rol INT NOT NULL,
    id_departamento INT,
    id_cargo INT,

    password_hash CHAR(64) NOT NULL,
    algoritmo_password VARCHAR(20) DEFAULT 'SHA256',

    estado ENUM('ACTIVO', 'INACTIVO', 'BLOQUEADO') DEFAULT 'ACTIVO',

    ultimo_login DATETIME,
    intentos_fallidos INT DEFAULT 0,

    fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    fecha_actualizacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    CONSTRAINT fk_usuarios_roles
        FOREIGN KEY (id_rol) REFERENCES roles(id_rol)
        ON UPDATE CASCADE ON DELETE RESTRICT,

    CONSTRAINT fk_usuarios_departamentos
        FOREIGN KEY (id_departamento) REFERENCES departamentos(id_departamento)
        ON UPDATE CASCADE ON DELETE SET NULL,

    CONSTRAINT fk_usuarios_cargos
        FOREIGN KEY (id_cargo) REFERENCES cargos(id_cargo)
        ON UPDATE CASCADE ON DELETE SET NULL
);

-- ============================================================
-- 7. HORARIOS LABORALES
-- ============================================================

CREATE TABLE horarios (
    id_horario INT AUTO_INCREMENT PRIMARY KEY,
    nombre_horario VARCHAR(120) NOT NULL UNIQUE,
    descripcion VARCHAR(250),
    tolerancia_entrada_minutos INT DEFAULT 10,
    tolerancia_retorno_almuerzo_minutos INT DEFAULT 10,
    estado TINYINT(1) DEFAULT 1,
    fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE horario_detalles (
    id_horario_detalle INT AUTO_INCREMENT PRIMARY KEY,
    id_horario INT NOT NULL,

    -- 1=Lunes, 2=Martes, 3=Miércoles, 4=Jueves, 5=Viernes, 6=Sábado, 7=Domingo
    dia_semana TINYINT NOT NULL,

    es_laborable TINYINT(1) DEFAULT 1,

    hora_entrada TIME,
    hora_salida_almuerzo TIME,
    hora_retorno_almuerzo TIME,
    hora_salida TIME,

    CONSTRAINT fk_horario_detalles_horario
        FOREIGN KEY (id_horario) REFERENCES horarios(id_horario)
        ON UPDATE CASCADE ON DELETE CASCADE,

    UNIQUE (id_horario, dia_semana),

    CHECK (dia_semana BETWEEN 1 AND 7)
);

CREATE TABLE usuarios_horarios (
    id_usuario_horario INT AUTO_INCREMENT PRIMARY KEY,
    id_usuario INT NOT NULL,
    id_horario INT NOT NULL,
    fecha_inicio DATE NOT NULL,
    fecha_fin DATE,
    estado TINYINT(1) DEFAULT 1,
    fecha_asignacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_usuarios_horarios_usuario
        FOREIGN KEY (id_usuario) REFERENCES usuarios(id_usuario)
        ON UPDATE CASCADE ON DELETE RESTRICT,

    CONSTRAINT fk_usuarios_horarios_horario
        FOREIGN KEY (id_horario) REFERENCES horarios(id_horario)
        ON UPDATE CASCADE ON DELETE RESTRICT
);

-- ============================================================
-- 8. DÍAS NO LABORABLES / FERIADOS
-- ============================================================

CREATE TABLE dias_no_laborables (
    id_dia_no_laborable INT AUTO_INCREMENT PRIMARY KEY,
    fecha DATE NOT NULL UNIQUE,
    nombre VARCHAR(150) NOT NULL,
    descripcion VARCHAR(250),
    tipo ENUM(
        'FERIADO_NACIONAL',
        'FERIADO_LOCAL',
        'SUSPENSION_INSTITUCIONAL',
        'OTRO'
    ) DEFAULT 'OTRO',
    estado TINYINT(1) DEFAULT 1,
    fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================
-- 9. IPS AUTORIZADAS
-- ============================================================

CREATE TABLE ips_autorizadas (
    id_ip_autorizada INT AUTO_INCREMENT PRIMARY KEY,

    nombre_red VARCHAR(120) NOT NULL,
    descripcion VARCHAR(250),

    tipo ENUM('IP_EXACTA', 'RANGO_IP', 'CIDR') DEFAULT 'IP_EXACTA',

    ip_inicio VARCHAR(45) NOT NULL,
    ip_fin VARCHAR(45),
    cidr VARCHAR(50),

    estado TINYINT(1) DEFAULT 1,

    fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    fecha_actualizacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- ============================================================
-- 10. TIPOS DE MARCACIÓN
-- ============================================================

CREATE TABLE tipos_marcacion (
    id_tipo_marcacion INT AUTO_INCREMENT PRIMARY KEY,
    codigo VARCHAR(50) NOT NULL UNIQUE,
    nombre VARCHAR(120) NOT NULL,
    orden_marcacion INT NOT NULL,
    descripcion VARCHAR(250),
    estado TINYINT(1) DEFAULT 1
);

-- ============================================================
-- 11. MARCACIONES
-- ============================================================

CREATE TABLE marcaciones (
    id_marcacion INT AUTO_INCREMENT PRIMARY KEY,

    id_usuario INT NOT NULL,
    id_tipo_marcacion INT NOT NULL,
    id_ip_autorizada INT,

    fecha_marcacion DATE NOT NULL,
    hora_marcacion TIME NOT NULL,
    fecha_hora_servidor DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    ip_origen VARCHAR(45) NOT NULL,
    user_agent TEXT,

    estado_marcacion ENUM(
        'VALIDA',
        'ATRASO',
        'FUERA_DE_HORARIO',
        'INCOMPLETA',
        'ANULADA'
    ) DEFAULT 'VALIDA',

    minutos_atraso INT DEFAULT 0,
    observacion VARCHAR(250),

    registrado_por INT,
    fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_marcaciones_usuario
        FOREIGN KEY (id_usuario) REFERENCES usuarios(id_usuario)
        ON UPDATE CASCADE ON DELETE RESTRICT,

    CONSTRAINT fk_marcaciones_tipo
        FOREIGN KEY (id_tipo_marcacion) REFERENCES tipos_marcacion(id_tipo_marcacion)
        ON UPDATE CASCADE ON DELETE RESTRICT,

    CONSTRAINT fk_marcaciones_ip
        FOREIGN KEY (id_ip_autorizada) REFERENCES ips_autorizadas(id_ip_autorizada)
        ON UPDATE CASCADE ON DELETE SET NULL,

    CONSTRAINT fk_marcaciones_registrado_por
        FOREIGN KEY (registrado_por) REFERENCES usuarios(id_usuario)
        ON UPDATE CASCADE ON DELETE SET NULL,

    UNIQUE (id_usuario, fecha_marcacion, id_tipo_marcacion)
);

-- ============================================================
-- 12. INTENTOS DE LOGIN
-- ============================================================

CREATE TABLE intentos_login (
    id_intento_login INT AUTO_INCREMENT PRIMARY KEY,

    cedula_ingresada VARCHAR(20),
    id_usuario INT,

    fecha_hora_intento DATETIME DEFAULT CURRENT_TIMESTAMP,
    ip_origen VARCHAR(45),
    user_agent TEXT,

    resultado ENUM(
        'CORRECTO',
        'CEDULA_NO_EXISTE',
        'PASSWORD_INCORRECTO',
        'USUARIO_INACTIVO',
        'USUARIO_BLOQUEADO',
        'ERROR_SISTEMA'
    ) NOT NULL,

    mensaje VARCHAR(250),

    CONSTRAINT fk_intentos_login_usuario
        FOREIGN KEY (id_usuario) REFERENCES usuarios(id_usuario)
        ON UPDATE CASCADE ON DELETE SET NULL
);

-- ============================================================
-- 13. INTENTOS DE MARCACIÓN
-- Aquí se guardan intentos permitidos y bloqueados.
-- Sirve para registrar intentos desde IP no autorizada.
-- ============================================================

CREATE TABLE intentos_marcacion (
    id_intento_marcacion INT AUTO_INCREMENT PRIMARY KEY,

    id_usuario INT,
    cedula_ingresada VARCHAR(20),
    id_tipo_marcacion INT,

    fecha_hora_intento DATETIME DEFAULT CURRENT_TIMESTAMP,
    ip_origen VARCHAR(45) NOT NULL,
    user_agent TEXT,

    resultado ENUM(
        'PERMITIDO',
        'IP_NO_AUTORIZADA',
        'USUARIO_NO_EXISTE',
        'USUARIO_INACTIVO',
        'MARCACION_REPETIDA',
        'SECUENCIA_INVALIDA',
        'DIA_NO_LABORABLE',
        'ERROR_SISTEMA'
    ) NOT NULL,

    mensaje VARCHAR(250),

    CONSTRAINT fk_intentos_marcacion_usuario
        FOREIGN KEY (id_usuario) REFERENCES usuarios(id_usuario)
        ON UPDATE CASCADE ON DELETE SET NULL,

    CONSTRAINT fk_intentos_marcacion_tipo
        FOREIGN KEY (id_tipo_marcacion) REFERENCES tipos_marcacion(id_tipo_marcacion)
        ON UPDATE CASCADE ON DELETE SET NULL
);

-- ============================================================
-- 14. ASISTENCIA DIARIA
-- Esta tabla se puede llenar desde Node.js al cerrar o consultar el día.
-- ============================================================

CREATE TABLE asistencia_diaria (
    id_asistencia_diaria INT AUTO_INCREMENT PRIMARY KEY,

    id_usuario INT NOT NULL,
    fecha DATE NOT NULL,

    hora_entrada TIME,
    hora_salida_almuerzo TIME,
    hora_retorno_almuerzo TIME,
    hora_salida TIME,

    estado_dia ENUM(
        'COMPLETO',
        'INCOMPLETO',
        'ATRASO',
        'FALTA',
        'PERMISO',
        'JUSTIFICADO',
        'FERIADO',
        'NO_LABORABLE'
    ) DEFAULT 'INCOMPLETO',

    minutos_atraso INT DEFAULT 0,
    minutos_trabajados INT DEFAULT 0,

    observacion VARCHAR(250),

    fecha_generacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    fecha_actualizacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    CONSTRAINT fk_asistencia_diaria_usuario
        FOREIGN KEY (id_usuario) REFERENCES usuarios(id_usuario)
        ON UPDATE CASCADE ON DELETE RESTRICT,

    UNIQUE (id_usuario, fecha)
);

-- ============================================================
-- 15. JUSTIFICACIONES
-- ============================================================

CREATE TABLE justificaciones (
    id_justificacion INT AUTO_INCREMENT PRIMARY KEY,

    id_usuario INT NOT NULL,

    fecha_inicio DATE NOT NULL,
    fecha_fin DATE NOT NULL,

    tipo ENUM(
        'PERMISO_PERSONAL',
        'PERMISO_MEDICO',
        'VACACIONES',
        'CALAMIDAD_DOMESTICA',
        'COMISION_SERVICIOS',
        'OTRO'
    ) NOT NULL,

    motivo TEXT NOT NULL,
    archivo_respaldo VARCHAR(255),

    estado ENUM('PENDIENTE', 'APROBADA', 'RECHAZADA') DEFAULT 'PENDIENTE',

    solicitado_por INT,
    revisado_por INT,

    fecha_solicitud TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    fecha_revision DATETIME,
    observacion_revision VARCHAR(250),

    CONSTRAINT fk_justificaciones_usuario
        FOREIGN KEY (id_usuario) REFERENCES usuarios(id_usuario)
        ON UPDATE CASCADE ON DELETE RESTRICT,

    CONSTRAINT fk_justificaciones_solicitado_por
        FOREIGN KEY (solicitado_por) REFERENCES usuarios(id_usuario)
        ON UPDATE CASCADE ON DELETE SET NULL,

    CONSTRAINT fk_justificaciones_revisado_por
        FOREIGN KEY (revisado_por) REFERENCES usuarios(id_usuario)
        ON UPDATE CASCADE ON DELETE SET NULL
);

-- ============================================================
-- 16. SESIONES
-- ============================================================

CREATE TABLE sesiones (
    id_sesion INT AUTO_INCREMENT PRIMARY KEY,

    id_usuario INT NOT NULL,
    token_hash VARCHAR(255),

    ip_origen VARCHAR(45),
    user_agent TEXT,

    fecha_inicio DATETIME DEFAULT CURRENT_TIMESTAMP,
    fecha_fin DATETIME,

    estado ENUM('ACTIVA', 'CERRADA', 'EXPIRADA') DEFAULT 'ACTIVA',

    CONSTRAINT fk_sesiones_usuario
        FOREIGN KEY (id_usuario) REFERENCES usuarios(id_usuario)
        ON UPDATE CASCADE ON DELETE CASCADE
);

-- ============================================================
-- 17. AUDITORÍA
-- ============================================================

CREATE TABLE auditoria (
    id_auditoria INT AUTO_INCREMENT PRIMARY KEY,

    id_usuario INT,
    accion VARCHAR(120) NOT NULL,
    tabla_afectada VARCHAR(120),
    id_registro_afectado INT,

    descripcion TEXT,
    datos_anteriores JSON,
    datos_nuevos JSON,

    ip_origen VARCHAR(45),
    user_agent TEXT,

    fecha_hora DATETIME DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_auditoria_usuario
        FOREIGN KEY (id_usuario) REFERENCES usuarios(id_usuario)
        ON UPDATE CASCADE ON DELETE SET NULL
);

-- ============================================================
-- 18. REPORTES GENERADOS
-- ============================================================

CREATE TABLE reportes_generados (
    id_reporte INT AUTO_INCREMENT PRIMARY KEY,

    generado_por INT NOT NULL,

    tipo_reporte ENUM(
        'ASISTENCIA_DIARIA',
        'ASISTENCIA_MENSUAL',
        'ATRASOS',
        'FALTAS',
        'MARCACIONES_INCOMPLETAS',
        'REPORTE_GENERAL'
    ) NOT NULL,

    fecha_inicio DATE,
    fecha_fin DATE,

    formato ENUM('PDF', 'EXCEL', 'CSV', 'PANTALLA') DEFAULT 'PANTALLA',

    parametros JSON,
    ruta_archivo VARCHAR(255),

    fecha_generacion DATETIME DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_reportes_generado_por
        FOREIGN KEY (generado_por) REFERENCES usuarios(id_usuario)
        ON UPDATE CASCADE ON DELETE RESTRICT
);

-- ============================================================
-- 19. CONFIGURACIÓN GENERAL
-- ============================================================

CREATE TABLE configuracion_sistema (
    id_configuracion INT AUTO_INCREMENT PRIMARY KEY,
    clave VARCHAR(100) NOT NULL UNIQUE,
    valor VARCHAR(250) NOT NULL,
    descripcion VARCHAR(250),
    fecha_actualizacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- ============================================================
-- 20. ÍNDICES
-- ============================================================

CREATE INDEX idx_usuarios_cedula ON usuarios(cedula);
CREATE INDEX idx_usuarios_estado ON usuarios(estado);

CREATE INDEX idx_marcaciones_usuario_fecha ON marcaciones(id_usuario, fecha_marcacion);
CREATE INDEX idx_marcaciones_fecha ON marcaciones(fecha_marcacion);
CREATE INDEX idx_marcaciones_tipo ON marcaciones(id_tipo_marcacion);

CREATE INDEX idx_intentos_login_fecha ON intentos_login(fecha_hora_intento);
CREATE INDEX idx_intentos_marcacion_fecha ON intentos_marcacion(fecha_hora_intento);

CREATE INDEX idx_asistencia_fecha ON asistencia_diaria(fecha);
CREATE INDEX idx_asistencia_usuario_fecha ON asistencia_diaria(id_usuario, fecha);

CREATE INDEX idx_auditoria_fecha ON auditoria(fecha_hora);
CREATE INDEX idx_auditoria_usuario ON auditoria(id_usuario);

-- ============================================================
-- 21. DATOS INICIALES: INSTITUCIÓN
-- ============================================================

INSERT INTO instituciones (
    nombre,
    provincia,
    canton,
    parroquia,
    sitio_web,
    estado
) VALUES (
    'Gobierno Autónomo Descentralizado Parroquial Rural de Columbe',
    'Chimborazo',
    'Colta',
    'Columbe',
    'https://columbe.gob.ec/',
    1
);

-- ============================================================
-- 22. DATOS INICIALES: ROLES
-- ============================================================

INSERT INTO roles (nombre_rol, descripcion) VALUES
('ADMINISTRADOR', 'Control total del sistema'),
('TALENTO_HUMANO', 'Gestión de usuarios, asistencia, horarios y reportes'),
('FUNCIONARIO', 'Usuario que realiza sus marcaciones laborales'),
('CONSULTA', 'Usuario con permiso únicamente de consulta de reportes');

-- ============================================================
-- 23. DATOS INICIALES: PERMISOS
-- ============================================================

INSERT INTO permisos (codigo_permiso, nombre_permiso, descripcion) VALUES
('ACCESO_ADMIN', 'Acceso al panel administrativo', 'Permite ingresar al panel administrativo'),
('GESTIONAR_USUARIOS', 'Gestionar usuarios', 'Crear, editar, activar, bloquear o desactivar usuarios'),
('GESTIONAR_HORARIOS', 'Gestionar horarios', 'Crear, editar y asignar horarios laborales'),
('GESTIONAR_IPS', 'Gestionar IPs autorizadas', 'Administrar IPs o rangos de red autorizados'),
('REALIZAR_MARCACION', 'Realizar marcación', 'Registrar entrada, salida a almuerzo, retorno y salida final'),
('VER_MIS_MARCACIONES', 'Ver mis marcaciones', 'Permite al funcionario consultar su historial personal'),
('VER_REPORTES', 'Ver reportes', 'Consultar reportes de asistencia, atrasos y faltas'),
('EXPORTAR_REPORTES', 'Exportar reportes', 'Exportar reportes a PDF, Excel o CSV'),
('GESTIONAR_JUSTIFICACIONES', 'Gestionar justificaciones', 'Crear, aprobar o rechazar justificaciones'),
('VER_AUDITORIA', 'Ver auditoría', 'Consultar acciones realizadas dentro del sistema');

-- ADMINISTRADOR: todos los permisos
INSERT INTO roles_permisos (id_rol, id_permiso)
SELECT 
    (SELECT id_rol FROM roles WHERE nombre_rol = 'ADMINISTRADOR'),
    id_permiso
FROM permisos;

-- TALENTO HUMANO
INSERT INTO roles_permisos (id_rol, id_permiso)
SELECT 
    (SELECT id_rol FROM roles WHERE nombre_rol = 'TALENTO_HUMANO'),
    id_permiso
FROM permisos
WHERE codigo_permiso IN (
    'ACCESO_ADMIN',
    'GESTIONAR_USUARIOS',
    'GESTIONAR_HORARIOS',
    'GESTIONAR_IPS',
    'VER_REPORTES',
    'EXPORTAR_REPORTES',
    'GESTIONAR_JUSTIFICACIONES'
);

-- FUNCIONARIO
INSERT INTO roles_permisos (id_rol, id_permiso)
SELECT 
    (SELECT id_rol FROM roles WHERE nombre_rol = 'FUNCIONARIO'),
    id_permiso
FROM permisos
WHERE codigo_permiso IN (
    'REALIZAR_MARCACION',
    'VER_MIS_MARCACIONES'
);

-- CONSULTA
INSERT INTO roles_permisos (id_rol, id_permiso)
SELECT 
    (SELECT id_rol FROM roles WHERE nombre_rol = 'CONSULTA'),
    id_permiso
FROM permisos
WHERE codigo_permiso IN (
    'VER_REPORTES'
);

-- ============================================================
-- 24. DATOS INICIALES: DEPARTAMENTOS
-- ============================================================

INSERT INTO departamentos (nombre_departamento, descripcion) VALUES
('Presidencia', 'Área de presidencia del GAD Parroquial'),
('Secretaría/Tesorería', 'Área administrativa y financiera'),
('Vocalías', 'Área de vocales principales y alternos'),
('Planificación', 'Área técnica de planificación'),
('Servicios Generales', 'Área de servicios generales'),
('Transporte y Maquinaria', 'Área de choferes, vehículos y maquinaria');

-- ============================================================
-- 25. DATOS INICIALES: CARGOS
-- ============================================================

INSERT INTO cargos (nombre_cargo, descripcion) VALUES
('PRESIDENTE', 'Presidente del GAD Parroquial'),
('SECRETARIO/TESORERO', 'Responsable de secretaría y tesorería'),
('VOCAL PRINCIPAL', 'Vocal principal del GAD Parroquial'),
('VOCAL ALTERNO', 'Vocal alterno del GAD Parroquial'),
('VOCAL ALTERNO PRINCIPALIZADO', 'Vocal alterno principalizado'),
('TECNICO DE PLANIFICACION', 'Técnico encargado de planificación'),
('AUXILIAR DE SERVICIO', 'Auxiliar de servicios generales'),
('OPERADOR DE RETROEXCAVADORA', 'Operador de maquinaria pesada'),
('CHOFER DE VEHICULO', 'Chofer de vehículo institucional'),
('CHOFER DE VOLQUETE', 'Chofer de volquete institucional');

-- ============================================================
-- 26. DATOS INICIALES: HORARIO GENERAL
-- Horario base: lunes a viernes de 08:00 a 16:30
-- Almuerzo: 12:00 a 13:00
-- ============================================================

INSERT INTO horarios (
    nombre_horario,
    descripcion,
    tolerancia_entrada_minutos,
    tolerancia_retorno_almuerzo_minutos
) VALUES (
    'Horario institucional general',
    'Horario general de lunes a viernes, entrada 08:00, almuerzo 12:00 a 13:00, salida 16:30',
    10,
    10
);

INSERT INTO horario_detalles (
    id_horario,
    dia_semana,
    es_laborable,
    hora_entrada,
    hora_salida_almuerzo,
    hora_retorno_almuerzo,
    hora_salida
) VALUES
(1, 1, 1, '08:00:00', '12:00:00', '13:00:00', '16:30:00'),
(1, 2, 1, '08:00:00', '12:00:00', '13:00:00', '16:30:00'),
(1, 3, 1, '08:00:00', '12:00:00', '13:00:00', '16:30:00'),
(1, 4, 1, '08:00:00', '12:00:00', '13:00:00', '16:30:00'),
(1, 5, 1, '08:00:00', '12:00:00', '13:00:00', '16:30:00'),
(1, 6, 0, NULL, NULL, NULL, NULL),
(1, 7, 0, NULL, NULL, NULL, NULL);

-- ============================================================
-- 27. DATOS INICIALES: TIPOS DE MARCACIÓN
-- ============================================================

INSERT INTO tipos_marcacion (codigo, nombre, orden_marcacion, descripcion) VALUES
('ENTRADA', 'Entrada laboral', 1, 'Inicio de la jornada laboral'),
('SALIDA_ALMUERZO', 'Salida a almuerzo', 2, 'Inicio del receso de almuerzo'),
('RETORNO_ALMUERZO', 'Retorno de almuerzo', 3, 'Fin del receso de almuerzo'),
('SALIDA', 'Salida laboral', 4, 'Fin de la jornada laboral');

-- ============================================================
-- 28. DATOS INICIALES: IPs AUTORIZADAS
-- Cambia estas IPs cuando conozcas la red real del GAD.
-- Se incluyen localhost y red local de ejemplo para pruebas.
-- ============================================================

INSERT INTO ips_autorizadas (
    nombre_red,
    descripcion,
    tipo,
    ip_inicio,
    ip_fin,
    cidr,
    estado
) VALUES
(
    'Localhost desarrollo IPv4',
    'Permite pruebas desde la misma computadora del desarrollador',
    'IP_EXACTA',
    '127.0.0.1',
    NULL,
    NULL,
    1
),
(
    'Localhost desarrollo IPv6',
    'Permite pruebas desde localhost IPv6',
    'IP_EXACTA',
    '::1',
    NULL,
    NULL,
    1
),
(
    'Red institucional de ejemplo',
    'Rango de red local de ejemplo. Cambiar según la red real del GAD',
    'RANGO_IP',
    '192.168.1.1',
    '192.168.1.254',
    NULL,
    1
),
(
    'GAD Columbe - IP pública institucional',
    'IP pública institucional detectada mediante Speedtest para permitir marcaciones desde la red del GAD',
    'IP_EXACTA',
    '181.112.225.162',
    NULL,
    NULL,
    1
);

-- ============================================================
-- 29. DATOS INICIALES: FUNCIONARIOS
-- Contraseña inicial: últimos 4 dígitos + primer nombre + primer apellido
-- Todo en mayúscula, sin espacios y sin tildes/ñ en la contraseña.
--
-- Usuarios y contraseñas:
-- 0604462911  / 2911LUISANILEMA
-- 060439159   / 9159EDELBERTOATUPANA
-- 0603263963  / 3963JOSECEPEDA
-- 061487648   / 7648ANACHACHA
-- 060199768   / 9768JOSECHIMBOLEMA
-- 060326232   / 6232JOSECHUCURI
-- 0603209172  / 9172GUILERMOGUALI
-- 060439066   / 9066VICTORGUAMANA
-- 060421853   / 1853JOSENARANJO
-- 060334896   / 4896WILFRIDOPARCO
-- 060389512   / 9512LUISYAMBAY
-- ============================================================
INSERT INTO usuarios (
    cedula,
    usuario,
    primer_apellido,
    segundo_apellido,
    primer_nombre,
    segundo_nombre,
    correo,
    telefono,
    id_rol,
    id_departamento,
    id_cargo,
    password_hash,
    estado
) VALUES
(
    '0604462911',
    '0604462911',
    'ANILEMA',
    'MORALES',
    'LUIS',
    'EDUARDO',
    NULL,
    NULL,
    (SELECT id_rol FROM roles WHERE nombre_rol = 'FUNCIONARIO'),
    (SELECT id_departamento FROM departamentos WHERE nombre_departamento = 'Transporte y Maquinaria'),
    (SELECT id_cargo FROM cargos WHERE nombre_cargo = 'OPERADOR DE RETROEXCAVADORA'),
    SHA2('2911LUISANILEMA', 256),
    'ACTIVO'
),
(
    '060439159',
    '060439159',
    'ATUPAÑA',
    'CHIMBOLEMA',
    'EDELBERTO',
    NULL,
    NULL,
    NULL,
    (SELECT id_rol FROM roles WHERE nombre_rol = 'FUNCIONARIO'),
    (SELECT id_departamento FROM departamentos WHERE nombre_departamento = 'Vocalías'),
    (SELECT id_cargo FROM cargos WHERE nombre_cargo = 'VOCAL ALTERNO PRINCIPALIZADO'),
    SHA2('9159EDELBERTOATUPANA', 256),
    'ACTIVO'
),
(
    '0603263963',
    '0603263963',
    'CEPEDA',
    'GUAMAN',
    'JOSE',
    'IGNACIO',
    NULL,
    NULL,
    (SELECT id_rol FROM roles WHERE nombre_rol = 'ADMINISTRADOR'),
    (SELECT id_departamento FROM departamentos WHERE nombre_departamento = 'Presidencia'),
    (SELECT id_cargo FROM cargos WHERE nombre_cargo = 'PRESIDENTE'),
    SHA2('3963JOSECEPEDA', 256),
    'ACTIVO'
),
(
    '061487648',
    '061487648',
    'CHACHA',
    'RIOS',
    'ANA',
    'LASTENIA',
    NULL,
    NULL,
    (SELECT id_rol FROM roles WHERE nombre_rol = 'FUNCIONARIO'),
    (SELECT id_departamento FROM departamentos WHERE nombre_departamento = 'Servicios Generales'),
    (SELECT id_cargo FROM cargos WHERE nombre_cargo = 'AUXILIAR DE SERVICIO'),
    SHA2('7648ANACHACHA', 256),
    'ACTIVO'
),
(
    '060199768',
    '060199768',
    'CHIMBOLEMA',
    'MORALES',
    'JOSE',
    'DOMINGO',
    NULL,
    NULL,
    (SELECT id_rol FROM roles WHERE nombre_rol = 'FUNCIONARIO'),
    (SELECT id_departamento FROM departamentos WHERE nombre_departamento = 'Vocalías'),
    (SELECT id_cargo FROM cargos WHERE nombre_cargo = 'VOCAL ALTERNO'),
    SHA2('9768JOSECHIMBOLEMA', 256),
    'ACTIVO'
),
(
    '060326232',
    '060326232',
    'CHUCURI',
    'MALAN',
    'JOSE',
    'MANUEL',
    NULL,
    NULL,
    (SELECT id_rol FROM roles WHERE nombre_rol = 'FUNCIONARIO'),
    (SELECT id_departamento FROM departamentos WHERE nombre_departamento = 'Vocalías'),
    (SELECT id_cargo FROM cargos WHERE nombre_cargo = 'VOCAL PRINCIPAL'),
    SHA2('6232JOSECHUCURI', 256),
    'ACTIVO'
),
(
    '0603209172',
    '0603209172',
    'GUALI',
    'AÑALLA',
    'GUILERMO',
    'RAUL',
    NULL,
    NULL,
    (SELECT id_rol FROM roles WHERE nombre_rol = 'FUNCIONARIO'),
    (SELECT id_departamento FROM departamentos WHERE nombre_departamento = 'Planificación'),
    (SELECT id_cargo FROM cargos WHERE nombre_cargo = 'TECNICO DE PLANIFICACION'),
    SHA2('9172GUILERMOGUALI', 256),
    'ACTIVO'
),
(
    '060439066',
    '060439066',
    'GUAMANA',
    'GUALLI',
    'VICTOR',
    'JAIME',
    NULL,
    NULL,
    (SELECT id_rol FROM roles WHERE nombre_rol = 'FUNCIONARIO'),
    (SELECT id_departamento FROM departamentos WHERE nombre_departamento = 'Transporte y Maquinaria'),
    (SELECT id_cargo FROM cargos WHERE nombre_cargo = 'CHOFER DE VEHICULO'),
    SHA2('9066VICTORGUAMANA', 256),
    'ACTIVO'
),
(
    '060421853',
    '060421853',
    'NARANJO',
    'ATUPAÑA',
    'JOSE',
    'MANUEL',
    NULL,
    NULL,
    (SELECT id_rol FROM roles WHERE nombre_rol = 'FUNCIONARIO'),
    (SELECT id_departamento FROM departamentos WHERE nombre_departamento = 'Transporte y Maquinaria'),
    (SELECT id_cargo FROM cargos WHERE nombre_cargo = 'CHOFER DE VOLQUETE'),
    SHA2('1853JOSENARANJO', 256),
    'ACTIVO'
),
(
    '060334896',
    '060334896',
    'PARCO',
    'CHICAIZA',
    'WILFRIDO',
    NULL,
    NULL,
    NULL,
    (SELECT id_rol FROM roles WHERE nombre_rol = 'TALENTO_HUMANO'),
    (SELECT id_departamento FROM departamentos WHERE nombre_departamento = 'Secretaría/Tesorería'),
    (SELECT id_cargo FROM cargos WHERE nombre_cargo = 'SECRETARIO/TESORERO'),
    SHA2('4896WILFRIDOPARCO', 256),
    'ACTIVO'
),
(
    '060389512',
    '060389512',
    'YAMBAY',
    'SATAY',
    'LUIS',
    'FERNANDO',
    NULL,
    NULL,
    (SELECT id_rol FROM roles WHERE nombre_rol = 'FUNCIONARIO'),
    (SELECT id_departamento FROM departamentos WHERE nombre_departamento = 'Vocalías'),
    (SELECT id_cargo FROM cargos WHERE nombre_cargo = 'VOCAL PRINCIPAL'),
    SHA2('9512LUISYAMBAY', 256),
    'ACTIVO'
),
(
    '1750014092',
    '1750014092',
    'CHUMA',
    'MINA GUA',
    'MIRYAM',
    'ALEXANDRA',
    NULL,
    NULL,
    (SELECT id_rol FROM roles WHERE nombre_rol = 'FUNCIONARIO'),
    (SELECT id_departamento FROM departamentos WHERE nombre_departamento = 'Vocalías'),
    (SELECT id_cargo FROM cargos WHERE nombre_cargo = 'VOCAL PRINCIPAL'),
    SHA2('4092MIRYAMCHUMA', 256),
    'ACTIVO'
);
-- ============================================================
-- 30. ASIGNACIÓN DE HORARIO GENERAL A TODOS LOS USUARIOS
-- ============================================================

INSERT INTO usuarios_horarios (
    id_usuario,
    id_horario,
    fecha_inicio,
    fecha_fin,
    estado
)
SELECT 
    id_usuario,
    (SELECT id_horario FROM horarios WHERE nombre_horario = 'Horario institucional general'),
    '2026-01-01',
    NULL,
    1
FROM usuarios;

-- ============================================================
-- 31. CONFIGURACIÓN DEL SISTEMA
-- ============================================================

INSERT INTO configuracion_sistema (clave, valor, descripcion) VALUES
('NOMBRE_SISTEMA', 'Sistema de Control de Jornada Laboral GAD Columbe', 'Nombre visible del sistema'),
('ZONA_HORARIA', 'America/Guayaquil', 'Zona horaria usada por el servidor'),
('VALIDAR_IP', '1', '1 = validar IP institucional, 0 = no validar'),
('PERMITIR_MARCACION_MOVIL', '1', 'Permite marcación desde dispositivos móviles conectados a la red institucional'),
('TOLERANCIA_ENTRADA_MINUTOS', '10', 'Minutos permitidos antes de registrar atraso'),
('TOLERANCIA_RETORNO_ALMUERZO_MINUTOS', '10', 'Minutos permitidos para retorno de almuerzo'),
('FORMATO_PASSWORD_INICIAL', 'ULTIMOS4CEDULA + PRIMERNOMBRE + PRIMERAPELLIDO', 'Formato usado para las contraseñas iniciales'),
('ALGORITMO_PASSWORD', 'SHA256', 'Algoritmo usado para guardar la contraseña en la base de datos');

-- ============================================================
-- 32. VISTAS PARA CONSULTAS Y REPORTES
-- ============================================================

CREATE VIEW vista_usuarios_activos AS
SELECT 
    u.id_usuario,
    u.cedula,
    u.usuario,
    CONCAT_WS(' ', u.primer_apellido, u.segundo_apellido, u.primer_nombre, u.segundo_nombre) AS nombre_completo,
    u.primer_apellido,
    u.segundo_apellido,
    u.primer_nombre,
    u.segundo_nombre,
    r.nombre_rol,
    d.nombre_departamento,
    c.nombre_cargo,
    u.estado
FROM usuarios u
INNER JOIN roles r ON u.id_rol = r.id_rol
LEFT JOIN departamentos d ON u.id_departamento = d.id_departamento
LEFT JOIN cargos c ON u.id_cargo = c.id_cargo
WHERE u.estado = 'ACTIVO';

CREATE VIEW vista_marcaciones_diarias AS
SELECT 
    u.id_usuario,
    u.cedula,
    CONCAT_WS(' ', u.primer_apellido, u.segundo_apellido, u.primer_nombre, u.segundo_nombre) AS funcionario,
    d.nombre_departamento,
    c.nombre_cargo,
    m.fecha_marcacion,

    MAX(CASE WHEN tm.codigo = 'ENTRADA' THEN m.hora_marcacion END) AS entrada,
    MAX(CASE WHEN tm.codigo = 'SALIDA_ALMUERZO' THEN m.hora_marcacion END) AS salida_almuerzo,
    MAX(CASE WHEN tm.codigo = 'RETORNO_ALMUERZO' THEN m.hora_marcacion END) AS retorno_almuerzo,
    MAX(CASE WHEN tm.codigo = 'SALIDA' THEN m.hora_marcacion END) AS salida,

    SUM(m.minutos_atraso) AS total_minutos_atraso,
    COUNT(m.id_marcacion) AS total_marcaciones

FROM usuarios u
LEFT JOIN departamentos d ON u.id_departamento = d.id_departamento
LEFT JOIN cargos c ON u.id_cargo = c.id_cargo
LEFT JOIN marcaciones m ON u.id_usuario = m.id_usuario
LEFT JOIN tipos_marcacion tm ON m.id_tipo_marcacion = tm.id_tipo_marcacion
GROUP BY 
    u.id_usuario,
    u.cedula,
    u.primer_apellido,
    u.segundo_apellido,
    u.primer_nombre,
    u.segundo_nombre,
    d.nombre_departamento,
    c.nombre_cargo,
    m.fecha_marcacion;

CREATE VIEW vista_reporte_asistencia AS
SELECT 
    ad.id_asistencia_diaria,
    u.id_usuario,
    u.cedula,
    CONCAT_WS(' ', u.primer_apellido, u.segundo_apellido, u.primer_nombre, u.segundo_nombre) AS funcionario,
    d.nombre_departamento,
    c.nombre_cargo,
    ad.fecha,
    ad.hora_entrada,
    ad.hora_salida_almuerzo,
    ad.hora_retorno_almuerzo,
    ad.hora_salida,
    ad.estado_dia,
    ad.minutos_atraso,
    ad.minutos_trabajados,
    ad.observacion
FROM asistencia_diaria ad
INNER JOIN usuarios u ON ad.id_usuario = u.id_usuario
LEFT JOIN departamentos d ON u.id_departamento = d.id_departamento
LEFT JOIN cargos c ON u.id_cargo = c.id_cargo;

-- ============================================================
-- 33. CONSULTAS DE VERIFICACIÓN
-- ============================================================

SELECT 'BASE DE DATOS CREADA CORRECTAMENTE' AS mensaje;

SELECT 
    cedula AS usuario,
    CONCAT_WS(' ', primer_apellido, segundo_apellido, primer_nombre, segundo_nombre) AS funcionario,
    (SELECT nombre_rol FROM roles WHERE roles.id_rol = usuarios.id_rol) AS rol
FROM usuarios
ORDER BY id_usuario;