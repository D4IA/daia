export const chunkArray = <T>(array: T[], size: number): T[][] => {
  const result: T[][] = [];
  for (let i = 0; i < array.length; i += size) {
    result.push(array.slice(i, i + size));
  }
  return result;
};

export const chunkArrayAndPerformActionOnChunk = <T>(array: T[], size: number, action: (chunk: T[]) => Promise<void>) => {
    const chunks = chunkArray(array, size);
    return Promise.all(chunks.map(chunk => action(chunk)));
}