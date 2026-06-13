const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");

const { createApp } = require("../server/app.cjs");
const { openDatabase } = require("../server/db.cjs");
const { legacy, textToDoc } = require("../server/legacy.cjs");

function tempDbPath() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "modu-notes-"));
  return {
    dir,
    dbPath: path.join(dir, "test.sqlite"),
    cleanup() {
      fs.rmSync(dir, { recursive: true, force: true });
    },
  };
}

function listen(app) {
  return new Promise((resolve) => {
    const server = app.listen(0, "127.0.0.1", () => {
      const address = server.address();
      resolve({ server, baseUrl: `http://127.0.0.1:${address.port}` });
    });
  });
}

async function withServer(options, fn) {
  const temp = tempDbPath();
  const db = openDatabase(temp.dbPath, { seed: options.seed });
  const app = createApp({ db });
  const { server, baseUrl } = await listen(app);
  try {
    return await fn({ baseUrl, db });
  } finally {
    await new Promise((resolve) => server.close(resolve));
    db.close();
    temp.cleanup();
  }
}

async function request(baseUrl, pathName, options = {}) {
  const response = await fetch(baseUrl + pathName, {
    ...options,
    headers: {
      "content-type": "application/json",
      ...(options.headers || {}),
    },
  });
  const text = await response.text();
  const body = text && /json/i.test(response.headers.get("content-type") || "") ? JSON.parse(text) : text;
  return { response, body };
}

test("api bootstraps starter data and protects books with notes", async () => {
  await withServer({ seed: true }, async ({ baseUrl }) => {
    const health = await request(baseUrl, "/api/health");
    assert.equal(health.response.status, 200);
    assert.equal(health.body.ok, true);

    const bootstrap = await request(baseUrl, "/api/bootstrap");
    assert.equal(bootstrap.response.status, 200);
    assert.ok(bootstrap.body.books.length >= 4);
    assert.ok(bootstrap.body.notes.length >= 3);

    const linkedBookId = bootstrap.body.notes[0].bookId;
    const del = await request(baseUrl, `/api/books/${linkedBookId}`, { method: "DELETE" });
    assert.equal(del.response.status, 409);
  });
});

test("localStorage import is transactional, explicit, and exports markdown", async () => {
  await withServer({ seed: false }, async ({ baseUrl }) => {
    const state = legacy.createInitialState();
    const imported = await request(baseUrl, "/api/import/local-storage", {
      method: "POST",
      body: JSON.stringify({ replace: true, data: state }),
    });
    assert.equal(imported.response.status, 200);
    assert.equal(imported.body.ok, true);
    assert.ok(imported.body.books.some((book) => book.title === "如何阅读一本书"));

    const markdown = await request(baseUrl, "/api/notes/note-001/export.md", {
      headers: { accept: "text/markdown" },
    });
    assert.equal(markdown.response.status, 200);
    assert.match(markdown.body, /^# 主动阅读是一种提问/);
    assert.match(markdown.body, /## 摘录/);
    assert.match(markdown.body, /读者越主动/);

    const blocked = await request(baseUrl, "/api/import/local-storage", {
      method: "POST",
      body: JSON.stringify({ data: state }),
    });
    assert.equal(blocked.response.status, 409);
    assert.equal(blocked.body.requiresReplace, true);
  });
});

test("notes can be created and patched with Tiptap documents", async () => {
  await withServer({ seed: true }, async ({ baseUrl }) => {
    const bootstrap = await request(baseUrl, "/api/bootstrap");
    const bookId = bootstrap.body.books[0].id;
    const created = await request(baseUrl, "/api/notes", {
      method: "POST",
      body: JSON.stringify({
        type: "essay",
        title: "测试编辑器记录",
        bookId,
        bodyDoc: textToDoc("第一段正文"),
        tags: ["迁移测试"],
      }),
    });
    assert.equal(created.response.status, 201);
    assert.equal(created.body.note.bodyText, "第一段正文");
    assert.deepEqual(created.body.note.tags, ["迁移测试"]);

    const patched = await request(baseUrl, `/api/notes/${created.body.note.id}`, {
      method: "PATCH",
      body: JSON.stringify({
        favorite: true,
        bodyDoc: textToDoc("更新后的正文"),
      }),
    });
    assert.equal(patched.response.status, 200);
    assert.equal(patched.body.note.favorite, true);
    assert.equal(patched.body.note.bodyText, "更新后的正文");
  });
});
