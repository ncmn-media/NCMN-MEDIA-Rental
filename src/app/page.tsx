"use client";
import { useState } from 'react';
import DatePicker from 'react-datepicker'; // 1. 라이브러리 import
import "react-datepicker/dist/react-datepicker.css"; // 2. 스타일 import
import { ko } from 'date-fns/locale'; // 3. 한국어 설정
import { db } from "../lib/firebase"; // 아까 만든 firebase 설정 파일
import { collection, addDoc } from "firebase/firestore"; // Firestore 함수 추가

// 장비 목록과 장소 목록
const equipList = ["촬영용 카메라", "스틸(사진) 카메라", "카메라 삼각대", "촬영 무선 마이크", "저장장치 (SSD 외장하드)", "SD 메모리카드", "SDI 케이블", "HDMI 케이블", "Apple TV", "기타"];
const locList = ["서울 비전센터 B2층", "서울 비전센터 2층", "서울 비전센터 3층", "서울 비전센터 5층 회의실", "고성 비전센터", "영등포 2층", "해외사역", "외부"];

export default function RentalForm() {
  const [dateRange, setDateRange] = useState<[Date | null, Date | null]>([null, null]);
  const [startDate, endDate] = dateRange;
  const [formData, setFormData] = useState({
    name: '', team: '', phone: '', rentDate: '', rentTime: '', returnDate: '', returnTime: '', purpose: '', notes: ''
  });
  const [selEquip, setSelEquip] = useState<Set<string>>(new Set());
  const [selLoc, setSelLoc] = useState('');
  const [agree, setAgree] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState<'eq' | 'loc' | null>(null);
 
  const toggleEquip = (name: string) => {
    const newSet = new Set(selEquip);
    if (newSet.has(name)) newSet.delete(name);
    else newSet.add(name);
    setSelEquip(newSet);
  };

  const handleSubmit = async () => {
  // 0. 필수 값 체크 (기존 로직 유지)
  if (!formData.name || !formData.team || !formData.phone || selEquip.size === 0 || !selLoc || !agree) {
    alert('필수 항목을 모두 입력해주세요.');
    return;
  }

 // 1. 구체적인 유효성 검사
  if (!formData.name) return alert('이름을 입력해주세요.');
  if (!formData.team) return alert('사역팀을 입력해주세요.');
  if (!formData.phone) return alert('연락처를 입력해주세요.');
  if (!startDate || !endDate) return alert('대여 기간을 선택해주세요.'); // 날짜 체크 추가!
  if (selEquip.size === 0) return alert('장비를 하나 이상 선택해주세요.');
  if (!selLoc) return alert('대여 장소를 선택해주세요.');
  if (!agree) return alert('규정 동의에 체크해주세요.');

  // 2. 보낼 데이터 구성 (날짜 데이터 포함)
  const payload = { 
    ...formData, 
    startDate: startDate?.toLocaleDateString(), // 날짜 데이터 추가
    endDate: endDate?.toLocaleDateString(),
    equipment: Array.from(selEquip).join(', '), 
    location: selLoc, 
    submittedAt: new Date().toLocaleString() 
  };

  try {
    await fetch('YOUR_APPS_SCRIPT_URL_HERE', { /* ... 기존 코드 ... */ });
    await addDoc(collection(db, "reservations"), payload);
    setIsSuccess(true);
  } catch (e) {
    console.error("데이터 저장 실패:", e);
    alert('제출 중 오류가 발생했습니다.');
  }
};
  return (
    <div className="form-wrap">
      {!isSuccess ? (
        <div id="form-body">
          <div className="form-header">
            <div className="form-title">NCMN 미디어 장비 대여 신청서</div>
          </div>

          {/* 신청자 정보 */}
          <div className="section">
            <div className="section-title">👤 신청자 정보</div>
            <div className="field"><label>이름</label><input type="text" onChange={(e) => setFormData({...formData, name: e.target.value})} /></div>
            <div className="field"><label>사역팀</label><input type="text" onChange={(e) => setFormData({...formData, team: e.target.value})} /></div>
            <div className="field"><label>연락처</label><input type="tel" onChange={(e) => setFormData({...formData, phone: e.target.value})} /></div>
          </div>

          {/* 캘린더 섹션 */}
      <div className="section">
        <div className="section-title">📅 대여 기간 선택</div>
        <div className="field">
          <label>대여 시작일 ~ 반납 예정일</label>
          <DatePicker
            selectsRange={true}
            startDate={startDate}
            endDate={endDate}
            onChange={(update) => setDateRange(update)}
            locale={ko}
            dateFormat="yyyy년 MM월 dd일"
            placeholderText="날짜를 선택해주세요"
            className="w-full p-3 border rounded-lg" // 기존 스타일 유지
            isClearable={true}
          />
        </div>
      </div>

          {/* 장비 선택 (간략화된 예시) */}
          <div className="section">
            <div className="section-title">📷 대여 장비</div>
            <div className="ms-wrap">
              <div className="ms-trigger" onClick={() => setDropdownOpen(dropdownOpen === 'eq' ? null : 'eq')}>
                {selEquip.size > 0 ? `${selEquip.size}개 선택됨` : "장비를 선택해주세요"}
              </div>
              {dropdownOpen === 'eq' && (
  <div className="ms-dd open">
    {equipList.map(eq => (
      <div key={eq} className={`ms-opt ${selEquip.has(eq) ? 'sel' : ''}`} onClick={() => toggleEquip(eq)}>
        <span>{eq}</span>
      </div>
    ))}
    {/* 닫기 버튼 추가 */}
    <button 
      className="btn-close-dropdown" 
      onClick={() => setDropdownOpen(null)}
      style={{ width: '100%', marginTop: '10px' }}
    >
      선택 완료
    </button>
  </div>
)}
            </div>
          </div>

          {/* 동의 체크박스 (추가 필요) */}
<div className="field" style={{ marginTop: '20px' }}>
  <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
    <input 
      type="checkbox" 
      checked={agree} 
      onChange={(e) => setAgree(e.target.checked)} 
      style={{ marginRight: '10px' }}
    />
    <span>[필수] 대여 규정을 확인했으며, 이에 동의합니다.</span>
  </label>
</div>

          <button className="btn-submit" onClick={handleSubmit}>신청서 제출</button>
        </div>
      ) : (
        <div className="success-screen" style={{ display: 'block' }}>
          <div className="success-title">신청 완료!</div>
        </div>
      )}
    </div>
  );
}