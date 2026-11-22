# Complex character at 16 pixels

This portfolio case uses the exact red-hood comparison selected by the owner on
2026-11-22. It is a source-conditioned character experiment, separate from the
Miniworld resource study. The reference is not a plain GPT control.

## Compared images

- `reference.png`: the provided full-character design.
- `face-control.png`: an earlier retained, face-oriented 16x16 control. Its
  complete generation history is not represented by the one board request.
- `central-median.png`: whole-figure planning followed by fixed chip medians.
- `region-allocation.png`: the same generated board with fixed chip interiors
  passed through the existing structure converter.

All three native PNGs exactly match their accompanying editable `.pixeltool`
projects and use the same 16-entry palette, including transparency. The two
whole-figure projections have no native pixel repairs. The original research
inputs and selected earlier control are unchanged.

## Method and observations

The recorded square-board experiment made one built-in image-generation request
conditioned on the reference. The [prompt](prompt.txt) budgets head, body, hands,
lantern and feet together on one 16x16 board. The actual output is
[`generated-board.png`](generated-board.png), a 1254x1254 opaque raster.

The decoder finds 256 principal chip components, but 50 central interiors contain
color divisions. This fails the requested one-pigment-per-chip contract. Component
count alone therefore does not prove a correct native pixel image. Empty gray
chips are removed only when connected to the edge. Two fixed local projections
map the remaining material into the retained palette. Chip detection/decoding
uses an experiment-specific helper connected to Pixel Mat's existing converters;
the board decoder is not a bundled default skill/app command.

The earlier source-identity assessment found insufficient expression and lantern
construction in the whole-figure results. A later user review liked both as
compact whole-sprite styles: their head/body balance is more coherent, the median
keeps more facial/prop differentiation, and region allocation is more abstract.
Both assessments are retained. They evaluate different criteria; neither proves
a universal winner, general method validity or production acceptance.

The portfolio section shows actual 16px and 4x images as well as integer
enlargements. The file ledger and measurements are in
[`provenance.json`](provenance.json). Model identity, tokens and price are unknown.
This publication reused recorded outputs and made no new model requests.

## Artwork scope

The reference and selected artwork are shown at the portfolio owner's request.
Their original creator/licensing is not established by this study, and the
editor's MIT code grant does not relicense them. No independent redistribution
grant or exclusive rights in generated images are asserted here.
