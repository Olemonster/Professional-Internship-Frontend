import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Dialog, DialogContent } from '@mui/material';
import { ChartBarIcon } from '@heroicons/react/24/outline';
import api from '../../../api/axios';
import './RequestDetailsPage.css';

const StudentDetailsPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [userRole, setUserRole] = useState('');
  const [request, setRequest] = useState(null);
  const [evaluation, setEvaluation] = useState(null);
  const [loading, setLoading] = useState(true);
  const [imageModal, setImageModal] = useState(false);

  useEffect(() => {
    const userStr = localStorage.getItem('user');
    if (!userStr) {
      navigate('/login');
      return;
    }
    const userObj = JSON.parse(userStr);
    setUserRole(String(userObj.role || '').toLowerCase());

    const loadData = async () => {
      try {
        let reqData = null;

        // 1. Search requests by exact student ID or request ID
        try {
          const listRes = await api.get('/requests');
          const allReqs = listRes.data.data || [];
          reqData = allReqs.find((r) => 
            String(r.studentId) === String(id) || 
            String(r.id) === String(id) ||
            String(r.student_code) === String(id)
          ) || null;
        } catch (_) {
        }

        // 2. Search user baseline profile for exact student ID
        let userBaseline = null;
        try {
          const usersRes = await api.get('/users');
          const users = usersRes.data.data || [];
          userBaseline = users.find((item) => 
            String(item.student_code) === String(id) || 
            String(item.username) === String(id) || 
            String(item.studentId) === String(id)
          ) || null;
        } catch (_) {
        }

        if (reqData) {
          if (typeof reqData.details === 'string') {
            try {
              reqData.details = JSON.parse(reqData.details);
            } catch (e) {
              reqData.details = {};
            }
          }
          if (userBaseline) {
            reqData.studentName = reqData.studentName || (userBaseline.title ? `${userBaseline.title} ` : '') + (userBaseline.full_name || userBaseline.name || '');
            reqData.department = reqData.department || userBaseline.major || userBaseline.department || '';
          }
          setRequest(reqData);

          // Fetch company evaluation if available
          if (reqData.id && reqData.id !== '-') {
            try {
              const evalRes = await api.get(`/evaluations/request/${reqData.id}`);
              if (evalRes.data && evalRes.data.data) {
                setEvaluation(evalRes.data.data);
              }
            } catch (_) {}
          }
        } else if (userBaseline) {
          // Student exists but has NOT submitted any request yet
          setRequest({
            id: '-',
            submittedDate: null,
            status: 'ยังไม่ได้ยื่นคำร้อง',
            studentId: userBaseline.student_code || userBaseline.username || id,
            studentName: (userBaseline.title ? `${userBaseline.title} ` : '') + (userBaseline.full_name || userBaseline.name || '-'),
            department: userBaseline.major || userBaseline.department || '-',
            company: '-',
            position: '-',
            details: {
              student_info: {
                phone: userBaseline.phone || '-',
                email: userBaseline.email || '-',
                lastSemesterGrade: userBaseline.lastSemesterGrade || '-',
                address: userBaseline.address || null,
              },
              companyName: '-',
              position: '-',
              description: '-',
              skills: '-',
              contactPerson: '-',
              contactPhone: '-',
              contactEmail: '-',
            }
          });
        } else {
          setRequest(null);
        }
      } catch (err) {
        console.error('Failed to load data:', err);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [id, navigate]);

  const getStatusBadge = (status) => {
    const statusStyles = {
      'ยังไม่ได้ยื่นคำร้อง': { bg: '#f1f5f9', color: '#64748b' },
      'รออาจารย์ที่ปรึกษาอนุมัติ': { bg: '#fff3cd', color: '#856404' },
      'รอผู้ดูแลระบบตรวจสอบ': { bg: '#c3dafe', color: '#434190' },
      'รอผู้ดูแลระบบอนุมัติ': { bg: '#c3dafe', color: '#434190' },
      'รอสถานประกอบการตอบรับ': { bg: '#e2e8f0', color: '#2d3748' },
      'อนุมัติแล้ว': { bg: '#d4edda', color: '#155724' },
      'ออกฝึกงาน': { bg: '#c4f1f9', color: '#0c4a6e' },
      'ประเมินเสร็จแล้ว': { bg: '#ddd6fe', color: '#4c1d95' },
      'ฝึกงานเสร็จแล้ว': { bg: '#fbcfe8', color: '#9d174d' },
      'ไม่อนุมัติ (อาจารย์)': { bg: '#f8d7da', color: '#721c24' },
      'ไม่อนุมัติ (Admin)': { bg: '#f8d7da', color: '#721c24' },
      'ปฏิเสธ': { bg: '#f8d7da', color: '#721c24' }
    };
    const style = statusStyles[status] || { bg: '#e2e3e5', color: '#383d41' };
    return { ...style, label: status || 'ยังไม่ได้ยื่นคำร้อง' };
  };

  const formatAddress = (address) => {
    if (!address) return '-';
    if (typeof address === 'string') return address;

    const parts = [];
    if (address.house) parts.push(`บ้านเลขที่ ${address.house}`);
    if (address.moo) parts.push(`หมู่ ${address.moo}`);
    if (address.tambon) parts.push(`ตำบล ${address.tambon}`);
    if (address.amphur) parts.push(`อำเภอ ${address.amphur}`);
    if (address.province) parts.push(`จังหวัด ${address.province}`);
    if (address.postal) parts.push(`รหัสไปรษณีย์ ${address.postal}`);

    return parts.length > 0 ? parts.join(' ') : '-';
  };

  if (loading) {
    return (
      <div className="request-details-container">
        <p>กำลังโหลดข้อมูล...</p>
      </div>
    );
  }

  if (!request) {
    return (
      <div className="request-details-container">
        <div className="details-card">
          <h2>ไม่พบข้อมูลนักศึกษารหัส: {id}</h2>
          <button type="button" className="btn-back" style={{ marginTop: '1rem' }} onClick={() => navigate(-1)}>
            ย้อนกลับ
          </button>
        </div>
      </div>
    );
  }

  const details = request.details || {};
  const studentAddress = formatAddress(details.student_info?.address);
  const companyAddress = formatAddress(details.companyAddress || details.address);
  const internshipTermLabel = details.internshipTerm === 'term1'
    ? 'เทอม 1 (7–15 ส.ค.)'
    : details.internshipTerm === 'term2'
      ? 'เทอม 2 (3–10 ม.ค.)'
      : '';

  const statusInfo = getStatusBadge(request.status);

  return (
    <div className="request-details-container">
      <div className="details-card">
        <header className="details-header" style={{ position: 'relative', minHeight: '140px', paddingRight: details.studentPhoto?.dataUrl ? '130px' : '20px' }}>
          <div>
            <h2>รายละเอียดคำร้องฝึกงาน</h2>
            <p style={{ color: '#718096', marginTop: '5px' }}>
              {request.id && request.id !== '-' ? `เลขที่คำร้อง: ${request.id}` : 'ยังไม่มีเลขที่คำร้อง'}{' '}
              {request.submittedDate ? `(ยื่นเมื่อ: ${new Date(request.submittedDate).toLocaleDateString('th-TH')})` : ''}
            </p>
            <span className="status-badge-lg" style={{ backgroundColor: statusInfo.bg, color: statusInfo.color, marginTop: '10px', display: 'inline-block' }}>
              {statusInfo.label}
            </span>
          </div>
          {details.studentPhoto?.dataUrl && (
            <div 
              style={{ position: 'absolute', top: '20px', right: '20px', cursor: 'pointer' }} 
              onClick={() => setImageModal(true)}
              title="คลิกเพื่อดูรูปขยาย"
            >
              <img 
                src={details.studentPhoto.dataUrl} 
                alt="รูปนักศึกษา" 
                style={{ width: '100px', height: '120px', objectFit: 'cover', borderRadius: '4px', border: '1px solid #cbd5e1', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }} 
              />
            </div>
          )}
        </header>

        <section className="detail-section">
          <h3>ข้อมูลนักศึกษา</h3>
          <div className="detail-grid">
            <div className="detail-item">
              <span className="detail-label">ชื่อ-นามสกุล</span>
              <span className="detail-value">{request.studentName}</span>
            </div>
            <div className="detail-item">
              <span className="detail-label">รหัสนักศึกษา</span>
              <span className="detail-value">{request.studentId}</span>
            </div>
            <div className="detail-item">
              <span className="detail-label">สาขาวิชา</span>
              <span className="detail-value">{request.department}</span>
            </div>
            {details.student_info?.lastSemesterGrade && (
              <div className="detail-item">
                <span className="detail-label">เกรดเฉลี่ยเทอมล่าสุด</span>
                <span className="detail-value">{details.student_info.lastSemesterGrade}</span>
              </div>
            )}
            <div className="detail-item">
              <span className="detail-label">โทรศัพท์ / อีเมลติดต่อ</span>
              <span className="detail-value">{details.student_info?.phone || '-'} / {details.student_info?.email || '-'}</span>
            </div>
            {studentAddress && studentAddress !== '-' && (
              <div className="detail-item" style={{ gridColumn: '1 / -1' }}>
                <span className="detail-label">ที่อยู่ปัจจุบัน</span>
                <span className="detail-value">{studentAddress}</span>
              </div>
            )}
          </div>
        </section>

        <section className="detail-section">
          <h3>รายละเอียดสถานประกอบการ</h3>
          <div className="detail-grid">
            <div className="detail-item" style={{ gridColumn: '1 / -1' }}>
              <span className="detail-label">1. ชื่อบุคคล / ชื่อตำแหน่งงานติดต่อ / ผู้ประสานงานที่ติดต่อ</span>
              <span className="detail-value">
                {details.contactPerson || '-'} {details.contactPosition ? `(${details.contactPosition})` : ''}
              </span>
            </div>
            <div className="detail-item" style={{ gridColumn: '1 / -1' }}>
              <span className="detail-label">2. ชื่อหน่วยงาน / บริษัทที่ติดต่อ</span>
              <span className="detail-value">{details.companyName || request.company || '-'}</span>
            </div>
            <div className="detail-item" style={{ gridColumn: '1 / -1' }}>
              <span className="detail-label">3. ที่อยู่หน่วยงาน</span>
              <span className="detail-value">{companyAddress}</span>
            </div>
            <div className="detail-item">
              <span className="detail-label">4. โทรศัพท์ / อีเมลติดต่อ</span>
              <span className="detail-value">{details.contactPhone || '-'} / {details.contactEmail || '-'}</span>
            </div>
            <div className="detail-item" style={{ gridColumn: '1 / -1' }}>
              <span className="detail-label">5. ตำแหน่งงานที่ต้องการเข้าฝึกงาน</span>
              <span className="detail-value">{details.position || request.position || '-'}</span>
            </div>
            <div className="detail-item" style={{ gridColumn: '1 / -1' }}>
              <span className="detail-label">6. ข้อมูลเพิ่มเติม (ลักษณะงานที่ทำ / ทักษะที่ต้องการ)</span>
              <p className="detail-value" style={{ whiteSpace: 'pre-wrap', marginTop: '5px' }}>
                {details.description ? `ลักษณะงาน: ${details.description}\n` : ''}
                {details.skills ? `ทักษะ: ${details.skills}` : ''}
                {!details.description && !details.skills && '-'}
              </p>
            </div>
          </div>
        </section>

        <section className="detail-section">
          <h3>ความประสงค์ในการฝึกงาน</h3>
          <div className="detail-grid">
            {internshipTermLabel ? (
              <div className="detail-item">
                <span className="detail-label">ขอให้ออกหนังสือฝึกงานประจำ</span>
                <span className="detail-value">{internshipTermLabel}</span>
              </div>
            ) : (
              <>
                <div className="detail-item">
                  <span className="detail-label">วันที่ต้องการฝึกงานตั้งแต่วันที่</span>
                  <span className="detail-value">{details.startDate ? new Date(details.startDate).toLocaleDateString('th-TH') : '-'}</span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">ถึงวันที่</span>
                  <span className="detail-value">{details.endDate ? new Date(details.endDate).toLocaleDateString('th-TH') : '-'}</span>
                </div>
              </>
            )}
          </div>
        </section>

        {request.supervisionAppointment && (
          <section className="detail-section">
            <h3 style={{ color: '#0ea5e9' }}>กำหนดการนิเทศ (โดยอาจารย์ที่ปรึกษา)</h3>
            <div className="detail-grid">
              <div className="detail-item">
                <span className="detail-label">วันที่นิเทศ</span>
                <span className="detail-value" style={{ fontWeight: 'bold' }}>{request.supervisionAppointment.date ? new Date(request.supervisionAppointment.date).toLocaleDateString('th-TH') : '-'}</span>
              </div>
              <div className="detail-item">
                <span className="detail-label">รูปแบบ</span>
                <span className="detail-value">{request.supervisionAppointment.mode || '-'}</span>
              </div>
              <div className="detail-item">
                <span className="detail-label">สถานะการประเมิน</span>
                <span className="detail-value" style={{ 
                  fontWeight: 'bold', 
                  color: (request.supervisionReport || request.hasAdvisorEval) ? '#10b981' : '#f59e0b' 
                }}>
                  {(request.supervisionReport || request.hasAdvisorEval) ? 'นิเทศและประเมินเรียบร้อยแล้ว' : 'รอนิเทศงาน'}
                </span>
              </div>
              {request.supervisionAppointment.note && (
                <div className="detail-item" style={{ gridColumn: '1 / -1' }}>
                  <span className="detail-label">หมายเหตุ</span>
                  <span className="detail-value">{request.supervisionAppointment.note}</span>
                </div>
              )}
            </div>
          </section>
        )}

        {evaluation && (userRole === 'admin' || userRole === 'advisor') && (
          <section className="detail-section" style={{ marginTop: '30px', padding: '24px', backgroundColor: '#f8fafc', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
               <h3 style={{ color: '#0f172a', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '1.2rem', fontWeight: 700, margin: 0 }}>
                 <span style={{display: 'flex', alignItems: 'center', gap: '8px'}}><ChartBarIcon style={{width: 20, height: 20}}/> ผลการประเมินจากสถานประกอบการ</span>
               </h3>
            </div>
            
            {(() => {
              let score = 0;
              let answered = 0;
              for (let i = 1; i <= 20; i++) {
                if (evaluation[`q${i}`] !== null && evaluation[`q${i}`] !== undefined) {
                   score += parseInt(evaluation[`q${i}`]);
                   answered++;
                }
              }
              const maxScore = answered * 5;
              const percent = maxScore > 0 ? ((score / maxScore) * 100).toFixed(2) : 0;
              let gradeColor = '#10b981';
              if (percent < 50) gradeColor = '#ef4444';
              else if (percent < 70) gradeColor = '#f59e0b';
              else if (percent < 80) gradeColor = '#3b82f6';

              return (
                <div style={{ marginBottom: '24px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', alignItems: 'flex-end' }}>
                    <span style={{ fontWeight: '600', color: '#475569', fontSize: '1rem' }}>คะแนนรวม (Automated Grading)</span>
                    <span style={{ fontWeight: '800', color: gradeColor, fontSize: '1.5rem' }}>{score} <span style={{ fontSize: '1rem', color: '#94a3b8' }}>/ {maxScore}</span> ({percent}%)</span>
                  </div>
                  <div style={{ height: '12px', backgroundColor: '#e2e8f0', borderRadius: '6px', overflow: 'hidden' }}>
                     <div style={{ height: '100%', width: `${percent}%`, backgroundColor: gradeColor, transition: 'width 1s ease-in-out' }}></div>
                  </div>
                </div>
              );
            })()}
            
            <div className="detail-grid" style={{ gridTemplateColumns: '1fr', gap: '16px' }}>
               <div className="detail-item" style={{ backgroundColor: '#fff', padding: '12px 16px', borderRadius: '8px', border: '1px solid #f1f5f9' }}>
                  <span className="detail-label" style={{ color: '#64748b', fontSize: '0.9rem', marginBottom: '4px', display: 'block' }}>จุดเด่นของนักศึกษา</span>
                  <span className="detail-value" style={{ display: 'block', lineHeight: 1.5 }}>{evaluation.strengths || '-'}</span>
               </div>
               <div className="detail-item" style={{ backgroundColor: '#fff', padding: '12px 16px', borderRadius: '8px', border: '1px solid #f1f5f9' }}>
                  <span className="detail-label" style={{ color: '#64748b', fontSize: '0.9rem', marginBottom: '4px', display: 'block' }}>ข้อควรปรับปรุง</span>
                  <span className="detail-value" style={{ display: 'block', lineHeight: 1.5 }}>{evaluation.improvements || '-'}</span>
               </div>
               <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                 <div className="detail-item" style={{ backgroundColor: '#fff', padding: '12px 16px', borderRadius: '8px', border: '1px solid #f1f5f9' }}>
                    <span className="detail-label" style={{ color: '#64748b', fontSize: '0.9rem', marginBottom: '4px', display: 'block' }}>ความสนใจรับเข้าทำงานต่อ</span>
                    <span className="detail-value" style={{ display: 'block', fontWeight: '700', color: evaluation.hireFuture === 'รับ' ? '#10b981' : (evaluation.hireFuture === 'ไม่รับ' ? '#ef4444' : '#f59e0b') }}>
                       {evaluation.hireFuture || '-'}
                    </span>
                 </div>
                 <div className="detail-item" style={{ backgroundColor: '#fff', padding: '12px 16px', borderRadius: '8px', border: '1px solid #f1f5f9' }}>
                    <span className="detail-label" style={{ color: '#64748b', fontSize: '0.9rem', marginBottom: '4px', display: 'block' }}>ภาพรวมคุณภาพ</span>
                    <span className="detail-value" style={{ display: 'block', fontWeight: '600' }}>{evaluation.overallScore || '-'}</span>
                 </div>
               </div>
            </div>
          </section>
        )}

        {evaluation && userRole === 'student' && (
          <section className="detail-section" style={{ marginTop: '30px', padding: '20px', backgroundColor: '#f0fdf4', borderRadius: '12px', border: '1px solid #bbf7d0' }}>
             <h3 style={{ color: '#166534', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '1.1rem', fontWeight: 700, margin: 0 }}>
               <ChartBarIcon style={{ width: 20, height: 20, color: '#16a34a' }} /> ผลการประเมินจากสถานประกอบการ
             </h3>
             <p style={{ margin: '8px 0 0 0', color: '#15803d', fontWeight: 600 }}>
               สถานประกอบการได้ทำการประเมินผลการปฏิบัติงานของคุณเรียบร้อยแล้ว
             </p>
          </section>
        )}

        {/* Image Modal */}
        <Dialog open={imageModal} onClose={() => setImageModal(false)} maxWidth="md">
          <DialogContent style={{ padding: '0', backgroundColor: '#000', textAlign: 'center' }}>
            {details.studentPhoto?.dataUrl && (
              <img 
                src={details.studentPhoto.dataUrl} 
                alt="รูปนักศึกษา (Full)" 
                style={{ maxWidth: '100%', maxHeight: '90vh', objectFit: 'contain', display: 'block', margin: '0 auto' }} 
              />
            )}
          </DialogContent>
        </Dialog>

        <footer className="actions-footer">
          <button type="button" className="btn-back" onClick={() => navigate(-1)}>
            ย้อนกลับ
          </button>
        </footer>
      </div>
    </div>
  );
};

export default StudentDetailsPage;
