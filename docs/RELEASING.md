# Release guide

## Prepare the version

1. Update `VERSION`.
2. Match `CFBundleShortVersionString` and increment `CFBundleVersion` in `macos/Info.plist`.
3. Move relevant changelog entries from **Unreleased** into the new version.
4. Run the local checks in `CONTRIBUTING.md`.
5. Create the package with `./scripts/package-release.command`.

## Publish with GitHub Actions

Commit the release changes, create an annotated tag, and push it:

```sh
git tag -a v0.1.0 -m "WorkBae v0.1.0"
git push origin main --follow-tags
```

The release workflow builds the app from the tagged source, verifies its signature, creates a versioned ZIP, and attaches it to a GitHub Release.

## Signing status

Open-source release artifacts are currently ad-hoc signed. They are not Developer ID signed or Apple-notarized. Users must use Control-click → Open on first launch.

For a smoother general-public installation, a maintainer with an Apple Developer Program membership should add Developer ID signing and notarization. Signing identities and notarization credentials must remain in GitHub encrypted secrets and must never be committed.
