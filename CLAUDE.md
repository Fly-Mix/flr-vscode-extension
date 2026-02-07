# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Flr (Flutter-R) is a VSCode extension that manages Flutter project resources. It scans configured asset directories, auto-specifies assets in `pubspec.yaml`, and generates a type-safe Dart file (`r.g.dart`) with an `R` class for referencing images, SVGs, text files, and fonts in code.

## Build & Development Commands

| Command | Purpose |
|---------|---------|
| `npm run compile` | Compile TypeScript (`tsc -p ./`) |
| `npm run watch` | Watch mode compilation |
| `npm test` | Run tests (compiles first via pretest) |
| `vsce package` | Package extension into `.vsix` for publishing |

There is no bundler (webpack/esbuild). The build is pure `tsc` outputting to `out/`.

To debug the extension: press F5 in VSCode (uses `.vscode/launch.json` "Run Extension" config). For tests: use the "Extension Tests" launch configuration.

## Linting

Uses TSLint (`tslint.json`), not ESLint. Run with standard TSLint tooling.

## Architecture

**Entry point**: `src/extension.ts` — `activate()` registers commands and creates the FileExplorer tree view.

**Core modules**:

- `src/FlrCommand.ts` — Business logic for the two main operations:
  - **Init** (`initAll`/`initOne`): Adds `flr` config section and `r_dart_library` dependency to `pubspec.yaml`
  - **Generate** (`generateAll`/`generateOne`): Scans asset directories, updates `pubspec.yaml` asset specs, generates `lib/r.g.dart`
- `src/flr-view-data-provider.ts` — `FileExplorer` (TreeView UI), `FileSystemProvider` (TreeDataProvider), file watching with MD5-based change detection on `pubspec.yaml`
- `src/folder-manager.ts` — File system operations, `getAllPubspecFiles()` for multi-project support
- `src/FlrConstant.ts` — Version constants (`VERSION`, `CORE_VERSION`), supported file type arrays, dartfmt line length
- `src/utils.ts` — Command registration helpers, workspace utilities, enum definitions (`Names`, `Commands`, `ControlFlags`)

**Utility layer** (`src/util/`):

- `FlrAssetUtil.ts` — Asset variant detection (2.0x, 3.0x), asset generation and merging
- `FlrCodeUtil.ts` — Dart code generation for `r.g.dart` (classes: `R`, `AssetResource`, `_R_Image`, `_R_Svg`, `_R_Text`, `_R_FontFamily`)
- `FlrFileUtil.ts` — Project type detection, pubspec.yaml parsing, resource file scanning, filename legality checks

**VSCode commands**: `flr.init`, `flr.openFile`, `flr.stopMonitor`, `flr.startMonitor`, `flr.regenerated`

**Activation**: Triggered when workspace contains `pubspec.yaml`.

## Key Design Details

- The extension adds `r_dart_library` as a git dependency, selecting the version ref based on the project's Dart SDK version (ranges from `0.1.1` to `1.0.0`)
- File monitoring uses Node.js `fs.watch` with `{recursive: true}` on configured asset directories
- Generated `r.g.dart` is formatted via `dart format -l <lineLength>` (default 80)
- Supports multi-project workspaces (main project + sub-projects detected by scanning for `pubspec.yaml` files)
- Code comments are primarily in Chinese

## Deployment Checklist

1. Update `VERSION` in `src/FlrConstant.ts`
2. Update `version` in `package.json`
3. Update `CHANGELOG.md`
4. Run `vsce package`
5. Upload `.vsix` to [VSCode Marketplace](https://marketplace.visualstudio.com/)

## Testing

- Framework: Mocha (TDD UI) via `vscode-test`
- Tests: `src/test/suite/extension.test.ts`
- Current coverage is minimal (single YAML parsing test)
