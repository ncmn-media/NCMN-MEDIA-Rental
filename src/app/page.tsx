"use client";
import { useState } from 'react';
import DatePicker from 'react-datepicker';
import "react-datepicker/dist/react-datepicker.css";
import { ko } from 'date-fns/locale';
import { db } from "../lib/firebase";
import { collection, addDoc } from "firebase/firestore";

const equipList = ["촬영용 카메라", "스틸(사진) 카메라", "카메라 삼각대", "촬영 무선 마이크", "저장장치 (SSD 외장하드)", "SD 메모리카드", "SDI 케이블", "HDMI 케이블", "Apple TV", "기타"];
const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbzRk1aE5AAwUzsv01ZPxDqcz_kyQ0pXV8rUSGYi4NQ9hqoaId5aFy_a_La6AhU-tmcI_Q/exec";

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
      startDate: startDate?.toLocaleDateString(),
      endDate: endDate?.toLocaleDateString() || startDate?.toLocaleDateString(),
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
            <DatePicker selectsRange={true} startDate={startDate} endDate={endDate} onChange={(update) => setDateRange(update)} locale={ko} dateFormat="yyyy년 MM월 dd일" className="field-input" />
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
              {["지하 2층", "2층", "3층", "5층"].map(loc => <option key={loc} value={loc}>{loc}</option>)}
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
            <p>1. 장비 사용 후 반드시 반납해주세요.<br/>2. 파손 시 책임이 발생합니다.</p>
            <button onClick={() => setShowModal(false)} style={{ width: '100%', padding: '10px', background: '#ccc' }}>닫기</button>
          </div>
        </div>
      )}
    </div>
  );
}