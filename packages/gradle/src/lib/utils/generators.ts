import { DSLType } from '@jnxplus/common';
import { Tree } from '@nx/devkit';

export function getDsl(tree: Tree): DSLType {
  const filePath = 'settings.gradle';

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
      gradleWrapperGitattributes
    );
    tree.write(gitattributesPath, gitattributesContent);
  } else {
    tree.write(gitattributesPath, gradleWrapperGitattributes);
  }
}
