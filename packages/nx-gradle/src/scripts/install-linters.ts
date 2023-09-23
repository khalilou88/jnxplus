import { getCheckstylePath, getKtlintPath, isE2eTest } from '@jnxplus/common';
import { getCheckstyleVersion, getKtlintVersion } from '@jnxplus/gradle';
import { logger, workspaceRoot } from '@nx/devkit';
import * as path from 'path';

(async () => {
  if (process.env['NX_VERBOSE_LOGGING'] === 'true') {
    logger.debug('Install Linters');
  }

  let workspaceRootToUse = workspaceRoot;
  const tmpWorkspaceRoot = path.join(
    workspaceRootToUse,
    'tmp',
    'nx-e2e',
    'proj',
  );

  if (isE2eTest(tmpWorkspaceRoot)) {
    workspaceRootToUse = tmpWorkspaceRoot;
  }

  await getCheckstylePath(getCheckstyleVersion, workspaceRootToUse);
  await getKtlintPath(getKtlintVersion, workspaceRootToUse);
})();
