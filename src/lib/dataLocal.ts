// Data (AAAA-MM-DD) no horário LOCAL do aparelho.
// `toISOString()` usa UTC e, depois das 21h no Brasil, devolvia o dia seguinte.
export function dataLocalISO(d: Date = new Date()): string {
  const ano = d.getFullYear();
  const mes = String(d.getMonth() + 1).padStart(2, '0');
  const dia = String(d.getDate()).padStart(2, '0');
  return `${ano}-${mes}-${dia}`;
}
