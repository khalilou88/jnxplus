import { createTestWorkspaceWithCustomCli } from '@jnxplus/internal/testing';
import { execSync } from 'child_process';
import { rmSync } from 'fs';

describe('create-nx-maven-workspace', () => {
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
      'create-nx-maven-workspace',
      '--javaVersion 17 --groupId com.example --parentProjectName root-project --parentProjectVersion 0.0.0 --mavenRootDirectory nx-maven --dependencyManagement spring-boot-parent-pom',
    );

    // npm ls will fail if the package is not installed properly
    execSync('npm ls @jnxplus/nx-maven', {
      cwd: workspaceDirectory,
      stdio: 'inherit',
    });
  });
});
