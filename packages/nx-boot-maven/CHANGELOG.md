# Changelog

This file was generated using [@jscutlery/semver](https://github.com/jscutlery/semver).

## [8.0.2](https://github.com/khalilou88/jnxplus/compare/nx-boot-maven-8.0.1...nx-boot-maven-8.0.2) (2023-08-19)

### Dependency Updates

* `internal-generators-files` updated to version `0.1.0`
* `maven` updated to version `0.10.0`
* `common` updated to version `0.11.0`


## [8.0.1](https://github.com/khalilou88/jnxplus/compare/nx-boot-maven-8.0.0...nx-boot-maven-8.0.1) (2023-08-09)

### Dependency Updates

* `maven` updated to version `0.9.0`


# [8.0.0](https://github.com/khalilou88/jnxplus/compare/nx-boot-maven-7.3.0...nx-boot-maven-8.0.0) (2023-08-05)

### Dependency Updates

* `maven` updated to version `0.8.0`

### Features

* add repository to package.json ([f08724a](https://github.com/khalilou88/jnxplus/commit/f08724ac736499548c7dff23ad125f59ed257f73))
* **executors:** remove deprecated executors from nx-boot plugins ([27ebe79](https://github.com/khalilou88/jnxplus/commit/27ebe793c2dcdf9afbcbc870d68fc6177b7dd086))


### BREAKING CHANGES

* **executors:** from now we need to change old executors by run-task executor



# [7.3.0](https://github.com/khalilou88/jnxplus/compare/nx-boot-maven-7.2.3...nx-boot-maven-7.3.0) (2023-07-28)

### Dependency Updates

* `maven` updated to version `0.7.0`
* `common` updated to version `0.10.0`

### Features

* **executors:** deprecate executors ([8afa24b](https://github.com/khalilou88/jnxplus/commit/8afa24b512993e56a012224ec81f07893a6cbce5))



## [7.2.3](https://github.com/khalilou88/jnxplus/compare/nx-boot-maven-7.2.2...nx-boot-maven-7.2.3) (2023-07-08)

### Dependency Updates

* `maven` updated to version `0.6.1`
* `common` updated to version `0.9.1`


## [7.2.2](https://github.com/khalilou88/jnxplus/compare/nx-boot-maven-7.2.1...nx-boot-maven-7.2.2) (2023-06-24)

### Dependency Updates

* `maven` updated to version `0.6.0`


## [7.2.1](https://github.com/khalilou88/jnxplus/compare/nx-boot-maven-7.2.0...nx-boot-maven-7.2.1) (2023-06-23)

### Dependency Updates

* `internal-generators-files` updated to version `0.1.0`
* `maven` updated to version `0.5.1`


# [7.2.0](https://github.com/khalilou88/jnxplus/compare/nx-boot-maven-7.1.0...nx-boot-maven-7.2.0) (2023-06-21)

### Dependency Updates

* `internal-generators-files` updated to version `0.1.0`
* `maven` updated to version `0.5.0`
* `common` updated to version `0.9.0`

### Features

* **generators:** add framework generation to nx-maven plugin ([#259](https://github.com/khalilou88/jnxplus/issues/259)) ([7eeded8](https://github.com/khalilou88/jnxplus/commit/7eeded89e41c1feac148bf3cc119da30b42bc3df))
* **generators:** remove generators code duplication ([#260](https://github.com/khalilou88/jnxplus/issues/260)) ([a4d495e](https://github.com/khalilou88/jnxplus/commit/a4d495ed73a23dc2e146f798b29ac37383dbe923))



# [7.1.0](https://github.com/khalilou88/jnxplus/compare/nx-boot-maven-7.0.2...nx-boot-maven-7.1.0) (2023-06-17)

### Dependency Updates

* `internal-generators-files` updated to version `0.1.0`
* `internal-maven-wrapper` updated to version `0.0.1`
* `maven` updated to version `0.4.3`
* `common` updated to version `0.8.1`

### Bug Fixes

* **graph:** fix optional project.json ([#256](https://github.com/khalilou88/jnxplus/issues/256)) ([0db8e12](https://github.com/khalilou88/jnxplus/commit/0db8e12a1d7056d6423ae664ae70725099ad33bd))


### Features

* **generators:** reduce code duplication ([#251](https://github.com/khalilou88/jnxplus/issues/251)) ([dfdad1d](https://github.com/khalilou88/jnxplus/commit/dfdad1dfd2ef13303e1c12a4d824261d5bf407be))
* **generators:** reduce linters files ([#252](https://github.com/khalilou88/jnxplus/issues/252)) ([75c0e76](https://github.com/khalilou88/jnxplus/commit/75c0e769e7917ef91584b4f5dcb5efbff80da6c2))



## [7.0.2](https://github.com/khalilou88/jnxplus/compare/nx-boot-maven-7.0.1...nx-boot-maven-7.0.2) (2023-06-09)

### Dependency Updates

* `maven` updated to version `0.4.2`
* `common` updated to version `0.8.0`


## [7.0.1](https://github.com/khalilou88/jnxplus/compare/nx-boot-maven-7.0.0...nx-boot-maven-7.0.1) (2023-06-07)

### Dependency Updates

* `maven` updated to version `0.4.1`
* `common` updated to version `0.7.0`


# [7.0.0](https://github.com/khalilou88/jnxplus/compare/nx-boot-maven-6.4.0...nx-boot-maven-7.0.0) (2023-06-01)

### Dependency Updates

* `maven` updated to version `0.4.0`
* `common` updated to version `0.6.0`

### Bug Fixes

* **graph:** set minimum version of nx to 16.3.0 ([3559934](https://github.com/khalilou88/jnxplus/commit/355993462155a27ab620678b1fd358d2f4eed6de))


### BREAKING CHANGES

* **graph:** Nx version 16.3.0 move hashing to the daemon, that create a breaking change in the plugin



# [6.4.0](https://github.com/khalilou88/jnxplus/compare/nx-boot-maven-6.3.0...nx-boot-maven-6.4.0) (2023-05-28)

### Dependency Updates

* `maven` updated to version `0.3.0`
* `common` updated to version `0.5.0`

### Features

* **executors:** move all maven executors to maven lib ([#234](https://github.com/khalilou88/jnxplus/issues/234)) ([00f7f88](https://github.com/khalilou88/jnxplus/commit/00f7f88008637fd98d48402343ccb95878bc1182))



# [6.3.0](https://github.com/khalilou88/jnxplus/compare/nx-boot-maven-6.2.4...nx-boot-maven-6.3.0) (2023-05-27)

### Dependency Updates

* `maven` updated to version `0.2.1`
* `common` updated to version `0.4.0`

### Bug Fixes

* **executors:** use pipe output capture ([#233](https://github.com/khalilou88/jnxplus/issues/233)) ([1d295b4](https://github.com/khalilou88/jnxplus/commit/1d295b4548a2b2cbdeb4c7fbb5ceb4fb73a830d8))
* **generators:** disable unit tests ([a08d0f2](https://github.com/khalilou88/jnxplus/commit/a08d0f2cd396f6f7dddbb41e0bcd532a8a800778))
* **generators:** remove old syntax ([#232](https://github.com/khalilou88/jnxplus/issues/232)) ([a390029](https://github.com/khalilou88/jnxplus/commit/a39002963b2c66a1295fa42925b76994a24748c3))


### Features

* **generators:** update maven wrapper to version 3.9.2 ([b5486de](https://github.com/khalilou88/jnxplus/commit/b5486ded2f418a606d2f4ca957cbd97ed4956596))
* **generators:** update spring boot version to 3.1.0 ([#231](https://github.com/khalilou88/jnxplus/issues/231)) ([b050516](https://github.com/khalilou88/jnxplus/commit/b0505163fde06fbcf355a97a75e675c0c5fe8bc3))



## [6.2.4](https://github.com/khalilou88/jnxplus/compare/nx-boot-maven-6.2.3...nx-boot-maven-6.2.4) (2023-05-26)

### Dependency Updates

* `maven` updated to version `0.2.0`
* `common` updated to version `0.3.1`


## [6.2.3](https://github.com/khalilou88/jnxplus/compare/nx-boot-maven-6.2.2...nx-boot-maven-6.2.3) (2023-05-21)


### Bug Fixes

* **generators:** don't generate extras lines in templates ([#215](https://github.com/khalilou88/jnxplus/issues/215)) ([2a5da31](https://github.com/khalilou88/jnxplus/commit/2a5da31470aedb7658e9283555c89f1d28782e06))



## [6.2.2](https://github.com/khalilou88/jnxplus/compare/nx-boot-maven-6.2.1...nx-boot-maven-6.2.2) (2023-05-19)

### Dependency Updates

* `maven` updated to version `0.1.8`
* `common` updated to version `0.3.0`


## [6.2.1](https://github.com/khalilou88/jnxplus/compare/nx-boot-maven-6.2.0...nx-boot-maven-6.2.1) (2023-05-17)

### Dependency Updates

* `maven` updated to version `0.1.7`
* `common` updated to version `0.2.4`

### Bug Fixes

* **nx-boot-maven:** refactor maven dep graph ([#206](https://github.com/khalilou88/jnxplus/issues/206)) ([0a704a4](https://github.com/khalilou88/jnxplus/commit/0a704a4acbfa1db93a072b37a8c2db0e3ea275ce))



# [6.2.0](https://github.com/khalilou88/jnxplus/compare/nx-boot-maven-6.1.4...nx-boot-maven-6.2.0) (2023-05-13)

### Dependency Updates

- `maven` updated to version `0.1.6`
- `common` updated to version `0.2.3`

### Features

- **nx-boot-maven:** add ktformat executor ([#195](https://github.com/khalilou88/jnxplus/issues/195)) ([c36c154](https://github.com/khalilou88/jnxplus/commit/c36c154e02f4daf2f9d171e11512bd359b789b63))
- **nx-boot-maven:** add NX_MAVEN_CLI_OPTS env var to pass args to maven ([#193](https://github.com/khalilou88/jnxplus/issues/193)) ([7aec617](https://github.com/khalilou88/jnxplus/commit/7aec617eb23c1d8be4a96b7b0bef9a583082e75d))
- **nx-boot-maven:** add publish executor [ci skip] ([#189](https://github.com/khalilou88/jnxplus/issues/189)) ([4b9bda7](https://github.com/khalilou88/jnxplus/commit/4b9bda7e077c01914b785b78b107ae20c0829ab3))
