import React, { useEffect, useState, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { TextField, MenuItem, Button, Input } from '@mui/material';
import asyncStorage from '../../../utils/asyncStorage';
import './DashboardPage.css'; // Shared dashboard layout
import './ProfilePage.css';
import StudentSidebar from '../../../components/StudentSidebar';

const ProfilePage = () => {
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
  const [user, setUser] = useState(null);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ 
    name: '', 
    email: '', 
    username: '', 
    phone: '', 
    studentId: '',
    major: ''
  });
  const [avatarPreview, setAvatarPreview] = useState(null);
  const fileInputRef = useRef(null);
  const navigate = useNavigate();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  useEffect(() => {
    let mounted = true;
    asyncStorage.getItem('user').then((raw) => {
      if (!mounted) return;
      if (raw) {
        try {
          const u = JSON.parse(raw);
          setUser(u);
          setForm({ 
            name: u.full_name || u.name || '', 
            email: u.email || '', 
            username: u.username || '',
            phone: u.phone || '',
            studentId: u.studentId || '',
            major: u.major || ''
          });
          setAvatarPreview(u.avatar || null);
        } catch (e) {
          setUser(null);
        }
      } else {
          navigate('/login');
      }
    });
    return () => (mounted = false);
  }, [navigate]);

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleAvatarClick = () => {};

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      // Create a preview
      const reader = new FileReader();
      reader.onloadend = () => {
        setAvatarPreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSave = async () => {
    const updated = {
      ...user,
      email: form.email,
      phone: form.phone
    };

    await asyncStorage.setItem('user', JSON.stringify(updated));

    const usersRaw = await asyncStorage.getItem('users');
    if (usersRaw) {
      const allUsers = JSON.parse(usersRaw);
      const updatedUsers = allUsers.map((storedUser) => {
        const isSameUser =
          (user.id && storedUser.id === user.id) ||
          (user.username && storedUser.username === user.username) ||
          (user.email && storedUser.email === user.email);

        if (!isSameUser) {
          return storedUser;
        }

        return {
          ...storedUser,
          email: form.email,
          phone: form.phone
        };
      });

      await asyncStorage.setItem('users', JSON.stringify(updatedUsers));
    }

    setUser(updated);
    setForm({
      name: user.full_name || user.name || '',
      email: form.email,
      username: user.username || '',
      phone: form.phone,
      studentId: user.studentId || '',
      major: user.major || ''
    });
    setEditing(false);
  };

  const handleLogout = async () => {
    await asyncStorage.removeItem('user');
    setUser(null);
    navigate('/');
  };

  if (!user) return null; // Or loading spinner

  return (
    <div className="dashboard-container">
      <div className="mobile-top-navbar">
        <Link to="/" className="mobile-top-logo" aria-label="LASC Home"></Link>
        <button className="mobile-menu-btn" onClick={() => setIsMenuOpen(!isMenuOpen)}>☰</button>
      </div>
      <StudentSidebar
        isMenuOpen={isMenuOpen}
        setIsMenuOpen={setIsMenuOpen}
        currentPath="/dashboard/profile"
        handleLogout={handleLogout}
      />

      <main className="dashboard-main">
        <header className="dashboard-header">
          <div>
            <h1>ข้อมูลส่วนตัว</h1>
            <p>จัดการข้อมูลโปรไฟล์และรูปภาพของคุณ</p>
          </div>
          <div className="user-info">
             <span>{user.name || user.username}</span>
          </div>
        </header>

        <div className="content-wrapper profile-content-wrapper">
          <div className="profile-layout">
            {/* Left Column: Avatar */}
            <div className="profile-avatar-section">
                <div className="avatar-wrapper" onClick={handleAvatarClick}>
                    {avatarPreview ? (
                        <img src={avatarPreview} alt="Profile" className="avatar-img" />
                    ) : (
                        <div className="avatar-placeholder">
                            <span>{user.username ? user.username.charAt(0).toUpperCase() : 'U'}</span>
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
                <h3 className="profile-name-display">{user.full_name || user.name || user.username}</h3>
                <span className="profile-role-badge">นักศึกษา</span>
            </div>

            {/* Right Column: Details */}
            <div className="profile-details-section">
                <div className="section-header-row">
                    <h3>รายละเอียดบัญชี</h3>
                    {!editing ? (
                      <Button variant="outlined" onClick={() => setEditing(true)}>
                        แก้ไขข้อมูล
                      </Button>
                    ) : (
                        <div className="edit-actions">
                        <Button variant="text" color="inherit" onClick={() => {
                                setEditing(false);
                                // Reset form to original values
                                setForm({ 
                                    name: user.full_name || user.name || '', 
                                    email: user.email || '', 
                                    username: user.username || '',
                                    phone: user.phone || '',
                                    studentId: user.studentId || '',
                                    major: user.major || ''
                                });
                                setAvatarPreview(user.avatar || null);
                                }}>ยกเลิก</Button>
                                <Button variant="contained" onClick={handleSave}>บันทึกการเปลี่ยนแปลง</Button>
                        </div>
                    )}
                </div>

                <div className="profile-fields-grid">
                    <div className="form-group-profile">
                              <TextField
                                fullWidth
                                label="รหัสนักศึกษา"
                            name="studentId" 
                            value={form.studentId} 
                            onChange={handleChange} 
                            disabled={true}
                            placeholder="ระบุรหัสนักศึกษา"
                              />
                    </div>

                    <div className="form-group-profile">
                              <TextField
                                fullWidth
                                label="ชื่อ-นามสกุล"
                            name="name" 
                            value={form.name} 
                            onChange={handleChange} 
                            disabled={true}
                        />
                    </div>
                    
                    <div className="form-group-profile">
                              <TextField
                              fullWidth
                              select
                              label="สาขาวิชา"
                              name="major"
                              value={form.major}
                              onChange={handleChange}
                              disabled={true}
                              >
                              <MenuItem value="">เลือกสาขา</MenuItem>
                              {departmentOptions.map((dept) => (
                                <MenuItem key={dept} value={dept}>{dept}</MenuItem>
                              ))}
                              </TextField>
                    </div>

                    <div className="form-group-profile">
                              <TextField
                                fullWidth
                                label="ชื่อผู้ใช้ (Username)"
                            name="username" 
                            value={form.username} 
                            onChange={handleChange} 
                            disabled={true}
                        />
                    </div>

                    <div className="form-group-profile">
                              <TextField
                                fullWidth
                                label="อีเมล"
                            name="email" 
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
                            placeholder="09x-xxx-xxxx"
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

export default ProfilePage;
