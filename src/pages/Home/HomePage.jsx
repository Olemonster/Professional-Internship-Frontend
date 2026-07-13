import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  AppBar,
  Avatar,
  Box,
  Button,
  IconButton,
  Menu,
  MenuItem,
  Toolbar,
  Typography,
} from '@mui/material';
import api from '../../api/axios';
import './HomePage.css';
import logo from '../../assets/LASC-SSKRU-1.png';
import banner from '../../assets/Banner.jpg';
import sskruBg from '../../assets/SSKRU_BG.png';
import { PhoneIcon, EnvelopeIcon, MapPinIcon, CalendarIcon } from '@heroicons/react/24/outline';

const HomePage = () => {
  const [user, setUser] = useState(null);
  const [menuAnchorEl, setMenuAnchorEl] = useState(null);
  const [companyCatalog, setCompanyCatalog] = useState([]);
  const [announcements, setAnnouncements] = useState([]);

  const companyImagePool = [
    'https://images.unsplash.com/photo-1542744173-8e7e53415bb0?q=80&w=800&auto=format&fit=crop&crop=top',
    'https://images.unsplash.com/photo-1498050108023-c5249f4df085?q=80&w=800&auto=format&fit=crop&crop=top',
    'https://images.unsplash.com/photo-1504639725590-34d0984388bd?q=80&w=800&auto=format&fit=crop&crop=top',
    'https://images.unsplash.com/photo-1489515217757-5fd1be406fef?q=80&w=800&auto=format&fit=crop&crop=top',
    'https://images.unsplash.com/photo-1469474968028-56623f02e42e?q=80&w=800&auto=format&fit=crop&crop=top',
    'https://images.unsplash.com/photo-1509395176047-4a66953fd231?q=80&w=800&auto=format&fit=crop&crop=top',
    'https://images.unsplash.com/photo-1520607162513-77705c0f0d4a?q=80&w=800&auto=format&fit=crop&crop=top',
    'https://images.unsplash.com/photo-1449247526693-aa049327be54?q=80&w=800&auto=format&fit=crop&crop=top',
    'https://images.unsplash.com/photo-1487058792275-0ad4aaf24ca7?q=80&w=800&auto=format&fit=crop&crop=top',
    'https://images.unsplash.com/photo-1507679799987-c73779587ccf?q=80&w=800&auto=format&fit=crop&crop=top',
    'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?q=80&w=800&auto=format&fit=crop&crop=top',
    'https://images.unsplash.com/photo-1450101499163-c8848c66ca85?q=80&w=800&auto=format&fit=crop&crop=top',
  ];

  const getCompanyImage = (key, indexOffset = 0) => {
    if (!companyImagePool.length) return undefined;
    const hash = key
      .split('')
      .reduce((acc, char) => acc + char.charCodeAt(0), 0);
    const index = (hash + indexOffset) % companyImagePool.length;
    return companyImagePool[index];
  };

  const normalizeCompanyName = (value) =>
    String(value || '')
      .trim()
      .toLowerCase()
      .replace(/\s+/g, ' ');

  const fallbackCompanies = [
    { name: 'บริษัท ABC', businessType: 'เทคโนโลยีสารสนเทศ', address: 'สงขลา', source: 'รายการแนะนำ' },
    { name: 'บริษัท NEX Digital', businessType: 'ซอฟต์แวร์และดิจิทัลโซลูชัน', address: 'หาดใหญ่', source: 'รายการแนะนำ' },
    { name: 'บริษัท Green Agro Tech', businessType: 'เทคโนโลยีการเกษตร', address: 'พัทลุง', source: 'รายการแนะนำ' },
    { name: 'บริษัท HealthPlus Care', businessType: 'สุขภาพและสาธารณสุข', address: 'สงขลา', source: 'รายการแนะนำ' },
    { name: 'บริษัท BuildWise Engineering', businessType: 'วิศวกรรมและโครงสร้าง', address: 'นครศรีธรรมราช', source: 'รายการแนะนำ' },
    { name: 'บริษัท Smart Logistics Hub', businessType: 'โลจิสติกส์และซัพพลายเชน', address: 'สุราษฎร์ธานี', source: 'รายการแนะนำ' },
  ].map((company, index) => ({
    ...company,
    imageUrl: getCompanyImage(normalizeCompanyName(company.name), index),
  }));

  const formatAddress = (address) => {
    if (!address) return 'ไม่ระบุที่อยู่';
    if (typeof address === 'string') return address;

    const parts = [];
    if (address.house) parts.push(`บ้านเลขที่ ${address.house}`);
    if (address.moo) parts.push(`หมู่ ${address.moo}`);
    if (address.tambon) parts.push(`ตำบล ${address.tambon}`);
    if (address.amphur) parts.push(`อำเภอ ${address.amphur}`);
    if (address.province) parts.push(`จังหวัด ${address.province}`);
    if (address.postal) parts.push(`รหัส ${address.postal}`);
    if (address.detail) parts.push(address.detail);

    return parts.length ? parts.join(' ') : 'ไม่ระบุที่อยู่';
  };

  const buildCompanyCatalog = async () => {
    const map = new Map();
    try {
      const userStr = localStorage.getItem('user');
      const token = (() => {
        try {
          return userStr ? JSON.parse(userStr)?.token : undefined;
        } catch {
          return undefined;
        }
      })();

      if (!token) {
        const publicRes = await api.get('/public/companies', { headers: { Authorization: undefined } });
        const companies = (publicRes.data.data || []).map((c) => ({
          ...c,
          address: typeof c.address === 'object' && c.address !== null ? formatAddress(c.address) : (c.address || '-'),
        }));
        setCompanyCatalog(companies.length ? companies : fallbackCompanies);
        return;
      }

      const reqsRes = await api.get('/requests').catch(() => ({ data: { data: [] } }));
      const requests = reqsRes.data.data || [];

      requests.forEach((request) => {
        const companyName = request.companyName || request.company || request.details?.companyName || '';
        const key = normalizeCompanyName(companyName);
        if (!key) return;
        const existing = map.get(key);
        if (existing) {
          if (existing.businessType === 'ไม่ระบุประเภทธุรกิจ' && request.position) {
            existing.businessType = `ตำแหน่งยอดฮิต: ${request.position}`;
          }
          return;
        }
        map.set(key, {
          name: companyName,
          businessType: request.position ? `ตำแหน่งยอดฮิต: ${request.position}` : 'ไม่ระบุประเภทธุรกิจ',
          address: formatAddress(request.details?.companyAddress || request.address),
          source: 'จากคำร้องรุ่นพี่',
          imageUrl: getCompanyImage(key, 3),
        });
      });
    } catch (err) {
      console.error('Failed to build company catalog:', err);
      setCompanyCatalog(fallbackCompanies);
      return;
    }
    const result = Array.from(map.values());
    setCompanyCatalog(result.length > 0 ? result.slice(0, 12) : fallbackCompanies);
  };

  useEffect(() => {
    const userStr = localStorage.getItem('user');
    if (userStr) {
      try {
        setUser(JSON.parse(userStr));
      } catch (e) {
        setUser(null);
      }
    }
  }, []);

  useEffect(() => {
    buildCompanyCatalog();

    // Fetch announcements
    api.get('/public/announcements')
      .then(res => setAnnouncements(res.data.data || []))
      .catch(() => setAnnouncements([]));

    const reloadCatalog = () => buildCompanyCatalog();
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') reloadCatalog();
    };

    window.addEventListener('focus', reloadCatalog);
    window.addEventListener('storage', reloadCatalog);
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      window.removeEventListener('focus', reloadCatalog);
      window.removeEventListener('storage', reloadCatalog);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('user');
    setUser(null);
    setMenuAnchorEl(null);
  };

  const handleOpenMenu = (event) => {
    setMenuAnchorEl(event.currentTarget);
  };

  const handleCloseMenu = () => {
    setMenuAnchorEl(null);
  };

  const getDashboardPath = (role) => {
    if (role === 'admin') return '/admin-dashboard';
    if (role === 'advisor') return '/advisor-dashboard';
    return '/dashboard';
  };

  const getProfilePath = (role) => {
    if (role === 'admin') return '/admin-dashboard/profile';
    if (role === 'student') return '/dashboard/profile';
    return null;
  };

  return (
    <div className="home-container">
      {/* Utility Bar */}
      <Box sx={{ background: '#ffffff', color: '#111111', py: 0.8, px: { xs: 2, md: 4 }, display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 2, fontSize: '0.85rem' }}>
        <Typography variant="caption" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <PhoneIcon style={{ width: 16, height: 16 }} /> ติดต่อสอบถาม 02-XXX-XXXX
        </Typography>
        <Typography variant="caption" sx={{ display: { xs: 'none', sm: 'flex' }, alignItems: 'center', gap: 1 }}>
          <EnvelopeIcon style={{ width: 16, height: 16 }} /> contact@example.com
        </Typography>
      </Box>

      <AppBar position="static" color="transparent" elevation={0} sx={{ borderBottom: '3px solid transparent', borderImage: 'linear-gradient(to right, #9333ea, #eab308) 1', bgcolor: '#ffffff' }}>
        <Toolbar
          sx={{
            minHeight: 90,
            px: { xs: 2, md: 4 },
            display: 'flex',
            flexWrap: 'nowrap',
            justifyContent: 'space-between',
            gap: 2,
            overflow: 'hidden',
          }}
        >
          <Box sx={{ minWidth: 0, flex: '1 1 auto', overflow: 'hidden' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Box
                component="img"
                src={logo}
                alt="LASC Logo"
                sx={{
                  height: { xs: 36, sm: 44, md: 54 },
                  width: 'auto',
                  maxWidth: '100%',
                  display: 'block',
                  objectFit: 'contain',
                }}
              />
              <Box sx={{ display: { xs: 'none', sm: 'block' } }}>
                <Typography sx={{ fontWeight: 600, fontSize: { xs: '1.125rem', sm: '1.3rem', md: '1.6rem' }, letterSpacing: '0.2px', color: '#111111' }}>
                  Professional Internship
                </Typography>
              </Box>
            </Box>
          </Box>

          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: { xs: 0.75, sm: 1.25 },
              flex: '0 0 auto',
              whiteSpace: 'nowrap',
            }}
          >
            {!user ? (
              <Button component={Link} to="/login" variant="text" sx={{ background: 'linear-gradient(135deg, #6b21a8, #9333ea)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', fontWeight: 700, minWidth: 'auto', px: 1, transition: 'all 0.3s', '&:hover': { background: 'linear-gradient(135deg, #ca8a04, #facc15)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' } }}>
                เข้าสู่ระบบ
              </Button>
            ) : (
              <>
                <Button
                  component={Link}
                  to={getDashboardPath(user.role)}
                  variant="text"
                  sx={{
                    background: 'linear-gradient(135deg, #6b21a8, #9333ea)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    fontWeight: 700,
                    minWidth: 'auto',
                    px: { xs: 0.5, sm: 1 },
                    transition: 'all 0.3s',
                    '&:hover': { background: 'linear-gradient(135deg, #ca8a04, #facc15)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }
                  }}
                >
                  Dashboard
                </Button>

                <IconButton onClick={handleOpenMenu} size="small" sx={{ p: 0.25 }}>
                  <Avatar sx={{ width: 38, height: 38, background: 'linear-gradient(135deg, #6b21a8, #9333ea)', fontSize: '1rem', fontWeight: 700 }}>
                    {(user?.name || user?.full_name || 'U').charAt(0).toUpperCase()}
                  </Avatar>
                </IconButton>

                <Menu
                  anchorEl={menuAnchorEl}
                  open={Boolean(menuAnchorEl)}
                  onClose={handleCloseMenu}
                  anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
                  transformOrigin={{ vertical: 'top', horizontal: 'right' }}
                >
                  {getProfilePath(user.role) && (
                    <MenuItem
                      component={Link}
                      to={getProfilePath(user.role)}
                      onClick={handleCloseMenu}
                    >
                      โปรไฟล์
                    </MenuItem>
                  )}
                  <MenuItem className="logout-btn" onClick={handleLogout}>ออกจากระบบ</MenuItem>
                </Menu>
              </>
            )}
          </Box>
        </Toolbar>
      </AppBar>

      {/* Bottom Utility Bar */}
      <Box sx={{ background: '#ffffff', borderBottom: '1px solid #e5e7eb', color: '#111111', py: 0.8, px: { xs: 2, md: 4 }, display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 2, fontSize: '0.85rem' }}>
        <Typography variant="caption" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          ประกาศด่วน: ระบบเปิดรับคำร้องฝึกงานตั้งแต่วันที่ 1 สิงหาคม เป็นต้นไป
        </Typography>
      </Box>

      <main className="hero-section" style={{ padding: 0 }}>
        <img src={sskruBg} alt="SSKRU Background" style={{ width: '100%', height: 'auto', display: 'block' }} />
        <div className="hero-content" style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div className="hero-buttons">
            {/* Buttons removed */ }
          </div>
        </div>
      </main>

      {/* Announcements Section */}
      {announcements.length > 0 && (
        <section className="features-section">
          <h2 className="section-title">ประชาสัมพันธ์</h2>
          <div className="features-grid">
            {announcements.slice(0, 6).map((news) => (
              <Link to={`/news/${news.id}`} key={news.id} style={{ textDecoration: 'none', color: 'inherit' }}>
              <div className="feature-card" style={{ position: 'relative', cursor: 'pointer', transition: 'transform 0.2s, box-shadow 0.2s', height: '100%' }}
                onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-4px)'; e.currentTarget.style.boxShadow = '0 8px 24px rgba(0,0,0,0.1)'; }}
                onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = 'none'; }}
              >
                {news.is_pinned ? (
                  <span style={{
                    position: 'absolute', top: 12, right: 12,
                    background: '#fbbf24', color: '#78350f', fontSize: '0.7rem',
                    fontWeight: 700, padding: '2px 8px', borderRadius: '999px',
                    display: 'flex', alignItems: 'center', gap: '4px'
                  }}><MapPinIcon style={{ width: 12, height: 12 }} /> ปักหมุด</span>
                ) : null}
                {news.coverImage && (
                  <Box
                    component="img"
                    src={news.coverImage}
                    alt={news.title}
                    sx={{ width: '100%', height: 160, objectFit: 'cover', borderRadius: 1, mb: 2 }}
                  />
                )}
                <span style={{
                  display: 'inline-block', fontSize: '0.7rem', fontWeight: 700,
                  padding: '2px 10px', borderRadius: '999px', marginBottom: '8px',
                  backgroundColor: news.category === 'รับสมัคร' ? '#dcfce7' : news.category === 'ประกาศ' ? '#dbeafe' : news.category === 'กิจกรรม' ? '#fef3c7' : '#f3f4f6',
                  color: news.category === 'รับสมัคร' ? '#166534' : news.category === 'ประกาศ' ? '#1e40af' : news.category === 'กิจกรรม' ? '#92400e' : '#374151',
                }}>{news.category}</span>
                <h3 style={{ marginBottom: '8px', fontSize: '1rem' }}>{news.title}</h3>
                <p style={{ color: '#64748b', fontSize: '0.85rem', lineHeight: 1.6, display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                  {news.content}
                </p>
                <p style={{ color: '#94a3b8', fontSize: '0.75rem', marginTop: '12px' }}>
                  {new Date(news.created_at).toLocaleDateString('th-TH', { year: 'numeric', month: 'long', day: 'numeric' })}
                  {news.author && ` • โดย ${news.author}`}
                </p>
              </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      <section className="how-it-works" style={{ padding: '4rem 5%', borderTop: '1px solid #e2e8f0' }}>
        <h2 className="section-title">กำหนดการสำคัญ</h2>
        <div className="steps-grid" style={{ maxWidth: 1200, margin: '0 auto' }}>
          <div className="step-card" style={{ display: 'flex', flexDirection: 'column', gap: '12px', alignItems: 'flex-start', textAlign: 'left', padding: '2rem' }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', color: '#4f46e5', background: '#e0e7ff', padding: '6px 16px', borderRadius: '999px', fontSize: '0.85rem', fontWeight: 700 }}>
              <CalendarIcon style={{ width: 18, height: 18 }} /> สิงหาคม - ตุลาคม
            </div>
            <h3 style={{ margin: 0, fontSize: '1.25rem', color: '#1e293b' }}>ยื่นคำร้องขอฝึกงาน</h3>
            <p style={{ margin: 0, color: '#64748b', fontSize: '0.95rem' }}>นักศึกษาเริ่มกรอกข้อมูลคำร้องขอฝึกงานผ่านระบบออนไลน์ และตรวจสอบความถูกต้อง</p>
          </div>
          <div className="step-card" style={{ display: 'flex', flexDirection: 'column', gap: '12px', alignItems: 'flex-start', textAlign: 'left', padding: '2rem' }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', color: '#d97706', background: '#fef3c7', padding: '6px 16px', borderRadius: '999px', fontSize: '0.85rem', fontWeight: 700 }}>
              <CalendarIcon style={{ width: 18, height: 18 }} /> พฤศจิกายน
            </div>
            <h3 style={{ margin: 0, fontSize: '1.25rem', color: '#1e293b' }}>ประกาศผล & ปฐมนิเทศ</h3>
            <p style={{ margin: 0, color: '#64748b', fontSize: '0.95rem' }}>ตรวจสอบผลการอนุมัติสถานประกอบการ และเข้าร่วมปฐมนิเทศเตรียมความพร้อม</p>
          </div>
          <div className="step-card" style={{ display: 'flex', flexDirection: 'column', gap: '12px', alignItems: 'flex-start', textAlign: 'left', padding: '2rem' }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', color: '#16a34a', background: '#dcfce7', padding: '6px 16px', borderRadius: '999px', fontSize: '0.85rem', fontWeight: 700 }}>
              <CalendarIcon style={{ width: 18, height: 18 }} /> ธันวาคม - มีนาคม
            </div>
            <h3 style={{ margin: 0, fontSize: '1.25rem', color: '#1e293b' }}>เริ่มปฏิบัติงานจริง</h3>
            <p style={{ margin: 0, color: '#64748b', fontSize: '0.95rem' }}>นักศึกษาออกฝึกประสบการณ์วิชาชีพ ณ สถานประกอบการ พร้อมบันทึกเวลาเข้า-ออกงาน</p>
          </div>
        </div>
      </section>

      <footer className="footer">
        <p>&copy; 2026 ระบบคำร้องฝึกงานวิชาชีพ. All rights reserved.</p>
      </footer>
    </div>
  );
};

export default HomePage;
