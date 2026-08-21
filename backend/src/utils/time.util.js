function nowParts() {
  const now = new Date();

  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const dd = String(now.getDate()).padStart(2, '0');
  const hh = String(now.getHours()).padStart(2, '0');
  const mi = String(now.getMinutes()).padStart(2, '0');
  const ss = String(now.getSeconds()).padStart(2, '0');

  return {
    date: `${yyyy}-${mm}-${dd}`,
    time: `${hh}:${mi}:${ss}`,
    dateTime: `${yyyy}-${mm}-${dd} ${hh}:${mi}:${ss}`,
    jsDate: now,
    day: now.getDay() === 0 ? 7 : now.getDay()
  };
}

function timeToMinutes(value) {
  if (!value) return null;

  const [h, m] = String(value).split(':').map(Number);

  if (Number.isNaN(h) || Number.isNaN(m)) return null;

  return h * 60 + m;
}

function minutesWorked(row) {
  const entrada = timeToMinutes(row.entrada);
  const salidaAlmuerzo = timeToMinutes(row.salida_almuerzo);
  const retornoAlmuerzo = timeToMinutes(row.retorno_almuerzo);
  const salida = timeToMinutes(row.salida);

  if ([entrada, salidaAlmuerzo, retornoAlmuerzo, salida].some((v) => v === null)) {
    return 0;
  }

  return Math.max(0, (salidaAlmuerzo - entrada) + (salida - retornoAlmuerzo));
}

function buildDateRange(start, end) {
  const result = [];
  const cursor = new Date(`${start}T00:00:00`);
  const limit = new Date(`${end}T00:00:00`);

  while (cursor <= limit) {
    const yyyy = cursor.getFullYear();
    const mm = String(cursor.getMonth() + 1).padStart(2, '0');
    const dd = String(cursor.getDate()).padStart(2, '0');

    result.push(`${yyyy}-${mm}-${dd}`);
    cursor.setDate(cursor.getDate() + 1);
  }

  return result;
}

module.exports = {
  nowParts,
  timeToMinutes,
  minutesWorked,
  buildDateRange
};