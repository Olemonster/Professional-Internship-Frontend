import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../../api/axios';
import {
  Box,
  Paper,
  Card,
  CardContent,
  Stack,
  Typography,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Snackbar,
  Alert as MuiAlert,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
} from '@mui/material';
import { STAT_EMOJI } from '../../utils/statEmojis';
import '../Admin/Dashboard/AdminDashboardPage.css'; // Reuse Admin styles
import './AdvisorDashboardPage.css';

const AdvisorDashboardPage = () => {
  const navigate = useNavigate();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [filter, setFilter] = useState('all');
  const [advisorName, setAdvisorName] = useState('');
  const [advisorDepartment, setAdvisorDepartment] = useState('');
  const [allRequests, setAllRequests] = useState([]);
  const [rejectModal, setRejectModal] = useState({
    open: false,
    requestId: null,
    reason: ''
  });
  const [toast, setToast] = useState({ open: false, message: '', severity: 'success' });

  const getDisplayStatus = (status) =>
    status === 'รออาจารย์ที่ปรึกษาอนุมัติ' ? 'รออนุมัติ' : status;

  useEffect(() => {
    const userStr = localStorage.getItem('user');
    if (userStr) {
      const user = JSON.parse(userStr);
      const normalizedRole = String(user.role || '').toLowerCase();
      if (normalizedRole !== 'advisor') {
         navigate('/login'); 
         return;
      }
      setAdvisorName(user.name);
      setAdvisorDepartment(user.department || user.major || '');
      
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

  const departmentFilteredRequests = allRequests.filter((req) => {
    const dept = req.department || req.details?.student_info?.major || '';
    if (!advisorDepartment) return true;
    return dept === advisorDepartment;
  });

  const filteredRequests = departmentFilteredRequests.filter(req => {
    if (filter === 'all') return true;
    return req.status === filter;
  });
  
  const handleApprove = async (requestId) => {
    try {
      await api.patch(`/requests/${requestId}/status`, { status: 'รอผู้ดูแลระบบอนุมัติ' });
      setAllRequests(allRequests.map(r => String(r.id) === String(requestId) ? { ...r, status: 'รอผู้ดูแลระบบอนุมัติ' } : r));
      setToast({ open: true, message: 'อนุมัติคำร้องเรียบร้อย และส่งต่อให้ผู้ดูแลระบบ', severity: 'success' });
    } catch (err) {
      setToast({ open: true, message: 'อัปเดตล้มเหลว: ' + (err.response?.data?.message || err.message), severity: 'error' });
    }
  };

  const handleReject = (requestId) => {
    setRejectModal({ open: true, requestId, reason: '' });
  };

  const handleRejectConfirm = async () => {
    if (!rejectModal.reason.trim()) {
      setToast({ open: true, message: 'กรุณาระบุเหตุผลที่ไม่อนุมัติ', severity: 'warning' });
      return;
    }

    const rejectedRequest = allRequests.find(r => String(r.id) === String(rejectModal.requestId));
    try {
      await api.patch(`/requests/${rejectModal.requestId}/status`, {
        status: 'ไม่อนุมัติ (อาจารย์)',
        advisor_comment: rejectModal.reason.trim(),
      });
      setAllRequests(allRequests.map((request) => (
        String(request.id) === String(rejectModal.requestId)
          ? { ...request, status: 'ไม่อนุมัติ (อาจารย์)', advisor_comment: rejectModal.reason.trim() }
          : request
      )));
      setToast({ open: true, message: `ปฏิเสธคำร้องของ ${rejectedRequest?.studentName || 'นักศึกษา'} แล้ว`, severity: 'info' });
    } catch (err) {
      setToast({ open: true, message: 'อัปเดตล้มเหลว: ' + (err.response?.data?.message || err.message), severity: 'error' });
    }
    setRejectModal({ open: false, requestId: null, reason: '' });
  };

  const handleRejectClose = () => {
    setRejectModal({ open: false, requestId: null, reason: '' });
  };


  const handleFinishInternship = async (requestId) => {
    try {
      await api.patch(`/requests/${requestId}/status`, { status: 'ฝึกงานเสร็จแล้ว' });
      setAllRequests(allRequests.map(r => String(r.id) === String(requestId)
        ? { ...r, status: 'ฝึกงานเสร็จแล้ว' }
        : r));
      setToast({ open: true, message: 'เสร็จสิ้นการฝึกงานเรียบร้อยแล้ว', severity: 'success' });
    } catch (err) {
      setToast({ open: true, message: 'อัปเดตล้มเหลว: ' + (err.response?.data?.message || err.message), severity: 'error' });
    }
  };

  const getStatusBadge = (status) => {
    const statusStyles = {
      'รออาจารย์ที่ปรึกษาอนุมัติ': { bg: '#fff3cd', color: '#856404' },
      'รอผู้ดูแลระบบอนุมัติ': { bg: '#c3dafe', color: '#434190' },
      'อนุมัติแล้ว': { bg: '#d4edda', color: '#155724' },
      'ออกฝึกงาน': { bg: '#c4f1f9', color: '#0c4a6e' },
      'ประเมินเสร็จแล้ว': { bg: '#ddd6fe', color: '#4c1d95' },
      'ฝึกงานเสร็จแล้ว': { bg: '#fbcfe8', color: '#9d174d' },
      'ไม่อนุมัติ (อาจารย์)': { bg: '#f8d7da', color: '#721c24' },
      'ไม่อนุมัติ (Admin)': { bg: '#f8d7da', color: '#721c24' }
    };
    return statusStyles[status] || { bg: '#e2e3e5', color: '#383d41' };
  };

  return (
    <div className="admin-dashboard-container">
      <div className="mobile-top-navbar">
        <Link to="/" className="mobile-top-logo" aria-label="LASC Home"></Link>
        <button className="mobile-menu-btn" onClick={() => setIsMenuOpen(!isMenuOpen)}>☰</button>
      </div>
      <div className={`sidebar-overlay ${isMenuOpen ? 'open' : ''}`} onClick={() => setIsMenuOpen(false)}></div>
      <aside className={`sidebar ${isMenuOpen ? 'open' : ''}`}>
        <div className="sidebar-header">
          <h2> อาจารย์ที่ปรึกษา</h2>
        </div>
        <nav className="sidebar-nav">
          <Link to="/advisor-dashboard" className="nav-item active">
            <span>หน้าหลัก</span>
          </Link>
          <Link to="/advisor-dashboard/students" className="nav-item">
            <span>รายชื่อนักศึกษาฝึกงาน</span>
          </Link>
          <Link to="/advisor-dashboard/supervision" className="nav-item">
            <span>ตารางนิเทศงาน</span>
          </Link>
          <Link to="/advisor-dashboard/progress" className="nav-item">
            <span>เช็ค Progress</span>
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
            <h1>สวัสดี, {advisorName}</h1>
            <p>ติดตามสถานะการฝึกงานของนักศึกษา</p>
          </div>
        </header>

        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, minmax(0, 1fr))', lg: 'repeat(3, minmax(0, 1fr))' },
            gap: 2,
            mb: 3,
          }}
        >
          {[
            { title: 'ทั้งหมด', value: departmentFilteredRequests.length, icon: STAT_EMOJI.TOTAL, color: '#667eea' },
            { title: 'รอตรวจสอบ', value: departmentFilteredRequests.filter((request) => request.status === 'รออาจารย์ที่ปรึกษาอนุมัติ').length, icon: STAT_EMOJI.PENDING, color: '#f093fb' },
            { title: 'อนุมัติแล้ว', value: departmentFilteredRequests.filter((request) => request.status === 'อนุมัติแล้ว').length, icon: STAT_EMOJI.APPROVED, color: '#16a34a' },
          ].map((stat) => (
            <Card
              key={stat.title}
              elevation={0}
              sx={{
                borderRadius: 3,
                border: '1px solid',
                borderColor: 'divider',
                background: `linear-gradient(135deg, ${stat.color}22 0%, #ffffff 56%)`,
                boxShadow: '0 8px 24px rgba(15, 23, 42, 0.06)',
              }}
            >
              <CardContent sx={{ p: 2.25, '&:last-child': { pb: 2.25 } }}>
                <Stack direction="row" spacing={1.5} alignItems="center">
                  <Box
                    sx={{
                      width: 46,
                      height: 46,
                      borderRadius: 2,
                      display: 'grid',
                      placeItems: 'center',
                      fontWeight: 800,
                      fontSize: '1rem',
                      color: stat.color,
                      backgroundColor: `${stat.color}1a`,
                      border: `1px solid ${stat.color}33`,
                      flexShrink: 0,
                    }}
                  >
                    {stat.icon}
                  </Box>
                  <Box sx={{ minWidth: 0 }}>
                    <Typography variant="body2" sx={{ color: 'text.secondary', mb: 0.5, fontWeight: 500 }}>
                      {stat.title}
                    </Typography>
                    <Typography variant="h5" sx={{ fontWeight: 800, lineHeight: 1.1, color: 'text.primary' }}>
                      {stat.value}
                    </Typography>
                  </Box>
                </Stack>
              </CardContent>
            </Card>
          ))}
        </Box>

        <Paper className="content-section" elevation={0} sx={{ width: '100%' }}>
          <div className="section-header">
            <h2>รายการคำร้องที่ต้องตรวจสอบ</h2>
            <div className="filter-buttons">
              <button className={`filter-btn ${filter === 'all' ? 'active' : ''}`} onClick={() => setFilter('all')}>
                ทั้งหมด
              </button>
              <button
                className={`filter-btn ${filter === 'รออาจารย์ที่ปรึกษาอนุมัติ' ? 'active' : ''}`}
                onClick={() => setFilter('รออาจารย์ที่ปรึกษาอนุมัติ')}
              >
                รออนุมัติ
              </button>
              <button
                className={`filter-btn ${filter === 'อนุมัติแล้ว' ? 'active' : ''}`}
                onClick={() => setFilter('อนุมัติแล้ว')}
              >
                อนุมัติแล้ว
              </button>
            </div>
          </div>
          <TableContainer component={Box} className="compact-table">
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>รหัสนักศึกษา</TableCell>
                  <TableCell>ชื่อ-นามสกุล</TableCell>
                  <TableCell>บริษัท</TableCell>
                  <TableCell>ตำแหน่ง</TableCell>
                  <TableCell>สถานะ</TableCell>
                  <TableCell>ตรวจสอบ</TableCell>
                  <TableCell>จัดการ</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredRequests.map((request) => {
                  const normalizedStatus = String(request.status || '').trim();
                  const statusStyle = getStatusBadge(normalizedStatus);
                  const isPending = normalizedStatus === 'รออาจารย์ที่ปรึกษาอนุมัติ';
                  const isInterning = normalizedStatus === 'ออกฝึกงาน';
                  const isEvaluated = normalizedStatus === 'ประเมินเสร็จแล้ว';
                  const displayStatus = getDisplayStatus(normalizedStatus);
                  return (
                    <TableRow key={request.id} hover>
                      <TableCell>{request.studentId}</TableCell>
                      <TableCell>{request.studentName}</TableCell>
                      <TableCell>{request.company}</TableCell>
                      <TableCell>{request.position}</TableCell>
                      <TableCell>
                        <span className="status-badge" style={{ background: statusStyle.bg, color: statusStyle.color }}>
                          {displayStatus}
                        </span>
                      </TableCell>
                      <TableCell>
                        <Button
                          component={Link}
                          to={`/dashboard/request/${request.id}`}
                          variant="outlined"
                          size="small"
                          sx={{ borderRadius: 999, fontWeight: 600 }}
                        >
                          ตรวจสอบ
                        </Button>
                      </TableCell>
                      <TableCell className="action-column">
                        {isPending && (
                          <div className="advisor-action-buttons">
                            <Button size="small" variant="contained" color="success" onClick={() => handleApprove(request.id)}>
                              อนุมัติ
                            </Button>
                            <Button size="small" variant="contained" color="error" onClick={() => handleReject(request.id)}>
                              ปฏิเสธ
                            </Button>
                          </div>
                        )}
                        {!isPending && !isInterning && isEvaluated && (
                          <Button size="small" variant="contained" color="success" onClick={() => handleFinishInternship(request.id)}>
                            เสร็จสิ้นการฝึกงาน
                          </Button>
                        )}
                        {!isPending && !isInterning && !isEvaluated && (
                          <span className="muted-action">-</span>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
                {filteredRequests.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} align="center">ไม่พบข้อมูล</TableCell>
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
            rows={4}
            margin="dense"
            label="คอมเมนต์ถึงนักศึกษา"
            value={rejectModal.reason}
            onChange={(event) => setRejectModal((prev) => ({ ...prev, reason: event.target.value }))}
            placeholder="กรอกข้อความแนะนำ เช่น ควรแก้ข้อมูลส่วนใด"
          />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={handleRejectClose}>ยกเลิก</Button>
          <Button variant="contained" color="error" onClick={handleRejectConfirm}>ยืนยันการปฏิเสธ</Button>
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
    </div>
  );
};

export default AdvisorDashboardPage;
