import crypto from 'node:crypto';
import { config } from '../config/env.js';
import { BadRequestError } from '../errors/AppError.js';

export interface GeneratedQrToken {
  token: string;
  sessionId: string;
  courseOfferingId: string;
  expiresAt: number;
  expiresInSeconds: number;
}

export interface VerifiedQrToken {
  sessionId: string;
  courseOfferingId: string;
  expiresAt: number;
  nonce: string;
}

/**
 * Generates an HMAC-SHA256 cryptographically signed QR attendance token
 * bound to an AttendanceSession and CourseOffering with a strict TTL.
 */
export function generateQrToken(
  sessionId: string,
  courseOfferingId: string,
  ttlSeconds = 60
): GeneratedQrToken {
  const nonce = crypto.randomBytes(8).toString('hex');
  const expiresAt = Date.now() + ttlSeconds * 1000;
  const payloadToSign = `${sessionId}:${courseOfferingId}:${nonce}:${expiresAt}`;

  const signature = crypto
    .createHmac('sha256', config.QR_SIGNING_SECRET)
    .update(payloadToSign)
    .digest('hex');

  const token = `${sessionId}.${courseOfferingId}.${nonce}.${expiresAt}.${signature}`;

  return {
    token,
    sessionId,
    courseOfferingId,
    expiresAt,
    expiresInSeconds: ttlSeconds,
  };
}

/**
 * Validates the HMAC-SHA256 signature, expiry, and structure of a QR attendance token.
 * Throws BadRequestError with safe, descriptive message if invalid or expired.
 */
export function verifyQrToken(tokenString: string): VerifiedQrToken {
  if (!tokenString || typeof tokenString !== 'string') {
    throw new BadRequestError('Malformed QR attendance token.');
  }

  const parts = tokenString.trim().split('.');
  if (parts.length !== 5) {
    throw new BadRequestError('Invalid QR attendance token structure.');
  }

  const [sessionId, courseOfferingId, nonce, rawExpiresAt, signature] = parts;
  const expiresAt = parseInt(rawExpiresAt, 10);

  if (!sessionId || !courseOfferingId || !nonce || isNaN(expiresAt) || !signature) {
    throw new BadRequestError('Invalid or corrupted QR attendance token data.');
  }

  // 1. Verify cryptographic signature using constant-time comparison
  const payloadToSign = `${sessionId}:${courseOfferingId}:${nonce}:${expiresAt}`;
  const expectedSignature = crypto
    .createHmac('sha256', config.QR_SIGNING_SECRET)
    .update(payloadToSign)
    .digest('hex');

  const signatureBuffer = Buffer.from(signature, 'utf-8');
  const expectedBuffer = Buffer.from(expectedSignature, 'utf-8');

  if (
    signatureBuffer.length !== expectedBuffer.length ||
    !crypto.timingSafeEqual(signatureBuffer, expectedBuffer)
  ) {
    throw new BadRequestError('Cryptographic verification failed: QR token signature is invalid or tampered.');
  }

  // 2. Check strict expiration
  const now = Date.now();
  if (now > expiresAt) {
    throw new BadRequestError('QR attendance token has expired. Please ask faculty for a refreshed QR code.');
  }

  return {
    sessionId,
    courseOfferingId,
    expiresAt,
    nonce,
  };
}
