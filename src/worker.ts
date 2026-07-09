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
  taskType?: TaskType | "task";
  htmlSubmissionMode?: HtmlSubmissionMode;
  scope: "all" | "member";
  memberId?: string;
  memberIds?: string[];
  createdAt: string;
  startAt?: string;
  deadlineAt?: string;
  status?: "active" | "hidden" | "archived";
};

type TaskType = "technical" | "nonTechnical" | "problem";
type HtmlSubmissionMode = "off" | "optional" | "required";
type VisualSubmissionKind = "html" | "svg";

type HtmlSubmissionFile = {
  name: string;
  size: number;
  type: string;
  lastModified: number;
  content: string;
  kind?: VisualSubmissionKind;
};

type TaskResponse = {
  memberId: string;
  memberName: string;
  answer: string;
  htmlFile?: HtmlSubmissionFile;
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

type TaskClarificationRequest = {
  id: string;
  taskId: string;
  title: string;
  description: string;
  memberIds: string[];
  createdAt: string;
  status?: "active" | "archived";
};

type TaskClarificationResponse = {
  requestId: string;
  taskId: string;
  memberId: string;
  memberName: string;
  answer: string;
  htmlFile?: HtmlSubmissionFile;
  status: "submitted" | "approved" | "rejected";
  submittedAt: string;
  reviewedAt?: string;
  reviewEvents?: TaskReviewEvent[];
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
  manual?: boolean;
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

type DocumentationFileMetadata = {
  name: string;
  size: number;
  type: string;
  lastModified: number;
};

type DocumentationRequest = {
  id: string;
  problemId: string;
  memberId: string;
  memberName: string;
  sourceSubmittedAt: string;
  requestedAt: string;
  submittedAt?: string;
  status: "requested" | "submitted";
  awardedPoints: number;
  file?: DocumentationFileMetadata;
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
  clarificationRequests?: TaskClarificationRequest[];
  clarificationResponses?: Record<string, Record<string, TaskClarificationResponse>>;
  taskSkips?: Record<string, Record<string, TaskSkip>>;
  progressUpdates?: Record<string, TaskProgressUpdate[]>;
  taskUpdates?: Record<string, TaskAnnouncement[]>;
  meetings?: Meeting[];
  meetingAttendance?: Record<string, Record<string, MeetingAttendance>>;
  interactions?: MemberInteraction[];
  bonusGrades?: BonusGrade[];
  repoUpdates?: RepoUpdate[];
  profileRequests?: MemberProfileRequest[];
  documentationRequests?: DocumentationRequest[];
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
const DOCUMENTATION_POINTS = 1;
const DOCX_MIME = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
const VISUAL_FILE_MAX_BYTES = 500 * 1024;
const HTML_FILE_TYPE = "text/html";
const SVG_FILE_TYPE = "image/svg+xml";

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

function normalizedTaskType(task: Pick<StudioTask, "taskType" | "points">): TaskType {
  if (task.taskType === "problem") return "problem";
  if (task.taskType === "technical") return "technical";
  if (task.taskType === "nonTechnical") return "nonTechnical";
  return Number(task.points) === 5 ? "technical" : "nonTechnical";
}

function htmlSubmissionMode(task: Pick<StudioTask, "htmlSubmissionMode">): HtmlSubmissionMode {
  if (task.htmlSubmissionMode === "required") return "required";
  if (task.htmlSubmissionMode === "optional") return "optional";
  return "off";
}

function htmlContentByteLength(value: string) {
  return new TextEncoder().encode(value).byteLength;
}

function visualSubmissionKindFromName(name: string): VisualSubmissionKind | undefined {
  const lowerName = name.trim().toLowerCase();
  if (lowerName.endsWith(".svg")) return "svg";
  if (lowerName.endsWith(".html") || lowerName.endsWith(".htm")) return "html";
  return undefined;
}

function visualSubmissionKindFromContent(content: string): VisualSubmissionKind {
  const trimmed = content.trim().toLowerCase();
  if (trimmed.startsWith("<svg") || trimmed.includes("<svg")) return "svg";
  return "html";
}

function isVisualMime(type: string | undefined, kind: VisualSubmissionKind) {
  if (!type) return true;
  if (kind === "svg") return type === SVG_FILE_TYPE || type === "text/plain" || type === "text/xml";
  return type === HTML_FILE_TYPE || type === "text/plain";
}

function visualSubmissionName(kind: VisualSubmissionKind) {
  return kind === "svg" ? "flow.svg" : "flow.html";
}

function normalizePastedVisualCode(value: string) {
  const trimmed = value.trim();
  const fenced = trimmed.match(/^```(?:html|svg|xml)?\s*([\s\S]*?)\s*```$/i);
  return (fenced?.[1] ?? trimmed).trim();
}

function validateVisualSubmissionContent(content: string, kind: VisualSubmissionKind) {
  const trimmed = content.trim();
  const lowerContent = trimmed.toLowerCase();
  if (!trimmed) throw new Error("Visual content is empty.");
  if (kind === "svg" && !lowerContent.includes("<svg")) {
    throw new Error("SVG content must include an <svg> element.");
  }
  if (
    kind === "html" &&
    !lowerContent.startsWith("<!doctype html") &&
    !lowerContent.includes("<html")
  ) {
    throw new Error("HTML content must be a complete HTML document.");
  }
}

function cleanHtmlSubmissionFile(file?: Partial<HtmlSubmissionFile>) {
  if (!file) return undefined;
  const name = String(file.name ?? "").trim();
  const content = normalizePastedVisualCode(String(file.content ?? ""));
  const nameKind = visualSubmissionKindFromName(name);
  const kind =
    file.kind === "svg" || file.kind === "html"
      ? file.kind
      : (nameKind ?? visualSubmissionKindFromContent(content));
  const type = String(file.type || (kind === "svg" ? SVG_FILE_TYPE : HTML_FILE_TYPE));
  if (name && (!nameKind || nameKind !== kind))
    throw new Error("Only one HTML or SVG file is accepted.");
  if (!isVisualMime(type, kind)) throw new Error("The visual file type is not accepted.");
  validateVisualSubmissionContent(content, kind);
  const size = htmlContentByteLength(content);
  if (size > VISUAL_FILE_MAX_BYTES) throw new Error("Visual content must be 500 KB or smaller.");
  return {
    name: name || visualSubmissionName(kind),
    size,
    type,
    lastModified: nonNegativeNumber(file.lastModified, 0),
    content,
    kind,
  };
}

function clarificationRequestStatus(request: Pick<TaskClarificationRequest, "status">) {
  return request.status === "archived" ? "archived" : "active";
}

function clarificationTargetMemberIds(data: StudioData, task: StudioTask) {
  return data.members
    .filter((member) => taskIsAssignedToMember(data, task, member.id))
    .filter((member) => !data.taskSkips?.[task.id]?.[member.id])
    .map((member) => member.id);
}

function cleanClarificationRequests(
  data: StudioData,
  tasks: StudioTask[],
  members: Member[],
): TaskClarificationRequest[] {
  const taskMap = new Map(tasks.map((task) => [task.id, task]));
  const memberIds = new Set(members.map((member) => member.id));
  const normalizedData = { ...data, tasks, members };
  const byId = new Map<string, TaskClarificationRequest>();

  for (const request of data.clarificationRequests ?? []) {
    const task = taskMap.get(request.taskId);
    if (!task) continue;
    const requestedMemberIds = uniqueText(request.memberIds ?? []).filter((memberId) =>
      memberIds.has(memberId),
    );
    const fallbackMemberIds = clarificationTargetMemberIds(normalizedData, task);
    const targetMemberIds = requestedMemberIds.length > 0 ? requestedMemberIds : fallbackMemberIds;
    if (targetMemberIds.length === 0) continue;
    const title = String(request.title ?? "").trim() || "طلب توضيح";
    const createdAt = request.createdAt || new Date().toISOString();
    const id = request.id || `clarification-${request.taskId}-${createdAt}`;
    if (byId.has(id)) continue;
    byId.set(id, {
      id,
      taskId: task.id,
      title,
      description: String(request.description ?? "").trim(),
      memberIds: targetMemberIds,
      createdAt,
      status: clarificationRequestStatus(request),
    });
  }

  return Array.from(byId.values()).sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
  );
}

function cleanClarificationResponses(
  data: StudioData,
  requests: TaskClarificationRequest[],
  members: Member[],
): StudioData["clarificationResponses"] {
  const requestMap = new Map(requests.map((request) => [request.id, request]));
  const memberIds = new Set(members.map((member) => member.id));

  return Object.fromEntries(
    Object.entries(data.clarificationResponses ?? {})
      .filter(([requestId]) => requestMap.has(requestId))
      .map(([requestId, responses]) => {
        const request = requestMap.get(requestId);
        return [
          requestId,
          Object.fromEntries(
            Object.entries(responses ?? {})
              .filter(([memberId]) => {
                return Boolean(
                  request &&
                  clarificationRequestStatus(request) === "active" &&
                  memberIds.has(memberId) &&
                  request.memberIds.includes(memberId),
                );
              })
              .map(([memberId, response]) => {
                const responseFields = { ...response };
                delete responseFields.htmlFile;
                let htmlFile: HtmlSubmissionFile | undefined;
                try {
                  htmlFile = cleanHtmlSubmissionFile(response.htmlFile);
                } catch {
                  htmlFile = undefined;
                }
                return [
                  memberId,
                  {
                    ...responseFields,
                    requestId,
                    taskId: request?.taskId ?? response.taskId,
                    memberId: response.memberId || memberId,
                    memberName: response.memberName || memberId,
                    answer: String(response.answer ?? ""),
                    status:
                      response.status === "approved" || response.status === "rejected"
                        ? response.status
                        : "submitted",
                    submittedAt: response.submittedAt || new Date().toISOString(),
                    ...(htmlFile ? { htmlFile } : {}),
                  },
                ];
              }),
          ),
        ];
      }),
  );
}

function isTechnicalTask(task: StudioTask) {
  return normalizedTaskType(task) === "technical";
}

function interactionKey(memberId: string, targetType: InteractionTargetType, targetId: string) {
  return `${memberId}:${targetType}:${targetId}`;
}

function documentationRequestKey(problemId: string, memberId: string, submittedAt: string) {
  return `${problemId}:${memberId}:${submittedAt}`;
}

function documentationRequestId(problemId: string, memberId: string, submittedAt: string) {
  const submittedTime = new Date(submittedAt).getTime();
  return `documentation-${problemId}-${memberId}-${Number.isFinite(submittedTime) ? submittedTime : submittedAt}`;
}

function isDocxMetadata(file?: Partial<DocumentationFileMetadata>) {
  const name = String(file?.name ?? "").toLowerCase();
  const type = String(file?.type ?? "");
  return name.endsWith(".docx") || type === DOCX_MIME;
}

function deriveDocumentationRequests(
  data: StudioData,
  tasks: StudioTask[],
  members: Member[],
): DocumentationRequest[] {
  const taskIds = new Set(tasks.map((task) => task.id));
  const memberMap = new Map(members.map((member) => [member.id, member]));
  const byKey = new Map<string, DocumentationRequest>();

  for (const request of data.documentationRequests ?? []) {
    if (!taskIds.has(request.problemId) || !memberMap.has(request.memberId)) continue;
    if (!request.sourceSubmittedAt || !request.requestedAt) continue;
    const key = documentationRequestKey(
      request.problemId,
      request.memberId,
      request.sourceSubmittedAt,
    );
    if (byKey.has(key)) continue;
    const status = request.status === "submitted" && request.file ? "submitted" : "requested";
    byKey.set(key, {
      ...request,
      id:
        request.id ||
        documentationRequestId(request.problemId, request.memberId, request.sourceSubmittedAt),
      memberName: request.memberName || memberMap.get(request.memberId)?.name || request.memberId,
      status,
      awardedPoints: status === "submitted" ? DOCUMENTATION_POINTS : 0,
      file: request.file
        ? {
            name: request.file.name,
            size: nonNegativeNumber(request.file.size, 0),
            type: request.file.type || DOCX_MIME,
            lastModified: nonNegativeNumber(request.file.lastModified, 0),
          }
        : undefined,
    });
  }

  for (const task of tasks.filter((task) => normalizedTaskType(task) === "problem")) {
    for (const response of Object.values(data.responses[task.id] ?? {})) {
      if (response.status !== "approved") continue;
      if (!memberMap.has(response.memberId)) continue;
      const key = documentationRequestKey(task.id, response.memberId, response.submittedAt);
      if (byKey.has(key)) continue;
      byKey.set(key, {
        id: documentationRequestId(task.id, response.memberId, response.submittedAt),
        problemId: task.id,
        memberId: response.memberId,
        memberName: memberMap.get(response.memberId)?.name || response.memberName,
        sourceSubmittedAt: response.submittedAt,
        requestedAt: response.reviewedAt || response.submittedAt,
        status: "requested",
        awardedPoints: 0,
      });
    }
  }

  return Array.from(byKey.values()).sort(
    (a, b) => new Date(b.requestedAt).getTime() - new Date(a.requestedAt).getTime(),
  );
}

function taskWindowDuration(task: StudioTask) {
  if (isTechnicalTask(task)) return null;
  if (!task.deadlineAt) return null;
  const startTime = new Date(task.startAt || task.createdAt).getTime();
  const deadlineTime = new Date(task.deadlineAt).getTime();
  if (!Number.isFinite(startTime) || !Number.isFinite(deadlineTime) || deadlineTime <= startTime) {
    return null;
  }
  return deadlineTime - startTime;
}

function isSubmissionLate(task: StudioTask, response: Pick<TaskResponse, "submittedAt">) {
  if (isTechnicalTask(task)) return false;
  if (!task.deadlineAt) return false;
  const deadlineTime = new Date(task.deadlineAt).getTime();
  const submittedTime = new Date(response.submittedAt).getTime();
  return (
    Number.isFinite(deadlineTime) && Number.isFinite(submittedTime) && submittedTime > deadlineTime
  );
}

function isHardLocked(task: StudioTask, response: Pick<TaskResponse, "submittedAt">) {
  if (isTechnicalTask(task)) return false;
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
  const scoreOverride =
    status === "approved" && (overrideLocked || awardedPoints !== defaultPoints);
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
  const tasks: StudioTask[] = (data.tasks ?? []).map((task) => {
    const points = positiveNumber(task.points, 1);
    const taskType = normalizedTaskType({ ...task, points });
    const scope = task.scope === "member" ? "member" : "all";
    return {
      ...task,
      points,
      taskType,
      htmlSubmissionMode: htmlSubmissionMode(task),
      scope,
      memberId:
        scope === "member" ? (task.memberId ?? uniqueText(task.memberIds ?? [])[0]) : undefined,
      memberIds:
        scope === "member"
          ? uniqueText(task.memberIds ?? (task.memberId ? [task.memberId] : []))
          : [],
      startAt: task.startAt ?? task.createdAt,
      deadlineAt: taskType === "technical" ? "" : (task.deadlineAt ?? ""),
      status:
        task.status === "archived" ? "archived" : task.status === "hidden" ? "hidden" : "active",
    };
  });
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
  const responses: StudioData["responses"] = Object.fromEntries(
    Object.entries(data.responses ?? {})
      .filter(([taskId]) => taskIds.has(taskId))
      .map(([taskId, taskResponses]) => [
        taskId,
        Object.fromEntries(
          Object.entries(taskResponses ?? {}).map(([memberId, response]) => {
            const responseFields = { ...response };
            delete responseFields.htmlFile;
            let htmlFile: HtmlSubmissionFile | undefined;
            try {
              htmlFile = cleanHtmlSubmissionFile(response.htmlFile);
            } catch {
              htmlFile = undefined;
            }
            return [
              memberId,
              {
                ...responseFields,
                memberId: response.memberId || memberId,
                memberName: response.memberName || memberId,
                answer: String(response.answer ?? ""),
                status:
                  response.status === "approved" || response.status === "rejected"
                    ? response.status
                    : "submitted",
                ...(htmlFile ? { htmlFile } : {}),
              },
            ];
          }),
        ),
      ]),
  );
  const clarificationRequests = cleanClarificationRequests(data, tasks, members);
  const clarificationResponses = cleanClarificationResponses(data, clarificationRequests, members);

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
    responses,
    clarificationRequests,
    clarificationResponses,
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
      Object.entries(data.meetingAttendance ?? {}).filter(([meetingId]) =>
        meetingIds.has(meetingId),
      ),
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
            return [
              interactionKey(clean.memberId, clean.targetType, clean.targetId),
              clean,
            ] as const;
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
    documentationRequests: deriveDocumentationRequests(data, tasks, members),
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

async function commitData(env: Env, message: string, mutate: (current: StudioData) => StudioData) {
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
  return task.status === "archived" ? "archived" : task.status === "hidden" ? "hidden" : "active";
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

function getClarificationRequest(data: StudioData, requestId: string) {
  const request = (data.clarificationRequests ?? []).find((item) => item.id === requestId);
  if (!request) throw new Error("Clarification request not found.");
  return request;
}

function getClarificationResponse(data: StudioData, requestId: string, memberId: string) {
  return data.clarificationResponses?.[requestId]?.[memberId];
}

function activeClarificationRequestsForMember(data: StudioData, taskId: string, memberId: string) {
  return (data.clarificationRequests ?? [])
    .filter((request) => request.taskId === taskId)
    .filter((request) => clarificationRequestStatus(request) === "active")
    .filter((request) => request.memberIds.includes(memberId));
}

function memberClarificationsApproved(data: StudioData, task: StudioTask, memberId: string) {
  return activeClarificationRequestsForMember(data, task.id, memberId).every(
    (request) => getClarificationResponse(data, request.id, memberId)?.status === "approved",
  );
}

function withClarificationReviewEvent(
  response: TaskClarificationResponse,
  status: "approved" | "rejected",
  note: string,
): TaskClarificationResponse {
  const reviewedAt = new Date().toISOString();
  const event: TaskReviewEvent = {
    id: `clarification-review-${Date.now()}`,
    status,
    reviewedAt,
    ...(note ? { note } : {}),
  };
  return {
    ...response,
    status,
    reviewedAt,
    reviewEvents: [event, ...(response.reviewEvents ?? [])],
  };
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
  if (normalizedTaskType(task) !== "problem") return undefined;
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
  const taskIds = new Set([
    ...Object.keys(latest.responses ?? {}),
    ...Object.keys(incoming.responses ?? {}),
  ]);
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
    byKey.set(
      interactionKey(interaction.memberId, interaction.targetType, interaction.targetId),
      interaction,
    );
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

function mergeDocumentationRequests(latest: StudioData, incoming: StudioData) {
  const byKey = new Map<string, DocumentationRequest>();
  for (const request of incoming.documentationRequests ?? []) {
    byKey.set(
      documentationRequestKey(request.problemId, request.memberId, request.sourceSubmittedAt),
      request,
    );
  }
  for (const request of latest.documentationRequests ?? []) {
    byKey.set(
      documentationRequestKey(request.problemId, request.memberId, request.sourceSubmittedAt),
      request,
    );
  }
  return Array.from(byKey.values()).sort(
    (a, b) => new Date(b.requestedAt).getTime() - new Date(a.requestedAt).getTime(),
  );
}

function mergeClarificationRequests(latest: StudioData, incoming: StudioData) {
  const byId = new Map<string, TaskClarificationRequest>();
  for (const request of incoming.clarificationRequests ?? []) byId.set(request.id, request);
  for (const request of latest.clarificationRequests ?? []) byId.set(request.id, request);
  return Array.from(byId.values()).sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
  );
}

function mergeClarificationResponses(latest: StudioData, incoming: StudioData) {
  const requestIds = new Set([
    ...Object.keys(latest.clarificationResponses ?? {}),
    ...Object.keys(incoming.clarificationResponses ?? {}),
  ]);
  const responses: NonNullable<StudioData["clarificationResponses"]> = {};
  for (const requestId of requestIds) {
    responses[requestId] = {
      ...(latest.clarificationResponses?.[requestId] ?? {}),
      ...(incoming.clarificationResponses?.[requestId] ?? {}),
    };
  }
  return responses;
}

function mergeAdminReplacement(latest: StudioData, incomingPayload: StudioData) {
  const incoming = normalizeData(incomingPayload);
  return {
    ...incoming,
    responses: mergeResponses(latest, incoming),
    clarificationRequests: mergeClarificationRequests(latest, incoming),
    clarificationResponses: mergeClarificationResponses(latest, incoming),
    taskSkips: mergeTaskSkips(latest, incoming),
    progressUpdates: mergeProgressUpdates(latest, incoming),
    taskUpdates: mergeTaskUpdates(latest, incoming),
    meetingAttendance: mergeMeetingAttendance(latest, incoming),
    interactions: mergeInteractions(latest, incoming),
    bonusGrades: mergeBonusGrades(latest, incoming),
    documentationRequests: mergeDocumentationRequests(latest, incoming),
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
          if (taskStatus(task) !== "active") {
            throw new Error("This task is not active.");
          }
          if (!taskIsAssignedToMember(data, task, member.id)) {
            throw new Error("This task is not assigned to this member.");
          }
          if (!memberClarificationsApproved(data, task, member.id)) {
            throw new Error("All clarification requests must be approved before final submission.");
          }
          const answer = String(item.answer ?? "").trim();
          const taskType = normalizedTaskType(task);
          const htmlMode = htmlSubmissionMode(task);
          if (taskType === "problem" && !answer) throw new Error("Problem answer is required.");
          if (htmlMode === "off" && item.htmlFile) {
            throw new Error("This task does not accept visual submissions.");
          }
          const htmlFile = htmlMode === "off" ? undefined : cleanHtmlSubmissionFile(item.htmlFile);
          if (htmlMode === "required" && !htmlFile) {
            throw new Error("A visual submission is required for this task.");
          }
          const previous = data.responses[task.id]?.[member.id];
          if (previous && previous.status !== "rejected") {
            throw new Error("This member already submitted this task.");
          }
          if (
            taskType === "problem" &&
            previous?.status === "rejected" &&
            normalizeProblemAnswer(previous.answer) === normalizeProblemAnswer(answer)
          ) {
            throw new Error(
              "This rejected problem solution was already tried. Write a new solution.",
            );
          }
          const duplicate = findDuplicateProblemAnswer(data, task, member.id, answer);
          if (duplicate) {
            throw new Error(
              "Duplicate problem solution. Read previous submissions and write a different solution.",
            );
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
                  ...(htmlFile ? { htmlFile } : {}),
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

      if (request.method === "POST" && url.pathname === "/api/clarification-submissions") {
        const item = (await request.json()) as TaskClarificationResponse & { id?: string };
        const next = await commitData(
          env,
          `Clarification ${item.requestId} by ${item.memberId}`,
          (data) => {
            const clarificationRequest = getClarificationRequest(
              data,
              String(item.requestId ?? ""),
            );
            const task = getTask(data, clarificationRequest.taskId);
            const member = getMember(data, String(item.memberId ?? ""));
            if (taskStatus(task) !== "active") {
              throw new Error("This task is not active.");
            }
            if (clarificationRequestStatus(clarificationRequest) !== "active") {
              throw new Error("This clarification request is not active.");
            }
            if (!clarificationRequest.memberIds.includes(member.id)) {
              throw new Error("This clarification request is not assigned to this member.");
            }
            if (!taskIsAssignedToMember(data, task, member.id)) {
              throw new Error("This task is not assigned to this member.");
            }
            const answer = String(item.answer ?? "").trim();
            const htmlFile = item.htmlFile ? cleanHtmlSubmissionFile(item.htmlFile) : undefined;
            if (!answer && !htmlFile) {
              throw new Error("Clarification needs written text or a visual submission.");
            }
            const previous = data.clarificationResponses?.[clarificationRequest.id]?.[member.id];
            if (previous && previous.status !== "rejected") {
              throw new Error("This clarification is already submitted.");
            }
            const submittedAt = new Date().toISOString();
            const repoUpdate = repoUpdateFromText({
              memberId: member.id,
              taskId: task.id,
              source: "progress",
              text: answer || htmlFile?.name || "توضيح بصري",
            });
            return {
              ...data,
              clarificationResponses: {
                ...(data.clarificationResponses ?? {}),
                [clarificationRequest.id]: {
                  ...((data.clarificationResponses ?? {})[clarificationRequest.id] ?? {}),
                  [member.id]: {
                    requestId: clarificationRequest.id,
                    taskId: task.id,
                    memberId: member.id,
                    memberName: member.name,
                    answer,
                    ...(htmlFile ? { htmlFile } : {}),
                    status: "submitted",
                    submittedAt,
                    reviewEvents: previous?.reviewEvents ?? [],
                  },
                },
              },
              repoUpdates: appendRepoUpdate(data, repoUpdate),
            };
          },
        );
        return json(env, next);
      }

      if (request.method === "POST" && url.pathname === "/api/progress-updates") {
        const item = (await request.json()) as TaskProgressUpdate;
        const next = await commitData(
          env,
          `Progress ${item.taskId} by ${item.memberId}`,
          (data) => {
            const task = getTask(data, item.taskId);
            const member = getMember(data, item.memberId);
            if (taskStatus(task) !== "active") {
              throw new Error("This task is not active.");
            }
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
          },
        );
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
            if (taskStatus(task) !== "active") {
              throw new Error("This task is not active.");
            }
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
        const next = await commitData(
          env,
          `Seen ${item.targetType ?? "target"} by ${item.memberId ?? "member"}`,
          (data) => {
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
              if (taskStatus(task) !== "active") {
                throw new Error("This task is not active.");
              }
              if (!taskIsAssignedToMember(data, task, memberId)) {
                throw new Error("This task is not assigned to this member.");
              }
            }
            if (targetType === "taskUpdate") {
              if (!taskId) throw new Error("Task update seen needs task id.");
              const task = getTask(data, taskId);
              if (taskStatus(task) !== "active") {
                throw new Error("This task is not active.");
              }
              if (!taskIsAssignedToMember(data, task, memberId)) {
                throw new Error("This task is not assigned to this member.");
              }
              const updateExists = (data.taskUpdates?.[taskId] ?? []).some(
                (update) => update.id === targetId,
              );
              if (!updateExists) throw new Error("Task update not found.");
            }
            if (targetType === "meeting") getMeeting(data, targetId);
            const key = interactionKey(memberId, targetType, targetId);
            if (
              (data.interactions ?? []).some(
                (interaction) =>
                  interactionKey(
                    interaction.memberId,
                    interaction.targetType,
                    interaction.targetId,
                  ) === key,
              )
            ) {
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
          },
        );
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

      if (request.method === "POST" && url.pathname === "/api/documentation-submissions") {
        const item = (await request.json()) as {
          id?: string;
          memberId?: string;
          file?: Partial<DocumentationFileMetadata>;
        };
        const next = await commitData(
          env,
          `Documentation upload by ${item.memberId ?? "member"}`,
          (data) => {
            const requestId = String(item.id ?? "");
            const memberId = String(item.memberId ?? "");
            if (!requestId || !memberId)
              throw new Error("Documentation request and member are required.");
            getMember(data, memberId);
            if (!isDocxMetadata(item.file))
              throw new Error("Only Word .docx documentation files are accepted.");
            const existing = (data.documentationRequests ?? []).find(
              (request) => request.id === requestId,
            );
            if (!existing) throw new Error("Documentation request not found.");
            if (existing.memberId !== memberId)
              throw new Error("This documentation request belongs to another member.");
            const problem = getTask(data, existing.problemId);
            if (normalizedTaskType(problem) !== "problem")
              throw new Error("Documentation must belong to a problem.");
            const source = data.responses[problem.id]?.[memberId];
            if (
              !source ||
              source.status !== "approved" ||
              source.submittedAt !== existing.sourceSubmittedAt
            ) {
              throw new Error(
                "Documentation can only be uploaded for the accepted source solution.",
              );
            }
            const file: DocumentationFileMetadata = {
              name: String(item.file?.name ?? "").trim(),
              size: nonNegativeNumber(item.file?.size, 0),
              type: String(item.file?.type ?? DOCX_MIME) || DOCX_MIME,
              lastModified: nonNegativeNumber(item.file?.lastModified, 0),
            };
            const submittedAt = new Date().toISOString();
            return {
              ...data,
              documentationRequests: (data.documentationRequests ?? []).map((request) =>
                request.id === requestId
                  ? {
                      ...request,
                      status: "submitted",
                      submittedAt,
                      awardedPoints: DOCUMENTATION_POINTS,
                      file,
                    }
                  : request,
              ),
            };
          },
        );
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
          if (action === "replaceData")
            return mergeAdminReplacement(data, payload.data as StudioData);

          if (action === "addTask") {
            const task = payload.task as Partial<StudioTask> | undefined;
            if (!task?.title || !task.question)
              throw new Error("Task title and question are required.");
            const scope = task.scope === "member" ? "member" : "all";
            const memberIds =
              scope === "member" ? checkedMemberIds(data, assignedMemberIds(task)) : [];
            if (scope === "member" && memberIds.length === 0)
              throw new Error("Member task needs at least one member.");
            const points = positiveNumber(task.points, 1);
            const taskType = normalizedTaskType({ ...task, points });
            const nextTask: StudioTask = {
              id: `task-${Date.now()}`,
              title: String(task.title),
              question: String(task.question),
              points,
              taskType,
              htmlSubmissionMode: htmlSubmissionMode(task),
              scope,
              memberId: scope === "member" ? memberIds[0] : undefined,
              memberIds,
              createdAt: new Date().toISOString(),
              startAt: task.startAt || new Date().toISOString(),
              deadlineAt: taskType === "technical" ? "" : task.deadlineAt || "",
              status:
                task.status === "archived"
                  ? "archived"
                  : task.status === "hidden"
                    ? "hidden"
                    : "active",
            };
            return { ...data, tasks: [...data.tasks, nextTask] };
          }

          if (action === "updateTask") {
            const taskId = String(payload.taskId ?? "");
            const existingTask = getTask(data, taskId);
            const updates = (payload.updates ?? {}) as Partial<StudioTask>;
            const nextScope =
              updates.scope === "member"
                ? "member"
                : updates.scope === "all"
                  ? "all"
                  : existingTask.scope;
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
            const nextPoints =
              updates.points === undefined
                ? existingTask.points
                : positiveNumber(updates.points, existingTask.points || 1);
            const nextTaskType =
              updates.taskType === undefined
                ? normalizedTaskType({ taskType: existingTask.taskType, points: nextPoints })
                : normalizedTaskType({ taskType: updates.taskType, points: nextPoints });
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
                      points: nextPoints,
                      taskType: nextTaskType,
                      htmlSubmissionMode:
                        updates.htmlSubmissionMode === undefined
                          ? htmlSubmissionMode(task)
                          : htmlSubmissionMode(updates),
                      deadlineAt:
                        nextTaskType === "technical"
                          ? ""
                          : updates.deadlineAt === undefined
                            ? task.deadlineAt || ""
                            : updates.deadlineAt || "",
                      status:
                        updates.status === "archived"
                          ? "archived"
                          : updates.status === "hidden"
                            ? "hidden"
                            : updates.status === "active"
                              ? "active"
                              : taskStatus(task),
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

          if (action === "createClarificationRequest") {
            const taskId = String(payload.taskId ?? "");
            const task = getTask(data, taskId);
            if (taskStatus(task) !== "active") {
              throw new Error("Clarification requests can only be added to active tasks.");
            }
            const title = String(payload.title ?? "").trim() || "طلب توضيح";
            const description = String(payload.description ?? "").trim();
            const memberIds = clarificationTargetMemberIds(data, task);
            if (memberIds.length === 0) {
              throw new Error("No assigned members available for this clarification.");
            }
            const createdAt = new Date().toISOString();
            const clarificationRequest: TaskClarificationRequest = {
              id: `clarification-${task.id}-${Date.now()}`,
              taskId: task.id,
              title,
              description,
              memberIds,
              createdAt,
              status: "active",
            };
            return {
              ...data,
              clarificationRequests: [...(data.clarificationRequests ?? []), clarificationRequest],
            };
          }

          if (action === "requestDocumentation") {
            const problemId = String(payload.problemId ?? "");
            const problem = getTask(data, problemId);
            if (normalizedTaskType(problem) !== "problem") {
              throw new Error("Documentation can only be requested for problem tasks.");
            }
            const accepted = Object.values(data.responses[problem.id] ?? {}).filter(
              (response) => response.status === "approved",
            );
            if (accepted.length === 0) throw new Error("No accepted solutions to document yet.");
            const existingKeys = new Set(
              (data.documentationRequests ?? []).map((request) =>
                documentationRequestKey(
                  request.problemId,
                  request.memberId,
                  request.sourceSubmittedAt,
                ),
              ),
            );
            const requestedAt = new Date().toISOString();
            const additions = accepted
              .filter(
                (response) =>
                  !existingKeys.has(
                    documentationRequestKey(problem.id, response.memberId, response.submittedAt),
                  ),
              )
              .map((response) => {
                const member = getMember(data, response.memberId);
                return {
                  id: `documentation-${problem.id}-${response.memberId}-${Date.now()}`,
                  problemId: problem.id,
                  memberId: response.memberId,
                  memberName: member.name,
                  sourceSubmittedAt: response.submittedAt,
                  requestedAt,
                  status: "requested" as const,
                  awardedPoints: 0,
                };
              });
            if (additions.length === 0) return data;
            return {
              ...data,
              documentationRequests: [...additions, ...(data.documentationRequests ?? [])],
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
                      title:
                        updates.title === undefined
                          ? meeting.title
                          : String(updates.title).trim() || meeting.title,
                      startsAt: updates.startsAt || meeting.startsAt,
                      durationMinutes:
                        updates.durationMinutes === undefined
                          ? meeting.durationMinutes
                          : Math.floor(
                              positiveNumber(
                                updates.durationMinutes,
                                meeting.durationMinutes || 60,
                              ),
                            ),
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
                (interaction) =>
                  !(interaction.targetType === "meeting" && interaction.targetId === meetingId),
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

          if (action === "setMeetingAttendanceScore") {
            const meetingId = String(payload.meetingId ?? "");
            const memberId = String(payload.memberId ?? "");
            const meeting = getMeeting(data, meetingId);
            const member = getMember(data, memberId);
            const score = roundScore(anyNumber(payload.score, 0));
            const existing = data.meetingAttendance?.[meeting.id]?.[member.id];
            return {
              ...data,
              meetingAttendance: {
                ...(data.meetingAttendance ?? {}),
                [meeting.id]: {
                  ...((data.meetingAttendance ?? {})[meeting.id] ?? {}),
                  [member.id]: {
                    memberId: member.id,
                    memberName: member.name,
                    checkedAt: existing?.checkedAt ?? new Date().toISOString(),
                    lateMinutes: existing?.lateMinutes ?? 0,
                    score,
                    manual: true,
                  },
                },
              },
            };
          }

          if (action === "recalculateMeetingAttendanceScores") {
            const meetingId = String(payload.meetingId ?? "");
            const meeting = getMeeting(data, meetingId);
            const current = data.meetingAttendance?.[meeting.id] ?? {};
            return {
              ...data,
              meetingAttendance: {
                ...(data.meetingAttendance ?? {}),
                [meeting.id]: Object.fromEntries(
                  Object.entries(current).map(([memberId, attendance]) => {
                    const recalculated = calculateMeetingAttendance(meeting, attendance.checkedAt);
                    return [
                      memberId,
                      {
                        ...attendance,
                        lateMinutes: recalculated.lateMinutes,
                        score: recalculated.score,
                        manual: false,
                      },
                    ];
                  }),
                ),
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
            const removedClarificationIds = new Set(
              (data.clarificationRequests ?? [])
                .filter((request) => request.taskId === taskId)
                .map((request) => request.id),
            );
            const clarificationResponses = { ...(data.clarificationResponses ?? {}) };
            for (const requestId of removedClarificationIds)
              delete clarificationResponses[requestId];
            delete responses[taskId];
            delete progressUpdates[taskId];
            delete taskSkips[taskId];
            delete taskUpdates[taskId];
            return {
              ...data,
              tasks: data.tasks.filter((task) => task.id !== taskId),
              responses,
              clarificationRequests: (data.clarificationRequests ?? []).filter(
                (request) => request.taskId !== taskId,
              ),
              clarificationResponses,
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
              documentationRequests: (data.documentationRequests ?? []).filter(
                (request) => request.problemId !== taskId,
              ),
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
            const profileRequest = (data.profileRequests ?? []).find(
              (item) => item.id === requestId,
            );
            if (!profileRequest) throw new Error("Profile request not found.");
            if (profileRequest.status !== "pending")
              throw new Error("Profile request already reviewed.");
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
                        : (item.aliases ?? []),
                      repoUrl:
                        profileRequest.repoUrl === undefined
                          ? (item.repoUrl ?? "")
                          : profileRequest.repoUrl,
                      driveUrl:
                        profileRequest.driveUrl === undefined
                          ? (item.driveUrl ?? "")
                          : profileRequest.driveUrl,
                    }
                  : item,
              ),
              profileRequests: nextRequests,
            };
          }

          if (action === "reviewClarificationResponse") {
            const requestId = String(payload.requestId ?? "");
            const memberId = String(payload.memberId ?? "");
            const status = payload.status === "approved" ? "approved" : "rejected";
            const note = String(payload.note ?? "").trim();
            const clarificationRequest = getClarificationRequest(data, requestId);
            const task = getTask(data, clarificationRequest.taskId);
            getMember(data, memberId);
            if (!clarificationRequest.memberIds.includes(memberId)) {
              throw new Error("This clarification is not assigned to this member.");
            }
            const response = getClarificationResponse(data, requestId, memberId);
            if (!response) throw new Error("Clarification response not found.");
            return {
              ...data,
              clarificationResponses: {
                ...(data.clarificationResponses ?? {}),
                [requestId]: {
                  ...((data.clarificationResponses ?? {})[requestId] ?? {}),
                  [memberId]: withClarificationReviewEvent(
                    { ...response, taskId: task.id },
                    status,
                    note,
                  ),
                },
              },
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
            if (status === "approved" && !memberClarificationsApproved(data, task, memberId)) {
              throw new Error("Clarifications must be approved before final approval.");
            }
            return {
              ...data,
              responses: {
                ...data.responses,
                [taskId]: {
                  ...data.responses[taskId],
                  [memberId]: withReviewEvent(
                    task,
                    response,
                    status,
                    note,
                    awardedPoints,
                    overrideLocked,
                  ),
                },
              },
            };
          }

          if (action === "manualApprove") {
            const taskId = String(payload.taskId ?? "");
            const memberId = String(payload.memberId ?? "");
            const task = getTask(data, taskId);
            const member = getMember(data, memberId);
            if (!memberClarificationsApproved(data, task, memberId)) {
              throw new Error("Clarifications must be approved before manual approval.");
            }
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
                  [memberId]: withReviewEvent(
                    task,
                    response,
                    "approved",
                    "",
                    payload.awardedPoints,
                    true,
                  ),
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
