import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../../../api/axios';
import * as am5 from '@amcharts/amcharts5';
import * as am5percent from '@amcharts/amcharts5/percent';
import am5themes_Animated from '@amcharts/amcharts5/themes/Animated';
import {
  Alert as MuiAlert,
  Badge,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  Paper,
  Popover,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import { BellIcon } from '@heroicons/react/24/solid';
import { QRCodeSVG } from 'qrcode.react';
import { STAT_EMOJI } from '../../../utils/statEmojis';
import './AdminDashboardPage.css';

const AdminDashboardPage = () => {
  const navigate = useNavigate();
  const [filter, setFilter] = useState('all');
  const [adminName, setAdminName] = useState('');
  const [allRequests, setAllRequests] = useState([]);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [rejectModal, setRejectModal] = useState({
    open: false,
    requestId: null,
    reason: ''
  });
  const [sortBy, setSortBy] = useState(null);
  const [sortDir, setSortDir] = useState('asc');
  const [qrModal, setQrModal] = useState({ open: false, requestId: null, link: '' });
  const [dispatchModal, setDispatchModal] = useState({ open: false, requestId: null, file: null, submitting: false, error: '' });
  const [semesterModal, setSemesterModal] = useState({ open: false, requestId: null });
  const pieChartRef = useRef(null);
  const dispatchFileInputRef = useRef(null);
  const [notifAnchor, setNotifAnchor] = useState(null);

  const getAdminDisplayStatus = (status) => {
    if (status === 'รออาจารย์ที่ปรึกษาอนุมัติ') return 'รออาจารย์อนุมัติ';
    if (status === 'รอผู้ดูแลระบบตรวจสอบ' || status === 'รอผู้ดูแลระบบอนุมัติ') return 'รออนุมัติ';
    return status;
  };

  useEffect(() => {
    const userStr = localStorage.getItem('user');
    if (userStr) {
      const user = JSON.parse(userStr);
      const normalizedRole = String(user.role || '').toLowerCase();
      if (normalizedRole !== 'admin') {
         navigate('/dashboard'); 
         return;
      }
      setAdminName(user.name);
      
      // Load requests from API
      api.get('/requests').then(res => {
        setAllRequests(res.data.data || []);
      }).catch(err => console.error('Failed to load requests:', err));
    } else {
      navigate('/login');
    }
  }, [navigate]);

  const handleLogout = () => {
    localStorage.removeItem('user');
    navigate('/');
  };

  const filteredRequests = allRequests.filter(req => {
    if (filter === 'all') return true;
    if (filter === 'pending_admin') return req.status === 'รอผู้ดูแลระบบตรวจสอบ' || req.status === 'รอผู้ดูแลระบบอนุมัติ';
    if (filter === 'rejected') return req.status.includes('ไม่อนุมัติ') || req.status === 'ปฏิเสธ';
    return req.status === filter; 
  });

  const toggleSort = (key) => {
    if (sortBy === key) {
      setSortDir(prev => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortBy(key);
      setSortDir('asc');
    }
  };

  const sortedRequests = [...filteredRequests].sort((a, b) => {
    if (!sortBy) return 0;
    const va = a[sortBy] ?? '';
    const vb = b[sortBy] ?? '';
    if (sortBy === 'submittedDate') {
      const da = new Date(va).getTime() || 0;
      const db = new Date(vb).getTime() || 0;
      return (da - db) * (sortDir === 'asc' ? 1 : -1);
    }
    // numeric-like compare for studentId
    if (sortBy === 'studentId') {
      const na = parseInt(String(va).replace(/[^0-9]/g, ''), 10) || 0;
      const nb = parseInt(String(vb).replace(/[^0-9]/g, ''), 10) || 0;
      return (na - nb) * (sortDir === 'asc' ? 1 : -1);
    }
    return String(va).localeCompare(String(vb), 'th-TH', { numeric: true }) * (sortDir === 'asc' ? 1 : -1);
  });

  const statusCounts = useMemo(() => {
    const count = {
      total: allRequests.length,
      pendingAdmin: allRequests.filter((req) => req.status === 'รอผู้ดูแลระบบตรวจสอบ' || req.status === 'รอผู้ดูแลระบบอนุมัติ').length,
      waitingCompany: allRequests.filter((req) => req.status === 'รอสถานประกอบการตอบรับ').length,
      approved: allRequests.filter((req) => req.status === 'อนุมัติแล้ว').length,
      rejected: allRequests.filter((req) => req.status.includes('ไม่อนุมัติ') || req.status === 'ปฏิเสธ').length,
    };
    return count;
  }, [allRequests]);

  const summaryCards = useMemo(() => ([
    { key: 'total', label: 'ทั้งหมด', value: statusCounts.total, color: '#2563eb', icon: STAT_EMOJI.TOTAL },
    { key: 'pendingAdmin', label: 'รอตรวจสอบ', value: statusCounts.pendingAdmin, color: '#db2777', icon: STAT_EMOJI.PENDING },
    { key: 'waitingCompany', label: 'รอสถานประกอบการ', value: statusCounts.waitingCompany, color: '#7c3aed', icon: STAT_EMOJI.PENDING },
    { key: 'approved', label: 'อนุมัติแล้ว', value: statusCounts.approved, color: '#16a34a', icon: STAT_EMOJI.APPROVED },
    { key: 'rejected', label: 'ไม่อนุมัติ', value: statusCounts.rejected, color: '#dc2626', icon: STAT_EMOJI.REJECTED },
  ]), [statusCounts]);

  const statusChartData = useMemo(() => {
    return summaryCards
      .filter((item) => item.key !== 'total')
      .map((item) => ({
        category: item.label,
        value: item.value,
        color: item.color,
      }));
  }, [summaryCards]);

  const hasChartData = useMemo(() => statusChartData.some((item) => item.value > 0), [statusChartData]);

  const latestRequests = useMemo(() => {
    return allRequests
      .slice()
      .sort((a, b) => new Date(b.submittedDate) - new Date(a.submittedDate))
      .slice(0, 5);
  }, [allRequests]);

  const urgentAlerts = useMemo(() => {
    const notices = [];

    if (statusCounts.pendingAdmin > 0) {
      notices.push({
        severity: 'warning',
        text: `มีคำร้องรอตรวจสอบ ${statusCounts.pendingAdmin} รายการ`,
      });
    }

    if (statusCounts.rejected > 0) {
      notices.push({
        severity: 'error',
        text: `มีคำร้องที่ไม่อนุมัติ ${statusCounts.rejected} รายการ`,
      });
    }

    if (statusCounts.waitingCompany > 0) {
      notices.push({
        severity: 'info',
        text: `มีคำร้องรอสถานประกอบการตอบรับ ${statusCounts.waitingCompany} รายการ`,
      });
    }

    if (notices.length === 0) {
      notices.push({ severity: 'success', text: 'ไม่พบแจ้งเตือนด่วนในขณะนี้' });
    }

    return notices;
  }, [statusCounts]);

  useLayoutEffect(() => {
    if (!pieChartRef.current || !hasChartData) return undefined;

    const root = am5.Root.new(pieChartRef.current);
    root.setThemes([am5themes_Animated.new(root)]);

    const chart = root.container.children.push(
      am5percent.PieChart.new(root, {
        layout: root.verticalLayout,
        innerRadius: am5.percent(45),
      }),
    );

    const series = chart.series.push(
      am5percent.PieSeries.new(root, {
        valueField: 'value',
        categoryField: 'category',
      }),
    );

    const pieData = statusChartData.map((item) => ({
      category: item.category,
      value: item.value,
      sliceSettings: {
        fill: am5.color(item.color),
        stroke: am5.color('#ffffff'),
        strokeWidth: 1,
      },
    }));

    series.data.setAll(pieData);
    series.slices.template.setAll({ templateField: 'sliceSettings', tooltipText: '{category}: {value}' });
    series.labels.template.setAll({ fontSize: 12, oversizedBehavior: 'truncate', maxWidth: 110 });

    return () => {
      root.dispose();
    };
  }, [statusChartData, hasChartData]);

  const handleDelete = async (id) => {
    const confirmed = await window.showMuiConfirm('คุณต้องการลบคำร้องนี้ใช่หรือไม่?', {
      title: 'ยืนยันการลบคำร้อง',
      confirmText: 'ลบคำร้อง',
      cancelText: 'ยกเลิก',
    });

    if (!confirmed) return;
    try {
      await api.delete(`/requests/${id}`);
      setAllRequests(allRequests.filter((req) => String(req.id) !== String(id)));
    } catch (err) {
      alert('ลบคำร้องล้มเหลว: ' + (err.response?.data?.message || err.message));
    }
  };


  const fileToDataUrl = (file) => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error('ไม่สามารถอ่านไฟล์ได้'));
    reader.readAsDataURL(file);
  });

  const handleApprove = (requestId) => {
    if (dispatchFileInputRef.current) {
      dispatchFileInputRef.current.value = '';
    }
    setDispatchModal({ open: true, requestId, file: null, submitting: false, error: '' });
  };

  const handleDispatchModalClose = () => {
    if (dispatchFileInputRef.current) {
      dispatchFileInputRef.current.value = '';
    }
    setDispatchModal({ open: false, requestId: null, file: null, submitting: false, error: '' });
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
      const requestId = dispatchModal.requestId;
      await api.patch(`/requests/${requestId}/status`, payload);
      setAllRequests(allRequests.map(r => String(r.id) === String(requestId)
        ? { ...r, status: 'รอสถานประกอบการตอบรับ', dispatchLetter: { fileName: dispatchModal.file.name } }
        : r));
      const link = `${window.location.origin}/public/request/${requestId}`;
      setQrModal({ open: true, requestId, link });
      handleDispatchModalClose();
    } catch (err) {
      setDispatchModal((prev) => ({ ...prev, submitting: false, error: err.response?.data?.message || err.message || 'อัปเดตสถานะล้มเหลว' }));
    }
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(qrModal.link).then(() => {
      alert('คัดลอกลิงก์แล้ว');
    }).catch(() => {
      alert('ไม่สามารถคัดลอกลิงก์ได้');
    });
  };

  const handleCloseQrModal = () => {
    setQrModal({ open: false, requestId: null, link: '' });
  };

  const handleUpdateStatus = async (requestId, newStatus) => {
    try {
      await api.patch(`/requests/${requestId}/status`, { status: newStatus });
      setAllRequests(allRequests.map(r => String(r.id) === String(requestId) ? {...r, status: newStatus} : r));
      alert(`อัปเดตสถานะเป็น "${newStatus}" เรียบร้อยแล้ว`);
    } catch (err) {
      alert('อัปเดตสถานะล้มเหลว: ' + (err.response?.data?.message || err.message));
    }
  };

  const handleOpenSemesterModal = (requestId) => {
    setSemesterModal({ open: true, requestId });
  };

  const handleConfirmStartInternship = async () => {
    const requestId = semesterModal.requestId;
    setSemesterModal({ open: false, requestId: null });
    try {
      await api.patch(`/requests/${requestId}/status`, { status: 'ออกฝึกงาน' });
      setAllRequests(allRequests.map(r => String(r.id) === String(requestId) ? { ...r, status: 'ออกฝึกงาน' } : r));
      alert('เริ่มฝึกงานเรียบร้อยแล้ว');
    } catch (err) {
      alert('อัปเดตสถานะล้มเหลว: ' + (err.response?.data?.message || err.message));
    }
  };

  const handleReject = (requestId) => {
    setRejectModal({ open: true, requestId, reason: '' });
  };

  const handleRejectConfirm = async () => {
    if (!rejectModal.reason.trim()) {
      alert('กรุณาระบุเหตุผลที่ไม่อนุมัติ');
      return;
    }

    try {
      await api.patch(`/requests/${rejectModal.requestId}/status`, {
        status: 'ไม่อนุมัติ (Admin)',
        admin_comment: rejectModal.reason.trim(),
      });
      setAllRequests(allRequests.map(r =>
        String(r.id) === String(rejectModal.requestId)
          ? { ...r, status: 'ไม่อนุมัติ (Admin)', admin_comment: rejectModal.reason.trim() }
          : r
      ));
      alert(`ไม่อนุมัติคำร้องเลขที่ ${rejectModal.requestId}`);
    } catch (err) {
      alert('อัปเดตสถานะล้มเหลว: ' + (err.response?.data?.message || err.message));
    }
    setRejectModal({ open: false, requestId: null, reason: '' });
  };

  const handleRejectClose = () => {
    setRejectModal({ open: false, requestId: null, reason: '' });
  };

  const getStatusBadge = (status) => {
    const statusStyles = {
      'รออาจารย์ที่ปรึกษาอนุมัติ': { bg: '#e2e3e5', color: '#666' },
      'รอผู้ดูแลระบบตรวจสอบ': { bg: '#fff3cd', color: '#856404' },
      'รอผู้ดูแลระบบอนุมัติ': { bg: '#fff3cd', color: '#856404' },
      'รอสถานประกอบการตอบรับ': { bg: '#e2e8f0', color: '#2d3748' },
      'อนุมัติแล้ว': { bg: '#d4edda', color: '#155724' },
      'ไม่อนุมัติ (Admin)': { bg: '#f8d7da', color: '#721c24' },
      'ไม่อนุมัติ (อาจารย์)': { bg: '#f8d7da', color: '#721c24' },
      'ปฏิเสธ': { bg: '#f8d7da', color: '#721c24' }
    };
    return statusStyles[status] || { bg: '#e2e3e5', color: '#383d41' };
  };

  return (
    <div className="admin-dashboard-container">
      <div className="mobile-top-navbar">
        <Link to="/" className="mobile-top-logo" aria-label="LASC Home"></Link>
        <div style={{ display: 'flex', alignItems: 'center', marginLeft: 'auto' }}>
          <IconButton
            onClick={(e) => setNotifAnchor(e.currentTarget)}
            size="small"
            sx={{
              p: 0.75,
              bgcolor: statusCounts.pendingAdmin > 0 ? '#fff3cd' : 'transparent',
              border: '1px solid',
              borderColor: statusCounts.pendingAdmin > 0 ? '#f59e0b' : 'transparent',
              borderRadius: 1.5,
              mr: 0.5,
              '&:hover': { bgcolor: statusCounts.pendingAdmin > 0 ? '#fef3c7' : '#f1f5f9' },
            }}
          >
            <Badge
              badgeContent={statusCounts.pendingAdmin}
              color="warning"
              max={99}
              sx={{ '& .MuiBadge-badge': { fontSize: '0.6rem', minWidth: 14, height: 14 } }}
            >
              <BellIcon style={{ width: 18, height: 18, color: statusCounts.pendingAdmin > 0 ? '#d97706' : '#64748b' }} />
            </Badge>
          </IconButton>
          <button className="mobile-menu-btn" onClick={() => setIsMenuOpen(!isMenuOpen)}>☰</button>
        </div>
      </div>
      <div className={`sidebar-overlay ${isMenuOpen ? 'open' : ''}`} onClick={() => setIsMenuOpen(false)}></div>
      <aside className={`sidebar ${isMenuOpen ? 'open' : ''}`}>
        <div className="sidebar-header">
          <h2> ผู้ดูแลระบบ</h2>
        </div>
        <nav className="sidebar-nav">
          <Link to="/admin-dashboard" className="nav-item active">
            <span>หน้าหลัก</span>
          </Link>
          <Link to="/admin-dashboard/students" className="nav-item">
            <span>นักศึกษา</span>
          </Link>
          <Link to="/admin-dashboard/users" className="nav-item">
            <span>จัดการผู้ใช้</span>
          </Link>
           <Link to="/admin-dashboard/payments" className="nav-item">
            <span>ตรวจสอบการชำระเงิน</span>
          </Link>
          <Link to="/admin-dashboard/checkins" className="nav-item">
            <span>รายงานประจำวัน</span>
          </Link>
          <Link to="/admin-dashboard/attendance-overview" className="nav-item">
            <span>ภาพรวมรายบุคคล</span>
          </Link>
          <Link to="/admin-dashboard/reports" className="nav-item">
            <span>รายงาน</span>
          </Link>
          <Link to="/admin-dashboard/profile" className="nav-item">
            <span>โปรไฟล์</span>
          </Link>
        </nav>
        <div className="sidebar-footer">
          <button onClick={handleLogout} className="logout-btn">
            <span>← ออกจากระบบ</span>
          </button>
        </div>
      </aside>

      <main className="admin-main">
        <header className="admin-header">
          <div>
            <h1>ระบบจัดการคำร้องฝึกงาน</h1>
            <p>จัดการและอนุมัติคำร้องของนักศึกษา</p>
          </div>
          <Button
            variant="contained"
            onClick={() => navigate('/admin-dashboard/reports')}
            sx={{
              bgcolor: '#111111',
              '&:hover': { bgcolor: '#000000' },
              borderRadius: 2,
              px: 2,
              py: 1,
            }}
          >
            ดูรายงานทั้งหมด
          </Button>
        </header>

        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', lg: 'repeat(5, 1fr)' },
            gap: 2,
            mb: 3,
          }}
        >
          {summaryCards.map((card) => (
            <Card
              key={card.key}
              elevation={0}
              sx={{
                borderRadius: 3,
                border: '1px solid',
                borderColor: 'divider',
                background: `linear-gradient(135deg, ${card.color}22 0%, #ffffff 56%)`,
                boxShadow: '0 8px 24px rgba(15, 23, 42, 0.06)',
              }}
            >
              <CardContent sx={{ p: 2.25, '&:last-child': { pb: 2.25 } }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25 }}>
                  <Box
                    sx={{
                      width: 40,
                      height: 40,
                      borderRadius: 2,
                      display: 'grid',
                      placeItems: 'center',
                      fontWeight: 800,
                      fontSize: '0.95rem',
                      color: card.color,
                      backgroundColor: `${card.color}1a`,
                      border: `1px solid ${card.color}33`,
                      flexShrink: 0,
                    }}
                  >
                    {card.icon}
                  </Box>
                  <Box sx={{ minWidth: 0 }}>
                    <Typography variant="body2" sx={{ color: '#64748b', fontWeight: 600 }}>
                      {card.label}
                    </Typography>
                    <Typography variant="h4" sx={{ mt: 0.5, fontWeight: 700, color: card.color }}>
                      {card.value}
                    </Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          ))}
        </Box>

        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr' },
            gap: 2,
            mb: 3,
          }}
        >
          <Paper elevation={0} sx={{ border: '1px solid #e5e7eb', borderRadius: 2, p: 2 }}>
            <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>
              กราฟภาพรวม
            </Typography>
            <Box sx={{ display: 'grid', gridTemplateColumns: '1fr', gap: 2 }}>
              <Box>
                <Typography variant="body2" sx={{ color: '#64748b', mb: 1 }}>Pie (amCharts)</Typography>
                {hasChartData ? (
                  <Box ref={pieChartRef} className="dashboard-amchart" />
                ) : (
                  <Box
                    sx={{
                      minHeight: 260,
                      borderRadius: 2,
                      border: '1px dashed #d1d5db',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#94a3b8',
                      fontSize: 14,
                      fontWeight: 500,
                      background: '#f8fafc',
                    }}
                  >
                    ยังไม่มีข้อมูลเพียงพอสำหรับสร้างกราฟ
                  </Box>
                )}
              </Box>
            </Box>
          </Paper>

        </Box>

        <Paper elevation={0} sx={{ border: '1px solid #e5e7eb', borderRadius: 2, p: 2, mb: 3 }}>
          <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>
            คำร้องล่าสุด 5 รายการ
          </Typography>
          <TableContainer component={Box} className="compact-table">
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>วันที่</TableCell>
                  <TableCell>รหัสนักศึกษา</TableCell>
                  <TableCell>ชื่อ-นามสกุล</TableCell>
                  <TableCell>บริษัท</TableCell>
                  <TableCell>สถานะ</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {latestRequests.map((request) => {
                  const style = getStatusBadge(request.status);
                  return (
                    <TableRow key={`recent-${request.id}`}>
                      <TableCell>{new Date(request.submittedDate).toLocaleDateString('th-TH')}</TableCell>
                      <TableCell>{request.studentId}</TableCell>
                      <TableCell>{request.studentName}</TableCell>
                      <TableCell>{request.company}</TableCell>
                      <TableCell>
                        <Chip
                          size="small"
                          label={getAdminDisplayStatus(request.status)}
                          sx={{ bgcolor: style.bg, color: style.color, fontWeight: 700 }}
                        />
                      </TableCell>
                    </TableRow>
                  );
                })}
                {latestRequests.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} align="center">ไม่มีข้อมูล</TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </Paper>

        <Paper className="content-section" elevation={0} sx={{ width: '100%', border: '1px solid #e5e7eb', borderRadius: 2, boxShadow: 'none', p: { xs: 2, md: 3 } }}>
          <div className="section-header">
            <h2>คำร้องทั้งหมด</h2>
            <div className="filter-buttons">
              <button 
                className={`filter-btn ${filter === 'all' ? 'active' : ''}`}
                onClick={() => setFilter('all')}
              >
                ทั้งหมด
              </button>
              <button 
                className={`filter-btn ${filter === 'pending_admin' ? 'active' : ''}`}
                onClick={() => setFilter('pending_admin')}
              >
                รอตรวจสอบ
              </button>
              <button 
                className={`filter-btn ${filter === 'รอสถานประกอบการตอบรับ' ? 'active' : ''}`}
                onClick={() => setFilter('รอสถานประกอบการตอบรับ')}
              >
                รอสถานประกอบการ
              </button>
              <button 
                className={`filter-btn ${filter === 'approved' ? 'active' : ''}`}
                onClick={() => setFilter('อนุมัติแล้ว')}
              >
                อนุมัติแล้ว
              </button>
              <button 
                className={`filter-btn ${filter === 'rejected' ? 'active' : ''}`}
                onClick={() => setFilter('rejected')}
              >
                ไม่อนุมัติ
              </button>
            </div>
          </div>

          <TableContainer component={Box} className="compact-table">
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell className="sortable" onClick={() => toggleSort('studentId')}>รหัสนักศึกษา {sortBy === 'studentId' ? (sortDir === 'asc' ? '▲' : '▼') : ''}</TableCell>
                  <TableCell className="sortable" onClick={() => toggleSort('studentName')}>ชื่อ-นามสกุล {sortBy === 'studentName' ? (sortDir === 'asc' ? '▲' : '▼') : ''}</TableCell>
                  <TableCell className="sortable" onClick={() => toggleSort('department')}>สาขา {sortBy === 'department' ? (sortDir === 'asc' ? '▲' : '▼') : ''}</TableCell>
                  <TableCell className="sortable" onClick={() => toggleSort('company')}>บริษัท {sortBy === 'company' ? (sortDir === 'asc' ? '▲' : '▼') : ''}</TableCell>
                  <TableCell className="sortable" onClick={() => toggleSort('submittedDate')}>วันที่ยื่น {sortBy === 'submittedDate' ? (sortDir === 'asc' ? '▲' : '▼') : ''}</TableCell>
                  <TableCell className="sortable" onClick={() => toggleSort('status')}>สถานะ {sortBy === 'status' ? (sortDir === 'asc' ? '▲' : '▼') : ''}</TableCell>
                  <TableCell>จัดการ</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {sortedRequests.map((request) => {
                  const statusStyle = getStatusBadge(request.status);
                  const displayStatus = getAdminDisplayStatus(request.status);
                  return (
                    <TableRow key={request.id} hover>
                      <TableCell>{request.studentId}</TableCell>
                      <TableCell>{request.studentName}</TableCell>
                      <TableCell>{request.department}</TableCell>
                      <TableCell>{request.company}</TableCell>
                      <TableCell>{new Date(request.submittedDate).toLocaleDateString('th-TH')}</TableCell>
                      <TableCell>
                        <Chip
                          size="small"
                          label={displayStatus}
                          sx={{ bgcolor: statusStyle.bg, color: statusStyle.color, fontWeight: 700 }}
                        />
                      </TableCell>
                      <TableCell>
                        <div className="action-buttons">
                          <button
                            className="btn-delete"
                            onClick={() => handleDelete(request.id)}
                            style={{ padding: '5px 10px', background: '#ff4d4d', color: '#ffffff', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                          >ลบ</button>
                          {(request.status === 'รอผู้ดูแลระบบตรวจสอบ' || request.status === 'รอผู้ดูแลระบบอนุมัติ') && (
                            <>
                              <button className="btn-approve" onClick={() => handleApprove(request.id)} title="อนุมัติคำร้อง">✓</button>
                              <button className="btn-reject" onClick={() => handleReject(request.id)} title="ไม่อนุมัติ">✗</button>
                            </>
                          )}
                          {request.status === 'อนุมัติแล้ว' && (
                            <button className="btn-next-step" onClick={() => handleOpenSemesterModal(request.id)} style={{ padding: '5px 10px', background: '#667eea', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>เริ่มฝึกงาน</button>
                          )}
                          {request.status === 'ออกฝึกงาน' && (
                            <span className="muted-action"></span>
                          )}
                          <Link to={`/dashboard/request/${request.id}`} style={{ padding: '5px 10px', background: '#edf2f7', color: '#4a5568', borderRadius: '4px', textDecoration: 'none', fontSize: '0.9rem', display: 'inline-block', marginLeft: '5px' }}>ดูรายละเอียด</Link>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
                {sortedRequests.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} align="center">ไม่มีข้อมูล</TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </Paper>
      </main>

      <Dialog open={rejectModal.open} onClose={handleRejectClose} fullWidth maxWidth="sm">
        <DialogTitle>ระบุเหตุผลที่ไม่อนุมัติ</DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            multiline
            minRows={4}
            label="เหตุผล"
            value={rejectModal.reason}
            onChange={(event) => setRejectModal((prev) => ({ ...prev, reason: event.target.value }))}
            placeholder="กรอกเหตุผลที่ไม่อนุมัติ"
            sx={{ mt: 1 }}
          />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button variant="outlined" onClick={handleRejectClose}>ยกเลิก</Button>
          <Button variant="contained" onClick={handleRejectConfirm} sx={{ bgcolor: '#111111', '&:hover': { bgcolor: '#000000' } }}>
            ยืนยัน
          </Button>
        </DialogActions>
      </Dialog>

      {/* Start Internship Confirm Modal */}
      <Dialog open={semesterModal.open} onClose={() => setSemesterModal({ open: false, requestId: null })} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ textAlign: 'center', fontWeight: 700 }}>ยืนยันการเริ่มฝึกงาน</DialogTitle>
        <DialogContent sx={{ py: 2, textAlign: 'center' }}>
          <Typography variant="body2" color="text.secondary">
            ต้องการเริ่มสถานะฝึกงานสำหรับคำร้องนี้หรือไม่?
          </Typography>
        </DialogContent>
        <DialogActions sx={{ justifyContent: 'center', pb: 2 }}>
          <Button variant="outlined" onClick={() => setSemesterModal({ open: false, requestId: null })}>ไม่ยืนยัน</Button>
          <Button variant="contained" onClick={handleConfirmStartInternship} sx={{ bgcolor: '#667eea', '&:hover': { bgcolor: '#5a6fd6' } }}>
            ยืนยัน
          </Button>
        </DialogActions>
      </Dialog>

      {/* Dispatch Letter Modal */}
      <Dialog open={dispatchModal.open} onClose={handleDispatchModalClose} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>แนบไฟล์หนังสือส่งตัวก่อนอนุมัติ</DialogTitle>
        <DialogContent sx={{ py: 3 }}>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            กรุณาอัปโหลดไฟล์หนังสือส่งตัว (PDF, JPG หรือ PNG) เพื่อแนบไปกับการอนุมัติคำร้อง
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
            sx={{ bgcolor: '#111111', '&:hover': { bgcolor: '#000000' } }}
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
      <Popover
        open={Boolean(notifAnchor)}
        anchorEl={notifAnchor}
        onClose={() => setNotifAnchor(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
        PaperProps={{ sx: { width: 320, p: 2, mt: 1, borderRadius: 2 } }}
      >
        <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1.5 }}>แจ้งเตือน</Typography>
        <Stack spacing={1}>
          {urgentAlerts.map((notice, i) => (
            <MuiAlert key={i} severity={notice.severity} variant="outlined" sx={{ py: 0.5, fontSize: '0.82rem' }}>
              {notice.text}
            </MuiAlert>
          ))}
        </Stack>
      </Popover>
    </div>
  );
};

export default AdminDashboardPage;
