# FLR YAML Scalar Assets Fix Design

## Context

FLR 3.4.0 reads `flutter.assets` with `yaml.parseDocument()`. Sequence entries are YAML `Scalar`
nodes, but generation passes them through as `string[]` and later calls `startsWith()`. Projects
that retain an existing directory asset therefore fail before `pubspec.yaml` and `r.g.dart` are
written.

## Scope

- Release the fix as extension version `3.4.1` under publisher `LincolnLaw`.
- Convert existing `flutter.assets` sequence entries to strings at the YAML-to-domain boundary.
- Preserve existing directory entries exactly when they already end in `/`; in particular,
  `lib/assets/videos/splash/` must not broaden to `lib/assets/videos/`.
- Preserve the current YAML comment behavior. Document-, mapping-, and section-level comments must
  remain; per-item comments inside the rebuilt `flutter.assets` sequence remain an existing
  limitation and are not expanded in this patch.
- Do not change asset discovery, generated Dart APIs, watcher behavior, or dependencies.

## Implementation

`FlrCommand.generateOne()` will map `assets.items` through string interpolation before passing them
to `FlrAssetUtil.mergeFlutterAssets()`. While rebuilding the final asset list, an entry ending in
`/` is already a directory and is retained verbatim; file entries continue to use their parent
directory. No new helper or abstraction is needed.

## Verification

Add one integration-style extension test using a temporary Flutter project. The fixture contains:

- a configured image directory with a newly discovered PNG;
- an existing manual `lib/assets/videos/splash/` directory asset;
- comments outside individual `flutter.assets` items.

The test calls the real `FlrCommand.generateOne()` while replacing only the external Dart formatter,
then verifies generation completes, the new image is written, the manual directory remains exact,
the expected comments remain, and `lib/r.g.dart` contains the generated image API. Run the test once
before the fix to capture the `startsWith` failure, then run the full suite and compiler after the
fix.

## Release

Update `src/FlrConstant.ts`, `package.json`, `package-lock.json`, and `CHANGELOG.md` to `3.4.1` where
applicable. Package a VSIX with the official VS Code extension packaging CLI, force-install it into
the local VS Code application, and verify the installed extension version. Publish that exact VSIX
to the `LincolnLaw` Marketplace publisher and verify the resulting Marketplace status/version.
