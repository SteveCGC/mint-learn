const WEI_PER_MT = BigInt('1000000000000000000');

export function formatCoursePrice(price: string) {
  return `${BigInt(price) / WEI_PER_MT} MT`;
}

export function shortenAddress(address: string, start = 6, end = 4) {
  if (address.length <= start + end) {
    return address;
  }

  return `${address.slice(0, start)}...${address.slice(-end)}`;
}
