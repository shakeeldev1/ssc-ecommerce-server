import { randomBytes } from 'node:crypto';

/** Generates an opaque, unguessable token embedded in the card's QR code. */
export const generateQrToken = (): string => randomBytes(24).toString('hex');
