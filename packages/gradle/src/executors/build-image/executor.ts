import { getPluginName, runBuildImageExecutor } from '@jnxplus/common';
import { ExecutorContext, logger } from '@nx/devkit';
import run1Executor from './boot/executor';
import run2Executor from './micronaut/executor';
import { BuildImageExecutorSchema } from './schema';

export default async function runExecutor(
  options: BuildImageExecutorSchema,
  context: ExecutorContext
) {
  logger.info(`Executor ran for Build Image: ${JSON.stringify(options)}`);

  if (
    getPluginName(context) === '@jnxplus/nx-boot-gradle' ||
    options.framework === 'spring-boot'
  ) {
    return await run1Executor(options, context);
  }

  if (
    getPluginName(context) === '@jnxplus/nx-quarkus-gradle' ||
    options.framework === 'quarkus'
  ) {
    return await runBuildImageExecutor(options, context);
  }

  if (
    getPluginName(context) === '@jnxplus/nx-micronaut-gradle' ||
    options.framework === 'micronaut'
  ) {
    return await run2Executor(options, context);
  }

  throw new Error('Unhandled options');
}
