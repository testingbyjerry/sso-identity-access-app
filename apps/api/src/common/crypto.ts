import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'node:crypto';
import { hash, verify } from '@node-rs/argon2';
import { serverConfig } from '../config/index.js';

// ==============================================================================
// Password Hashing (Argon2id)
// ==============================================================================

const ARGON2_OPTIONS = {
  memoryCost: 65536, // 64 MB
  timeCost: 3, // 3 iterations
  outputLen: 32, // 32 bytes output
  parallelism: 1, // 1 thread
};

/**
 * Hash a plaintext password using Argon2id with OWASP-recommended parameters.
 */
export async function hashPassword(password: string): Promise<string> {
  return hash(password, ARGON2_OPTIONS);
}

/**
 * Verify a plaintext password against an Argon2id hash.
 * Returns false on failure without throwing or leaking timing details.
 */
export async function verifyPassword(hashStr: string, password: string): Promise<boolean> {
  try {
    return await verify(hashStr, password);
  } catch {
    return false;
  }
}

// ==============================================================================
// AES-256-GCM Authenticated Encryption for Sensitive Provider Secrets
// ==============================================================================

function getEncryptionKeyBuffer(): Buffer {
  const rawKey = serverConfig.encryptionKey;
  if (/^[0-9a-fA-F]{64}$/.test(rawKey)) {
    return Buffer.from(rawKey, 'hex');
  }
  // Otherwise derive a deterministic 32-byte key via SHA-256
  return createHash('sha256').update(rawKey).digest();
}

/**
 * Encrypt a plaintext secret string using AES-256-GCM with a random 96-bit (12-byte) IV.
 * Returns formatted string: "<iv_hex>:<auth_tag_hex>:<ciphertext_hex>"
 */
export function encryptSecret(plainText: string): string {
  const key = getEncryptionKeyBuffer();
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', key, iv);

  const encrypted = Buffer.concat([cipher.update(plainText, 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();

  return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted.toString('hex')}`;
}

/**
 * Decrypt an AES-256-GCM encrypted secret.
 * Expects formatted string: "<iv_hex>:<auth_tag_hex>:<ciphertext_hex>"
 */
export function decryptSecret(encryptedPayload: string): string {
  const parts = encryptedPayload.split(':');
  if (parts.length !== 3) {
    throw new Error('Invalid encrypted payload format');
  }

  const [ivHex, authTagHex, cipherTextHex] = parts;
  if (!ivHex || !authTagHex || !cipherTextHex) {
    throw new Error('Invalid encrypted payload parts');
  }

  const key = getEncryptionKeyBuffer();
  const iv = Buffer.from(ivHex, 'hex');
  const authTag = Buffer.from(authTagHex, 'hex');
  const cipherText = Buffer.from(cipherTextHex, 'hex');

  const decipher = createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAuthTag(authTag);

  const decrypted = Buffer.concat([decipher.update(cipherText), decipher.final()]);
  return decrypted.toString('utf8');
}

// ==============================================================================
// Cryptographically Secure Opaque Tokens & Hashes
// ==============================================================================

/**
 * Generate a cryptographically secure random opaque token (e.g. for sessions or password resets).
 */
export function generateOpaqueToken(byteLength = 32): string {
  return randomBytes(byteLength).toString('hex');
}

/**
 * Compute SHA-256 hex digest of a token string for safe database storage.
 */
export function hashToken(token: string): string {
  return createHash('sha256').update(token, 'utf8').digest('hex');
}

// ==============================================================================
// PKCE (Proof Key for Code Exchange) - RFC 7636 S256
// ==============================================================================

export interface PkcePair {
  codeVerifier: string;
  codeChallenge: string;
  codeChallengeMethod: 'S256';
}

/**
 * Generate a cryptographically random PKCE code verifier and SHA-256 S256 challenge.
 */
export function generatePkce(): PkcePair {
  // 32 random bytes base64url-encoded produces 43 chars (RFC 7636 allows 43-128 chars)
  const codeVerifier = randomBytes(32).toString('base64url');
  const codeChallenge = createHash('sha256').update(codeVerifier, 'ascii').digest('base64url');

  return {
    codeVerifier,
    codeChallenge,
    codeChallengeMethod: 'S256',
  };
}
