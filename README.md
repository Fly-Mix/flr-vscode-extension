# flr README

## Feature

- Configable path for monitoring to auto generate `r.g.dart`
- auto format `r.g.dart` depends on vscode settings `dart.lineLength`

## Installation

- search and install `FLR` in VSCode Extensions Session
- install `vsix` version from [Release](https://github.com/Fly-Mix/flr-vscode-extension/releases)

## Usage

If you open a folder in `VSCode` and with `pubspec.yaml` in root,

It'll show the `FLR(ASSETS MANGER)` session in `EXPLORER` window

<image src = "https://raw.githubusercontent.com/Fly-Mix/Resources/master/FLRVSCodeExtension/explorer.png" width=300/>
<br/>

## Detail feature of FLR

`+`: Add FLR config to `pubspec.yaml`

`Refresh`: regenerate `r.g.dart` for config

`Start/Stop Monitor`: enable/disable resource folder monitor. if enabled, will auto refresh `r.g.dart` if resources changed.

<image src = "https://raw.githubusercontent.com/Fly-Mix/Resources/master/FLRVSCodeExtension/usage.jpg" width=300/>

## Demo

```
# pubspec.yaml
...

flr:
  version: 0.2.0
  assets:
    - lib/assets/images

...
```

[more detail](https://github.com/Fly-Mix/flutter_r_demo)
