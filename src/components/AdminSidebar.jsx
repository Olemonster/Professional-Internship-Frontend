import React from 'react';
import { Link } from 'react-router-dom';
import {
  HomeIcon,
  AcademicCapIcon,
  UsersIcon,
  CalendarDaysIcon,
  UserIcon,
  DocumentTextIcon,
  ChartPieIcon,
  MegaphoneIcon,
  IdentificationIcon,
  ArrowLeftOnRectangleIcon
} from '@heroicons/react/24/outline';

const AdminSidebar = ({ isMenuOpen, setIsMenuOpen, currentPath, handleLogout }) => {
  return (
    <>
      <div className={`sidebar-overlay ${isMenuOpen ? 'open' : ''}`} onClick={() => setIsMenuOpen(false)}></div>
      <aside className={`sidebar ${isMenuOpen ? 'open' : ''}`}>
        <div className="sidebar-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px' }}>
          <h2 style={{ margin: 0 }}>ผู้ดูแลระบบ</h2>
        </div>
        <nav className="sidebar-nav">
          <Link to="/admin-dashboard" className={`nav-item ${currentPath === '/admin-dashboard' ? 'active' : ''}`}>
            <HomeIcon style={{ width: 20, height: 20, flexShrink: 0, strokeWidth: 2 }} />
            <span>หน้าหลัก</span>
          </Link>
          <Link to="/admin-dashboard/students" className={`nav-item ${currentPath === '/admin-dashboard/students' ? 'active' : ''}`}>
            <AcademicCapIcon style={{ width: 20, height: 20, flexShrink: 0, strokeWidth: 2 }} />
            <span>นักศึกษา</span>
          </Link>
          <Link to="/admin-dashboard/users" className={`nav-item ${currentPath === '/admin-dashboard/users' ? 'active' : ''}`}>
            <UsersIcon style={{ width: 20, height: 20, flexShrink: 0, strokeWidth: 2 }} />
            <span>จัดการผู้ใช้</span>
          </Link>
          <Link to="/admin-dashboard/checkins" className={`nav-item ${currentPath === '/admin-dashboard/checkins' ? 'active' : ''}`}>
            <CalendarDaysIcon style={{ width: 20, height: 20, flexShrink: 0, strokeWidth: 2 }} />
            <span>รายงานประจำวัน</span>
          </Link>
          <Link to="/admin-dashboard/attendance-overview" className={`nav-item ${currentPath === '/admin-dashboard/attendance-overview' ? 'active' : ''}`}>
            <UserIcon style={{ width: 20, height: 20, flexShrink: 0, strokeWidth: 2 }} />
            <span>ภาพรวมรายบุคคล</span>
          </Link>
          <Link to="/admin-dashboard/reports" className={`nav-item ${currentPath === '/admin-dashboard/reports' ? 'active' : ''}`}>
            <DocumentTextIcon style={{ width: 20, height: 20, flexShrink: 0, strokeWidth: 2 }} />
            <span>รายงาน</span>
          </Link>
          <Link to="/admin-dashboard/announcements" className={`nav-item ${currentPath === '/admin-dashboard/announcements' ? 'active' : ''}`}>
            <MegaphoneIcon style={{ width: 20, height: 20, flexShrink: 0, strokeWidth: 2 }} />
            <span>ข่าวประชาสัมพันธ์</span>
          </Link>
          <Link to="/admin-dashboard/profile" className={`nav-item ${currentPath === '/admin-dashboard/profile' ? 'active' : ''}`}>
            <IdentificationIcon style={{ width: 20, height: 20, flexShrink: 0, strokeWidth: 2 }} />
            <span>โปรไฟล์</span>
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

export default AdminSidebar;
