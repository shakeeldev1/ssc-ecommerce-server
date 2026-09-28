import { randomBytes } from 'node:crypto';

/** Generates a human-scannable, effectively-unique student ID like STU-M5F3K2-A1B2C3. */
export const generateStudentIdNumber = (): string => {
  const timePart = Date.now().toString(36).toUpperCase();
  const randomPart = randomBytes(3).toString('hex').toUpperCase();
  return `STU-${timePart}-${randomPart}`;
};
