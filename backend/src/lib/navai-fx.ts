export const NAVAI_USD_COP_RATE_KEY = "usd_cop";

export function getLocalDateYmd(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

type FxRow = {
  valor?: string;
  vigenciadesde?: string;
};

function parseUsdCopRate(raw: string | null | undefined) {
  const parsed = raw ? Number(String(raw).replace(",", ".")) : NaN;
  if (!Number.isFinite(parsed) || parsed <= 0) {
    throw new Error("fx_rate_invalid");
  }
  return parsed;
}

async function fetchFxRows(url: string): Promise<FxRow[]> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error("fx_rate_request_failed");
  }

  return (await response.json()) as FxRow[];
}

export async function fetchLatestUsdCopRate(): Promise<{
  rate: number;
  sourceDate: string;
}> {
  const url =
    "https://www.datos.gov.co/resource/32sa-8pi3.json?$order=vigenciadesde%20DESC&$limit=1";
  const data = await fetchFxRows(url);
  const row = data?.[0];
  return {
    rate: parseUsdCopRate(row?.valor ?? null),
    sourceDate: row?.vigenciadesde ?? getLocalDateYmd(),
  };
}

export async function fetchUsdCopRate(dateYmd: string): Promise<{
  rate: number;
  sourceDate: string;
}> {
  const url = `https://www.datos.gov.co/resource/32sa-8pi3.json?vigenciadesde=${encodeURIComponent(
    dateYmd
  )}`;
  const data = await fetchFxRows(url);
  const row = data?.[0];
  if (!row?.valor) {
    return fetchLatestUsdCopRate();
  }

  return {
    rate: parseUsdCopRate(row.valor),
    sourceDate: row.vigenciadesde ?? dateYmd,
  };
}
