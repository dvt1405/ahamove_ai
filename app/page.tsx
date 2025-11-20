"use client";

import {useCallback, useEffect, useMemo, useRef, useState} from "react";

// Allow custom web component in TSX
declare global {
    namespace JSX {
        interface IntrinsicElements {
            'dotlottie-player': any;
        }
    }
}

// Hero preview images mapping (paths under /public). For robustness we provide multiple filename candidates
// (original diacritics, variants with accidental spaces, and slug versions). The UI will try them in order and
// fall back to /globe.svg if none exists.
const HERO_PREVIEWS: Record<string, string[]> = {
    "Bậc thầy tối ưu lộ trình": [
        "/ahamove-hero-1.png",
    ],
    "Người bán hàng xuất sắc nhất thế giới": [
        "/ahamove-hero-2.png",
    ],
    "Chuyên gia trải nghiệm khách hàng": [
        "/ahamove-hero-11.png",
    ],
    "Người dẫn đầu tốc độ": [
        "/ahamove-hero-4.png",
    ],
    "Người gìn giữ độ tin cậy": [
        "/ahamove-hero-5.png",
    ],
    "Nhà đổi mới logistics": [
        "/ahamove-hero-3.png",
    ],
    "Người tiên phong dữ liệu": [
        "/ahamove-hero-7.png",
    ],
    "Anh hùng bền vững": [
        "/ahamove-hero-8.png",
    ],
    "Người kết nối cộng đồng": [
        "/ahamove-hero-9.png",
    ],
    "Nhà thiết kế tầm nhìn": [
        "/ahamove-hero-10.png"
    ]
};

function getHeroCandidates(name: string): string[] {
    const p = HERO_PREVIEWS[name];
    if (!p && process?.env?.NODE_ENV !== "production") {
        console.warn("Missing preview for hero:", name);
    }
    return p || [];
}

function getHeroPreview(name: string): string {
    const candidates = getHeroCandidates(name);
    if (!candidates || candidates.length === 0) return "/globe.svg";
    const first = candidates[0];
    try {
        return encodeURI(first);
    } catch {
        return first || "/globe.svg";
    }
}

function SmartImage({candidates, alt, className}: { candidates: string[]; alt: string; className?: string }) {
    const [idx, setIdx] = useState(0);
    const list = useMemo(() => {
        const enc = (candidates || []).map((p) => {
            try {
                return encodeURI(p);
            } catch {
                return p;
            }
        });
        // Always push placeholder as last candidate
        if (!enc.includes("/globe.svg")) enc.push("/globe.svg");
        return enc;
    }, [candidates]);
    const src = list[Math.min(idx, list.length - 1)];
    return (
        <img
            src={src}
            alt={alt}
            className={className}
            loading="lazy"
            onError={() => setIdx((i) => Math.min(i + 1, list.length - 1))}
        />
    );
}

type GenerateResponse = {
    images: string[];
    stories: string[];
    userSlide: {
        title: string;
        stats: {
            completedOrders: number;
            reliableShippers: number;
            avgDeliveryMins: number;
            fastestDeliveryMins: number;
        };
        summary: string;
    };
    heroes: string[];
    defaultHeroIndex: number;
};

type UserInfo = {
    completedOrders: number;
    serviceIdsInput: string; // CSV trong input, sẽ tách thành mảng khi gửi API
    subscriptionsInput: string; // CSV trong input, sẽ tách thành mảng khi gửi API
    totalSpentVnd: number;
    dateRange: string;
};

// Nhiệm vụ gợi ý sau khi chọn anh hùng
type Mission = {
    id: string;
    title: string;
    summary: string;
    steps: string[];
    prompt?: {
        kind: "image" | "content";
        text: string;
    };
    cta?: {
        label: string;
        url: string;
    };
};

function buildMissions(heroName: string, u: UserInfo): Mission[] {
    const userSummary = `Đơn: ${u.completedOrders} • Dịch vụ: ${u.serviceIdsInput || "(chưa nhập)"} • Gói: ${u.subscriptionsInput || "(chưa nhập)"} • Chi tiêu: ${new Intl.NumberFormat("vi-VN").format(Number(u.totalSpentVnd || 0))}₫ • Thời gian: ${u.dateRange || "12 tháng qua"}`;

    const brandTips = "Màu thương hiệu Ahamove: cam, trắng, xanh đậm; tông hiện đại, ấm áp, thân thiện.";

    return [
        {
            id: "ai-image",
            title: `Tạo hình ảnh bằng AI Ahamove cho "${heroName}"`,
            summary:
                "Tạo một hình minh họa thương hiệu thể hiện phiên bản anh hùng của bạn để dùng làm bìa bài đăng, avatar sự kiện hoặc slide mở đầu.",
            steps: [
                "Mở công cụ AI của Ahamove (hoặc Gemini tương thích).",
                "Dán prompt gợi ý bên dưới và điều chỉnh thêm chi tiết riêng của bạn.",
                "Chọn tỷ lệ 9:16, độ chi tiết vừa phải, ánh sáng mềm.",
                "Tải xuống và dùng cho bài đăng/slide của bạn.",
            ],
            prompt: {
                kind: "image",
                text: [
                    `Minh họa phong cách hero cho Ahamove: "${heroName}".`,
                    "Bối cảnh thành phố năng động, đường đi giao hàng, tài xế tin cậy.",
                    "Thêm UI-floating tinh tế: thẻ lịch sử đơn, số liệu, xu/coin.",
                    brandTips,
                    `Thông tin người dùng: ${userSummary}.`,
                    "Chi tiết cao, sạch, chuyên nghiệp, phù hợp làm slide ứng dụng.",
                ].join(" \n"),
            },
            cta: {label: "Thử tạo ngay", url: "https://ai.ahamove.example/studio"},
        },
        {
            id: "ai-content",
            title: `Viết nội dung bằng AI Ahamove cho chiến dịch "${heroName}"`,
            summary:
                "Tạo caption/bài viết ngắn gọn, lạc quan để chia sẻ hành trình và lời hứa dịch vụ năm tới.",
            steps: [
                "Mở công cụ tạo nội dung AI của Ahamove.",
                "Chọn giọng điệu thân thiện, chuyên nghiệp, tối đa 120–150 từ.",
                "Nêu lợi ích rõ ràng, CTA đặt đơn nhanh, và hashtag phù hợp.",
            ],
            prompt: {
                kind: "content",
                text: [
                    `Viết 1 caption tiếng Việt ≤ 120 từ, giọng thân thiện, hiện đại, theo chủ đề anh hùng "${heroName}".`,
                    `Tóm tắt hành trình năm qua và cam kết năm tới. ${userSummary}.`,
                    "Nhắc đến ưu điểm: tốc độ, độ tin cậy, định tuyến thông minh, dự đoán thời gian giao.",
                    "Kết bằng CTA: Đặt đơn ngay hôm nay. Thêm 3 hashtag phù hợp.",
                ].join(" \n"),
            },
            cta: {label: "Tạo caption ngay", url: "https://ai.ahamove.example/content"},
        },
        {
            id: "optimize-ops",
            title: "Tối ưu vận hành với Chat‑to‑Book",
            summary:
                "Dùng Chat‑to‑Book để đặt đơn nhanh, lưu mẫu, và tự động gợi ý lộ trình — tiết kiệm thời gian và giảm sai sót.",
            steps: [
                "Mở Chat‑to‑Book và gõ: 'Đặt đơn từ [địa chỉ A] đến [địa chỉ B] lúc [giờ]'.",
                "Lưu mẫu cho các tuyến lặp lại (ví dụ giao sáng/chiều hàng ngày).",
                "Bật gợi ý lộ trình thông minh và thông báo trạng thái theo thời gian thực.",
            ],
            cta: {label: "Mở Chat‑to‑Book", url: "https://chat.ahamove.com/"},
        },
        {
            id: "driver-social-ads",
            title: "Quảng bá cửa hàng tới tài xế Ahamove",
            summary:
                "Lan tỏa ưu đãi dành riêng cho tài xế: tăng nhận diện, kích hoạt mua nhanh quanh khu vực hoạt động của tài xế.",
            steps: [
                "Chuẩn bị bài đăng/ảnh bìa (dùng hình AI ở nhiệm vụ 1).",
                "Sử dụng mẫu nội dung gợi ý bên dưới, nhấn mạnh ưu đãi dành cho tài xế.",
                "Gửi yêu cầu hỗ trợ đăng trên kênh cộng đồng tài xế Ahamove.",
            ],
            prompt: {
                kind: "content",
                text: [
                    "Mẫu bài đăng ngắn cho tài xế Ahamove:",
                    "'Tài xế Ahamove ghé cửa hàng nhận ưu đãi đặc biệt hôm nay!",
                    "Nhanh – chuẩn – thân thiện. Hẹn gặp bạn trên lộ trình tiếp theo!'",
                    "Thêm CTA: 'Inbox để nhận mã ưu đãi' + 3 hashtag #AhaDriver #Ahamove #UuDaiTaiXe",
                ].join(" \n"),
            },
            cta: {label: "Yêu cầu hỗ trợ quảng bá", url: "https://www.facebook.com/AhamoveVietNam/"},
        },
    ];
}

function parseCsv(input: string): string[] {
    return input
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
}

function computeDefaultHeroIndex(u: UserInfo, heroes: string[]): number {
    const n = heroes?.length || 0;
    if (n === 0) return 0;
    const parts = [
        String(u.completedOrders || 0),
        String(u.totalSpentVnd || 0),
        String(u.dateRange || ""),
        String(u.serviceIdsInput || ""),
        String(u.subscriptionsInput || "")
    ].join("|");
    let hash = 0;
    for (let i = 0; i < parts.length; i++) {
        hash = (hash * 33) ^ parts.charCodeAt(i);
        hash |= 0;
    }
    const idx = Math.abs(hash) % n;
    return idx;
}

export default function Home() {
    const [user, setUser] = useState<UserInfo>({
        completedOrders: 0,
        serviceIdsInput: "",
        subscriptionsInput: "",
        totalSpentVnd: 0,
        dateRange: "12 tháng qua",
    });
    const [count, setCount] = useState<number>(3);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [data, setData] = useState<GenerateResponse | null>(null);
    const [showSlideshow, setShowSlideshow] = useState<boolean>(false);
    const [selectedHero, setSelectedHero] = useState<number | null>(null);

    const totalSlides = useMemo(() => {
        if (!data) return 0;
        const base = data.images.length + 2; // images + user + hero
        // Add missions only in popup AND after a hero is selected
        return showSlideshow && selectedHero != null ? base + 1 : base;
    }, [data, showSlideshow, selectedHero]);

    // Slide indices for special pages
    const heroSlideIndex = useMemo(() => (data ? data.images.length + 1 : -1), [data]);
    const missionsSlideIndex = useMemo(() => (data ? data.images.length + 2 : -1), [data]);

    const [current, setCurrent] = useState(0);
    const missions = useMemo(() => {
        if (!data || selectedHero == null) return [] as Mission[];
        const heroName = data.heroes[selectedHero] || "";
        return buildMissions(heroName, user);
    }, [data, selectedHero, user]);

    const [autoPlay, setAutoPlay] = useState<boolean>(false);

    // After selecting a hero in fullscreen, auto-advance to Missions slide
    useEffect(() => {
        if (!showSlideshow) return;
        if (!data) return;
        if (selectedHero == null) return;
        if (current !== heroSlideIndex) return;
        if (missionsSlideIndex < 0) return;
        const id = window.setTimeout(() => {
            setCurrent(missionsSlideIndex);
            setAutoPlay(false);
        }, 600);
        return () => window.clearTimeout(id);
    }, [showSlideshow, data, selectedHero, current, heroSlideIndex, missionsSlideIndex]);
    const timerRef = useRef<number | null>(null);
    const [prevCurrent, setPrevCurrent] = useState<number>(0);
    const [slideDir, setSlideDir] = useState<"left" | "right">("right");
    // Lottie effect state
    const LOTTIE_FILES = useMemo(() => [
        "/Fireworks Teal and Red.lottie",
        "/Fireworks.lottie",
        "/Confetti.lottie",
        "/Animation - celebrate.lottie",
        "/celebrate.lottie",
    ], []);
    const [effectSrc, setEffectSrc] = useState<string | null>(null);
    const [effectVisible, setEffectVisible] = useState<boolean>(false);
    const [effectKey, setEffectKey] = useState<number>(0);
    const [reducedMotion, setReducedMotion] = useState<boolean>(false);
    const effectTimerRef = useRef<number | null>(null);

    useEffect(() => {
        if (!autoPlay || totalSlides === 0) return;
        // In fullscreen popup, pause on the last slide to allow hero selection
        if (showSlideshow && current === totalSlides - 1) {
            setAutoPlay(false);
            return;
        }
        if (timerRef.current) window.clearTimeout(timerRef.current);
        timerRef.current = window.setTimeout(() => {
            setSlideDir("right");
            setCurrent((c) => (c + 1) % totalSlides);
        }, 15000);
        return () => {
            if (timerRef.current) window.clearTimeout(timerRef.current);
        };
    }, [autoPlay, current, totalSlides, showSlideshow]);

    // Detect reduced motion preference
    useEffect(() => {
        if (typeof window === 'undefined') return;
        const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
        const handler = () => setReducedMotion(!!mq.matches);
        setReducedMotion(!!mq.matches);
        if (mq.addEventListener) mq.addEventListener('change', handler);
        else if ((mq as any).addListener) (mq as any).addListener(handler);
        return () => {
            if (mq.removeEventListener) mq.removeEventListener('change', handler);
            else if ((mq as any).removeListener) (mq as any).removeListener(handler);
        };
    }, []);

    // Trigger Lottie effect on slide change
    useEffect(() => {
        if (!showSlideshow || reducedMotion) return;
        if (!LOTTIE_FILES || LOTTIE_FILES.length === 0) return;
        if (effectTimerRef.current) {
            window.clearTimeout(effectTimerRef.current);
            effectTimerRef.current = null;
        }
        const src = LOTTIE_FILES[Math.floor(Math.random() * LOTTIE_FILES.length)];
        setEffectSrc(src);
        setEffectVisible(true);
        setEffectKey((k) => k + 1);
        const duration = 3000 + Math.floor(Math.random() * 7000); // 3–10s
        effectTimerRef.current = window.setTimeout(() => {
            setEffectVisible(false);
        }, duration);
        return () => {
            if (effectTimerRef.current) {
                window.clearTimeout(effectTimerRef.current);
                effectTimerRef.current = null;
            }
        };
    }, [current, showSlideshow, reducedMotion, LOTTIE_FILES]);

    // Hide effect when closing slideshow
    useEffect(() => {
        if (!showSlideshow) {
            setEffectVisible(false);
            if (effectTimerRef.current) {
                window.clearTimeout(effectTimerRef.current);
                effectTimerRef.current = null;
            }
        }
    }, [showSlideshow]);


    const goPrev = useCallback(() => {
        if (totalSlides === 0) return;
        // If user is on Missions slide and goes back, clear the selected hero
        if (showSlideshow && current === missionsSlideIndex) {
            setSelectedHero(null);
        }
        setSlideDir("left");
        setCurrent((c) => {
            setPrevCurrent(c);
            return (c - 1 + totalSlides) % totalSlides;
        });
    }, [totalSlides, showSlideshow, current, missionsSlideIndex]);

    const goNext = useCallback(() => {
        if (totalSlides === 0) return;
        // Prevent advancing past the Hero slide until a hero is selected
        if (showSlideshow && selectedHero == null && current === heroSlideIndex) {
            return;
        }
        setSlideDir("right");
        setCurrent((c) => {
            setPrevCurrent(c);
            return (c + 1) % totalSlides;
        });
    }, [totalSlides, showSlideshow, selectedHero, current, heroSlideIndex]);

    const handleGenerate = async () => {
        try {
            setLoading(true);
            setError(null);
            setSelectedHero(null);
            setCurrent(0);

            // Chuẩn hóa dữ liệu gửi server
            const payload = {
                count,
                user: {
                    completedOrders: Number(user.completedOrders) || 0,
                    serviceIds: parseCsv(user.serviceIdsInput),
                    subscriptions: parseCsv(user.subscriptionsInput),
                    totalSpentVnd: Number(user.totalSpentVnd) || 0,
                    dateRange: user.dateRange || "12 tháng qua",
                },
            };

            const resp = await fetch("/api/generate", {
                method: "POST",
                headers: {"Content-Type": "application/json"},
                body: JSON.stringify(payload),
            });
            if (!resp.ok) {
                const t = await resp.text();
                throw new Error(t || "Tạo nội dung thất bại");
            }
            const json = (await resp.json()) as GenerateResponse;
            setData(json);
            // Do not preselect a hero; wait for user to choose
            setShowSlideshow(true);
            setAutoPlay(true);
        } catch (e: any) {
            setError(e?.message || "Có lỗi xảy ra");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        const onKey = (e: KeyboardEvent) => {
            if (e.key === "ArrowLeft") goPrev();
            if (e.key === "ArrowRight") goNext();
        };
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    }, [goPrev, goNext]);

    // Handle ESC to close fullscreen and lock scroll when open
    useEffect(() => {
        if (!showSlideshow) return;
        const onKey = (e: KeyboardEvent) => {
            if (e.key === "Escape") setShowSlideshow(false);
            if (e.key === "ArrowLeft") goPrev();
            if (e.key === "ArrowRight") goNext();
        };
        const prevOverflow = document.body.style.overflow;
        document.body.style.overflow = "hidden";
        window.addEventListener("keydown", onKey);
        return () => {
            document.body.style.overflow = prevOverflow;
            window.removeEventListener("keydown", onKey);
        };
    }, [showSlideshow, goPrev, goNext]);

    const renderImageSlide = (idx: number) => {
        if (!data) return null;
        const img = data.images[idx];
        const story = data.stories[idx] ?? "";
        return (
            <div className="flex w-full flex-col items-center gap-4" aria-roledescription="trang hình ảnh">
                {/* dùng img để tránh cấu hình next/image cho data URL */}
                <div
                    className="mx-auto w-full max-w-[420px] overflow-hidden rounded-2xl border border-black/10 dark:border-white/10 bg-black/5"
                    style={{aspectRatio: "9 / 16"}}
                >
                    <img
                        src={img}
                        alt={`Trang ${idx + 1}`}
                        className="h-full w-full object-cover"
                    />
                </div>
                <p className="text-base leading-relaxed text-zinc-700 dark:text-zinc-300 max-w-2xl text-center sm:text-left">
                    {story}
                </p>
            </div>
        );
    };

    const renderUserSlide = () => {
        if (!data) return null;
        const u = data.userSlide;
        const s = u.stats;
        return (
            <div className="w-full" aria-roledescription="trang tổng kết người dùng">
                <h2 className="text-2xl font-semibold mb-4">{u.title}</h2>
                <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                    <StatCard label="Đơn hoàn thành" value={s.completedOrders}/>
                    <StatCard label="Tài xế tin cậy" value={s.reliableShippers}/>
                    <StatCard label="Thời gian giao TB (phút)" value={s.avgDeliveryMins}/>
                    <StatCard label="Nhanh nhất (phút)" value={s.fastestDeliveryMins}/>
                </div>
                <p className="mt-4 text-zinc-700 dark:text-zinc-300">{u.summary}</p>
            </div>
        );
    };

    const renderHeroSlide = () => {
        if (!data) return null;
        const heroList = data.heroes;
        const selected = selectedHero;
        const heroName = selected != null ? heroList[selected] : "";
        const payloadUser = {
            completedOrders: Number(user.completedOrders) || 0,
            serviceIds: parseCsv(user.serviceIdsInput),
            subscriptions: parseCsv(user.subscriptionsInput),
            totalSpentVnd: Number(user.totalSpentVnd) || 0,
            dateRange: user.dateRange || "12 tháng qua",
        };
        return (
            <div className="w-full" aria-roledescription="trang chọn anh hùng">
                <h2 className="text-2xl font-semibold mb-1">Hãy chọn anh hùng mà bạn muốn trở thành</h2>
                <p className="mb-4 text-sm text-zinc-600 dark:text-zinc-400">Mặc định: {heroList[computeDefaultHeroIndex(user, heroList)]}</p>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
                    {heroList.map((h, i) => {
                        const active = i === selected;
                        const preview = getHeroPreview(h);
                        return (
                            <button
                                key={h}
                                onClick={() => setSelectedHero(i)}
                                className={
                                    "rounded-xl border p-3 text-sm transition-colors focus:outline-none " +
                                    (active
                                        ? "border-orange-500 bg-orange-500/10 text-orange-600 dark:text-orange-300"
                                        : "border-black/10 dark:border-white/10 hover:bg-black/5 dark:hover:bg-white/5")
                                }
                                aria-pressed={active}
                                aria-label={`Chọn anh hùng ${h}`}
                            >
                                <div className="aspect-square w-full overflow-hidden rounded-lg">
                                    <SmartImage candidates={getHeroCandidates(h)} alt={h}
                                                className="h-full w-full object-cover"/>
                                </div>
                                <div className="mt-2 font-medium leading-snug">{h}</div>
                                {active && <div className="mt-1 text-xs opacity-80">Đã chọn</div>}
                            </button>
                        );
                    })}
                </div>
                <div className="mt-4 text-zinc-700 dark:text-zinc-300">
                    {selected != null ? (
                        <>Bạn đã chọn: <span className="font-semibold">{heroName}</span></>
                    ) : (
                        <span>Chưa chọn anh hùng. Vui lòng chọn để hiển thị nhiệm vụ.</span>
                    )}
                </div>
                <div className="mt-3" aria-roledescription="xem trước anh hùng">
                    <div className="overflow-hidden rounded-xl border border-black/10 dark:border-white/10 aspect-[9/16]">
                        <img
                            src={getHeroPreview(heroName)}
                            alt={`Xem trước ${heroName}`}
                            className="h-full w-full object-cover"
                            onError={(e) => {
                                const t = e.currentTarget as HTMLImageElement;
                                if (t.src !== location.origin + "/globe.svg") t.src = "/globe.svg";
                            }}
                        />
                    </div>
                </div>

                {/* Missions */}
                {selected != null && (
                    <div className="mt-6">
                        <h3 className="text-xl font-semibold">Nhiệm vụ để hiện thực hóa “anh hùng” của bạn</h3>
                        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">Chọn một nhiệm vụ bên dưới để bắt đầu ngay.</p>
                        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
                            {missions.map((m) => (
                                <MissionCard key={m.id} m={m} heroName={heroName} userPayload={payloadUser}
                                             slideshowImages={data.images}/>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        );
    };

    // Fullscreen popup with 9:16 aspect at full height
    const renderFullscreenSlide = () => {
        if (!data) return null;
        const imageSlides = data.images.length;
        const isUserSlide = current === imageSlides;
        const isHeroSlide = current === imageSlides + 1;
        const isMissionsSlide = current === missionsSlideIndex; // only valid when popup is open

        // Image slides (bounds-safe)
        if (current < imageSlides) {
            const img = data.images[current];
            const story = data.stories[current] ?? "";
            return (
                <div className="absolute inset-0">
                    <img src={img} alt={`Trang ${current + 1}`} className="absolute inset-0 h-full w-full object-cover"/>
                    {/* Lottie celebration overlay */}
                    {effectSrc && (
                        <LottieOverlay src={effectSrc} visible={effectVisible} playKey={effectKey} loop={true} />
                    )}
                    {/* Caption overlay with typing */}
                    {story && (
                        <div className="absolute inset-x-0 bottom-0 z-30 bg-gradient-to-t from-black/95 via-black/70 to-transparent px-4 py-3 sm:px-6 sm:py-4">
                            <Typewriter text={story} speed={22} startDelay={350}
                                        className="relative z-30 block whitespace-pre-wrap text-base leading-relaxed text-white drop-shadow-md"/>
                        </div>
                    )}
                </div>
            );
        }

        if (isUserSlide) {
            const u = data.userSlide;
            const s = u.stats;
            return (
                <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-white">
                    {/* Lottie celebration overlay */}
                    {effectSrc && (
                        <LottieOverlay src={effectSrc} visible={effectVisible} playKey={effectKey} loop={true} />
                    )}
                    <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_bottom,rgba(255,255,255,0.08),transparent_60%)]"/>
                    <Typewriter text={u.title} startDelay={200} speed={24}
                                className="relative z-20 mb-4 text-center text-2xl font-semibold sm:text-3xl"/>
                    <div className="relative z-20 mb-4 grid w-full max-w-md grid-cols-2 gap-2 text-center text-sm">
                        <div className="rounded-lg bg-white/10 px-3 py-2 backdrop-blur">Đơn: <b>{s.completedOrders}</b></div>
                        <div className="rounded-lg bg-white/10 px-3 py-2 backdrop-blur">Tài xế tin cậy: <b>{s.reliableShippers}</b></div>
                        <div className="rounded-lg bg-white/10 px-3 py-2 backdrop-blur">TB (phút): <b>{s.avgDeliveryMins}</b></div>
                        <div className="rounded-lg bg-white/10 px-3 py-2 backdrop-blur">Nhanh nhất: <b>{s.fastestDeliveryMins}</b></div>
                    </div>
                    <Typewriter text={u.summary} startDelay={900} speed={18}
                                className="relative z-20 mx-auto max-w-md text-center text-base leading-relaxed text-white/90"/>
                </div>
            );
        }

        // Hero slide (fullscreen with selectable hero list)
        if (isHeroSlide) {
            const heroList = data.heroes;
            const selected = selectedHero;
            const defIdx = computeDefaultHeroIndex(user, heroList);
            const heroName = selected != null ? heroList[selected] : "";
            return (
                <div className="absolute inset-0">
                    {selected != null ? (
                        <img src={getHeroPreview(heroName)} alt={heroName}
                             className="absolute inset-0 h-full w-full object-cover"/>
                    ) : (
                        <div className="absolute inset-0 h-full w-full bg-gradient-to-b from-zinc-900 via-black to-zinc-900"/>
                    )}
                    {/* Lottie celebration overlay */}
                    {effectSrc && (
                        <LottieOverlay src={effectSrc} visible={effectVisible} playKey={effectKey} loop={true} />
                    )}
                    {/* Dim layer for readability */}
                    <div className="absolute inset-0 z-20 bg-black/35"/>
                    {/* Content */}
                    <div className="absolute inset-0 z-30 flex flex-col p-4 sm:p-6 text-white overflow-y-auto">
                        <div className="mb-3 text-center">
                            <Typewriter text={"Chọn anh hùng của bạn"} startDelay={150} speed={26}
                                        className="text-sm uppercase tracking-wide text-white/80"/>
                            {selected != null ? (
                                <Typewriter text={heroName} startDelay={420} speed={28}
                                            className="mt-1 text-2xl font-semibold sm:text-3xl"/>
                            ) : (
                                <div className="mt-1 text-base opacity-90">Hãy chọn một anh hùng để tiếp tục</div>
                            )}
                            <div className="mt-1 text-xs opacity-90">Mặc định: {heroList[defIdx]}</div>
                        </div>
                        <div className="mx-auto w-full max-w-[520px]">
                            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                                {heroList.map((h, i) => {
                                    const active = i === selected;
                                    return (
                                        <button
                                            key={h}
                                            onClick={() => setSelectedHero(i)}
                                            className={
                                                "rounded-xl border p-2 text-left text-xs transition-colors focus:outline-none " +
                                                (active
                                                    ? "border-orange-500 bg-orange-500/10 text-orange-100"
                                                    : "border-white/20 hover:bg-white/10")
                                            }
                                            aria-pressed={active}
                                            aria-label={`Chọn anh hùng ${h}`}
                                        >
                                            <div className="aspect-square w-full overflow-hidden rounded-lg">
                                                <SmartImage candidates={getHeroCandidates(h)} alt={h}
                                                            className="h-full w-full object-cover"/>
                                            </div>
                                            <div className="mt-2 font-medium leading-snug">{h}</div>
                                            {active && <div className="mt-1 text-[10px] opacity-80">Đã chọn</div>}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                </div>
            );
        }

        // Missions slide (after hero selection)
        if (isMissionsSlide) {
            const heroList = data.heroes;
            const selected = selectedHero;
            const heroName = selected != null ? heroList[selected] : "";
            const payloadUser = {
                completedOrders: Number(user.completedOrders) || 0,
                serviceIds: parseCsv(user.serviceIdsInput),
                subscriptions: parseCsv(user.subscriptionsInput),
                totalSpentVnd: Number(user.totalSpentVnd) || 0,
                dateRange: user.dateRange || "12 tháng qua",
            };
            return (
                <div className="absolute inset-0">
                    {/* Base background (light/dark) */}
                    <div className="absolute inset-0 bg-white dark:bg-zinc-950"/>
                    {/* Background image at 40% opacity */}
                    <img src={getHeroPreview(heroName)} alt={heroName}
                         className="absolute inset-0 h-full w-full object-cover opacity-40"/>
                    {effectSrc && (
                        <LottieOverlay src={effectSrc} visible={effectVisible} playKey={effectKey} loop={true} />
                    )}
                    {/* Overlay for readability (light/dark) */}
                    <div className="absolute inset-0 z-20 bg-white/70 dark:bg-black/70"/>
                    <div className="absolute inset-0 z-30 flex flex-col p-4 sm:p-6 text-zinc-900 dark:text-white overflow-y-auto" aria-roledescription="trang nhiệm vụ">
                        <div className="mb-3 flex items-center justify-between">
                            <button
                                onClick={() => { setSelectedHero(null); setCurrent(heroSlideIndex); }}
                                className="rounded-full bg-black/10 dark:bg-white/10 px-3 py-1 text-sm backdrop-blur hover:bg-black/20 dark:hover:bg-white/20"
                                aria-label="Quay lại chọn anh hùng"
                            >
                                ← Quay lại
                            </button>
                            <div className="text-sm opacity-90">Anh hùng: <span className="font-medium">{heroName}</span></div>
                        </div>
                        <div className="mb-2 text-center">
                            <Typewriter text={"Nhiệm vụ để hiện thực hóa “anh hùng” của bạn"} startDelay={180} speed={22}
                                        className="text-lg font-semibold sm:text-xl"/>
                            <div className="mt-1 text-xs text-zinc-600 dark:text-white/80">Chọn một nhiệm vụ bên dưới để bắt đầu ngay.</div>
                        </div>
                        <div className="mx-auto w-full max-w-[720px]">
                            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                                {missions.map((m) => (
                                    <MissionCard key={m.id} m={m} heroName={heroName} userPayload={payloadUser} slideshowImages={data.images} />
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            );
        }

        // Fallback (shouldn't happen)
        return null;
    };

    const content = () => {
        if (loading) {
            return (
                <div className="flex w-full items-center justify-center py-16" aria-busy>
                    <Spinner/>
                    <span className="ml-3 text-zinc-600 dark:text-zinc-300">Đang tạo hình ảnh và câu chuyện…</span>
                </div>
            );
        }
        if (error) {
            return (
                <div
                    className="rounded-xl border border-red-300 bg-red-50 p-4 text-red-700 dark:border-red-800 dark:bg-red-950/30 dark:text-red-300">
                    {error}
                </div>
            );
        }
        if (!data) {
            return (
                <p className="text-zinc-600 dark:text-zinc-400">Nhập thông tin và nhấn "Tạo" để bắt đầu. Nếu không có
                    khóa API, demo sẽ dùng ảnh minh họa.</p>
            );
        }

        const imageSlides = data.images.length;
        const isUserSlide = current === imageSlides;
        const isHeroSlide = current === imageSlides + 1;

        return (
            <div className="w-full">
                <div className="mb-4 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <button onClick={goPrev}
                                className="rounded-full border px-4 py-2 hover:bg-black/5 dark:hover:bg-white/5"
                                aria-label="Trang trước">
                            ◀
                        </button>
                        <button onClick={goNext}
                                className="rounded-full border px-4 py-2 hover:bg-black/5 dark:hover:bg-white/5"
                                aria-label="Trang sau">
                            ▶
                        </button>
                        <label className="ml-3 inline-flex items-center gap-2 text-sm text-zinc-700 dark:text-zinc-300">
                            <input type="checkbox" checked={autoPlay} onChange={(e) => setAutoPlay(e.target.checked)}/>
                            Tự động chạy
                        </label>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-zinc-600 dark:text-zinc-400">
                        <button
                            className="rounded-full border px-3 py-1 hover:bg-black/5 dark:hover:bg-white/5"
                            onClick={() => { setShowSlideshow(true); setAutoPlay(true); }}
                        >
                            Mở toàn màn hình
                        </button>
                        <span>
                            {current + 1} / {totalSlides}
                        </span>
                    </div>
                </div>

                <div className="rounded-2xl border border-black/10 p-4 dark:border-white/10">
                    {current < imageSlides ? renderImageSlide(current) : (isUserSlide ? renderUserSlide() : renderHeroSlide())}
                </div>

                <div className="mt-4 flex flex-wrap items-center gap-2" role="tablist" aria-label="Chỉ báo trang">
                    {Array.from({length: totalSlides}).map((_, i) => (
                        <button
                            key={i}
                            role="tab"
                            aria-selected={current === i}
                            aria-label={`Chuyển tới trang ${i + 1}`}
                            className={
                                "h-2.5 w-2.5 rounded-full transition-colors " +
                                (current === i ? "bg-orange-500" : "bg-black/20 dark:bg-white/20 hover:bg-black/40 dark:hover:bg-white/40")
                            }
                            onClick={() => setCurrent(i)}
                        />
                    ))}
                </div>

                <div className="mt-6 flex items-center justify-between">
                    <button
                        className="rounded-full border px-4 py-2 text-sm hover:bg-black/5 dark:hover:bg-white/5"
                        onClick={() => setCurrent(0)}
                    >
                        Bắt đầu lại
                    </button>
                    <button
                        className="rounded-full border px-4 py-2 text-sm hover:bg-black/5 dark:hover:bg-white/5"
                        onClick={() => {
                            setData(null);
                            setSelectedHero(null);
                            setCurrent(0);
                        }}
                    >
                        Xóa
                    </button>
                </div>
            </div>
        );
    };

    return (
        <div className="flex min-h-screen items-start justify-center bg-zinc-50 font-sans dark:bg-black">
            <main className="mx-auto flex w-full max-w-4xl flex-col gap-6 p-6 sm:p-10">
                <header className="flex flex-col gap-2">
                    <h1 className="text-3xl font-semibold tracking-tight">Ahamove Loopback and Speedup</h1>
                    <p className="text-zinc-600 dark:text-zinc-400">Nhập thông tin sử dụng Ahamove trong năm qua. Hệ
                        thống sẽ tạo ~3 hình và câu chuyện tiếng Việt (≤ 100 từ), kèm slide tổng kết và slide chọn anh
                        hùng.</p>
                </header>

                <section className="rounded-2xl border border-black/10 p-4 dark:border-white/10">
                    <div className="flex flex-col gap-4">
                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                            <label className="text-sm">
                                <span className="mb-1 block font-medium">Tổng đơn hoàn thành</span>
                                <input
                                    type="number"
                                    min={0}
                                    value={user.completedOrders}
                                    onChange={(e) => setUser((u) => ({...u, completedOrders: Number(e.target.value)}))}
                                    className="w-full rounded-xl border border-black/10 bg-white p-2 text-sm outline-none focus:border-orange-400 dark:border-white/10 dark:bg-zinc-900"
                                    placeholder="Ví dụ: 128"
                                />
                            </label>

                            <label className="text-sm">
                                <span className="mb-1 block font-medium">Tổng chi tiêu (VND)</span>
                                <input
                                    type="number"
                                    min={0}
                                    value={user.totalSpentVnd}
                                    onChange={(e) => setUser((u) => ({...u, totalSpentVnd: Number(e.target.value)}))}
                                    className="w-full rounded-xl border border-black/10 bg-white p-2 text-sm outline-none focus:border-orange-400 dark:border-white/10 dark:bg-zinc-900"
                                    placeholder="Ví dụ: 12000000"
                                />
                            </label>

                            <label className="text-sm sm:col-span-2">
                                <span className="mb-1 block font-medium">Dịch vụ đã dùng (ID, phân tách dấu phẩy)</span>
                                <input
                                    type="text"
                                    value={user.serviceIdsInput}
                                    onChange={(e) => setUser((u) => ({...u, serviceIdsInput: e.target.value}))}
                                    className="w-full rounded-xl border border-black/10 bg-white p-2 text-sm outline-none focus:border-orange-400 dark:border-white/10 dark:bg-zinc-900"
                                    placeholder="Ví dụ: EXPRESS, INSTANT"
                                />
                            </label>

                            <label className="text-sm sm:col-span-2">
                                <span
                                    className="mb-1 block font-medium">Gói đăng ký trong năm (phân tách dấu phẩy)</span>
                                <input
                                    type="text"
                                    value={user.subscriptionsInput}
                                    onChange={(e) => setUser((u) => ({...u, subscriptionsInput: e.target.value}))}
                                    className="w-full rounded-xl border border-black/10 bg-white p-2 text-sm outline-none focus:border-orange-400 dark:border-white/10 dark:bg-zinc-900"
                                    placeholder="Ví dụ: Pro, Loyalty+"
                                />
                            </label>

                            <label className="text-sm">
                                <span className="mb-1 block font-medium">Khoảng thời gian</span>
                                <input
                                    type="text"
                                    value={user.dateRange}
                                    onChange={(e) => setUser((u) => ({...u, dateRange: e.target.value}))}
                                    className="w-full rounded-xl border border-black/10 bg-white p-2 text-sm outline-none focus:border-orange-400 dark:border-white/10 dark:bg-zinc-900"
                                    placeholder="Ví dụ: 11/2024–11/2025"
                                />
                            </label>

                            <label className="text-sm">
                                <span className="mb-1 block font-medium">Số lượng ảnh</span>
                                <input
                                    type="number"
                                    min={1}
                                    max={6}
                                    value={count}
                                    onChange={(e) => setCount(Number(e.target.value))}
                                    className="w-28 rounded-xl border border-black/10 bg-white p-2 text-sm outline-none focus:border-orange-400 dark:border-white/10 dark:bg-zinc-900"
                                />
                            </label>
                        </div>

                        <div className="flex items-center justify-end">
                            <button
                                onClick={handleGenerate}
                                disabled={loading}
                                className="rounded-full bg-orange-500 px-5 py-2 text-white shadow hover:bg-orange-600 disabled:opacity-60"
                            >
                                {loading ? "Đang tạo…" : "Tạo"}
                            </button>
                        </div>
                    </div>
                </section>

                {content()}

                {showSlideshow && (
                    <div
                        className="fixed inset-0 z-50 flex items-center justify-center"
                        role="dialog"
                        aria-modal="true"
                        aria-label="Trình chiếu toàn màn hình"
                        onClick={() => setShowSlideshow(false)}
                    >
                        {/* Backdrop */}
                        <div className="absolute inset-0 bg-black/80"/>

                        {/* 9:16 container at full viewport height */}
                        <div
                            className="relative mx-auto overflow-hidden rounded-xl shadow-2xl ring-1 ring-white/10"
                            style={{height: "100vh", aspectRatio: "9 / 16"}}
                            onClick={(e) => e.stopPropagation()}
                        >
                            {/* Animated slide container (above Lottie) */}
                            <div key={current} className={`absolute inset-0 z-20 ${slideDir === 'right' ? 'animate-slide-in-right' : 'animate-slide-in-left'}`}>
                                {/* Slide content */}
                                {renderFullscreenSlide()}
                            </div>


                            {/* Top gradient for readability */}
                            <div className="pointer-events-none absolute inset-x-0 top-0 z-30 h-24 bg-gradient-to-b from-black/70 via-black/30 to-transparent" />

                            {/* Controls overlay */}
                            <div className="pointer-events-auto absolute inset-x-0 top-0 z-40 flex items-center justify-between p-3 text-white">
                                <button
                                    className="rounded-full bg-white/10 px-3 py-1 text-sm backdrop-blur hover:bg-white/20"
                                    onClick={() => setShowSlideshow(false)}
                                >
                                    Đóng
                                </button>
                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={goPrev}
                                        className="rounded-full bg-white/10 px-3 py-1 text-sm backdrop-blur hover:bg-white/20"
                                        aria-label="Trang trước"
                                    >
                                        ◀
                                    </button>
                                    <button
                                        onClick={goNext}
                                        className="rounded-full bg-white/10 px-3 py-1 text-sm backdrop-blur hover:bg-white/20"
                                        aria-label="Trang sau"
                                    >
                                        ▶
                                    </button>
                                    <label className="ml-2 inline-flex items-center gap-2 text-xs">
                                        <input type="checkbox" checked={autoPlay}
                                               onChange={(e) => setAutoPlay(e.target.checked)}/>
                                        Tự động
                                    </label>
                                    <span className="ml-2 text-sm opacity-90">{current + 1} / {totalSlides}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                <footer className="mt-8 text-center text-xs text-zinc-500 dark:text-zinc-400">
                    Mẹo: Thiết lập biến môi trường GOOGLE_API_KEY (và tùy chọn: GEMINI_IMAGE_MODEL, GEMINI_TEXT_MODEL) ở
                    server để tạo hình và câu chuyện thật. Nếu thiếu, hệ thống sẽ dùng ảnh minh họa.
                </footer>
            </main>
        </div>
    );
}

function StatCard({label, value}: { label: string; value: number }) {
    return (
        <div className="rounded-xl border border-black/10 p-4 text-center dark:border-white/10">
            <div className="text-2xl font-semibold">{value}</div>
            <div className="text-xs text-zinc-600 dark:text-zinc-400">{label}</div>
        </div>
    );
}

function Spinner() {
    return (
        <svg className="h-5 w-5 animate-spin text-orange-500" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"></path>
        </svg>
    );
}

// Simple typewriter effect for beautiful hero typing animation
function Typewriter({
    text,
    speed = 28,
    startDelay = 200,
    className,
    caret = true,
}: {
    text: string;
    speed?: number; // ms per character
    startDelay?: number; // initial delay before typing
    className?: string;
    caret?: boolean;
}) {
    const [shown, setShown] = useState("");
    const timerRef = useRef<number | null>(null);

    useEffect(() => {
        // Reset and type again on text change
        if (timerRef.current) {
            window.clearTimeout(timerRef.current);
            timerRef.current = null;
        }
        setShown("");
        const run = () => {
            let i = 0;
            const step = () => {
                i++;
                setShown(text.slice(0, i));
                if (i < text.length) {
                    timerRef.current = window.setTimeout(step, Math.max(5, speed));
                }
            };
            step();
        };
        timerRef.current = window.setTimeout(run, Math.max(0, startDelay));
        return () => {
            if (timerRef.current) window.clearTimeout(timerRef.current);
        };
    }, [text, speed, startDelay]);

    return (
        <span className={className}>
            {shown}
            {caret && (
                <span className="ml-0.5 inline-block h-[1em] w-[2px] align-[-0.12em] animate-pulse bg-current"></span>
            )}
        </span>
    );
}

// Lottie overlay for celebratory effects
function LottieOverlay({ src, visible, playKey, loop = true, className }: { src: string; visible: boolean; playKey: number; loop?: boolean; className?: string; }) {
    if (!visible || typeof window === 'undefined') return null;
    const canUse = typeof window !== 'undefined' && (window as any).customElements && (window as any).customElements.get && (window as any).customElements.get('dotlottie-player');
    if (!canUse) return null;
    const safeSrc = (() => { try { return encodeURI(src); } catch { return src; } })();
    return (
        <div className={"pointer-events-none absolute inset-0 z-10 " + (className || "")}
             aria-hidden="true"
        >
            <dotlottie-player
                key={playKey}
                src={safeSrc}
                autoplay
                loop={loop}
                style={{ width: '100%', height: '100%', background: 'transparent' }}
            />
        </div>
    );
}


// Mission card component
 type UserPayload = {
    completedOrders: number;
    serviceIds: string[];
    subscriptions: string[];
    totalSpentVnd: number;
    dateRange: string
};

function MissionCard({m, heroName, userPayload, slideshowImages}: {
    m: Mission;
    heroName: string;
    userPayload: UserPayload;
    slideshowImages: string[]
}) {
    const [copied, setCopied] = useState(false);
    // Image mission state
    const [imgLoading, setImgLoading] = useState(false);
    const [imgError, setImgError] = useState<string | null>(null);
    const [generatedImages, setGeneratedImages] = useState<string[]>([]);

    // Caption mission state
    const [source, setSource] = useState<"slideshow" | "upload">("slideshow");
    const [chosenSlide, setChosenSlide] = useState<string>(slideshowImages?.[0] || "");
    const [uploaded, setUploaded] = useState<string | null>(null);
    const [extraNotes, setExtraNotes] = useState<string>("");
    const [captionLoading, setCaptionLoading] = useState(false);
    const [captionError, setCaptionError] = useState<string | null>(null);
    const [captionText, setCaptionText] = useState<string>("");
    const [imgCount, setImgCount] = useState<number>(1);

    const handleCopy = async () => {
        if (!m.prompt?.text) return;
        try {
            await navigator.clipboard.writeText(m.prompt.text);
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
        } catch (e) {
            // Fallback: create a temporary textarea
            try {
                const ta = document.createElement("textarea");
                ta.value = m.prompt.text;
                ta.style.position = "fixed";
                ta.style.left = "-9999px";
                document.body.appendChild(ta);
                ta.focus();
                ta.select();
                document.execCommand("copy");
                document.body.removeChild(ta);
                setCopied(true);
                setTimeout(() => setCopied(false), 1500);
            } catch (e2) {
                console.warn("Copy failed", e2);
            }
        }
    };

    const handleGenerateImages = async () => {
        if (m.id !== "ai-image") return;
        try {
            setImgLoading(true);
            setImgError(null);
            const resp = await fetch("/api/hero/image", {
                method: "POST",
                headers: {"Content-Type": "application/json"},
                body: JSON.stringify({
                    heroName,
                    user: userPayload,
                    promptOverride: m.prompt?.text,
                    count: imgCount,
                    aspectRatio: "9:16",
                }),
            });
            const json = await resp.json().catch(() => ({} as any));
            if (!resp.ok || json?.ok === false) {
                throw new Error(json?.error || "Tạo hình thất bại");
            }
            const imgs: string[] = json?.data?.images || [];
            setGeneratedImages(imgs);
        } catch (e: any) {
            setImgError(e?.message || "Có lỗi xảy ra");
        } finally {
            setImgLoading(false);
        }
    };

    const handleGenerateCaption = async () => {
        if (m.id !== "ai-content") return;
        try {
            setCaptionLoading(true);
            setCaptionError(null);
            const imageUrl = source === "upload" ? uploaded || undefined : chosenSlide || undefined;
            const resp = await fetch("/api/hero/caption", {
                method: "POST",
                headers: {"Content-Type": "application/json"},
                body: JSON.stringify({
                    heroName,
                    user: userPayload,
                    chosenImageUrl: imageUrl,
                    extraNotes,
                }),
            });
            const json = await resp.json().catch(() => ({} as any));
            if (!resp.ok || json?.ok === false) {
                throw new Error(json?.error || "Tạo caption thất bại");
            }
            setCaptionText(json?.data?.caption || "");
        } catch (e: any) {
            setCaptionError(e?.message || "Có lỗi xảy ra");
        } finally {
            setCaptionLoading(false);
        }
    };

    const isHttp = !!m.cta?.url && /^https?:\/\//i.test(m.cta.url);

    return (
        <div
            className="flex h-full flex-col justify-between rounded-2xl border border-black/10 p-4 dark:border-white/10">
            <div>
                <h4 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">{m.title}</h4>
                <p className="mt-1 text-sm text-zinc-700 dark:text-zinc-300">{m.summary}</p>

                {m.steps?.length > 0 && (
                    <ol className="mt-3 list-decimal space-y-1 pl-5 text-sm text-zinc-800 dark:text-zinc-200">
                        {m.steps.map((s, i) => (
                            <li key={i}>{s}</li>
                        ))}
                    </ol>
                )}

                {m.prompt?.text && (
                    <div className="mt-3">
                        <div className="mb-1 flex items-center justify-between">
                            <div
                                className="text-xs font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                                Gợi ý {m.prompt.kind === "image" ? "(Hình ảnh)" : "(Nội dung)"}
                            </div>
                            <button
                                onClick={handleCopy}
                                className="rounded-full border px-3 py-1 text-xs hover:bg-black/5 dark:hover:bg-white/5"
                            >
                                {copied ? "Đã sao chép" : "Sao chép"}
                            </button>
                        </div>
                        <textarea
                            readOnly
                            value={m.prompt.text}
                            className="h-28 w-full resize-none rounded-xl border border-black/10 bg-white p-2 text-sm dark:border-white/10 dark:bg-zinc-900"
                        />
                    </div>
                )}
            </div>

            {m.id === "ai-image" ? (
                <div className="mt-4">
                    <div className="flex flex-wrap items-center gap-3">
                        <label className="text-sm text-zinc-700 dark:text-zinc-300 inline-flex items-center gap-2"
                               aria-label="Số lượng ảnh">
                            <span>Số lượng</span>
                            <select
                                className="rounded-md border border-black/10 bg-white px-2 py-1 text-sm dark:border-white/10 dark:bg-zinc-900"
                                value={imgCount}
                                onChange={(e) => setImgCount(Math.max(1, Math.min(2, Number(e.target.value) || 1)))}
                            >
                                <option value={1}>1</option>
                                <option value={2}>2</option>
                            </select>
                        </label>
                        <button
                            onClick={handleGenerateImages}
                            disabled={imgLoading}
                            className="rounded-full bg-orange-500 px-4 py-2 text-sm text-white hover:bg-orange-600 disabled:opacity-60"
                            aria-busy={imgLoading}
                        >
                            {imgLoading ? "Đang tạo…" : m.cta?.label || "Thử tạo ngay"}
                        </button>
                        {imgError && <span className="text-sm text-red-600 dark:text-red-400">{imgError}</span>}
                    </div>

                    {generatedImages.length > 0 && (
                        <div className="mt-3 grid grid-cols-2 gap-3">
                            {generatedImages.map((url, i) => (
                                <div key={i} className="rounded-xl border border-black/10 p-2 dark:border-white/10">
                                    <div className="w-full overflow-hidden rounded-lg bg-black/5"
                                         style={{aspectRatio: "9 / 16"}}>
                                        <img src={url} alt={`Ảnh ${i + 1}`} className="h-full w-full object-cover"/>
                                    </div>
                                    <div className="mt-2 flex items-center justify-end gap-2">
                                        <button
                                            onClick={async () => {
                                                try {
                                                    await navigator.clipboard.writeText(url);
                                                } catch {
                                                }
                                            }}
                                            className="rounded-full border px-3 py-1 text-xs hover:bg-black/5 dark:hover:bg-white/5"
                                        >
                                            Sao chép liên kết
                                        </button>
                                        <a
                                            href={url}
                                            download={`Ahamove-Hero-${i + 1}.png`}
                                            className="rounded-full border px-3 py-1 text-xs hover:bg-black/5 dark:hover:bg-white/5"
                                        >
                                            Tải xuống
                                        </a>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            ) : m.id === "ai-content" ? (
                <div className="mt-4">
                    <div className="flex flex-col gap-3">
                        <div className="flex flex-wrap items-center gap-4">
                            <label className="inline-flex items-center gap-2 text-sm text-zinc-700 dark:text-zinc-300">
                                <input
                                    type="radio"
                                    name={`imgsrc-${heroName}`}
                                    value="slideshow"
                                    checked={source === "slideshow"}
                                    onChange={() => setSource("slideshow")}
                                />
                                Chọn từ slideshow
                            </label>
                            <label className="inline-flex items-center gap-2 text-sm text-zinc-700 dark:text-zinc-300">
                                <input
                                    type="radio"
                                    name={`imgsrc-${heroName}`}
                                    value="upload"
                                    checked={source === "upload"}
                                    onChange={() => setSource("upload")}
                                />
                                Tải ảnh
                            </label>

                            {source === "slideshow" ? (
                                <select
                                    className="rounded-md border border-black/10 bg-white px-2 py-1 text-sm dark:border-white/10 dark:bg-zinc-900"
                                    value={chosenSlide}
                                    onChange={(e) => setChosenSlide(e.target.value)}
                                >
                                    {slideshowImages && slideshowImages.length > 0 ? (
                                        slideshowImages.map((u, idx) => (
                                            <option key={idx} value={u}>{`Ảnh slideshow ${idx + 1}`}</option>
                                        ))
                                    ) : (
                                        <option value="">(Chưa có ảnh slideshow)</option>
                                    )}
                                </select>
                            ) : (
                                <input
                                    type="file"
                                    accept="image/*"
                                    onChange={(e) => {
                                        const f = e.target.files?.[0];
                                        if (!f) return;
                                        const reader = new FileReader();
                                        reader.onload = () => setUploaded(String(reader.result || ""));
                                        reader.readAsDataURL(f);
                                    }}
                                />
                            )}
                        </div>

                        <label className="text-sm">
                            <span className="mb-1 block font-medium">Ghi chú thêm (tùy chọn)</span>
                            <input
                                type="text"
                                value={extraNotes}
                                onChange={(e) => setExtraNotes(e.target.value)}
                                className="w-full rounded-xl border border-black/10 bg-white p-2 text-sm outline-none focus:border-orange-400 dark:border-white/10 dark:bg-zinc-900"
                                placeholder="Ví dụ: Ưu tiên tông lạc quan, nhắc ưu đãi 11/11"
                            />
                        </label>

                        <div className="flex items-center gap-3">
                            <button
                                onClick={handleGenerateCaption}
                                disabled={captionLoading}
                                className="rounded-full bg-orange-500 px-4 py-2 text-sm text-white hover:bg-orange-600 disabled:opacity-60"
                                aria-busy={captionLoading}
                            >
                                {captionLoading ? "Đang tạo…" : m.cta?.label || "Tạo caption"}
                            </button>
                            {captionError &&
                                <span className="text-sm text-red-600 dark:text-red-400">{captionError}</span>}
                        </div>

                        {captionText && (
                            <div className="mt-2 space-y-3">
                                <div>
                                    <div className="mb-1 flex items-center justify-between">
                                        <div
                                            className="text-xs font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">Kết
                                            quả caption
                                        </div>
                                        <button
                                            onClick={async () => {
                                                try {
                                                    await navigator.clipboard.writeText(captionText);
                                                } catch {
                                                }
                                            }}
                                            className="rounded-full border px-3 py-1 text-xs hover:bg-black/5 dark:hover:bg-white/5"
                                        >
                                            Sao chép caption
                                        </button>
                                    </div>
                                    <textarea
                                        readOnly
                                        value={captionText}
                                        className="h-36 w-full resize-none rounded-xl border border-black/10 bg-white p-2 text-sm dark:border-white/10 dark:bg-zinc-900"
                                    />
                                </div>

                                {/* Facebook-style preview (moved below caption result) */}
                                <div className="rounded-xl border border-black/10 p-3 dark:border-white/10">
                                    <div className="mb-2 flex items-center gap-2">
                                        <div className="h-8 w-8 rounded-full bg-orange-500"></div>
                                        <div className="text-sm">
                                            <div className="font-semibold">Ahamove</div>
                                            <div className="text-xs text-zinc-500">Vừa xong · Công khai</div>
                                        </div>
                                    </div>
                                    <div
                                        className="whitespace-pre-wrap text-sm text-zinc-800 dark:text-zinc-200">{captionText}</div>
                                    {((source === "upload" && uploaded) || (source === "slideshow" && chosenSlide)) && (
                                        <div
                                            className="mt-2 overflow-hidden rounded-lg border border-black/10 dark:border-white/10">
                                            <div className="w-full bg-black/5" style={{aspectRatio: "9 / 16"}}>
                                                <img
                                                    src={source === "upload" ? uploaded! : chosenSlide}
                                                    alt="Xem trước"
                                                    className="h-full w-full object-cover"
                                                />
                                            </div>
                                        </div>
                                    )}
                                    <div
                                        className="mt-2 grid grid-cols-3 text-center text-xs text-zinc-600 dark:text-zinc-400">
                                        <div>Like</div>
                                        <div>Comment</div>
                                        <div>Share</div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            ) : m.cta ? (
                <div className="mt-4 flex items-center justify-end">
                    {isHttp ? (
                        <a
                            href={m.cta.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="rounded-full bg-orange-500 px-4 py-2 text-sm text-white hover:bg-orange-600"
                        >
                            {m.cta.label}
                        </a>
                    ) : (
                        <button
                            onClick={() => (window.location.href = m.cta!.url)}
                            className="rounded-full bg-orange-500 px-4 py-2 text-sm text-white hover:bg-orange-600"
                        >
                            {m.cta.label}
                        </button>
                    )}
                </div>
            ) : null}
        </div>
    );
}
