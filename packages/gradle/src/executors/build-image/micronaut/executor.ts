import { ExecutorContext } from '@nx/devkit';
import { getExecutable, getProjectPath } from '../../../.';
import { runCommand } from '@jnxplus/common';
import { BuildImage2ExecutorSchema } from './schema';

export default async function run2Executor(
  options: BuildImage2ExecutorSchema,
  context: ExecutorContext
) {
  if (options.useDocker && options.native && options.optimized) {
    return runCommand(
      `${getExecutable()} ${getProjectPath(context)}:optimizedDockerBuildNative`
    );
  }

  if (options.useDocker && !options.native && options.optimized) {
    return runCommand(
      `${getExecutable()} ${getProjectPath(context)}:optimizedDockerBuild`
    );
  }

  if (options.useDocker && options.native && !options.optimized) {
    return runCommand(
      `${getExecutable()} ${getProjectPath(context)}:dockerBuildNative`
    );
  }

  if (options.useDocker && !options.native && !options.optimized) {
    return runCommand(
      `${getExecutable()} ${getProjectPath(context)}:dockerBuild`
    );
  }

  if (!options.useDocker) {
    return runCommand(
      `${getExecutable()} ${getProjectPath(context)}:nativeCompile`
    );
  }

  throw new Error(`Case not handled`);
}
