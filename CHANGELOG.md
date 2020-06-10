## [2.1.1]

- Do some optimizations

## [2.1.0]

- Support for processing (init/generate/monitor) multi projects (the main project and its sub projects in one workspace)

- Support for auto merging old asset specifications when specifying new assets

   > This is can help you to auto keep the manually added asset specifications.

## [2.0.1]

- fixed resources path problem when using in windows [#2](https://github.com/Fly-Mix/flr-vscode-extension/issues/2)

## [2.0.0]

- Support for processing non-implied resource file

  > - non-implied resource file: the resource file which is outside of `lib/` directory, for example:
  >   - `~/path/to/flutter_r_demo/assets/images/test.png`
  >   - `~/path/to/flutter_r_demo/assets/images/3.0x/test.png`
  > - implied resource file: the resource file which is inside of `lib/` directory, for example:
  >   - `~/path/to/flutter_r_demo/lib/assets/images/hot_foot_N.png`
  >   - `~/path/to/flutter_r_demo/lib/assets/images/3.0x/hot_foot_N.png`

## [1.0.0] - Public Release

- Automatically specify assets in pubspec.yaml and generate r.g.dart file
- Support for processing image assets (`.png`, `.jpg`, `.jpeg`, `.gif`, `.webp`, `.icon`, `.bmp`, `.wbmp`, `.svg`)
- Support for processing [image asset variants](https://flutter.dev/docs/development/ui/assets-and-images#asset-variants)
- Support for processing text assets ( `.txt`, `.json`, `.yaml`, `.xml`)
- Support for processing font assets (`.ttf`, `.otf`, `.ttc`)
- New asset generation algorithm to support all kinds of standard or nonstandard image/text resource structure
- New asset-id generation algorithm to support assets with the same filename but different path

## [0.0.7]

- read vscode settings to get `dart.lineLength` to format `r.g.dart`

## [0.0.6]

- Initial release
