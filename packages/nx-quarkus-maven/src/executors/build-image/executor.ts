import { ExecutorContext, logger } from '@nrwl/devkit';
import { getProjectSourceRoot, runCommand } from '../../utils/command';
import { BuildImageExecutorSchema } from './schema';

export default async function runExecutor(
  options: BuildImageExecutorSchema,
  context: ExecutorContext
) {
  logger.info(`Executor ran for Build Image: ${JSON.stringify(options)}`);

  let imageNameSuffix = '';

  if (options.imageNameSuffix) {
    imageNameSuffix = `-${options.imageNameSuffix}`;
  } else {
    if (options.imageType === 'jvm') {
      imageNameSuffix = `-jvm`;
    }

    if (options.imageType === 'legacy-jar') {
      imageNameSuffix = `-legacy-jar`;
    }
  }

  const projectSourceRoot = getProjectSourceRoot(context);

  return runCommand(
    `docker build -f ${projectSourceRoot}/main/docker/Dockerfile.${options.imageType} -t ${options.imageNamePrefix}/${context.projectName}${imageNameSuffix}`
  );
}
