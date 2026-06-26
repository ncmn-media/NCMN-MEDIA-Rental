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
  const [selLoc, setSelLoc] = useState('');
  const [agree, setAgree] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState<'eq' | null>(null); // 장비 선택용

  const toggleEquip = (name: string) => {
    const newSet = new Set(selEquip);
    if (newSet.has(name)) newSet.delete(name);
    else newSet.add(name);
    setSelEquip(newSet);
  };

  const handleSubmit = async () => {
    console.log("버튼 클릭됨!"); // <-- 이 줄이 핵심!
  console.log("현재 상태:", { name: formData.name, agree: agree, selEquipSize: selEquip.size });

    // 하나씩 체크해서 어디가 문제인지 알림 띄우기
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

      await addDoc(collection(db, "reservations"), payload);
      setIsSuccess(true);
    } catch (e) {
      console.error(e); // 여기서 에러 확인 가능
      alert('데이터베이스 연결에 실패했습니다. 환경 변수를 확인해주세요.');
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

          {/* 대여 기간 */}
          <div className="section">
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

          {/* 장비 선택 (깔끔하게 수정) */}
          <div className="section">
            <div className="section-title">📷 대여 장비</div>
            <div className="field">
              <div className="ms-trigger" onClick={() => setDropdownOpen(dropdownOpen === 'eq' ? null : 'eq')}>
                {selEquip.size > 0 ? Array.from(selEquip).join(', ') : "장비를 선택해주세요 (클릭)"}
              </div>
              
              {dropdownOpen === 'eq' && (
                <div className="dropdown-panel" style={{ border: '1px solid #ccc', padding: '10px', marginTop: '5px', borderRadius: '5px' }}>
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

         {/* 레이아웃 방해를 원천 차단한 확실한 제출 섹션 */}
          <div style={{ padding: '20px', borderTop: '1px solid #eee', marginTop: '30px', position: 'relative', zIndex: 9999 }}>
            
            {/* 박스 전체가 클릭되는 커스텀 동의 버튼 */}
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
        <div className="success-screen">신청 완료!</div>
      )}
    </div>
  );
}