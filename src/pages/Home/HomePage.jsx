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

const HomePage = () => {
  const [user, setUser] = useState(null);
  const [menuAnchorEl, setMenuAnchorEl] = useState(null);
  const [companyCatalog, setCompanyCatalog] = useState([]);

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
      <AppBar position="static" color="transparent" elevation={0} sx={{ borderBottom: '1px solid #e5e7eb', bgcolor: '#ffffff' }}>
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
                <Typography sx={{ fontWeight: 800, fontSize: { xs: '1rem', sm: '1.125rem', md: '1.25rem' }, letterSpacing: '0.2px' }}>
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
              <Button component={Link} to="/login" variant="text" sx={{ color: '#111111', fontWeight: 600, minWidth: 'auto', px: 1 }}>
                เข้าสู่ระบบ
              </Button>
            ) : (
              <>
                <Button
                  component={Link}
                  to={getDashboardPath(user.role)}
                  variant="text"
                  sx={{
                    color: '#111111',
                    fontWeight: 700,
                    minWidth: 'auto',
                    px: { xs: 0.5, sm: 1 },
                  }}
                >
                  Dashboard
                </Button>

                <IconButton onClick={handleOpenMenu} size="small" sx={{ p: 0.25 }}>
                  <Avatar sx={{ width: 38, height: 38, bgcolor: '#111111', fontSize: '1rem', fontWeight: 700 }}>
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

      <main className="hero-section" style={{
        backgroundImage: `url(${sskruBg})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center top',
      }}>
        <div className="hero-content">
          <div className="hero-buttons">
            {/* Buttons removed */ }
          </div>
        </div>
      </main>

      <section className="features-section">
        <h2 className="section-title">สถานประกอบการแนะนำ</h2>
        <div className="features-grid">
          {companyCatalog.map((company) => (
            <div className="feature-card" key={`${company.name}-${company.source}`}>
              {company.imageUrl && (
                <Box
                  component="img"
                  src={company.imageUrl}
                  alt={company.name}
                  sx={{ width: '100%', height: 140, objectFit: 'cover', borderRadius: 1, mb: 2 }}
                />
              )}
              <h3>{company.name}</h3>
              <p>{company.businessType}</p>
              <p>พื้นที่: {typeof company.address === 'object' && company.address !== null ? formatAddress(company.address) : (company.address || '-')}</p>
              <p className="catalog-source">{company.source}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="how-it-works">
        <h2 className="section-title">ขั้นตอนการใช้งาน</h2>
        <div className="steps-grid">
          <div className="step-card">
            <div className="step-number">1</div>
            <h3>ยื่นคำร้อง</h3>
            <p>กรอกแบบฟอร์มคำร้องขอฝึกงาน</p>
          </div>
          <div className="step-card">
            <div className="step-number">2</div>
            <h3>รอการอนุมัติ</h3>
            <p>รอผู้ดูแลระบบตรวจสอบ</p>
          </div>
          <div className="step-card">
            <div className="step-number">3</div>
            <h3>เริ่มฝึกงาน</h3>
            <p>เริ่มฝึกงานตามที่ได้รับอนุมัติ</p>
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
