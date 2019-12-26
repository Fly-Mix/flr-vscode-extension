import * as vscode from "vscode";
import * as fs from "fs";
import * as path from "path";
import { FileExplorer } from "./flr-view-data-provider";
import * as utils from "./utils";
import * as yaml from "js-yaml";

export function activate(context: vscode.ExtensionContext) {
  var fp: FileExplorer | undefined;

  let filename = utils.Names.flrfile;

  function checkFlrFile(): Promise<boolean> {
    return new Promise<boolean>((success, failure) => {
      let folders = vscode.workspace.workspaceFolders;
      if (folders) {
        let root = folders[0].uri.fsPath;
        fs.readdir(root, (_, files) => {
          const result = files.filter(file => file === filename);
          let hasFlr = result.length > 0;
          if (hasFlr) {
            let flrFile = path.join(root, result[0]);
            fp?.toggleMonitor(true, vscode.Uri.file(flrFile));
          }
          success(hasFlr);
        });
      } else {
        success(false);
      }
    });
  }
  // make FLR show in Explorer Section
  utils.switchControl(utils.ControlFlags.isPubspecYamlExist, true);

  utils.registerCommandNice(context, utils.Commands.init, () => {
    checkFlrFile().then(result => {
      if (result === true) {
        vscode.window.showInformationMessage("Already has Flrfile.yaml file");
        return;
      }
      let workSpace = utils.firstWorkSpace();
      if (workSpace) {
        // cerate Flrfile.yaml
        let root = workSpace.fsPath;
        let storePath = path.join(root, filename);
        fs.writeFile(storePath, utils.Template.flrfileTemplate, () => {
          fp?.toggleMonitor(true, vscode.Uri.file(storePath));
          vscode.window.showInformationMessage(
            `Create Flrfile.yaml at ${storePath}`
          );
        });

        // add r_dart_library dependency for pubspec
        try {
          let pubspec = path.join(root, utils.Names.pubspec);
          let fileContents = fs.readFileSync(pubspec, "utf8");
          var data = yaml.safeLoad(fileContents);
          var dependencies = data["dependencies"];
          var git: { [value: string]: string } = {};
          // TODO: update version conditional via environment sdk version
          git["url"] = "https://github.com/YK-Unit/r_dart_library.git";
          git["ref"] = "develop";
          var r_dart_library: { [value: string]: Object } = {};
          r_dart_library["git"] = git;
          dependencies["r_dart_library"] = r_dart_library;
          data["dependencies"] = dependencies;
          fs.writeFileSync(pubspec, yaml.safeDump(data));
        } catch (e) {
          vscode.window.showErrorMessage(e);
        }
      }
    });
  });
  fp = new FileExplorer(context);
  checkFlrFile();
}
