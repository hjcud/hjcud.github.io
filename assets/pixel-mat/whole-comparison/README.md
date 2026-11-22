# Same prompt: ordinary generation and Pixel Mat whole-image workflow

Both conditions received the exact [user prompt](common-prompt.txt), explicitly
requesting **native 16 by 16 pixel art**, at most 16 colors including transparency,
and the same [reference](reference.png). There was one fresh Codex-host built-in
image request per condition, without retries or output selection.

| Condition | Ordinary image request | Whole-image latest / central median |
| --- | --- | --- |
| Actual delivered raster | 1254x1254 | 16x16 native PNG and editable project |
| Distinct RGBA values | 58,266 | 16 including transparency |
| Partially transparent pixels | 388,043 | 0 |
| Additional native pixel painting | None | None |

The ordinary [raw output](gpt-original.png) is retained unchanged. The whole
condition uses the unchanged user brief plus [product instructions](whole-prompt.txt)
to create one actual [chip board](whole-board.png). The app and skill's shared
decoder then produces [central median](whole-median.png) and optional beta
[region allocation](whole-region.png). Both project files are supplied. The
default strategy was selected from earlier user feedback before these fresh
requests, rather than by choosing a favorable new draw.

At equal display size, fit the raw source down and enlarge the native PNG by an
integer. Do not relabel a downscaled display of the raw image as a 16px output.
Inspect the actual 1x native result as well as the enlargement.

The square board has 256 detected components but 16 mixed-pigment interiors;
the requested one-color-per-chip contract is not fully met. Both projections
still simplify the face and lantern severely. Native constraints and an editable
file are the demonstrated outcome, not a general artistic-quality improvement.

Generation used the **Codex host account's built-in image tool**. This is not an
observed ChatGPT website session or a live in-app OpenAI API request. Model ID,
seed, tokens and price are unknown. Both native outputs exactly match the app's
atomic proposal path and the standalone converter; automated API transport
checks use mocks. See [provenance](provenance.json) and [verification](verification.json).

## Artwork scope

The reference and derived examples are shown at the owner's request. Their
inclusion does not establish original creator licensing or grant an independent
asset-pack license through the editor's MIT code grant. Rights remain with their
respective holders; no exclusive generated-art rights are asserted.
