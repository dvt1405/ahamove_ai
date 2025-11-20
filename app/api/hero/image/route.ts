import { NextRequest, NextResponse } from "next/server";
import { generateImagesViaGemini } from "../../generate/gemini";

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

// Simple branded SVG placeholder if Gemini is unavailable
function svgPlaceholder(subtitle: string) {
  const colors = ["#FF6A00", "#0B1736", "#FFFFFF"]; // brand: orange, deep blue, white
  const sub = (subtitle || "").replace(/\s+/g, " ").slice(0, 140);
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
      <text x='72' y='160' font-size='64' font-weight='700'>Ahamove Hero</text>
      <text x='72' y='240' font-size='30' opacity='0.9'>Xem trước (thiếu khóa API)</text>
      <rect x='72' y='320' width='936' height='1280' rx='28' fill='rgba(255,255,255,0.12)' stroke='${colors[2]}' stroke-opacity='0.35'/>
      <text x='100' y='400' font-size='28' opacity='0.95'>${sub}</text>
    </g>
  </svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

function summarizeUser(user: any): string {
  const completedOrders = user?.completedOrders ?? "?";
  const services = Array.isArray(user?.serviceIds) && user.serviceIds.length ? user.serviceIds.join(", ") : "không rõ";
  const subs = Array.isArray(user?.subscriptions) && user.subscriptions.length ? user.subscriptions.join(", ") : "không rõ";
  const spent = typeof user?.totalSpentVnd === "number" ? new Intl.NumberFormat("vi-VN").format(user.totalSpentVnd) + "₫" : "không rõ";
  const range = user?.dateRange || "12 tháng qua";
  return `Đơn: ${completedOrders} • Dịch vụ: ${services} • Gói: ${subs} • Chi tiêu: ${spent} • Thời gian: ${range}`;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({} as any));
    const heroName: string = (body?.heroName || "").toString().trim();
    const user = body?.user || {};
    const promptOverride: string | undefined = body?.promptOverride ? String(body.promptOverride) : undefined;
    const count: number = clamp(Number(body?.count ?? 1) || 1, 1, 2);
    const aspectRatio: string = (body?.aspectRatio || "9:16").toString();

    if (!heroName) {
      return NextResponse.json({ ok: false, error: "Thiếu heroName" }, { status: 400 });
    }

    const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY;
    const GEMINI_IMAGE_MODEL = process.env.GEMINI_IMAGE_MODEL || "models/imagegeneration";

    const userSummary = summarizeUser(user);

    const basePrompt = [
      `Hero-style illustration for Ahamove: ${heroName}.
Dynamic city environment with delivery routes, reliable Ahamove rider, and smooth motion.
Add subtle UI-floating elements: order history cards, stats, progress indicators, coins/xu.
Use Ahamove brand colors: orange, white, deep blue; modern, warm, friendly tone.
Include user information: ${userSummary}, displayed through soft UI overlays.
High detail, clean, professional composition, suitable for application hero slides.`,
      `Story-style hero illustration for Ahamove: ${heroName}.
Visual storytelling through city scenes, delivery journey moments, friendly Ahamove rider.
Include smooth UI-floating elements: past order cards, progress charts, rewards coins, timeline markers.
Brand colors: orange, white, deep blue with a modern, warm, trustworthy mood.
Embed user information: ${userSummary} inside translucent cards or UI panels.
High detail, soft lighting, dynamic visuals; perfect for narrative or Year-in-Review slides.`,
      `Future-tech hero illustration for Ahamove: ${heroName}.
Futuristic city with glowing delivery paths, smart logistics atmosphere.
UI-floating elements: order history panels, growth charts, coins, live stats, mini-maps.
Highlight AI features: smart suggestions, predictive ETA, AI analytics panels.
Ahamove brand colors: orange, white, deep blue, with soft neon accents.
Show user information: ${userSummary} as part of data visualization overlays.
High-detail, clean, modern style suitable for product vision or AI presentation slides.`,
      `Warm, emotional hero illustration for Ahamove: ${heroName}.
Soft city background, friendly Ahamove rider, happy customer interaction.
Light UI-floating elements: completed orders, reward coins, journey timeline.
Brand colors: orange, bright white, deep blue; warm and positive lighting.
Feature user information: ${userSummary} integrated into subtle UI elements.
High-detail, uplifting tone; best for appreciation, recap, or Year-in-Review slides.`,
      `Minimal, clean-tech hero illustration for Ahamove: ${heroName}.
Simple geometric city shapes, smooth delivery routes, clean modern layout.
Inline UI-floating elements: order history cards, coins, small data stats, semi-transparent panels.
Brand colors: orange, white, deep blue with spacious composition.
Insert user information: ${userSummary} displayed in lightweight UI labels.
Crisp, organized visual style, ideal for professional minimalistic slides.`,
      "Chi tiết cao, sạch, chuyên nghiệp, phù hợp làm slide ứng dụng.",
    ].join(" ");

    const usedPrompt = promptOverride?.trim() || basePrompt;

    let images: string[] = [];

    if (GOOGLE_API_KEY) {
      try {
        images = await generateImagesViaGemini(usedPrompt, count, aspectRatio, GOOGLE_API_KEY, GEMINI_IMAGE_MODEL);
      } catch (e) {
        console.warn("/api/hero/image Gemini error:", e);
      }
    }

    if (images.length < count) {
      for (let i = images.length; i < count; i++) images.push(svgPlaceholder(userSummary));
    }

    return NextResponse.json({ ok: true, data: { images, usedPrompt } }, { status: 200 });
  } catch (e: any) {
    console.error(e);
    return NextResponse.json({ ok: false, error: "Không thể tạo hình ảnh" }, { status: 500 });
  }
}
