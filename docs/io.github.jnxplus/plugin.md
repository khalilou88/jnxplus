# Why this plugin?

## Installation

### gradle.properties

```bash
jnxplusGradlePluginVersion=1.2.3
```

### Settings.gradle

Kotlin:

```bash
val jnxplusGradlePluginVersion: String by settings
plugins {
    id("io.github.jnxplus") version jnxplusGradlePluginVersion
}
```

Groovy:

```bash
plugins {
    id 'io.github.jnxplus' version "${jnxplusGradlePluginVersion}"
}
```

### build.gradle

Kotlin:

```bash
plugins {
    id("io.github.jnxplus")
}
```

Groovy:

```bash
plugins {
    id "io.github.jnxplus"
}
```

## How to use it?
