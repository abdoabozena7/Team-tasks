import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  Check,
  Download,
  Edit3,
  Lock,
  LogOut,
  Plus,
  RotateCcw,
  Star,
  Trash2,
  X,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

export const Route = createFileRoute("/")({
  component: Index,
  head: () => ({
    meta: [
      { title: "Hivo Studio" },
      { name: "description", content: "Hivo Studio team tasks and idea review board." },
    ],
  }),
});

type Member = {
  id: string;
  name: string;
  aliases: string[];
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

type StudioData = {
  projectName: string;
  members: Member[];
  tasks: StudioTask[];
  responses: Record<string, Record<string, TaskResponse>>;
  meta: { updatedAt: string };
};

const EDIT_PASSWORD = "team-edit-2026";
const STORAGE_KEY = "hivo-studio-data-v2";
const ACTIVE_MEMBER_KEY = "hivo-studio-active-member";
const DEFAULT_DATA: StudioData = {
  projectName: "Hivo Studio",
  members: [],
  tasks: [],
  responses: {},
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

function findMemberByName(name: string, members: Member[]) {
  const normalized = normalizeName(name);
  if (!normalized) return undefined;

  return members.find((member) =>
    [member.name, ...member.aliases].some((alias) => normalizeName(alias) === normalized),
  );
}

function taskIsForMember(task: StudioTask, memberId: string) {
  return task.scope === "all" || task.memberId === memberId;
}

function responseKey(taskId: string, memberId: string) {
  return `${taskId}:${memberId}`;
}

function getResponse(data: StudioData, taskId: string, memberId: string) {
  return data.responses[taskId]?.[memberId];
}

function LoginScreen({
  members,
  onLogin,
}: {
  members: Member[];
  onLogin: (member: Member) => void;
}) {
  const [name, setName] = useState("");
  const [error, setError] = useState("");

  function submitName() {
    const member = findMemberByName(name, members);
    if (!member) {
      setError("الاسم مش واضح عندي. اكتبه عربي أو إنجليزي زي اسمك في التيم.");
      return;
    }

    window.localStorage.setItem(ACTIVE_MEMBER_KEY, member.id);
    onLogin(member);
  }

  return (
    <div className="min-h-screen text-foreground" dir="rtl">
      <main className="mx-auto flex min-h-screen max-w-lg flex-col items-center justify-center px-5 py-12">
        <section
          className="w-full border-[2.5px] border-ink bg-card p-6 text-center doodle-shadow"
          style={{ borderRadius: "22px 28px 18px 26px / 24px 18px 28px 20px" }}
        >
          <img
            src={`${import.meta.env.BASE_URL}hivo.png`}
            alt="Hivo Studio logo"
            className="mx-auto mb-4 size-28 rounded-full border-[2.5px] border-ink object-cover doodle-shadow-sm"
          />
          <h1 className="mb-2 text-5xl font-bold leading-tight">
            <span className="highlight-yellow">Hivo Studio</span>
          </h1>
          <p className="mx-auto mb-5 max-w-sm text-lg text-foreground/75">
            اكتب اسمك الأول. أي إجابة أو اعتماد بعد كده هيتحسب على الاسم ده.
          </p>
          <div className="flex flex-col gap-3">
            <Input
              value={name}
              onChange={(event) => setName(event.target.value)}
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

function Index() {
  const [data, setData] = useState<StudioData>(DEFAULT_DATA);
  const [activeMember, setActiveMember] = useState<Member | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [password, setPassword] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [taskTitle, setTaskTitle] = useState("");
  const [taskQuestion, setTaskQuestion] = useState("");
  const [taskPoints, setTaskPoints] = useState(1);
  const [taskScope, setTaskScope] = useState<"all" | "member">("all");
  const [taskMemberId, setTaskMemberId] = useState("");
  const [manualApproveMembers, setManualApproveMembers] = useState<Record<string, string>>({});
  const [draftAnswers, setDraftAnswers] = useState<Record<string, string>>({});
  const [jsonDraft, setJsonDraft] = useState("");

  useEffect(() => {
    let mounted = true;

    async function loadData() {
      const saved = window.localStorage.getItem(STORAGE_KEY);
      const initialData = saved
        ? (JSON.parse(saved) as StudioData)
        : ((await (await fetch(`${import.meta.env.BASE_URL}team-data.json`)).json()) as StudioData);

      if (!mounted) return;
      setData(initialData);

      const activeMemberId = window.localStorage.getItem(ACTIVE_MEMBER_KEY);
      const savedMember = initialData.members.find((member) => member.id === activeMemberId);
      if (savedMember) setActiveMember(savedMember);
    }

    loadData().catch(() => {
      if (mounted) setData(DEFAULT_DATA);
    });

    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (data.members.length > 0) {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
      setJsonDraft(JSON.stringify(data, null, 2));
    }
  }, [data]);

  const memberTasks = useMemo(() => {
    if (!activeMember) return [];
    return data.tasks.filter((task) => taskIsForMember(task, activeMember.id));
  }, [activeMember, data.tasks]);

  const stats = useMemo(() => {
    const memberStats = data.members.map((member) => {
      const approvedTasks = data.tasks.filter(
        (task) => getResponse(data, task.id, member.id)?.status === "approved",
      );
      const points = approvedTasks.reduce((sum, task) => sum + (task.points || 1), 0);

      return { member, approved: approvedTasks.length, points };
    });
    const rankedMembers = [...memberStats].sort((a, b) => b.points - a.points);
    const leader = rankedMembers[0];
    const approvedTotal = memberStats.reduce((sum, item) => sum + item.approved, 0);
    const pointsTotal = memberStats.reduce((sum, item) => sum + item.points, 0);

    return { memberStats: rankedMembers, leader, approvedTotal, pointsTotal };
  }, [data]);

  function updateData(updater: (current: StudioData) => StudioData) {
    setData((current) => ({
      ...updater(current),
      meta: { updatedAt: new Date().toISOString() },
    }));
  }

  function logout() {
    window.localStorage.removeItem(ACTIVE_MEMBER_KEY);
    setActiveMember(null);
  }

  function unlockEdit() {
    if (password !== EDIT_PASSWORD) {
      setPasswordError("الباسورد مش صح.");
      return;
    }

    setPasswordError("");
    setPassword("");
    setEditMode(true);
  }

  function addTask() {
    if (!taskTitle.trim() || !taskQuestion.trim()) return;
    if (taskScope === "member" && !taskMemberId) return;

    updateData((current) => ({
      ...current,
      tasks: [
        ...current.tasks,
        {
          id: `task-${Date.now()}`,
          title: taskTitle.trim(),
          question: taskQuestion.trim(),
          points: Math.max(1, Number.isFinite(taskPoints) ? taskPoints : 1),
          scope: taskScope,
          memberId: taskScope === "member" ? taskMemberId : undefined,
          createdAt: new Date().toISOString(),
        },
      ],
    }));
    setTaskTitle("");
    setTaskQuestion("");
    setTaskPoints(1);
  }

  function removeTask(taskId: string) {
    updateData((current) => {
      const nextResponses = { ...current.responses };
      delete nextResponses[taskId];

      return {
        ...current,
        tasks: current.tasks.filter((task) => task.id !== taskId),
        responses: nextResponses,
      };
    });
  }

  function submitAnswer(task: StudioTask) {
    if (!activeMember) return;
    const key = responseKey(task.id, activeMember.id);
    const answer = draftAnswers[key]?.trim();
    if (!answer) return;

    updateData((current) => ({
      ...current,
      responses: {
        ...current.responses,
        [task.id]: {
          ...(current.responses[task.id] ?? {}),
          [activeMember.id]: {
            memberId: activeMember.id,
            memberName: activeMember.name,
            answer,
            status: "submitted",
            submittedAt: new Date().toISOString(),
          },
        },
      },
    }));
  }

  function reviewAnswer(taskId: string, memberId: string, status: "approved" | "rejected") {
    updateData((current) => {
      const response = current.responses[taskId]?.[memberId];
      if (!response) return current;

      return {
        ...current,
        responses: {
          ...current.responses,
          [taskId]: {
            ...current.responses[taskId],
            [memberId]: {
              ...response,
              status,
              reviewedAt: new Date().toISOString(),
            },
          },
        },
      };
    });
  }

  function manualApprove(task: StudioTask) {
    const memberId = manualApproveMembers[task.id];
    const member = data.members.find((item) => item.id === memberId);
    if (!member) return;

    updateData((current) => ({
      ...current,
      responses: {
        ...current.responses,
        [task.id]: {
          ...(current.responses[task.id] ?? {}),
          [member.id]: {
            memberId: member.id,
            memberName: member.name,
            answer: "تم التسليم خارج الموقع وتم اعتماده يدويًا.",
            status: "approved",
            submittedAt: new Date().toISOString(),
            reviewedAt: new Date().toISOString(),
          },
        },
      },
    }));
  }

  function applyJsonDraft() {
    try {
      setData(JSON.parse(jsonDraft) as StudioData);
      setPasswordError("");
    } catch {
      setPasswordError("الـ JSON فيه مشكلة في الكتابة.");
    }
  }

  function downloadJson() {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "team-data.json";
    link.click();
    URL.revokeObjectURL(url);
  }

  if (!activeMember) {
    return <LoginScreen members={data.members} onLogin={setActiveMember} />;
  }

  return (
    <div className="min-h-screen text-foreground" dir="rtl">
      <div className="mx-auto max-w-4xl px-5 py-10 md:py-14">
        <header className="relative mb-10 text-center">
          <img
            src={`${import.meta.env.BASE_URL}hivo.png`}
            alt="Hivo Studio logo"
            className="mx-auto mb-4 size-24 rounded-full border-[2.5px] border-ink object-cover doodle-shadow-sm"
          />
          <div
            className="mb-4 inline-block border-[2.5px] border-ink bg-card px-4 py-1.5 doodle-shadow-sm"
            style={{
              borderRadius: "14px 18px 12px 16px / 16px 12px 18px 14px",
              transform: "rotate(-2deg)",
              fontFamily: "Caveat, cursive",
            }}
          >
            <span className="text-lg">ideas, answers, approvals</span>
          </div>
          <h1 className="mb-3 text-5xl font-bold leading-tight md:text-6xl">
            <span className="highlight-yellow">Hivo Studio</span>
          </h1>
          <p className="mx-auto max-w-xl text-xl leading-relaxed text-foreground/80">
            أهلا {activeMember.name}. جاوب على التاسكات، واللي يتوافق عليه يتحسب لك بالنقط.
          </p>
        </header>

        <section
          className="mb-7 border-[2.5px] border-ink bg-card p-4 doodle-shadow"
          style={{ borderRadius: "18px 22px 16px 24px / 22px 16px 24px 18px" }}
        >
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="font-bold">
              <span className="highlight-blue">
                النقاط: {stats.pointsTotal} | المعتمد: {stats.approvedTotal} | التاسكات:{" "}
                {data.tasks.length}
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={logout}
                className="border-[2px] border-ink bg-paper doodle-shadow-sm"
              >
                <LogOut data-icon="inline-start" />
                تغيير الاسم
              </Button>
              {!editMode ? (
                <>
                  <Input
                    type="password"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") unlockEdit();
                    }}
                    placeholder="باسورد التعديل"
                    className="w-40 border-[2px] border-ink bg-paper"
                  />
                  <Button
                    type="button"
                    onClick={unlockEdit}
                    className="border-[2px] border-ink doodle-shadow-sm"
                  >
                    <Lock data-icon="inline-start" />
                    edit
                  </Button>
                </>
              ) : (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setEditMode(false)}
                  className="border-[2px] border-ink bg-paper doodle-shadow-sm"
                >
                  <X data-icon="inline-start" />
                  قفل التعديل
                </Button>
              )}
            </div>
          </div>
          {passwordError && <p className="mt-2 text-sm text-destructive">{passwordError}</p>}
        </section>

        <section
          className="mb-7 border-[2.5px] border-ink bg-card p-5 doodle-shadow"
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
                  : "لسه مفيش إجابات معتمدة"}
              </span>
            </div>
          </div>
          <div className="grid gap-2 md:grid-cols-2">
            {stats.memberStats.map((item, index) => (
              <div
                key={item.member.id}
                className="flex items-center gap-3 border-[2px] border-ink bg-paper px-3 py-2 doodle-shadow-sm"
                style={{ borderRadius: "12px 16px 10px 14px / 14px 10px 16px 12px" }}
              >
                <span className="grid size-8 shrink-0 place-items-center rounded-full border-[2px] border-ink bg-card font-bold">
                  {index + 1}
                </span>
                <span className="min-w-0 flex-1 truncate font-bold">{item.member.name}</span>
                <span className="text-sm text-foreground/70">
                  {item.points} pts / {item.approved} approved
                </span>
              </div>
            ))}
          </div>
        </section>

        <section className="flex flex-col gap-5">
          {memberTasks.length === 0 ? (
            <div
              className="border-[2.5px] border-ink bg-card p-8 text-center doodle-shadow"
              style={{ borderRadius: "20px 26px 18px 24px / 24px 18px 26px 20px" }}
            >
              <p className="text-2xl font-bold">
                <span className="highlight-yellow">لسه مفيش تاسكات</span>
              </p>
              <p className="mt-2 text-foreground/70">
                أول ما تنزل تاسك عام أو تاسك باسمك هيظهر هنا.
              </p>
            </div>
          ) : (
            memberTasks.map((task) => {
              const existing = getResponse(data, task.id, activeMember.id);
              const key = responseKey(task.id, activeMember.id);
              const canAnswer = !existing || existing.status === "rejected";

              return (
                <article
                  key={task.id}
                  className="border-[2.5px] border-ink bg-card p-5 doodle-shadow"
                  style={{ borderRadius: "18px 22px 16px 24px / 22px 16px 24px 18px" }}
                >
                  <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <h2 className="text-2xl font-bold">{task.title}</h2>
                      <p className="mt-1 text-sm text-foreground/60">
                        {task.scope === "all" ? "تاسك عام لكل التيم" : "تاسك مخصص"} •{" "}
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
                  </div>
                  <p className="mb-4 text-[17px] leading-[1.8]">{task.question}</p>
                  <Textarea
                    value={draftAnswers[key] ?? existing?.answer ?? ""}
                    onChange={(event) =>
                      setDraftAnswers((current) => ({ ...current, [key]: event.target.value }))
                    }
                    disabled={!canAnswer}
                    placeholder="اكتب إجابتك هنا..."
                    className="min-h-32 border-[2px] border-ink bg-paper text-base"
                  />
                  <Button
                    type="button"
                    onClick={() => submitAnswer(task)}
                    disabled={!canAnswer}
                    className="mt-3 border-[2px] border-ink doodle-shadow-sm"
                  >
                    <Check data-icon="inline-start" />
                    إرسال الإجابة
                  </Button>
                </article>
              );
            })
          )}
        </section>

        {editMode && (
          <section
            className="mt-8 border-[2.5px] border-ink bg-card p-5 doodle-shadow"
            style={{ borderRadius: "20px 26px 18px 24px / 24px 18px 26px 20px" }}
          >
            <h2 className="mb-4 flex items-center gap-2 text-2xl font-bold">
              <Edit3 data-icon="inline-start" />
              إدارة التاسكات والمراجعة
            </h2>
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
              onClick={addTask}
              className="mt-3 border-[2px] border-ink doodle-shadow-sm"
            >
              <Plus data-icon="inline-start" />
              إضافة تاسك
            </Button>

            <div className="mt-6 flex flex-col gap-4">
              {data.tasks.map((task) => {
                const responses = Object.values(data.responses[task.id] ?? {});

                return (
                  <div
                    key={task.id}
                    className="border-[2px] border-ink bg-paper p-4 doodle-shadow-sm"
                    style={{ borderRadius: "14px 18px 12px 16px / 16px 12px 18px 14px" }}
                  >
                    <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <h3 className="text-xl font-bold">{task.title}</h3>
                        <p className="text-sm text-foreground/60">
                          {task.scope === "all"
                            ? "عام"
                            : `مخصص لـ ${
                                data.members.find((member) => member.id === task.memberId)?.name
                              }`}{" "}
                          • {task.points || 1} points
                        </p>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => removeTask(task.id)}
                        className="border-[2px] border-ink bg-card"
                        aria-label="حذف التاسك"
                      >
                        <Trash2 data-icon="inline-start" />
                      </Button>
                    </div>

                    <div className="mb-3 flex flex-wrap items-center gap-2 border-[2px] border-ink bg-card p-3">
                      <Star data-icon="inline-start" />
                      <select
                        value={manualApproveMembers[task.id] ?? ""}
                        onChange={(event) =>
                          setManualApproveMembers((current) => ({
                            ...current,
                            [task.id]: event.target.value,
                          }))
                        }
                        className="h-10 min-w-44 rounded-md border-[2px] border-ink bg-paper px-3 text-base"
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
                        onClick={() => manualApprove(task)}
                        className="border-[2px] border-ink doodle-shadow-sm"
                      >
                        <Check data-icon="inline-start" />
                        اعتماد واتساب
                      </Button>
                    </div>

                    {responses.length === 0 ? (
                      <p className="text-sm text-foreground/60">لسه مفيش إجابات.</p>
                    ) : (
                      <div className="flex flex-col gap-3">
                        {responses.map((response) => (
                          <div
                            key={response.memberId}
                            className="border-[2px] border-ink bg-card p-3"
                          >
                            <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                              <strong>{response.memberName}</strong>
                              <span className="text-sm text-foreground/60">{response.status}</span>
                            </div>
                            <p className="whitespace-pre-wrap leading-[1.8]">{response.answer}</p>
                            <div className="mt-3 flex flex-wrap gap-2">
                              <Button
                                type="button"
                                onClick={() => reviewAnswer(task.id, response.memberId, "approved")}
                                className="border-[2px] border-ink doodle-shadow-sm"
                              >
                                <Check data-icon="inline-start" />
                                قبول
                              </Button>
                              <Button
                                type="button"
                                variant="outline"
                                onClick={() => reviewAnswer(task.id, response.memberId, "rejected")}
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
                  </div>
                );
              })}
            </div>

            <div className="mt-6 flex flex-wrap gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={downloadJson}
                className="border-[2px] border-ink bg-paper doodle-shadow-sm"
              >
                <Download data-icon="inline-start" />
                تنزيل JSON
              </Button>
              <Button
                type="button"
                variant="secondary"
                onClick={applyJsonDraft}
                className="border-[2px] border-ink doodle-shadow-sm"
              >
                حفظ من JSON
              </Button>
            </div>
            <Textarea
              value={jsonDraft}
              onChange={(event) => setJsonDraft(event.target.value)}
              className="mt-3 min-h-60 border-[2px] border-ink bg-paper font-mono text-xs"
              dir="ltr"
            />
          </section>
        )}
      </div>
    </div>
  );
}
