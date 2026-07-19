import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../../../api/axios';
import './DashboardPage.css';
import {
  Card,
  CardContent,
  Chip,
  Typography,
  Box,
  Button,
  Paper,
  Alert,
  Stack,
  LinearProgress,
} from '@mui/material';
import { STAT_EMOJI } from '../../../utils/statEmojis';
import './ProcessTracker.css';
import { PencilSquareIcon, EnvelopeIcon, CheckCircleIcon, DocumentTextIcon, CalendarIcon, ExclamationTriangleIcon, ClockIcon } from '@heroicons/react/24/outline';
import StudentSidebar from '../../../components/StudentSidebar';

const DashboardPage = () => {
  const navigate = useNavigate();
  const [studentName, setStudentName] = useState('');
  const [studentAvatar, setStudentAvatar] = useState(null);
  const [internshipRequests, setInternshipRequests] = useState([]);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  // chart refs removed

  useEffect(() => {
    const fetchData = async () => {
        try {
            const userStr = localStorage.getItem('user');
            if (userStr) {
              const user = JSON.parse(userStr);

              if (user.role === 'admin') {
                 navigate('/admin-dashboard'); 
                 return;
              }
              if (user.role === 'advisor') {
                 navigate('/advisor-dashboard'); 
                 return;
              }
              if (user.role !== 'student') {
                 navigate('/login'); 
                 return;
              }

              setStudentName(user.full_name || user.name);
              setStudentAvatar(user.avatar);
        
              const studentId = user.student_code || user.studentId || user.username;
              const requestsRes = await api.get(`/requests?studentId=${studentId}`);

              const myRequests = (requestsRes.data.data || []).map(req => ({
                  ...req,
                  companyName: req.company || req.companyName,
              }));
              setInternshipRequests(myRequests);
            } else {
              navigate('/login');
            }
        } catch (error) {
            console.error(error);
        }
    };
    fetchData();
  }, [navigate]);

  const handleLogout = () => {
    localStorage.removeItem('user');
    navigate('/');
  };

  const currentRequest = useMemo(() => {
    if (!internshipRequests.length) return null;

    const prioritized = internshipRequests.filter(
      (request) => request.status === 'ออกฝึกงาน' || request.status === 'ฝึกงานเสร็จแล้ว'
    );

    if (prioritized.length > 0) {
      return prioritized[0];
    }

    return internshipRequests[0];
  }, [internshipRequests]);

  const pendingStatuses = [
    'รออาจารย์ที่ปรึกษาอนุมัติ',
    'รอผู้ดูแลระบบตรวจสอบ',
    'รอผู้ดูแลระบบอนุมัติ',
    'รอสถานประกอบการตอบรับ',
  ];
  
    // Map extended status to steps (0-5)
  const getStepIndex = (status) => {
      if (!status) return 0;
      if (['รออาจารย์ที่ปรึกษาอนุมัติ', 'รอผู้ดูแลระบบตรวจสอบ', 'รอผู้ดูแลระบบอนุมัติ'].includes(status)) return 1;
      if (['รอสถานประกอบการตอบรับ'].includes(status)) return 2;
      if (['อนุมัติแล้ว', 'ออกฝึกงาน'].includes(status)) return 3;
      if (['ประเมินเสร็จแล้ว'].includes(status)) return 4;
      if (['ฝึกงานเสร็จแล้ว'].includes(status)) return 5;
      if (status.includes('ไม่อนุมัติ') || status.includes('ปฏิเสธ')) return 1; 
      return 0;
  };

  const currentStep = getStepIndex(currentRequest?.status);

  const steps = [
    { title: 'ส่งคำร้อง', icon: <PencilSquareIcon style={{width:24, height:24}} /> },
    { title: 'รอตรวจสอบ', icon: '🕓︎' },
    { title: 'รอตอบรับ', icon: <EnvelopeIcon style={{width:24, height:24}} /> },
    { title: 'อนุมัติแล้ว', icon: <CheckCircleIcon style={{width:24, height:24}} /> },
    { title: 'ประเมินหลังฝึกงาน', icon: <DocumentTextIcon style={{width:24, height:24}} /> },
    { title: 'เสร็จสิ้น', icon: '🏁︎' }
  ];

  const getStatusBadge = (status) => {
    const statusStyles = {
      'รออาจารย์ที่ปรึกษาอนุมัติ': { bg: 'linear-gradient(135deg, #fde68a 0%, #f59e0b 100%)', color: '#78350f' },
      'รอผู้ดูแลระบบตรวจสอบ': { bg: 'linear-gradient(135deg, #93c5fd 0%, #3b82f6 100%)', color: '#ffffff' },
      'รอผู้ดูแลระบบอนุมัติ': { bg: 'linear-gradient(135deg, #7dd3fc 0%, #0284c7 100%)', color: '#ffffff' },
      'รอสถานประกอบการตอบรับ': { bg: 'linear-gradient(135deg, #c4b5fd 0%, #8b5cf6 100%)', color: '#ffffff' },
      'อนุมัติแล้ว': { bg: 'linear-gradient(135deg, #86efac 0%, #22c55e 100%)', color: '#14532d' },
      'ประเมินเสร็จแล้ว': { bg: 'linear-gradient(135deg, #c7d2fe 0%, #6366f1 100%)', color: '#1e1b4b' },
      'ไม่อนุมัติ (อาจารย์)': { bg: 'linear-gradient(135deg, #fda4af 0%, #f43f5e 100%)', color: '#ffffff' },
      'ไม่อนุมัติ (Admin)': { bg: 'linear-gradient(135deg, #fb7185 0%, #e11d48 100%)', color: '#ffffff' },
      'ปฏิเสธ': { bg: 'linear-gradient(135deg, #fb7185 0%, #be123c 100%)', color: '#ffffff' },
      'ออกฝึกงาน': { bg: 'linear-gradient(135deg, #67e8f9 0%, #0ea5e9 100%)', color: '#083344' },
      'ฝึกงานเสร็จแล้ว': { bg: 'linear-gradient(135deg, #f9a8d4 0%, #ec4899 100%)', color: '#831843' }
    };
    return statusStyles[status] || { bg: 'linear-gradient(135deg, #d1d5db 0%, #9ca3af 100%)', color: '#111827' };
  };

  const formatThaiDateTime = (dateValue) => {
    if (!dateValue) return { date: '-', time: '-' };
    const dateObj = new Date(dateValue);
    if (Number.isNaN(dateObj.getTime())) return { date: '-', time: '-' };

    const day = String(dateObj.getDate()).padStart(2, '0');
    const month = String(dateObj.getMonth() + 1).padStart(2, '0');
    const year = dateObj.getFullYear() + 543;
    const hours = String(dateObj.getHours()).padStart(2, '0');
    const minutes = String(dateObj.getMinutes()).padStart(2, '0');
    const seconds = String(dateObj.getSeconds()).padStart(2, '0');

    return {
      date: `${day}-${month}-${year}`,
      time: `${hours}:${minutes}:${seconds}`
    };
  };

  const hasActiveRequest = internshipRequests.some(req => 
    !['ไม่อนุมัติ (อาจารย์)', 'ไม่อนุมัติ (Admin)', 'ปฏิเสธ'].includes(req.status)
  );

  const summaryCards = useMemo(() => {
    const total = internshipRequests.length;
    const pending = internshipRequests.filter((request) => pendingStatuses.includes(request.status)).length;
    const latestStatus = currentRequest?.status || 'ยังไม่มีคำร้อง';
    return [
      { label: 'คำร้องทั้งหมด', value: total, color: '#4f46e5', icon: STAT_EMOJI.DOCUMENT },
      { label: 'คำร้องที่รอดำเนินการ', value: pending, color: '#d97706', icon: STAT_EMOJI.PENDING },
      { label: 'สถานะล่าสุด', value: latestStatus, color: '#0284c7', icon: STAT_EMOJI.STATUS, isText: true },
    ];
  }, [internshipRequests, currentRequest]);

  const documentDeadlineInfo = useMemo(() => {
    if (!currentRequest) return null;
    const deadlineValue = currentRequest.documentDeadline || currentRequest.startDate || currentRequest.endDate;
    if (!deadlineValue) return null;

    const deadline = new Date(deadlineValue);
    if (Number.isNaN(deadline.getTime())) return null;

    const now = new Date();
    const daysLeft = Math.ceil((deadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    return {
      date: deadline.toLocaleDateString('th-TH'),
      daysLeft,
      isUrgent: daysLeft >= 0 && daysLeft <= 7,
      isOverdue: daysLeft < 0,
    };
  }, [currentRequest]);

  const notifications = useMemo(() => {
    const list = [];
    if (internshipRequests.some((request) => ['อนุมัติแล้ว', 'ออกฝึกงาน'].includes(request.status))) {
      list.push('บริษัทตอบรับแล้ว');
    }
    if (internshipRequests.some((request) => request.status === 'ไม่อนุมัติ (อาจารย์)')) {
      list.push('อาจารย์ให้แก้ไขข้อมูล');
    }
    if (internshipRequests.some((request) => request.status === 'ไม่อนุมัติ (Admin)')) {
      list.push('เจ้าหน้าที่ให้แก้ไขข้อมูล');
    }
    if (internshipRequests.some((request) => request.evaluationCompleted || request.status === 'ประเมินเสร็จแล้ว' || request.status === 'ฝึกงานเสร็จแล้ว')) {
      list.push('ประเมินเสร็จแล้ว');
    }
    return list;
  }, [internshipRequests]);

  const handleDownloadTextFile = (filename, content) => {
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = filename;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  const handleDownloadApproval = () => {
    handleDownloadTextFile('approval-letter.txt', `เอกสารใบอนุมัติฝึกงาน\nนักศึกษา: ${studentName}\nสถานะล่าสุด: ${currentRequest?.status || '-'}\n`);
  };

  const handleDownloadAcceptance = () => {
    handleDownloadTextFile('company-acceptance-letter.txt', `หนังสือตอบรับนักศึกษาฝึกงาน\nนักศึกษา: ${studentName}\nสถานประกอบการ: ${currentRequest?.companyName || '-'}\n`);
  };

  const handleDownloadCertificate = () => {
    handleDownloadTextFile('internship-certificate.txt', `ใบรับรองการฝึกงาน\nนักศึกษา: ${studentName}\nช่วงฝึกงาน: ${currentRequest?.startDate || '-'} ถึง ${currentRequest?.endDate || '-'}\n`);
  };

  // Chart rendering removed for Student Dashboard

  return (
    <div className="dashboard-container">
      <div className="mobile-top-navbar">
        <Link to="/" className="mobile-top-logo" aria-label="LASC Home"></Link>
        <button className="mobile-menu-btn" onClick={() => setIsMenuOpen(!isMenuOpen)}>☰</button>
      </div>
      <StudentSidebar
        isMenuOpen={isMenuOpen}
        setIsMenuOpen={setIsMenuOpen}
        currentPath="/dashboard"
        handleLogout={handleLogout}
      />

      <main className="dashboard-main">
        <header className="dashboard-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
            <div className="profile-img-container" style={{ width: '60px', height: '60px', borderRadius: '50%', overflow: 'hidden', border: '2px solid #fff', boxShadow: '0 2px 5px rgba(0,0,0,0.1)' }}>
               {studentAvatar ? (
                 <img src={studentAvatar} alt="Profile" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
               ) : (
                 <div style={{ width: '100%', height: '100%', background: '#cbd5e0', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px' }}>{(studentName || 'U').charAt(0).toUpperCase()}</div>
               )}
            </div>
            <div>
              <h1>สวัสดี {studentName}</h1>
              <p>จัดการและติดตามคำร้องฝึกงานของคุณ</p>
            </div>
          </div>
        </header>

        {currentRequest?.supervisionAppointment?.date && (
          <Alert severity="info" sx={{ mb: 3, borderRadius: 2 }}>
            <strong style={{display:'inline-flex', alignItems:'center', gap:'4px'}}><CalendarIcon style={{width:20, height:20}}/> กำหนดการนิเทศ:</strong> อาจารย์ที่ปรึกษาได้กำหนดวันนิเทศงานของคุณในวันที่ <strong>{new Date(currentRequest.supervisionAppointment.date).toLocaleDateString('th-TH')}</strong> รูปแบบ <strong>{currentRequest.supervisionAppointment.mode || '-'}</strong>
            {currentRequest.supervisionAppointment.note ? ` (หมายเหตุ: ${currentRequest.supervisionAppointment.note})` : ''}
          </Alert>
        )}

        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', md: 'repeat(3, minmax(0, 1fr))' },
            gap: 2,
            mb: 3,
          }}
        >
          {summaryCards.map((card) => (
            <Card key={card.label} elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 3 }}>
              <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
                <Stack direction="row" spacing={1.25} alignItems="center">
                  <Box
                    sx={{
                      width: 38,
                      height: 38,
                      borderRadius: 2,
                      display: 'grid',
                      placeItems: 'center',
                      color: card.color,
                      bgcolor: `${card.color}1a`,
                      border: `1px solid ${card.color}40`,
                      fontWeight: 700,
                    }}
                  >
                    {card.icon}
                  </Box>
                  <Box sx={{ minWidth: 0 }}>
                    <Typography variant="body2" color="text.secondary">{card.label}</Typography>
                    <Typography
                      variant={card.isText ? 'body1' : 'h5'}
                      sx={{ fontWeight: 700, color: card.color, wordBreak: 'break-word' }}
                    >
                      {card.value}
                    </Typography>
                  </Box>
                </Stack>
              </CardContent>
            </Card>
          ))}
        </Box>

        {documentDeadlineInfo && documentDeadlineInfo.isUrgent && (
          <Alert severity="warning" sx={{ mb: 2 }}>
            <span style={{display:'inline-flex', alignItems:'center', gap:'4px'}}><ExclamationTriangleIcon style={{width:20, height:20}}/> ใกล้ครบกำหนดส่งเอกสาร</span> (ภายใน {documentDeadlineInfo.daysLeft} วัน) — กำหนดวันที่ {documentDeadlineInfo.date}
          </Alert>
        )}
        {documentDeadlineInfo && documentDeadlineInfo.isOverdue && (
          <Alert severity="error" sx={{ mb: 2 }}>
            เลยกำหนดส่งเอกสารแล้ว ({documentDeadlineInfo.date}) กรุณาดำเนินการด่วน
          </Alert>
        )}

        <div className="status-tracker-container">
          <h2> สถานะคำร้องปัจจุบัน</h2>
          {currentRequest ? (
            <div className="linear-tracker-wrapper">
              <div className={`linear-progress-line ${(currentRequest.status.includes('ไม่อนุมัติ') || currentRequest.status.includes('ปฏิเสธ')) ? 'rejected' : ''}`}>
                <div
                  className="linear-progress-fill"
                  style={{ width: `${(currentStep / (steps.length - 1)) * 100}%` }}
                ></div>
              </div>

              <div className="linear-steps">
                {steps.map((step, index) => {
                  const status = currentRequest.status;
                  const isRejectStatus = status.includes('ไม่อนุมัติ') || status.includes('ปฏิเสธ');
                  const isCompleted = index < currentStep;
                  const isActive = index === currentStep && !isRejectStatus;
                  const isRejected = index === currentStep && isRejectStatus;

                  return (
                    <div
                      key={index}
                      className={`linear-step-item ${isActive ? 'active' : ''} ${isCompleted ? 'completed' : ''} ${isRejected ? 'rejected' : ''}`}
                      title={step.title}
                    >
                      <div className="linear-step-icon">
                        {isCompleted ? '✓' : isRejected ? '✗' : step.icon}
                      </div>
                      <span className="linear-step-label">{step.title}</span>
                    </div>
                  );
                })}
              </div>

              <div className="linear-tracker-summary">
                <h3>{currentRequest.status}</h3>
                <p>{currentRequest.companyName}</p>
              </div>
            </div>
          ) : (
             <div className="no-request-tracker">
              <ClockIcon className="no-request-emoji" style={{width:48, height:48, margin:"0 auto", display:"block", color:"#9ca3af"}} />
                <p>คุณยังไม่มีคำร้องที่กำลังดำเนินการ</p>
             </div>
          )}
        </div>

        {/* Charts removed from Student Dashboard per request */}

        <div className="content-section">
          <div className="section-header">
            <h2>คำร้องล่าสุด</h2>
            {/* If active request exists, hide the button or show disabled state */}
            {hasActiveRequest && (
                 <span className="info-text text-muted" style={{ fontSize: '0.9rem', color: '#e53e3e' }}>
                    *คุณมีคำร้องที่กำลังดำเนินการ (ต้องรอผลการอนุมัติ/ปฏิเสธก่อนยื่นใหม่)
                 </span>
            )}
          </div>

          <div className="requests-list">
            {internshipRequests.length > 0 ? (
              internshipRequests.map((request) => {
                const statusStyle = getStatusBadge(request.status);
                return (
                  <Card key={request.id} className="request-card" elevation={2}>
                    <CardContent style={{ padding: '1rem 1.25rem' }}>
                      <Box className="request-header" sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem' }}>
                        <div>
                          <Typography component="h3" variant="h6" sx={{ marginBottom: '0.25rem', color: '#111827' }}>{request.companyName}</Typography>
                          <Typography className="position" variant="body2" sx={{ color: '#374151' }}>{request.position}</Typography>
                        </div>
                        <Chip label={request.status} className="status-badge" sx={{ background: statusStyle.bg, color: statusStyle.color, fontWeight: 700, borderRadius: '20px', height: 36 }} />
                      </Box>

                      <Box className="request-footer" sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem', paddingTop: '0.75rem' }}>
                        <div className="request-date">
                          <span className="request-date-label"> ยื่นเมื่อ</span>
                          <span className="request-date-text" style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.25, color: '#111827' }}>
                            <span>{formatThaiDateTime(request.submittedDate).date}</span>
                            <span>{formatThaiDateTime(request.submittedDate).time}</span>
                          </span>
                        </div>
                        <Button component={Link} to={`/dashboard/request/${request.id}`} variant="text" sx={{ textTransform: 'none', color: '#be185d', fontWeight: 600 }}>
                          ดูรายละเอียด →
                        </Button>
                      </Box>
                    </CardContent>
                  </Card>
                );
              })
            ) : (
              <div className="empty-state">
                <div className="empty-icon"></div>
                <h3>ยังไม่มีคำร้อง</h3>
                <p>คลิกปุ่มด้านบนเพื่อยื่นคำร้องฝึกงานใหม่</p>
                <Link to="/dashboard/new-request" className="btn-primary">
                  ยื่นคำร้องเลย
                </Link>
              </div>
            )}
          </div>
        </div>

        <footer className="dashboard-footer">
          <div className="footer-inner">© 2026 ระบบคำร้องฝึกงานวิชาชีพ. All rights reserved.</div>
        </footer>
      </main>
    </div>
  );
};

export default DashboardPage;
