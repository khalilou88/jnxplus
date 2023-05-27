import { ExecutorContext } from '@nx/devkit';
import { runCommand } from '../../.';
import executor from './executor';
import { KotlinFormatExecutorSchema } from './schema';
jest.mock('@jnxplus/common');

const options: KotlinFormatExecutorSchema = {};
const context: ExecutorContext = {
  root: '/root',
  cwd: '/root',
  projectName: 'my-app',
  targetName: 'lint',
  workspace: {
    version: 2,
    projects: {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      'my-app': <any>{
        root: 'apps/wibble',
        sourceRoot: 'apps/wibble',
      },
    },
    npmScope: 'test',
  },
  isVerbose: false,
};

describe('Kotlin Format Executor', () => {
  beforeEach(async () => {
    (runCommand as jest.Mock).mockReturnValue({ success: true });
  });

  xit('can run', async () => {
    const output = await executor(options, context, '');
    expect(output.success).toBe(true);
  });
});
