import { useEffect, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Box, Button, Dialog, DialogTitle, DialogContent, DialogActions, TextField, Typography, Snackbar, Alert as MuiAlert } from '@mui/material';
import { QRCodeSVG } from 'qrcode.react';
import api from '../../../api/axios';
import './RequestDetailsPage.css';

const RequestDetailsPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [request, setRequest] = useState(null);
  const [userRole, setUserRole] = useState('');
  const [loading, setLoading] = useState(true);
  const [rejectModal, setRejectModal] = useState({ open: false, reason: '' });
  const [toast, setToast] = useState({ open: false, message: '', severity: 'success' });
  const [qrModal, setQrModal] = useState({ open: false, link: '' });
  const [dispatchModal, setDispatchModal] = useState({ open: false, file: null, submitting: false, error: '' });
  const dispatchFileInputRef = useRef(null);

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

    // 2. Load Request Details from API
    api.get(`/requests/${id}`).then(res => {
      if (res.data.data) {
        setRequest(res.data.data);
      } else {
        setToast({ open: true, message: 'ไม่พบข้อมูลคำร้อง', severity: 'error' });
        navigate(-1);
      }
      setLoading(false);
    }).catch(err => {
      console.error('Failed to load request:', err);
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
      if (dispatchFileInputRef.current) {
        dispatchFileInputRef.current.value = '';
      }
      setDispatchModal({ open: true, file: null, submitting: false, error: '' });
    }
  };

  const handleDispatchModalClose = () => {
    if (dispatchFileInputRef.current) {
      dispatchFileInputRef.current.value = '';
    }
    setDispatchModal({ open: false, file: null, submitting: false, error: '' });
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
        dispatchLetter: {
          fileName: dispatchModal.file.name,
          mimeType: dispatchModal.file.type,
          dataUrl,
        },
      };
      await api.patch(`/requests/${id}/status`, payload);
      const updated = { ...request, status: 'รอสถานประกอบการตอบรับ', dispatchLetter: { fileName: dispatchModal.file.name } };
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
      'อนุมัติแล้ว': { bg: '#d4edda', color: '#155724' },
      'ออกฝึกงาน': { bg: '#c4f1f9', color: '#0c4a6e' },
      'ประเมินเสร็จแล้ว': { bg: '#ddd6fe', color: '#4c1d95' },
      'ฝึกงานเสร็จแล้ว': { bg: '#fbcfe8', color: '#9d174d' },
      'ไม่อนุมัติ (อาจารย์)': { bg: '#f8d7da', color: '#721c24' },
      'ไม่อนุมัติ (Admin)': { bg: '#f8d7da', color: '#721c24' },
      'ปฏิเสธ': { bg: '#f8d7da', color: '#721c24' }
    };
    const style = statusStyles[status] || { bg: '#e2e3e5', color: '#383d41' };
    return { ...style, label: status };
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
        <header className="details-header">
          <div>
            <h2>รายละเอียดคำร้องฝึกงาน</h2>
            <p style={{ color: '#718096', marginTop: '5px' }}>เลขที่คำร้อง: {request.id}</p>
          </div>
          <span className="status-badge-lg" style={{ backgroundColor: statusInfo.bg, color: statusInfo.color }}>
            {statusInfo.label}
          </span>
        </header>

        <section className="detail-section">
          <h3>ข้อมูลนักศึกษา</h3>
          <div className="detail-grid">
            <div className="detail-item">
              <span className="detail-label">รหัสนักศึกษา</span>
              <span className="detail-value">{request.studentId}</span>
            </div>
            <div className="detail-item">
              <span className="detail-label">ชื่อ-นามสกุล</span>
              <span className="detail-value">{request.studentName}</span>
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
            {studentAddress && studentAddress !== '-' && (
              <div className="detail-item">
                <span className="detail-label">ที่อยู่ตามบัตรประชาชน</span>
                <span className="detail-value">{studentAddress}</span>
              </div>
            )}
             <div className="detail-item">
              <span className="detail-label">วันที่ยื่นคำร้อง</span>
              <span className="detail-value">{new Date(request.submittedDate).toLocaleDateString('th-TH')}</span>
            </div>
          </div>
        </section>

        <section className="detail-section">
          <h3>ข้อมูลสถานประกอบการ</h3>
          <div className="detail-grid">
            <div className="detail-item">
              <span className="detail-label">ชื่อบริษัท/องค์กร</span>
              <span className="detail-value">{details.companyName || request.company}</span>
            </div>
            <div className="detail-item">
              <span className="detail-label">ตำแหน่ง</span>
              <span className="detail-value">{details.position || request.position}</span>
            </div>
            <div className="detail-item">
              <span className="detail-label">ที่อยู่บริษัท</span>
              <span className="detail-value">{companyAddress}</span>
            </div>
          </div>
        </section>

        <section className="detail-section">
          <h3> ระยะเวลาการฝึกงาน</h3>
          <div className="detail-grid">
            {internshipTermLabel ? (
              <div className="detail-item">
                <span className="detail-label">ช่วงฝึกงาน</span>
                <span className="detail-value">{internshipTermLabel}</span>
              </div>
            ) : (
              <>
                <div className="detail-item">
                  <span className="detail-label">วันเริ่มฝึกงาน</span>
                  <span className="detail-value">{details.startDate ? new Date(details.startDate).toLocaleDateString('th-TH') : '-'}</span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">วันสิ้นสุดการฝึกงาน</span>
                  <span className="detail-value">{details.endDate ? new Date(details.endDate).toLocaleDateString('th-TH') : '-'}</span>
                </div>
              </>
            )}
          </div>
        </section>

         <section className="detail-section">
          <h3> ข้อมูลพี่เลี้ยง/ผู้ดูแล</h3>
          <div className="detail-grid">
            <div className="detail-item">
              <span className="detail-label">ชื่อพี่เลี้ยง/ผู้ดูแล</span>
              <span className="detail-value">{details.contactPerson || '-'}</span>
            </div>
            <div className="detail-item">
              <span className="detail-label">เบอร์โทรศัพท์</span>
              <span className="detail-value">{details.contactPhone || '-'}</span>
            </div>
             <div className="detail-item">
              <span className="detail-label">อีเมล</span>
              <span className="detail-value">{details.contactEmail || '-'}</span>
            </div>
          </div>
        </section>

        <section className="detail-section">
          <h3>รายละเอียดงาน</h3>
          <div className="detail-item">
             <span className="detail-label">ลักษณะงานที่ทำ</span>
             <p className="detail-value" style={{whiteSpace: 'pre-wrap'}}>{details.description || '-'}</p>
          </div>
           <div className="detail-item" style={{ marginTop: '15px' }}>
             <span className="detail-label">ทักษะที่ต้องการ</span>
             <p className="detail-value" style={{whiteSpace: 'pre-wrap'}}>{details.skills || '-'}</p>
          </div>
        </section>

        {request.rejectReason && (
             <section className="detail-section" style={{ backgroundColor: '#fff5f5', padding: '15px', borderRadius: '8px', border: '1px solid #fed7d7' }}>
               <h3 style={{ color: '#c53030', borderLeftColor: '#c53030' }}>เหตุผลที่ไม่อนุมัติ</h3>
                <p className="detail-value" style={{ color: '#c53030' }}>{request.rejectReason}</p>
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
            กรุณาอัปโหลดไฟล์ PDF หรือรูปภาพ (JPG, PNG) เพื่อใช้เป็นหนังสือส่งตัวก่อนส่งคำขอไปยังสถานประกอบการ
          </Typography>
          <Button variant="outlined" component="label" sx={{ mb: 2 }}>
            เลือกไฟล์
            <input
              ref={dispatchFileInputRef}
              type="file"
              hidden
              accept="application/pdf,image/jpeg,image/png,image/jpg"
              onChange={handleDispatchFileChange}
            />
          </Button>
          {dispatchModal.file && (
            <Typography variant="body2" sx={{ mb: 1 }}>
              ไฟล์ที่เลือก: <strong>{dispatchModal.file.name}</strong>
            </Typography>
          )}
          {dispatchModal.error && (
            <Typography variant="body2" color="error">
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
    </div>
  );
};

export default RequestDetailsPage;
