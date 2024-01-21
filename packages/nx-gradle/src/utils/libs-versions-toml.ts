import { VersionManagementType } from '@jnxplus/common';
import { workspaceRoot } from '@nx/devkit';
import * as fs from 'fs';
import { join } from 'path';

export async function addMissingCode(
  versionManagement: VersionManagementType,
  gradleRootDirectory: string,
  framework: string | undefined,
  language: string,
) {
  if (versionManagement !== 'version-catalog') {
    return;
  }

  const { parse, stringify } = await import('smol-toml');

  const libsVersionsTomlPath = join(
    workspaceRoot,
    gradleRootDirectory,
    'gradle',
    'libs.versions.toml',
  );

  const catalog = parse(fs.readFileSync(libsVersionsTomlPath, 'utf-8'));

  console.log(catalog);
  console.log(framework);
  console.log(language);

  const str = stringify(catalog);
  const libsVersionsTomlPath2 = join(
    workspaceRoot,
    gradleRootDirectory,
    'gradle',
    'libs.versions2.toml',
  );
  fs.writeFileSync(libsVersionsTomlPath2, str);
}
