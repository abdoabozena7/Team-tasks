type Member = {
  id: string;
  name: string;
  aliases?: string[];
  hidden?: boolean;
  baseCompleted?: number;
  baseApproved?: number;
  baseRejected?: number;
  basePoints?: number;
  adminNote?: string;
  publicFlag?: string;
  repoUrl?: string;
};

type StudioTask = {
  id: string;
  title: string;
  question: string;
  points: number;
  scope: "all" | "member";
  memberId?: string;
  createdAt: string;
};

type TaskResponse = {
  memberId: string;
  memberName: string;
  answer: string;
  status: "submitted" | "approved" | "rejected";
  submittedAt: string;
  reviewedAt?: string;
};

type TaskProgressUpdate = {
  id: string;
  taskId: string;
  memberId: string;
  memberName: string;
  note: string;
  createdAt: string;
};

type StudioData = {
  projectName: string;
  announcement?: string;
  settings?: {
    adminPassword?: string;
    statsPassword?: string;
    backendUrl?: string;
  };
  members: Member[];
  tasks: StudioTask[];
  responses: Record<string, Record<string, TaskResponse>>;
  progressUpdates?: Record<string, TaskProgressUpdate[]>;
  repoUpdates?: Array<{ id: string; memberId: string; createdAt: string; seen?: boolean }>;
  meta?: { updatedAt: string };
};

type Env = {
  GITHUB_TOKEN: string;
  ADMIN_PASSWORD?: string;
  STATS_PASSWORD?: string;
  GITHUB_OWNER: string;
  GITHUB_REPO: string;
  GITHUB_BRANCH: string;
  GITHUB_DATA_PATH: string;
  GITHUB_PUBLIC_DATA_PATH?: string;
  CORS_ORIGIN?: string;
};

type GitHubFile = {
  sha: string;
  content: string;
};

const jsonHeaders = (env: Env, status = 200) => ({
  status,
  headers: {
    "Content-Type": "application/json; charset=utf-8",
    "Access-Control-Allow-Origin": env.CORS_ORIGIN || "*",
    "Access-Control-Allow-Headers": "Content-Type, x-admin-password",
    "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
    "Cache-Control": "no-store",
  },
});

function json(env: Env, body: unknown, status = 200) {
  return new Response(JSON.stringify(body), jsonHeaders(env, status));
}

function normalizeData(data: StudioData): StudioData {
  return {
    projectName: data.projectName || "Hivo Studio",
    announcement: data.announcement ?? "",
    settings: {
      adminPassword: data.settings?.adminPassword ?? "",
      statsPassword: data.settings?.statsPassword ?? "",
      backendUrl: data.settings?.backendUrl ?? "",
    },
    members: data.members ?? [],
    tasks: data.tasks ?? [],
    responses: data.responses ?? {},
    progressUpdates: data.progressUpdates ?? {},
    repoUpdates: data.repoUpdates ?? [],
    meta: data.meta ?? { updatedAt: new Date().toISOString() },
  };
}

function encodeBase64(value: string) {
  const bytes = new TextEncoder().encode(value);
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}

function decodeBase64(value: string) {
  const binary = atob(value.replace(/\s/g, ""));
  const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

function githubContentsUrl(env: Env, path: string) {
  return `https://api.github.com/repos/${env.GITHUB_OWNER}/${env.GITHUB_REPO}/contents/${path}`;
}

async function githubFetch(env: Env, path: string): Promise<{ data: StudioData; sha: string }> {
  const response = await fetch(`${githubContentsUrl(env, path)}?ref=${env.GITHUB_BRANCH}`, {
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${env.GITHUB_TOKEN}`,
      "User-Agent": "hivo-studio-worker",
    },
  });
  if (!response.ok) throw new Error(`GitHub read failed for ${path}.`);
  const file = (await response.json()) as GitHubFile;
  return { data: normalizeData(JSON.parse(decodeBase64(file.content))), sha: file.sha };
}

async function githubPut(env: Env, path: string, sha: string, data: StudioData, message: string) {
  const response = await fetch(githubContentsUrl(env, path), {
    method: "PUT",
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${env.GITHUB_TOKEN}`,
      "Content-Type": "application/json",
      "User-Agent": "hivo-studio-worker",
    },
    body: JSON.stringify({
      message,
      content: encodeBase64(`${JSON.stringify(data, null, 2)}\n`),
      sha,
      branch: env.GITHUB_BRANCH,
    }),
  });

  if (response.status === 409) return false;
  if (!response.ok) throw new Error(`GitHub write failed for ${path}.`);
  return true;
}

async function commitData(
  env: Env,
  message: string,
  mutate: (current: StudioData) => StudioData,
) {
  const sourcePath = env.GITHUB_DATA_PATH || "team-data.json";
  const mirrorPath = env.GITHUB_PUBLIC_DATA_PATH || "public/team-data.json";

  for (let attempt = 0; attempt < 3; attempt += 1) {
    const current = await githubFetch(env, sourcePath);
    const next = normalizeData(mutate(current.data));
    next.meta = { updatedAt: new Date().toISOString() };

    const savedSource = await githubPut(env, sourcePath, current.sha, next, message);
    if (!savedSource) continue;

    if (mirrorPath && mirrorPath !== sourcePath) {
      const mirror = await githubFetch(env, mirrorPath);
      await githubPut(env, mirrorPath, mirror.sha, next, `${message} mirror`);
    }

    return next;
  }

  throw new Error("GitHub data changed too quickly. Try again.");
}

function requireAdmin(env: Env, request: Request, data: StudioData) {
  const password = request.headers.get("x-admin-password") ?? "";
  const expected = env.ADMIN_PASSWORD || data.settings?.adminPassword || "";
  if (!expected || password !== expected) throw new Response("Unauthorized", { status: 401 });
}

function getTask(data: StudioData, taskId: string) {
  const task = data.tasks.find((item) => item.id === taskId);
  if (!task) throw new Error("Task not found.");
  return task;
}

function getMember(data: StudioData, memberId: string) {
  const member = data.members.find((item) => item.id === memberId);
  if (!member) throw new Error("Member not found.");
  return member;
}

function mergeResponses(latest: StudioData, incoming: StudioData) {
  const allowedTaskIds = new Set(incoming.tasks.map((task) => task.id));
  const taskIds = new Set([...Object.keys(latest.responses ?? {}), ...Object.keys(incoming.responses ?? {})]);
  const responses: StudioData["responses"] = {};

  for (const taskId of taskIds) {
    if (!allowedTaskIds.has(taskId)) continue;
    responses[taskId] = {
      ...(latest.responses?.[taskId] ?? {}),
      ...(incoming.responses?.[taskId] ?? {}),
    };
  }

  return responses;
}

function mergeProgressUpdates(latest: StudioData, incoming: StudioData) {
  const allowedTaskIds = new Set(incoming.tasks.map((task) => task.id));
  const taskIds = new Set([
    ...Object.keys(latest.progressUpdates ?? {}),
    ...Object.keys(incoming.progressUpdates ?? {}),
  ]);
  const progressUpdates: NonNullable<StudioData["progressUpdates"]> = {};

  for (const taskId of taskIds) {
    if (!allowedTaskIds.has(taskId)) continue;
    const byId = new Map<string, TaskProgressUpdate>();
    for (const update of latest.progressUpdates?.[taskId] ?? []) byId.set(update.id, update);
    for (const update of incoming.progressUpdates?.[taskId] ?? []) byId.set(update.id, update);
    progressUpdates[taskId] = Array.from(byId.values()).sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );
  }

  return progressUpdates;
}

function mergeRepoUpdates(latest: StudioData, incoming: StudioData) {
  const byId = new Map<string, NonNullable<StudioData["repoUpdates"]>[number]>();
  for (const update of latest.repoUpdates ?? []) byId.set(update.id, update);
  for (const update of incoming.repoUpdates ?? []) byId.set(update.id, update);
  return Array.from(byId.values()).sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );
}

function mergeAdminReplacement(latest: StudioData, incomingPayload: StudioData) {
  const incoming = normalizeData(incomingPayload);
  return {
    ...incoming,
    responses: mergeResponses(latest, incoming),
    progressUpdates: mergeProgressUpdates(latest, incoming),
    repoUpdates: mergeRepoUpdates(latest, incoming),
  };
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    if (request.method === "OPTIONS") return new Response(null, jsonHeaders(env));

    const url = new URL(request.url);
    try {
      if (request.method === "GET" && url.pathname === "/api/data") {
        const { data } = await githubFetch(env, env.GITHUB_DATA_PATH || "team-data.json");
        return json(env, data);
      }

      if (request.method === "POST" && url.pathname === "/api/submissions") {
        const item = (await request.json()) as TaskResponse & { taskId: string; id?: string };
        const next = await commitData(env, `Submit ${item.taskId} by ${item.memberId}`, (data) => {
          getTask(data, item.taskId);
          getMember(data, item.memberId);
          return {
            ...data,
            responses: {
              ...data.responses,
              [item.taskId]: {
                ...(data.responses[item.taskId] ?? {}),
                [item.memberId]: {
                  memberId: item.memberId,
                  memberName: item.memberName,
                  answer: item.answer,
                  status: "submitted",
                  submittedAt: item.submittedAt || new Date().toISOString(),
                },
              },
            },
          };
        });
        return json(env, next);
      }

      if (request.method === "POST" && url.pathname === "/api/progress-updates") {
        const item = (await request.json()) as TaskProgressUpdate;
        const next = await commitData(env, `Progress ${item.taskId} by ${item.memberId}`, (data) => {
          getTask(data, item.taskId);
          getMember(data, item.memberId);
          return {
            ...data,
            progressUpdates: {
              ...(data.progressUpdates ?? {}),
              [item.taskId]: [
                {
                  id: item.id || `progress-${Date.now()}`,
                  taskId: item.taskId,
                  memberId: item.memberId,
                  memberName: item.memberName,
                  note: item.note,
                  createdAt: item.createdAt || new Date().toISOString(),
                },
                ...((data.progressUpdates ?? {})[item.taskId] ?? []),
              ],
            },
          };
        });
        return json(env, next);
      }

      if (request.method === "POST" && url.pathname === "/api/admin/mutate") {
        const { action, payload } = (await request.json()) as {
          action: string;
          payload: Record<string, unknown>;
        };
        const current = await githubFetch(env, env.GITHUB_DATA_PATH || "team-data.json");
        requireAdmin(env, request, current.data);

        const next = await commitData(env, `Admin ${action}`, (data) => {
          if (action === "replaceData") return mergeAdminReplacement(data, payload.data as StudioData);

          if (action === "reviewAnswer") {
            const taskId = String(payload.taskId ?? "");
            const memberId = String(payload.memberId ?? "");
            const status = payload.status === "approved" ? "approved" : "rejected";
            const response = data.responses[taskId]?.[memberId];
            if (!response) throw new Error("Response not found.");
            return {
              ...data,
              responses: {
                ...data.responses,
                [taskId]: {
                  ...data.responses[taskId],
                  [memberId]: { ...response, status, reviewedAt: new Date().toISOString() },
                },
              },
            };
          }

          if (action === "manualApprove") {
            const taskId = String(payload.taskId ?? "");
            const memberId = String(payload.memberId ?? "");
            getTask(data, taskId);
            const member = getMember(data, memberId);
            return {
              ...data,
              responses: {
                ...data.responses,
                [taskId]: {
                  ...(data.responses[taskId] ?? {}),
                  [memberId]: {
                    memberId,
                    memberName: member.name,
                    answer: "تم التسليم خارج الموقع وتم اعتماده يدويًا.",
                    status: "approved",
                    submittedAt: new Date().toISOString(),
                    reviewedAt: new Date().toISOString(),
                  },
                },
              },
            };
          }

          if (action === "addProgressUpdate") {
            const taskId = String(payload.taskId ?? "");
            const memberId = String(payload.memberId ?? "");
            const note = String(payload.note ?? "").trim();
            if (!note) throw new Error("Progress note is required.");
            getTask(data, taskId);
            const member = getMember(data, memberId);
            const update: TaskProgressUpdate = {
              id: `progress-${Date.now()}`,
              taskId,
              memberId,
              memberName: member.name,
              note,
              createdAt: new Date().toISOString(),
            };
            return {
              ...data,
              progressUpdates: {
                ...(data.progressUpdates ?? {}),
                [taskId]: [update, ...((data.progressUpdates ?? {})[taskId] ?? [])],
              },
            };
          }

          throw new Error("Unknown admin action.");
        });

        return json(env, next);
      }

      return json(env, { error: "Not found" }, 404);
    } catch (error) {
      if (error instanceof Response) {
        return json(env, { error: error.statusText || "Unauthorized" }, error.status);
      }
      return json(env, { error: error instanceof Error ? error.message : "Unexpected error" }, 500);
    }
  },
};
