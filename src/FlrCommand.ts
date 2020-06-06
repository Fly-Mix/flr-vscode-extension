import * as vscode from "vscode";
import * as path from "path";
import * as os from "os";
import * as fs from "fs";
import * as FlrConstant from "./FlrConstant";
import { FlrFileUtil } from "./util/FlrFileUtil";
import * as utils from "./utils";
import { FlrAssetUtil } from "./util/FlrAssetUtil";
import { FlrCodeUtil } from "./util/FlrCodeUtil";
import { exec } from "child_process";

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
    let flutterSubProjectRootDirArray = FlrFileUtil.getFlutterSubProjectRootDirs(
      flutterMainProjectRootDir
    );
    this.initOne(flutterMainProjectRootDir);
    flutterSubProjectRootDirArray.forEach((flutterProjectRootDir) => {
      this.initOne(flutterProjectRootDir);
    });

    vscode.window.showInformationMessage(
      `adds flr config for all flutter projects done`
    );
  }

  public static async initOne(flutterProjectRootDir: string) {
    let pubspecFile = FlrFileUtil.getPubspecFilePath(flutterProjectRootDir);

    if (fs.existsSync(pubspecFile) === false) {
      return;
    }

    var pubspecConfig = FlrFileUtil.loadPubspecConfigFromFile(pubspecFile);
    var flrDartfmtLineLength = FlrConstant.DARTFMT_LINE_LENGTH;
    var flrAssets = [];
    var flrFonts = [];
    if (pubspecConfig.hasOwnProperty("flr")) {
      let oldFlrConfig = pubspecConfig["flr"];

      if (oldFlrConfig.hasOwnProperty("dartfmt_line_length")) {
        flrDartfmtLineLength = oldFlrConfig["dartfmt_line_length"];
      }

      if (oldFlrConfig.hasOwnProperty("assets")) {
        flrAssets = oldFlrConfig["assets"];
      }

      if (oldFlrConfig.hasOwnProperty("fonts")) {
        flrFonts = oldFlrConfig["fonts"];
      }
    }

    var flrConfig = {
      core_version: FlrConstant.CORE_VERSION,
      dartfmt_line_length: flrDartfmtLineLength,
      assets: flrAssets,
      fonts: flrFonts,
    };
    pubspecConfig["flr"] = flrConfig;

    var ref = "0.1.1";
    let str = await this.execute("flutter --version");
    let lines = str.split("\n");
    if (lines.length > 0) {
      let flutterVer = lines[0]
        .split("•")[0]
        ?.split(" ")[1]
        ?.split("+")[0]
        ?.replace(/\./g, "");
      if (flutterVer !== null) {
        // version using decoder callback
        let fixedVer = 11015; // v1.10.15
        if (parseInt(flutterVer) >= fixedVer) {
          ref = "0.2.1";
        }
      }
    }

    let rDartLibraryConfig = {
      git: {
        url: "https://github.com/YK-Unit/r_dart_library.git",
        ref: ref,
      },
    };

    var dependenciesConfig = pubspecConfig["dependencies"];
    dependenciesConfig["r_dart_library"] = rDartLibraryConfig;
    pubspecConfig["dependencies"] = dependenciesConfig;

    FlrFileUtil.dumpPubspecConfigToFile(pubspecConfig, pubspecFile);

    return;
  }

  public static async generate(
    assetsResourceDirs: string[],
    fontsResourceDirs: string[]
  ) {
    let validResourceDirCount =
      assetsResourceDirs.length + fontsResourceDirs.length;
    if (validResourceDirCount === 0) {
      return;
    }

    let flutterProjectRootDir = FlrFileUtil.getFlutterMainProjectRootDir();

    if (flutterProjectRootDir === undefined) {
      return;
    }

    let pubspecFile = FlrFileUtil.getPubspecFilePath(flutterProjectRootDir);

    if (fs.existsSync(pubspecFile) === false) {
      return;
    }

    let pubspecConfig = FlrFileUtil.loadPubspecConfigFromFile(pubspecFile);
    let packageName = pubspecConfig["name"];

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
      let fontFamilyDirArray: string[] = FlrFileUtil.findTopChildDirs(
        resourceDir
      );

      for (const j in fontFamilyDirArray) {
        let fontFamilyDir = fontFamilyDirArray[j];
        let fontFamilyName = path.basename(fontFamilyDir);

        let fontFileResultTuple = FlrFileUtil.findFontFilesInFontFamilyDir(
          fontFamilyDir
        );
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
          let aAsset = a["asset"];
          let bAsset = b["asset"];

          if (aAsset === undefined) {
            aAsset = "";
          }

          if (bAsset === undefined) {
            bAsset = "";
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
        let aFamily = a["family"];
        let bFamily = b["family"];

        if (aFamily === undefined) {
          aFamily = "";
        }

        if (bFamily === undefined) {
          bFamily = "";
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
        "[!]: warning, found the following resource(s) that the file basename contains illegal characters: ";
      for (const index in illegalResourceFileArray) {
        let resourceFile = illegalResourceFileArray[index];
        tips += "\n";
        tips += "  - " + resourceFile;
      }
      tips += "\n";
      tips +=
        "[*]: to fix it, you should only use letters (a-z, A-Z), numbers (0-9), and the other legal characters ('_', '+', '-', '.', '·', '!', '@', '&', '$', '￥') to name the file";
      vscode.window.showInformationMessage(tips);
    }

    let flutterConfig = pubspecConfig["flutter"];

    var newAssetArray: string[] = new Array();
    newAssetArray = newAssetArray.concat(imageAssetArray, textAssetArray);

    var oldAssetArray: string[] = new Array();
    if (flutterConfig.hasOwnProperty("assets")) {
      let assets = flutterConfig["assets"];
      if (Array.isArray(assets)) {
        oldAssetArray = assets;
      }
    }

    let assetArray: string[] = FlrAssetUtil.mergeFlutterAssets(
      flutterProjectRootDir,
      packageName,
      newAssetArray,
      oldAssetArray
    );
    if (assetArray.length > 0) {
      flutterConfig["assets"] = assetArray;
    } else {
      delete flutterConfig["assets"];
    }

    if (fontFamilyConfigArray.length > 0) {
      flutterConfig["fonts"] = fontFamilyConfigArray;
    } else {
      delete flutterConfig["fonts"];
    }

    pubspecConfig["flutter"] = flutterConfig;
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

    var r_dart_file_content = "";

    let g_R_class_code = FlrCodeUtil.generate_R_class(packageName);
    r_dart_file_content += g_R_class_code;

    r_dart_file_content += "\n";
    let g_AssetResource_class_code = FlrCodeUtil.generate_AssetResource_class(
      packageName
    );
    r_dart_file_content += g_AssetResource_class_code;

    r_dart_file_content += "\n";
    let g__R_Image_AssetResource_class_code = FlrCodeUtil.generate__R_Image_AssetResource_class(
      nonSvgImageAssetArray,
      nonSvgImageAssetIdDict,
      packageName,
      isPackageProjectType
    );
    r_dart_file_content += g__R_Image_AssetResource_class_code;

    r_dart_file_content += "\n";
    let g__R_Svg_AssetResource_class_code = FlrCodeUtil.generate__R_Svg_AssetResource_class(
      svgImageAssetArray,
      svgImageAssetIdDict,
      packageName,
      isPackageProjectType
    );
    r_dart_file_content += g__R_Svg_AssetResource_class_code;

    r_dart_file_content += "\n";
    let g__R_Text_AssetResource_class_code = FlrCodeUtil.generate__R_Text_AssetResource_class(
      textAssetArray,
      textAssetIdDict,
      packageName,
      isPackageProjectType
    );
    r_dart_file_content += g__R_Text_AssetResource_class_code;

    r_dart_file_content += "\n";
    let g__R_Image_class_code = FlrCodeUtil.generate__R_Image_class(
      nonSvgImageAssetArray,
      nonSvgImageAssetIdDict,
      packageName
    );
    r_dart_file_content += g__R_Image_class_code;

    r_dart_file_content += "\n";
    let g__R_Svg_class_code = FlrCodeUtil.generate__R_Svg_class(
      svgImageAssetArray,
      svgImageAssetIdDict,
      packageName
    );
    r_dart_file_content += g__R_Svg_class_code;

    r_dart_file_content += "\n";
    let g__R_Text_class_code = FlrCodeUtil.generate__R_Text_class(
      textAssetArray,
      textAssetIdDict,
      packageName
    );
    r_dart_file_content += g__R_Text_class_code;

    r_dart_file_content += "\n";
    let g__R_Font_Family_class_code = FlrCodeUtil.generate__R_FontFamily_class(
      fontFamilyConfigArray,
      packageName
    );
    r_dart_file_content += g__R_Font_Family_class_code;

    let rDartFilePath = flutterProjectRootDir + "/lib/r.g.dart";
    fs.writeFileSync(rDartFilePath, r_dart_file_content);

    /// read line length settings for dart and format
    var dartfmtLineLength = pubspecConfig["flr"]["dartfmt_line_length"];
    if (dartfmtLineLength === null || dartfmtLineLength === undefined) {
      let platform = process.platform;
      var settingFilePath = "";
      let settingFile = "Code/User/settings.json";
      /// https://vscode.readthedocs.io/en/latest/getstarted/settings/
      if (platform === "win32" && process.env.APPDATA !== undefined) {
        // windows
        settingFilePath = path.join(process.env.APPDATA, settingFile);
      } else if (platform === "darwin") {
        // macOS
        settingFilePath = `${os.homedir()}/Library/Application Support/${settingFile}`;
      } else {
        // linux
        settingFilePath = `${os.homedir()}/.config/${settingFile}`;
      }

      let settings = fs.readFileSync(settingFilePath, "utf8");
      let json = JSON.parse(settings);
      let ll = json["dart.lineLength"];
      if (ll !== null && ll !== undefined) {
        dartfmtLineLength = parseInt(ll);
      }
    }

    if (Number.isInteger(dartfmtLineLength) === false) {
      dartfmtLineLength = FlrConstant.DARTFMT_LINE_LENGTH;
    }

    this.execute(`flutter format -l ${dartfmtLineLength} ${rDartFilePath}`);
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
}
