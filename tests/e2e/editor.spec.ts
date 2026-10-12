import { test, expect, type Page } from "@playwright/test";
const films = Array.from({ length: 15 }, (_, i) => ({
  imdbId: `tt${i + 1}`,
  title: `Film ${i + 1}`,
  year: 2000 + i,
  cast: "Test cast",
  posterMd: `https://m.media-amazon.com/test-${i}.png`,
  posterLg: `https://m.media-amazon.com/test-${i}.png`,
}));
const png = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jN1sAAAAASUVORK5CYII=",
  "base64",
);
test('search removal also removes a matching manually entered film',async({page})=>{
  await setup(page,0);
  await page.getByRole('button',{name:/Slot 1: empty/}).click();
  await page.getByRole('button',{name:'Add it manually',exact:true}).click();
  await page.getByLabel('Movie title',{exact:true}).fill('Film 1');
  await page.getByLabel('Release year (optional)').fill('2000');
  await page.getByRole('button',{name:'Add movie',exact:true}).click();
  await page.getByRole('button',{name:'Remove Film 1 from board',exact:true}).click();
  await expect(page.getByRole('progressbar')).toHaveAttribute('aria-valuenow','0');
  await expect(page.getByRole('button',{name:/Pick Film 1 \(2000\)/})).toBeEnabled();
});
async function setup(page: Page, filled = 2, size = 9) {
  await page.route("https://m.media-amazon.com/**", (route) =>
    route.fulfill({ contentType: "image/png", body: png }),
  );
  await page.route("https://v2.sg.media-imdb.com/**", (route) => {
    const query = new URL(route.request().url()).pathname
      .split("/")
      .at(-1)!
      .replace(".json", "");
    return route.fulfill({
      contentType: "application/javascript",
      body: `imdb$${query}(${JSON.stringify({ d: films.map((m) => ({ id: m.imdbId, l: m.title, y: m.year, s: m.cast, qid: "movie", i: [m.posterMd, 400, 600] })) })})`,
    });
  });
  await page.addInitScript(
    ({ films, filled, size }) => {
      if (!localStorage.getItem("movies-poster-v1"))
        localStorage.setItem(
          "movies-poster-v1",
          JSON.stringify({
            gridSize: size,
            title: "",
            background: "abyss",
            showCaptions: true,
            slots: Array.from({ length: size }, (_, i) =>
              i < filled ? films[i] : null,
            ),
          }),
        );
    },
    { films, filled, size },
  );
  await page.goto("/");
}
test("moves, removes, undo and persistence preserve slot order", async ({
  page,
}) => {
  await setup(page);
  await page
    .getByRole("button", { name: "Slot 1: Film 1 (2000)", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Move back", exact: true }),
  ).toBeDisabled();
  await page.getByRole("button", { name: "Move forward", exact: true }).click();
  await page.getByRole("button", { name: "Remove", exact: true }).click();
  await page.getByRole("button", { name: "Undo", exact: true }).click();
  await page.reload();
  await expect(
    page.getByRole("button", { name: "Slot 2: Film 1 (2000)", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Reset board", exact: true }).click();
  await page.getByRole("button", { name: "Undo", exact: true }).click();
  await expect(page.getByRole("progressbar")).toHaveAttribute(
    "aria-valuenow",
    "2",
  );
});
test("picker suggests, prevents duplicates, advances and narrows by year", async ({
  page,
}) => {
  await setup(page, 1);
  await page.getByRole("button", { name: /Slot 2: empty/ }).click();
  await expect(
    page.getByRole("button", { name: /Pick Film 1 \(2000\)/ }),
  ).toBeDisabled();
  await page.getByRole("button", { name: /Pick Film 2 \(2001\)/ }).click();
  await expect(page.getByRole("dialog")).toHaveAttribute(
    "aria-label",
    /SLOT 3 OF 9/,
  );
  await page.getByRole("searchbox").fill("Film 2002");
  await expect(
    page.getByRole("button", { name: /Pick Film 3 \(2002\)/ }),
  ).toBeVisible();
  await expect(page.getByRole("button", { name: /Pick Film 4/ })).toHaveCount(
    0,
  );
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toHaveCount(0);
});
test("complete boards export 4:5 and story PNGs and retain last poster", async ({
  page,
}) => {
  await setup(page, 8);
  await expect(
    page.getByRole("button", { name: "Create poster", exact: true }),
  ).toBeDisabled();
  await page.getByRole("button", { name: /Slot 9: empty/ }).click();
  await page.getByRole("button", { name: /Pick Film 9/ }).click();
  await page.getByLabel("Name or @handle").fill("@Kayla");
  await expect(
    page.getByText("The films that made @Kayla", { exact: true }),
  ).toBeVisible();
  for (const [name, w, h] of [
    ["Create poster", 1800, 2250],
    ["Download story (PNG)", 1080, 1920],
  ] as const) {
    const wait = page.waitForEvent("download");
    await page.getByRole("button", { name, exact: true }).click();
    const download = await wait;
    const stream = await download.createReadStream();
    const chunks: Buffer[] = [];
    for await (const c of stream!) chunks.push(Buffer.from(c));
    const bytes = Buffer.concat(chunks);
    expect(bytes.readUInt32BE(16)).toBe(w);
    expect(bytes.readUInt32BE(20)).toBe(h);
  }
  await expect(
    page.getByRole("button", { name: "Update poster", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: "View poster", exact: true }),
  ).toBeVisible();
});
test("share links carry captions name positions and background", async ({
  page,
  context,
}) => {
  await setup(page, 15, 15);
  await page.getByLabel("Name or @handle").fill("Films 🎬");
  await page.getByLabel("Show title and year").uncheck();
  await page
    .getByRole("button", { name: "Background: Lavender", exact: true })
    .click();
  await page.getByRole("button", { name: "Share board", exact: true }).click();
  const url = await page.getByLabel("Shareable board URL").inputValue();
  const recipient = await context.newPage();
  await recipient.goto(url);
  await expect(recipient.getByRole("progressbar")).toHaveAttribute(
    "aria-valuenow",
    "15",
  );
  await expect(recipient.getByLabel("Show title and year")).not.toBeChecked();
  await recipient.getByLabel("Name or @handle").fill("Changed");
  await recipient.reload();
  await expect(recipient.getByLabel("Name or @handle")).toHaveValue("Changed");
});
test("manual film and uploaded poster survive backup without exposing image in share", async ({
  page,
}) => {
  await setup(page, 0);
  await page.getByRole("button", { name: /Slot 1: empty/ }).click();
  await page
    .getByRole("button", { name: "Add it manually", exact: true })
    .click();
  await page.getByLabel("Movie title", { exact: true }).fill("Local film");
  await page.getByLabel("Release year (optional)").fill("1999");
  await page
    .getByLabel("Cover image (optional)")
    .setInputFiles({ name: "poster.png", mimeType: "image/png", buffer: png });
  await page.getByRole("button", { name: "Add movie", exact: true }).click();
  await page.keyboard.press("Escape");
  await page.getByRole("button", { name: "Share board", exact: true }).click();
  const url = await page.getByLabel("Shareable board URL").inputValue();
  expect(url).not.toContain("data:");
  await page.keyboard.press("Escape");
  const wait = page.waitForEvent("download");
  await page
    .getByRole("button", { name: "Back up board", exact: true })
    .click();
  const d = await wait;
  const stream = await d.createReadStream();
  const chunks: Buffer[] = [];
  for await (const c of stream!) chunks.push(Buffer.from(c));
  const backup = Buffer.concat(chunks);
  expect(JSON.parse(backup.toString()).slots[0].posterLg).toMatch(
    /^data:image/,
  );
  await page.getByRole("button", { name: "Reset board", exact: true }).click();
  await page
    .getByLabel("Restore board from JSON")
    .setInputFiles({
      name: "board.json",
      mimeType: "application/json",
      buffer: backup,
    });
  await expect(
    page.getByRole("button", {
      name: "Slot 1: Local film (1999)",
      exact: true,
    }),
  ).toBeVisible();
});
test("desktop dragging swaps film positions", async ({ page }, info) => {
  test.skip(info.project.name === "mobile", "Touch reordering uses arrows");
  await setup(page);
  await page
    .getByRole("button", { name: "Slot 1: Film 1 (2000)", exact: true })
    .dragTo(
      page.getByRole("button", { name: "Slot 2: Film 2 (2001)", exact: true }),
    );
  await expect(
    page.getByRole("button", { name: "Slot 1: Film 2 (2001)", exact: true }),
  ).toBeVisible();
});
