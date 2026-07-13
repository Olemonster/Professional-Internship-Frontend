import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../../api/axios';
import * as am5 from '@amcharts/amcharts5';
import * as am5xy from '@amcharts/amcharts5/xy';
import * as am5percent from '@amcharts/amcharts5/percent';
import am5themes_Animated from '@amcharts/amcharts5/themes/Animated';
import {
  Box,
  Button,
  Card,
  CardContent,
  Grid,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material';
import './AdminDashboardPage.css';

const AdminEvaluationAnalyticsPage = () => {
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const deptChartRef = useRef(null);
  const companyPieRef = useRef(null);

  useEffect(() => {
    const userStr = localStorage.getItem('user');
    if (!userStr) {
      navigate('/login');
      return;
    }
    const user = JSON.parse(userStr);
    if (user.role !== 'admin') {
      navigate('/dashboard');
      return;
    }

    api.get('/evaluations/analytics').then(res => {
      if (res.data.success) {
        setStats(res.data.data);
      }
    }).catch(err => console.error('Failed to load analytics:', err));
  }, [navigate]);

  useLayoutEffect(() => {
    if (!stats || !stats.departments || stats.departments.length === 0) return;

    let previousRoot = am5.registry.rootElements.find((r) => r.dom === deptChartRef.current);
    if (previousRoot) previousRoot.dispose();
    let root = am5.Root.new(deptChartRef.current);
    root.setThemes([am5themes_Animated.new(root)]);

    const chart = root.container.children.push(
      am5xy.XYChart.new(root, {
        panX: false,
        panY: false,
        wheelX: "none",
        wheelY: "none",
        layout: root.verticalLayout
      })
    );

    const xRenderer = am5xy.AxisRendererX.new(root, { cellStartLocation: 0.1, cellEndLocation: 0.9 });
    const xAxis = chart.xAxes.push(
      am5xy.CategoryAxis.new(root, {
        categoryField: "department",
        renderer: xRenderer,
        tooltip: am5.Tooltip.new(root, {})
      })
    );
    xAxis.data.setAll(stats.departments);

    const yAxis = chart.yAxes.push(
      am5xy.ValueAxis.new(root, {
        min: 0,
        max: 5,
        renderer: am5xy.AxisRendererY.new(root, {})
      })
    );

    const makeSeries = (name, fieldName) => {
      const series = chart.series.push(
        am5xy.ColumnSeries.new(root, {
          name: name,
          xAxis: xAxis,
          yAxis: yAxis,
          valueYField: fieldName,
          categoryXField: "department",
          tooltip: am5.Tooltip.new(root, {
            labelText: "{name}: {valueY}"
          })
        })
      );
      series.data.setAll(stats.departments);
    };

    makeSeries("ผลสำเร็จของงาน", "avgCat1");
    makeSeries("ความรู้ความสามารถ", "avgCat2");
    makeSeries("ลักษณะส่วนบุคคล", "avgCat3");

    const legend = chart.children.push(am5.Legend.new(root, { centerX: am5.p50, x: am5.p50 }));
    legend.data.setAll(chart.series.values);

    return () => root.dispose();
  }, [stats]);

  useLayoutEffect(() => {
    if (!stats || !stats.companies) return;

    let totalHire = 0;
    let totalMaybe = 0;
    let totalNo = 0;
    Object.values(stats.companies).forEach(c => {
      totalHire += c.hire;
      totalMaybe += c.maybe;
      totalNo += c.no;
    });

    if (totalHire === 0 && totalMaybe === 0 && totalNo === 0) return;

    let previousRoot = am5.registry.rootElements.find((r) => r.dom === companyPieRef.current);
    if (previousRoot) previousRoot.dispose();
    let root = am5.Root.new(companyPieRef.current);
    root.setThemes([am5themes_Animated.new(root)]);

    const chart = root.container.children.push(
      am5percent.PieChart.new(root, {
        layout: root.verticalLayout
      })
    );

    const series = chart.series.push(
      am5percent.PieSeries.new(root, {
        valueField: "value",
        categoryField: "category"
      })
    );

    series.data.setAll([
      { category: "รับเข้าทำงาน", value: totalHire },
      { category: "ไม่แน่ใจ", value: totalMaybe },
      { category: "ไม่รับ", value: totalNo }
    ]);

    series.get("colors").set("colors", [
      am5.color(0x10b981), // Green
      am5.color(0xf59e0b), // Yellow
      am5.color(0xef4444)  // Red
    ]);

    chart.children.push(am5.Legend.new(root, { centerX: am5.percent(50), x: am5.percent(50), marginTop: 15, marginBottom: 15 }));

    return () => root.dispose();
  }, [stats]);

  return (
    <div className="admin-dashboard">
      <main className="dashboard-content" style={{ marginLeft: 0, padding: '20px' }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
           <Typography variant="h4" fontWeight="700">สถิติการประเมิน (Evaluation Analytics)</Typography>
           <Button variant="outlined" onClick={() => navigate(-1)}>ย้อนกลับ</Button>
        </Box>

        {!stats ? (
          <Typography>กำลังโหลดข้อมูล...</Typography>
        ) : (
          <Grid container spacing={3}>
            {/* Avg Score by Department Chart */}
            <Grid item xs={12}>
              <Card>
                <CardContent>
                  <Typography variant="h6" fontWeight="600" gutterBottom>คะแนนเฉลี่ยแบ่งตามหมวดหมู่และสาขาวิชา</Typography>
                  <div ref={deptChartRef} style={{ width: '100%', height: '400px' }}></div>
                </CardContent>
              </Card>
            </Grid>

            {/* Company Matching Pie Chart */}
            <Grid item xs={12} md={5}>
              <Card sx={{ height: '100%' }}>
                <CardContent>
                  <Typography variant="h6" fontWeight="600" gutterBottom>แนวโน้มการรับเข้าทำงานต่อ (ภาพรวม)</Typography>
                  <div ref={companyPieRef} style={{ width: '100%', height: '300px' }}></div>
                </CardContent>
              </Card>
            </Grid>

            {/* Top Companies Table */}
            <Grid item xs={12} md={7}>
              <Card sx={{ height: '100%' }}>
                <CardContent>
                  <Typography variant="h6" fontWeight="600" gutterBottom>สถิติการรับเข้าทำงานจำแนกตามบริษัท</Typography>
                  <TableContainer component={Paper} elevation={0} sx={{ border: '1px solid #e2e8f0', maxHeight: '300px' }}>
                    <Table stickyHeader size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell sx={{ fontWeight: 'bold' }}>ชื่อบริษัท</TableCell>
                          <TableCell align="center" sx={{ fontWeight: 'bold' }}>รับเข้าทำงาน</TableCell>
                          <TableCell align="center" sx={{ fontWeight: 'bold' }}>ไม่แน่ใจ</TableCell>
                          <TableCell align="center" sx={{ fontWeight: 'bold' }}>ไม่รับ</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {Object.keys(stats.companies).sort((a, b) => stats.companies[b].hire - stats.companies[a].hire).map(companyName => {
                          const c = stats.companies[companyName];
                          return (
                            <TableRow key={companyName}>
                              <TableCell>{companyName}</TableCell>
                              <TableCell align="center" sx={{ color: '#10b981', fontWeight: c.hire > 0 ? 'bold' : 'normal' }}>{c.hire}</TableCell>
                              <TableCell align="center" sx={{ color: '#f59e0b' }}>{c.maybe}</TableCell>
                              <TableCell align="center" sx={{ color: '#ef4444' }}>{c.no}</TableCell>
                            </TableRow>
                          )
                        })}
                        {Object.keys(stats.companies).length === 0 && (
                          <TableRow>
                            <TableCell colSpan={4} align="center">ยังไม่มีข้อมูล</TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        )}
      </main>
    </div>
  );
};

export default AdminEvaluationAnalyticsPage;
