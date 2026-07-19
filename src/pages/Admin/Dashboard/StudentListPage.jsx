import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Box, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, TextField, MenuItem, Dialog, DialogContent, DialogActions, Button } from '@mui/material';
import './AdminDashboardPage.css'; // Reusing admin styles for sidebar
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
  const [slipModal, setSlipModal] = useState({ open: false, imageUrl: '', paymentId: null, studentCode: null, paymentStatus: null });
  const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';

  const getToken = () => {
    try {
      const user = JSON.parse(localStorage.getItem('user'));
      return user?.token || '';
    } catch {
      return '';
    }
  };

  useEffect(() => {
    const checkAdmin = async () => {
      // Check admin role
      const userStr = localStorage.getItem('user'); // Or asyncStorage
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

      // Load students, requests, and payments
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

        const studentList = usersData.data || [];
        const requestsList = reqsData.data || [];
        const paymentsList = paysData.data || [];

        const enrichedStudents = studentList.map(student => {
          const studentIdStr = String(student.student_code || student.studentId || student.username);
          
          const studentReqs = requestsList.filter(r => String(r.studentId) === studentIdStr);
          const latestReq = studentReqs.length > 0 ? studentReqs[studentReqs.length - 1] : null;
          
          const studentPays = paymentsList.filter(p => String(p.studentId) === studentIdStr);
          const latestPay = studentPays.length > 0 ? studentPays[studentPays.length - 1] : null;

          return {
            ...student,
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
    
    checkAdmin();
  }, [navigate]);

  const handleLogout = () => {
    localStorage.removeItem('user');
    navigate('/');
  };

  const filteredStudents = students.filter((student) => {
    if (selectedDepartment === 'all') return true;
    const dept = student.major || student.department || '';
    return dept === selectedDepartment;
  });

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
    } catch (err) {
      alert(err.message);
    }
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

          <div className="filter-group" style={{display: 'flex', gap: 10, alignItems: 'center', marginBottom: 16}}>
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

          <TableContainer component={Box} className="compact-table"> {/* Reusing table styles */}
            {loading ? (
                <p>กำลังโหลดข้อมูล...</p>
            ) : (
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>รหัสนักศึกษา</TableCell>
                  <TableCell>ชื่อ-นามสกุล</TableCell>
                  <TableCell>สาขา</TableCell>
                  <TableCell>อีเมล</TableCell>
                  <TableCell>เบอร์โทร</TableCell>
                  <TableCell>สถานะคำร้อง</TableCell>
                  <TableCell>การชำระเงิน</TableCell>
                  <TableCell>การกระทำ</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredStudents.length > 0 ? filteredStudents.map((student, index) => (
                    <TableRow key={index} hover>
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
                      <TableCell>
                        <Link to={`/dashboard/student/${student.student_code || student.username}`} className="btn-view" style={{border: '1px solid #ddd', padding: '6px 10px', borderRadius: 6}}>ดูรายละเอียด</Link>
                      </TableCell>
                    </TableRow>
                )) : (
                    <TableRow>
                        <TableCell colSpan={8} align="center" sx={{ py: 2.5 }}>ไม่พบข้อมูลนักศึกษา</TableCell>
                    </TableRow>
                )}
              </TableBody>
            </Table>
            )}
          </TableContainer>
        </div>

        <Dialog open={slipModal.open} onClose={() => setSlipModal({ open: false, imageUrl: '', paymentId: null, studentCode: null, paymentStatus: null })} maxWidth="sm" fullWidth>
          <DialogContent sx={{ textAlign: 'center', p: 3 }}>
            <img 
              src={slipModal.imageUrl} 
              alt="Payment Slip" 
              style={{ maxWidth: '100%', maxHeight: '70vh', objectFit: 'contain', borderRadius: '8px' }} 
            />
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
      </main>
    </div>
  );
};

export default StudentListPage;
