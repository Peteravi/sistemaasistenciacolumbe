const { pool } = require('../config/db');

function getClientIp(req) {
  const forwarded = req.headers['x-forwarded-for'];

  const raw = Array.isArray(forwarded)
    ? forwarded[0]
    : forwarded?.split(',')[0] || req.ip || req.socket?.remoteAddress || '';

  return String(raw)
    .trim()
    .replace(/^::ffff:/, '')
    .replace(/^::1$/, '127.0.0.1');
}

function ipv4ToNumber(ip) {
  const parts = String(ip || '').split('.').map(Number);

  if (
    parts.length !== 4 ||
    parts.some((n) => Number.isNaN(n) || n < 0 || n > 255)
  ) {
    return null;
  }

  return parts.reduce((acc, part) => (acc * 256) + part, 0);
}

function isIpInCidr(ip, cidr) {
  const [range, bitsRaw] = String(cidr || '').split('/');
  const bits = Number(bitsRaw);

  const ipNumber = ipv4ToNumber(ip);
  const rangeNumber = ipv4ToNumber(range);

  if (
    ipNumber === null ||
    rangeNumber === null ||
    Number.isNaN(bits) ||
    bits < 0 ||
    bits > 32
  ) {
    return false;
  }

  const mask = bits === 0 ? 0 : (0xffffffff << (32 - bits)) >>> 0;

  return (ipNumber & mask) === (rangeNumber & mask);
}

async function validateIp(ip) {
  const cleanIp = String(ip || '').replace(/^::ffff:/, '').trim();

  const [configRows] = await pool.query(
    "SELECT valor FROM configuracion_sistema WHERE clave = 'VALIDAR_IP' LIMIT 1"
  );

  const shouldValidate = configRows.length ? configRows[0].valor === '1' : true;

  if (!shouldValidate) {
    return {
      autorizada: true,
      regla: null,
      mensaje: 'Validación de IP desactivada.'
    };
  }

  const [rules] = await pool.query(
    `SELECT id_ip_autorizada, nombre_red, tipo, ip_inicio, ip_fin, cidr
     FROM ips_autorizadas
     WHERE estado = 1`
  );

  for (const rule of rules) {
    if (rule.tipo === 'IP_EXACTA' && cleanIp === rule.ip_inicio) {
      return {
        autorizada: true,
        regla: rule,
        mensaje: `IP autorizada: ${rule.nombre_red}`
      };
    }

    if (rule.tipo === 'RANGO_IP') {
      const current = ipv4ToNumber(cleanIp);
      const start = ipv4ToNumber(rule.ip_inicio);
      const end = ipv4ToNumber(rule.ip_fin);

      if (
        current !== null &&
        start !== null &&
        end !== null &&
        current >= start &&
        current <= end
      ) {
        return {
          autorizada: true,
          regla: rule,
          mensaje: `IP autorizada: ${rule.nombre_red}`
        };
      }
    }

    if (rule.tipo === 'CIDR' && rule.cidr && isIpInCidr(cleanIp, rule.cidr)) {
      return {
        autorizada: true,
        regla: rule,
        mensaje: `IP autorizada: ${rule.nombre_red}`
      };
    }
  }

  return {
    autorizada: false,
    regla: null,
    mensaje: `La IP ${cleanIp} no pertenece a la red institucional autorizada.`
  };
}

module.exports = {
  getClientIp,
  ipv4ToNumber,
  isIpInCidr,
  validateIp
};