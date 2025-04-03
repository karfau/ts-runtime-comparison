import path from 'path';
import { execaNode } from 'execa';
import type { RuntimeData, Runtime } from '../types';

export function createRuntime(
	runtimeData: RuntimeData,
): Runtime {
	return {
		...runtimeData,
		version: (process.env[`npm_package_dependencies_${runtimeData.npmName.replace(/[@/-]/g, '_')}`] || 'unknown'),
		async run(
			this: RuntimeData,
			cwd: string,
			...args: string[]
		) {
			const result = await execaNode(
				path.resolve(this.binaryPath),
				args,
				{
					cwd,
					nodePath: this.nodePath,
					nodeOptions: [],
				},
			);

			if (result.stderr.includes('UnhandledPromiseRejectionWarning')) {
				throw result;
			}

			return result.stdout;
		},
	};
}
