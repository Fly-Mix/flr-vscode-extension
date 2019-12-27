import * as vscode from "vscode";

export enum Names {
  generatedFileName = "r.g.dart",
  flr = "flr",
  pubspec = "pubspec.yaml"
}

export enum Commands {
  init = "flr.init",
  openFile = "flr.openFile",
  refresh = "flr.regenerated",
  startMonotor = "flr.startMonitor",
  stopMonitor = "flr.stopMonitor"
}

export enum Regex {
  filename = "[^0-9A-Za-z_\\+\\-\\.$·@!¥&]",
  varname = "[^0-9A-Za-z_\\s$]"
}

export enum ControlFlags {
  isPubspecYamlExist = "isPubspecYamlExist",
  isMonitorEnabled = "isMonitorEnabled"
}

export function switchControl(flag: ControlFlags, toValue: boolean): void {
  vscode.commands.executeCommand("setContext", flag, toValue);
}

export function registerCommandNice(
  context: vscode.ExtensionContext,
  commandId: string,
  run: (...args: any[]) => void
): void {
  context.subscriptions.push(vscode.commands.registerCommand(commandId, run));
}

export function firstWorkSpace(): vscode.Uri | undefined {
  let folders = vscode.workspace.workspaceFolders;
  if (folders && folders.length > 0) {
    return folders[0].uri;
  }
  return undefined;
}

export function distictArray<T>(value: Array<T>): Array<T> {
  return value.filter((n, i) => value.indexOf(n) === i);
}
/// remove 2.0x / 3.0x from path
export function trimScalesPathOf(item: string): string {
  return item.replace("/2.0x", "").replace("/3.0x", "");
}

export class SupportedFormat {
  static images = [
    ".png",
    ".jpg",
    ".jpeg",
    ".gif",
    ".webp",
    ".icon",
    ".bmp",
    ".wbmp"
  ];

  static svg = [".svg"];

  static txt = [".txt", ".json", ".yaml", ".xml"];
}
export class Template {
  static flrfileTemplate = `# Flrfile.yaml is used to config the asset directories that needs to be scanned in current flutter project directory.
assets:
  # config the image asset directories that need to be scanned
  # supported image assets: [".png", ".jpg", ".jpeg", ".gif", ".webp", ".icon", ".bmp", ".wbmp", ".svg"]
  # config example: - lib/assets/images
  images:
    #- lib/assets/images
  # config the text asset directories that need to be scanned
  # supported text assets: [".txt", ".json", ".yaml", ".xml"]
  # config example: - lib/assets/texts
  texts:
    #- lib/assets/texts
`;
  static resourceFileHeader(packageName: string): string {
    return `//
// This is a generated file, do not edit!",
// Generated by flr vscode extension, see https://github.com/Fly-Mix/flr-vscode-extension",
//

// ignore: unused_import
import 'package:flutter/widgets.dart';
// ignore: unused_import
import 'package:flutter/services.dart' show rootBundle;
// ignore: unused_import
import 'package:flutter_svg/flutter_svg.dart';
// ignore: unused_import
import 'package:r_dart_library/asset_svg.dart';
import 'package:path/path.dart' as path;

/// This \`R\` class is generated and contains references to static resources.
class R {
  /// package name: moxibustion_instrument
  static const package = "${packageName}";

  /// This \`R.image\` struct is generated, and contains static references to static non-svg type image asset resources.
  static const image = _R_Image();

  /// This \`R.svg\` struct is generated, and contains static references to static svg type image asset resources.
  static const svg = _R_Svg();

  /// This \`R.text\` struct is generated, and contains static references to static text asset resources.
  static const text = _R_Text();
}

/// Asset resource’s metadata class.
class AssetResource {
  /// Creates an object to hold the asset resource’s metadata.
  /// For example:
  /// - asset: assets/images/example.png
  /// - packageName：flutter_demo
  ///
  const AssetResource(this.assetName, {this.packageName}) : assert(assetName != null);

  /// The name of the main asset from the set of asset resources to choose from.
  final String assetName;

  /// The name of the package from which the asset resource is included.
  final String packageName;

  /// The name used to generate the key to obtain the asset resource. For local assets
  /// this is [assetName], and for assets from packages the [assetName] is
  /// prefixed 'packages/<package_name>/'.
  String get keyName => packageName == null ? assetName : 'packages/$packageName/$assetName';

  /// The file basename of the asset resource.
  String get fileBasename {
    final basename = path.basename(assetName);
    return basename;
  }

  /// The no extension file basename of the asset resource.
  String get fileBasenameNoExtension {
    final basenameWithoutExtension = path.basenameWithoutExtension(assetName);
    return basenameWithoutExtension;
  }

  /// The file extension name of the asset resource.
  String get fileExtname {
    final extension = path.extension(assetName);
    return extension;
  }

  /// The directory path name of the asset resource.
  String get fileDirname {
    var dirname = assetName;
    if (packageName != null) {
      final packageStr = "packages/$packageName/";
      dirname = dirname.replaceAll(packageStr, "");
    }
    final filenameStr = "$fileBasename/";
    dirname = dirname.replaceAll(filenameStr, "");
    return dirname;
  }
}
`;
  }

  static textAssetResourceOf(
    path: string,
    escapePath: string,
    filename: string
  ): string {
    let finalPath = this.trimFirstSlashOf(escapePath);
    return this.assetGenerator(
      path,
      `final ${filename} = const AssetResource("${finalPath}", packageName: R.package);`
    );
  }

  static svgAssetResourceOf(
    path: string,
    escapePath: string,
    filename: string
  ): string {
    let finalPath = this.trimFirstSlashOf(escapePath);
    return this.assetGenerator(
      path,
      `final ${filename} = const AssetResource("${finalPath}", packageName: R.package);`
    );
  }

  static imageAssetResourceOf(
    path: string,
    escapePath: string,
    filename: string
  ): string {
    let finalPath = this.trimFirstSlashOf(escapePath);
    return this.assetGenerator(
      path,
      `final ${filename} = const AssetResource("${finalPath}", packageName: R.package);`
    );
  }

  static textAssetOf(path: string, filename: string): string {
    return this.assetGenerator(
      path,
      `Future<String> ${filename}() {
    final str = rootBundle.loadString(asset.${filename}.keyName);
    return str;
  }`
    );
  }

  static svgAssetOf(path: string, filename: string): string {
    return this.assetGenerator(
      path,
      `AssetSvg ${filename}({@required double width, @required double height}) {
    final imageProvider = AssetSvg(asset.${filename}.keyName, width: width, height: height);
    return imageProvider;
  }`
    );
  }

  static imageAssetOf(path: string, filename: string): string {
    return this.assetGenerator(
      path,
      `AssetImage ${filename}() {
    return AssetImage(asset.${filename}.keyName);
  }`
    );
  }

  private static assetGenerator(path: string, customContent: string): string {
    return `\n  /// asset: ${path}
  // ignore: non_constant_identifier_names
  ${customContent}`;
  }

  static textBlockHeader(): string {
    return this.resourceBlockHeader("_R_Text");
  }

  static imagesBlockHeader(): string {
    return this.resourceBlockHeader("_R_Image");
  }

  static svgBlockHeader(): string {
    return this.resourceBlockHeader("_R_Svg");
  }

  private static resourceBlockHeader(sulution: string): string {
    return `\n/// This \`${sulution}\` class is generated and contains references to static non-svg type image asset resources.
// ignore: camel_case_types
class ${sulution} {
  const ${sulution}();

  final asset = const ${sulution}_AssetResource();
`;
  }

  static textAssetResourceBlockHeader(): string {
    return this.assetResourceBlockHeader("_R_Text");
  }

  static imagesAssetResourceBlockHeader(): string {
    return this.assetResourceBlockHeader("_R_Image");
  }

  static svgAssetResourceBlockHeader(): string {
    return this.assetResourceBlockHeader("_R_Svg");
  }

  private static assetResourceBlockHeader(sulution: string): string {
    return `\n// ignore: camel_case_types
class ${sulution}_AssetResource {
  const ${sulution}_AssetResource();
`;
  }

  private static trimFirstSlashOf(path: string): string {
    var finalPath = path;
    if (finalPath.startsWith("/") === true) {
      finalPath = path.substring(1);
    }
    return finalPath;
  }
}
