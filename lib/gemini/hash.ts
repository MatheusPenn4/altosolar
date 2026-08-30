import { createHash } from "node:crypto";

export function sha256DoArquivo(buffer: Buffer): string {
  return createHash("sha256").update(buffer).digest("hex");
}
