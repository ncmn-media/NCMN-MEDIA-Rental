"use client";
import React, { useState, forwardRef, useRef, useEffect } from 'react';
import DatePicker from 'react-datepicker';
import "react-datepicker/dist/react-datepicker.css";
import { ko } from 'date-fns/locale';
import { db } from "../lib/firebase";
import { collection, addDoc } from "firebase/firestore";

// 장비 목록과 최대 수량 설정 (기본 최대 2개, 케이블류/SD카드는 최대 5개)
const equipList = [
  { name: "촬영용 카메라", max: 2 },
  { name: "카메라 삼각대", max: 2 },
  { name: "촬영 무선 마이크", max: 2 },
  { name: "저장장치 (SSD 외장하드500G/1TB/2TB)", max: 2 },
  { name: "SD 메모리카드", max: 5 },
  { name: "SDI 케이블", max: 5 },
  { name: "HDMI 케이블", max: 5 },
  { name: "Apple TV", max: 2 },
];

const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbyapQhIEv5Y3d6150sSEQEu3NdKd2KZ7iK7-a0HMSipQ19lxHtQ-h8syxK1f9ftFSNOfQ/exec";

// 커스텀 날짜 인풋 컴포넌트
const CustomDateInput = forwardRef<HTMLButtonElement, any>(({ value, onClick }, ref) => (
  <button 
    type="button" 
    className="field-input" 
    onClick={onClick} 
    ref={ref} 
    style={{ 
      textAlign: 'left', 
      whiteSpace: 'pre-wrap',
      minHeight: '46px',
      background: '#fff',
      cursor: 'pointer',
      lineHeight: '1.5'
    }}
  >
    {value ? value : "일시를 선택해주세요 (클릭)"}
  </button>
));
CustomDateInput.displayName = 'CustomDateInput';

export default function RentalForm() {
  const [startDate, setStartDate] = useState<Date | null>(null);
  const [endDate, setEndDate] = useState<Date | null>(null);
  
  const [formData, setFormData] = useState({ 
    name: '', 
    team: '', 
    phone: '', 
    location: '', 
    purpose: '', 
    requestNotes: '' 
  });
  
  // 장비별 수량을 저장하는 맵 (예: { "촬영용 카메라": 1, "HDMI 케이블": 3 })
  const [selEquip, setSelEquip] = useState<{ [key: string]: number }>({});
  
  const [agree, setAgree] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState<'eq' | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [scrolledToBottom, setScrolledToBottom] = useState(false);

  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (showModal && scrollRef.current) {
      const el = scrollRef.current;
      if (el.scrollHeight <= el.clientHeight) {
        setScrolledToBottom(true);
      }
    }
  }, [showModal]);

  // 수량 변경 함수
  const handleQuantityChange = (name: string, delta: number, max: number) => {
    const currentQty = selEquip[name] || 0;
    const newQty = currentQty + delta;

    const updated = { ...selEquip };
    if (newQty <= 0) {
      delete updated[name]; // 수량이 0이 되면 목록에서 제거
    } else if (newQty <= max) {
      updated[name] = newQty; // 최대 수량 이하일 때만 반영
    }
    setSelEquip(updated);
  };

  const handleSubmit = async () => {
    if (!formData.name || !formData.team || !formData.phone || !startDate || !endDate || Object.keys(selEquip).length === 0 || !formData.location || !formData.purpose) {
      return alert('모든 필수 항목을 입력하고 장비를 선택해주세요.');
    }
    
    setIsSubmitting(true);

    // 선택된 장비와 수량을 텍스트로 변환 (예: 촬영용 카메라(1개), HDMI 케이블(3개))
    const equipmentString = Object.entries(selEquip)
      .map(([name, qty]) => `${name} (${qty}개)`)
      .join(', ');

    const payload = { 
      ...formData,
      startDate: startDate?.toLocaleString(),
      endDate: endDate?.toLocaleString(),
      equipment: equipmentString,
      submittedAt: new Date().toLocaleString()
    };

    try {
      await fetch(SCRIPT_URL, {
        method: "POST",
        mode: "no-cors",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      await addDoc(collection(db, "reservations"), payload);
      setIsSuccess(true);
    } catch (e) {
      alert("전송 실패: 다시 시도해주세요.");
      setIsSubmitting(false);
    }
  };

  // 요약 텍스트 생성
  const summaryText = Object.keys(selEquip).length > 0 
    ? Object.entries(selEquip).map(([name, qty]) => `${name} ${qty}개`).join(', ')
    : "장비 선택 (클릭)";

  return (
   <div style={{ maxWidth: '600px', margin: '10px auto 40px auto', padding: '20px' }}>
      <style jsx global>{`
        .react-datepicker-wrapper { width: 100%; }
        .field-input { width: 100%; padding: 12px; border: 1px solid #ccc; border-radius: 5px; font-size: 16px; }
      `}</style>

      {!isSuccess ? (
        <>
          {/* 로고 위쪽 공간을 음수(-) 마진으로 바짝 끌어올림 */}
          <div style={{ textAlign: 'center', marginTop: '-25px', marginBottom: '2px' }}>
            <img 
              src="/ncmnlogo.png" 
              alt="NCMN 로고" 
              style={{ width: '200px', height: 'auto', display: 'inline-block', objectFit: 'contain', marginLeft: '-12px' }} 
            />
             <div style={{ textAlign: 'center', marginTop: '-45px', marginBottom: '10px' }}></div>
          </div>

          <h2 style={{ textAlign: 'center', marginBottom: '20px' }}>NCMN 미디어 장비 대여 신청서</h2>

          {/* 신청자 정보 */}
          <div className="section" style={{ marginBottom: '20px' }}>
            <div className="section-title" style={{ fontWeight: 'bold', marginBottom: '10px' }}>👤 신청자 정보</div>
            <div className="field" style={{ marginBottom: '10px' }}><label>이름</label><input type="text" onChange={(e) => setFormData({...formData, name: e.target.value})} style={{ width: '100%', padding: '10px', border: '1px solid #ccc', borderRadius: '5px' }} /></div>
            <div className="field" style={{ marginBottom: '10px' }}><label>사역팀</label><input type="text" onChange={(e) => setFormData({...formData, team: e.target.value})} style={{ width: '100%', padding: '10px', border: '1px solid #ccc', borderRadius: '5px' }} /></div>
            <div className="field" style={{ marginBottom: '10px' }}><label>연락처</label><input type="tel" onChange={(e) => setFormData({...formData, phone: e.target.value})} style={{ width: '100%', padding: '10px', border: '1px solid #ccc', borderRadius: '5px' }} /></div>
          </div>

          {/* 대여일시 / 반납일시 분리 */}
          <div className="section" style={{ marginBottom: '20px' }}>
            <div className="section-title" style={{ fontWeight: 'bold', marginBottom: '10px' }}>📅 대여 일정 선택</div>
            
            <div style={{ marginBottom: '12px' }}>
              <label style={{ display: 'block', fontSize: '14px', marginBottom: '5px', color: '#555' }}>대여 시작 일시</label>
              <DatePicker 
                selected={startDate} 
                onChange={(date) => setStartDate(date)} 
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
              <label style={{ display: 'block', fontSize: '14px', marginBottom: '5px', color: '#555' }}>반납 완료 일시</label>
              <DatePicker 
                selected={endDate} 
                onChange={(date) => setEndDate(date)} 
                locale={ko} 
                showTimeSelect 
                timeIntervals={30} 
                timeFormat="HH:mm" 
                dateFormat="yyyy.MM.dd HH:mm" 
                customInput={<CustomDateInput />} 
                placeholderText="반납 완료 일시 선택"
                minDate={startDate || undefined}
              />
            </div>
          </div>

          {/* 대여 장비 (수량 선택 기능 포함) */}
          <div className="section" style={{ position: 'relative', marginBottom: '20px' }}>
            <div className="section-title" style={{ fontWeight: 'bold', marginBottom: '10px' }}>📷 대여 장비</div>
            <div className="field">
              <div onClick={() => setDropdownOpen(dropdownOpen === 'eq' ? null : 'eq')} style={{ width: '100%', padding: '10px', border: '1px solid #ccc', borderRadius: '5px', cursor: 'pointer', background: '#f9f9f9' }}>
                {summaryText}
              </div>
              {dropdownOpen === 'eq' && (
                <div style={{ border: '1px solid #ccc', padding: '15px', marginTop: '5px', borderRadius: '5px', backgroundColor: '#fff', position: 'absolute', width: '100%', zIndex: 999, boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}>
                  <p style={{ fontSize: '13px', color: '#666', marginBottom: '10px' }}>* 필요한 장비의 수량을 선택해주세요.</p>
                  {equipList.map((item) => {
                    const qty = selEquip[item.name] || 0;
                    return (
                      <div key={item.name} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid #eee' }}>
                        <span style={{ fontSize: '14px' }}>{item.name} <small style={{ color: '#888' }}>(최대 {item.max}개)</small></span>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <button 
                            type="button" 
                            onClick={() => handleQuantityChange(item.name, -1, item.max)}
                            style={{ width: '28px', height: '28px', background: '#f0f0f0', border: '1px solid #ccc', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}
                          >-</button>
                          <span style={{ minWidth: '20px', textAlign: 'center', fontWeight: 'bold' }}>{qty}</span>
                          <button 
                            type="button" 
                            onClick={() => handleQuantityChange(item.name, 1, item.max)}
                            style={{ width: '28px', height: '28px', background: '#f0f0f0', border: '1px solid #ccc', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}
                          >+</button>
                        </div>
                      </div>
                    );
                  })}
                  <button onClick={() => setDropdownOpen(null)} style={{ marginTop: '15px', width: '100%', padding: '10px', background: '#007bff', color: 'white', borderRadius: '5px', border: 'none', cursor: 'pointer', fontWeight: 'bold' }}>선택 완료</button>
                </div>
              )}
              <label style={{ display: 'block', fontSize: '14px', marginTop: '15px', marginBottom: '5px', fontWeight: 'bold', color: '#555' }}>추가요청사항 (선택)</label>
            <textarea  
              placeholder="추가로 요청하실 사항이나 특이사항을 적어주세요. (예: 스틸카메라,노트북 1대, 저장장치1T 1개 등)"
              onChange={(e) => setFormData({...formData, requestNotes: e.target.value})} 
              style={{ width: '100%', padding: '10px', border: '1px solid #ccc', borderRadius: '5px', minHeight: '60px' }} 
            />
            </div>
          </div>

          {/* 사용 정보 */}
          <div className="section" style={{ marginBottom: '20px' }}>
            <div className="section-title" style={{ fontWeight: 'bold', marginBottom: '10px' }}>📍 사용 정보</div>
            <select onChange={(e) => setFormData({...formData, location: e.target.value})} style={{ width: '100%', padding: '10px', marginBottom: '10px', border: '1px solid #ccc', borderRadius: '5px', background: '#fff' }}>
              <option value="">장소 선택</option>
              {["서울 비전센터 B2층", "서울 비전센터 2층", "서울 비전센터 3층", "서울 비전센터 5층 회의실", "고성 비전센터", "영등포 2층", "외부(외부 대여는 사전에 액팅리더와의 소통이 필요합니다)"].map(loc => <option key={loc} value={loc}>{loc}</option>)}
            </select>
            
            <textarea 
              placeholder="사용 목적을 적어주세요." 
              onChange={(e) => setFormData({...formData, purpose: e.target.value})} 
              style={{ width: '100%', padding: '10px', marginBottom: '10px', border: '1px solid #ccc', borderRadius: '5px', minHeight: '80px' }} 
            />
          </div>

          {/* 동의 영역 */}
          <div style={{ margin: '20px 0', background: '#f8f9fa', padding: '15px', borderRadius: '5px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer', fontWeight: 'bold' }}>
                <input 
                  type="checkbox" 
                  checked={agree} 
                  readOnly 
                  style={{ width: '20px', height: '20px', marginRight: '10px' }} 
                />
                [필수] 대여 규정에 동의합니다.
              </label>
              <button onClick={() => setShowModal(true)} style={{ background: '#333', border: 'none', color: 'white', padding: '6px 12px', borderRadius: '5px', cursor: 'pointer', fontSize: '13px' }}>규정 보기</button>
            </div>
          </div>

          {/* 제출 버튼 */}
          <button 
            onClick={handleSubmit} 
            disabled={!agree || isSubmitting} 
            style={{ 
              width: '100%', 
              padding: '15px', 
              background: agree ? '#007bff' : '#cccccc', 
              color: 'white', 
              border: 'none', 
              borderRadius: '5px', 
              fontSize: '18px',
              cursor: agree ? 'pointer' : 'not-allowed',
              transition: 'background 0.3s'
            }}
          >
            {isSubmitting ? '제출 중...' : (agree ? '신청서 제출' : '규정 동의 후 제출 가능')}
          </button>
          {/* 하단 안내 문구 추가 */}
          <div style={{ marginTop: '25px', padding: '15px', background: '#f1f3f5', borderRadius: '5px', fontSize: '13px', color: '#555', lineHeight: '1.5', textAlign: 'center' }}>
            본 서비스는 NCMN 내부 사역팀의 장비 대여 관리를 위한 서비스입니다.<br/>
            수집된 개인정보는 장비 대여 신청 처리 외의 목적으로 사용되지 않습니다.<br/>
            문의사항은 카카오 채널을 통해 연락해주세요.
          </div>
        </>
      ) : (
       <div style={{ textAlign: 'center', marginTop: '50px' }}>
          <h2>🎉 신청 완료!</h2>
          <button onClick={() => window.location.reload()} style={{ padding: '10px 20px', marginTop: '20px', background: '#007bff', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer' }}>
            새로운 신청서 작성하기
          </button>
        </div>
      )}

      {/* 규정 팝업 모달 */}
      {showModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(0,0,0,0.6)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 }}>
          <div style={{ background: 'white', padding: '25px', borderRadius: '10px', width: '85%', maxWidth: '400px', maxHeight: '80vh', display: 'flex', flexDirection: 'column' }}>
            <h3 style={{ marginBottom: '10px' }}>대여 규정</h3>

            <div 
              ref={scrollRef}
              style={{ lineHeight: '1.7', fontSize: '15px', color: '#333', overflowY: 'auto', border: '1px solid #eee', padding: '10px', flex: 1, maxHeight: '40vh' }}
              onScroll={(e) => {
                const target = e.target as HTMLDivElement;
                if (target.scrollHeight - target.scrollTop <= target.clientHeight + 10) {
                  setScrolledToBottom(true);
                }
              }}
            >
              <p style={{ margin: '0 0 15px 0' }}>
                <strong>1. 반납일 준수</strong><br/>
                장비대여 반납일을 반드시 지켜주세요.
              </p>
              <p style={{ margin: '0 0 15px 0' }}>
                <strong>2. 장비 훼손 주의</strong><br/>
                장비가 훼손되지 않게 조심히 다뤄주세요.<br/>
                <span style={{ color: '#d9534f', fontSize: '13.5px' }}>* 안전사고 및 기기고장, 분실, 파손 등 사용상의 부주의나 과실로 인한 사고에 대해서는 해당 사역팀에 장비 수리비 비용 부담과 책임이 발생합니다.</span>
              </p>
              <p style={{ margin: '0 0 15px 0' }}>
                <strong>3. 대여 기간 제한</strong><br/>
                장비대여는 일정한 기간 동안만 가능합니다.<br/>
                <span style={{ color: '#555', fontSize: '13.5px' }}>* 사역이 끝나면 반납일에 맞게 바로 반납해주세요.</span>
              </p>
            </div>
            
            <button 
              onClick={() => {
                setAgree(true);
                setShowModal(false);
              }} 
              disabled={!scrolledToBottom} 
              style={{ 
                width: '100%', 
                padding: '12px', 
                background: scrolledToBottom ? '#007bff' : '#cccccc', 
                color: 'white', 
                border: 'none', 
                borderRadius: '5px', 
                fontSize: '16px', 
                marginTop: '15px', 
                cursor: scrolledToBottom ? 'pointer' : 'not-allowed' 
              }}
            >
              {scrolledToBottom ? '확인 및 동의하기' : '규정을 끝까지 읽어주세요'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}