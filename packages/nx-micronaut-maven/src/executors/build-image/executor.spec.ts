import { ExecutorContext } from '@nx/devkit';
import { runCommand } from '@jnxplus/common';
import executor from './executor';
import { BuildImageExecutorSchema } from './schema';
jest.mock('@jnxplus/common');
jest.mock('path');

const options: BuildImageExecutorSchema = {
  imageType: 'jvm',
  imageNamePrefix: '',
  imageNameSuffix: '',
};
const context: ExecutorContext = {
  root: '/root',
  cwd: '/root',
  projectName: 'my-app',
  targetName: 'build',
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

describe('Build Image Executor', () => {
  beforeEach(async () => {
    (runCommand as jest.Mock).mockReturnValue({ success: true });
  });

  it('can run', async () => {
    const output = await executor(options, context);
    expect(output.success).toBe(true);
  });
});
