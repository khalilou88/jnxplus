# Getting started

## Introduction to @jnxplus/nx-boot-gradle

`@jnxplus/nx-boot-gradle` help you architect, test, and build Spring boot projects inside a Nx workspace using Grdale multi-project builds.

### Philosophy

Like Nx, `@jnxplus/nx-boot-gradle` works especially for monorepos.

`@jnxplus/nx-boot-gradle` uses Grdale multi-project builds to maintains modular units of code.

### Features

- Task executors like Smart rebuilds of affected projects
- Code generators
- Code sharing
- Workspace visualizations

### Learn @jnxplus/nx-boot-gradle Fundamentals

- [Post Walkthrough on dev.to](https://dev.to/gridou/how-to-add-spring-boot-and-gradle-multi-project-builds-capabilities-to-your-nx-workspace-53cd)

## Setup @jnxplus/nx-boot-gradle

### 0. Prerequisites

`@jnxplus/nx-boot-gradle` requires a Java 17 or higher Runtime Environment and the current Long Term Support (LTS) version of node.js.

### 1. Install @jnxplus/nx-boot-gradle

In a Nx workspace root install @jnxplus/nx-boot-gradle with your package manager using the dev flag.

This is an example with npm:

```bash
npm install --save-dev @jnxplus/nx-boot-gradle
```

#### 2. Init workspace with Spring boot and Gradle support

The following command adds Spring boot and Gradle support (Gradle wrapper and config files) to the workspace. This only needs to be performed once per workspace.

```bash
nx generate @jnxplus/nx-boot-gradle:init
```

I choose the version of Java supported by my operating system and the default value for Gradle root project:

```bash
my-workspace> nx generate @jnxplus/nx-boot-gradle:init
√ Which version of Java would you like to use? · 17
√ Which build DSL would you like to use? · groovy
√ What rootProjectName would you like to use? · boot-multi-project
CREATE build.gradle
CREATE checkstyle.xml
CREATE gradle/wrapper/gradle-wrapper.jar
CREATE gradle/wrapper/gradle-wrapper.properties
CREATE gradle.properties
CREATE gradlew
CREATE gradlew.bat
CREATE settings.gradle
UPDATE nx.json
UPDATE .gitignore
UPDATE .prettierignore
```

As you see, the command added the following files :

- `checkstyle.xml` for linting.
- Gradle wrapper and Gradle executables for windows and Linux :
  Using Gradle Wrapper we can distribute/share a project to everybody to use the same version and Gradle's functionality(compile, build, install...) even if it has not been installed
- `gradle.properties` :
  This file contain Java, Spring Boot and dependency management versions that we will use for all apps and libs inside Nx workspace.
- `settings.gradle` or `settings.gradle.kts` depending on the DSL option :
  Here we will add our apps and libs later so Gradle will be able to perform its tasks.
- `build.gradle` or `build.gradle.kts` depending on the DSL option :
  Build file for the root project for future use.

We also updated `nx.json` file to add the plugin for dep-graph feature and `.gitignore` and `.prettierignore` so we can ignore Gradle build and cache folders.
