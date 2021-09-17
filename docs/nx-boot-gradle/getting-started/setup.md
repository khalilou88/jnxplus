# @jnxplus/nx-boot-gradle Setup

### 0. Prerequisites

`@jnxplus/nx-boot-gradle` requires a Java 8 or higher Runtime Environment and the current Long Term Support (LTS) version of node.js.

## 1. Install @jnxplus/nx-boot-gradle

In a Nx workspace root install @jnxplus/nx-boot-gradle with your package manager using the dev flag.

This is an exampel with npm:

```bash
npm install --save-dev @jnxplus/nx-boot-gradle
```

### 2. Init worspace with Add Spring boot and Gradle support

The following command adds Spring boot and Gradle support (Gradle wrapper and config files) to the workspace. This only needs to be performed once per workspace.

```bash
nx generate @jnxplus/nx-boot-gradle:init
```

I choose the version of Java supported by my operating system and the default value for Gradle root project:

```bash
my-org> nx generate @jnxplus/nx-boot-gradle:init
√ Which version of Java would you like to use? · 11
√ What rootProjectName would you like to use? · boot-multiproject
CREATE checkstyle.xml
CREATE gradle/wrapper/gradle-wrapper.jar
CREATE gradle/wrapper/gradle-wrapper.properties
CREATE gradle.properties
CREATE gradlew
CREATE gradlew.bat
CREATE settings.gradle
UPDATE nx.json
UPDATE .gitignore
```

As you see, the command added the following files :

- `checkstyle.xml` for linting.
- Gradle wrapper and Gradle executables for windows and Linux :
  Using Gradle Wrapper we can distribute/share a project to everybody to use the same version and Gradle's functionality(compile, build, install...) even if it has not been installed
- `gradle.properties` :
  This file contain Java, Spring Boot and dependency management versions that we will use for all apps and libs inside Nx worspace.
- `settings.gradle` :
  Here we will add our apps and libs later so Gradle will be able to perform its tasks.

We also updated `nx.json` file to add the plugin for dep-graph feature and `.gitignore` so we can ignore Gradle build and cache folders.
