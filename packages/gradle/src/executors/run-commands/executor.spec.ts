import { RunCommandsExecutorSchema } from './schema';
import executor from './executor';

const options: RunCommandsExecutorSchema = { command: '', cwd: '' };

describe('RunCommands Executor', () => {
  xit('can run', async () => {
    const output = await executor(options);
    expect(output.success).toBe(true);
  });
});
