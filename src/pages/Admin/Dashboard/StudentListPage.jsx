import { useEffect, useState, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import lascLogo from '../../../assets/LASC-SSKRU-1.png';
import { API_BASE } from '../../../api/axios';
import {
  TrashIcon,
  ExclamationTriangleIcon,
  DocumentTextIcon,
  CalendarIcon,
  CreditCardIcon,
} from '@heroicons/react/24/outline';
import {
  Box,
  Paper,
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
  Checkbox,
  Typography,
  Alert,
  Snackbar,
} from '@mui/material';
import './AdminDashboardPage.css';
import './StudentListPage.css';
import AdminSidebar from '../../../components/AdminSidebar';

const StudentListPage = () => {
  const navigate = useNavigate();
  const departmentOptions = [
    'สาขาวิชาวิทยาการคอมพิวเตอร์',
    'สาขาวิชาเทคโนโลยีคอมพิวเตอร์และดิจิทัล',
    'สาขาวิชาสาธารณสุขชุมชน',
    'สาขาวิชาวิทยาศาสตร์การกีฬา',
    'สาขาวิชาเทคโนโลยีการเกษตร',
    'สาขาวิชาเทคโนโลยีและนวัตกรรมอาหาร',
    'สาขาวิชาอาชีวอนามัยและความปลอดภัย',
    'สาขาวิชาวิศวกรรมซอฟต์แวร์',
    'สาขาวิชาวิศวกรรมโลจิสติกส์',
    'สาขาวิศวกรรมการจัดการอุตสาหกรรมและสิ่งแวดล้อม',
    'สาขาวิชาการออกแบบผลิตภัณฑ์และนวัตกรรมวัสดุ',
    'สาขาวิชาเทคโนโลยีโยธาและสถาปัตยกรรม'
  ];

  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [selectedDepartment, setSelectedDepartment] = useState('all');
  const [selectedStudentCodes, setSelectedStudentCodes] = useState([]);
  const [slipModal, setSlipModal] = useState({ open: false, imageUrl: '', paymentId: null, studentCode: null, paymentStatus: null });
  
  const [deleteModal, setDeleteModal] = useState({
    open: false,
    targetStudents: [],
    deleteRequests: true,
    deleteCheckins: true,
    deletePayments: true,
    deleteUser: false,
    submitting: false,
  });

  const [toast, setToast] = useState({ open: false, message: '', severity: 'success' });

  const getToken = () => {
    try {
      const user = JSON.parse(localStorage.getItem('user'));
      return user?.token || '';
    } catch {
      return '';
    }
  };

  const fetchStudentData = async () => {
    setLoading(true);
    try {
      const headers = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${getToken()}`,
      };
      
      const [usersRes, reqsRes, paysRes] = await Promise.all([
        fetch(`${API_BASE}/users?role=student`, { headers }),
        fetch(`${API_BASE}/requests`, { headers }),
        fetch(`${API_BASE}/payments`, { headers })
      ]);

      if (!usersRes.ok) throw new Error('ไม่สามารถโหลดรายชื่อนักศึกษาได้');

      const [usersData, reqsData, paysData] = await Promise.all([
        usersRes.json(),
        reqsRes.json(),
        paysRes.json()
      ]);

      const rawStudents = usersData.data || [];
      const studentList = rawStudents.filter(student => {
        const code = String(student.student_code || student.studentId || student.username || '').trim();
        const hasYear66 = code.startsWith('66');
        const deptId = student.department_id;
        const hasNumericDeptId = deptId !== null && deptId !== undefined && deptId !== '' && !isNaN(deptId) && Number(deptId) > 0;
        const deptName = String(student.department || student.major || '').trim();
        const hasDeptName = deptName !== '' && deptName !== '-';
        return hasYear66 || hasNumericDeptId || hasDeptName;
      });
      const requestsList = reqsData.data || [];
      const paymentsList = paysData.data || [];

      const enrichedStudents = studentList.map(student => {
        const studentIdStr = String(student.student_code || student.studentId || student.username);
        
        const studentReqs = requestsList.filter(r => String(r.studentId) === studentIdStr);
        const latestReq = studentReqs.length > 0 ? studentReqs[studentReqs.length - 1] : null;
        
        const studentPays = paymentsList.filter(p => String(p.studentId) === studentIdStr);
        const latestPay = studentPays.length > 0 ? studentPays[studentPays.length - 1] : null;

        let reqDetails = {};
        if (latestReq && latestReq.details) {
          if (typeof latestReq.details === 'string') {
            try { reqDetails = JSON.parse(latestReq.details); } catch(e) {}
          } else if (typeof latestReq.details === 'object') {
            reqDetails = latestReq.details;
          }
        }

        const phoneFromForm = reqDetails.studentPhone || reqDetails.student_info?.phone || reqDetails.phone || reqDetails.mobile || reqDetails.tel;
        const phone = phoneFromForm || student.phone || student.mobile || '-';

        return {
          ...student,
          phone,
          requestStatus: latestReq ? latestReq.status : 'ยังไม่ยื่นคำร้อง',
          paymentStatus: latestPay ? latestPay.status : 'ยังไม่ชำระเงิน',
          paymentSlip: latestPay ? latestPay.slipDataUrl : null,
          paymentId: latestPay ? latestPay.id : null
        };
      });

      setStudents(enrichedStudents);
    } catch (error) {
      console.error("Failed to load students", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const userStr = localStorage.getItem('user');
    if (userStr) {
      const user = JSON.parse(userStr);
      if (user.role !== 'admin') {
        navigate('/dashboard'); 
        return;
      }
    } else {
      navigate('/login');
      return;
    }

    fetchStudentData();
  }, [navigate]);

  const handleLogout = () => {
    localStorage.removeItem('user');
    navigate('/');
  };

  const filteredStudents = useMemo(() => {
    return students.filter((student) => {
      if (selectedDepartment === 'all') return true;
      const dept = student.major || student.department || '';
      return dept === selectedDepartment;
    });
  }, [students, selectedDepartment]);

  const isAllSelected = useMemo(() => {
    if (filteredStudents.length === 0) return false;
    return filteredStudents.every(s => selectedStudentCodes.includes(s.student_code || s.username));
  }, [filteredStudents, selectedStudentCodes]);

  const handleSelectAll = (e) => {
    if (e.target.checked) {
      const allCodes = filteredStudents.map(s => s.student_code || s.username).filter(Boolean);
      setSelectedStudentCodes(allCodes);
    } else {
      setSelectedStudentCodes([]);
    }
  };

  const handleToggleSelect = (code) => {
    setSelectedStudentCodes(prev => 
      prev.includes(code) ? prev.filter(c => c !== code) : [...prev, code]
    );
  };

  const handleOpenDeleteSingle = (student) => {
    setDeleteModal({
      open: true,
      targetStudents: [student],
      deleteRequests: true,
      deleteCheckins: true,
      deletePayments: true,
      deleteUser: false,
      submitting: false,
    });
  };

  const handleOpenDeleteBatch = () => {
    const targetStudents = students.filter(s => selectedStudentCodes.includes(s.student_code || s.username));
    setDeleteModal({
      open: true,
      targetStudents,
      deleteRequests: true,
      deleteCheckins: true,
      deletePayments: true,
      deleteUser: false,
      submitting: false,
    });
  };

  const handleConfirmDelete = async () => {
    if (deleteModal.targetStudents.length === 0) return;

    setDeleteModal(prev => ({ ...prev, submitting: true }));

    const targetCodes = deleteModal.targetStudents.map(s => s.student_code || s.username || s.studentId);

    try {
      const res = await fetch(`${API_BASE}/admin/delete-student-data`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${getToken()}`,
        },
        body: JSON.stringify({
          studentIds: targetCodes,
          deleteRequests: deleteModal.deleteRequests,
          deleteCheckins: deleteModal.deleteCheckins,
          deletePayments: deleteModal.deletePayments,
          deleteUser: deleteModal.deleteUser,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || 'ไม่สามารถลบข้อมูลได้');
      }

      setToast({ open: true, message: data.message || 'ลบข้อมูลเรียบร้อยแล้ว', severity: 'success' });
      setDeleteModal({ open: false, targetStudents: [], deleteRequests: true, deleteCheckins: true, deletePayments: true, deleteUser: false, submitting: false });
      setSelectedStudentCodes([]);

      // Reload data
      fetchStudentData();
    } catch (err) {
      setToast({ open: true, message: err.message || 'เกิดข้อผิดพลาดในการลบข้อมูล', severity: 'error' });
      setDeleteModal(prev => ({ ...prev, submitting: false }));
    }
  };

  const handleDownloadSlip = () => {
    if (!slipModal.imageUrl) return;
    const anchor = document.createElement('a');
    anchor.href = slipModal.imageUrl;
    anchor.download = `หลักฐานการชำระค่าออกฝึกงาน_${slipModal.studentCode || 'ไม่ทราบรหัส'}.png`;
    anchor.click();
  };

  const handleUpdatePaymentStatus = async (action) => {
    if (!slipModal.paymentId) return;
    try {
      const res = await fetch(`${API_BASE}/payments/${slipModal.paymentId}/${action}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${getToken()}`,
        }
      });
      if (!res.ok) throw new Error('เกิดข้อผิดพลาดในการอัปเดต');
      
      const newStatus = action === 'approve' ? 'approved' : 'rejected';
      setStudents(prev => prev.map(s => {
        if (s.paymentId === slipModal.paymentId) {
          return { ...s, paymentStatus: newStatus };
        }
        return s;
      }));
      
      setSlipModal({ open: false, imageUrl: '', paymentId: null, studentCode: null, paymentStatus: null });
      setToast({ open: true, message: 'อัปเดตสถานะการชำระเงินเรียบร้อยแล้ว', severity: 'success' });
    } catch (err) {
      alert(err.message);
    }
  };

  return (
    <div className="admin-dashboard-container">
      <div className="mobile-top-navbar">
        <Link to="/" className="mobile-top-logo" aria-label="LASC Home">
          <img src={lascLogo} alt="LASC Logo" />
        </Link>
        <button className="mobile-menu-btn" onClick={() => setIsMenuOpen(!isMenuOpen)}>☰</button>
      </div>
      <AdminSidebar
        isMenuOpen={isMenuOpen}
        setIsMenuOpen={setIsMenuOpen}
        currentPath="/admin-dashboard/students"
        handleLogout={handleLogout}
      />

      <main className="admin-main">
        <header className="admin-header">
          <div>
            <h1>รายชื่อนักศึกษา</h1>
            <p>จัดการข้อมูลนักศึกษาในระบบ</p>
          </div>
        </header>

        <div className="content-section">
          <div className="section-header">
            <h2>นักศึกษาทั้งหมด ({filteredStudents.length})</h2>
          </div>

          {/* Filters & Bulk Actions */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12, marginBottom: 16 }}>
            <div className="filter-group">
              <TextField
                select
                size="small"
                label="คัดกรองสาขา"
                value={selectedDepartment}
                onChange={(e) => setSelectedDepartment(e.target.value)}
                sx={{ minWidth: 280 }}
              >
                <MenuItem value="all">ทั้งหมด</MenuItem>
                {departmentOptions.map((dept) => (
                  <MenuItem key={dept} value={dept}>{dept}</MenuItem>
                ))}
              </TextField>
            </div>

            {selectedStudentCodes.length > 0 && (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, bgcolor: '#fef2f2', p: 1, px: 2, borderRadius: 2, border: '1px solid #fecaca' }}>
                <Typography variant="body2" sx={{ fontWeight: 700, color: '#991b1b' }}>
                  เลือกแล้ว {selectedStudentCodes.length} รายการ
                </Typography>
                <Button
                  variant="contained"
                  color="error"
                  size="small"
                  onClick={handleOpenDeleteBatch}
                  startIcon={<TrashIcon style={{ width: 16, height: 16 }} />}
                  sx={{ borderRadius: 1.5, fontWeight: 700, textTransform: 'none' }}
                >
                  ลบข้อมูลนักศึกษาที่เลือก ({selectedStudentCodes.length})
                </Button>
              </Box>
            )}
          </div>

          <TableContainer component={Box} className="compact-table">
            {loading ? (
                <p style={{ padding: '16px' }}>กำลังโหลดข้อมูล...</p>
            ) : (
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell padding="checkbox">
                    <Checkbox
                      checked={isAllSelected}
                      indeterminate={selectedStudentCodes.length > 0 && !isAllSelected}
                      onChange={handleSelectAll}
                    />
                  </TableCell>
                  <TableCell>รหัสนักศึกษา</TableCell>
                  <TableCell>ชื่อ-นามสกุล</TableCell>
                  <TableCell>สาขา</TableCell>
                  <TableCell>อีเมล</TableCell>
                  <TableCell>เบอร์โทร</TableCell>
                  <TableCell>สถานะคำร้อง</TableCell>
                  <TableCell>การชำระเงิน</TableCell>
                  <TableCell align="center">การกระทำ</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredStudents.length > 0 ? filteredStudents.map((student, index) => {
                  const studentCode = student.student_code || student.username;
                  const isChecked = selectedStudentCodes.includes(studentCode);

                  return (
                    <TableRow key={index} hover selected={isChecked}>
                      <TableCell padding="checkbox">
                        <Checkbox
                          checked={isChecked}
                          onChange={() => handleToggleSelect(studentCode)}
                        />
                      </TableCell>
                      <TableCell>{student.student_code}</TableCell>
                      <TableCell>{student.full_name}</TableCell>
                      <TableCell>{student.major || student.department || '-'}</TableCell>
                      <TableCell>{student.email}</TableCell>
                      <TableCell>{student.phone}</TableCell>
                      <TableCell>
                        <span className="status-badge" style={{ 
                          background: student.requestStatus === 'อนุมัติแล้ว' ? '#dcfce7' : student.requestStatus?.includes('ไม่อนุมัติ') ? '#fee2e2' : student.requestStatus === 'ยังไม่ยื่นคำร้อง' ? '#f3f4f6' : '#e0e7ff', 
                          color: student.requestStatus === 'อนุมัติแล้ว' ? '#166534' : student.requestStatus?.includes('ไม่อนุมัติ') ? '#991b1b' : student.requestStatus === 'ยังไม่ยื่นคำร้อง' ? '#4b5563' : '#3730a3',
                          fontSize: '12px', padding: '4px 8px', borderRadius: '4px', display: 'inline-block'
                        }}>
                          {student.requestStatus}
                        </span>
                      </TableCell>
                      <TableCell>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span className="status-badge" style={{ 
                            background: student.paymentStatus === 'approved' ? '#dcfce7' : student.paymentStatus === 'rejected' ? '#fee2e2' : student.paymentStatus === 'pending' ? '#fef3c7' : '#f3f4f6', 
                            color: student.paymentStatus === 'approved' ? '#166534' : student.paymentStatus === 'rejected' ? '#991b1b' : student.paymentStatus === 'pending' ? '#92400e' : '#4b5563',
                            fontSize: '12px', padding: '4px 8px', borderRadius: '4px', display: 'inline-block', whiteSpace: 'nowrap'
                          }}>
                            {student.paymentStatus === 'approved' ? 'ชำระเงินแล้ว' : student.paymentStatus === 'pending' ? 'รอตรวจสอบ' : student.paymentStatus === 'rejected' ? 'ไม่อนุมัติ' : 'ยังไม่ชำระเงิน'}
                          </span>
                          {student.paymentSlip && (
                            <button 
                              onClick={() => setSlipModal({ open: true, imageUrl: student.paymentSlip, paymentId: student.paymentId, studentCode: student.student_code, paymentStatus: student.paymentStatus })}
                              style={{ border: 'none', background: 'none', color: '#3b82f6', textDecoration: 'underline', cursor: 'pointer', fontSize: '12px', padding: 0 }}
                            >
                              ดูสลิป
                            </button>
                          )}
                        </div>
                      </TableCell>
                      <TableCell align="center">
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                          <Link to={`/dashboard/student/${student.student_code || student.username}`} className="btn-view" style={{ border: '1px solid #ddd', padding: '6px 10px', borderRadius: 6, fontSize: '12px' }}>
                            ดูรายละเอียด
                          </Link>
                          <Button
                            size="small"
                            variant="outlined"
                            color="error"
                            onClick={() => handleOpenDeleteSingle(student)}
                            startIcon={<TrashIcon style={{ width: 14, height: 14 }} />}
                            sx={{ minWidth: 'auto', px: 1, py: 0.5, fontSize: '12px', borderRadius: 1.5 }}
                          >
                            ลบข้อมูล
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                }) : (
                    <TableRow>
                        <TableCell colSpan={9} align="center" sx={{ py: 2.5 }}>ไม่พบข้อมูลนักศึกษา</TableCell>
                    </TableRow>
                )}
              </TableBody>
            </Table>
            )}
          </TableContainer>
        </div>

        {/* Delete Confirmation Modal */}
        <Dialog
          open={deleteModal.open}
          onClose={() => !deleteModal.submitting && setDeleteModal(prev => ({ ...prev, open: false }))}
          maxWidth="sm"
          fullWidth
          PaperProps={{
            sx: {
              borderRadius: 4,
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.1)',
              overflow: 'hidden',
            }
          }}
        >
          <DialogTitle sx={{ fontWeight: 800, color: '#0f172a', bgcolor: '#ffffff', borderBottom: '1px solid #f1f5f9', py: 2.5, px: 3, display: 'flex', alignItems: 'center', gap: 1.75 }}>
            <Box sx={{ width: 46, height: 46, borderRadius: 3, bgcolor: '#fef2f2', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ef4444', flexShrink: 0, border: '1px solid #fecaca' }}>
              <TrashIcon style={{ width: 24, height: 24 }} />
            </Box>
            <Box>
              <Typography variant="h6" sx={{ fontWeight: 800, color: '#0f172a', lineHeight: 1.2, fontSize: '1.15rem' }}>
                ยืนยันการลบข้อมูลนักศึกษา
              </Typography>
              <Typography variant="caption" sx={{ color: '#64748b', fontWeight: 600 }}>
                เลือกรายการข้อมูลที่ต้องการลบออกอย่างถาวร ({deleteModal.targetStudents.length} รายการ)
              </Typography>
            </Box>
          </DialogTitle>

          <DialogContent sx={{ p: 3, pt: '20px !important', bgcolor: '#ffffff' }}>
            {/* Warning & Target Student Header */}
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

              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap', pt: 1, borderTop: '1px dashed #fca5a5' }}>
                <Typography variant="caption" sx={{ color: '#7f1d1d', fontWeight: 700 }}>
                  นักศึกษาที่เลือก ({deleteModal.targetStudents.length}):
                </Typography>
                {deleteModal.targetStudents.map(s => (
                  <Box
                    key={s.student_code || s.username}
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
                      {s.student_code || s.username} - {s.full_name}
                    </Typography>
                    <Typography variant="caption" sx={{ color: '#64748b', fontSize: '0.72rem' }}>
                      ({s.major || s.department || '-'})
                    </Typography>
                  </Box>
                ))}
              </Box>
            </Box>

            {/* Option Cards */}
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
                  justifyContent: 'space-between',
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
                    justifyContent: 'center',
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
                  justifyContent: 'space-between',
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
                    justifyContent: 'center',
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
                  justifyContent: 'space-between',
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
              sx={{ borderRadius: 2.5, px: 3, fontWeight: 700, color: '#334155', borderColor: '#cbd5e1' }}
            >
              ยกเลิก
            </Button>
            <Button
              variant="contained"
              onClick={handleConfirmDelete}
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

        {/* Payment Slip Dialog */}
        <Dialog open={slipModal.open} onClose={() => setSlipModal({ open: false, imageUrl: '', paymentId: null, studentCode: null, paymentStatus: null })} maxWidth="sm" fullWidth>
          <DialogContent sx={{ textAlign: 'center', p: 3 }}>
            {slipModal.imageUrl ? (
              <img 
                src={slipModal.imageUrl} 
                alt="Payment Slip" 
                style={{ maxWidth: '100%', maxHeight: '70vh', objectFit: 'contain', borderRadius: '8px' }} 
              />
            ) : null}
          </DialogContent>
          <DialogActions sx={{ justifyContent: 'space-between', px: 3, pb: 2 }}>
            <Button variant="outlined" color="primary" onClick={handleDownloadSlip}>ดาวน์โหลดสลิป</Button>
            <div style={{ display: 'flex', gap: '8px' }}>
              {slipModal.paymentId && slipModal.paymentStatus !== 'approved' && (
                <>
                  <Button variant="contained" color="success" onClick={() => handleUpdatePaymentStatus('approve')} disableElevation>อนุมัติ</Button>
                  <Button variant="contained" color="error" onClick={() => handleUpdatePaymentStatus('reject')} disableElevation>ไม่อนุมัติ</Button>
                </>
              )}
              <Button onClick={() => setSlipModal({ open: false, imageUrl: '', paymentId: null, studentCode: null, paymentStatus: null })} color="inherit">ปิด</Button>
            </div>
          </DialogActions>
        </Dialog>

        {/* Notification Toast */}
        <Snackbar
          open={toast.open}
          autoHideDuration={3000}
          onClose={() => setToast(prev => ({ ...prev, open: false }))}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        >
          <Alert severity={toast.severity} onClose={() => setToast(prev => ({ ...prev, open: false }))} sx={{ width: '100%' }}>
            {toast.message}
          </Alert>
        </Snackbar>
      </main>
    </div>
  );
};

export default StudentListPage;

