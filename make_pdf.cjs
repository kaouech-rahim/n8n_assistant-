const fs = require('fs');

const lines = [
  'Rapport Annuel 2024 - Intelligence Artificielle',
  '',
  'Ce document presente les avancees en IA pour 2024.',
  '',
  'Points cles:',
  '1. Les modeles de langage ont atteint des performances remarquables',
  '2. L adoption enterprise de l IA a triple en 12 mois',
  '3. Les outils comme n8n democratisent l automatisation',
  '4. La securite et l ethique de l IA sont devenues prioritaires',
  '',
  'Conclusion: L IA transforme profondement les entreprises.',
];

const safeStr = (s) => s.replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)');

const opsLines = [];
opsLines.push('BT');
opsLines.push('/F1 12 Tf');
opsLines.push('50 720 Td');
lines.forEach((line, i) => {
  if (i > 0) opsLines.push('0 -18 Td');
  opsLines.push('(' + safeStr(line) + ') Tj');
});
opsLines.push('ET');
const ops = opsLines.join('\n');

const streamBytes = Buffer.from(ops, 'latin1');

const parts = [
  '%PDF-1.4\n',
  '1 0 obj\n<</Type/Catalog/Pages 2 0 R>>\nendobj\n',
  '2 0 obj\n<</Type/Pages/Kids[3 0 R]/Count 1>>\nendobj\n',
  '3 0 obj\n<</Type/Page/Parent 2 0 R/MediaBox[0 0 612 792]/Contents 4 0 R/Resources<</Font<</F1<</Type/Font/Subtype/Type1/BaseFont/Helvetica>>>>>>/MediaBox[0 0 612 792]>>\nendobj\n',
  '4 0 obj\n<</Length ' + streamBytes.length + '>>\nstream\n',
];

const body = Buffer.concat([
  ...parts.map(p => Buffer.from(p)),
  streamBytes,
  Buffer.from('\nendstream\nendobj\n%%EOF\n'),
]);

fs.writeFileSync('rapport_ia_2024.pdf', body);
console.log('PDF cree:', body.length, 'bytes');
