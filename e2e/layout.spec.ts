// What lines up, measured (e2e/layout.ts). Added November 11, 2026, when the Script page was found with Choose Ideas
// buttons sitting on the labels of the row under them, boxes in one row starting at different heights, hints touching
// their boxes and a select 2 pixels shorter than the text box beside it. To measure every screen the journeys reach,
// run them with SLATE_LAYOUT_SWEEP=<file> (e2e/test.ts).
import { expect, test } from './test';
import { freshStart, nav, quickLife, section } from './helpers';
import { layoutFindings } from './layout';

test('the script page lines up: boxes level in each row, buttons under their boxes, nothing touching', async ({ page }, info) => {
  test.skip(!['desktop', 'phone', 'iphone-15-pro-max'].includes(info.project.name), 'Runs on desktop, phone and one WebKit iPhone emulation.');
  await freshStart(page);
  await quickLife(page, 'gb-london', '2026-01-05');
  await nav(page, 'Projects');
  await page.getByRole('button', { name: 'New Script' }).first().click();
  // The New Script form: a column of fields, a place picker and a row of budgets.
  await page.getByLabel('Working Title').fill('Last Shift In Briar Hollow');
  expect(await layoutFindings(page), 'New Script').toEqual([]);
  await page.getByLabel('Format').selectOption({ label: 'Feature Film' });
  await page.getByRole('radio', { name: /^Low Budget:/ }).check();
  await page.getByRole('button', { name: 'Create Project' }).click();
  await expect(page.getByRole('heading', { name: 'Last Shift In Briar Hollow', level: 1 })).toBeVisible();
  await section(page, 'Script');
  // An idea with its five scenes, so the page has every card it can have this early.
  await page.getByRole('button', { name: 'Choose A Starting Idea' }).click();
  const picker = page.getByRole('dialog', { name: 'Choose A Starting Idea' });
  await picker.getByRole('tab', { name: 'Browse All' }).click();
  await picker.getByRole('button', { name: /^A Town That Cannot Sleep/ }).click();
  const idea = page.getByRole('dialog', { name: 'A Town That Cannot Sleep' });
  for (const box of await idea.getByRole('group', { name: 'Scenes It Offers' }).getByRole('checkbox').all()) await box.check();
  expect(await layoutFindings(page), 'the idea, open').toEqual([]);
  await idea.getByRole('button', { name: 'Apply', exact: true }).click();
  await expect(page.locator('article.scene-card')).toHaveCount(5);
  expect(await layoutFindings(page), 'Script').toEqual([]);
  // A scene opened for editing: its fields, its dialogue row and its production needs.
  await page.getByRole('button', { name: 'Edit Scene' }).first().click();
  await expect(page.getByRole('heading', { name: 'Production Needs' })).toBeVisible();
  expect(await layoutFindings(page), 'a scene, open').toEqual([]);
  await section(page, 'Characters');
  expect(await layoutFindings(page), 'Characters').toEqual([]);
});

// The rules themselves, on a row made for the purpose: the Script page above only shows a fault when its hints happen
// to wrap to different heights at the window's width. Two fields with a button under each and hints of one line and of
// several, a field with a taller box, and a tall cell that is not a field.
test('a row of a form shares its lines: labels, boxes and buttons level, each hint under its box, a tall neighbour changing none of it', async ({ page }, info) => {
  test.skip(!['desktop', 'iphone-15-pro-max'].includes(info.project.name), 'Chromium and WebKit, both at a width that puts the fields side by side.');
  await page.setViewportSize({ width: 1100, height: 800 });
  await freshStart(page);
  const m = await page.evaluate(() => {
    const host = document.createElement('div');
    host.style.cssText = 'width:900px;padding:16px';
    const idea = (id: string, label: string, hint: string, box: string) => `<div class="idea-field"><div class="field field-std"><label for="${id}">${label}</label><span class="hint">${hint}</span><div class="field-box">${box}</div></div><span class="ideas-row"><button type="button" class="btn btn-sm">Choose Ideas</button></span></div>`;
    host.innerHTML = `<div class="grid grid-3 form">
      ${idea('p1', 'One', 'Short.', '<input id="p1" type="text">')}
      ${idea('p2', 'Two', 'A long hint that runs to several lines in a narrow column. '.repeat(4), '<select id="p2"><option>Any</option></select>')}
      <div class="field field-std"><label for="p3">Three</label><span class="hint">Under its box.</span><div class="field-box"><textarea id="p3"></textarea></div></div>
      <div style="height:520px">A tall cell that is not a field.</div>
      <div class="field field-std"><label for="p4">Four</label><div class="field-box"><input id="p4" type="text"></div></div>
    </div>`;
    document.body.prepend(host);
    const r = (el: Element | null) => { const b = el!.getBoundingClientRect(); return { top: Math.round(b.top * 10) / 10, bottom: Math.round(b.bottom * 10) / 10, height: Math.round(b.height * 10) / 10 }; };
    const of = (id: string) => { const box = host.querySelector(`#${id}`)!; const field = box.closest('.field')!; return { label: r(field.querySelector('label')), box: r(box), hint: field.querySelector('.hint') ? r(field.querySelector('.hint')) : null, button: field.parentElement!.querySelector('.ideas-row button') ? r(field.parentElement!.querySelector('.ideas-row button')) : null }; };
    return { one: of('p1'), two: of('p2'), three: of('p3'), four: of('p4') };
  });
  const level = (a: number, b: number, what: string) => expect(Math.abs(a - b), what).toBeLessThanOrEqual(1);
  // One row: the first three fields and the tall cell. The fourth field starts the next.
  level(m.one.label.top, m.two.label.top, 'labels'); level(m.one.label.top, m.three.label.top, 'labels');
  level(m.one.box.top, m.two.box.top, 'boxes'); level(m.one.box.top, m.three.box.top, 'boxes');
  level(m.one.button!.top, m.two.button!.top, 'the buttons under the boxes');
  level(m.one.box.height, m.two.box.height, 'a text box and a select');
  // A label sits right on its box whatever stands beside it: the tall cell's height goes under the fields, not into them.
  for (const f of [m.one, m.two, m.three]) { expect(f.box.top - f.label.bottom).toBeGreaterThanOrEqual(3); expect(f.box.top - f.label.bottom).toBeLessThanOrEqual(6); }
  // The buttons are right under the row's boxes (under the tallest of them), and a hint is under its button, or under
  // its box where there is no button.
  const boxes = Math.max(m.one.box.bottom, m.two.box.bottom, m.three.box.bottom);
  for (const f of [m.one, m.two]) { expect(f.button!.top - boxes).toBeGreaterThanOrEqual(4); expect(f.button!.top - boxes).toBeLessThanOrEqual(10); expect(f.hint!.top).toBeGreaterThanOrEqual(f.button!.bottom + 3); }
  expect(m.three.hint!.top - m.three.box.bottom).toBeGreaterThanOrEqual(3);
  expect(m.three.hint!.top - m.three.box.bottom).toBeLessThanOrEqual(8);
  // The next row starts clear of everything in this one.
  expect(m.four.label.top).toBeGreaterThanOrEqual(Math.max(m.two.hint!.bottom, m.three.hint!.bottom) + 12);
  expect(m.four.label.top).toBeGreaterThan(m.one.label.top + 520);
});
