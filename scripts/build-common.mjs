import * as console from 'node:console';
import * as fs from 'node:fs';

import * as yaml from 'yaml';

const to_json = (file) => {
  try {
    const document = yaml.parse(fs.readFileSync(file, 'utf8'));
    console.log(document);
    const data = JSON.stringify(document);
    return data;
  } catch (error) {
    console.log(error);
    return false;
  }
};

const folder = './vendor/common/';
const output_folder = './vendor/common-json/';

fs.readdir(folder, (error, files) => {
  for (const file of files) {
    if (file.includes('.yml')) {
      const json_content = to_json(folder + file);
      if (json_content) {
        const json_file = output_folder + file.replace('.yml', '.json');
        console.log(`${file} to ${json_file}`);
        console.log(json_content);
        fs.writeFile(json_file, json_content, 'utf8', (error_) => {
          if (error_) {
            console.error(error_);
          }
        });
      }
    }
  }
});
