import React, { useEffect, useState, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
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
import sskruBg from '../../assets/SSKRU_BG.png';
import { PhoneIcon, EnvelopeIcon, MapPinIcon, CalendarIcon, ChevronLeftIcon, ChevronRightIcon } from '@heroicons/react/24/outline';

const HomePage = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [menuAnchorEl, setMenuAnchorEl] = useState(null);
  const [announcements, setAnnouncements] = useState([]);
  const carouselRef = useRef(null);
  const [isCarouselHovered, setIsCarouselHovered] = useState(false);

  const scrollCarousel = (direction) => {
    if (carouselRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = carouselRef.current;
      const cardNode = carouselRef.current.querySelector('.news-card');
      const scrollAmount = cardNode ? cardNode.offsetWidth + 24 : 344;
      
      if (direction === 'left') {
        if (scrollLeft <= 10) {
          carouselRef.current.scrollTo({ left: scrollWidth, behavior: 'smooth' });
        } else {
          carouselRef.current.scrollBy({ left: -scrollAmount, behavior: 'smooth' });
        }
      } else {
        if (scrollLeft + clientWidth >= scrollWidth - 10) {
          carouselRef.current.scrollTo({ left: 0, behavior: 'smooth' });
        } else {
          carouselRef.current.scrollBy({ left: scrollAmount, behavior: 'smooth' });
        }
      }
    }
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
    // Fetch announcements
    api.get('/public/announcements')
      .then(res => setAnnouncements(res.data.data || []))
      .catch(() => setAnnouncements([]));
  }, []);

  // Autoplay Carousel Effect
  useEffect(() => {
    let interval;
    if (!isCarouselHovered && announcements.length > 0) {
      interval = setInterval(() => {
        scrollCarousel('right');
      }, 3000); // Scroll every 3 seconds
    }
    return () => clearInterval(interval);
  }, [isCarouselHovered, announcements]);

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

      <main className="hero-section" style={{ padding: 0, position: 'relative' }}>
        <img src={sskruBg} alt="SSKRU Background" style={{ width: '100%', height: '450px', objectFit: 'cover', objectPosition: 'center 20%', display: 'block' }} />
        <div className="hero-content" style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div className="hero-buttons">
            {/* Buttons removed */ }
          </div>
        </div>
      </main>

      {/* Announcements Section */}
      {announcements.length > 0 && (
        <section className="features-section" style={{ background: '#fcfcfc', padding: '4rem 5%' }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '2rem', maxWidth: '100%', margin: '0 auto 2rem auto' }}>
            <h2 className="section-title" style={{ margin: 0, textAlign: 'left', fontSize: '1.8rem' }}>ข่าวสารและประกาศ</h2>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <Link to="/news" style={{ color: '#111', fontWeight: 600, textDecoration: 'none', fontSize: '0.95rem' }}>ดูข่าวทั้งหมด</Link>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button onClick={() => scrollCarousel('left')} style={{ width: 40, height: 40, borderRadius: 4, border: '1px solid #eaeaea', background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                  <ChevronLeftIcon style={{ width: 20, height: 20, color: '#666' }} />
                </button>
                <button onClick={() => scrollCarousel('right')} style={{ width: 40, height: 40, borderRadius: 4, border: '1px solid #eaeaea', background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                  <ChevronRightIcon style={{ width: 20, height: 20, color: '#666' }} />
                </button>
              </div>
            </div>
          </div>
          
          <div 
            className="news-carousel-container" 
            ref={carouselRef} 
            onMouseEnter={() => setIsCarouselHovered(true)}
            onMouseLeave={() => setIsCarouselHovered(false)}
            style={{ maxWidth: '100%', margin: '0 auto', display: 'flex', overflowX: 'auto', gap: '24px', scrollBehavior: 'smooth', scrollSnapType: 'x mandatory', paddingBottom: '1rem', msOverflowStyle: 'none', scrollbarWidth: 'none' }}
          >
            {announcements.slice(0, 10).map((news) => (
              <div 
                key={news.id} 
                className="news-card" 
                onClick={() => navigate(`/news/${news.id}`)}
                style={{ cursor: 'pointer', flex: '0 0 auto', width: 'calc((100% - 48px) / 3)', minWidth: '280px', scrollSnapAlign: 'start', background: '#fff', border: '1px solid #f0f0f0', borderRadius: '0', display: 'flex', flexDirection: 'column', transition: 'all 0.2s ease-in-out', position: 'relative' }}
                onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-6px)'; e.currentTarget.style.boxShadow = '0 12px 24px rgba(0,0,0,0.1)'; }}
                onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = 'none'; }}
              >
                {news.is_pinned === 1 && (
                  <span style={{
                    position: 'absolute', top: 12, right: 12,
                    background: '#fbbf24', color: '#78350f', fontSize: '0.7rem',
                    fontWeight: 700, padding: '2px 8px', borderRadius: '4px',
                    display: 'flex', alignItems: 'center', gap: '4px', zIndex: 1
                  }}><MapPinIcon style={{ width: 12, height: 12 }} /> ปักหมุด</span>
                )}
                {news.coverImage ? (
                  <img src={news.coverImage} alt={news.title} style={{ width: '100%', height: 'auto', aspectRatio: '3/2', objectFit: 'cover', borderBottom: '3px solid #f97316' }} />
                ) : (
                  <div style={{ width: '100%', height: 'auto', aspectRatio: '3/2', background: '#f3f4f6', borderBottom: '3px solid #f97316', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <span style={{ color: '#9ca3af' }}>ไม่มีรูปภาพ</span>
                  </div>
                )}
                
                <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', flex: 1 }}>
                  <p style={{ fontSize: '0.8rem', color: '#666', marginBottom: '0.75rem' }}>
                    {news.author || 'admin'} &mdash; {new Date(news.created_at).toLocaleDateString('th-TH', { year: 'numeric', month: 'long', day: 'numeric' })}
                  </p>
                  <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#111', marginBottom: '0.75rem', lineHeight: 1.4, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                    {news.title}
                  </h3>
                  <p style={{ fontSize: '0.9rem', color: '#666', lineHeight: 1.6, marginBottom: '1.5rem', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', flex: 1 }}>
                    {news.content}
                  </p>
                  
                  <Link to={`/news/${news.id}`} onClick={(e) => e.stopPropagation()} style={{ fontSize: '0.85rem', fontWeight: 700, color: '#111', textDecoration: 'none', display: 'inline-block', marginTop: 'auto' }}>
                    Read More
                  </Link>
                </div>
              </div>
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
