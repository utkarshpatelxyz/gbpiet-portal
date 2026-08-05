const fs = require('fs');
const html = fs.readFileSync('../index.html', 'utf8');

function grab(startMarker, endMarker) {
  const i = html.indexOf(startMarker);
  if (i === -1) throw new Error('not found: ' + startMarker);
  const j = html.indexOf(endMarker, i);
  return html.slice(i, j + endMarker.length);
}

const src = [
  grab("const S1_U_PRESS  =", "const S1_YESNO    = ['Yes', 'No'];"),
  grab("const S1_PROC_COLUMNS = [", "\n    ];"),
  grab("const S1_NOZZLE_COLUMNS = [", "\n    ];"),
  grab("const S1_DS_SECTIONS = [", "\n    ];"),
].join('\n');

const MRD_SRC = grab("const MRD_ICONS = [", "\n    ];");

const mod = new Function(src + '\n' + MRD_SRC + '\nreturn { S1_DS_SECTIONS, MRD_ICONS };');
module.exports = mod();
