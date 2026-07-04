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
  driveUrl?: string;
};

type StudioTask = {
  id: string;
  title: string;
  question: string;
  points: number;
  taskType?: "task" | "problem";
  scope: "all" | "member";
  memberId?: string;
  memberIds?: string[];
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

type TaskAnnouncement = {
  id: string;
  taskId: string;
  message: string;
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

type InteractionTargetType = "task" | "taskUpdate" | "meeting";

type MemberInteraction = {
  id: string;
  memberId: string;
  targetType: InteractionTargetType;
  targetId: string;
  taskId?: string;
  seenAt: string;
};

type BonusGrade = {
  id: string;
  memberId: string;
  points: number;
  note: string;
  createdAt: string;
};

type RepoUpdate = {
  id: string;
  memberId: string;
  createdAt: string;
  taskId?: string;
  source?: "submission" | "progress" | "manual" | "drive";
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
  driveUrl?: string;
  previousAliases?: string[];
  previousRepoUrl?: string;
  previousDriveUrl?: string;
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
  taskUpdates?: Record<string, TaskAnnouncement[]>;
  meetings?: Meeting[];
  meetingAttendance?: Record<string, Record<string, MeetingAttendance>>;
  interactions?: MemberInteraction[];
  bonusGrades?: BonusGrade[];
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

function anyNumber(value: unknown, fallback = 0) {
  const numberValue = Number(value);
  return Number.isFinite(numberValue) ? numberValue : fallback;
}

function roundScore(value: number) {
  return Math.round(value * 100) / 100;
}

function uniqueText(values: string[]) {
  return Array.from(new Set(values.map((value) => value.trim()).filter(Boolean)));
}

function interactionKey(memberId: string, targetType: InteractionTargetType, targetId: string) {
  return `${memberId}:${targetType}:${targetId}`;
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
  const tasks: StudioTask[] = (data.tasks ?? []).map((task) => ({
    ...task,
    taskType: task.taskType === "problem" ? "problem" : "task",
    scope: task.scope === "member" ? "member" : "all",
    memberId:
      task.scope === "member"
        ? task.memberId ?? uniqueText(task.memberIds ?? [])[0]
        : undefined,
    memberIds:
      task.scope === "member"
        ? uniqueText(task.memberIds ?? (task.memberId ? [task.memberId] : []))
        : [],
    startAt: task.startAt ?? task.createdAt,
    deadlineAt: task.deadlineAt ?? "",
    status: task.status === "archived" ? "archived" : "active",
  }));
  const taskIds = new Set(tasks.map((task) => task.id));
  const meetings: Meeting[] = (data.meetings ?? []).map((meeting) => ({
    ...meeting,
    title: meeting.title || "Meeting",
    startsAt: meeting.startsAt || meeting.createdAt || new Date().toISOString(),
    durationMinutes: Math.floor(positiveNumber(meeting.durationMinutes, 60)),
    points: positiveNumber(meeting.points, 1),
    status: meeting.status === "archived" ? "archived" : "active",
    createdAt: meeting.createdAt || new Date().toISOString(),
  }));
  const meetingIds = new Set(meetings.map((meeting) => meeting.id));
  const members: Member[] = (data.members ?? []).map((member) => ({
    ...member,
    aliases: uniqueText(member.aliases ?? []),
    basePoints: anyNumber(member.basePoints, 0),
    driveUrl: member.driveUrl ?? "",
    repoUrl: member.repoUrl ?? "",
  }));
  const memberIds = new Set(members.map((member) => member.id));

  return {
    projectName: data.projectName || "Hivo Studio",
    announcement: data.announcement ?? "",
    settings: {
      adminPassword: data.settings?.adminPassword ?? "",
      statsPassword: data.settings?.statsPassword ?? "",
      backendUrl: data.settings?.backendUrl ?? "",
    },
    members,
    tasks,
    responses: data.responses ?? {},
    taskSkips: data.taskSkips ?? {},
    progressUpdates: data.progressUpdates ?? {},
    taskUpdates: Object.fromEntries(
      Object.entries(data.taskUpdates ?? {})
        .filter(([taskId]) => taskIds.has(taskId))
        .map(([taskId, updates]) => [
          taskId,
          updates
            .filter((update) => update.message?.trim())
            .map((update) => ({
              ...update,
              taskId,
              message: update.message.trim(),
              createdAt: update.createdAt || new Date().toISOString(),
            }))
            .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()),
        ]),
    ),
    meetings,
    meetingAttendance: Object.fromEntries(
      Object.entries(data.meetingAttendance ?? {}).filter(([meetingId]) => meetingIds.has(meetingId)),
    ),
    interactions: Array.from(
      new Map(
        (data.interactions ?? [])
          .filter((interaction) => {
            if (!memberIds.has(interaction.memberId)) return false;
            if (!interaction.targetId) return false;
            if (interaction.targetType === "task") return taskIds.has(interaction.targetId);
            if (interaction.targetType === "taskUpdate") {
              return Boolean(interaction.taskId && taskIds.has(interaction.taskId));
            }
            if (interaction.targetType === "meeting") return meetingIds.has(interaction.targetId);
            return false;
          })
          .map((interaction) => {
            const targetType: InteractionTargetType =
              interaction.targetType === "taskUpdate"
                ? "taskUpdate"
                : interaction.targetType === "meeting"
                  ? "meeting"
                  : "task";
            const targetId = String(interaction.targetId);
            const clean: MemberInteraction = {
              id: interaction.id || interactionKey(interaction.memberId, targetType, targetId),
              memberId: interaction.memberId,
              targetType,
              targetId,
              ...(interaction.taskId ? { taskId: interaction.taskId } : {}),
              seenAt: interaction.seenAt || new Date().toISOString(),
            };
            return [interactionKey(clean.memberId, clean.targetType, clean.targetId), clean] as const;
          }),
      ).values(),
    ).sort((a, b) => new Date(b.seenAt).getTime() - new Date(a.seenAt).getTime()),
    bonusGrades: (data.bonusGrades ?? [])
      .filter((bonus) => memberIds.has(bonus.memberId) && String(bonus.note ?? "").trim())
      .map((bonus) => ({
        id: bonus.id || `bonus-${bonus.memberId}-${bonus.createdAt || Date.now()}`,
        memberId: bonus.memberId,
        points: anyNumber(bonus.points, 0),
        note: String(bonus.note ?? "").trim(),
        createdAt: bonus.createdAt || new Date().toISOString(),
      }))
      .filter((bonus) => bonus.points !== 0)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()),
    repoUpdates: (data.repoUpdates ?? []).filter(
      (update) => !update.taskId || taskIds.has(update.taskId),
    ),
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

function attentionUpdate({
  memberId,
  taskId,
  source,
  text,
}: {
  memberId: string;
  taskId?: string;
  source: RepoUpdate["source"];
  text: string;
}): RepoUpdate {
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

function getMeeting(data: StudioData, meetingId: string) {
  const meeting = (data.meetings ?? []).find((item) => item.id === meetingId);
  if (!meeting) throw new Error("Meeting not found.");
  return meeting;
}

function meetingStatus(meeting: Meeting) {
  return meeting.status === "archived" ? "archived" : "active";
}

function calculateMeetingAttendance(meeting: Meeting, checkedAt = new Date().toISOString()) {
  const startTime = new Date(meeting.startsAt).getTime();
  const checkTime = new Date(checkedAt).getTime();
  const duration = Math.max(1, Math.floor(positiveNumber(meeting.durationMinutes, 60)));
  const lateMinutes =
    Number.isFinite(startTime) && Number.isFinite(checkTime)
      ? Math.max(0, Math.round((checkTime - startTime) / 60000))
      : 0;
  const billableLateMinutes = Math.max(0, lateMinutes - 10);
  const penaltyRate = Math.min(1, billableLateMinutes / duration);
  const score = Math.max(0, positiveNumber(meeting.points, 1) * (1 - penaltyRate));

  return {
    lateMinutes,
    score: Math.round(score * 100) / 100,
  };
}

function getMember(data: StudioData, memberId: string) {
  const member = data.members.find((item) => item.id === memberId);
  if (!member) throw new Error("Member not found.");
  return member;
}

function assignedMemberIds(task: Partial<StudioTask>) {
  return uniqueText(task.memberIds ?? (task.memberId ? [String(task.memberId)] : []));
}

function taskIsAssignedToMember(data: StudioData, task: StudioTask, memberId: string) {
  if (task.scope === "all") return data.members.some((member) => member.id === memberId);
  return assignedMemberIds(task).includes(memberId);
}

function checkedMemberIds(data: StudioData, memberIds: string[]) {
  const cleanIds = uniqueText(memberIds);
  for (const memberId of cleanIds) getMember(data, memberId);
  return cleanIds;
}

function normalizeProblemAnswer(value: string) {
  return value
    .trim()
    .toLowerCase()
    .normalize("NFKC")
    .replace(/[^\p{L}\p{N}]+/gu, "");
}

function findDuplicateProblemAnswer(
  data: StudioData,
  task: StudioTask,
  memberId: string,
  answer: string,
) {
  if (task.taskType !== "problem") return undefined;
  const normalizedAnswer = normalizeProblemAnswer(answer);
  if (!normalizedAnswer) return undefined;

  return Object.values(data.responses[task.id] ?? {}).find(
    (response) =>
      response.memberId !== memberId &&
      normalizeProblemAnswer(response.answer) === normalizedAnswer,
  );
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

function mergeTaskUpdates(latest: StudioData, incoming: StudioData) {
  const allowedTaskIds = new Set(incoming.tasks.map((task) => task.id));
  const taskIds = new Set([
    ...Object.keys(latest.taskUpdates ?? {}),
    ...Object.keys(incoming.taskUpdates ?? {}),
  ]);
  const taskUpdates: NonNullable<StudioData["taskUpdates"]> = {};

  for (const taskId of taskIds) {
    if (!allowedTaskIds.has(taskId)) continue;
    const byId = new Map<string, TaskAnnouncement>();
    for (const update of latest.taskUpdates?.[taskId] ?? []) byId.set(update.id, update);
    for (const update of incoming.taskUpdates?.[taskId] ?? []) byId.set(update.id, update);
    taskUpdates[taskId] = Array.from(byId.values()).sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );
  }

  return taskUpdates;
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

function mergeInteractions(latest: StudioData, incoming: StudioData) {
  const byKey = new Map<string, MemberInteraction>();
  for (const interaction of incoming.interactions ?? []) {
    byKey.set(interactionKey(interaction.memberId, interaction.targetType, interaction.targetId), interaction);
  }
  for (const interaction of latest.interactions ?? []) {
    const key = interactionKey(interaction.memberId, interaction.targetType, interaction.targetId);
    if (!byKey.has(key)) byKey.set(key, interaction);
  }
  return Array.from(byKey.values()).sort(
    (a, b) => new Date(b.seenAt).getTime() - new Date(a.seenAt).getTime(),
  );
}

function mergeBonusGrades(latest: StudioData, incoming: StudioData) {
  const byId = new Map<string, BonusGrade>();
  for (const bonus of incoming.bonusGrades ?? []) byId.set(bonus.id, bonus);
  for (const bonus of latest.bonusGrades ?? []) byId.set(bonus.id, bonus);
  return Array.from(byId.values()).sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );
}

function mergeAdminReplacement(latest: StudioData, incomingPayload: StudioData) {
  const incoming = normalizeData(incomingPayload);
  return {
    ...incoming,
    responses: mergeResponses(latest, incoming),
    taskSkips: mergeTaskSkips(latest, incoming),
    progressUpdates: mergeProgressUpdates(latest, incoming),
    taskUpdates: mergeTaskUpdates(latest, incoming),
    meetingAttendance: mergeMeetingAttendance(latest, incoming),
    interactions: mergeInteractions(latest, incoming),
    bonusGrades: mergeBonusGrades(latest, incoming),
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
          const task = getTask(data, String(item.taskId ?? ""));
          const member = getMember(data, String(item.memberId ?? ""));
          if (!taskIsAssignedToMember(data, task, member.id)) {
            throw new Error("This task is not assigned to this member.");
          }
          const answer = String(item.answer ?? "").trim();
          if (!answer) throw new Error("Submission answer is required.");
          const previous = data.responses[task.id]?.[member.id];
          if (previous && previous.status !== "rejected") {
            throw new Error("This member already submitted this task.");
          }
          const duplicate = findDuplicateProblemAnswer(data, task, member.id, answer);
          if (duplicate) {
            throw new Error("Duplicate problem solution. Read previous submissions and write a different solution.");
          }
          const submittedAt = new Date().toISOString();
          const repoUpdate = repoUpdateFromText({
            memberId: member.id,
            taskId: task.id,
            source: "submission",
            text: answer,
          });
          return {
            ...data,
            responses: {
              ...data.responses,
              [task.id]: {
                ...(data.responses[task.id] ?? {}),
                [member.id]: {
                  memberId: member.id,
                  memberName: member.name,
                  answer,
                  status: "submitted",
                  submittedAt,
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
          const task = getTask(data, item.taskId);
          const member = getMember(data, item.memberId);
          if (!taskIsAssignedToMember(data, task, member.id)) {
            throw new Error("This task is not assigned to this member.");
          }
          const note = String(item.note ?? "").trim();
          if (!note) throw new Error("Progress note is required.");
          const repoUpdate = attentionUpdate({
            memberId: member.id,
            taskId: task.id,
            source: "progress",
            text: note,
          });
          return {
            ...data,
            progressUpdates: {
              ...(data.progressUpdates ?? {}),
              [task.id]: [
                {
                  id: item.id || `progress-${Date.now()}`,
                  taskId: task.id,
                  memberId: member.id,
                  memberName: member.name,
                  note,
                  createdAt: new Date().toISOString(),
                },
                ...((data.progressUpdates ?? {})[task.id] ?? []),
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
          source?: RepoUpdate["source"];
        };
        const next = await commitData(env, `Repo attention by ${item.memberId}`, (data) => {
          const member = getMember(data, item.memberId);
          if (item.taskId) {
            const task = getTask(data, item.taskId);
            if (!taskIsAssignedToMember(data, task, member.id)) {
              throw new Error("This task is not assigned to this member.");
            }
          }
          const source: RepoUpdate["source"] = item.source === "drive" ? "drive" : "manual";
          const update: RepoUpdate = {
            id: `repo-${source}-${item.memberId}-${item.taskId ?? "general"}-${Date.now()}`,
            memberId: member.id,
            taskId: item.taskId,
            source,
            excerpt: String(
              item.excerpt ??
                item.note ??
                (source === "drive" ? "Drive attention requested." : "GitHub attention requested."),
            ).slice(0, 140),
            createdAt: new Date().toISOString(),
            seen: false,
          };
          return { ...data, repoUpdates: appendRepoUpdate(data, update) };
        });
        return json(env, next);
      }

      if (request.method === "POST" && url.pathname === "/api/interactions") {
        const item = (await request.json()) as Partial<MemberInteraction>;
        const next = await commitData(env, `Seen ${item.targetType ?? "target"} by ${item.memberId ?? "member"}`, (data) => {
          const memberId = String(item.memberId ?? "");
          const targetId = String(item.targetId ?? "");
          const targetType =
            item.targetType === "taskUpdate"
              ? "taskUpdate"
              : item.targetType === "meeting"
                ? "meeting"
                : item.targetType === "task"
                  ? "task"
                  : "";
          if (!memberId || !targetId || !targetType) throw new Error("Seen target is required.");
          getMember(data, memberId);
          const taskId = item.taskId ? String(item.taskId) : undefined;
          if (targetType === "task") {
            const task = getTask(data, targetId);
            if (!taskIsAssignedToMember(data, task, memberId)) {
              throw new Error("This task is not assigned to this member.");
            }
          }
          if (targetType === "taskUpdate") {
            if (!taskId) throw new Error("Task update seen needs task id.");
            const task = getTask(data, taskId);
            if (!taskIsAssignedToMember(data, task, memberId)) {
              throw new Error("This task is not assigned to this member.");
            }
            const updateExists = (data.taskUpdates?.[taskId] ?? []).some((update) => update.id === targetId);
            if (!updateExists) throw new Error("Task update not found.");
          }
          if (targetType === "meeting") getMeeting(data, targetId);
          const key = interactionKey(memberId, targetType, targetId);
          if ((data.interactions ?? []).some((interaction) => interactionKey(interaction.memberId, interaction.targetType, interaction.targetId) === key)) {
            return data;
          }
          const interaction: MemberInteraction = {
            id: key,
            memberId,
            targetType,
            targetId,
            ...(taskId ? { taskId } : {}),
            seenAt: new Date().toISOString(),
          };
          return {
            ...data,
            interactions: [interaction, ...(data.interactions ?? [])],
          };
        });
        return json(env, next);
      }

      if (request.method === "POST" && url.pathname === "/api/profile-requests") {
        const item = (await request.json()) as {
          memberId: string;
          nickname?: string;
          repoUrl?: string;
          driveUrl?: string;
        };
        const next = await commitData(env, `Profile request by ${item.memberId}`, (data) => {
          const member = getMember(data, String(item.memberId ?? ""));
          const hasNickname = Object.prototype.hasOwnProperty.call(item, "nickname");
          const hasRepoUrl = Object.prototype.hasOwnProperty.call(item, "repoUrl");
          const hasDriveUrl = Object.prototype.hasOwnProperty.call(item, "driveUrl");
          const nickname = String(item.nickname ?? "").trim();
          const repoUrl = String(item.repoUrl ?? "").trim();
          const driveUrl = String(item.driveUrl ?? "").trim();
          if ((!hasNickname || !nickname) && !hasRepoUrl && !hasDriveUrl) {
            throw new Error("Nickname, GitHub repo, or Drive link is required.");
          }
          const profileRequest: MemberProfileRequest = {
            id: `profile-${member.id}-${Date.now()}`,
            memberId: member.id,
            memberName: member.name,
            createdAt: new Date().toISOString(),
            status: "pending",
            ...(nickname ? { nickname } : {}),
            ...(hasRepoUrl ? { repoUrl } : {}),
            ...(hasDriveUrl ? { driveUrl } : {}),
            previousAliases: member.aliases ?? [],
            previousRepoUrl: member.repoUrl ?? "",
            previousDriveUrl: member.driveUrl ?? "",
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
            const scope = task.scope === "member" ? "member" : "all";
            const memberIds = scope === "member" ? checkedMemberIds(data, assignedMemberIds(task)) : [];
            if (scope === "member" && memberIds.length === 0) throw new Error("Member task needs at least one member.");
            const nextTask: StudioTask = {
              id: `task-${Date.now()}`,
              title: String(task.title),
              question: String(task.question),
              points: positiveNumber(task.points, 1),
              taskType: task.taskType === "problem" ? "problem" : "task",
              scope,
              memberId: scope === "member" ? memberIds[0] : undefined,
              memberIds,
              createdAt: new Date().toISOString(),
              startAt: task.startAt || new Date().toISOString(),
              deadlineAt: task.deadlineAt || "",
              status: task.status === "archived" ? "archived" : "active",
            };
            return { ...data, tasks: [...data.tasks, nextTask] };
          }

          if (action === "updateTask") {
            const taskId = String(payload.taskId ?? "");
            const existingTask = getTask(data, taskId);
            const updates = (payload.updates ?? {}) as Partial<StudioTask>;
            const nextScope = updates.scope === "member" ? "member" : updates.scope === "all" ? "all" : existingTask.scope;
            const fallbackMemberIds = assignedMemberIds(existingTask);
            const incomingMemberIds =
              updates.memberIds !== undefined || updates.memberId !== undefined
                ? assignedMemberIds(updates)
                : fallbackMemberIds;
            const nextMemberIds =
              nextScope === "member" ? checkedMemberIds(data, incomingMemberIds) : [];
            if (nextScope === "member" && nextMemberIds.length === 0) {
              throw new Error("Member task needs at least one member.");
            }
            return {
              ...data,
              tasks: data.tasks.map((task) =>
                task.id === taskId
                  ? {
                      ...task,
                      ...updates,
                      scope: nextScope,
                      memberId: nextScope === "member" ? nextMemberIds[0] : undefined,
                      memberIds: nextMemberIds,
                      points:
                        updates.points === undefined
                          ? task.points
                          : positiveNumber(updates.points, task.points || 1),
                      taskType:
                        updates.taskType === "problem"
                          ? "problem"
                          : updates.taskType === "task"
                            ? "task"
                            : task.taskType === "problem"
                              ? "problem"
                              : "task",
                      status: updates.status === "archived" ? "archived" : updates.status === "active" ? "active" : taskStatus(task),
                    }
                  : task,
              ),
            };
          }

          if (action === "addTaskUpdate") {
            const taskId = String(payload.taskId ?? "");
            getTask(data, taskId);
            const message = String(payload.message ?? "").trim();
            if (!message) throw new Error("Task update message is required.");
            const update: TaskAnnouncement = {
              id: `task-update-${taskId}-${Date.now()}`,
              taskId,
              message,
              createdAt: new Date().toISOString(),
            };
            return {
              ...data,
              taskUpdates: {
                ...(data.taskUpdates ?? {}),
                [taskId]: [update, ...((data.taskUpdates ?? {})[taskId] ?? [])],
              },
            };
          }

          if (action === "addMeeting") {
            const meeting = payload.meeting as Partial<Meeting> | undefined;
            const title = String(meeting?.title ?? "").trim();
            if (!title) throw new Error("Meeting title is required.");
            const nextMeeting: Meeting = {
              id: `meeting-${Date.now()}`,
              title,
              startsAt: meeting?.startsAt || new Date().toISOString(),
              durationMinutes: Math.floor(positiveNumber(meeting?.durationMinutes, 60)),
              points: positiveNumber(meeting?.points, 1),
              status: meeting?.status === "archived" ? "archived" : "active",
              createdAt: new Date().toISOString(),
            };
            return { ...data, meetings: [...(data.meetings ?? []), nextMeeting] };
          }

          if (action === "updateMeeting") {
            const meetingId = String(payload.meetingId ?? "");
            const existingMeeting = getMeeting(data, meetingId);
            const updates = (payload.updates ?? {}) as Partial<Meeting>;
            return {
              ...data,
              meetings: (data.meetings ?? []).map((meeting) =>
                meeting.id === meetingId
                  ? {
                      ...meeting,
                      ...updates,
                      title: updates.title === undefined ? meeting.title : String(updates.title).trim() || meeting.title,
                      startsAt: updates.startsAt || meeting.startsAt,
                      durationMinutes:
                        updates.durationMinutes === undefined
                          ? meeting.durationMinutes
                          : Math.floor(positiveNumber(updates.durationMinutes, meeting.durationMinutes || 60)),
                      points:
                        updates.points === undefined
                          ? meeting.points
                          : positiveNumber(updates.points, meeting.points || 1),
                      status:
                        updates.status === "archived"
                          ? "archived"
                          : updates.status === "active"
                            ? "active"
                            : meetingStatus(existingMeeting),
                    }
                  : meeting,
              ),
            };
          }

          if (action === "removeMeeting") {
            const meetingId = String(payload.meetingId ?? "");
            getMeeting(data, meetingId);
            const meetingAttendance = { ...(data.meetingAttendance ?? {}) };
            delete meetingAttendance[meetingId];
            return {
              ...data,
              meetings: (data.meetings ?? []).filter((meeting) => meeting.id !== meetingId),
              meetingAttendance,
              interactions: (data.interactions ?? []).filter(
                (interaction) => !(interaction.targetType === "meeting" && interaction.targetId === meetingId),
              ),
            };
          }

          if (action === "recordMeetingAttendance") {
            const meetingId = String(payload.meetingId ?? "");
            const memberId = String(payload.memberId ?? "");
            const meeting = getMeeting(data, meetingId);
            const member = getMember(data, memberId);
            const checkedAt = new Date().toISOString();
            const startTime = new Date(meeting.startsAt).getTime();
            if (Number.isFinite(startTime) && checkedAt && Date.now() < startTime) {
              throw new Error("Attendance is not open yet.");
            }
            const calculated = calculateMeetingAttendance(meeting, checkedAt);
            return {
              ...data,
              meetingAttendance: {
                ...(data.meetingAttendance ?? {}),
                [meeting.id]: {
                  ...((data.meetingAttendance ?? {})[meeting.id] ?? {}),
                  [member.id]: {
                    memberId: member.id,
                    memberName: member.name,
                    checkedAt,
                    lateMinutes: calculated.lateMinutes,
                    score: calculated.score,
                  },
                },
              },
            };
          }

          if (action === "removeTask") {
            const taskId = String(payload.taskId ?? "");
            getTask(data, taskId);
            const responses = { ...data.responses };
            const progressUpdates = { ...(data.progressUpdates ?? {}) };
            const taskSkips = { ...(data.taskSkips ?? {}) };
            const taskUpdates = { ...(data.taskUpdates ?? {}) };
            delete responses[taskId];
            delete progressUpdates[taskId];
            delete taskSkips[taskId];
            delete taskUpdates[taskId];
            return {
              ...data,
              tasks: data.tasks.filter((task) => task.id !== taskId),
              responses,
              progressUpdates,
              taskSkips,
              taskUpdates,
              interactions: (data.interactions ?? []).filter(
                (interaction) =>
                  !(
                    interaction.taskId === taskId ||
                    (interaction.targetType === "task" && interaction.targetId === taskId)
                  ),
              ),
              repoUpdates: (data.repoUpdates ?? []).filter((update) => update.taskId !== taskId),
            };
          }

          if (action === "addBonusGrade") {
            const memberId = String(payload.memberId ?? "");
            const member = getMember(data, memberId);
            const points = anyNumber(payload.points, 0);
            const note = String(payload.note ?? "").trim();
            if (points === 0) throw new Error("Bonus points must not be zero.");
            if (!note) throw new Error("Bonus note is required.");
            const bonus: BonusGrade = {
              id: `bonus-${member.id}-${Date.now()}`,
              memberId: member.id,
              points: roundScore(points),
              note,
              createdAt: new Date().toISOString(),
            };
            return {
              ...data,
              bonusGrades: [bonus, ...(data.bonusGrades ?? [])],
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
                      driveUrl:
                        profileRequest.driveUrl === undefined
                          ? item.driveUrl ?? ""
                          : profileRequest.driveUrl,
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
