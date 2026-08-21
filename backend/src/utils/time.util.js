const TIME_ZONE = 'America/Guayaquil';

function nowParts() {
  const now = new Date();

  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  });

  const parts = formatter.formatToParts(now);

  const values = {};

  for (const part of parts) {
    if (part.type !== 'literal') {
      values[part.type] = part.value;
    }
  }

  const weekdayFormatter = new Intl.DateTimeFormat('en-US', {
    timeZone: TIME_ZONE,
    weekday: 'short'
  });

  const weekday = weekdayFormatter.format(now);

  const dayMap = {
    Mon: 1,
    Tue: 2,
    Wed: 3,
    Thu: 4,
    Fri: 5,
    Sat: 6,
    Sun: 7
  };

  return {
    date: `${values.year}-${values.month}-${values.day}`,
    time: `${values.hour}:${values.minute}:${values.second}`,
    dateTime: `${values.year}-${values.month}-${values.day} ${values.hour}:${values.minute}:${values.second}`,
    jsDate: now,
    day: dayMap[weekday]
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

  if (
    [entrada, salidaAlmuerzo, retornoAlmuerzo, salida].some(
      (v) => v === null
    )
  ) {
    return 0;
  }

  return Math.max(
    0,
    (salidaAlmuerzo - entrada) + (salida - retornoAlmuerzo)
  );
}

function buildDateRange(start, end) {
  const result = [];

  const [startYear, startMonth, startDay] = start.split('-').map(Number);
  const [endYear, endMonth, endDay] = end.split('-').map(Number);

  const cursor = new Date(
    Date.UTC(startYear, startMonth - 1, startDay)
  );

  const limit = new Date(
    Date.UTC(endYear, endMonth - 1, endDay)
  );

  while (cursor <= limit) {
    const yyyy = cursor.getUTCFullYear();
    const mm = String(cursor.getUTCMonth() + 1).padStart(2, '0');
    const dd = String(cursor.getUTCDate()).padStart(2, '0');

    result.push(`${yyyy}-${mm}-${dd}`);

    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }

  return result;
}

module.exports = {
  nowParts,
  timeToMinutes,
  minutesWorked,
  buildDateRange
};