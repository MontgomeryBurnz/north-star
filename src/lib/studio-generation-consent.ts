/** Per-operation billing acknowledgement, not an authentication or spending-cap token. */
export type StudioGenerationConsent = { version: 1; confirmed: true; externalResearch: boolean };

export function createStudioGenerationConsent(externalResearch: boolean): StudioGenerationConsent {
  return { version: 1, confirmed: true, externalResearch };
}

export function hasStudioGenerationConsent(input: unknown): boolean {
  if (!input || typeof input !== "object" || Array.isArray(input)) return false;
  const request = input as Record<string, unknown>;
  const consent = request.paidGenerationConsent;
  if (!consent || typeof consent !== "object" || Array.isArray(consent)) return false;
  const acknowledgement = consent as Record<string, unknown>;
  return acknowledgement.version === 1 && acknowledgement.confirmed === true
    && acknowledgement.externalResearch === (request.externalResearch === true);
}

export const STUDIO_CONSENT_REQUIRED_MESSAGE = "Paid generation requires confirmation. Open Studio and authorize this analysis before continuing. Your current package is preserved.";
