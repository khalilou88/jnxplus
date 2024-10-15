## Testing

nx local-registry

nx run-many --targets publish --ver 0.0.0-e2e --tag e2e

npm config set registry https://registry.npmjs.org/

## nx release

nx release --specifier minor --skip-publish --dry-run

nx release --specifier prerelease --skip-publish --dry-run

nx release --first-release --specifier preminor --skip-publish --dry-run

## nx release version

nx release version --specifier preminor --preid next --dry-run
nx release version 1.10.0-next.1 --dry-run
npx nx run-many -t build
nx release publish --tag next --verbose --dry-run
nx release publish --tag previous --verbose --dry-run
