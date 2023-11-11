import { createTestWorkspaceWithCustomCli } from '@jnxplus/internal/testing';
import { execSync } from 'child_process';
import { rmSync } from 'fs';

describe('create-nx-gradle-workspace', () => {
  let workspaceDirectory: string;

  afterAll(() => {
    // Cleanup the test project
    rmSync(workspaceDirectory, {
      recursive: true,
      force: true,
    });
  });

  it('should be installed', () => {
    workspaceDirectory = createTestWorkspaceWithCustomCli(
      'create-nx-gradle-workspace',
      '--javaVersion 17 --dsl kotlin --rootProjectName root-project --gradleRootDirectory nx-gradle --preset micronaut',
    );

    // npm ls will fail if the package is not installed properly
    execSync('npm ls @jnxplus/nx-gradle', {
      cwd: workspaceDirectory,
      stdio: 'inherit',
    });
  });
});
