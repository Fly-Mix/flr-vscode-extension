import * as path from "path";
import * as fs from "fs";
import { FlrFileUtil } from "./FlrFileUtil";
import * as glob from "glob";

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
   * 判断当前资产是不是图片类资产
   *
   * === Examples
   *
   * === Example-1
   * asset = "packages/flutter_r_demo/assets/images/test.png"
   * @return true
   *
   * === Example-2
   * asset = "assets/images/test.png"
   * @return true
   *
   * */
  public static isImageAsset(asset: string): boolean {
    if (FlrFileUtil.isNonSvgImageResourceFile(asset)) {
      return true;
    }
    return false;
  }

  /*
   * 判断当前资产是不是package类资产
   *
   * === Examples
   *
   * === Example-1
   * asset = "packages/flutter_r_demo/assets/images/test.png"
   * @return true
   *
   * === Example-2
   * asset = "assets/images/test.png"
   * @return false
   *
   * */
  public static isPackageAsset(asset: string): boolean {
    let packagePrefix = "packages/";
    if (asset.startsWith(packagePrefix)) {
      return true;
    }

    return false;
  }
  /*
   * 判断当前资产是不是指定的package的资产
   *
   * === Examples
   *
   * === Example-1
   * asset = "packages/flutter_r_demo/assets/images/test.png"
   * @return true
   *
   * === Example-2
   * asset = "assets/images/test.png"
   * @return false
   *
   * */
  public static isSpecifiedPackageAsset(
    packageName: string,
    asset: string
  ): boolean {
    let specifiedPackagePrefix = "packages/" + packageName + "/";
    if (asset.startsWith(specifiedPackagePrefix)) {
      return true;
    }
    return false;
  }

  /*
   * 获取指定flutter工程的asset对应的主资源文件
   * 注意：主资源文件不一定存在，比如图片资产可能只存在变体资源文件
   *
   * === Examples
   * flutter_project_dir = "~/path/to/flutter_r_demo"
   * package_name = "flutter_r_demo"
   *
   * === Example-1
   * asset = "packages/flutter_r_demo/assets/images/test.png"
   * main_resource_file = "~/path/to/flutter_r_demo/lib/assets/images/test.png"
   *
   * === Example-2
   * asset = "assets/images/test.png"
   * main_resource_file = "~/path/to/flutter_r_demo/assets/images/test.png"
   *
   * */
  public static getMainResourceFile(
    flutterProjectDir: string,
    packageName: string,
    asset: string
  ): string {
    if (this.isSpecifiedPackageAsset(packageName, asset)) {
      let specifiedPackagePrefix = "packages/" + packageName + "/";

      // asset: packages/flutter_r_demo/assets/images/test.png
      // to get impliedRelativeResourceFile: lib/assets/images/test.png
      let specifiedPackagePrefixRegex = new RegExp(
        `^${specifiedPackagePrefix}`
      );
      let impliedRelativeResourceFile = asset.replace(
        specifiedPackagePrefixRegex,
        ""
      );
      impliedRelativeResourceFile = "lib/" + impliedRelativeResourceFile;

      // mainResourceFile:  ~/path/to/flutter_r_demo/lib/assets/images/test.png
      let mainResourceFile =
        flutterProjectDir + "/" + impliedRelativeResourceFile;
      return mainResourceFile;
    } else {
      // asset: assets/images/test.png
      // mainResourceFile:  ~/path/to/flutter_r_demo/assets/images/test.png
      let mainResourceFile = flutterProjectDir + "/" + asset;
      return mainResourceFile;
    }
  }

  /*
   * 判断指定flutter工程的asset是不是存在；存在的判断标准是：asset需要存在对应的资源文件
   *
   * === Examples
   * flutter_project_dir = "~/path/to/flutter_r_demo"
   * package_name = "flutter_r_demo"
   *
   * === Example-1
   * asset = "packages/flutter_r_demo/assets/images/test.png"
   * @return true
   *
   * === Example-2
   * asset = "packages/flutter_r_demo/404/not-existed.png"
   * @return false
   *
   * */
  public static isAssetExisted(
    flutterProjectDir: string,
    packageName: string,
    asset: string
  ): boolean {
    // 处理指定flutter工程的asset
    // 1. 获取asset对应的main_resource_file
    // 2. 若main_resource_file是非SVG类图片资源文件，判断asset是否存在的标准是：主资源文件或者至少一个变体资源文件存在
    // 3. 若main_resource_file是SVG类图片资源文件或者其他资源文件，判断asset是否存在的标准是：主资源文件存在
    //

    let mainResourceFile = this.getMainResourceFile(
      flutterProjectDir,
      packageName,
      asset
    );
    if (FlrFileUtil.isNonSvgImageResourceFile(mainResourceFile)) {
      if (fs.existsSync(mainResourceFile)) {
        return true;
      }

      let fileBaseName = path.basename(mainResourceFile);
      let fileDir = path.dirname(mainResourceFile);
      var didFindVariantResourceFile = false;
      // example: path/to/dir/*/file.png
      let fileRegx = `${fileDir}/*/${fileBaseName}`;
      glob.sync(fileRegx).forEach((file) => {
        if (this.isAssetVariant(file)) {
          didFindVariantResourceFile = true;
        }
      });

      if (didFindVariantResourceFile) {
        return true;
      }
    } else {
      if (fs.existsSync(mainResourceFile)) {
        return true;
      }
    }

    return false;
  }

  /*
   * 为当前资源文件生成 main_asset
   *
   * === Examples
   * flutterProjectDir =  "~/path/to/flutter_r_demo"
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
   * === Example-4
   * legalResourceFile = "~/path/to/flutter_r_demo/assets/images/test.png"
   * mainAsset = "assets/images/test.png"
   *
   * === Example-5
   * legalResourceFile = "~/path/to/flutter_r_demo/assets/images/3.0x/test.png"
   * mainAsset = "assets/images/test.png"
   *
   * */
  public static generateMainAsset(
    flutterProjectDir: string,
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
    // to get mainRelativeResourceFile: lib/assets/images/test.png
    let replaced = flutterProjectDir.replace(/\\/g, "/");
    let flutterProjectDirPrefixRegex = new RegExp(`^${replaced}/`);
    let mainRelativeResourceFile = mainResourceFile.replace(
      flutterProjectDirPrefixRegex,
      ""
    );

    // 判断 mainRelativeResourceFile 是不是 impliedResourceFile 类型
    // impliedResourceFile 的定义是：放置在 "lib/" 目录内 resource_file
    // 具体实现是：mainRelativeResourceFile 的前缀若是 "lib/" ，则其是 impliedResourceFile 类型；
    //
    // impliedResourceFile 生成 mainAsset 的算法是： mainAsset = "packages/#{packageName}/#{assetName}"
    // non-impliedResourceFile 生成 mainAsset 的算法是： mainAsset = "#{assetName}"
    //
    let libPrefix = "lib/";
    if (mainRelativeResourceFile.startsWith(libPrefix)) {
      let libPrefixRegx = RegExp(libPrefix);
      // mainRelativeResourceFile: lib/assets/images/test.png
      // to get assetName: assets/images/test.png
      let assetName = mainRelativeResourceFile.replace(libPrefixRegx, "");

      // mainAsset: packages/flutter_r_demo/assets/images/test.png
      let mainAsset = "packages/" + packageName + "/" + assetName;
      return mainAsset;
    } else {
      // mainRelativeResourceFile: assets/images/test.png
      // to get assetName: assets/images/test.png
      let assetName = mainRelativeResourceFile;

      // mainAsset: assets/images/test.png
      let mainAsset = assetName;
      return mainAsset;
    }
  }

  /*
   * 遍历指定资源目录下扫描找到的legalImageFile数组生成imageAsset数组
   * */
  public static generateImageAssets(
    flutterProjectDir: string,
    packageName: string,
    legalImageFileArray: string[]
  ): string[] {
    var imageAssetSet: Set<string> = new Set();

    legalImageFileArray.forEach((legalResourceFile) => {
      let imageAsset = this.generateMainAsset(
        flutterProjectDir,
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
    flutterProjectDir: string,
    packageName: string,
    legalTextFileArray: string[]
  ): string[] {
    var textAssetSet: Set<string> = new Set();

    legalTextFileArray.forEach((legalResourceFile) => {
      let textAsset = this.generateMainAsset(
        flutterProjectDir,
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
    flutterProjectDir: string,
    packageName: string,
    legalFontFileArray: string[]
  ): Object[] {
    var fontAssetConfigArray: Object[] = new Array();

    legalFontFileArray.forEach((legalResourceFile) => {
      let fontAsset = this.generateMainAsset(
        flutterProjectDir,
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

  /*
   * 合并新旧2个asset数组：
   * - old_asset_array - new_asset_array = diff_asset_array，获取old_asset_array与new_asset_array的差异集合
   * - 遍历diff_asset_array，筛选合法的asset得到legal_old_asset_array；合法的asset标准是：非图片资源 + 存在对应的资源文件
   * - 按照字典序对legal_old_asset_array进行排序，并追加到new_asset_array
   * - 返回合并结果merged_asset_array
   *
   * === Examples
   * flutter_project_dir = "~/path/to/flutter_r_demo"
   * package_name = "flutter_r_demo"
   * new_asset_array = ["packages/flutter_r_demo/assets/images/test.png", "packages/flutter_r_demo/assets/jsons/test.json"]
   * old_asset_array = ["packages/flutter_r_demo/assets/htmls/test.html"]
   * merged_asset_array = ["packages/flutter_r_demo/assets/images/test.png", "packages/flutter_r_demo/assets/jsons/test.json", "packages/flutter_r_demo/assets/htmls/test.html"]
   *
   *  */
  public static mergeFlutterAssets(
    flutterProjectDir: string,
    packageName: string,
    newAssetArray: string[],
    oldAssetArray: string[]
  ): string[] {
    var legalOldAssetArray: string[] = new Array();

    var diffAssetArray = oldAssetArray.filter((asset) => {
      return !newAssetArray.includes(asset);
    });
    diffAssetArray.forEach((asset) => {
      // 若是第三方package的资源，newAssetArray
      // 引用第三方package的资源的推荐做法是：通过引用第三方package的R类来访问
      if (this.isPackageAsset(asset)) {
        if (!this.isSpecifiedPackageAsset(packageName, asset)) {
          legalOldAssetArray.push(asset);
          return;
        }
      }

      // 处理指定flutter工程的asset
      // 1. 判断asset是否存在
      // 2. 若asset存在，则合并到new_asset_array
      //
      if (this.isAssetExisted(flutterProjectDir, packageName, asset)) {
        legalOldAssetArray.push(asset);
        return;
      }
    });

    legalOldAssetArray.sort();
    let mergedAssetArray = newAssetArray.concat(legalOldAssetArray);
    return mergedAssetArray;
  }
}
