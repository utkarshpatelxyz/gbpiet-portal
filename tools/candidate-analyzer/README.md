# Candidate Profile Analyzer — build sources

`public/candidate-profile-analyzer.html` is a generated, self-contained file
(~12 MB: pdf.js, SheetJS, Tesseract OCR, ExcelJS and the evaluation-kit
template are all inlined). Do not hand-edit it — edit these sources and
rebuild.

| file | role |
|---|---|
| `engine.js` | date/experience engine — the single source of truth, injected at `<!--INJECT_ENGINE-->` |
| `engine.test.js` | 94 assertions covering date formats, false-positive traps and whole-CV scenarios |
| `app_template.html` | UI, scoring, rendering, Excel export |
| `assemble.py` | inlines the libraries + engine and writes the public file |

```bash
node engine.test.js     # must be green before building
python3 assemble.py     # writes public/candidate-profile-analyzer.html
```

`assemble.py` expects `lib/`, `assets/` and `template.xlsx` (the vendored
libraries and the evaluation-kit workbook) next to it; they are not committed
because of their size.

## Why the engine is structured the way it is

Experience used to be parsed by several independent regexes that each pushed
a range. That both missed formats and invented ranges (`"1998 - 2005 (7 years)"`
produced a phantom 2005→2012). It now scans a line into ordered date *atoms*
and pairs adjacent atoms only across an explicit range separator, so a
quantity like `"team of 10-15 engineers"` cannot become a date.

Classification is line-first. The previous education regex contained an
unanchored `m\.?\s?e\b` that matched the "me" inside **ASME**, silently
reclassifying most static-equipment roles as education — the cause of a
22-year CV reporting 4.6 years. Every alternative is now `\b`-anchored, and
generic engineering vocabulary is not treated as an employment signal.

The reported total reconciles three independent estimates (union of dated
roles, first→last span, and the total stated in the CV) and always exposes
which one it used, with what confidence. The dashboard's Experience audit
lists every detected range so a reviewer can reclassify, exclude, or override
it; that figure is what flows into the Excel kit.
