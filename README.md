# flr README

## Installation

- search and install `FLR` in VSCode Extensions Session
- install `vsix` version from [Release]()

## Usage

If you open a folder in `VSCode` and with `pubspec.yaml` in root,

It'll show the `FLR(ASSETS MANGER)` session in `EXPLORER` window

<!-- <image src = "usage.jpg" width=300></img> -->

## 文件名处理规则

1. 过滤文件名字(包括扩展名，如`xx.fileType`)符不在范围`[0-9A-Za-z_\.\+\-$·@!¥&]`的文件
2. `[^0-9a-Za-z_\+\-$·@!¥&]`，不在此范围内`0-9、a-z、A-Z、_、$`的字符将被替换为`_`
3. toLowerCase
4. 检查首字母如果在`[0-9_$]`范围内`0-9、_、$`，则前面添加一个首字母 `a`
5. 含有 `$` 符号，在前面添加转义符`\`，变成`\$`
