import type { FhirBundle } from "./types";

interface FhirConfig {
  baseUrl: string;
  clientId: string;
  clientSecret: string;
  tokenUrl: string;
}

function getConfig(): FhirConfig | null {
  const baseUrl = process.env.OPENEMR_BASE_URL;
  const clientId = process.env.OPENEMR_CLIENT_ID;
  const clientSecret = process.env.OPENEMR_CLIENT_SECRET;
  if (!baseUrl || !clientId || !clientSecret) return null;
  const origin = new URL(baseUrl).origin;
  return {
    baseUrl: baseUrl.replace(/\/+$/, ""),
    clientId,
    clientSecret,
    tokenUrl: `${origin}/oauth2/default/token`,
  };
}

let cachedToken: string | null = null;
let tokenExpiresAt = 0;

async function getAccessToken(config: FhirConfig): Promise<string> {
  const now = Date.now();
  if (cachedToken && now < tokenExpiresAt - 30_000) {
    return cachedToken;
  }

  const body = new URLSearchParams({
    grant_type: "client_credentials",
    client_id: config.clientId,
    client_secret: config.clientSecret,
    scope: "openid fhirUser system/Patient.read system/AllergyIntolerance.read system/MedicationRequest.read system/Observation.read system/Condition.read system/Encounter.read system/DocumentReference.read system/Procedure.read",
  });

  const res = await fetch(config.tokenUrl, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`OAuth2 token request failed (${res.status}): ${text}`);
  }

  const data = await res.json();
  cachedToken = data.access_token;
  tokenExpiresAt = now + (data.expires_in ?? 3600) * 1000;
  return cachedToken!;
}

export async function fhirFetch<T>(
  path: string,
  params?: Record<string, string>,
): Promise<T> {
  const config = getConfig();
  if (!config) throw new Error("FHIR not configured");

  const token = await getAccessToken(config);
  const url = new URL(`${config.baseUrl}/${path}`);
  if (params) {
    Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
  }

  const res = await fetch(url.toString(), {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/fhir+json",
    },
    cache: "no-store",
  });

  if (res.status === 401) {
    cachedToken = null;
    tokenExpiresAt = 0;
    const newToken = await getAccessToken(config);
    const retryRes = await fetch(url.toString(), {
      headers: {
        Authorization: `Bearer ${newToken}`,
        Accept: "application/fhir+json",
      },
      cache: "no-store",
    });
    if (!retryRes.ok) throw new Error(`FHIR ${path} failed: ${retryRes.status}`);
    return retryRes.json();
  }

  if (!res.ok) throw new Error(`FHIR ${path} failed: ${res.status}`);
  return res.json();
}

export async function fhirSearch<T>(
  resourceType: string,
  params?: Record<string, string>,
): Promise<T[]> {
  const bundle = await fhirFetch<FhirBundle<T>>(resourceType, params);
  return bundle.entry?.map((e) => e.resource) ?? [];
}

export function isFhirConfigured(): boolean {
  return getConfig() !== null;
}
