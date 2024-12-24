import * as console from 'node:console';
import * as fs from 'node:fs/promises';

import * as prettier from 'prettier';
import * as yaml from 'yaml';

async function to_json(file) {
  const document = yaml.parse(await fs.readFile(file, 'utf8'));
  const data = await prettier.format(JSON.stringify(document), { parser: 'json' });
  return data;
}

const folder = './vendor/common/';
const output_folder = './vendor/common-json/';

for (const file of await fs.readdir(folder)) {
  if (file.toLowerCase().endsWith('.yml') || file.toLowerCase().endsWith('.yaml')) {
    const json_content = await to_json(folder + file);
    const json_file = output_folder + file.replace('.yml', '.json');
    console.log(`${file} to ${json_file}`);
    await fs.writeFile(json_file, json_content, 'utf8');
  }
}
