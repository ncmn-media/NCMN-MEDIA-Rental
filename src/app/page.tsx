"use client";
import { useState } from 'react';
import DatePicker from 'react-datepicker';
import "react-datepicker/dist/react-datepicker.css";
import { ko } from 'date-fns/locale';
import { db } from "../lib/firebase";
import { collection, addDoc } from "firebase/firestore";

const equipList = ["촬영용 카메라", "스틸(사진) 카메라", "카메라 삼각대", "촬영 무선 마이크", "저장장치 (SSD 외장하드)", "SD 메모리카드", "SDI 케이블", "HDMI 케이블", "Apple TV", "기타"];

export default function RentalForm() {
  const [dateRange, setDateRange] = useState<[Date | null, Date | null]>([null, null]);
  const [startDate, endDate] = dateRange;
  const [formData, setFormData] = useState({
    name: '', team: '', phone: ''
  });
  const [selEquip, setSelEquip] = useState<Set<string>>(new Set());
  const [agree, setAgree] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState<'eq' | null>(null);

  const toggleEquip = (name: string) => {
    const newSet = new Set(selEquip);
    if (newSet.has(name)) newSet.delete(name);
    else newSet.add(name);
    setSelEquip(newSet);
  };

  const handleSubmit = async () => {
    console.log("버튼 클릭됨!"); 
    console.log("현재 상태:", { name: formData.name, agree: agree, selEquipSize: selEquip.size });

    if (!formData.name) return alert('이름을 입력해주세요.');
    if (!formData.team) return alert('사역팀을 입력해주세요.');
    if (!formData.phone) return alert('연락처를 입력해주세요.');
    if (!startDate) return alert('대여 시작일을 선택해주세요.');
    if (selEquip.size === 0) return alert('장비를 선택해주세요.');
    if (!agree) return alert('규정 동의 체크박스를 눌러주세요.');
    
    try {
      const payload = { 
        ...formData, 
        startDate: startDate?.toLocaleDateString(),
        endDate: endDate?.toLocaleDateString(),
        equipment: Array.from(selEquip).join(', '), 
        submittedAt: new Date().toLocaleString() 
      };

      console.log("👉 [1단계] Firebase로 전송을 시도합니다...", payload);
      
      // 전송 시작 시 사용자에게 진행 중임을 알림
      alert('신청서를 제출 중입니다. 잠시만 기다려주세요...');

      await addDoc(collection(db, "reservations"), payload);
      
      console.log("🎉 [2단계] Firebase 저장 성공!");
      setIsSuccess(true);
    } catch (e: any) {
      console.error("❌ Firebase 저장 실패:", e); 
      alert(`데이터베이스 연결에 실패했습니다. 에러 내용: ${e.message}`);
    }
  };

  return (
    <div className="form-wrap">
      {!isSuccess ? (
        <div id="form-body">
          <div className="form-title">NCMN 미디어 장비 대여 신청서</div>

          {/* 신청자 정보 */}
          <div className="section">
            <div className="section-title">👤 신청자 정보</div>
            <div className="field"><label>이름</label><input type="text" onChange={(e) => setFormData({...formData, name: e.target.value})} /></div>
            <div className="field"><label>사역팀</label><input type="text" onChange={(e) => setFormData({...formData, team: e.target.value})} /></div>
            <div className="field"><label>연락처</label><input type="tel" onChange={(e) => setFormData({...formData, phone: e.target.value})} /></div>
          </div>

          {/* 대여 기간 (z-index를 주어 하단 레이어 위로 배치) */}
          <div className="section" style={{ position: 'relative', zIndex: 100 }}>
            <div className="section-title">📅 대여 기간 선택</div>
            <DatePicker
              selectsRange={true}
              startDate={startDate}
              endDate={endDate}
              onChange={(update) => setDateRange(update)}
              locale={ko}
              dateFormat="yyyy년 MM월 dd일"
              placeholderText="날짜를 선택해주세요"
              className="field-input"
            />
          </div>

          {/* 장비 선택 */}
          <div className="section" style={{ position: 'relative', zIndex: 90 }}>
            <div className="section-title">📷 대여 장비</div>
            <div className="field">
              <div className="ms-trigger" onClick={() => setDropdownOpen(dropdownOpen === 'eq' ? null : 'eq')}>
                {selEquip.size > 0 ? Array.from(selEquip).join(', ') : "장비를 선택해주세요 (클릭)"}
              </div>
              
              {dropdownOpen === 'eq' && (
                <div className="dropdown-panel" style={{ border: '1px solid #ccc', padding: '10px', marginTop: '5px', borderRadius: '5px', backgroundColor: '#fff' }}>
                  {equipList.map((item) => (
                    <div key={item} onClick={() => toggleEquip(item)} style={{ padding: '5px', cursor: 'pointer', backgroundColor: selEquip.has(item) ? '#e6f7ff' : 'transparent' }}>
                      {selEquip.has(item) ? '✅ ' : '⬜ '} {item}
                    </div>
                  ))}
                  <button onClick={() => setDropdownOpen(null)} style={{ marginTop: '10px', width: '100%', padding: '10px', background: '#007bff', color: '#fff', border: 'none', borderRadius: '5px' }}>선택 완료</button>
                </div>
              )}
            </div>
          </div>

          {/* 하단 제출 섹션 (우선순위를 낮춰서 캘린더가 덮을 수 있게 수정) */}
          <div style={{ padding: '20px', borderTop: '1px solid #eee', marginTop: '30px', position: 'relative', zIndex: 1 }}>
            
            {/* 커스텀 동의 버튼 */}
            <div 
              onClick={() => setAgree(!agree)}
              style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: '12px', 
                cursor: 'pointer', 
                padding: '15px', 
                backgroundColor: agree ? '#e6f7ff' : '#f8f9fa', 
                borderRadius: '8px', 
                border: agree ? '1px solid #007bff' : '1px solid #ddd',
                marginBottom: '20px'
              }}
            >
              <div style={{ 
                width: '24px', 
                height: '24px', 
                border: '2px solid #007bff', 
                borderRadius: '4px', 
                display: 'flex', 
                justifyContent: 'center', 
                alignItems: 'center', 
                backgroundColor: agree ? '#007bff' : 'white' 
              }}>
                {agree && <span style={{ color: 'white', fontWeight: 'bold', fontSize: '16px' }}>✓</span>}
              </div>
              <span style={{ fontSize: '16px', userSelect: 'none', color: '#333' }}>
                [필수] 대여 규정을 확인했으며, 이에 동의합니다.
              </span>
            </div>

            {/* 제출 버튼 */}
            <button 
              onClick={handleSubmit} 
              style={{ 
                width: '100%', 
                padding: '15px', 
                backgroundColor: '#007bff', 
                color: 'white', 
                border: 'none', 
                borderRadius: '8px', 
                fontSize: '18px',
                cursor: 'pointer',
                fontWeight: 'bold'
              }}
            >
              신청서 제출
            </button>
          </div>

        </div> 
      ) : (
        <div className="success-screen" style={{ padding: '40px', textAlign: 'center', fontSize: '24px', fontWeight: 'bold', color: '#007bff' }}>
          🎉 신청 완료!
        </div>
      )}
    </div>
  );
}