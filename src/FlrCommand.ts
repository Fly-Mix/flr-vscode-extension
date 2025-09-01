import * as vscode from 'vscode';
import * as path from 'path';
import * as os from 'os';
import * as fs from 'fs';
import * as FlrConstant from './FlrConstant';
import { FlrFileUtil } from './util/FlrFileUtil';
import * as utils from './utils';
import { FlrAssetUtil } from './util/FlrAssetUtil';
import { FlrCodeUtil } from './util/FlrCodeUtil';
import { exec } from 'child_process';
import * as yaml from 'yaml';


export class FlrCommand {
  public static async initAll() {
    // 检测当前flutter主工程根目录是否存在 pubspec.yaml；若不存在说明不是flutter工程
    let flutterMainProjectRootDir = FlrFileUtil.getFlutterMainProjectRootDir();
    if (flutterMainProjectRootDir === undefined) {
      return;
    }
    let mainProjectPubspecFile = FlrFileUtil.getPubspecFilePath(
      flutterMainProjectRootDir
    );
    if (fs.existsSync(mainProjectPubspecFile) === false) {
      return;
    }

    // 获取主工程和其所有子工程，对它们进行initOne操作
    let flutterSubProjectRootDirArray =
      FlrFileUtil.getFlutterSubProjectRootDirs(flutterMainProjectRootDir);
    this.initOne(flutterMainProjectRootDir);
    flutterSubProjectRootDirArray.forEach((flutterProjectRootDir) => {
      this.initOne(flutterProjectRootDir);
    });

    vscode.window.showInformationMessage(
      `[FLR] All flutter projects init successfully`
    );
  }

  public static async initOne(flutterProjectRootDir: string) {
    let pubspecFile = FlrFileUtil.getPubspecFilePath(flutterProjectRootDir);

    if (fs.existsSync(pubspecFile) === false) {
      return;
    }

    var pubspecConfig = FlrFileUtil.loadPubspecConfigFromFile(pubspecFile);
    var flrDartfmtLineLength = FlrConstant.DARTFMT_LINE_LENGTH;
    var flrAssets: any[] = [];
    var flrFonts: any[] = [];
    let flrOld = pubspecConfig.get('flr');
    if (flrOld === null || flrOld === undefined) {
      let flr = pubspecConfig.createNode({
        core_version: FlrConstant.CORE_VERSION,
        dartfmt_line_length: flrDartfmtLineLength,
        assets: flrAssets,
        fonts: flrFonts,
      });
      pubspecConfig.set('flr', flr);
    }
    let flr = pubspecConfig.get('flr');
    if (yaml.isMap(flr)) {
      let oldFlrConfig = flr;

      let dartfmt_line_length = oldFlrConfig.get('dartfmt_line_length');
      if (dartfmt_line_length !== undefined && dartfmt_line_length !== null && typeof dartfmt_line_length === 'number') {
        flrDartfmtLineLength = dartfmt_line_length;
        oldFlrConfig.set('dartfmt_line_length', flrDartfmtLineLength);
      }

      oldFlrConfig = await this.normalizeAssetsAndFontsValue(oldFlrConfig);
      pubspecConfig.set('flr', oldFlrConfig);
    }

    var ref = '0.1.1';
    let env = pubspecConfig.get('environment');
    if (env !== undefined && env !== null && yaml.isMap(env)) {
      let sdkRaw = env.get('sdk');
      const sdk = `${sdkRaw}`;
      if (sdk !== '') {
        const value = sdk.replace('sdk:', '').trimLeft();
        /// sdk: '>=2.15.0'
        /// sdk: ^3.8.1
        /// sdk: '>=2.15.0 <3.0.0'
        let constraints = value.toString().replace('"', '').replace("'", "").split(' ');
        const isRanged = constraints.length > 1;
        let minimumVersion: number = -1;
        if (isRanged) {
          let atLeastVersion = constraints[0]
            .replace('>=', '')
            .replace('>', '')
            .replace('=', '');
          let valus = atLeastVersion.split('.');
          let dartVersion =
            (parseInt(valus[0]) ?? 0) * 10000000 + (parseInt(valus[1]) ?? 0) * 1000 + (parseInt(valus[2]) ?? 0);
          minimumVersion = dartVersion;
        } else {
          /// sdk: '>=2.15.0'
          /// sdk: ^3.8.1
          let atLeastVersion = constraints[0]
            .replace('>=', '')
            .replace('>', '')
            .replace('=', '')
            .replace('^', '');
          let valus = atLeastVersion.split('.');
          let dartVersion = (parseInt(valus[0]) ?? 0) * 10000000 + (parseInt(valus[1]) ?? 0) * 1000 + (parseInt(valus[2]) ?? 0);
          minimumVersion = dartVersion;
        }


        //20012000
        const dartVersionV1 = 20000000 + 6000; // flutter verion v1.10.15 - dart 2.6.0
        const dartVersionV2 = 20000000 + 12000; // dart 2.12.0
        const dartVersionV15 = 20000000 + 15000; // dart 2.15.0
        const dartVersionV30 = 30000000; // dart 3.0.0
        if (minimumVersion >= dartVersionV30) {
          ref = '1.0.0';
        } else
          if (minimumVersion >= dartVersionV15) {
            ref = '0.4.1';
          } else if (minimumVersion >= dartVersionV2) {
            ref = '0.4.0-nullsafety.0';
          } else if (minimumVersion >= dartVersionV1) {
            ref = '0.2.1';
          }
      }
    }

    let rDartLibraryConfig = {
      git: {
        url: 'https://github.com/CodeEagle/r_dart_library.git',
        ref: ref,
      },
    };

    var dependenciesConfig = pubspecConfig.get('dependencies');
    if (dependenciesConfig !== undefined && dependenciesConfig !== null && yaml.isMap(dependenciesConfig)) {
      dependenciesConfig.set('r_dart_library', rDartLibraryConfig);
    }

    FlrFileUtil.dumpPubspecConfigToFile(pubspecConfig, pubspecFile);

    return;
  }

  public static async generateAll(silent: boolean = true) {
    // 检测当前flutter主工程根目录是否存在 pubspec.yaml；若不存在说明不是flutter工程
    let flutterMainProjectRootDir = FlrFileUtil.getFlutterMainProjectRootDir();
    if (flutterMainProjectRootDir === undefined) {
      return;
    }
    let mainProjectPubspecFile = FlrFileUtil.getPubspecFilePath(
      flutterMainProjectRootDir
    );
    if (fs.existsSync(mainProjectPubspecFile) === false) {
      return;
    }

    // 获取主工程和其所有子工程，对它们进行generateOne操作
    let flutterSubProjectRootDirArray =
      FlrFileUtil.getFlutterSubProjectRootDirs(flutterMainProjectRootDir);
    this.generateOne(flutterMainProjectRootDir);
    flutterSubProjectRootDirArray.forEach((flutterProjectRootDir) => {
      this.generateOne(flutterProjectRootDir);
    });

    if (silent === false) {
      vscode.window.showInformationMessage(
        `[FLR] All flutter projects's resources are generated successfully`
      );
    }
  }

  public static async generateOne(flutterProjectRootDir: string) {
    let pubspecFile = FlrFileUtil.getPubspecFilePath(flutterProjectRootDir);
    if (fs.existsSync(pubspecFile) === false) {
      return;
    }

    let resourceDirResultTuple = FlrFileUtil.getFlrResourceDirs(
      flutterProjectRootDir
    );
    let assetsResourceDirs: string[] = resourceDirResultTuple[0];
    let fontsResourceDirs: string[] = resourceDirResultTuple[1];
    let validResourceDirCount =
      assetsResourceDirs.length + fontsResourceDirs.length;
    if (validResourceDirCount === 0) {
      return;
    }

    let pubspecConfig = FlrFileUtil.loadPubspecConfigFromFile(pubspecFile);
    let packageName: string = '';

    const nameRaw = pubspecConfig.get('name');
    packageName = `${nameRaw}`;

    let isPackageProjectType = FlrFileUtil.isPackageProjectType(
      flutterProjectRootDir
    );

    var imageAssetArray: string[] = new Array();
    var illegalImageFileArray: string[] = new Array();
    for (const index in assetsResourceDirs) {
      let resourceDir = assetsResourceDirs[index];
      let imageFileResultTuple = FlrFileUtil.findImageFiles(resourceDir);
      let legalImageFileSubArray = imageFileResultTuple[0];
      let illegalImageFileSubArray = imageFileResultTuple[1];

      illegalImageFileArray = illegalImageFileArray.concat(
        illegalImageFileSubArray
      );

      let imageAssetSubArray = FlrAssetUtil.generateImageAssets(
        flutterProjectRootDir,
        packageName,
        legalImageFileSubArray
      );
      imageAssetArray = imageAssetArray.concat(imageAssetSubArray);
    }
    imageAssetArray = Array.from(new Set(imageAssetArray));
    imageAssetArray.sort();

    var nonSvgImageAssetArray: string[] = new Array();
    var svgImageAssetArray: string[] = new Array();
    for (const asset of imageAssetArray) {
      if (FlrFileUtil.isSvgImageResourceFile(asset)) {
        svgImageAssetArray.push(asset);
      } else {
        nonSvgImageAssetArray.push(asset);
      }
    }
    nonSvgImageAssetArray.sort();
    svgImageAssetArray.sort();

    var textAssetArray: string[] = new Array();
    var illegalTextFileArray: string[] = new Array();
    for (const index in assetsResourceDirs) {
      let resourceDir = assetsResourceDirs[index];
      let textFileResultTuple = FlrFileUtil.findTextFiles(resourceDir);
      let legalTextFileSubArray = textFileResultTuple[0];
      let illegalTextFileSubArray = textFileResultTuple[1];

      illegalTextFileArray = illegalTextFileArray.concat(
        illegalTextFileSubArray
      );

      let textAssetSubArray = FlrAssetUtil.generateImageAssets(
        flutterProjectRootDir,
        packageName,
        legalTextFileSubArray
      );
      textAssetArray = textAssetArray.concat(textAssetSubArray);
    }
    textAssetArray = Array.from(new Set(textAssetArray));
    textAssetArray.sort();

    var fontFamilyConfigArray: Object[] = new Array();
    var illegalFontFileArray: string[] = new Array();
    for (const index in fontsResourceDirs) {
      let resourceDir = fontsResourceDirs[index];
      let fontFamilyDirArray: string[] =
        FlrFileUtil.findTopChildDirs(resourceDir);

      for (const j in fontFamilyDirArray) {
        let fontFamilyDir = fontFamilyDirArray[j];
        let fontFamilyName = path.basename(fontFamilyDir);

        let fontFileResultTuple =
          FlrFileUtil.findFontFilesInFontFamilyDir(fontFamilyDir);
        let legalFontFileArray = fontFileResultTuple[0];
        let illegalFontFileSubArray = fontFileResultTuple[1];

        illegalFontFileArray = illegalFontFileArray.concat(
          illegalFontFileSubArray
        );

        if (legalFontFileArray.length <= 0) {
          continue;
        }

        let fontAssetConfigArray = FlrAssetUtil.generateFontAssetConfigs(
          flutterProjectRootDir,
          packageName,
          legalFontFileArray
        );
        fontAssetConfigArray.sort((a: any, b: any) => {
          let aAsset = a['asset'];
          let bAsset = b['asset'];

          if (aAsset === undefined) {
            aAsset = '';
          }

          if (bAsset === undefined) {
            bAsset = '';
          }

          return utils.caseInsensitiveComparator(aAsset, bAsset);
        });

        let fontFamilyConfig = {
          family: fontFamilyName,
          fonts: fontAssetConfigArray,
        };

        fontFamilyConfigArray.push(fontFamilyConfig);
      }

      fontFamilyConfigArray.sort((a: any, b: any) => {
        let aFamily = a['family'];
        let bFamily = b['family'];

        if (aFamily === undefined) {
          aFamily = '';
        }

        if (bFamily === undefined) {
          bFamily = '';
        }

        return utils.caseInsensitiveComparator(aFamily, bFamily);
      });
    }

    var illegalResourceFileArray: string[] = new Array();
    illegalResourceFileArray = illegalResourceFileArray.concat(
      illegalImageFileArray,
      illegalTextFileArray,
      illegalFontFileArray
    );

    if (illegalResourceFileArray.length > 0) {
      var tips =
        '[!]: warning, found the following resource(s) that the file basename contains illegal characters: ';
      for (const index in illegalResourceFileArray) {
        let resourceFile = illegalResourceFileArray[index];
        tips += '\n';
        tips += '  - ' + resourceFile;
      }
      tips += '\n';
      tips +=
        "[*]: to fix it, you should only use letters (a-z, A-Z), numbers (0-9), and the other legal characters ('_', '+', '-', '.', '·', '!', '@', '&', '$', '￥') to name the file";
      vscode.window.showInformationMessage(tips);
    }

    var flutterConfig = pubspecConfig.get('flutter');
    if (
      flutterConfig === undefined ||
      flutterConfig === null
    ) {
      flutterConfig = pubspecConfig.createNode({});
    }
    if (yaml.isMap(flutterConfig)) {
      var newAssetArray: string[] = new Array();
      newAssetArray = newAssetArray.concat(imageAssetArray, textAssetArray);

      var oldAssetArray: string[] = new Array();
      let assets = flutterConfig.get('assets');
      if (yaml.isSeq<string>(assets)) {
        oldAssetArray = assets.items;
      }

      let assetArray: string[] = FlrAssetUtil.mergeFlutterAssets(
        flutterProjectRootDir,
        packageName,
        newAssetArray,
        oldAssetArray
      );
      if (assetArray.length > 0) {
        // flutterConfig.set('assets', assetArray);
        let assetFolders: string[] = new Array();
        for (const asset of assetArray) {
          if (asset.startsWith('packages') == false) {
            let assetFolder = path.dirname(asset);
            const folder = `${assetFolder}/`;
            if (!assetFolders.includes(folder)) {
              assetFolders.push(folder);
            }
          } else {
            assetFolders.push(asset);
          }
        }
        flutterConfig.set('assets', assetFolders);
      } else {
        flutterConfig.delete('assets');
      }

      if (fontFamilyConfigArray.length > 0) {
        flutterConfig.set('fonts', fontFamilyConfigArray);
      } else {
        flutterConfig.delete('fonts');
      }
      pubspecConfig.set('flutter', flutterConfig);

      // update flr core_version
      const flrConfig = pubspecConfig.get('flr');
      if (yaml.isMap<string, unknown>(flrConfig)) {
        flrConfig.set('core_version', FlrConstant.CORE_VERSION);
        const map = await this.normalizeAssetsAndFontsValue(flrConfig);
        pubspecConfig.set('flr', map);
      }
    }
    FlrFileUtil.dumpPubspecConfigToFile(pubspecConfig, pubspecFile);

    var nonSvgImageAssetIdDict: Map<string, string> = new Map();
    var svgImageAssetIdDict: Map<string, string> = new Map();
    var textAssetIdDict: Map<string, string> = new Map();

    for (const asset of nonSvgImageAssetArray) {
      let usedAssetIdArray = Array.from(nonSvgImageAssetIdDict.values());
      let assetId = FlrCodeUtil.generateAssetId(
        asset,
        usedAssetIdArray,
        FlrConstant.PRIOR_NON_SVG_IMAGE_FILE_TYPE
      );
      nonSvgImageAssetIdDict.set(asset, assetId);
    }

    for (const asset of svgImageAssetArray) {
      let usedAssetIdArray = Array.from(svgImageAssetIdDict.values());
      let assetId = FlrCodeUtil.generateAssetId(
        asset,
        usedAssetIdArray,
        FlrConstant.PRIOR_SVG_IMAGE_FILE_TYPE
      );
      svgImageAssetIdDict.set(asset, assetId);
    }

    for (const asset of textAssetArray) {
      let usedAssetIdArray = Array.from(textAssetIdDict.values());
      let assetId = FlrCodeUtil.generateAssetId(
        asset,
        usedAssetIdArray,
        FlrConstant.PRIOR_TEXT_FILE_TYPE
      );
      textAssetIdDict.set(asset, assetId);
    }

    var r_dart_file_content = '';

    let g_R_class_code = FlrCodeUtil.generate_R_class(packageName);
    r_dart_file_content += g_R_class_code;

    r_dart_file_content += '\n';
    let g_AssetResource_class_code =
      FlrCodeUtil.generate_AssetResource_class(packageName);
    r_dart_file_content += g_AssetResource_class_code;

    r_dart_file_content += '\n';
    let g__R_Image_AssetResource_class_code =
      FlrCodeUtil.generate__R_Image_AssetResource_class(
        nonSvgImageAssetArray,
        nonSvgImageAssetIdDict,
        packageName,
        isPackageProjectType
      );
    r_dart_file_content += g__R_Image_AssetResource_class_code;

    r_dart_file_content += '\n';
    let g__R_Svg_AssetResource_class_code =
      FlrCodeUtil.generate__R_Svg_AssetResource_class(
        svgImageAssetArray,
        svgImageAssetIdDict,
        packageName,
        isPackageProjectType
      );
    r_dart_file_content += g__R_Svg_AssetResource_class_code;

    r_dart_file_content += '\n';
    let g__R_Text_AssetResource_class_code =
      FlrCodeUtil.generate__R_Text_AssetResource_class(
        textAssetArray,
        textAssetIdDict,
        packageName,
        isPackageProjectType
      );
    r_dart_file_content += g__R_Text_AssetResource_class_code;

    r_dart_file_content += '\n';
    let g__R_Image_class_code = FlrCodeUtil.generate__R_Image_class(
      nonSvgImageAssetArray,
      nonSvgImageAssetIdDict,
      packageName
    );
    r_dart_file_content += g__R_Image_class_code;

    r_dart_file_content += '\n';
    let g__R_Svg_class_code = FlrCodeUtil.generate__R_Svg_class(
      svgImageAssetArray,
      svgImageAssetIdDict,
      packageName
    );
    r_dart_file_content += g__R_Svg_class_code;

    r_dart_file_content += '\n';
    let g__R_Text_class_code = FlrCodeUtil.generate__R_Text_class(
      textAssetArray,
      textAssetIdDict,
      packageName
    );
    r_dart_file_content += g__R_Text_class_code;

    r_dart_file_content += '\n';
    let g__R_Font_Family_class_code = FlrCodeUtil.generate__R_FontFamily_class(
      fontFamilyConfigArray,
      packageName
    );
    r_dart_file_content += g__R_Font_Family_class_code;

    let rDartFilePath = flutterProjectRootDir + '/lib/r.g.dart';
    fs.writeFileSync(rDartFilePath, r_dart_file_content);

    /// read line length settings for dart and format
    let flr = pubspecConfig.get('flr');
    let dartfmtLineLength = 80;
    if (yaml.isMap(flr)) {
      const len = flr.get('dartfmt_line_length');
      if (len !== null && len !== undefined && typeof len === 'number') {
        dartfmtLineLength = len;
      }
    }
    if (dartfmtLineLength === null || dartfmtLineLength === undefined) {
      let platform = process.platform;
      var settingFilePath = '';
      let settingFile = 'Code/User/settings.json';
      /// https://vscode.readthedocs.io/en/latest/getstarted/settings/
      if (platform === 'win32' && process.env.APPDATA !== undefined) {
        // windows
        settingFilePath = path.join(process.env.APPDATA, settingFile);
      } else if (platform === 'darwin') {
        // macOS
        settingFilePath = `${os.homedir()}/Library/Application Support/${settingFile}`;
      } else {
        // linux
        settingFilePath = `${os.homedir()}/.config/${settingFile}`;
      }

      let settings = fs.readFileSync(settingFilePath, 'utf8');
      let json = JSON.parse(settings);
      let ll = json['dart.lineLength'];
      if (ll !== null && ll !== undefined) {
        dartfmtLineLength = parseInt(ll);
      }
    }

    if (Number.isInteger(dartfmtLineLength) === false) {
      dartfmtLineLength = FlrConstant.DARTFMT_LINE_LENGTH;
    }

    this.execute(`dart format -l ${dartfmtLineLength} ${rDartFilePath}`);
  }

  private static async execute(command: string): Promise<string> {
    return new Promise<string>((fulfill, reject) => {
      exec(command, function (err: any, stdout: string, _: any) {
        if (err !== null) {
          reject(err);
        } else {
          fulfill(stdout);
        }
      });
    });
  }

  private static async normalizeAssetsAndFontsValue(flrConfig: yaml.YAMLMap): Promise<yaml.YAMLMap> {
    const validExtension = ['png', 'jpg', 'jpeg', 'gif', 'webp', 'icon', 'bmp', 'wbmp', 'svg', 'txt', 'json', 'yaml', 'xml', 'ttf', 'otf', 'ttc'];
    let assets = flrConfig.get('assets');
    if (assets !== undefined && assets !== null && yaml.isSeq(assets)) {
      let items: string[] = [];
      for (let i = 0; i < assets.items.length; i++) {
        let item = `${assets.items[i]}`;
        if (typeof item === 'string') {
          if (item.endsWith('/') === true) {
            items.push(item);
          } else {
            let isValid = false;
            for (let j = 0; j < validExtension.length; j++) {
              let extension = validExtension[j];
              if (item.endsWith(extension)) {
                items.push(item);
                isValid = true;
                break;
              }
            }
            if (isValid === false) {
              items.push(item + '/');
            }
          }
        } else {
          vscode.window.showInformationMessage('Invalid asset item: ' + item);
        }
      }
      flrConfig.set('assets', items);
    }

    let fonts = flrConfig.get('fonts');
    if (fonts !== undefined && fonts !== null && yaml.isSeq(fonts)) {
      let items: string[] = [];
      for (let i = 0; i < fonts.items.length; i++) {
        let item = `${fonts.items[i]}`;
        if (typeof item === 'string') {
          if (item.endsWith('/') === true) {
            items.push(item);
          } else {
            let isValid = false;
            for (let j = 0; j < validExtension.length; j++) {
              let extension = validExtension[j];
              if (item.endsWith(extension)) {
                items.push(item);
                isValid = true;
                break;
              }
            }
            if (isValid === false) {
              items.push(item + '/');
            }
          }
        } else {
          vscode.window.showInformationMessage('Invalid font item: ' + item);
        }
      }
      flrConfig.set('fonts', items);
    }
    return flrConfig;
  }
}
