import * as vscode from "vscode";
import * as fs from "fs";
import * as path from "path";
import { FileExplorer } from "./flr-view-data-provider";
import * as utils from "./utils";
import * as yaml from "js-yaml";

let version = "0.2.0";

export function activate(context: vscode.ExtensionContext) {
  var fp: FileExplorer | undefined;

  let filename = utils.Names.pubspec;

  function checkFlrFile(): Promise<boolean> {
    return new Promise<boolean>((success, failure) => {
      let folders = vscode.workspace.workspaceFolders;
      if (folders) {
        let root = folders[0].uri.fsPath;
        let pubspec = path.join(root, utils.Names.pubspec);
        let fileContents = fs.readFileSync(pubspec, "utf8");
        let data = yaml.safeLoad(fileContents);
        let flr = data["flr"];
        if (flr !== undefined) {
          let assets = flr["assets"] as [string];
          if (assets !== undefined && assets.length > 0) {
            fp?.toggleMonitor(true, vscode.Uri.file(pubspec));
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
    let workSpace = utils.firstWorkSpace();
    if (workSpace) {
      // cerate Flrfile.yaml
      let root = workSpace.fsPath;

      // add r_dart_library dependency for pubspec
      try {
        let pubspec = path.join(root, utils.Names.pubspec);
        let fileContents = fs.readFileSync(pubspec, "utf8");
        var data = yaml.safeLoad(fileContents);

        // let flutter = data["flutter"];
        // if (flutter === undefined || flutter === null) {
        //   data["flutter"] = new Map();
        // }

        // check if has already init
        // check version
        var flr = data["flr"] ?? new Map();
        let ver = flr["version"] as string;
        if (ver !== undefined) {
          if (ver !== version) {
            vscode.window.showInformationMessage(
              `Already had version: ${ver}, flr current version: ${version}`
            );
            return;
          } else {
            return;
          }
        }
        let assets = flr["assets"] as [string];
        if (assets === undefined) {
          flr["assets"] = ["lib/assets"];
        }

        flr["version"] = version;
        data["flr"] = flr;

        var ref = "0.1.0";
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
              ref = "develop";
            }
          }
        }

        var dependencies = data["dependencies"];
        let git = {
          url: "https://github.com/YK-Unit/r_dart_library.git",
          ref: ref
        };

        // TODO: update version conditional via environment sdk version

        let r_dart_library = {
          git: git
        };
        dependencies["r_dart_library"] = r_dart_library;
        data["dependencies"] = dependencies;
        let content = yaml.safeDump(JSON.parse(JSON.stringify(data)));
        fs.writeFileSync(pubspec, content);
      } catch (_) {}
    }
  });
  fp = new FileExplorer(context);
  checkFlrFile();
}
