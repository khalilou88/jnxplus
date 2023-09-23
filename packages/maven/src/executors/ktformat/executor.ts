import {
  KotlinFormatExecutorSchema,
  getKtlintPath,
  runKtFormatExecutor,
} from '@jnxplus/common';
import { ExecutorContext } from '@nx/devkit';
import { getKtlintVersion } from '../../lib/utils';

export default async function runExecutor(
  options: KotlinFormatExecutorSchema,
  context: ExecutorContext,
) {
  const ktlintPath = await getKtlintPath(getKtlintVersion);
  return runKtFormatExecutor(options, context, ktlintPath);
}
