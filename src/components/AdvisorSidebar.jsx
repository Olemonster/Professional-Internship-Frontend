import React from 'react';
import { Link } from 'react-router-dom';
import {
  HomeIcon,
  UsersIcon,
  CalendarDaysIcon,
  ChartPieIcon,
  ArrowLeftOnRectangleIcon
} from '@heroicons/react/24/outline';

const AdvisorSidebar = ({ isMenuOpen, setIsMenuOpen, currentPath, handleLogout }) => {
  return (
    <>
      <div className={`sidebar-overlay ${isMenuOpen ? 'open' : ''}`} onClick={() => setIsMenuOpen(false)}></div>
      <aside className={`sidebar ${isMenuOpen ? 'open' : ''}`}>
        <div className="sidebar-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px' }}>
          <h2 style={{ margin: 0 }}>อาจารย์ที่ปรึกษา</h2>
        </div>
        <nav className="sidebar-nav">
          <Link to="/advisor-dashboard" className={`nav-item ${currentPath === '/advisor-dashboard' ? 'active' : ''}`}>
            <HomeIcon style={{ width: 20, height: 20, flexShrink: 0, strokeWidth: 2 }} />
            <span>หน้าหลัก</span>
          </Link>
          <Link to="/advisor-dashboard/students" className={`nav-item ${currentPath === '/advisor-dashboard/students' ? 'active' : ''}`}>
            <UsersIcon style={{ width: 20, height: 20, flexShrink: 0, strokeWidth: 2 }} />
            <span>รายชื่อนักศึกษาฝึกงาน</span>
          </Link>
          <Link to="/advisor-dashboard/supervision" className={`nav-item ${currentPath === '/advisor-dashboard/supervision' ? 'active' : ''}`}>
            <CalendarDaysIcon style={{ width: 20, height: 20, flexShrink: 0, strokeWidth: 2 }} />
            <span>ตารางนิเทศงาน</span>
          </Link>
          <Link to="/advisor-dashboard/progress" className={`nav-item ${currentPath === '/advisor-dashboard/progress' ? 'active' : ''}`}>
            <ChartPieIcon style={{ width: 20, height: 20, flexShrink: 0, strokeWidth: 2 }} />
            <span>เช็ค Progress</span>
          </Link>
        </nav>
        <div className="sidebar-footer">
          <button onClick={handleLogout} className="logout-btn" style={{ display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'center' }}>
            <ArrowLeftOnRectangleIcon style={{ width: 20, height: 20, flexShrink: 0, strokeWidth: 2 }} />
            <span>ออกจากระบบ</span>
          </button>
        </div>
      </aside>
    </>
  );
};

export default AdvisorSidebar;
