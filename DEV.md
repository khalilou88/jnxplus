## Testing

nx local-registry

nx run-many --targets publish --ver 0.0.0-e2e --tag e2e

npm config set registry https://registry.npmjs.org/

## nx release

nx release --specifier minor --skip-publish --dry-run

nx release --specifier prerelease --skip-publish --dry-run

nx release --first-release --specifier preminor --skip-publish --dry-run
