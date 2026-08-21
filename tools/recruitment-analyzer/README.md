# Recruitment Analyzer — configurable, zero-data screening tool

`public/recruitment-analyzer.html` is a generated, self-contained file (~12 MB:
pdf.js, SheetJS, Tesseract OCR and ExcelJS are inlined). **Do not hand-edit it**
— edit these sources and rebuild.

## The split: Tool vs Confidential Data

The tool ships with **no hiring framework of its own**. At runtime the user
uploads a **configuration workbook** (`.xlsx`) that defines the levels, skills,
scoring and interview questions. Both the framework and the resumes live only in
browser memory and are erased on refresh/close/Reset. There is no server, no
upload, no persistence — the separation is structural, not a policy.

    THE TOOL (this HTML)                 CONFIDENTIAL DATA (never in the file)
    - fixed engine  [ENGINE]             - configuration workbook (.xlsx)
    - user interface [UI]                - resumes (PDF)
    - config loader [CONFIG]             both held in memory only, wiped on reload
    - report builder [CONFIG]

Comment tags used throughout the code: `[ENGINE]` fixed logic (no data),
`[CONFIG]` reads the uploaded framework, `[DATA]` a point where confidential
data lives (memory only), `[UI]` presentation.

## Source files

| file | role |
|---|---|
| `app_head.html` | design system (enterprise, light-first) + page shell |
| `app_body.html` | the three screens: load framework → add resumes → dashboard |
| `frag_extract.js` | `[ENGINE]` PDF text extraction + on-device OCR (reused, proven) |
| `frag_names.js` | `[ENGINE]` name / phone / email detection (reused, proven) |
| `app_01_state.js` | `[DATA]` in-memory state + reset + theme + screen flow |
| `app_02_config.js` | `[CONFIG]` workbook parser + validator → CONFIG model |
| `app_03_scoring.js` | `[ENGINE+CONFIG]` generic skill / behavioral / competency scoring |
| `app_04_analyze.js` | `[ENGINE]` screening flags + analysis orchestration |
| `app_05_render.js` | `[UI]` dashboard rendering |
| `app_06_export.js` | `[CONFIG]` evaluation kit built live from the framework |
| `app_07_wiring.js` | `[UI]` event wiring + the two data-ingest points |
| `sample-config.js` + `gen-template.js` | build the blank config template (neutral sample) |
| `assemble.py` | inlines libraries + engine + modules → `public/recruitment-analyzer.html` |
| `model.py` + `render_svg.py` / `render_vsdx.py` / `render_vdx.py` | the architecture diagram (one model → SVG/PDF twin + Visio) |

The date/experience engine is shared verbatim with the earlier analyzer
(`tools/candidate-analyzer/engine.js`), inlined by `assemble.py`.

## Build

```bash
node gen-template.js     # writes Recruitment_Framework_Config_TEMPLATE.xlsx
python3 assemble.py      # writes public/recruitment-analyzer.html
```

`assemble.py` expects the vendored libraries (`lib/`, `assets/`) and
`engine.js` beside it — they are large and not committed here.

## Why the scoring is config-driven

The earlier single-department build hard-coded skill indices (e.g. "skills 11
and 12 are the codes"). That cannot work for an arbitrary framework, so the
behavioral and competency estimators are driven by per-row keywords, an optional
linked skill-group, and a years-weight — all supplied in the workbook. The
engine contains zero company-specific values (verified by grep at build time).
