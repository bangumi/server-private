import * as console from 'node:console';
import * as fs from 'node:fs/promises';

import * as prettier from 'prettier';
import * as yaml from 'yaml';

async function to_json(file) {
  // -1 关闭 yaml 库默认的 maxAliasCount: 100 保护
  // 上游 common 的 subject_staffs.yml 有超过 100 个 alias 引用，是正常的数据复用而非资源耗尽攻击
  const document = yaml.parse(await fs.readFile(file, 'utf8'), { maxAliasCount: -1 });
  const data = await prettier.format(JSON.stringify(document), { parser: 'json' });
  return data;
}

const folder = './upstream/common/';
const output_folder = './vendor/common/';

for (const file of await fs.readdir(folder)) {
  if (!(file.toLowerCase().endsWith('.yml') || file.toLowerCase().endsWith('.yaml'))) {
    continue;
  }

  const json_content = await to_json(folder + file);
  const json_file = output_folder + file.replace('.yml', '.json');
  console.log(`${file} to ${json_file}`);
  await fs.writeFile(json_file, json_content, 'utf8');
}
