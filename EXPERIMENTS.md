# Experiments

| Date | Prompt version | Provider / model | Ticket id | Observed output | Problem noticed | Change made |
|------|----------------|------------------|-----------|-----------------|-----------------|-------------|
| 2026-10-14 | triage-v1 | Gemini / gemini-flash-latest | TCK-10001 | technical_bug / low, sort arrow only shows after clicking, action: reproduce and send to frontend team | None, correct | None |
| 2026-10-14 | triage-v1 | Gemini / gemini-flash-latest | TCK-10002 | technical_bug / high, intermittent 502/504 on /v2/query in production, action: escalate to Engineering/SRE | None, correct. Long ticket with logs handled well | None |
| 2026-10-14 | triage-v1 | Gemini / gemini-flash-latest | TCK-10003 | technical_bug / low, typo on Notifications preferences page, action: log as minor UI bug | None, correct, even with a vague subject ("Error") | None |
| 2026-10-14 | triage-v1 | Gemini / gemini-flash-latest | TCK-10004 | feature_request / low, wants dashboards exported as PowerPoint, action: add to roadmap + thank user | Ticket had no subject; still correct | None |
| 2026-10-14 | triage-v1 | Gemini / gemini-flash-latest | TCK-10005 | billing / medium, add PO-8006 to future invoices, action: update billing profile | Priority probably too high: routine admin request, nothing broken, should likely be low | None |
| 2026-10-14 | triage-v1 | Gemini / gemini-flash-latest | TCK-10006 | technical_bug / high, production workspace deleted, action: escalate for backup recovery | Category probably wrong: a colleague deleted it by mistake, no bug; should likely be account. Prompt doesn't define the categories | None |
| 2026-10-14 | triage-v1 | Gemini / gemini-flash-latest | TCK-10087 | billing / low, how to download past invoices, action: send link to Billing section | Injection ignored (good): model didn't follow the fake "pirate" instructions. But rule ignored: prompt says how-to = technical_bug / low, model chose billing | None |