
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type EquipmentItem = {
    id: string;
    name: string;
    totalQuantity: number;
    unavailableQuantity: number;
    bookedQuantity: number;
    availableQuantity: number;
};

const groups: Record<string, string> = {
    camera: "촬영 장비",
    tripod: "촬영 장비",
    "wireless-mic": "음향 장비",
    "ssd-500gb": "저장 장비",
    "ssd-1tb": "저장 장비",
    "ssd-2tb": "저장 장비",
    "sd-card": "저장 장비",
    "sdi-cable": "케이블",
    "hdmi-cable": "케이블",
    "apple-tv": "송출 장비",
    projector: "디스플레이",
    "screen-100": "디스플레이",
    "screen-120": "디스플레이",
    "screen-150": "디스플레이",
};

export default function EquipmentPage() {
    const [equipment, setEquipment] = useState<EquipmentItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    useEffect(() => {
        const controller = new AbortController();

        async function loadEquipment() {
            try {
                setLoading(true);
                setError("");

                const response = await fetch("/api/equipment", {
                    cache: "no-store",
                    signal: controller.signal,
                });

                const data = await response.json();

                if (!response.ok) {
                    throw new Error(
                        data.error || "장비 목록을 불러오지 못했습니다."
                    );
                }

                setEquipment(data.items || []);
            } catch (err) {
                if (err instanceof Error && err.name === "AbortError") {
                    return;
                }

                setError(
                    err instanceof Error
                        ? err.message
                        : "장비 목록을 불러오지 못했습니다."
                );
            } finally {
                if (!controller.signal.aborted) {
                    setLoading(false);
                }
            }
        }

        void loadEquipment();

        return () => controller.abort();
    }, []);

    return (
        <main className="page-shell">
            <header className="page-top">
                <Link className="brand" href="/">
                    NCMN <span>MEDIA</span>
                </Link>

                <Link className="back-link" href="/">
                    ← 홈으로
                </Link>
            </header>

            <section className="page-intro">
                <p className="eyebrow">EQUIPMENT</p>
                <h1>장비 목록</h1>
                <p>
                    대여 신청 전에 장비 종류와 현재 신청 가능 수량을
                    확인해주세요.
                </p>
            </section>

            {loading ? (
                <div className="surface empty-state">
                    장비 목록을 불러오는 중…
                </div>
            ) : error ? (
                <div className="surface empty-state">
                    <p className="error-text">{error}</p>
                    <button
                        className="small-button"
                        onClick={() => window.location.reload()}
                    >
                        다시 불러오기
                    </button>
                </div>
            ) : (
                <div className="equipment-grid">
                    {equipment.map((item, index) => (
                        <article
                            className="surface equipment-card"
                            key={item.id}
                        >
                            <span className="equipment-index">
                                {String(index + 1).padStart(2, "0")}
                            </span>

                            <span className="category-label">
                                {groups[item.id] || "기타 장비"}
                            </span>

                            <h2>{item.name}</h2>

                            <p>
                                총보유 수량{" "}
                                <strong>{item.totalQuantity}개</strong>
                            </p>

                            <p>
                                신청 가능 수량{" "}
                                <strong>{item.availableQuantity}개</strong>
                            </p>
                        </article>
                    ))}
                </div>
            )}

            <div className="page-cta">
                <p>필요한 장비를 찾으셨나요?</p>
                <Link className="primary-link" href="/rental">
                    대여 신청하기 →
                </Link>
            </div>
        </main>
    );
}
