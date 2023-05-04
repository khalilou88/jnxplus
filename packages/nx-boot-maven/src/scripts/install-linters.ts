import { getCheckstylePath, getKtlintPath } from '@jnxplus/common';
import { getCheckstyleVersion, getKtlintVersion } from '@jnxplus/maven';
import { logger } from '@nx/devkit';

(async () => {
  if (process.env.NX_VERBOSE_LOGGING === 'true') {
    logger.debug('Install Linters');
  }
  await getCheckstylePath(getCheckstyleVersion);
  await getKtlintPath(getKtlintVersion);
})();
