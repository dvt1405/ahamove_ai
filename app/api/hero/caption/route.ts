import { NextRequest, NextResponse } from "next/server";

function summarizeUser(user: any): string {
  const completedOrders = user?.completedOrders ?? "?";
  const services = Array.isArray(user?.serviceIds) && user.serviceIds.length ? user.serviceIds.join(", ") : "không rõ";
  const subs = Array.isArray(user?.subscriptions) && user.subscriptions.length ? user.subscriptions.join(", ") : "không rõ";
  const spent = typeof user?.totalSpentVnd === "number" ? new Intl.NumberFormat("vi-VN").format(user.totalSpentVnd) + "₫" : "không rõ";
  const range = user?.dateRange || "12 tháng qua";
  return `Đơn: ${completedOrders} • Dịch vụ: ${services} • Gói: ${subs} • Chi tiêu: ${spent} • Thời gian: ${range}`;
}

function fallbackCaption(heroName: string, userSummary: string, extra?: string) {
  const extraNotes = extra?.trim() ? ` ${extra.trim()}` : "";
  const base = `Năm qua, chúng tôi theo đuổi tinh thần \"${heroName}\" — nhanh, chuẩn và đáng tin. ${userSummary}. Luôn sẵn sàng phục vụ tốt hơn với định tuyến thông minh và giao đúng hẹn.${extraNotes}`;
  // Clip to ~120 words
  const words = base.split(/\s+/).slice(0, 120).join(" ");
  const hashtags = " #Ahamove #NhanhChuanTinCay";
  return words + "\n\nĐặt đơn ngay hôm nay!" + hashtags;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({} as any));
    const heroName: string = (body?.heroName || "").toString().trim();
    const user = body?.user || {};
    const chosenImageUrl: string | undefined = body?.chosenImageUrl ? String(body.chosenImageUrl) : undefined;
    const extraNotes: string | undefined = body?.extraNotes ? String(body.extraNotes) : undefined;

    if (!heroName) {
      return NextResponse.json({ ok: false, error: "Thiếu heroName" }, { status: 400 });
    }

    const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY;
    const GEMINI_TEXT_MODEL = process.env.GEMINI_TEXT_MODEL || "gemini-2.5";

    const userSummary = summarizeUser(user);

    const prompt = [
      `Bạn là chuyên gia truyền thông của Ahamove. Viết 1 caption tiếng Việt ≤ 120 từ, giọng thân thiện, hiện đại.`,
      `Chủ đề anh hùng: "${heroName}".`,
      `Tóm tắt hành trình năm qua và cam kết năm tới. ${userSummary}.`,
      `Nêu rõ lợi ích: tốc độ, độ tin cậy, định tuyến thông minh, dự đoán thời gian giao.`,
      `Kết bằng CTA "Đặt đơn ngay hôm nay" và 3 hashtag phù hợp (không quá dài).`,
      chosenImageUrl ? `Ảnh minh họa (tham khảo): ${chosenImageUrl}` : undefined,
      extraNotes ? `Ghi chú thêm từ người dùng: ${extraNotes}` : undefined,
      `Chỉ trả về phần caption, không giải thích, không thêm dấu ngoặc kép xung quanh.`,
    ]
      .filter(Boolean)
      .join("\n");

    let caption: string | null = null;

    if (GOOGLE_API_KEY) {
      try {
        const resp = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(GEMINI_TEXT_MODEL)}:generateContent?key=${GOOGLE_API_KEY}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              contents: [{ role: "user", parts: [{ text: prompt }] }],
              generationConfig: { temperature: 0.8 },
            }),
          }
        );
        if (resp.ok) {
          const jd = await resp.json();
          const text = jd?.candidates?.[0]?.content?.parts?.map((p: any) => p?.text || "").join("") || "";
          caption = text.trim();
        } else {
          console.warn("/api/hero/caption text model error:", resp.status, await resp.text().catch(() => ""));
        }
      } catch (e) {
        console.warn("/api/hero/caption Gemini error:", e);
      }
    }

    if (!caption) {
      caption = fallbackCaption(heroName, userSummary, extraNotes);
    }

    // Safety: clip to 120 words
    caption = caption.split(/\s+/).slice(0, 120).join(" ");

    return NextResponse.json({ ok: true, data: { caption, usedPrompt: prompt } }, { status: 200 });
  } catch (e: any) {
    console.error(e);
    return NextResponse.json({ ok: false, error: "Không thể tạo caption" }, { status: 500 });
  }
}
