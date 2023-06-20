import { getPluginName, runQuarkusBuildImageExecutor } from '@jnxplus/common';
import { ExecutorContext, logger } from '@nx/devkit';
import runBootBuildImageExecutor from './boot/executor';
import runMicronautBuildImageExecutor from './micronaut/executor';
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
    return await runBootBuildImageExecutor(options, context);
  }

  if (
    getPluginName(context) === '@jnxplus/nx-quarkus-gradle' ||
    options.framework === 'quarkus'
  ) {
    return await runQuarkusBuildImageExecutor(options, context);
  }

  if (
    getPluginName(context) === '@jnxplus/nx-micronaut-gradle' ||
    options.framework === 'micronaut'
  ) {
    return await runMicronautBuildImageExecutor(options, context);
  }

  throw new Error('Unhandled options');
}
