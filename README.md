# Flr Extension

Flr (Flutter-R) Extension: A Flutter Resource Manager VSCode Extension, which can help flutter developer to auto specify assets in `pubspec.yaml` and generate `r.g.dart` file after he changes the flutter project assets. With `r.g.dart`,  flutter developer can apply the asset in code by referencing it's asset ID function.

## Feature

- Support auto service that automatically specify assets in `pubspec.yaml` and generate  `r.g.dart` file,  which can be triggered manually or by monitoring asset changes
- Support `R.x` (such as `R.image.test()`,  `R.svg.test(width: 100, height: 100)`,  `R.txt.test_json()`) code struct 
- Support for processing image assets ( `.png`, `.jpg`, `.jpeg`, `.gif`, `.webp`, `.icon`, `.bmp`, `.wbmp`, `.svg` ) 
- Support for processing text assets ( `.txt`, `.json`, `.yaml`, `.xml` ) 
- Support for processing font assets ( `.ttf`, `.otf`, `.ttc`) 
- Support for processing [image asset variants](https://flutter.dev/docs/development/ui/assets-and-images#asset-variants)
- Support for processing asset which’s filename is bad:
   - filename has illegal character (such as  `blank`,  `~`, `@`, `#` ) which is outside the range of  valid characters (`0-9`, `A-Z`, `a-z`, `_`, `+`, `-`, `.`, `·`,  `!`,  `@`,  `&`, `$`, `￥`)
   - filename begins with a number or character `_`  or character`$`
- Support for processing assets with the same filename but different path
- Support for processing multi projects (the main project and its sub projects in one workspace)
- Support for auto merging old asset specifications when specifying new assets

## Installation

- search and install `Flr` in VSCode Extensions Marketplace
- install `vsix` version from [Release](https://github.com/Fly-Mix/flr-vscode-extension/releases)

## Usage

If you open a folder in `VSCode` and with `pubspec.yaml` in root,

It'll show the `FLR(ASSETS MANGER)` session in `EXPLORER` window

<image src = "https://raw.githubusercontent.com/Fly-Mix/Resources/master/FLRVSCodeExtension/explorer.png" width=300/>
<br/>

## Detail feature of Flr

`+`: Add `flr config` to `pubspec.yaml`

`Refresh`: regenerate `r.g.dart` according to config

`Start/Stop Monitor`: enable/disable resource folder monitor. if enabled, will auto refresh `r.g.dart` if resources changed.

<image src = "https://raw.githubusercontent.com/Fly-Mix/Resources/master/FLRVSCodeExtension/usage.jpg" width=300/>

## Recommended Flutter Resource Structure 

`Flr` the following flutter resource structure schemes:

- scheme 1:

  ```
  flutter_project_root_dir
  ├── build
  │   ├── ..
  ├── lib
  │   ├── assets
  │   │   ├── images // image resource directory of all modules
  │   │   │   ├── #{module} // image resource directory of a module
  │   │   │   │   ├── #{main_image_asset}
  │   │   │   │   ├── #{variant-dir} // image resource directory of a variant
  │   │   │   │   │   ├── #{image_asset_variant}
  │   │   │   │
  │   │   │   ├── home // image resource directory of home module
  │   │   │   │   ├── home_badge.svg
  │   │   │   │   ├── home_icon.png
  │   │   │   │   ├── 3.0x // image resource directory of a 3.0x-ratio-variant
  │   │   │   │   │   ├── home_icon.png
  │   │   │   │		
  │   │   ├── texts // text resource directory
  │   │   │   │     // (you can also break it down further by module)
  │   │   │   └── test.json
  │   │   │   └── test.yaml
  │   │   │   │
  │   │   ├── fonts // font resource directory of all font-families
  │   │   │   ├── #{font-family} // font resource directory of a font-family
  │   │   │   │   ├── #{font-family}-#{font_weight_or_style}.ttf
  │   │   │   │
  │   │   │   ├── Amiri // font resource directory of Amiri font-family
  │   │   │   │   ├── Amiri-Regular.ttf
  │   │   │   │   ├── Amiri-Bold.ttf
  │   │   │   │   ├── Amiri-Italic.ttf
  │   │   │   │   ├── Amiri-BoldItalic.ttf
  │   ├── ..

  ```
- scheme 2:
  ```
  flutter_project_root_dir
  ├── build
  │   ├── ..
  ├── lib
  │   ├── ..
  ├── assets
  │   ├── images // image resource directory of all modules
  │   │   ├── #{module} // image resource directory of a module
  │   │   │   ├── #{main_image_asset}
  │   │   │   ├── #{variant-dir} // image resource directory of a variant
  │   │   │   │   ├── #{image_asset_variant}
  │   │   │
  │   │   ├── home // image resource directory of home module
  │   │   │   ├── home_badge.svg
  │   │   │   ├── home_icon.png
  │   │   │   ├── 3.0x // image resource directory of a 3.0x-ratio-variant
  │   │   │   │   ├── home_icon.png
  │   │   │		
  │   ├── texts // text resource directory
  │   │   │     // (you can also break it down further by module)
  │   │   └── test.json
  │   │   └── test.yaml
  │   │   │
  │   ├── fonts // font resource directory of all font-families
  │   │   ├── #{font-family} // font resource directory of a font-family
  │   │   │   ├── #{font-family}-#{font_weight_or_style}.ttf
  │   │   │
  │   │   ├── Amiri // font resource directory of Amiri font-family
  │   │   │   ├── Amiri-Regular.ttf
  │   │   │   ├── Amiri-Bold.ttf
  │   │   │   ├── Amiri-Italic.ttf
  │   │   │   ├── Amiri-BoldItalic.ttf
  │   ├── ..

  ```


**Big Attention,  the resource structure in the root directory of the font resource MUST follow the structure described above:** name the subdirectory with a font family name, and place the font resources of the font family in the subdirectory. Otherwise, `Flr` may not scan the font resource correctly.

## Example

```yaml
# pubspec.yaml
...
# flutter-resource-structure-scheme-1 example:
flr:
  core_version: 1.0.0
  # config the line length that is used to format r.g.dart
  dartfmt_line_length: 80
  # config the image and text resource directories that need to be scanned
  assets:
    - lib/assets/images
    - lib/assets/texts
  # config the font resource directories that need to be scanned
  fonts:
    - lib/assets/fonts

...
```

You can get more details from the following examples：

- [Flutter-R Demo](https://github.com/Fly-Mix/flutter_r_demo) 

- [flutter_hello_app](https://github.com/Fly-Mix/flutter_hello_app)

- [flutter_hello_module](https://github.com/Fly-Mix/flutter_hello_module)

- [flutter_hello_package](https://github.com/Fly-Mix/flutter_hello_package)

- [flutter_hello_plugin](https://github.com/Fly-Mix/flutter_hello_plugin)

## License

The extension is available as open source under the terms of the [MIT License](https://opensource.org/licenses/MIT).

