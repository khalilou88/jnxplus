import { ExecutorContext } from '@nx/devkit';
import { workspaceLayout } from 'nx/src/config/configuration';

export function getProject(context: ExecutorContext) {
  if (!context.projectName) {
    throw new Error('No project name found in context');
  }

  const project =
    context?.projectsConfigurations?.projects[context.projectName];

  if (!project) {
    throw new Error(
      `No project found in project graph for ${context.projectName}`,
    );
  }
  return project;
}

export function getProjectRoot(context: ExecutorContext) {
  const project = getProject(context);
  return project.root;
}

export function isRootProject(context: ExecutorContext): boolean {
  const projectRoot = getProjectRoot(context);
  return !projectRoot;
}

export function getProjectType(context: ExecutorContext) {
  const project = getProject(context);
  return project.projectType;
}

export function getProjectSourceRoot(context: ExecutorContext) {
  const project = getProject(context);
  return project.sourceRoot;
}

export function normalizeName(name: string) {
  return name.replace(/[^0-9a-zA-Z]/g, '-');
}

export function getProjectGraphNodeType(
  projectRoot: string,
): 'app' | 'e2e' | 'lib' {
  if (!projectRoot) {
    return 'lib';
  }

  const layout = workspaceLayout();

  if (projectRoot.startsWith(layout.appsDir)) {
    return 'app';
  }

  return 'lib';
}

export function getPluginName(context: ExecutorContext) {
  return context.target?.executor?.split(':')[0];
}

function titleCase(str: string) {
  return str
    .toLowerCase()
    .split(' ')
    .map(function (word) {
      return word.replace(word[0], word[0].toUpperCase());
    })
    .join(' ');
}

export function getTargetName(context: ExecutorContext) {
  if (!context.targetName) {
    throw new Error('targetName must set');
  }
  return titleCase(context.targetName.replace(/-/g, ' '));
}
