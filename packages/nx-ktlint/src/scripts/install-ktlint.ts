import { isE2eTest } from '@jnxplus/common';
import { logger, workspaceRoot } from '@nx/devkit';
import * as path from 'path';
import { getKtlintPath } from '../lib/nx-ktlint';

(async () => {
  if (process.env['NX_VERBOSE_LOGGING'] === 'true') {
    logger.debug('Install Ktlint');
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

  await getKtlintPath(workspaceRootToUse);
})();
