#!/usr/bin/env node
// Local evidence replay. Requires the complete built/extracted Pixel Mat skill.
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import assert from 'node:assert/strict';
import { pathToFileURL } from 'node:url';
import { createRequire } from 'node:module';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';

const root = import.meta.dirname;
const skill = path.resolve(process.argv[2] || path.join(root, '../../dist/skills/pixel-mat'));
const runtime = async file => import(pathToFileURL(path.join(skill, 'runtime', file)).href);
const { PNG } = createRequire(path.join(skill, 'package.json'))('pngjs');
const { sampleDraft, reduceDraftColors } = await runtime('electron/pixel-conversion.mjs');
const { contentBounds } = await runtime('electron/source-structure.mjs');
const { convertSpriteDrafts } = await runtime('electron/sprite-conversion.mjs');
const { rgbaToDocument, documentRGBA, validateDocument, applyProposal } = await runtime('src/core.mjs');
const work = await fs.mkdtemp(path.join(os.tmpdir(), 'pixel-mat-miniworld-'));
const png = async file => PNG.sync.read(await fs.readFile(path.join(root, file)));
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const rows = [];
const record = (name, actual, expected) => {
  assert.equal(actual.width, expected.width, name + ' width');
  assert.equal(actual.height, expected.height, name + ' height');
  assert.deepEqual(Buffer.from(actual.data), Buffer.from(expected.data), name + ' pixels');
  rows.push({ name, exactRgbaMatch: true });
};
for (const [id, w, h, colors, pivot] of [
  ['citizen', 16, 16, 16, 8], ['tree', 24, 32, 16, 12], ['house', 32, 40, 64, 16],
]) {
  const cli = path.join(skill, 'scripts/pixel-mat.mjs');
  const project = path.join(work, id + '.pixeltool');
  const native = path.join(work, id + '.png');
  for (const args of [
    ['prepare', '--input', path.join(root, id, 'draft.png'), '--output', project,
      '--width', String(w), '--height', String(h), '--colors', String(colors),
      '--method', 'features', '--fit', 'frame'],
    ['preview', '--input', project, '--output', native, '--scale', '1'],
  ]) {
    const result = spawnSync(process.execPath, [cli, ...args], { encoding: 'utf8' });
    assert.equal(result.status, 0, result.stderr || result.stdout);
  }
  record(id + ':current-default', PNG.sync.read(await fs.readFile(native)), await png(id + '/cli-default.png'));
  const raw = await png(id + '/draft.png');
  const baseline = await png(id + '/baseline.png');
  const crop = contentBounds(raw, 128), box = contentBounds(baseline);
  const cropped = { width: crop.width, height: crop.height, data: Buffer.alloc(crop.width * crop.height * 4) };
  for (let y = 0; y < crop.height; y++) cropped.data.set(raw.data.subarray(
    ((crop.y + y) * raw.width + crop.x) * 4,
    ((crop.y + y) * raw.width + crop.x + crop.width) * 4), y * crop.width * 4);
  const scale = Math.min(box.width / crop.width, box.height / crop.height);
  const width = Math.max(1, Math.round(crop.width * scale));
  const height = Math.max(1, Math.round(crop.height * scale));
  const sample = sampleDraft(cropped, width, height, 128, 'features');
  const reduced = reduceDraftColors(sample, colors - 1, new Uint8Array(width * height).fill(1));
  let mass = 0, footX = 0;
  for (let y = Math.max(0, height - 2); y < height; y++) for (let x = 0; x < width; x++)
    if (reduced[(y * width + x) * 4 + 3]) { mass++; footX += x + .5; }
  const left = Math.max(0, Math.min(w - width, Math.round(pivot - (mass ? footX / mass : width / 2))));
  const top = box.y + box.height - height;
  const data = Buffer.alloc(w * h * 4);
  for (let y = 0; y < height; y++) data.set(reduced.subarray(y * width * 4, (y + 1) * width * 4), ((top + y) * w + left) * 4);
  let document = validateDocument(rgbaToDocument(w, h, data, 'Registered generated ' + id));
  record(id + ':registered', { width: w, height: h, data: documentRGBA(document, false) },
    await png(id + (id === 'house' ? '/registered-before-palette.png' : '/first-registered.png')));
  if (id === 'citizen') {
    const plan = JSON.parse(await fs.readFile(path.join(root, id, 'native-edit-plan.json')));
    assert.equal(sha(await fs.readFile(path.join(root, id, 'first-registered.pixeltool'))), plan.sourceSHA256,
      'Retained native-edit source fingerprint');
    document = applyProposal(document, plan.mask, plan.proposal, { alphaLock: false, paletteOnly: true }).document;
    record(id + ':native-edit', { width: w, height: h, data: documentRGBA(document, false) }, await png(id + '/edited-before-palette.png'));
    const palette = rgbaToDocument(w, h, baseline.data).palette;
    document = convertSpriteDrafts([{ width: w, height: h, data: documentRGBA(document, false) }],
      { width: w, height: h, method: 'nearest', fit: 'frame', palette });
  } else if (id === 'house') document = convertSpriteDrafts([{ width: w, height: h, data: documentRGBA(document, false) }],
    { width: w, height: h, method: 'nearest', fit: 'frame', colors: 33 });
  record(id + ':selected', { width: w, height: h, data: documentRGBA(document, false) }, await png(id + '/native.png'));
  const retained = validateDocument(JSON.parse(await fs.readFile(path.join(root, id, 'native.pixeltool'))));
  record(id + ':retained-project', { width: w, height: h, data: documentRGBA(retained, false) }, await png(id + '/native.png'));
}
const modules = {};
for (const file of ['scripts/pixel-mat.mjs', 'runtime/electron/pixel-conversion.mjs', 'runtime/electron/sprite-conversion.mjs', 'runtime/src/core.mjs'])
  modules[file] = sha(await fs.readFile(path.join(skill, file)));
const result = { schemaVersion: 1, checks: rows, passed: rows.length, modelCalls: 0, modules };
await fs.writeFile(path.join(work, 'verification.json'), JSON.stringify(result, null, 2) + '\n');
console.log(JSON.stringify(result, null, 2));
// Temporary outputs remain outside the repository for inspection; sources are never replaced.
