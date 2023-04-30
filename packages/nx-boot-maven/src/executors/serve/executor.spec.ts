import { ExecutorContext } from '@nrwl/devkit';
import { runCommand } from '../../utils/command';
import executor from './executor';
import { ServeExecutorSchema } from './schema';
jest.mock('../../utils/command');

const options: ServeExecutorSchema = {
  args: 'args',
};
const context: ExecutorContext = {
  root: '/root',
  cwd: '/root',
  projectName: 'my-app',
  targetName: 'serve',
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

describe('Serve Executor', () => {
  beforeEach(async () => {
    (runCommand as jest.Mock).mockReturnValue({ success: true });
  });

  it('can run', async () => {
    const output = await executor(options, context);

    expect(output.success).toBe(true);
    expect(runCommand).toHaveBeenCalledWith(
      expect.stringMatching(/spring-boot:run -pl :my-app args$/)
    );
  });

  describe('when args option is undefined', () => {
    it('run without extra args', async () => {
      const output = await executor({} as ServeExecutorSchema, context);

      expect(output.success).toBe(true);
      expect(runCommand).toHaveBeenCalledWith(
        expect.stringMatching(/spring-boot:run -pl :my-app$/)
      );
    });
  });
});
