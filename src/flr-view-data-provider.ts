import * as vscode from "vscode";
import * as path from "path";
import * as fs from "fs";
import * as utils from "./utils";
import * as yaml from "yaml";
import * as flrPathMan from "./folder-manager";
import * as md5 from "md5";
import { FlrFileUtil } from "./util/FlrFileUtil";
import { FlrCommand } from "./FlrCommand";
import { log } from "console";

export class FileExplorer {
  private fileExplorer: vscode.TreeView<flrPathMan.Entry>;
  private assetsRelativeResourceDirs: string[];
  private fontsRelativeResourceDirs: string[];
  // flutterConfig+flrConfig组合的MD5字典
  private flutterAndFlrConfigsMd5Map: Map<string, string> = new Map();
  // pubspecFile的MD5字典
  private pubspecFileMd5Map: Map<string, string> = new Map();

  constructor(context: vscode.ExtensionContext) {
    const treeDataProvider = new FileSystemProvider((file) => {
      // only show all pubspec.yaml
      let fileBasename = path.basename(file);
      return fileBasename === utils.Names.pubspec;
    });
    this.fileExplorer = vscode.window.createTreeView(utils.Names.flr, {
      treeDataProvider,
    });

    this.assetsRelativeResourceDirs = new Array();
    this.fontsRelativeResourceDirs = new Array();

    utils.registerCommandNice(context, utils.Commands.openFile, (resource) =>
      this.openResource(resource)
    );

    utils.registerCommandNice(
      context,
      utils.Commands.stopMonitor,
      (resource) => {
        this.toggleMonitor(false);
      }
    );
    utils.registerCommandNice(
      context,
      utils.Commands.startMonotor,
      (resource) => {
        this.toggleMonitor(true);
      }
    );

    this.startWatching();
  }

  private refresh() {
    // 重新加载Flr视图
    const treeDataProvider = new FileSystemProvider((file) => {
      // only show all pubspec.yaml
      let fileBasename = path.basename(file);
      return fileBasename === utils.Names.pubspec;
    });
    this.fileExplorer = vscode.window.createTreeView(utils.Names.flr, {
      treeDataProvider,
    });
  }

  /// watching current workspace file change to reload FLR
  private startWatching() {
    this.assetsRelativeResourceDirs = new Array();
    this.fontsRelativeResourceDirs = new Array();

    let raw = utils.firstWorkSpace();
    if (raw === undefined) {
      return;
    }
    let uri = raw!;
    const watcher = fs.watch(
      uri.fsPath,
      { recursive: true },
      async (event: string, file: string) => {
        let fileBasename = path.basename(file);
        if (fileBasename === utils.Names.pubspec) {
          // if isdelete, stop watcher
          // if is add, start watcher
          // if change, conditional restart watcher
          try {
            let pubspecFileUri = vscode.Uri.file(path.join(uri.fsPath, file));
            let pubspecFile = pubspecFileUri.path;
            let key = pubspecFileUri.fsPath;

            let curFlutterAndFlrConfigsMd5 = this.generateFlutterAndFlrConfigsMd5(
              pubspecFile
            );
            let lastFlutterAndFlrConfigsMd5 = this.flutterAndFlrConfigsMd5Map.get(
              key
            );

            // flutterConfig 和 flrConfig 有变化时，才执行generate操作，否则只执行格式化pubspec.yaml的操作
            if (curFlutterAndFlrConfigsMd5 === lastFlutterAndFlrConfigsMd5) {
              // 比较 pubsepcFile有没变化，有的话，就进行格式化
              let curPubspecFileMd5 = this.generatePubspecFileMd5(pubspecFile);
              let lastPubspecFileMd5 = this.pubspecFileMd5Map.get(key);
              if (
                curPubspecFileMd5 !== lastPubspecFileMd5 &&
                curPubspecFileMd5 !== undefined
              ) {
                this.pubspecFileMd5Map.set(key, curPubspecFileMd5);
                FlrFileUtil.formatPubspecFile(pubspecFileUri.path);
              }
              return;
            }

            if (curFlutterAndFlrConfigsMd5) {
              this.flutterAndFlrConfigsMd5Map.set(
                key,
                curFlutterAndFlrConfigsMd5
              );
            }
          } catch (_) { }
          if (event === "change") {
            // compare md5 before and after, stop looping
            this.toggleMonitor(true);
          } else {
            flrPathMan.FolderManager.getAllPubspecFiles().then((result) => {
              this.toggleMonitor(result.length > 0);
            });
          }
          this.refresh();
        } else {
          let isAssetsResourceDirDirty =
            this.assetsRelativeResourceDirs.filter(
              (path) => file.lastIndexOf(path, 0) === 0
            ).length > 0;

          let isFontsResourceDirDirty =
            this.fontsRelativeResourceDirs.filter(
              (path) => file.lastIndexOf(path, 0) === 0
            ).length > 0;

          let isDirty = isAssetsResourceDirDirty || isFontsResourceDirDirty;
          if (isDirty) {
            this.invokeFlrGenerateCmd();
          }
        }
      }
    );
  }

  refreshGeneratedResource(silent: boolean = true) {
    let raw = utils.firstWorkSpace();
    if (raw === undefined) {
      return;
    }
    this.refreshMonitorPath();
    this.invokeFlrGenerateCmd(silent);
  }

  private invokeFlrGenerateCmd(silent: boolean = true) {
    FlrCommand.generateAll(silent);
  }

  private openResource(resource: vscode.Uri) {
    vscode.window.showTextDocument(resource);
  }

  private refreshMonitorPath() {
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

    // 获取主工程和其所有子工程，然后读取所有工程的pubspec.yaml，获得需要监控的资源目录

    // 处理主工程
    let resourceDirResultTuple = FlrFileUtil.getFlrRelativeResourceDirs(
      flutterMainProjectRootDir
    );
    let assetsRelativeResourceSubDirs: string[] = resourceDirResultTuple[0];
    let fontsRelativeResourceSubDirs: string[] = resourceDirResultTuple[1];
    assetsRelativeResourceSubDirs.forEach((dir) => {
      this.assetsRelativeResourceDirs.push(dir);
    });
    fontsRelativeResourceSubDirs.forEach((dir) => {
      this.fontsRelativeResourceDirs.push(dir);
    });

    // 处理子工程
    let flutterSubProjectRootDirArray = FlrFileUtil.getFlutterSubProjectRootDirs(
      flutterMainProjectRootDir
    );
    flutterSubProjectRootDirArray.forEach((flutterProjectRootDir) => {
      let resourceDirResultTuple = FlrFileUtil.getFlrRelativeResourceDirs(
        flutterProjectRootDir
      );
      let assetsRelativeResourceSubDirs: string[] = resourceDirResultTuple[0];
      let fontsRelativeResourceSubDirs: string[] = resourceDirResultTuple[1];

      assetsRelativeResourceSubDirs.forEach((relativeDirInSubProject) => {
        let subProjectRootDirName = path.basename(flutterProjectRootDir);
        let relativeDirInMainProject =
          subProjectRootDirName + "/" + relativeDirInSubProject;
        this.assetsRelativeResourceDirs.push(relativeDirInMainProject);
      });

      fontsRelativeResourceSubDirs.forEach((relativeDirInSubProject) => {
        let subProjectRootDirName = path.basename(flutterProjectRootDir);
        let relativeDirInMainProject =
          subProjectRootDirName + "/" + relativeDirInSubProject;
        this.fontsRelativeResourceDirs.push(relativeDirInMainProject);
      });
    });
  }

  private generatePubspecFileMd5(filePath: string): string | undefined {
    let fileBasename = path.basename(filePath);
    if (fileBasename !== utils.Names.pubspec) {
      return undefined;
    }

    try {
      let fileContents = fs.readFileSync(filePath, "utf8");
      let fileMD5 = md5(fileContents);
      return fileMD5;
    } catch (_) { }

    return undefined;
  }

  private generateFlutterAndFlrConfigsMd5(
    filePath: string
  ): string | undefined {
    let fileBasename = path.basename(filePath);
    if (fileBasename !== utils.Names.pubspec) {
      return undefined;
    }

    try {
      let pubspecConfig = FlrFileUtil.loadPubspecConfigFromFile(filePath);
      var flutterConfigJson = "{}";
      var flrConfigJson = "{}";

      let flutterConfig = pubspecConfig.get("flutter");
      if (flutterConfig !== undefined && flutterConfig !== null && yaml.isMap(flutterConfig)) {
        flutterConfigJson = flutterConfig.toString();
      }

      let flrConfig = pubspecConfig.get("flr");
      if (flrConfig !== undefined && flrConfig !== null && yaml.isMap(flrConfig)) {
        flrConfigJson = flrConfig.toString();
      }

      let fileContents = `${flutterConfigJson}\n${flrConfigJson}`;
      let fileMD5 = md5(fileContents);
      return fileMD5;
    } catch (_) { }

    return undefined;
  }

  private updateMD5For(file: string) {
    let fileBasename = path.basename(file);
    if (fileBasename === utils.Names.pubspec) {
      try {
        let pubspecFileUri = vscode.Uri.file(file);
        let pubspecFile = pubspecFileUri.path;
        let key = pubspecFileUri.fsPath;

        let curPubspecFileMd5 = this.generatePubspecFileMd5(pubspecFile);
        let lastPubspecFileMd5 = this.pubspecFileMd5Map.get(key);
        if (
          curPubspecFileMd5 !== lastPubspecFileMd5 &&
          curPubspecFileMd5 !== undefined
        ) {
          this.pubspecFileMd5Map.set(key, curPubspecFileMd5);
        }

        let curFlutterAndFlrConfigsMd5 = this.generateFlutterAndFlrConfigsMd5(
          pubspecFile
        );
        let lastFlutterAndFlrConfigsMd5 = this.flutterAndFlrConfigsMd5Map.get(
          key
        );
        if (
          curFlutterAndFlrConfigsMd5 !== lastFlutterAndFlrConfigsMd5 &&
          curFlutterAndFlrConfigsMd5 !== undefined
        ) {
          this.flutterAndFlrConfigsMd5Map.set(key, curFlutterAndFlrConfigsMd5);
        }
      } catch (_) { }
    }
  }

  readMD5OfPubspecInFolder() {
    let flutterMainProjectRootDir = FlrFileUtil.getFlutterMainProjectRootDir();
    if (flutterMainProjectRootDir === undefined) {
      return;
    }
    let flutterSubProjectRootDirArray = FlrFileUtil.getFlutterSubProjectRootDirs(
      flutterMainProjectRootDir
    );
    flutterSubProjectRootDirArray.forEach((flutterProjectRootDir) => {
      let file = FlrFileUtil.getPubspecFilePath(flutterProjectRootDir);
      this.updateMD5For(file);
    });

    let raw = utils.firstWorkSpace();
    if (raw === undefined) {
      return;
    }
    let uri = raw!;
    fs.readdir(uri.fsPath, (err, files) => {
      files.forEach((file) => {
        let f = path.join(uri.fsPath, file);
        this.updateMD5For(f);
      });
    });
  }

  toggleMonitor(toValue: boolean) {
    utils.switchControl(utils.ControlFlags.isMonitorEnabled, toValue);

    if (toValue) {
      this.refreshGeneratedResource();
    } else {
      // disabled
      // stop all watcher
      this.assetsRelativeResourceDirs = new Array();
      this.fontsRelativeResourceDirs = new Array();
    }
    this.refresh();
  }
}

export class FileSystemProvider
  implements vscode.TreeDataProvider<flrPathMan.Entry> {
  constructor(
    private filter: (para: string) => boolean = () => {
      return true;
    }
  ) { }
  // tree data provider

  async getChildren(element?: flrPathMan.Entry): Promise<flrPathMan.Entry[]> {
    // if (element) {
    //   const children = await flrPathMan.FolderManager.readDirectory(
    //     element.uri
    //   );
    //   return children.map(([name, type]) => ({
    //     uri: vscode.Uri.file(path.join(element.uri.fsPath, name)),
    //     type,
    //   }));
    // }

    // 显示所有的pubspec.yaml
    let flutterMainProjectRootDir = FlrFileUtil.getFlutterMainProjectRootDir();
    if (flutterMainProjectRootDir === undefined) {
      return [];
    }

    let ret = await flrPathMan.FolderManager.getAllPubspecFiles();
    var flrEntries: any[] = [];
    ret.map(([file, type]) => {
      let fileBasename = path.basename(file);
      let fileDir = path.dirname(file);
      let fileDirname = path.basename(fileDir);
      let flutterMainProjectRootDirname = path.basename(
        flutterMainProjectRootDir!
      );
      var label = fileBasename;
      if (
        fileDirname !== undefined &&
        fileDirname !== flutterMainProjectRootDirname
      ) {
        label = fileDirname + "/" + fileBasename;
      }
      let entry = {
        uri: vscode.Uri.file(file),
        label: label,
        type,
      };
      flrEntries.push(entry);
    });
    flrEntries.sort((a: flrPathMan.Entry, b: flrPathMan.Entry) => {
      return a.label.length - b.label.length;
    });
    return flrEntries;
  }

  getTreeItem(element: flrPathMan.Entry): vscode.TreeItem {
    const treeItem = new vscode.TreeItem(
      element.uri,
      element.type === vscode.FileType.Directory
        ? vscode.TreeItemCollapsibleState.Collapsed
        : vscode.TreeItemCollapsibleState.None
    );
    if (element.type === vscode.FileType.File) {
      treeItem.command = {
        command: utils.Commands.openFile,
        title: "Open File",
        arguments: [element.uri],
      };
      treeItem.contextValue = "file";
      treeItem.label = element.label;
    }
    return treeItem;
  }
}
