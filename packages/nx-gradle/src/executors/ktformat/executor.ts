import {
  KotlinFormatExecutorSchema,
  runKtFormatExecutor,
} from '@jnxplus/common';
import { ExecutorContext } from '@nx/devkit';

export default async function runExecutor(
  options: KotlinFormatExecutorSchema,
  context: ExecutorContext,
) {
  const ktlintPath = '';
  return runKtFormatExecutor(options, context, ktlintPath);
}
