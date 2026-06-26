"use client";
import { useState } from 'react';
import DatePicker from 'react-datepicker'; // 1. 라이브러리 import
import "react-datepicker/dist/react-datepicker.css"; // 2. 스타일 import
import { ko } from 'date-fns/locale'; // 3. 한국어 설정

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
    if (!formData.name || !formData.team || !formData.phone || selEquip.size === 0 || !selLoc || !agree) {
      alert('필수 항목을 모두 입력해주세요.');
      return;
    }

    const payload = { 
      ...formData, 
      startDate: startDate ? startDate.toLocaleDateString() : '',
      endDate: endDate ? endDate.toLocaleDateString() : '',
      submittedAt: new Date().toLocaleString() 
    };

    try {
      // 여기에 본인의 Google Apps Script URL을 넣으세요
      await fetch('YOUR_APPS_SCRIPT_URL_HERE', {
        method: 'POST',
        mode: 'no-cors',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      setIsSuccess(true);
    } catch (e) {
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
                </div>
              )}
            </div>
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