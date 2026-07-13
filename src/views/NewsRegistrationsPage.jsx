'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Sidebar from '../components/Sidebar';
import { useAuth } from '../context/AuthContext';
import { newsAPI } from '../api/newsApi';

const statusLabel = (status) => (status === 'cancelled' ? 'ยกเลิกแล้ว' : 'ลงทะเบียนแล้ว');

const NewsRegistrationsPage = () => {
  const { newsId } = useParams();
  const router = useRouter();
  const { getValidToken } = useAuth();
  const [news, setNews] = useState(null);
  const [registrations, setRegistrations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [exportToken, setExportToken] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const token = await getValidToken();
      setExportToken(token);
      const [newsRes, regRes] = await Promise.all([
        newsAPI.getNewsById(newsId, token),
        newsAPI.getRegistrations(newsId, token),
      ]);
      setNews(newsRes.data);
      setRegistrations(regRes.data || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [getValidToken, newsId]);

  useEffect(() => {
    load();
  }, [load]);

  const formSchema = news?.form_schema || [];
  const confirmedCount = registrations.filter((r) => r.status === 'confirmed').length;

  return (
    <div className="flex min-h-screen bg-slate-50">
      <Sidebar />
      <div className="flex-1 md:ml-[280px] min-h-screen bg-slate-50 pt-16 md:pt-0">
        <div className="p-8">
          <button
            className="text-sm text-blue-600 hover:text-blue-700 mb-4 bg-transparent border-none cursor-pointer p-0"
            onClick={() => router.push('/news')}
          >
            ← กลับไปหน้าจัดการข่าวสาร
          </button>

          <div className="mb-6 flex items-center justify-between flex-wrap gap-3">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                รายชื่อผู้ลงทะเบียน{news ? `: ${news.title}` : ''}
              </h1>
              <p className="text-sm text-gray-500 mt-1">
                ลงทะเบียนแล้ว {confirmedCount} คน
                {news?.capacity ? ` / รับ ${news.capacity} คน` : ' (ไม่จำกัดจำนวน)'}
              </p>
            </div>
            {exportToken && (
              <a
                href={newsAPI.getRegistrationsExportUrl(newsId, exportToken)}
                download
                className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-xl text-sm font-semibold no-underline inline-block"
              >
                ⬇ Export CSV
              </a>
            )}
          </div>

          {error && (
            <div className="bg-red-50 text-red-700 px-4 py-3 rounded-xl border border-red-100 mb-6 text-sm">
              เกิดข้อผิดพลาด: {error}
            </div>
          )}

          {loading ? (
            <div className="text-center py-16 px-5 text-gray-400 bg-white rounded-2xl border border-gray-100 shadow-sm">
              กำลังโหลด...
            </div>
          ) : registrations.length === 0 ? (
            <div className="text-center py-16 px-5 text-gray-400 bg-white rounded-2xl border border-gray-100 shadow-sm">
              ยังไม่มีผู้ลงทะเบียน
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-x-auto">
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="border-b border-gray-100 text-left text-gray-500">
                    <th className="p-3 font-semibold">ชื่อนักเรียน</th>
                    <th className="p-3 font-semibold">รหัสนักเรียน</th>
                    <th className="p-3 font-semibold">เวลาลงทะเบียน</th>
                    <th className="p-3 font-semibold">สถานะ</th>
                    {formSchema.map((f) => (
                      <th key={f.id} className="p-3 font-semibold">
                        {f.label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {registrations.map((r) => (
                    <tr key={r.id} className="border-b border-gray-50 last:border-none">
                      <td className="p-3 text-gray-800">{r.student_name}</td>
                      <td className="p-3 text-gray-500">{r.student_code}</td>
                      <td className="p-3 text-gray-500">
                        {new Date(r.submitted_at).toLocaleString('th-TH')}
                      </td>
                      <td className="p-3">
                        <span
                          className={`px-2 py-1 rounded-lg text-xs font-semibold ${
                            r.status === 'cancelled'
                              ? 'bg-gray-100 text-gray-500'
                              : 'bg-green-50 text-green-700'
                          }`}
                        >
                          {statusLabel(r.status)}
                        </span>
                      </td>
                      {formSchema.map((f) => (
                        <td key={f.id} className="p-3 text-gray-700">
                          {String(r.answers?.[f.id] ?? '')}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default NewsRegistrationsPage;
