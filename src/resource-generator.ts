import * as vscode from "vscode";
import * as path from "path";
import * as fs from "fs";
import * as yaml from "js-yaml";
import * as flrPathMan from "./folder-manager";
import * as utils from "./utils";

export class ResourceGenerator {
  static namePool: string[] = new Array();
  static errorTips: string[] = new Array();
  static async generateRFile(uri: vscode.Uri, paths: string[]) {
    if (paths.length === 0) {
      return;
    }
    // read register folders content
    // update pubspec.yaml assets
    // generate R.generated.dart
    this.namePool = new Array();
    this.errorTips = new Array();
    var total: string[] = new Array();
    for (const index in paths) {
      let rPath = paths[index];
      let flrUri = vscode.Uri.file(path.join(uri.fsPath, rPath));
      let r = await ResourceGenerator.generateResourceIn(flrUri);
      total = total.concat(r);
    }
    let packageName = ResourceGenerator.updatePubspecAssets(total);
    ResourceGenerator.generatedDartResourcesFile(total, packageName);
  }

  private static async generateResourceIn(
    folder: vscode.Uri
  ): Promise<string[]> {
    const promise = new Promise<string[]>(async (resolve, reject) => {
      var total: string[] = new Array();
      const children = await flrPathMan.FolderManager.readDirectory(folder);
      for (const idx in children) {
        let child = children[idx];
        let rPath = child[0];
        if (child[1] === vscode.FileType.Directory) {
          let uri = vscode.Uri.file(path.join(folder.fsPath, rPath));
          let r = await ResourceGenerator.generateResourceIn(uri);
          total = total.concat(r);
        } else {
          // ignore resource that contains ` `、`#`、`^`、`%` chars
          let basename = this.basenameOf(rPath);
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
        let mapedAssets = assets.map(p => {
          let name = data["name"] as string;
          packageName = name;
          // normalize path
          let relativePath = p.split(path.join(root, "lib"))[1];
          let packagesPath = path.join("packages", name);
          let resourcesPath = path.join(packagesPath, relativePath);

          return utils.trimScalesPathOf(resourcesPath);
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
    let filterAssets = assets.map(item => {
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
        utils.execute(`dartfmt -l 100 -w ${file}`);
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
    if (rootPath.includes("\\\\")) {
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
