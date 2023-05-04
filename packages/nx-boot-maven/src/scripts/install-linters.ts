import { getCheckstylePath, getKtlintPath } from '@jnxplus/common';
import { getCheckstyleVersion, getKtlintVersion } from '@jnxplus/maven';
import { logger, workspaceRoot } from '@nx/devkit';
import * as fs from 'fs';
import * as path from 'path';

(async () => {
  if (process.env.NX_VERBOSE_LOGGING === 'true') {
    logger.debug('Install Linters');
  }

  let workspaceRootToUse = workspaceRoot;
  const tmpWorkspaceRoot = path.join(
    workspaceRootToUse,
    'tmp',
    'nx-e2e',
    'proj'
  );

  if (isE2eTest(tmpWorkspaceRoot)) {
    workspaceRootToUse = tmpWorkspaceRoot;
  }

  await getCheckstylePath(getCheckstyleVersion, workspaceRootToUse);
  await getKtlintPath(getKtlintVersion, workspaceRootToUse);
})();

function isE2eTest(tmpWorkspaceRoot: string) {
  return (
    fs.existsSync(tmpWorkspaceRoot) && isSubdir(tmpWorkspaceRoot, process.cwd())
  );
}

function isSubdir(parentPath: string, childPath: string) {
  const relative = path.relative(parentPath, childPath);
  const isSubdir =
    relative && !relative.startsWith('..') && !path.isAbsolute(relative);
  return isSubdir;
}
