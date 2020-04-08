import * as vscode from "vscode";
import * as path from "path";
import * as fs from "fs";
import * as yaml from "js-yaml";
import * as flrPathMan from "./folder-manager";
import * as utils from "./utils";
import * as glob from "glob";
import { FlrFileUtil } from "./util/FlrFileUtil";
import { FlrAssetUtil } from "./util/FlrAssetUtil";
import { FlrCodeUtil } from "./util/FlrCodeUtil";
import {
  PRIOR_NON_SVG_IMAGE_FILE_TYPE,
  PRIOR_SVG_IMAGE_FILE_TYPE,
  PRIOR_TEXT_FILE_TYPE,
  DARTFMT_LINE_LENGTH,
} from "./FlrConstant";

const os = require("os");

export class ResourceGenerator {
  static namePool: string[] = new Array();
  static errorTips: string[] = new Array();
  static async generateRFile(
    uri: vscode.Uri,
    assetsResourceDirPaths: string[],
    fontsResourceDirPaths: string[]
  ) {
    let validResourceDirSize =
      assetsResourceDirPaths.length + fontsResourceDirPaths.length;
    if (validResourceDirSize === 0) {
      return;
    }
    // read register folders content
    // update pubspec.yaml assets
    // generate R.generated.dart
    this.namePool = new Array();
    this.errorTips = new Array();

    let flutterProjectRootDir = FlrFileUtil.getCurFlutterProjectRootDir();
    let pubspecFile = FlrFileUtil.getPubspecFilePath();
    if (flutterProjectRootDir === undefined || pubspecFile === undefined) {
      return;
    }
    let pubspecConfig = FlrFileUtil.loadPubspecConfigFromFile(pubspecFile);
    let packageName = pubspecConfig["name"];

    var imageAssetArray: string[] = new Array();
    var illegalImageFileArray: string[] = new Array();
    for (const index in assetsResourceDirPaths) {
      let resourceDir = assetsResourceDirPaths[index];
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
    for (const index in assetsResourceDirPaths) {
      let resourceDir = assetsResourceDirPaths[index];
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
    for (const index in fontsResourceDirPaths) {
      let resourceDir = fontsResourceDirPaths[index];
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

          return aAsset.localeCompare(bAsset);
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

        return aFamily.localeCompare(bFamily);
      });
    }

    var illegalResourceFileArray: string[] = new Array();
    illegalResourceFileArray = illegalResourceFileArray.concat(
      illegalImageFileArray,
      illegalTextFileArray,
      illegalFontFileArray
    );

    var tips =
      "[!]: warning, found the following illegal resource file who's file basename contains illegal characters: ";
    for (const index in illegalResourceFileArray) {
      let resourceFile = illegalResourceFileArray[index];
      tips += "\n" + "  - " + resourceFile;
    }
    tips +=
      "[*]: to fix it, you should only use letters (a-z, A-Z), numbers (0-9), and the other legal characters ('_', '+', '-', '.', '·', '!', '@', '&', '$', '￥') to name the file";
    if (this.errorTips.includes(tips) === false) {
      this.errorTips.push(tips);
      vscode.window.showInformationMessage(tips);
    }

    let flutterConfig = pubspecConfig["flutter"];

    var assetArray: string[] = new Array();
    assetArray = assetArray.concat(imageAssetArray, textAssetArray);
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
        PRIOR_NON_SVG_IMAGE_FILE_TYPE
      );
      nonSvgImageAssetIdDict.set(asset, assetId);
    }

    for (const asset of svgImageAssetArray) {
      let usedAssetIdArray = Array.from(svgImageAssetIdDict.values());
      let assetId = FlrCodeUtil.generateAssetId(
        asset,
        usedAssetIdArray,
        PRIOR_SVG_IMAGE_FILE_TYPE
      );
      svgImageAssetIdDict.set(asset, assetId);
    }

    for (const asset of textAssetArray) {
      let usedAssetIdArray = Array.from(textAssetIdDict.values());
      let assetId = FlrCodeUtil.generateAssetId(
        asset,
        usedAssetIdArray,
        PRIOR_TEXT_FILE_TYPE
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
      packageName
    );
    r_dart_file_content += g__R_Image_AssetResource_class_code;

    r_dart_file_content += "\n";
    let g__R_Svg_AssetResource_class_code = FlrCodeUtil.generate__R_Svg_AssetResource_class(
      svgImageAssetArray,
      svgImageAssetIdDict,
      packageName
    );
    r_dart_file_content += g__R_Svg_AssetResource_class_code;

    r_dart_file_content += "\n";
    let g__R_Text_AssetResource_class_code = FlrCodeUtil.generate__R_Text_AssetResource_class(
      textAssetArray,
      textAssetIdDict,
      packageName
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
      dartfmtLineLength = DARTFMT_LINE_LENGTH;
    }

    utils.execute(`flutter format -l ${dartfmtLineLength} ${rDartFilePath}`);

    // let packageName = ResourceGenerator.updatePubspecAssets(total);
    // ResourceGenerator.generatedDartResourcesFile(total, packageName);
  }

  private static async generateResourceIn(
    folder: vscode.Uri
  ): Promise<string[]> {
    const promise = new Promise<string[]>(async (resolve, reject) => {
      var total: string[] = new Array();
      const children = await flrPathMan.FolderManager.readDirectory(folder);
      console.log("folder: " + folder + "\nchildren: " + children);

      for (const idx in children) {
        let child = children[idx];
        let rPath = child[0];
        if (child[1] === vscode.FileType.Directory) {
          let uri = vscode.Uri.file(path.join(folder.fsPath, rPath));
          let r = await ResourceGenerator.generateResourceIn(uri);
          total = total.concat(r);
        } else {
          // 过滤不支持的文件类型的文件
          let extension = path.extname(rPath);
          if (utils.SupportedFormat.isSupportedFormat(extension) === false) {
            continue;
          }
          // ignore resource that contains ` `、`#`、`^`、`%` chars
          let basename = this.basenameOf(rPath);
          // 过滤隐藏文件，如“.DS_Store”
          if (basename === "") {
            continue;
          }
          let finalName = basename.replace(/[^0-9A-Za-z_\+\-\.$·@!¥￥&]/g, "_");
          let hasIllegalChar = finalName !== basename;
          if (hasIllegalChar === false) {
            total.push(path.join(folder.fsPath, rPath));
          } else {
            let tips = `Illegal Resource Name: ->|${rPath}|<-, Just Allowed Using Chars Within 0-9, A-Z, a-z, +-_$·@!¥&`;
            if (this.errorTips.includes(tips) === false) {
              this.errorTips.push(tips);
              vscode.window.showInformationMessage(tips);
            }
          }
        }
      }
      resolve(total);
    });
    return promise;
  }

  private static updatePubspecAssets(assets: string[]): string | undefined {
    var packageName: string | undefined;
    let folders = vscode.workspace.workspaceFolders;
    if (folders) {
      // cerate Flrfile.yaml
      let root = folders[0].uri.fsPath;
      try {
        let pubspec = path.join(root, utils.Names.pubspec);
        let fileContents = fs.readFileSync(pubspec, "utf8");
        var data = yaml.safeLoad(fileContents);
        let mapedAssets = assets.map((p) => {
          let name = data["name"] as string;
          packageName = name;
          // normalize path
          let relativePath = p.split(path.join(root, "lib"))[1];
          let packagesPath = path.join("packages", name);
          let resourcesPath = path.join(packagesPath, relativePath);
          let extname = path.extname(resourcesPath);
          if (utils.SupportedFormat.isSupportedNonSvgTypeImage(extname)) {
            resourcesPath = utils.trimScalesPathOf(resourcesPath);
          }
          return resourcesPath;
        });
        let uniValue = utils.distictArray(mapedAssets);
        var flutter = data["flutter"] ?? new Map();
        if (uniValue.length !== 0) {
          flutter["assets"] = uniValue;
          data["flutter"] = flutter;
          fs.writeFileSync(
            pubspec,
            yaml.safeDump(JSON.parse(JSON.stringify(data))).replace(/'/g, '"')
          );
        }
      } catch (e) {
        vscode.window.showErrorMessage(e);
      }
    }
    return packageName;
  }

  private static generatedDartResourcesFile(
    assets: string[],
    packageName: string | undefined
  ) {
    let name = packageName ?? "";
    let filterAssets = assets.map((item) => {
      return utils.trimScalesPathOf(item);
    });
    let uniAssets = filterAssets.filter(
      (n, i) => filterAssets.indexOf(n) === i
    );

    let uniValue = utils.distictArray(uniAssets);
    for (const index in uniValue) {
      let p = uniValue[index];
      var components = p.split("/");
      if (p.includes("\\\\")) {
        components = p.split("\\");
      }
      let filename = components.pop()!;
      let rawName = this.basenameOf(filename, true);
      if (filename.endsWith(".svg") === false) {
        if (this.namePool.includes(rawName) === false) {
          this.namePool.push(rawName);
        }
      }
    }
    let workspace = utils.firstWorkSpace();
    let root = workspace?.fsPath;
    if (root) {
      // cerate Flrfile.yaml
      try {
        let file2 = path.join(root, "lib");
        let file = path.join(file2, utils.Names.generatedFileName);
        var content = utils.Template.resourceFileHeader(name);

        let imagesAssetResourcesBlock = this.generateImagesAssetResourcesBlock(
          uniAssets,
          root
        );
        content += imagesAssetResourcesBlock;
        let svgAssetResourcesBlock = this.generateSVGAssetResourcesBlock(
          uniAssets,
          root,
          name
        );
        content += svgAssetResourcesBlock;
        let textAssetResourcesBlock = this.generateTextAssetResourcesBlock(
          uniAssets,
          root,
          name
        );
        content += textAssetResourcesBlock;

        let imagesBlock = this.generateImagesBlock(uniAssets, root);
        content += imagesBlock;
        let svgBlock = this.generateSVGBlock(uniAssets, root, name);
        content += svgBlock;
        let textBlock = this.generateTextBlock(uniAssets, root, name);
        content += textBlock;

        fs.writeFileSync(file, content);

        /// read line length settings for dart and format
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
        var lineLength = 80;
        if (ll !== null && ll !== undefined) {
          lineLength = parseInt(ll);
        }

        utils.execute(`flutter format -l ${lineLength} ${file}`);
      } catch (e) {
        console.log(e);
      }
    }
  }

  private static generateImagesAssetResourcesBlock(
    assets: string[],
    rootPath: string
  ): string {
    let header = utils.Template.imagesAssetResourceBlockHeader();
    let template: (path: string, escapePath: string, name: string) => string = (
      path,
      escapePath,
      name
    ) => {
      return utils.Template.imageAssetResourceOf(path, escapePath, name);
    };
    let block = this.generateAssetResourcesBlock(
      assets,
      rootPath,
      header,
      utils.SupportedFormat.images,
      false,
      template
    );

    return block;
  }

  private static generateSVGAssetResourcesBlock(
    assets: string[],
    rootPath: string,
    packageName: string
  ): string {
    let header = utils.Template.svgAssetResourceBlockHeader();
    let template: (path: string, escapePath: string, name: string) => string = (
      path,
      escapePath,
      name
    ) => {
      return utils.Template.svgAssetResourceOf(path, escapePath, name);
    };
    let block = this.generateAssetResourcesBlock(
      assets,
      rootPath,
      header,
      utils.SupportedFormat.svg,
      false,
      template
    );
    return block;
  }

  private static generateTextAssetResourcesBlock(
    assets: string[],
    rootPath: string,
    packageName: string
  ): string {
    let header = utils.Template.textAssetResourceBlockHeader();
    let template: (path: string, escapePath: string, name: string) => string = (
      path,
      escapePath,
      name
    ) => {
      return utils.Template.textAssetResourceOf(path, escapePath, name);
    };
    let block = this.generateAssetResourcesBlock(
      assets,
      rootPath,
      header,
      utils.SupportedFormat.txt,
      true,
      template
    );
    return block;
  }

  private static generateAssetResourcesBlock(
    assets: string[],
    rootPath: string,
    header: string,
    supportedFormat: string[],
    isText: boolean = false,
    itemTemplate: (path: string, escapePath: string, name: string) => string
  ): string {
    let filterAssets = assets.filter(
      (val, _) =>
        supportedFormat.filter((fmt, _) => val.endsWith(fmt)).length > 0
    );
    let uniValue = utils.distictArray(filterAssets);
    var blockContent = "";
    for (const index in uniValue) {
      let info = this.nameProcesser(uniValue[index], rootPath, isText);
      let escapePath = info.filepath.replace(/\$/g, "\\$");
      blockContent += itemTemplate(info.filepath, escapePath, info.varname);
      if (index !== (uniValue.length - 1).toString()) {
        blockContent += "\n";
      }
    }
    var block = header;
    block += blockContent;
    if (blockContent.length !== 0) {
      block += "\n";
    }
    block += "}\n";
    return block;
  }

  // MARK: -
  private static generateImagesBlock(
    assets: string[],
    rootPath: string
  ): string {
    let header = utils.Template.imagesBlockHeader();
    let template: (path: string, name: string) => string = (path, name) => {
      return utils.Template.imageAssetOf(path, name);
    };
    let block = this.generateBlock(
      assets,
      rootPath,
      header,
      utils.SupportedFormat.images,
      false,
      template
    );

    return block;
  }

  private static generateSVGBlock(
    assets: string[],
    rootPath: string,
    packageName: string
  ): string {
    let header = utils.Template.svgBlockHeader();
    let template: (path: string, name: string) => string = (path, name) => {
      return utils.Template.svgAssetOf(path, name);
    };
    let block = this.generateBlock(
      assets,
      rootPath,
      header,
      utils.SupportedFormat.svg,
      false,
      template
    );
    return block;
  }

  private static generateTextBlock(
    assets: string[],
    rootPath: string,
    packageName: string
  ): string {
    let header = utils.Template.textBlockHeader();
    let template: (path: string, name: string) => string = (path, name) => {
      return utils.Template.textAssetOf(path, name);
    };
    let block = this.generateBlock(
      assets,
      rootPath,
      header,
      utils.SupportedFormat.txt,
      true,
      template
    );
    return block;
  }

  private static generateBlock(
    assets: string[],
    rootPath: string,
    header: string,
    supportedFormat: string[],
    isText: boolean,
    itemTemplate: (path: string, name: string) => string
  ): string {
    let filterAssets = assets.filter(
      (val, _) =>
        supportedFormat.filter((fmt, _) => val.endsWith(fmt)).length > 0
    );
    let uniValue = utils.distictArray(filterAssets);
    var blockContent = "";
    for (const index in uniValue) {
      let info = this.nameProcesser(uniValue[index], rootPath, isText);
      blockContent += itemTemplate(info.filepath, info.varname);
      if (index !== (uniValue.length - 1).toString()) {
        blockContent += "\n";
      }
    }
    var block = header;
    block += blockContent;
    if (blockContent.length !== 0) {
      block += "\n";
    }
    block += "}\n";
    return block;
  }

  private static basenameOf(
    path: string,
    removeExtension: boolean = true
  ): string {
    let fileNames = path.split(".");
    if (removeExtension) {
      fileNames.pop();
    }
    let rawName = fileNames.join("_");
    return rawName;
  }

  private static nameProcesser(
    resourcePath: string,
    rootPath: string,
    isText: boolean
  ): PathInfo {
    /**
     ## 文件名处理规则

1. 过滤文件名字(包括扩展名，如`xx.fileType`)符不在范围`[0-9A-Za-z_\.\+\-$·@!¥&]`的文件
2. `[^0-9a-Za-z_\+\-$·@!¥&]`，不在此范围内`0-9、a-z、A-Z、_、$`的字符将被替换为`_`
3. toLowerCase
4. 检查首字母如果在`[0-9_$]`范围内`0-9、_、$`，则前面添加一个首字母 `a`
5. 含有 `$` 符号，在前面添加转义符`\`，变成`\$`

     */
    let rp = resourcePath;
    let p = rp.split(path.join(rootPath, "lib"))[1];
    var components = p.split("/");
    if (process.platform === "win32") {
      components = p.split("\\");
    }
    let filename = components.pop()!;
    var rawName = this.basenameOf(filename, isText === false);
    if (isText === false) {
      if (filename.endsWith(".svg") === false) {
        if (this.namePool.includes(rawName)) {
          if (filename.endsWith(".png") === false) {
            rawName = this.basenameOf(filename, false);
          }
        }
      }
    }
    let varname =
      rawName.charAt(0).toLowerCase() +
      rawName.substr(1).replace(/[^0-9A-Za-z_\\s$]/g, "_");
    var trimed = utils.trimScalesPathOf(varname);
    let firstChar = trimed.substr(0, 1);
    let replacedFirstChar = firstChar.replace(/[0-9_$]/, "a");
    if (replacedFirstChar !== firstChar) {
      trimed = replacedFirstChar + trimed;
    }
    var info = new PathInfo();
    info.varname = trimed;
    info.filepath = p;
    return info;
  }
}
export class PathInfo {
  varname: string = "";
  filepath: string = "";

  constructor() {}
}
