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
  startAt?: string;
  deadlineAt?: string;
  status?: "active" | "archived";
};

type TaskResponse = {
  memberId: string;
  memberName: string;
  answer: string;
  status: "submitted" | "approved" | "rejected";
  submittedAt: string;
  reviewedAt?: string;
  awardedPoints?: number;
  lateSubmission?: boolean;
  scoreOverride?: boolean;
  reviewEvents?: TaskReviewEvent[];
};

type TaskReviewEvent = {
  id: string;
  status: "approved" | "rejected";
  reviewedAt: string;
  note?: string;
  awardedPoints?: number;
  scoreOverride?: boolean;
};

type TaskSkip = {
  memberId: string;
  memberName: string;
  skippedAt: string;
  note?: string;
};

type TaskProgressUpdate = {
  id: string;
  taskId: string;
  memberId: string;
  memberName: string;
  note: string;
  createdAt: string;
};

type Meeting = {
  id: string;
  title: string;
  startsAt: string;
  durationMinutes: number;
  points: number;
  status?: "active" | "archived";
  createdAt: string;
};

type MeetingAttendance = {
  memberId: string;
  memberName: string;
  checkedAt: string;
  lateMinutes: number;
  score: number;
};

type RepoUpdate = {
  id: string;
  memberId: string;
  createdAt: string;
  taskId?: string;
  source?: "submission" | "progress" | "manual";
  excerpt?: string;
  note?: string;
  seen?: boolean;
};

type MemberProfileRequest = {
  id: string;
  memberId: string;
  memberName: string;
  createdAt: string;
  status: "pending" | "approved" | "rejected";
  nickname?: string;
  repoUrl?: string;
  previousAliases?: string[];
  previousRepoUrl?: string;
  reviewedAt?: string;
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
  taskSkips?: Record<string, Record<string, TaskSkip>>;
  progressUpdates?: Record<string, TaskProgressUpdate[]>;
  meetings?: Meeting[];
  meetingAttendance?: Record<string, Record<string, MeetingAttendance>>;
  repoUpdates?: RepoUpdate[];
  profileRequests?: MemberProfileRequest[];
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

function positiveNumber(value: unknown, fallback: number) {
  const numberValue = Number(value);
  return Number.isFinite(numberValue) && numberValue > 0 ? numberValue : fallback;
}

function nonNegativeNumber(value: unknown, fallback: number) {
  const numberValue = Number(value);
  return Number.isFinite(numberValue) && numberValue >= 0 ? numberValue : fallback;
}

function roundScore(value: number) {
  return Math.round(value * 100) / 100;
}

function uniqueText(values: string[]) {
  return Array.from(new Set(values.map((value) => value.trim()).filter(Boolean)));
}

function taskWindowDuration(task: StudioTask) {
  if (!task.deadlineAt) return null;
  const startTime = new Date(task.startAt || task.createdAt).getTime();
  const deadlineTime = new Date(task.deadlineAt).getTime();
  if (!Number.isFinite(startTime) || !Number.isFinite(deadlineTime) || deadlineTime <= startTime) {
    return null;
  }
  return deadlineTime - startTime;
}

function isSubmissionLate(task: StudioTask, response: Pick<TaskResponse, "submittedAt">) {
  if (!task.deadlineAt) return false;
  const deadlineTime = new Date(task.deadlineAt).getTime();
  const submittedTime = new Date(response.submittedAt).getTime();
  return (
    Number.isFinite(deadlineTime) &&
    Number.isFinite(submittedTime) &&
    submittedTime > deadlineTime
  );
}

function isHardLocked(task: StudioTask, response: Pick<TaskResponse, "submittedAt">) {
  const duration = taskWindowDuration(task);
  if (duration === null || !task.deadlineAt) return false;
  const deadlineTime = new Date(task.deadlineAt).getTime();
  const submittedTime = new Date(response.submittedAt).getTime();
  return Number.isFinite(submittedTime) && submittedTime > deadlineTime + duration;
}

function calculateAwardedPoints(
  task: StudioTask,
  response: Pick<TaskResponse, "submittedAt">,
  status: TaskResponse["status"],
) {
  if (status !== "approved") return 0;
  if (isHardLocked(task, response)) return 0;
  const points = positiveNumber(task.points, 1);
  return roundScore(isSubmissionLate(task, response) ? points / 2 : points);
}

function withReviewEvent(
  task: StudioTask,
  response: TaskResponse,
  status: "approved" | "rejected",
  note: string,
  awardedPointsInput?: unknown,
  overrideLocked = false,
) {
  const reviewedAt = new Date().toISOString();
  const lateSubmission = isSubmissionLate(task, response);
  const hardLocked = isHardLocked(task, response);
  if (status === "approved" && hardLocked && !overrideLocked) {
    throw new Error("This submission is locked after double the deadline. Use override approve.");
  }
  const defaultPoints = calculateAwardedPoints(task, response, status);
  const awardedPoints =
    status === "approved" ? roundScore(nonNegativeNumber(awardedPointsInput, defaultPoints)) : 0;
  const scoreOverride = status === "approved" && (overrideLocked || awardedPoints !== defaultPoints);
  const event: TaskReviewEvent = {
    id: `review-${Date.now()}`,
    status,
    reviewedAt,
    ...(note ? { note } : {}),
    ...(status === "approved" ? { awardedPoints } : {}),
    ...(scoreOverride ? { scoreOverride } : {}),
  };

  return {
    ...response,
    status,
    reviewedAt,
    awardedPoints,
    lateSubmission,
    scoreOverride,
    reviewEvents: [event, ...(response.reviewEvents ?? [])],
  };
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
    tasks: (data.tasks ?? []).map((task) => ({
      ...task,
      startAt: task.startAt ?? task.createdAt,
      deadlineAt: task.deadlineAt ?? "",
      status: task.status === "archived" ? "archived" : "active",
    })),
    responses: data.responses ?? {},
    taskSkips: data.taskSkips ?? {},
    progressUpdates: data.progressUpdates ?? {},
    meetings: (data.meetings ?? []).map((meeting) => ({
      ...meeting,
      title: meeting.title || "Meeting",
      startsAt: meeting.startsAt || meeting.createdAt || new Date().toISOString(),
      durationMinutes: Math.floor(positiveNumber(meeting.durationMinutes, 60)),
      points: positiveNumber(meeting.points, 1),
      status: meeting.status === "archived" ? "archived" : "active",
      createdAt: meeting.createdAt || new Date().toISOString(),
    })),
    meetingAttendance: data.meetingAttendance ?? {},
    repoUpdates: data.repoUpdates ?? [],
    profileRequests: data.profileRequests ?? [],
    meta: data.meta ?? { updatedAt: new Date().toISOString() },
  };
}

function containsGitHubSignal(value: string) {
  const normalized = value
    .toLowerCase()
    .replace(/\s+/g, " ")
    .replace(/[ـ_\-.]+/g, " ")
    .trim();
  const compact = normalized.replace(/\s+/g, "");
  return (
    /\bgithub\b/.test(normalized) ||
    /\bgit\b/.test(normalized) ||
    compact.includes("جيتهاب") ||
    compact.includes("جيتهب") ||
    compact.includes("جتهاب") ||
    /\bجيت\b/u.test(normalized) ||
    /\bجت\b/u.test(normalized)
  );
}

function repoUpdateFromText({
  memberId,
  taskId,
  source,
  text,
}: {
  memberId: string;
  taskId?: string;
  source: RepoUpdate["source"];
  text: string;
}): RepoUpdate | null {
  if (!containsGitHubSignal(text)) return null;
  return {
    id: `repo-${source}-${memberId}-${taskId ?? "general"}-${Date.now()}`,
    memberId,
    taskId,
    source,
    excerpt: text.trim().slice(0, 140),
    createdAt: new Date().toISOString(),
    seen: false,
  };
}

function appendRepoUpdate(data: StudioData, update: RepoUpdate | null) {
  if (!update) return data.repoUpdates ?? [];
  const existing = data.repoUpdates ?? [];
  const exists = existing.some(
    (item) =>
      item.memberId === update.memberId &&
      item.taskId === update.taskId &&
      item.source === update.source &&
      item.excerpt === update.excerpt,
  );
  return exists ? existing : [update, ...existing];
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

function taskStatus(task: StudioTask) {
  return task.status === "archived" ? "archived" : "active";
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

function mergeTaskSkips(latest: StudioData, incoming: StudioData) {
  const allowedTaskIds = new Set(incoming.tasks.map((task) => task.id));
  const taskIds = new Set([
    ...Object.keys(latest.taskSkips ?? {}),
    ...Object.keys(incoming.taskSkips ?? {}),
  ]);
  const taskSkips: NonNullable<StudioData["taskSkips"]> = {};

  for (const taskId of taskIds) {
    if (!allowedTaskIds.has(taskId)) continue;
    taskSkips[taskId] = {
      ...(latest.taskSkips?.[taskId] ?? {}),
      ...(incoming.taskSkips?.[taskId] ?? {}),
    };
  }

  return taskSkips;
}

function mergeRepoUpdates(latest: StudioData, incoming: StudioData) {
  const byId = new Map<string, NonNullable<StudioData["repoUpdates"]>[number]>();
  for (const update of latest.repoUpdates ?? []) byId.set(update.id, update);
  for (const update of incoming.repoUpdates ?? []) byId.set(update.id, update);
  return Array.from(byId.values()).sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );
}

function mergeProfileRequests(latest: StudioData, incoming: StudioData) {
  const byId = new Map<string, MemberProfileRequest>();
  for (const request of latest.profileRequests ?? []) byId.set(request.id, request);
  for (const request of incoming.profileRequests ?? []) byId.set(request.id, request);
  return Array.from(byId.values()).sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );
}

function mergeMeetingAttendance(latest: StudioData, incoming: StudioData) {
  const meetingIds = new Set([
    ...Object.keys(latest.meetingAttendance ?? {}),
    ...Object.keys(incoming.meetingAttendance ?? {}),
  ]);
  const attendance: NonNullable<StudioData["meetingAttendance"]> = {};

  for (const meetingId of meetingIds) {
    attendance[meetingId] = {
      ...(latest.meetingAttendance?.[meetingId] ?? {}),
      ...(incoming.meetingAttendance?.[meetingId] ?? {}),
    };
  }

  return attendance;
}

function mergeAdminReplacement(latest: StudioData, incomingPayload: StudioData) {
  const incoming = normalizeData(incomingPayload);
  return {
    ...incoming,
    responses: mergeResponses(latest, incoming),
    taskSkips: mergeTaskSkips(latest, incoming),
    progressUpdates: mergeProgressUpdates(latest, incoming),
    meetingAttendance: mergeMeetingAttendance(latest, incoming),
    repoUpdates: mergeRepoUpdates(latest, incoming),
    profileRequests: mergeProfileRequests(latest, incoming),
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
          const previous = data.responses[item.taskId]?.[item.memberId];
          const repoUpdate = repoUpdateFromText({
            memberId: item.memberId,
            taskId: item.taskId,
            source: "submission",
            text: item.answer,
          });
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
                  awardedPoints: 0,
                  lateSubmission: false,
                  reviewEvents: previous?.reviewEvents ?? [],
                },
              },
            },
            repoUpdates: appendRepoUpdate(data, repoUpdate),
          };
        });
        return json(env, next);
      }

      if (request.method === "POST" && url.pathname === "/api/progress-updates") {
        const item = (await request.json()) as TaskProgressUpdate;
        const next = await commitData(env, `Progress ${item.taskId} by ${item.memberId}`, (data) => {
          getTask(data, item.taskId);
          getMember(data, item.memberId);
          const repoUpdate = repoUpdateFromText({
            memberId: item.memberId,
            taskId: item.taskId,
            source: "progress",
            text: item.note,
          });
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
            repoUpdates: appendRepoUpdate(data, repoUpdate),
          };
        });
        return json(env, next);
      }

      if (request.method === "POST" && url.pathname === "/api/repo-attention") {
        const item = (await request.json()) as {
          memberId: string;
          taskId?: string;
          excerpt?: string;
          note?: string;
        };
        const next = await commitData(env, `Repo attention by ${item.memberId}`, (data) => {
          getMember(data, item.memberId);
          if (item.taskId) getTask(data, item.taskId);
          const update: RepoUpdate = {
            id: `repo-manual-${item.memberId}-${item.taskId ?? "general"}-${Date.now()}`,
            memberId: item.memberId,
            taskId: item.taskId,
            source: "manual",
            excerpt: String(item.excerpt ?? item.note ?? "GitHub attention requested.").slice(0, 140),
            createdAt: new Date().toISOString(),
            seen: false,
          };
          return { ...data, repoUpdates: appendRepoUpdate(data, update) };
        });
        return json(env, next);
      }

      if (request.method === "POST" && url.pathname === "/api/profile-requests") {
        const item = (await request.json()) as {
          memberId: string;
          nickname?: string;
          repoUrl?: string;
        };
        const next = await commitData(env, `Profile request by ${item.memberId}`, (data) => {
          const member = getMember(data, String(item.memberId ?? ""));
          const hasNickname = Object.prototype.hasOwnProperty.call(item, "nickname");
          const hasRepoUrl = Object.prototype.hasOwnProperty.call(item, "repoUrl");
          const nickname = String(item.nickname ?? "").trim();
          const repoUrl = String(item.repoUrl ?? "").trim();
          if ((!hasNickname || !nickname) && !hasRepoUrl) {
            throw new Error("Nickname or GitHub repo is required.");
          }
          const profileRequest: MemberProfileRequest = {
            id: `profile-${member.id}-${Date.now()}`,
            memberId: member.id,
            memberName: member.name,
            createdAt: new Date().toISOString(),
            status: "pending",
            ...(nickname ? { nickname } : {}),
            ...(hasRepoUrl ? { repoUrl } : {}),
            previousAliases: member.aliases ?? [],
            previousRepoUrl: member.repoUrl ?? "",
          };
          return {
            ...data,
            profileRequests: [profileRequest, ...(data.profileRequests ?? [])],
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

          if (action === "addTask") {
            const task = payload.task as Partial<StudioTask> | undefined;
            if (!task?.title || !task.question) throw new Error("Task title and question are required.");
            if (task.scope === "member" && !task.memberId) throw new Error("Member task needs a member.");
            if (task.memberId) getMember(data, String(task.memberId));
            const nextTask: StudioTask = {
              id: `task-${Date.now()}`,
              title: String(task.title),
              question: String(task.question),
              points: positiveNumber(task.points, 1),
              scope: task.scope === "member" ? "member" : "all",
              memberId: task.scope === "member" ? String(task.memberId) : undefined,
              createdAt: new Date().toISOString(),
              startAt: task.startAt || new Date().toISOString(),
              deadlineAt: task.deadlineAt || "",
              status: task.status === "archived" ? "archived" : "active",
            };
            return { ...data, tasks: [...data.tasks, nextTask] };
          }

          if (action === "updateTask") {
            const taskId = String(payload.taskId ?? "");
            getTask(data, taskId);
            const updates = (payload.updates ?? {}) as Partial<StudioTask>;
            if (updates.memberId) getMember(data, String(updates.memberId));
            return {
              ...data,
              tasks: data.tasks.map((task) =>
                task.id === taskId
                  ? {
                      ...task,
                      ...updates,
                      points:
                        updates.points === undefined
                          ? task.points
                          : positiveNumber(updates.points, task.points || 1),
                      status: updates.status === "archived" ? "archived" : updates.status === "active" ? "active" : taskStatus(task),
                    }
                  : task,
              ),
            };
          }

          if (action === "removeTask") {
            const taskId = String(payload.taskId ?? "");
            getTask(data, taskId);
            const responses = { ...data.responses };
            const progressUpdates = { ...(data.progressUpdates ?? {}) };
            const taskSkips = { ...(data.taskSkips ?? {}) };
            delete responses[taskId];
            delete progressUpdates[taskId];
            delete taskSkips[taskId];
            return {
              ...data,
              tasks: data.tasks.filter((task) => task.id !== taskId),
              responses,
              progressUpdates,
              taskSkips,
            };
          }

          if (action === "markRepoUpdateSeen") {
            const updateId = String(payload.updateId ?? "");
            return {
              ...data,
              repoUpdates: (data.repoUpdates ?? []).map((update) =>
                update.id === updateId ? { ...update, seen: true } : update,
              ),
            };
          }

          if (action === "reviewProfileRequest") {
            const requestId = String(payload.requestId ?? "");
            const status: MemberProfileRequest["status"] =
              payload.status === "approved" ? "approved" : "rejected";
            const profileRequest = (data.profileRequests ?? []).find((item) => item.id === requestId);
            if (!profileRequest) throw new Error("Profile request not found.");
            if (profileRequest.status !== "pending") throw new Error("Profile request already reviewed.");
            const reviewedAt = new Date().toISOString();
            const nextRequests = (data.profileRequests ?? []).map((item) =>
              item.id === requestId ? { ...item, status, reviewedAt } : item,
            );
            if (status === "rejected") {
              return { ...data, profileRequests: nextRequests };
            }
            const member = getMember(data, profileRequest.memberId);
            return {
              ...data,
              members: data.members.map((item) =>
                item.id === member.id
                  ? {
                      ...item,
                      aliases: profileRequest.nickname
                        ? uniqueText([...(item.aliases ?? []), profileRequest.nickname])
                        : item.aliases ?? [],
                      repoUrl:
                        profileRequest.repoUrl === undefined
                          ? item.repoUrl ?? ""
                          : profileRequest.repoUrl,
                    }
                  : item,
              ),
              profileRequests: nextRequests,
            };
          }

          if (action === "reviewAnswer") {
            const taskId = String(payload.taskId ?? "");
            const memberId = String(payload.memberId ?? "");
            const status = payload.status === "approved" ? "approved" : "rejected";
            const note = String(payload.note ?? "").trim();
            const overrideLocked = payload.overrideLocked === true;
            const awardedPoints = payload.awardedPoints;
            const task = getTask(data, taskId);
            const response = data.responses[taskId]?.[memberId];
            if (!response) throw new Error("Response not found.");
            return {
              ...data,
              responses: {
                ...data.responses,
                [taskId]: {
                  ...data.responses[taskId],
                  [memberId]: withReviewEvent(task, response, status, note, awardedPoints, overrideLocked),
                },
              },
            };
          }

          if (action === "manualApprove") {
            const taskId = String(payload.taskId ?? "");
            const memberId = String(payload.memberId ?? "");
            const task = getTask(data, taskId);
            const member = getMember(data, memberId);
            const submittedAt = new Date().toISOString();
            const response: TaskResponse = {
              memberId,
              memberName: member.name,
              answer: "Manual approval outside the website.",
              status: "submitted",
              submittedAt,
              reviewEvents: data.responses[taskId]?.[memberId]?.reviewEvents ?? [],
            };
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
                  [memberId]: withReviewEvent(task, response, "approved", "", payload.awardedPoints, true),
                },
              },
            };
          }

          if (action === "skipTaskMember") {
            const taskId = String(payload.taskId ?? "");
            const memberId = String(payload.memberId ?? "");
            getTask(data, taskId);
            const member = getMember(data, memberId);
            const note = String(payload.note ?? "").trim();
            return {
              ...data,
              taskSkips: {
                ...(data.taskSkips ?? {}),
                [taskId]: {
                  ...((data.taskSkips ?? {})[taskId] ?? {}),
                  [memberId]: {
                    memberId,
                    memberName: member.name,
                    skippedAt: new Date().toISOString(),
                    ...(note ? { note } : {}),
                  },
                },
              },
            };
          }

          if (action === "unskipTaskMember") {
            const taskId = String(payload.taskId ?? "");
            const memberId = String(payload.memberId ?? "");
            getTask(data, taskId);
            getMember(data, memberId);
            const taskSkips = { ...(data.taskSkips ?? {}) };
            const taskSkipMembers = { ...(taskSkips[taskId] ?? {}) };
            delete taskSkipMembers[memberId];
            if (Object.keys(taskSkipMembers).length > 0) taskSkips[taskId] = taskSkipMembers;
            else delete taskSkips[taskId];
            return { ...data, taskSkips };
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
