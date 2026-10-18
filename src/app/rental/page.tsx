
"use client";

import React, {
  useState,
  forwardRef,
  useRef,
  useEffect,
} from "react";
import Link from "next/link";
import DatePicker from "react-datepicker";
// @ts-ignore
import "react-datepicker/dist/react-datepicker.css";
import { ko } from "date-fns/locale";

type Equipment = {
  id: string;
  name: string;
  totalQuantity: number;
  unavailableQuantity: number;
  bookedQuantity: number;
  availableQuantity: number;
};


const equipList = [
  { id: "camera", name: "촬영용 카메라", max: 2 },
  { id: "tripod", name: "카메라 삼각대", max: 2 },
  { id: "wireless-mic", name: "촬영 무선 마이크", max: 2 },

  { id: "ssd-500gb", name: "SSD 외장하드 500GB", max: 2 },
  { id: "ssd-1tb", name: "SSD 외장하드 1TB", max: 2 },
  { id: "ssd-2tb", name: "SSD 외장하드 2TB", max: 2 },

  { id: "sd-card", name: "SD 메모리카드", max: 5 },
  { id: "sdi-cable", name: "SDI 케이블", max: 5 },
  { id: "hdmi-cable", name: "HDMI 케이블", max: 5 },
  { id: "apple-tv", name: "Apple TV", max: 2 },
  { id: "projector", name: "빔프로젝터", max: 2 },

  { id: "screen-100", name: "조립식 스크린 100인치", max: 1 },
  { id: "screen-120", name: "조립식 스크린 120인치", max: 1 },
  { id: "screen-150", name: "조립식 스크린 150인치", max: 1 },
];


const SCRIPT_URL =
  "https://script.google.com/macros/s/AKfycbyapQhIEv5Y3d6150sSEQEu3NdKd2KZ7iK7-a0HMSipQ19lxHtQ-h8syxK1f9ftFSNOfQ/exec";

const CustomDateInput = forwardRef<
  HTMLButtonElement,
  { value?: string; onClick?: () => void }
>(({ value, onClick }, ref) => (
  <button
    type="button"
    className="field-input"
    onClick={onClick}
    ref={ref}
    style={{
      textAlign: "left",
      whiteSpace: "pre-wrap",
      minHeight: "46px",
      background: "#fff",
      cursor: "pointer",
      lineHeight: "1.5",
    }}
  >
    {value || "날짜를 선택해주세요 (클릭)"}
  </button>
));

CustomDateInput.displayName = "CustomDateInput";

export default function RentalForm() {
  const [startDate, setStartDate] = useState<Date | null>(null);
  const [endDate, setEndDate] = useState<Date | null>(null);

  const [formData, setFormData] = useState({
    name: "",
    team: "",
    phone: "",
    location: "",
    purpose: "",
    requestNotes: "",
  });

  // 선택한 장비 ID별 수량
  const [selEquip, setSelEquip] = useState<Record<string, number>>({});

  const [inventory, setInventory] = useState<Equipment[]>([]);
  const [availabilityLoading, setAvailabilityLoading] = useState(false);
  const [availabilityError, setAvailabilityError] = useState("");

  const [agree, setAgree] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState<"eq" | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [scrolledToBottom, setScrolledToBottom] = useState(false);
  const [reservationMessage, setReservationMessage] = useState("");

  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (showModal && scrollRef.current) {
      const el = scrollRef.current;
      if (el.scrollHeight <= el.clientHeight) {
        setScrolledToBottom(true);
      }
    }
  }, [showModal]);

  // 날짜가 바뀌면 해당 기간의 신청 가능 수량을 서버에서 조회
  useEffect(() => {
    const controller = new AbortController();

    async function loadAvailability() {
      setAvailabilityLoading(true);
      setAvailabilityError("");

      try {
        const params = new URLSearchParams();

        if (startDate && endDate) {
          if (endDate.getTime() <= startDate.getTime()) {
            setInventory([]);
            setAvailabilityError(
              "반납 일시는 대여 시작 일시보다 늦어야 합니다."
            );
            return;
          }

          params.set("startAt", startDate.toISOString());
          params.set("endAt", endDate.toISOString());
        }

        const query = params.toString();
        const response = await fetch(
          `/api/equipment${query ? `?${query}` : ""}`,
          {
            method: "GET",
            cache: "no-store",
            signal: controller.signal,
          }
        );

        const data = await response.json();

        if (!response.ok) {
          throw new Error(
            data.error || "장비 수량을 불러오지 못했습니다."
          );
        }

        setInventory(data.items || []);
      } catch (error) {
        if (error instanceof Error && error.name === "AbortError") {
          return;
        }

        setAvailabilityError(
          error instanceof Error
            ? error.message
            : "장비 수량을 불러오지 못했습니다."
        );
      } finally {
        if (!controller.signal.aborted) {
          setAvailabilityLoading(false);
        }
      }
    }

    void loadAvailability();

    return () => controller.abort();
  }, [startDate, endDate]);

  const getAvailableQuantity = (id: string, defaultMax: number) => {
    const item = inventory.find((equipment) => equipment.id === id);
    return item ? item.availableQuantity : defaultMax;
  };

  const handleQuantityChange = (
    id: string,
    delta: number,
    max: number
  ) => {
    const currentQty = selEquip[id] || 0;
    const newQty = currentQty + delta;

    setSelEquip((previous) => {
      const updated = { ...previous };

      if (newQty <= 0) {
        delete updated[id];
      } else if (newQty <= max) {
        updated[id] = newQty;
      }

      return updated;
    });
  };

  const handleStartDateChange = (date: Date | null) => {
    setStartDate(date);

    if (date && endDate && endDate.getTime() <= date.getTime()) {
      setEndDate(null);
    }
  };

  const handleSubmit = async () => {
    if (
      !formData.name.trim() ||
      !formData.team.trim() ||
      !formData.phone.trim() ||
      !startDate ||
      !endDate ||
      !formData.location ||
      !formData.purpose.trim() ||
      Object.keys(selEquip).length === 0
    ) {
      alert("모든 필수 항목을 입력하고 장비를 선택해주세요.");
      return;
    }

    if (endDate.getTime() <= startDate.getTime()) {
      alert("반납 일시는 대여 시작 일시보다 늦어야 합니다.");
      return;
    }

    if (!agree) {
      alert("대여 규정에 동의해주세요.");
      return;
    }

    if (availabilityLoading) {
      alert("장비 수량을 확인하고 있습니다. 잠시 후 다시 시도해주세요.");
      return;
    }

    if (availabilityError) {
      alert("장비 수량을 확인할 수 없습니다. 잠시 후 다시 시도해주세요.");
      return;
    }

    for (const [id, quantity] of Object.entries(selEquip)) {
      const item = equipList.find((equipment) => equipment.id === id);

      if (!item || quantity > getAvailableQuantity(id, item.max)) {
        alert(
          `${item?.name || id}의 신청 가능 수량이 변경되었습니다. 장비를 다시 선택해주세요.`
        );
        return;
      }
    }

    setIsSubmitting(true);
    setReservationMessage("");

    const selectedItems = Object.entries(selEquip).map(([id, quantity]) => {
      const item = equipList.find((equipment) => equipment.id === id)!;

      return {
        id,
        name: item.name,
        quantity,
      };
    });

    const equipmentString = selectedItems
      .map((item) => `${item.name} (${item.quantity}개)`)
      .join(", ");

    const payload = {
      ...formData,
      name: formData.name.trim(),
      team: formData.team.trim(),
      phone: formData.phone.trim(),
      purpose: formData.purpose.trim(),
      requestNotes: formData.requestNotes.trim(),
      startDate: startDate.toLocaleString("ko-KR", {
        timeZone: "Asia/Seoul",
      }),
      endDate: endDate.toLocaleString("ko-KR", {
        timeZone: "Asia/Seoul",
      }),
      startAt: startDate.toISOString(),
      endAt: endDate.toISOString(),
      equipment: equipmentString,
      equipmentItems: selectedItems,
    };

    try {
      // 재고 검증과 Firestore 저장은 서버에서 원자적으로 처리
      const response = await fetch("/api/rental", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const result = await response.json();

      if (!response.ok) {
        if (response.status === 409) {
          setReservationMessage(
            result.error || "선택한 기간에 신청 가능한 수량이 부족합니다."
          );
          alert(
            result.error ||
            "선택한 기간에 신청 가능한 수량이 부족합니다. 수량을 다시 확인해주세요."
          );
          return;
        }

        throw new Error(result.error || "예약 신청에 실패했습니다.");
      }

      // 기존 Google 스프레드시트 연동은 예약 저장 성공 후 실행
      // no-cors 방식이므로 스프레드시트 반영 여부를 브라우저에서 확인할 수는 없음
      const sheetPayload = {
        ...payload,
        submittedAt: new Date().toLocaleString("ko-KR", {
          timeZone: "Asia/Seoul",
        }),
      };

      void fetch(SCRIPT_URL, {
        method: "POST",
        mode: "no-cors",
        headers: {
          "Content-Type": "text/plain;charset=utf-8",
        },
        body: JSON.stringify(sheetPayload),
      }).catch((error) => {
        console.error("Google Sheets 전송 실패:", error);
      });

      setIsSuccess(true);
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "전송 실패: 다시 시도해주세요.";

      setReservationMessage(message);
      alert(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const summaryText =
    Object.keys(selEquip).length > 0
      ? Object.entries(selEquip)
        .map(([id, quantity]) => {
          const item = equipList.find((equipment) => equipment.id === id);
          return `${item?.name ?? id} ${quantity}개`;
        })
        .join(", ")
      : "장비 선택 (클릭)";

  return (
    <div
      style={{
        maxWidth: "600px",
        margin: "10px auto 40px auto",
        padding: "20px",
      }}
    >
      <style>{`
        .react-datepicker-wrapper { width: 100%; }
        .field-input {
          width: 100%;
          padding: 12px;
          border: 1px solid #ccc;
          border-radius: 5px;
          font-size: 16px;
        }
        .rental-nav {
          display: flex;
          justify-content: space-between;
          gap: 12px;
          margin-bottom: 20px;
        }
        .rental-nav a, .rental-nav button {
          display: inline-block;
          padding: 9px 14px;
          border: 1px solid #ddd;
          border-radius: 6px;
          background: #fff;
          color: #333;
          text-decoration: none;
          font-size: 14px;
          cursor: pointer;
        }
        .rental-nav button:hover, .rental-nav a:hover {
          background: #f5f5f5;
        }
      `}</style>

      <nav className="rental-nav" aria-label="페이지 이동">
        <Link href="/">← 홈으로</Link>

      </nav>

      {!isSuccess ? (
        <>
          <h2
            style={{
              textAlign: "center",
              marginBottom: "30px",
              fontSize: "20px",
              fontWeight: "bold",
            }}
          >
            NCMN 미디어 장비 대여 신청서
          </h2>

          {/* 신청자 정보 */}
          <div className="section" style={{ marginBottom: "20px" }}>
            <div
              className="section-title"
              style={{ fontWeight: "bold", marginBottom: "10px" }}
            >
              1. 신청자 정보 (필수)
            </div>

            <div className="field" style={{ marginBottom: "10px" }}>
              <label>이름</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                style={{
                  width: "100%",
                  padding: "10px",
                  border: "1px solid #ccc",
                  borderRadius: "5px",
                }}
              />
            </div>

            <div className="field" style={{ marginBottom: "10px" }}>
              <label>사역팀</label>
              <input
                type="text"
                value={formData.team}
                onChange={(e) =>
                  setFormData({ ...formData, team: e.target.value })
                }
                style={{
                  width: "100%",
                  padding: "10px",
                  border: "1px solid #ccc",
                  borderRadius: "5px",
                }}
              />
            </div>

            <div className="field" style={{ marginBottom: "10px" }}>
              <label>연락처(- 없이 입력해주세요)</label>
              <input
                type="tel"
                value={formData.phone}
                onChange={(e) =>
                  setFormData({ ...formData, phone: e.target.value })
                }
                style={{
                  width: "100%",
                  padding: "10px",
                  border: "1px solid #ccc",
                  borderRadius: "5px",
                }}
              />
            </div>
          </div>

          {/* 대여 일정 */}
          <div className="section" style={{ marginBottom: "20px" }}>
            <div
              className="section-title"
              style={{ fontWeight: "bold", marginBottom: "10px" }}
            >
              2. 대여 일정 선택
            </div>

            <div style={{ marginBottom: "12px" }}>
              <label
                style={{
                  display: "block",
                  fontSize: "14px",
                  marginBottom: "5px",
                  color: "#555",
                }}
              >
                대여 시작 일시
              </label>

              <DatePicker
                selected={startDate}
                onChange={handleStartDateChange}
                locale={ko}
                showTimeSelect
                timeIntervals={30}
                timeFormat="HH:mm"
                dateFormat="yyyy.MM.dd HH:mm"
                customInput={<CustomDateInput />}
                placeholderText="대여 시작 일시 선택"
              />
            </div>

            <div>
              <label
                style={{
                  display: "block",
                  fontSize: "14px",
                  marginBottom: "5px",
                  color: "#555",
                }}
              >
                반납 예정 일시
              </label>

              <DatePicker
                selected={endDate}
                onChange={(date: Date | null) => setEndDate(date)}
                locale={ko}
                showTimeSelect
                timeIntervals={30}
                timeFormat="HH:mm"
                dateFormat="yyyy.MM.dd HH:mm"
                customInput={<CustomDateInput />}
                placeholderText="반납 예정 일시 선택"
                minDate={startDate || undefined}
              />
            </div>

            <div
              style={{
                marginTop: "12px",
                padding: "12px",
                background: "#f8f9fa",
                borderRadius: "6px",
                fontSize: "13px",
                lineHeight: "1.6",
              }}
            >
              <strong>선택 기간의 장비 수량</strong>

              {availabilityLoading && (
                <p style={{ margin: "6px 0 0", color: "#666" }}>
                  신청 가능 수량을 확인하고 있습니다…
                </p>
              )}

              {!availabilityLoading && availabilityError && (
                <p style={{ margin: "6px 0 0", color: "#c62828" }}>
                  {availabilityError}
                </p>
              )}

              {!availabilityLoading &&
                !availabilityError &&
                startDate &&
                endDate && (
                  <p style={{ margin: "6px 0 0", color: "#555" }}>
                    선택한 기간에 겹치는 예약을 기준으로 계산합니다.
                  </p>
                )}

              {!availabilityLoading &&
                !availabilityError &&
                inventory.length > 0 && (
                  <div style={{ marginTop: "8px" }}>
                    {inventory.map((item) => (
                      <div
                        key={item.id}
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          gap: "8px",
                          padding: "4px 0",
                        }}
                      >
                        <span>{item.name}</span>
                        <strong
                          style={{
                            color:
                              item.availableQuantity > 0
                                ? "#237547"
                                : "#c62828",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {item.availableQuantity} / {item.totalQuantity}개 가능
                        </strong>
                      </div>
                    ))}
                  </div>
                )}

              <p
                style={{
                  margin: "8px 0 0",
                  color: "#777",
                  fontSize: "12px",
                }}
              >
                수량은 신청 시 서버에서 다시 확인합니다. 다른 신청이 먼저
                접수되면 수량이 달라질 수 있습니다.
              </p>
            </div>
          </div>

          {/* 대여 장비 */}
          <div
            className="section"
            style={{
              position: "relative",
              marginBottom: "20px",
            }}
          >
            <div
              className="section-title"
              style={{ fontWeight: "bold", marginBottom: "10px" }}
            >
              3. 대여 장비
            </div>

            <div className="field">
              <button
                type="button"
                onClick={() =>
                  setDropdownOpen(dropdownOpen === "eq" ? null : "eq")
                }
                style={{
                  width: "100%",
                  padding: "10px",
                  border: "1px solid #ccc",
                  borderRadius: "5px",
                  cursor: "pointer",
                  background: "#f9f9f9",
                  textAlign: "left",
                }}
              >
                {summaryText}
              </button>

              {dropdownOpen === "eq" && (
                <div
                  style={{
                    border: "1px solid #ccc",
                    padding: "15px",
                    marginTop: "5px",
                    borderRadius: "5px",
                    backgroundColor: "#fff",
                    position: "absolute",
                    width: "100%",
                    zIndex: 999,
                    boxShadow: "0 4px 6px rgba(0,0,0,0.1)",
                    maxHeight: "65vh",
                    overflowY: "auto",
                  }}
                >
                  <p
                    style={{
                      fontSize: "13px",
                      color: "#666",
                      marginBottom: "10px",
                    }}
                  >
                    * 필요한 장비의 수량을 선택해주세요.
                  </p>

                  {equipList.map((item) => {
                    const qty = selEquip[item.id] || 0;
                    const available = getAvailableQuantity(item.id, item.max);
                    const canIncrease = qty < available;

                    return (
                      <div
                        key={item.id}
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          gap: "8px",
                          padding: "8px 0",
                          borderBottom: "1px solid #eee",
                        }}
                      >
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: "14px" }}>
                            {item.name}
                          </div>
                          <small style={{ color: "#777" }}>
                            {availabilityLoading
                              ? "수량 확인 중…"
                              : `신청 가능 ${available}개`}
                          </small>
                        </div>

                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "10px",
                          }}
                        >
                          <button
                            type="button"
                            aria-label={`${item.name} 수량 줄이기`}
                            onClick={() =>
                              handleQuantityChange(item.id, -1, available)
                            }
                            disabled={qty <= 0}
                            style={{
                              width: "28px",
                              height: "28px",
                              background: "#f0f0f0",
                              border: "1px solid #ccc",
                              borderRadius: "4px",
                              cursor: qty > 0 ? "pointer" : "not-allowed",
                              fontWeight: "bold",
                            }}
                          >
                            -
                          </button>

                          <span
                            style={{
                              minWidth: "20px",
                              textAlign: "center",
                              fontWeight: "bold",
                            }}
                          >
                            {qty}
                          </span>

                          <button
                            type="button"
                            aria-label={`${item.name} 수량 늘리기`}
                            onClick={() =>
                              handleQuantityChange(item.id, 1, available)
                            }
                            disabled={!canIncrease || availabilityLoading}
                            style={{
                              width: "28px",
                              height: "28px",
                              background: canIncrease ? "#f0f0f0" : "#eee",
                              border: "1px solid #ccc",
                              borderRadius: "4px",
                              cursor: canIncrease ? "pointer" : "not-allowed",
                              fontWeight: "bold",
                              opacity: canIncrease ? 1 : 0.5,
                            }}
                          >
                            +
                          </button>
                        </div>
                      </div>
                    );
                  })}

                  <button
                    type="button"
                    onClick={() => setDropdownOpen(null)}
                    style={{
                      marginTop: "15px",
                      width: "100%",
                      padding: "10px",
                      background: "#007bff",
                      color: "white",
                      borderRadius: "5px",
                      border: "none",
                      cursor: "pointer",
                      fontWeight: "bold",
                    }}
                  >
                    선택 완료
                  </button>
                </div>
              )}

              <label
                style={{
                  display: "block",
                  fontSize: "14px",
                  marginTop: "15px",
                  marginBottom: "5px",
                  fontWeight: "bold",
                  color: "#555",
                }}
              >
                추가요청사항 (선택)
              </label>

              <textarea
                value={formData.requestNotes}
                placeholder="추가로 요청하실 사항이나 특이사항을 적어주세요. (예: 스틸카메라, 노트북 1대 등)"
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    requestNotes: e.target.value,
                  })
                }
                style={{
                  width: "100%",
                  padding: "10px",
                  border: "1px solid #ccc",
                  borderRadius: "5px",
                  minHeight: "60px",
                }}
              />
            </div>
          </div>

          {/* 사용 정보 */}
          <div className="section" style={{ marginBottom: "20px" }}>
            <div
              className="section-title"
              style={{ fontWeight: "bold", marginBottom: "10px" }}
            >
              4. 사용 정보
            </div>

            <select
              value={formData.location}
              onChange={(e) =>
                setFormData({ ...formData, location: e.target.value })
              }
              style={{
                width: "100%",
                padding: "10px",
                marginBottom: "10px",
                border: "1px solid #ccc",
                borderRadius: "5px",
                background: "#fff",
              }}
            >
              <option value="">장소 선택</option>
              {[
                "서울 비전센터 B2층",
                "서울 비전센터 2층",
                "서울 비전센터 3층",
                "서울 비전센터 5층 회의실",
                "고성 비전센터",
                "영등포 2층",
                "외부(외부 대여는 사전에 액팅리더와의 소통이 필요합니다)",
              ].map((loc) => (
                <option key={loc} value={loc}>
                  {loc}
                </option>
              ))}
            </select>

            <textarea
              value={formData.purpose}
              placeholder="사용 목적을 적어주세요."
              onChange={(e) =>
                setFormData({ ...formData, purpose: e.target.value })
              }
              style={{
                width: "100%",
                padding: "10px",
                marginBottom: "10px",
                border: "1px solid #ccc",
                borderRadius: "5px",
                minHeight: "80px",
              }}
            />
          </div>

          {/* 규정 동의 */}
          <div
            style={{
              margin: "20px 0",
              background: "#f8f9fa",
              padding: "15px",
              borderRadius: "5px",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: "10px",
              }}
            >
              <label
                style={{
                  display: "flex",
                  alignItems: "center",
                  cursor: "pointer",
                  fontWeight: "bold",
                }}
              >
                <input
                  type="checkbox"
                  checked={agree}
                  readOnly
                  style={{
                    width: "20px",
                    height: "20px",
                    marginRight: "10px",
                  }}
                />
                [필수] 대여 규정에 동의합니다.
              </label>

              <button
                type="button"
                onClick={() => setShowModal(true)}
                style={{
                  background: "#333",
                  border: "none",
                  color: "white",
                  padding: "6px 12px",
                  borderRadius: "5px",
                  cursor: "pointer",
                  fontSize: "13px",
                  whiteSpace: "nowrap",
                }}
              >
                규정 보기
              </button>
            </div>
          </div>

          {reservationMessage && (
            <p
              role="alert"
              style={{
                padding: "12px",
                borderRadius: "5px",
                background: "#fff3f3",
                color: "#b42318",
                fontSize: "14px",
                lineHeight: "1.5",
              }}
            >
              {reservationMessage}
            </p>
          )}

          {/* 제출 버튼 */}
          <button
            type="button"
            onClick={handleSubmit}
            disabled={!agree || isSubmitting || availabilityLoading}
            style={{
              width: "100%",
              padding: "15px",
              background:
                agree && !isSubmitting && !availabilityLoading
                  ? "#007bff"
                  : "#ccc",
              color: "white",
              border: "none",
              borderRadius: "5px",
              fontSize: "18px",
              cursor:
                agree && !isSubmitting && !availabilityLoading
                  ? "pointer"
                  : "not-allowed",
              transition: "background 0.3s",
            }}
          >
            {isSubmitting
              ? "제출 중..."
              : availabilityLoading
                ? "수량 확인 중..."
                : agree
                  ? "신청서 제출"
                  : "규정 동의 후 제출 가능"}
          </button>

          <div
            style={{
              marginTop: "25px",
              padding: "15px",
              background: "#f1f3f5",
              borderRadius: "5px",
              fontSize: "13px",
              color: "#555",
              lineHeight: "1.5",
              textAlign: "center",
            }}
          >
            본 서비스는 NCMN 내부 사역팀의 장비 대여 관리를 위한 서비스입니다.
            <br />
            수집된 개인정보는 장비 대여 신청 처리 외의 목적으로 사용되지 않습니다.
            <br />
            문의사항은 카카오 채널을 통해 연락해주세요.
          </div>
        </>
      ) : (
        <div style={{ textAlign: "center", marginTop: "50px" }}>
          <h2>🎉 신청 완료!</h2>
          <p style={{ marginTop: "12px", lineHeight: "1.7" }}>
            대여 신청이 접수되었습니다.
            <br />
            장비 수량은 예약 시스템에 반영되었습니다.
          </p>

          <Link
            href="/"
            style={{
              display: "inline-block",
              padding: "10px 20px",
              marginTop: "20px",
              background: "#f1f3f5",
              color: "#333",
              borderRadius: "5px",
              textDecoration: "none",
            }}
          >
            홈으로
          </Link>

          <button
            type="button"
            onClick={() => window.location.reload()}
            style={{
              padding: "10px 20px",
              marginTop: "20px",
              marginLeft: "10px",
              background: "#007bff",
              color: "white",
              border: "none",
              borderRadius: "5px",
              cursor: "pointer",
            }}
          >
            새로운 신청서 작성하기
          </button>
        </div>
      )}

      {/* 대여 규정 모달 */}
      {showModal && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            width: "100%",
            height: "100%",
            background: "rgba(0,0,0,0.6)",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            zIndex: 1000,
            padding: "16px",
          }}
        >
          <div
            style={{
              background: "white",
              padding: "25px",
              borderRadius: "10px",
              width: "85%",
              maxWidth: "400px",
              maxHeight: "80vh",
              display: "flex",
              flexDirection: "column",
            }}
          >
            <h3 style={{ marginBottom: "10px" }}>대여 규정</h3>

            <div
              ref={scrollRef}
              style={{
                lineHeight: "1.7",
                fontSize: "15px",
                color: "#333",
                overflowY: "auto",
                border: "1px solid #eee",
                padding: "10px",
                flex: 1,
                maxHeight: "40vh",
              }}
              onScroll={(e) => {
                const target = e.target as HTMLDivElement;

                if (
                  target.scrollHeight - target.scrollTop <=
                  target.clientHeight + 10
                ) {
                  setScrolledToBottom(true);
                }
              }}
            >
              <p style={{ margin: "0 0 15px 0" }}>
                <strong>1. 반납일 준수</strong>
                <br />
                장비 대여 반납일을 반드시 지켜주세요.
              </p>

              <p style={{ margin: "0 0 15px 0" }}>
                <strong>2. 장비 훼손 주의</strong>
                <br />
                장비가 훼손되지 않게 조심히 다뤄주세요.
                <br />
                <span style={{ color: "#d9534f", fontSize: "13.5px" }}>
                  * 안전사고 및 기기 고장, 분실, 파손 등 사용상의 부주의나
                  과실로 인한 사고에 대해서는 해당 사역팀에 장비 수리비 비용
                  부담과 책임이 발생합니다.
                </span>
              </p>

              <p style={{ margin: "0 0 15px 0" }}>
                <strong>3. 대여 기간 제한</strong>
                <br />
                장비 대여는 일정한 기간 동안만 가능합니다.
                <br />
                <span style={{ color: "#555", fontSize: "13.5px" }}>
                  * 사역이 끝나면 반납일에 맞게 바로 반납해주세요.
                </span>
              </p>
            </div>

            <button
              type="button"
              onClick={() => {
                setAgree(true);
                setShowModal(false);
              }}
              disabled={!scrolledToBottom}
              style={{
                width: "100%",
                padding: "12px",
                background: scrolledToBottom ? "#007bff" : "#ccc",
                color: "white",
                border: "none",
                borderRadius: "5px",
                fontSize: "16px",
                marginTop: "15px",
                cursor: scrolledToBottom ? "pointer" : "not-allowed",
              }}
            >
              {scrolledToBottom
                ? "확인 및 동의하기"
                : "규정을 끝까지 읽어주세요"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
