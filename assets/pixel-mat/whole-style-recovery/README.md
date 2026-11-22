# Retaining the preferred whole-chip result

The user preferred the earlier Whole-chip central median. Its exact accepted
board and fixed palette are replayed through the current app/skill decoder.
Both central median and region allocation reproduce the retained RGBA exactly.
No new generation, manual repaint, guessed grid or relaxed validator produces
the accepted output. See [provenance](provenance.json) and [audit](audit.json).

## Why the later showcase changed

The later same-user-prompt experiment generated a NEW board. Its character uses
87 cells rather than the accepted board's 99. The original subject-specific
request reserved the upper six rows for the head and the rest for the body,
with explicit fringe/skin, closed-mouth, hand/lantern and boot allocation.
Workflow 1 generalized those directions and made facial marks optional. The
accepted conversion also pinned a previous palette; the later trial fitted
a new one. The decoder itself reproduces BOTH sets exactly. Replacing only
the palette does not restore missing shapes: alpha differs in 16 cells.
Prompt changes and sampling variation cannot be causally separated from these
two uncontrolled draws. This is a documented regression, not a model benchmark.

## What changed

Workflow 2 restores explicit native landmark allocation before optional
texture/highlights, with a subject-dependent whole-body budget and contrasting
face/prop roles. It reserves green key colors for gaps. Keep accepted boards,
palettes and prompts; a sampler name alone cannot reproduce a drawing.
Never replace accepted art with a fresh draw solely because dimensions pass.

Two revised Codex-host generations are retained here, with their actual prompts.
Both failed the unchanged 256-component gate; neither is an improved native
showcase. A local separator-based reading experiment still lost facial marks
at the central median and was discarded. No such fallback ships. These failures
remain evidence rather than being hidden by selecting a more flattering result.

## Exact local replay

Run from this folder with the complete current skill CLI:

```sh
node /path/to/pixel-mat/scripts/pixel-mat.mjs whole-prepare --input accepted-board.png --width 16 --height 16 --colors 16 --palette palette.json --output replay.pixeltool
node /path/to/pixel-mat/scripts/pixel-mat.mjs preview --input replay.pixeltool --scale 1 --output replay.png
```

Add --strategy chip-region for the beta projection. Existing outputs refuse
replacement. The automated regression compares both native PNGs byte-for-byte
at RGBA level, not aesthetic quality. App API transport checks remain mocked.

The separate [identical-user-prompt experiment](../whole-comparison/README.md)
retains its original inputs, first outputs and limitations unchanged. Its
ordinary output explicitly requested native 16x16. The preferred historic
output here has a different generation prompt and is never substituted into
that controlled-condition pair.

## Artwork scope

These owner-selected reference-conditioned images are case-study evidence, not
a separately licensed asset pack. The editor's MIT software grant does not
replace the rights in the source artwork or assert exclusive generated rights.
