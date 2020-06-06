## Flr Extension Deployment Check List

1. 确定Deployment的版本号：$version
1. 编辑`./src/FlrConstant.ts`，更新与`flr-vscode-extension`发布相关的字段：
   - 更新`VERSION`为：$version
1. 编辑`./package.json`，更新与`flr-vscode-extension`发布相关的字段：
   - 更新`version`为：$version
1. 编辑`./CHANGELOG.md`，更新版本变更日志
1. 在项目根目录下运行脚本打包插件：`vsce package`

## Publish Flr Extension To Marketplace

前往[VSCode插件市场](https://marketplace.visualstudio.com/)，手动上传Flr Extension。

