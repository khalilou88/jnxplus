import { ExecutorContext } from '@nrwl/devkit';
import { getProjectPath, runCommand, waitForever } from '../../utils/command';
import { ServeExecutorSchema } from './schema';

export default async function runExecutor(
  options: ServeExecutorSchema,
  context: ExecutorContext
) {
  console.log('Executor ran for serve', options);
  const command = `${getProjectPath(context)}:bootRun`;
  const result = runCommand(command);

  if (!result.success) {
    return { success: false };
  }

  await waitForever();
  return { success: true };
}
