import {
  PresetType,
  VersionManagementType,
  jnxplusGradlePluginVersion,
  kotlinVersion,
  kspVersion,
  micronautVersion,
  quarkusVersion,
  shadowVersion,
  springBootVersion,
  springDependencyManagementVersion,
} from '@jnxplus/common';
import { Tree, joinPathFragments, workspaceRoot } from '@nx/devkit';
import * as fs from 'fs';
import { join } from 'path';

export async function addMissingCode(
  versionManagement: VersionManagementType,
  gradleRootDirectory: string,
  framework: PresetType | undefined,
  language: string,
) {
  if (versionManagement !== 'version-catalog') {
    return;
  }

  const { parse } = await (Function("return import('smol-toml')")() as Promise<
    typeof import('smol-toml')
  >);

  const libsVersionsTomlPath = join(
    workspaceRoot,
    gradleRootDirectory,
    'gradle',
    'libs.versions.toml',
  );

  const catalog = parse(fs.readFileSync(libsVersionsTomlPath, 'utf-8'));

  const elements: ElementsType = getElements(
    {
      gradleRootDirectory: gradleRootDirectory,
      javaVersion: '17',
      preset: framework,
      language: language,
    },
    catalog,
  );

  console.log(elements);

  // const str = stringify(catalog);
  // const libsVersionsTomlPath2 = join(
  //   workspaceRoot,
  //   gradleRootDirectory,
  //   'gradle',
  //   'libs.versions2.toml',
  // );
  // fs.writeFileSync(libsVersionsTomlPath2, str);
}

export function addLibsVersionsToml(
  tree: Tree,
  options: {
    gradleRootDirectory: string;
    javaVersion: string | number;
    preset: PresetType;
    language: string;
  },
) {
  const libsVersionsTomlPath = joinPathFragments(
    options.gradleRootDirectory,
    'gradle',
    'libs.versions.toml',
  );

  const libsVersionsTomlContent = getLibsVersionsTomlContent(options);

  if (!tree.exists(libsVersionsTomlPath)) {
    tree.write(libsVersionsTomlPath, libsVersionsTomlContent);
  }
}

type ElementsType = {
  versions: string[];
  libraries: string[];
  plugins: string[];
};

function getLibsVersionsTomlContent(options: {
  gradleRootDirectory: string;
  javaVersion: string | number;
  preset: PresetType | undefined;
  language: string;
}) {
  const elements: ElementsType = getElements(options);

  return `[versions]\n${elements.versions.join(
    '\n',
  )}\n\n[libraries]\n${elements.libraries.join(
    '\n',
  )}\n\n[plugins]\n${elements.plugins.join('\n')}`;
}

function getElements(
  options: {
    gradleRootDirectory: string;
    javaVersion: string | number;
    preset: PresetType | undefined;
    language: string;
  },
  // eslint-disable-next-line @typescript-eslint/no-unused-vars, @typescript-eslint/no-explicit-any
  catalog?: any,
) {
  const elements: ElementsType = { versions: [], libraries: [], plugins: [] };

  elements.versions.push(`java = "${options.javaVersion}"`);
  elements.versions.push(`kotlin = "${kotlinVersion}"`);

  elements.plugins.push(
    `github-khalilou88-jnxplus = { id = "io.github.khalilou88.jnxplus", version = "${jnxplusGradlePluginVersion}" }`,
  );
  elements.plugins.push(
    'jetbrains-kotlin-jvm = { id = "org.jetbrains.kotlin.jvm", version.ref = "kotlin" }',
  );

  if (options.preset === 'spring-boot') {
    elements.versions.push(`spring-boot = "${springBootVersion}"`);
    elements.plugins.push(
      'springframework-boot = { id = "org.springframework.boot", version.ref = "spring-boot" }',
    );
    elements.plugins.push(
      `spring-dependency-management = { id = "io.spring.dependency-management", version = "${springDependencyManagementVersion}" }`,
    );
    elements.plugins.push(
      'jetbrains-kotlin-plugin-spring = { id = "org.jetbrains.kotlin.plugin.spring", version.ref = "kotlin" }',
    );
  }

  if (options.preset === 'quarkus') {
    elements.versions.push(`quarkus = "${quarkusVersion}"`);
    elements.libraries.push(
      'quarkus-platform-quarkus-bom = { module = "io.quarkus.platform:quarkus-bom", version.ref = "quarkus" }',
    );
    elements.plugins.push(
      'quarkus = { id = "io.quarkus", version.ref = "quarkus" }',
    );
    elements.plugins.push(
      'jetbrains-kotlin-plugin-allopen = { id = "org.jetbrains.kotlin.plugin.allopen", version.ref = "kotlin" }',
    );
  }

  if (options.preset === 'micronaut') {
    elements.versions.push(`micronaut = "${micronautVersion} "`);
    elements.plugins.push(
      'jetbrains-kotlin-plugin-allopen = { id = "org.jetbrains.kotlin.plugin.allopen", version.ref = "kotlin" }',
    );
    elements.plugins.push(
      'micronaut-aot = { id = "io.micronaut.aot", version = "4.2.1" }',
    );
    elements.plugins.push(
      'micronaut-application = { id = "io.micronaut.application", version = "4.2.1" }',
    );
    elements.plugins.push(
      'micronaut-library = { id = "io.micronaut.library", version = "4.2.1" }',
    );
    elements.plugins.push(
      `google-devtools-ksp = { id = "com.google.devtools.ksp", version = "${kspVersion}" }`,
    );
    elements.plugins.push(
      `github-johnrengelman-shadow = { id = "com.github.johnrengelman.shadow", version = "${shadowVersion}" }`,
    );
  }

  return elements;
}
