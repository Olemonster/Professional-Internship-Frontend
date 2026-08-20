import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import lascLogo from '../../../assets/LASC-SSKRU-1.png';
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
  Checkbox,
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
  MenuItem,
} from '@mui/material';
import { BellIcon } from '@heroicons/react/24/solid';
import { QRCodeSVG } from 'qrcode.react';
import { STAT_EMOJI } from '../../../utils/statEmojis';
import './AdminDashboardPage.css';
import { ClockIcon, TrashIcon, DocumentTextIcon, CalendarIcon, CreditCardIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline';
import AdminSidebar from '../../../components/AdminSidebar';
import StatusBadge from '../../../components/StatusBadge';
import StatCard from '../../../components/StatCard';

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
  const pieChartRef = useRef(null);
  const dispatchFileInputRef = useRef(null);
  const [notifAnchor, setNotifAnchor] = useState(null);
  const [deleteModal, setDeleteModal] = useState({
    open: false,
    targetRequest: null,
    deleteRequests: true,
    deleteCheckins: true,
    deletePayments: true,
    submitting: false,
  });

  const getAdminDisplayStatus = (status) => {
    if (status === 'รออาจารย์ที่ปรึกษาอนุมัติ') return 'รออาจารย์อนุมัติ';
    if (status === 'รอผู้ดูแลระบบตรวจสอบ' || status === 'รอผู้ดูแลระบบอนุมัติ') return 'รออนุมัติ';
    if (status === 'อนุมัติแล้ว' || status === 'รออาจารย์อนุมัติเริ่มฝึกงาน') return 'รออาจารย์อนุมัติการออกฝึกงาน';
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
        const requests = res.data.data || [];
        // Hide 'ฝึกงานเสร็จแล้ว' from Dashboard
        setAllRequests(requests.filter(req => req.status !== 'ฝึกงานเสร็จแล้ว'));
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
      waitingAdvisor: allRequests.filter((req) => req.status === 'รออาจารย์อนุมัติเริ่มฝึกงาน').length,
      approved: allRequests.filter((req) => req.status === 'อนุมัติแล้ว' || req.status === 'ออกฝึกงาน').length,
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
    if (root._logo) root._logo.dispose();
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

  const openDeleteModal = (request) => {
    setDeleteModal({
      open: true,
      targetRequest: request,
      deleteRequests: true,
      deleteCheckins: true,
      deletePayments: true,
      submitting: false,
    });
  };

  const handleConfirmSelectiveDelete = async () => {
    if (!deleteModal.targetRequest) return;
    setDeleteModal(prev => ({ ...prev, submitting: true }));

    const reqItem = deleteModal.targetRequest;
    const reqId = reqItem.id;
    const studentCode = reqItem.studentId || reqItem.student_code || reqItem.username;

    try {
      if (deleteModal.deleteRequests) {
        await api.delete(`/requests/${reqId}`);
      }

      if (deleteModal.deleteCheckins && studentCode) {
        await api.delete(`/checkins/student/${studentCode}`).catch(e => console.log('Notice checkins delete:', e.message));
      }

      if (deleteModal.deletePayments && studentCode) {
        await api.delete(`/payments/student/${studentCode}`).catch(e => console.log('Notice payments delete:', e.message));
      }

      setAllRequests(prev => prev.filter(r => String(r.id) !== String(reqId)));
      setDeleteModal({ open: false, targetRequest: null, deleteRequests: true, deleteCheckins: true, deletePayments: true, submitting: false });
    } catch (err) {
      console.error('Selective delete failed:', err);
      alert('เกิดข้อผิดพลาดในการลบข้อมูล: ' + (err.response?.data?.message || err.message));
      setDeleteModal(prev => ({ ...prev, submitting: false }));
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
    setDispatchModal({ open: true, requestId, file: null, comment: '', submitting: false, error: '' });
  };

  const handleDispatchModalClose = () => {
    if (dispatchFileInputRef.current) {
      dispatchFileInputRef.current.value = '';
    }
    setDispatchModal({ open: false, requestId: null, file: null, comment: '', submitting: false, error: '' });
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
      const requestId = dispatchModal.requestId;
      await api.patch(`/requests/${requestId}/status`, payload);
      setAllRequests(allRequests.map(r => String(r.id) === String(requestId)
        ? { ...r, status: 'รอสถานประกอบการตอบรับ', admin_comment: dispatchModal.comment?.trim() || null, dispatchLetter: { fileName: dispatchModal.file.name } }
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



  return (
    <div className="admin-dashboard-container">
      <div className="mobile-top-navbar">
        <Link to="/" className="mobile-top-logo" aria-label="LASC Home">
          <img src={lascLogo} alt="LASC Logo" style={{ height: '36px', width: 'auto', objectFit: 'contain' }} />
        </Link>
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
      <AdminSidebar
        isMenuOpen={isMenuOpen}
        setIsMenuOpen={setIsMenuOpen}
        currentPath="/admin-dashboard"
        handleLogout={handleLogout}
      />

      <main className="admin-main">
        <header className="admin-header">
          <div>
            <h1>ระบบจัดการคำร้องฝึกงาน</h1>
            <p>จัดการและอนุมัติคำร้องของนักศึกษา</p>
          </div>
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
            <StatCard
              key={card.key}
              title={card.label}
              value={card.value}
              icon={card.icon}
              color={card.color}
            />
          ))}
        </Box>

        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', lg: '1fr 1fr' },
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
          <Paper elevation={0} sx={{ border: '1px solid #e5e7eb', borderRadius: 2, p: 2, height: '100%' }}>
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
                  return (
                    <TableRow key={`recent-${request.id}`}>
                      <TableCell>{new Date(request.submittedDate).toLocaleDateString('th-TH')}</TableCell>
                      <TableCell>{request.studentId}</TableCell>
                      <TableCell>{request.studentName}</TableCell>
                      <TableCell>{request.company}</TableCell>
                      <TableCell>
                        <StatusBadge status={request.status} />
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
        </Box>

        <Paper className="content-section" elevation={0} sx={{ width: '100%', border: '1px solid #e5e7eb', borderRadius: 2, boxShadow: 'none', p: { xs: 2, md: 3 } }}>
          <div className="section-header" style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: '16px' }}>
            <h2 style={{ margin: 0 }}>คำร้องทั้งหมด</h2>
            <TextField
              select
              size="small"
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              sx={{ minWidth: { xs: '100%', sm: '220px' }, backgroundColor: 'white' }}
              SelectProps={{
                MenuProps: {
                  PaperProps: {
                    sx: { maxHeight: 300 }
                  }
                }
              }}
            >
              <MenuItem value="all">ทั้งหมด</MenuItem>
              <MenuItem value="pending_admin">รอตรวจสอบ</MenuItem>
              <MenuItem value="รอสถานประกอบการตอบรับ">รอสถานประกอบการ</MenuItem>
              <MenuItem value="approved">อนุมัติแล้ว</MenuItem>
              <MenuItem value="rejected">ไม่อนุมัติ</MenuItem>
            </TextField>
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
                  return (
                    <TableRow key={request.id} hover>
                      <TableCell>{request.studentId}</TableCell>
                      <TableCell>{request.studentName}</TableCell>
                      <TableCell>{request.department}</TableCell>
                      <TableCell>{request.company}</TableCell>
                      <TableCell>{new Date(request.submittedDate).toLocaleDateString('th-TH')}</TableCell>
                      <TableCell>
                        <StatusBadge status={request.status} />
                        {(request.status === 'ออกฝึกงาน' || request.status === 'ประเมินเสร็จแล้ว' || request.status === 'ฝึกงานเสร็จแล้ว') && (
                          <div style={{ marginTop: '8px', fontSize: '0.75rem', display: 'flex', flexDirection: 'column', gap: '4px', fontWeight: 500 }}>
                            {request.hasCompanyEval ? 
                              <span style={{ color: '#10b981' }}>✓ บริษัทประเมินแล้ว</span> : 
                              <span style={{ color: '#f59e0b', display: 'flex', alignItems: 'center', gap: '4px' }}><ClockIcon style={{width: 16, height: 16}}/> บริษัทกำลังประเมิน</span>}
                            {request.hasAdvisorEval ? 
                              <span style={{ color: '#10b981' }}>✓ อาจารย์ประเมินแล้ว</span> : 
                              <span style={{ color: '#f59e0b', display: 'flex', alignItems: 'center', gap: '4px' }}><ClockIcon style={{width: 16, height: 16}}/> อาจารย์กำลังประเมิน</span>}
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="action-buttons" style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'nowrap' }}>
                          <button
                            className="btn-delete"
                            onClick={() => openDeleteModal(request)}
                            style={{ padding: '6px 12px', background: '#ef4444', color: '#ffffff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 500 }}
                          >ลบ</button>
                          {(request.status === 'รอผู้ดูแลระบบตรวจสอบ' || request.status === 'รอผู้ดูแลระบบอนุมัติ') && (
                            <>
                              <button className="btn-approve" onClick={() => handleApprove(request.id)} title="อนุมัติคำร้อง" style={{ padding: '6px 12px', background: '#10b981', color: '#ffffff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 500 }}>✓ อนุมัติ</button>
                              <button className="btn-reject" onClick={() => handleReject(request.id)} title="ไม่อนุมัติ" style={{ padding: '6px 12px', background: '#f43f5e', color: '#ffffff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 500 }}>✗ ปฏิเสธ</button>
                            </>
                          )}
                          {request.status === 'รอสถานประกอบการตอบรับ' && (
                            <button
                              onClick={() => {
                                setQrModal({
                                  open: true,
                                  requestId: request.id,
                                  link: `${window.location.origin}/public/request/${request.id}`
                                });
                              }}
                              style={{ padding: '6px 12px', background: '#10b981', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 500 }}
                            >
                              QR Code
                            </button>
                          )}
                          {request.status === 'ออกฝึกงาน' && (
                            <span className="muted-action"></span>
                          )}
                          <Link to={`/dashboard/request/${request.id}`} style={{ padding: '5px 12px', background: '#f8fafc', color: '#475569', borderRadius: '6px', textDecoration: 'none', fontSize: '0.85rem', fontWeight: 500, border: '1px solid #cbd5e1', display: 'inline-flex', alignItems: 'center' }}>ดูรายละเอียด</Link>
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


      {/* Dispatch Letter Modal */}
      <Dialog open={dispatchModal.open} onClose={handleDispatchModalClose} maxWidth="sm" fullWidth>
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

      {/* Selective Deletion Modal */}
      <Dialog
        open={deleteModal.open}
        onClose={() => !deleteModal.submitting && setDeleteModal(prev => ({ ...prev, open: false }))}
        maxWidth="sm"
        fullWidth
        disableScrollLock={true}
        PaperProps={{
          sx: {
            borderRadius: { xs: 3, sm: 4 },
            overflow: 'hidden',
            boxShadow: '0 20px 40px -15px rgba(0, 0, 0, 0.12)',
            m: { xs: 1.5, sm: 2 }
          }
        }}
      >
        <DialogTitle sx={{ fontWeight: 800, color: '#0f172a', bgcolor: '#ffffff', borderBottom: '1px solid #f1f5f9', py: 2.5, px: 3, display: 'flex', alignItems: 'center', gap: 1.75 }}>
          <Box sx={{ width: 46, height: 46, borderRadius: 3, bgcolor: '#fef2f2', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ef4444', flexShrink: 0, border: '1px solid #fecaca' }}>
            <TrashIcon style={{ width: 24, height: 24 }} />
          </Box>
          <Box>
            <Typography variant="h6" sx={{ fontWeight: 800, color: '#0f172a', lineHeight: 1.2, fontSize: '1.15rem' }}>
              ยืนยันการลบข้อมูลคำร้อง
            </Typography>
            <Typography variant="caption" sx={{ color: '#64748b', fontWeight: 600 }}>
              เลือกรายการข้อมูลที่ต้องการลบออกอย่างถาวร
            </Typography>
          </Box>
        </DialogTitle>

        <DialogContent sx={{ p: { xs: 2, sm: 3 }, pt: '20px !important', bgcolor: '#ffffff' }}>
          {/* Warning & Target Info Header */}
          <Box
            sx={{
              mt: 0.5,
              mb: 2.5,
              p: 2,
              borderRadius: 3,
              bgcolor: '#fff5f5',
              border: '1.5px solid #fecaca',
              display: 'flex',
              flexDirection: 'column',
              gap: 1.25,
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <ExclamationTriangleIcon style={{ width: 20, height: 20, color: '#dc2626', flexShrink: 0 }} />
              <Typography variant="body2" sx={{ fontWeight: 800, color: '#991b1b', lineHeight: 1.3 }}>
                คำเตือนความปลอดภัย: ข้อมูลที่ถูกลบจะไม่สามารถกู้คืนได้ โปรดเลือกรายการที่ต้องการลบ
              </Typography>
            </Box>

            {deleteModal.targetRequest && (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap', pt: 1, borderTop: '1px dashed #fca5a5' }}>
                <Typography variant="caption" sx={{ color: '#7f1d1d', fontWeight: 700 }}>
                  คำร้องที่เลือก:
                </Typography>
                <Box
                  sx={{
                    bgcolor: '#ffffff',
                    px: 1.25,
                    py: 0.35,
                    borderRadius: 2,
                    border: '1px solid #f87171',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 0.75,
                  }}
                >
                  <Typography variant="caption" sx={{ fontWeight: 800, color: '#0f172a' }}>
                    {deleteModal.targetRequest.studentId || deleteModal.targetRequest.student_code || '-'} - {deleteModal.targetRequest.studentName}
                  </Typography>
                  <Typography variant="caption" sx={{ color: '#64748b', fontSize: '0.72rem' }}>
                    ({deleteModal.targetRequest.company || deleteModal.targetRequest.department || '-'})
                  </Typography>
                </Box>
              </Box>
            )}
          </Box>

          {/* Selective Cards */}
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
            {/* Card 1: Requests */}
            <Paper
              elevation={0}
              onClick={() => setDeleteModal(prev => ({ ...prev, deleteRequests: !prev.deleteRequests }))}
              sx={{
                p: 1.75,
                px: 2,
                borderRadius: 3,
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                bgcolor: deleteModal.deleteRequests ? '#ffffff' : '#f8fafc',
                border: deleteModal.deleteRequests ? '2px solid #ef4444' : '1.5px solid #e2e8f0',
                boxShadow: deleteModal.deleteRequests ? '0 4px 14px rgba(239, 68, 68, 0.12)' : 'none',
                display: 'flex',
                alignItems: 'center',
                justify: 'space-between',
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.75 }}>
                <Checkbox
                  checked={deleteModal.deleteRequests}
                  onChange={(e) => {
                    e.stopPropagation();
                    setDeleteModal(prev => ({ ...prev, deleteRequests: e.target.checked }));
                  }}
                  sx={{
                    color: '#94a3b8',
                    '&.Mui-checked': { color: '#ef4444' }
                  }}
                />
                <Box sx={{
                  width: 40,
                  height: 40,
                  borderRadius: 2.5,
                  bgcolor: deleteModal.deleteRequests ? '#eff6ff' : '#f1f5f9',
                  display: 'flex',
                  alignItems: 'center',
                  justify: 'center',
                  color: deleteModal.deleteRequests ? '#2563eb' : '#64748b',
                  flexShrink: 0
                }}>
                  <DocumentTextIcon style={{ width: 22, height: 22 }} />
                </Box>
                <Box>
                  <Typography variant="subtitle2" sx={{ fontWeight: 800, color: '#0f172a' }}>
                    ลบคำร้องขอฝึกงาน
                  </Typography>
                  <Typography variant="caption" sx={{ color: '#64748b', display: 'block' }}>
                    คำร้องขอเข้าฝึกงาน + ผลการประเมินนิเทศงานทั้งหมด
                  </Typography>
                </Box>
              </Box>
            </Paper>

            {/* Card 2: Daily Checkins */}
            <Paper
              elevation={0}
              onClick={() => setDeleteModal(prev => ({ ...prev, deleteCheckins: !prev.deleteCheckins }))}
              sx={{
                p: 1.75,
                px: 2,
                borderRadius: 3,
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                bgcolor: deleteModal.deleteCheckins ? '#ffffff' : '#f8fafc',
                border: deleteModal.deleteCheckins ? '2px solid #ef4444' : '1.5px solid #e2e8f0',
                boxShadow: deleteModal.deleteCheckins ? '0 4px 14px rgba(239, 68, 68, 0.12)' : 'none',
                display: 'flex',
                alignItems: 'center',
                justify: 'space-between',
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.75 }}>
                <Checkbox
                  checked={deleteModal.deleteCheckins}
                  onChange={(e) => {
                    e.stopPropagation();
                    setDeleteModal(prev => ({ ...prev, deleteCheckins: e.target.checked }));
                  }}
                  sx={{
                    color: '#94a3b8',
                    '&.Mui-checked': { color: '#ef4444' }
                  }}
                />
                <Box sx={{
                  width: 40,
                  height: 40,
                  borderRadius: 2.5,
                  bgcolor: deleteModal.deleteCheckins ? '#ecfdf5' : '#f1f5f9',
                  display: 'flex',
                  alignItems: 'center',
                  justify: 'center',
                  color: deleteModal.deleteCheckins ? '#059669' : '#64748b',
                  flexShrink: 0
                }}>
                  <CalendarIcon style={{ width: 22, height: 22 }} />
                </Box>
                <Box>
                  <Typography variant="subtitle2" sx={{ fontWeight: 800, color: '#0f172a' }}>
                    ลบรายงานประจำวัน
                  </Typography>
                  <Typography variant="caption" sx={{ color: '#64748b', display: 'block' }}>
                    ประวัติการลงเวลาและบันทึกสมุดรายงานประจำวัน
                  </Typography>
                </Box>
              </Box>
            </Paper>

            {/* Card 3: Payment Proofs */}
            <Paper
              elevation={0}
              onClick={() => setDeleteModal(prev => ({ ...prev, deletePayments: !prev.deletePayments }))}
              sx={{
                p: 1.75,
                px: 2,
                borderRadius: 3,
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                bgcolor: deleteModal.deletePayments ? '#ffffff' : '#f8fafc',
                border: deleteModal.deletePayments ? '2px solid #ef4444' : '1.5px solid #e2e8f0',
                boxShadow: deleteModal.deletePayments ? '0 4px 14px rgba(239, 68, 68, 0.12)' : 'none',
                display: 'flex',
                alignItems: 'center',
                justify: 'space-between',
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.75 }}>
                <Checkbox
                  checked={deleteModal.deletePayments}
                  onChange={(e) => {
                    e.stopPropagation();
                    setDeleteModal(prev => ({ ...prev, deletePayments: e.target.checked }));
                  }}
                  sx={{
                    color: '#94a3b8',
                    '&.Mui-checked': { color: '#ef4444' }
                  }}
                />
                <Box sx={{
                  width: 40,
                  height: 40,
                  borderRadius: 2.5,
                  bgcolor: deleteModal.deletePayments ? '#fef3c7' : '#f1f5f9',
                  display: 'flex',
                  alignItems: 'center',
                  justify: 'center',
                  color: deleteModal.deletePayments ? '#d97706' : '#64748b',
                  flexShrink: 0
                }}>
                  <CreditCardIcon style={{ width: 22, height: 22 }} />
                </Box>
                <Box>
                  <Typography variant="subtitle2" sx={{ fontWeight: 800, color: '#0f172a' }}>
                    ลบหลักฐานการชำระเงิน
                  </Typography>
                  <Typography variant="caption" sx={{ color: '#64748b', display: 'block' }}>
                    สลิปโอนเงินและประวัติการชำระเงินค่าฝึกงาน
                  </Typography>
                </Box>
              </Box>
            </Paper>
          </Box>
        </DialogContent>

        <DialogActions sx={{ p: 2.5, px: 3, bgcolor: '#f8fafc', borderTop: '1px solid #e2e8f0', justifyContent: 'space-between' }}>
          <Button
            onClick={() => setDeleteModal(prev => ({ ...prev, open: false }))}
            disabled={deleteModal.submitting}
            variant="outlined"
            sx={{ borderRadius: 2.5, px: 3, fontWeight: 700, color: '#334155', borderColor: '#cbd5e1', bgcolor: '#ffffff', '&:hover': { bgcolor: '#f1f5f9' } }}
          >
            ยกเลิก
          </Button>
          <Button
            variant="contained"
            onClick={handleConfirmSelectiveDelete}
            startIcon={<TrashIcon style={{ width: 18, height: 18 }} />}
            disabled={deleteModal.submitting || (!deleteModal.deleteRequests && !deleteModal.deleteCheckins && !deleteModal.deletePayments)}
            sx={{
              borderRadius: 2.5,
              px: 3.5,
              py: 1,
              fontWeight: 800,
              background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
              boxShadow: '0 4px 14px rgba(239, 68, 68, 0.35)',
              '&:hover': {
                background: 'linear-gradient(135deg, #dc2626 0%, #b91c1c 100%)',
                boxShadow: '0 6px 20px rgba(239, 68, 68, 0.45)',
              },
              '&.Mui-disabled': {
                background: '#e2e8f0',
                color: '#94a3b8',
              }
            }}
          >
            {deleteModal.submitting ? 'กำลังลบข้อมูล...' : 'ยืนยันการลบข้อมูลที่เลือก'}
          </Button>
        </DialogActions>
      </Dialog>
    </div>
  );
};

export default AdminDashboardPage;
