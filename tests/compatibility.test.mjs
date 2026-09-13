import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { emailDomain, isAllowedOrigin } from "../src/server/auth/policy.ts";
import { encodeAttempt, decodeAttempt, entraIdentity } from "../src/server/auth/entra.ts";
import { withFallback } from "../src/i18n/messages.ts";

test("auth rejects malformed domains, cross-origin requests and forged/expired login state", () => {
  assert.equal(emailDomain("a@KMUTT.AC.TH"), "kmutt.ac.th");
  for (const value of [null, "@kmutt.ac.th", "a@b@kmutt.ac.th", "a@kmutt.ac.th ", "a@localhost"]) assert.equal(emailDomain(value), null);
  assert.equal(emailDomain("a@kmutt.ac.th.evil.example"), "kmutt.ac.th.evil.example");
  assert.equal(isAllowedOrigin("https://office.example", "https://office.example"), true);
  for (const value of [undefined, "null", "https://office.example.evil", "http://office.example"]) assert.equal(isAllowedOrigin(value, "https://office.example"), false);
  const attempt = { state: "s".repeat(32), nonce: "n".repeat(32), verifier: "v".repeat(43), createdAt: 1000 };
  const signed = encodeAttempt(attempt, "test-secret");
  assert.deepEqual(decodeAttempt(signed, "test-secret", 2000), attempt);
  assert.throws(() => decodeAttempt(`${signed}x`, "test-secret", 2000));
  assert.throws(() => decodeAttempt(signed, "other-secret", 2000));
  assert.throws(() => decodeAttempt(signed, "test-secret", 601001));
  assert.throws(() => decodeAttempt(signed, "test-secret", 999));
});

test("Entra identity requires tenant/object and verified-domain claims; email cannot be identity", () => {
  const tenant = "123e4567-e89b-12d3-a456-426614174000";
  const claims = { tid: tenant, oid: tenant, email: "member@kmutt.ac.th", xms_edov: true, name: "Member" };
  assert.equal(entraIdentity(claims, tenant).subject, `${tenant}:${tenant}`);
  for (const change of [{ tid: "other" }, { oid: undefined }, { xms_edov: false }, { xms_edov: undefined }, { email: undefined, preferred_username: claims.email }]) assert.throws(() => entraIdentity({ ...claims, ...change }, tenant));
});

test("Thai fallback preserves missing nested English keys and catalogs have identical keys", () => {
  const english = { errors: { nested: { denied: "Denied", retry: "Retry" } } };
  assert.deepEqual(withFallback(english, { errors: { nested: { denied: "ไม่มีสิทธิ์" } } }), { errors: { nested: { denied: "ไม่มีสิทธิ์", retry: "Retry" } } });
  assert.equal(english.errors.nested.denied, "Denied");
  const keys = (value, path = "") => Object.entries(value).flatMap(([key, item]) => typeof item === "object" ? keys(item, `${path}${key}.`) : [`${path}${key}`]).sort();
  const read = (locale) => JSON.parse(readFileSync(new URL(`../locales/${locale}/common.json`, import.meta.url), "utf8"));
  assert.deepEqual(keys(read("th")), keys(read("en")));
});
