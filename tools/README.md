# tools

Generator for `MERIDIAN_Master_Checklist_TEMPLATE.xlsx`, the master
checklist workbook.

The template's Field Reference sheet lists every filter key a checkpoint
rule can test. Those keys are derived from the datasheet definition
(`S1_DS_SECTIONS`) inside `index.html`, so the template is generated from
the app rather than maintained by hand — if the datasheet gains a field,
regenerate and the new key appears.

    npm install exceljs
    node make_master.js

- `extract.js`  — pulls `S1_DS_SECTIONS` and `MRD_ICONS` out of `index.html`
- `keys.js`     — derives the readable filter keys (`design.insulation.required`, `nozzle[].rating`, …)
- `make_master.js` — writes the workbook
