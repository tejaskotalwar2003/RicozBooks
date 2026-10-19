import mongoose from 'mongoose';

/**
 * Convert numbers, strings, or Decimal128 to Decimal128 for storage
 */
export function toDecimal(value: number | string | mongoose.Types.Decimal128 | null | undefined): mongoose.Types.Decimal128 {
  if (value === null || value === undefined) {
    return mongoose.Types.Decimal128.fromString('0.00');
  }
  if (value instanceof mongoose.Types.Decimal128) {
    return value;
  }
  const str = typeof value === 'number' ? value.toFixed(2) : String(value);
  return mongoose.Types.Decimal128.fromString(str);
}

/**
 * Safely parse Decimal128 to standard JavaScript float for JSON serialization
 */
export function fromDecimal(value: any): number {
  if (!value) return 0.0;
  if (value instanceof mongoose.Types.Decimal128) {
    return parseFloat(value.toString());
  }
  if (typeof value === 'number') return value;
  return parseFloat(String(value)) || 0.0;
}

/**
 * Check if sum of debits matches sum of credits within standard monetary epsilon (0.001)
 */
export function isBalanced(debits: number, credits: number, epsilon: number = 0.001): boolean {
  return Math.abs(debits - credits) <= epsilon;
}
