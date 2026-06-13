async function parseResponse(response) {
  const contentType = response.headers.get("content-type") || "";
  const body = contentType.includes("application/json") ? await response.json() : await response.text();
  if (!response.ok) {
    const message = body && body.error ? body.error : `请求失败：${response.status}`;
    const error = new Error(message);
    error.status = response.status;
    error.body = body;
    throw error;
  }
  return body;
}

export async function api(path, options = {}) {
  const response = await fetch(path, {
    ...options,
    headers: {
      "content-type": "application/json",
      ...(options.headers || {}),
    },
  });
  return parseResponse(response);
}

export function getBootstrap() {
  return api("/api/bootstrap");
}

export function createNote(payload) {
  return api("/api/notes", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function patchNote(id, payload) {
  return api(`/api/notes/${id}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export function createBook(payload) {
  return api("/api/books", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function patchBook(id, payload) {
  return api(`/api/books/${id}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export function importLegacyData(data) {
  return api("/api/import/local-storage", {
    method: "POST",
    body: JSON.stringify({ replace: true, data }),
  });
}
