import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Archive,
  BarChart3,
  Bell,
  CalendarClock,
  Check,
  ChevronDown,
  ClipboardList,
  ExternalLink,
  Eye,
  EyeOff,
  FolderOpen,
  ListChecks,
  LogOut,
  Menu,
  Plus,
  RefreshCw,
  RotateCcw,
  Save,
  Search,
  Settings,
  Star,
  Trash2,
  Users,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/")({
  component: Index,
  head: () => ({
    meta: [
      { title: "Hivo Studio" },
      { name: "description", content: "Hivo Studio team tasks and idea review board." },
    ],
    links: [
      { rel: "icon", type: "image/png", href: `${import.meta.env.BASE_URL}hivo.png?v=2` },
      { rel: "shortcut icon", type: "image/png", href: `${import.meta.env.BASE_URL}hivo.png?v=2` },
      { rel: "apple-touch-icon", href: `${import.meta.env.BASE_URL}hivo.png?v=2` },
    ],
  }),
});

type Member = {
  id: string;
  name: string;
  aliases: string[];
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

type StudioSettings = {
  adminPassword: string;
  statsPassword: string;
  backendUrl?: string;
};

type QueuedSubmission = {
  id: string;
  taskId: string;
  memberId: string;
  memberName: string;
  answer: string;
  submittedAt: string;
};

type QueuedProgressUpdate = {
  id: string;
  taskId: string;
  memberId: string;
  memberName: string;
  note: string;
  createdAt: string;
};

type RepoAttentionRequest = {
  memberId: string;
  taskId?: string;
  excerpt?: string;
  note?: string;
  source?: RepoUpdate["source"];
};

type AdminQueue = {
  submissions: QueuedSubmission[];
  progressUpdates: QueuedProgressUpdate[];
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

type MemberProfileRequestInput = {
  memberId: string;
  nickname?: string;
  repoUrl?: string;
  driveUrl?: string;
};

type StudioData = {
  projectName: string;
  announcement?: string;
  settings?: StudioSettings;
  members: Member[];
  tasks: StudioTask[];
  responses: Record<string, Record<string, TaskResponse>>;
  taskSkips?: Record<string, Record<string, TaskSkip>>;
  progressUpdates?: Record<string, TaskProgressUpdate[]>;
  meetings?: Meeting[];
  meetingAttendance?: Record<string, Record<string, MeetingAttendance>>;
  repoUpdates?: RepoUpdate[];
  profileRequests?: MemberProfileRequest[];
  meta: { updatedAt: string };
};

type ActiveMember = {
  member: Member;
  displayName: string;
};

type MemberScore = {
  member: Member;
  assignedTasks: number;
  submitted: number;
  approved: number;
  rejected: number;
  pending: number;
  reviewed: number;
  baseCompleted: number;
  baseApproved: number;
  baseRejected: number;
  completed: number;
  taskPoints: number;
  basePoints: number;
  meetingPoints: number;
  points: number;
  avgHours: number | null;
  responseRate: number;
  approvalRate: number;
};

type TaskMetric = {
  task: StudioTask;
  received: number;
  expected: number;
  approved: number;
  rejected: number;
  submitted: number;
  progressUpdates: number;
};

type MeetingMetric = {
  meeting: Meeting;
  attended: number;
  expected: number;
  totalScore: number;
};

const DEFAULT_ADMIN_PASSWORD = "5678";
const DEFAULT_STATS_PASSWORD = "6789";
const ACTIVE_MEMBER_KEY = "hivo-studio-active-member";
const ACTIVE_DISPLAY_NAME_KEY = "hivo-studio-active-display-name";
const ADMIN_SESSION_KEY = "hivo-studio-admin";
const ADMIN_AUTH_KEY = "hivo-studio-admin-auth";
const STATS_SESSION_KEY = "hivo-studio-stats";
const GITHUB_TOKEN_KEY = "hivo-studio-github-token";
const REFRESHED_SESSION_KEY = "hivo-studio-refreshed-this-session";
const NICKNAME_HINT_KEY = "hivo-studio-nickname-hint";
const MEMBER_DRAFTS_KEY = "hivo-studio-member-drafts";
const MEMBER_SENT_STATE_KEY = "hivo-studio-member-sent-state";
const LOCAL_QUEUE_KEY = "hivo-studio-local-admin-queue";
const GITHUB_OWNER = "abdoabozena7";
const GITHUB_REPO = "Team-tasks";
const GITHUB_BRANCH = "main";
const GITHUB_DATA_PATHS = ["team-data.json", "public/team-data.json"];
const DEFAULT_HIVO_API_URL = "https://hivo-studio-api.boodyabozena.workers.dev";
const HIVO_API_URL = (import.meta.env.VITE_HIVO_API_URL || DEFAULT_HIVO_API_URL).replace(/\/+$/, "");
const HIVO_QUEUE_URL = `${HIVO_API_URL}/api`;

const DEFAULT_SETTINGS: StudioSettings = {
  adminPassword: DEFAULT_ADMIN_PASSWORD,
  statsPassword: DEFAULT_STATS_PASSWORD,
  backendUrl: HIVO_QUEUE_URL,
};

const DEFAULT_DATA: StudioData = {
  projectName: "Hivo Studio",
  announcement: "",
  settings: DEFAULT_SETTINGS,
  members: [],
  tasks: [],
  responses: {},
  taskSkips: {},
  progressUpdates: {},
  meetings: [],
  meetingAttendance: {},
  repoUpdates: [],
  profileRequests: [],
  meta: { updatedAt: new Date().toISOString() },
};

function normalizeName(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[أإآ]/g, "ا")
    .replace(/ة/g, "ه")
    .replace(/ى/g, "ي")
    .replace(/[^\p{L}\p{N}]+/gu, "");
}

function uniqueText(values: string[]) {
  return Array.from(new Set(values.map((value) => value.trim()).filter(Boolean)));
}

function isStatsLoginName(value: string) {
  const normalized = normalizeName(value);
  const lowered = value.trim().toLowerCase();
  return lowered.includes("soha") || normalized.includes(normalizeName("سهي"));
}

function findMemberByName(name: string, members: Member[]) {
  const normalized = normalizeName(name);
  if (!normalized) return undefined;

  return members.find((member) =>
    [member.name, ...member.aliases].some((alias) => normalizeName(alias) === normalized),
  );
}

function sanitizeNumber(value: unknown) {
  const numberValue = Number(value);
  return Number.isFinite(numberValue) && numberValue > 0 ? Math.floor(numberValue) : 0;
}

function sanitizePositiveNumber(value: unknown, fallback = 0) {
  const numberValue = Number(value);
  return Number.isFinite(numberValue) && numberValue > 0 ? numberValue : fallback;
}

function meetingStatus(meeting: Meeting) {
  return meeting.status === "archived" ? "archived" : "active";
}

function isActiveMeeting(meeting: Meeting) {
  return meetingStatus(meeting) === "active";
}

function sanitizeData(data: StudioData): StudioData {
  return {
    ...DEFAULT_DATA,
    ...data,
    announcement: data.announcement ?? "",
    settings: {
      adminPassword: data.settings?.adminPassword || DEFAULT_ADMIN_PASSWORD,
      statsPassword: data.settings?.statsPassword || DEFAULT_STATS_PASSWORD,
      backendUrl: data.settings?.backendUrl || HIVO_QUEUE_URL,
    },
    members: (data.members ?? []).map((member) => ({
      ...member,
      aliases: uniqueText(member.aliases ?? []),
      hidden: Boolean(member.hidden),
      baseCompleted: sanitizeNumber(member.baseCompleted),
      baseApproved: sanitizeNumber(member.baseApproved),
      baseRejected: sanitizeNumber(member.baseRejected),
      basePoints: sanitizeNumber(member.basePoints),
      adminNote: member.adminNote ?? "",
      publicFlag: member.publicFlag ?? "",
      repoUrl: member.repoUrl ?? "",
      driveUrl: member.driveUrl ?? "",
    })),
    tasks: (data.tasks ?? []).map((task) => ({
      ...task,
      points: sanitizeNumber(task.points) || 1,
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
    })),
    responses: data.responses ?? {},
    taskSkips: data.taskSkips ?? {},
    progressUpdates: data.progressUpdates ?? {},
    meetings: (data.meetings ?? []).map((meeting) => ({
      ...meeting,
      title: meeting.title || "Meeting",
      startsAt: meeting.startsAt || meeting.createdAt || new Date().toISOString(),
      durationMinutes: sanitizeNumber(meeting.durationMinutes) || 60,
      points: sanitizePositiveNumber(meeting.points, 1),
      status: meeting.status === "archived" ? "archived" : "active",
      createdAt: meeting.createdAt || new Date().toISOString(),
    })),
    meetingAttendance: data.meetingAttendance ?? {},
    repoUpdates: data.repoUpdates ?? [],
    profileRequests: data.profileRequests ?? [],
    meta: data.meta ?? DEFAULT_DATA.meta,
  };
}

function taskIsForMember(task: StudioTask, memberId: string) {
  if (task.scope === "all") return true;
  const memberIds = task.memberIds?.length ? task.memberIds : task.memberId ? [task.memberId] : [];
  return memberIds.includes(memberId);
}

function taskStatus(task: StudioTask) {
  return task.status === "archived" ? "archived" : "active";
}

function isActiveTask(task: StudioTask) {
  return taskStatus(task) === "active";
}

function responseKey(taskId: string, memberId: string) {
  return `${taskId}:${memberId}`;
}

function progressKey(taskId: string, memberId: string) {
  return `progress:${taskId}:${memberId}`;
}

function readMemberDrafts() {
  if (typeof window === "undefined") return {};

  try {
    const raw = window.localStorage.getItem(MEMBER_DRAFTS_KEY);
    if (!raw) return {};
    return JSON.parse(raw) as Record<string, string>;
  } catch {
    return {};
  }
}

function writeMemberDrafts(drafts: Record<string, string>) {
  window.localStorage.setItem(MEMBER_DRAFTS_KEY, JSON.stringify(drafts));
}

function readMemberSentState() {
  if (typeof window === "undefined") return {};

  try {
    const raw = window.localStorage.getItem(MEMBER_SENT_STATE_KEY);
    if (!raw) return {};
    return JSON.parse(raw) as Record<string, string>;
  } catch {
    return {};
  }
}

function writeMemberSentState(state: Record<string, string>) {
  window.localStorage.setItem(MEMBER_SENT_STATE_KEY, JSON.stringify(state));
}

function emptyQueue(): AdminQueue {
  return { submissions: [], progressUpdates: [] };
}

function readLocalQueue() {
  if (typeof window === "undefined") return emptyQueue();

  try {
    const raw = window.localStorage.getItem(LOCAL_QUEUE_KEY);
    if (!raw) return emptyQueue();
    const parsed = JSON.parse(raw) as Partial<AdminQueue>;
    return {
      submissions: parsed.submissions ?? [],
      progressUpdates: parsed.progressUpdates ?? [],
    };
  } catch {
    return emptyQueue();
  }
}

function writeLocalQueue(queue: AdminQueue) {
  window.localStorage.setItem(LOCAL_QUEUE_KEY, JSON.stringify(queue));
}

function mergeQueue(current: AdminQueue, next: AdminQueue): AdminQueue {
  const submissionIds = new Set<string>();
  const progressIds = new Set<string>();
  return {
    submissions: [...next.submissions, ...current.submissions].filter((item) => {
      if (submissionIds.has(item.id)) return false;
      submissionIds.add(item.id);
      return true;
    }),
    progressUpdates: [...next.progressUpdates, ...current.progressUpdates].filter((item) => {
      if (progressIds.has(item.id)) return false;
      progressIds.add(item.id);
      return true;
    }),
  };
}

function removeLocalSubmission(id: string) {
  const queue = readLocalQueue();
  writeLocalQueue({
    ...queue,
    submissions: queue.submissions.filter((item) => item.id !== id),
  });
}

function removeLocalProgressUpdate(id: string) {
  const queue = readLocalQueue();
  writeLocalQueue({
    ...queue,
    progressUpdates: queue.progressUpdates.filter((item) => item.id !== id),
  });
}

function getResponse(data: StudioData, taskId: string, memberId: string) {
  return data.responses[taskId]?.[memberId];
}

function getTaskSkip(data: StudioData, taskId: string, memberId: string) {
  return data.taskSkips?.[taskId]?.[memberId];
}

function isTaskSkipped(data: StudioData, taskId: string, memberId: string) {
  return Boolean(getTaskSkip(data, taskId, memberId));
}

function roundScore(value: number) {
  return Math.round(value * 100) / 100;
}

function sanitizeScore(value: unknown, fallback = 0) {
  const numberValue = Number(value);
  return Number.isFinite(numberValue) && numberValue >= 0 ? roundScore(numberValue) : fallback;
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
  const points = sanitizePositiveNumber(task.points, 1);
  return roundScore(isSubmissionLate(task, response) ? points / 2 : points);
}

function responseAwardedPoints(task: StudioTask, response?: TaskResponse) {
  if (!response || response.status !== "approved") return 0;
  return response.awardedPoints ?? calculateAwardedPoints(task, response, response.status);
}

function responseIsLate(task: StudioTask, response?: TaskResponse) {
  if (!response) return false;
  return response.lateSubmission ?? isSubmissionLate(task, response);
}

function rejectionCount(response?: TaskResponse) {
  if (!response) return 0;
  const eventCount = response.reviewEvents?.filter((event) => event.status === "rejected").length;
  if (typeof eventCount === "number" && eventCount > 0) return eventCount;
  return response.status === "rejected" ? 1 : 0;
}

function latestReviewNote(response?: TaskResponse) {
  return response?.reviewEvents?.find((event) => event.note?.trim())?.note?.trim() ?? "";
}

function hoursBetween(start?: string, end?: string) {
  if (!start || !end) return null;
  const startTime = new Date(start).getTime();
  const endTime = new Date(end).getTime();
  if (!Number.isFinite(startTime) || !Number.isFinite(endTime) || endTime < startTime) return null;
  return (endTime - startTime) / 36e5;
}

function formatHours(value: number | null) {
  if (value === null) return "N/A";
  if (value < 1) return `${Math.max(1, Math.round(value * 60))}m`;
  return `${value.toFixed(1)}h`;
}

function formatPercent(value: number) {
  if (!Number.isFinite(value)) return "0%";
  return `${Math.round(value)}%`;
}

function createStats(data: StudioData) {
  const activeTasks = data.tasks.filter(isActiveTask);
  const activeMeetings = (data.meetings ?? []).filter(isActiveMeeting);
  const memberStats = data.members.map((member) => {
    const assignedTasks = activeTasks.filter(
      (task) => taskIsForMember(task, member.id) && !isTaskSkipped(data, task.id, member.id),
    );
    const responses = assignedTasks
      .map((task) => ({ task, response: getResponse(data, task.id, member.id) }))
      .filter((item): item is { task: StudioTask; response: TaskResponse } =>
        Boolean(item.response),
      );
    const approvedTasks = responses.filter((item) => item.response.status === "approved");
    const taskPoints = approvedTasks.reduce(
      (sum, item) => sum + responseAwardedPoints(item.task, item.response),
      0,
    );
    const speedSamples = responses
      .map((item) => hoursBetween(item.task.createdAt, item.response.submittedAt))
      .filter((value): value is number => value !== null);
    const avgHours =
      speedSamples.length > 0
        ? speedSamples.reduce((sum, value) => sum + value, 0) / speedSamples.length
        : null;
    const baseCompleted = sanitizeNumber(member.baseCompleted);
    const baseApproved = sanitizeNumber(member.baseApproved);
    const baseRejected = sanitizeNumber(member.baseRejected);
    const basePoints = sanitizeNumber(member.basePoints);
    const meetingPoints = activeMeetings.reduce(
      (sum, meeting) => sum + (data.meetingAttendance?.[meeting.id]?.[member.id]?.score ?? 0),
      0,
    );
    const approved = approvedTasks.length + baseApproved;
    const rejected =
      responses.reduce((sum, item) => sum + rejectionCount(item.response), 0) + baseRejected;
    const pending = responses.filter((item) => item.response.status === "submitted").length;
    const submitted = responses.length + baseCompleted;
    const reviewed = approved + rejected;
    const responseRate =
      assignedTasks.length > 0 ? (responses.length / assignedTasks.length) * 100 : 0;
    const approvalRate = reviewed > 0 ? (approved / reviewed) * 100 : 0;

    return {
      member,
      assignedTasks: assignedTasks.length,
      submitted,
      approved,
      rejected,
      pending,
      reviewed,
      baseCompleted,
      baseApproved,
      baseRejected,
      completed: baseCompleted + approvedTasks.length,
      taskPoints,
      basePoints,
      meetingPoints,
      points: Math.round((basePoints + taskPoints + meetingPoints) * 100) / 100,
      avgHours,
      responseRate,
      approvalRate,
    };
  });
  const visibleStats = memberStats.filter((item) => !item.member.hidden);
  const rankedMembers = [...visibleStats].sort((a, b) => {
    if (b.points !== a.points) return b.points - a.points;
    return b.completed - a.completed;
  });
  const taskMetrics = activeTasks.map((task) => {
    const visibleMemberIds = new Set(
      data.members
        .filter(
          (member) =>
            !member.hidden && taskIsForMember(task, member.id) && !isTaskSkipped(data, task.id, member.id),
        )
        .map((member) => member.id),
    );
    const expected = visibleMemberIds.size;
    const responses = Object.values(data.responses[task.id] ?? {}).filter((response) =>
      visibleMemberIds.has(response.memberId),
    );
    const progressUpdates = (data.progressUpdates?.[task.id] ?? []).filter((update) =>
      visibleMemberIds.has(update.memberId),
    );
    return {
      task,
      expected,
      received: responses.length,
      approved: responses.filter((response) => response.status === "approved").length,
      rejected: responses.reduce((sum, response) => sum + rejectionCount(response), 0),
      submitted: responses.filter((response) => response.status === "submitted").length,
      progressUpdates: progressUpdates.length,
    };
  });
  const leader = rankedMembers[0];
  const worst = rankedMembers[rankedMembers.length - 1];
  const approvedTotal = visibleStats.reduce((sum, item) => sum + item.completed, 0);
  const pointsTotal = visibleStats.reduce((sum, item) => sum + item.points, 0);
  const meetingMetrics: MeetingMetric[] = activeMeetings.map((meeting) => {
    const attendance = Object.values(data.meetingAttendance?.[meeting.id] ?? {}).filter((item) =>
      data.members.some((member) => !member.hidden && member.id === item.memberId),
    );
    return {
      meeting,
      attended: attendance.length,
      expected: data.members.filter((member) => !member.hidden).length,
      totalScore: Math.round(attendance.reduce((sum, item) => sum + item.score, 0) * 100) / 100,
    };
  });
  const pendingTotal = Object.values(data.responses).reduce(
    (sum, taskResponses) =>
      sum +
      Object.values(taskResponses).filter((response) => response.status === "submitted").length,
    0,
  );

  return {
    allMemberStats: memberStats,
    memberStats: rankedMembers,
    taskMetrics,
    meetingMetrics,
    activeTasks,
    archivedTasks: data.tasks.filter((task) => taskStatus(task) === "archived"),
    activeMeetings,
    archivedMeetings: (data.meetings ?? []).filter((meeting) => meetingStatus(meeting) === "archived"),
    leader,
    worst,
    approvedTotal,
    pointsTotal,
    pendingTotal,
  };
}

function rankingBadgeClass(index: number) {
  return index === 0 ? "bg-yellow-100" : "bg-white";
}

function Logo({ size = "size-24" }: { size?: string }) {
  return (
    <img
      src={`${import.meta.env.BASE_URL}hivo.png`}
      alt="Hivo Studio logo"
      className={`mx-auto rounded-full border-[2.5px] border-ink object-cover doodle-shadow-sm ${size}`}
    />
  );
}

function SectionTitle({ title, help }: { title: string; help: string }) {
  return (
    <div className="mb-4">
      <h2 className="text-2xl font-bold">
        <span className="highlight-yellow">{title}</span>
      </h2>
      <p className="mt-1 text-sm leading-6 text-foreground/60">{help}</p>
    </div>
  );
}

function LoginScreen({
  data,
  onMemberLogin,
  onAdminLogin,
  onStatsLogin,
}: {
  data: StudioData;
  onMemberLogin: (member: Member, displayName: string) => void;
  onAdminLogin: (password: string) => void;
  onStatsLogin: () => void;
}) {
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const settings = data.settings ?? DEFAULT_SETTINGS;
  const isPasswordEntry = /^\d+$/.test(name.trim());

  function submitName() {
    const displayName = name.trim();
    if (!displayName) return;

    if (displayName === settings.adminPassword) {
      window.localStorage.setItem(ADMIN_SESSION_KEY, "true");
      window.localStorage.setItem(ADMIN_AUTH_KEY, displayName);
      window.localStorage.removeItem(STATS_SESSION_KEY);
      window.localStorage.removeItem(ACTIVE_MEMBER_KEY);
      window.localStorage.removeItem(ACTIVE_DISPLAY_NAME_KEY);
      onAdminLogin(displayName);
      return;
    }

    if (displayName === settings.statsPassword || isStatsLoginName(displayName)) {
      window.localStorage.setItem(STATS_SESSION_KEY, "true");
      window.localStorage.removeItem(ADMIN_SESSION_KEY);
      window.localStorage.removeItem(ACTIVE_MEMBER_KEY);
      window.localStorage.removeItem(ACTIVE_DISPLAY_NAME_KEY);
      onStatsLogin();
      return;
    }

    const member = findMemberByName(displayName, data.members);
    if (!member) {
      setError("الاسم مش واضح عندي. اكتبه عربي أو إنجليزي زي اسمك في التيم.");
      return;
    }

    window.localStorage.setItem(ACTIVE_MEMBER_KEY, member.id);
    window.localStorage.setItem(ACTIVE_DISPLAY_NAME_KEY, displayName);
    window.localStorage.removeItem(ADMIN_SESSION_KEY);
    window.localStorage.removeItem(STATS_SESSION_KEY);
    onMemberLogin(member, displayName);
  }

  return (
    <div className="min-h-screen text-foreground" dir="rtl">
      <main className="mx-auto flex min-h-screen max-w-lg flex-col items-center justify-center px-5 py-12">
        <section
          className="w-full border-[2.5px] border-ink bg-card p-6 text-center doodle-shadow"
          style={{ borderRadius: "22px 28px 18px 26px / 24px 18px 28px 20px" }}
        >
          <Logo size="size-28" />
          <h1 className="mb-2 mt-4 text-5xl font-bold leading-tight">
            <span className="highlight-yellow">Hivo Studio</span>
          </h1>
          <p className="mx-auto mb-5 max-w-sm text-lg text-foreground/75">اكتب اسمك</p>
          <div className="flex flex-col gap-3">
            <Input
              type={isPasswordEntry ? "password" : "text"}
              value={name}
              onChange={(event) => {
                setName(event.target.value);
                setError("");
              }}
              onKeyDown={(event) => {
                if (event.key === "Enter") submitName();
              }}
              placeholder="اكتب اسمك..."
              className="h-12 border-[2px] border-ink bg-paper text-center text-lg"
              autoFocus
            />
            <Button
              type="button"
              onClick={submitName}
              className="h-11 border-[2px] border-ink doodle-shadow-sm"
            >
              دخول
            </Button>
          </div>
          {error && <p className="mt-3 text-sm text-destructive">{error}</p>}
        </section>
      </main>
    </div>
  );
}

function MemberDetails({ item }: { item: MemberScore }) {
  return (
    <div className="mt-3 grid gap-2 border-t-[2px] border-ink/30 pt-3 text-sm sm:grid-cols-3">
      <span>المطلوب: {item.assignedTasks}</span>
      <span>مسلم: {item.submitted}</span>
      <span>مستني مراجعة: {item.pending}</span>
      <span>مقبول: {item.approved}</span>
      <span>مرفوض: {item.rejected}</span>
      <span>نقاط: {item.points}</span>
      <span>تاسكات محسوبة: {item.completed}</span>
      <span>نسبة التسليم: {formatPercent(item.responseRate)}</span>
      <span>نسبة القبول: {formatPercent(item.approvalRate)}</span>
      <span>متوسط السرعة: {formatHours(item.avgHours)}</span>
    </div>
  );
}

function StatsMemberDetails({ item }: { item: MemberScore }) {
  return (
    <div className="mt-3 grid gap-2 border-t border-ink/20 pt-3 text-sm sm:grid-cols-3">
      <span>Assigned: {item.assignedTasks}</span>
      <span>Submitted: {item.submitted}</span>
      <span>Pending review: {item.pending}</span>
      <span>Approved: {item.approved}</span>
      <span>Rejected: {item.rejected}</span>
      <span>Points: {item.points}</span>
      <span>Counted tasks: {item.completed}</span>
      <span>Submission rate: {formatPercent(item.responseRate)}</span>
      <span>Approval rate: {formatPercent(item.approvalRate)}</span>
      <span>Average speed: {formatHours(item.avgHours)}</span>
    </div>
  );
}

function Leaderboard({ scores }: { scores: MemberScore[] }) {
  const [openMemberId, setOpenMemberId] = useState("");
  const worstMemberId = scores[scores.length - 1]?.member.id;

  return (
    <div className="leaderboard-stage grid gap-3 md:grid-cols-2">
      {scores.map((item, index) => {
        const isLeader = index === 0;
        const isWorst = item.member.id === worstMemberId && scores.length > 1;
        const isOpen = openMemberId === item.member.id;
        const rowColor = isLeader ? "bg-yellow-50" : "bg-white";

        if (isWorst) {
          return (
            <button
              key={item.member.id}
              type="button"
              onClick={() => setOpenMemberId(isOpen ? "" : item.member.id)}
              className="leaderboard-row-worst border border-black bg-white p-2 text-left font-serif text-black shadow-none"
              dir="rtl"
            >
              <div>
                {index + 1}. {item.member.name} - {item.points} pts / {item.completed} tasks
              </div>
              {item.member.publicFlag && (
                <div className="text-red-700">[{item.member.publicFlag}]</div>
              )}
              {isOpen && <MemberDetails item={item} />}
            </button>
          );
        }

        return (
          <button
            key={item.member.id}
            type="button"
            onClick={() => setOpenMemberId(isOpen ? "" : item.member.id)}
            className={`leaderboard-row group relative overflow-hidden text-right border-[2.5px] border-ink px-3 py-3 doodle-shadow-sm transition ${rowColor} ${
              isLeader ? "leaderboard-row-top md:col-span-2" : ""
            }`}
            style={{
              borderRadius: "14px 18px 12px 16px / 16px 12px 18px 14px",
              animationDelay: `${index * 80}ms`,
            }}
          >
            <div className="relative z-10 flex items-center gap-3">
              <span
                className={`leaderboard-badge grid size-10 shrink-0 place-items-center rounded-full border-[2.5px] border-ink font-bold ${rankingBadgeClass(
                  index,
                )}`}
              >
                {index + 1}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-lg font-bold leading-tight">
                  {item.member.name}
                  {isLeader && <span className="leaderboard-top-tag ms-2">TOP</span>}
                  {item.member.publicFlag && (
                    <span className="ms-2 text-xs font-bold text-red-600">
                      {item.member.publicFlag}
                    </span>
                  )}
                </span>
                <span className="mt-1 block h-2 overflow-hidden rounded-full border-[1.5px] border-ink bg-white/70">
                  <span
                    className="leaderboard-progress block h-full rounded-full bg-emerald-400"
                    style={{
                      width: `${Math.max(8, Math.min(100, item.responseRate || item.approvalRate || 0))}%`,
                    }}
                  />
                </span>
              </span>
              <span className="leaderboard-points shrink-0 rounded-full border-[2px] border-ink bg-white/80 px-3 py-1 text-sm font-bold">
                {item.points} pts
                <span className="mx-1 text-foreground/45">/</span>
                {item.completed}
              </span>
            </div>
            {isOpen && (
              <div className="relative z-10">
                <MemberDetails item={item} />
              </div>
            )}
          </button>
        );
      })}
    </div>
  );
}

function MemberView({
  data,
  activeMember,
  stats,
  draftAnswers,
  sentState,
  refreshStatus,
  onDraftChange,
  isSubmitting,
  onSubmitFinal,
  onSubmitProgress,
  onRepoAttention,
  onDriveAttention,
  onProfileChangeRequest,
  onLogout,
  onRefreshData,
}: {
  data: StudioData;
  activeMember: ActiveMember;
  stats: ReturnType<typeof createStats>;
  draftAnswers: Record<string, string>;
  sentState: Record<string, string>;
  refreshStatus: string;
  onDraftChange: (key: string, value: string) => void;
  isSubmitting: boolean;
  onSubmitFinal: (task: StudioTask) => boolean | Promise<boolean>;
  onSubmitProgress: (task: StudioTask) => boolean | Promise<boolean>;
  onRepoAttention: (task: StudioTask) => boolean | Promise<boolean>;
  onDriveAttention: (task: StudioTask) => boolean | Promise<boolean>;
  onProfileChangeRequest: (item: MemberProfileRequestInput) => boolean | Promise<boolean>;
  onLogout: () => void;
  onRefreshData: () => Promise<void>;
}) {
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [nicknameDraft, setNicknameDraft] = useState("");
  const [repoDraft, setRepoDraft] = useState(activeMember.member.repoUrl ?? "");
  const [driveDraft, setDriveDraft] = useState(activeMember.member.driveUrl ?? "");
  const [memberTab, setMemberTab] = useState<"tasks" | "log">("tasks");
  const [refreshing, setRefreshing] = useState(false);
  const [refreshedOnce, setRefreshedOnce] = useState(
    window.sessionStorage.getItem(REFRESHED_SESSION_KEY) === "true",
  );
  const [showNicknameHint, setShowNicknameHint] = useState(
    window.localStorage.getItem(NICKNAME_HINT_KEY) !== "seen",
  );
  const [actionFeedback, setActionFeedback] = useState<Record<string, ActionFeedback>>({});
  const memberTasks = data.tasks.filter((task) => {
    if (!taskIsForMember(task, activeMember.member.id)) return false;
    if (isTaskSkipped(data, task.id, activeMember.member.id)) return false;
    return getResponse(data, task.id, activeMember.member.id)?.status !== "approved";
  });
  const memberLogTasks = data.tasks.filter((task) =>
    taskIsForMember(task, activeMember.member.id),
  );
  const hasProfileChange =
    nicknameDraft.trim().length > 0 ||
    repoDraft.trim() !== (activeMember.member.repoUrl ?? "") ||
    driveDraft.trim() !== (activeMember.member.driveUrl ?? "");
  const profileActionKey = `profile:${activeMember.member.id}`;
  const profileFeedback = actionFeedback[profileActionKey];

  useEffect(() => {
    if (!settingsOpen) return;
    setNicknameDraft("");
    setRepoDraft(activeMember.member.repoUrl ?? "");
    setDriveDraft(activeMember.member.driveUrl ?? "");
  }, [activeMember.member.driveUrl, activeMember.member.id, activeMember.member.repoUrl, settingsOpen]);

  async function refreshMemberData() {
    setRefreshing(true);
    try {
      await onRefreshData();
      window.sessionStorage.setItem(REFRESHED_SESSION_KEY, "true");
      setRefreshedOnce(true);
    } finally {
      setRefreshing(false);
    }
  }

  function closeHint() {
    window.localStorage.setItem(NICKNAME_HINT_KEY, "seen");
    setShowNicknameHint(false);
  }

  function setMemberFeedback(key: string, feedback: ActionFeedback) {
    setActionFeedback((current) => ({ ...current, [key]: feedback }));
  }

  function blockMemberAction(key: string, fields: string[]) {
    setMemberFeedback(key, { tone: "error", message: missingFieldsMessage(fields) });
  }

  async function runMemberAction(
    key: string,
    action: () => boolean | Promise<boolean>,
    successMessage: string,
    failureMessage: string,
  ) {
    setMemberFeedback(key, { tone: "pending", message: "Submitting..." });
    const ok = await action();
    setMemberFeedback(key, {
      tone: ok ? "success" : "error",
      message: ok ? successMessage : failureMessage,
    });
  }

  function renderMemberTaskLog() {
    return (
      <section className="mb-7 grid gap-3">
        <div className="grid gap-2 sm:grid-cols-4">
          <CompactMetric label="Old tasks" value={activeMember.member.baseCompleted ?? 0} />
          <CompactMetric label="Old approved" value={activeMember.member.baseApproved ?? 0} />
          <CompactMetric label="Old rejected" value={activeMember.member.baseRejected ?? 0} />
          <CompactMetric label="Old points" value={activeMember.member.basePoints ?? 0} />
        </div>
        {memberLogTasks.length === 0 ? (
          <div
            className="border-[2.5px] border-ink bg-card p-8 text-center doodle-shadow"
            style={{ borderRadius: "20px 26px 18px 24px / 24px 18px 26px 20px" }}
          >
            <p className="text-xl font-bold">No task history yet.</p>
          </div>
        ) : (
          memberLogTasks.map((task) => {
            const response = getResponse(data, task.id, activeMember.member.id);
            const skipped = getTaskSkip(data, task.id, activeMember.member.id);
            const progress = (data.progressUpdates?.[task.id] ?? []).filter(
              (update) => update.memberId === activeMember.member.id,
            );
            const rejects = rejectionCount(response);
            const awarded = responseAwardedPoints(task, response);
            const late = responseIsLate(task, response);
            const note = latestReviewNote(response);

            return (
              <article
                key={task.id}
                className="border-[2.5px] border-ink bg-card p-4 doodle-shadow-sm"
                style={{ borderRadius: "18px 22px 16px 24px / 22px 16px 24px 18px" }}
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h2 className="text-2xl font-bold">{task.title}</h2>
                    <p className="mt-1 text-sm text-foreground/60">
                      {taskStatus(task)} | deadline {formatDateTime(task.deadlineAt)}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <span className={`border-[2px] px-3 py-1 text-sm font-bold ${statusTone(response?.status)}`}>
                      {skipped ? "skipped" : response?.status ?? "missing"}
                    </span>
                    {late && (
                      <span className="border-[2px] border-yellow-700 bg-yellow-100 px-3 py-1 text-sm font-bold text-yellow-900">
                        Late - half score
                      </span>
                    )}
                  </div>
                </div>
                <div className="mt-3 flex flex-wrap gap-2 text-sm font-bold text-foreground/65">
                  <span>Points: {awarded}/{sanitizePositiveNumber(task.points, 1)}</span>
                  <span>Rejected: {rejects}</span>
                  {skipped && <span>Skipped: no score impact</span>}
                  {response?.submittedAt && <span>Submitted: {formatDateTime(response.submittedAt)}</span>}
                  {response?.reviewedAt && <span>Reviewed: {formatDateTime(response.reviewedAt)}</span>}
                </div>
                {note && (
                  <p className="mt-3 border-[2px] border-ink bg-paper p-3 text-sm leading-6">
                    <strong>Admin note: </strong>
                    {note}
                  </p>
                )}
                {response?.answer && (
                  <p className="mt-3 whitespace-pre-wrap border-t-[2px] border-ink/15 pt-3 leading-7">
                    {response.answer}
                  </p>
                )}
                {progress.length > 0 && (
                  <div className="mt-3 grid gap-2">
                    {progress.map((update) => (
                      <div key={update.id} className="border-[2px] border-ink bg-yellow-50 p-3 text-sm">
                        <p className="whitespace-pre-wrap leading-6">{update.note}</p>
                        <p className="mt-1 text-xs text-foreground/55">{formatDateTime(update.createdAt)}</p>
                      </div>
                    ))}
                  </div>
                )}
              </article>
            );
          })
        )}
      </section>
    );
  }

  return (
    <div className="min-h-screen text-foreground" dir="rtl">
      <button
        type="button"
        onClick={() => setSettingsOpen(true)}
        className="fixed left-4 top-4 z-30 grid size-11 place-items-center rounded-full border-[2px] border-ink bg-card doodle-shadow-sm"
        aria-label="settings"
      >
        <Settings className="size-5" />
      </button>

      {showNicknameHint && (
        <div className="fixed left-4 top-20 z-30 max-w-xs border-[2px] border-ink bg-card p-3 text-sm doodle-shadow-sm">
          <p>ممكن تضيف nickname تسجل بيه دايمًا لو اسمك مش عاجبك.</p>
          <Button
            type="button"
            size="sm"
            onClick={closeHint}
            className="mt-2 border-[2px] border-ink"
          >
            تمام
          </Button>
        </div>
      )}

      <div className="mx-auto max-w-4xl px-5 py-10 md:py-14">
        <header className="relative mb-10 text-center">
          <Logo />
          <h1 className="mb-3 mt-4 text-5xl font-bold leading-tight md:text-6xl">
            <span className="highlight-yellow">Hivo Studio</span>
          </h1>
          <p className="mx-auto max-w-xl text-xl leading-relaxed text-foreground/80">
            أهلا {activeMember.displayName}. هنا تاسكاتك أنت بس، واللي يتوافق عليه يتحسب لك بالنقط.
          </p>
        </header>

        <section
          className="mb-7 border-[2.5px] border-ink bg-card p-4 doodle-shadow"
          style={{ borderRadius: "18px 22px 16px 24px / 22px 16px 24px 18px" }}
        >
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="font-bold">
              <span className="highlight-blue">
                نقاط التيم: {stats.pointsTotal} | تاسكات محسوبة: {stats.approvedTotal}
              </span>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                onClick={refreshMemberData}
                disabled={refreshing}
                className={`border-[2px] border-ink doodle-shadow-sm ${
                  refreshedOnce
                    ? ""
                    : "scale-105 bg-red-500 text-white shadow-[0_0_0_4px_rgba(239,68,68,0.35)]"
                }`}
              >
                <RefreshCw data-icon="inline-start" />
                {refreshing ? "Refreshing..." : "Refresh"}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={onLogout}
                className="border-[2px] border-ink bg-paper doodle-shadow-sm"
              >
                <LogOut data-icon="inline-start" />
                <span className="text-sm">تسجيل خروج</span>
              </Button>
            </div>
          </div>
          {refreshStatus && <p className="mt-2 text-sm text-foreground/65">{refreshStatus}</p>}
        </section>

        {activeMember.member.publicFlag?.trim() && (
          <section
            className="mb-7 border-[2.5px] border-red-700 bg-red-50 p-4 text-lg font-bold text-red-700 doodle-shadow-sm"
            style={{ borderRadius: "18px 22px 16px 24px / 22px 16px 24px 18px" }}
          >
            {activeMember.member.name}: {activeMember.member.publicFlag}
          </section>
        )}

        {activeMember.member.adminNote?.trim() && (
          <section
            className="mb-7 border-[2.5px] border-ink bg-paper p-4 text-lg leading-[1.8] doodle-shadow-sm"
            style={{ borderRadius: "18px 22px 16px 24px / 22px 16px 24px 18px" }}
          >
            <strong>رسالة الأدمن: </strong>
            {activeMember.member.adminNote}
          </section>
        )}

        <div className="mb-7 flex rounded-lg border-[2px] border-ink bg-paper p-1">
          <button
            type="button"
            onClick={() => setMemberTab("tasks")}
            className={`flex-1 rounded-md px-3 py-2 text-sm font-bold ${memberTab === "tasks" ? "bg-ink text-white" : ""}`}
          >
            Tasks
          </button>
          <button
            type="button"
            onClick={() => setMemberTab("log")}
            className={`flex-1 rounded-md px-3 py-2 text-sm font-bold ${memberTab === "log" ? "bg-ink text-white" : ""}`}
          >
            Log
          </button>
        </div>

        {memberTab === "log" ? renderMemberTaskLog() : (
        <section className="mb-7 flex flex-col gap-5">
          {memberTasks.length === 0 ? (
            <div
              className="border-[2.5px] border-ink bg-card p-8 text-center doodle-shadow"
              style={{ borderRadius: "20px 26px 18px 24px / 24px 18px 26px 20px" }}
            >
              <p className="text-2xl font-bold">
                <span className="highlight-yellow">لسه مفيش تاسكات ليك</span>
              </p>
              <p className="mt-2 text-foreground/70">
                أول ما الأدمن ينزل تاسك عام أو تاسك باسمك هيظهر هنا.
              </p>
            </div>
          ) : (
            memberTasks.map((task) => {
              const existing = getResponse(data, task.id, activeMember.member.id);
              const key = responseKey(task.id, activeMember.member.id);
              const taskProgressKey = progressKey(task.id, activeMember.member.id);
              const finalSent = sentState[key];
              const progressSent = sentState[taskProgressKey];
              const finalFeedback = actionFeedback[key];
              const progressFeedback = actionFeedback[taskProgressKey];
              const repoFeedback = actionFeedback[`repo:${task.id}:${activeMember.member.id}`];
              const driveFeedback = actionFeedback[`drive:${task.id}:${activeMember.member.id}`];
              const finalAnswer = draftAnswers[key] ?? existing?.answer ?? "";
              const progressNote = draftAnswers[taskProgressKey] ?? "";
              const officialProgress = (data.progressUpdates?.[task.id] ?? []).filter(
                (update) => update.memberId === activeMember.member.id,
              );
              const canAnswer = !existing || existing.status === "rejected";

              return (
                <article
                  key={task.id}
                  className={`border-[2.5px] border-ink p-5 doodle-shadow ${
                    existing?.status === "approved"
                      ? "bg-emerald-50"
                      : existing?.status === "submitted" || finalSent
                        ? "bg-yellow-50"
                        : existing?.status === "rejected"
                          ? "bg-red-50"
                          : "bg-card"
                  }`}
                  style={{ borderRadius: "18px 22px 16px 24px / 22px 16px 24px 18px" }}
                >
                  <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <h2 className="text-2xl font-bold">{task.title}</h2>
                      <p className="mt-1 text-sm text-foreground/60">
                        {task.scope === "all" ? "تاسك عام لكل التيم" : "تاسك مخصص ليك"} •{" "}
                        {task.points || 1} points
                      </p>
                    </div>
                    {existing && (
                      <span className="border-[2px] border-ink bg-paper px-3 py-1 text-sm font-bold doodle-shadow-sm">
                        {existing.status === "approved"
                          ? "تم القبول"
                          : existing.status === "rejected"
                            ? "اترفض - جاوب تاني"
                            : "مستني المراجعة"}
                      </span>
                    )}
                    {!existing && finalSent && (
                      <span className="border-[2px] border-ink bg-yellow-100 px-3 py-1 text-sm font-bold doodle-shadow-sm">
                        مستني مراجعة الأدمن
                      </span>
                    )}
                  </div>
                  <p className="mb-4 text-[17px] leading-[1.8]">{task.question}</p>
                  <Textarea
                    value={finalAnswer}
                    onChange={(event) => onDraftChange(key, event.target.value)}
                    disabled={!canAnswer}
                    placeholder="اكتب إجابتك هنا..."
                    className="min-h-32 border-[2px] border-ink bg-paper text-base"
                  />
                  <p className="mt-2 text-sm font-bold text-red-700">
                    ده تسليم رسمي. بعد ما تبعته هيظهر مستني مراجعة الأدمن، والدرجات تتحسب بعد القبول
                    فقط.
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Button
                      type="button"
                      data-testid={`submit-final-${task.id}`}
                      onClick={() => {
                        if (!finalAnswer.trim()) {
                          blockMemberAction(key, ["answer"]);
                          return;
                        }
                        void runMemberAction(
                          key,
                          () => onSubmitFinal(task),
                          "Submitted. Waiting for admin review.",
                          "Submission failed. Try again.",
                        );
                      }}
                      disabled={!canAnswer || isSubmitting}
                      className={actionButtonClass(
                        "border-[2px] border-ink doodle-shadow-sm",
                        finalFeedback,
                        Boolean(finalSent),
                      )}
                    >
                      <Save data-icon="inline-start" />
                      تسليم للمراجعة
                    </Button>
                  </div>
                  <ActionFeedbackLine feedback={finalFeedback} />

                  <div className="mt-5 border-t-[2px] border-ink/20 pt-4">
                    <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                      <strong className="text-lg">تحديث متابعة بدون درجات</strong>
                      <span className="rounded-full border-[2px] border-ink bg-yellow-100 px-2 py-1 text-xs font-bold">
                        لا يتحسب نقاط
                      </span>
                    </div>
                    <p className="mb-3 text-sm leading-6 text-foreground/65">
                      اكتب وصلت لإيه أو محتاج إيه. ده متابعة بس، مش تسليم نهائي للتاسك.
                    </p>
                    {officialProgress.length > 0 && (
                      <div className="mb-3 grid gap-2">
                        {officialProgress.map((update) => (
                          <div key={update.id} className="border-[2px] border-ink bg-yellow-50 p-3">
                            <p className="whitespace-pre-wrap leading-7">{update.note}</p>
                            <p className="mt-1 text-xs text-foreground/55">
                              محفوظ رسميًا: {new Date(update.createdAt).toLocaleString()}
                            </p>
                          </div>
                        ))}
                      </div>
                    )}
                    {progressSent && (
                      <p className="mb-3 border-[2px] border-ink bg-yellow-100 p-2 text-sm font-bold">
                        تم إرسال متابعة للأدمن
                      </p>
                    )}
                    <Textarea
                      value={progressNote}
                      onChange={(event) => onDraftChange(taskProgressKey, event.target.value)}
                      placeholder="اكتب تحديث متابعة سريع..."
                      className="min-h-24 border-[2px] border-ink bg-yellow-50 text-base"
                    />
                    <p className="mt-2 text-sm font-bold text-yellow-800">
                      ده تحديث متابعة فقط، لا يتحسب نقاط ولا يقفل التاسك.
                    </p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <Button
                        type="button"
                        data-testid={`submit-progress-${task.id}`}
                        onClick={() => {
                          if (!progressNote.trim()) {
                            blockMemberAction(taskProgressKey, ["progress note"]);
                            return;
                          }
                          void runMemberAction(
                            taskProgressKey,
                            () => onSubmitProgress(task),
                            "Progress update sent.",
                            "Progress update failed. Try again.",
                          );
                        }}
                        disabled={isSubmitting}
                        className={actionButtonClass(
                          "border-[2px] border-ink bg-yellow-100 doodle-shadow-sm",
                          progressFeedback,
                          Boolean(progressSent),
                        )}
                      >
                        <Save data-icon="inline-start" />
                        إرسال متابعة
                      </Button>
                      <Button
                        type="button"
                        data-testid={`repo-attention-${task.id}`}
                        onClick={() => {
                          const repoKey = `repo:${task.id}:${activeMember.member.id}`;
                          void runMemberAction(
                            repoKey,
                            () => onRepoAttention(task),
                            "GitHub attention sent.",
                            "Could not notify admin. Try again.",
                          );
                        }}
                        disabled={isSubmitting}
                        variant="outline"
                        className={actionButtonClass(
                          "border-[2px] border-ink bg-paper doodle-shadow-sm",
                          repoFeedback,
                        )}
                      >
                        <Bell data-icon="inline-start" />
                        GitHub attention
                      </Button>
                      <Button
                        type="button"
                        data-testid={`drive-attention-${task.id}`}
                        onClick={() => {
                          const driveKey = `drive:${task.id}:${activeMember.member.id}`;
                          void runMemberAction(
                            driveKey,
                            () => onDriveAttention(task),
                            "Drive attention sent.",
                            "Could not notify admin. Try again.",
                          );
                        }}
                        disabled={isSubmitting}
                        variant="outline"
                        className={actionButtonClass(
                          "border-[2px] border-ink bg-paper doodle-shadow-sm",
                          driveFeedback,
                        )}
                      >
                        <FolderOpen data-icon="inline-start" />
                        Drive attention
                      </Button>
                    </div>
                    <ActionFeedbackLine feedback={progressFeedback} />
                    <ActionFeedbackLine feedback={repoFeedback} />
                    <ActionFeedbackLine feedback={driveFeedback} />
                    {!activeMember.member.repoUrl && (
                      <p className="mt-2 text-xs font-bold text-yellow-800">
                        Admin may need to add your repo URL, but the alert will still be sent.
                      </p>
                    )}
                    {!activeMember.member.driveUrl && (
                      <p className="mt-2 text-xs font-bold text-yellow-800">
                        Admin may need to add your Drive link, but the alert will still be sent.
                      </p>
                    )}
                  </div>
                </article>
              );
            })
          )}
        </section>
        )}

        <section
          className="border-[2.5px] border-ink bg-card p-5 doodle-shadow"
          style={{
            borderRadius: "20px 26px 18px 24px / 24px 18px 26px 20px",
            transform: "rotate(-0.3deg)",
          }}
        >
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-2xl font-bold" style={{ fontFamily: "Caveat, cursive" }}>
              <span className="highlight-yellow">Leaderboard</span>
            </h2>
            <div className="text-lg font-bold">
              <span className="highlight-blue">
                {stats.leader && stats.leader.points > 0
                  ? `${stats.leader.member.name} متصدر بـ ${stats.leader.points} points`
                  : "لسه مفيش إنجازات محسوبة"}
              </span>
            </div>
          </div>
          <Leaderboard scores={stats.memberStats} />
        </section>
      </div>

      {settingsOpen && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-ink/35 px-4">
          <section
            className="w-full max-w-lg border-[2.5px] border-ink bg-card p-5 doodle-shadow"
            style={{ borderRadius: "22px 28px 18px 26px / 24px 18px 28px 20px" }}
          >
            <h2 className="mb-3 text-3xl font-bold">
              <span className="highlight-yellow">Settings</span>
            </h2>
            <p className="mb-3 text-sm text-foreground/65">الأسماء المتاحة للدخول:</p>
            <div className="mb-4 flex flex-wrap gap-2">
              {[activeMember.member.name, ...activeMember.member.aliases].map((alias) => (
                <span key={alias} className="border-[2px] border-ink bg-paper px-2 py-1 text-sm">
                  {alias}
                </span>
              ))}
            </div>

            <div className="mt-3 border-[2px] border-ink bg-paper p-3 text-sm leading-6">
              <strong>اطلب تعديل اسمك أو ريبو GitHub.</strong>
              <p>التغيير هيتبعت للأدمن، ومش هيبقى رسمي غير لما يعمل approve.</p>
              {!activeMember.member.repoUrl && (
                <p className="mt-2 rounded-md border-[2px] border-yellow-700 bg-yellow-100 p-2 font-bold text-yellow-900">
                  ضيف GitHub repo بتاعك علشان لسه مش مضاف هنا.
                </p>
              )}
              {!activeMember.member.driveUrl && (
                <p className="mt-2 rounded-md border-[2px] border-yellow-700 bg-yellow-100 p-2 font-bold text-yellow-900">
                  Add your Drive link for files that are not code.
                </p>
              )}
              <label className="mt-3 block font-bold" htmlFor="member-nickname">
                Nickname
              </label>
              <Input
                id="member-nickname"
                value={nicknameDraft}
                onChange={(event) => setNicknameDraft(event.target.value)}
                placeholder="اكتب nickname جديد..."
                className="mt-1 border-[2px] border-ink bg-white"
              />
              <label className="mt-3 block font-bold" htmlFor="member-repo">
                GitHub repo
              </label>
              <Input
                id="member-repo"
                dir="ltr"
                value={repoDraft}
                onChange={(event) => setRepoDraft(event.target.value)}
                placeholder="https://github.com/user/repo"
                className="mt-1 border-[2px] border-ink bg-white text-left"
              />
              <label className="mt-3 block font-bold" htmlFor="member-drive">
                Drive link
              </label>
              <Input
                id="member-drive"
                dir="ltr"
                value={driveDraft}
                onChange={(event) => setDriveDraft(event.target.value)}
                placeholder="https://drive.google.com/..."
                className="mt-1 border-[2px] border-ink bg-white text-left"
              />
              <p className="mt-1 text-xs text-foreground/55">
                Use this for designs, PDFs, videos, and non-code uploads.
              </p>
              <p className="mt-1 text-xs text-foreground/55">
                تقدر تمسح القديم وتبعت غيره، والأدمن لازم يوافق.
              </p>
              <Button
                type="button"
                data-testid="profile-request-submit"
                disabled={isSubmitting}
                onClick={() => {
                  if (!hasProfileChange) {
                    blockMemberAction(profileActionKey, ["nickname, GitHub repo, or Drive link change"]);
                    return;
                  }
                  void runMemberAction(
                    profileActionKey,
                    () =>
                      onProfileChangeRequest({
                        memberId: activeMember.member.id,
                        nickname: nicknameDraft.trim(),
                        repoUrl: repoDraft.trim(),
                        driveUrl: driveDraft.trim(),
                      }),
                    "Profile request sent.",
                    "Could not send profile request. Try again.",
                  );
                }}
                className={actionButtonClass(
                  "mt-3 border-[2px] border-ink doodle-shadow-sm",
                  profileFeedback,
                )}
              >
                <Bell data-icon="inline-start" />
                إرسال للأدمن
              </Button>
              <ActionFeedbackLine feedback={profileFeedback} />
              {activeMember.member.repoUrl ? (
                <Button
                  type="button"
                  onClick={() =>
                    window.open(activeMember.member.repoUrl, "_blank", "noopener,noreferrer")
                  }
                  className="mt-3 border-[2px] border-ink doodle-shadow-sm"
                >
                  <ExternalLink data-icon="inline-start" />
                  فتح الريبو بتاعي
                </Button>
              ) : (
                <p className="mt-2 font-bold text-red-700">لا يوجد ريبو محفوظ رسميًا.</p>
              )}
              {activeMember.member.driveUrl ? (
                <Button
                  type="button"
                  onClick={() =>
                    window.open(activeMember.member.driveUrl, "_blank", "noopener,noreferrer")
                  }
                  className="mt-3 border-[2px] border-ink doodle-shadow-sm"
                >
                  <FolderOpen data-icon="inline-start" />
                  Open my Drive
                </Button>
              ) : (
                <p className="mt-2 font-bold text-red-700">No official Drive link saved.</p>
              )}
            </div>

            <Button
              type="button"
              variant="outline"
              onClick={() => setSettingsOpen(false)}
              className="mt-4 w-full border-[2px] border-ink bg-paper doodle-shadow-sm"
            >
              رجوع
            </Button>
          </section>
        </div>
      )}
    </div>
  );
}

type AdminSection =
  | "repo-updates"
  | "reviews"
  | "tasks"
  | "meetings"
  | "members"
  | "logs"
  | "archive"
  | "settings";

function formatDateTime(value?: string) {
  if (!value) return "Not set";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Not set";
  return date.toLocaleString();
}

function toDateTimeInputValue(value?: string) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const offset = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}

function fromDateTimeInputValue(value: string) {
  return value ? new Date(value).toISOString() : "";
}

function DateTimeField({
  label,
  value,
  onChange,
  help,
  tone = "neutral",
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  help: string;
  tone?: "neutral" | "deadline";
}) {
  return (
    <label
      className={`min-w-0 overflow-hidden rounded-xl border p-3 ${
        tone === "deadline"
          ? "border-yellow-200 bg-yellow-50"
          : "border-sky-100 bg-sky-50/70"
      }`}
    >
      <span className="mb-2 flex min-w-0 items-center gap-2 text-xs font-bold uppercase tracking-wide text-foreground/60">
        <CalendarClock className="size-4" />
        {label}
      </span>
      <Input
        type="datetime-local"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="block h-11 min-w-0 max-w-full border border-ink/20 bg-white px-3 text-left font-mono text-sm"
        dir="ltr"
      />
      <span className="mt-2 block max-w-full text-wrap break-words text-xs leading-5 text-foreground/55">{help}</span>
    </label>
  );
}

function calculateMeetingAttendance(meeting: Meeting, checkedAt = new Date().toISOString()) {
  const startTime = new Date(meeting.startsAt).getTime();
  const checkTime = new Date(checkedAt).getTime();
  const duration = Math.max(1, sanitizeNumber(meeting.durationMinutes) || 60);
  const lateMinutes =
    Number.isFinite(startTime) && Number.isFinite(checkTime)
      ? Math.max(0, Math.round((checkTime - startTime) / 60000))
      : 0;
  const billableLateMinutes = Math.max(0, lateMinutes - 10);
  const penaltyRate = Math.min(1, billableLateMinutes / duration);
  const score = Math.max(0, sanitizePositiveNumber(meeting.points, 1) * (1 - penaltyRate));

  return {
    lateMinutes,
    score: Math.round(score * 100) / 100,
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

function createRepoUpdateFromText({
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

function createAttentionUpdate({
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

function appendRepoUpdateIfMissing(data: StudioData, update: RepoUpdate | null) {
  if (!update) return data;
  const exists = (data.repoUpdates ?? []).some(
    (item) =>
      item.memberId === update.memberId &&
      item.taskId === update.taskId &&
      item.source === update.source &&
      item.excerpt === update.excerpt,
  );
  if (exists) return data;
  return sanitizeData({ ...data, repoUpdates: [update, ...(data.repoUpdates ?? [])] });
}

function statusTone(status?: TaskResponse["status"]) {
  if (status === "approved") return "bg-emerald-50 text-emerald-950 border-emerald-700";
  if (status === "rejected") return "bg-red-50 text-red-700 border-red-700";
  if (status === "submitted") return "bg-yellow-50 text-yellow-800 border-yellow-700";
  return "bg-zinc-50 text-foreground/65 border-ink/30";
}

type ActionFeedback = {
  tone: "error" | "pending" | "success";
  message: string;
};

type ActionResult = boolean | void | Promise<boolean | void>;

const ACTION_SUCCESS_CLASS =
  "border-emerald-700 bg-emerald-600 text-white hover:bg-emerald-700 shadow-[0_0_0_3px_rgba(16,185,129,0.22)]";

function missingFieldsMessage(fields: string[]) {
  return `Missing: ${fields.join(", ")}. Fill ${fields.length === 1 ? "it" : "them"} and press again.`;
}

function actionButtonClass(baseClassName: string, feedback?: ActionFeedback, forceSuccess = false) {
  return cn(baseClassName, (forceSuccess || feedback?.tone === "success") && ACTION_SUCCESS_CLASS);
}

function ActionFeedbackLine({ feedback }: { feedback?: ActionFeedback }) {
  if (!feedback) return null;

  return (
    <p
      className={cn(
        "mt-2 rounded-md border px-3 py-2 text-xs font-bold",
        feedback.tone === "success" && "border-emerald-200 bg-emerald-50 text-emerald-800",
        feedback.tone === "error" && "border-red-200 bg-red-50 text-red-700",
        feedback.tone === "pending" && "border-sky-200 bg-sky-50 text-sky-800",
      )}
    >
      {feedback.message}
    </p>
  );
}

function CompactMetric({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-lg border border-ink/10 bg-white px-4 py-3">
      <div className="text-2xl font-bold leading-none">{value}</div>
      <div className="mt-1 text-xs font-medium text-foreground/55">{label}</div>
    </div>
  );
}

function AdminView({
  data,
  stats,
  saveStatus,
  isDirty,
  isSaving,
  adminQueue,
  queueStatus,
  tokenDialogOpen,
  tokenDraft,
  onLogout,
  onAddTask,
  onUpdateTask,
  onAddMeeting,
  onUpdateMeeting,
  onRecordMeetingAttendance,
  onRemoveTask,
  onManualApprove,
  onSkipTaskMember,
  onUnskipTaskMember,
  onApproveQueuedSubmission,
  onRejectQueuedSubmission,
  onSaveQueuedProgress,
  onDismissQueuedProgress,
  onAddProgressUpdate,
  onReviewAnswer,
  onUpdateMember,
  onUpdateSettings,
  onMarkRepoUpdateSeen,
  onReviewProfileRequest,
  onRefreshAdminQueue,
  onTokenDraftChange,
  onCloseTokenDialog,
  onConfirmTokenAndSave,
  onSaveToGithub,
}: {
  data: StudioData;
  stats: ReturnType<typeof createStats>;
  saveStatus: string;
  isDirty: boolean;
  isSaving: boolean;
  adminQueue: AdminQueue;
  queueStatus: string;
  tokenDialogOpen: boolean;
  tokenDraft: string;
  onLogout: () => void;
  onAddTask: (task: Omit<StudioTask, "id" | "createdAt">) => ActionResult;
  onUpdateTask: (taskId: string, updates: Partial<StudioTask>) => ActionResult;
  onAddMeeting: (meeting: Omit<Meeting, "id" | "createdAt">) => ActionResult;
  onUpdateMeeting: (meetingId: string, updates: Partial<Meeting>) => ActionResult;
  onRecordMeetingAttendance: (meeting: Meeting, member: Member) => ActionResult;
  onRemoveTask: (taskId: string) => ActionResult;
  onManualApprove: (task: StudioTask, memberId: string, awardedPoints?: number) => ActionResult;
  onSkipTaskMember: (task: StudioTask, memberId: string, note?: string) => ActionResult;
  onUnskipTaskMember: (task: StudioTask, memberId: string) => ActionResult;
  onApproveQueuedSubmission: (item: QueuedSubmission) => ActionResult;
  onRejectQueuedSubmission: (item: QueuedSubmission) => ActionResult;
  onSaveQueuedProgress: (item: QueuedProgressUpdate) => ActionResult;
  onDismissQueuedProgress: (id: string) => void;
  onAddProgressUpdate: (task: StudioTask, memberId: string, note: string) => ActionResult;
  onReviewAnswer: (
    taskId: string,
    memberId: string,
    status: "approved" | "rejected",
    note?: string,
    awardedPoints?: number,
    overrideLocked?: boolean,
  ) => void;
  onUpdateMember: (memberId: string, updates: Partial<Member>) => void;
  onUpdateSettings: (settings: Partial<StudioSettings>) => void;
  onMarkRepoUpdateSeen: (updateId: string) => ActionResult;
  onReviewProfileRequest: (requestId: string, status: "approved" | "rejected") => ActionResult;
  onRefreshAdminQueue: () => void;
  onTokenDraftChange: (value: string) => void;
  onCloseTokenDialog: () => void;
  onConfirmTokenAndSave: () => ActionResult;
  onSaveToGithub: () => ActionResult;
}) {
  const [section, setSection] = useState<AdminSection>("tasks");
  const [navOpen, setNavOpen] = useState(false);
  const [taskTitle, setTaskTitle] = useState("");
  const [taskQuestion, setTaskQuestion] = useState("");
  const [taskPoints, setTaskPoints] = useState(1);
  const [taskScope, setTaskScope] = useState<"all" | "member">("all");
  const [taskMemberIds, setTaskMemberIds] = useState<string[]>([]);
  const [taskStartAt, setTaskStartAt] = useState("");
  const [taskDeadlineAt, setTaskDeadlineAt] = useState("");
  const [meetingTitle, setMeetingTitle] = useState("");
  const [meetingStartsAt, setMeetingStartsAt] = useState("");
  const [meetingDuration, setMeetingDuration] = useState(60);
  const [meetingPoints, setMeetingPoints] = useState(1);
  const [selectedTaskId, setSelectedTaskId] = useState("");
  const [selectedMeetingId, setSelectedMeetingId] = useState("");
  const [selectedMemberId, setSelectedMemberId] = useState(data.members[0]?.id ?? "");
  const [manualApproveMembers, setManualApproveMembers] = useState<Record<string, string>>({});
  const [manualApproveScores, setManualApproveScores] = useState<Record<string, string>>({});
  const [progressMembers, setProgressMembers] = useState<Record<string, string>>({});
  const [progressNotes, setProgressNotes] = useState<Record<string, string>>({});
  const [reviewNotes, setReviewNotes] = useState<Record<string, string>>({});
  const [reviewScores, setReviewScores] = useState<Record<string, string>>({});
  const [skipNotes, setSkipNotes] = useState<Record<string, string>>({});
  const [taskEditDrafts, setTaskEditDrafts] = useState<
    Record<string, { title: string; question: string; points: string; scope: "all" | "member"; memberIds: string[] }>
  >({});
  const [logMode, setLogMode] = useState<"task" | "member">("task");
  const [query, setQuery] = useState("");
  const [actionFeedback, setActionFeedback] = useState<Record<string, ActionFeedback>>({});

  const activeTasks = data.tasks.filter(isActiveTask);
  const archivedTasks = data.tasks.filter((task) => taskStatus(task) === "archived");
  const activeMeetings = (data.meetings ?? []).filter(isActiveMeeting);
  const archivedMeetings = (data.meetings ?? []).filter((meeting) => meetingStatus(meeting) === "archived");
  const visibleArchive = archivedTasks.filter((task) =>
    `${task.title} ${task.question}`.toLowerCase().includes(query.toLowerCase()),
  );
  const selectedTask =
    data.tasks.find((task) => task.id === selectedTaskId) ?? activeTasks[0] ?? archivedTasks[0];
  const selectedMeeting =
    (data.meetings ?? []).find((meeting) => meeting.id === selectedMeetingId) ??
    activeMeetings[0] ??
    archivedMeetings[0];
  const selectedMember =
    data.members.find((member) => member.id === selectedMemberId) ?? data.members[0];
  const pendingSubmissions = data.tasks.flatMap((task) =>
    Object.values(data.responses[task.id] ?? {})
      .filter((response) => response.status === "submitted")
      .map((response) => ({
        id: `${task.id}:${response.memberId}`,
        taskId: task.id,
        memberId: response.memberId,
        memberName: response.memberName,
        answer: response.answer,
        submittedAt: response.submittedAt,
      })),
  );
  const queuedProgress = adminQueue.progressUpdates;
  const unseenUpdates = data.repoUpdates?.filter((update) => !update.seen) ?? [];
  const pendingProfileRequests = (data.profileRequests ?? []).filter(
    (request) => request.status === "pending",
  );

  function attentionLandingSection(): AdminSection {
    if (unseenUpdates.length > 0 || pendingProfileRequests.length > 0) return "repo-updates";
    if (pendingSubmissions.length > 0) return "reviews";
    return "tasks";
  }

  useEffect(() => {
    setSection((current) => {
      if (current === "repo-updates" && unseenUpdates.length === 0 && pendingProfileRequests.length === 0) {
        return pendingSubmissions.length > 0 ? "reviews" : "tasks";
      }
      if (current === "reviews" && pendingSubmissions.length === 0) {
        return unseenUpdates.length > 0 || pendingProfileRequests.length > 0 ? "repo-updates" : "tasks";
      }
      if (current === "tasks") return attentionLandingSection();
      return current;
    });
  }, [pendingProfileRequests.length, pendingSubmissions.length, unseenUpdates.length]);

  function go(nextSection: AdminSection) {
    setSection(nextSection);
    setNavOpen(false);
  }

  function setAdminFeedback(key: string, feedback: ActionFeedback) {
    setActionFeedback((current) => ({ ...current, [key]: feedback }));
  }

  function blockAdminAction(key: string, fields: string[]) {
    setAdminFeedback(key, { tone: "error", message: missingFieldsMessage(fields) });
  }

  async function runAdminAction(
    key: string,
    action: () => ActionResult,
    successMessage = "Done.",
    failureMessage = "Action failed. Try again.",
  ) {
    setAdminFeedback(key, { tone: "pending", message: "Submitting..." });
    const result = await action();
    const ok = result !== false;
    setAdminFeedback(key, {
      tone: ok ? "success" : "error",
      message: ok ? successMessage : failureMessage,
    });
    return ok;
  }

  async function submitTask() {
    const missing = [
      !taskTitle.trim() ? "task title" : "",
      !taskQuestion.trim() ? "question or instructions" : "",
      taskScope === "member" && taskMemberIds.length === 0 ? "at least one member" : "",
    ].filter((field): field is string => Boolean(field));
    if (missing.length > 0) {
      blockAdminAction("admin:add-task", missing);
      return;
    }

    const ok = await runAdminAction(
      "admin:add-task",
      () =>
        onAddTask({
          title: taskTitle.trim(),
          question: taskQuestion.trim(),
          points: Math.max(1, Number.isFinite(taskPoints) ? taskPoints : 1),
          scope: taskScope,
          memberId: taskScope === "member" ? taskMemberIds[0] : undefined,
          memberIds: taskScope === "member" ? taskMemberIds : [],
          startAt: fromDateTimeInputValue(taskStartAt) || new Date().toISOString(),
          deadlineAt: fromDateTimeInputValue(taskDeadlineAt),
          status: "active",
        }),
      "Task added.",
      "Task was not added. Try again.",
    );
    if (!ok) return;
    setTaskTitle("");
    setTaskQuestion("");
    setTaskPoints(1);
    setTaskScope("all");
    setTaskMemberIds([]);
    setTaskStartAt("");
    setTaskDeadlineAt("");
  }

  async function submitMeeting() {
    if (!meetingTitle.trim()) {
      blockAdminAction("admin:add-meeting", ["meeting title"]);
      return;
    }
    const ok = await runAdminAction(
      "admin:add-meeting",
      () =>
        onAddMeeting({
          title: meetingTitle.trim(),
          startsAt: fromDateTimeInputValue(meetingStartsAt) || new Date().toISOString(),
          durationMinutes: sanitizeNumber(meetingDuration) || 60,
          points: sanitizePositiveNumber(meetingPoints, 1),
          status: "active",
        }),
      "Meeting added.",
      "Meeting was not added. Try again.",
    );
    if (!ok) return;
    setMeetingTitle("");
    setMeetingStartsAt("");
    setMeetingDuration(60);
    setMeetingPoints(1);
  }

  function prepareTaskForMember(member: Member) {
    setTaskScope("member");
    setTaskMemberIds([member.id]);
    setTaskTitle("");
    setTaskQuestion("");
    setSection("tasks");
    setNavOpen(false);
  }

  function assignedMembers(task: StudioTask) {
    return data.members.filter((member) => taskIsForMember(task, member.id));
  }

  function effectiveAssignedMembers(task: StudioTask) {
    return assignedMembers(task).filter((member) => !isTaskSkipped(data, task.id, member.id));
  }

  function selectedMemberIdsForTask(task: StudioTask) {
    if (task.scope === "all") return data.members.map((member) => member.id);
    return uniqueText(task.memberIds ?? (task.memberId ? [task.memberId] : []));
  }

  function taskAudienceLabel(task: StudioTask) {
    if (task.scope === "all") return "All team";
    const memberIds = selectedMemberIdsForTask(task);
    if (memberIds.length === 1) {
      return data.members.find((member) => member.id === memberIds[0])?.name ?? "One member";
    }
    return `${memberIds.length} members`;
  }

  function toggleTaskMemberDraft(memberId: string) {
    setTaskScope("member");
    setTaskMemberIds((current) =>
      current.includes(memberId)
        ? current.filter((id) => id !== memberId)
        : [...current, memberId],
    );
  }

  function taskEditDraft(task: StudioTask) {
    return (
      taskEditDrafts[task.id] ?? {
        title: task.title,
        question: task.question,
        points: String(sanitizePositiveNumber(task.points, 1)),
        scope: task.scope,
        memberIds: task.scope === "member" ? selectedMemberIdsForTask(task) : [],
      }
    );
  }

  function updateTaskEditDraft(
    task: StudioTask,
    updates: Partial<{ title: string; question: string; points: string; scope: "all" | "member"; memberIds: string[] }>,
  ) {
    setTaskEditDrafts((current) => ({
      ...current,
      [task.id]: { ...taskEditDraft(task), ...updates },
    }));
  }

  function resetTaskEditDraft(taskId: string) {
    setTaskEditDrafts((current) => {
      const next = { ...current };
      delete next[taskId];
      return next;
    });
  }

  function toggleTaskEditMember(task: StudioTask, memberId: string) {
    const draft = taskEditDraft(task);
    const memberIds = draft.memberIds.includes(memberId)
      ? draft.memberIds.filter((id) => id !== memberId)
      : [...draft.memberIds, memberId];
    updateTaskEditDraft(task, { scope: "member", memberIds });
  }

  function taskMetric(task: StudioTask) {
    const members = effectiveAssignedMembers(task);
    const memberIds = new Set(members.map((member) => member.id));
    const responses = Object.values(data.responses[task.id] ?? {}).filter((response) =>
      memberIds.has(response.memberId),
    );
    return {
      expected: members.filter((member) => !member.hidden).length,
      received: responses.length,
      approved: responses.filter((response) => response.status === "approved").length,
      rejected: responses.reduce((sum, response) => sum + rejectionCount(response), 0),
      pending: responses.filter((response) => response.status === "submitted").length,
    };
  }

  function renderTaskRows(tasks: StudioTask[]) {
    if (tasks.length === 0) {
      return <p className="rounded-lg border border-dashed border-ink/20 bg-white p-6 text-sm text-foreground/55">No tasks here yet.</p>;
    }

    return (
      <div className="grid gap-2">
        {tasks.map((task) => {
          const metric = taskMetric(task);
          const isSelected = selectedTask?.id === task.id;
          return (
            <button
              key={task.id}
              type="button"
              onClick={() => setSelectedTaskId(task.id)}
              className={`rounded-lg border p-3 text-start transition hover:border-ink/40 hover:bg-white ${
                isSelected ? "border-ink bg-white shadow-sm" : "border-ink/10 bg-white/70"
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="truncate text-lg font-bold">{task.title}</div>
                  <div className="mt-1 text-xs text-foreground/55">
                    {taskAudienceLabel(task)}{" "}
                    | {task.points || 1} pts | deadline {formatDateTime(task.deadlineAt)}
                  </div>
                </div>
                <span className="shrink-0 rounded-full border border-ink/10 bg-paper px-2 py-1 text-xs font-bold">
                  {metric.received}/{metric.expected}
                </span>
              </div>
              <div className="mt-2 flex flex-wrap gap-2 text-xs font-bold text-foreground/60">
                <span>Pending {metric.pending}</span>
                <span>Approved {metric.approved}</span>
                <span>Rejected {metric.rejected}</span>
              </div>
            </button>
          );
        })}
      </div>
    );
  }

  function renderTaskDetail(task?: StudioTask) {
    if (!task) return null;
    const members = assignedMembers(task);
    const responses = data.responses[task.id] ?? {};
    const selectedManualMember = manualApproveMembers[task.id] ?? "";
    const selectedManualScore = manualApproveScores[task.id] ?? String(sanitizePositiveNumber(task.points, 1));
    const selectedProgressMember = progressMembers[task.id] ?? "";
    const progressNote = progressNotes[task.id] ?? "";
    const manualApproveKey = `admin:manual-approve:${task.id}`;
    const addProgressKey = `admin:add-progress:${task.id}`;
    const saveTaskKey = `admin:save-task:${task.id}`;
    const editDraft = taskEditDraft(task);

    return (
      <section className="rounded-xl border border-ink/10 bg-white p-4 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-2xl font-bold">{task.title}</h3>
              <span className="rounded-full border border-ink/10 bg-paper px-2 py-1 text-xs font-bold">
                {taskStatus(task)}
              </span>
            </div>
            <p className="mt-1 max-w-2xl whitespace-pre-wrap text-sm leading-6 text-foreground/65">
              {task.question}
            </p>
            <div className="mt-3 flex flex-wrap gap-2 text-xs font-bold text-foreground/55">
              <span>Start: {formatDateTime(task.startAt)}</span>
              <span>Deadline: {formatDateTime(task.deadlineAt)}</span>
              <span>{task.points || 1} points</span>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {isActiveTask(task) ? (
              <Button
                type="button"
                variant="outline"
                onClick={() => onUpdateTask(task.id, { status: "archived" })}
                className="border border-ink/20 bg-paper"
              >
                <Archive data-icon="inline-start" />
                Archive
              </Button>
            ) : (
              <Button
                type="button"
                onClick={() => onUpdateTask(task.id, { status: "active" })}
                className="border border-ink/20"
              >
                <RotateCcw data-icon="inline-start" />
                Restore
              </Button>
            )}
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => onRemoveTask(task.id)}
              className="border border-red-200 bg-red-50 text-red-700"
              aria-label="Delete task"
            >
              <Trash2 className="size-4" />
            </Button>
          </div>
        </div>

        <div className="mt-4 grid gap-3 md:grid-cols-2">
          <DateTimeField
            label="Start"
            value={toDateTimeInputValue(task.startAt)}
            onChange={(value) => onUpdateTask(task.id, { startAt: fromDateTimeInputValue(value) })}
            help="Start controls when this assignment opens."
          />
          <DateTimeField
            label="Deadline"
            value={toDateTimeInputValue(task.deadlineAt)}
            onChange={(value) => onUpdateTask(task.id, { deadlineAt: fromDateTimeInputValue(value) })}
            help="After deadline: default half score. After double time: locked unless overridden."
            tone="deadline"
          />
        </div>

        <div className="mt-4 rounded-lg border border-ink/10 bg-paper p-3">
          <div className="mb-3 flex items-center gap-2 font-bold">
            <ClipboardList className="size-4" />
            Edit task
          </div>
          <div className="grid gap-3">
            <Input
              value={editDraft.title}
              onChange={(event) => updateTaskEditDraft(task, { title: event.target.value })}
              placeholder="Task title"
              className="border border-ink/20 bg-white"
            />
            <Textarea
              value={editDraft.question}
              onChange={(event) => updateTaskEditDraft(task, { question: event.target.value })}
              placeholder="Question or instructions"
              className="min-h-24 border border-ink/20 bg-white"
            />
            <div className="grid gap-3 md:grid-cols-[140px_1fr]">
              <Input
                type="number"
                min={1}
                value={editDraft.points}
                onChange={(event) => updateTaskEditDraft(task, { points: event.target.value })}
                placeholder="Points"
                className="border border-ink/20 bg-white"
              />
              <div className="grid gap-2 rounded-md border border-ink/20 bg-white p-2 text-sm">
                <label className="flex h-8 items-center gap-2 font-bold">
                  <input
                    type="checkbox"
                    checked={editDraft.scope === "all"}
                    onChange={(event) =>
                      updateTaskEditDraft(task, {
                        scope: event.target.checked ? "all" : "member",
                        memberIds: event.target.checked ? [] : editDraft.memberIds,
                      })
                    }
                  />
                  All team
                </label>
                <div className="max-h-36 overflow-auto border-t border-ink/10 pt-2">
                  {data.members.map((member) => (
                    <label key={member.id} className="flex h-8 items-center gap-2">
                      <input
                        type="checkbox"
                        disabled={editDraft.scope === "all"}
                        checked={editDraft.scope === "all" || editDraft.memberIds.includes(member.id)}
                        onChange={() => toggleTaskEditMember(task, member.id)}
                      />
                      <span className="truncate">{member.name}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                onClick={() => {
                  const cleanMemberIds = uniqueText(editDraft.memberIds).filter((memberId) =>
                    data.members.some((member) => member.id === memberId),
                  );
                  const missing = [
                    !editDraft.title.trim() ? "task title" : "",
                    !editDraft.question.trim() ? "question or instructions" : "",
                    editDraft.scope === "member" && cleanMemberIds.length === 0 ? "at least one member" : "",
                  ].filter((field): field is string => Boolean(field));
                  if (missing.length > 0) {
                    blockAdminAction(saveTaskKey, missing);
                    return;
                  }
                  void runAdminAction(
                    saveTaskKey,
                    () =>
                      onUpdateTask(task.id, {
                        title: editDraft.title.trim(),
                        question: editDraft.question.trim(),
                        points: sanitizePositiveNumber(editDraft.points, sanitizePositiveNumber(task.points, 1)),
                        scope: editDraft.scope,
                        memberId: editDraft.scope === "member" ? cleanMemberIds[0] : undefined,
                        memberIds: editDraft.scope === "member" ? cleanMemberIds : [],
                      }),
                    "Task updated.",
                    "Task update failed. Try again.",
                  ).then((ok) => {
                    if (ok) resetTaskEditDraft(task.id);
                  });
                }}
                className={actionButtonClass("", actionFeedback[saveTaskKey])}
              >
                <Save data-icon="inline-start" />
                Save task
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => resetTaskEditDraft(task.id)}
                className="border border-ink/20 bg-white"
              >
                Reset
              </Button>
            </div>
            <ActionFeedbackLine feedback={actionFeedback[saveTaskKey]} />
          </div>
        </div>

        <div className="mt-5 grid gap-3 lg:grid-cols-[1fr_1fr]">
          <div className="rounded-lg border border-ink/10 bg-paper p-3">
            <div className="mb-3 flex items-center gap-2 font-bold">
              <Star className="size-4" />
              Manual approval
            </div>
            <div className="grid gap-2 sm:grid-cols-[1fr_140px_auto]">
              <select
                value={selectedManualMember}
                onChange={(event) =>
                  setManualApproveMembers((current) => ({
                    ...current,
                    [task.id]: event.target.value,
                  }))
                }
                className="h-10 rounded-md border border-ink/20 bg-white px-3 text-sm"
              >
                <option value="">Choose member</option>
                {members.map((member) => (
                  <option key={member.id} value={member.id}>
                    {member.name}
                  </option>
                ))}
              </select>
              <Input
                type="number"
                min={0}
                step={0.1}
                value={selectedManualScore}
                onChange={(event) =>
                  setManualApproveScores((current) => ({
                    ...current,
                    [task.id]: event.target.value,
                  }))
                }
                placeholder="Score"
                className="h-10 border border-ink/20 bg-white"
              />
              <Button
                type="button"
                onClick={() => {
                  if (!selectedManualMember) {
                    blockAdminAction(manualApproveKey, ["member"]);
                    return;
                  }
                  void runAdminAction(
                    manualApproveKey,
                    () =>
                      onManualApprove(
                        task,
                        selectedManualMember,
                        sanitizeScore(selectedManualScore, sanitizePositiveNumber(task.points, 1)),
                      ),
                    "Manual approval saved.",
                    "Manual approval failed. Try again.",
                  );
                }}
                className={actionButtonClass("", actionFeedback[manualApproveKey])}
              >
                <Check data-icon="inline-start" />
                Approve
              </Button>
            </div>
            <ActionFeedbackLine feedback={actionFeedback[manualApproveKey]} />
          </div>

          <div className="rounded-lg border border-ink/10 bg-yellow-50 p-3">
            <div className="mb-3 flex items-center gap-2 font-bold">
              <Bell className="size-4" />
              Progress update
            </div>
            <div className="grid gap-2">
              <select
                value={selectedProgressMember}
                onChange={(event) =>
                  setProgressMembers((current) => ({ ...current, [task.id]: event.target.value }))
                }
                className="h-10 rounded-md border border-ink/20 bg-white px-3 text-sm"
              >
                <option value="">Choose member</option>
                {members.map((member) => (
                  <option key={member.id} value={member.id}>
                    {member.name}
                  </option>
                ))}
              </select>
              <div className="grid gap-2 sm:grid-cols-[1fr_auto]">
                <Input
                  value={progressNote}
                  onChange={(event) =>
                    setProgressNotes((current) => ({ ...current, [task.id]: event.target.value }))
                  }
                  placeholder="Quick note"
                  className="border border-ink/20 bg-white"
                />
                <Button
                  type="button"
                  onClick={() => {
                    const missing = [
                      !selectedProgressMember ? "member" : "",
                      !progressNote.trim() ? "quick note" : "",
                    ].filter((field): field is string => Boolean(field));
                    if (missing.length > 0) {
                      blockAdminAction(addProgressKey, missing);
                      return;
                    }
                    void runAdminAction(
                      addProgressKey,
                      () => onAddProgressUpdate(task, selectedProgressMember, progressNote),
                      "Progress update added.",
                      "Progress update failed. Try again.",
                    ).then((ok) => {
                      if (ok) setProgressNotes((current) => ({ ...current, [task.id]: "" }));
                    });
                  }}
                  className={actionButtonClass(
                    "bg-yellow-100 text-foreground hover:bg-yellow-200",
                    actionFeedback[addProgressKey],
                  )}
                >
                  <Plus data-icon="inline-start" />
                  Add
                </Button>
              </div>
              <ActionFeedbackLine feedback={actionFeedback[addProgressKey]} />
            </div>
          </div>
        </div>

        <div className="mt-5 grid gap-3">
          {members.map((member) => {
            const response = responses[member.id];
            const reviewNoteKey = `${task.id}:${member.id}`;
            const reviewNote = reviewNotes[reviewNoteKey] ?? "";
            const manualScoreKey = `manual:${task.id}:${member.id}`;
            const manualScore =
              manualApproveScores[manualScoreKey] ?? String(sanitizePositiveNumber(task.points, 1));
            const scoreValue =
              reviewScores[reviewNoteKey] ??
              (response ? String(calculateAwardedPoints(task, response, "approved")) : "");
            const skipNote = skipNotes[reviewNoteKey] ?? "";
            const skipped = getTaskSkip(data, task.id, member.id);
            const progress = (data.progressUpdates?.[task.id] ?? []).filter(
              (update) => update.memberId === member.id,
            );
            const awarded = responseAwardedPoints(task, response);
            const late = responseIsLate(task, response);
            const hardLocked = response ? isHardLocked(task, response) : false;
            const rowManualKey = `admin:row-manual:${task.id}:${member.id}`;
            const skipKey = `admin:skip:${task.id}:${member.id}`;
            const restoreKey = `admin:restore:${task.id}:${member.id}`;
            const approveKey = `admin:approve:${task.id}:${member.id}`;
            const overrideKey = `admin:override:${task.id}:${member.id}`;
            const rejectKey = `admin:reject:${task.id}:${member.id}`;
            return (
              <details
                key={member.id}
                className={`rounded-lg border p-3 transition ${
                  skipped
                    ? "border-zinc-200 bg-zinc-50"
                    : response?.status === "approved"
                    ? "border-emerald-200 bg-emerald-50"
                    : response?.status === "submitted"
                      ? "border-yellow-200 bg-yellow-50"
                      : response?.status === "rejected"
                        ? "border-red-200 bg-red-50"
                        : "border-ink/10 bg-white"
                }`}
              >
                <summary className="flex cursor-pointer list-none items-center justify-between gap-3">
                  <div className="min-w-0">
                    <strong className="truncate">{member.name}</strong>
                    <div className="text-xs text-foreground/55">
                      {skipped
                        ? `Skipped ${formatDateTime(skipped.skippedAt)}`
                        : response
                          ? `Submitted ${formatDateTime(response.submittedAt)}`
                          : "No final submission"}
                    </div>
                  </div>
                  <span className={`rounded-full border px-2 py-1 text-xs font-bold ${skipped ? "border-zinc-300 bg-zinc-100 text-zinc-600" : statusTone(response?.status)}`}>
                    {skipped ? "skipped" : response?.status ?? "missing"}
                  </span>
                </summary>
                <div className="mt-3 grid gap-2 rounded-md border border-zinc-200 bg-white/70 p-3">
                  <Input
                    value={skipNote}
                    onChange={(event) =>
                      setSkipNotes((current) => ({
                        ...current,
                        [reviewNoteKey]: event.target.value,
                      }))
                    }
                    placeholder="Optional skip note"
                    className="border border-ink/20 bg-white"
                  />
                  <div className="flex flex-wrap gap-2">
                    {!response && !skipped && (
                      <>
                        <Input
                          type="number"
                          min={0}
                          step={0.1}
                          value={manualScore}
                          onChange={(event) =>
                            setManualApproveScores((current) => ({
                              ...current,
                              [manualScoreKey]: event.target.value,
                            }))
                          }
                          placeholder="Manual score"
                          className="h-9 w-36 border border-ink/20 bg-white"
                        />
                        <Button
                          type="button"
                          size="sm"
                          onClick={() =>
                            void runAdminAction(
                              rowManualKey,
                              () =>
                                onManualApprove(
                                  task,
                                  member.id,
                                  sanitizeScore(manualScore, sanitizePositiveNumber(task.points, 1)),
                                ),
                              "Manual approval saved.",
                              "Manual approval failed. Try again.",
                            )
                          }
                          className={actionButtonClass(
                            "bg-emerald-600 text-white hover:bg-emerald-700",
                            actionFeedback[rowManualKey],
                          )}
                        >
                          <Check data-icon="inline-start" />
                          Manual approve
                        </Button>
                        <ActionFeedbackLine feedback={actionFeedback[rowManualKey]} />
                      </>
                    )}
                    {skipped ? (
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() =>
                          void runAdminAction(
                            restoreKey,
                            () => onUnskipTaskMember(task, member.id),
                            "Assignment restored.",
                            "Could not restore assignment.",
                          )
                        }
                        className={actionButtonClass(
                          "border border-ink/20 bg-white",
                          actionFeedback[restoreKey],
                        )}
                      >
                        Restore assignment
                      </Button>
                    ) : (
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          void runAdminAction(
                            skipKey,
                            () => onSkipTaskMember(task, member.id, skipNote),
                            "Member skipped.",
                            "Could not skip member.",
                          ).then((ok) => {
                            if (ok) setSkipNotes((current) => ({ ...current, [reviewNoteKey]: "" }));
                          });
                        }}
                        className={actionButtonClass(
                          "border border-zinc-300 bg-zinc-100 text-zinc-700",
                          actionFeedback[skipKey],
                        )}
                      >
                        Skip member
                      </Button>
                    )}
                    <span className="text-xs leading-8 text-foreground/55">
                      Skip is a full exemption: no points, no penalties, no completion count.
                    </span>
                  </div>
                  <ActionFeedbackLine feedback={actionFeedback[restoreKey] ?? actionFeedback[skipKey]} />
                </div>
                {response && (
                  <div className="mt-3 rounded-md border border-ink/10 bg-paper p-3">
                    <p className="whitespace-pre-wrap leading-7">{response.answer}</p>
                    <div className="mt-3 flex flex-wrap gap-2 text-xs font-bold">
                      <span className="rounded-full border border-ink/10 bg-white px-2 py-1">
                        Score {awarded}/{sanitizePositiveNumber(task.points, 1)}
                      </span>
                      {late && (
                        <span className="rounded-full border border-yellow-300 bg-yellow-100 px-2 py-1 text-yellow-900">
                          Late - half score
                        </span>
                      )}
                      {hardLocked && (
                        <span className="rounded-full border border-red-300 bg-red-50 px-2 py-1 text-red-700">
                          Locked - override required
                        </span>
                      )}
                      {rejectionCount(response) > 0 && (
                        <span className="rounded-full border border-red-200 bg-red-50 px-2 py-1 text-red-700">
                          Rejections {rejectionCount(response)}
                        </span>
                      )}
                    </div>
                    <Input
                      value={reviewNote}
                      onChange={(event) =>
                        setReviewNotes((current) => ({
                          ...current,
                          [reviewNoteKey]: event.target.value,
                        }))
                      }
                      placeholder="Optional review note"
                      className="mt-3 border border-ink/20 bg-white"
                    />
                    <label className="mt-3 grid gap-1 text-xs font-bold text-foreground/70">
                      Awarded score
                      <Input
                        type="number"
                        min={0}
                        step={0.1}
                        value={scoreValue}
                        onChange={(event) =>
                          setReviewScores((current) => ({
                            ...current,
                            [reviewNoteKey]: event.target.value,
                          }))
                        }
                        className="border border-ink/20 bg-white"
                      />
                      <span className="font-normal text-foreground/55">
                        You can award bonus above the task points. Default follows the deadline rule.
                      </span>
                    </label>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <Button
                        type="button"
                        size="sm"
                        onClick={() => {
                          if (hardLocked) {
                            blockAdminAction(approveKey, ["override approval for locked submission"]);
                            return;
                          }
                          void runAdminAction(
                            approveKey,
                            () =>
                              onReviewAnswer(
                                task.id,
                                member.id,
                                "approved",
                                reviewNote,
                                sanitizeScore(scoreValue, calculateAwardedPoints(task, response, "approved")),
                                false,
                              ),
                            "Submission approved.",
                            "Approve failed. Try again.",
                          ).then((ok) => {
                            if (ok) setReviewNotes((current) => ({ ...current, [reviewNoteKey]: "" }));
                          });
                        }}
                        className={actionButtonClass("", actionFeedback[approveKey])}
                      >
                        <Check data-icon="inline-start" />
                        Approve
                      </Button>
                      {hardLocked && (
                        <Button
                          type="button"
                          size="sm"
                          onClick={() => {
                            void runAdminAction(
                              overrideKey,
                              () =>
                                onReviewAnswer(
                                  task.id,
                                  member.id,
                                  "approved",
                                  reviewNote,
                                  sanitizeScore(scoreValue, 0),
                                  true,
                                ),
                              "Override approval saved.",
                              "Override approval failed.",
                            ).then((ok) => {
                              if (ok) setReviewNotes((current) => ({ ...current, [reviewNoteKey]: "" }));
                            });
                          }}
                          className={actionButtonClass(
                            "bg-red-600 text-white hover:bg-red-700",
                            actionFeedback[overrideKey],
                          )}
                        >
                          Override approve
                        </Button>
                      )}
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          void runAdminAction(
                            rejectKey,
                            () => onReviewAnswer(task.id, member.id, "rejected", reviewNote, 0, false),
                            "Submission rejected.",
                            "Reject failed. Try again.",
                          ).then((ok) => {
                            if (ok) setReviewNotes((current) => ({ ...current, [reviewNoteKey]: "" }));
                          });
                        }}
                        className={actionButtonClass(
                          "border border-ink/20 bg-white",
                          actionFeedback[rejectKey],
                        )}
                      >
                        <RotateCcw data-icon="inline-start" />
                        Reject
                      </Button>
                    </div>
                    <ActionFeedbackLine
                      feedback={
                        actionFeedback[approveKey] ??
                        actionFeedback[overrideKey] ??
                        actionFeedback[rejectKey]
                      }
                    />
                  </div>
                )}
                {progress.length > 0 && (
                  <div className="mt-3 grid gap-2">
                    {progress.map((update) => (
                      <div key={update.id} className="rounded-md border border-yellow-200 bg-yellow-50 p-3 text-sm">
                        <p className="whitespace-pre-wrap leading-6">{update.note}</p>
                        <p className="mt-1 text-xs text-foreground/50">{formatDateTime(update.createdAt)}</p>
                      </div>
                    ))}
                  </div>
                )}
              </details>
            );
          })}
        </div>
      </section>
    );
  }

  function renderMeetingRows(meetings: Meeting[]) {
    if (meetings.length === 0) {
      return <p className="rounded-lg border border-dashed border-ink/20 bg-white p-6 text-sm text-foreground/55">No meetings here yet.</p>;
    }

    return (
      <div className="grid gap-2">
        {meetings.map((meeting) => {
          const attendance = Object.values(data.meetingAttendance?.[meeting.id] ?? {});
          const isSelected = selectedMeeting?.id === meeting.id;
          return (
            <button
              key={meeting.id}
              type="button"
              onClick={() => setSelectedMeetingId(meeting.id)}
              className={`rounded-lg border p-3 text-start transition hover:border-ink/40 hover:bg-white ${
                isSelected ? "border-ink bg-white shadow-sm" : "border-ink/10 bg-white/70"
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="truncate text-lg font-bold">{meeting.title}</div>
                  <div className="mt-1 text-xs text-foreground/55">
                    {formatDateTime(meeting.startsAt)} | {meeting.durationMinutes}m | {meeting.points} pts
                  </div>
                </div>
                <span className="shrink-0 rounded-full border border-ink/10 bg-paper px-2 py-1 text-xs font-bold">
                  {attendance.length}/{data.members.filter((member) => !member.hidden).length}
                </span>
              </div>
            </button>
          );
        })}
      </div>
    );
  }

  function renderMeetingDetail(meeting?: Meeting) {
    if (!meeting) return null;
    const attendanceMap = data.meetingAttendance?.[meeting.id] ?? {};
    const totalScore = Object.values(attendanceMap).reduce((sum, item) => sum + item.score, 0);

    return (
      <section className="rounded-xl border border-ink/10 bg-white p-4 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-2xl font-bold">{meeting.title}</h3>
              <span className="rounded-full border border-ink/10 bg-paper px-2 py-1 text-xs font-bold">
                {meetingStatus(meeting)}
              </span>
            </div>
            <div className="mt-2 flex flex-wrap gap-2 text-xs font-bold text-foreground/55">
              <span>Start: {formatDateTime(meeting.startsAt)}</span>
              <span>Duration: {meeting.durationMinutes}m</span>
              <span>Points: {meeting.points}</span>
              <span>Total score: {Math.round(totalScore * 100) / 100}</span>
            </div>
          </div>
          {isActiveMeeting(meeting) ? (
            <Button
              type="button"
              variant="outline"
              onClick={() => onUpdateMeeting(meeting.id, { status: "archived" })}
              className="border border-ink/20 bg-paper"
            >
              <Archive data-icon="inline-start" />
              Archive
            </Button>
          ) : (
            <Button
              type="button"
              onClick={() => onUpdateMeeting(meeting.id, { status: "active" })}
              className="border border-ink/20"
            >
              <RotateCcw data-icon="inline-start" />
              Restore
            </Button>
          )}
        </div>

        <div className="mt-4 grid gap-3 md:grid-cols-3">
          <DateTimeField
            label="Start"
            value={toDateTimeInputValue(meeting.startsAt)}
            onChange={(value) => onUpdateMeeting(meeting.id, { startsAt: fromDateTimeInputValue(value) })}
            help="Used to calculate late minutes."
          />
          <label className="grid gap-1 text-sm font-bold">
            Duration minutes
            <Input
              type="number"
              min={1}
              value={meeting.durationMinutes}
              onChange={(event) =>
                onUpdateMeeting(meeting.id, { durationMinutes: sanitizeNumber(event.target.value) || 60 })
              }
              className="border border-ink/20 bg-paper"
            />
          </label>
          <label className="grid gap-1 text-sm font-bold">
            Points
            <Input
              type="number"
              min={0.1}
              step={0.1}
              value={meeting.points}
              onChange={(event) =>
                onUpdateMeeting(meeting.id, { points: sanitizePositiveNumber(event.target.value, 1) })
              }
              className="border border-ink/20 bg-paper"
            />
          </label>
        </div>

        <div className="mt-5 grid gap-2">
          {data.members.map((member) => {
            const attendance = attendanceMap[member.id];
            return (
              <div
                key={member.id}
                className={`flex flex-wrap items-center justify-between gap-3 rounded-lg border p-3 transition ${
                  attendance
                    ? "border-emerald-200 bg-emerald-50 text-emerald-950"
                    : "border-ink/10 bg-white"
                }`}
              >
                <div>
                  <strong>{member.name}</strong>
                  {attendance ? (
                    <p className="text-xs text-foreground/60">
                      Checked {formatDateTime(attendance.checkedAt)} | late {attendance.lateMinutes}m | score{" "}
                      {attendance.score}
                    </p>
                  ) : (
                    <p className="text-xs text-foreground/50">Not checked yet</p>
                  )}
                </div>
                <Button
                  type="button"
                  onClick={() => onRecordMeetingAttendance(meeting, member)}
                  className={attendance ? "bg-emerald-600 text-white hover:bg-emerald-700" : ""}
                >
                  <Check data-icon="inline-start" />
                  {attendance ? "Checked" : "Check"}
                </Button>
              </div>
            );
          })}
        </div>
      </section>
    );
  }

  function renderMemberLog(member: Member) {
    const memberTasks = data.tasks.filter((task) => taskIsForMember(task, member.id));
    return (
      <div className="grid gap-2">
        <div className="grid gap-2 sm:grid-cols-4">
          <CompactMetric label="Old tasks" value={member.baseCompleted ?? 0} />
          <CompactMetric label="Old approved" value={member.baseApproved ?? 0} />
          <CompactMetric label="Old rejected" value={member.baseRejected ?? 0} />
          <CompactMetric label="Old points" value={member.basePoints ?? 0} />
        </div>
        {(data.meetings ?? []).length > 0 && (
          <div className="grid gap-2">
            {(data.meetings ?? []).map((meeting) => {
              const attendance = data.meetingAttendance?.[meeting.id]?.[member.id];
              return (
                <div key={meeting.id} className="rounded-lg border border-ink/10 bg-white p-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <strong>{meeting.title}</strong>
                    <span
                      className={`rounded-full border px-2 py-1 text-xs font-bold ${
                        attendance
                          ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                          : "border-zinc-200 bg-zinc-50 text-zinc-500"
                      }`}
                    >
                      {attendance ? `${attendance.score} pts` : "absent"}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-foreground/55">
                    {meetingStatus(meeting)} | {formatDateTime(meeting.startsAt)}
                    {attendance ? ` | late ${attendance.lateMinutes}m` : ""}
                  </p>
                </div>
              );
            })}
          </div>
        )}
        {memberTasks.map((task) => {
          const response = getResponse(data, task.id, member.id);
          const skipped = getTaskSkip(data, task.id, member.id);
          const progress = (data.progressUpdates?.[task.id] ?? []).filter(
            (update) => update.memberId === member.id,
          );
          const awarded = responseAwardedPoints(task, response);
          const late = responseIsLate(task, response);
          const note = latestReviewNote(response);
          return (
            <div key={task.id} className="rounded-lg border border-ink/10 bg-white p-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <strong>{task.title}</strong>
                  <div className="text-xs text-foreground/55">
                    {taskStatus(task)} | deadline {formatDateTime(task.deadlineAt)}
                  </div>
                </div>
                <span className={`rounded-full border px-2 py-1 text-xs font-bold ${skipped ? "border-zinc-300 bg-zinc-100 text-zinc-600" : statusTone(response?.status)}`}>
                  {skipped ? "skipped" : response?.status ?? "missing"}
                </span>
              </div>
              <div className="mt-2 flex flex-wrap gap-2 text-xs font-bold text-foreground/55">
                <span>Score {awarded}/{sanitizePositiveNumber(task.points, 1)}</span>
                <span>Rejections {rejectionCount(response)}</span>
                {skipped && <span>Skip exemption: no profile impact</span>}
                {late && <span className="text-yellow-800">Late - half score</span>}
              </div>
              {note && <p className="mt-2 rounded-md border border-ink/10 bg-paper p-2 text-sm">Note: {note}</p>}
              {response && <p className="mt-2 whitespace-pre-wrap text-sm leading-6">{response.answer}</p>}
              {progress.length > 0 && (
                <p className="mt-2 text-xs font-bold text-yellow-800">{progress.length} progress updates</p>
              )}
            </div>
          );
        })}
      </div>
    );
  }

  const navItems: Array<{ id: AdminSection; label: string; icon: typeof BarChart3 }> = [
    { id: "repo-updates", label: "Attention", icon: Bell },
    { id: "reviews", label: "Reviews", icon: ListChecks },
    { id: "tasks", label: "Tasks", icon: ClipboardList },
    { id: "meetings", label: "Meetings", icon: CalendarClock },
    { id: "members", label: "Members", icon: Users },
    { id: "logs", label: "Logs", icon: ListChecks },
    { id: "archive", label: "Archive", icon: Archive },
    { id: "settings", label: "Settings", icon: Settings },
  ];

  const nav = (
    <nav className="flex h-full flex-col gap-1">
      <div className="mb-5 flex items-center gap-3 px-2">
        <Logo size="size-10" />
        <div>
          <div className="text-lg font-bold leading-none">Hivo Admin</div>
          <div className="mt-1 text-xs text-foreground/50">Team operations</div>
        </div>
      </div>
      {navItems.map((item) => {
        const Icon = item.icon;
        return (
          <button
            key={item.id}
            type="button"
            onClick={() => go(item.id)}
            className={`flex items-center gap-3 rounded-lg px-3 py-2 text-start text-sm font-bold transition ${
              section === item.id ? "bg-ink text-white" : "text-foreground/70 hover:bg-ink/5"
            }`}
          >
            <Icon className="size-4" />
            {item.label}
          </button>
        );
      })}
      <div className="mt-auto rounded-lg border border-ink/10 bg-white p-3 text-xs text-foreground/60">
        {isDirty ? "Unsaved changes" : "All changes saved"}
      </div>
    </nav>
  );

  return (
    <div className="min-h-screen bg-[#f7f6f0] text-foreground" dir="ltr">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 border-r border-ink/10 bg-paper/95 p-4 backdrop-blur lg:block">
        {nav}
      </aside>

      {navOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            type="button"
            className="absolute inset-0 bg-ink/35"
            onClick={() => setNavOpen(false)}
            aria-label="Close navigation"
          />
          <aside className="relative h-full w-72 border-r border-ink/10 bg-paper p-4 shadow-xl">
            <button
              type="button"
              onClick={() => setNavOpen(false)}
              className="absolute left-3 top-3 rounded-full border border-ink/10 bg-white p-2"
              aria-label="Close"
            >
              <X className="size-4" />
            </button>
            {nav}
          </aside>
        </div>
      )}

      <main className="lg:pl-64">
        <header className="sticky top-0 z-20 border-b border-ink/10 bg-[#f7f6f0]/90 px-4 py-3 backdrop-blur">
          <div className="mx-auto flex max-w-7xl items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={() => setNavOpen(true)}
                className="border border-ink/20 bg-white lg:hidden"
                aria-label="Open navigation"
              >
                <Menu className="size-4" />
              </Button>
              <div>
                <h1 className="text-xl font-bold">{navItems.find((item) => item.id === section)?.label}</h1>
                <p className="hidden text-xs text-foreground/50 sm:block">
                  Active tasks stay visible. Archived tasks keep their full log.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={onRefreshAdminQueue}
                className="hidden border border-ink/20 bg-white sm:inline-flex"
              >
                <RefreshCw data-icon="inline-start" />
                Refresh
              </Button>
              <Button type="button" onClick={onSaveToGithub} disabled={isSaving}>
                <Save data-icon="inline-start" />
                {isSaving ? "Saving" : "Save"}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={onLogout}
                className="border border-ink/20 bg-white"
              >
                <LogOut className="size-4" />
              </Button>
            </div>
          </div>
          {(saveStatus || queueStatus) && (
            <p className="mx-auto mt-2 max-w-7xl text-xs font-bold text-foreground/55">
              {saveStatus || queueStatus}
            </p>
          )}
        </header>

        <div className="mx-auto grid max-w-7xl gap-5 px-4 py-5 pb-24">
          {section === "repo-updates" && (
            <section className="grid gap-5">
              <div className="rounded-xl border border-sky-200 bg-sky-50 p-4 shadow-sm">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h2 className="text-2xl font-bold">Profile requests</h2>
                    <p className="mt-1 text-sm text-sky-900/70">
                      Members can request a nickname, GitHub repo, or Drive link change. Approve applies it; reject leaves the official profile unchanged.
                    </p>
                  </div>
                  <span className="rounded-full border border-sky-300 bg-white px-3 py-1 text-sm font-bold text-sky-900">
                    {pendingProfileRequests.length} pending
                  </span>
                </div>
                <div className="mt-4 grid gap-3">
                  {pendingProfileRequests.length === 0 ? (
                    <p className="rounded-lg border border-dashed border-sky-300 bg-white p-4 text-sm text-foreground/60">
                      No profile changes are waiting for approval.
                    </p>
                  ) : (
                    pendingProfileRequests.map((request) => {
                      const member = data.members.find((item) => item.id === request.memberId);
                      return (
                        <div key={request.id} className="rounded-lg border border-sky-200 bg-white p-3">
                          <div className="flex flex-wrap items-start justify-between gap-3">
                            <div>
                              <strong>{member?.name ?? request.memberName}</strong>
                              <div className="mt-1 text-xs font-bold text-foreground/50">
                                Requested {formatDateTime(request.createdAt)}
                              </div>
                              <div className="mt-2 grid gap-1 text-sm text-foreground/75">
                                {request.nickname && (
                                  <span>
                                    Nickname: <strong>{request.nickname}</strong>
                                  </span>
                                )}
                                {request.repoUrl !== undefined && (
                                  <span className="break-all">
                                    Repo: <strong>{request.repoUrl || "Remove saved repo"}</strong>
                                  </span>
                                )}
                                {request.driveUrl !== undefined && (
                                  <span className="break-all">
                                    Drive: <strong>{request.driveUrl || "Remove saved Drive"}</strong>
                                  </span>
                                )}
                                {request.previousRepoUrl && (
                                  <span className="break-all text-xs text-foreground/45">
                                    Previous repo: {request.previousRepoUrl}
                                  </span>
                                )}
                                {request.previousDriveUrl && (
                                  <span className="break-all text-xs text-foreground/45">
                                    Previous Drive: {request.previousDriveUrl}
                                  </span>
                                )}
                              </div>
                            </div>
                            <div className="flex flex-wrap gap-2">
                              {request.repoUrl && (
                                <Button type="button" size="sm" onClick={() => window.open(request.repoUrl, "_blank", "noopener,noreferrer")}>
                                  <ExternalLink data-icon="inline-start" />
                                  Open new repo
                                </Button>
                              )}
                              {request.driveUrl && (
                                <Button type="button" size="sm" onClick={() => window.open(request.driveUrl, "_blank", "noopener,noreferrer")}>
                                  <FolderOpen data-icon="inline-start" />
                                  Open new Drive
                                </Button>
                              )}
                              <Button type="button" size="sm" onClick={() => onReviewProfileRequest(request.id, "approved")}>
                                <Check data-icon="inline-start" />
                                Approve
                              </Button>
                              <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                onClick={() => onReviewProfileRequest(request.id, "rejected")}
                                className="border border-ink/20 bg-white"
                              >
                                Reject
                              </Button>
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              <div className="rounded-xl border border-yellow-200 bg-yellow-50 p-4 shadow-sm">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h2 className="text-2xl font-bold">Updates need attention</h2>
                    <p className="mt-1 text-sm text-yellow-900/70">
                      These are progress notes, GitHub requests, Drive requests, or submissions that need admin attention.
                    </p>
                  </div>
                  <span className="rounded-full border border-yellow-300 bg-white px-3 py-1 text-sm font-bold text-yellow-900">
                    {unseenUpdates.length} unseen
                  </span>
                </div>
                <div className="mt-4 grid gap-3">
                  {unseenUpdates.length === 0 ? (
                    <p className="rounded-lg border border-dashed border-yellow-300 bg-white p-4 text-sm text-foreground/60">
                      No updates are waiting. The admin flow will open reviews or tasks next.
                    </p>
                  ) : (
                    unseenUpdates.map((update) => {
                      const member = data.members.find((item) => item.id === update.memberId);
                      const task = update.taskId
                        ? data.tasks.find((item) => item.id === update.taskId)
                        : undefined;
                      return (
                        <div key={update.id} className="rounded-lg border border-yellow-200 bg-white p-3">
                          <div className="flex flex-wrap items-start justify-between gap-3">
                            <div>
                              {update.taskId ? (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setSelectedTaskId(update.taskId ?? "");
                                    setSection("reviews");
                                  }}
                                  className="text-left text-lg font-bold underline decoration-yellow-400 decoration-4 underline-offset-4"
                                >
                                  {member?.name ?? update.memberId}
                                </button>
                              ) : (
                                <strong>{member?.name ?? update.memberId}</strong>
                              )}
                              <div className="mt-1 flex flex-wrap gap-2 text-xs font-bold text-foreground/50">
                                <span>{update.source ?? "manual"}</span>
                                {task && <span>Task: {task.title}</span>}
                                <span>{formatDateTime(update.createdAt)}</span>
                              </div>
                              {update.excerpt && (
                                <p className="mt-2 max-w-3xl text-sm leading-6 text-foreground/70">{update.excerpt}</p>
                              )}
                            </div>
                            <div className="flex flex-wrap gap-2">
                              {member?.repoUrl && update.source !== "drive" && (
                                <Button type="button" size="sm" onClick={() => window.open(member.repoUrl, "_blank", "noopener,noreferrer")}>
                                  <ExternalLink data-icon="inline-start" />
                                  Open repo
                                </Button>
                              )}
                              {member?.driveUrl && update.source === "drive" && (
                                <Button type="button" size="sm" onClick={() => window.open(member.driveUrl, "_blank", "noopener,noreferrer")}>
                                  <FolderOpen data-icon="inline-start" />
                                  Open Drive
                                </Button>
                              )}
                              <Button type="button" size="sm" variant="outline" onClick={() => onMarkRepoUpdateSeen(update.id)} className="border border-ink/20 bg-white">
                                Done
                              </Button>
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              <div className="rounded-xl border border-ink/10 bg-white p-4 shadow-sm">
                <h2 className="text-xl font-bold">Team links directory</h2>
                <p className="mt-1 text-sm text-foreground/55">
                  Open member repositories and Drive folders quickly while checking updates.
                </p>
                <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                  {data.members.map((member) => (
                    <div key={member.id} className="flex items-center justify-between gap-3 rounded-lg border border-ink/10 bg-paper p-3">
                      <strong className="truncate">{member.name}</strong>
                      <div className="flex shrink-0 gap-2">
                        {member.repoUrl ? (
                          <Button type="button" size="sm" onClick={() => window.open(member.repoUrl, "_blank", "noopener,noreferrer")}>
                            Repo
                          </Button>
                        ) : (
                          <span className="rounded-full border border-zinc-200 bg-zinc-50 px-2 py-1 text-xs font-bold text-zinc-500">
                            No repo
                          </span>
                        )}
                        {member.driveUrl ? (
                          <Button type="button" size="sm" onClick={() => window.open(member.driveUrl, "_blank", "noopener,noreferrer")}>
                            Drive
                          </Button>
                        ) : (
                          <span className="rounded-full border border-zinc-200 bg-zinc-50 px-2 py-1 text-xs font-bold text-zinc-500">
                            No Drive
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </section>
          )}

          {section === "reviews" && (
            <section className="grid gap-5 xl:grid-cols-[360px_1fr]">
              <div className="rounded-xl border border-yellow-200 bg-white p-4 shadow-sm">
                <h2 className="text-xl font-bold">Pending reviews</h2>
                <p className="mt-1 text-sm text-foreground/55">
                  Final submissions waiting for approve, override, or reject.
                </p>
                <div className="mt-4 grid gap-2">
                  {pendingSubmissions.length === 0 ? (
                    <p className="rounded-lg border border-dashed border-ink/20 bg-paper p-4 text-sm text-foreground/55">
                      No pending submissions.
                    </p>
                  ) : (
                    pendingSubmissions.map((item) => {
                      const task = data.tasks.find((candidate) => candidate.id === item.taskId);
                      return (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => setSelectedTaskId(item.taskId)}
                          className={`rounded-lg border p-3 text-start transition hover:border-yellow-300 ${
                            selectedTask?.id === item.taskId ? "border-yellow-400 bg-yellow-50" : "border-ink/10 bg-paper"
                          }`}
                        >
                          <strong>{item.memberName}</strong>
                          <p className="mt-1 text-sm font-bold text-foreground/65">{task?.title ?? item.taskId}</p>
                          <p className="mt-1 text-xs text-foreground/50">{formatDateTime(item.submittedAt)}</p>
                        </button>
                      );
                    })
                  )}
                </div>
              </div>
              {renderTaskDetail(
                selectedTask ??
                  data.tasks.find((task) =>
                    pendingSubmissions.some((item) => item.taskId === task.id),
                  ),
              )}
            </section>
          )}

          {section === "tasks" && (
            <section className="grid gap-5 xl:grid-cols-[380px_1fr]">
              <div className="grid gap-4">
                <div className="rounded-xl border border-sky-100 bg-white p-4 shadow-sm">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h2 className="text-xl font-bold">Create task</h2>
                      <p className="mt-1 text-sm text-foreground/55">
                        Choose who gets the task, then set scoring and deadline rules.
                      </p>
                    </div>
                    <span className="rounded-full border border-sky-200 bg-sky-50 px-3 py-1 text-xs font-bold text-sky-700">
                      Guided
                    </span>
                  </div>
                  <div className="mt-4 grid gap-3">
                    <Input value={taskTitle} onChange={(event) => setTaskTitle(event.target.value)} placeholder="Task title" className="h-11 border border-ink/20 bg-white" />
                    <Textarea value={taskQuestion} onChange={(event) => setTaskQuestion(event.target.value)} placeholder="Question or instructions" className="min-h-24 border border-ink/20 bg-white" />
                    <div className="grid gap-2 sm:grid-cols-2">
                      <label className="grid gap-1 text-xs font-bold text-foreground/65">
                        Base points
                        <Input type="number" min={1} value={taskPoints} onChange={(event) => setTaskPoints(Number(event.target.value))} placeholder="Points" className="h-11 border border-ink/20 bg-white" />
                        <span className="font-normal text-foreground/50">Admin can still award bonus when approving.</span>
                      </label>
                      <div className="grid gap-2 rounded-md border border-ink/20 bg-white p-2 text-sm">
                        <label className="flex h-8 items-center gap-2 font-bold">
                          <input
                            type="checkbox"
                            checked={taskScope === "all"}
                            onChange={(event) => {
                              setTaskScope(event.target.checked ? "all" : "member");
                              if (event.target.checked) setTaskMemberIds([]);
                            }}
                          />
                          All team
                        </label>
                        <div className="max-h-32 overflow-auto border-t border-ink/10 pt-2">
                          {data.members.map((member) => (
                            <label key={member.id} className="flex h-8 items-center gap-2">
                              <input
                                type="checkbox"
                                disabled={taskScope === "all"}
                                checked={taskScope === "all" || taskMemberIds.includes(member.id)}
                                onChange={() => toggleTaskMemberDraft(member.id)}
                              />
                              <span className="truncate">{member.name}</span>
                            </label>
                          ))}
                        </div>
                      </div>
                    </div>
                    <div className="grid gap-2">
                      <DateTimeField
                        label="Start"
                        value={taskStartAt}
                        onChange={setTaskStartAt}
                        help="Start controls when the task opens."
                      />
                      <DateTimeField
                        label="Deadline"
                        value={taskDeadlineAt}
                        onChange={setTaskDeadlineAt}
                        help="After deadline: default half score. After double time: locked unless overridden."
                        tone="deadline"
                      />
                    </div>
                    <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-3 text-xs leading-5 text-yellow-900">
                      Deadline rule: late submissions default to half score. Submissions after double the task window require override approval.
                    </div>
                    <Button
                      type="button"
                      data-testid="admin-add-task"
                      onClick={submitTask}
                      className={actionButtonClass(
                        "h-11 bg-sky-500 text-white hover:bg-sky-600",
                        actionFeedback["admin:add-task"],
                      )}
                    >
                      <Plus data-icon="inline-start" />
                      Add task
                    </Button>
                    <ActionFeedbackLine feedback={actionFeedback["admin:add-task"]} />
                  </div>
                </div>
                <div className="rounded-xl border border-ink/10 bg-white p-4 shadow-sm">
                  <h2 className="mb-3 text-xl font-bold">Active tasks</h2>
                  {renderTaskRows(activeTasks)}
                </div>
              </div>
              {renderTaskDetail(selectedTask && isActiveTask(selectedTask) ? selectedTask : activeTasks[0])}
            </section>
          )}

          {section === "meetings" && (
            <section className="grid gap-5 xl:grid-cols-[380px_1fr]">
              <div className="grid gap-4">
                <div className="rounded-xl border border-emerald-100 bg-white p-4 shadow-sm">
                  <h2 className="text-xl font-bold">Create meeting</h2>
                  <p className="mt-1 text-sm text-foreground/55">
                    Attendance points are calculated from check-in time and lateness.
                  </p>
                  <div className="mt-4 grid gap-3">
                    <Input
                      value={meetingTitle}
                      onChange={(event) => setMeetingTitle(event.target.value)}
                      placeholder="Meeting title"
                      className="h-11 border border-ink/20 bg-white"
                    />
                    <DateTimeField
                      label="Start time"
                      value={meetingStartsAt}
                      onChange={setMeetingStartsAt}
                      help="Start time is used to calculate late minutes."
                    />
                    <div className="grid gap-2 sm:grid-cols-2">
                      <Input
                        type="number"
                        min={1}
                        value={meetingDuration}
                        onChange={(event) => setMeetingDuration(Number(event.target.value))}
                        placeholder="Duration minutes"
                        className="h-11 border border-ink/20 bg-white"
                      />
                      <Input
                        type="number"
                        min={0.1}
                        step={0.1}
                        value={meetingPoints}
                        onChange={(event) => setMeetingPoints(Number(event.target.value))}
                        placeholder="Points"
                        className="h-11 border border-ink/20 bg-white"
                      />
                    </div>
                    <Button
                      type="button"
                      data-testid="admin-add-meeting"
                      onClick={submitMeeting}
                      className={actionButtonClass(
                        "h-11 bg-emerald-600 text-white hover:bg-emerald-700",
                        actionFeedback["admin:add-meeting"],
                      )}
                    >
                      <Plus data-icon="inline-start" />
                      Add meeting
                    </Button>
                    <ActionFeedbackLine feedback={actionFeedback["admin:add-meeting"]} />
                  </div>
                </div>
                <div className="rounded-xl border border-ink/10 bg-white p-4 shadow-sm">
                  <h2 className="mb-3 text-xl font-bold">Active meetings</h2>
                  {renderMeetingRows(activeMeetings)}
                </div>
                <div className="rounded-xl border border-ink/10 bg-white p-4 shadow-sm">
                  <h2 className="mb-3 text-xl font-bold">Archived meetings</h2>
                  {renderMeetingRows(archivedMeetings)}
                </div>
              </div>
              {renderMeetingDetail(selectedMeeting)}
            </section>
          )}

          {section === "members" && (
            <section className="grid gap-4">
              {data.members.map((member) => {
                const memberScore = stats.allMemberStats.find((item) => item.member.id === member.id);
                return (
                  <details key={member.id} className="rounded-xl border border-ink/10 bg-white p-4 shadow-sm">
                    <summary className="flex cursor-pointer list-none flex-wrap items-center justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <strong className="text-xl">{member.name}</strong>
                          <span className={`rounded-full border px-2 py-1 text-xs font-bold ${member.hidden ? "border-zinc-300 bg-zinc-100 text-zinc-600" : "border-emerald-200 bg-emerald-50 text-emerald-800"}`}>
                            {member.hidden ? "Hidden" : "Visible"}
                          </span>
                        </div>
                        <div className="mt-1 flex flex-wrap gap-2 text-xs font-bold text-foreground/55">
                          <span>Submitted {memberScore?.submitted ?? 0}</span>
                          <span>Approved {memberScore?.approved ?? 0}</span>
                          <span>Rejected {memberScore?.rejected ?? 0}</span>
                          <span>Points {memberScore?.points ?? 0}</span>
                        </div>
                      </div>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={(event) => {
                          event.preventDefault();
                          onUpdateMember(member.id, { hidden: !member.hidden });
                        }}
                        className="border border-ink/20 bg-paper"
                      >
                        {member.hidden ? <Eye data-icon="inline-start" /> : <EyeOff data-icon="inline-start" />}
                        {member.hidden ? "Show" : "Hide"}
                      </Button>
                    </summary>
                    <div className="mt-4 grid gap-4 xl:grid-cols-[1fr_1fr]">
                      <div className="grid gap-3">
                        <div className="rounded-lg border border-sky-100 bg-sky-50 p-3">
                          <div className="font-bold">Individual assignment</div>
                          <p className="mt-1 text-sm text-foreground/55">
                            Create a task for this member only. Nobody else will see it.
                          </p>
                          <Button
                            type="button"
                            size="sm"
                            onClick={() => prepareTaskForMember(member)}
                            className="mt-3 bg-sky-500 text-white hover:bg-sky-600"
                          >
                            <Plus data-icon="inline-start" />
                            Create task for {member.name}
                          </Button>
                        </div>
                        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                          {([
                            ["Old tasks", "baseCompleted", "bg-white"],
                            ["Old approved", "baseApproved", "bg-emerald-50"],
                            ["Old rejected", "baseRejected", "bg-red-50"],
                            ["Old points", "basePoints", "bg-yellow-50"],
                          ] as const).map(([label, field, bg]) => (
                            <label key={field} className="grid gap-1 text-xs font-bold">
                              {label}
                              <Input
                                type="number"
                                min={0}
                                value={member[field] ?? 0}
                                onChange={(event) => onUpdateMember(member.id, { [field]: sanitizeNumber(event.target.value) })}
                                className={`border border-ink/20 text-center ${bg}`}
                              />
                            </label>
                          ))}
                        </div>
                        <Input value={member.publicFlag ?? ""} onChange={(event) => onUpdateMember(member.id, { publicFlag: event.target.value })} placeholder="Public flag" className="border border-ink/20 bg-red-50" />
                        <Input value={member.adminNote ?? ""} onChange={(event) => onUpdateMember(member.id, { adminNote: event.target.value })} placeholder="Private admin note" className="border border-ink/20 bg-paper" />
                        <Input value={member.repoUrl ?? ""} onChange={(event) => onUpdateMember(member.id, { repoUrl: event.target.value })} placeholder="Repo URL" dir="ltr" className="border border-ink/20 bg-paper text-left" />
                        <Input value={member.driveUrl ?? ""} onChange={(event) => onUpdateMember(member.id, { driveUrl: event.target.value })} placeholder="Drive URL" dir="ltr" className="border border-ink/20 bg-paper text-left" />
                        <Input value={member.aliases.join(", ")} onChange={(event) => onUpdateMember(member.id, { aliases: uniqueText(event.target.value.split(",")) })} placeholder="Aliases" className="border border-ink/20 bg-paper" />
                      </div>
                      <div>
                        <h3 className="mb-3 text-lg font-bold">Member log</h3>
                        {renderMemberLog(member)}
                      </div>
                    </div>
                  </details>
                );
              })}
            </section>
          )}

          {section === "logs" && (
            <section className="grid gap-4">
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-ink/10 bg-white p-3 shadow-sm">
                <div className="flex rounded-lg border border-ink/10 bg-paper p-1">
                  <button type="button" onClick={() => setLogMode("task")} className={`rounded-md px-3 py-2 text-sm font-bold ${logMode === "task" ? "bg-ink text-white" : ""}`}>By task</button>
                  <button type="button" onClick={() => setLogMode("member")} className={`rounded-md px-3 py-2 text-sm font-bold ${logMode === "member" ? "bg-ink text-white" : ""}`}>By member</button>
                </div>
                <div className="flex items-center gap-2 text-sm text-foreground/55">
                  <Search className="size-4" />
                  Pick a task or member to inspect the full trail.
                </div>
              </div>
              {logMode === "task" ? (
                <div className="grid gap-5 xl:grid-cols-[360px_1fr]">
                  <div className="rounded-xl border border-ink/10 bg-white p-4 shadow-sm">{renderTaskRows(data.tasks)}</div>
                  {renderTaskDetail(selectedTask)}
                </div>
              ) : (
                <div className="grid gap-5 xl:grid-cols-[300px_1fr]">
                  <div className="grid gap-2 rounded-xl border border-ink/10 bg-white p-4 shadow-sm">
                    {data.members.map((member) => (
                      <button
                        key={member.id}
                        type="button"
                        onClick={() => setSelectedMemberId(member.id)}
                        className={`rounded-lg border p-3 text-start font-bold ${selectedMember?.id === member.id ? "border-ink bg-paper" : "border-ink/10 bg-white"}`}
                      >
                        {member.name}
                      </button>
                    ))}
                  </div>
                  {selectedMember && (
                    <section className="rounded-xl border border-ink/10 bg-white p-4 shadow-sm">
                      <h2 className="mb-3 text-2xl font-bold">{selectedMember.name}</h2>
                      {renderMemberLog(selectedMember)}
                    </section>
                  )}
                </div>
              )}
            </section>
          )}

          {section === "archive" && (
            <section className="grid gap-5 xl:grid-cols-[360px_1fr]">
              <div className="rounded-xl border border-ink/10 bg-white p-4 shadow-sm">
                <label className="mb-3 flex items-center gap-2 rounded-lg border border-ink/10 bg-paper px-3 py-2">
                  <Search className="size-4 text-foreground/40" />
                  <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search archive" className="w-full bg-transparent text-sm outline-none" />
                </label>
                {renderTaskRows(visibleArchive)}
              </div>
              {renderTaskDetail(selectedTask && taskStatus(selectedTask) === "archived" ? selectedTask : visibleArchive[0])}
            </section>
          )}

          {section === "settings" && (
            <section className="grid gap-5 lg:grid-cols-2">
              <div className="rounded-xl border border-ink/10 bg-white p-4 shadow-sm">
                <h2 className="text-xl font-bold">Access</h2>
                <div className="mt-3 grid gap-3">
                  <Input value={data.settings?.adminPassword ?? DEFAULT_ADMIN_PASSWORD} onChange={(event) => onUpdateSettings({ adminPassword: event.target.value })} placeholder="Admin password" className="border border-ink/20 bg-paper" />
                  <Input value={data.settings?.statsPassword ?? DEFAULT_STATS_PASSWORD} onChange={(event) => onUpdateSettings({ statsPassword: event.target.value })} placeholder="Stats password" className="border border-ink/20 bg-paper" />
                  <div className="rounded-lg border border-ink/10 bg-paper p-3 text-sm font-bold" dir="ltr">API: {HIVO_API_URL || "not configured"}</div>
                </div>
              </div>
              <div className="rounded-xl border border-ink/10 bg-white p-4 shadow-sm">
                <h2 className="text-xl font-bold">Repo updates</h2>
                <div className="mt-3 grid gap-2">
                  {unseenUpdates.length === 0 ? (
                    <p className="text-sm text-foreground/55">No unseen repo updates.</p>
                  ) : (
                    unseenUpdates.map((update) => {
                      const member = data.members.find((item) => item.id === update.memberId);
                      return (
                        <div key={update.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-ink/10 bg-paper p-3">
                          <div>
                            <strong>{member?.name ?? update.memberId}</strong>
                            {update.source && (
                              <span className="ms-2 rounded-full border border-ink/10 bg-yellow-50 px-2 py-1 text-xs font-bold text-yellow-800">
                                {update.source}
                              </span>
                            )}
                            <p className="text-xs text-foreground/50">{formatDateTime(update.createdAt)}</p>
                            {update.excerpt && (
                              <p className="mt-1 max-w-md text-sm text-foreground/65">{update.excerpt}</p>
                            )}
                          </div>
                          <div className="flex gap-2">
                            {member?.repoUrl && update.source !== "drive" && (
                              <Button type="button" size="sm" onClick={() => window.open(member.repoUrl, "_blank", "noopener,noreferrer")}>
                                <ExternalLink data-icon="inline-start" />
                                Repo
                              </Button>
                            )}
                            {member?.driveUrl && update.source === "drive" && (
                              <Button type="button" size="sm" onClick={() => window.open(member.driveUrl, "_blank", "noopener,noreferrer")}>
                                <FolderOpen data-icon="inline-start" />
                                Drive
                              </Button>
                            )}
                            <Button type="button" size="sm" variant="outline" onClick={() => onMarkRepoUpdateSeen(update.id)} className="border border-ink/20 bg-white">Done</Button>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
              <div className="rounded-xl border border-ink/10 bg-white p-4 shadow-sm lg:col-span-2">
                <h2 className="text-xl font-bold">Queued progress</h2>
                {queuedProgress.length === 0 ? (
                  <p className="mt-2 text-sm text-foreground/55">No queued progress updates.</p>
                ) : (
                  <div className="mt-3 grid gap-2">
                    {queuedProgress.map((item) => (
                      <div key={item.id} className="rounded-lg border border-ink/10 bg-yellow-50 p-3">
                        <strong>{item.memberName}</strong>
                        <p className="text-sm">{item.note}</p>
                        <div className="mt-2 flex gap-2">
                          <Button type="button" size="sm" onClick={() => onSaveQueuedProgress(item)}>Save</Button>
                          <Button type="button" size="sm" variant="outline" onClick={() => onDismissQueuedProgress(item.id)} className="border border-ink/20 bg-white">Dismiss</Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </section>
          )}
        </div>
      </main>

      {tokenDialogOpen && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-ink/35 px-4">
          <section className="w-full max-w-md rounded-xl border border-ink/10 bg-white p-5 shadow-xl">
            <h2 className="text-xl font-bold">GitHub token required</h2>
            <p className="mt-1 text-sm text-foreground/55">Paste the token once to save changes.</p>
            <Input
              value={tokenDraft}
              onChange={(event) => onTokenDraftChange(event.target.value)}
              placeholder="ghp_..."
              className="mt-4 border border-ink/20 bg-paper"
              dir="ltr"
            />
            <div className="mt-4 flex gap-2">
              <Button type="button" onClick={onConfirmTokenAndSave}>Save</Button>
              <Button type="button" variant="outline" onClick={onCloseTokenDialog} className="border border-ink/20 bg-white">Cancel</Button>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}

function LegacyAdminView({
  data,
  stats,
  saveStatus,
  isDirty,
  isSaving,
  adminQueue,
  queueStatus,
  tokenDialogOpen,
  tokenDraft,
  onLogout,
  onAddTask,
  onRemoveTask,
  onManualApprove,
  onApproveQueuedSubmission,
  onRejectQueuedSubmission,
  onSaveQueuedProgress,
  onDismissQueuedProgress,
  onAddProgressUpdate,
  onReviewAnswer,
  onUpdateMember,
  onUpdateSettings,
  onMarkRepoUpdateSeen,
  onRefreshAdminQueue,
  onTokenDraftChange,
  onCloseTokenDialog,
  onConfirmTokenAndSave,
  onSaveToGithub,
}: {
  data: StudioData;
  stats: ReturnType<typeof createStats>;
  saveStatus: string;
  isDirty: boolean;
  isSaving: boolean;
  adminQueue: AdminQueue;
  queueStatus: string;
  tokenDialogOpen: boolean;
  tokenDraft: string;
  onLogout: () => void;
  onAddTask: (task: Omit<StudioTask, "id" | "createdAt">) => void;
  onRemoveTask: (taskId: string) => void;
  onManualApprove: (task: StudioTask, memberId: string) => void;
  onApproveQueuedSubmission: (item: QueuedSubmission) => void;
  onRejectQueuedSubmission: (item: QueuedSubmission) => void;
  onSaveQueuedProgress: (item: QueuedProgressUpdate) => void;
  onDismissQueuedProgress: (id: string) => void;
  onAddProgressUpdate: (task: StudioTask, memberId: string, note: string) => void;
  onReviewAnswer: (
    taskId: string,
    memberId: string,
    status: "approved" | "rejected",
    note?: string,
    awardedPoints?: number,
    overrideLocked?: boolean,
  ) => void;
  onUpdateMember: (memberId: string, updates: Partial<Member>) => void;
  onUpdateSettings: (settings: Partial<StudioSettings>) => void;
  onMarkRepoUpdateSeen: (updateId: string) => void;
  onRefreshAdminQueue: () => void;
  onTokenDraftChange: (value: string) => void;
  onCloseTokenDialog: () => void;
  onConfirmTokenAndSave: () => void;
  onSaveToGithub: () => void;
}) {
  const [taskTitle, setTaskTitle] = useState("");
  const [taskQuestion, setTaskQuestion] = useState("");
  const [taskPoints, setTaskPoints] = useState(1);
  const [taskScope, setTaskScope] = useState<"all" | "member">("all");
  const [taskMemberId, setTaskMemberId] = useState("");
  const [manualApproveMembers, setManualApproveMembers] = useState<Record<string, string>>({});
  const [progressMembers, setProgressMembers] = useState<Record<string, string>>({});
  const [progressNotes, setProgressNotes] = useState<Record<string, string>>({});
  const safeAdminQueue: AdminQueue = {
    submissions: data.tasks.flatMap((task) =>
      Object.values(data.responses[task.id] ?? {})
        .filter((response) => response.status === "submitted")
        .map((response) => ({
          id: `${task.id}:${response.memberId}`,
          taskId: task.id,
          memberId: response.memberId,
          memberName: response.memberName,
          answer: response.answer,
          submittedAt: response.submittedAt,
        })),
    ),
    progressUpdates: [],
  };
  const unseenUpdates = data.repoUpdates?.filter((update) => !update.seen) ?? [];

  function submitTask() {
    if (!taskTitle.trim() || !taskQuestion.trim()) return;
    if (taskScope === "member" && !taskMemberId) return;

    onAddTask({
      title: taskTitle.trim(),
      question: taskQuestion.trim(),
      points: Math.max(1, Number.isFinite(taskPoints) ? taskPoints : 1),
      scope: taskScope,
      memberId: taskScope === "member" ? taskMemberId : undefined,
    });
    setTaskTitle("");
    setTaskQuestion("");
    setTaskPoints(1);
  }

  return (
    <div className="min-h-screen text-foreground" dir="rtl">
      <div className="mx-auto max-w-6xl px-5 pb-32 pt-10 md:pb-36 md:pt-14">
        <header className="mb-8 text-center">
          <Logo />
          <h1 className="mb-2 mt-4 text-5xl font-bold leading-tight">
            <span className="highlight-yellow">Hivo Studio Admin</span>
          </h1>
          <p className="text-lg text-foreground/75">
            إدارة التاسكات، متابعة الفريق، وحفظ التحديثات في GitHub.
          </p>
          <Button
            type="button"
            variant="outline"
            onClick={onLogout}
            className="mt-4 border-[2px] border-ink bg-paper doodle-shadow-sm"
          >
            <LogOut data-icon="inline-start" />
            تغيير الدخول
          </Button>
        </header>

        <section className="mb-7 grid gap-3 md:grid-cols-4">
          {[
            ["التاسكات", data.tasks.length],
            ["إجابات مستنية", stats.pendingTotal],
            ["Repo updates", unseenUpdates.length],
            ["نقاط ظاهرة", stats.pointsTotal],
          ].map(([label, value]) => (
            <div
              key={label}
              className="border-[2.5px] border-ink bg-card p-4 text-center doodle-shadow"
              style={{ borderRadius: "16px 20px 14px 18px / 18px 14px 20px 16px" }}
            >
              <div className="text-3xl font-bold">{value}</div>
              <div className="text-sm text-foreground/65">{label}</div>
            </div>
          ))}
        </section>

        <section
          className="mb-7 border-[2.5px] border-ink bg-card p-5 doodle-shadow"
          style={{ borderRadius: "20px 26px 18px 24px / 24px 18px 26px 20px" }}
        >
          <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
            <SectionTitle
              title="مراجعات الموقع"
              help="تسليمات ومتابعات وصلت من أعضاء التيم من الويبسايت. القبول فقط يحسب نقاط."
            />
            <Button
              type="button"
              variant="outline"
              onClick={onRefreshAdminQueue}
              className="border-[2px] border-ink bg-paper doodle-shadow-sm"
            >
              <RefreshCw data-icon="inline-start" />
              تحديث queue
            </Button>
          </div>
          {queueStatus && (
            <p className="mb-3 text-sm font-bold text-foreground/65">{queueStatus}</p>
          )}

          <div className="grid gap-4 lg:grid-cols-2">
            <div className="border-[2px] border-ink bg-paper p-3">
              <h3 className="mb-3 text-xl font-bold">تسليمات مستنية مراجعة</h3>
              {safeAdminQueue.submissions.length === 0 ? (
                <p className="text-sm text-foreground/60">مفيش تسليمات من الموقع حاليًا.</p>
              ) : (
                <div className="grid gap-3">
                  {safeAdminQueue.submissions.map((item) => {
                    const task = data.tasks.find((candidate) => candidate.id === item.taskId);
                    return (
                      <div key={item.id} className="border-[2px] border-ink bg-card p-3">
                        <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                          <strong>{item.memberName}</strong>
                          <span className="text-xs text-foreground/55">
                            {new Date(item.submittedAt).toLocaleString()}
                          </span>
                        </div>
                        <p className="text-sm font-bold text-foreground/65">
                          {task?.title ?? item.taskId}
                        </p>
                        <p className="mt-2 whitespace-pre-wrap leading-7">{item.answer}</p>
                        <div className="mt-3 flex flex-wrap gap-2">
                          <Button
                            type="button"
                            onClick={() => onApproveQueuedSubmission(item)}
                            className="border-[2px] border-ink doodle-shadow-sm"
                          >
                            <Check data-icon="inline-start" />
                            قبول وحساب
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => onRejectQueuedSubmission(item)}
                            className="border-[2px] border-ink bg-paper doodle-shadow-sm"
                          >
                            <RotateCcw data-icon="inline-start" />
                            رفض
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="border-[2px] border-ink bg-yellow-50 p-3">
              <h3 className="mb-3 text-xl font-bold">متابعات بدون درجات</h3>
              {safeAdminQueue.progressUpdates.length === 0 ? (
                <p className="text-sm text-foreground/60">مفيش متابعات من الموقع حاليًا.</p>
              ) : (
                <div className="grid gap-3">
                  {safeAdminQueue.progressUpdates.map((item) => {
                    const task = data.tasks.find((candidate) => candidate.id === item.taskId);
                    return (
                      <div key={item.id} className="border-[2px] border-ink bg-card p-3">
                        <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                          <strong>{item.memberName}</strong>
                          <span className="text-xs text-foreground/55">
                            {new Date(item.createdAt).toLocaleString()}
                          </span>
                        </div>
                        <p className="text-sm font-bold text-foreground/65">
                          {task?.title ?? item.taskId}
                        </p>
                        <p className="mt-2 whitespace-pre-wrap leading-7">{item.note}</p>
                        <div className="mt-3 flex flex-wrap gap-2">
                          <Button
                            type="button"
                            onClick={() => onSaveQueuedProgress(item)}
                            className="border-[2px] border-ink bg-yellow-100 doodle-shadow-sm"
                          >
                            <Check data-icon="inline-start" />
                            حفظ كمتابعة
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => onDismissQueuedProgress(item.id)}
                            className="border-[2px] border-ink bg-paper doodle-shadow-sm"
                          >
                            تجاهل
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </section>

        <section
          className="mb-7 border-[2.5px] border-ink bg-card p-5 doodle-shadow"
          style={{ borderRadius: "20px 26px 18px 24px / 24px 18px 26px 20px" }}
        >
          <SectionTitle
            title="Repo Links"
            help="أزرار مباشرة لفتح ريبوهات الأعضاء. لو العضو ملوش لينك محفوظ هتلاقيها واضحة هنا."
          />
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {data.members.map((member) => (
              <div
                key={member.id}
                className="flex items-center justify-between gap-2 border-[2px] border-ink bg-paper p-3"
              >
                <strong className="truncate">{member.name}</strong>
                {member.repoUrl ? (
                  <Button
                    type="button"
                    onClick={() => window.open(member.repoUrl, "_blank", "noopener,noreferrer")}
                    className="shrink-0 border-[2px] border-ink doodle-shadow-sm"
                  >
                    <ExternalLink data-icon="inline-start" />
                    فتح الريبو
                  </Button>
                ) : (
                  <span className="shrink-0 rounded-full border-[2px] border-ink bg-red-50 px-3 py-1 text-xs font-bold text-red-700">
                    لا يوجد ريبو
                  </span>
                )}
              </div>
            ))}
          </div>
        </section>

        <section
          className="mb-7 border-[2.5px] border-ink bg-card p-5 doodle-shadow"
          style={{ borderRadius: "20px 26px 18px 24px / 24px 18px 26px 20px" }}
        >
          <SectionTitle
            title="تنبيهات الريبو"
            help="أي عضو يضغط Update GitHub Repo يظهر هنا، والضغط على اسمه يفتح الريبو بتاعه."
          />
          {unseenUpdates.length === 0 ? (
            <p className="text-sm text-foreground/60">مفيش تحديثات ريبو جديدة.</p>
          ) : (
            <div className="flex flex-col gap-2">
              {unseenUpdates.map((update) => {
                const member = data.members.find((item) => item.id === update.memberId);
                return (
                  <div
                    key={update.id}
                    className="flex flex-wrap items-center justify-between gap-2 border-[2px] border-ink bg-paper p-3"
                  >
                    <div>
                      <strong>{member?.name ?? update.memberId}</strong>
                      <p className="text-xs text-foreground/60">
                        {new Date(update.createdAt).toLocaleString()}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {member?.repoUrl && (
                        <Button
                          type="button"
                          onClick={() =>
                            window.open(member.repoUrl, "_blank", "noopener,noreferrer")
                          }
                          className="border-[2px] border-ink doodle-shadow-sm"
                        >
                          <ExternalLink data-icon="inline-start" />
                          فتح الريبو
                        </Button>
                      )}
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => onMarkRepoUpdateSeen(update.id)}
                        className="border-[2px] border-ink bg-card"
                      >
                        Done
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        <section
          className="mb-7 border-[2.5px] border-ink bg-card p-5 doodle-shadow"
          style={{ borderRadius: "20px 26px 18px 24px / 24px 18px 26px 20px" }}
        >
          <SectionTitle
            title="إحصائيات التاسكات"
            help="متابعة سريعة: كام إجابة وصلت لكل تاسك من أصل المطلوب."
          />
          <div className="grid gap-2 md:grid-cols-2">
            {stats.taskMetrics.length === 0 ? (
              <p className="text-sm text-foreground/60">لسه مفيش تاسكات.</p>
            ) : (
              stats.taskMetrics.map((item) => (
                <div key={item.task.id} className="border-[2px] border-ink bg-paper p-3">
                  <div className="flex items-center justify-between gap-2">
                    <strong>{item.task.title}</strong>
                    <span className="rounded-full border-[2px] border-ink bg-card px-2 py-1 text-sm">
                      {item.received}/{item.expected}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-foreground/60">
                    pending {item.submitted} • accepted {item.approved} • rejected {item.rejected} •
                    progress {item.progressUpdates}
                  </p>
                </div>
              ))
            )}
          </div>
        </section>

        <section
          className="mb-7 border-[2.5px] border-ink bg-card p-5 doodle-shadow"
          style={{ borderRadius: "20px 26px 18px 24px / 24px 18px 26px 20px" }}
        >
          <SectionTitle
            title="إدارة التاسكات"
            help="نزّل سؤال عام للتيم كله أو خصصه لشخص واحد، وحدد نقاطه."
          />
          <div className="grid gap-3 md:grid-cols-[1fr_120px_1fr]">
            <Input
              value={taskTitle}
              onChange={(event) => setTaskTitle(event.target.value)}
              placeholder="عنوان التاسك"
              className="border-[2px] border-ink bg-paper"
            />
            <Input
              type="number"
              min={1}
              value={taskPoints}
              onChange={(event) => setTaskPoints(Number(event.target.value))}
              placeholder="Points"
              className="border-[2px] border-ink bg-paper"
            />
            <select
              value={taskScope === "all" ? "all" : taskMemberId}
              onChange={(event) => {
                if (event.target.value === "all") {
                  setTaskScope("all");
                  setTaskMemberId("");
                } else {
                  setTaskScope("member");
                  setTaskMemberId(event.target.value);
                }
              }}
              className="h-10 rounded-md border-[2px] border-ink bg-paper px-3 text-base"
            >
              <option value="all">تاسك عام لكل التيم</option>
              {data.members.map((member) => (
                <option key={member.id} value={member.id}>
                  تاسك لـ {member.name}
                </option>
              ))}
            </select>
          </div>
          <Textarea
            value={taskQuestion}
            onChange={(event) => setTaskQuestion(event.target.value)}
            placeholder="اكتب السؤال أو المشكلة اللي محتاج لها أفكار..."
            className="mt-3 min-h-24 border-[2px] border-ink bg-paper"
          />
          <Button
            type="button"
            onClick={submitTask}
            className="mt-3 border-[2px] border-ink doodle-shadow-sm"
          >
            <Plus data-icon="inline-start" />
            إضافة تاسك
          </Button>
        </section>

        <section className="mb-7 flex flex-col gap-4">
          {data.tasks.length === 0 ? (
            <div
              className="border-[2.5px] border-ink bg-card p-8 text-center doodle-shadow"
              style={{ borderRadius: "20px 26px 18px 24px / 24px 18px 26px 20px" }}
            >
              <p className="text-2xl font-bold">
                <span className="highlight-yellow">لسه مفيش تاسكات</span>
              </p>
            </div>
          ) : (
            data.tasks.map((task) => {
              const responses = Object.values(data.responses[task.id] ?? {});
              const selectedManualMember = manualApproveMembers[task.id] ?? "";
              const selectedProgressMember = progressMembers[task.id] ?? "";
              const progressNote = progressNotes[task.id] ?? "";
              const taskProgressUpdates = data.progressUpdates?.[task.id] ?? [];

              return (
                <article
                  key={task.id}
                  className="border-[2.5px] border-ink bg-card p-5 doodle-shadow"
                  style={{ borderRadius: "18px 22px 16px 24px / 22px 16px 24px 18px" }}
                >
                  <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <h3 className="text-2xl font-bold">{task.title}</h3>
                      <p className="text-sm text-foreground/60">
                        {task.scope === "all"
                          ? "عام"
                          : `مخصص لـ ${data.members.find((member) => member.id === task.memberId)?.name}`}{" "}
                        • {task.points || 1} points
                      </p>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => onRemoveTask(task.id)}
                      className="border-[2px] border-ink bg-paper"
                      aria-label="حذف التاسك"
                    >
                      <Trash2 data-icon="inline-start" />
                    </Button>
                  </div>

                  <p className="mb-4 text-[17px] leading-[1.8]">{task.question}</p>

                  <div className="mb-3 flex flex-wrap items-center gap-2 border-[2px] border-ink bg-paper p-3">
                    <Star data-icon="inline-start" />
                    <select
                      value={selectedManualMember}
                      onChange={(event) =>
                        setManualApproveMembers((current) => ({
                          ...current,
                          [task.id]: event.target.value,
                        }))
                      }
                      className="h-10 min-w-44 rounded-md border-[2px] border-ink bg-card px-3 text-base"
                    >
                      <option value="">اختار عضو للتسليم اليدوي</option>
                      {data.members.map((member) => (
                        <option key={member.id} value={member.id}>
                          {member.name}
                        </option>
                      ))}
                    </select>
                    <Button
                      type="button"
                      onClick={() => onManualApprove(task, selectedManualMember)}
                      className="border-[2px] border-ink doodle-shadow-sm"
                    >
                      <Check data-icon="inline-start" />
                      اعتماد يدوي
                    </Button>
                  </div>

                  <div className="mb-3 border-[2px] border-ink bg-yellow-50 p-3">
                    <div className="mb-2 flex flex-wrap items-center gap-2">
                      <Bell data-icon="inline-start" />
                      <strong>متابعة بدون درجات</strong>
                      <span className="rounded-full border-[2px] border-ink bg-card px-2 py-1 text-xs font-bold">
                        لا تدخل في النقاط
                      </span>
                    </div>
                    <div className="grid gap-2 md:grid-cols-[180px_1fr_auto]">
                      <select
                        value={selectedProgressMember}
                        onChange={(event) =>
                          setProgressMembers((current) => ({
                            ...current,
                            [task.id]: event.target.value,
                          }))
                        }
                        className="h-10 min-w-44 rounded-md border-[2px] border-ink bg-card px-3 text-base"
                      >
                        <option value="">اختار عضو للمتابعة</option>
                        {data.members.map((member) => (
                          <option key={member.id} value={member.id}>
                            {member.name}
                          </option>
                        ))}
                      </select>
                      <Input
                        value={progressNote}
                        onChange={(event) =>
                          setProgressNotes((current) => ({
                            ...current,
                            [task.id]: event.target.value,
                          }))
                        }
                        placeholder="مثال: خلصت التصميم ولسه الربط"
                        className="border-[2px] border-ink bg-card"
                      />
                      <Button
                        type="button"
                        onClick={() => {
                          onAddProgressUpdate(task, selectedProgressMember, progressNote);
                          setProgressNotes((current) => ({ ...current, [task.id]: "" }));
                        }}
                        className="border-[2px] border-ink bg-yellow-100 doodle-shadow-sm"
                      >
                        <Plus data-icon="inline-start" />
                        تسجيل متابعة
                      </Button>
                    </div>
                    {taskProgressUpdates.length > 0 && (
                      <div className="mt-3 grid gap-2">
                        {taskProgressUpdates.map((update) => (
                          <div key={update.id} className="border-[2px] border-ink bg-card p-3">
                            <div className="mb-1 flex flex-wrap items-center justify-between gap-2">
                              <strong>{update.memberName}</strong>
                              <span className="text-xs text-foreground/55">
                                {new Date(update.createdAt).toLocaleString()}
                              </span>
                            </div>
                            <p className="whitespace-pre-wrap leading-7">{update.note}</p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {responses.length === 0 ? (
                    <p className="text-sm text-foreground/60">لسه مفيش إجابات.</p>
                  ) : (
                    <div className="flex flex-col gap-3">
                      {responses.map((response) => (
                        <div
                          key={response.memberId}
                          className="border-[2px] border-ink bg-paper p-3"
                        >
                          <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                            <strong>{response.memberName}</strong>
                            <span className="text-sm text-foreground/60">{response.status}</span>
                          </div>
                          <p className="whitespace-pre-wrap leading-[1.8]">{response.answer}</p>
                          <div className="mt-3 flex flex-wrap gap-2">
                            <Button
                              type="button"
                              onClick={() => onReviewAnswer(task.id, response.memberId, "approved")}
                              className="border-[2px] border-ink doodle-shadow-sm"
                            >
                              <Check data-icon="inline-start" />
                              قبول
                            </Button>
                            <Button
                              type="button"
                              variant="outline"
                              onClick={() => onReviewAnswer(task.id, response.memberId, "rejected")}
                              className="border-[2px] border-ink bg-paper doodle-shadow-sm"
                            >
                              <RotateCcw data-icon="inline-start" />
                              رفض وإعادة
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </article>
              );
            })
          )}
        </section>

        <section
          className="mb-7 border-[2.5px] border-ink bg-card p-5 doodle-shadow"
          style={{ borderRadius: "20px 26px 18px 24px / 24px 18px 26px 20px" }}
        >
          <SectionTitle
            title="إدارة الفريق"
            help="الأرقام القديمة، الرسالة الحمراء، الريبو، والإخفاء المؤقت."
          />
          <div className="flex flex-col gap-4">
            {data.members.map((member) => {
              const memberScore = stats.allMemberStats.find((item) => item.member.id === member.id);

              return (
                <article
                  key={member.id}
                  className={`border-[2.5px] border-ink bg-paper p-4 transition hover:-translate-y-0.5 hover:bg-white ${
                    member.hidden ? "opacity-70" : ""
                  }`}
                  style={{ borderRadius: "18px 22px 14px 20px / 20px 14px 22px 18px" }}
                >
                  <div className="mb-4 flex flex-wrap items-start justify-between gap-3 border-b-[2px] border-ink/20 pb-3">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <strong
                          className={`text-2xl leading-none ${member.hidden ? "text-foreground/45" : ""}`}
                        >
                          {member.name}
                        </strong>
                        <span
                          className={`rounded-full border-[2px] border-ink px-2 py-1 text-xs font-bold ${
                            member.hidden
                              ? "bg-zinc-200 text-foreground/60"
                              : "bg-emerald-200 text-emerald-950"
                          }`}
                        >
                          {member.hidden ? "مخفي من المنافسة" : "ظاهر في الليدر بورد"}
                        </span>
                      </div>
                      <div className="mt-2 flex flex-wrap gap-2 text-xs font-bold text-foreground/65">
                        <span>مسلم: {memberScore?.submitted ?? 0}</span>
                        <span>مقبول: {memberScore?.approved ?? 0}</span>
                        <span>مرفوض: {memberScore?.rejected ?? 0}</span>
                        <span>نقاط: {memberScore?.points ?? 0}</span>
                      </div>
                    </div>

                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => onUpdateMember(member.id, { hidden: !member.hidden })}
                      className={`border-[2px] border-ink doodle-shadow-sm ${
                        member.hidden ? "bg-emerald-100" : "bg-red-50"
                      }`}
                    >
                      {member.hidden ? (
                        <Eye data-icon="inline-start" />
                      ) : (
                        <EyeOff data-icon="inline-start" />
                      )}
                      {member.hidden ? "إظهار في الليدر بورد" : "إخفاء مؤقت"}
                    </Button>
                  </div>

                  <div className="mb-4">
                    <p className="mb-2 text-sm font-bold text-foreground/70">
                      أرقام قديمة تتحسب مع اللي اتقبل على الموقع
                    </p>
                    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                      <label className="grid gap-1 text-sm font-bold">
                        تاسكات قديمة
                        <Input
                          type="number"
                          min={0}
                          value={member.baseCompleted ?? 0}
                          onChange={(event) =>
                            onUpdateMember(member.id, {
                              baseCompleted: sanitizeNumber(event.target.value),
                            })
                          }
                          className="border-[2px] border-ink bg-card text-center text-lg"
                        />
                      </label>
                      <label className="grid gap-1 text-sm font-bold">
                        مقبول قديم
                        <Input
                          type="number"
                          min={0}
                          value={member.baseApproved ?? 0}
                          onChange={(event) =>
                            onUpdateMember(member.id, {
                              baseApproved: sanitizeNumber(event.target.value),
                            })
                          }
                          className="border-[2px] border-ink bg-emerald-50 text-center text-lg"
                        />
                      </label>
                      <label className="grid gap-1 text-sm font-bold">
                        مرفوض قديم
                        <Input
                          type="number"
                          min={0}
                          value={member.baseRejected ?? 0}
                          onChange={(event) =>
                            onUpdateMember(member.id, {
                              baseRejected: sanitizeNumber(event.target.value),
                            })
                          }
                          className="border-[2px] border-ink bg-red-50 text-center text-lg"
                        />
                      </label>
                      <label className="grid gap-1 text-sm font-bold">
                        نقاط قديمة
                        <Input
                          type="number"
                          min={0}
                          value={member.basePoints ?? 0}
                          onChange={(event) =>
                            onUpdateMember(member.id, {
                              basePoints: sanitizeNumber(event.target.value),
                            })
                          }
                          className="border-[2px] border-ink bg-yellow-50 text-center text-lg"
                        />
                      </label>
                    </div>
                  </div>

                  <div className="grid gap-3 lg:grid-cols-2">
                    <label className="grid gap-1 text-sm font-bold">
                      رسالة حمراء تظهر جنب الاسم لكل التيم
                      <Input
                        value={member.publicFlag ?? ""}
                        onChange={(event) =>
                          onUpdateMember(member.id, { publicFlag: event.target.value })
                        }
                        placeholder="مثال: لسه ما سلمش / راجع الدفع"
                        className="border-[2px] border-ink bg-red-50"
                      />
                    </label>
                    <label className="grid gap-1 text-sm font-bold">
                      رسالة خاصة للعضو
                      <Input
                        value={member.adminNote ?? ""}
                        onChange={(event) =>
                          onUpdateMember(member.id, { adminNote: event.target.value })
                        }
                        placeholder="رسالة تظهر للعضو لما يدخل باسمه"
                        className="border-[2px] border-ink bg-card"
                      />
                    </label>
                    <label className="grid gap-1 text-sm font-bold">
                      لينك الريبو
                      <Input
                        value={member.repoUrl ?? ""}
                        onChange={(event) =>
                          onUpdateMember(member.id, { repoUrl: event.target.value })
                        }
                        placeholder="https://github.com/..."
                        className="border-[2px] border-ink bg-card ltr:text-left"
                        dir="ltr"
                      />
                    </label>
                    <label className="grid gap-1 text-sm font-bold">
                      الأسماء والـ nicknames
                      <Input
                        value={member.aliases.join(", ")}
                        onChange={(event) =>
                          onUpdateMember(member.id, {
                            aliases: uniqueText(event.target.value.split(",")),
                          })
                        }
                        placeholder="name, nickname, اسم عربي"
                        className="border-[2px] border-ink bg-card"
                      />
                    </label>
                  </div>
                </article>
              );
            })}
          </div>
        </section>

        <section
          className="mb-7 border-[2.5px] border-ink bg-card p-5 doodle-shadow"
          style={{ borderRadius: "20px 26px 18px 24px / 24px 18px 26px 20px" }}
        >
          <SectionTitle title="Settings" help="تغيير باسورد الأدمن وباسورد شاشة الإحصائيات." />
          <div className="grid gap-3 md:grid-cols-2">
            <Input
              value={data.settings?.adminPassword ?? DEFAULT_ADMIN_PASSWORD}
              onChange={(event) => onUpdateSettings({ adminPassword: event.target.value })}
              placeholder="Admin password"
              className="border-[2px] border-ink bg-paper"
            />
            <Input
              value={data.settings?.statsPassword ?? DEFAULT_STATS_PASSWORD}
              onChange={(event) => onUpdateSettings({ statsPassword: event.target.value })}
              placeholder="Stats password"
              className="border-[2px] border-ink bg-paper"
            />
            <div className="rounded-md border-[2px] border-ink bg-paper px-3 py-2 text-sm font-bold md:col-span-2 ltr:text-left">
              API: {HIVO_API_URL || "not configured"}
            </div>
          </div>
        </section>

        <section
          className="border-[2.5px] border-ink bg-card p-5 doodle-shadow"
          style={{ borderRadius: "20px 26px 18px 24px / 24px 18px 26px 20px" }}
        >
          <SectionTitle
            title="Leaderboard"
            help="نفس الصورة اللي التيم بيشوفها، مع تفاصيل عند الضغط."
          />
          <Leaderboard scores={stats.memberStats} />
        </section>
      </div>

      <SaveBar
        saveStatus={saveStatus}
        isDirty={isDirty}
        isSaving={isSaving}
        onSaveToGithub={onSaveToGithub}
      />
    </div>
  );
}

function SaveBar({
  saveStatus,
  isDirty,
  isSaving,
  onSaveToGithub,
}: {
  saveStatus: string;
  isDirty: boolean;
  isSaving: boolean;
  onSaveToGithub: () => void;
}) {
  return (
    <div className="fixed inset-x-0 bottom-0 z-40 border-t-[2.5px] border-ink bg-card/95 px-4 py-3 shadow-[0_-8px_0_rgba(0,0,0,0.08)] backdrop-blur">
      <div className="mx-auto flex max-w-5xl flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="text-center text-sm font-bold text-foreground/75 sm:text-right">
          {saveStatus || (isDirty ? "Unsaved changes" : "All changes saved")}
        </div>
        <Button
          type="button"
          onClick={onSaveToGithub}
          disabled={isSaving}
          className="h-12 min-w-40 border-[2px] border-ink text-lg doodle-shadow-sm"
        >
          <Save data-icon="inline-start" />
          {isSaving ? "Saving..." : "Save"}
        </Button>
      </div>
    </div>
  );
}

function StatsView({
  data,
  stats,
  onLogout,
}: {
  data: StudioData;
  stats: ReturnType<typeof createStats>;
  onLogout: () => void;
}) {
  const activeTasks = data.tasks.filter(isActiveTask);
  const activeMeetings = (data.meetings ?? []).filter(isActiveMeeting);
  const visibleStats = stats.memberStats;
  const highestMember = stats.leader;
  const lowestMember = stats.worst;
  const expectedTotal = stats.taskMetrics.reduce((sum, item) => sum + item.expected, 0);
  const receivedTotal = stats.taskMetrics.reduce((sum, item) => sum + item.received, 0);
  const completionRate = expectedTotal > 0 ? Math.round((receivedTotal / expectedTotal) * 100) : 0;
  const approved = visibleStats.reduce((sum, item) => sum + item.approved, 0);
  const rejected = visibleStats.reduce((sum, item) => sum + item.rejected, 0);
  const totalPoints = Math.round(stats.pointsTotal * 100) / 100;
  const teamHealth =
    completionRate >= 80 && stats.pendingTotal <= 2
      ? "Stable"
      : completionRate >= 45
        ? "Needs follow-up"
        : "At risk";
  const healthTone =
    teamHealth === "Stable"
      ? "border-emerald-200 bg-emerald-50 text-emerald-900"
      : teamHealth === "Needs follow-up"
        ? "border-yellow-200 bg-yellow-50 text-yellow-900"
        : "border-red-200 bg-red-50 text-red-700";

  function memberState(item: MemberScore) {
    if (item.assignedTasks === 0) return "No active assignments";
    if (item.responseRate < 50 || item.rejected > 0) return "At risk";
    if (item.responseRate >= 80 && item.pending === 0) return "On track";
    return "Needs follow-up";
  }

  function memberTone(item: MemberScore) {
    const state = memberState(item);
    if (state === "At risk") return "border-red-300 bg-red-50 shadow-[0_0_0_3px_rgba(239,68,68,0.18)]";
    if (state === "Needs follow-up") return "border-yellow-200 bg-yellow-50";
    if (state === "On track") return "border-emerald-200 bg-emerald-50";
    return "border-ink/10 bg-paper";
  }

  function activeTaskMembers(task: StudioTask) {
    return data.members.filter(
      (member) =>
        !member.hidden &&
        taskIsForMember(task, member.id) &&
        !isTaskSkipped(data, task.id, member.id),
    );
  }

  function statusSegments(total: number, counts: { approved: number; pending: number; rejected: number }) {
    const safeTotal = Math.max(0, total);
    if (safeTotal === 0) {
      return [{ key: "none", label: "No assignments", count: 1, className: "bg-zinc-200" }];
    }
    const approvedCount = Math.max(0, counts.approved);
    const pendingCount = Math.max(0, counts.pending);
    const rejectedCount = Math.max(0, counts.rejected);
    const missingCount = Math.max(0, safeTotal - approvedCount - pendingCount - rejectedCount);
    return [
      { key: "approved", label: "Approved", count: approvedCount, className: "bg-emerald-500" },
      { key: "pending", label: "Pending", count: pendingCount, className: "bg-yellow-400" },
      { key: "rejected", label: "Rejected", count: rejectedCount, className: "bg-red-500" },
      { key: "missing", label: "Missing", count: missingCount, className: "bg-zinc-200" },
    ].filter((segment) => segment.count > 0);
  }

  function taskSegments(task: StudioTask) {
    const members = activeTaskMembers(task);
    const responses = data.responses[task.id] ?? {};
    return statusSegments(members.length, {
      approved: members.filter((member) => responses[member.id]?.status === "approved").length,
      pending: members.filter((member) => responses[member.id]?.status === "submitted").length,
      rejected: members.filter((member) => responses[member.id]?.status === "rejected").length,
    });
  }

  function teamSegments() {
    const counts = activeTasks.reduce(
      (sum, task) => {
        const responses = data.responses[task.id] ?? {};
        for (const member of activeTaskMembers(task)) {
          const status = responses[member.id]?.status;
          if (status === "approved") sum.approved += 1;
          if (status === "submitted") sum.pending += 1;
          if (status === "rejected") sum.rejected += 1;
        }
        return sum;
      },
      { approved: 0, pending: 0, rejected: 0 },
    );
    return statusSegments(expectedTotal, counts);
  }

  function memberSegments(memberId: string) {
    const assignedTasks = activeTasks.filter(
      (task) => taskIsForMember(task, memberId) && !isTaskSkipped(data, task.id, memberId),
    );
    return statusSegments(assignedTasks.length, {
      approved: assignedTasks.filter((task) => getResponse(data, task.id, memberId)?.status === "approved").length,
      pending: assignedTasks.filter((task) => getResponse(data, task.id, memberId)?.status === "submitted").length,
      rejected: assignedTasks.filter((task) => getResponse(data, task.id, memberId)?.status === "rejected").length,
    });
  }

  function SegmentedStatusBar({ segments, total }: { segments: ReturnType<typeof statusSegments>; total: number }) {
    const safeTotal = Math.max(1, total);
    return (
      <div className="flex h-3 overflow-hidden rounded-full border border-ink/10 bg-white">
        {segments.map((segment) => (
          <div
            key={segment.key}
            title={`${segment.label}: ${segment.count}`}
            className={`h-full ${segment.className}`}
            style={{ width: `${total > 0 ? (segment.count / safeTotal) * 100 : 100}%` }}
          />
        ))}
      </div>
    );
  }

  function memberInsight(item: MemberScore) {
    const assignedTasks = activeTasks.filter(
      (task) => taskIsForMember(task, item.member.id) && !isTaskSkipped(data, task.id, item.member.id),
    );
    const taskResponses = assignedTasks
      .map((task) => ({ task, response: getResponse(data, task.id, item.member.id) }))
      .filter((entry): entry is { task: StudioTask; response: TaskResponse } =>
        Boolean(entry.response),
      );
    const approvedResponses = taskResponses.filter((entry) => entry.response.status === "approved");
    const bonusPoints = approvedResponses.reduce(
      (sum, entry) =>
        sum +
        Math.max(
          0,
          responseAwardedPoints(entry.task, entry.response) -
            sanitizePositiveNumber(entry.task.points, 1),
        ),
      0,
    );
    const meetingAttendance = activeMeetings
      .map((meeting) => data.meetingAttendance?.[meeting.id]?.[item.member.id])
      .filter((attendance): attendance is MeetingAttendance => Boolean(attendance));
    const missedActiveMeetings = activeMeetings.length > 0 && meetingAttendance.length === 0;
    const lateMeeting = meetingAttendance.some((attendance) => attendance.lateMinutes > 0);
    const lateSubmission = taskResponses.some((entry) => responseIsLate(entry.task, entry.response));
    const finishedAll =
      assignedTasks.length > 0 && approvedResponses.length === assignedTasks.length;

    if (bonusPoints >= 5) {
      return { text: `Earned ${Math.round(bonusPoints * 100) / 100} bonus pts`, tone: "bg-emerald-100 text-emerald-900 border-emerald-200" };
    }
    if (finishedAll) {
      return { text: "Finished everything", tone: "bg-emerald-100 text-emerald-900 border-emerald-200" };
    }
    if (missedActiveMeetings) {
      return { text: "Missing recent meetings", tone: "bg-red-100 text-red-700 border-red-200" };
    }
    if (lateMeeting) {
      return { text: "Late to meetings", tone: "bg-yellow-100 text-yellow-900 border-yellow-200" };
    }
    if (lateSubmission) {
      return { text: "Submits late", tone: "bg-yellow-100 text-yellow-900 border-yellow-200" };
    }
    if (item.avgHours !== null && item.avgHours <= 24 && item.submitted > 0) {
      return { text: "Submits quickly", tone: "bg-sky-100 text-sky-900 border-sky-200" };
    }
    if (item.assignedTasks === 0) {
      return { text: "No active assignments", tone: "bg-zinc-100 text-zinc-600 border-zinc-200" };
    }
    return { text: "Needs light follow-up", tone: "bg-white text-foreground/65 border-ink/10" };
  }

  return (
    <div className="min-h-screen bg-[#f7f6f0] text-foreground" dir="ltr">
      <main className="mx-auto grid max-w-6xl gap-5 px-4 py-5 md:py-8">
        <header className="rounded-2xl border border-ink/10 bg-white p-5 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <div className="text-sm font-bold text-foreground/50">Hivo Studio</div>
              <h1 className="mt-1 text-3xl font-bold">Team status</h1>
              <p className="mt-2 text-sm leading-6 text-foreground/60">
                Read-only monitoring for active work. It is built for quick checks without needing admin context.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <span className={`rounded-full border px-3 py-2 text-sm font-bold ${healthTone}`}>
                {teamHealth}
              </span>
              <Button
                type="button"
                variant="outline"
                onClick={onLogout}
                className="shrink-0 border border-ink/20 bg-paper"
              >
                <LogOut className="size-4" />
              </Button>
            </div>
          </div>
        </header>

        <section className="rounded-2xl border border-ink/10 bg-white p-5 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <div className="text-sm font-bold text-foreground/50">Team task completion</div>
              <div className="mt-1 text-4xl font-bold">
                {receivedTotal} / {expectedTotal}
              </div>
              <p className="mt-2 text-sm leading-6 text-foreground/60">
                Completed means final submissions received for active tasks. Archived tasks are not counted here.
              </p>
            </div>
            <div className="rounded-full border border-ink/10 bg-paper px-4 py-3 text-2xl font-bold">
              {completionRate}%
            </div>
          </div>
          <div className="mt-5">
            <SegmentedStatusBar segments={teamSegments()} total={expectedTotal} />
          </div>
          <div className="mt-5 grid grid-cols-2 gap-2 lg:grid-cols-6">
            <CompactMetric label="Active tasks" value={activeTasks.length} />
            <CompactMetric label="Expected submissions" value={expectedTotal} />
            <CompactMetric label="Submitted" value={receivedTotal} />
            <CompactMetric label="Pending review" value={stats.pendingTotal} />
            <CompactMetric label="Approved" value={approved} />
            <CompactMetric label="Team points" value={totalPoints} />
          </div>
        </section>

        <section className="rounded-2xl border border-ink/10 bg-white p-5 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="text-xl font-bold">Current tasks</h2>
              <p className="mt-1 text-sm text-foreground/55">
                Open assignments and review progress. Each bar shows submitted out of expected submissions.
              </p>
            </div>
            <span className="rounded-full border border-ink/10 bg-paper px-3 py-1 text-sm font-bold">
              {activeTasks.length} active
            </span>
          </div>
          <div className="mt-4 grid gap-3">
            {stats.taskMetrics.length === 0 ? (
              <p className="rounded-xl border border-dashed border-ink/15 bg-paper p-5 text-sm text-foreground/55">
                No active tasks right now.
              </p>
            ) : (
              stats.taskMetrics.map((metric) => {
                const segments = taskSegments(metric.task);
                return (
                  <div key={metric.task.id} className="rounded-xl border border-ink/10 bg-paper p-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <h3 className="text-lg font-bold">{metric.task.title}</h3>
                        <p className="mt-1 text-xs font-bold text-foreground/50">
                          Deadline {formatDateTime(metric.task.deadlineAt)} | {metric.task.points || 1} points
                        </p>
                      </div>
                      <span className="rounded-full border border-ink/10 bg-white px-3 py-1 text-sm font-bold">
                        {metric.received}/{metric.expected}
                      </span>
                    </div>
                    <div className="mt-3">
                      <SegmentedStatusBar segments={segments} total={metric.expected} />
                    </div>
                    <div className="mt-2 flex flex-wrap gap-2 text-xs font-bold text-foreground/55">
                      <span>Submitted {metric.received}</span>
                      <span>Approved {metric.approved}</span>
                      <span>Pending {metric.submitted}</span>
                      <span>Rejected {metric.rejected}</span>
                      <span>Progress notes {metric.progressUpdates}</span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
          <div className="mt-3 flex flex-wrap gap-3 text-xs font-bold text-foreground/55">
            <span className="flex items-center gap-1"><span className="size-2 rounded-full bg-emerald-500" /> Approved</span>
            <span className="flex items-center gap-1"><span className="size-2 rounded-full bg-yellow-400" /> Pending</span>
            <span className="flex items-center gap-1"><span className="size-2 rounded-full bg-red-500" /> Rejected</span>
            <span className="flex items-center gap-1"><span className="size-2 rounded-full bg-zinc-200" /> Missing</span>
          </div>
        </section>

        <section className="rounded-2xl border border-ink/10 bg-white p-5 shadow-sm">
          <div className="mb-4 grid gap-2 sm:grid-cols-2">
            {[
              { label: "Highest", item: highestMember, tone: "border-emerald-200 bg-emerald-50 text-emerald-900" },
              { label: "Lowest", item: lowestMember, tone: "border-red-200 bg-red-50 text-red-700" },
            ].map(({ label, item, tone }) => (
              <div key={label} className={`rounded-xl border p-3 ${tone}`}>
                <div className="text-xs font-bold uppercase text-foreground/45">{label}</div>
                <div className="mt-1 flex items-end justify-between gap-3">
                  <strong className="min-w-0 truncate text-lg">{item?.member.name ?? "N/A"}</strong>
                  <span className="shrink-0 text-sm font-bold">{item ? `${item.points} pts` : "0 pts"}</span>
                </div>
              </div>
            ))}
          </div>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="text-xl font-bold">Members</h2>
              <p className="mt-1 text-sm text-foreground/55">
                Progress is visible without opening a row. Red glow means low progress or rejection history.
              </p>
            </div>
            <span className="rounded-full border border-red-200 bg-red-50 px-3 py-1 text-sm font-bold text-red-700">
              {rejected} rejections
            </span>
          </div>
          <div className="mt-3 grid gap-2">
            {visibleStats.map((item) => {
              const state = memberState(item);
              const insight = memberInsight(item);
              const segments = memberSegments(item.member.id);
              return (
                <details key={item.member.id} className={`rounded-xl border p-4 ${memberTone(item)}`}>
                  <summary className="cursor-pointer list-none">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <strong className="text-lg">{item.member.name}</strong>
                          <span className="rounded-full border border-ink/10 bg-white px-2 py-1 text-xs font-bold">
                            {state}
                          </span>
                          <span className={`rounded-full border px-2 py-1 text-xs font-bold ${insight.tone}`}>
                            {insight.text}
                          </span>
                        </div>
                        <div className="mt-1 text-xs font-bold text-foreground/45">
                          Click to see details
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-lg font-bold">{item.points} pts</div>
                        <div className="text-xs text-foreground/50">
                          {item.submitted}/{item.assignedTasks} submitted
                        </div>
                      </div>
                    </div>
                    <div className="mt-3">
                      <SegmentedStatusBar segments={segments} total={item.assignedTasks} />
                    </div>
                    <div className="mt-2 flex flex-wrap gap-2 text-xs font-bold text-foreground/55">
                      <span>Progress {formatPercent(item.responseRate)}</span>
                      <span>Pending {item.pending}</span>
                      <span>Rejected {item.rejected}</span>
                      <span>Approved {item.approved}</span>
                    </div>
                  </summary>
                  <StatsMemberDetails item={item} />
                </details>
              );
            })}
          </div>
        </section>
      </main>
    </div>
  );
}

function LegacyStatsView({
  data,
  stats,
  onLogout,
}: {
  data: StudioData;
  stats: ReturnType<typeof createStats>;
  onLogout: () => void;
}) {
  const visibleStats = stats.memberStats;
  const best = visibleStats[0];
  const worst = visibleStats[visibleStats.length - 1];
  const fastest = [...visibleStats]
    .filter((item) => item.avgHours !== null)
    .sort((a, b) => (a.avgHours ?? 0) - (b.avgHours ?? 0))[0];
  const slowest = [...visibleStats]
    .filter((item) => item.avgHours !== null)
    .sort((a, b) => (b.avgHours ?? 0) - (a.avgHours ?? 0))[0];
  const topPoints = [...visibleStats].sort((a, b) => b.points - a.points)[0];
  const mostRejected = [...visibleStats].sort((a, b) => b.rejected - a.rejected)[0];
  const mostPending = [...visibleStats].sort((a, b) => b.pending - a.pending)[0];
  const lowestResponseRate = [...visibleStats]
    .filter((item) => item.assignedTasks > 0)
    .sort((a, b) => a.responseRate - b.responseRate)[0];
  const totalSubmitted = visibleStats.reduce((sum, item) => sum + item.submitted, 0);
  const totalRejected = visibleStats.reduce((sum, item) => sum + item.rejected, 0);

  const insightCards = [
    {
      label: "أفضل أداء",
      value: best?.member.name ?? "N/A",
      detail: best ? `${best.points} pts / ${best.completed} tasks` : "لسه مفيش بيانات",
    },
    {
      label: "أعلى نقاط",
      value: topPoints?.member.name ?? "N/A",
      detail: topPoints ? `${topPoints.points} pts` : "لسه مفيش نقاط",
    },
    {
      label: "أسرع تسليم",
      value: fastest?.member.name ?? "N/A",
      detail: fastest ? formatHours(fastest.avgHours) : "مفيش تسليمات متوقتة",
    },
    {
      label: "أبطأ تسليم",
      value: slowest?.member.name ?? "N/A",
      detail: slowest ? formatHours(slowest.avgHours) : "مفيش تسليمات متوقتة",
    },
    {
      label: "أكثر رفض",
      value: mostRejected?.member.name ?? "N/A",
      detail: mostRejected ? `${mostRejected.rejected} rejected` : "مفيش رفض",
    },
    {
      label: "أكثر Pending",
      value: mostPending?.member.name ?? "N/A",
      detail: mostPending ? `${mostPending.pending} pending` : "مفيش انتظار",
    },
    {
      label: "أقل تسليم",
      value: lowestResponseRate?.member.name ?? "N/A",
      detail: lowestResponseRate
        ? `${formatPercent(lowestResponseRate.responseRate)} submitted`
        : "مفيش تاسكات مفتوحة",
    },
    {
      label: "الأضعف في الليدر بورد",
      value: worst?.member.name ?? "N/A",
      detail: worst ? `${worst.points} pts / ${worst.completed} tasks` : "لسه مفيش بيانات",
    },
  ];

  return (
    <div className="min-h-screen text-foreground" dir="rtl">
      <div className="mx-auto max-w-6xl px-5 py-10 md:py-14">
        <header className="mb-8 text-center">
          <Logo />
          <h1 className="mb-2 mt-4 text-5xl font-bold leading-tight">
            <span className="highlight-yellow">Statistics</span>
          </h1>
          <p className="text-lg text-foreground/75">
            شاشة قراءة فقط: مين شغال، مين سريع، ومين محتاج متابعة.
          </p>
          <Button
            type="button"
            variant="outline"
            onClick={onLogout}
            className="mt-4 border-[2px] border-ink bg-paper doodle-shadow-sm"
          >
            <LogOut data-icon="inline-start" />
            خروج
          </Button>
        </header>

        <section className="mb-7 grid gap-3 md:grid-cols-4">
          {[
            ["التاسكات", data.tasks.length],
            ["إجمالي التسليم", totalSubmitted],
            ["Pending", stats.pendingTotal],
            ["Rejected", totalRejected],
          ].map(([label, value]) => (
            <div
              key={label}
              className="border-[2.5px] border-ink bg-card p-4 text-center doodle-shadow"
              style={{ borderRadius: "16px 20px 14px 18px / 18px 14px 20px 16px" }}
            >
              <div className="text-3xl font-bold">{value}</div>
              <div className="text-sm text-foreground/65">{label}</div>
            </div>
          ))}
        </section>

        <section className="mb-7 grid gap-3 md:grid-cols-4">
          {insightCards.map((card) => (
            <div
              key={card.label}
              className="border-[2.5px] border-ink bg-card p-4 doodle-shadow"
              style={{ borderRadius: "16px 20px 14px 18px / 18px 14px 20px 16px" }}
            >
              <div className="text-sm text-foreground/60">{card.label}</div>
              <strong className="mt-1 block text-lg">{card.value}</strong>
              <div className="mt-1 text-xs text-foreground/60">{card.detail}</div>
            </div>
          ))}
        </section>

        <section
          className="mb-7 border-[2.5px] border-ink bg-card p-5 doodle-shadow"
          style={{ borderRadius: "20px 26px 18px 24px / 24px 18px 26px 20px" }}
        >
          <SectionTitle
            title="إحصائيات التاسكات"
            help="لكل تاسك: كام إجابة وصلت من أصل المطلوب، وكام اتقبل أو اترفض."
          />
          <div className="grid gap-3 md:grid-cols-2">
            {stats.taskMetrics.length === 0 ? (
              <p className="text-sm text-foreground/60">لسه مفيش تاسكات.</p>
            ) : (
              stats.taskMetrics.map((item) => (
                <div key={item.task.id} className="border-[2px] border-ink bg-paper p-3">
                  <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                    <strong>{item.task.title}</strong>
                    <span className="rounded-full border-[2px] border-ink bg-card px-2 py-1 text-sm font-bold">
                      {item.received}/{item.expected}
                    </span>
                  </div>
                  <div className="grid gap-2 text-sm sm:grid-cols-4">
                    <span>Pending: {item.submitted}</span>
                    <span>Accepted: {item.approved}</span>
                    <span>Rejected: {item.rejected}</span>
                    <span>
                      Rate:{" "}
                      {formatPercent(item.expected > 0 ? (item.received / item.expected) * 100 : 0)}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </section>

        <section
          className="border-[2.5px] border-ink bg-card p-5 doodle-shadow"
          style={{ borderRadius: "20px 26px 18px 24px / 24px 18px 26px 20px" }}
        >
          <SectionTitle
            title="كل الأشخاص"
            help="نقاط، تسليم، قبول، رفض، pending، نسبة التسليم، وسرعة كل عضو."
          />
          <div className="grid gap-3 md:grid-cols-2">
            {stats.memberStats.map((item) => (
              <div
                key={item.member.id}
                className={`border-[2px] border-ink bg-paper p-3 ${
                  item.member.hidden ? "opacity-55" : ""
                }`}
              >
                <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <strong>{item.member.name}</strong>
                    {item.member.hidden && (
                      <span className="ms-2 text-xs text-foreground/55">hidden</span>
                    )}
                    {item.member.publicFlag && (
                      <div className="text-xs font-bold text-red-600">{item.member.publicFlag}</div>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {item.member.repoUrl && (
                      <Button
                        type="button"
                        size="sm"
                        onClick={() =>
                          window.open(item.member.repoUrl, "_blank", "noopener,noreferrer")
                        }
                        className="border-[2px] border-ink"
                      >
                        Repo
                      </Button>
                    )}
                  </div>
                </div>
                <MemberDetails item={item} />
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}

function encodeBase64(value: string) {
  const bytes = new TextEncoder().encode(value);
  let binary = "";
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });
  return window.btoa(binary);
}

async function fetchStudioData() {
  if (HIVO_API_URL) {
    const response = await fetch(`${HIVO_API_URL}/api/data?ts=${Date.now()}`, {
      cache: "no-store",
    });
    if (!response.ok) throw new Error("Backend data is not available.");
    return sanitizeData((await response.json()) as StudioData);
  }

  const response = await fetch(`${import.meta.env.BASE_URL}team-data.json?ts=${Date.now()}`, {
    cache: "no-store",
  });
  return sanitizeData((await response.json()) as StudioData);
}

async function postApi<TResponse>(path: string, body: unknown, adminPassword?: string) {
  if (!HIVO_API_URL) {
    throw new Error("Backend is unavailable. Please try again.");
  }

  const response = await fetch(`${HIVO_API_URL}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(adminPassword ? { "x-admin-password": adminPassword } : {}),
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as { error?: string } | null;
    throw new Error(payload?.error ?? "Backend rejected the save.");
  }

  return (await response.json()) as TResponse;
}

async function postSubmission(item: QueuedSubmission) {
  return sanitizeData(await postApi<StudioData>("/api/submissions", item));
}

async function postProgressUpdate(item: QueuedProgressUpdate) {
  return sanitizeData(await postApi<StudioData>("/api/progress-updates", item));
}

async function postRepoAttention(item: RepoAttentionRequest) {
  return sanitizeData(await postApi<StudioData>("/api/repo-attention", item));
}

async function postProfileChangeRequest(item: MemberProfileRequestInput) {
  return sanitizeData(await postApi<StudioData>("/api/profile-requests", item));
}

async function postAdminMutation(
  adminPassword: string,
  action: string,
  payload: Record<string, unknown>,
) {
  return sanitizeData(await postApi<StudioData>("/api/admin/mutate", { action, payload }, adminPassword));
}

function normalizeBackendUrl(value?: string) {
  return (value ?? "").trim().replace(/\/+$/, "");
}

async function submitQueuedItem<TItem extends QueuedSubmission | QueuedProgressUpdate>(
  backendUrl: string | undefined,
  path: "submissions" | "progress-updates",
  item: TItem,
) {
  const baseUrl = normalizeBackendUrl(backendUrl);

  if (!baseUrl) {
    const queue = readLocalQueue();
    if (path === "submissions") {
      writeLocalQueue({ ...queue, submissions: [item as QueuedSubmission, ...queue.submissions] });
    } else {
      writeLocalQueue({
        ...queue,
        progressUpdates: [item as QueuedProgressUpdate, ...queue.progressUpdates],
      });
    }
    return "local";
  }

  const response = await fetch(`${baseUrl}/${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(item),
  });
  if (!response.ok) throw new Error("Backend rejected the submission.");
  return "backend";
}

async function fetchAdminQueue(backendUrl?: string) {
  const baseUrl = normalizeBackendUrl(backendUrl);
  if (!baseUrl) return readLocalQueue();

  const response = await fetch(`${baseUrl}/admin-queue?ts=${Date.now()}`, { cache: "no-store" });
  if (!response.ok) throw new Error("Backend queue is not available.");
  const data = (await response.json()) as Partial<AdminQueue>;
  return {
    submissions: data.submissions ?? [],
    progressUpdates: data.progressUpdates ?? [],
  };
}

async function deleteQueuedItem(
  backendUrl: string | undefined,
  path: "submissions" | "progress-updates",
  id: string,
) {
  const baseUrl = normalizeBackendUrl(backendUrl);
  if (!baseUrl) return;

  await fetch(`${baseUrl}/${path}/${encodeURIComponent(id)}`, { method: "DELETE" }).catch(() => {
    // Some simple backends may clear items server-side during approval instead.
  });
}

function Index() {
  const [data, setData] = useState<StudioData>(DEFAULT_DATA);
  const [activeMember, setActiveMember] = useState<ActiveMember | null>(null);
  const [activeAdmin, setActiveAdmin] = useState(false);
  const [activeStats, setActiveStats] = useState(false);
  const [draftAnswers, setDraftAnswers] = useState<Record<string, string>>(() =>
    readMemberDrafts(),
  );
  const [sentState, setSentState] = useState<Record<string, string>>(() => readMemberSentState());
  const [githubToken, setGithubToken] = useState("");
  const [adminPassword, setAdminPassword] = useState("");
  const [saveStatus, setSaveStatus] = useState("");
  const [refreshStatus, setRefreshStatus] = useState("");
  const [queueStatus, setQueueStatus] = useState("");
  const [adminQueue, setAdminQueue] = useState<AdminQueue>(emptyQueue());
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [tokenDialogOpen, setTokenDialogOpen] = useState(false);
  const [tokenDraft, setTokenDraft] = useState("");

  useEffect(() => {
    let mounted = true;

    async function loadData() {
      const initialData = await fetchStudioData();

      if (!mounted) return;
      setData(initialData);
      setGithubToken(window.localStorage.getItem(GITHUB_TOKEN_KEY) ?? "");

      const hasAdminSession = window.localStorage.getItem(ADMIN_SESSION_KEY) === "true";
      if (hasAdminSession) {
        setAdminPassword(window.localStorage.getItem(ADMIN_AUTH_KEY) ?? "");
        setActiveAdmin(true);
        return;
      }

      const hasStatsSession = window.localStorage.getItem(STATS_SESSION_KEY) === "true";
      if (hasStatsSession) {
        setActiveStats(true);
        return;
      }

      const activeMemberId = window.localStorage.getItem(ACTIVE_MEMBER_KEY);
      const displayName = window.localStorage.getItem(ACTIVE_DISPLAY_NAME_KEY);
      const savedMember = initialData.members.find((member) => member.id === activeMemberId);
      if (savedMember)
        setActiveMember({ member: savedMember, displayName: displayName || savedMember.name });
    }

    loadData().catch(() => {
      if (mounted) setData(DEFAULT_DATA);
    });

    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (!activeMember) return;
    const freshMember = data.members.find((member) => member.id === activeMember.member.id);
    if (freshMember && freshMember !== activeMember.member) {
      setActiveMember((current) =>
        current ? { member: freshMember, displayName: current.displayName } : current,
      );
    }
  }, [activeMember, data.members]);

  const stats = useMemo(() => createStats(data), [data]);

  const refreshAdminQueue = useCallback(async () => {
    setQueueStatus("Syncing data...");
    try {
      const freshData = await fetchStudioData();
      setData(freshData);
      setIsDirty(false);
      setQueueStatus("Data refreshed from the shared backend.");
    } catch (error) {
      setQueueStatus(error instanceof Error ? error.message : "Could not refresh shared data.");
    }
  }, []);

  useEffect(() => {
    if (!activeAdmin) return;
    void refreshAdminQueue();
  }, [activeAdmin, refreshAdminQueue]);

  function updateData(updater: (current: StudioData) => StudioData) {
    setData((current) =>
      sanitizeData({ ...updater(current), meta: { updatedAt: new Date().toISOString() } }),
    );
    setIsDirty(true);
    setSaveStatus("في تغييرات غير محفوظة");
  }

  async function saveCurrentData() {
    if (!adminPassword) {
      setSaveStatus("سجل دخول الأدمن مرة تانية عشان نقدر نحفظ.");
      return;
    }

    setIsSaving(true);
    setSaveStatus("جاري مزامنة البيانات...");
    try {
      const nextData = await postAdminMutation(adminPassword, "replaceData", { data });
      setData(nextData);
      setIsDirty(false);
      setSaveStatus("تم الحفظ على GitHub.");
    } catch (error) {
      setSaveStatus(
        error instanceof Error ? `فشل الحفظ: ${error.message}` : "فشل الحفظ، التغيير لم يتم اعتماده.",
      );
    } finally {
      setIsSaving(false);
    }
  }

  async function refreshData() {
    const freshData = await fetchStudioData();
    setData(freshData);
    setRefreshStatus("تم تحديث الداتا، وأي تغييرات محلية على جهازك فضلت محفوظة.");
  }

  function loginMember(member: Member, displayName: string) {
    setActiveAdmin(false);
    setActiveStats(false);
    setActiveMember({ member, displayName });
  }

  function loginAdmin(password: string) {
    setActiveMember(null);
    setActiveStats(false);
    setAdminPassword(password);
    setActiveAdmin(true);
  }

  function loginStats() {
    setActiveMember(null);
    setActiveAdmin(false);
    setActiveStats(true);
  }

  function logout() {
    window.localStorage.removeItem(ACTIVE_MEMBER_KEY);
    window.localStorage.removeItem(ACTIVE_DISPLAY_NAME_KEY);
    window.localStorage.removeItem(ADMIN_SESSION_KEY);
    window.localStorage.removeItem(ADMIN_AUTH_KEY);
    window.localStorage.removeItem(STATS_SESSION_KEY);
    setAdminPassword("");
    setActiveMember(null);
    setActiveAdmin(false);
    setActiveStats(false);
  }

  async function addTask(task: Omit<StudioTask, "id" | "createdAt">) {
    if (!adminPassword) {
      setSaveStatus("Log in as admin again before saving.");
      return false;
    }

    setIsSaving(true);
    setSaveStatus("Saving task to GitHub...");
    try {
      const nextData = await postAdminMutation(adminPassword, "addTask", { task });
      setData(nextData);
      setIsDirty(false);
      setSaveStatus("Task saved to GitHub.");
      return true;
    } catch (error) {
      setSaveStatus(error instanceof Error ? `Save failed: ${error.message}` : "Save failed.");
      return false;
    } finally {
      setIsSaving(false);
    }
  }

  async function updateTask(taskId: string, updates: Partial<StudioTask>) {
    if (!adminPassword) {
      setSaveStatus("Log in as admin again before saving.");
      return false;
    }

    setIsSaving(true);
    setSaveStatus("Saving task update...");
    try {
      const nextData = await postAdminMutation(adminPassword, "updateTask", { taskId, updates });
      setData(nextData);
      setIsDirty(false);
      setSaveStatus("Task update saved.");
      return true;
    } catch (error) {
      setSaveStatus(error instanceof Error ? `Save failed: ${error.message}` : "Save failed.");
      return false;
    } finally {
      setIsSaving(false);
    }
  }

  function addMeeting(meeting: Omit<Meeting, "id" | "createdAt">) {
    updateData((current) => ({
      ...current,
      meetings: [
        ...(current.meetings ?? []),
        {
          ...meeting,
          id: `meeting-${Date.now()}`,
          createdAt: new Date().toISOString(),
          status: meeting.status ?? "active",
        },
      ],
    }));
    return true;
  }

  function updateMeeting(meetingId: string, updates: Partial<Meeting>) {
    updateData((current) => ({
      ...current,
      meetings: (current.meetings ?? []).map((meeting) =>
        meeting.id === meetingId ? { ...meeting, ...updates } : meeting,
      ),
    }));
    return true;
  }

  function recordMeetingAttendance(meeting: Meeting, member: Member) {
    const checkedAt = new Date().toISOString();
    const calculated = calculateMeetingAttendance(meeting, checkedAt);

    updateData((current) => ({
      ...current,
      meetingAttendance: {
        ...(current.meetingAttendance ?? {}),
        [meeting.id]: {
          ...((current.meetingAttendance ?? {})[meeting.id] ?? {}),
          [member.id]: {
            memberId: member.id,
            memberName: member.name,
            checkedAt,
            lateMinutes: calculated.lateMinutes,
            score: calculated.score,
          },
        },
      },
    }));
    return true;
  }

  async function removeTask(taskId: string) {
    if (!adminPassword) {
      setSaveStatus("Log in as admin again before saving.");
      return false;
    }

    setIsSaving(true);
    setSaveStatus("Deleting task...");
    try {
      const nextData = await postAdminMutation(adminPassword, "removeTask", { taskId });
      setData(nextData);
      setIsDirty(false);
      setSaveStatus("Task deleted from GitHub.");
      return true;
    } catch (error) {
      setSaveStatus(error instanceof Error ? `Save failed: ${error.message}` : "Save failed.");
      return false;
    } finally {
      setIsSaving(false);
    }
  }

  async function submitFinalSubmission(task: StudioTask) {
    if (!activeMember) return false;
    const key = responseKey(task.id, activeMember.member.id);
    const answer = (draftAnswers[key] ?? getResponse(data, task.id, activeMember.member.id)?.answer ?? "").trim();
    if (!answer) return false;

    const item: QueuedSubmission = {
      id: `submission-${Date.now()}`,
      taskId: task.id,
      memberId: activeMember.member.id,
      memberName: activeMember.displayName,
      answer,
      submittedAt: new Date().toISOString(),
    };

    setIsSubmitting(true);
    try {
      const nextData = await postSubmission(item);
      const repoUpdate = createRepoUpdateFromText({
        memberId: item.memberId,
        taskId: item.taskId,
        source: "submission",
        text: item.answer,
      });
      setData(appendRepoUpdateIfMissing(nextData, repoUpdate));
      setIsDirty(false);
      writeMemberDrafts({ ...readMemberDrafts(), [key]: answer });
      setSentState((current) => {
        const next = { ...current, [key]: "pending" };
        writeMemberSentState(next);
        return next;
      });
      setRefreshStatus("Submission saved centrally and is waiting for admin review.");
      return true;
    } catch (error) {
      setRefreshStatus(
        error instanceof Error ? error.message : "Submission failed. Nothing was approved.",
      );
      return false;
    } finally {
      setIsSubmitting(false);
    }
  }

  async function submitProgressUpdate(task: StudioTask) {
    if (!activeMember) return false;
    const key = progressKey(task.id, activeMember.member.id);
    const note = draftAnswers[key]?.trim();
    if (!note) return false;

    const item: QueuedProgressUpdate = {
      id: `progress-${Date.now()}`,
      taskId: task.id,
      memberId: activeMember.member.id,
      memberName: activeMember.displayName,
      note,
      createdAt: new Date().toISOString(),
    };

    setIsSubmitting(true);
    try {
      const nextData = await postProgressUpdate(item);
      const repoUpdate = createAttentionUpdate({
        memberId: item.memberId,
        taskId: item.taskId,
        source: "progress",
        text: item.note,
      });
      setData(appendRepoUpdateIfMissing(nextData, repoUpdate));
      setIsDirty(false);
      writeMemberDrafts({ ...readMemberDrafts(), [key]: note });
      setSentState((current) => {
        const next = { ...current, [key]: "sent" };
        writeMemberSentState(next);
        return next;
      });
      setRefreshStatus("Progress update saved centrally. It does not count as points.");
      return true;
    } catch (error) {
      setRefreshStatus(error instanceof Error ? error.message : "Progress update failed.");
      return false;
    } finally {
      setIsSubmitting(false);
    }
  }

  async function sendRepoAttention(task: StudioTask) {
    if (!activeMember) return false;

    setIsSubmitting(true);
    try {
      const nextData = await postRepoAttention({
        memberId: activeMember.member.id,
        taskId: task.id,
        excerpt: `GitHub attention requested for ${task.title}`,
      });
      setData(nextData);
      setIsDirty(false);
      setRefreshStatus("Admin was notified about your GitHub update.");
      return true;
    } catch (error) {
      setRefreshStatus(
        error instanceof Error ? error.message : "Could not notify admin about GitHub.",
      );
      return false;
    } finally {
      setIsSubmitting(false);
    }
  }

  async function sendDriveAttention(task: StudioTask) {
    if (!activeMember) return false;

    setIsSubmitting(true);
    try {
      const nextData = await postRepoAttention({
        memberId: activeMember.member.id,
        taskId: task.id,
        source: "drive",
        excerpt: `Drive attention requested for ${task.title}`,
      });
      setData(nextData);
      setIsDirty(false);
      setRefreshStatus("Admin was notified about your Drive update.");
      return true;
    } catch (error) {
      setRefreshStatus(
        error instanceof Error ? error.message : "Could not notify admin about Drive.",
      );
      return false;
    } finally {
      setIsSubmitting(false);
    }
  }

  async function submitProfileChangeRequest(item: MemberProfileRequestInput) {
    if (!activeMember) return false;

    setIsSubmitting(true);
    try {
      const nextData = await postProfileChangeRequest(item);
      setData(nextData);
      setIsDirty(false);
      setRefreshStatus("Profile change request sent to admin for approval.");
      return true;
    } catch (error) {
      setRefreshStatus(error instanceof Error ? error.message : "Could not send profile request.");
      return false;
    } finally {
      setIsSubmitting(false);
    }
  }

  async function reviewAnswer(
    taskId: string,
    memberId: string,
    status: "approved" | "rejected",
    note = "",
    awardedPoints?: number,
    overrideLocked = false,
  ) {
    if (!adminPassword) {
      setSaveStatus("Log in as admin again before saving.");
      return false;
    }

    setIsSaving(true);
    setSaveStatus("Syncing data...");
    try {
      const nextData = await postAdminMutation(adminPassword, "reviewAnswer", {
        taskId,
        memberId,
        status,
        note: note.trim(),
        awardedPoints,
        overrideLocked,
      });
      setData(nextData);
      setIsDirty(false);
      setSaveStatus("Saved to GitHub.");
      return true;
    } catch (error) {
      setSaveStatus(
        error instanceof Error ? `Save failed: ${error.message}` : "Save failed. Nothing was approved.",
      );
      return false;
    } finally {
      setIsSaving(false);
    }
  }

  function removeQueuedSubmission(id: string) {
    removeLocalSubmission(id);
    void deleteQueuedItem(data.settings?.backendUrl, "submissions", id);
    setAdminQueue((current) => ({
      ...current,
      submissions: current.submissions.filter((item) => item.id !== id),
    }));
  }

  function removeQueuedProgress(id: string) {
    removeLocalProgressUpdate(id);
    void deleteQueuedItem(data.settings?.backendUrl, "progress-updates", id);
    setAdminQueue((current) => ({
      ...current,
      progressUpdates: current.progressUpdates.filter((item) => item.id !== id),
    }));
  }

  async function approveQueuedSubmission(item: QueuedSubmission) {
    return reviewAnswer(item.taskId, item.memberId, "approved");
  }

  async function rejectQueuedSubmission(item: QueuedSubmission) {
    return reviewAnswer(item.taskId, item.memberId, "rejected");
  }

  async function manualApprove(task: StudioTask, memberId: string, awardedPoints?: number) {
    if (!adminPassword) {
      setSaveStatus("Log in as admin again before saving.");
      return false;
    }
    if (!memberId) return false;

    setIsSaving(true);
    setSaveStatus("Syncing data...");
    try {
      const nextData = await postAdminMutation(adminPassword, "manualApprove", {
        taskId: task.id,
        memberId,
        awardedPoints,
      });
      setData(nextData);
      setIsDirty(false);
      setSaveStatus("Saved to GitHub.");
      return true;
    } catch (error) {
      setSaveStatus(
        error instanceof Error ? `Save failed: ${error.message}` : "Save failed. Nothing was approved.",
      );
      return false;
    } finally {
      setIsSaving(false);
    }
  }

  async function skipTaskMember(task: StudioTask, memberId: string, note = "") {
    if (!adminPassword) {
      setSaveStatus("Log in as admin again before saving.");
      return false;
    }
    if (!memberId) return false;

    setIsSaving(true);
    setSaveStatus("Syncing data...");
    try {
      const nextData = await postAdminMutation(adminPassword, "skipTaskMember", {
        taskId: task.id,
        memberId,
        note: note.trim(),
      });
      setData(nextData);
      setIsDirty(false);
      setSaveStatus("Member skipped for this task.");
      return true;
    } catch (error) {
      setSaveStatus(error instanceof Error ? `Save failed: ${error.message}` : "Save failed.");
      return false;
    } finally {
      setIsSaving(false);
    }
  }

  async function unskipTaskMember(task: StudioTask, memberId: string) {
    if (!adminPassword) {
      setSaveStatus("Log in as admin again before saving.");
      return false;
    }
    if (!memberId) return false;

    setIsSaving(true);
    setSaveStatus("Syncing data...");
    try {
      const nextData = await postAdminMutation(adminPassword, "unskipTaskMember", {
        taskId: task.id,
        memberId,
      });
      setData(nextData);
      setIsDirty(false);
      setSaveStatus("Member assignment restored.");
      return true;
    } catch (error) {
      setSaveStatus(error instanceof Error ? `Save failed: ${error.message}` : "Save failed.");
      return false;
    } finally {
      setIsSaving(false);
    }
  }

  async function addProgressUpdate(task: StudioTask, memberId: string, note: string) {
    if (!adminPassword) {
      setSaveStatus("Log in as admin again before saving.");
      return false;
    }
    const cleanNote = note.trim();
    if (!memberId || !cleanNote) return false;

    setIsSaving(true);
    setSaveStatus("Syncing data...");
    try {
      const nextData = await postAdminMutation(adminPassword, "addProgressUpdate", {
        taskId: task.id,
        memberId,
        note: cleanNote,
      });
      setData(nextData);
      setIsDirty(false);
      setSaveStatus("Progress saved to GitHub.");
      return true;
    } catch (error) {
      setSaveStatus(
        error instanceof Error ? `Save failed: ${error.message}` : "Save failed. Nothing was approved.",
      );
      return false;
    } finally {
      setIsSaving(false);
    }
  }

  function saveQueuedProgress(item: QueuedProgressUpdate) {
    const update: TaskProgressUpdate = {
      id: item.id,
      taskId: item.taskId,
      memberId: item.memberId,
      memberName: item.memberName,
      note: item.note,
      createdAt: item.createdAt,
    };

    updateData((current) => ({
      ...current,
      progressUpdates: {
        ...(current.progressUpdates ?? {}),
        [item.taskId]: [update, ...((current.progressUpdates ?? {})[item.taskId] ?? [])],
      },
    }));
    removeQueuedProgress(item.id);
    return true;
  }

  function updateMember(memberId: string, updates: Partial<Member>) {
    updateData((current) => ({
      ...current,
      members: current.members.map((member) =>
        member.id === memberId ? { ...member, ...updates } : member,
      ),
    }));
  }

  function updateSettings(settings: Partial<StudioSettings>) {
    updateData((current) => ({
      ...current,
      settings: { ...(current.settings ?? DEFAULT_SETTINGS), ...settings },
    }));
  }

  function addRepoUpdate(memberId: string) {
    const update: RepoUpdate = {
      id: `repo-${Date.now()}`,
      memberId,
      createdAt: new Date().toISOString(),
      seen: false,
    };

    updateData((current) => ({
      ...current,
      repoUpdates: [update, ...(current.repoUpdates ?? [])],
    }));
    setRefreshStatus("اتسجل تنبيه الريبو. لازم الأدمن يحفظ GitHub عشان يظهر على جهاز تاني.");
  }

  async function markRepoUpdateSeen(updateId: string) {
    if (!adminPassword) {
      setSaveStatus("Log in as admin again before saving.");
      return false;
    }

    setIsSaving(true);
    setSaveStatus("Marking repo update done...");
    try {
      const nextData = await postAdminMutation(adminPassword, "markRepoUpdateSeen", { updateId });
      setData(nextData);
      setIsDirty(false);
      setSaveStatus("Repo update marked done.");
      return true;
    } catch (error) {
      setSaveStatus(error instanceof Error ? `Save failed: ${error.message}` : "Save failed.");
      return false;
    } finally {
      setIsSaving(false);
    }
  }

  async function reviewProfileRequest(requestId: string, status: "approved" | "rejected") {
    if (!adminPassword) {
      setSaveStatus("Log in as admin again before saving.");
      return false;
    }

    setIsSaving(true);
    setSaveStatus("Saving profile request decision...");
    try {
      const nextData = await postAdminMutation(adminPassword, "reviewProfileRequest", {
        requestId,
        status,
      });
      setData(nextData);
      setIsDirty(false);
      setSaveStatus(status === "approved" ? "Profile request approved." : "Profile request rejected.");
      return true;
    } catch (error) {
      setSaveStatus(error instanceof Error ? `Save failed: ${error.message}` : "Save failed.");
      return false;
    } finally {
      setIsSaving(false);
    }
  }

  async function saveToGithub(tokenOverride?: string) {
    const token = (tokenOverride ?? githubToken).trim();
    if (!token) {
      setTokenDraft("");
      setTokenDialogOpen(true);
      setSaveStatus("محتاج GitHub token أول مرة عشان أحفظ.");
      return;
    }

    setIsSaving(true);
    setSaveStatus("جاري الحفظ على GitHub...");
    try {
      const nextData = sanitizeData({ ...data, meta: { updatedAt: new Date().toISOString() } });

      for (const path of GITHUB_DATA_PATHS) {
        const apiUrl = `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents/${path}`;
        const currentResponse = await fetch(`${apiUrl}?ref=${GITHUB_BRANCH}`, {
          headers: {
            Accept: "application/vnd.github+json",
            Authorization: `Bearer ${token}`,
          },
        });
        if (!currentResponse.ok) throw new Error(`مش قادر أقرأ ${path} من GitHub.`);
        const currentFile = (await currentResponse.json()) as { sha: string };
        const saveResponse = await fetch(apiUrl, {
          method: "PUT",
          headers: {
            Accept: "application/vnd.github+json",
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            message: `Update Hivo Studio data in ${path}`,
            content: encodeBase64(`${JSON.stringify(nextData, null, 2)}\n`),
            sha: currentFile.sha,
            branch: GITHUB_BRANCH,
          }),
        });
        if (!saveResponse.ok) throw new Error(`GitHub رفض حفظ ${path}. راجع صلاحيات التوكن.`);
      }

      setGithubToken(token);
      window.localStorage.setItem(GITHUB_TOKEN_KEY, token);
      setTokenDraft("");
      setTokenDialogOpen(false);
      setData(nextData);
      setIsDirty(false);
      setSaveStatus("تم الحفظ. التحديث هيظهر للفريق بعد refresh بسيط.");
    } catch (error) {
      setGithubToken("");
      window.localStorage.removeItem(GITHUB_TOKEN_KEY);
      setTokenDialogOpen(true);
      setSaveStatus(
        error instanceof Error
          ? `${error.message} اكتب التوكن مرة تانية.`
          : "حصل خطأ أثناء الحفظ. اكتب التوكن مرة تانية.",
      );
    } finally {
      setIsSaving(false);
    }
  }

  function confirmTokenAndSave() {
    const nextToken = tokenDraft.trim();
    if (!nextToken) {
      setSaveStatus("اكتب GitHub token الأول.");
      return;
    }
    void saveToGithub(nextToken);
  }

  if (activeAdmin) {
    return (
      <AdminView
        data={data}
        stats={stats}
        saveStatus={saveStatus}
        isDirty={isDirty}
        isSaving={isSaving}
        adminQueue={adminQueue}
        queueStatus={queueStatus}
        tokenDialogOpen={tokenDialogOpen}
        tokenDraft={tokenDraft}
        onLogout={logout}
        onAddTask={addTask}
        onUpdateTask={updateTask}
        onAddMeeting={addMeeting}
        onUpdateMeeting={updateMeeting}
        onRecordMeetingAttendance={recordMeetingAttendance}
        onRemoveTask={removeTask}
        onManualApprove={manualApprove}
        onSkipTaskMember={skipTaskMember}
        onUnskipTaskMember={unskipTaskMember}
        onApproveQueuedSubmission={approveQueuedSubmission}
        onRejectQueuedSubmission={rejectQueuedSubmission}
        onSaveQueuedProgress={saveQueuedProgress}
        onDismissQueuedProgress={removeQueuedProgress}
        onAddProgressUpdate={addProgressUpdate}
        onReviewAnswer={reviewAnswer}
        onUpdateMember={updateMember}
        onUpdateSettings={updateSettings}
        onMarkRepoUpdateSeen={markRepoUpdateSeen}
        onReviewProfileRequest={reviewProfileRequest}
        onRefreshAdminQueue={refreshAdminQueue}
        onTokenDraftChange={setTokenDraft}
        onCloseTokenDialog={() => setTokenDialogOpen(false)}
        onConfirmTokenAndSave={confirmTokenAndSave}
        onSaveToGithub={() => void saveCurrentData()}
      />
    );
  }

  if (activeStats) {
    return <StatsView data={data} stats={stats} onLogout={logout} />;
  }

  if (activeMember) {
    return (
      <MemberView
        data={data}
        activeMember={activeMember}
        stats={stats}
        draftAnswers={draftAnswers}
        sentState={sentState}
        refreshStatus={refreshStatus}
        isSubmitting={isSubmitting}
        onDraftChange={(key, value) => {
          setDraftAnswers((current) => {
            const next = { ...current, [key]: value };
            writeMemberDrafts(next);
            return next;
          });
        }}
        onSubmitFinal={submitFinalSubmission}
        onSubmitProgress={submitProgressUpdate}
        onRepoAttention={sendRepoAttention}
        onDriveAttention={sendDriveAttention}
        onProfileChangeRequest={submitProfileChangeRequest}
        onLogout={logout}
        onRefreshData={refreshData}
      />
    );
  }

  return (
    <LoginScreen
      data={data}
      onMemberLogin={loginMember}
      onAdminLogin={loginAdmin}
      onStatsLogin={loginStats}
    />
  );
}
