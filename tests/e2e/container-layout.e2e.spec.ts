import { expect, test } from '@playwright/test'

import { heading, richTextDefault } from '../../src/fields/richTextDefault'

// Run after the local migration and `npm run seed`.
test('containers keep their layout and rich text through editing, saving and publishing', async ({
  page,
}) => {
  test.setTimeout(180_000)
  page.setDefaultTimeout(15_000)
  page.setDefaultNavigationTimeout(90_000)
  await page.setViewportSize({ width: 1600, height: 1000 })
  const origin = 'http://localhost:3000'
  const login = await page.request.post(`${origin}/api/users/login`, {
    data: { email: 'root@admin.com', password: process.env.SEED_ADMIN_PASSWORD ?? '2026root' },
  })
  expect(login.ok()).toBeTruthy()
  const tenants = await (
    await page.request.get(`${origin}/api/tenants?sort=createdAt&limit=1`)
  ).json()
  const slug = `container-check-${Date.now()}`
  const content = (id: string, text: string) => ({
    id,
    blockType: 'content',
    columns: [{ size: 'full', richText: richTextDefault([heading(text, 'h2')]) }],
  })
  const created = await page.request.post(`${origin}/api/pages`, {
    data: {
      title: 'Container layout check',
      slug,
      generateSlug: false,
      tenant: tenants.docs[0].id,
      _status: 'published',
      layout: [
        {
          id: 'layout-row',
          blockType: 'container',
          direction: 'row',
          gap: 'lg',
          blocks: [
            {
              id: 'left-column',
              blockType: 'container2',
              blocks: [
                {
                  id: 'third-level',
                  blockType: 'container3',
                  blocks: [
                    {
                      id: 'fourth-level',
                      blockType: 'container4',
                      blocks: [content('left-text', 'Container left')],
                    },
                  ],
                },
              ],
            },
            {
              id: 'right-column',
              blockType: 'container2',
              blocks: [content('right-text', 'Container right')],
            },
            { id: 'empty-column', blockType: 'container2', blocks: [] },
          ],
        },
      ],
    },
  })
  expect(created.ok(), await created.text()).toBeTruthy()
  const { doc } = await created.json()
  const errors: string[] = []
  page.on('pageerror', (error) => errors.push(error.message))
  try {
    const response = await page.goto(`${origin}/admin/collections/pages/${doc.id}`)
    expect(response?.status()).toBe(200)
    const canvas = page.frameLocator('.visual-editor iframe')
    const row = canvas.locator('[data-puck-dropzone="layout-row:blocks"]')
    await expect(row).toHaveCSS('display', 'flex', { timeout: 90_000 })
    await expect(row).toHaveCSS('flex-direction', 'row')
    await expect(row).toHaveCSS('gap', '64px')
    await expect(row.locator(':scope > [data-puck-component]')).toHaveCount(3)
    await expect(canvas.getByRole('heading', { name: 'Container left' })).toBeVisible()
    await expect(canvas.locator('[data-puck-component^="editor-placeholder-"]')).toHaveCount(1)
    await expect(page.getByRole('button', { name: 'Save draft', exact: true })).toBeDisabled()

    await page.getByRole('button', { name: 'Mobile', exact: true }).click()
    await expect(row).toHaveCSS('flex-direction', 'column')
    await expect(row).toHaveCSS('gap', '48px')
    await page.getByRole('button', { name: 'Desktop', exact: true }).click()
    await expect(row).toHaveCSS('flex-direction', 'row')

    // An empty column must have a usable drop target, not a zero-height slot.
    const emptySlot = canvas.locator('[data-puck-dropzone="empty-column:blocks"]')
    await expect(emptySlot).toHaveCSS('min-height', '112px')
    const source = canvas.locator('[data-puck-component="right-text"]')
    await source.click()
    let from: Awaited<ReturnType<typeof source.boundingBox>> = null
    let to: Awaited<ReturnType<typeof emptySlot.boundingBox>> = null
    await expect.poll(async () => (from = await source.boundingBox())).not.toBeNull()
    await expect.poll(async () => (to = await emptySlot.boundingBox())).not.toBeNull()
    await page.mouse.move(from!.x + from!.width / 2, from!.y + from!.height / 2)
    await page.mouse.down()
    await page.mouse.move(from!.x + from!.width / 2 + 12, from!.y + from!.height / 2, { steps: 3 })
    await expect(canvas.locator('[data-dnd-dragging]').first()).toBeAttached()
    await page.mouse.move(to!.x + to!.width / 2, to!.y + to!.height / 2, { steps: 15 })
    // Puck debounces transitions between nested drop zones before enabling the target.
    await expect(emptySlot).toHaveClass(/DropZone--isEnabled/)
    await page.mouse.move(to!.x + to!.width / 2 + 1, to!.y + to!.height / 2)
    await page.mouse.up()
    await expect(emptySlot.locator('[data-puck-component="right-text"]')).toHaveCount(1)

    // Select the deepest Content block and use Payload's own Lexical drawer.
    await canvas.getByRole('heading', { name: 'Container left' }).click()
    await page.locator('.visual-editor aside').getByText('full', { exact: true }).click()
    await page.getByRole('button', { name: 'Edit text', exact: true }).click()
    const text = page.locator('.drawer [contenteditable="true"]').first()
    await expect(text).toBeVisible({ timeout: 30_000 })
    await text.fill('Edited nested content')
    await page.getByRole('button', { name: 'Done', exact: true }).click()
    await expect(canvas.getByText('Edited nested content', { exact: true })).toBeVisible()
    const placeholder = canvas.locator('[data-puck-component^="editor-placeholder-"]')
    await placeholder.locator('button').filter({ hasText: 'Add a block or a layout' }).click()
    await page.getByRole('button', { name: /^Two columns/ }).click()
    await page.getByRole('button', { name: 'Add to page', exact: true }).click()
    await expect(canvas.locator('[data-puck-component^="editor-placeholder-"]')).toHaveCount(2)
    await page.getByRole('button', { name: 'Save draft', exact: true }).click()
    await expect(page.getByText('Draft saved', { exact: true })).toBeVisible()
    await page.reload()
    await expect(canvas.getByText('Edited nested content', { exact: true })).toBeVisible({
      timeout: 90_000,
    })
    await expect(row).toHaveCSS('flex-direction', 'row')
    await expect(row.locator(':scope > [data-puck-component]')).toHaveCount(3)
    const saved = await (await page.request.get(`${origin}/api/pages/${doc.id}?draft=true`)).json()
    expect(saved.layout).toHaveLength(2)
    expect(saved.layout[1].blocks[0].blocks).toHaveLength(2)
    expect(
      saved.layout[1].blocks[0].blocks.map((column: { blocks: unknown[] }) => column.blocks),
    ).toEqual([[], []])
    await page.getByRole('button', { name: 'Publish', exact: true }).click()
    await expect(page.getByText('Published', { exact: true })).toBeVisible()

    await page.goto(`${origin}/${slug}`)
    await expect(page.getByText('Edited nested content', { exact: true })).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Container right' })).toBeVisible()
    expect(errors).toEqual([])
  } finally {
    await page.request.delete(`${origin}/api/pages/${doc.id}`, { timeout: 15_000 })
  }
})
