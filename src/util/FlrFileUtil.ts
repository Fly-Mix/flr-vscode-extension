import * as vscode from "vscode";
import * as path from "path";
import * as glob from "glob";
import * as fs from "fs";
import * as yaml from "js-yaml";
import * as FlrConstant from "../FlrConstant";

export class FlrFileUtil {
  /*
   * 获取当前flutter工程的根目录
   */
  public static getCurFlutterProjectRootDir(): string | undefined {
    let folders = vscode.workspace.workspaceFolders;
    if (folders) {
      let root = folders[0].uri.fsPath;
      return root;
    }
    return undefined;
  }

  /*
   *  获取当前flutter工程的pubspec.yaml文件的路径
   */
  public static getPubspecFilePath(flutterProjectDir: string): string {
    let filePath = flutterProjectDir + "/pubspec.yaml";
    return filePath;
  }

  public static loadPubspecConfigFromFile(pubspecFile: string): any {
    let fileContents = fs.readFileSync(pubspecFile, "utf8");
    let pubspecConfig = yaml.safeLoad(fileContents);
    return pubspecConfig;
  }

  public static dumpPubspecConfigToFile(
    pubspecConfig: any,
    pubspecFile: string
  ) {
    try {
      fs.writeFileSync(
        pubspecFile,
        yaml.dump(pubspecConfig, {
          indent: 2,
          noArrayIndent: true,
          lineWidth: Infinity,
        }),
        "utf8"
      );
    } catch (e) {
      console.log(e);
    }
  }

  /*
   * 判断当前资源文件是否合法
   *
   * 判断资源文件合法的标准是：
   * 其file_basename_no_extension 由字母（a-z、A-Z）、数字（0-9）、其他合法字符（'_', '+', '-', '.', '·', '!', '@', '&', '$', '￥'）组成
   *
   * */
  public static isLegalResourceFile(file: string): boolean {
    let fileBasenameWithoutExtension = path.parse(file).name;
    let regex = /^[a-zA-Z0-9_\+\-\.·!@&$￥]+$/;
    return regex.test(fileBasenameWithoutExtension);
  }

  public static isNonSvgImageResourceFile(file: string): boolean {
    let fileExtName = path.extname(file).toLowerCase();
    return FlrConstant.NON_SVG_IMAGE_FILE_TYPES.includes(fileExtName);
  }

  public static isSvgImageResourceFile(file: string): boolean {
    let fileExtName = path.extname(file).toLowerCase();
    return FlrConstant.SVG_IMAGE_FILE_TYPES.includes(fileExtName);
  }

  public static isImageResourceFile(file: string): boolean {
    let fileExtName = path.extname(file).toLowerCase();
    return FlrConstant.IMAGE_FILE_TYPES.includes(fileExtName);
  }

  public static isTextResourceFile(file: string): boolean {
    let fileExtName = path.extname(file).toLowerCase();
    return FlrConstant.TEXT_FILE_TYPES.includes(fileExtName);
  }

  public static isFontResourceFile(file: string): boolean {
    let fileExtName = path.extname(file).toLowerCase();
    return FlrConstant.FONT_FILE_TYPES.includes(fileExtName);
  }

  /*
   * 扫描指定的资源目录和其所有层级的子目录，查找所有图片文件
   * 返回文本文件结果二元组 imageFileResultTuple
   * imageFileResultTuple = [legalImageFileArray, illegalImageFileArray]
   *
   * 判断资源文件合法的标准参考：isLegalResourceFile 方法
   *
   * === Examples
   * resourceDir = "~/path/to/flutter_project/lib/assets/images"
   * legalImageFileArray = ["~/path/to/flutter_project/lib/assets/images/test.png", "~/path/to/flutter_project/lib/assets/images/2.0x/test.png"]
   * illegalImageFileArray = ["~/path/to/flutter_project/lib/assets/images/~.png"]
   * */
  public static findImageFiles(resourceDir: string): [string[], string[]] {
    var legalImageFileArray: string[] = new Array();
    var illegalImageFileArray: string[] = new Array();

    let patternFileTypes = FlrConstant.IMAGE_FILE_TYPES.join(",");
    // example: path/to/dir/**/*{.png,.jpg}
    let regx = `${resourceDir}/**/*{${patternFileTypes}}`;
    let files = glob.sync(regx);
    files.forEach((file) => {
      if (this.isLegalResourceFile(file)) {
        legalImageFileArray.push(file);
      } else {
        illegalImageFileArray.push(file);
      }
    });

    return [legalImageFileArray, illegalImageFileArray];
  }

  /*
   * 扫描指定的资源目录和其所有层级的子目录，查找所有文本文件
   * 返回图片文件结果二元组 textFileResultTuple
   * textFileResultTuple = [legalTextFileArray, illegalTextFileArray]
   *
   * 判断资源文件合法的标准参考：isLegalResourceFile 方法
   *
   * === Examples
   * resourceDir = "~/path/to/flutter_project/lib/assets/jsons"
   * legalTextFileArray = ["~/path/to/flutter_project/lib/assets/jsons/city.json", "~/path/to/flutter_project/lib/assets/jsons/mock/city.json"]
   * illegalTextFileArray = ["~/path/to/flutter_project/lib/assets/jsons/~.json"]
   * */
  public static findTextFiles(resourceDir: string): [string[], string[]] {
    var legalTextFileArray: string[] = new Array();
    var illegalTextFileArray: string[] = new Array();

    let patternFileTypes = FlrConstant.TEXT_FILE_TYPES.join(",");
    // example: path/to/dir/**/*{.png,.jpg}
    let regx = `${resourceDir}/**/*{${patternFileTypes}}`;
    let files = glob.sync(regx);

    files.forEach((file) => {
      if (this.isLegalResourceFile(file)) {
        legalTextFileArray.push(file);
      } else {
        illegalTextFileArray.push(file);
      }
    });

    return [legalTextFileArray, illegalTextFileArray];
  }

  /*
   * 扫描指定的资源目录，返回其所有第一级子目录
   *
   * === Examples
   * resourceDir = "~/path/to/flutter_project/lib/assets/fonts"
   * TopChildDirs = ["~/path/to/flutter_project/lib/assets/fonts/Amiri", "~/path/to/flutter_project/lib/assets/fonts/Open_Sans"]
   * */
  public static findTopChildDirs(resourceDir: string): string[] {
    var resourceDirFileArray: string[] = new Array();

    let patternFileTypes = FlrConstant.TEXT_FILE_TYPES.join(",");
    let regx = `${resourceDir}/*`;
    let files = glob.sync(regx);

    files.forEach((file) => {
      if (fs.statSync(file).isDirectory) {
        resourceDirFileArray.push(file);
      }
    });

    return resourceDirFileArray;
  }

  /*
   * 扫描指定的字体家族目录和其所有层级的子目录，查找所有字体文件
   * 返回字体文件结果二元组 fontFileResultTuple
   * textFileResultTuple = [legalFontFileArray, illegalFontFileArray]
   *
   * 判断资源文件合法的标准参考：isLegalResourceFile 方法
   *
   * === Examples
   * fontFamilyDirFile = "~/path/to/flutter_project/lib/assets/fonts/Amiri"
   * legalFontFileArray = ["~/path/to/flutter_project/lib/assets/fonts/Amiri/Amiri-Regular.ttf"]
   * illegalFontFileArray = ["~/path/to/flutter_project/lib/assets/fonts/Amiri/~.ttf"]
   * */
  public static findFontFilesInFontFamilyDir(
    fontFamilyDir: string
  ): [string[], string[]] {
    var legalFontFileArray: string[] = new Array();
    var illegalFontFileArray: string[] = new Array();

    let patternFileTypes = FlrConstant.FONT_FILE_TYPES.join(",");
    // example: path/to/dir/**/*{.png,.jpg}
    let regx = `${fontFamilyDir}/**/*{${patternFileTypes}}`;
    let files = glob.sync(regx);

    files.forEach((file) => {
      if (this.isLegalResourceFile(file)) {
        legalFontFileArray.push(file);
      } else {
        illegalFontFileArray.push(file);
      }
    });

    return [legalFontFileArray, illegalFontFileArray];
  }
}
