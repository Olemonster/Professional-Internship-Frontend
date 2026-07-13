import { useEffect, useState, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Box, Button, Chip, Dialog, DialogTitle, DialogContent, DialogActions,
  TextField, MenuItem, Typography, Snackbar, Alert as MuiAlert, Switch,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, FormControlLabel
} from '@mui/material';
import api from '../../../api/axios';
import '../Dashboard/AdminDashboardPage.css';
import { MegaphoneIcon, MapPinIcon, PencilSquareIcon, PencilIcon } from '@heroicons/react/24/outline';

const categories = ['รับสมัคร', 'ประกาศ', 'กิจกรรม', 'ทั่วไป'];

const categoryColors = {
  'รับสมัคร': { bg: '#dcfce7', color: '#166534' },
  'ประกาศ': { bg: '#dbeafe', color: '#1e40af' },
  'กิจกรรม': { bg: '#fef3c7', color: '#92400e' },
  'ทั่วไป': { bg: '#f3f4f6', color: '#374151' },
};

const AdminAnnouncementsPage = () => {
  const navigate = useNavigate();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState({ open: false, message: '', severity: 'success' });
  const [formDialog, setFormDialog] = useState({ open: false, mode: 'create', data: null });
  const [formData, setFormData] = useState({ title: '', content: '', category: 'ทั่วไป', coverImage: '', is_pinned: false });
  const [deleteDialog, setDeleteDialog] = useState({ open: false, id: null, title: '' });
  const fileInputRef = useRef(null);

  useEffect(() => {
    const userStr = localStorage.getItem('user');
    if (!userStr) { navigate('/login'); return; }
    const user = JSON.parse(userStr);
    if (user.role !== 'admin') { navigate('/login'); return; }
    fetchAnnouncements();
  }, [navigate]);

  const fetchAnnouncements = async () => {
    try {
      const res = await api.get('/announcements');
      setAnnouncements(res.data.data || []);
    } catch (err) {
      console.error('Failed to fetch announcements:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => { localStorage.removeItem('user'); navigate('/'); };

  const openCreateDialog = () => {
    setFormData({ title: '', content: '', category: 'ทั่วไป', coverImage: '', is_pinned: false });
    setFormDialog({ open: true, mode: 'create', data: null });
  };

  const openEditDialog = (item) => {
    setFormData({
      title: item.title,
      content: item.content,
      category: item.category,
      coverImage: item.coverImage || '',
      is_pinned: !!item.is_pinned,
    });
    setFormDialog({ open: true, mode: 'edit', data: item });
  };

  const handleCloseDialog = () => setFormDialog({ open: false, mode: 'create', data: null });

  const handleFormChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      setToast({ open: true, message: 'ไฟล์รูปภาพต้องไม่เกิน 2MB', severity: 'warning' });
      return;
    }
    const reader = new FileReader();
    reader.onloadend = () => setFormData(prev => ({ ...prev, coverImage: reader.result }));
    reader.readAsDataURL(file);
  };

  const handleSubmit = async () => {
    if (!formData.title.trim() || !formData.content.trim()) {
      setToast({ open: true, message: 'กรุณากรอกหัวข้อและเนื้อหา', severity: 'warning' });
      return;
    }
    try {
      if (formDialog.mode === 'create') {
        await api.post('/announcements', formData);
        setToast({ open: true, message: 'สร้างข่าวประชาสัมพันธ์สำเร็จ', severity: 'success' });
      } else {
        await api.put(`/announcements/${formDialog.data.id}`, formData);
        setToast({ open: true, message: 'อัปเดตข่าวสำเร็จ', severity: 'success' });
      }
      handleCloseDialog();
      fetchAnnouncements();
    } catch (err) {
      setToast({ open: true, message: err.response?.data?.message || 'เกิดข้อผิดพลาด', severity: 'error' });
    }
  };

  const handleToggle = async (id) => {
    try {
      const res = await api.patch(`/announcements/${id}/toggle`);
      setToast({ open: true, message: res.data.message, severity: 'success' });
      fetchAnnouncements();
    } catch (err) {
      setToast({ open: true, message: 'เกิดข้อผิดพลาด', severity: 'error' });
    }
  };

  const handleDeleteConfirm = async () => {
    try {
      await api.delete(`/announcements/${deleteDialog.id}`);
      setToast({ open: true, message: 'ลบข่าวสำเร็จ', severity: 'success' });
      setDeleteDialog({ open: false, id: null, title: '' });
      fetchAnnouncements();
    } catch (err) {
      setToast({ open: true, message: 'ลบไม่สำเร็จ', severity: 'error' });
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('th-TH', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="admin-dashboard-container">
      <div className="mobile-top-navbar">
        <Link to="/" className="mobile-top-logo" aria-label="LASC Home"></Link>
        <button className="mobile-menu-btn" onClick={() => setIsMenuOpen(!isMenuOpen)}>☰</button>
      </div>
      <div className={`sidebar-overlay ${isMenuOpen ? 'open' : ''}`} onClick={() => setIsMenuOpen(false)}></div>
      <aside className={`sidebar ${isMenuOpen ? 'open' : ''}`}>
        <div className="sidebar-header"><h2>ผู้ดูแลระบบ</h2></div>
        <nav className="sidebar-nav">
          <Link to="/admin-dashboard" className="nav-item"><span>หน้าหลัก</span></Link>
          <Link to="/admin-dashboard/students" className="nav-item"><span>นักศึกษา</span></Link>
          <Link to="/admin-dashboard/users" className="nav-item"><span>จัดการผู้ใช้</span></Link>
          <Link to="/admin-dashboard/checkins" className="nav-item"><span>รายงานประจำวัน</span></Link>
          <Link to="/admin-dashboard/attendance-overview" className="nav-item"><span>ภาพรวมรายบุคคล</span></Link>
          <Link to="/admin-dashboard/reports" className="nav-item"><span>รายงาน</span></Link>
          <Link to="/admin-dashboard/analytics" className="nav-item"><span>สถิติการประเมิน</span></Link>
          <Link to="/admin-dashboard/announcements" className="nav-item active"><span>ข่าวประชาสัมพันธ์</span></Link>
          <Link to="/admin-dashboard/profile" className="nav-item"><span>โปรไฟล์</span></Link>
        </nav>
        <div className="sidebar-footer">
          <button onClick={handleLogout} className="logout-btn"><span>← ออกจากระบบ</span></button>
        </div>
      </aside>

      <main className="admin-main">
        <header className="admin-header">
          <div>
            <h1 style={{display:'flex', alignItems:'center', gap:'8px'}}><MegaphoneIcon style={{width: 32, height: 32}} /> ข่าวประชาสัมพันธ์</h1>
            <p>จัดการข่าวสำหรับแสดงบนหน้าแรก เช่น บริษัท/โรงพยาบาลที่เปิดรับฝึกงาน</p>
          </div>
          <Button variant="contained" onClick={openCreateDialog} sx={{ bgcolor: '#111', '&:hover': { bgcolor: '#000' }, fontWeight: 700, borderRadius: 2 }}>
            + สร้างข่าวใหม่
          </Button>
        </header>

        <Paper elevation={0} sx={{ border: '1px solid #e5e7eb', borderRadius: 2, overflow: 'hidden' }}>
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell sx={{ fontWeight: 700 }}>หัวข้อ</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>หมวดหมู่</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>ปักหมุด</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>สถานะ</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>วันที่โพสต์</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>จัดการ</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {loading ? (
                  <TableRow><TableCell colSpan={6} align="center">กำลังโหลด...</TableCell></TableRow>
                ) : announcements.length === 0 ? (
                  <TableRow><TableCell colSpan={6} align="center" sx={{ py: 4, color: '#94a3b8' }}>ยังไม่มีข่าวประชาสัมพันธ์ กด "สร้างข่าวใหม่" เพื่อเริ่มต้น</TableCell></TableRow>
                ) : announcements.map((item) => {
                  const catStyle = categoryColors[item.category] || categoryColors['ทั่วไป'];
                  return (
                    <TableRow key={item.id} hover>
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                          {item.coverImage && (
                            <Box component="img" src={item.coverImage} alt="" sx={{ width: 48, height: 48, borderRadius: 1, objectFit: 'cover', flexShrink: 0 }} />
                          )}
                          <Typography variant="body2" sx={{ fontWeight: 600, maxWidth: 300, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {item.title}
                          </Typography>
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Chip label={item.category} size="small" sx={{ bgcolor: catStyle.bg, color: catStyle.color, fontWeight: 600 }} />
                      </TableCell>
                      <TableCell>{item.is_pinned ? <MapPinIcon style={{width: 20, height: 20}} /> : '-'}</TableCell>
                      <TableCell>
                        <Switch
                          size="small"
                          checked={!!item.is_active}
                          onChange={() => handleToggle(item.id)}
                          color="success"
                        />
                        <Typography variant="caption" sx={{ color: item.is_active ? '#10b981' : '#94a3b8' }}>
                          {item.is_active ? 'แสดง' : 'ซ่อน'}
                        </Typography>
                      </TableCell>
                      <TableCell sx={{ fontSize: '0.85rem', color: '#64748b' }}>{formatDate(item.created_at)}</TableCell>
                      <TableCell>
                        <Box sx={{ display: 'flex', gap: 1 }}>
                          <Button size="small" variant="outlined" onClick={() => openEditDialog(item)} sx={{ borderRadius: 999, fontWeight: 600 }}>แก้ไข</Button>
                          <Button size="small" variant="outlined" color="error" onClick={() => setDeleteDialog({ open: true, id: item.id, title: item.title })} sx={{ borderRadius: 999, fontWeight: 600 }}>ลบ</Button>
                        </Box>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>
        </Paper>
      </main>

      {/* Create / Edit Dialog */}
      <Dialog open={formDialog.open} onClose={handleCloseDialog} fullWidth maxWidth="sm">
        <DialogTitle sx={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: 1 }}>{formDialog.mode === 'create' ? <><PencilSquareIcon style={{width:24, height:24}}/> สร้างข่าวใหม่</> : <><PencilIcon style={{width:24, height:24}}/> แก้ไขข่าว</>}</DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: '16px !important' }}>
          <TextField label="หัวข้อข่าว" name="title" value={formData.title} onChange={handleFormChange} fullWidth required />
          <TextField label="เนื้อหา" name="content" value={formData.content} onChange={handleFormChange} fullWidth multiline rows={4} required />
          <TextField select label="หมวดหมู่" name="category" value={formData.category} onChange={handleFormChange} fullWidth>
            {categories.map(c => <MenuItem key={c} value={c}>{c}</MenuItem>)}
          </TextField>
          <Box>
            <Button variant="outlined" component="label" sx={{ mb: 1 }}>
              อัปโหลดรูปปก
              <input ref={fileInputRef} type="file" hidden accept="image/*" onChange={handleImageUpload} />
            </Button>
            {formData.coverImage && (
              <Box sx={{ mt: 1 }}>
                <Box component="img" src={formData.coverImage} alt="preview" sx={{ width: '100%', maxHeight: 200, objectFit: 'cover', borderRadius: 1 }} />
                <Button size="small" color="error" onClick={() => setFormData(prev => ({ ...prev, coverImage: '' }))}>ลบรูป</Button>
              </Box>
            )}
          </Box>
          <FormControlLabel
            control={<Switch checked={formData.is_pinned} onChange={(e) => setFormData(prev => ({ ...prev, is_pinned: e.target.checked }))} />}
            label={<span style={{display:"flex", alignItems:"center", gap:"4px"}}><MapPinIcon style={{width: 20, height: 20}}/> ปักหมุดข่าวนี้ (แสดงเป็นอันดับแรก)</span>}
          />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={handleCloseDialog}>ยกเลิก</Button>
          <Button variant="contained" onClick={handleSubmit} sx={{ bgcolor: '#111', '&:hover': { bgcolor: '#000' } }}>
            {formDialog.mode === 'create' ? 'สร้างข่าว' : 'บันทึก'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirmation */}
      <Dialog open={deleteDialog.open} onClose={() => setDeleteDialog({ open: false, id: null, title: '' })}>
        <DialogTitle>ยืนยันการลบข่าว</DialogTitle>
        <DialogContent>
          <Typography>คุณต้องการลบข่าว <strong>"{deleteDialog.title}"</strong> ใช่หรือไม่?</Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setDeleteDialog({ open: false, id: null, title: '' })}>ยกเลิก</Button>
          <Button variant="contained" color="error" onClick={handleDeleteConfirm}>ลบ</Button>
        </DialogActions>
      </Dialog>

      <Snackbar open={toast.open} autoHideDuration={2600} onClose={() => setToast(prev => ({ ...prev, open: false }))} anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}>
        <MuiAlert elevation={6} variant="filled" onClose={() => setToast(prev => ({ ...prev, open: false }))} severity={toast.severity} sx={{ width: '100%' }}>{toast.message}</MuiAlert>
      </Snackbar>
    </div>
  );
};

export default AdminAnnouncementsPage;
