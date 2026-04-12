---
name: Auth test patterns for this project
description: Selectors, validation message text, better-auth endpoint, shadcn/ui label strategy, and known edge cases for auth tests
type: project
---

## Selector strategy for shadcn/ui components

shadcn `Input` renders a standard `<input>` with the `id` wired to the adjacent `<Label htmlFor>`. This means `page.getByLabel('Email')` and `page.getByLabel('Password')` work perfectly — no test IDs needed.

Button text: `'Sign in'` (idle), `'Signing in…'` (submitting). Use `getByRole('button', { name: /sign in/i })` to match both states, or the exact string when asserting the specific state.

Sign out button: `getByRole('button', { name: 'Sign out' })` — rendered in `Navbar.tsx`.

Users nav link: `getByRole('link', { name: 'Users' })` — only present for admins.

## Validation error messages (from Zod schema in LoginPage.tsx)

- Empty email: `'Email is required'`
- Invalid email format: `'Invalid email address'`
- Empty password: `'Password is required'`
- Server/root errors: rendered in a `<p>` inside `<form>` — use `page.locator('form p').last()` to avoid coupling to CSS class names since the exact server error message from better-auth can vary.

## Page content for assertions

- Login page heading: `getByRole('heading', { name: 'Sign in' })`
- Home page heading: `getByRole('heading', { name: 'Dashboard' })` (HomePage.tsx)
- Users page heading: `getByRole('heading', { name: 'Users' })` (UsersPage.tsx)
- Navbar brand: `getByText('Helpdesk')` (always visible when logged in)

## Route guard behaviour (from App.tsx)

- `ProtectedLayout`: no session → `<Navigate to="/login" replace />`
- `AdminLayout`: no session → `/login`; session with role !== 'admin' → `/` (home, not login)

## better-auth API endpoint

Sign-in: `POST http://localhost:3002/api/auth/sign-in/email`
Body: `{ "email": "...", "password": "..." }` (JSON)
Success: 200 + Set-Cookie
Failure: non-200

## Loading state interception

Use `page.route('**/api/auth/sign-in/email', async (route) => { /* delay */ await route.continue(); })` to freeze the request and observe the `isSubmitting` button state. The button becomes disabled and its text changes to `'Signing in…'` during submission.

## test.use() placement rule

`test.use({ storageState })` MUST be called at the `test.describe` level, never inside a `test()` body. Putting it inside a test body is silently ignored by Playwright.
