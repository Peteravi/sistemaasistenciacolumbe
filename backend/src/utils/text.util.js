function normalizeText(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/Ñ/g, 'N')
    .replace(/ñ/g, 'N')
    .trim()
    .toUpperCase();
}

function buildInitialPassword(cedula, primerNombre, primerApellido) {
  return `${String(cedula).slice(-4)}${normalizeText(primerNombre)}${normalizeText(primerApellido)}`;
}

function splitNombreCompleto(nombreCompleto) {
  const parts = normalizeText(nombreCompleto)
    .split(/\s+/)
    .filter(Boolean);

  return {
    primer_apellido: parts[0] || 'USUARIO',
    segundo_apellido: parts.length >= 4 ? parts[1] : null,
    primer_nombre: parts.length >= 3 ? parts[2] : (parts[1] || 'NOMBRE'),
    segundo_nombre: parts.length >= 4 ? parts.slice(3).join(' ') : null
  };
}

module.exports = {
  normalizeText,
  buildInitialPassword,
  splitNombreCompleto
};