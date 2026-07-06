// Clima oficial via Open-Meteo (API pública, sem chave, gratuita)
// Usado para blindar o RDO com dados meteorológicos de fonte independente.

export interface ClimaOficial {
  condicao: 'Ensolarado' | 'Nublado' | 'Chuvoso' | 'Instável';
  tempMax: number;
  tempMin: number;
  chuvaMm: number;
  fonte: 'open-meteo';
}

// Converte o weather_code (WMO) da Open-Meteo para as 4 condições do app
export function converterWeatherCode(code: number): ClimaOficial['condicao'] {
  if (code === 0 || code === 1) return 'Ensolarado';
  if (code === 2 || code === 3 || code === 45 || code === 48) return 'Nublado';
  if ((code >= 51 && code <= 67) || (code >= 80 && code <= 82) || (code >= 61 && code <= 65)) return 'Chuvoso';
  if (code >= 95) return 'Instável';
  if (code >= 71 && code <= 86) return 'Chuvoso';
  return 'Nublado';
}

export async function buscarClima(
  lat: number,
  lon: number,
  dataISO: string
): Promise<ClimaOficial | null> {
  try {
    const url =
      `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}` +
      `&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_sum` +
      `&timezone=America%2FSao_Paulo&start_date=${dataISO}&end_date=${dataISO}&past_days=0`;

    const res = await fetch(url);
    if (!res.ok) return null;
    const json = await res.json();
    const d = json?.daily;
    if (!d || !Array.isArray(d.weather_code) || d.weather_code.length === 0) return null;

    return {
      condicao: converterWeatherCode(Number(d.weather_code[0])),
      tempMax: Math.round(Number(d.temperature_2m_max[0])),
      tempMin: Math.round(Number(d.temperature_2m_min[0])),
      chuvaMm: Math.round(Number(d.precipitation_sum[0] ?? 0) * 10) / 10,
      fonte: 'open-meteo',
    };
  } catch {
    return null;
  }
}
