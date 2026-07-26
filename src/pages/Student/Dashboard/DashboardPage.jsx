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
import StatCard from '../../../components/StatCard';
import StatusBadge from '../../../components/StatusBadge';

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
    'รออาจารย์อนุมัติเริ่มฝึกงาน',
  ];
  
    // Map extended status to steps (0-5)
  const getStepIndex = (status) => {
      if (!status) return 0;
      if (['รออาจารย์ที่ปรึกษาอนุมัติ', 'รอผู้ดูแลระบบตรวจสอบ', 'รอผู้ดูแลระบบอนุมัติ'].includes(status)) return 1;
      if (['รอสถานประกอบการตอบรับ'].includes(status)) return 2;
      if (['รออาจารย์อนุมัติเริ่มฝึกงาน', 'อนุมัติแล้ว', 'ออกฝึกงาน'].includes(status)) return 3;
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

        {currentRequest?.supervisionAppointment?.date && (() => {
          const isCompleted = Boolean(currentRequest.supervisionReport || currentRequest.hasAdvisorEval);
          return (
            <Paper
              elevation={0}
              sx={{
                mb: 3,
                p: 2.5,
                borderRadius: 3,
                background: isCompleted
                  ? 'linear-gradient(135deg, #f0fdf4 0%, #ecfdf5 100%)'
                  : 'linear-gradient(135deg, #eff6ff 0%, #f0f9ff 100%)',
                border: isCompleted ? '1px solid #a7f3d0' : '1px solid #bfdbfe',
                boxShadow: isCompleted
                  ? '0 4px 12px rgba(22, 163, 74, 0.08)'
                  : '0 4px 12px rgba(37, 99, 235, 0.06)',
                display: 'flex',
                alignItems: 'flex-start',
                gap: 2,
              }}
            >
              <Box
                sx={{
                  width: 44,
                  height: 44,
                  borderRadius: 2.5,
                  bgcolor: isCompleted ? '#16a34a' : '#2563eb',
                  color: '#ffffff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                  boxShadow: isCompleted
                    ? '0 4px 10px rgba(22, 163, 74, 0.3)'
                    : '0 4px 10px rgba(37, 99, 235, 0.3)',
                }}
              >
                {isCompleted ? (
                  <CheckCircleIcon style={{ width: 24, height: 24 }} />
                ) : (
                  <CalendarIcon style={{ width: 24, height: 24 }} />
                )}
              </Box>
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap', mb: 0.5 }}>
                  <Typography
                    variant="subtitle1"
                    sx={{ fontWeight: 700, color: isCompleted ? '#14532d' : '#1e3a8a', lineHeight: 1.2 }}
                  >
                    {isCompleted ? 'ผลการนิเทศงาน (นิเทศเสร็จสิ้น)' : 'กำหนดการนิเทศงาน'}
                  </Typography>
                  <Chip
                    label={isCompleted ? 'นิเทศเรียบร้อยแล้ว' : (currentRequest.supervisionAppointment.mode || 'Onsite')}
                    size="small"
                    sx={{
                      bgcolor: isCompleted
                        ? '#dcfce7'
                        : (currentRequest.supervisionAppointment.mode === 'Online' ? '#e0e7ff' : '#dcfce7'),
                      color: isCompleted
                        ? '#15803d'
                        : (currentRequest.supervisionAppointment.mode === 'Online' ? '#3730a3' : '#166534'),
                      fontWeight: 700,
                      fontSize: '0.75rem',
                      height: 22,
                    }}
                  />
                  {isCompleted && (
                    <Chip
                      label={currentRequest.supervisionAppointment.mode || 'Onsite'}
                      size="small"
                      variant="outlined"
                      sx={{
                        borderColor: '#86efac',
                        color: '#166534',
                        fontWeight: 600,
                        fontSize: '0.75rem',
                        height: 22,
                      }}
                    />
                  )}
                </Box>
                <Typography variant="body2" sx={{ color: isCompleted ? '#166534' : '#334155', mb: 1.5, lineHeight: 1.5 }}>
                  {isCompleted
                    ? 'อาจารย์นิเทศงานได้ดำเนินการนิเทศและประเมินผลการฝึกงานของคุณเรียบร้อยแล้ว'
                    : 'อาจารย์ที่ปรึกษาได้กำหนดวันนิเทศงานของคุณเรียบร้อยแล้ว'}
                </Typography>
                <Box
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 2,
                    flexWrap: 'wrap',
                    bgcolor: '#ffffff',
                    p: 1.25,
                    px: 2,
                    borderRadius: 2,
                    border: isCompleted ? '1px solid #bbf7d0' : '1px solid #dbeafe',
                  }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                    <Typography variant="caption" sx={{ color: '#64748b', fontWeight: 600 }}>
                      วันที่นิเทศ:
                    </Typography>
                    <Typography variant="body2" sx={{ fontWeight: 700, color: '#1e293b' }}>
                      {new Date(currentRequest.supervisionAppointment.date).toLocaleDateString('th-TH')}
                    </Typography>
                  </Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                    <Typography variant="caption" sx={{ color: '#64748b', fontWeight: 600 }}>
                      สถานะการนิเทศ:
                    </Typography>
                    <Typography
                      variant="body2"
                      sx={{ fontWeight: 700, color: isCompleted ? '#16a34a' : '#2563eb' }}
                    >
                      {isCompleted ? 'เสร็จสิ้น (ประเมินแล้ว)' : 'รอนิเทศงาน'}
                    </Typography>
                  </Box>
                  {currentRequest.supervisionAppointment.note && (
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                      <Typography variant="caption" sx={{ color: '#64748b', fontWeight: 600 }}>
                        หมายเหตุ:
                      </Typography>
                      <Typography variant="body2" sx={{ color: '#334155' }}>
                        {currentRequest.supervisionAppointment.note}
                      </Typography>
                    </Box>
                  )}
                </Box>
              </Box>
            </Paper>
          );
        })()}

        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', md: 'repeat(3, minmax(0, 1fr))' },
            gap: 2,
            mb: 3,
          }}
        >
          {summaryCards.map((card) => (
            <StatCard
              key={card.label}
              title={card.label}
              value={card.value}
              icon={card.icon}
              color={card.color}
              isText={card.isText}
            />
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
                return (
                  <Card key={request.id} className="request-card" elevation={2}>
                    <CardContent style={{ padding: '1rem 1.25rem' }}>
                      <Box className="request-header" sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem' }}>
                        <div>
                          <Typography component="h3" variant="h6" sx={{ marginBottom: '0.25rem', color: '#111827' }}>{request.companyName}</Typography>
                          <Typography className="position" variant="body2" sx={{ color: '#374151' }}>{request.position}</Typography>
                        </div>
                        <StatusBadge status={request.status} />
                      </Box>

                      {(request.status === 'ไม่อนุมัติ (Admin)' && request.admin_comment) && (
                        <Box sx={{ mt: 1.5, p: 1.5, backgroundColor: '#fef2f2', borderRadius: '8px', borderLeft: '4px solid #ef4444' }}>
                          <Typography variant="body2" sx={{ color: '#b91c1c', fontWeight: 600, mb: 0.5 }}>เหตุผลที่ไม่อนุมัติ (Admin):</Typography>
                          <Typography variant="body2" sx={{ color: '#7f1d1d' }}>{request.admin_comment}</Typography>
                        </Box>
                      )}
                      {(request.status === 'ไม่อนุมัติ (อาจารย์)' && request.advisor_comment) && (
                        <Box sx={{ mt: 1.5, p: 1.5, backgroundColor: '#fef2f2', borderRadius: '8px', borderLeft: '4px solid #ef4444' }}>
                          <Typography variant="body2" sx={{ color: '#b91c1c', fontWeight: 600, mb: 0.5 }}>เหตุผลที่ไม่อนุมัติ (อาจารย์):</Typography>
                          <Typography variant="body2" sx={{ color: '#7f1d1d' }}>{request.advisor_comment}</Typography>
                        </Box>
                      )}
                      {(request.status === 'ปฏิเสธ' && request.company_comment) && (
                        <Box sx={{ mt: 1.5, p: 1.5, backgroundColor: '#fef2f2', borderRadius: '8px', borderLeft: '4px solid #ef4444' }}>
                          <Typography variant="body2" sx={{ color: '#b91c1c', fontWeight: 600, mb: 0.5 }}>เหตุผลที่ปฏิเสธ (บริษัท):</Typography>
                          <Typography variant="body2" sx={{ color: '#7f1d1d' }}>{request.company_comment}</Typography>
                        </Box>
                      )}

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
