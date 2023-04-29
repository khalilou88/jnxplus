import { ExecutorContext, logger } from '@nrwl/devkit';
import { join } from 'path';
import { getExecutable, runCommand } from '../../utils/command';
import { readXml } from '../../utils/xml';
import { BuildExecutorSchema } from './schema';

export default async function runExecutor(
  options: BuildExecutorSchema,
  context: ExecutorContext
) {
  logger.info(`Executor ran for Build: ${JSON.stringify(options)}`);

  let command = getExecutable();

  if (isPomPackaging(context)) {
    command += hasSubProjects() ? ' install -N' : ' install';

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
  return context.workspace.projects[context.projectName].projectType;
}

function getProjectRoot(context: ExecutorContext) {
  return context.workspace.projects[context.projectName].root;
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

function hasSubProjects() {
  return true;
}
