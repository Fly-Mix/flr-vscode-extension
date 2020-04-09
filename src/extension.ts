import * as vscode from "vscode";
import * as fs from "fs";
import * as path from "path";
import { FileExplorer } from "./flr-view-data-provider";
import * as utils from "./utils";
import * as FlrConstant from "./FlrConstant";
import { FlrFileUtil } from "./util/FlrFileUtil";
import * as yaml from "js-yaml";
import { FlrCommand } from "./FlrCommand";

export function activate(context: vscode.ExtensionContext) {
  var fp: FileExplorer | undefined;

  let filename = utils.Names.pubspec;

  function checkFlrFile(): Promise<boolean> {
    return new Promise<boolean>((success, failure) => {
      let flutterProjectRootDir = FlrFileUtil.getCurFlutterProjectRootDir();
      let pubspecFile = FlrFileUtil.getPubspecFilePath();
      if (flutterProjectRootDir && pubspecFile) {
        let pubspecConfig = FlrFileUtil.loadPubspecConfigFromFile(pubspecFile);

        if (pubspecConfig.hasOwnProperty("flr")) {
          let flrConfig = pubspecConfig["flr"];

          let assets = flrConfig["assets"] as [string];
          let fonts = flrConfig["fonts"] as [string];
          var legalResourceDirCount = 0;

          // TODO: 从assets和fonts的配置中筛选合法的资源目录
          if (assets !== undefined && assets.length > 0) {
            legalResourceDirCount += assets.length;
          }
          if (fonts !== undefined && fonts.length > 0) {
            legalResourceDirCount += fonts.length;
          }

          if (legalResourceDirCount > 0) {
            fp?.toggleMonitor(true, vscode.Uri.file(pubspecFile));
          }
        }
      } else {
        success(false);
      }
    });
  }
  // make FLR show in Explorer Section
  utils.switchControl(utils.ControlFlags.isPubspecYamlExist, true);
  utils.registerCommandNice(context, utils.Commands.refresh, () => {
    fp?.refreshGeneratedResource();
  });
  utils.registerCommandNice(context, utils.Commands.init, async () => {
    FlrCommand.init();
  });
  fp = new FileExplorer(context);
  checkFlrFile();
}
