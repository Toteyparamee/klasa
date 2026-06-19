'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { useSchoolId } from '../hooks/useSchoolId';
import { categoryAPI, behaviorAPI } from '../api/behaviorApi';

const severityCategories = ['ทั้งหมด', 'low', 'medium', 'high'];
const severityLabelMap = { low: 'เบา', medium: 'ปานกลาง', high: 'รุนแรง' };

const getStatus = (score) => {
  if (score >= 80) return { label: 'ดี', color: '#4caf50', icon: '✅' };
  if (score >= 50) return { label: 'เตือน', color: '#ff9800', icon: '⚠️' };
  return { label: 'อันตราย', color: '#f44336', icon: '🚨' };
};

const BehaviorManagement = () => {
  const { token } = useAuth();
  const schoolId = useSchoolId();

  // Students state
  const [students, setStudents] = useState([]);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [studentRecords, setStudentRecords] = useState([]);
  const [studentScore, setStudentScore] = useState(null);
  const [searchText, setSearchText] = useState('');
  const [selectedClassroom, setSelectedClassroom] = useState('ทั้งหมด');
  const [classrooms, setClassrooms] = useState(['ทั้งหมด']);

  // Deduction items (categories) state
  const [deductionItems, setDeductionItems] = useState([]);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [itemForm, setItemForm] = useState({ name: '', default_points: '', severity: 'medium', description: '' });
  const [settingsCategory, setSettingsCategory] = useState('ทั้งหมด');

  // Deduct modal state
  const [showDeductModal, setShowDeductModal] = useState(false);
  const [deductPoints, setDeductPoints] = useState('');
  const [deductReason, setDeductReason] = useState('');
  const [selectedDeductionItem, setSelectedDeductionItem] = useState(null);

  // Loading state
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [loadingCategories, setLoadingCategories] = useState(false);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [saving, setSaving] = useState(false);
  const [studentsError, setStudentsError] = useState(null);

  // ===== Fetch data =====

  const fetchStudents = useCallback(async () => {
    if (!token) return;
    setLoadingStudents(true);
    setStudentsError(null);
    try {
      const res = await behaviorAPI.getAllStudents(token, undefined, undefined, schoolId);
      if (res.success) {
        setStudents(res.data || []);
        const rooms = [...new Set((res.data || []).map(s => s.classroom))].sort();
        setClassrooms(['ทั้งหมด', ...rooms]);
      } else {
        setStudentsError(res.message || 'API ตอบกลับไม่สำเร็จ');
      }
    } catch (err) {
      console.error('Failed to fetch students:', err);
      setStudentsError(err.message || String(err));
    } finally {
      setLoadingStudents(false);
    }
  }, [token, schoolId]);

  const fetchCategories = useCallback(async () => {
    if (!token) return;
    setLoadingCategories(true);
    try {
      const res = await categoryAPI.getCategories(token, false);
      if (res.success) {
        setDeductionItems(res.data || []);
      }
    } catch (err) {
      console.error('Failed to fetch categories:', err);
    } finally {
      setLoadingCategories(false);
    }
  }, [token]);

  const fetchStudentDetail = useCallback(async (studentId) => {
    if (!token || !studentId) return;
    setLoadingDetail(true);
    try {
      const res = await behaviorAPI.getStudentDetail(studentId, token);
      if (res.success) {
        setStudentScore(res.data.score);
        setStudentRecords(res.data.records || []);
      }
    } catch (err) {
      console.error('Failed to fetch student detail:', err);
    } finally {
      setLoadingDetail(false);
    }
  }, [token]);

  useEffect(() => {
    fetchStudents();
    fetchCategories();
  }, [fetchStudents, fetchCategories]);

  useEffect(() => {
    if (selectedStudent) {
      fetchStudentDetail(selectedStudent.student_code);
    } else {
      setStudentRecords([]);
      setStudentScore(null);
    }
  }, [selectedStudent, fetchStudentDetail]);

  // ===== Filter students =====

  const filteredStudents = students.filter(s => {
    const matchClass = selectedClassroom === 'ทั้งหมด' || s.classroom === selectedClassroom;
    const matchSearch = searchText === '' ||
      `${s.first_name} ${s.last_name}`.includes(searchText) ||
      String(s.student_number).includes(searchText) ||
      s.student_code.includes(searchText);
    return matchClass && matchSearch;
  });

  // ===== Deduction item handlers (Settings) =====

  const handleSelectDeductionItem = (item) => {
    if (selectedDeductionItem?.id === item.id) {
      setSelectedDeductionItem(null);
      setDeductPoints('');
      setDeductReason('');
    } else {
      setSelectedDeductionItem(item);
      setDeductPoints(String(item.default_points));
      setDeductReason(item.name);
    }
  };

  const handleDeduct = async () => {
    const points = parseInt(deductPoints);
    if (!points || points <= 0) {
      alert('กรุณาระบุจำนวนคะแนนที่ถูกต้อง');
      return;
    }
    if (!deductReason.trim()) {
      alert('กรุณาระบุเหตุผล');
      return;
    }

    setSaving(true);
    try {
      const res = await behaviorAPI.createRecord({
        student_code: selectedStudent.student_code,
        student_name: `${selectedStudent.first_name} ${selectedStudent.last_name}`,
        deducted_points: points,
        reason: deductReason.trim(),
        category: selectedDeductionItem?.name || '',
        date: new Date().toISOString().split('T')[0],
      }, token);

      if (res.success) {
        // รีเฟรชข้อมูลนักเรียนและรายละเอียด
        await fetchStudents();
        await fetchStudentDetail(selectedStudent.student_code);
        setDeductPoints('');
        setDeductReason('');
        setSelectedDeductionItem(null);
        setShowDeductModal(false);
      }
    } catch (err) {
      alert('เกิดข้อผิดพลาด: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  // ===== Category CRUD =====

  const handleSaveItem = async () => {
    if (!itemForm.name.trim()) {
      alert('กรุณาระบุชื่อรายการ');
      return;
    }
    const points = parseInt(itemForm.default_points);
    if (!points || points <= 0) {
      alert('กรุณาระบุคะแนนที่ถูกต้อง');
      return;
    }

    setSaving(true);
    try {
      const data = {
        name: itemForm.name.trim(),
        default_points: points,
        severity: itemForm.severity,
        description: itemForm.description.trim(),
      };

      if (editingItem) {
        const res = await categoryAPI.updateCategory(editingItem.id, data, token);
        if (res.success) {
          await fetchCategories();
          resetItemForm();
        }
      } else {
        const res = await categoryAPI.createCategory(data, token);
        if (res.success) {
          await fetchCategories();
          resetItemForm();
        }
      }
    } catch (err) {
      alert('เกิดข้อผิดพลาด: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleEditItem = (item) => {
    setEditingItem(item);
    setItemForm({
      name: item.name,
      default_points: String(item.default_points),
      severity: item.severity,
      description: item.description || '',
    });
  };

  const handleDeleteItem = async (id) => {
    if (!window.confirm('ต้องการลบรายการนี้หรือไม่?')) return;
    try {
      const res = await categoryAPI.deleteCategory(id, token);
      if (res.success) {
        await fetchCategories();
      }
    } catch (err) {
      alert('เกิดข้อผิดพลาด: ' + err.message);
    }
  };

  const resetItemForm = () => {
    setEditingItem(null);
    setItemForm({ name: '', default_points: '', severity: 'medium', description: '' });
  };

  const filteredDeductionItems = deductionItems.filter(item =>
    settingsCategory === 'ทั้งหมด' || item.severity === settingsCategory
  );

  const activeDeductionItems = deductionItems.filter(item => item.is_active);

  // ===== Summary =====

  const currentScore = studentScore?.current_score ?? selectedStudent?.current_score ?? 100;

  const summary = {
    total: filteredStudents.length,
    good: filteredStudents.filter(s => s.current_score >= 80).length,
    warning: filteredStudents.filter(s => s.current_score >= 50 && s.current_score < 80).length,
    danger: filteredStudents.filter(s => s.current_score < 50).length,
  };

  return (
    <div>
      {/* Summary Cards */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <div className="bg-[#fafafa] rounded-xl p-5 flex items-center gap-4 border border-gray-200 border-l-4 border-l-[#2563eb]">
          <div className="text-3xl">👥</div>
          <div>
            <div className="text-3xl font-bold text-gray-800">{summary.total}</div>
            <div className="text-xs text-gray-500 mt-0.5">นักเรียนทั้งหมด</div>
          </div>
        </div>
        <div className="bg-[#fafafa] rounded-xl p-5 flex items-center gap-4 border border-gray-200 border-l-4 border-l-[#4caf50]">
          <div className="text-3xl">✅</div>
          <div>
            <div className="text-3xl font-bold text-gray-800">{summary.good}</div>
            <div className="text-xs text-gray-500 mt-0.5">พฤติกรรมดี</div>
          </div>
        </div>
        <div className="bg-[#fafafa] rounded-xl p-5 flex items-center gap-4 border border-gray-200 border-l-4 border-l-[#ff9800]">
          <div className="text-3xl">⚠️</div>
          <div>
            <div className="text-3xl font-bold text-gray-800">{summary.warning}</div>
            <div className="text-xs text-gray-500 mt-0.5">ต้องเฝ้าระวัง</div>
          </div>
        </div>
        <div className="bg-[#fafafa] rounded-xl p-5 flex items-center gap-4 border border-gray-200 border-l-4 border-l-[#f44336]">
          <div className="text-3xl">🚨</div>
          <div>
            <div className="text-3xl font-bold text-gray-800">{summary.danger}</div>
            <div className="text-xs text-gray-500 mt-0.5">อันตราย</div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="grid gap-6 min-h-[600px]" style={{ gridTemplateColumns: '380px 1fr' }}>
        {/* Left Panel - Student List */}
        <div className="bg-[#fafafa] rounded-xl border border-gray-200 flex flex-col" style={{ maxHeight: 'calc(100vh - 350px)' }}>
          <div className="px-5 pt-5 flex justify-between items-center">
            <h2 className="text-lg font-semibold text-gray-900 m-0">รายชื่อนักเรียน</h2>
            <button
              className="px-4 py-2 bg-gradient-to-br from-blue-600 to-blue-800 text-white border-none rounded-lg text-sm font-semibold cursor-pointer hover:opacity-90 whitespace-nowrap"
              onClick={() => setShowSettingsModal(true)}
            >
              ตั้งค่ารายการตัดคะแนน
            </button>
          </div>

          {/* Filters */}
          <div className="px-5 py-4 flex flex-col gap-2.5 border-b border-gray-200">
            <input
              type="text"
              placeholder="ค้นหานักเรียน..."
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              className="w-full px-3.5 py-2.5 border border-gray-300 rounded-lg text-sm outline-none focus:border-[#2563eb] box-border"
            />
            <select
              value={selectedClassroom}
              onChange={(e) => setSelectedClassroom(e.target.value)}
              className="w-full px-3.5 py-2.5 border border-gray-300 rounded-lg text-sm outline-none bg-white cursor-pointer focus:border-[#2563eb] box-border"
            >
              {classrooms.map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>

          {/* Student List */}
          <div className="flex-1 overflow-y-auto p-2">
            {loadingStudents ? (
              <div className="text-center py-10 px-5 text-gray-400">
                <p>กำลังโหลดข้อมูล...</p>
              </div>
            ) : (
              <>
                {filteredStudents.map(student => {
                  const status = getStatus(student.current_score);
                  return (
                    <div
                      key={student.student_code}
                      className={`flex items-center gap-3 px-3 py-3 rounded-xl cursor-pointer transition-colors ${
                        selectedStudent?.student_code === student.student_code
                          ? 'bg-indigo-100 border border-[#2563eb]'
                          : 'hover:bg-gray-100'
                      }`}
                      onClick={() => setSelectedStudent(student)}
                    >
                      <div
                        className="w-11 h-11 rounded-full bg-gray-100 flex items-center justify-center text-lg font-semibold text-gray-600 border-[3px] shrink-0"
                        style={{ borderColor: status.color }}
                      >
                        {student.first_name.charAt(0)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-[15px] font-semibold text-gray-900 truncate">{student.first_name} {student.last_name}</div>
                        <div className="text-xs text-gray-400 mt-0.5">{student.classroom} | เลขที่ {student.student_number}</div>
                      </div>
                      <div
                        className="min-w-[40px] h-8 rounded-2xl flex items-center justify-center text-white text-sm font-bold shrink-0 px-2.5"
                        style={{ backgroundColor: status.color }}
                      >
                        {student.current_score}
                      </div>
                    </div>
                  );
                })}
                {filteredStudents.length === 0 && (
                  <div className="text-center py-10 px-5 text-gray-400">
                    <span className="text-4xl block mb-2">{studentsError ? '⚠️' : '🔍'}</span>
                    <p>{studentsError ? 'โหลดข้อมูลล้มเหลว' : 'ไม่พบนักเรียน'}</p>
                    {studentsError && (
                      <span className="text-sm text-[#f44336] break-words">{studentsError}</span>
                    )}
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        {/* Right Panel - Student Detail */}
        <div className="bg-[#fafafa] rounded-xl border border-gray-200 p-6 overflow-y-auto" style={{ maxHeight: 'calc(100vh - 350px)' }}>
          {selectedStudent ? (
            <>
              {/* Student Profile */}
              <div className="flex items-center gap-5 mb-6 pb-6 border-b border-gray-200">
                <div
                  className="w-20 h-20 rounded-full bg-gradient-to-br from-blue-600 to-blue-800 flex items-center justify-center border-4 shrink-0"
                  style={{ borderColor: getStatus(currentScore).color }}
                >
                  <span className="text-4xl font-bold text-white">{selectedStudent.first_name.charAt(0)}</span>
                </div>
                <div>
                  <h2 className="text-2xl font-semibold text-gray-900 m-0 mb-2">{selectedStudent.first_name} {selectedStudent.last_name}</h2>
                  <div className="flex gap-2">
                    <span className="bg-gray-100 px-3 py-1 rounded-2xl text-sm text-gray-600">📚 {selectedStudent.classroom}</span>
                    <span className="bg-gray-100 px-3 py-1 rounded-2xl text-sm text-gray-600"># เลขที่ {selectedStudent.student_number}</span>
                  </div>
                </div>
              </div>

              {/* Score Card */}
              <div className="bg-gradient-to-br from-[#fafafa] to-[#f0f0f0] rounded-2xl p-6 text-center mb-5 border border-gray-300">
                <div className="text-sm text-gray-500 mb-3 uppercase tracking-widest">คะแนนพฤติกรรม</div>
                <div className="mb-4">
                  <span className="text-6xl font-extrabold" style={{ color: getStatus(currentScore).color }}>
                    {currentScore}
                  </span>
                  <span className="text-2xl text-gray-500 ml-1">/ 100</span>
                </div>
                <div className="h-3 bg-gray-300 rounded-full overflow-hidden mb-4">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{ width: `${currentScore}%`, backgroundColor: getStatus(currentScore).color }}
                  />
                </div>
                <div
                  className="inline-block px-5 py-1.5 rounded-2xl text-[15px] font-semibold border-2"
                  style={{
                    color: getStatus(currentScore).color,
                    borderColor: getStatus(currentScore).color,
                    backgroundColor: `${getStatus(currentScore).color}15`
                  }}
                >
                  {getStatus(currentScore).icon} สถานะ: {getStatus(currentScore).label}
                </div>
              </div>

              {/* Deduct Button */}
              <button
                className="w-full py-3.5 bg-gradient-to-br from-[#f44336] to-[#d32f2f] text-white border-none rounded-xl text-base font-semibold cursor-pointer mb-6 hover:-translate-y-px hover:shadow-lg transition-all"
                onClick={() => setShowDeductModal(true)}
              >
                ➖ ตัดคะแนนพฤติกรรม
              </button>

              {/* Records */}
              <div className="border-t border-gray-200 pt-5">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-semibold text-gray-900 m-0">ประวัติการตัดคะแนน</h3>
                  <span className="text-xs text-gray-400 bg-gray-100 px-3 py-1 rounded-xl">{studentRecords.length} รายการ</span>
                </div>

                {loadingDetail ? (
                  <div className="text-center py-10 text-gray-500">
                    <p>กำลังโหลด...</p>
                  </div>
                ) : studentRecords.length === 0 ? (
                  <div className="text-center py-10 px-5 text-gray-500">
                    <span className="text-5xl block mb-3">😊</span>
                    <p className="text-base m-0 mb-1">ไม่มีประวัติการตัดคะแนน</p>
                    <span className="text-sm text-[#4caf50] font-semibold">นักเรียนมีพฤติกรรมดีเยี่ยม!</span>
                  </div>
                ) : (
                  <div className="flex flex-col gap-3">
                    {studentRecords.map(record => (
                      <div key={record.id} className="flex gap-4 p-4 bg-[#fafafa] rounded-xl border border-gray-100">
                        <div className="w-[60px] h-[60px] bg-red-50 rounded-xl flex flex-col items-center justify-center shrink-0">
                          <span className="text-base">➖</span>
                          <span className="text-base font-bold text-[#f44336]">-{record.deducted_points}</span>
                        </div>
                        <div className="flex-1">
                          <div className="text-[15px] font-semibold text-gray-900 mb-2">{record.reason}</div>
                          <div className="flex gap-4 text-xs text-gray-400">
                            <span>👤 {record.teacher_name}</span>
                            <span>📅 {record.date}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="flex flex-col items-center justify-center h-full min-h-[400px] text-gray-400 text-center">
              <span className="text-7xl mb-4">👈</span>
              <h3 className="text-xl font-semibold text-gray-500 m-0 mb-2">เลือกนักเรียน</h3>
              <p className="m-0 text-sm">กรุณาเลือกนักเรียนจากรายชื่อด้านซ้ายเพื่อดูรายละเอียด</p>
            </div>
          )}
        </div>
      </div>

      {/* Deduct Modal */}
      {showDeductModal && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-[1000]"
          onClick={() => setShowDeductModal(false)}
        >
          <div
            className="bg-white rounded-2xl w-[480px] max-w-[90vw] shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center px-6 py-5 border-b border-gray-200">
              <h3 className="m-0 text-lg font-semibold text-gray-900">➖ ตัดคะแนนพฤติกรรม</h3>
              <button
                className="bg-none border-none text-2xl text-gray-500 cursor-pointer p-0 leading-none hover:text-gray-900"
                onClick={() => setShowDeductModal(false)}
              >&times;</button>
            </div>
            <div className="p-6">
              <div className="bg-gray-100 px-4 py-3 rounded-xl mb-5 text-sm text-gray-600">
                นักเรียน: <strong>{selectedStudent?.first_name} {selectedStudent?.last_name}</strong>
                <span className="block mt-1 text-xs text-gray-400">คะแนนปัจจุบัน: {currentScore}/100</span>
              </div>

              {/* เลือกรายการตัดคะแนนจาก preset */}
              <div className="mb-4">
                <label className="block mb-1.5 text-sm font-semibold text-gray-700">เลือกรายการตัดคะแนน</label>
                <div className="max-h-[200px] overflow-y-auto flex flex-col gap-1.5 mt-2">
                  {activeDeductionItems.map(item => (
                    <div
                      key={item.id}
                      className={`flex items-center justify-between px-3.5 py-2.5 border rounded-xl cursor-pointer transition-all bg-[#fafafa] ${
                        selectedDeductionItem?.id === item.id
                          ? 'border-[#2563eb] bg-indigo-100 shadow-[0_0_0_2px_rgba(102,126,234,0.2)]'
                          : 'border-gray-300 hover:border-[#2563eb] hover:bg-indigo-50'
                      }`}
                      onClick={() => handleSelectDeductionItem(item)}
                    >
                      <div className="flex flex-col gap-0.5">
                        <span className="text-sm font-semibold text-gray-900">{item.name}</span>
                        <span className="text-[11px] text-gray-400">{severityLabelMap[item.severity] || item.severity}</span>
                      </div>
                      <span className="text-base font-bold text-[#f44336] bg-red-50 px-3 py-1 rounded-lg">-{item.default_points}</span>
                    </div>
                  ))}
                  {activeDeductionItems.length === 0 && (
                    <div className="text-center py-3 text-gray-500 text-sm">
                      <p>ยังไม่มีรายการตัดคะแนน กรุณาเพิ่มในตั้งค่า</p>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-3 my-4 text-gray-400 text-sm before:content-[''] before:flex-1 before:h-px before:bg-gray-300 after:content-[''] after:flex-1 after:h-px after:bg-gray-300">
                <span>หรือระบุเอง</span>
              </div>

              <div className="mb-4">
                <label className="block mb-1.5 text-sm font-semibold text-gray-700">จำนวนคะแนนที่ตัด</label>
                <input
                  type="number"
                  min="1"
                  placeholder="ระบุจำนวนคะแนน"
                  value={deductPoints}
                  onChange={(e) => { setDeductPoints(e.target.value); setSelectedDeductionItem(null); }}
                  className="w-full px-3.5 py-2.5 border border-gray-300 rounded-xl text-sm outline-none focus:border-[#2563eb] box-border"
                />
              </div>
              <div className="mb-4">
                <label className="block mb-1.5 text-sm font-semibold text-gray-700">เหตุผล</label>
                <textarea
                  placeholder="ระบุเหตุผลในการตัดคะแนน"
                  rows={3}
                  value={deductReason}
                  onChange={(e) => { setDeductReason(e.target.value); setSelectedDeductionItem(null); }}
                  className="w-full px-3.5 py-2.5 border border-gray-300 rounded-xl text-sm outline-none focus:border-[#2563eb] box-border resize-y font-[inherit]"
                />
              </div>
            </div>
            <div className="flex justify-end gap-3 px-6 py-4 border-t border-gray-200">
              <button
                className="px-6 py-2.5 bg-gray-100 border border-gray-300 rounded-xl text-sm cursor-pointer text-gray-600 hover:bg-gray-200"
                onClick={() => setShowDeductModal(false)}
              >ยกเลิก</button>
              <button
                className="px-6 py-2.5 bg-gradient-to-br from-blue-600 to-blue-800 text-white border-none rounded-xl text-sm font-semibold cursor-pointer hover:opacity-90 disabled:opacity-60"
                onClick={handleDeduct}
                disabled={saving}
              >
                {saving ? 'กำลังบันทึก...' : 'บันทึก'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Settings Modal - ตั้งค่ารายการตัดคะแนน */}
      {showSettingsModal && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-[1000]"
          onClick={() => { setShowSettingsModal(false); resetItemForm(); }}
        >
          <div
            className="bg-white rounded-2xl w-[700px] max-w-[95vw] max-h-[90vh] flex flex-col shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center px-6 py-5 border-b border-gray-200">
              <h3 className="m-0 text-lg font-semibold text-gray-900">ตั้งค่ารายการตัดคะแนน</h3>
              <button
                className="bg-none border-none text-2xl text-gray-500 cursor-pointer p-0 leading-none hover:text-gray-900"
                onClick={() => { setShowSettingsModal(false); resetItemForm(); }}
              >&times;</button>
            </div>
            <div className="p-6 overflow-y-auto flex-1">
              {/* ฟอร์มเพิ่ม/แก้ไขรายการ */}
              <div className="bg-[#f8f9ff] border border-indigo-200 rounded-xl p-5 mb-5">
                <h4 className="m-0 mb-4 text-base font-semibold text-gray-800">{editingItem ? 'แก้ไขรายการ' : 'เพิ่มรายการใหม่'}</h4>
                <div className="flex gap-3 mb-3">
                  <div className="flex-[2] flex flex-col gap-1.5">
                    <label className="text-sm font-semibold text-gray-700">ชื่อรายการ</label>
                    <input
                      type="text"
                      placeholder="รายการตัดคะแนน"
                      value={itemForm.name}
                      onChange={(e) => setItemForm(prev => ({ ...prev, name: e.target.value }))}
                      className="w-full px-3.5 py-2.5 border border-gray-300 rounded-xl text-sm outline-none focus:border-[#2563eb] box-border"
                    />
                  </div>
                  <div className="flex-1 flex flex-col gap-1.5">
                    <label className="text-sm font-semibold text-gray-700">คะแนนที่ตัด</label>
                    <input
                      type="number"
                      min="1"
                      placeholder="คะแนน"
                      value={itemForm.default_points}
                      onChange={(e) => setItemForm(prev => ({ ...prev, default_points: e.target.value }))}
                      className="w-full px-3.5 py-2.5 border border-gray-300 rounded-xl text-sm outline-none focus:border-[#2563eb] box-border"
                    />
                  </div>
                  <div className="flex-1 flex flex-col gap-1.5">
                    <label className="text-sm font-semibold text-gray-700">ความรุนแรง</label>
                    <select
                      value={itemForm.severity}
                      onChange={(e) => setItemForm(prev => ({ ...prev, severity: e.target.value }))}
                      className="w-full px-3.5 py-2.5 border border-gray-300 rounded-xl text-sm outline-none bg-white cursor-pointer focus:border-[#2563eb] box-border"
                    >
                      <option value="low">เบา</option>
                      <option value="medium">ปานกลาง</option>
                      <option value="high">รุนแรง</option>
                    </select>
                  </div>
                </div>
                <div className="mb-4 flex flex-col gap-1.5">
                  <label className="text-sm font-semibold text-gray-700">คำอธิบาย (ไม่บังคับ)</label>
                  <input
                    type="text"
                    placeholder="คำอธิบายเพิ่มเติม"
                    value={itemForm.description}
                    onChange={(e) => setItemForm(prev => ({ ...prev, description: e.target.value }))}
                    className="w-full px-3.5 py-2.5 border border-gray-300 rounded-xl text-sm outline-none focus:border-[#2563eb] box-border"
                  />
                </div>
                <div className="flex justify-end gap-2.5">
                  {editingItem && (
                    <button
                      className="px-6 py-2.5 bg-gray-100 border border-gray-300 rounded-xl text-sm cursor-pointer text-gray-600 hover:bg-gray-200"
                      onClick={resetItemForm}
                    >ยกเลิก</button>
                  )}
                  <button
                    className="px-6 py-2.5 bg-gradient-to-br from-blue-600 to-blue-800 text-white border-none rounded-xl text-sm font-semibold cursor-pointer hover:opacity-90 disabled:opacity-60"
                    onClick={handleSaveItem}
                    disabled={saving}
                  >
                    {saving ? 'กำลังบันทึก...' : editingItem ? 'บันทึกการแก้ไข' : 'เพิ่มรายการ'}
                  </button>
                </div>
              </div>

              {/* ตัวกรองความรุนแรง */}
              <div className="mb-4">
                <label className="block text-sm font-semibold text-gray-700 mb-2">กรองตามความรุนแรง:</label>
                <div className="flex gap-2 flex-wrap">
                  {severityCategories.map(cat => (
                    <button
                      key={cat}
                      className={`px-4 py-1.5 border rounded-2xl text-sm cursor-pointer transition-all ${
                        settingsCategory === cat
                          ? 'bg-[#2563eb] text-white border-[#2563eb]'
                          : 'bg-white border-gray-300 text-gray-600 hover:border-[#2563eb] hover:text-[#2563eb]'
                      }`}
                      onClick={() => setSettingsCategory(cat)}
                    >
                      {cat === 'ทั้งหมด' ? cat : severityLabelMap[cat]}
                    </button>
                  ))}
                </div>
              </div>

              {/* รายการทั้งหมด */}
              <div className="flex flex-col gap-2">
                {loadingCategories ? (
                  <div className="text-center py-10 text-gray-500">
                    <p>กำลังโหลด...</p>
                  </div>
                ) : filteredDeductionItems.length === 0 ? (
                  <div className="text-center py-10 text-gray-500">
                    <p>ไม่มีรายการในหมวดหมู่นี้</p>
                  </div>
                ) : (
                  filteredDeductionItems.map(item => (
                    <div
                      key={item.id}
                      className="flex items-center gap-3 px-4 py-3.5 bg-[#fafafa] border border-gray-200 rounded-xl hover:bg-gray-100 transition-colors"
                    >
                      <div className="flex-1 min-w-0">
                        <span className="text-[15px] font-semibold text-gray-900 block">{item.name}</span>
                        <span className="text-xs text-gray-400 mt-0.5 block">{severityLabelMap[item.severity] || item.severity}</span>
                      </div>
                      <div className="text-sm font-bold text-[#f44336] whitespace-nowrap">-{item.default_points} คะแนน</div>
                      <div className="flex gap-1.5">
                        <button
                          className="px-3.5 py-1.5 bg-blue-50 text-blue-700 border-none rounded-md text-sm font-semibold cursor-pointer hover:bg-blue-100"
                          onClick={() => handleEditItem(item)}
                        >แก้ไข</button>
                        <button
                          className="px-3.5 py-1.5 bg-red-50 text-red-700 border-none rounded-md text-sm font-semibold cursor-pointer hover:bg-red-100"
                          onClick={() => handleDeleteItem(item.id)}
                        >ลบ</button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BehaviorManagement;
