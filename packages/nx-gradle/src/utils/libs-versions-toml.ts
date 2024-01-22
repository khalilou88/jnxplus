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
import { Tree, joinPathFragments } from '@nx/devkit';

const regex1 = /\[versions]/;
const regex2 = /\[libraries]/;
const regex3 = /\[plugins]/;

const regex = '/plugins\\s*{/';

export async function addMissingCode(
  tree: Tree,
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

  const libsVersionsTomlPath = joinPathFragments(
    gradleRootDirectory,
    'gradle',
    'libs.versions.toml',
  );

  const libsVersionsTomlContent =
    tree.read(libsVersionsTomlPath, 'utf-8') || '';
  const catalog = parse(libsVersionsTomlContent);

  const elements: ElementsType = getElements(
    {
      gradleRootDirectory: gradleRootDirectory,
      javaVersion: '17',
      preset: framework,
      language: language,
    },
    catalog,
  );

  const newLibsVersionsTomlContent = libsVersionsTomlContent
    .replace(regex1, `[versions]\n${elements.versions.join('\n')}`)
    .replace(regex2, `[libraries]\n${elements.libraries.join('\n')}`)
    .replace(regex3, `[plugins]\n${elements.plugins.join('\n')}`);

  tree.write(libsVersionsTomlPath, newLibsVersionsTomlContent);

  if (elements.plugins.length > 0) {
    const buildGradlePath = joinPathFragments(
      gradleRootDirectory,
      'build.gradle',
    );
    const buildGradleKtsPath = joinPathFragments(
      gradleRootDirectory,
      'build.gradle.kts',
    );

    const a = elements.plugins.map((p) => p.split('=')[0].trim());

    if (tree.exists(buildGradlePath)) {
      const buildGradleContent = tree.read(buildGradlePath, 'utf-8') || '';

      const b = a.map((aa) => `alias ${aa} apply false`);

      const newBuildGradleContent = buildGradleContent.replace(
        regex,
        `plugins {\n${b.join('\n')}`,
      );
      tree.write(buildGradlePath, newBuildGradleContent);
    }

    if (tree.exists(buildGradleKtsPath)) {
      const buildGradleKtsContent =
        tree.read(buildGradleKtsPath, 'utf-8') || '';

      const bb = a.map((aa) => `alias(${aa}) apply false`);

      const newBuildGradleKtsContent = buildGradleKtsContent.replace(
        regex,
        `plugins {\n${bb.join('\n')}`,
      );
      tree.write(buildGradleKtsPath, newBuildGradleKtsContent);
    }
  }
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

  if (!catalog?.versions['java']) {
    elements.versions.push(`java = "${options.javaVersion}"`);
  }

  if (!catalog?.plugins['github-khalilou88-jnxplus']) {
    elements.plugins.push(
      `github-khalilou88-jnxplus = { id = "io.github.khalilou88.jnxplus", version = "${jnxplusGradlePluginVersion}" }`,
    );
  }

  if (options.language === 'kotlin') {
    if (!catalog?.versions['kotlin']) {
      elements.versions.push(`kotlin = "${kotlinVersion}"`);
    }

    if (!catalog?.plugins['jetbrains-kotlin-jvm']) {
      elements.plugins.push(
        'jetbrains-kotlin-jvm = { id = "org.jetbrains.kotlin.jvm", version.ref = "kotlin" }',
      );
    }
  }

  if (options.preset === 'spring-boot') {
    if (!catalog?.versions['spring-boot']) {
      elements.versions.push(`spring-boot = "${springBootVersion}"`);
    }

    if (!catalog?.plugins['springframework-boot']) {
      elements.plugins.push(
        'springframework-boot = { id = "org.springframework.boot", version.ref = "spring-boot" }',
      );
    }

    if (!catalog?.plugins['spring-dependency-management']) {
      elements.plugins.push(
        `spring-dependency-management = { id = "io.spring.dependency-management", version = "${springDependencyManagementVersion}" }`,
      );
    }

    if (
      options.language === 'kotlin' &&
      !catalog?.plugins['jetbrains-kotlin-plugin-spring']
    ) {
      elements.plugins.push(
        'jetbrains-kotlin-plugin-spring = { id = "org.jetbrains.kotlin.plugin.spring", version.ref = "kotlin" }',
      );
    }
  }

  if (options.preset === 'quarkus') {
    if (!catalog?.versions['quarkus']) {
      elements.versions.push(`quarkus = "${quarkusVersion}"`);
    }

    if (!catalog?.libraries['quarkus-platform-quarkus-bom']) {
      elements.libraries.push(
        'quarkus-platform-quarkus-bom = { module = "io.quarkus.platform:quarkus-bom", version.ref = "quarkus" }',
      );
    }

    if (
      options.language === 'kotlin' &&
      !catalog?.plugins['jetbrains-kotlin-plugin-allopen']
    ) {
      elements.plugins.push(
        'jetbrains-kotlin-plugin-allopen = { id = "org.jetbrains.kotlin.plugin.allopen", version.ref = "kotlin" }',
      );
    }

    if (!catalog?.plugins['quarkus']) {
      elements.plugins.push(
        'quarkus = { id = "io.quarkus", version.ref = "quarkus" }',
      );
    }
  }

  if (options.preset === 'micronaut') {
    if (!catalog?.versions['micronaut']) {
      elements.versions.push(`micronaut = "${micronautVersion}"`);
    }

    if (
      options.language === 'kotlin' &&
      !catalog?.plugins['jetbrains-kotlin-plugin-allopen']
    ) {
      elements.plugins.push(
        'jetbrains-kotlin-plugin-allopen = { id = "org.jetbrains.kotlin.plugin.allopen", version.ref = "kotlin" }',
      );
    }

    if (!catalog?.plugins['micronaut-aot']) {
      elements.plugins.push(
        'micronaut-aot = { id = "io.micronaut.aot", version = "4.2.1" }',
      );
    }

    if (!catalog?.plugins['micronaut-application']) {
      elements.plugins.push(
        'micronaut-application = { id = "io.micronaut.application", version = "4.2.1" }',
      );
    }

    if (!catalog?.plugins['micronaut-library']) {
      elements.plugins.push(
        'micronaut-library = { id = "io.micronaut.library", version = "4.2.1" }',
      );
    }

    if (!catalog?.plugins['google-devtools-ksp']) {
      elements.plugins.push(
        `google-devtools-ksp = { id = "com.google.devtools.ksp", version = "${kspVersion}" }`,
      );
    }

    if (!catalog?.plugins['github-johnrengelman-shadow']) {
      elements.plugins.push(
        `github-johnrengelman-shadow = { id = "com.github.johnrengelman.shadow", version = "${shadowVersion}" }`,
      );
    }
  }

  return elements;
}
