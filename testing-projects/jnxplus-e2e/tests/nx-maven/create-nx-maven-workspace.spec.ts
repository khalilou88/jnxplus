import { createTestWorkspaceWithCustomCli } from '@jnxplus/internal/testing';
import { execSync } from 'child_process';
import { rmSync } from 'fs';

describe('nx-maven create-nx-maven-workspace', () => {
  let workspaceDirectory: string;

  afterAll(() => {
    if (process.env['SKIP_E2E_CLEANUP'] !== 'true') {
      // Cleanup the test project
      rmSync(workspaceDirectory, {
        recursive: true,
        force: true,
      });
    }
  });

  it('should be installed', () => {
    workspaceDirectory = createTestWorkspaceWithCustomCli(
      'create-nx-maven-workspace',
      '--javaVersion 17 --aggregatorProjectGroupId com.example --aggregatorProjectName root-project --aggregatorProjectVersion 0.0.0 --mavenRootDirectory nx-maven',
    );

    // npm ls will fail if the package is not installed properly
    execSync('npm ls @jnxplus/nx-maven', {
      cwd: workspaceDirectory,
      stdio: 'inherit',
    });
  });
});
