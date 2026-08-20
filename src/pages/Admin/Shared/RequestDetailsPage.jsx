import { useEffect, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Box, Button, Dialog, DialogTitle, DialogContent, DialogActions, TextField, Typography, Snackbar, Alert as MuiAlert } from '@mui/material';
import { QRCodeSVG } from 'qrcode.react';
import { useReactToPrint } from 'react-to-print';
import api from '../../../api/axios';
import './RequestDetailsPage.css';
import PrintableEvaluationForm from '../../../components/PrintableEvaluationForm';
import { ChartBarIcon, PrinterIcon } from '@heroicons/react/24/outline';

const RequestDetailsPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [userRole, setUserRole] = useState(null);
  const [request, setRequest] = useState(null);
  const [evaluation, setEvaluation] = useState(null);
  const [advisorEvaluation, setAdvisorEvaluation] = useState(null);
  const [loading, setLoading] = useState(true);
  const [rejectModal, setRejectModal] = useState({ open: false, reason: '' });
  const [toast, setToast] = useState({ open: false, message: '', severity: 'success' });
  const [qrModal, setQrModal] = useState({ open: false, link: '' });
  const [dispatchModal, setDispatchModal] = useState({ open: false, file: null, submitting: false, error: '' });
  const [imageModal, setImageModal] = useState(false);
  const dispatchFileInputRef = useRef(null);
  const printRef = useRef(null);

  const handlePrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: `Evaluation_${request?.studentId || 'Report'}`,
  });

  useEffect(() => {
    // 1. Get User Role
    const userStr = localStorage.getItem('user');
    if (!userStr) {
      navigate('/login');
      return;
    }
    const user = JSON.parse(userStr);
    const normalizedRole = String(user.role || '').toLowerCase();
    setUserRole(normalizedRole);

    // 2. Load Request and Evaluation Details from API
    Promise.all([
      api.get(`/requests/${id}`),
      api.get(`/evaluations/request/${id}`).catch(() => ({ data: { data: null } })),
      api.get(`/advisor-evaluations/request/${id}`).catch(() => ({ data: { data: null } }))
    ]).then(([reqRes, evalRes, advisorEvalRes]) => {
      if (reqRes.data.data) {
        setRequest(reqRes.data.data);
        setEvaluation(evalRes.data.data);
        setAdvisorEvaluation(advisorEvalRes.data.data);
      } else {
        setToast({ open: true, message: 'ไม่พบข้อมูลคำร้อง', severity: 'error' });
        navigate(-1);
      }
      setLoading(false);
    }).catch(err => {
      console.error('Failed to load data:', err);
      setToast({ open: true, message: 'ไม่พบข้อมูลคำร้อง', severity: 'error' });
      setLoading(false);
      navigate(-1);
    });
  }, [id, navigate]);

  const fileToDataUrl = (file) => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error('ไม่สามารถอ่านไฟล์ได้'));
    reader.readAsDataURL(file);
  });

  const handleApprove = async () => {
    if (userRole === 'advisor') {
      try {
        await api.patch(`/requests/${id}/status`, { status: 'รอผู้ดูแลระบบตรวจสอบ' });
        setRequest({ ...request, status: 'รอผู้ดูแลระบบตรวจสอบ' });
        setToast({ open: true, message: 'อนุมัติคำร้องเรียบร้อยแล้ว', severity: 'success' });
        navigate(-1);
      } catch (err) {
        setToast({ open: true, message: 'อัปเดตล้มเหลว: ' + (err.response?.data?.message || err.message), severity: 'error' });
      }
      return;
    }

    if (userRole === 'admin') {
      const isStartInternshipWaiting = ['รออาจารย์อนุมัติเริ่มฝึกงาน', 'รอแอดมินอนุมัติเริ่มฝึกงาน', 'อนุมัติแล้ว'].includes(request?.status);
      if (isStartInternshipWaiting) {
        try {
          await api.patch(`/requests/${id}/status`, { status: 'ออกฝึกงาน' });
          setRequest({ ...request, status: 'ออกฝึกงาน' });
          setToast({ open: true, message: 'อนุมัติการออกฝึกงานเรียบร้อยแล้ว', severity: 'success' });
          navigate(-1);
        } catch (err) {
          setToast({ open: true, message: 'อัปเดตล้มเหลว: ' + (err.response?.data?.message || err.message), severity: 'error' });
        }
        return;
      }

      handleOpenDispatchModal();
    }
  };

  const handleOpenDispatchModal = () => {
    if (dispatchFileInputRef.current) {
      dispatchFileInputRef.current.value = '';
    }
    setDispatchModal({ open: true, file: null, comment: '', submitting: false, error: '' });
  };

  const handleDispatchModalClose = () => {
    if (dispatchFileInputRef.current) {
      dispatchFileInputRef.current.value = '';
    }
    setDispatchModal({ open: false, file: null, comment: '', submitting: false, error: '' });
  };

  const handleDispatchFileChange = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg'];
    if (!allowedTypes.includes(file.type)) {
      setDispatchModal((prev) => ({ ...prev, error: 'รองรับเฉพาะไฟล์ PDF, JPG หรือ PNG เท่านั้น', file: null }));
      event.target.value = '';
      return;
    }
    if (file.size > 20 * 1024 * 1024) {
      setDispatchModal((prev) => ({ ...prev, error: 'ขนาดไฟล์ต้องไม่เกิน 20MB', file: null }));
      event.target.value = '';
      return;
    }
    setDispatchModal((prev) => ({ ...prev, file, error: '' }));
  };

  const handleDispatchSubmit = async () => {
    if (!dispatchModal.file) {
      setDispatchModal((prev) => ({ ...prev, error: 'กรุณาเลือกไฟล์หนังสือส่งตัวก่อนอนุมัติ' }));
      return;
    }
    setDispatchModal((prev) => ({ ...prev, submitting: true, error: '' }));
    try {
      const dataUrl = await fileToDataUrl(dispatchModal.file);
      const payload = {
        status: 'รอสถานประกอบการตอบรับ',
        admin_comment: dispatchModal.comment?.trim() || null,
        dispatchLetter: {
          fileName: dispatchModal.file.name,
          mimeType: dispatchModal.file.type,
          dataUrl,
        },
      };
      await api.patch(`/requests/${id}/status`, payload);
      const updated = { ...request, status: 'รอสถานประกอบการตอบรับ', admin_comment: dispatchModal.comment?.trim() || null, dispatchLetter: { fileName: dispatchModal.file.name } };
      setRequest(updated);
      setToast({ open: true, message: 'ตรวจสอบและส่งคำขอไปยังสถานประกอบการเรียบร้อยแล้ว', severity: 'success' });
      const link = `${window.location.origin}/public/request/${id}`;
      setQrModal({ open: true, link });
      handleDispatchModalClose();
    } catch (err) {
      setDispatchModal((prev) => ({ ...prev, submitting: false, error: err.response?.data?.message || err.message || 'อัปเดตล้มเหลว' }));
    }
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(qrModal.link).then(() => {
      setToast({ open: true, message: 'คัดลอกลิงก์แล้ว', severity: 'success' });
    }).catch(() => {
      setToast({ open: true, message: 'ไม่สามารถคัดลอกลิงก์ได้', severity: 'error' });
    });
  };

  const handleCloseQrModal = () => {
    setQrModal({ open: false, link: '' });
    navigate(-1);
  };

  const handleReject = () => {
    setRejectModal({ open: true, reason: '' });
  };

  const handleRejectConfirm = async () => {
    if (!rejectModal.reason.trim()) {
      setToast({ open: true, message: 'กรุณาระบุเหตุผลที่ไม่อนุมัติ/ปฏิเสธ', severity: 'warning' });
      return;
    }

    let newStatus = '';
    if (userRole === 'advisor') {
      newStatus = 'ไม่อนุมัติ (อาจารย์)';
    } else if (userRole === 'admin') {
      newStatus = 'ไม่อนุมัติ (Admin)';
    }

    if (newStatus) {
      const reason = rejectModal.reason.trim();
      try {
        const commentField = userRole === 'advisor' ? 'advisor_comment' : 'admin_comment';
        await api.patch(`/requests/${id}/status`, { status: newStatus, [commentField]: reason });
        setRequest({ ...request, status: newStatus, rejectReason: reason });
        setToast({ open: true, message: 'บันทึกผลการไม่อนุมัติ/ปฏิเสธเรียบร้อย', severity: 'info' });
        setRejectModal({ open: false, reason: '' });
        navigate(-1);
      } catch (err) {
        setToast({ open: true, message: 'อัปเดตล้มเหลว: ' + (err.response?.data?.message || err.message), severity: 'error' });
      }
    }
  };

  const handleRejectClose = () => {
    setRejectModal({ open: false, reason: '' });
  };

  const getStatusBadge = (status) => {
    const statusStyles = {
      'รออาจารย์ที่ปรึกษาอนุมัติ': { bg: '#fff3cd', color: '#856404' },
      'รอผู้ดูแลระบบตรวจสอบ': { bg: '#c3dafe', color: '#434190' },
      'รอผู้ดูแลระบบอนุมัติ': { bg: '#c3dafe', color: '#434190' }, // Legacy support
      'รอสถานประกอบการตอบรับ': { bg: '#e2e8f0', color: '#2d3748' },
      'รออาจารย์อนุมัติเริ่มฝึกงาน': { bg: '#d1fae5', color: '#065f46', label: 'รอแอดมินอนุมัติการออกฝึกงาน' },
      'รอแอดมินอนุมัติเริ่มฝึกงาน': { bg: '#d1fae5', color: '#065f46', label: 'รอแอดมินอนุมัติการออกฝึกงาน' },
      'อนุมัติแล้ว': { bg: '#d1fae5', color: '#065f46', label: 'รอแอดมินอนุมัติการออกฝึกงาน' },
      'ออกฝึกงาน': { bg: '#c4f1f9', color: '#0c4a6e' },
      'ประเมินเสร็จแล้ว': { bg: '#ddd6fe', color: '#4c1d95' },
      'ฝึกงานเสร็จแล้ว': { bg: '#fbcfe8', color: '#9d174d' },
      'ไม่อนุมัติ (อาจารย์)': { bg: '#f8d7da', color: '#721c24' },
      'ไม่อนุมัติ (Admin)': { bg: '#f8d7da', color: '#721c24' },
      'ปฏิเสธ': { bg: '#f8d7da', color: '#721c24' }
    };
    const style = statusStyles[status] || { bg: '#e2e3e5', color: '#383d41' };
    return { ...style, label: style.label || status };
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
    if (address.detail) parts.push(address.detail);

    return parts.length ? parts.join(' ') : '-';
  };

  if (loading || !request) return <div className="loading">กำลังโหลดข้อมูล...</div>;

  const normalizedStatus = String(request.status || '').trim();
  const statusInfo = getStatusBadge(normalizedStatus || request.status);
  const details = request.details || {}; // Fields from NewRequestPage payload
  const studentAddress = formatAddress(details.student_info?.address);
  const companyAddress = formatAddress(details.companyAddress || details.address);
  const internshipTermLabel = details.internshipTerm === 'term1'
    ? 'เทอม 1 (7–15 ส.ค.)'
    : details.internshipTerm === 'term2'
      ? 'เทอม 2 (3–10 ม.ค.)'
      : '';

  // Determine if current user can execute actions
  const isAdvisorPending = normalizedStatus === 'รออาจารย์ที่ปรึกษาอนุมัติ' || normalizedStatus === 'รออนุมัติ';
  const isAdminPending = normalizedStatus === 'รอผู้ดูแลระบบตรวจสอบ'
    || normalizedStatus === 'รอผู้ดูแลระบบอนุมัติ'
    || normalizedStatus === 'รออนุมัติ';
  const canApprove = (userRole === 'advisor' && isAdvisorPending) || (userRole === 'admin' && isAdminPending);

  return (
    <div className="request-details-container">
      <div className="details-card">
        <header className="details-header" style={{ position: 'relative', minHeight: '140px', paddingRight: details.studentPhoto?.dataUrl ? '130px' : '20px' }}>
          <div>
            <h2>รายละเอียดคำร้องฝึกงาน</h2>
            <p style={{ color: '#718096', marginTop: '5px' }}>เลขที่คำร้อง: {request.id} (ยื่นเมื่อ: {new Date(request.submittedDate).toLocaleDateString('th-TH')})</p>
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
              <span className="detail-value">{details.companyName || request.company}</span>
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
              <span className="detail-value">{details.position || request.position}</span>
            </div>
            <div className="detail-item" style={{ gridColumn: '1 / -1' }}>
              <span className="detail-label">6. ข้อมูลเพิ่มเติม (ลักษณะงานที่ทำ / ทักษะที่ต้องการ)</span>
              <p className="detail-value" style={{whiteSpace: 'pre-wrap', marginTop: '5px'}}>
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
                  {(request.supervisionReport || request.hasAdvisorEval) ? 'นิเทศเสร็จแล้ว' : 'รอนิเทศงาน'}
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


        {request.rejectReason && (
             <section className="detail-section" style={{ backgroundColor: '#fff5f5', padding: '15px', borderRadius: '8px', border: '1px solid #fed7d7' }}>
               <h3 style={{ color: '#c53030', borderLeftColor: '#c53030' }}>เหตุผลที่ไม่อนุมัติ</h3>
                <p className="detail-value" style={{ color: '#c53030' }}>{request.rejectReason}</p>
         </section>
        )}

        {evaluation && (userRole === 'admin' || userRole === 'advisor') && (
          <section className="detail-section" style={{ marginTop: '30px', padding: '24px', backgroundColor: '#f8fafc', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
               <h3 style={{ color: '#0f172a', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '1.2rem', fontWeight: 700, margin: 0 }}>
                 <span style={{display: 'flex', alignItems: 'center', gap: '8px'}}><ChartBarIcon style={{width: 20, height: 20}}/> ผลการประเมินจากสถานประกอบการ</span>
               </h3>
               <Button variant="outlined" sx={{ borderColor: '#64748b', color: '#475569', '&:hover': { bgcolor: '#f1f5f9' } }} onClick={() => handlePrint()}>
                 <span style={{display: 'flex', alignItems: 'center', gap: '8px'}}><PrinterIcon style={{width: 20, height: 20}}/> พิมพ์เอกสาร (PDF)</span>
               </Button>
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

        {advisorEvaluation && (userRole === 'admin' || userRole === 'advisor') && (
          <section className="detail-section" style={{ marginTop: '30px', padding: '24px', backgroundColor: '#f0fdf4', borderRadius: '12px', border: '1px solid #bbf7d0' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3 style={{ color: '#166534', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '1.2rem', fontWeight: 700, margin: 0 }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <ChartBarIcon style={{ width: 20, height: 20 }} /> ผลการนิเทศและประเมิน (โดยอาจารย์ที่ปรึกษา)
                </span>
              </h3>
              <span style={{ fontSize: '0.85rem', color: '#15803d', fontWeight: 600, backgroundColor: '#dcfce7', padding: '4px 12px', borderRadius: '999px' }}>
                ผู้ประเมิน: {advisorEvaluation.advisorName || 'อาจารย์ที่ปรึกษา'}
              </span>
            </div>

            {(() => {
              let cScore = 0, cCount = 0;
              let sScore = 0, sCount = 0;
              for (let i = 1; i <= 17; i++) {
                const val = parseInt(advisorEvaluation[`c${i}`]);
                if (!isNaN(val)) { cScore += val; cCount++; }
              }
              for (let i = 1; i <= 20; i++) {
                const val = parseInt(advisorEvaluation[`s${i}`]);
                if (!isNaN(val)) { sScore += val; sCount++; }
              }

              const totalScore = cScore + sScore;
              const maxTotal = (cCount * 5) + (sCount * 5);
              const percent = maxTotal > 0 ? ((totalScore / maxTotal) * 100).toFixed(2) : 0;

              let gradeColor = '#10b981';
              if (percent < 50) gradeColor = '#ef4444';
              else if (percent < 70) gradeColor = '#f59e0b';
              else if (percent < 80) gradeColor = '#3b82f6';

              return (
                <div style={{ marginBottom: '24px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', alignItems: 'flex-end' }}>
                    <span style={{ fontWeight: '600', color: '#166534', fontSize: '1rem' }}>คะแนนรวมการนิเทศงาน (Advisor Supervision Grading)</span>
                    <span style={{ fontWeight: '800', color: gradeColor, fontSize: '1.5rem' }}>
                      {totalScore} <span style={{ fontSize: '1rem', color: '#64748b' }}>/ {maxTotal}</span> ({percent}%)
                    </span>
                  </div>
                  <div style={{ height: '12px', backgroundColor: '#dcfce7', borderRadius: '6px', overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${percent}%`, backgroundColor: gradeColor, transition: 'width 1s ease-in-out' }}></div>
                  </div>
                </div>
              );
            })()}

            <div className="detail-grid" style={{ gridTemplateColumns: '1fr', gap: '16px' }}>
              {advisorEvaluation.companyComments && (
                <div className="detail-item" style={{ backgroundColor: '#fff', padding: '12px 16px', borderRadius: '8px', border: '1px solid #dcfce7' }}>
                  <span className="detail-label" style={{ color: '#166534', fontSize: '0.9rem', marginBottom: '4px', display: 'block' }}>ความคิดเห็นต่อสถานประกอบการ</span>
                  <span className="detail-value" style={{ display: 'block', lineHeight: 1.5 }}>{advisorEvaluation.companyComments}</span>
                </div>
              )}
              {advisorEvaluation.studentComments && (
                <div className="detail-item" style={{ backgroundColor: '#fff', padding: '12px 16px', borderRadius: '8px', border: '1px solid #dcfce7' }}>
                  <span className="detail-label" style={{ color: '#166534', fontSize: '0.9rem', marginBottom: '4px', display: 'block' }}>ข้อเสนอแนะต่อนักศึกษา</span>
                  <span className="detail-value" style={{ display: 'block', lineHeight: 1.5 }}>{advisorEvaluation.studentComments}</span>
                </div>
              )}
            </div>
          </section>
        )}

        <footer className="actions-footer">
          <Button variant="outlined" className="btn-back" onClick={() => navigate(-1)}>
            ย้อนกลับ
          </Button>
          
          {normalizedStatus === 'รอสถานประกอบการตอบรับ' && (
            <Button 
              variant="contained" 
              sx={{ bgcolor: '#10b981', '&:hover': { bgcolor: '#059669' }, color: 'white' }}
              onClick={() => {
                const link = `${window.location.origin}/public/request/${id}`;
                setQrModal({ open: true, link });
              }}
            >
              ดู QR Code
            </Button>
          )}
          
          {canApprove && (
            <>
              <Button variant="contained" color="error" className="btn-reject-lg" onClick={handleReject}>
                ✗ ไม่อนุมัติ
              </Button>
              <Button variant="contained" color="success" className="btn-approve-lg" onClick={handleApprove}>
                ✓ อนุมัติคำร้อง
              </Button>
            </>
          )}
        </footer>
      </div>

      <Dialog open={rejectModal.open} onClose={handleRejectClose} fullWidth maxWidth="sm">
        <DialogTitle>ระบุเหตุผลที่ไม่อนุมัติ/ปฏิเสธ</DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            multiline
            rows={4}
            margin="dense"
            label="เหตุผล"
            value={rejectModal.reason}
            onChange={(event) => setRejectModal(prev => ({ ...prev, reason: event.target.value }))}
            placeholder="กรอกเหตุผลที่ไม่อนุมัติ/ปฏิเสธ"
          />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={handleRejectClose}>ยกเลิก</Button>
          <Button variant="contained" color="error" onClick={handleRejectConfirm}>ยืนยัน</Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={toast.open}
        autoHideDuration={2600}
        onClose={() => setToast((prev) => ({ ...prev, open: false }))}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <MuiAlert
          elevation={6}
          variant="filled"
          onClose={() => setToast((prev) => ({ ...prev, open: false }))}
          severity={toast.severity}
          sx={{ width: '100%' }}
        >
          {toast.message}
        </MuiAlert>
      </Snackbar>

      <Dialog open={dispatchModal.open} onClose={handleDispatchModalClose} fullWidth maxWidth="sm">
        <DialogTitle sx={{ fontWeight: 700 }}>แนบไฟล์หนังสือส่งตัวก่อนอนุมัติ</DialogTitle>
        <DialogContent sx={{ py: 3 }}>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            กรุณาอัปโหลดไฟล์หนังสือส่งตัว (PDF, JPG หรือ PNG) และสามารถระบุข้อความ/หมายเหตุเพิ่มเติมถึงนักศึกษาได้
          </Typography>

          <TextField
            fullWidth
            multiline
            minRows={3}
            label="ข้อความเพิ่มเติม / หมายเหตุถึงนักศึกษา (ถ้ามี)"
            placeholder="เช่น ให้นักศึกษานำรูปถ่าย 2 นิ้ว 2 ใบมาเพิ่ม หรือรายละเอียดวันเวลารับเอกสารเพิ่มเติม"
            value={dispatchModal.comment || ''}
            onChange={(e) => setDispatchModal((prev) => ({ ...prev, comment: e.target.value }))}
            sx={{ mb: 2.5 }}
          />

          <Box sx={{ mb: 1.5 }}>
            <Button variant="outlined" component="label">
              เลือกไฟล์หนังสือส่งตัว
              <input
                ref={dispatchFileInputRef}
                type="file"
                hidden
                accept="application/pdf,image/jpeg,image/png,image/jpg"
                onChange={handleDispatchFileChange}
              />
            </Button>
          </Box>
          {dispatchModal.file && (
            <Typography variant="body2" sx={{ mb: 1, color: '#059669', fontWeight: 600 }}>
              ✓ ไฟล์ที่เลือก: <strong>{dispatchModal.file.name}</strong>
            </Typography>
          )}
          {dispatchModal.error && (
            <Typography variant="body2" color="error" sx={{ mt: 1 }}>
              {dispatchModal.error}
            </Typography>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={handleDispatchModalClose} disabled={dispatchModal.submitting}>ยกเลิก</Button>
          <Button
            variant="contained"
            onClick={handleDispatchSubmit}
            disabled={dispatchModal.submitting}
            sx={{ bgcolor: '#111', '&:hover': { bgcolor: '#000' } }}
          >
            {dispatchModal.submitting ? 'กำลังอัปโหลด...' : 'แนบไฟล์และอนุมัติ'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* QR Code Modal */}
      <Dialog open={qrModal.open} onClose={handleCloseQrModal} fullWidth maxWidth="sm">
        <DialogTitle sx={{ textAlign: 'center', fontWeight: 700 }}>คำร้องอนุมัติแล้ว</DialogTitle>
        <DialogContent sx={{ textAlign: 'center', py: 3 }}>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            แชร์ QR Code หรือลิงก์นี้ให้สถานประกอบการเพื่อตอบรับหรือปฏิเสธนักศึกษา
          </Typography>
          <Box sx={{ display: 'flex', justifyContent: 'center', mb: 3 }}>
            <Box sx={{ p: 2, bgcolor: '#fff', border: '1px solid #e0e0e0', borderRadius: 2 }}>
              <QRCodeSVG value={qrModal.link} size={200} />
            </Box>
          </Box>
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 1,
              bgcolor: '#f5f5f5',
              borderRadius: 2,
              p: 1.5,
              border: '1px solid #e0e0e0',
            }}
          >
            <Typography
              variant="body2"
              sx={{
                flex: 1,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                fontFamily: 'monospace',
                fontSize: '0.85rem',
              }}
            >
              {qrModal.link}
            </Typography>
            <Button variant="contained" size="small" onClick={handleCopyLink} sx={{ flexShrink: 0, bgcolor: '#111', '&:hover': { bgcolor: '#000' } }}>
              คัดลอก
            </Button>
          </Box>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2, justifyContent: 'center' }}>
          <Button variant="outlined" onClick={handleCloseQrModal}>ปิด</Button>
        </DialogActions>
      </Dialog>

      {/* Image Preview Dialog */}
      <Dialog 
        open={imageModal} 
        onClose={() => setImageModal(false)}
        maxWidth="md"
        disableScrollLock={true}
        PaperProps={{ sx: { borderRadius: 3, p: 0.5, overflow: 'hidden' } }}
      >
        <DialogTitle component="div" sx={{ fontWeight: 800, color: '#0f172a', display: 'flex', justifyContent: 'space-between', alignItems: 'center', pb: 1, borderBottom: '1px solid #f1f5f9' }}>
          <Typography component="span" variant="h6" sx={{ fontWeight: 800, fontSize: '1.05rem', color: '#0f172a' }}>
            รูปถ่ายนักศึกษา: {request?.studentName}
          </Typography>
          <Button size="small" onClick={() => setImageModal(false)} sx={{ color: '#64748b', fontWeight: 700 }}>
            ปิด
          </Button>
        </DialogTitle>
        <DialogContent sx={{ p: 2, display: 'flex', justifyContent: 'center', alignItems: 'center', bgcolor: '#f8fafc', overflow: 'hidden' }}>
          <img 
            src={request?.details?.studentPhoto?.dataUrl || request?.details?.studentPhoto} 
            alt="Student Photo" 
            style={{ maxWidth: '100%', maxHeight: '75vh', borderRadius: '8px', objectFit: 'contain', boxShadow: '0 4px 20px rgba(0,0,0,0.15)', display: 'block' }} 
          />
        </DialogContent>
      </Dialog>

      {(userRole === 'admin' || userRole === 'advisor') && (
        <div style={{ display: 'none' }}>
           <PrintableEvaluationForm ref={printRef} request={request} evaluation={evaluation} />
        </div>
      )}
    </div>
  );
};

export default RequestDetailsPage;
