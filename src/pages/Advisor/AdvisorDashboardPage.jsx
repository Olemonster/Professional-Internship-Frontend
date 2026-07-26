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
  Alert,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  MenuItem,
  Checkbox,
} from '@mui/material';
import { STAT_EMOJI } from '../../utils/statEmojis';
import '../Admin/Dashboard/AdminDashboardPage.css'; // Reuse Admin styles
import { ClockIcon, MapPinIcon } from '@heroicons/react/24/outline';
import AdvisorSidebar from '../../components/AdvisorSidebar';
import StatusBadge from '../../components/StatusBadge';
import ModernButton from '../../components/ModernButton';
import StatCard from '../../components/StatCard';
import './AdvisorDashboardPage.css';

const AdvisorDashboardPage = () => {
  const navigate = useNavigate();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [filter, setFilter] = useState('all');
  const [advisorName, setAdvisorName] = useState('');
  const [advisorDepartment, setAdvisorDepartment] = useState('');
  const [allRequests, setAllRequests] = useState([]);
  const [selectedIds, setSelectedIds] = useState([]);
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
  
  const handleApprove = async (requestId, currentStatus) => {
    try {
      const nextStatus = currentStatus === 'รออาจารย์อนุมัติเริ่มฝึกงาน' ? 'ออกฝึกงาน' : 'รอผู้ดูแลระบบอนุมัติ';
      await api.patch(`/requests/${requestId}/status`, { status: nextStatus });
      setAllRequests(allRequests.map(r => String(r.id) === String(requestId) ? { ...r, status: nextStatus } : r));
      setToast({ open: true, message: nextStatus === 'ออกฝึกงาน' ? 'อนุมัติการเริ่มฝึกงานเรียบร้อย' : 'อนุมัติคำร้องเรียบร้อย และส่งต่อให้ผู้ดูแลระบบ', severity: 'success' });
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

  const actionableRequests = filteredRequests.filter((r) =>
    ['ประเมินเสร็จแล้ว', 'รออาจารย์ที่ปรึกษาอนุมัติ', 'รออาจารย์อนุมัติเริ่มฝึกงาน'].includes(r.status)
  );

  const isAllSelected =
    actionableRequests.length > 0 &&
    actionableRequests.every((r) => selectedIds.includes(String(r.id)));
  const isSomeSelected =
    actionableRequests.some((r) => selectedIds.includes(String(r.id))) && !isAllSelected;

  const handleSelectAll = (e) => {
    if (e.target.checked) {
      setSelectedIds(actionableRequests.map((r) => String(r.id)));
    } else {
      setSelectedIds([]);
    }
  };

  const handleToggleSelect = (id) => {
    const strId = String(id);
    setSelectedIds((prev) =>
      prev.includes(strId) ? prev.filter((i) => i !== strId) : [...prev, strId]
    );
  };

  const selectedEvaluatedCount = filteredRequests.filter(
    (r) => selectedIds.includes(String(r.id)) && r.status === 'ประเมินเสร็จแล้ว'
  ).length;

  const selectedPendingCount = filteredRequests.filter(
    (r) =>
      selectedIds.includes(String(r.id)) &&
      ['รออาจารย์ที่ปรึกษาอนุมัติ', 'รออาจารย์อนุมัติเริ่มฝึกงาน'].includes(r.status)
  ).length;

  const handleBatchFinishInternship = async () => {
    const targets = filteredRequests.filter(
      (r) => selectedIds.includes(String(r.id)) && r.status === 'ประเมินเสร็จแล้ว'
    );
    if (targets.length === 0) return;

    try {
      await Promise.all(
        targets.map((r) => api.patch(`/requests/${r.id}/status`, { status: 'ฝึกงานเสร็จแล้ว' }))
      );
      const targetIds = targets.map((r) => String(r.id));
      setAllRequests((prev) =>
        prev.map((r) => (targetIds.includes(String(r.id)) ? { ...r, status: 'ฝึกงานเสร็จแล้ว' } : r))
      );
      setSelectedIds((prev) => prev.filter((id) => !targetIds.includes(id)));
      setToast({
        open: true,
        message: `อนุมัติเสร็จสิ้นการฝึกงาน ${targets.length} รายการเรียบร้อยแล้ว`,
        severity: 'success',
      });
    } catch (err) {
      setToast({
        open: true,
        message: 'เกิดข้อผิดพลาดในการอนุมัติ: ' + (err.response?.data?.message || err.message),
        severity: 'error',
      });
    }
  };

  const handleBatchApprovePending = async () => {
    const targets = filteredRequests.filter(
      (r) =>
        selectedIds.includes(String(r.id)) &&
        ['รออาจารย์ที่ปรึกษาอนุมัติ', 'รออาจารย์อนุมัติเริ่มฝึกงาน'].includes(r.status)
    );
    if (targets.length === 0) return;

    try {
      await Promise.all(
        targets.map((r) => {
          const nextStatus = r.status === 'รออาจารย์อนุมัติเริ่มฝึกงาน' ? 'ออกฝึกงาน' : 'รอผู้ดูแลระบบอนุมัติ';
          return api.patch(`/requests/${r.id}/status`, { status: nextStatus });
        })
      );
      const targetMap = {};
      targets.forEach((r) => {
        targetMap[String(r.id)] = r.status === 'รออาจารย์อนุมัติเริ่มฝึกงาน' ? 'ออกฝึกงาน' : 'รอผู้ดูแลระบบอนุมัติ';
      });
      setAllRequests((prev) =>
        prev.map((r) => (targetMap[String(r.id)] ? { ...r, status: targetMap[String(r.id)] } : r))
      );
      setSelectedIds((prev) => prev.filter((id) => !targetMap[id]));
      setToast({
        open: true,
        message: `อนุมัติคำร้อง ${targets.length} รายการเรียบร้อยแล้ว`,
        severity: 'success',
      });
    } catch (err) {
      setToast({
        open: true,
        message: 'เกิดข้อผิดพลาดในการอนุมัติ: ' + (err.response?.data?.message || err.message),
        severity: 'error',
      });
    }
  };

  return (
    <div className="admin-dashboard-container">
      <div className="mobile-top-navbar">
        <Link to="/" className="mobile-top-logo" aria-label="LASC Home"></Link>
        <button className="mobile-menu-btn" onClick={() => setIsMenuOpen(!isMenuOpen)}>☰</button>
      </div>
      <AdvisorSidebar
        isMenuOpen={isMenuOpen}
        setIsMenuOpen={setIsMenuOpen}
        currentPath="/advisor-dashboard"
        handleLogout={handleLogout}
      />

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
            { title: 'ทั้งหมด', value: departmentFilteredRequests.length, icon: STAT_EMOJI.TOTAL, color: '#3b82f6' },
            { title: 'รอตรวจสอบ', value: departmentFilteredRequests.filter((request) => request.status === 'รออาจารย์ที่ปรึกษาอนุมัติ').length, icon: STAT_EMOJI.PENDING, color: '#f59e0b' },
            { title: 'อนุมัติแล้ว', value: departmentFilteredRequests.filter((request) => request.status === 'อนุมัติแล้ว').length, icon: STAT_EMOJI.APPROVED, color: '#10b981' },
          ].map((stat) => (
            <StatCard
              key={stat.title}
              title={stat.title}
              value={stat.value}
              icon={stat.icon}
              color={stat.color}
            />
          ))}
        </Box>

        <Paper className="content-section" elevation={0} sx={{ width: '100%' }}>
          <div className="section-header">
            <h2>รายการคำร้องที่ต้องตรวจสอบ</h2>
            <TextField
              select
              size="small"
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              sx={{ minWidth: { xs: '100%', sm: '220px' }, backgroundColor: 'white' }}
            >
              <MenuItem value="all">ทั้งหมด</MenuItem>
              <MenuItem value="รออาจารย์ที่ปรึกษาอนุมัติ">รออนุมัติ</MenuItem>
              <MenuItem value="อนุมัติแล้ว">อนุมัติแล้ว</MenuItem>
              <MenuItem value="ประเมินเสร็จแล้ว">ประเมินเสร็จแล้ว</MenuItem>
            </TextField>
          </div>

          <Alert severity="info" sx={{ mb: 2.5, borderRadius: 2 }}>
            <strong>ข้อความแจ้งเตือนระบบ:</strong> หากอาจารย์ไม่ได้กดอนุมัติเสร็จสิ้นการฝึกงานด้วยตนเอง ระบบจะอนุมัติให้จบการฝึกงานให้อัตโนมัติภายใน 3 วัน หลังจากที่สถานประกอบการส่งผลประเมินเรียบร้อยแล้ว
          </Alert>

          {selectedIds.length > 0 && (
            <Paper
              elevation={0}
              sx={{
                mb: 2,
                p: 1.5,
                px: 2,
                bgcolor: '#eff6ff',
                border: '1px solid #bfdbfe',
                borderRadius: 2,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: 1.5,
              }}
            >
              <Typography variant="body2" sx={{ fontWeight: 600, color: '#1e40af' }}>
                เลือกอยู่ {selectedIds.length} รายการ
              </Typography>
              <Stack direction="row" spacing={1} flexWrap="wrap" gap={1}>
                {selectedEvaluatedCount > 0 && (
                  <Button
                    variant="contained"
                    color="success"
                    size="small"
                    onClick={handleBatchFinishInternship}
                    sx={{ fontWeight: 600 }}
                  >
                    อนุมัติเสร็จสิ้นฝึกงาน ({selectedEvaluatedCount})
                  </Button>
                )}
                {selectedPendingCount > 0 && (
                  <Button
                    variant="contained"
                    color="primary"
                    size="small"
                    onClick={handleBatchApprovePending}
                    sx={{ fontWeight: 600 }}
                  >
                    อนุมัติคำร้องที่เลือก ({selectedPendingCount})
                  </Button>
                )}
                <Button variant="outlined" size="small" color="inherit" onClick={() => setSelectedIds([])}>
                  ยกเลิกการเลือก
                </Button>
              </Stack>
            </Paper>
          )}

          <TableContainer component={Box} className="compact-table">
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell padding="checkbox">
                    <Checkbox
                      checked={isAllSelected}
                      indeterminate={isSomeSelected}
                      onChange={handleSelectAll}
                      disabled={actionableRequests.length === 0}
                    />
                  </TableCell>
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
                  const isPending = normalizedStatus === 'รออาจารย์ที่ปรึกษาอนุมัติ';
                  const isWaitingToStart = normalizedStatus === 'รออาจารย์อนุมัติเริ่มฝึกงาน';
                  const isInterning = normalizedStatus === 'ออกฝึกงาน';
                  const isEvaluated = normalizedStatus === 'ประเมินเสร็จแล้ว';
                  const isActionable = isPending || isWaitingToStart || isEvaluated;
                  const isSelected = selectedIds.includes(String(request.id));

                  return (
                    <TableRow key={request.id} hover selected={isSelected}>
                      <TableCell padding="checkbox">
                        {isActionable ? (
                          <Checkbox
                            checked={isSelected}
                            onChange={() => handleToggleSelect(request.id)}
                          />
                        ) : (
                          <Checkbox disabled checked={false} />
                        )}
                      </TableCell>
                      <TableCell>{request.studentId}</TableCell>
                      <TableCell>{request.studentName}</TableCell>
                      <TableCell>{request.company}</TableCell>
                      <TableCell>{request.position}</TableCell>
                      <TableCell>
                        <StatusBadge status={normalizedStatus} />
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
                        {(isPending || isWaitingToStart) && (
                          <div className="advisor-action-buttons">
                            <ModernButton size="small" customVariant="accept" onClick={() => handleApprove(request.id, normalizedStatus)}>
                              {isWaitingToStart ? 'เริ่มฝึกงาน' : 'อนุมัติ'}
                            </ModernButton>
                            <ModernButton size="small" customVariant="reject" onClick={() => handleReject(request.id)}>
                              ปฏิเสธ
                            </ModernButton>
                          </div>
                        )}
                        {!isPending && !isWaitingToStart && !isInterning && isEvaluated && (
                          <ModernButton size="small" customVariant="primary" onClick={() => handleFinishInternship(request.id)}>
                            เสร็จสิ้นการฝึกงาน
                          </ModernButton>
                        )}
                        {!isPending && !isWaitingToStart && !isInterning && !isEvaluated && (
                          <span className="muted-action">-</span>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
                {filteredRequests.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={8} align="center">ไม่พบข้อมูล</TableCell>
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
        <Alert
          elevation={6}
          variant="filled"
          onClose={() => setToast((prev) => ({ ...prev, open: false }))}
          severity={toast.severity}
          sx={{ width: '100%' }}
        >
          {toast.message}
        </Alert>
      </Snackbar>
    </div>
  );
};

export default AdvisorDashboardPage;
