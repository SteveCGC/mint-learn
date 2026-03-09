import { verifyMessage } from 'viem';

export function buildLoginMessage(nonce: string): string {
  return `MintLearn 登录验证\n\nnonce: ${nonce}`;
}

export async function verifySignature(
  address: string,
  nonce: string,
  signature: string
): Promise<boolean> {
  const message = buildLoginMessage(nonce);
  try {
    const valid = await verifyMessage({
      address: address as `0x${string}`,
      message,
      signature: signature as `0x${string}`,
    });
    return valid;
  } catch {
    return false;
  }
}
