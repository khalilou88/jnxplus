# @jnxplus/nx-boot-gradle:lint

Lint a project.

## Usage

```bash
nx lint my-project-name
```

## Options

### linter (_**required**_)

Default: `chechstyle` for java projects and `ktlint` for kotlin projects

Type: `string`

Possible values: `chechstyle`, `pmd`, `ktlint`

The tool to use for running lint checks.

## Override rules

Under the hood we use [checkstyle](https://checkstyle.sourceforge.io/), [pmd](https://pmd.github.io/) and [ktlint](https://ktlint.github.io/) to perform linting.
To override rules, please use the files `checkstyle.xml` and `pmd.xml` located under the tools/linters folder.
