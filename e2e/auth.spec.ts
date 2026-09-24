import { test, expect, type Page } from "@playwright/test";
import template from '../src/public-data/foundation.json' with { type: 'json' };
const users = {
  "first@example.test": {
    id: "11111111-1111-4111-8111-111111111111",
    email: "first@example.test",
    aud: "authenticated",
    role: "authenticated",
    app_metadata: {},
    user_metadata: {},
    created_at: "2026-01-01T00:00:00Z",
  },
  "second@example.test": {
    id: "22222222-2222-4222-8222-222222222222",
    email: "second@example.test",
    aud: "authenticated",
    role: "authenticated",
    app_metadata: {},
    user_metadata: {},
    created_at: "2026-01-01T00:00:00Z",
  },
};
async function login(page: Page, email: string, invalid = false) {
  await page.getByRole("textbox", { name: "Email", exact: true }).fill(email);
  if (invalid) {
    await page.getByLabel('Password', { exact: true }).fill('invalid-test-password');
    await page.getByRole("button", { name: "Sign in", exact: true }).click();
    await expect(page.locator(".toast")).toContainText("Invalid test password");
  }
  await page.getByLabel('Password', { exact: true }).fill('example-test-password');
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Start Day 1", exact: true }),
  ).toBeVisible();
}
test("MOCK API: password errors, private assigned programs, queued reconnect sync, reload and account isolation", async ({
  page,
  context,
}) => {
  let active = users["first@example.test"];
  let disconnected = false;
  const rows = new Map<string, { revision: number; payload: any }>();
  const operations = new Map<string, number>();
  await context.route("https://workout-auth-test.invalid/**", async (route) => {
    if (disconnected) {
      await route.abort("internetdisconnected");
      return;
    }
    const request = route.request();
    const path = new URL(request.url()).pathname;
    const reply = (body: unknown, status = 200) =>
      route.fulfill({
        status,
        contentType: "application/json",
        body: JSON.stringify(body),
      });
    if (path.endsWith("/token")) {
      if (request.postDataJSON().password !== 'example-test-password')
        return reply(
          { message: "Invalid test password", code: "invalid_credentials" },
          400,
        );
      active = users[request.postDataJSON().email as keyof typeof users];
      const token = [
        Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT" })).toString(
          "base64url",
        ),
        Buffer.from(
          JSON.stringify({
            sub: active.id,
            aud: "authenticated",
            role: "authenticated",
            exp: Math.floor(Date.now() / 1000) + 3600,
          }),
        ).toString("base64url"),
        "test-signature",
      ].join(".");
      return reply({
        access_token: token,
        refresh_token: "test-refresh",
        expires_in: 3600,
        token_type: "bearer",
        user: active,
      });
    }
    if (path.endsWith("/user")) return reply(active);
    if (path.endsWith("/logout")) return reply({});
    if (path.endsWith('/workout_assignments')) return reply({ definition: { ...template, version: `Assigned-${active.id}`, warmup: `Private warmup for ${active.email}` } });
    if (path.endsWith("/workout_sessions"))
      return reply(
        [...rows.values()].filter((row) => row.payload.owner === active.id),
      );
    if (path.endsWith("/save_workout")) {
      const input = request.postDataJSON();
      if (input.p_payload.owner !== active.id)
        return reply({ message: "Owner mismatch", code: "42501" }, 403);
      if (operations.has(input.p_operation))
        return reply({ revision: operations.get(input.p_operation) });
      const previous = rows.get(input.p_id);
      if (previous && previous.revision !== input.p_expected)
        return reply({ revision: previous.revision, conflict: previous });
      const revision = (previous?.revision || 0) + 1;
      rows.set(input.p_id, { revision, payload: input.p_payload });
      operations.set(input.p_operation, revision);
      return reply({ revision });
    }
    return reply({ error: `Unexpected mock request: ${path}` }, 500);
  });
  await page.goto("/");
  await login(page, "first@example.test", true);
  expect(await page.evaluate(owner => JSON.parse(localStorage.getItem(`build-program-${owner}`)!).warmup, active.id)).toBe('Private warmup for first@example.test');
  await page.getByRole("button", { name: "Start Day 1", exact: true }).click();
  await expect(page.locator(".header-status")).toContainText("Synced");
  disconnected = true;
  await context.setOffline(true);
  await page.getByTestId("set-entry").first().getByLabel("Load kg").fill("62");
  await expect(page.locator(".header-status")).toContainText("queued");
  disconnected = false;
  await context.setOffline(false);
  await expect(page.locator(".header-status")).toContainText("Synced");
  await page.reload();
  await expect(
    page.getByTestId("set-entry").first().getByLabel("Load kg"),
  ).toHaveValue("62");
  const row = [...rows.values()][0];
  row.revision++;
  row.payload = { ...row.payload, notes: "Other device revision" };
  disconnected = true;
  await context.setOffline(true);
  await page.getByTestId("set-entry").first().getByLabel("Load kg").fill("63");
  await expect(page.locator(".header-status")).toContainText("queued");
  disconnected = false;
  await context.setOffline(false);
  await expect(page.getByText("Two versions need your decision")).toBeVisible();
  await expect(
    page.getByTestId("set-entry").first().getByLabel("Load kg"),
  ).toBeDisabled();
  page.once("dialog", (dialog) => dialog.accept());
  await page
    .getByRole("button", { name: "Keep local version", exact: true })
    .click();
  await expect(page.locator(".header-status")).toContainText("Synced");
  expect([...rows.values()][0].payload.exercises[0].sets[0].load).toBe("63");
  await page.getByRole("button", { name: "Account and data" }).click();
  await page.getByRole("button", { name: "Sign out", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Sign in", exact: true }),
  ).toBeVisible();
  await login(page, "second@example.test");
  expect(await page.evaluate(owner => JSON.parse(localStorage.getItem(`build-program-${owner}`)!).warmup, active.id)).toBe('Private warmup for second@example.test');
  await expect(page.getByText('Private warmup for first@example.test')).toHaveCount(0);
  await page.getByRole("button", { name: "History", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Your first session belongs here." }),
  ).toBeVisible();
  expect(
    [...rows.values()].every(
      (row) => row.payload.owner === users["first@example.test"].id,
    ),
  ).toBe(true);
  await page.getByRole("button", { name: "Account and data" }).click();
  await page.getByRole("button", { name: "Sign out", exact: true }).click();
  await page.getByRole("button", { name: "Open local journal" }).click();
  await expect(
    page.getByRole("button", { name: "Start Day 1", exact: true }),
  ).toBeVisible();
});

test('MOCK API: invitation password setup and password recovery', async ({ page, context }) => {
  const user = users['first@example.test'];
  let passwordSaved = false;
  let recoveryRequested = false;
  await page.addInitScript(({ user }) => {
    const expires = Math.floor(Date.now() / 1000) + 3600;
    const token = [btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' })), btoa(JSON.stringify({ sub: user.id, role: 'authenticated', exp: expires })), 'test-signature'].join('.');
    localStorage.setItem('build-workout-auth', JSON.stringify({ access_token: token, refresh_token: 'test-refresh', expires_at: expires, expires_in: 3600, token_type: 'bearer', user }));
  }, { user });
  await context.route('https://workout-auth-test.invalid/**', async route => {
    const request = route.request();
    const url = new URL(request.url());
    let data: unknown = {};
    if (url.pathname.endsWith('/user')) {
      if (request.method() === 'PUT') passwordSaved = request.postDataJSON().password === 'example-new-password';
      data = user;
    } else if (url.pathname.endsWith('/workout_assignments')) data = { definition: template };
    else if (url.pathname.endsWith('/workout_sessions')) data = [];
    else if (url.pathname.endsWith('/recover')) recoveryRequested = request.postDataJSON().email === user.email && url.searchParams.get('redirect_to') === 'http://127.0.0.1:5207/?setup=password';
    else if (!url.pathname.endsWith('/logout')) throw new Error(`Unexpected request: ${url.pathname}`);
    await route.fulfill({ contentType: 'application/json', body: JSON.stringify(data) });
  });
  await page.goto('/?setup=password');
  await page.getByLabel('New password', { exact: true }).fill('example-new-password');
  await page.getByLabel('Confirm password').fill('nonmatching-password');
  await page.getByRole('button', { name: 'Save password', exact: true }).click();
  await expect(page.locator('.toast')).toContainText('Passwords must match');
  await page.getByLabel('Confirm password').fill('example-new-password');
  await page.getByRole('button', { name: 'Save password', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Start Day 1', exact: true })).toBeVisible();
  expect(passwordSaved).toBe(true);
  expect(new URL(page.url()).search).toBe('');
  await page.getByRole('button', { name: 'Account and data' }).click();
  await page.getByRole('button', { name: 'Sign out', exact: true }).click();
  await page.getByRole('textbox', { name: 'Email', exact: true }).fill(user.email);
  await page.getByRole('button', { name: 'Set or reset password', exact: true }).click();
  await expect(page.locator('.toast')).toContainText('Password email requested');
  expect(recoveryRequested).toBe(true);
});
