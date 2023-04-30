import { ExecutorContext, logger } from '@nx/devkit';
import { join } from 'path';
import { getExecutable, getProjectRoot, runCommand } from '../../utils/command';
import { readXml } from '../../utils/xml';
import { BuildExecutorSchema } from './schema';

export default async function runExecutor(
  options: BuildExecutorSchema,
  context: ExecutorContext
) {
  logger.info(`Executor ran for Build: ${JSON.stringify(options)}`);

  let command = getExecutable();

  if (isPomPackaging(context)) {
    command += isRootProject(context) ? ' install -N' : ' install';

    return runCommand(`${command} -pl :${context.projectName}`);
  }

  if (options.mvnArgs) {
    command += ` ${options.mvnArgs}`;
  }

  if (!options.skipClean) {
    command += ' clean';
  }

  if (options.mvnBuildCommand) {
    command += ` ${options.mvnBuildCommand}`;
  } else {
    if (getProjectType(context) === 'application') {
      command += ' compile';
    }

    if (getProjectType(context) === 'library') {
      command += ' install';
    }
  }

  if (options.mvnBuildArgs) {
    command += ` ${options.mvnBuildArgs}`;
  }

  return runCommand(`${command} -DskipTests=true -pl :${context.projectName}`);
}

function getProjectType(context: ExecutorContext) {
  return context.projectsConfigurations.projects[context.projectName]
    .projectType;
}

function isPomPackaging(context: ExecutorContext): boolean {
  const projectRoot = getProjectRoot(context);
  const pomXmlPath = join(context.root, projectRoot, 'pom.xml');
  const pomXmlContent = readXml(pomXmlPath);
  const packagingXml = pomXmlContent.childNamed('packaging');

  if (packagingXml === undefined) {
    return false;
  }

  return packagingXml.val === 'pom';
}

function isRootProject(context: ExecutorContext): boolean {
  const projectRoot = getProjectRoot(context);
  return projectRoot === '';
}
