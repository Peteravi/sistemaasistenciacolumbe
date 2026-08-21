# Sistema de Control de Jornada Laboral - GAD Parroquial Rural de Columbe

Sistema web para el control automatizado de jornada laboral mediante marcaciones de entrada, salida a almuerzo, retorno de almuerzo y salida laboral, con autenticación de usuarios, validación por IP institucional, almacenamiento en MySQL y generación de reportes.

---

## 1. Descripción del proyecto

El sistema permite registrar y controlar la asistencia del personal del Gobierno Autónomo Descentralizado Parroquial Rural de Columbe.

La solución reemplaza el registro manual en hojas físicas por una plataforma web que permite:

- Iniciar sesión con cédula y contraseña.
- Registrar marcaciones laborales.
- Validar que las marcaciones se realicen desde una IP autorizada.
- Usar la fecha y hora del servidor.
- Gestionar usuarios, roles, cargos, departamentos, horarios e IPs autorizadas.
- Generar reportes de asistencia, atrasos, faltas y marcaciones incompletas.
- Exportar e imprimir reportes.

---

## 2. Tecnologías utilizadas

### Frontend

- HTML5
- CSS3
- JavaScript

### Backend

- Node.js
- Express.js
- JWT para autenticación
- MySQL2 para conexión con base de datos

### Base de datos

- MySQL

---

## 3. Estructura del proyecto

```text
sistema_asistencia_columbe/
│
├── backend/
│   ├── src/
│   │   ├── config/
│   │   │   ├── db.js
│   │   │   └── env.js
│   │   ├── middlewares/
│   │   ├── routes/
│   │   ├── services/
│   │   ├── utils/
│   │   ├── app.js
│   │   └── server.js
│   │
│   ├── package.json
│   └── .env
│
├── database/
│   └── init.sql
│
├── frontend/
│   ├── css/
│   │   └── styles.css
│   ├── js/
│   │   ├── admin.js
│   │   ├── auth.js
│   │   ├── config.js
│   │   ├── marcaciones.js
│   │   └── reportes.js
│   ├── index.html
│   ├── marcaciones.html
│   ├── admin.html
│   └── reportes.html
│
└── README.md
```

---

## 4. Requisitos previos

Antes de ejecutar el sistema, se debe tener instalado:

- Node.js versión 18 o superior.
- MySQL Server.
- MySQL Workbench o cualquier gestor de base de datos MySQL.
- Visual Studio Code o editor de código similar.

Para verificar Node.js:

```bash
node -v
```

Para verificar npm:

```bash
npm -v
```

---

## 5. Instalación de la base de datos MySQL

### Paso 1: Abrir MySQL Workbench

Ingresar a MySQL Workbench con el usuario administrador, normalmente:

```text
Usuario: root
Contraseña: la contraseña configurada al instalar MySQL
```

### Paso 2: Ejecutar el script de base de datos

Abrir el archivo:

```text
database/init.sql
```

Ejecutarlo completo en MySQL Workbench.

Este script crea la base de datos:

```sql
sistema_asistencia_columbe
```

También crea las tablas, roles, permisos, usuarios iniciales, horarios, cargos, departamentos, IPs autorizadas y configuraciones del sistema.

### Paso 3: Verificar que la base de datos fue creada

Ejecutar:

```sql
SHOW DATABASES;
```

Debe aparecer:

```text
sistema_asistencia_columbe
```

Luego ejecutar:

```sql
USE sistema_asistencia_columbe;

SHOW TABLES;
```

---

## 6. Configuración del backend

Entrar a la carpeta del backend:

```bash
cd backend
```

Crear o revisar el archivo:

```text
.env
```

El contenido recomendado es:

```env
PORT=3000
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=tu_contraseña_mysql
DB_NAME=sistema_asistencia_columbe
JWT_SECRET=cambia_esta_clave_por_una_mas_segura
JWT_EXPIRES_IN=8h
TZ=America/Guayaquil
```

### Importante sobre el puerto de MySQL

Si MySQL está usando el puerto normal, dejar:

```env
DB_PORT=3306
```

Si MySQL está configurado en el puerto 3307, cambiar a:

```env
DB_PORT=3307
```

Ejemplo:

```env
DB_PORT=3307
```

---

## 7. Instalación de dependencias del backend

Desde la carpeta:

```bash
backend
```

ejecutar:

```bash
npm install
```

Esto instalará las dependencias necesarias:

- express
- cors
- dotenv
- jsonwebtoken
- mysql2
- nodemon

---

## 8. Ejecución del sistema

Para iniciar el sistema en modo desarrollo:

```bash
npm run dev
```

Para iniciar el sistema en modo producción:

```bash
npm start
```

Si todo está correcto, debe aparecer un mensaje similar a:

```text
Backend y frontend ejecutándose en http://localhost:3000
API disponible en http://localhost:3000/api
Prueba backend: http://localhost:3000/api/health
```

---

## 9. Acceso al sistema

Abrir el navegador y entrar a:

```text
http://localhost:3000
```

También se puede acceder directamente a:

```text
http://localhost:3000/login
http://localhost:3000/marcaciones
http://localhost:3000/admin
http://localhost:3000/reportes
```

---

## 10. Credenciales iniciales

El usuario de acceso es la cédula.

La contraseña inicial tiene el siguiente formato:

```text
Últimos 4 dígitos de la cédula + primer nombre + primer apellido
```

Todo en mayúsculas, sin espacios y sin tildes.

Ejemplo:

```text
Cédula: 0604462911
Nombre: ANILEMA MORALES LUIS EDUARDO

Usuario: 0604462911
Contraseña: 2911LUISANILEMA
```

---

## 11. Usuarios iniciales del sistema

| Rol | Usuario | Contraseña |
|---|---|---|
| Administrador | 0603263963 | 3963JOSECEPEDA |
| Talento Humano | 060334896 | 4896WILFRIDOPARCO |
| Funcionario | 0604462911 | 2911LUISANILEMA |
| Funcionario | 060439159 | 9159EDELBERTOATUPANA |
| Funcionario | 061487648 | 7648ANACHACHA |
| Funcionario | 060199768 | 9768JOSECHIMBOLEMA |
| Funcionario | 060326232 | 6232JOSECHUCURI |
| Funcionario | 0603209172 | 9172GUILERMOGUALI |
| Funcionario | 060439066 | 9066VICTORGUAMANA |
| Funcionario | 060421853 | 1853JOSENARANJO |
| Funcionario | 060389512 | 9512LUISYAMBAY |
| Funcionario | 1750014092 | 4092MIRYAMCHUMA |

---

## 12. Roles del sistema

### Administrador

Tiene control total del sistema.

Puede:

- Gestionar usuarios.
- Gestionar horarios.
- Gestionar departamentos.
- Gestionar cargos.
- Gestionar IPs autorizadas.
- Consultar reportes.
- Exportar reportes.
- Imprimir reportes.
- Realizar marcaciones.

### Talento Humano

Puede administrar información operativa del sistema, pero con menos permisos que el administrador.

Puede:

- Gestionar usuarios.
- Gestionar horarios.
- Gestionar cargos y departamentos.
- Consultar reportes.
- Exportar reportes.
- Imprimir reportes.

No debe gestionar administradores ni eliminar configuraciones críticas.

### Funcionario

Puede:

- Iniciar sesión.
- Realizar marcaciones.
- Consultar sus propias marcaciones.

### Consulta

Puede:

- Consultar reportes.

No puede registrar marcaciones ni modificar información del sistema.

---

## 13. Validación por IP

El sistema permite restringir las marcaciones únicamente a IPs autorizadas.

Las IPs autorizadas se guardan en la tabla:

```sql
ips_autorizadas
```

Por defecto, el sistema incluye IPs de desarrollo como:

```text
127.0.0.1
::1
192.168.1.1 - 192.168.1.254
```

Para producción, se debe registrar la IP real de la institución.

Ejemplo de IP pública institucional:

```text
181.112.225.162
```

Ejemplo de inserción en MySQL:

```sql
USE sistema_asistencia_columbe;

INSERT INTO ips_autorizadas (
    nombre_red,
    descripcion,
    tipo,
    ip_inicio,
    ip_fin,
    cidr,
    estado
) VALUES (
    'GAD Columbe - IP pública institucional',
    'IP pública institucional autorizada para realizar marcaciones',
    'IP_EXACTA',
    '181.112.225.162',
    NULL,
    NULL,
    1
);
```

Para consultar las IPs activas:

```sql
SELECT *
FROM ips_autorizadas
WHERE estado = 1;
```

---

## 14. Módulos del sistema

### Login

Permite el ingreso de usuarios mediante cédula y contraseña.

Archivo principal:

```text
frontend/index.html
frontend/js/auth.js
backend/src/routes/auth.routes.js
```

### Marcaciones

Permite registrar:

- Entrada laboral.
- Salida a almuerzo.
- Retorno de almuerzo.
- Salida laboral.

Archivos principales:

```text
frontend/marcaciones.html
frontend/js/marcaciones.js
backend/src/routes/marcaciones.routes.js
backend/src/services/attendance.service.js
```

### Administración

Permite gestionar:

- Usuarios.
- Horarios.
- Departamentos.
- Cargos.
- IPs autorizadas.

Archivos principales:

```text
frontend/admin.html
frontend/js/admin.js
backend/src/routes/admin.routes.js
```

### Reportes

Permite generar reportes de:

- Asistencia general.
- Atrasos.
- Faltas.
- Marcaciones incompletas.

Archivos principales:

```text
frontend/reportes.html
frontend/js/reportes.js
backend/src/routes/reportes.routes.js
```

---

## 15. Reportes

Para generar reportes:

1. Iniciar sesión como Administrador, Talento Humano o Consulta.
2. Entrar a:

```text
http://localhost:3000/reportes
```

3. Seleccionar rango de fechas.
4. Seleccionar funcionario o todos.
5. Presionar Generar reporte.

El sistema puede mostrar estados como:

```text
COMPLETO
ATRASO
INCOMPLETO
FALTA
NO_LABORABLE
FERIADO
```

También permite:

- Exportar a CSV.
- Imprimir el reporte.

---

## 16. Creación de nuevos usuarios

Cuando se crea un nuevo usuario desde Gestión de usuarios:

- El usuario será la cédula.
- La contraseña inicial se genera automáticamente.

Formato:

```text
Últimos 4 dígitos de la cédula + primer nombre + primer apellido
```

Ejemplo:

```text
Cédula: 0912345678
Primer apellido: PEREZ
Primer nombre: CARLOS

Usuario: 0912345678
Contraseña inicial: 5678CARLOSPEREZ
```

La contraseña se guarda en MySQL como hash SHA256.

---

## 17. Comandos útiles

### Instalar dependencias

```bash
npm install
```

### Ejecutar en desarrollo

```bash
npm run dev
```

### Ejecutar en producción

```bash
npm start
```

### Probar API

Abrir en el navegador:

```text
http://localhost:3000/api/health
```

---

## 18. Consultas útiles en MySQL

### Ver usuarios activos

```sql
USE sistema_asistencia_columbe;

SELECT 
    cedula,
    usuario,
    primer_apellido,
    segundo_apellido,
    primer_nombre,
    segundo_nombre,
    estado
FROM usuarios
WHERE estado = 'ACTIVO';
```

### Ver roles

```sql
SELECT *
FROM roles;
```

### Ver horarios asignados

```sql
SELECT *
FROM usuarios_horarios
WHERE estado = 1;
```

### Ver marcaciones

```sql
SELECT *
FROM marcaciones
ORDER BY fecha_marcacion DESC, hora_marcacion DESC;
```

### Ver asistencia diaria

```sql
SELECT *
FROM asistencia_diaria
ORDER BY fecha DESC;
```

### Ver reportes generados

```sql
SELECT *
FROM reportes_generados
ORDER BY fecha_generacion DESC;
```

### Ver sesiones activas

```sql
SELECT *
FROM sesiones
WHERE estado = 'ACTIVA';
```

---

## 19. Solución de errores comunes

### Error: No se pudo iniciar el servidor

Verificar:

1. Que MySQL esté encendido.
2. Que la base de datos exista.
3. Que el archivo `.env` tenga usuario, contraseña, puerto y base de datos correctos.
4. Que el puerto de MySQL sea correcto.

Probar conexión con:

```sql
USE sistema_asistencia_columbe;
SHOW TABLES;
```

### Error: Access denied for user root

La contraseña de MySQL en `.env` es incorrecta.

Corregir:

```env
DB_PASSWORD=tu_contraseña_mysql
```

### Error: Unknown database sistema_asistencia_columbe

La base de datos no fue creada.

Ejecutar nuevamente:

```text
database/init.sql
```

### Error: npm no se reconoce

Node.js no está instalado o no está agregado al PATH.

Instalar Node.js desde su página oficial y reiniciar la terminal.

### Error: el reporte no muestra datos

Verificar que existan usuarios activos:

```sql
SELECT COUNT(*) AS usuarios_activos
FROM usuarios
WHERE estado = 'ACTIVO';
```

Verificar que existan horarios asignados:

```sql
SELECT COUNT(*) AS horarios_asignados
FROM usuarios_horarios
WHERE estado = 1;
```

Verificar que existan marcaciones:

```sql
SELECT COUNT(*) AS total_marcaciones
FROM marcaciones;
```

### Error: no permite marcar por IP

Verificar la IP detectada y las IPs autorizadas:

```sql
SELECT *
FROM ips_autorizadas
WHERE estado = 1;
```

Si la IP institucional no está registrada, agregarla en el módulo de administración o directamente en MySQL.

---

## 20. Seguridad

Recomendaciones para producción:

- Cambiar el valor de `JWT_SECRET`.
- No compartir el archivo `.env`.
- Eliminar usuarios de prueba si no serán utilizados.
- Registrar únicamente IPs institucionales reales.
- Desactivar IPs de desarrollo como `127.0.0.1` cuando el sistema ya esté en producción.
- Realizar respaldos periódicos de la base de datos.
- Cambiar las contraseñas iniciales de los usuarios.
- Usar HTTPS si el sistema será publicado en internet.

---

## 21. Respaldo de base de datos

Para exportar la base de datos desde terminal:

```bash
mysqldump -u root -p sistema_asistencia_columbe > respaldo_columbe.sql
```

Para restaurarla:

```bash
mysql -u root -p sistema_asistencia_columbe < respaldo_columbe.sql
```

---

## 22. Estado actual del proyecto

El sistema cuenta con:

- Login con roles.
- Backend conectado a MySQL.
- Gestión de usuarios.
- Gestión de horarios.
- Gestión de departamentos y cargos.
- Gestión de IPs autorizadas.
- Registro de marcaciones.
- Validación por IP.
- Reportes.
- Exportación e impresión de reportes.
- Manejo de sesiones.
- Registro de auditoría.

---

## 23. Autor del proyecto

Proyecto desarrollado para el Gobierno Autónomo Descentralizado Parroquial Rural de Columbe.

Tema:

```text
Desarrollo de un sistema automatizado de control de jornada laboral mediante marcaciones de entrada, salida y recesos con validación por IP en el Gobierno Autónomo Descentralizado Parroquial Rural de Columbe
```

Autor:

```text
Pedro Isaac Valente Morocho
```

Carrera:

```text
Desarrollo de Software
```
# Despliegue en Vercel

El repositorio está preparado para publicar el frontend estático y el backend
Express como una función serverless desde la raíz del proyecto.

## Requisito: MySQL externo

Vercel no ejecuta un servidor MySQL persistente. Antes del despliegue, cree una
base MySQL administrada y accesible desde Internet (por ejemplo, en Aiven,
DigitalOcean, Railway u otro proveedor) e importe `database/init.sql` una sola
vez. Revise el script antes de importarlo: contiene instrucciones de creación y
eliminación de base de datos.

## Variables de entorno

En **Vercel > Project Settings > Environment Variables**, configure:

```text
NODE_ENV=production
TZ=America/Guayaquil
DB_HOST=...
DB_PORT=3306
DB_USER=...
DB_PASSWORD=...
DB_NAME=sistema_asistencia_columbe
DB_SSL=true
JWT_SECRET=un_valor_largo_aleatorio_y_privado
JWT_EXPIRES_IN=8h
```

Use `DB_SSL=false` solamente si su proveedor indica expresamente que no admite
TLS. No configure `INIT_DB_ON_START` ni `AUTO_REPAIR_DB` en Vercel.

## Publicación

1. Suba el repositorio a GitHub, GitLab o Bitbucket.
2. Importe el repositorio en Vercel y deje **Root Directory** en la raíz.
3. No seleccione un framework ni cambie Build/Output Directory; `vercel.json`
   contiene las rutas necesarias.
4. Agregue las variables anteriores y despliegue.
5. Compruebe `https://su-dominio.vercel.app/api/health` y luego la página raíz.

Para desarrollo local, copie `.env.example` como `.env`, complete los datos y
ejecute desde la raíz:

```bash
npm install
npm start
```

La inicialización local opcional se ejecuta explícitamente con `npm run db:init`.
El frontend usa `/api`, por lo que funciona bajo el mismo dominio tanto en local
como en Vercel.

---
