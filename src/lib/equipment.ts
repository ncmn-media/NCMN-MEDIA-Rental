
export const EQUIPMENT = [
  { id: "camera", name: "촬영용 카메라", totalQuantity: 2 },
  { id: "tripod", name: "카메라 삼각대", totalQuantity: 2 },
  { id: "wireless-mic", name: "촬영 무선 마이크", totalQuantity: 2 },

  // SSD는 규격별로 독립 재고 관리
  { id: "ssd-500gb", name: "SSD 외장하드 500GB", totalQuantity: 2 },
  { id: "ssd-1tb", name: "SSD 외장하드 1TB", totalQuantity: 2 },
  { id: "ssd-2tb", name: "SSD 외장하드 2TB", totalQuantity: 2 },

  { id: "sd-card", name: "SD 메모리카드", totalQuantity: 5 },
  { id: "sdi-cable", name: "SDI 케이블", totalQuantity: 5 },
  { id: "hdmi-cable", name: "HDMI 케이블", totalQuantity: 5 },
  { id: "apple-tv", name: "Apple TV", totalQuantity: 2 },

  // 빔프로젝터는 기존 ID 유지
  { id: "projector", name: "빔프로젝터", totalQuantity: 2 },

  // 스크린은 인치별로 독립 재고 관리
  { id: "screen-100", name: "조립식 스크린 100인치", totalQuantity: 1 },
  { id: "screen-120", name: "조립식 스크린 120인치", totalQuantity: 1 },
  { id: "screen-150", name: "조립식 스크린 150인치", totalQuantity: 1 },
] as const;

export type EquipmentId = (typeof EQUIPMENT)[number]["id"];

export type EquipmentItem = {
  id: string;
  name: string;
  quantity: number;
};

const LEGACY_IDS = {
  ssd: ["ssd-500gb", "ssd-1tb", "ssd-2tb"],
  screen: ["screen-100", "screen-120", "screen-150"],
} as const;

export function getEquipment(id: string) {
  return EQUIPMENT.find((item) => item.id === id);
}

export function isLegacyVariantGroup(id: string) {
  return id === "ssd" || id === "screen";
}

export function getLegacyVariantIds(id: string): readonly string[] {
  if (id === "ssd") return LEGACY_IDS.ssd;
  if (id === "screen") return LEGACY_IDS.screen;
  return [];
}

export function parseDate(value: unknown): number | null {
  if (typeof value !== "string" || !value.trim()) return null;

  const text = value.trim();

  if (/^\d{4}-\d{2}-\d{2}T/.test(text)) {
    const iso = Date.parse(text);
    return Number.isFinite(iso) ? iso : null;
  }

  const korean = text.match(
    /(\d{4})[./년-]\s*(\d{1,2})[./월-]\s*(\d{1,2})일?\s*(오전|오후)?\s*(\d{1,2}):(\d{2})(?::(\d{2}))?/
  );

  if (korean) {
    const [, y, m, d, meridiem, rawHour, min, sec] = korean;
    let hour = Number(rawHour);

    if (meridiem === "오후" && hour < 12) hour += 12;
    if (meridiem === "오전" && hour === 12) hour = 0;

    return Date.UTC(
      Number(y),
      Number(m) - 1,
      Number(d),
      hour - 9,
      Number(min),
      Number(sec ?? 0)
    );
  }

  const fallback = Date.parse(text);
  return Number.isFinite(fallback) ? fallback : null;
}

export function getReservationInterval(
  reservation: Record<string, any>
): { start: number; end: number } | null {
  const start = parseDate(
    reservation.startAt ?? reservation.startDate
  );
  const end = parseDate(
    reservation.endAt ?? reservation.endDate
  );

  if (start === null || end === null || end <= start) return null;
  return { start, end };
}

export function isReturned(reservation: Record<string, any>) {
  return (
    reservation.status === "returned" ||
    reservation.returnStatus === "returned" ||
    reservation.status === "반납 완료" ||
    Boolean(reservation.returnedAt)
  );
}

function canonicalId(id: string): string {
  // 과거 예약의 ID는 임의 변환하지 않는다.
  return id;
}

export function parseReservationItems(
  reservation: Record<string, any>
): EquipmentItem[] {
  const rawItems = reservation.equipmentItems;

  if (Array.isArray(rawItems)) {
    return rawItems.flatMap((raw: any) => {
      const id = canonicalId(String(raw?.id ?? ""));
      const quantity = Number(raw?.quantity);
      const item = getEquipment(id);

      if (!item && !isLegacyVariantGroup(id)) return [];
      if (!Number.isInteger(quantity) || quantity <= 0) return [];

      return [{
        id,
        name: String(raw?.name ?? item?.name ?? id),
        quantity,
      }];
    });
  }

  // equipmentItems가 없는 과거 예약은 기존 문자열에서 읽는다.
  const text = String(reservation.equipment ?? "");
  const patterns: [string, string[]][] = [
    ["camera", ["촬영용 카메라"]],
    ["tripod", ["카메라 삼각대"]],
    ["wireless-mic", ["촬영 무선 마이크"]],
    ["ssd", [
      "저장장치 (SSD 외장하드 500G/1TB/2TB)",
      "저장장치 (SSD 외장하드500G/1TB/2TB)",
    ]],
    ["sd-card", ["SD 메모리카드"]],
    ["sdi-cable", ["SDI 케이블"]],
    ["hdmi-cable", ["HDMI 케이블"]],
    ["apple-tv", ["Apple TV"]],
    ["projector", ["빔프로젝터"]],
    ["screen", [
      "조립식 스크린 (100/120/150)",
      "조립식 스크린(100,120,150)",
    ]],
  ];

  const result: EquipmentItem[] = [];

  for (const [id, aliases] of patterns) {
    for (const alias of aliases) {
      const escaped = alias.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const regex = new RegExp(
        `${escaped}\\s*\\(\\s*(\\d+)\\s*개\\s*\\)`,
        "g"
      );

      for (const match of text.matchAll(regex)) {
        const quantity = Number(match[1]);

        if (Number.isInteger(quantity) && quantity > 0) {
          result.push({ id, name: alias, quantity });
        }
      }
    }
  }

  const totals = new Map<string, EquipmentItem>();

  for (const item of result) {
    const previous = totals.get(item.id);

    totals.set(item.id, {
      ...item,
      quantity: (previous?.quantity ?? 0) + item.quantity,
    });
  }

  return [...totals.values()];
}

export function overlaps(
  aStart: number,
  aEnd: number,
  bStart: number,
  bEnd: number
) {
  return aStart < bEnd && aEnd > bStart;
}

export function countBooked(
  reservations: Record<string, any>[],
  equipmentId: string,
  start: number,
  end: number
) {
  let quantity = 0;

  for (const reservation of reservations) {
    if (isReturned(reservation)) continue;

    const interval = getReservationInterval(reservation);

    if (
      !interval ||
      !overlaps(start, end, interval.start, interval.end)
    ) {
      continue;
    }

    for (const item of parseReservationItems(reservation)) {
      if (item.id === equipmentId) {
        quantity += item.quantity;
      }
    }
  }

  return quantity;
}

/**
 * 규격을 알 수 없는 구형 SSD/스크린 예약의 수량.
 * 해당 기간에 겹치는 구형 예약이 있으면 신규 규격별 예약은
 * 별도 안전 검증을 거쳐야 한다.
 */
export function hasOverlappingLegacyVariantReservation(
  reservations: Record<string, any>[],
  groupId: "ssd" | "screen",
  start: number,
  end: number
) {
  for (const reservation of reservations) {
    if (isReturned(reservation)) continue;

    const interval = getReservationInterval(reservation);

    if (
      !interval ||
      !overlaps(start, end, interval.start, interval.end)
    ) {
      continue;
    }

    if (
      parseReservationItems(reservation).some(
        (item) => item.id === groupId && item.quantity > 0
      )
    ) {
      return true;
    }
  }

  return false;
}
