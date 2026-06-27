"use client";
import React, { useState, forwardRef } from 'react';
import DatePicker from 'react-datepicker';
import "react-datepicker/dist/react-datepicker.css";
import { ko } from 'date-fns/locale';
import { db } from "../lib/firebase";
import { collection, addDoc } from "firebase/firestore";

const equipList = ["촬영용 카메라", "스틸(사진) 카메라", "카메라 삼각대", "촬영 무선 마이크", "저장장치 (SSD 외장하드)", "SD 메모리카드", "SDI 케이블", "HDMI 케이블", "Apple TV", "기타"];
const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbyapQhIEv5Y3d6150sSEQEu3NdKd2KZ7iK7-a0HMSipQ19lxHtQ-h8syxK1f9ftFSNOfQ/exec";

// 날짜 선택 시 줄바꿈을 지원하기 위한 커스텀 인풋 컴포넌트
const CustomDateInput = forwardRef<HTMLButtonElement, any>(({ value, onClick }, ref) => (
  <button 
    type="button" 
    className="field-input" 
    onClick={onClick} 
    ref={ref} 
    style={{ 
      textAlign: 'left', 
      whiteSpace: 'pre-wrap', // 줄바꿈 허용
      minHeight: '46px',
      background: '#fff',
      cursor: 'pointer',
      lineHeight: '1.5'
    }}
  >
    {value ? value.replace(" - ", " ~\n") : "날짜 및 시간 선택 (클릭)"}
  </button>
));
CustomDateInput.displayName = 'CustomDateInput';

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
    if (!formData.name || !formData.team || !formData.phone || !startDate || selEquip.size === 0 || !formData.location || !formData.purpose) {
      return alert('모든 항목을 입력해주세요.');
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
                showTimeSelect 
                timeIntervals={30} 
                timeFormat="HH:mm" 
                dateFormat="yyyy.MM.dd HH:mm" // 너무 길어지지 않게 포맷 축소
                customInput={<CustomDateInput />} // 커스텀 인풋 적용 (줄바꿈 용도)
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
                  <button onClick={() => setDropdownOpen(null)} style={{ marginTop: '10px', width: '100%', padding: '8px', borderRadius: '5px', border: '1px solid #ccc', cursor: 'pointer' }}>선택 완료</button>
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
            <textarea placeholder="사용 목적" onChange={(e) => setFormData({...formData, purpose: e.target.value})} style={{ width: '100%', padding: '10px', border: '1px solid #ccc', borderRadius: '5px', minHeight: '80px' }} />
          </div>

          <div style={{ margin: '20px 0', background: '#f8f9fa', padding: '15px', borderRadius: '5px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer', fontWeight: 'bold' }}>
                <input type="checkbox" checked={agree} onChange={(e) => setAgree(e.target.checked)} style={{ width: '20px', height: '20px', marginRight: '10px' }} />
                [필수] 대여 규정에 동의합니다.
              </label>
              <button onClick={() => setShowModal(true)} style={{ background: '#333', border: 'none', color: 'white', padding: '6px 12px', borderRadius: '5px', cursor: 'pointer', fontSize: '13px' }}>규정 보기</button>
            </div>
          </div>

          <button 
            onClick={handleSubmit} 
            disabled={!agree || isSubmitting} // 동의하지 않았거나 제출 중이면 버튼 비활성화
            style={{ 
              width: '100%', 
              padding: '15px', 
              background: agree ? '#007bff' : '#cccccc', // 비활성화 시 회색 처리
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
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(0,0,0,0.6)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 }}>
          <div style={{ background: 'white', padding: '25px', borderRadius: '10px', width: '85%', maxWidth: '400px', maxHeight: '80vh', overflowY: 'auto' }}>
            <h3 style={{ marginTop: 0, borderBottom: '2px solid #333', paddingBottom: '10px' }}>대여 규정</h3>
            <div style={{ lineHeight: '1.7', fontSize: '15px', color: '#333', marginTop: '15px' }}>
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
              <p style={{ margin: '0 0 15px 0' }}>
                <strong>4. 외부 대여 관련</strong><br/>
                <span style={{ color: '#555', fontSize: '13.5px' }}>* 외부 대여는 사전에 액팅리더와의 소통이 반드시 필요합니다.</span>
              </p>
            </div>
            
            <button 
              onClick={() => {
                setAgree(true); // 규정을 닫을 때 자동으로 동의되게 하려면 이 줄을 유지하고, 직접 체크하게 하려면 삭제하세요.
                setShowModal(false);
              }} 
              style={{ width: '100%', padding: '12px', background: '#007bff', color: 'white', border: 'none', borderRadius: '5px', fontSize: '16px', marginTop: '10px', cursor: 'pointer' }}
            >
              확인 및 동의하기
            </button>
          </div>
        </div>
      )}
    </div>
  );
}