// Буквы (в том числе кириллица), цифры, «_» и «-», длина 1–32
export const TAG_NAME_REGEX = /^[\p{L}\p{N}_-]{1,32}$/u;

// Единый вид имени: без пробелов по краям и ведущего «#», в нижнем регистре,
// пробелы внутри (подряд идущие — как один) заменены на «_».
// Если пришла не строка — возвращаем как есть, её отклонит валидатор.
export function normalizeTagName<T>(value: T): T | string {
  if (typeof value !== 'string') return value;

  return value.trim().replace(/^#/, '').toLowerCase().replace(/\s+/g, '_');
}
