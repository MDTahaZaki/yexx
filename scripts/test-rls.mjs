// Proves preorders_select_own / preorders_delete_own actually stop one
// user from reading or cancelling another user's pre-order — the RLS
// policies in schema.sql are the real protection in this app (see
// SECURITY notes in the account/preorder route handlers), so this is the
// test that matters more than any unit test of the route code itself.
//
// Run with real project credentials (never committed — this script reads
// them from the environment, same as the app does):
//
//   node --env-file=.env.local scripts/test-rls.mjs
//
// What it does, in order:
//   1. Creates two throwaway users with the admin (secret-key) client —
//      only ever used to set up/tear down fixtures, never to read the
//      data under test.
//   2. Signs in as User A with the publishable-key client (the same kind
//      of client every route handler uses) and inserts one pre-order.
//   3. Confirms User A can read their own row (a sanity check — without
//      this, a "User B sees nothing" result would be meaningless; it
//      could just mean the query itself is broken).
//   4. Signs in as User B and asserts: (a) selecting preorders returns
//      zero rows — User A's row is invisible, not merely unlabeled —
//      and (b) attempting to delete User A's row by id affects zero
//      rows.
//   5. Deletes both users (cascades their preorders) via the admin
//      client, regardless of pass/fail, so the project doesn't
//      accumulate test accounts.
//
// Exits 0 only if every assertion passes; exits 1 and prints which
// assertion failed otherwise.

import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
const secretKey = process.env.SUPABASE_SECRET_KEY;

if (!url || !publishableKey || !secretKey) {
  console.error(
    "Missing env vars. Run with: node --env-file=.env.local scripts/test-rls.mjs"
  );
  process.exit(1);
}

const admin = createClient(url, secretKey, { auth: { autoRefreshToken: false, persistSession: false } });

const stamp = Date.now();
const userAEmail = `rls-test-a-${stamp}@example.com`;
const userBEmail = `rls-test-b-${stamp}@example.com`;
const password = "Rls-Test-Password-1234";

let userAId, userBId;
let failed = false;

function check(label, condition) {
  console.log(`${condition ? "PASS" : "FAIL"} — ${label}`);
  if (!condition) failed = true;
}

try {
  const { data: userA, error: createAError } = await admin.auth.admin.createUser({
    email: userAEmail,
    password,
    email_confirm: true,
  });
  if (createAError) throw createAError;
  userAId = userA.user.id;

  const { data: userB, error: createBError } = await admin.auth.admin.createUser({
    email: userBEmail,
    password,
    email_confirm: true,
  });
  if (createBError) throw createBError;
  userBId = userB.user.id;

  // --- User A: sign in with the same kind of client every route handler
  // uses (publishable key), insert one pre-order, confirm they can read
  // it back.
  const clientA = createClient(url, publishableKey);
  const { error: signInAError } = await clientA.auth.signInWithPassword({
    email: userAEmail,
    password,
  });
  if (signInAError) throw signInAError;

  const { data: inserted, error: insertError } = await clientA
    .from("preorders")
    .insert({
      user_id: userAId,
      size: "250ml",
      quantity: 1,
      notes: "rls-test fixture",
      consent_at: new Date().toISOString(),
    })
    .select("id")
    .single();
  if (insertError) throw insertError;
  const preorderId = inserted.id;

  const { data: ownRead } = await clientA.from("preorders").select("id").eq("id", preorderId);
  check("User A can read their own pre-order", (ownRead ?? []).length === 1);

  // --- User B: sign in separately, attempt to read and delete User A's
  // row.
  const clientB = createClient(url, publishableKey);
  const { error: signInBError } = await clientB.auth.signInWithPassword({
    email: userBEmail,
    password,
  });
  if (signInBError) throw signInBError;

  const { data: crossRead } = await clientB.from("preorders").select("id").eq("id", preorderId);
  check("User B cannot read User A's pre-order", (crossRead ?? []).length === 0);

  const { data: allRowsForB } = await clientB.from("preorders").select("id");
  check("User B's unfiltered select sees zero of User A's rows", (allRowsForB ?? []).length === 0);

  const { count: deleteCount } = await clientB
    .from("preorders")
    .delete({ count: "exact" })
    .eq("id", preorderId);
  check("User B's delete of User A's pre-order affects zero rows", (deleteCount ?? 0) === 0);

  const { data: stillThere } = await clientA.from("preorders").select("id").eq("id", preorderId);
  check("User A's pre-order still exists after User B's delete attempt", (stillThere ?? []).length === 1);
} catch (error) {
  console.error("Test run threw an unexpected error:", error);
  failed = true;
} finally {
  if (userAId) await admin.auth.admin.deleteUser(userAId).catch(() => {});
  if (userBId) await admin.auth.admin.deleteUser(userBId).catch(() => {});
}

process.exit(failed ? 1 : 0);
