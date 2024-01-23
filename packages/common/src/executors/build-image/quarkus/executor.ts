import { ExecutorContext, logger, workspaceRoot } from '@nx/devkit';
import { join } from 'path';
import { getProjectRoot, runCommand } from '../../../.';
import { QuarkusBuildImageExecutorSchema } from './schema';

export default async function runExecutor(
  options: QuarkusBuildImageExecutorSchema,
  context: ExecutorContext,
) {
  logger.info(
    `Executor ran for Quarkus Build Image: ${JSON.stringify(options)}`,
  );

  let imageNameSuffix = '';

  if (options.imageNameSuffix) {
    imageNameSuffix = `-${options.imageNameSuffix}`;
  } else {
    if (options.imageType === 'jvm') {
      imageNameSuffix = '-jvm';
    }

    if (options.imageType === 'legacy-jar') {
      imageNameSuffix = '-legacy-jar';
    }
  }

  const workDir = join(workspaceRoot, getProjectRoot(context));

  return runCommand(
    `docker build -f src/main/docker/Dockerfile.${options.imageType} -t ${options.imageNamePrefix}/${context.projectName}${imageNameSuffix} .`,
    workDir,
  );
}
