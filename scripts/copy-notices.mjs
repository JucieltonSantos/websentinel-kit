import { copyFile } from 'node:fs/promises';

for (const name of ['LICENSE', 'THIRD_PARTY_NOTICES.md']) {
  await copyFile(name, `.output/chrome-mv3/${name}`);
}
