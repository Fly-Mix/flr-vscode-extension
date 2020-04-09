import * as vscode from "vscode";

var exec = require("child_process").exec;
export async function execute(command: string): Promise<string> {
  return new Promise<string>((fulfill, reject) => {
    exec(command, function (err: any, stdout: string, _: any) {
      if (err !== null) {
        reject(err);
      } else {
        fulfill(stdout);
      }
    });
  });
}

export enum Names {
  generatedFileName = "r.g.dart",
  flr = "flr",
  pubspec = "pubspec.yaml",
  settings = "settings.json",
}

export enum Commands {
  init = "flr.init",
  openFile = "flr.openFile",
  refresh = "flr.regenerated",
  startMonotor = "flr.startMonitor",
  stopMonitor = "flr.stopMonitor",
}

export enum ControlFlags {
  isPubspecYamlExist = "isPubspecYamlExist",
  isMonitorEnabled = "isMonitorEnabled",
}

export function switchControl(flag: ControlFlags, toValue: boolean): void {
  vscode.commands.executeCommand("setContext", flag, toValue);
}

export function registerCommandNice(
  context: vscode.ExtensionContext,
  commandId: string,
  run: (...args: any[]) => void
): void {
  context.subscriptions.push(vscode.commands.registerCommand(commandId, run));
}

export function firstWorkSpace(): vscode.Uri | undefined {
  let folders = vscode.workspace.workspaceFolders;
  if (folders && folders.length > 0) {
    return folders[0].uri;
  }
  return undefined;
}

export function distictArray<T>(value: Array<T>): Array<T> {
  return value.filter((n, i) => value.indexOf(n) === i);
}
