# FLR YAML Scalar Assets Fix Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Release FLR 3.4.1 so generation accepts YAML `Scalar` asset entries, preserves manual directory paths and current comment behavior, installs locally, and is submitted to the VS Code Marketplace.

**Architecture:** Normalize YAML sequence nodes to strings once when they enter the existing string-based asset merge. Keep existing directory entries verbatim when rebuilding `flutter.assets`; retain the rest of the generator unchanged. Prove the complete behavior through `FlrCommand.generateOne()` with a temporary Flutter package fixture.

**Tech Stack:** TypeScript 3.8, YAML 2.8.3, Mocha TDD UI, vscode-test, @vscode/vsce.

## Global Constraints

- Extension and Marketplace version is exactly `3.4.1`; publisher remains `LincolnLaw`.
- `CORE_VERSION` remains `3.3.4`.
- Do not add dependencies or change asset discovery, generated Dart APIs, or watcher behavior.
- Preserve document-, mapping-, and section-level YAML comments; per-item `flutter.assets` comments remain the existing limitation.
- Publish the exact VSIX that was locally installed and verified.

---

### Task 1: Reproduce and fix YAML Scalar asset generation

**Files:**
- Modify: `src/test/suite/extension.test.ts`
- Modify: `src/FlrCommand.ts:381`

**Interfaces:**
- Consumes: `FlrCommand.generateOne(flutterProjectRootDir: string): Promise<void>` and the existing `yaml.Document` write path.
- Produces: existing assets passed to `FlrAssetUtil.mergeFlutterAssets()` as `string[]`; directory entries ending in `/` remain unchanged.

- [ ] **Step 1: Install locked dependencies**

Run:

```bash
npm ci
```

Expected: exit 0 with the exact dependency graph from `package-lock.json`.

- [ ] **Step 2: Replace the placeholder YAML test with the failing generator regression**

Use this test body in `src/test/suite/extension.test.ts`:

```typescript
import * as assert from 'assert';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import * as rimraf from 'rimraf';
import * as yaml from 'yaml';
import { FlrCommand } from '../../FlrCommand';

test('generateOne accepts YAML scalar assets and preserves comments and directories', async () => {
  const projectDir = fs.mkdtempSync(path.join(os.tmpdir(), 'flr-scalar-assets-'));
  const imageDir = path.join(projectDir, 'lib/assets/images');
  const splashDir = path.join(projectDir, 'lib/assets/videos/splash');
  fs.mkdirSync(imageDir, { recursive: true });
  fs.mkdirSync(splashDir, { recursive: true });
  fs.writeFileSync(path.join(imageDir, 'new_image.png'), 'fixture');
  fs.writeFileSync(path.join(splashDir, 'keep.txt'), 'fixture');
  fs.writeFileSync(
    path.join(projectDir, 'pubspec.yaml'),
    `# document comment
name: demo_package
author: test
environment:
  sdk: '>=2.12.0 <4.0.0'
dependencies: {}
flutter:
  # assets section comment
  assets:
    - lib/assets/videos/splash/
flr:
  core_version: 3.3.4
  # flr assets comment
  assets:
    - lib/assets/images/
  fonts: []
`,
  );

  const originalExecute = (FlrCommand as any).execute;
  (FlrCommand as any).execute = () => Promise.resolve('');
  try {
    await FlrCommand.generateOne(projectDir);

    const pubspec = fs.readFileSync(path.join(projectDir, 'pubspec.yaml'), 'utf8');
    assert.ok(pubspec.includes('# document comment'));
    assert.ok(pubspec.includes('# assets section comment'));
    assert.ok(pubspec.includes('# flr assets comment'));
    const document = yaml.parseDocument(pubspec);
    const flutter = document.get('flutter');
    assert.ok(yaml.isMap(flutter));
    const assets = flutter.get('assets');
    assert.ok(yaml.isSeq(assets));
    const assetValues = assets.items.map((item) => `${item}`);
    assert.ok(assetValues.includes('lib/assets/videos/splash/'));
    assert.ok(!assetValues.includes('lib/assets/videos/'));
    assert.ok(assetValues.includes('packages/demo_package/assets/images/new_image.png'));

    const generated = fs.readFileSync(path.join(projectDir, 'lib/r.g.dart'), 'utf8');
    assert.ok(generated.includes('new_image'));
  } finally {
    (FlrCommand as any).execute = originalExecute;
    rimraf.sync(projectDir);
  }
});
```

The production mutation caught by this test is passing YAML nodes instead of strings or treating an existing directory as a file parent.

- [ ] **Step 3: Run the regression test and verify RED**

Run:

```bash
npm test
```

Expected: FAIL from `FlrCommand.generateOne()` with `TypeError: arAsset.startsWith is not a function`.

- [ ] **Step 4: Apply the minimal production fix**

Change the existing asset sequence read to:

```typescript
if (yaml.isSeq(assets)) {
  oldAssetArray = assets.items.map((item) => `${item}`);
}
```

Change the non-package asset folder selection to:

```typescript
const folder = arAsset.endsWith('/')
  ? arAsset
  : `${path.dirname(arAsset)}/`;
```

Do not change `FlrAssetUtil` or add a helper.

- [ ] **Step 5: Run GREEN verification**

Run:

```bash
npm test
npm run compile
git diff --check
```

Expected: all commands exit 0; the generator test passes and TypeScript compiles without diagnostics.

- [ ] **Step 6: Commit the tested fix**

```bash
git add src/FlrCommand.ts src/test/suite/extension.test.ts
git commit -m "fix: normalize YAML asset nodes"
```

---

### Task 2: Version and package FLR 3.4.1

**Files:**
- Modify: `src/FlrConstant.ts:2`
- Modify: `package.json:7`
- Modify: `package-lock.json`
- Modify: `CHANGELOG.md:1`
- Create artifact: `flr-3.4.1.vsix` (do not commit)

**Interfaces:**
- Consumes: the verified Task 1 source tree.
- Produces: Marketplace extension identity `LincolnLaw.flr@3.4.1` and `flr-3.4.1.vsix`.

- [ ] **Step 1: Update release metadata**

Run:

```bash
npm version 3.4.1 --no-git-tag-version
```

Set `src/FlrConstant.ts` to:

```typescript
export let VERSION = '3.4.1';
```

Prepend to `CHANGELOG.md`:

```markdown
## [3.4.1]

- fix: Normalize YAML asset nodes before merging existing Flutter assets.
- fix: Preserve existing directory asset paths while regenerating resources.
- test: Cover comment retention and mixed generated/manual assets.
```

- [ ] **Step 2: Verify release source**

Run:

```bash
npm test
npm run compile
git diff --check
```

Expected: all commands exit 0.

- [ ] **Step 3: Commit release metadata**

```bash
git add src/FlrConstant.ts package.json package-lock.json CHANGELOG.md
git commit -m "chore: release FLR 3.4.1"
```

- [ ] **Step 4: Package the VSIX with the official CLI**

Run:

```bash
npx --yes @vscode/vsce package --out flr-3.4.1.vsix
```

Expected: exit 0 and a non-empty `flr-3.4.1.vsix` whose manifest reports version `3.4.1` and publisher `LincolnLaw`.

- [ ] **Step 5: Install and verify the exact local artifact**

Run:

```bash
/Applications/Visual\ Studio\ Code.app/Contents/Resources/app/bin/code \
  --install-extension flr-3.4.1.vsix --force
/Applications/Visual\ Studio\ Code.app/Contents/Resources/app/bin/code \
  --list-extensions --show-versions | rg '^lincolnlaw\.flr@3\.4\.1$'
```

Expected: installation succeeds and the second command prints `lincolnlaw.flr@3.4.1`.

---

### Task 3: Submit and verify Marketplace review

**Files:**
- Publish artifact: `flr-3.4.1.vsix`

**Interfaces:**
- Consumes: the locally installed `flr-3.4.1.vsix` from Task 2 and existing `LincolnLaw` publisher credentials.
- Produces: Marketplace submission for `LincolnLaw.flr@3.4.1`.

- [ ] **Step 1: Confirm the current official publishing command and credential state**

Read the current official VS Code Marketplace publishing documentation, then run the non-secret
publisher/auth status command exposed by `@vscode/vsce`. Do not print tokens or credential values.

- [ ] **Step 2: Publish the exact verified VSIX**

When CLI credentials are available, run:

```bash
npx --yes @vscode/vsce publish --packagePath flr-3.4.1.vsix
```

If CLI credentials are unavailable, upload the same VSIX through the already authenticated Visual
Studio Marketplace publisher page. Do not rebuild between local installation and publication.

- [ ] **Step 3: Verify submission status and version**

Read the extension back from Marketplace using the official CLI/API or publisher management page.
Confirm publisher `LincolnLaw`, extension `flr`, version `3.4.1`, and the returned review/publish
status. Record the exact status without claiming public availability before Marketplace processing
finishes.

- [ ] **Step 4: Run final repository verification**

Run:

```bash
npm test
npm run compile
git diff --check
git status --short --branch
```

Expected: tests and compilation exit 0; only the intentionally untracked `flr-3.4.1.vsix` may remain.
