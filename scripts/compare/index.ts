// import { inspect } from 'util';
import { writeFileSync } from 'fs';
import getNode from 'get-node';
import { loadRuntimeBinaries } from './runtime-binaries';
import { loadTests } from './tests';
import { RuntimeTested } from './types';
import { updateMarkdown } from './utils/update-markdown';
import { FAIL, PASS } from './utils/markdown';
import { ERROR } from './utils/test';

(async () => {
	// Test with 12.20.0 because it doesn't support node: prefix in imports
	const node = await getNode('local');
	const runtimes = await loadRuntimeBinaries();
	const tests = await loadTests();
	const allTestResults = await Promise.all(
		runtimes.map(async (runtime) => {
			runtime.nodePath = node.path;

			const testResults = await Promise.all(
				tests.map(
					async ([name, testSuite]) => [
						name,
						await testSuite(runtime),
					] as const,
				),
			);

			return {
				runtime,
				...Object.fromEntries(testResults),
			} as RuntimeTested;
		}),
	);

	// console.log(inspect(allTestResults, {
	// 	colors: true,
	// 	depth: null,
	// }));

	const json = JSON.stringify({ runtimes, allTestResults }, null, 2);
	const unsupported = (json.match(new RegExp(FAIL, 'g')) || []).length;
	const errored = (json.match(new RegExp(ERROR, 'g')) || []).length;
	const passed = (json.match(new RegExp(PASS, 'g')) || []).length;
	const SUM = unsupported + errored + passed;
	writeFileSync('./data.json', json, 'utf8');
	const percent = (n: number) => ((n / SUM) * 100).toPrecision(2);
	console.log('Checks:', SUM);
	console.log('Passed:', passed, `(${percent(passed)}%)`);
	console.log('Unsupported:', unsupported, `(${percent(unsupported)}%)`);
	console.log('Errors:', errored, `(${percent(errored)}%)`);

	await updateMarkdown(
		'./README.md',
		runtimes,
		allTestResults,
	);
})();
