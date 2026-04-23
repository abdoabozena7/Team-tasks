import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { ChevronDown, Activity, Database, Radio, Sparkles, Brain, ShieldAlert, LayoutDashboard } from "lucide-react";

export const Route = createFileRoute("/")({
  component: Index,
  head: () => ({
    meta: [
      { title: "تقسيمة المشروع — Real-Time Comment Intelligence" },
      { name: "description", content: "تقسيمة المشروع على 7 أشخاص مع كل التفاصيل والتاسكات." },
    ],
  }),
});

type Member = {
  name: string;
  role: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  sections: { title: string; items: (string | { sub: string; items: string[] })[] }[];
  note?: { title: string; body: string };
};

const members: Member[] = [
  {
    name: "Abozena",
    role: "Project Lead + Integration",
    icon: Activity,
    color: "oklch(0.78 0.16 200)",
    sections: [
      { title: "دوره", items: ["الشخص اللي ماسك الصورة الكاملة وبيجمع كل الأجزاء مع بعض"] },
      {
        title: "مسؤولياته",
        items: [
          "تحديد الشكل النهائي للـ architecture",
          "تحديد الـ Kafka topics",
          "تنظيم الـ workflow بين التيم",
          "متابعة الـ integration بين modules",
          "توثيق الـ pipeline كاملة",
          "تجهيز سيناريو الديمو النهائي",
        ],
      },
      {
        title: "التاسكات",
        items: [
          "رسم Architecture Diagram",
          {
            sub: "تحديد flow زي:",
            items: [
              "API/Data Source → Producer",
              "Kafka → Consumer",
              "Cleaning",
              "Sentiment",
              "Fake/Spam Detection",
              "Alerts",
              "Dashboard",
            ],
          },
          {
            sub: "تحديد أسماء الـ topics:",
            items: ["raw-comments", "cleaned-comments", "sentiment-results", "suspicious-comments", "alerts"],
          },
          "تحديد format موحد للـ message JSON",
        ],
      },
      {
        title: "الـ Deliverables",
        items: [
          "Architecture diagram",
          "Data flow diagram",
          "JSON schema موحد",
          "Final integration plan",
          "عرض المشروع النهائي مع باقي التيم",
        ],
      },
    ],
  },
  {
    name: "Mariam Helal",
    role: "Data Collection / API Engineer",
    icon: Database,
    color: "oklch(0.78 0.16 80)",
    sections: [
      { title: "دوره", items: ["مسؤول عن سحب التعليقات من الـ API الجاهز أو عمل simulated stream"] },
      {
        title: "مسؤولياته",
        items: [
          "اختيار الـ source",
          "ربط المشروع بالـ API",
          "تجهيز comment producer يدخل البيانات على Kafka",
          "التعامل مع rate limits و format البيانات",
        ],
      },
      {
        title: "التاسكات",
        items: [
          { sub: "يحدد API مناسب:", items: ["YouTube API", "Reddit API", "أو dataset + simulation لو API صعب"] },
          { sub: "يسحب الحقول المهمة:", items: ["comment text", "author/user id", "timestamp", "source/post id"] },
          { sub: "يعمل Producer يبعت التعليقات على topic:", items: ["raw-comments"] },
          "لو الـ API مش real-time قوي، يعمل script يحاكي stream بشكل تدريجي",
        ],
      },
      {
        title: "الـ Deliverables",
        items: [
          "Script/API module لجلب البيانات",
          "Kafka producer شغال",
          "sample streamed comments",
          "شرح ليه اختار المصدر ده",
        ],
      },
    ],
    note: {
      title: "ملاحظة مهمة",
      body: "هنا تبرير قوي جدًا للدكتور: إحنا مش بنعمل scraping عشوائي، إحنا بنستخدم API رسمي/جاهز علشان نجيب data موثوقة، ونركز مجهودنا على الـ real-time processing والتحليل الذكي، وده جوهر المشروع.",
    },
  },
  {
    name: "Renad",
    role: "Kafka & Streaming Engineer",
    icon: Radio,
    color: "oklch(0.75 0.18 145)",
    sections: [
      { title: "دوره", items: ["مسؤول عن الجزء اللي يثبت إن المشروع فعلًا real-time ومستخدم Kafka صح"] },
      {
        title: "مسؤولياته",
        items: ["إعداد Kafka", "إنشاء الـ topics", "بناء producers/consumers", "التأكد إن كل stage مفصولة عن التانية"],
      },
      {
        title: "التاسكات",
        items: [
          "Setup Kafka locally أو Docker",
          "إنشاء topics",
          "عمل consumers لكل مرحلة",
          "ربط الموديولات ببعض",
          "اختبار throughput بشكل بسيط",
          "التأكد إن الـ pipeline شغالة end-to-end",
        ],
      },
      {
        title: "الـ Deliverables",
        items: ["Kafka setup guide", "topics configured", "producer/consumer scripts", "demo يوضح data بتتنقل live"],
      },
    ],
    note: {
      title: "أهم نقطة في العرض",
      body: "الشخص ده لازم يوضح إن Kafka هنا مش مجرد إضافة: بيفصل المراحل عن بعض، بيسمح real-time streaming، scalable، يسهّل alerts والدashboard live. وده مهم جدًا عشان الدكتور ميقولش \"ليه Kafka؟\"",
    },
  },
  {
    name: "Kero",
    role: "Data Cleaning & Preprocessing",
    icon: Sparkles,
    color: "oklch(0.78 0.14 230)",
    sections: [
      { title: "دوره", items: ["تنظيف التعليقات وتجهيزها قبل أي تحليل"] },
      {
        title: "مسؤولياته",
        items: ["تنظيف النصوص", "توحيد الـ format", "إزالة noise", "تجهيز comments صالحة للتحليل"],
      },
      {
        title: "التاسكات",
        items: [
          { sub: "إزالة:", items: ["URLs", "mentions", "extra spaces", "special characters غير المهمة"] },
          "lowercase / normalization",
          { sub: "optional:", items: ["emoji handling", "Arabic/English mixed text normalization لو موجود"] },
          { sub: "إرسال الناتج إلى:", items: ["cleaned-comments"] },
        ],
      },
      {
        title: "الـ Deliverables",
        items: [
          "preprocessing module",
          "before/after examples",
          "rules واضحة للتنظيف",
          "consumer من raw-comments و producer لـ cleaned-comments",
        ],
      },
    ],
    note: {
      title: "لازم يخلي باله من حاجة",
      body: "ماينفعش التنظيف يبقى aggressive زيادة، عشان ميبوظش معنى التعليق قبل الـ sentiment analysis.",
    },
  },
  {
    name: "Mohamed",
    role: "Sentiment Analysis Engineer",
    icon: Brain,
    color: "oklch(0.72 0.18 290)",
    sections: [
      { title: "دوره", items: ["مسؤول عن تحليل المشاعر للتعليقات"] },
      {
        title: "مسؤولياته",
        items: [
          "تشغيل sentiment model أو API جاهز",
          "استخراج label لكل comment",
          "حساب raw sentiment و trusted sentiment بعد الفلترة",
        ],
      },
      {
        title: "التاسكات",
        items: [
          { sub: "اختيار الطريقة:", items: ["API جاهز", "model جاهز من Hugging Face", "TextBlob/VADER لو English"] },
          { sub: "تصنيف كل تعليق:", items: ["Positive", "Negative", "Neutral"] },
          { sub: "حفظ النتائج في topic:", items: ["sentiment-results"] },
          { sub: "حساب إحصائيات:", items: ["نسبة الإيجابي/السلبي/المحايد", "raw sentiment", "filtered sentiment"] },
        ],
      },
      {
        title: "الـ Deliverables",
        items: [
          "sentiment analysis module",
          "مقارنة بين input و output",
          "sentiment aggregation logic",
          "charts/data ready للـ dashboard",
        ],
      },
    ],
    note: {
      title: "نقطة مهمة",
      body: "بما إنك قلتوا مش محتاجين تعملوا embeddings بنفسكم، فالشخص ده يشتغل على model/API جاهز بدل ما يضيّع وقت في training.",
    },
  },
  {
    name: "Basmala",
    role: "Suspicious / Fake Comment Detection",
    icon: ShieldAlert,
    color: "oklch(0.7 0.2 350)",
    sections: [
      { title: "دوره", items: ["أهم جزء مميز في المشروع: اكتشاف التعليقات المشبوهة"] },
      {
        title: "مسؤولياته",
        items: [
          "تصميم suspicious score",
          "كشف التكرار والتشابه والانفجارات الزمنية",
          "تحديد التعليقات اللي غالبًا spam/fake/coordinated",
        ],
      },
      {
        title: "التاسكات — يبني rules/features زي:",
        items: [
          { sub: "A) Repetition", items: ["نفس التعليق اتكرر كام مرة"] },
          {
            sub: "B) Similarity",
            items: [
              "تعليقات شبه بعض جدًا",
              "بما إنكم مش هتعملوا embeddings بنفسكم، ممكن تستخدموا:",
              "TF-IDF + cosine similarity",
              "fuzzy matching",
              "sentence similarity tool جاهز",
            ],
          },
          { sub: "C) Timing / Burst Detection", items: ["عدد كبير من التعليقات المتشابهة في وقت قصير"] },
          { sub: "D) Simple spam patterns", items: ["كلمات دعائية مكررة", "links كتير", "صياغة متكررة جدًا"] },
          {
            sub: "E) Final Suspicious Score — مثال:",
            items: [
              "Suspicious Score = 0.4 similarity + 0.3 repetition + 0.2 timing + 0.1 spam signals",
              "وبعدها يحط threshold: لو score > 0.7 → suspicious",
              "ويبعث النتائج على: suspicious-comments",
            ],
          },
        ],
      },
      {
        title: "الـ Deliverables",
        items: [
          "suspicious detection module",
          "score calculation",
          "rules explanation",
          "examples لتعليقات اتحكم عليها وليه",
        ],
      },
    ],
    note: {
      title: "ده أهم شخص في تبرير فكرة المشروع",
      body: "لازم يوضح: إحنا مش بنعمل sentiment analysis وخلاص، إحنا بننضف الرأي العام من الضوضاء والحملات المزيفة، وده بيدي نتيجة أقرب للحقيقة.",
    },
  },
  {
    name: "Malak",
    role: "Dashboard + Alerts + Presentation",
    icon: LayoutDashboard,
    color: "oklch(0.78 0.16 60)",
    sections: [
      { title: "دوره", items: ["واجهة المشروع والجزء اللي هيبان في الديمو"] },
      {
        title: "مسؤولياته",
        items: [
          "بناء dashboard",
          "عرض النتائج live",
          "إظهار الفرق بين raw و filtered",
          "إظهار alerts",
          "مساعدة في تجهيز العرض النهائي",
        ],
      },
      {
        title: "التاسكات",
        items: [
          {
            sub: "يبني Dashboard بـ Streamlit أو Dash تعرض:",
            items: [
              "total comments",
              "suspicious comments %",
              "raw sentiment",
              "trusted sentiment",
              "line chart over time",
              "top repeated comments",
              "recent alerts",
            ],
          },
          {
            sub: "Alerts — مثال:",
            items: [
              "“تم اكتشاف 40 تعليق متشابه خلال 3 دقائق”",
              "“ارتفاع غير طبيعي في positive comments”",
              "“حملة تعليقات مشبوهة محتملة”",
            ],
          },
        ],
      },
      {
        title: "الـ Deliverables",
        items: ["dashboard شغال", "alerts panel", "visual comparison بين قبل وبعد التنقية", "demo-ready interface"],
      },
    ],
  },
];

function renderItems(items: (string | { sub: string; items: string[] })[], color: string) {
  return (
    <ul className="space-y-2.5">
      {items.map((it, i) =>
        typeof it === "string" ? (
          <li key={i} className="flex gap-3 text-foreground/90 leading-[1.9]">
            <span className="mt-3 h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: color }} />
            <span>{it}</span>
          </li>
        ) : (
          <li key={i} className="space-y-2">
            <div className="font-bold text-foreground">{it.sub}</div>
            <ul className="space-y-1.5 ps-4 ms-1 border-s-2 border-border/60">
              {it.items.map((sub, j) => (
                <li key={j} className="flex gap-2 text-foreground/75 ps-2">
                  <span style={{ color }}>›</span>
                  <span>{sub}</span>
                </li>
              ))}
            </ul>
          </li>
        )
      )}
    </ul>
  );
}

function MemberCard({
  member,
  index,
  open,
  onToggle,
}: {
  member: Member;
  index: number;
  open: boolean;
  onToggle: () => void;
}) {
  const Icon = member.icon;
  return (
    <div
      className="rounded-2xl border border-border bg-card transition-colors duration-200"
      style={open ? { borderColor: member.color } : undefined}
    >
      <button onClick={onToggle} className="w-full flex items-center gap-4 p-5 text-start" aria-expanded={open}>
        <div
          className="shrink-0 grid place-items-center w-12 h-12 rounded-xl"
          style={{ background: `color-mix(in oklab, ${member.color} 18%, transparent)`, color: member.color }}
        >
          <Icon className="w-5 h-5" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 text-xs font-mono text-muted-foreground mb-1">
            <span>0{index + 1}</span>
            <span className="opacity-40">/</span>
            <span>07</span>
          </div>
          <h3 className="text-xl font-bold text-foreground leading-tight">{member.name}</h3>
          <p className="text-sm text-muted-foreground mt-0.5">{member.role}</p>
        </div>
        <ChevronDown
          className={`shrink-0 w-5 h-5 text-muted-foreground transition-transform duration-300 ${open ? "rotate-180" : ""}`}
          style={open ? { color: member.color } : undefined}
        />
      </button>

      <div
        className={`grid transition-all duration-300 ease-out ${
          open ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
        }`}
      >
        <div className="overflow-hidden">
          <div className="px-5 pb-6 space-y-6 border-t border-border/60 pt-5">
            {member.sections.map((s, i) => (
              <div key={i} className="space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider" style={{ color: member.color }}>
                  {s.title}
                </h4>
                {renderItems(s.items, member.color)}
              </div>
            ))}
            {member.note && (
              <div
                className="rounded-xl p-4 border-s-4"
                style={{
                  borderInlineStartColor: member.color,
                  background: `color-mix(in oklab, ${member.color} 8%, transparent)`,
                }}
              >
                <div className="text-xs font-bold mb-1.5" style={{ color: member.color }}>
                  ⚡ {member.note.title}
                </div>
                <p className="text-foreground/90 leading-[1.9] text-sm">{member.note.body}</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function Index() {
  const [openIdx, setOpenIdx] = useState<number | null>(0);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="max-w-3xl mx-auto px-5 py-12 md:py-20">
        {/* Hero */}
        <header className="mb-12">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-border text-xs font-mono text-muted-foreground mb-5">
            <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
            Real-Time Comment Intelligence
          </div>
          <h1 className="text-4xl md:text-5xl font-black tracking-tight text-foreground leading-[1.2] mb-3">
            تقسيمة المشروع
            <br />
            <span style={{ color: "oklch(0.78 0.16 200)" }}>على 7 أشخاص</span>
          </h1>
          <p className="text-base text-muted-foreground leading-relaxed">
            اضغط على أي اسم لعرض المسؤوليات والتاسكات والـ deliverables بالتفصيل.
          </p>
        </header>

        {/* Members */}
        <div className="space-y-3">
          {members.map((m, i) => (
            <MemberCard
              key={m.name}
              member={m}
              index={i}
              open={openIdx === i}
              onToggle={() => setOpenIdx(openIdx === i ? null : i)}
            />
          ))}
        </div>

        {/* Pipeline */}
        <footer className="mt-12 rounded-2xl border border-border bg-card p-6">
          <h2 className="text-xs font-mono uppercase tracking-wider text-muted-foreground mb-4">Pipeline</h2>
          <div className="flex flex-wrap items-center gap-2 text-sm" dir="ltr">
            {["API", "Producer", "Kafka", "Cleaning", "Sentiment", "Detection", "Alerts", "Dashboard"].map(
              (step, i, arr) => (
                <div key={step} className="flex items-center gap-2">
                  <span className="px-2.5 py-1 rounded-md bg-muted font-mono text-foreground/80 text-xs">{step}</span>
                  {i < arr.length - 1 && <span className="text-muted-foreground text-xs">→</span>}
                </div>
              )
            )}
          </div>
        </footer>
      </div>
    </div>
  );
}
