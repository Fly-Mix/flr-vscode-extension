import * as vscode from "vscode";
import * as fs from "fs";
import * as path from "path";
import { FileExplorer } from "./flr-view-data-provider";
import * as utils from "./utils";
import * as FlrConstant from "./FlrConstant";
import { FlrFileUtil } from "./util/FlrFileUtil";
import * as yaml from "js-yaml";

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
    let flutterProjectRootDir = FlrFileUtil.getCurFlutterProjectRootDir();
    let pubspecFile = FlrFileUtil.getPubspecFilePath();
    if (flutterProjectRootDir && pubspecFile) {
      var pubspecConfig = FlrFileUtil.loadPubspecConfigFromFile(pubspecFile);

      var flrDartfmtLineLength = FlrConstant.DARTFMT_LINE_LENGTH;
      var flrAssets = [];
      var flrFonts = [];
      if (pubspecConfig.hasOwnProperty("flr")) {
        vscode.window.showInformationMessage(`Already had flr config`);
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
      let str = await utils.execute("flutter --version");
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
    }
  });
  fp = new FileExplorer(context);
  checkFlrFile();
}
