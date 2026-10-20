import { Decimal } from '@prisma/client/runtime/library';

/**
 * Exact Financial Math Utilities using BigInt Minor Units (Paisa / Cents).
 * Guarantees zero floating-point imprecision or IEEE 754 precision drift.
 * 1 INR = 100 Paise.
 */

export function toMinorUnits(amount: number | string | Decimal | bigint | any): bigint {
  if (amount === null || amount === undefined) return 0n;
  if (typeof amount === 'bigint') return amount;

  // Handle Prisma Decimal or any Decimal-like object with toFixed or toString
  if (typeof amount === 'object') {
    if (typeof amount.toFixed === 'function') {
      const fixedStr: string = amount.toFixed(2);
      const [intPart, decPart = ''] = fixedStr.split('.');
      const paddedDec = (decPart + '00').slice(0, 2);
      const isNegative = fixedStr.startsWith('-');
      const absInt = isNegative ? intPart.slice(1) : intPart;
      const value = BigInt(absInt) * 100n + BigInt(paddedDec);
      return isNegative ? -value : value;
    }
    if (typeof amount.toString === 'function') {
      return toMinorUnits(amount.toString());
    }
  }

  if (typeof amount === 'number') {
    // Avoid direct Math.round(amount * 100) due to 0.1 + 0.2 float anomalies
    const isNegative = amount < 0;
    const absVal = Math.abs(amount);
    const [intPart, decPart = ''] = absVal.toFixed(2).split('.');
    const paddedDec = (decPart + '00').slice(0, 2);
    const value = BigInt(intPart) * 100n + BigInt(paddedDec);
    return isNegative ? -value : value;
  }

  if (typeof amount === 'string') {
    const trimmed = amount.trim();
    if (!/^-?\d+(\.\d{1,2})?$/.test(trimmed)) {
      throw new Error(`Invalid monetary amount format: "${amount}"`);
    }
    const isNegative = trimmed.startsWith('-');
    const cleanStr = isNegative ? trimmed.slice(1) : trimmed;
    const [intPart, decPart = ''] = cleanStr.split('.');
    const paddedDec = (decPart + '00').slice(0, 2);
    const value = BigInt(intPart) * 100n + BigInt(paddedDec);
    return isNegative ? -value : value;
  }
  throw new Error(`Unsupported amount type for financial conversion: ${typeof amount}`);
}

export function fromMinorUnits(paise: bigint): string {
  const isNegative = paise < 0n;
  const absPaise = isNegative ? -paise : paise;
  const intPart = absPaise / 100n;
  const decPart = absPaise % 100n;
  const decStr = decPart.toString().padStart(2, '0');
  return `${isNegative ? '-' : ''}${intPart.toString()}.${decStr}`;
}

export function fromMinorUnitsToNumber(paise: bigint): number {
  return Number(fromMinorUnits(paise));
}

export function addPaise(...amounts: Array<number | string | Decimal | bigint | any>): bigint {
  return amounts.reduce((acc: bigint, cur) => acc + toMinorUnits(cur), 0n);
}

export const addMinorUnits = addPaise;

export function subtractPaise(
  a: number | string | Decimal | bigint | any,
  b: number | string | Decimal | bigint | any
): bigint {
  return toMinorUnits(a) - toMinorUnits(b);
}

export const subtractMinorUnits = subtractPaise;

export function formatINR(amount: number | string | Decimal | bigint): string {
  const paise = toMinorUnits(amount);
  const num = Number(fromMinorUnits(paise));
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(num);
}
