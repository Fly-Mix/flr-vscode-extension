import * as vscode from "vscode";
import * as path from "path";
import * as fs from "fs";
import * as mkdirp from "mkdirp";
import * as rimraf from "rimraf";
import * as utils from "./utils";

export class FolderManager {
  // MARK: Helper
  static async getPubspec(): Promise<[string, vscode.FileType][]> {
    const workspaceFolder = vscode.workspace.workspaceFolders?.filter(
      (folder) => folder.uri.scheme === "file"
    )[0];
    if (workspaceFolder) {
      const children = await this.readDirectory(workspaceFolder.uri);
      children.sort((a, b) => {
        if (a[1] === b[1]) {
          return utils.caseInsensitiveComparator(a[0], b[0]);
        }
        return a[1] === vscode.FileType.Directory ? -1 : 1;
      });
      let ret = children.filter(([name, _]) => {
        return name.toLowerCase() === utils.Names.pubspec.toLowerCase();
      });
      return Promise.resolve(ret);
    } else {
      return Promise.reject();
    }
  }

  static readDirectory(
    uri: vscode.Uri
  ): [string, vscode.FileType][] | Thenable<[string, vscode.FileType][]> {
    return this._readDirectory(uri);
  }

  static async _readDirectory(
    uri: vscode.Uri
  ): Promise<[string, vscode.FileType][]> {
    const children = await _.readdir(uri.fsPath);

    const result: [string, vscode.FileType][] = [];
    for (let i = 0; i < children.length; i++) {
      const child = children[i];
      const stat = await this._stat(path.join(uri.fsPath, child));
      result.push([child, stat.type]);
    }

    return Promise.resolve(result);
  }

  static stat(uri: vscode.Uri): vscode.FileStat | Thenable<vscode.FileStat> {
    return this._stat(uri.fsPath);
  }

  static async _stat(path: string): Promise<vscode.FileStat> {
    return new FileStat(await _.stat(path));
  }
}

namespace _ {
  function handleResult<T>(
    resolve: (result: T) => void,
    reject: (error: Error) => void,
    error: Error | null | undefined,
    result: T
  ): void {
    if (error) {
      reject(massageError(error));
    } else {
      resolve(result);
    }
  }

  function massageError(error: Error & { code?: string }): Error {
    if (error.code === "ENOENT") {
      return vscode.FileSystemError.FileNotFound();
    }

    if (error.code === "EISDIR") {
      return vscode.FileSystemError.FileIsADirectory();
    }

    if (error.code === "EEXIST") {
      return vscode.FileSystemError.FileExists();
    }

    if (error.code === "EPERM" || error.code === "EACCESS") {
      return vscode.FileSystemError.NoPermissions();
    }

    return error;
  }

  export function checkCancellation(token: vscode.CancellationToken): void {
    if (token.isCancellationRequested) {
      throw new Error("Operation cancelled");
    }
  }

  export function normalizeNFC(items: string): string;
  export function normalizeNFC(items: string[]): string[];
  export function normalizeNFC(items: string | string[]): string | string[] {
    if (process.platform !== "darwin") {
      return items;
    }

    if (Array.isArray(items)) {
      return items.map((item) => item.normalize("NFC"));
    }

    return items.normalize("NFC");
  }

  export function readdir(path: string): Promise<string[]> {
    return new Promise<string[]>((resolve, reject) => {
      fs.readdir(path, (error, children) =>
        handleResult(resolve, reject, error, normalizeNFC(children))
      );
    });
  }

  export function stat(path: string): Promise<fs.Stats> {
    return new Promise<fs.Stats>((resolve, reject) => {
      fs.stat(path, (error, stat) =>
        handleResult(resolve, reject, error, stat)
      );
    });
  }

  export function readfile(path: string): Promise<Buffer> {
    return new Promise<Buffer>((resolve, reject) => {
      fs.readFile(path, (error, buffer) =>
        handleResult(resolve, reject, error, buffer)
      );
    });
  }

  export function writefile(path: string, content: Buffer): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      fs.writeFile(path, content, (error) =>
        handleResult(resolve, reject, error, void 0)
      );
    });
  }

  export function exists(path: string): Promise<boolean> {
    return new Promise<boolean>((resolve, reject) => {
      fs.exists(path, (exists) => handleResult(resolve, reject, null, exists));
    });
  }

  export function rmrf(path: string): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      rimraf(path, (error) => handleResult(resolve, reject, error, void 0));
    });
  }

  export function mkdir(path: string): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      mkdirp(path, (error) => handleResult(resolve, reject, error, void 0));
    });
  }

  export function rename(oldPath: string, newPath: string): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      fs.rename(oldPath, newPath, (error) =>
        handleResult(resolve, reject, error, void 0)
      );
    });
  }

  export function unlink(path: string): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      fs.unlink(path, (error) => handleResult(resolve, reject, error, void 0));
    });
  }
}

export class FileStat implements vscode.FileStat {
  constructor(private fsStat: fs.Stats) {}

  get type(): vscode.FileType {
    return this.fsStat.isFile()
      ? vscode.FileType.File
      : this.fsStat.isDirectory()
      ? vscode.FileType.Directory
      : this.fsStat.isSymbolicLink()
      ? vscode.FileType.SymbolicLink
      : vscode.FileType.Unknown;
  }

  get isFile(): boolean | undefined {
    return this.fsStat.isFile();
  }

  get isDirectory(): boolean | undefined {
    return this.fsStat.isDirectory();
  }

  get isSymbolicLink(): boolean | undefined {
    return this.fsStat.isSymbolicLink();
  }

  get size(): number {
    return this.fsStat.size;
  }

  get ctime(): number {
    return this.fsStat.ctime.getTime();
  }

  get mtime(): number {
    return this.fsStat.mtime.getTime();
  }
}

export interface Entry {
  uri: vscode.Uri;
  type: vscode.FileType;
}
