import React from 'react';
import { Link } from 'react-router-dom';
import {
  HomeIcon,
  DocumentPlusIcon,
  ClipboardDocumentListIcon,
  CurrencyDollarIcon,
  CalendarDaysIcon,
  UserIcon,
  ArrowLeftOnRectangleIcon
} from '@heroicons/react/24/outline';

const StudentSidebar = ({ isMenuOpen, setIsMenuOpen, currentPath, handleLogout }) => {
  return (
    <>
      <div className={`sidebar-overlay ${isMenuOpen ? 'open' : ''}`} onClick={() => setIsMenuOpen(false)}></div>
      <aside className={`sidebar ${isMenuOpen ? 'open' : ''}`}>
        <div className="sidebar-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px' }}>
          <h2 style={{ margin: 0 }}>นักศึกษา</h2>
        </div>
        <nav className="sidebar-nav">
          <Link to="/dashboard" className={`nav-item ${currentPath === '/dashboard' ? 'active' : ''}`}>
            <HomeIcon style={{ width: 20, height: 20, flexShrink: 0, strokeWidth: 2 }} />
            <span>หน้าหลัก</span>
          </Link>
          <Link to="/dashboard/new-request" className={`nav-item ${currentPath === '/dashboard/new-request' ? 'active' : ''}`}>
            <DocumentPlusIcon style={{ width: 20, height: 20, flexShrink: 0, strokeWidth: 2 }} />
            <span>ยื่นคำร้องใหม่</span>
          </Link>
          <Link to="/dashboard/my-requests" className={`nav-item ${currentPath === '/dashboard/my-requests' ? 'active' : ''}`}>
            <ClipboardDocumentListIcon style={{ width: 20, height: 20, flexShrink: 0, strokeWidth: 2 }} />
            <span>คำร้องของฉัน</span>
          </Link>
          <Link to="/dashboard/payment-proof" className={`nav-item ${currentPath === '/dashboard/payment-proof' ? 'active' : ''}`}>
            <CurrencyDollarIcon style={{ width: 20, height: 20, flexShrink: 0, strokeWidth: 2 }} />
            <span>หลักฐานการชำระออกฝึก</span>
          </Link>
          <Link to="/dashboard/check-in" className={`nav-item ${currentPath === '/dashboard/check-in' ? 'active' : ''}`}>
            <CalendarDaysIcon style={{ width: 20, height: 20, flexShrink: 0, strokeWidth: 2 }} />
            <span>รายงานประจำวัน</span>
          </Link>
          <Link to="/dashboard/profile" className={`nav-item ${currentPath === '/dashboard/profile' ? 'active' : ''}`}>
            <UserIcon style={{ width: 20, height: 20, flexShrink: 0, strokeWidth: 2 }} />
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

export default StudentSidebar;
