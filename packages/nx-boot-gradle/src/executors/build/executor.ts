import { ExecutorContext } from '@nrwl/devkit';
import { getProjectPath, runCommand } from '../../utils/command';
import { BuildExecutorSchema } from './schema';

export default async function runExecutor(
  options: BuildExecutorSchema,
  context: ExecutorContext
) {
  console.log('Executor ran for Build', options);
  console.log(context);
  const command = `${getProjectPath(context)}:${context.targetName}`;
  return runCommand(command);
}
