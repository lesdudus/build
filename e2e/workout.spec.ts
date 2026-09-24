import { test, expect, type Page } from "@playwright/test";
import { layouts } from "../src/experience";
import { videos, videoUrl } from "../src/videos";

async function enter(page: Page) {
  await page.goto("/");
  await page.getByRole("button", { name: "Open local journal" }).click();
  await expect(page.getByRole("button", { name: "Start Day 1" })).toBeVisible();
}
async function saved(page: Page) {
  await expect(page.locator(".header-status")).toContainText(
    "Saved on this device",
  );
}
async function completeSet(page: Page) {
  const first = page.getByTestId("set-entry").first();
  await first.getByLabel("Load kg").fill("60");
  await first.getByLabel("Reps", { exact: true }).fill("10");
  await first.getByLabel("RIR", { exact: true }).fill("3");
  await first.getByLabel("Shoulder 0-10").fill("0");
  await first
    .getByRole("button", { name: "Complete set 1", exact: true })
    .click();
  await saved(page);
}
test("phone gym flow: blank actuals, local recovery, offline timer, partial finish, correction and charts", async ({
  page,
  context,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await enter(page);
  await page.getByRole("button", { name: "Start Day 1", exact: true }).click();
  await expect(page.getByTestId("set-entry")).toHaveCount(2);
  await expect(
    page.getByTestId("set-entry").first().getByLabel("Load kg"),
  ).toHaveValue("");
  await page
    .getByRole("button", { name: "Complete set 1", exact: true })
    .click();
  await expect(
    page.getByRole("status").filter({ hasText: "Record shoulder pain" }),
  ).toBeVisible();
  await page.getByLabel("Equipment / machine ID").fill("Leg press A");
  await page.getByLabel("Settings / angle / assistance").fill("Seat 3");
  await page
    .getByRole("button", { name: "Confirm setup", exact: true })
    .click();
  await page.getByRole("button", { name: "Dismiss message" }).click();
  await completeSet(page);
  await expect(page.getByRole("timer")).toContainText("1:");
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({
    path: "verification/phone-training.png",
    fullPage: true,
  });
  await page.getByTestId("set-entry").first().scrollIntoViewIfNeeded();
  await page.screenshot({ path: "verification/phone-set-entry.png" });
  await page.reload();
  await expect(
    page.getByRole("button", { name: "Reopen set 1", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByTestId("set-entry").first().getByLabel("Load kg"),
  ).toHaveValue("60");
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
  });
  await context.setOffline(true);
  await page.reload();
  await expect(
    page.getByRole("button", { name: "Reopen set 1", exact: true }),
  ).toBeVisible();
  await expect(page.getByRole("timer")).toBeVisible();
  await page
    .getByRole("combobox", { name: "Exercise", exact: true })
    .selectOption("3");
  await expect(
    page.getByRole("heading", { name: "Held for assessment", exact: true }),
  ).toBeVisible();
  await expect(page.getByTestId("set-entry")).toHaveCount(0);
  await page.getByRole("button", { name: "Finish & review" }).click();
  await page.getByLabel("Shoulder after (0-10)").fill("0");
  await saved(page);
  await page.getByRole("button", { name: "Finish partial session" }).click();
  await expect(
    page.getByRole("button", { name: "Review results" }),
  ).toBeVisible();
  await saved(page);
  await context.setOffline(false);
  await page.getByRole("button", { name: "Progress", exact: true }).click();
  await expect(
    page.getByRole("cell", { name: "60", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("cell", { name: "10", exact: true }),
  ).toBeVisible();
  await page.screenshot({
    path: "verification/phone-progress.png",
    fullPage: true,
  });
  await page.getByRole("button", { name: "History", exact: true }).click();
  await page.locator(".history-row").first().click();
  await page
    .getByTestId("set-entry")
    .first()
    .getByLabel("Reps", { exact: true })
    .fill("11");
  await page
    .getByRole("button", { name: "Complete set 1", exact: true })
    .click();
  await saved(page);
  await page.getByRole("button", { name: "Sessions", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Start Day 2", exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Day 4 Optional cardio", exact: true })
    .click();
  await page.getByRole("button", { name: "Start Day 4", exact: true }).click();
  await expect(
    page.getByRole("spinbutton", { name: "Seconds", exact: true }),
  ).toBeVisible();
  await expect(page.getByLabel("Load kg")).toHaveCount(0);
  await page
    .getByRole("spinbutton", { name: "Seconds", exact: true })
    .fill("900");
  await page.getByLabel("Shoulder 0-10").fill("0");
  await page
    .getByRole("button", { name: "Complete set 1", exact: true })
    .click();
  await saved(page);
  await page.getByRole("button", { name: "Finish & review" }).click();
  await page
    .getByRole("button", { name: "Complete session", exact: true })
    .click();
  await saved(page);
  await page.getByRole("button", { name: "Sessions", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Start Day 2", exact: true }),
  ).toBeVisible();
  expect(errors).toEqual([]);
});

test("stale tab cannot overwrite a newer local draft", async ({
  page,
  context,
}) => {
  await enter(page);
  await page.getByRole("button", { name: "Start Day 1", exact: true }).click();
  await saved(page);
  const other = await context.newPage();
  await other.goto("/");
  await expect(
    other.getByRole("heading", { name: "Leg press", exact: true }),
  ).toBeVisible();
  await page.getByTestId("set-entry").first().getByLabel("Load kg").fill("60");
  await saved(page);
  await other.getByTestId("set-entry").first().getByLabel("Load kg").fill("99");
  await expect(other.getByRole("alert")).toContainText("another tab");
  await other.getByRole("button", { name: "Reload saved version" }).click();
  await expect(
    other.getByTestId("set-entry").first().getByLabel("Load kg"),
  ).toHaveValue("60");
});
test("storage failure is visible and unsaved data is not reported as saved", async ({
  page,
}) => {
  await enter(page);
  await page.getByRole("button", { name: "Start Day 1", exact: true }).click();
  await saved(page);
  await page.evaluate(() => {
    IDBObjectStore.prototype.put = function () {
      throw new DOMException("Test disk full", "QuotaExceededError");
    };
  });
  await page.getByTestId("set-entry").first().getByLabel("Load kg").fill("99");
  await expect(page.getByRole("alert")).toContainText("Test disk full");
  await expect(page.locator(".header-status")).toContainText("Not saved");
  await expect(
    page.getByRole("button", { name: "Export unsaved draft" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Sessions", exact: true }).click();
  await expect(
    page.getByTestId("set-entry").first().getByLabel("Load kg"),
  ).toHaveValue("99");
  await page.getByRole("button", { name: "Reload saved version" }).click();
  await expect(
    page.getByTestId("set-entry").first().getByLabel("Load kg"),
  ).toHaveValue("");
});

test("next-day observation and exercise/date filters stay separate from actual set results", async ({
  page,
}) => {
  await enter(page);
  await page.getByRole("button", { name: "Start Day 1", exact: true }).click();
  await saved(page);
  await page.getByRole("button", { name: "Finish & review" }).click();
  await expect(page.getByLabel("Next-day shoulder (0-10)")).toHaveCount(0);
  await page.getByRole("button", { name: "Finish partial session" }).click();
  await saved(page);
  await page.clock.setFixedTime(Date.now() + 2 * 86400000);
  await page.getByRole("button", { name: "Review results" }).click();
  await page.getByLabel("Next-day shoulder (0-10)").fill("2");
  await saved(page);
  await page.getByRole("button", { name: "Done", exact: true }).click();
  await page.getByRole("button", { name: "History", exact: true }).click();
  await page
    .getByRole("combobox", { name: "Filter history by exercise" })
    .selectOption("Leg press");
  await expect(page.locator(".history-row")).toHaveCount(1);
  await page.getByLabel("From", { exact: true }).fill("2099-01-01");
  await expect(
    page.getByRole("heading", { name: "No sessions match these filters." }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Progress", exact: true }).click();
  await expect(page.locator(".metrics")).toContainText("0working sets");
});

test("responsive light and dark views have no horizontal overflow or missing mark", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await enter(page);
  for (const width of [320, 390, 768, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await expect(page.locator(".brand img")).toBeVisible();
    expect(
      await page
        .locator(".brand img")
        .evaluate(
          (image: HTMLImageElement) => image.complete && image.naturalWidth > 0,
        ),
    ).toBe(true);
    await page.screenshot({
      path: `verification/home-${width}.png`,
      fullPage: true,
    });
  }
  await page.setViewportSize({ width: 320, height: 780 });
  await page.getByRole("button", { name: "Start Day 1", exact: true }).click();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.goto("/?clawpilotTheme=dark");
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await expect(
    page.getByRole("heading", { name: "Leg press", exact: true }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: "verification/phone-dark.png",
    fullPage: true,
  });
  expect(errors).toEqual([]);
});

test("all ten layouts preserve drafts and timers across responsive and offline switches", async ({
  page,
  context,
}) => {
  test.setTimeout(120000);
  const externalRequests: string[] = [];
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("request", (request) => {
    if (/youtube|vimeo|ytimg|googlevideo/.test(request.url()))
      externalRequests.push(request.url());
  });
  await page.clock.setFixedTime(new Date("2026-09-20T12:00:00Z"));
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await enter(page);
  const picker = page.getByRole("combobox", { name: "Layout theme" });
  await expect(picker.locator("option")).toHaveCount(10);
  await picker.focus();
  await page.keyboard.press("Home");
  await page.keyboard.press("ArrowDown");
  await page.keyboard.press("Tab");
  await expect(picker).toHaveValue("journal");
  for (const width of [320, 390, 768, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    for (const layout of layouts) {
      await picker.selectOption(layout.id);
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
        `home ${layout.id} at ${width}`,
      ).toBe(true);
    }
  }
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole("button", { name: "Start Day 1", exact: true }).click();
  await expect(page.locator(".exercise-editor h2")).toHaveText("Leg press");
  await picker.selectOption("cockpit");
  await expect(page.locator(".cockpit-readout")).toContainText(
    "3-4prescribed RIR",
  );
  await completeSet(page);
  const timer = (await page.getByRole("timer").textContent())!;
  await page
    .getByRole("combobox", { name: "Exercise", exact: true })
    .selectOption("1");
  const first = page.getByTestId("set-entry").first();
  await first.getByLabel("Reps", { exact: true }).fill("8");
  await page.getByLabel("Equipment / machine ID").fill("High bar");
  await saved(page);
  const fingerprint = async () =>
    page.evaluate(
      () =>
        new Promise<string>((resolve, reject) => {
          const request = indexedDB.open("build-workout-v1");
          request.onerror = () => reject(request.error);
          request.onsuccess = () => {
            const database = request.result;
            const read = database
              .transaction("sessions")
              .objectStore("sessions")
              .getAll();
            read.onsuccess = () => {
              resolve(JSON.stringify(read.result));
              database.close();
            };
            read.onerror = () => reject(read.error);
          };
        }),
    );
  const before = await fingerprint();
  const desktopShapes = new Set<string>();
  for (const width of [320, 390, 768, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    for (const layout of layouts) {
      await picker.selectOption(layout.id);
      await expect(page.locator(".app")).toHaveAttribute(
        "data-layout",
        layout.id,
      );
      await expect(
        page.getByRole("heading", {
          name: "Australian row / Aussies",
          exact: true,
        }),
      ).toBeVisible();
      await expect(first.getByLabel("Reps", { exact: true })).toHaveValue("8");
      await expect(page.getByLabel("Equipment / machine ID")).toHaveValue(
        "High bar",
      );
      await expect(page.getByRole("timer")).toHaveText(timer);
      expect
        .soft(
          await page.evaluate(
            () => document.documentElement.scrollWidth <= innerWidth,
          ),
          `training ${layout.id} at ${width}`,
        )
        .toBe(true);
      const boxes = await page
        .locator(".stage-navigation, .stage-editor")
        .evaluateAll((elements) =>
          elements.map((element) => {
            const rect = element.getBoundingClientRect();
            return {
              x: Math.round(rect.x),
              y: Math.round(rect.y),
              width: Math.round(rect.width),
              height: Math.round(rect.height),
            };
          }),
        );
      const [navigation, editor] = boxes;
      expect
        .soft(
          navigation.x + navigation.width <= editor.x + 1 ||
            editor.x + editor.width <= navigation.x + 1 ||
            navigation.y + navigation.height <= editor.y + 1 ||
            editor.y + editor.height <= navigation.y + 1,
          `navigation/editor collision in ${layout.id}`,
        )
        .toBe(true);
      if (width === 1440) desktopShapes.add(JSON.stringify(boxes));
      if (width === 390 || width === 1440) {
        await page.evaluate(() => scrollTo(0, 0));
        await page.screenshot({
          path: `verification/layout-${layout.id}-${width}.png`,
          fullPage: true,
        });
      }
    }
  }
  expect(desktopShapes.size).toBeGreaterThanOrEqual(8);
  expect(await fingerprint()).toBe(before);
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
  });
  await context.setOffline(true);
  for (const layout of layouts) {
    await picker.selectOption(layout.id);
    await expect(first.getByLabel("Reps", { exact: true })).toHaveValue("8");
    await expect(page.getByRole("timer")).toHaveText(timer);
    await expect(
      page.getByText("Video unavailable offline", { exact: true }),
    ).toBeVisible();
    await expect(page.getByRole("link", { name: /Watch video/ })).toHaveCount(
      0,
    );
  }
  await page.reload();
  await expect(picker).toHaveValue("compact");
  await page
    .getByRole("combobox", { name: "Exercise", exact: true })
    .selectOption("1");
  await expect(first.getByLabel("Reps", { exact: true })).toHaveValue("8");
  await expect(page.getByRole("timer")).toHaveText(timer);
  expect(await fingerprint()).toBe(before);
  expect(externalRequests).toEqual([]);
  expect(errors).toEqual([]);
});

test("video references cover every day without clearing holds or following substitutions", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await enter(page);
  const checked = new Set<string>();
  for (const day of [1, 2, 3, 4]) {
    if (day === 4)
      await page
        .getByRole("button", { name: "Day 4 Optional cardio", exact: true })
        .click();
    await page
      .getByRole("button", { name: `Start Day ${day}`, exact: true })
      .click();
    const exercises = page.getByRole("combobox", {
      name: "Exercise",
      exact: true,
    });
    await expect(exercises).toBeVisible();
    const count = await exercises.locator("option").count();
    for (let index = 0; index < count; index++) {
      const expectedName = (
        await exercises.locator("option").nth(index).innerText()
      )
        .replace(/^\d+\. /, "")
        .replace(" · HELD", "");
      await exercises.selectOption(String(index));
      await expect(page.locator(".exercise-editor h2")).toHaveText(
        expectedName,
      );
      const name = await page.locator(".exercise-editor h2").innerText();
      checked.add(name);
      await expect(
        page.getByRole("link", { name: /Watch video/ }),
      ).toHaveAttribute("href", videoUrl(videos[name]));
      await expect(
        page.getByRole("region", { name: "Exercise video" }),
      ).toContainText(videos[name].publisher);
      if (name === "Neutral-grip machine chest press") {
        await expect(
          page.getByText("Reference only: not currently prescribed.", {
            exact: true,
          }),
        ).toBeVisible();
        await expect(page.getByTestId("set-entry")).toHaveCount(0);
      }
    }
    await page.getByRole("button", { name: "Finish & review" }).click();
    await page.getByRole("button", { name: "Finish partial session" }).click();
    await saved(page);
    await expect(page.locator(".celebrate svg")).toHaveCSS(
      "animation-name",
      "arrival",
    );
    await page.emulateMedia({ reducedMotion: "reduce" });
    await expect(page.locator(".celebrate svg")).toHaveCSS(
      "animation-name",
      "none",
    );
    await page.emulateMedia({ reducedMotion: "no-preference" });
    await page.getByRole("button", { name: "Sessions", exact: true }).click();
  }
  expect(checked.size).toBe(12);
  await expect(
    page.getByRole("region", { name: "Personal milestones" }),
  ).toContainText("First page written");
  await expect(
    page.getByRole("region", { name: "Personal milestones" }),
  ).not.toContainText("Finding your rhythm");
  await page.getByRole("button", { name: "Start Day 1", exact: true }).click();
  await page.locator(".target-details summary").click();
  await page.getByRole("button", { name: "Record a substitution" }).click();
  await page.getByLabel("Actual exercise name").fill("Different machine");
  await expect(
    page.getByText("No verified video for this exercise or substitution.", {
      exact: false,
    }),
  ).toBeVisible();
  await expect(page.getByRole("link", { name: /Watch video/ })).toHaveCount(0);
});

async function openIntervalTimer(page: Page, fallback = true) {
  if (fallback)
    await page.addInitScript(() => {
      Element.prototype.requestFullscreen = async () => {
        throw new Error("Fullscreen unavailable");
      };
      Object.defineProperty(navigator, "wakeLock", {
        configurable: true,
        value: {
          request: async () => {
            throw new Error("Wake lock unavailable");
          },
        },
      });
    });
  await enter(page);
  await page.getByRole("button", { name: "Timer", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Interval timer", exact: true }),
  ).toBeVisible();
}
async function setIntervals(
  page: Page,
  exercise: string,
  rest: string,
  sets: string,
) {
  await page.getByLabel("Exercise seconds", { exact: true }).fill(exercise);
  await page.getByLabel("Rest seconds", { exact: true }).fill(rest);
  await page.getByLabel("Number of sets", { exact: true }).fill(sets);
}

test("interval timer alternates automatically, pauses precisely and never logs results", async ({
  page,
}) => {
  await page.clock.install({ time: new Date("2026-09-24T12:00:00Z") });
  await page.clock.pauseAt(new Date("2026-09-24T12:00:01Z"));
  await openIntervalTimer(page);
  await page.getByRole("button", { name: "Train", exact: true }).click();
  await page.getByRole("button", { name: "Start Day 1", exact: true }).click();
  await completeSet(page);
  const workoutSnapshot = () =>
    page.evaluate(
      () =>
        new Promise<string>((resolve, reject) => {
          const request = indexedDB.open("build-workout-v1");
          request.onerror = () => reject(request.error);
          request.onsuccess = () => {
            const database = request.result;
            const read = database
              .transaction("sessions")
              .objectStore("sessions")
              .getAll();
            read.onsuccess = () => {
              resolve(JSON.stringify(read.result));
              database.close();
            };
            read.onerror = () => reject(read.error);
          };
        }),
    );
  const workoutBefore = await workoutSnapshot();
  await page.getByRole("button", { name: "Timer", exact: true }).click();
  await page.evaluate(() => {
    const writes: string[] = [];
    (window as any).timerStorageWrites = writes;
    const original = Storage.prototype.setItem;
    Storage.prototype.setItem = function (key, value) {
      writes.push(key);
      return original.call(this, key, value);
    };
  });
  await setIntervals(page, "4", "2", "2");
  await expect(page.getByLabel("Total planned duration")).toHaveText("0:15");
  await page.getByRole("button", { name: "Start timer", exact: true }).click();
  const modal = page.getByRole("dialog", { name: "Active interval timer" });
  const countdown = page.getByRole("timer", { name: "Interval countdown" });
  await expect(modal).toBeVisible();
  await expect(modal.getByRole("status")).toHaveText("Get ready");
  await page.clock.fastForward(5000);
  await expect(modal.getByRole("status")).toHaveText("Exercise");
  await expect(countdown).toHaveText("0:04");
  await page.clock.fastForward(2000);
  await page.getByRole("button", { name: "Pause", exact: true }).click();
  await expect(modal.getByRole("status")).toHaveText("Paused");
  await page.clock.fastForward(10000);
  await expect(countdown).toHaveText("0:02");
  await page.getByRole("button", { name: "Resume", exact: true }).click();
  await page.clock.fastForward(2000);
  await expect(modal.getByRole("status")).toHaveText("Rest");
  await page.clock.fastForward(2000);
  await expect(modal.getByRole("status")).toHaveText("Exercise");
  await expect(modal.locator(".interval-set")).toHaveText("Set 2 / 2");
  await page.clock.fastForward(4000);
  await expect(modal.getByRole("status")).toHaveText("Finished");
  expect(
    await page.evaluate(() => localStorage.getItem("build-interval-run")),
  ).toBeNull();
  await page.getByRole("button", { name: "Done", exact: true }).click();
  await expect(modal).not.toBeVisible();
  await page.getByRole("button", { name: "History", exact: true }).click();
  await expect(page.locator(".history-row")).toHaveCount(1);
  await page.getByRole("button", { name: "Train", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Reopen set 1", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("timer", { name: "Rest timer", exact: true }),
  ).toBeVisible();
  expect(await workoutSnapshot()).toBe(workoutBefore);
  expect(await page.evaluate(() => (window as any).timerStorageWrites)).toEqual(
    [],
  );
});

test("interval timer has seconds-only fields, fullscreen fallback and memory-only offline operation", async ({
  page,
  context,
}) => {
  test.setTimeout(90000);
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.addInitScript(() => {
    const settings = { exercise: 90, rest: 30, sets: 7 };
    localStorage.setItem("build-interval-settings", JSON.stringify(settings));
    localStorage.setItem(
      "build-interval-run",
      JSON.stringify({ version: 1, settings, elapsed: 6000, startedAt: null }),
    );
    localStorage.setItem("timer-test-unrelated", "keep");
  });
  await page.clock.install({ time: new Date("2026-09-24T12:00:00Z") });
  await page.clock.pauseAt(new Date("2026-09-24T12:00:01Z"));
  await page.setViewportSize({ width: 390, height: 844 });
  await openIntervalTimer(page);
  await expect(
    page.getByLabel("Exercise seconds", { exact: true }),
  ).toHaveValue("45");
  await expect(page.getByLabel("Rest seconds", { exact: true })).toHaveValue(
    "20",
  );
  await expect(page.getByLabel("Number of sets", { exact: true })).toHaveValue(
    "3",
  );
  await expect(page.getByLabel("Total planned duration")).toHaveText("3:00");
  await expect(page.getByLabel(/minutes/i)).toHaveCount(0);
  expect(
    await page.evaluate(() => ({
      settings: localStorage.getItem("build-interval-settings"),
      run: localStorage.getItem("build-interval-run"),
      unrelated: localStorage.getItem("timer-test-unrelated"),
    })),
  ).toEqual({ settings: null, run: null, unrelated: "keep" });
  await setIntervals(page, "90", "120", "2");
  await expect(page.getByLabel("Total planned duration")).toHaveText("5:05");
  await expect(
    page.getByRole("button", { name: "Start timer", exact: true }),
  ).toBeEnabled();
  for (const layout of layouts) {
    await page
      .getByRole("combobox", { name: "Layout theme" })
      .selectOption(layout.id);
    await expect(
      page.getByRole("heading", { name: "Interval timer", exact: true }),
    ).toBeVisible();
  }
  await setIntervals(page, "0", "0", "1");
  await expect(
    page.getByRole("button", { name: "Start timer", exact: true }),
  ).toBeDisabled();
  await setIntervals(page, "10", "0", "2");
  for (const width of [320, 390, 1440]) {
    await page.setViewportSize({ width, height: 844 });
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await page.screenshot({
      path: `verification/interval-setup-${width}.png`,
      fullPage: true,
    });
  }
  await page.getByRole("button", { name: "Start timer", exact: true }).click();
  await page.clock.fastForward(6000);
  const modal = page.getByRole("dialog", { name: "Active interval timer" });
  await expect(modal).toContainText("Screen may dim");
  expect(await page.evaluate(() => document.fullscreenElement)).toBeNull();
  for (const size of [
    { width: 320, height: 568 },
    { width: 390, height: 844 },
    { width: 844, height: 390 },
    { width: 1440, height: 900 },
  ]) {
    await page.setViewportSize(size);
    expect(
      await modal.evaluate(
        (element) => element.scrollWidth <= element.clientWidth,
      ),
    ).toBe(true);
    const bounds = await page
      .locator(".interval-dial, .interval-controls, .interval-screen-header")
      .evaluateAll((elements) =>
        elements.map((element) => {
          const rect = element.getBoundingClientRect();
          return {
            top: rect.top,
            bottom: rect.bottom,
            left: rect.left,
            right: rect.right,
          };
        }),
      );
    for (const box of bounds) {
      expect(box.left).toBeGreaterThanOrEqual(0);
      expect(box.right).toBeLessThanOrEqual(size.width);
      expect(box.top).toBeGreaterThanOrEqual(0);
      expect(box.bottom).toBeLessThanOrEqual(size.height);
    }
    expect(
      bounds[0].bottom <= bounds[1].top || bounds[0].right <= bounds[1].left,
    ).toBe(true);
    await page.screenshot({
      path: `verification/interval-running-${size.width}.png`,
    });
  }
  await page.emulateMedia({ reducedMotion: "reduce" });
  await expect(page.locator(".interval-ring-fill")).toHaveCSS(
    "transition-duration",
    "0s",
  );
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
  });
  await context.setOffline(true);
  await page.evaluate(() =>
    window.dispatchEvent(new PageTransitionEvent("pagehide")),
  );
  await page.reload();
  await page.getByRole("button", { name: "Timer", exact: true }).click();
  await expect(
    page.getByRole("region", { name: "Interrupted timer" }),
  ).toHaveCount(0);
  await expect(modal).not.toBeVisible();
  await expect(
    page.getByLabel("Exercise seconds", { exact: true }),
  ).toHaveValue("45");
  await expect(page.getByLabel("Rest seconds", { exact: true })).toHaveValue(
    "20",
  );
  await expect(page.getByLabel("Number of sets", { exact: true })).toHaveValue(
    "3",
  );
  await page.clock.fastForward(60000);
  await expect(modal).not.toBeVisible();
  await setIntervals(page, "10", "0", "2");
  await page.getByRole("button", { name: "Start timer", exact: true }).click();
  await page.clock.fastForward(6000);
  await expect(
    page.getByRole("timer", { name: "Interval countdown" }),
  ).toHaveText("0:09");
  await page.clock.fastForward(9000);
  await expect(modal.getByRole("status")).toHaveText("Exercise");
  await expect(modal.locator(".interval-set")).toHaveText("Set 2 / 2");
  await page.clock.fastForward(10000);
  await expect(modal.getByRole("status")).toHaveText("Finished");
  await page.getByRole("button", { name: "Done", exact: true }).click();
  await expect(
    page.getByLabel("Exercise seconds", { exact: true }),
  ).toHaveValue("10");
  expect(errors).toEqual([]);
});

test("interval timer fullscreen exit preserves time, wake locks release, restart and end require confirmation", async ({
  page,
}) => {
  await page.addInitScript(() => {
    const state = { requests: 0, releases: 0 };
    (window as any).testWake = state;
    Object.defineProperty(navigator, "wakeLock", {
      configurable: true,
      value: {
        request: async () => {
          state.requests++;
          return {
            released: false,
            addEventListener() {},
            async release() {
              state.releases++;
              this.released = true;
            },
          };
        },
      },
    });
  });
  await page.clock.install({ time: new Date("2026-09-24T12:00:00Z") });
  await page.clock.pauseAt(new Date("2026-09-24T12:00:01Z"));
  await openIntervalTimer(page, false);
  await setIntervals(page, "30", "20", "1");
  await expect(page.getByLabel("Total planned duration")).toHaveText("0:35");
  await page.getByRole("button", { name: "Start timer", exact: true }).click();
  const modal = page.getByRole("dialog", { name: "Active interval timer" });
  await expect(
    page.getByRole("button", { name: "Leave fullscreen", exact: true }),
  ).toBeVisible();
  await expect(modal).toContainText("Keeping screen awake");
  await page.clock.fastForward(7000);
  await page
    .getByRole("button", { name: "Leave fullscreen", exact: true })
    .click();
  await expect(modal).toBeVisible();
  await expect(
    page.getByRole("timer", { name: "Interval countdown" }),
  ).toHaveText("0:28");
  await page.getByRole("button", { name: "Pause", exact: true }).click();
  expect(
    await page.evaluate(() => (window as any).testWake.releases),
  ).toBeGreaterThan(0);
  page.once("dialog", (dialog) => dialog.dismiss());
  await page
    .getByRole("button", { name: "Restart timer", exact: true })
    .click();
  await expect(modal.getByRole("status")).toHaveText("Paused");
  page.once("dialog", (dialog) => dialog.accept());
  await page
    .getByRole("button", { name: "Restart timer", exact: true })
    .click();
  await expect(modal.getByRole("status")).toHaveText("Get ready");
  await page.clock.fastForward(20000);
  await page.evaluate(() =>
    document.dispatchEvent(new Event("visibilitychange")),
  );
  await expect(
    page.getByRole("timer", { name: "Interval countdown" }),
  ).toHaveText("0:15");
  page.once("dialog", (dialog) => dialog.dismiss());
  await page.getByRole("button", { name: "End timer", exact: true }).click();
  await expect(modal).toBeVisible();
  await expect(modal.getByRole("status")).toHaveText("Exercise");
  page.once("dialog", (dialog) => dialog.accept());
  await page.getByRole("button", { name: "End timer", exact: true }).click();
  await expect(modal).not.toBeVisible();
  expect(
    await page.evaluate(() => localStorage.getItem("build-interval-run")),
  ).toBeNull();
});

test("switching layouts keeps a failed-save draft and editor disclosure state", async ({
  page,
}) => {
  await enter(page);
  await page.getByRole("button", { name: "Start Day 1", exact: true }).click();
  await saved(page);
  await page.locator(".target-details summary").click();
  await page.getByRole("button", { name: "Record a substitution" }).click();
  await page.evaluate(() => {
    IDBObjectStore.prototype.put = function () {
      throw new DOMException("Test layout disk full", "QuotaExceededError");
    };
  });
  await page.getByTestId("set-entry").first().getByLabel("Load kg").fill("77");
  await expect(page.getByRole("alert")).toContainText("Test layout disk full");
  for (const layout of layouts) {
    await page
      .getByRole("combobox", { name: "Layout theme" })
      .selectOption(layout.id);
    await expect(
      page.getByTestId("set-entry").first().getByLabel("Load kg"),
    ).toHaveValue("77");
    await expect(page.getByLabel("Actual exercise name")).toBeVisible();
    await expect(page.locator(".header-status")).toContainText("Not saved");
  }
});
