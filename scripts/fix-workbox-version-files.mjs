import fs from 'node:fs';
import path from 'node:path';

const files = [
  {
    relativePath: 'node_modules/workbox-strategies/_version.js',
    content: "try{self['workbox:strategies:7.4.0']&&_()}catch(e){}// eslint-disable-line\n",
  },
  {
    relativePath: 'node_modules/workbox-background-sync/_version.js',
    content: "try{self['workbox:background-sync:7.4.0']&&_()}catch(e){}// eslint-disable-line\n",
  },
];

for (const file of files) {
  const target = path.resolve(process.cwd(), file.relativePath);
  const dir = path.dirname(target);

  if (!fs.existsSync(dir)) {
    continue;
  }

  if (!fs.existsSync(target)) {
    fs.writeFileSync(target, file.content, 'utf8');
    console.log(`[workbox-fix] created ${file.relativePath}`);
  }
}
