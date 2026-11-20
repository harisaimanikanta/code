import fs from 'node:fs';
import opentype from 'opentype.js';
// Port of three's TTFLoader conversion (typeface.js format), restricted to a glyph subset.
const buf = fs.readFileSync('node_modules/@fontsource/oswald/files/oswald-latin-700-normal.woff');
const font = opentype.parse(buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength));
const chars = ' ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789.,!?\'"-–—:;%&()/+#@’';
const round = Math.round, scale = (100000) / ((font.unitsPerEm || 2048) * 72);
const glyphs = {};
for (const ch of chars) {
  const g = font.charToGlyph(ch);
  if (!g) continue;
  const token = { ha: round(g.advanceWidth * scale), x_min: round(g.xMin * scale), x_max: round(g.xMax * scale), o: '' };
  for (const c of g.path.commands) {
    if (c.type.toLowerCase() === 'c') c.type = 'b';
    token.o += c.type.toLowerCase() + ' ';
    if (c.x !== undefined && c.y !== undefined) token.o += round(c.x * scale) + ' ' + round(c.y * scale) + ' ';
    if (c.x1 !== undefined && c.y1 !== undefined) token.o += round(c.x1 * scale) + ' ' + round(c.y1 * scale) + ' ';
    if (c.x2 !== undefined && c.y2 !== undefined) token.o += round(c.x2 * scale) + ' ' + round(c.y2 * scale) + ' ';
  }
  glyphs[ch] = token;
}
const out = { glyphs, familyName: 'Oswald', ascender: round(font.ascender * scale), descender: round(font.descender * scale),
  underlinePosition: round(font.tables.post.underlinePosition * scale), underlineThickness: round(font.tables.post.underlineThickness * scale),
  boundingBox: { xMin: round(font.tables.head.xMin * scale), xMax: round(font.tables.head.xMax * scale), yMin: round(font.tables.head.yMin * scale), yMax: round(font.tables.head.yMax * scale) },
  resolution: 1000, original_font_information: { license: 'SIL Open Font License 1.1 — Oswald © The Oswald Project Authors (fontsource)' }, cssFontWeight: 'bold', cssFontStyle: 'normal' };
fs.writeFileSync(process.argv[2], JSON.stringify(out));
console.log('glyphs', Object.keys(glyphs).length, 'bytes', fs.statSync(process.argv[2]).size);
