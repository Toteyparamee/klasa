'use client';

import { useState } from 'react';
import * as XLSX from 'xlsx';

const StudentBatchUploadForm = ({ onSubmit, onCancel }) => {
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewData, setPreviewData] = useState([]);
  const [error, setError] = useState('');
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const fileExtension = file.name.split('.').pop().toLowerCase();
    if (!['xlsx', 'xls', 'csv'].includes(fileExtension)) {
      setError('กรุณาอัพโหลดไฟล์ Excel (.xlsx, .xls) หรือ CSV เท่านั้น');
      return;
    }

    setSelectedFile(file);
    setError('');
    parseFile(file);
  };

  const parseFile = (file) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: 'array' });
        const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
        // ใช้ header:1 เพื่ออ่าน index-based ตรงกับ BE parser (branch >= 50)
        // col: 0=เลขปชช, 1=ชั้น, 2=ห้อง, 3=รหัสนักเรียน, 4=เพศ, 5=คำนำหน้า
        //      6=ชื่อ, 7=นามสกุล, 8=ชื่ออังกฤษ, 9=นามสกุลอังกฤษ
        //      43=เบอร์โทรปัจจุบัน, 55=username, 56=password, 57=email
        const rows = XLSX.utils.sheet_to_json(firstSheet, { header: 1 });
        const dataRows = rows.slice(1); // ข้าม header row

        const students = dataRows.map((row, index) => ({
          studentId: row[3] || '',
          studentNumber: parseInt(row[3] ? index + 1 : index + 1),
          firstNameTh: row[6] || '',
          lastNameTh: row[7] || '',
          firstNameEn: row[8] || '',
          lastNameEn: row[9] || '',
          phone: row[43] || '',
          username: row[55] || '',
          password: row[56] || '',
          email: row[57] || '',
        })).filter(s => s.studentId !== '');

        setPreviewData(students);
      } catch (err) {
        setError('เกิดข้อผิดพลาดในการอ่านไฟล์: ' + err.message);
      }
    };

    reader.readAsArrayBuffer(file);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    console.log('📝 Form submit triggered');

    if (!selectedFile) {
      console.warn('❌ No file selected');
      setError('กรุณาเลือกไฟล์');
      return;
    }

    if (previewData.length === 0) {
      console.warn('❌ No preview data');
      setError('ไม่มีข้อมูลนักเรียนในไฟล์');
      return;
    }

    console.log('✅ Submitting file:', {
      fileName: selectedFile.name,
      previewCount: previewData.length,
      onSubmitType: typeof onSubmit
    });

    // ส่งไฟล์จริงแทน JSON
    if (typeof onSubmit === 'function') {
      console.log('🔥 Calling onSubmit...', {
        functionName: onSubmit.name,
        functionString: onSubmit.toString().substring(0, 100)
      });

      setIsUploading(true);
      setUploadProgress(0);
      setError('');

      try {
        const result = await onSubmit({
          file: selectedFile,
          previewCount: previewData.length,
          onProgress: (progress) => {
            console.log('📊 Upload progress:', progress);
            setUploadProgress(progress);
          }
        });

        console.log('✅ onSubmit completed, result:', result);
        setUploadProgress(100);
      } catch (err) {
        console.error('💥 onSubmit error:', err);
        setError('เกิดข้อผิดพลาดในการอัพโหลด: ' + err.message);
      } finally {
        setIsUploading(false);
      }
    } else {
      console.error('❌ onSubmit is not a function!', onSubmit);
    }
  };

  const downloadTemplate = () => {
    // header ตรงกับ index ที่ BE ใช้ใน branch len(row) >= 50
    const headers = [
      'เลขประจำตัวประชาชน',       // 0
      'ชั้น',                      // 1
      'ห้อง',                      // 2
      'รหัสนักเรียน',              // 3
      'เพศ',                       // 4
      'คำนำหน้าชื่อ',              // 5
      'ชื่อ',                      // 6
      'นามสกุล',                   // 7
      'ชื่อ (อังกฤษ)',              // 8
      'นามสกุล (อังกฤษ)',          // 9
      'วันเกิด (DD/MM/YYYY)',      // 10
      'หมู่โลหิต',                 // 11
      'สัญชาติ',                   // 12
      'เชื้อชาติ',                 // 13
      'ศาสนา',                     // 14
      'จำนวนพี่ชาย',               // 15
      'จำนวนน้องชาย',              // 16
      'จำนวนพี่สาว',               // 17
      'จำนวนน้องสาว',              // 18
      'เป็นบุตรคนที่',             // 19
      'สถานภาพสมรสบิดามารดา',      // 20
      'คำนำหน้าบิดา',              // 21
      'ชื่อบิดา',                  // 22
      'นามสกุลบิดา',               // 23
      'รายได้บิดา (บาท/เดือน)',    // 24
      'เบอร์โทรบิดา',              // 25
      'คำนำหน้ามารดา',             // 26
      'ชื่อมารดา',                 // 27
      'นามสกุลมารดา',              // 28
      'เบอร์โทรมารดา',             // 29
      'ความเกี่ยวข้องผู้ปกครอง',   // 30
      'คำนำหน้าผู้ปกครอง',         // 31
      'ชื่อผู้ปกครอง',             // 32
      'นามสกุลผู้ปกครอง',          // 33
      'รายได้ผู้ปกครอง (บาท/เดือน)', // 34
      'เบอร์โทรผู้ปกครอง',         // 35
      'เลขที่บ้าน',                // 36
      'หมู่',                      // 37
      'ถนน',                       // 38
      'ตำบล',                      // 39
      'อำเภอ',                     // 40
      'จังหวัด',                   // 41
      'รหัสไปรษณีย์',              // 42
      'เบอร์โทรที่อยู่ปัจจุบัน',  // 43
      'น้ำหนัก (กก.)',             // 44
      'ส่วนสูง (ซม.)',             // 45
      'ความด้อยโอกาส',             // 46
      'ระยะทางถนนลาดยาง (กม.)',    // 47
      'ระยะทางถนนลูกรัง (กม.)',    // 48
      'ระยะเวลาเดินทาง (นาที)',     // 49
      'ลักษณะการเดินทาง',          // 50
      'จังหวัดที่เกิด',            // 51
      'อาชีพบิดา',                 // 52
      'อาชีพมารดา',                // 53
      'อาชีพผู้ปกครอง',            // 54
      'Username',                  // 55
      'Password',                  // 56
      'Email',                     // 57
    ];

    const ws = XLSX.utils.aoa_to_sheet([headers]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Students');
    XLSX.writeFile(wb, 'student_template.xlsx');
  };


  return (
    <div className="bg-white rounded-xl p-6 mb-6 shadow-[0_2px_8px_rgba(0,0,0,0.1)]">
      <div className="flex justify-between items-center mb-6 pb-4 border-b-2 border-gray-200">
        <h3 className="text-gray-900 text-xl font-semibold m-0">อัพโหลดข้อมูลนักเรียนจากไฟล์</h3>
        <button
          type="button"
          onClick={downloadTemplate}
          className="bg-emerald-500 hover:bg-emerald-600 text-white border-none px-4 py-2 rounded-lg cursor-pointer text-sm transition-colors"
        >
          ดาวน์โหลดไฟล์ตัวอย่าง
        </button>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="mb-6">
          <div className="mb-4">
            <label className="block font-medium mb-2 text-gray-700">เลือกไฟล์ Excel หรือ CSV *</label>
            <input
              type="file"
              accept=".xlsx,.xls,.csv"
              onChange={handleFileChange}
              required
              className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm transition-colors focus:outline-none focus:border-blue-500"
            />
            {selectedFile && (
              <div className="mt-2 px-3 py-2 bg-gray-100 rounded-lg text-sm text-gray-500">
                ไฟล์ที่เลือก: {selectedFile.name}
              </div>
            )}
          </div>

          {error && (
            <div className="bg-red-100 text-red-600 p-3 rounded-lg text-sm mt-3">
              {error}
            </div>
          )}

          {isUploading && (
            <div className="mt-4 p-4 bg-sky-50 rounded-lg border border-sky-200">
              <div className="text-sm font-medium text-sky-700 mb-2 text-center">
                กำลังอัพโหลด... {uploadProgress}%
              </div>
              <div className="w-full h-6 bg-sky-100 rounded-xl overflow-hidden shadow-inner">
                <div
                  className="h-full bg-gradient-to-r from-sky-400 to-sky-600 rounded-xl transition-[width] duration-300 ease-out flex items-center justify-center shadow-[0_2px_4px_rgba(14,165,233,0.3)]"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
            </div>
          )}
        </div>

        {previewData.length > 0 && (
          <div className="mt-6 pt-6 border-t-2 border-gray-200">
            <h4 className="text-gray-900 text-base font-semibold mb-4">ข้อมูลที่จะนำเข้า ({previewData.length} คน)</h4>
            <div className="overflow-x-auto rounded-lg border border-gray-200">
              <table className="w-full border-collapse text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="p-3 text-left font-semibold text-gray-700 border-b-2 border-gray-200">เลขที่</th>
                    <th className="p-3 text-left font-semibold text-gray-700 border-b-2 border-gray-200">รหัสนักเรียน</th>
                    <th className="p-3 text-left font-semibold text-gray-700 border-b-2 border-gray-200">ชื่อ-นามสกุล (ไทย)</th>
                    <th className="p-3 text-left font-semibold text-gray-700 border-b-2 border-gray-200">ชื่อ-นามสกุล (อังกฤษ)</th>
                    <th className="p-3 text-left font-semibold text-gray-700 border-b-2 border-gray-200">เบอร์โทร</th>
                  </tr>
                </thead>
                <tbody>
                  {previewData.map((student, index) => (
                    <tr key={index} className="hover:bg-gray-50">
                      <td className="p-3 border-b border-gray-200 text-gray-500">{student.studentNumber}</td>
                      <td className="p-3 border-b border-gray-200 text-gray-500">{student.studentId}</td>
                      <td className="p-3 border-b border-gray-200 text-gray-500">{student.firstNameTh} {student.lastNameTh}</td>
                      <td className="p-3 border-b border-gray-200 text-gray-500">{student.firstNameEn} {student.lastNameEn}</td>
                      <td className="p-3 border-b border-gray-200 text-gray-500">{student.phone}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        <div className="flex gap-3 justify-end mt-6 pt-4 border-t border-gray-200">
          <button
            type="submit"
            className="bg-blue-500 hover:bg-blue-600 disabled:bg-gray-400 disabled:cursor-not-allowed text-white border-none px-5 py-2.5 rounded-lg cursor-pointer font-medium transition-colors"
            disabled={previewData.length === 0 || isUploading}
          >
            {isUploading ? `กำลังอัพโหลด... ${uploadProgress}%` : `นำเข้าข้อมูล (${previewData.length} คน)`}
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="bg-white hover:bg-gray-50 text-gray-500 border border-gray-300 hover:border-gray-400 px-5 py-2.5 rounded-lg cursor-pointer font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={isUploading}
          >
            ยกเลิก
          </button>
        </div>
      </form>
    </div>
  );
};

export default StudentBatchUploadForm;
