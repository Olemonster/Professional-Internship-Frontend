import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../../../api/axios';
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  MenuItem,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  IconButton
} from '@mui/material';
import './AdminDashboardPage.css';
import '../Shared/CheckInPage.css';
import './AdminAttendanceOverviewPage.css';
import AdminSidebar from '../../../components/AdminSidebar';

const AdminAttendanceOverviewPage = () => {
  const navigate = useNavigate();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [adminName, setAdminName] = useState('');
  const [entries, setEntries] = useState([]);
  const [departmentMap, setDepartmentMap] = useState({});
  const [departmentOptions, setDepartmentOptions] = useState([]);
  const [filters, setFilters] = useState({ search: '', department: 'all' });
  const [detailsModal, setDetailsModal] = useState({ open: false, student: null });

  const statusLabel = useMemo(() => ({
    present: 'มา',
    absent: 'ขาด',
    late: 'สาย',
  }), []);

  const buildDepartmentMap = async () => {
    const map = {};
    try {
      const usersRes = await api.get('/users');
      const students = (usersRes.data.data || []).filter(u => u.role === 'student');
      students.forEach((student) => {
        const dept = student.department || student.major || '';
        if (!dept) return;
        [student.student_code, student.studentId, student.username, student.email]
          .filter(Boolean)
          .forEach((key) => { map[String(key)] = dept; });
      });
    } catch (err) {
      console.error('Failed to load users for department map:', err);
    }
    const departments = Array.from(new Set(Object.values(map))).sort((a, b) => a.localeCompare(b, 'th-TH'));
    setDepartmentMap(map);
    setDepartmentOptions(departments);
    return map;
  };

  useEffect(() => {
    const userStr = localStorage.getItem('user');
    if (!userStr) {
      navigate('/login');
      return;
    }
    const user = JSON.parse(userStr);
    if (user.role !== 'admin') {
      navigate('/dashboard');
      return;
    }
    setAdminName(user.name || 'Admin');
    api.get('/checkins').then(res => {
      setEntries(res.data.data || []);
    }).catch(err => console.error('Failed to load checkins:', err));
    buildDepartmentMap();
  }, [navigate]);

  const handleLogout = () => {
    localStorage.removeItem('user');
    navigate('/');
  };

  const getDepartment = (studentId) => {
    return departmentMap[String(studentId || '')] || 'ไม่ระบุ';
  };

  // Group entries by studentId
  const studentSummaries = useMemo(() => {
    const map = {};
    entries.forEach((entry) => {
      const key = entry.studentId || 'unknown';
      if (!map[key]) {
        map[key] = {
          studentId: key,
          studentName: entry.studentName || '-',
          entries: [],
          present: 0,
          late: 0,
          absent: 0,
          total: 0,
        };
      }
      map[key].entries.push(entry);
      map[key].total += 1;
      if (entry.status === 'present') map[key].present += 1;
      else if (entry.status === 'late') map[key].late += 1;
      else if (entry.status === 'absent') map[key].absent += 1;
    });

    return Object.values(map).sort((a, b) => {
      const nameA = a.studentName || '';
      const nameB = b.studentName || '';
      return nameA.localeCompare(nameB, 'th-TH');
    });
  }, [entries]);

  // Filter students
  const filteredStudents = useMemo(() => {
    return studentSummaries.filter((s) => {
      if (filters.department !== 'all' && getDepartment(s.studentId) !== filters.department) return false;
      if (filters.search) {
        const term = filters.search.toLowerCase();
        const name = (s.studentName || '').toLowerCase();
        const id = (s.studentId || '').toLowerCase();
        return name.includes(term) || id.includes(term);
      }
      return true;
    });
  }, [studentSummaries, filters, departmentMap]);

  // Global stats
  const globalStats = useMemo(() => {
    let present = 0, late = 0, absent = 0;
    entries.forEach((e) => {
      if (e.status === 'present') present += 1;
      else if (e.status === 'late') late += 1;
      else if (e.status === 'absent') absent += 1;
    });
    return { total: entries.length, present, late, absent, students: studentSummaries.length };
  }, [entries, studentSummaries]);

  const getAttendanceRate = (s) => {
    if (s.total === 0) return 0;
    return Math.round(((s.present + s.late) / s.total) * 100);
  };

  const getRateClass = (rate) => {
    if (rate >= 80) return 'rate-good';
    if (rate >= 60) return 'rate-warning';
    return 'rate-danger';
  };

  const sortedDetailEntries = (studentEntries) => {
    return [...studentEntries].sort((a, b) => String(b.date || '').localeCompare(String(a.date || '')));
  };

  return (
    <div className="admin-dashboard-container">
      <div className="mobile-top-navbar">
        <Link to="/" className="mobile-top-logo" aria-label="LASC Home"></Link>
        <button className="mobile-menu-btn" onClick={() => setIsMenuOpen(!isMenuOpen)}>☰</button>
      </div>
      <AdminSidebar
        isMenuOpen={isMenuOpen}
        setIsMenuOpen={setIsMenuOpen}
        currentPath="/admin-dashboard/attendance-overview"
        handleLogout={handleLogout}
      />

      <main className="admin-main">
        <header className="admin-header">
          <div>
            <h1>ภาพรวมรายงานประจำวันรายบุคคล</h1>
            <p>ดูสรุปรายงานประจำวันของนักศึกษาแต่ละคน</p>
          </div>
          <div className="user-info">
            <span>{adminName}</span>
          </div>
        </header>

        {/* Summary stats */}
        <div className="attendance-stats-grid">
          <div className="attendance-stat-card">
            <div className="stat-value">{globalStats.students}</div>
            <div className="stat-label">นักศึกษาทั้งหมด</div>
          </div>
          <div className="attendance-stat-card">
            <div className="stat-value">{globalStats.total}</div>
            <div className="stat-label">รายงานประจำวันทั้งหมด</div>
          </div>
          <div className="attendance-stat-card present">
            <div className="stat-value">{globalStats.present}</div>
            <div className="stat-label">มา</div>
          </div>
          <div className="attendance-stat-card late">
            <div className="stat-value">{globalStats.late}</div>
            <div className="stat-label">สาย</div>
          </div>
          <div className="attendance-stat-card absent">
            <div className="stat-value">{globalStats.absent}</div>
            <div className="stat-label">ขาด</div>
          </div>
        </div>

        <div className="content-section">
          {/* Filters */}
          <div className="attendance-filters">
            <div>
              <TextField
                fullWidth
                size="small"
                label="สาขา"
                select
                value={filters.department}
                onChange={(e) => setFilters({ ...filters, department: e.target.value })}
                sx={{ backgroundColor: 'white', borderRadius: 1 }}
              >
                <MenuItem value="all">ทั้งหมด</MenuItem>
                {departmentOptions.map((dept) => (
                  <MenuItem key={dept} value={dept}>{dept}</MenuItem>
                ))}
              </TextField>
            </div>
            <div>
              <TextField
                fullWidth
                size="small"
                label="ค้นหา"
                placeholder="ชื่อหรือรหัสนักศึกษา"
                value={filters.search}
                onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                sx={{ backgroundColor: 'white', borderRadius: 1 }}
              />
            </div>
          </div>

          {filteredStudents.length === 0 ? (
            <div className="attendance-empty">ยังไม่มีข้อมูลรายงานประจำวัน</div>
          ) : (
            <div className="student-cards-grid">
              {filteredStudents.map((student) => {
                const rate = getAttendanceRate(student);
                const pPct = student.total > 0 ? (student.present / student.total) * 100 : 0;
                const lPct = student.total > 0 ? (student.late / student.total) * 100 : 0;
                const aPct = student.total > 0 ? (student.absent / student.total) * 100 : 0;

                return (
                  <div key={student.studentId} className="student-overview-card">
                    <div className="student-card-header">
                      <div className="student-info">
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <h3>{student.studentName}</h3>
                          <Button 
                            variant="text" 
                            size="small" 
                            onClick={() => setDetailsModal({ open: true, student })}
                            sx={{ fontSize: '0.75rem', p: 0, minWidth: 'auto', color: '#3b82f6', '&:hover': { background: 'transparent', textDecoration: 'underline' } }}
                          >
                            ดูรายละเอียด
                          </Button>
                        </div>
                        <p>{student.studentId} &middot; {getDepartment(student.studentId)}</p>
                      </div>
                      <span className={`attendance-rate-badge ${getRateClass(rate)}`}>
                        {rate}%
                      </span>
                    </div>

                    <div className="mini-stats-bar">
                      <span className="mini-stat"><span className="dot present"></span> มา {student.present}</span>
                      <span className="mini-stat"><span className="dot late"></span> สาย {student.late}</span>
                      <span className="mini-stat"><span className="dot absent"></span> ขาด {student.absent}</span>
                      <span className="mini-stat" style={{ marginLeft: 'auto', color: '#9ca3af' }}>รวม {student.total} วัน</span>
                    </div>

                    <div className="attendance-progress">
                      <div className="bar-present" style={{ width: `${pPct}%` }}></div>
                      <div className="bar-late" style={{ width: `${lPct}%` }}></div>
                      <div className="bar-absent" style={{ width: `${aPct}%` }}></div>
                    </div>

                  </div>
                );
              })}
            </div>
          )}
        </div>
      </main>

      {/* Details Modal */}
      <Dialog 
        open={detailsModal.open} 
        onClose={() => setDetailsModal({ open: false, student: null })}
        fullWidth
        maxWidth="md"
        PaperProps={{ sx: { borderRadius: 3 } }}
      >
        <DialogTitle sx={{ fontWeight: 700, borderBottom: '1px solid #f3f4f6' }}>
          ประวัติรายงานประจำวัน - {detailsModal.student?.studentName}
        </DialogTitle>
        <DialogContent sx={{ p: 0 }}>
          <TableContainer>
            <Table size="small" stickyHeader>
              <TableHead>
                <TableRow>
                  <TableCell sx={{ fontWeight: 600, bgcolor: '#f9fafb' }}>วันที่</TableCell>
                  <TableCell sx={{ fontWeight: 600, bgcolor: '#f9fafb' }}>สถานะ</TableCell>
                  <TableCell sx={{ fontWeight: 600, bgcolor: '#f9fafb' }}>กิจกรรมที่ทำในวันนี้</TableCell>
                  <TableCell sx={{ fontWeight: 600, bgcolor: '#f9fafb' }}>เวลาเช็ค</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {detailsModal.student && sortedDetailEntries(detailsModal.student.entries).length > 0 ? (
                  sortedDetailEntries(detailsModal.student.entries).map((entry, idx) => (
                    <TableRow key={`${entry.date}-${idx}`} hover>
                      <TableCell>{entry.date}</TableCell>
                      <TableCell>
                        <span className={`checkin-status ${entry.status}`}>
                          {statusLabel[entry.status]}
                        </span>
                      </TableCell>
                      <TableCell>{entry.note || '-'}</TableCell>
                      <TableCell>{new Date(entry.createdAt).toLocaleString('th-TH')}</TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={4} align="center" sx={{ py: 3, color: '#6b7280' }}>
                      ไม่มีข้อมูลรายงานประจำวัน
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setDetailsModal({ open: false, student: null })} variant="contained" sx={{ bgcolor: '#111', '&:hover': { bgcolor: '#000' } }}>
            ปิดหน้าต่าง
          </Button>
        </DialogActions>
      </Dialog>
    </div>
  );
};

export default AdminAttendanceOverviewPage;
