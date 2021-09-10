import { ExecutorContext } from '@nrwl/devkit';
import { mockExecutorContext } from '../../utils/mocks';
import executor from './executor';
import { BuildExecutorSchema } from './schema';

const options: BuildExecutorSchema = {};
const context: ExecutorContext = mockExecutorContext('test');

describe('Test Executor', () => {
  xit('can run', async () => {
    const output = await executor(options, context);
    expect(output.success).toBe(true);
  });
});
