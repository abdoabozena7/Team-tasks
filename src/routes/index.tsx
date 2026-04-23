import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { ChevronDown } from "lucide-react";

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
  emoji: string;
  color: string;
  highlight: string;
  tilt: string;
  sections: { title: string; items: (string | { sub: string; items: string[] })[] }[];
  note?: { title: string; body: string };
};

const members: Member[] = [
  {
    name: "Abozena",
    role: "Project Lead + Integration",
    emoji: "🧭",
    color: "#49B6E5",
    highlight: "highlight-blue",
    tilt: "tilt-left",
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
    emoji: "📡",
    color: "#F59E0B",
    highlight: "highlight-yellow",
    tilt: "tilt-right",
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
    emoji: "⚡",
    color: "#16A34A",
    highlight: "highlight-yellow",
    tilt: "tilt-left",
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
    emoji: "🧼",
    color: "#0EA5E9",
    highlight: "highlight-blue",
    tilt: "tilt-right",
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
    emoji: "🧠",
    color: "#A855F7",
    highlight: "highlight-pink",
    tilt: "tilt-left",
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
    emoji: "🕵️",
    color: "#DC2626",
    highlight: "highlight-pink",
    tilt: "tilt-right",
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
    emoji: "📊",
    color: "#F97316",
    highlight: "highlight-yellow",
    tilt: "tilt-left",
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

// Hand-drawn squiggle SVG divider
function Squiggle({ color = "#1a1a1a" }: { color?: string }) {
  return (
    <svg viewBox="0 0 200 12" className="w-full h-3" preserveAspectRatio="none">
      <path
        d="M 2 6 Q 15 1, 28 6 T 54 6 T 80 6 T 106 6 T 132 6 T 158 6 T 184 6 T 198 6"
        stroke={color}
        strokeWidth="2"
        fill="none"
        strokeLinecap="round"
      />
    </svg>
  );
}

function renderItems(items: (string | { sub: string; items: string[] })[], color: string) {
  return (
    <ul className="space-y-2.5">
      {items.map((it, i) =>
        typeof it === "string" ? (
          <li key={i} className="flex gap-2.5 text-foreground leading-[1.85] text-[17px]">
            <span className="shrink-0 mt-1.5 text-lg" style={{ color }}>✎</span>
            <span>{it}</span>
          </li>
        ) : (
          <li key={i} className="space-y-2">
            <div className="font-bold text-foreground text-[18px]">↳ {it.sub}</div>
            <ul className="space-y-1.5 ps-5 ms-1" style={{ borderInlineStart: `2px dashed ${color}` }}>
              {it.items.map((sub, j) => (
                <li key={j} className="flex gap-2 text-foreground/80 ps-2 text-[16px]">
                  <span style={{ color }}>○</span>
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
  return (
    <div className={`relative ${!open ? member.tilt : ""} transition-transform duration-300`}>
      {/* Number badge */}
      <div
        className="absolute -top-3 -start-3 z-10 grid place-items-center w-11 h-11 rounded-full bg-paper border-[2.5px] border-ink doodle-shadow-sm font-bold text-xl"
        style={{ color: member.color, transform: "rotate(-8deg)" }}
      >
        {index + 1}
      </div>

      <div
        className="doodle-border bg-card doodle-shadow overflow-hidden"
        style={open ? { boxShadow: `5px 5px 0 0 ${member.color}` } : undefined}
      >
        <button onClick={onToggle} className="w-full flex items-center gap-4 p-5 ps-7 text-start" aria-expanded={open}>
          <div
            className="shrink-0 grid place-items-center w-14 h-14 text-3xl border-[2.5px] border-ink"
            style={{
              background: member.color,
              borderRadius: "16px 22px 14px 20px / 20px 14px 22px 16px",
              transform: "rotate(-3deg)",
            }}
          >
            {member.emoji}
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-2xl font-bold text-foreground leading-tight">
              <span className={member.highlight}>{member.name}</span>
            </h3>
            <p className="text-base text-muted-foreground mt-1" style={{ fontFamily: "Caveat, cursive" }}>
              {member.role}
            </p>
          </div>
          <div
            className="shrink-0 grid place-items-center w-10 h-10 border-[2.5px] border-ink bg-paper"
            style={{
              borderRadius: "12px 16px 10px 14px / 14px 10px 16px 12px",
              transform: open ? "rotate(180deg)" : "rotate(0deg)",
              transition: "transform 0.3s ease",
            }}
          >
            <ChevronDown className="w-5 h-5" strokeWidth={2.5} />
          </div>
        </button>

        <div
          className={`grid transition-all duration-300 ease-out ${
            open ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
          }`}
        >
          <div className="overflow-hidden">
            <div className="px-6 pb-6 pt-2">
              <Squiggle color={member.color} />
              <div className="space-y-6 pt-5">
                {member.sections.map((s, i) => (
                  <div key={i} className="space-y-3">
                    <h4
                      className="inline-block text-lg font-bold px-3 py-1 border-[2px] border-ink doodle-shadow-sm"
                      style={{
                        background: member.color,
                        color: "#fff",
                        borderRadius: "10px 14px 8px 12px / 12px 8px 14px 10px",
                        transform: i % 2 === 0 ? "rotate(-1deg)" : "rotate(1deg)",
                      }}
                    >
                      {s.title}
                    </h4>
                    {renderItems(s.items, member.color)}
                  </div>
                ))}
                {member.note && (
                  <div
                    className="relative p-5 mt-2 border-[2.5px] border-ink doodle-shadow-sm"
                    style={{
                      background: "#fef9c3",
                      borderRadius: "16px 22px 14px 20px / 20px 14px 22px 16px",
                      transform: "rotate(-0.5deg)",
                    }}
                  >
                    <div className="text-lg font-bold mb-2 flex items-center gap-2">
                      <span className="text-2xl">⚡</span>
                      <span style={{ fontFamily: "Caveat, cursive" }}>{member.note.title}</span>
                    </div>
                    <p className="text-foreground leading-[1.9] text-[16px]">{member.note.body}</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Index() {
  const [openIdx, setOpenIdx] = useState<number | null>(0);

  return (
    <div className="min-h-screen text-foreground">
      <div className="max-w-3xl mx-auto px-5 py-12 md:py-16">
        {/* Hero */}
        <header className="mb-12 text-center relative">
          {/* Doodle decorations */}
          <div className="absolute -top-4 start-2 text-4xl animate-doodle-bounce" style={{ animationDelay: "0.2s" }}>
            ✏️
          </div>
          <div className="absolute -top-2 end-4 text-4xl animate-doodle-wiggle">⭐</div>

          <div
            className="inline-block px-4 py-1.5 mb-5 border-[2.5px] border-ink bg-card doodle-shadow-sm"
            style={{
              borderRadius: "14px 18px 12px 16px / 16px 12px 18px 14px",
              transform: "rotate(-2deg)",
              fontFamily: "Caveat, cursive",
            }}
          >
            <span className="text-lg">🚀 Real-Time Comment Intelligence</span>
          </div>

          <h1 className="text-5xl md:text-6xl font-bold text-foreground leading-[1.15] mb-4">
            <span className="highlight-yellow">تقسيمة المشروع</span>
            <br />
            <span style={{ fontFamily: "Caveat, cursive" }} className="text-4xl md:text-5xl">
              على <span className="highlight-blue">7 أشخاص</span> 👥
            </span>
          </h1>

          <p
            className="text-xl text-foreground/80 leading-relaxed max-w-xl mx-auto"
            style={{ fontFamily: "Caveat, cursive" }}
          >
            اضغط على أي اسم لعرض المسؤوليات والتاسكات والـ deliverables بالتفصيل ✨
          </p>
        </header>

        {/* Members */}
        <div className="space-y-7">
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
        <footer
          className="mt-14 p-6 border-[2.5px] border-ink bg-card doodle-shadow"
          style={{
            borderRadius: "20px 26px 18px 24px / 24px 18px 26px 20px",
            transform: "rotate(-0.5deg)",
          }}
        >
          <h2
            className="text-2xl font-bold mb-4 text-center"
            style={{ fontFamily: "Caveat, cursive" }}
          >
            <span className="highlight-yellow">🔧 The Pipeline</span>
          </h2>
          <div className="flex flex-wrap items-center justify-center gap-2 text-sm" dir="ltr">
            {["API", "Producer", "Kafka", "Cleaning", "Sentiment", "Detection", "Alerts", "Dashboard"].map(
              (step, i, arr) => (
                <div key={step} className="flex items-center gap-2">
                  <span
                    className="px-3 py-1.5 border-[2px] border-ink bg-paper font-mono text-sm doodle-shadow-sm"
                    style={{
                      borderRadius: "10px 14px 8px 12px / 12px 8px 14px 10px",
                      transform: `rotate(${i % 2 === 0 ? -1.5 : 1.5}deg)`,
                    }}
                  >
                    {step}
                  </span>
                  {i < arr.length - 1 && <span className="text-xl font-bold">→</span>}
                </div>
              )
            )}
          </div>
        </footer>

        <div className="text-center mt-8 text-lg" style={{ fontFamily: "Caveat, cursive" }}>
          <span className="text-foreground/60">made with ✍️ + ☕</span>
        </div>
      </div>
    </div>
  );
}
