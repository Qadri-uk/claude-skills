// Usage: node plates.cjs <exported-jpg-dir> <outdir>   (run from a project with sharp installed)
// Turn each exported plate into 1920 and 1280 wide progressive JPEGs.
const sharp = require('sharp');
const fs = require('fs');
const [src, out] = process.argv.slice(2);
(async () => {
  for (const f of fs.readdirSync(src).filter((f) => f.endsWith('.jpg'))) {
    const n = f.replace('.jpg', '');
    for (const w of [1920, 1280]) await sharp(`${src}/${f}`).resize(w).jpeg({ quality: 82, progressive: true, mozjpeg: true }).toFile(`${out}/${n}-${w}.jpg`);
    console.log(n);
  }
})();
