import * as vscode from "vscode";
import * as path from "path";
import * as fs from "fs";
import * as utils from "./utils";
import * as yaml from "js-yaml";
import { ResourceGenerator } from "./resource-generator";
import * as flrPathMan from "./folder-manager";

export class FileExplorer {
  private fileExplorer: vscode.TreeView<flrPathMan.Entry>;
  private registeredWatchPaths: string[];

  constructor(context: vscode.ExtensionContext) {
    const treeDataProvider = new FileSystemProvider(name => {
      // only show flrfile
      return name === utils.Names.flrfile;
    });
    this.fileExplorer = vscode.window.createTreeView(utils.Names.flr, {
      treeDataProvider
    });

    this.registeredWatchPaths = new Array();

    utils.registerCommandNice(context, utils.Commands.openFile, resource =>
      this.openResource(resource)
    );
    utils.registerCommandNice(context, utils.Commands.refresh, _ =>
      this.refresh()
    );
    utils.registerCommandNice(context, utils.Commands.stopMonitor, resource => {
      this.toggleMonitor(false, resource.uri);
    });
    utils.registerCommandNice(
      context,
      utils.Commands.startMonotor,
      resource => {
        this.toggleMonitor(true, resource.uri);
      }
    );

    this.startWatching();
  }

  private refresh() {
    const treeDataProvider = new FileSystemProvider(name => {
      return name === utils.Names.flrfile;
    });
    this.fileExplorer = vscode.window.createTreeView(utils.Names.flr, {
      treeDataProvider
    });
  }

  /// watching current workspace file change to reload FLR
  private startWatching() {
    this.registeredWatchPaths = new Array();
    let uri = vscode.workspace.workspaceFolders![0].uri;
    let flrUri = vscode.Uri.file(path.join(uri.fsPath, utils.Names.flrfile));
    const watcher = fs.watch(
      uri.fsPath,
      { recursive: true },
      async (event: string, filename: string | Buffer) => {
        if (filename === utils.Names.flrfile) {
          // if isdelete, stop watcher
          // if is add, start watcher
          // if change, restart watcher
          if (event === "change") {
            // update
            this.toggleMonitor(true, flrUri);
          } else {
            flrPathMan.FolderManager.getFlrfile().then(result => {
              this.toggleMonitor(result.length > 0, flrUri);
            });
          }
          this.refresh();
        } else {
          let isDirty =
            this.registeredWatchPaths.filter(path => filename.includes(path))
              .length > 0;
          if (isDirty) {
            ResourceGenerator.generateRFile(uri, this.registeredWatchPaths);
          }
        }
      }
    );
  }

  private openResource(resource: vscode.Uri) {
    vscode.window.showTextDocument(resource);
  }

  toggleMonitor(toValue: boolean, resource: vscode.Uri) {
    utils.switchControl(utils.ControlFlags.isMonitorEnabled, toValue);

    if (toValue) {
      // enabled
      // read Flrfile.yaml
      // get folder that needed to be watched
      // watch change and update pubspec.yaml, generate R.dart
      try {
        let fileContents = fs.readFileSync(resource.path, "utf8");
        let data = yaml.safeLoad(fileContents);
        let assets = data["assets"];
        let images = assets["images"];
        let texts = assets["texts"];
        if (images !== null) {
          const vals = Object.values<string>(images);
          this.registeredWatchPaths = this.registeredWatchPaths.concat(vals);
        }
        if (texts !== null) {
          const vals = Object.values<string>(texts);
          this.registeredWatchPaths = this.registeredWatchPaths.concat(vals);
        }
      } catch (e) {
        vscode.window.showErrorMessage(e);
      }
    } else {
      // disabled
      // stop all watcher
      this.registeredWatchPaths = new Array();
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
  ) {}
  // tree data provider

  async getChildren(element?: flrPathMan.Entry): Promise<flrPathMan.Entry[]> {
    if (element) {
      const children = await flrPathMan.FolderManager.readDirectory(
        element.uri
      );
      return children.map(([name, type]) => ({
        uri: vscode.Uri.file(path.join(element.uri.fsPath, name)),
        type
      }));
    }

    const workspaceFolder = vscode.workspace.workspaceFolders?.filter(
      folder => folder.uri.scheme === "file"
    )[0];
    if (workspaceFolder) {
      let ret = await flrPathMan.FolderManager.getFlrfile();
      return ret.map(([name, type]) => ({
        uri: vscode.Uri.file(path.join(workspaceFolder.uri.fsPath, name)),
        type
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
        arguments: [element.uri]
      };
      treeItem.contextValue = "file";
    }
    return treeItem;
  }
}
