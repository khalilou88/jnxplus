# io.github.khalilou88.jnxplus

This repository contains Gradle plugin for managing gradle projects inside a nx workspace. Plugin registers task `projectDependencyTask` that generate project dependencies in a json file.

## Installation

### gradle.properties

```bash
jnxplusGradlePluginVersion=0.1.3
```

### Settings.gradle

Kotlin:

```bash
val jnxplusGradlePluginVersion: String by settings
plugins {
    id("io.github.khalilou88.jnxplus") version jnxplusGradlePluginVersion
}
```

Groovy:

```bash
plugins {
    id 'io.github.khalilou88.jnxplus' version "${jnxplusGradlePluginVersion}"
}
```

### build.gradle

Kotlin:

```bash
plugins {
    id("io.github.khalilou88.jnxplus")
}
```

Groovy:

```bash
plugins {
    id 'io.github.khalilou88.jnxplus'
}
```

## Usage

```bash
./gradlew :projectDependencyTask --outputFile=nx-gradle-deps.json
```

## License

MIT © 2023-2024 Khalil LAGRIDA
