# AIET Release Engineering & Operations Guide

## Release Process Checklist

### 1. Pre-Release Verification
- [ ] Ensure all CI matrix jobs pass on `main` (`ubuntu-latest`, `macos-latest`, `windows-latest`).
- [ ] Run `pnpm check:node`, `pnpm check:zero-width`, and `pnpm check:secrets`.
- [ ] Verify 100% typecheck (`pnpm typecheck`) and Biome linter (`pnpm lint`).
- [ ] Run full end-to-end integration and reproducibility test suite (`pnpm test`).
- [ ] Ensure workspace package build succeeds (`pnpm build`).

### 2. Publishing a Release
1. Create a version tag matching semver (`v1.0.0`):
   ```bash
   git tag -a v1.0.0 -m "Release v1.0.0"
   git push origin v1.0.0
   ```
2. Alternatively, trigger the manual release workflow in GitHub Actions:
   - Navigate to **Actions ➔ Production Release Engineering**.
   - Click **Run workflow**, select target branch (`main`), set `dry_run` to `false`.

### 3. Topological Package Publish Order
Packages are published in strict topological order to satisfy workspace dependency bounds:
1. `@aiet/schema`
2. `@aiet/domain`
3. `@aiet/storage`
4. `@aiet/mcp-server`
5. `@aiet/compiler`
6. `@aiet/cli`
7. `@aiet/testing`

### 4. Rollback & Emergency Containment Protocol
If a critical defect is discovered post-publish:
1. Deprecate the published version on npm:
   ```bash
   npm deprecate @aiet/cli@1.0.0 "Critical defect detected; update to 1.0.1"
   ```
2. Tag a new patch release (`v1.0.1`) containing the fix and trigger the release pipeline.
