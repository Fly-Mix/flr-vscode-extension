import * as path from "path";
import * as fs from "fs";
import { FlrFileUtil } from "./FlrFileUtil";

export class FlrAssetUtil {
  /*
   * 判断当前的资源文件是不是资产变体（asset_variant）类型*
   *
   * 判断的核心算法是：
   * - 获取资源文件的父目录；
   * - 判断父目录是否符合资产变体目录的特征
   *   资产变体映射的的资源文件要求存放在“与 main_asset 在同一个目录下的”、“符合指定特征的”子目录中；
   *   截止目前，Flutter只支持一种变体类型：倍率变体；
   *   倍率变体只适用于非SVG类图片资源；
   *   倍率变体目录特征可使用此正则来判断：“^((0\.[0-9]+)|([1-9]+[0-9]*(\.[0-9]+)?))[x]$”；
   *   倍率变体目录名称示例：“0.5x”、“1.5x”、“2.0x”、“3.0x”，“2x”、“3x”；
   *
   * */
  public static isAssetVariant(file: string): boolean {
    if (FlrFileUtil.isNonSvgImageResourceFile(file)) {
      let parentDirPath = path.dirname(file);
      let parentDirName = path.basename(parentDirPath);

      let ratioRegex = /^((0\.[0-9]+)|([1-9]+[0-9]*(\.[0-9]+)?))[x]$/;
      if (ratioRegex.test(parentDirName)) {
        return true;
      }
    }
    return false;
  }

  /*
   * 为当前资源文件生成 main_asset
   *
   * === Examples
   * flutterDir =  "~/path/to/flutter_r_demo"
   * packageName = "flutter_r_demo"
   *
   * === Example-1
   * legalResourceFile = "~/path/to/flutter_r_demo/lib/assets/images/test.png"
   * mainAsset = "packages/flutter_r_demo/assets/images/test.png"
   *
   * === Example-2
   * legalResourceFile = "~/path/to/flutter_r_demo/lib/assets/images/3.0x/test.png"
   * mainAsset = "packages/flutter_r_demo/assets/images/test.png"
   *
   * === Example-3
   * legalResourceFile = "~/path/to/flutter_r_demo/lib/assets/texts/3.0x/test.json"
   * mainAsset = "packages/flutter_r_demo/assets/texts/3.0x/test.json"
   *
   * === Example-3
   * legalResourceFile = "~/path/to/flutter_r_demo/lib/assets/fonts/Amiri/Amiri-Regular.ttf"
   * mainAsset = "packages/flutter_r_demo/fonts/Amiri/Amiri-Regular.ttf"
   *
   * */
  public static generateMainAsset(
    flutterDir: string,
    packageName: string,
    legalResourceFile: string
  ): string {
    // legalResourceFile:  ~/path/to/flutter_r_demo/lib/assets/images/3.0x/test.png
    // to get mainResourceFile:  ~/path/to/flutter_r_demo/lib/assets/images/test.png
    let mainResourceFile = legalResourceFile;
    if (this.isAssetVariant(legalResourceFile)) {
      // test.png
      let fileBasename = path.basename(legalResourceFile);
      // ~/path/to/flutter_r_demo/lib/assets/images/3.0x
      let fileDir = path.dirname(legalResourceFile);

      //to get mainResourceFileDir: ~/path/to/flutter_r_demo/lib/assets/images
      let mainResourceFileDir = path.dirname(fileDir);

      // ~/path/to/flutter_r_demo/lib/assets/images/test.png
      mainResourceFile = `${mainResourceFileDir}/${fileBasename}`;
    }

    // mainResourceFile:  ~/path/to/flutter_r_demo/lib/assets/images/test.png
    // mainRelativeResourceFile: lib/assets/images/test.png
    // mainImpliedRelativeResourceFile: assets/images/test.png
    // "^$~/path/to/flutter_r_demo/"
    let flutterDirPrefixRegex = new RegExp(`^${flutterDir}/`);
    let mainRelativeResourceFile = mainResourceFile.replace(
      flutterDirPrefixRegex,
      ""
    );
    let libPrefixRegx = /lib\//;
    let mainImpliedRelativeResourceFile = mainRelativeResourceFile.replace(
      libPrefixRegx,
      ""
    );

    // mainAsset: packages/flutter_r_demo/assets/images/test.png
    let mainAsset =
      "packages/" + packageName + "/" + mainImpliedRelativeResourceFile;
    return mainAsset;
  }

  /*
   * 遍历指定资源目录下扫描找到的legalImageFile数组生成imageAsset数组
   * */
  public static generateImageAssets(
    flutterDir: string,
    packageName: string,
    legalImageFileArray: string[]
  ): string[] {
    var imageAssetSet: Set<string> = new Set();

    legalImageFileArray.forEach((legalResourceFile) => {
      let imageAsset = this.generateMainAsset(
        flutterDir,
        packageName,
        legalResourceFile
      );
      imageAssetSet.add(imageAsset);
    });

    let imageAssetArray = Array.from(imageAssetSet.values());
    return imageAssetArray;
  }

  /*
   * 遍历指定资源目录下扫描找到的legalTextFile数组生成textAsset数组
   * */
  public static generateTextAssets(
    flutterDir: string,
    packageName: string,
    legalTextFileArray: string[]
  ): string[] {
    var textAssetSet: Set<string> = new Set();

    legalTextFileArray.forEach((legalResourceFile) => {
      let textAsset = this.generateMainAsset(
        flutterDir,
        packageName,
        legalResourceFile
      );
      textAssetSet.add(textAsset);
    });

    let textAssetArray = Array.from(textAssetSet.values());
    return textAssetArray;
  }

  /*
   * 遍历指定资源目录下扫描找到的legalFontFile数组生成fontAssetConfig数组
   *
   * fontAssetConfig = {"asset": "packages/flutter_r_demo/assets/fonts/Amiri/Amiri-Regular.ttf"}
   * */
  public static generateFontAssetConfigs(
    flutterDir: string,
    packageName: string,
    legalFontFileArray: string[]
  ): Object[] {
    var fontAssetConfigArray: Object[] = new Array();

    legalFontFileArray.forEach((legalResourceFile) => {
      let fontAsset = this.generateMainAsset(
        flutterDir,
        packageName,
        legalResourceFile
      );

      let fontAssetConfig = {
        asset: fontAsset,
      };
      fontAssetConfigArray.push(fontAssetConfig);
    });

    return fontAssetConfigArray;
  }
}
