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
  
  // 👉 [수정됨] formData에 location(장소)과 purpose(목적) 추가
  const [formData, setFormData] = useState({
    name: '', team: '', phone: '', location: '', purpose: ''
  });
  
  const [selEquip, setSelEquip] = useState<Set<string>>(new Set());
  const [agree, setAgree] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState<'eq' | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const toggleEquip = (name: string) => {
    const newSet = new Set(selEquip);
    if (newSet.has(name)) newSet.delete(name);
    else newSet.add(name);
    setSelEquip(newSet);
  };

  const handleSubmit = async () => {
    // 👉 [수정됨] 장소와 목적 필수 입력 검사 추가
    if (!formData.name) return alert('이름을 입력해주세요.');
    if (!formData.team) return alert('사역팀을 입력해주세요.');
    if (!formData.phone) return alert('연락처를 입력해주세요.');
    if (!startDate) return alert('대여 시작일을 선택해주세요.');
    if (selEquip.size === 0) return alert('장비를 선택해주세요.');
    if (!formData.location) return alert('사용 장소를 선택해주세요.');
    if (!formData.purpose) return alert('사용 목적을 입력해주세요.');
    if (!agree) return alert('규정 동의 체크박스를 눌러주세요.');
    
    setIsSubmitting(true);

    try {
      const payload = { 
        name: formData.name,
        team: formData.team,
        phone: formData.phone,
        location: formData.location, // 저장할 때 추가
        purpose: formData.purpose,   // 저장할 때 추가
        startDate: startDate ? startDate.toLocaleDateString() : "",
        endDate: endDate ? endDate.toLocaleDateString() : (startDate ? startDate.toLocaleDateString() : ""), 
        equipment: Array.from(selEquip).join(', '), 
        submittedAt: new Date().toLocaleString() 
      };

      await addDoc(collection(db, "reservations"), payload);
      await new Promise((resolve) => setTimeout(resolve, 500)); 
      
      setIsSuccess(true);
    } catch (e: any) {
      console.error("❌ Firebase 저장 실패:", e); 
      alert(`데이터베이스 연결에 실패했습니다. 에러 내용: ${e.message}`);
      setIsSubmitting(false);
    }
  };

  return (
    <div className="form-wrap" style={{ minHeight: '100vh', padding: '20px' }}>
      <style jsx global>{`
        .react-datepicker-popper {
          z-index: 9999 !important;
        }
      `}</style>

      {!isSuccess ? (
        <div id="form-body" style={{ maxWidth: '600px', margin: '0 auto', background: '#fff', padding: '20px', borderRadius: '10px', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}>
          <div className="form-title" style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '20px', textAlign: 'center' }}>NCMN 미디어 장비 대여 신청서</div>

          {/* 신청자 정보 */}
          <div className="section" style={{ marginBottom: '20px' }}>
            <div className="section-title" style={{ fontWeight: 'bold', marginBottom: '10px' }}>👤 신청자 정보</div>
            <div className="field" style={{ marginBottom: '10px' }}><label style={{ display: 'block', marginBottom: '5px' }}>이름</label><input type="text" onChange={(e) => setFormData({...formData, name: e.target.value})} style={{ width: '100%', padding: '10px', border: '1px solid #ccc', borderRadius: '5px' }} /></div>
            <div className="field" style={{ marginBottom: '10px' }}><label style={{ display: 'block', marginBottom: '5px' }}>사역팀</label><input type="text" onChange={(e) => setFormData({...formData, team: e.target.value})} style={{ width: '100%', padding: '10px', border: '1px solid #ccc', borderRadius: '5px' }} /></div>
            <div className="field" style={{ marginBottom: '10px' }}><label style={{ display: 'block', marginBottom: '5px' }}>연락처</label><input type="tel" onChange={(e) => setFormData({...formData, phone: e.target.value})} style={{ width: '100%', padding: '10px', border: '1px solid #ccc', borderRadius: '5px' }} /></div>
          </div>

          {/* 대여 기간 */}
          <div className="section" style={{ position: 'relative', marginBottom: '20px' }}>
            <div className="section-title" style={{ fontWeight: 'bold', marginBottom: '10px' }}>📅 대여 기간 선택</div>
            <DatePicker
              selectsRange={true}
              startDate={startDate}
              endDate={endDate}
              onChange={(update) => setDateRange(update)}
              locale={ko}
              dateFormat="yyyy년 MM월 dd일"
              placeholderText="날짜를 선택해주세요"
              className="field-input"
              customInput={<input style={{ width: '100%', padding: '10px', border: '1px solid #ccc', borderRadius: '5px' }} />}
            />
          </div>

          {/* 장비 선택 */}
          <div className="section" style={{ position: 'relative', marginBottom: '20px' }}>
            <div className="section-title" style={{ fontWeight: 'bold', marginBottom: '10px' }}>📷 대여 장비</div>
            <div className="field">
              <div onClick={() => setDropdownOpen(dropdownOpen === 'eq' ? null : 'eq')} style={{ width: '100%', padding: '10px', border: '1px solid #ccc', borderRadius: '5px', cursor: 'pointer', background: '#f9f9f9' }}>
                {selEquip.size > 0 ? Array.from(selEquip).join(', ') : "장비를 선택해주세요 (클릭)"}
              </div>
              
              {dropdownOpen === 'eq' && (
                <div style={{ border: '1px solid #ccc', padding: '10px', marginTop: '5px', borderRadius: '5px', backgroundColor: '#fff', position: 'absolute', width: '100%', zIndex: 999, boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}>
                  {equipList.map((item) => (
                    <div key={item} onClick={() => toggleEquip(item)} style={{ padding: '8px', cursor: 'pointer', backgroundColor: selEquip.has(item) ? '#e6f7ff' : 'transparent', borderRadius: '4px', marginBottom: '2px' }}>
                      {selEquip.has(item) ? '✅ ' : '⬜ '} {item}
                    </div>
                  ))}
                  <button onClick={() => setDropdownOpen(null)} style={{ marginTop: '10px', width: '100%', padding: '10px', background: '#007bff', color: '#fff', border: 'none', borderRadius: '5px', cursor: 'pointer' }}>선택 완료</button>
                </div>
              )}
            </div>
          </div>

          {/* 👉 [추가됨] 사용 장소 및 목적 */}
          <div className="section" style={{ position: 'relative', marginBottom: '20px' }}>
            <div className="section-title" style={{ fontWeight: 'bold', marginBottom: '10px' }}>📍 사용 정보</div>
            
            {/* 사용 장소 (드롭다운) */}
            <div className="field" style={{ marginBottom: '15px' }}>
              <label style={{ display: 'block', marginBottom: '5px' }}>사용 장소</label>
              <select 
                value={formData.location}
                onChange={(e) => setFormData({...formData, location: e.target.value})}
                style={{ width: '100%', padding: '10px', border: '1px solid #ccc', borderRadius: '5px', background: '#fff', fontSize: '15px' }}
              >
                <option value="">장소를 선택해주세요</option>
                <option value="NCMN 센터 지하 2층">NCMN 센터 지하 2층</option>
                <option value="NCMN 센터 2층">NCMN 센터 2층</option>
                <option value="NCMN 센터 3층">NCMN 센터 3층</option>
                <option value="NCMN 센터 5층">NCMN 센터 5층</option>
              </select>
            </div>

            {/* 사용 목적 (텍스트 입력) */}
            <div className="field" style={{ marginBottom: '10px' }}>
              <label style={{ display: 'block', marginBottom: '5px' }}>사용 목적</label>
              <textarea 
                placeholder="어떤 용도로 사용하시는지 상세히 적어주세요. (예: 주일 예배 촬영, 행사 스케치 등)"
                value={formData.purpose}
                onChange={(e) => setFormData({...formData, purpose: e.target.value})}
                style={{ width: '100%', padding: '10px', border: '1px solid #ccc', borderRadius: '5px', minHeight: '80px', resize: 'vertical', fontSize: '15px' }}
              />
            </div>
          </div>

          {/* 하단 제출 섹션 */}
          <div style={{ padding: '20px', borderTop: '1px solid #eee', marginTop: '30px' }}>
            <div 
              onClick={() => setAgree(!agree)}
              style={{ 
                display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer', padding: '15px', 
                backgroundColor: agree ? '#e6f7ff' : '#f8f9fa', borderRadius: '8px', 
                border: agree ? '1px solid #007bff' : '1px solid #ddd', marginBottom: '20px'
              }}
            >
              <div style={{ width: '24px', height: '24px', border: '2px solid #007bff', borderRadius: '4px', display: 'flex', justifyContent: 'center', alignItems: 'center', backgroundColor: agree ? '#007bff' : 'white' }}>
                {agree && <span style={{ color: 'white', fontWeight: 'bold', fontSize: '16px' }}>✓</span>}
              </div>
              <span style={{ fontSize: '15px', userSelect: 'none', color: '#333' }}>[필수] 대여 규정을 확인했으며, 이에 동의합니다.</span>
            </div>

            <button 
              onClick={handleSubmit} 
              disabled={isSubmitting}
              style={{ 
                width: '100%', padding: '15px', backgroundColor: isSubmitting ? '#a0c4ff' : '#007bff', color: 'white', 
                border: 'none', borderRadius: '8px', fontSize: '18px', cursor: isSubmitting ? 'wait' : 'pointer', fontWeight: 'bold'
              }}
            >
              {isSubmitting ? '제출 중...' : '신청서 제출'}
            </button>
          </div>
        </div> 
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '80vh', textAlign: 'center' }}>
          <div style={{ fontSize: '70px', marginBottom: '20px' }}>🎉</div>
          <h2 style={{ fontSize: '32px', fontWeight: 'bold', color: '#007bff', marginBottom: '15px' }}>신청이 완료되었습니다!</h2>
          <p style={{ fontSize: '18px', color: '#555', marginBottom: '30px' }}>담당자가 확인 후 연락드리겠습니다.</p>
          <button 
            onClick={() => window.location.reload()} 
            style={{ padding: '12px 24px', fontSize: '16px', backgroundColor: '#f8f9fa', border: '1px solid #ddd', borderRadius: '8px', cursor: 'pointer', color: '#333' }}
          >
            새로운 신청서 작성하기
          </button>
        </div>
      )}
    </div>
  );
}