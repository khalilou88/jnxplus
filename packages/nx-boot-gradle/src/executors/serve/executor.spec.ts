import { BuildExecutorSchema } from './schema';
import executor from './executor';
import { ExecutorContext } from '@nrwl/devkit';
import { mockExecutorContext } from '../../utils/mocks';

const options: BuildExecutorSchema = {};
const context: ExecutorContext = mockExecutorContext('serve');

describe('Serve Executor', () => {
  xit('can run', async () => {
    const output = await executor(options, context);
    expect(output).toBeTruthy;
  });
});
