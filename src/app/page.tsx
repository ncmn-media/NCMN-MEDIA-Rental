"use client";
import { useState } from 'react';
import DatePicker from 'react-datepicker';
import "react-datepicker/dist/react-datepicker.css";
import { ko } from 'date-fns/locale';
import { db } from "../lib/firebase";
import { collection, addDoc } from "firebase/firestore";

const equipList = ["촬영용 카메라", "스틸(사진) 카메라", "카메라 삼각대", "촬영 무선 마이크", "저장장치 (SSD 외장하드)", "SD 메모리카드", "SDI 케이블", "HDMI 케이블", "Apple TV", "기타"];
const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbyapQhIEv5Y3d6150sSEQEu3NdKd2KZ7iK7-a0HMSipQ19lxHtQ-h8syxK1f9ftFSNOfQ/exec";

export default function RentalForm() {
  const [dateRange, setDateRange] = useState<[Date | null, Date | null]>([null, null]);
  const [startDate, endDate] = dateRange;
  const [formData, setFormData] = useState({ name: '', team: '', phone: '', location: '', purpose: '' });
  const [selEquip, setSelEquip] = useState<Set<string>>(new Set());
  const [agree, setAgree] = useState(false);
  const [showModal, setShowModal] = useState(false);
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
    if (!formData.name || !formData.team || !formData.phone || !startDate || selEquip.size === 0 || !formData.location || !formData.purpose || !agree) {
      return alert('모든 항목을 입력하고 규정에 동의해주세요.');
    }
    
    setIsSubmitting(true);
    const payload = { 
      ...formData,
      startDate: startDate?.toLocaleString(),
      endDate: endDate?.toLocaleString() || startDate?.toLocaleString(),
      equipment: Array.from(selEquip).join(', '),
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

  return (
    <div style={{ maxWidth: '600px', margin: '40px auto', padding: '20px' }}>
      <style jsx global>{`
        .react-datepicker-wrapper { width: 100%; }
        .field-input { width: 100%; padding: 12px; border: 1px solid #ccc; border-radius: 5px; font-size: 16px; }
      `}</style>

      {!isSuccess ? (
        <>
          <h2 style={{ textAlign: 'center' }}>NCMN 미디어 장비 대여 신청서</h2>

          <div className="section" style={{ marginBottom: '20px' }}>
            <div className="section-title" style={{ fontWeight: 'bold', marginBottom: '10px' }}>👤 신청자 정보</div>
            <div className="field" style={{ marginBottom: '10px' }}><label>이름</label><input type="text" onChange={(e) => setFormData({...formData, name: e.target.value})} style={{ width: '100%', padding: '10px', border: '1px solid #ccc', borderRadius: '5px' }} /></div>
            <div className="field" style={{ marginBottom: '10px' }}><label>사역팀</label><input type="text" onChange={(e) => setFormData({...formData, team: e.target.value})} style={{ width: '100%', padding: '10px', border: '1px solid #ccc', borderRadius: '5px' }} /></div>
            <div className="field" style={{ marginBottom: '10px' }}><label>연락처</label><input type="tel" onChange={(e) => setFormData({...formData, phone: e.target.value})} style={{ width: '100%', padding: '10px', border: '1px solid #ccc', borderRadius: '5px' }} /></div>
          </div>

          <div className="section" style={{ position: 'relative', marginBottom: '20px' }}>
            <div className="section-title" style={{ fontWeight: 'bold', marginBottom: '10px' }}>📅 대여 기간 선택</div>
            <DatePicker 
                selectsRange={true} 
                startDate={startDate} 
                endDate={endDate} 
                onChange={(update) => setDateRange(update)} 
                locale={ko} 
                showTimeSelect // 시간 선택 활성화
                timeIntervals={30} // 30분 단위 선택
                timeFormat="HH:mm" // 시간 형식
                dateFormat="yyyy년 MM월 dd일 HH:mm" // 표시 형식
                className="field-input" 
                placeholderText="날짜 및 시간 선택"
              />
          </div>

          <div className="section" style={{ position: 'relative', marginBottom: '20px' }}>
            <div className="section-title" style={{ fontWeight: 'bold', marginBottom: '10px' }}>📷 대여 장비</div>
            <div className="field">
              <div onClick={() => setDropdownOpen(dropdownOpen === 'eq' ? null : 'eq')} style={{ width: '100%', padding: '10px', border: '1px solid #ccc', borderRadius: '5px', cursor: 'pointer', background: '#f9f9f9' }}>
                {selEquip.size > 0 ? Array.from(selEquip).join(', ') : "장비 선택 (클릭)"}
              </div>
              {dropdownOpen === 'eq' && (
                <div style={{ border: '1px solid #ccc', padding: '10px', marginTop: '5px', borderRadius: '5px', backgroundColor: '#fff', position: 'absolute', width: '100%', zIndex: 999 }}>
                  {equipList.map((item) => (
                    <div key={item} onClick={() => toggleEquip(item)} style={{ padding: '5px', cursor: 'pointer', background: selEquip.has(item) ? '#e6f7ff' : 'transparent' }}>
                      {selEquip.has(item) ? '✅ ' : '⬜ '} {item}
                    </div>
                  ))}
                  <button onClick={() => setDropdownOpen(null)} style={{ marginTop: '10px', width: '100%' }}>선택 완료</button>
                </div>
              )}
            </div>
          </div>

          <div className="section" style={{ marginBottom: '20px' }}>
            <div className="section-title" style={{ fontWeight: 'bold', marginBottom: '10px' }}>📍 사용 정보</div>
            <select onChange={(e) => setFormData({...formData, location: e.target.value})} style={{ width: '100%', padding: '10px', marginBottom: '10px', border: '1px solid #ccc', borderRadius: '5px' }}>
              <option value="">장소 선택</option>
              {["서울 비전센터 B2층", "서울 비전센터 2층", "서울 비전센터 3층", "서울 비전센터 5층 회의실", "고성 비전센터", "영등포 2층", "외부"].map(loc => <option key={loc} value={loc}>{loc}</option>)}
            </select>
            <textarea placeholder="사용 목적" onChange={(e) => setFormData({...formData, purpose: e.target.value})} style={{ width: '100%', padding: '10px', border: '1px solid #ccc', borderRadius: '5px' }} />
          </div>

          <div style={{ margin: '20px 0' }}>
            <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
              <input type="checkbox" checked={agree} onChange={(e) => setAgree(e.target.checked)} style={{ width: '20px', height: '20px', marginRight: '10px' }} />
              [필수] 대여 규정에 동의합니다.
            </label>
            <button onClick={() => setShowModal(true)} style={{ background: 'none', border: 'none', color: '#007bff', textDecoration: 'underline', marginTop: '5px' }}>규정 상세 보기</button>
          </div>

          <button onClick={handleSubmit} disabled={isSubmitting} style={{ width: '100%', padding: '15px', background: '#007bff', color: 'white', border: 'none', borderRadius: '5px', fontSize: '18px' }}>
            {isSubmitting ? '제출 중...' : '신청서 제출'}
          </button>
        </>
      ) : (
       <div style={{ textAlign: 'center', marginTop: '50px' }}>
          <h2>🎉 신청 완료!</h2>
          <button onClick={() => window.location.reload()} style={{ padding: '10px 20px', marginTop: '20px', background: '#007bff', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer' }}>
            새로운 신청서 작성하기
          </button>
        </div>
      )}

      {showModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
          <div style={{ background: 'white', padding: '20px', borderRadius: '10px', width: '80%', maxWidth: '400px' }}>
            <h3>대여 규정</h3>
            <p>1. 장비대여 반납일을 지켜주세요.<br/>2. 장비 훼손 되지 않게 조심히 다뤄주세요.<br/> *안전사고 및 기기고장, 분실, 파손 등 사용상의 부주의나 과실로 인한 사고에 대해서는 해당 사역팀에 장비 수리비 비용부담과 책임을 지게 됩니다.*
            <br/> 3. 장비대여는 일정한 기간 동안만 가능합니다.<br/> *사역이 끝나면 반납일에 맞게 바로 반납해주세요*<br/> * 외부 대여 관련 안내 드립니다*<br/>
            외부 대여는 액팅리더와 소통이 필요합니다.</p>
            <button onClick={() => setShowModal(false)} style={{ width: '100%', padding: '10px', background: '#ccc' }}>닫기</button>
          </div>
        </div>
      )}
    </div>
  );
}