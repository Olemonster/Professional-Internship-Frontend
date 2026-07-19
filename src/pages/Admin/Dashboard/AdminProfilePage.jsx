import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { TextField, Button, Input } from '@mui/material';
import asyncStorage from '../../../utils/asyncStorage';
import './AdminDashboardPage.css';
import '../../Student/Dashboard/ProfilePage.css';
import AdminSidebar from '../../../components/AdminSidebar';

const AdminProfilePage = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [editing, setEditing] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [avatarPreview, setAvatarPreview] = useState(null);
  const fileInputRef = useRef(null);
  const [form, setForm] = useState({
    name: '',
    email: '',
    username: '',
    phone: '',
    position: ''
  });

  useEffect(() => {
    let mounted = true;
    asyncStorage.getItem('user').then((raw) => {
      if (!mounted) return;
      if (!raw) {
        navigate('/login');
        return;
      }

      try {
        const parsed = JSON.parse(raw);
        if (parsed.role !== 'admin') {
          navigate('/dashboard');
          return;
        }
        setUser(parsed);
        setForm({
          name: parsed.full_name || parsed.name || '',
          email: parsed.email || '',
          username: parsed.username || '',
          phone: parsed.phone || '',
          position: parsed.position || 'ผู้ดูแลระบบ'
        });
        setAvatarPreview(parsed.avatar || null);
      } catch (error) {
        setUser(null);
        navigate('/login');
      }
    });

    return () => {
      mounted = false;
    };
  }, [navigate]);

  const handleLogout = async () => {
    await asyncStorage.removeItem('user');
    setUser(null);
    navigate('/');
  };

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleAvatarClick = () => {
    if (editing && fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleFileChange = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = () => {
      setAvatarPreview(reader.result);
    };
    reader.readAsDataURL(file);
  };

  const handleSave = async () => {
    const updated = {
      ...user,
      ...form,
      full_name: form.name,
      avatar: avatarPreview,
      role: 'admin'
    };
    await asyncStorage.setItem('user', JSON.stringify(updated));
    setUser(updated);
    setEditing(false);
  };

  if (!user) return null;

  return (
    <div className="admin-dashboard-container">
      <div className="mobile-top-navbar">
        <Link to="/" className="mobile-top-logo" aria-label="LASC Home"></Link>
        <button className="mobile-menu-btn" onClick={() => setIsMenuOpen(!isMenuOpen)}>☰</button>
      </div>
      <AdminSidebar
        isMenuOpen={isMenuOpen}
        setIsMenuOpen={setIsMenuOpen}
        currentPath="/admin-dashboard/profile"
        handleLogout={handleLogout}
      />

      <main className="admin-main">
        <header className="admin-header">
          <div>
            <h1>ข้อมูลผู้ดูแลระบบ</h1>
            <p>จัดการข้อมูลโปรไฟล์และรูปภาพของคุณ</p>
          </div>
          <div className="user-info">
            <span>{user.name || user.username}</span>
          </div>
        </header>

        <div className="content-wrapper profile-content-wrapper">
          <div className="profile-layout">
            <div className="profile-avatar-section">
              <div
                className={`avatar-wrapper ${editing ? 'editable' : ''}`}
                onClick={handleAvatarClick}
              >
                {avatarPreview ? (
                  <img src={avatarPreview} alt="Profile" className="avatar-img" />
                ) : (
                  <div className="avatar-placeholder">
                    <span>{user.username ? user.username.charAt(0).toUpperCase() : 'A'}</span>
                  </div>
                )}

                {editing && (
                  <div className="avatar-overlay">
                    <span>แก้ไขรูป</span>
                  </div>
                )}
              </div>
              <Input
                type="file"
                inputRef={fileInputRef}
                onChange={handleFileChange}
                sx={{ display: 'none' }}
                inputProps={{ accept: 'image/*' }}
              />
              <h3 className="profile-name-display">
                {user.full_name || user.name || user.username}
              </h3>
              <span className="profile-role-badge">ผู้ดูแลระบบ</span>
            </div>

            <div className="profile-details-section">
              <div className="section-header-row">
                <h3>รายละเอียดบัญชี</h3>
                {!editing ? (
                  <Button variant="outlined" onClick={() => setEditing(true)}>
                    แก้ไขข้อมูล
                  </Button>
                ) : (
                  <div className="edit-actions">
                    <Button
                      variant="text"
                      color="inherit"
                      onClick={() => {
                        setEditing(false);
                        setForm({
                          name: user.full_name || user.name || '',
                          email: user.email || '',
                          username: user.username || '',
                          phone: user.phone || '',
                          position: user.position || 'ผู้ดูแลระบบ'
                        });
                        setAvatarPreview(user.avatar || null);
                      }}
                    >
                      ยกเลิก
                    </Button>
                    <Button variant="contained" onClick={handleSave}>
                      บันทึกการเปลี่ยนแปลง
                    </Button>
                  </div>
                )}
              </div>

              <div className="profile-fields-grid">
                <div className="form-group-profile">
                  <TextField
                    fullWidth
                    label="ชื่อ-นามสกุล"
                    name="name"
                    value={form.name}
                    onChange={handleChange}
                    disabled={!editing}
                  />
                </div>

                <div className="form-group-profile">
                  <TextField
                    fullWidth
                    label="ตำแหน่ง"
                    name="position"
                    value={form.position}
                    onChange={handleChange}
                    disabled={!editing}
                  />
                </div>

                <div className="form-group-profile">
                  <TextField
                    fullWidth
                    label="ชื่อผู้ใช้ (Username)"
                    name="username"
                    value={form.username}
                    onChange={handleChange}
                    disabled={!editing}
                  />
                </div>

                <div className="form-group-profile">
                  <TextField
                    fullWidth
                    label="อีเมล"
                    name="email"
                    type="email"
                    value={form.email}
                    onChange={handleChange}
                    disabled={!editing}
                  />
                </div>

                <div className="form-group-profile">
                  <TextField
                    fullWidth
                    label="เบอร์โทรศัพท์"
                    name="phone"
                    value={form.phone}
                    onChange={handleChange}
                    disabled={!editing}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default AdminProfilePage;
