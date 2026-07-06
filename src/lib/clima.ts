export interface DadosClima {
  condicao: string;
  tempMax: number;
  tempMin: number;
  chuvaMm: number;
  fonte: 'open-meteo';
}

/**
 * Converte weather_code da Open-Meteo para descrição em português.
 * Referência: https://open-meteo.com/en/docs#weathervariables
 */
function weatherCodeToCondicao(code: number): string {
  if (code === 0) return 'Ensolarado';
  if (code <= 3) return 'Nublado';
  if (code <= 67) return 'Chuvoso';
  if (code <= 77) return 'Nublado';
  if (code <= 82) return 'Chuvoso';
  if (code <= 99) return 'Instável';
  return 'Instável';
}

/**
 * Busca dados climáticos históricos/previsão para uma data e localização específica.
 * Usa a API Open-Meteo (gratuita, sem necessidade de API key).
 *
 * @param lat     - Latitude
 * @param lon     - Longitude
 * @param dataISO - Data no formato YYYY-MM-DD
 */
export async function buscarClima(lat: number, lon: number, dataISO: string): Promise<DadosClima> {
  const params = new URLSearchParams({
    latitude: lat.toFixed(6),
    longitude: lon.toFixed(6),
    daily: 'weather_code,temperature_2m_max,temperature_2m_min,precipitation_sum',
    timezone: 'America/Sao_Paulo',
    start_date: dataISO,
    end_date: dataISO,
  });

  const url = `https://api.open-meteo.com/v1/forecast?${params.toString()}`;
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`Erro ao consultar Open-Meteo: ${response.status}`);
  }

  const json = await response.json();
  const daily = json.daily;

  if (!daily || !daily.weather_code || daily.weather_code.length === 0) {
    throw new Error('Resposta inesperada da API Open-Meteo.');
  }

  const code: number = daily.weather_code[0];
  const tempMax: number = daily.temperature_2m_max[0];
  const tempMin: number = daily.temperature_2m_min[0];
  const chuvaMm: number = daily.precipitation_sum[0] ?? 0;

  return {
    condicao: weatherCodeToCondicao(code),
    tempMax: Math.round(tempMax * 10) / 10,
    tempMin: Math.round(tempMin * 10) / 10,
    chuvaMm: Math.round(chuvaMm * 10) / 10,
    fonte: 'open-meteo',
  };
}
