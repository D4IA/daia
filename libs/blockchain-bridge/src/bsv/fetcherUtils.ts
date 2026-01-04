/**
 * Splits an array into chunks of specified size.
 */
export function chunkArray<T>(array: T[], size: number): T[][] {
	const result: T[][] = [];
	for (let i = 0; i < array.length; i += size) {
		result.push(array.slice(i, i + size));
	}
	return result;
}

/**
 * Executes promises with a concurrency limit.
 * Prevents creating too many pending promises at once.
 *
 * @param tasks - Array of functions that return promises
 * @param concurrency - Maximum number of concurrent promises
 * @returns Array of results in the same order as tasks
 */
export async function promisePool<T>(
	tasks: Array<() => Promise<T>>,
	concurrency: number,
): Promise<T[]> {
	const results: T[] = new Array(tasks.length);
	const executing: Set<Promise<void>> = new Set();

	for (const [index, task] of tasks.entries()) {
		const promise = task()
			.then((result) => {
				results[index] = result;
			})
			.finally(() => {
				executing.delete(promise);
			});

		executing.add(promise);

		if (executing.size >= concurrency) {
			await Promise.race(executing);
		}
	}

	await Promise.allSettled(Array.from(executing));
	return results;
}
