# @jnxplus/nx-boot-gradle:library

Create a Spring Boot library.

## Usage

```bash
nx generate @jnxplus/nx-boot-gradle:library my-lib-name
```

Or

```bash
nx g @jnxplus/nx-boot-gradle:lib my-lib-name
```

Show what will be generated without writing to disk:

```bash
nx g ... --dry-run
```

### Examples

Generate libs/myapp/mylib:

```bash
nx g @jnxplus/nx-boot-gradle:lib mylib --directory=myapp
```

## Options

### name (_**required**_)

Type: `string`

The name of the library.

### groupId (_**required**_)

Type: `string`

The groupId of the library.

### projectVersion (_**required**_)

Type: `string`

The version of the library.

### directory

Alias(es): dir

Type: `string`

A directory where the library is placed.

### tags

Type: `string`

Add tags to the library (used for linting).

### projects

Type: `string`

Projects that needs to access this library (comma delimited). This add the library to their dependencies.

## Not implemented yet

The following options are not implemented yet :

### linter

Default: `chechstyle`

Type: `string`

Possible values: `chechstyle`, `pmd`, `none`

The tool to use for running lint checks.

### skipFormat

Default: `false`

Type: `boolean`

Skip formatting files.

### skipGradleBuild

Default: `false`

Type: `boolean`

Do not add dependencies to gradle.build.

### unitTestRunner

Default: `junit`

Type: `string`

Possible values: `junit`, `none`

Test runner to use for unit tests.

### controller

Default: `false`

Type: `boolean`

Include a controller with the library.

### service

Default: `false`

Type: `boolean`

Include a service with the library.
