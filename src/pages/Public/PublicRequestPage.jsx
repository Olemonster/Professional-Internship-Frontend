import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Box, Paper, Typography, Chip, Divider, Stack, CircularProgress, Button, Dialog, DialogTitle, DialogContent, DialogActions, TextField, Alert } from '@mui/material';
import api from '../../api/axios';
import { DocumentTextIcon } from '@heroicons/react/24/outline';

const PublicRequestPage = () => {
  const { id } = useParams();
  const [request, setRequest] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [updating, setUpdating] = useState(false);
  const [feedback, setFeedback] = useState({ message: '', severity: '' });
  const [rejectDialog, setRejectDialog] = useState({ open: false, reason: '' });
  const [previewOpen, setPreviewOpen] = useState(false);

  useEffect(() => {
    api.get(`/public/requests/${id}`)
      .then((res) => {
        if (res.data.data) {
          setRequest(res.data.data);
        } else {
          setError('ไม่พบข้อมูลคำร้อง');
        }
        setLoading(false);
      })
      .catch(() => {
        setError('ไม่พบข้อมูลคำร้อง หรือลิงก์ไม่ถูกต้อง');
        setLoading(false);
      });
  }, [id]);

  const formatAddress = (address) => {
    if (!address) return '-';
    if (typeof address === 'string') return address;
    const parts = [];
    if (address.house) parts.push(`บ้านเลขที่ ${address.house}`);
    if (address.moo) parts.push(`หมู่ ${address.moo}`);
    if (address.tambon) parts.push(`ตำบล ${address.tambon}`);
    if (address.amphur) parts.push(`อำเภอ ${address.amphur}`);
    if (address.province) parts.push(`จังหวัด ${address.province}`);
    if (address.postal) parts.push(`รหัสไปรษณีย์ ${address.postal}`);
    if (address.detail) parts.push(address.detail);
    return parts.length ? parts.join(' ') : '-';
  };

  const getStatusChip = (status) => {
    const map = {
      'รอสถานประกอบการตอบรับ': { color: 'default' },
      'รออาจารย์ที่ปรึกษาอนุมัติ': { color: 'warning' },
      'รอผู้ดูแลระบบตรวจสอบ': { color: 'info' },
      'รอผู้ดูแลระบบอนุมัติ': { color: 'info' },
      'อนุมัติแล้ว': { color: 'success' },
      'ไม่อนุมัติ (อาจารย์)': { color: 'error' },
      'ไม่อนุมัติ (Admin)': { color: 'error' },
      'ปฏิเสธ': { color: 'error' },
      'ออกฝึกงาน': { color: 'info' },
      'ฝึกงานเสร็จแล้ว': { color: 'secondary' },
    };
    const info = map[status] || { color: 'default' };
    return <Chip label={status} color={info.color} size="small" />;
  };

  if (loading) {
    return (
      <Box sx={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: '#f5f7fa' }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error || !request) {
    return (
      <Box sx={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: '#f5f7fa' }}>
        <Paper elevation={0} sx={{ p: 5, borderRadius: 3, border: '1px solid #e0e0e0', textAlign: 'center' }}>
          <Typography variant="h6" color="error">{error || 'ไม่พบข้อมูล'}</Typography>
        </Paper>
      </Box>
    );
  }

  const canRespond = request.status === 'รอสถานประกอบการตอบรับ';

  const handleAccept = async () => {
    setUpdating(true);
    try {
      await api.patch(`/public/requests/${id}/status`, { status: 'อนุมัติแล้ว' });
      setRequest({ ...request, status: 'อนุมัติแล้ว' });
      setFeedback({ message: 'ตอบรับนักศึกษาเข้าฝึกงานเรียบร้อยแล้ว', severity: 'success' });
    } catch (err) {
      setFeedback({ message: 'เกิดข้อผิดพลาด: ' + (err.response?.data?.message || err.message), severity: 'error' });
    } finally {
      setUpdating(false);
    }
  };

  const handleRejectOpen = () => {
    setRejectDialog({ open: true, reason: '' });
  };

  const handleRejectConfirm = async () => {
    setUpdating(true);
    try {
      await api.patch(`/public/requests/${id}/status`, {
        status: 'ปฏิเสธ',
        company_comment: rejectDialog.reason.trim() || undefined,
      });
      setRequest({ ...request, status: 'ปฏิเสธ' });
      setRejectDialog({ open: false, reason: '' });
      setFeedback({ message: 'ปฏิเสธคำร้องเรียบร้อยแล้ว', severity: 'info' });
    } catch (err) {
      setFeedback({ message: 'เกิดข้อผิดพลาด: ' + (err.response?.data?.message || err.message), severity: 'error' });
    } finally {
      setUpdating(false);
    }
  };

  const details = request.details || {};
  const studentInfo = details.student_info || {};
  const studentAddress = formatAddress(studentInfo.address);
  const companyAddress = formatAddress(details.companyAddress || details.address);
  const dispatchLetter = request.dispatchLetter || details.dispatchLetter;
  const internshipTermLabel = details.internshipTerm === 'term1'
    ? 'เทอม 1 (7–15 ส.ค.)'
    : details.internshipTerm === 'term2'
      ? 'เทอม 2 (3–10 ม.ค.)'
      : '';

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: '#f5f7fa' }}>
      {/* Header */}
      <Box sx={{ bgcolor: '#fff', borderBottom: '1px solid #e0e0e0', px: 3, py: 2.5, textAlign: 'center' }}>
        <Typography variant="h5" sx={{ fontWeight: 800 }}>
          รายละเอียดคำร้องฝึกงาน
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
          เลขที่คำร้อง: {request.id}
        </Typography>
      </Box>

      <Box sx={{ maxWidth: 800, mx: 'auto', py: 4, px: 2 }}>
        <Paper elevation={0} sx={{ p: 3, borderRadius: 3, border: '1px solid #e0e0e0', bgcolor: '#fff' }}>
          <Stack spacing={2.5}>

            {/* Status */}
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Typography variant="h6" sx={{ fontWeight: 700 }}>สถานะคำร้อง</Typography>
              {getStatusChip(request.status)}
            </Box>

            <Divider />

            {/* Student Info */}
            <Box>
              <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 1.5 }}>ข้อมูลนักศึกษา</Typography>
              <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 1.5 }}>
                <InfoItem label="รหัสนักศึกษา" value={request.studentId} />
                <InfoItem label="ชื่อ-นามสกุล" value={request.studentName} />
                <InfoItem label="สาขาวิชา" value={request.department} />
                {studentInfo.lastSemesterGrade && (
                  <InfoItem label="เกรดเฉลี่ยเทอมล่าสุด" value={studentInfo.lastSemesterGrade} />
                )}
                <InfoItem label="อีเมล" value={studentInfo.email || request.studentEmail} />
                <InfoItem label="เบอร์โทรศัพท์" value={studentInfo.phone || request.studentPhone} />
                {studentAddress && studentAddress !== '-' && (
                  <Box sx={{ gridColumn: 'span 2' }}>
                    <InfoItem label="ที่อยู่" value={studentAddress} />
                  </Box>
                )}
              </Box>
            </Box>

            <Divider />

            {/* Company Info */}
            <Box>
              <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 1.5 }}>ข้อมูลสถานประกอบการ</Typography>
              <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 1.5 }}>
                <InfoItem label="ชื่อบริษัท/องค์กร" value={details.companyName || request.company} />
                <InfoItem label="ตำแหน่ง" value={details.position || request.position} />
                {companyAddress && companyAddress !== '-' && (
                  <Box sx={{ gridColumn: 'span 2' }}>
                    <InfoItem label="ที่อยู่บริษัท" value={companyAddress} />
                  </Box>
                )}
              </Box>
            </Box>

            {/* Dispatch Letter */}
            {dispatchLetter?.dataUrl && (
              <>
                <Divider />
                <Box>
                  <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 1.5 }}>หนังสือส่งตัวนักศึกษา</Typography>
                  <Paper
                    variant="outlined"
                    sx={{
                      p: 2,
                      borderRadius: 2,
                      bgcolor: '#f8fafc',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      flexWrap: 'wrap',
                      gap: 1.5,
                    }}
                  >
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, minWidth: 0 }}>
                      <Box
                        sx={{
                          width: 40,
                          height: 40,
                          borderRadius: 1.5,
                          bgcolor: '#e0e7ff',
                          display: 'grid',
                          placeItems: 'center',
                          fontSize: '1.2rem',
                          flexShrink: 0,
                        }}
                      >
                        📄
                      </Box>
                      <Box sx={{ minWidth: 0 }}>
                        <Typography variant="body2" sx={{ fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {dispatchLetter.fileName || 'หนังสือส่งตัว'}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          แนบโดยผู้ดูแลระบบ
                        </Typography>
                      </Box>
                    </Box>
                    <Stack direction="row" spacing={1}>
                      <Button
                        variant="outlined"
                        size="small"
                        onClick={() => setPreviewOpen(true)}
                        sx={{ borderRadius: 1.5, fontWeight: 600 }}
                      >
                        ดูไฟล์
                      </Button>
                      <Button
                        variant="contained"
                        size="small"
                        component="a"
                        href={dispatchLetter.dataUrl}
                        download={`หนังสือส่งตัวนักศึกษา_${request.studentId}${dispatchLetter.fileName && dispatchLetter.fileName.includes('.') ? '.' + dispatchLetter.fileName.split('.').pop() : ''}`}
                        sx={{ borderRadius: 1.5, fontWeight: 600, bgcolor: '#111', '&:hover': { bgcolor: '#000' } }}
                      >
                        ดาวน์โหลด
                      </Button>
                    </Stack>
                  </Paper>
                </Box>
              </>
            )}

            {/* Internship Period */}
            <Box>
              <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 1.5 }}>ระยะเวลาการฝึกงาน</Typography>
              {internshipTermLabel ? (
                <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr' }, gap: 1.5 }}>
                  <InfoItem label="ช่วงฝึกงาน" value={internshipTermLabel} />
                </Box>
              ) : (
                <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 1.5 }}>
                  <InfoItem label="วันเริ่มฝึกงาน" value={details.startDate ? new Date(details.startDate).toLocaleDateString('th-TH') : '-'} />
                  <InfoItem label="วันสิ้นสุด" value={details.endDate ? new Date(details.endDate).toLocaleDateString('th-TH') : '-'} />
                </Box>
              )}
            </Box>

            <Divider />

            {/* Supervisor Info */}
            <Box>
              <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 1.5 }}>ข้อมูลพี่เลี้ยง/ผู้ดูแล</Typography>
              <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 1.5 }}>
                <InfoItem label="ชื่อพี่เลี้ยง/ผู้ดูแล" value={details.contactPerson} />
                <InfoItem label="เบอร์โทรศัพท์" value={details.contactPhone} />
                <InfoItem label="อีเมล" value={details.contactEmail} />
              </Box>
            </Box>

            <Divider />

            {/* Job Description */}
            <Box>
              <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 1.5 }}>รายละเอียดงาน</Typography>
              <InfoItem label="ลักษณะงานที่ทำ" value={details.description} />
              <Box sx={{ mt: 1 }}>
                <InfoItem label="ทักษะที่ต้องการ" value={details.skills} />
              </Box>
            </Box>

            {/* Submission Date */}
            <Divider />
            <Box>
              <InfoItem label="วันที่ยื่นคำร้อง" value={request.submittedDate ? new Date(request.submittedDate).toLocaleDateString('th-TH') : '-'} />
            </Box>

            {/* Feedback */}
            {feedback.message && (
              <Alert severity={feedback.severity} sx={{ borderRadius: 2 }}>
                {feedback.message}
              </Alert>
            )}

            {/* Accept / Reject Buttons */}
            {canRespond && (
              <>
                <Divider />
                <Box sx={{ textAlign: 'center' }}>
                  <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 2 }}>
                    ตอบรับนักศึกษาเข้าฝึกงาน
                  </Typography>
                  <Stack direction="row" spacing={2} justifyContent="center">
                    <Button
                      variant="contained"
                      color="error"
                      size="large"
                      disabled={updating}
                      onClick={handleRejectOpen}
                      sx={{ minWidth: 140, fontWeight: 700, borderRadius: 2 }}
                    >
                      ปฏิเสธ
                    </Button>
                    <Button
                      variant="contained"
                      color="success"
                      size="large"
                      disabled={updating}
                      onClick={handleAccept}
                      sx={{ minWidth: 140, fontWeight: 700, borderRadius: 2 }}
                    >
                      ตอบรับ
                    </Button>
                  </Stack>
                </Box>
              </>
            )}

            {/* Already responded */}
            {(request.status === 'อนุมัติแล้ว' || request.status === 'ปฏิเสธ') && !feedback.message && (
              <Alert severity={request.status === 'อนุมัติแล้ว' ? 'success' : 'error'} sx={{ borderRadius: 2 }}>
                {request.status === 'อนุมัติแล้ว'
                  ? 'สถานประกอบการตอบรับนักศึกษาแล้ว'
                  : 'สถานประกอบการปฏิเสธคำร้องนี้แล้ว'}
              </Alert>
            )}

          </Stack>
        </Paper>
      </Box>

      {/* Reject Reason Dialog */}
      <Dialog open={rejectDialog.open} onClose={() => setRejectDialog({ open: false, reason: '' })} fullWidth maxWidth="sm">
        <DialogTitle sx={{ fontWeight: 700 }}>ปฏิเสธคำร้อง</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            กรุณาระบุเหตุผลในการปฏิเสธ (ไม่บังคับ)
          </Typography>
          <TextField
            fullWidth
            multiline
            rows={3}
            label="เหตุผล"
            value={rejectDialog.reason}
            onChange={(e) => setRejectDialog((prev) => ({ ...prev, reason: e.target.value }))}
            placeholder="ระบุเหตุผลที่ปฏิเสธ..."
          />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setRejectDialog({ open: false, reason: '' })} disabled={updating}>
            ยกเลิก
          </Button>
          <Button variant="contained" color="error" onClick={handleRejectConfirm} disabled={updating}>
            ยืนยันปฏิเสธ
          </Button>
        </DialogActions>
      </Dialog>

      {/* Dispatch Letter Preview Dialog */}
      {dispatchLetter?.dataUrl && (
        <Dialog open={previewOpen} onClose={() => setPreviewOpen(false)} fullWidth maxWidth="md">
          <DialogTitle sx={{ fontWeight: 700, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            หนังสือส่งตัวนักศึกษา
            <Button
              variant="contained"
              size="small"
              component="a"
              href={dispatchLetter.dataUrl}
              download={`หนังสือส่งตัวนักศึกษา_${request.studentId}${dispatchLetter.fileName && dispatchLetter.fileName.includes('.') ? '.' + dispatchLetter.fileName.split('.').pop() : ''}`}
              sx={{ borderRadius: 1.5, fontWeight: 600, bgcolor: '#111', '&:hover': { bgcolor: '#000' } }}
            >
              ดาวน์โหลด
            </Button>
          </DialogTitle>
          <DialogContent sx={{ p: 0, display: 'flex', justifyContent: 'center', bgcolor: '#f5f5f5', minHeight: 500 }}>
            {dispatchLetter.dataUrl.startsWith('data:application/pdf') ? (
              <iframe
                src={dispatchLetter.dataUrl}
                title="หนังสือส่งตัว"
                style={{ width: '100%', height: '70vh', border: 'none' }}
              />
            ) : dispatchLetter.dataUrl.startsWith('data:image/') ? (
              <Box sx={{ p: 2, textAlign: 'center' }}>
                <img
                  src={dispatchLetter.dataUrl}
                  alt="หนังสือส่งตัว"
                  style={{ maxWidth: '100%', maxHeight: '70vh', borderRadius: 8 }}
                />
              </Box>
            ) : (
              <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', p: 4 }}>
                <Typography variant="body1" sx={{ mb: 2 }}>ไม่สามารถแสดงตัวอย่างไฟล์นี้ได้</Typography>
                <Button
                  variant="outlined"
                  component="a"
                  href={dispatchLetter.dataUrl}
                  download={`หนังสือส่งตัวนักศึกษา_${request.studentId}${dispatchLetter.fileName && dispatchLetter.fileName.includes('.') ? '.' + dispatchLetter.fileName.split('.').pop() : ''}`}
                  sx={{ borderRadius: 1.5 }}
                >
                  ดาวน์โหลดไฟล์แทน
                </Button>
              </Box>
            )}
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2 }}>
            <Button onClick={() => setPreviewOpen(false)}>ปิด</Button>
          </DialogActions>
        </Dialog>
      )}
    </Box>
  );
};

const InfoItem = ({ label, value }) => {
  const normalizeValue = (input) => {
    if (input === null || input === undefined || input === '') return '-';
    if (typeof input === 'string' || typeof input === 'number') {
      const text = String(input).trim();
      return text.length ? text : '-';
    }
    if (typeof input === 'object') {
      // Try to treat it like an address object first
      if ('house' in input || 'moo' in input || 'tambon' in input || 'amphur' in input || 'province' in input || 'postal' in input || 'detail' in input) {
        return formatAddress(input);
      }
      if (Array.isArray(input)) {
        return input.filter(Boolean).join(', ') || '-';
      }
      // Fallback: join object values that can be stringified
      const parts = Object.values(input)
        .map((item) => (typeof item === 'string' || typeof item === 'number' ? String(item).trim() : ''))
        .filter(Boolean);
      return parts.length ? parts.join(' ') : '-';
    }
    return String(input);
  };

  return (
    <Box>
      <Typography variant="caption" color="text.secondary">{label}</Typography>
      <Typography variant="body2" sx={{ fontWeight: 600, whiteSpace: 'pre-wrap' }}>{normalizeValue(value)}</Typography>
    </Box>
  );
};

export default PublicRequestPage;
