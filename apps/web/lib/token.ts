import { formatUnits, parseUnits } from 'viem';

export const USDT_DECIMALS = 6;
export const MT_DECIMALS = 18;

export function formatTokenAmount(value: bigint, decimals: number, maximumFractionDigits = 4) {
  const formatted = formatUnits(value, decimals);
  const [whole, fraction = ''] = formatted.split('.');

  if (!fraction) {
    return whole;
  }

  const trimmed = fraction.slice(0, maximumFractionDigits).replace(/0+$/, '');
  return trimmed ? `${whole}.${trimmed}` : whole;
}

export function parseTokenAmount(value: string, decimals: number) {
  const normalized = value.trim();

  if (!normalized) {
    return BigInt(0);
  }

  return parseUnits(normalized, decimals);
}
