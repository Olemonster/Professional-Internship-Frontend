import { useState, useMemo } from 'react';
import { Box, Typography, Button, IconButton, Chip, Tooltip, Paper } from '@mui/material';
import { ChevronLeftIcon, ChevronRightIcon, CalendarIcon } from '@heroicons/react/24/outline';

const AttendanceCalendar = ({ entries = [] }) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState(null);

  // Map entries by date YYYY-MM-DD
  const entriesMap = useMemo(() => {
    const map = {};
    entries.forEach((e) => {
      if (!e.date) return;
      const cleanDate = String(e.date).split('T')[0];
      map[cleanDate] = e;
    });
    return map;
  }, [entries]);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth(); // 0-indexed

  const monthNamesThai = [
    'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
    'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'
  ];

  const handlePrevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
    setSelectedDay(null);
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
    setSelectedDay(null);
  };

  // Generate calendar days
  const calendarDays = useMemo(() => {
    const firstDayOfMonth = new Date(year, month, 1);
    const lastDayOfMonth = new Date(year, month + 1, 0);
    
    const startingDayOfWeek = firstDayOfMonth.getDay(); // 0 = Sun
    const totalDays = lastDayOfMonth.getDate();

    const days = [];

    // Empty padding cells for previous month
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push({ type: 'empty', key: `empty-prev-${i}` });
    }

    // Days of current month
    const todayStr = new Date().toISOString().slice(0, 10);

    for (let day = 1; day <= totalDays; day++) {
      const monthStr = String(month + 1).padStart(2, '0');
      const dayStr = String(day).padStart(2, '0');
      const dateKey = `${year}-${monthStr}-${dayStr}`;

      const entry = entriesMap[dateKey];
      const dateObj = new Date(year, month, day);
      const isWeekend = dateObj.getDay() === 0 || dateObj.getDay() === 6;
      const isPastOrToday = dateKey <= todayStr;
      const isToday = dateKey === todayStr;

      let status = 'none'; // future / empty
      if (entry) {
        status = entry.status; // present, late, absent
      } else if (isPastOrToday && !isWeekend) {
        status = 'un-checked'; // missed check-in
      }

      days.push({
        type: 'day',
        dayNumber: day,
        dateKey,
        entry,
        status,
        isToday,
        isWeekend,
        key: dateKey,
      });
    }

    // Pad remaining empty cells up to 42 cells (6 full rows of 7 days) so height never shifts
    const totalCells = 42;
    const remainingCells = totalCells - days.length;
    for (let i = 0; i < remainingCells; i++) {
      days.push({ type: 'empty', key: `empty-next-${i}` });
    }

    return days;
  }, [year, month, entriesMap]);

  // Selected entry info
  const selectedEntryInfo = useMemo(() => {
    if (!selectedDay) return null;
    return entriesMap[selectedDay.dateKey] || null;
  }, [selectedDay, entriesMap]);

  const formatDateThai = (dateKey) => {
    if (!dateKey) return '';
    const [y, m, d] = dateKey.split('-');
    const thaiYear = parseInt(y) > 2500 ? y : parseInt(y) + 543;
    return `${parseInt(d)} ${monthNamesThai[parseInt(m) - 1]} ${thaiYear}`;
  };

  return (
    <Box className="attendance-calendar-container" sx={{ width: '100%', pt: 1 }}>
      {/* Calendar Header Bar */}
      <Paper
        elevation={0}
        sx={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 1,
          p: { xs: 1.25, sm: 1.75 },
          mb: 2,
          borderRadius: 3,
          bgcolor: '#f8fafc',
          border: '1px solid #e2e8f0',
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Box sx={{ p: 0.75, borderRadius: 2, bgcolor: '#eff6ff', color: '#2563eb', display: 'flex' }}>
            <CalendarIcon style={{ width: 18, height: 18 }} />
          </Box>
          <Typography variant="h6" sx={{ fontWeight: 800, fontSize: { xs: '0.95rem', sm: '1.15rem' }, color: '#0f172a' }}>
            {monthNamesThai[month]} {year + 543}
          </Typography>
        </Box>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          <IconButton
            size="small"
            onClick={handlePrevMonth}
            sx={{ border: '1px solid #cbd5e1', bgcolor: '#fff', '&:hover': { bgcolor: '#f1f5f9' }, p: 0.5 }}
          >
            <ChevronLeftIcon style={{ width: 16, height: 16, color: '#334155' }} />
          </IconButton>

          <Button 
            size="small" 
            variant="outlined"
            onClick={() => setCurrentDate(new Date())}
            sx={{
              fontSize: '0.75rem',
              fontWeight: 700,
              py: 0.25,
              px: 1.25,
              borderColor: '#cbd5e1',
              color: '#334155',
              bgcolor: '#fff',
              minWidth: 0,
              '&:hover': { borderColor: '#94a3b8', bgcolor: '#f8fafc' }
            }}
          >
            วันนี้
          </Button>

          <IconButton
            size="small"
            onClick={handleNextMonth}
            sx={{ border: '1px solid #cbd5e1', bgcolor: '#fff', '&:hover': { bgcolor: '#f1f5f9' }, p: 0.5 }}
          >
            <ChevronRightIcon style={{ width: 16, height: 16, color: '#334155' }} />
          </IconButton>
        </Box>
      </Paper>

      {/* Legend Bar */}
      <Box 
        sx={{ 
          display: 'flex', 
          flexWrap: 'wrap', 
          alignItems: 'center',
          gap: { xs: 1, sm: 2 }, 
          mb: 2, 
          px: 0.5,
          fontSize: { xs: '0.75rem', sm: '0.825rem' },
          color: '#475569',
          fontWeight: 600
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: '#10b981' }} />
          <span>มา</span>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: '#f59e0b' }} />
          <span>สาย</span>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: '#ef4444' }} />
          <span>ขาด</span>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: '#94a3b8' }} />
          <span>ไม่ได้เช็คชื่อ</span>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, width: { xs: '100%', sm: 'auto' }, ml: { sm: 'auto' } }}>
          <Box sx={{ width: 10, height: 10, borderRadius: '3px', border: '1.5px dashed #cbd5e1' }} />
          <span>เสาร์-อาทิตย์ / อนาคต</span>
        </Box>
      </Box>

      {/* Days of Week Header */}
      <Box 
        sx={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(7, 1fr)', 
          gap: { xs: 0.5, sm: 1.25 }, 
          textAlign: 'center',
          fontWeight: 800,
          fontSize: { xs: '0.75rem', sm: '0.85rem' },
          color: '#64748b',
          mb: 1
        }}
      >
        <Box sx={{ color: '#ef4444' }}>อา.</Box>
        <Box>จ.</Box>
        <Box>อ.</Box>
        <Box>พ.</Box>
        <Box>พฤ.</Box>
        <Box>ศ.</Box>
        <Box sx={{ color: '#ef4444' }}>ส.</Box>
      </Box>

      {/* Calendar Grid */}
      <Box 
        sx={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(7, 1fr)', 
          gap: { xs: 0.5, sm: 1.25 }
        }}
      >
        {calendarDays.map((item) => {
          if (item.type === 'empty') {
            return (
              <Box 
                key={item.key} 
                sx={{ 
                  height: { xs: 48, sm: 68 }, 
                  bgcolor: '#f8fafc', 
                  borderRadius: { xs: 1.5, sm: 2.5 }, 
                  border: '1px border-dashed #f1f5f9',
                  opacity: 0.3 
                }} 
              />
            );
          }

          let bgColor = '#ffffff';
          let textColor = '#1e293b';
          let borderColor = '#e2e8f0';
          let chipBg = '#f1f5f9';
          let chipColor = '#64748b';
          let badgeText = '';

          if (item.status === 'present') {
            bgColor = '#ecfdf5';
            textColor = '#065f46';
            borderColor = '#a7f3d0';
            chipBg = '#dcfce7';
            chipColor = '#15803d';
            badgeText = 'มา';
          } else if (item.status === 'late') {
            bgColor = '#fffbeb';
            textColor = '#92400e';
            borderColor = '#fde68a';
            chipBg = '#fef3c7';
            chipColor = '#b45309';
            badgeText = 'สาย';
          } else if (item.status === 'absent') {
            bgColor = '#fef2f2';
            textColor = '#991b1b';
            borderColor = '#fecaca';
            chipBg = '#fee2e2';
            chipColor = '#b91c1c';
            badgeText = 'ขาด';
          } else if (item.status === 'un-checked') {
            bgColor = '#f8fafc';
            textColor = '#64748b';
            borderColor = '#cbd5e1';
            chipBg = '#e2e8f0';
            chipColor = '#475569';
            badgeText = 'ไม่ได้เช็ค';
          } else if (item.isWeekend) {
            bgColor = '#fafafa';
            textColor = '#94a3b8';
            borderColor = '#f1f5f9';
          }

          const isSelected = selectedDay?.dateKey === item.dateKey;

          return (
            <Tooltip 
              key={item.key} 
              title={
                item.entry 
                  ? `${item.entry.work_experience || item.entry.workExperience || item.entry.note || badgeText}`
                  : (item.status === 'un-checked' ? 'ไม่ได้เช็คชื่อ' : '')
              } 
              arrow
            >
              <Paper
                elevation={isSelected ? 3 : 0}
                onClick={() => setSelectedDay(item)}
                sx={{
                  height: { xs: 48, sm: 68 },
                  p: { xs: 0.5, sm: 0.75 },
                  borderRadius: { xs: 1.5, sm: 2.5 },
                  bgcolor: bgColor,
                  color: textColor,
                  border: `2px solid ${isSelected ? '#2563eb' : (item.isToday ? '#2563eb' : borderColor)}`,
                  cursor: 'pointer',
                  display: 'flex',
                  flexDirection: 'column',
                  justify: 'space-between',
                  alignItems: 'center',
                  transition: 'all 0.15s ease-in-out',
                  position: 'relative',
                  overflow: 'hidden',
                  '&:hover': {
                    transform: 'translateY(-2px)',
                    boxShadow: '0 4px 14px rgba(0,0,0,0.07)'
                  }
                }}
              >
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                  <Typography variant="body2" sx={{ fontWeight: item.isToday ? 900 : 700, fontSize: { xs: '0.775rem', sm: '0.9rem' } }}>
                    {item.dayNumber}
                  </Typography>
                  {item.isToday && (
                    <Box 
                      sx={{ 
                        fontSize: { xs: '0.55rem', sm: '0.65rem' }, 
                        fontWeight: 800, 
                        bgcolor: '#2563eb', 
                        color: '#fff', 
                        px: { xs: 0.4, sm: 0.75 }, 
                        py: 0.1, 
                        borderRadius: 1,
                        lineHeight: 1
                      }}
                    >
                      วันนี้
                    </Box>
                  )}
                </Box>

                {badgeText && (
                  <Box
                    sx={{
                      fontSize: { xs: '0.575rem', sm: '0.7rem' },
                      fontWeight: 800,
                      textAlign: 'center',
                      py: 0.15,
                      px: 0.25,
                      borderRadius: 1.25,
                      bgcolor: chipBg,
                      color: chipColor,
                      lineHeight: 1.1,
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      width: '100%'
                    }}
                  >
                    {badgeText}
                  </Box>
                )}
              </Paper>
            </Tooltip>
          );
        })}
      </Box>

      {/* Selected Day Detail Box */}
      {selectedDay && (
        <Paper 
          elevation={0} 
          sx={{ 
            mt: 2.5, 
            p: 2, 
            borderRadius: 3, 
            bgcolor: '#f8fafc',
            border: '1px solid #e2e8f0' 
          }}
        >
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.25 }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 800, color: '#0f172a', fontSize: '0.95rem' }}>
              รายละเอียดวันที่ {formatDateThai(selectedDay.dateKey)}
            </Typography>
            {selectedDay.status === 'present' && <Chip label="มา" color="success" size="small" sx={{ fontWeight: 700 }} />}
            {selectedDay.status === 'late' && <Chip label="สาย" color="warning" size="small" sx={{ fontWeight: 700 }} />}
            {selectedDay.status === 'absent' && <Chip label="ขาด" color="error" size="small" sx={{ fontWeight: 700 }} />}
            {selectedDay.status === 'un-checked' && <Chip label="ไม่ได้เช็คชื่อ" sx={{ bgcolor: '#94a3b8', color: '#fff', fontWeight: 700 }} size="small" />}
          </Box>

          {selectedEntryInfo ? (
            <Box sx={{ fontSize: '0.875rem', color: '#334155', display: 'grid', gap: 0.75 }}>
              <div>
                <strong>ประสบการณ์ / กิจกรรมที่ทำ:</strong>{' '}
                {selectedEntryInfo.work_experience || selectedEntryInfo.workExperience || '-'}
              </div>
              <div>
                <strong>หมายเหตุเพิ่มเติม:</strong> {selectedEntryInfo.note || '-'}
              </div>
              {(selectedEntryInfo.supervisor_signature || selectedEntryInfo.supervisorSignature) && (
                <Box sx={{ mt: 0.75, p: 1.25, borderRadius: 2, bgcolor: '#ffffff', border: '1px solid #cbd5e1', display: 'inline-block', maxWidth: 220 }}>
                  <Typography variant="caption" sx={{ display: 'block', fontWeight: 700, color: '#64748b', mb: 0.5 }}>
                    ✍️ ลายเซ็นรับรองโดยพี่เลี้ยง / ผู้ดูแล:
                  </Typography>
                  <img
                    src={selectedEntryInfo.supervisor_signature || selectedEntryInfo.supervisorSignature}
                    alt="Supervisor Signature"
                    style={{ maxHeight: 50, maxWidth: '100%', objectFit: 'contain' }}
                  />
                </Box>
              )}
              {selectedEntryInfo.createdAt && (
                <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '4px' }}>
                  เวลาเช็คชื่อ: {new Date(selectedEntryInfo.createdAt).toLocaleString('th-TH')}
                </div>
              )}
            </Box>
          ) : (
            <Typography variant="body2" color="text.secondary">
              {selectedDay.status === 'un-checked' ? 'ไม่มีบันทึกการเช็คชื่อในวันนี้ (ไม่ได้เข้าเช็คชื่อ)' : 'ไม่มีข้อมูลการเช็คชื่อ'}
            </Typography>
          )}
        </Paper>
      )}
    </Box>
  );
};

export default AttendanceCalendar;
