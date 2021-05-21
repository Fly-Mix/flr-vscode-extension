// 工具版本号
export let VERSION = '3.0.0';

// 核心逻辑版本号
export let CORE_VERSION = '3.1.0';

// Flr支持的非SVG类图片文件类型
export let NON_SVG_IMAGE_FILE_TYPES = [
  '.png',
  '.jpg',
  '.jpeg',
  '.gif',
  '.webp',
  '.icon',
  '.bmp',
  '.wbmp',
];
// Flr支持的SVG类图片文件类型
export let SVG_IMAGE_FILE_TYPES = ['.svg'];
// Flr支持的图片文件类型
export let IMAGE_FILE_TYPES =
  NON_SVG_IMAGE_FILE_TYPES.concat(SVG_IMAGE_FILE_TYPES);
// Flr支持的文本文件类型
export let TEXT_FILE_TYPES = ['.txt', '.json', '.yaml', '.xml'];
// Flr支持的字体文件类型
export let FONT_FILE_TYPES = ['.ttf', '.otf', '.ttc'];

// Flr优先考虑的非SVG类图片文件类型
export let PRIOR_NON_SVG_IMAGE_FILE_TYPE = '.png';
// Flr优先考虑的SVG类图片文件类型
export let PRIOR_SVG_IMAGE_FILE_TYPE = '.svg';
// Flr优先考虑的文本文件类型
// 当前值为 ".*"， 意味所有文本文件类型的优先级都一样
export let PRIOR_TEXT_FILE_TYPE = '.*';
// Flr优先考虑的字体文件类型
// 当前值为 ".*"， 意味所有文本文件类型的优先级都一样
export let PRIOR_FONT_FILE_TYPE = '.*';

// dartfmt工具的默认行长
export let DARTFMT_LINE_LENGTH = 80;
