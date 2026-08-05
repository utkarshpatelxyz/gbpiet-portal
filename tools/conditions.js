const { S1_DS_SECTIONS } = require('./extract.js');

// Every condition a checkpoint can be filtered on, phrased as plain English.
// The phrase itself is the key — the user picks it from a dropdown, so there
// is no syntax to get wrong. Each carries the machine rule Meridian evaluates.
const SECTION_PREFIX = {
  DS1: 'design', DS2: 'inspection', DS3: 'material',
  DS4: 'base',   DS5: 'process',    DS6: 'nozzle', DS7: 'instrument'
};

function slug(s) {
  return String(s).replace(/°/g, '').replace(/[–—]/g, '-').toLowerCase()
    .replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
}

// "Insulation: Required"  /  "Head Shape"  /  "Nozzle Schedule: Rating"
function displayName(group, field, single) {
  return single ? group.label : `${group.label}: ${field.label}`;
}

function buildConditions() {
  const out = [];
  const add = (phrase, key, op, value, where, note) =>
    out.push({ phrase, key, op, value, where, note: note || '' });

  S1_DS_SECTIONS.forEach(sec => {
    const p = SECTION_PREFIX[sec.id];

    sec.groups.forEach(g => {
      if (g.table) {
        add(`${sec.label} has at least one row`, `${p}[].count`, 'gte', '1',
            sec.label, 'True as soon as any row is entered');
        g.table.columns.forEach(col => {
          const key = `${p}[].` + (col.group
            ? slug(col.group.split(' ')[0]) + '_' + slug(col.label)
            : slug(col.key));
          const name = `${g.label}: ${col.group ? col.group + ' ' : ''}${col.label}`;
          if (col.type === 'select') {
            col.options.forEach(o =>
              add(`${name} is ${o}`, key, 'eq', o, sec.label, 'True if any row matches'));
          } else {
            add(`${name} is entered`, key, 'filled', '', sec.label, 'True if any row has it');
          }
        });
        return;
      }

      const single = g.fields.length === 1 && !g.fields[0].label;
      g.fields.forEach(f => {
        const parts = [p, slug(g.label)];
        if (!single) parts.push(slug((f.sub ? f.sub + ' ' : '') + f.label));
        const key = parts.join('.');
        const name = single ? g.label
          : `${g.label}: ${(f.sub ? f.sub + ' ' : '')}${f.label}`;

        if (f.type === 'select') {
          f.options.forEach(o => add(`${name} is ${o}`, key, 'eq', o, sec.label));
        } else if (f.type === 'multiselect') {
          f.options.forEach(o => add(`${name} includes ${o}`, key, 'includes', o, sec.label));
        } else {
          add(`${name} is entered`, key, 'filled', '', sec.label,
              'True when the field is not blank');
        }
      });
    });
  });

  return out;
}

module.exports = { buildConditions };
