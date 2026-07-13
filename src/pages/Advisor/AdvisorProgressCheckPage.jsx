import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../../api/axios';
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  LinearProgress,
  MenuItem,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from '@mui/material';
import '../Admin/Dashboard/AdminDashboardPage.css';

const AdvisorProgressCheckPage = () => {
  const navigate = useNavigate();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [advisorName, setAdvisorName] = useState('');
  const [advisorDept, setAdvisorDept] = useState('');
  const [requests, setRequests] = useState([]);
  const [checkins, setCheckins] = useState([]);
  const [filters, setFilters] = useState({ status: 'all', search: '' });
  const [historyDialog, setHistoryDialog] = useState({
    open: false,
    studentName: '',
    studentId: '',
    entries: [],
  });

  const internshipStatuses = useMemo(() => new Set(['ออกฝึกงาน', 'ฝึกงานเสร็จแล้ว']), []);

  const normalize = (value) => String(value || '').trim();
  const normalizeLower = (value) => String(value || '').trim().toLowerCase();

  const loadData = async (dept) => {
    try {
      const [reqRes, checkinRes] = await Promise.all([
        api.get('/requests'),
        api.get('/checkins'),
      ]);
      const allRequests = reqRes.data.data || [];
      const allCheckins = checkinRes.data.data || [];

      const departmentRequests = allRequests.filter((request) => {
        const requestDept = request.department || request.details?.student_info?.major || '';
        const sameDept = dept ? requestDept === dept : true;
        return sameDept && internshipStatuses.has(normalize(request.status));
      });

      setRequests(departmentRequests);
      setCheckins(allCheckins);
    } catch (err) {
      console.error('Failed to load data:', err);
    }
  };

  useEffect(() => {
    const userStr = localStorage.getItem('user');
    if (!userStr) {
      navigate('/login');
      return;
    }

    const user = JSON.parse(userStr);
    if (user.role !== 'advisor') {
      navigate('/dashboard');
      return;
    }

    const dept = user.department || user.major || '';
    setAdvisorName(user.name || user.full_name || 'อาจารย์ที่ปรึกษา');
    setAdvisorDept(dept);
    loadData(dept);

    const refresh = () => loadData(dept);
    const onVisibility = () => {
      if (document.visibilityState === 'visible') {
        refresh();
      }
    };

    window.addEventListener('storage', refresh);
    window.addEventListener('focus', refresh);
    document.addEventListener('visibilitychange', onVisibility);

    return () => {
      window.removeEventListener('storage', refresh);
      window.removeEventListener('focus', refresh);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [navigate, internshipStatuses]);

  const handleLogout = () => {
    localStorage.removeItem('user');
    navigate('/');
  };

  const getRequestIdentity = (request) => {
    const ids = [
      request.studentId,
      request.student_code,
      request.username,
      request.email,
      request.details?.student_info?.studentId,
      request.details?.student_info?.email,
    ]
      .map(normalize)
      .filter(Boolean);

    const names = [request.studentName, request.details?.student_info?.name]
      .map(normalizeLower)
      .filter(Boolean);

    return { ids, names };
  };

  const getRequestCheckins = (request) => {
    const { ids, names } = getRequestIdentity(request);
    return checkins
      .filter((entry) => {
        const entryId = normalize(entry.studentId);
        const entryName = normalizeLower(entry.studentName);
        const byId = ids.length > 0 && ids.includes(entryId);
        const byName = names.length > 0 && names.includes(entryName);
        return ids.length === 0 && names.length === 0 ? false : (byId || byName);
      })
      .sort((a, b) => String(b.date || '').localeCompare(String(a.date || '')));
  };

  const rows = requests.map((request) => {
    const requestCheckins = getRequestCheckins(request);
    return {
      ...request,
      checkinCount: requestCheckins.length,
      latestCheckinDate: requestCheckins[0]?.date || '-',
      checkinEntries: requestCheckins,
    };
  });

  const filteredRows = rows.filter((row) => {
    if (filters.status !== 'all' && row.status !== filters.status) {
      return false;
    }
    if (!filters.search) {
      return true;
    }
    const term = normalizeLower(filters.search);
    const values = [
      row.studentName,
      row.studentId,
      row.company,
      row.companyName,
    ].map(normalizeLower);
    return values.some((value) => value.includes(term));
  });

  const statusLabel = {
    present: 'มา',
    late: 'สาย',
    absent: 'ขาด',
  };

  const openHistoryDialog = (row) => {
    setHistoryDialog({
      open: true,
      studentName: row.studentName || '-',
      studentId: row.studentId || '-',
      entries: row.checkinEntries,
    });
  };

  const closeHistoryDialog = () => {
    setHistoryDialog({
      open: false,
      studentName: '',
      studentId: '',
      entries: [],
    });
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
          <Link to="/advisor-dashboard" className="nav-item">
            <span>หน้าหลัก</span>
          </Link>
          <Link to="/advisor-dashboard/students" className="nav-item">
            <span>รายชื่อนักศึกษาฝึกงาน</span>
          </Link>
          <Link to="/advisor-dashboard/supervision" className="nav-item">
            <span>ตารางนิเทศงาน</span>
          </Link>
          <Link to="/advisor-dashboard/progress" className="nav-item active">
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
            <h1>เช็ค Progress นักศึกษา</h1>
            <p>ติดตามประวัติรายงานประจำวัน (ดูอย่างเดียว) • {advisorName}</p>
          </div>
          <div className="user-info">
            <span>สาขา: {advisorDept || '-'}</span>
          </div>
        </header>

        <Paper className="content-section" elevation={0} sx={{ width: '100%' }}>
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '220px 1fr' }, gap: 1.5, mb: 2 }}>
            <TextField
              select
              size="small"
              label="สถานะ"
              value={filters.status}
              onChange={(event) => setFilters((prev) => ({ ...prev, status: event.target.value }))}
            >
              <MenuItem value="all">ทั้งหมด</MenuItem>
              <MenuItem value="ออกฝึกงาน">ออกฝึกงาน</MenuItem>
              <MenuItem value="ฝึกงานเสร็จแล้ว">ฝึกงานเสร็จแล้ว</MenuItem>
            </TextField>
            <TextField
              size="small"
              label="ค้นหา"
              placeholder="ชื่อ, รหัสนักศึกษา, หรือบริษัท"
              value={filters.search}
              onChange={(event) => setFilters((prev) => ({ ...prev, search: event.target.value }))}
            />
          </Box>

          <TableContainer component={Box} className="compact-table" sx={{ overflowX: 'auto' }}>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>นักศึกษา</TableCell>
                  <TableCell>บริษัท</TableCell>
                  <TableCell>ช่วงฝึกงาน</TableCell>
                  <TableCell>จำนวนรายงาน</TableCell>
                  <TableCell>เช็คล่าสุด</TableCell>
                  <TableCell>ดูประวัติ</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredRows.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} align="center" sx={{ py: 3 }}>
                      ไม่พบข้อมูลนักศึกษาที่อยู่ระหว่าง/เสร็จสิ้นการฝึกงานในสาขานี้
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredRows.map((row) => (
                    <TableRow key={row.id} hover>
                      <TableCell>
                        <Stack spacing={0.3}>
                          <Typography variant="body2" sx={{ fontWeight: 600 }}>{row.studentName || '-'}</Typography>
                          <Typography variant="caption" color="text.secondary">{row.studentId || '-'}</Typography>
                        </Stack>
                      </TableCell>
                      <TableCell>{row.company || row.companyName || '-'}</TableCell>
                      <TableCell>
                        {(row.startDate || row.details?.startDate || '-')}
                        {' - '}
                        {(row.endDate || row.details?.endDate || '-')}
                      </TableCell>
                      <TableCell>{row.checkinCount}</TableCell>
                      <TableCell>{row.latestCheckinDate}</TableCell>
                      <TableCell>
                        <Button size="small" variant="outlined" onClick={() => openHistoryDialog(row)}>
                          ดูรายงานประจำวัน
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </Paper>
      </main>

      <Dialog open={historyDialog.open} onClose={closeHistoryDialog} fullWidth maxWidth="md">
        <DialogTitle>
          ประวัติรายงานประจำวัน: {historyDialog.studentName} ({historyDialog.studentId})
        </DialogTitle>
        <DialogContent>
          <TableContainer component={Box} sx={{ mt: 1 }}>
            <Table size="small" stickyHeader>
              <TableHead>
                <TableRow>
                  <TableCell>วันที่</TableCell>
                  <TableCell>สถานะ</TableCell>
                  <TableCell>หมายเหตุ</TableCell>
                  <TableCell>เวลาบันทึก</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {historyDialog.entries.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} align="center" sx={{ py: 2.5 }}>
                      ยังไม่มีประวัติรายงานประจำวัน
                    </TableCell>
                  </TableRow>
                ) : (
                  historyDialog.entries.map((entry) => (
                    <TableRow key={`${entry.id}-${entry.date}`} hover>
                      <TableCell>{entry.date || '-'}</TableCell>
                      <TableCell>{statusLabel[entry.status] || '-'}</TableCell>
                      <TableCell>{entry.note || '-'}</TableCell>
                      <TableCell>{entry.createdAt ? new Date(entry.createdAt).toLocaleString('th-TH') : '-'}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </DialogContent>
        <DialogActions>
          <Button onClick={closeHistoryDialog}>ปิด</Button>
        </DialogActions>
      </Dialog>
    </div>
  );
};

export default AdvisorProgressCheckPage;