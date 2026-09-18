import { createCipheriv, createDecipheriv, randomBytes } from "crypto";

/**
 * Criptografia das credenciais de IA (API keys) em nível de aplicação —
 * AES-256-GCM com o módulo nativo `crypto` do Node, sem dependência nova.
 * O projeto não tem Supabase Vault/pgsodium habilitado (só pgcrypto, usado
 * apenas para gen_random_uuid); cifrar aqui, antes de qualquer INSERT/UPDATE,
 * evita depender de uma extensão nova só para isso.
 *
 * Formato do Buffer gravado em ai_provider_configs.credencial_criptografada:
 * [12 bytes IV][16 bytes auth tag][ciphertext].
 */

const ALGORITMO = "aes-256-gcm";
const TAMANHO_IV = 12;
const TAMANHO_TAG = 16;

function obterChaveDerivada(): Buffer {
  const bruta = process.env.AI_CREDENTIALS_ENCRYPTION_KEY;
  if (!bruta) {
    throw new Error("AI_CREDENTIALS_ENCRYPTION_KEY não configurada no servidor.");
  }

  const chave = Buffer.from(bruta, "base64");
  if (chave.length !== 32) {
    throw new Error(
      "AI_CREDENTIALS_ENCRYPTION_KEY deve ser uma chave de 32 bytes em base64 (ex.: `openssl rand -base64 32`)."
    );
  }
  return chave;
}

export function criptografar(textoPlano: string): Buffer {
  const chave = obterChaveDerivada();
  const iv = randomBytes(TAMANHO_IV);
  const cifra = createCipheriv(ALGORITMO, chave, iv);

  const ciphertext = Buffer.concat([cifra.update(textoPlano, "utf8"), cifra.final()]);
  const tag = cifra.getAuthTag();

  return Buffer.concat([iv, tag, ciphertext]);
}

export function descriptografar(payload: Buffer): string {
  const chave = obterChaveDerivada();

  const iv = payload.subarray(0, TAMANHO_IV);
  const tag = payload.subarray(TAMANHO_IV, TAMANHO_IV + TAMANHO_TAG);
  const ciphertext = payload.subarray(TAMANHO_IV + TAMANHO_TAG);

  const decifra = createDecipheriv(ALGORITMO, chave, iv);
  decifra.setAuthTag(tag);

  return Buffer.concat([decifra.update(ciphertext), decifra.final()]).toString("utf8");
}

/** Prévia mascarada para exibição na UI, ex.: "AIza••••••••••8K2". Nunca reversível. */
export function mascarar(chave: string): string {
  if (chave.length <= 8) return "•".repeat(chave.length);
  const inicio = chave.slice(0, 4);
  const fim = chave.slice(-4);
  return `${inicio}${"•".repeat(10)}${fim}`;
}

/** O PostgREST devolve/aceita bytea como string hex prefixada "\x...". */
export function bufferParaBytea(buffer: Buffer): string {
  return `\\x${buffer.toString("hex")}`;
}

export function byteaParaBuffer(valor: string): Buffer {
  const hex = valor.startsWith("\\x") ? valor.slice(2) : valor;
  return Buffer.from(hex, "hex");
}
