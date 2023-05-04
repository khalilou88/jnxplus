import { logger, workspaceRoot } from '@nx/devkit';
import {
  getCheckstyleJarAbsolutePath,
  getKtlintAbsolutePath,
} from '../utils/command';
import * as path from 'path';

(async () => {
  if (process.env.NX_VERBOSE_LOGGING === 'true') {
    logger.debug('Install Linters');
  }

  const tmpProjPath = path.join(workspaceRoot, 'tmp', 'nx-e2e', 'proj');
  const relative = path.relative(workspaceRoot, process.cwd());
  const isSubdir =
    relative && !relative.startsWith('..') && !path.isAbsolute(relative);

  if (isSubdir) {
    await getCheckstyleJarAbsolutePath(tmpProjPath);
    await getKtlintAbsolutePath(tmpProjPath);
  } else {
    await getCheckstyleJarAbsolutePath();
    await getKtlintAbsolutePath();
  }
})();
