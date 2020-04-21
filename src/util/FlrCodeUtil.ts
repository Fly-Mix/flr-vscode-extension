import * as path from "path";
import * as fs from "fs";
import * as FlrConstant from "../FlrConstant";

export class FlrCodeUtil {
  /*
   * 根据模板生成 R class 的代码
   * */
  public static generate_R_class(packageName: string): string {
    let code = `// IT IS GENERATED BY FLR - DO NOT MODIFY BY HAND
        // YOU CAN GET MORE DETAILS ABOUT FLR FROM:
        // - https://github.com/Fly-Mix/flr-cli
        // - https://github.com/Fly-Mix/flr-vscode-extension
        // - https://github.com/Fly-Mix/flr-as-plugin
        //
        
        // ignore: unused_import
        import 'package:flutter/widgets.dart';
        // ignore: unused_import
        import 'package:flutter/services.dart' show rootBundle;
        // ignore: unused_import
        import 'package:path/path.dart' as path;
        // ignore: unused_import
        import 'package:flutter_svg/flutter_svg.dart';
        // ignore: unused_import
        import 'package:r_dart_library/asset_svg.dart';
        
        /// This \`R\` class is generated and contains references to static asset resources.
        class R {
          /// package name: ${packageName}
          static const package = "${packageName}";
        
          /// This \`R.image\` struct is generated, and contains static references to static non-svg type image asset resources.
          static const image = _R_Image();
        
          /// This \`R.svg\` struct is generated, and contains static references to static svg type image asset resources.
          static const svg = _R_Svg();
        
          /// This \`R.text\` struct is generated, and contains static references to static text asset resources.
          static const text = _R_Text();
        
          /// This \`R.fontFamily\` struct is generated, and contains static references to static font asset resources.
          static const fontFamily = _R_FontFamily();
        }`;

    return code;
  }

  /*
   * 根据模板生成 AssetResource class 的代码
   * */
  public static generate_AssetResource_class(packageName: string): string {
    let code = `/// Asset resource’s metadata class.
      /// For example, here is the metadata of \`packages/flutter_demo/assets/images/example.png\` asset:
      /// - packageName：flutter_demo
      /// - assetName：assets/images/example.png
      /// - fileDirname：assets/images
      /// - fileBasename：example.png
      /// - fileBasenameNoExtension：example
      /// - fileExtname：.png
      class AssetResource {
        /// Creates an object to hold the asset resource’s metadata.
        const AssetResource(this.assetName, {this.packageName}) : assert(assetName != null);
      
        /// The name of the main asset from the set of asset resources to choose from.
        final String assetName;
      
        /// The name of the package from which the asset resource is included.
        final String packageName;
      
        /// The name used to generate the key to obtain the asset resource. For local assets
        /// this is [assetName], and for assets from packages the [assetName] is
        /// prefixed 'packages/<package_name>/'.
        String get keyName => packageName == null ? assetName : "packages/$packageName/$assetName";
      
        /// The file basename of the asset resource.
        String get fileBasename {
          final basename = path.basename(assetName);
          return basename;
        }
      
        /// The no extension file basename of the asset resource.
        String get fileBasenameNoExtension {
          final basenameWithoutExtension = path.basenameWithoutExtension(assetName);
          return basenameWithoutExtension;
        }
      
        /// The file extension name of the asset resource.
        String get fileExtname {
          final extension = path.extension(assetName);
          return extension;
        }
      
        /// The directory path name of the asset resource.
        String get fileDirname {
          var dirname = assetName;
          if (packageName != null) {
            final packageStr = "packages/$packageName/";
            dirname = dirname.replaceAll(packageStr, "");
          }
          final filenameStr = "$fileBasename/";
          dirname = dirname.replaceAll(filenameStr, "");
          return dirname;
        }
      }`;

    return code;
  }

  /*
   * 为asset生成assetId；其中priorAssetType为优先的资产类型，其决定了当前asset的assetId是否带有资产类型信息。
   * 如priorAssetType为".png"，
   * 这时候若asset为“packages/flutter_demo/assets/images/test.png”，这时其生成assetId为“test”，不带有类型信息；
   * 这时候若asset为“packages/flutter_demo/assets/images/test.jpg”，这时其生成assetId为“test_jpg”，带有类型信息；
   *
   * @param asset 指定的资产
   * @param usedAssetIdArray 已使用的assetId数组
   * @param priorAssetType 优先的资产类型，默认值为null，代表“.*”，意味生成的assetId总是带有资产类型信息
   * @return assetId 资产ID
   * */
  public static generateAssetId(
    asset: string,
    usedAssetIdArray: string[],
    priorAssetType: string = ".*"
  ): string {
    let fileExtName = path.extname(asset);
    let fileBasenameWithoutExtension = path.parse(asset).name;

    var assetId = fileBasenameWithoutExtension;
    if (priorAssetType === ".*" || fileExtName !== priorAssetType) {
      let extInfo = "_" + fileExtName.substring(1);
      assetId = fileBasenameWithoutExtension + extInfo;
    }

    // 过滤非法字符
    assetId = assetId.replace(/[^a-zA-Z0-9_$]/g, "_");

    // 首字母转化为小写
    let capital = assetId.charAt(0).toLowerCase();
    assetId = capital + assetId.substring(1);

    // 处理首字符异常情况
    let capitalRegex = /[0-9_$]/;
    if (capitalRegex.test(capital)) {
      assetId = "a" + assetId;
    }

    // 处理 asset_id 重名的情况
    if (usedAssetIdArray !== null && usedAssetIdArray.includes(assetId)) {
      var repeatCount = 1;

      // 查找当前asset_id衍生出来的asset_id_brother（id兄弟）
      // asset_id_brother = #{asset_id}$#{repeat_count}
      // 其中，repeat_count >= 1
      //
      // Example：
      // asset_id = test
      // asset_id_brother = test$1
      //
      let idBrotherRegex = new RegExp(`^${assetId}\\$[1-9][0-9]*$`);
      let curAssetIdBrothers = usedAssetIdArray.filter((usedAssetId) =>
        idBrotherRegex.test(usedAssetId)
      );
      if (curAssetIdBrothers !== null) {
        repeatCount += curAssetIdBrothers.length;
      }

      assetId = `${assetId}$${repeatCount}`;
    }

    return assetId;
  }

  /*
   * 为当前asset生成注释
   *
   * === Examples
   * packageName = "flutter_r_demo"
   *
   * === Example-1
   * asset = "packages/flutter_r_demo/assets/images/test.png"
   * assetComment = "asset: lib/assets/images/test.png"
   *
   * === Example-2
   * asset = "assets/images/test.png"
   * assetComment = "asset: assets/images/test.png"
   *
   * */
  public static generateAssetComment(
    asset: string,
    packageName: string
  ): string {
    let packagesPrefix = "packages/" + packageName + "/";
    if (asset.startsWith(packagesPrefix)) {
      // asset: packages/flutter_r_demo/assets/images/test.png
      // to get assetName: assets/images/test.png
      let assetName = asset.replace(packagesPrefix, "");

      let assetComment = "asset: lib/" + assetName;
      return assetComment;
    } else {
      // asset: assets/images/test.png
      // to get assetName: assets/images/test.png
      let assetName = asset;

      let assetComment = "asset: " + assetName;
      return assetComment;
    }
  }

  /*
   * 为当前 asset 生成 AssetResource property 的代码
   * */
  public static generate_AssetResource_property(
    asset: string,
    assetIdDict: Map<string, string>,
    packageName: string,
    isPackageProjectType: boolean,
    priorAssetType: string = ".*"
  ): string {
    let assetId = assetIdDict.get(asset);
    let assetComment = this.generateAssetComment(asset, packageName);

    var assetName = "";
    var needPackage = false;

    let packagesPrefix = "packages/" + packageName + "/";
    if (asset.startsWith(packagesPrefix)) {
      // asset: packages/flutter_r_demo/assets/images/test.png
      // to get assetName: assets/images/test.png
      assetName = asset.replace(packagesPrefix, "");
      needPackage = true;
    } else {
      // asset: assets/images/test.png
      // to get assetName: assets/images/test.png
      assetName = asset;

      if (isPackageProjectType) {
        needPackage = true;
      } else {
        needPackage = false;
      }
    }

    // 对字符串中的 '$' 进行转义处理：'$' -> '\$'
    // assetName: assets/images/test$.png
    // to get escapedAssetName: assets/images/test\$.png
    let escapedAssetName = assetName.replace(/[$]/g, "\\$");

    if (needPackage) {
      let code = `  /// ${assetComment}
      // ignore: non_constant_identifier_names
      final ${assetId} = const AssetResource("${escapedAssetName}", packageName: R.package);`;

      return code;
    } else {
      let code = `  /// ${assetComment}
      // ignore: non_constant_identifier_names
      final ${assetId} = const AssetResource("${escapedAssetName}", packageName: null);`;

      return code;
    }
  }

  /*
   * 根据模板，为 nonSvgImageAssetArray（非svg类的图片资产数组）生成 _R_Image_AssetResource class 的代码
   * */
  public static generate__R_Image_AssetResource_class(
    nonSvgImageAssetArray: string[],
    nonSvgImageAssetIdDict: Map<string, string>,
    packageName: string,
    isPackageProjectType: boolean
  ): string {
    var all_g_AssetResource_property_code = "";

    nonSvgImageAssetArray.forEach((asset) => {
      all_g_AssetResource_property_code += "\n";
      let g_AssetResource_property_code = this.generate_AssetResource_property(
        asset,
        nonSvgImageAssetIdDict,
        packageName,
        isPackageProjectType,
        FlrConstant.PRIOR_NON_SVG_IMAGE_FILE_TYPE
      );
      all_g_AssetResource_property_code += g_AssetResource_property_code;
    });

    let code = `// ignore: camel_case_types
      class _R_Image_AssetResource {
        const _R_Image_AssetResource();
      ${all_g_AssetResource_property_code}
      }`;
    return code;
  }

  /*
   * 根据模板，为 svgImageAssetArray（svg类的图片资产数组）生成 _R_Svg_AssetResource class 的代码
   * */
  public static generate__R_Svg_AssetResource_class(
    svgImageAssetArray: string[],
    svgImageAssetIdDict: Map<string, string>,
    packageName: string,
    isPackageProjectType: boolean
  ): string {
    var all_g_AssetResource_property_code = "";

    svgImageAssetArray.forEach((asset) => {
      all_g_AssetResource_property_code += "\n";
      let g_AssetResource_property_code = this.generate_AssetResource_property(
        asset,
        svgImageAssetIdDict,
        packageName,
        isPackageProjectType,
        FlrConstant.PRIOR_SVG_IMAGE_FILE_TYPE
      );
      all_g_AssetResource_property_code += g_AssetResource_property_code;
    });

    let code = `// ignore: camel_case_types
    class _R_Svg_AssetResource {
      const _R_Svg_AssetResource();
    ${all_g_AssetResource_property_code}
    }`;
    return code;
  }

  /*
   * 根据模板，为 textAssetArray（文本资产数组）生成 _R_Text_AssetResource class 的代码
   * */
  public static generate__R_Text_AssetResource_class(
    textAssetArray: string[],
    textAssetIdDict: Map<string, string>,
    packageName: string,
    isPackageProjectType: boolean
  ): string {
    var all_g_AssetResource_property_code = "";

    textAssetArray.forEach((asset) => {
      all_g_AssetResource_property_code += "\n";
      let g_AssetResource_property_code = this.generate_AssetResource_property(
        asset,
        textAssetIdDict,
        packageName,
        isPackageProjectType,
        FlrConstant.PRIOR_NON_SVG_IMAGE_FILE_TYPE
      );
      all_g_AssetResource_property_code += g_AssetResource_property_code;
    });

    let code = `// ignore: camel_case_types
    class _R_Text_AssetResource {
      const _R_Text_AssetResource();
    ${all_g_AssetResource_property_code}
    }`;
    return code;
  }

  /*
   * 根据模板，为 nonSvgImageAssetArray（非svg类的图片资产数组）生成 _R_Image class 的代码
   * */
  public static generate__R_Image_class(
    nonSvgImageAssetArray: string[],
    nonSvgImageAssetIdDict: Map<string, string>,
    packageName: string
  ): string {
    var all_g_Asset_method_code = "";

    nonSvgImageAssetArray.forEach((asset) => {
      all_g_Asset_method_code += "\n";

      let assetId = nonSvgImageAssetIdDict.get(asset);
      let assetComment = this.generateAssetComment(asset, packageName);

      let g_Asset_method_code = `  /// ${assetComment}
      // ignore: non_constant_identifier_names
      AssetImage ${assetId}() {
        return AssetImage(asset.${assetId}.keyName);
      }`;

      all_g_Asset_method_code += g_Asset_method_code;
    });

    let code = `/// This \`_R_Image\` class is generated and contains references to static non-svg type image asset resources.
    // ignore: camel_case_types
    class _R_Image {
      const _R_Image();
    
      final asset = const _R_Image_AssetResource();
    ${all_g_Asset_method_code}
    }`;
    return code;
  }

  /*
   * 根据模板，为 svgImageAssetArray（svg类的图片资产数组）生成 _R_Svg class 的代码
   * */
  public static generate__R_Svg_class(
    svgImageAssetArray: string[],
    svgImageAssetIdDict: Map<string, string>,
    packageName: string
  ): string {
    var all_g_Asset_method_code = "";

    svgImageAssetArray.forEach((asset) => {
      all_g_Asset_method_code += "\n";

      let assetId = svgImageAssetIdDict.get(asset);
      let assetComment = this.generateAssetComment(asset, packageName);

      let g_Asset_method_code = `  /// ${assetComment}
      // ignore: non_constant_identifier_names
      AssetSvg ${assetId}({@required double width, @required double height}) {
        final imageProvider = AssetSvg(asset.${assetId}.keyName, width: width, height: height);
        return imageProvider;
      }`;

      all_g_Asset_method_code += g_Asset_method_code;
    });

    let code = `/// This \`_R_Svg\` class is generated and contains references to static svg type image asset resources.
    // ignore: camel_case_types
    class _R_Svg {
      const _R_Svg();
    
      final asset = const _R_Svg_AssetResource();
    ${all_g_Asset_method_code}
    }`;
    return code;
  }

  /*
   * 根据模板，为 textAssetArray（文本资产数组）生成 _R_Text class 的代码
   * */
  public static generate__R_Text_class(
    textAssetArray: string[],
    textAssetIdDict: Map<string, string>,
    packageName: string
  ): string {
    var all_g_Asset_method_code = "";

    textAssetArray.forEach((asset) => {
      all_g_Asset_method_code += "\n";

      let assetId = textAssetIdDict.get(asset);
      let assetComment = this.generateAssetComment(asset, packageName);

      let g_Asset_method_code = `  /// ${assetComment}
      // ignore: non_constant_identifier_names
      Future<String> ${assetId}() {
        final str = rootBundle.loadString(asset.${assetId}.keyName);
        return str;
      }`;

      all_g_Asset_method_code += g_Asset_method_code;
    });

    let code = `/// This \`_R_Text\` class is generated and contains references to static text asset resources.
    // ignore: camel_case_types
    class _R_Text {
      const _R_Text();
    
      final asset = const _R_Text_AssetResource();
    ${all_g_Asset_method_code}
    }`;
    return code;
  }

  /*
   * 为当前 font_family_name 生成 font_family_id；font_family_id 一般为 asset 的 font_family_name；
   * 但是为了保证 font_family_id 的健壮性，需要对 font_family_name 做以下加工处理：
   * - 处理非法字符：把除了字母（a-z, A-Z）、数字（0-9）、'_' 字符、'$' 字符之外的字符转换为 '_' 字符
   * - 首字母转化为小写
   * - 处理首字符异常情况：检测首字符是不是数字、'_'、'$'，若是则添加前缀字符"a"
   *
   * === Examples
   * a_font_family_name = "Amiri"
   * b_font_family_name = "Baloo-Thambi-2"
   * a_font_family_id = "amiri"
   * b_font_family_id = "baloo_Thambi_2"
   * */
  public static generateFontFamilyId(fontFamilyName: string): string {
    var fontFamilyId = fontFamilyName;

    // 过滤非法字符
    fontFamilyId = fontFamilyId.replace(/[^a-zA-Z0-9_$]/g, "_");

    // 首字母转化为小写
    let capital = fontFamilyId.charAt(0).toLowerCase();
    fontFamilyId = capital + fontFamilyId.substring(1);

    // 处理首字符异常情况
    let capitalRegex = /[0-9_$]/;
    if (capitalRegex.test(capital)) {
      fontFamilyId = "a" + fontFamilyId;
    }

    return fontFamilyId;
  }

  /*
   * 根据模板，为 fontFamilyConfigArray（字体家族配置数组）生成 _R_FontFamily class 的代码
   * */
  public static generate__R_FontFamily_class(
    fontFamilyConfigArray: Object[],
    packageName: string
  ): string {
    var all_g_AssetResource_property_code = "";

    fontFamilyConfigArray.forEach((fontFamilyConfig: any) => {
      all_g_AssetResource_property_code += "\n";

      let fontFamilyName = fontFamilyConfig["family"];
      if (fontFamilyName === undefined) {
        return;
      }
      let fontFamilyId = this.generateFontFamilyId(fontFamilyName);

      let fontFamilyComment = `font family: ${fontFamilyName}`;

      let g_AssetResource_property_code = `  /// ${fontFamilyComment}
      // ignore: non_constant_identifier_names
      final ${fontFamilyId} = "${fontFamilyName}";`;

      all_g_AssetResource_property_code += g_AssetResource_property_code;
    });

    let code = `/// This \`_R_FontFamily\` class is generated and contains references to static font asset resources.
    // ignore: camel_case_types
    class _R_FontFamily {
      const _R_FontFamily();
    ${all_g_AssetResource_property_code}
    }`;
    return code;
  }
}
