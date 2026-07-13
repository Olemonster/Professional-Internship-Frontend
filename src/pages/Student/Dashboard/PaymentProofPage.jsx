import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button, Alert, Typography, Stack } from '@mui/material';
import api from '../../../api/axios';
import './DashboardPage.css'; // Reusing layout
import './PaymentProofPage.css'; // New styles

const toDataUrl = (file) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error('ไม่สามารถอ่านไฟล์รูปภาพได้'));
    reader.readAsDataURL(file);
  });

const PaymentProofPage = () => {
  const navigate = useNavigate();
  const [studentName, setStudentName] = useState('');
  const [file, setFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState(null); // 'success', 'error', null
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  useEffect(() => {
    const userStr = localStorage.getItem('user');
    if (userStr) {
      const user = JSON.parse(userStr);
      setStudentName(user.full_name || user.name);
    } else {
      navigate('/login');
    }
  }, [navigate]);

  const handleLogout = () => {
    localStorage.removeItem('user');
    navigate('/');
  };

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      if (selectedFile.size > 20 * 1024 * 1024) {
        alert('ไฟล์มีขนาดใหญ่เกินไป กรุณาอัปโหลดไฟล์ขนาดไม่เกิน 20MB');
        e.target.value = '';
        return;
      }
      setFile(selectedFile);
      setPreviewUrl(URL.createObjectURL(selectedFile));
      setUploadStatus(null);
    }
  };

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!file) return;

    setUploading(true);
    try {
      const slipDataUrl = await toDataUrl(file);
      const user = JSON.parse(localStorage.getItem('user'));

      await api.post('/payments', {
        studentId: user.student_code || user.studentId || user.username || '65xxxxx',
        studentName: user.full_name || user.name || 'นักศึกษา',
        date: new Date().toLocaleDateString('th-TH'),
        department: user.department || user.major || 'ไม่ระบุ',
        slipDataUrl,
        slipFileName: file.name
      });

      setUploadStatus('success');
      setFile(null);
      setPreviewUrl(null);
    } catch (error) {
        console.error(error);
        setUploadStatus('error');
    } finally {
        setUploading(false);
    }
  };

  return (
    <div className="dashboard-container">
      <div className="mobile-top-navbar">
        <Link to="/" className="mobile-top-logo" aria-label="LASC Home"></Link>
        <button className="mobile-menu-btn" onClick={() => setIsMenuOpen(!isMenuOpen)}>☰</button>
      </div>
      <div className={`sidebar-overlay ${isMenuOpen ? 'open' : ''}`} onClick={() => setIsMenuOpen(false)}></div>
      <aside className={`sidebar ${isMenuOpen ? 'open' : ''}`}>
        <div className="sidebar-header">
          <h2>นักศึกษา</h2>
        </div>
        <nav className="sidebar-nav">
          <Link to="/dashboard" className="nav-item">
            <span>หน้าหลัก</span>
          </Link>
          <Link to="/dashboard/new-request" className="nav-item">
            <span>ยื่นคำร้องใหม่</span>
          </Link>
          <Link to="/dashboard/my-requests" className="nav-item">
            <span>คำร้องของฉัน</span>
          </Link>
          <Link to="/dashboard/payment-proof" className="nav-item active">
            <span>หลักฐานการชำระเงิน</span>
          </Link>
          <Link to="/dashboard/check-in" className="nav-item">
            <span>รายงานประจำวัน</span>
          </Link>
          <Link to="/dashboard/profile" className="nav-item">
            <span>โปรไฟล์</span>
          </Link>
        </nav>
        <div className="sidebar-footer">
          <button onClick={handleLogout} className="logout-btn">
            <span>← ออกจากระบบ</span>
          </button>
        </div>
      </aside>

      <main className="dashboard-main">
        <header className="dashboard-header">
            <div>
                <h1>หลักฐานการชำระค่าธรรมเนียมออกฝึก</h1>
                <p>อัพโหลดใบเสร็จหรือสลิปการโอนเงินเพื่อยืนยัน</p>
            </div>
             <div className="user-info">
                <span>{studentName}</span>
            </div>
        </header>

        <div className="content-wrapper">
            <div className="payment-proof-card">
              <Typography variant="h6" sx={{ fontWeight: 700, mb: 1 }}>อัพโหลดใบเสร็จ</Typography>
                <Typography className="instruction-text" sx={{ color: '#475569', mb: 2 }}>กรุณาแนบไฟล์รูปภาพ (JPG, PNG) ของหลักฐานการชำระเงิน (ขนาดไม่เกิน 20MB)</Typography>
                
                <form onSubmit={handleUpload} className="upload-form">
                    <div className="file-drop-area">
                        {previewUrl ? (
                            <div className="image-preview">
                                <img src={previewUrl} alt="Preview" />
                              <Button type="button" size="small" color="error" variant="outlined" className="remove-btn" onClick={() => {
                                    setFile(null);
                                    setPreviewUrl(null);
                              }}>ยกเลิก</Button>
                            </div>
                        ) : (
                            <div className="placeholder-preview">
                                <span>คลิกเพื่อเลือกรูปภาพ</span>
                                <input
                                  type="file"
                                  accept="image/*"
                                  onChange={handleFileChange}
                                  className="file-input"
                                />
                            </div>
                        )}
                    </div>

                    <Button 
                        type="submit" 
                        variant="contained"
                        className="submit-btn"
                        disabled={!file || uploading}
                    >
                        {uploading ? 'กำลังอัพโหลด...' : 'ยืนยันการส่งหลักฐาน'}
                    </Button>

                    <Stack spacing={1} sx={{ mt: 1 }}>
                      {uploadStatus === 'success' && (
                        <Alert severity="success">ส่งหลักฐานเรียบร้อยแล้ว รอการตรวจสอบจากเจ้าหน้าที่</Alert>
                      )}
                      {uploadStatus === 'error' && (
                        <Alert severity="error">เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง</Alert>
                      )}
                    </Stack>
                </form>
            </div>
        </div>
      </main>
    </div>
  );
};

export default PaymentProofPage;
