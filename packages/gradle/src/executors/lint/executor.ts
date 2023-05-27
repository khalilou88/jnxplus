import {
  getCheckstylePath,
  getKtlintPath,
  runKtlintExecutor,
  runPmdLintExecutor,
  runCheckstyleLintExecutor,
} from '@jnxplus/common';
import { ExecutorContext, logger } from '@nx/devkit';
import { getCheckstyleVersion, getKtlintVersion } from '../../../.';
import { LintExecutorSchema } from '@jnxplus/common';

export default async function runExecutor(
  options: LintExecutorSchema,
  context: ExecutorContext
) {
  logger.info(`Executor ran for Lint: ${JSON.stringify(options)}`);
  if (options.linter === 'checkstyle') {
    const checkstylePath = await getCheckstylePath(getCheckstyleVersion);
    return runCheckstyleLintExecutor(options, context, checkstylePath);
  }

  if (options.linter === 'pmd') {
    return runPmdLintExecutor(options, context);
  }

  if (options.linter === 'ktlint') {
    const ktlintPath = await getKtlintPath(getKtlintVersion);
    return runKtlintExecutor(options, context, ktlintPath);
  }

  throw new Error(`Unknown option ${options.linter}`);
}
