/**
 * Validation utility functions
 */

/**
 * Validate that a string is a valid Twilio Call SID
 * @param callSid - The Call SID to validate
 * @returns True if valid, false otherwise
 */
export function isValidCallSid(callSid: string): boolean {
  return /^CA[a-f0-9]{32}$/i.test(callSid);
}

/**
 * Validate that a string is a valid phone number
 * @param phoneNumber - The phone number to validate
 * @returns True if valid, false otherwise
 */
export function isValidPhoneNumber(phoneNumber: string): boolean {
  // Basic E.164 format validation
  return /^\+[1-9]\d{1,14}$/.test(phoneNumber);
}

/**
 * Sanitize user input to prevent injection attacks
 * @param input - The input to sanitize
 * @returns Sanitized string
 */
export function sanitizeInput(input: string): string {
  return input
    .replace(/[<>]/g, '') // Remove angle brackets
    .replace(/javascript:/gi, '') // Remove javascript: protocol
    .trim();
}

/**
 * Validate MongoDB ObjectId format
 * @param id - The ID to validate
 * @returns True if valid, false otherwise
 */
export function isValidObjectId(id: string): boolean {
  return /^[a-f\d]{24}$/i.test(id);
}

/**
 * Check if a value is within a numeric range
 * @param value - The value to check
 * @param min - Minimum value
 * @param max - Maximum value
 * @returns True if within range, false otherwise
 */
export function isInRange(value: number, min: number, max: number): boolean {
  return value >= min && value <= max;
}

/**
 * Parse and validate JSON safely
 * @param json - JSON string to parse
 * @returns Parsed object or null if invalid
 */
export function safeJsonParse<T = unknown>(json: string): T | null {
  try {
    return JSON.parse(json) as T;
  } catch {
    return null;
  }
}
