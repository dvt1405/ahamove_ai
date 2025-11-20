"use client";

import React, { useCallback, useMemo, useState } from "react";

type GenerateImageResp = {
  ok: boolean;
  data?: {
    images: string[];
    usedPrompt?: string;
  };
  error?: string;
};

function normalizeHex(c: string): string {
  const s = String(c || "").trim();
  if (!s) return s;
  if (s.startsWith("#")) return s;
  // If looks like hex without #, add it
  if (/^[0-9a-fA-F]{3,8}$/.test(s)) return "#" + s;
  return s;
}

function buildPrompt({
  heroName,
  basePrompt,
  paletteName,
  colors,
}: {
  heroName: string;
  basePrompt: string;
  paletteName: string;
  colors: string[];
}) {
  const palette = (colors || [])
    .map((c) => normalizeHex(c))
    .filter(Boolean)
    .join(", ");

  const base = basePrompt?.trim()
    ? basePrompt.trim()
    : [
        `Hero-style illustration for Ahamove: ${heroName}.`,
        "Dynamic city environment, delivery routes, reliable rider, smooth motion.",
        "Subtle UI-floating elements: order history cards, stats, coins/xu, timeline markers.",
        "High detail, soft lighting, clean and professional composition for app hero slides.",
      ].join(" ");

  const colorLine = palette
    ? `Use the color palette "${paletteName || "Custom Palette"}": ${palette}. Make these the dominant tones across background, accents, and UI elements. Maintain accessible contrast and brand coherence.`
    : `Use Ahamove brand colors: orange, white, deep blue; modern, warm, friendly tone.`;

  const guardrails =
    `Respect aspect ratio guidance if provided. Logo Ahamove in top left and hero in center.`;

  return [base, colorLine, guardrails].join("\n");
}

export default function HeroPalettePage() {
  const [heroName, setHeroName] = useState<string>("Bậc thầy tối ưu lộ trình");
  const [basePrompt, setBasePrompt] = useState<string>("");
  const [paletteName, setPaletteName] = useState<string>("Ahamove");
  const [colors, setColors] = useState<string[]>(["#FF6A00", "#0B1736", "#FFFFFF"]);
  const [count, setCount] = useState<number>(1);
  const [aspect, setAspect] = useState<string>("9:16");

  // Related image (optional)
  const [relatedImageDataUrl, setRelatedImageDataUrl] = useState<string | null>(null);
  const [relatedImageMode, setRelatedImageMode] = useState<"text-to-image" | "image-to-image">("text-to-image");
  const [relatedImageStrength, setRelatedImageStrength] = useState<number>(0.6);
  const [editNotes, setEditNotes] = useState<string>("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [images, setImages] = useState<string[]>([]);
  const [usedPrompt, setUsedPrompt] = useState<string>("");

  const promptPreview = useMemo(
    () =>
      buildPrompt({ heroName, basePrompt, paletteName, colors }),
    [heroName, basePrompt, paletteName, colors]
  );

  const addColor = useCallback(() => setColors((arr) => [...arr, "#FFFFFF"]), []);
  const removeColor = useCallback(
    (idx: number) => setColors((arr) => arr.filter((_, i) => i !== idx)),
    []
  );
  const updateColor = useCallback((idx: number, val: string) => {
    setColors((arr) => arr.map((c, i) => (i === idx ? val : c)));
  }, []);

  // Related image helpers
  const readAsDataUrl = (file: File) =>
    new Promise<string>((resolve, reject) => {
      const fr = new FileReader();
      fr.onload = () => resolve(String(fr.result || ""));
      fr.onerror = () => reject(fr.error || new Error("Đọc file thất bại"));
      fr.readAsDataURL(file);
    });

  const onSelectRelatedImage = useCallback(async (file: File) => {
    try {
      setError(null);
      const ACCEPT = new Set(["image/png", "image/jpeg", "image/webp"]);
      const MAX_BYTES = 5 * 1024 * 1024; // 5MB
      if (!ACCEPT.has(file.type)) {
        setError("Định dạng ảnh không hỗ trợ (chỉ PNG/JPEG/WEBP)");
        return;
      }
      if (file.size > MAX_BYTES) {
        setError("Ảnh quá lớn (tối đa 5MB)");
        return;
      }
      const url = await readAsDataUrl(file);
      setRelatedImageDataUrl(url);
      setRelatedImageMode("image-to-image");
    } catch (e: any) {
      setError(e?.message || "Không thể tải ảnh");
    }
  }, [setError]);

  const handleRelatedImageChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) await onSelectRelatedImage(f);
    // reset input to allow re-select the same file
    e.currentTarget.value = "";
  }, [onSelectRelatedImage]);

  const handleRemoveRelatedImage = useCallback(() => {
    setRelatedImageDataUrl(null);
    setRelatedImageMode("text-to-image");
  }, []);

  const handleGenerate = useCallback(async () => {
    setLoading(true);
    setError(null);
    setImages([]);
    setUsedPrompt("");

    try {
      if (relatedImageMode === "image-to-image" && !relatedImageDataUrl) {
        setError("Hãy chọn ảnh liên quan hoặc chuyển sang Text-to-image");
        return;
      }

      const resp = await fetch("/api/hero/image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          heroName,
          user: {},
          promptOverride: promptPreview,
          count: Math.max(1, Math.min(2, Number(count) || 1)),
          aspectRatio: aspect,
          relatedImageDataUrl: relatedImageMode === "image-to-image" ? relatedImageDataUrl : undefined,
          relatedImageMode,
          relatedImageStrength,
          editNotes: editNotes?.trim() || undefined,
        }),
      });
      const json = (await resp.json().catch(() => ({}))) as GenerateImageResp;
      if (!resp.ok || json.ok === false) {
        throw new Error(json?.error || "Không thể tạo hình ảnh");
      }
      const imgs = json?.data?.images || [];
      setImages(imgs);
      setUsedPrompt(json?.data?.usedPrompt || "");
    } catch (e: any) {
      setError(e?.message || "Có lỗi xảy ra");
    } finally {
      setLoading(false);
    }
  }, [heroName, promptPreview, count, aspect, relatedImageMode, relatedImageDataUrl, relatedImageStrength, editNotes]);

  const handleCopyPrompt = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(usedPrompt || promptPreview);
    } catch (e) {
      console.warn("Copy failed", e);
    }
  }, [usedPrompt, promptPreview]);

  const handleDownload = useCallback((url: string, idx: number) => {
    try {
      const a = document.createElement("a");
      a.href = url;
      a.download = `ahamove-hero-${idx + 1}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } catch (e) {
      console.warn("Download failed", e);
    }
  }, []);

  return (
    <div className="min-h-screen bg-white text-zinc-900 dark:bg-zinc-950 dark:text-zinc-100">
      <div className="mx-auto max-w-6xl px-4 py-8">
        <h1 className="text-2xl font-bold">Tạo ảnh hero theo bảng màu</h1>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
          Nhập tên anh hùng, base prompt và bảng màu (tên + tông màu). Hệ thống sẽ tạo hình ảnh theo tông đã chọn.
        </p>

        <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* Form */}
          <div className="rounded-2xl border border-black/10 p-4 dark:border-white/10">
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium">Tên anh hùng</label>
                <input
                  className="mt-1 w-full rounded-md border border-black/10 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-orange-500 dark:border-white/10 dark:bg-zinc-900"
                  value={heroName}
                  onChange={(e) => setHeroName(e.target.value)}
                  placeholder="Bậc thầy tối ưu lộ trình"
                />
              </div>

              <div>
                <label className="block text-sm font-medium">Base prompt (tuỳ chọn)</label>
                <textarea
                  className="mt-1 h-28 w-full rounded-md border border-black/10 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-orange-500 dark:border-white/10 dark:bg-zinc-900"
                  value={basePrompt}
                  onChange={(e) => setBasePrompt(e.target.value)}
                  placeholder="Mô tả tổng quát về phong cách hero bạn muốn..."
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium">Tên bảng màu</label>
                  <input
                    className="mt-1 w-full rounded-md border border-black/10 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-orange-500 dark:border-white/10 dark:bg-zinc-900"
                    value={paletteName}
                    onChange={(e) => setPaletteName(e.target.value)}
                    placeholder="Ahamove"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium">Tỷ lệ</label>
                  <select
                    className="mt-1 w-full rounded-md border border-black/10 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-orange-500 dark:border-white/10 dark:bg-zinc-900"
                    value={aspect}
                    onChange={(e) => setAspect(e.target.value)}
                  >
                    <option value="9:16">9:16 (dọc)</option>
                    <option value="1:1">1:1</option>
                    <option value="16:9">16:9 (ngang)</option>
                  </select>
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between gap-3">
                  <label className="block text-sm font-medium">Các tông màu</label>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setPaletteName("Ahamove");
                        setColors(["#FF6A00", "#0B1736", "#FFFFFF"]);
                      }}
                      className="rounded-md border border-black/10 px-3 py-1.5 text-sm hover:bg-black/5 dark:border-white/10 dark:hover:bg-white/10"
                    >
                      Dùng preset Ahamove
                    </button>
                    <button
                      type="button"
                      onClick={addColor}
                      className="rounded-md bg-zinc-900 px-3 py-1.5 text-sm text-white hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white"
                    >
                      Thêm màu
                    </button>
                  </div>
                </div>

                <div className="mt-2 space-y-2">
                  {colors.map((c, idx) => (
                    <div key={idx} className="flex items-center gap-3">
                      <input
                        type="color"
                        value={normalizeHex(c)}
                        onChange={(e) => updateColor(idx, e.target.value)}
                        className="h-9 w-9 cursor-pointer rounded-md border border-black/10 dark:border-white/10"
                        title={normalizeHex(c)}
                      />
                      <input
                        className="flex-1 rounded-md border border-black/10 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-orange-500 dark:border-white/10 dark:bg-zinc-900"
                        value={c}
                        onChange={(e) => updateColor(idx, e.target.value)}
                        placeholder="#FF6A00 hoặc tên màu"
                      />
                      <button
                        type="button"
                        onClick={() => removeColor(idx)}
                        className="rounded-md border border-black/10 px-2 py-1 text-sm hover:bg-black/5 dark:border-white/10 dark:hover:bg-white/10"
                        aria-label="Xoá màu"
                      >
                        Xoá
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Related image (optional) */}
              <div>
                <label className="block text-sm font-medium">Ảnh liên quan (tuỳ chọn)</label>
                <div className="mt-2 rounded-md border border-black/10 p-3 dark:border-white/10">
                  <div className="flex flex-wrap items-center gap-3">
                    <input id="related-file" type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={handleRelatedImageChange} />
                    <label htmlFor="related-file" className="cursor-pointer rounded-md border border-black/10 px-3 py-1.5 text-sm hover:bg-black/5 dark:border-white/10 dark:hover:bg-white/10">
                      Chọn ảnh…
                    </label>
                    {relatedImageDataUrl && (
                      <button type="button" onClick={handleRemoveRelatedImage} className="rounded-md border border-black/10 px-3 py-1.5 text-sm hover:bg-black/5 dark:border-white/10 dark:hover:bg-white/10">
                        Gỡ ảnh
                      </button>
                    )}
                    {relatedImageDataUrl && (
                      <img src={relatedImageDataUrl} alt="Ảnh liên quan" className="h-20 w-20 rounded object-cover" />
                    )}
                  </div>

                  <div className="mt-3 flex flex-wrap items-center gap-6 text-sm">
                    <label className="flex items-center gap-2">
                      <input type="radio" name="mode" value="text-to-image" checked={relatedImageMode === 'text-to-image'} onChange={() => setRelatedImageMode('text-to-image')} />
                      <span>Text-to-image</span>
                    </label>
                    <label className="flex items-center gap-2 opacity-100">
                      <input type="radio" name="mode" value="image-to-image" checked={relatedImageMode === 'image-to-image'} onChange={() => setRelatedImageMode('image-to-image')} disabled={!relatedImageDataUrl} />
                      <span>Image-to-image</span>
                    </label>
                  </div>

                  {relatedImageMode === 'image-to-image' && relatedImageDataUrl && (
                    <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2">
                      <div>
                        <label className="block text-sm">Mức ảnh hưởng: {relatedImageStrength.toFixed(1)}</label>
                        <input type="range" min={0.2} max={0.9} step={0.1} value={relatedImageStrength} onChange={(e) => setRelatedImageStrength(parseFloat(e.target.value))} className="mt-2 w-full" />
                      </div>
                      <div>
                        <label className="block text-sm">Ghi chú chỉnh sửa (tuỳ chọn)</label>
                        <textarea value={editNotes} onChange={(e) => setEditNotes(e.target.value)} className="mt-1 h-20 w-full rounded-md border border-black/10 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-orange-500 dark:border-white/10 dark:bg-zinc-900" placeholder="Ví dụ: làm sáng nền, nhấn mạnh đường đi, thêm coin/xu mềm mại" />
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium">Số ảnh</label>
                  <input
                    type="number"
                    min={1}
                    max={2}
                    className="mt-1 w-full rounded-md border border-black/10 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-orange-500 dark:border-white/10 dark:bg-zinc-900"
                    value={count}
                    onChange={(e) => setCount(parseInt(e.target.value || "1", 10))}
                  />
                </div>
                <div className="flex items-end">
                  <button
                    type="button"
                    onClick={handleGenerate}
                    disabled={loading || !heroName.trim()}
                    className="mt-6 inline-flex items-center justify-center rounded-md bg-orange-600 px-4 py-2 text-sm font-medium text-white hover:bg-orange-500 disabled:opacity-60"
                  >
                    {loading ? "Đang tạo..." : "Tạo hình"}
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Preview */}
          <div className="rounded-2xl border border-black/10 p-4 dark:border-white/10">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">Xem trước prompt</h2>
              <button
                type="button"
                onClick={handleCopyPrompt}
                className="rounded-md border border-black/10 px-3 py-1.5 text-sm hover:bg-black/5 dark:border-white/10 dark:hover:bg-white/10"
              >
                Sao chép prompt
              </button>
            </div>
            <pre className="mt-2 max-h-64 overflow-auto whitespace-pre-wrap rounded-md bg-zinc-50 p-3 text-sm dark:bg-zinc-900">{usedPrompt || promptPreview}</pre>

            {error && (
              <div className="mt-3 rounded-md border border-red-500/30 bg-red-50 p-3 text-sm text-red-700 dark:bg-red-900/20 dark:text-red-200">
                {error}
              </div>
            )}

            <div className="mt-4 grid grid-cols-2 gap-3">
              {images.map((src, i) => (
                <div key={i} className="overflow-hidden rounded-lg border border-black/10 dark:border-white/10">
                  <img src={src} alt={`Generated ${i + 1}`} className="h-auto w-full" />
                  <div className="flex items-center justify-end gap-2 p-2">
                    <button
                      type="button"
                      onClick={() => handleDownload(src, i)}
                      className="rounded-md border border-black/10 px-3 py-1.5 text-sm hover:bg-black/5 dark:border-white/10 dark:hover:bg-white/10"
                    >
                      Tải xuống
                    </button>
                    <a
                      href={src}
                      target="_blank"
                      rel="noreferrer"
                      className="rounded-md border border-black/10 px-3 py-1.5 text-sm hover:bg-black/5 dark:border-white/10 dark:hover:bg-white/10"
                    >
                      Mở ảnh
                    </a>
                  </div>
                </div>
              ))}
            </div>

            {!images.length && (
              <p className="mt-3 text-sm text-zinc-600 dark:text-zinc-400">
                Chưa có ảnh. Nhấn "Tạo hình" để bắt đầu. Nếu chưa cấu hình GOOGLE_API_KEY, hệ thống sẽ hiển thị ảnh SVG minh hoạ.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
