import * as vscode from "vscode";
import * as fs from "fs";
import * as path from "path";
import { FileExplorer } from "./flr-view-data-provider";
import * as utils from "./utils";
import * as FlrConstant from "./FlrConstant";
import { FlrFileUtil } from "./util/FlrFileUtil";
import * as yaml from "yaml";
import { FlrCommand } from "./FlrCommand";

export function activate(context: vscode.ExtensionContext) {
  var fp: FileExplorer | undefined;

  function checkIsFlutterProject(): Promise<boolean> {
    return new Promise<boolean>((success, failure) => {
      let flutterProjectRootDir = FlrFileUtil.getFlutterMainProjectRootDir();
      if (flutterProjectRootDir === undefined) {
        success(false);
        return;
      }

      let pubspecFile = FlrFileUtil.getPubspecFilePath(flutterProjectRootDir);
      if (fs.existsSync(pubspecFile) === false) {
        success(false);
        return;
      }
      fp?.readMD5OfPubspecInFolder();
      fp?.toggleMonitor(true);
    });
  }
  // make FLR show in Explorer Section
  utils.switchControl(utils.ControlFlags.isPubspecYamlExist, true);
  utils.registerCommandNice(context, utils.Commands.refresh, () => {
    fp?.refreshGeneratedResource(false);
  });
  utils.registerCommandNice(context, utils.Commands.init, async () => {
    FlrCommand.initAll();
  });
  fp = new FileExplorer(context);
  checkIsFlutterProject();
}
