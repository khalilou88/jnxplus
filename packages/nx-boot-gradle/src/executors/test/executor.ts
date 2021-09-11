import { ExecutorContext } from '@nrwl/devkit';
import { getProjectPath, runCommand } from '../../utils/command';
import { TestExecutorSchema } from './schema';

export default async function runExecutor(
  options: TestExecutorSchema,
  context: ExecutorContext
) {
  console.log('Executor ran for Test', options);
  const command = `${getProjectPath(context)}:test`;
  return runCommand(command);
}
