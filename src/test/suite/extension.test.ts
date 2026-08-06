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
    if (!yaml.isMap(flutter)) {
      assert.fail('flutter must be a YAML map');
    }
    const assets = flutter.get('assets');
    if (!yaml.isSeq(assets)) {
      assert.fail('flutter.assets must be a YAML sequence');
    }
    const assetValues = assets.items.map((item: unknown) => `${item}`);
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
