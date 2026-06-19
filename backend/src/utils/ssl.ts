import * as fs from "fs";
import { logger } from "./logger";

let cachedCa: string | undefined = undefined;

function loadCaCert(): string | undefined {
  const certPath = process.env.DB_CA_CERT_PATH;
  if (!certPath) return undefined;
  try {
    const content = fs.readFileSync(certPath, "utf-8").trim();
    if (content.length === 0) {
      logger.warn(`CA cert file at ${certPath} is empty — falling back to unverified SSL`);
      return undefined;
    }
    logger.info(`Loaded CA certificate from ${certPath} (${content.length} chars)`);
    return content;
  } catch (err) {
    logger.warn(`Could not read CA cert at ${certPath} — falling back to unverified SSL: ${err}`);
    return undefined;
  }
}

export function getSslConfig(
  sslRequired: boolean
): boolean | { rejectUnauthorized?: boolean; ca?: string } {
  if (!sslRequired) return false;

  if (cachedCa === undefined) {
    cachedCa = loadCaCert();
  }

  if (cachedCa) {
    return { ca: cachedCa, rejectUnauthorized: true };
  }

  return { rejectUnauthorized: false };
}
