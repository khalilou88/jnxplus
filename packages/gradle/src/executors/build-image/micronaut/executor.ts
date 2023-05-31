import { ExecutorContext, logger } from '@nx/devkit';
import { getExecutable, getProjectPath } from '../../../.';
import { runCommand } from '@jnxplus/common';
import { BuildImageExecutorSchema } from './schema';

export default async function runExecutor(
  options: BuildImageExecutorSchema,
  context: ExecutorContext
) {
  logger.info(`Executor ran for Build Image: ${JSON.stringify(options)}`);

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
