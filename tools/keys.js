const { S1_DS_SECTIONS } = require('./extract.js');

const SECTION_PREFIX = {
  DS1: 'design', DS2: 'inspection', DS3: 'material',
  DS4: 'base',   DS5: 'process',    DS6: 'nozzle', DS7: 'instrument'
};

function slug(s) {
  return String(s)
    .replace(/°/g, '')
    .replace(/[–—]/g, '-')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

// Every filterable key in the datasheet
function buildKeys() {
  const out = [];
  S1_DS_SECTIONS.forEach(sec => {
    const p = SECTION_PREFIX[sec.id];
    sec.groups.forEach(g => {
      if (g.table) {
        out.push({
          key: `${p}[].count`, section: sec.label, group: g.label, field: 'Number of rows',
          type: 'number', values: '', note: 'How many rows were entered'
        });
        g.table.columns.forEach(col => {
          // Qualify grouped columns so Temperature/Pressure Maximum stay distinct
          const colKey = col.group
            ? slug(col.group.split(' ')[0]) + '_' + slug(col.label)
            : slug(col.key);
          out.push({
            key: `${p}[].${colKey}`, section: sec.label, group: g.label,
            field: (col.group ? col.group + ' \u203a ' : '') + col.label,
            type: col.type === 'select' ? 'choice' : (col.type === 'number' ? 'number' : 'text'),
            values: col.options ? col.options.join(', ') : '',
            note: 'Matches if ANY row matches'
          });
        });
        return;
      }
      const single = g.fields.length === 1 && !g.fields[0].label;
      g.fields.forEach(f => {
        const parts = [p, slug(g.label)];
        if (!single) parts.push(slug((f.sub ? f.sub + ' ' : '') + f.label));
        let type = f.type === 'select' ? 'choice'
                 : f.type === 'multiselect' ? 'multi-choice'
                 : f.type === 'number' ? 'number' : 'text';
        out.push({
          key: parts.join('.'), section: sec.label, group: g.label,
          field: (f.sub ? f.sub + ' › ' : '') + (f.label || g.label),
          type,
          values: f.options ? f.options.join(', ') : '',
          note: f.type === 'multiselect' ? 'Use "includes" to test one service' : ''
        });
      });
    });
  });
  return out;
}

module.exports = { buildKeys, slug };
