import { DSLType } from '@jnxplus/common';
import { Tree, joinPathFragments, readProjectConfiguration } from '@nx/devkit';
import { join } from 'path';
import { getProjectPathFromProjectRoot } from '.';

export function getDsl(tree: Tree, gradleRootDirectory: string): DSLType {
  const filePath = joinPathFragments(gradleRootDirectory, 'settings.gradle');

  if (tree.exists(filePath)) {
    return 'groovy';
  }

  return 'kotlin';
}

export function addOrUpdateGitattributes(tree: Tree) {
  const gitattributesPath = `.gitattributes`;
  const gradleWrapperGitattributes = `#\n# https://help.github.com/articles/dealing-with-line-endings/\n#\n# Linux start script should use lf\ngradlew text eol=lf\n# Windows script files should use crlf\n*.bat text eol=crlf`;
  if (tree.exists(gitattributesPath)) {
    const gitattributesOldContent = tree.read(gitattributesPath, 'utf-8') || '';
    const gitattributesContent = gitattributesOldContent.concat(
      '\n',
      gradleWrapperGitattributes,
    );
    tree.write(gitattributesPath, gitattributesContent);
  } else {
    tree.write(gitattributesPath, gradleWrapperGitattributes);
  }
}

export function addProjectToGradleSetting(
  tree: Tree,
  options: { projectRoot: string; gradleRootDirectory: string },
) {
  const filePath = joinPathFragments(
    options.gradleRootDirectory,
    'settings.gradle',
  );
  const ktsFilePath = joinPathFragments(
    options.gradleRootDirectory,
    'settings.gradle.kts',
  );

  const regex = /.*rootProject\.name.*/;
  const projectPath = getProjectPathFromProjectRoot(
    options.projectRoot,
    options.gradleRootDirectory,
  );

  if (tree.exists(filePath)) {
    const settingsContent = tree.read(filePath, 'utf-8') || '';

    const newSettingsContent = settingsContent.replace(
      regex,
      `$&\ninclude('${projectPath}')`,
    );
    tree.write(filePath, newSettingsContent);
  }

  if (tree.exists(ktsFilePath)) {
    const settingsContent = tree.read(ktsFilePath, 'utf-8') || '';

    const newSettingsContent = settingsContent.replace(
      regex,
      `$&\ninclude("${projectPath}")`,
    );
    tree.write(ktsFilePath, newSettingsContent);
  }
}

export function addLibraryToProjects(
  tree: Tree,
  options: {
    projectRoot: string;
    parsedProjects: string[];
    gradleRootDirectory: string;
  },
) {
  const regex = /dependencies\s*{/;
  const projectPath = getProjectPathFromProjectRoot(
    options.projectRoot,
    options.gradleRootDirectory,
  );

  for (const projectName of options.parsedProjects) {
    const projectRoot = readProjectConfiguration(tree, projectName).root;
    const filePath = join(projectRoot, `build.gradle`);
    const ktsPath = join(projectRoot, `build.gradle.kts`);

    if (tree.exists(filePath)) {
      const buildGradleContent = tree.read(filePath, 'utf-8') || '';
      const newBuildGradleContent = buildGradleContent.replace(
        regex,
        `$&\n\timplementation project(':${projectPath}')`,
      );
      tree.write(filePath, newBuildGradleContent);
    }

    if (tree.exists(ktsPath)) {
      const buildGradleContent = tree.read(ktsPath, 'utf-8') || '';

      const newBuildGradleContent = buildGradleContent.replace(
        regex,
        `$&\n\timplementation(project(":${projectPath}"))`,
      );
      tree.write(ktsPath, newBuildGradleContent);
    }
  }
}

export function updateGitIgnore(tree: Tree) {
  const filePath = `.gitignore`;
  const contents = tree.read(filePath, 'utf-8') || '';

  const gradleIgnore = '\n# Gradle\n.gradle\nbuild';

  const newContents = contents.concat(gradleIgnore);
  tree.write(filePath, newContents);
}

export function addOrUpdatePrettierIgnore(tree: Tree) {
  const prettierIgnorePath = `.prettierignore`;
  const gradlePrettierIgnore = '# Gradle build\nbuild';
  if (tree.exists(prettierIgnorePath)) {
    const prettierIgnoreOldContent =
      tree.read(prettierIgnorePath, 'utf-8') || '';
    const prettierIgnoreContent = prettierIgnoreOldContent.concat(
      '\n',
      gradlePrettierIgnore,
    );
    tree.write(prettierIgnorePath, prettierIgnoreContent);
  } else {
    tree.write(prettierIgnorePath, gradlePrettierIgnore);
  }
}
