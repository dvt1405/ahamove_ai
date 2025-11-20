import { NextRequest, NextResponse } from "next/server";
import { generateImagesViaGemini } from "./gemini";

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

// SVG placeholder (tiếng Việt)
function svgPlaceholder(idx: number, subtitle: string) {
  const colors = ["#FF6A00", "#0B1736", "#FFFFFF"]; // cam, xanh đậm, trắng
  const title = `Ahamove Slide ${idx + 1}`;
  const sub = subtitle.replace(/\s+/g, " ").slice(0, 120) + (subtitle.length > 120 ? "…" : "");
  const svg = `<?xml version='1.0' encoding='UTF-8'?>
  <svg xmlns='http://www.w3.org/2000/svg' width='1080' height='1920' viewBox='0 0 1080 1920'>
    <defs>
      <linearGradient id='g' x1='0' y1='0' x2='1' y2='1'>
        <stop offset='0%' stop-color='${colors[0]}'/>
        <stop offset='100%' stop-color='${colors[1]}'/>
      </linearGradient>
    </defs>
    <rect width='1080' height='1920' fill='url(#g)'/>
    <g font-family='system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif' fill='${colors[2]}'>
      <text x='72' y='160' font-size='64' font-weight='700'>${title}</text>
      <text x='72' y='240' font-size='30' opacity='0.9'>Xem trước (thiếu khóa API)</text>
      <rect x='72' y='320' width='936' height='1280' rx='28' fill='rgba(255,255,255,0.12)' stroke='${colors[2]}' stroke-opacity='0.35'/>
      <text x='100' y='400' font-size='28' opacity='0.95'>${sub}</text>
      <circle cx='900' cy='1640' r='140' fill='${colors[0]}' opacity='0.5'/>
      <path d='M140 1580 C 340 1500, 520 1700, 720 1600' stroke='${colors[2]}' stroke-opacity='0.35' stroke-width='6' fill='none' />
    </g>
  </svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

function makeTemplateStory(i: number): string {
  const templates = [
    "Một năm bứt phá: đơn hoàn thành vững vàng, lộ trình cam – xanh đậm vẽ nên nhịp sống thành phố. Tài xế lướt êm, xu và số liệu nổi bật như cột mốc. Công nghệ thân thiện, ánh sáng mềm, và lời hẹn về tương lai thông minh hơn.",
    "Khoảnh khắc ghép thành đường đi: đúng hẹn từng phút, thời gian dự đoán lấp lánh trên đường chân trời. Thẻ lịch sử mở ra—giao xong, đánh giá, ăn mừng. Thành phố mỉm cười, lối đi phía trước rực sáng bởi gợi ý AI, biến bận rộn thành chiến thắng.",
    "Từ cú chạm đầu tiên đến tiếng chuông cuối: hành trình bừng sáng. Tài xế tin cậy, tốc độ linh hoạt, lộ trình thích ứng. Trong quầng sáng UI tinh tế, năm qua của bạn mở ra—sạch, hiện đại, lạc quan—sẵn sàng cho tương lai do AI dẫn đường.",
  ];
  return templates[i % templates.length];
}

type GenerateRequest = {
  count?: number;
  user?: {
    completedOrders?: number;
    serviceIds?: string[];
    subscriptions?: string[];
    totalSpentVnd?: number;
    dateRange?: string;
  };
};

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json().catch(() => ({}))) as GenerateRequest;
    const count: number = clamp(Number(body?.count ?? 3) || 3, 1, 6);
    const user = body?.user || {};

    const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY;
    const GEMINI_IMAGE_MODEL = process.env.GEMINI_IMAGE_MODEL || "models/imagegeneration"; // có thể đổi theo yêu cầu
    const GEMINI_TEXT_MODEL = process.env.GEMINI_TEXT_MODEL || "gemini-2.5"; // model văn bản

    // Prompt tiếng Việt (ẩn) tổng hợp từ dữ liệu người dùng
    const summarySubtitle = `Đơn: ${user.completedOrders ?? "?"} • Dịch vụ: ${(user.serviceIds || []).join(", ") || "không rõ"} • Gói: ${(user.subscriptions || []).join(", ") || "không rõ"} • Chi tiêu: ${typeof user.totalSpentVnd === "number" ? new Intl.NumberFormat("vi-VN").format(user.totalSpentVnd) + "₫" : "không rõ"} • Thời gian: ${user.dateRange || "12 tháng qua"}`;

    const visualPrompt = [
      "Minh họa phong cách hero cho Ahamove.",
      "Bối cảnh thành phố tươi sáng, ấm áp, dùng màu thương hiệu (cam, trắng, xanh đậm).",
      "Nhấn mạnh hành trình người dùng trong năm qua: đơn hoàn thành, tài xế tin cậy, tốc độ giao hàng.",
      "Thêm yếu tố UI-floating tinh tế (thẻ lịch sử đơn, đường đi giao hàng, xu/coin, số liệu).",
      "Tông: hiện đại, thân thiện, tương lai do AI dẫn dắt (gợi ý thông minh, định tuyến tối ưu, dự đoán thời gian giao).",
      "Chi tiết cao, ánh sáng mềm, sạch sẽ chuyên nghiệp, phù hợp làm slide ứng dụng.",
      `Thông tin người dùng: ${summarySubtitle}.`,
    ].join(" ");

    let images: string[] = [];
    let stories: string[] = [];

    // Thử gọi Gemini; nếu lỗi hoặc thiếu KEY sẽ fallback
    if (GOOGLE_API_KEY) {
      try {
        // Ưu tiên dùng helper generateImagesViaGemini
        images = await generateImagesViaGemini(visualPrompt, count, "9:16", GOOGLE_API_KEY, GEMINI_IMAGE_MODEL);
      } catch (e) {
        console.warn("Gemini image error (helper):", e);
      }

      if (images.length < count) {
        // bổ sung placeholder nếu thiếu
        for (let i = images.length; i < count; i++) images.push(svgPlaceholder(i, summarySubtitle));
      }

      try {
        // Sinh truyện ngắn tiếng Việt cho mỗi ảnh
        const storyPrompt = [
          `Bạn là người viết chú thích slide cho ứng dụng Ahamove.`,
          `Hãy tạo đúng ${count} câu chuyện rất ngắn bằng tiếng Việt (mỗi câu chuyện ≤ 100 từ), cảm hứng, thân thiện, phù hợp làm chú thích slide.`,
          `Chủ đề hình minh họa: ${visualPrompt}.`,
          `Chỉ trả về các câu chuyện, ngăn cách bằng ký tự '|||', không đánh số, không bình luận thêm.`,
        ].join("\n");

        const txtResp = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(
            GEMINI_TEXT_MODEL
          )}:generateContent?key=${GOOGLE_API_KEY}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              contents: [{ role: "user", parts: [{ text: storyPrompt }] }],
              generationConfig: { temperature: 0.8 },
            }),
          }
        );

        if (txtResp.ok) {
          const jd = await txtResp.json();
          const text = jd?.candidates?.[0]?.content?.parts?.map((p: any) => p?.text || "").join("") || "";
          stories = text
            .split("|||")
            .map((s: string) => s.trim())
            .filter(Boolean)
            .slice(0, count);
        }
      } catch (e) {
        console.warn("Gemini text error:", e);
      }

      if (stories.length < count) {
        for (let i = stories.length; i < count; i++) stories.push(makeTemplateStory(i));
      }

      // Bảo đảm ≤ 100 từ
      stories = stories.map((s) => s.split(/\s+/).slice(0, 100).join(" "));
    } else {
      // Không có KEY: dùng placeholder
      images = Array.from({ length: count }).map((_, i) => svgPlaceholder(i, summarySubtitle));
      stories = Array.from({ length: count }).map((_, i) => makeTemplateStory(i));
    }

    // Slide tổng kết người dùng (tiếng Việt)
    const completed = user.completedOrders ?? 128;
    const reliable = Math.max(5, Math.round((completed || 0) * 0.3));
    const avgMinutes = 28;
    const fastestMinutes = 9;

    const userSlide = {
      title: "Hành trình của bạn trong năm qua",
      stats: {
        completedOrders: completed,
        reliableShippers: reliable,
        avgDeliveryMins: avgMinutes,
        fastestDeliveryMins: fastestMinutes,
      },
      summary:
        `Bạn đã hoàn thành ${completed} đơn trong ${user.dateRange || "12 tháng qua"}. Hành trình nhanh hơn, ổn định hơn với tài xế tin cậy và định tuyến thông minh từ AI.`,
    };

    const heroes = [
      "Người bán hàng xuất sắc nhất thế giới",
      "Bậc thầy tối ưu lộ trình",
      "Chuyên gia trải nghiệm khách hàng",
      "Người dẫn đầu tốc độ",
      "Người gìn giữ độ tin cậy",
      "Nhà đổi mới logistics",
      "Người tiên phong dữ liệu",
      "Anh hùng bền vững",
      "Người kết nối cộng đồng",
      "Nhà thiết kế tầm nhìn",
    ];

    return NextResponse.json(
      {
        images,
        stories,
        userSlide,
        heroes,
        defaultHeroIndex: 0,
      },
      { status: 200 }
    );
  } catch (e: any) {
    console.error(e);
    return NextResponse.json({ error: "Không thể tạo nội dung" }, { status: 500 });
  }
}
