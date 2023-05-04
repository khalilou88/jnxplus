import { logger, workspaceRoot } from '@nx/devkit';
import * as path from 'path';
import { getCheckstyleVersion, getKtlintVersion } from '@jnxplus/maven';
import { getCheckstylePath, getKtlintPath } from '@jnxplus/common';

(async () => {
  if (process.env.NX_VERBOSE_LOGGING === 'true') {
    logger.debug('Install Linters');
  }

  const tmpProjPath = path.join(workspaceRoot, 'tmp', 'nx-e2e', 'proj');
  const relative = path.relative(workspaceRoot, process.cwd());
  const isSubdir =
    relative && !relative.startsWith('..') && !path.isAbsolute(relative);

  if (isSubdir) {
    await getCheckstylePath(getCheckstyleVersion, tmpProjPath);
    await getKtlintPath(getKtlintVersion, tmpProjPath);
  } else {
    await getCheckstylePath(getCheckstyleVersion);
    await getKtlintPath(getKtlintVersion);
  }
})();
