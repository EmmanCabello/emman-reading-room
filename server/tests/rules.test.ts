import assert from "node:assert/strict";
import { execSync } from "node:child_process";
import fs from "node:fs";
import type { AddressInfo } from "node:net";
import path from "node:path";
import { after, before, describe, it } from "node:test";

// Use a throwaway SQLite file so tests never touch the real archive.
process.env.DATABASE_URL = "file:./test-archive.db";
const serverRoot = path.resolve(__dirname, "..");
const testDb = path.join(serverRoot, "src", "data", "test-archive.db");

let base = "";
let close: () => void = () => {};
let dbRef: typeof import("../src/data/client.js").db;

async function call(
  method: string,
  url: string,
  opts: { token?: string; body?: unknown } = {}
): Promise<{ status: number; json: any; res: Response }> {
  const res = await fetch(base + url, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(opts.token ? { Authorization: `Bearer ${opts.token}` } : {})
    },
    body: opts.body === undefined ? undefined : JSON.stringify(opts.body)
  });
  const type = res.headers.get("content-type") ?? "";
  const json = type.includes("json") ? await res.json() : null;
  return { status: res.status, json, res };
}

const login = async (email: string, password: string) => (await call("POST", "/api/session/login", { body: { email, password } })).json.token as string;

before(async () => {
  for (const suffix of ["", "-journal"]) if (fs.existsSync(testDb + suffix)) fs.rmSync(testDb + suffix);
  execSync("npx prisma migrate deploy && npx prisma db seed", { cwd: serverRoot, env: process.env, stdio: "ignore" });
  const { createApp } = await import("../src/app.js");
  dbRef = (await import("../src/data/client.js")).db;
  const server = createApp().listen(0);
  await new Promise((r) => server.once("listening", r));
  base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  close = () => server.close();
});

after(async () => {
  close();
  await dbRef.$disconnect();
  for (const suffix of ["", "-journal"]) if (fs.existsSync(testDb + suffix)) fs.rmSync(testDb + suffix);
});

describe("seed and accounts", () => {
  it("seeds 210+ works", async () => {
    const { json } = await call("GET", "/api/catalog?pageSize=1");
    assert.ok(json.total >= 210, `expected 210+ works, got ${json.total}`);
  });

  it("has no Shakespeare in the catalogue", async () => {
    const { json } = await call("GET", "/api/catalog?q=shakespeare");
    assert.equal(json.items.filter((w: any) => /shakespeare/i.test(w.author)).length, 0);
  });

  it("signs in both Emman accounts", async () => {
    const reader = await call("POST", "/api/session/login", { body: { email: "emman@emman.local", password: "Emman123!" } });
    assert.equal(reader.status, 200);
    assert.equal(reader.json.patron.role, "reader");
    const admin = await call("POST", "/api/session/login", { body: { email: "emman.admin@emman.local", password: "EmmanAdmin123!" } });
    assert.equal(admin.status, 200);
    assert.equal(admin.json.patron.role, "admin");
    const bad = await call("POST", "/api/session/login", { body: { email: "emman@emman.local", password: "nope" } });
    assert.equal(bad.status, 401);
  });

  it("registers a new reader at POST /api/auth/register (phone) and /api/session/register (web)", async () => {
    const phone = await call("POST", "/api/auth/register", {
      body: { displayName: "Phone Reader", email: "phone.reader@emman.local", password: "PhoneReader1!" }
    });
    assert.equal(phone.status, 201);
    assert.equal(phone.json.patron.role, "reader");
    const me = await call("GET", "/api/session/me", { token: phone.json.token });
    assert.equal(me.json.patron.email, "phone.reader@emman.local");
    const dup = await call("POST", "/api/session/register", {
      body: { displayName: "Dup", email: "phone.reader@emman.local", password: "PhoneReader1!" }
    });
    assert.equal(dup.status, 409);
    const weak = await call("POST", "/api/auth/register", {
      body: { displayName: "Weak", email: "weak@emman.local", password: "short" }
    });
    assert.equal(weak.status, 400);
  });

  it("keeps admin routes behind the curator role", async () => {
    const reader = await login("emman@emman.local", "Emman123!");
    assert.equal((await call("GET", "/api/admin/overview", { token: reader })).status, 403);
    assert.equal((await call("GET", "/api/admin/overview")).status, 401);
    const admin = await login("emman.admin@emman.local", "EmmanAdmin123!");
    assert.equal((await call("GET", "/api/admin/overview", { token: admin })).status, 200);
  });
});

describe("download allowance", () => {
  it("limits guests to 5 distinct titles per IP; repeats are free", async () => {
    await dbRef.guestRetrieval.deleteMany();
    for (let id = 1; id <= 5; id++) {
      const r = await call("POST", `/api/loans/${id}/claim`);
      assert.equal(r.status, 200, `claim ${id}`);
      assert.equal(r.json.allowance.used, id);
    }
    const sixth = await call("POST", "/api/loans/6/claim");
    assert.equal(sixth.status, 403);
    assert.equal(sixth.json.error.code, "ALLOWANCE_EXHAUSTED");
    const repeat = await call("POST", "/api/loans/3/claim");
    assert.equal(repeat.status, 200);
    assert.equal(repeat.json.repeat, true);
    assert.equal(repeat.json.allowance.used, 5);
    await dbRef.guestRetrieval.deleteMany();
  });

  it("limits signed-in readers to 10 distinct titles stored in the database", async () => {
    const token = await login("emman@emman.local", "Emman123!");
    await dbRef.retrieval.deleteMany();
    for (let id = 1; id <= 10; id++) {
      assert.equal((await call("POST", `/api/loans/${id}/claim`, { token })).status, 200, `claim ${id}`);
    }
    const eleventh = await call("POST", "/api/loans/11/claim", { token });
    assert.equal(eleventh.status, 403);
    const repeat = await call("POST", "/api/loans/2/claim", { token });
    assert.equal(repeat.status, 200);
    assert.equal(repeat.json.repeat, true);
    assert.equal(await dbRef.retrieval.count(), 10);
    await dbRef.retrieval.deleteMany();
  });

  it("serves a one-page bibliographic card PDF with a Gutenberg link", async () => {
    const claim = await call("POST", "/api/loans/1/claim");
    assert.equal(claim.status, 200);
    const pdf = await fetch(claim.json.ticketUrl);
    assert.equal(pdf.headers.get("content-type"), "application/pdf");
    const buffer = Buffer.from(await pdf.arrayBuffer());
    const text = buffer.toString("latin1");
    assert.ok(text.startsWith("%PDF"));
    assert.equal((text.match(/\/Type \/Page\b/g) ?? []).length, 1, "exactly one page");
    assert.ok(text.includes("gutenberg.org"), "contains a Gutenberg link");
    assert.ok(buffer.length < 60_000, "card is small, never the book text");
    await dbRef.guestRetrieval.deleteMany();
    assert.equal((await fetch(`${base}/api/loans/card/not-a-ticket`)).status, 401);
  });
});

describe("shelf and bookmarks", () => {
  it("shares one shelf snapshot between clients", async () => {
    const token = await login("emman@emman.local", "Emman123!");
    await call("PUT", "/api/shelves/20", { token, body: { stage: "reading" } });
    const pin = await call("POST", "/api/shelves/20/pins", { token, body: { locator: "Chapter 3" } });
    assert.equal(pin.status, 201);
    const snapshot = (await call("GET", "/api/shelves", { token })).json;
    assert.ok(snapshot.entries.some((e: any) => e.workId === 20 && e.stage === "reading"));
    assert.ok(snapshot.pins.some((p: any) => p.workId === 20 && p.locator === "Chapter 3"));
    const pinId = snapshot.pins.find((p: any) => p.workId === 20).id;
    await call("DELETE", `/api/shelves/pins/${pinId}`, { token });
    await call("DELETE", "/api/shelves/20", { token });
    assert.equal((await call("GET", "/api/shelves")).status, 401);
  });
});

describe("Archival Research Curator", () => {
  it("runs find_titles then read_record for comparison questions (offline planner)", async () => {
    const { json } = await call("POST", "/api/librarian/chat", {
      body: { message: "Compare Darwin's Origin of Species with Wallace's Darwinism" }
    });
    assert.equal(json.mode, "offline");
    const tools = json.trace.map((t: any) => t.tool);
    assert.ok(tools.includes("find_titles") && tools.includes("read_record"), `trace was ${tools}`);
    assert.ok(tools.indexOf("find_titles") < tools.indexOf("read_record"));
    assert.ok(json.trace.filter((t: any) => t.tool === "read_record").length >= 2);
  });

  it("stages save_to_shelf and writes only after /confirm", async () => {
    const token = await login("emman@emman.local", "Emman123!");
    const before = (await call("GET", "/api/shelves", { token })).json.entries.length;
    const chat = await call("POST", "/api/librarian/chat", {
      token,
      body: { message: "Please save Frankenstein to my shelf" }
    });
    assert.equal(chat.json.proposals.length, 1);
    assert.ok(chat.json.trace.some((t: any) => t.tool === "save_to_shelf"));
    const staged = (await call("GET", "/api/shelves", { token })).json.entries.length;
    assert.equal(staged, before, "staging must not write to the shelf");

    const confirmed = await call("POST", "/api/librarian/confirm", {
      token,
      body: { proposalId: chat.json.proposals[0].id }
    });
    assert.equal(confirmed.status, 200);
    const after = (await call("GET", "/api/shelves", { token })).json.entries.length;
    assert.equal(after, before + 1);
    const again = await call("POST", "/api/librarian/confirm", { token, body: { proposalId: chat.json.proposals[0].id } });
    assert.equal(again.status, 409);
    const frank = confirmed.json.added[0];
    await call("DELETE", `/api/shelves/${frank.id}`, { token });
  });

  it("does not stage anything for guests", async () => {
    const chat = await call("POST", "/api/librarian/chat", { body: { message: "save Frankenstein to my shelf" } });
    assert.equal(chat.json.proposals.length, 0);
    assert.equal((await call("POST", "/api/librarian/confirm", { body: { proposalId: "x" } })).status, 401);
  });
});
