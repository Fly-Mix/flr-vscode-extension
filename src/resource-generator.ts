import * as vscode from "vscode";
import * as path from "path";
import * as fs from "fs";
import * as yaml from "js-yaml";
import * as flrPathMan from "./folder-manager";
import * as utils from "./utils";

export class ResourceGenerator {
  static async generateRFile(uri: vscode.Uri, paths: string[]) {
    // read register folders content
    // update pubspec.yaml assets
    // generate R.generated.dart
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
          let hasIllegalChar = rPath.includes(" ") || rPath.includes("#");
          if (hasIllegalChar === false) {
            total.push(path.join(folder.fsPath, rPath));
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
          let relativePath = p.split(root)[1];
          let packagesPath = path.join("packages", name);
          let resourcesPath = path.join(packagesPath, relativePath);

          return utils.trimScalesPathOf(resourcesPath);
        });
        let uniValue = utils.distictArray(mapedAssets);
        data["assets"] = uniValue;
        fs.writeFileSync(pubspec, yaml.safeDump(data));
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

    let workspace = utils.firstWorkSpace();
    let root = workspace?.fsPath;
    if (root) {
      // cerate Flrfile.yaml
      try {
        let file = path.join(root, utils.Names.generatedFileName);
        var content = utils.Template.resourceFileHeader(name);
        let imagesBlock = this.generateImagesBlock(uniAssets, root);
        content += imagesBlock;
        let svgBlock = this.generateSVGBlock(uniAssets, root, name);
        content += svgBlock;
        let textBlock = this.generateTextBlock(uniAssets, root, name);
        content += textBlock;
        fs.writeFileSync(file, content);
      } catch (e) {}
    }
  }

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
      return utils.Template.svgAssetOf(path, name, packageName);
    };
    let block = this.generateBlock(
      assets,
      rootPath,
      header,
      utils.SupportedFormat.svg,
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
      return utils.Template.textAssetOf(path, name, packageName);
    };
    let block = this.generateBlock(
      assets,
      rootPath,
      header,
      utils.SupportedFormat.txt,
      template
    );
    return block;
  }

  private static generateBlock(
    assets: string[],
    rootPath: string,
    header: string,
    supportedFormat: string[],
    itemTemplate: (path: string, name: string) => string
  ): string {
    let filterAssets = assets.filter(
      (val, _) =>
        supportedFormat.filter((fmt, _) => val.endsWith(fmt)).length > 0
    );
    let uniValue = utils.distictArray(filterAssets);
    var blockContent = "";
    for (const index in uniValue) {
      let rp = uniValue[index];
      let p = rp.split(path.join(rootPath, "lib"))[1];
      let components = p.split("/");

      /// in case of a.b.c.png
      let fileNames = components.pop()!.split(".");
      fileNames.pop();

      let rawName = fileNames.join("_");
      let fileName = rawName.toLowerCase().replace(/[^0-9A-Za-z_$]/, "_");
      let trimed = utils.trimScalesPathOf(fileName);
      components.push(trimed);
      blockContent += itemTemplate(p, trimed);
      if (index !== (uniValue.length - 1).toString()) {
        blockContent += "\n";
      }
    }
    var block = header;
    block += blockContent;
    block += "\n}\n";
    return block;
  }
}
