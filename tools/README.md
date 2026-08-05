# tools

Generator for `MERIDIAN_Checklist_TEMPLATE.xlsx`, the master checklist
workbook that drives the Step 2 checklist.

A checkpoint can be conditional — shown only for vessels matching some
property of the Process datasheet. Rather than asking the author to write
rules, the template offers every possible condition as a plain-English
phrase in a dropdown ("Other: Support Method is Skirt"). Those phrases are
generated from the datasheet definition (`S1_DS_SECTIONS`) in
`index.html`, so they cannot drift out of sync with the app — if the
datasheet gains a field, regenerate and the new conditions appear.

    npm install exceljs
    node make_simple.js

- `extract.js`    — pulls `S1_DS_SECTIONS` and `MRD_ICONS` out of `index.html`
- `conditions.js` — turns the datasheet into the list of filter conditions
- `make_simple.js` — writes the workbook
