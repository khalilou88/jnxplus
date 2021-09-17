# @jnxplus/nx-boot-gradle:init

Add Spring Boot and Gradle support. This only needs to be performed once per workspace.

## Usage

```bash
nx generate @jnxplus/nx-boot-gradle:init
```

Or

```bash
nx g @jnxplus/nx-boot-gradle:init
```

Show what will be generated without writing to disk:

```bash
nx g @jnxplus/nx-boot-gradle:init --dry-run
```

## Options

### rootProjectName (_**required**_)

Type: `string`

The root project name.

### javaVersion (_**required**_)

Default: `11`

Type: `string`

Possible values: `16`, `11`, `1.8`

The java version for Spring Boot apps and libs. The same java version is used inside the Nx worspace.
