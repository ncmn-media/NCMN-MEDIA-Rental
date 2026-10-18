
"use client";

import { useCallback, useEffect, useState } from "react";
import { onAuthStateChanged, signOut, User } from "firebase/auth";
import Link from "next/link";
import { auth } from "../../lib/firebase";

type Reservation = {
  id: string;
  name?: string;
  team?: string;
  phone?: string;
  startDate?: string;
  endDate?: string;
  equipment?: string;
  location?: string;
  purpose?: string;
  submittedAt?: string;
  status?: string;
  returnStatus?: string;
  returnedAt?: unknown;
};

type InventoryItem = {
  id: string;
  name: string;
  totalQuantity: number;
  repairQuantity: number;
  lostQuantity: number;
  unavailableQuantity: number;
};

export default function AdminPage() {
  const [user, setUser] = useState<User | null>(null);
  const [items, setItems] = useState<Reservation[]>([]);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState("");
  const [inventoryError, setInventoryError] = useState("");
  const [notice, setNotice] = useState("");
  const [savingId, setSavingId] = useState("");
  const [savingInventory, setSavingInventory] = useState("");
  const [showReturned, setShowReturned] = useState(false);

  const authorizedFetch = useCallback(
    async (url: string, init: RequestInit = {}) => {
      if (!auth.currentUser) {
        throw new Error("관리자 로그인이 필요합니다.");
      }

      const token = await auth.currentUser.getIdToken();

      const response = await fetch(url, {
        ...init,
        headers: {
          ...init.headers,
          Authorization: `Bearer ${token}`,
          ...(init.body ? { "Content-Type": "application/json" } : {}),
        },
        cache: "no-store",
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "요청을 처리하지 못했습니다.");
      }

      return data;
    },
    []
  );

  const loadReservations = useCallback(async () => {
    const data = await authorizedFetch("/api/admin/reservations");
    setItems(data.reservations || []);
  }, [authorizedFetch]);

  const loadInventory = useCallback(async () => {
    const data = await authorizedFetch("/api/admin/inventory");
    setInventory(
      (data.items || []).map((item: InventoryItem) => ({
        ...item,
        totalQuantity: Number(item.totalQuantity || 0),
        repairQuantity: Number(item.repairQuantity || 0),
        lostQuantity: Number(item.lostQuantity || 0),
      }))
    );
  }, [authorizedFetch]);

  const refreshAll = useCallback(async () => {
    setError("");
    setInventoryError("");

    const results = await Promise.allSettled([
      loadReservations(),
      loadInventory(),
    ]);

    if (results[0].status === "rejected") {
      setError(
        results[0].reason instanceof Error
          ? results[0].reason.message
          : "예약을 불러오지 못했습니다."
      );
    }

    if (results[1].status === "rejected") {
      setInventoryError(
        results[1].reason instanceof Error
          ? results[1].reason.message
          : "재고를 불러오지 못했습니다."
      );
    }
  }, [loadReservations, loadInventory]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (current) => {
      setUser(current);

      if (!current) {
        setItems([]);
        setInventory([]);
        setBusy(false);
        return;
      }

      setBusy(true);
      try {
        await refreshAll();
      } finally {
        setBusy(false);
      }
    });

    return () => unsubscribe();
  }, [refreshAll]);

  async function logout() {
    await signOut(auth);
    setUser(null);
    setItems([]);
    setInventory([]);
  }

  async function confirmReturn(item: Reservation) {
    const confirmed = window.confirm(
      `${item.name || "신청자"}님의 예약을 반납 완료 처리할까요?\n${item.equipment || ""}`
    );

    if (!confirmed) return;

    setSavingId(item.id);
    setNotice("");
    setError("");

    try {
      const data = await authorizedFetch(
        `/api/admin/reservations/${encodeURIComponent(item.id)}`,
        {
          method: "PATCH",
          body: JSON.stringify({ action: "confirm_return" }),
        }
      );

      setNotice(data.message || "반납 완료 처리했습니다.");
      await loadReservations();
    } catch (e) {
      setError(e instanceof Error ? e.message : "반납 처리에 실패했습니다.");
    } finally {
      setSavingId("");
    }
  }

  function changeInventory(
    id: string,
    field: "totalQuantity" | "repairQuantity" | "lostQuantity",
    value: number
  ) {
    setInventory((previous) =>
      previous.map((item) =>
        item.id === id ? { ...item, [field]: value } : item
      )
    );
  }

  async function saveInventory(item: InventoryItem) {

    if (
      !Number.isInteger(item.totalQuantity) ||
      item.totalQuantity < 0 ||
      !Number.isInteger(item.repairQuantity) ||
      item.repairQuantity < 0 ||
      !Number.isInteger(item.lostQuantity) ||
      item.lostQuantity < 0
    ) {
      setNotice("수량은 0 이상으로 입력해 주세요.");
      return;
    }

    if (
      item.repairQuantity + item.lostQuantity >
      item.totalQuantity
    ) {
      setNotice(
        "수리 중 수량과 분실 수량의 합은 총보유 수량을 넘을 수 없습니다."
      );
      return;
    }


    setSavingInventory(item.id);
    setInventoryError("");
    setNotice("");

    try {
      await authorizedFetch("/api/admin/inventory", {
        method: "PATCH",

        body: JSON.stringify({
          id: item.id,
          totalQuantity: item.totalQuantity,
          repairQuantity: item.repairQuantity,
          lostQuantity: item.lostQuantity,
        })
        ,
      });

      setNotice(`${item.name} 재고 상태를 저장했습니다.`);
      await loadInventory();
    } catch (e) {
      setInventoryError(
        e instanceof Error ? e.message : "재고를 저장하지 못했습니다."
      );
      await loadInventory();
    } finally {
      setSavingInventory("");
    }
  }

  const isReturned = (item: Reservation) =>
    item.status === "returned" ||
    item.returnStatus === "returned" ||
    item.status === "반납 완료" ||
    Boolean(item.returnedAt);

  const visibleReservations = items.filter(
    (item) => showReturned || !isReturned(item)
  );

  return (
    <main className="page-shell">
      <header className="page-top">
        <Link className="brand" href="/">
          NCMN <span>MEDIA</span>
        </Link>
        <div className="top-actions">
          <Link className="back-link" href="/">홈으로</Link>
          {user && (
            <button className="small-button" onClick={logout}>
              로그아웃
            </button>
          )}
        </div>
      </header>

      <section className="page-intro">
        <p className="eyebrow">ADMIN DASHBOARD</p>
        <h1>전체 예약 관리</h1>
        <p>예약 반납 확인 및 장비 재고 상태를 관리합니다.</p>
      </section>

      {!user && !busy ? (
        <div className="surface empty-state">
          <p>관리자 로그인이 필요합니다.</p>
          <Link className="primary-link" href="/admin/login">
            관리자 로그인 →
          </Link>
        </div>
      ) : busy ? (
        <div className="surface empty-state">관리자 데이터를 불러오는 중…</div>
      ) : (
        <>
          <div className="admin-summary">
            <div className="surface summary-tile">
              <span>전체 예약</span>
              <strong>{items.length}</strong>
            </div>
            <div className="surface summary-tile">
              <span>미반납 예약</span>
              <strong>{items.filter((item) => !isReturned(item)).length}</strong>
            </div>
            <div className="surface summary-tile">
              <span>관리자 계정</span>
              <strong className="admin-email">{user?.email}</strong>
            </div>
          </div>

          {error && (
            <div className="surface empty-state">
              <p className="error-text">{error}</p>
              <button className="small-button" onClick={refreshAll}>
                다시 불러오기
              </button>
            </div>
          )}

          {notice && (
            <div className="surface empty-state">
              <p>{notice}</p>
            </div>
          )}

          <section style={{ marginTop: 28 }}>
            <div className="page-intro">
              <h2>장비 재고 관리</h2>
              <p>
                총보유 수량은 유지됩니다. 수리 및 분실 수량만 별도로 관리하세요.
              </p>
            </div>

            {inventoryError && (
              <div className="surface empty-state">
                <p className="error-text">{inventoryError}</p>
                <button className="small-button" onClick={loadInventory}>
                  재고 다시 불러오기
                </button>
              </div>
            )}

            <div className="admin-table-wrap surface">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>장비</th>
                    <th>총보유</th>
                    <th>수리 중</th>
                    <th>분실</th>
                    <th>사용 가능</th>
                    <th>작업</th>
                  </tr>
                </thead>
                <tbody>
                  {inventory.map((item) => {
                    const unavailable =
                      item.repairQuantity + item.lostQuantity;
                    const available = Math.max(
                      0,
                      item.totalQuantity - unavailable
                    );

                    return (
                      <tr key={item.id}>
                        <td>{item.name}</td>

                        <td>
                          <input
                            aria-label={`${item.name} 총보유 수량`}
                            type="number"
                            min={item.repairQuantity + item.lostQuantity}
                            step={1}
                            value={item.totalQuantity}
                            onChange={(e) =>
                              changeInventory(
                                item.id,
                                "totalQuantity",
                                Number(e.target.value)
                              )
                            }
                            style={{ width: 76 }}
                          />
                          개
                        </td>

                        <td>
                          <input
                            aria-label={`${item.name} 수리 중 수량`}
                            type="number"
                            min={0}
                            max={item.totalQuantity}
                            value={item.repairQuantity}
                            onChange={(e) =>
                              changeInventory(
                                item.id,
                                "repairQuantity",
                                Number(e.target.value)
                              )
                            }
                            style={{ width: 68 }}
                          />
                        </td>
                        <td>
                          <input
                            aria-label={`${item.name} 분실 수량`}
                            type="number"
                            min={0}
                            max={item.totalQuantity}
                            value={item.lostQuantity}
                            onChange={(e) =>
                              changeInventory(
                                item.id,
                                "lostQuantity",
                                Number(e.target.value)
                              )
                            }
                            style={{ width: 68 }}
                          />
                        </td>
                        <td>
                          <strong>{available}개</strong>
                        </td>
                        <td>
                          <button
                            className="small-button"
                            disabled={savingInventory === item.id}
                            onClick={() => saveInventory(item)}
                          >
                            {savingInventory === item.id
                              ? "저장 중…"
                              : "저장"}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>

              {inventory.length === 0 && !inventoryError && (
                <div className="empty-state">장비 재고가 없습니다.</div>
              )}
            </div>
          </section>

          <section style={{ marginTop: 36 }}>
            <div className="page-intro">
              <h2>예약 및 반납 관리</h2>
              <p>반납을 실제로 확인한 후 완료 버튼을 눌러주세요.</p>
              <label style={{ display: "inline-flex", gap: 8, alignItems: "center" }}>
                <input
                  type="checkbox"
                  checked={showReturned}
                  onChange={(e) => setShowReturned(e.target.checked)}
                />
                반납 완료 예약도 표시
              </label>
            </div>

            <div className="admin-table-wrap surface">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>신청자</th>
                    <th>사역팀</th>
                    <th>장비</th>
                    <th>대여 시작</th>
                    <th>반납 예정</th>
                    <th>장소</th>
                    <th>연락처</th>
                    <th>상태</th>
                    <th>처리</th>
                  </tr>
                </thead>
                <tbody>
                  {visibleReservations.map((item) => {
                    const returned = isReturned(item);

                    return (
                      <tr key={item.id}>
                        <td>{item.name || "-"}</td>
                        <td>{item.team || "-"}</td>
                        <td>{item.equipment || "-"}</td>
                        <td>{item.startDate || "-"}</td>
                        <td>{item.endDate || "-"}</td>
                        <td>{item.location || "-"}</td>
                        <td>{item.phone || "-"}</td>
                        <td>{returned ? "반납 완료" : "대여 중 / 반납 대기"}</td>
                        <td>
                          {returned ? (
                            <span>처리 완료</span>
                          ) : (
                            <button
                              className="small-button"
                              disabled={savingId === item.id}
                              onClick={() => confirmReturn(item)}
                            >
                              {savingId === item.id
                                ? "처리 중…"
                                : "반납 완료"}
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>

              {visibleReservations.length === 0 && (
                <div className="empty-state">
                  표시할 예약이 없습니다.
                </div>
              )}
            </div>
          </section>
        </>
      )}
    </main>
  );
}
