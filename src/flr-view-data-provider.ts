import * as vscode from "vscode";
import * as path from "path";
import * as fs from "fs";
import * as utils from "./utils";
import * as yaml from "js-yaml";
import * as flrPathMan from "./folder-manager";
import * as md5 from "md5";
import { FlrFileUtil } from "./util/FlrFileUtil";
import { FlrCommand } from "./FlrCommand";

export class FileExplorer {
  private fileExplorer: vscode.TreeView<flrPathMan.Entry>;
  private assetsRelativeResourceDirs: string[];
  private fontsRelativeResourceDirs: string[];
  private fileMD5: string = "";

  constructor(context: vscode.ExtensionContext) {
    const treeDataProvider = new FileSystemProvider((name) => {
      // only show flrfile
      return name === utils.Names.pubspec;
    });
    // TODO: 显式所有pubspec.yaml @林肯
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
        this.toggleMonitor(false, resource.uri);
      }
    );
    utils.registerCommandNice(
      context,
      utils.Commands.startMonotor,
      (resource) => {
        this.toggleMonitor(true, resource.uri);
      }
    );

    this.startWatching();
  }

  private refresh() {
    const treeDataProvider = new FileSystemProvider((name) => {
      return name === utils.Names.pubspec;
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
    // TODO: 监控所有pubspec.yaml的更改 @林肯
    let flrUri = vscode.Uri.file(path.join(uri.fsPath, utils.Names.pubspec));
    const watcher = fs.watch(
      uri.fsPath,
      { recursive: true },
      async (event: string, filename: string | Buffer) => {
        if (filename === utils.Names.pubspec) {
          // if isdelete, stop watcher
          // if is add, start watcher
          // if change, conditional restart watcher
          try {
            let fileContents = fs.readFileSync(flrUri.fsPath, "utf8");
            let currentMD5 = md5(fileContents);
            if (currentMD5 === this.fileMD5) {
              return;
            }
            this.fileMD5 = currentMD5;
          } catch (_) {}
          if (event === "change") {
            // compare md5 before and after, stop looping
            this.toggleMonitor(true, flrUri);
          } else {
            flrPathMan.FolderManager.getPubspec().then((result) => {
              this.toggleMonitor(result.length > 0, flrUri);
            });
          }
          this.refresh();
        } else {
          let isAssetsResourceDirDirty =
            this.assetsRelativeResourceDirs.filter(
              (path) => filename.lastIndexOf(path, 0) === 0
            ).length > 0;

          let isFontsResourceDirDirty =
            this.fontsRelativeResourceDirs.filter(
              (path) => filename.lastIndexOf(path, 0) === 0
            ).length > 0;

          let isDirty = isAssetsResourceDirDirty || isFontsResourceDirDirty;
          if (isDirty) {
            this.invokeFlrGenerateCmd();
          }
        }
      }
    );
  }

  refreshGeneratedResource() {
    let raw = utils.firstWorkSpace();
    if (raw === undefined) {
      return;
    }
    let uri = raw!;
    let pubspec = path.join(uri.fsPath, utils.Names.pubspec);
    this.refreshMonitorPath();
    this.invokeFlrGenerateCmd();
  }

  private invokeFlrGenerateCmd() {
    FlrCommand.generateAll();
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

  toggleMonitor(toValue: boolean, resource: vscode.Uri) {
    utils.switchControl(utils.ControlFlags.isMonitorEnabled, toValue);

    if (toValue) {
      this.refreshMonitorPath();
    } else {
      // disabled
      // stop all watcher
      this.assetsRelativeResourceDirs = new Array();
      this.fontsRelativeResourceDirs = new Array();
    }
    this.refresh();
    this.refreshGeneratedResource();
  }
}

export class FileSystemProvider
  implements vscode.TreeDataProvider<flrPathMan.Entry> {
  constructor(
    private filter: (para: string) => boolean = () => {
      return true;
    }
  ) {}
  // tree data provider

  async getChildren(element?: flrPathMan.Entry): Promise<flrPathMan.Entry[]> {
    if (element) {
      const children = await flrPathMan.FolderManager.readDirectory(
        element.uri
      );
      return children.map(([name, type]) => ({
        uri: vscode.Uri.file(path.join(element.uri.fsPath, name)),
        type,
      }));
    }

    const workspaceFolder = vscode.workspace.workspaceFolders?.filter(
      (folder) => folder.uri.scheme === "file"
    )[0];
    if (workspaceFolder) {
      let ret = await flrPathMan.FolderManager.getPubspec();
      return ret.map(([name, type]) => ({
        uri: vscode.Uri.file(path.join(workspaceFolder.uri.fsPath, name)),
        type,
      }));
    }

    return [];
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
    }
    return treeItem;
  }
}
