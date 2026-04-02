# Investigation Patterns

Common failure types and where to start hypothesis formation.

## Build / compile errors

**Signals:** tsc errors, webpack/vite failures, missing module, type errors

**Start with:**
1. Read the full error — the first line is the symptom, look for "caused by" or chained errors below
2. Is the failing import path correct? (case sensitivity, barrel exports)
3. Was a type changed without updating all callsites?
4. Is the dependency installed? (`node_modules` may need refresh)

**Common root causes:**
- Circular dependency introduced
- Named export removed from barrel file
- `tsconfig` `paths` not matching actual file structure
- Missing `"type": "module"` or wrong `moduleResolution`

---

## Runtime errors (server-side)

**Signals:** 500 responses, uncaught exceptions, process crash

**Start with:**
1. Get the full stack trace — which file and line is the first non-library frame?
2. Is `undefined` being accessed? (null chain, missing env var, async not awaited)
3. What was the last state mutation before the failure?

**Common root causes:**
- Missing `await` on async function (looks fine, returns Promise instead of value)
- Environment variable not set (works locally, fails in CI or production)
- Race condition: two async ops assuming different completion order
- Middleware order wrong (e.g. auth before body parser)

---

## Test failures

**Signals:** jest/vitest/playwright failures, assertion errors

**Start with:**
1. Is the failure in the test setup or the assertion?
2. Is the test environment different from runtime? (mocks, stubs, missing fixtures)
3. Did something change the behavior this test covers?

**Common root causes:**
- Test uses stale fixture data that no longer matches schema
- Mock not reset between tests (test order dependency)
- Test covers the old behavior; feature was intentionally changed
- Async test missing `await` on assertion

---

## Network / API errors

**Signals:** 401/403/404/422/500 on API calls, CORS errors, timeout

**Start with:**
1. Check the response body — APIs usually include an error message
2. Is the request reaching the server? (check server logs)
3. Is authentication correct? (token format, header name, cookie domain)
4. Is the request body the expected shape? (content-type, field names)

**Common root causes:**
- Token in wrong header (`Authorization: Bearer` vs `Authorization: Token`)
- CORS preflight rejected (missing allowed-origin or allowed-method)
- Request body serialized differently than server expects (snake_case vs camelCase)
- Route not registered or registered at wrong path

---

## Silent failures (no error, wrong behavior)

**Signals:** feature "works" but data is wrong, state not updating, UI not reflecting changes

**Start with:**
1. Is the code path you think is running actually running? (add a log at the top)
2. Is the data going in what you expect? (log inputs)
3. Where does the value diverge from expected?

**Common root causes:**
- Wrong variable captured in closure (stale reference)
- State mutation not triggering re-render (mutating object directly instead of spreading)
- Event handler attached to wrong element
- Conditional short-circuits unexpectedly (falsy value check catches `0` or `""`)

---

## Investigation hygiene

- **Read errors completely before forming hypotheses** — the message often names the root cause
- **One hypothesis at a time** — testing multiple simultaneously makes it impossible to know what fixed it
- **Log actual values, not just presence** — `console.log('token', token)` not `console.log('token exists', !!token)`
- **Check the obvious last** — developers assume their own code works; check it too
- **Don't fix during investigation** — fix after root cause is confirmed
