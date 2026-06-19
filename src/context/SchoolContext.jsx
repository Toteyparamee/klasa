'use client';

import { createContext, useContext, useState, useEffect } from 'react';
import { schoolAPI, personnelAPI, classAPI, userAPI } from '../services/api';
import { useAuth } from './AuthContext';

export const SchoolContext = createContext(null);

export const SchoolProvider = ({ children }) => {
  const [schools, setSchools] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedSchoolId, setSelectedSchoolId] = useState(null);
  const { getValidToken, logout, user, token, isInitialized } = useAuth();

  // โหลดข้อมูลใหม่ทุกครั้งที่สถานะ auth เปลี่ยน (login/logout/refresh page)
  useEffect(() => {
    if (!isInitialized) return;

    if (user && token) {
      fetchSchoolsData();
    } else {
      // logout → ล้างข้อมูลโรงเรียนใน state ป้องกันรั่วไปยัง user คนถัดไป
      setSchools([]);
      setLoading(false);
    }
  }, [isInitialized, user, token]);

  const fetchSchoolsData = async () => {
    try {
      const token = await getValidToken();
      if (!token) {
        setLoading(false);
        return;
      }

      // ดึงข้อมูลโรงเรียนจาก API
      const schoolsResponse = await schoolAPI.getSchools(token);

      if (schoolsResponse.success && schoolsResponse.data) {
        // แปลงข้อมูลจาก API เป็นรูปแบบที่ frontend ใช้
        const transformedSchools = await Promise.all(
          schoolsResponse.data.map(async (school) => {
            let classrooms = [];

            try {
              // ดึงข้อมูล classes จาก API
              const classesResponse = await classAPI.getClasses(token, school.id);
              console.log(`📚 Classes for school ${school.id}:`, classesResponse);

              if (classesResponse.success && classesResponse.data) {
                // แปลง classes เป็น classrooms พร้อมดึงนักเรียนแต่ละห้อง
                classrooms = await Promise.all(
                  classesResponse.data.map(async (classData) => {
                    try {
                      // ดึงนักเรียนในชั้นนี้
                      const studentsResponse = await classAPI.getClassStudents(classData.id, token);

                      let students = [];
                      if (studentsResponse.success && studentsResponse.data && studentsResponse.data.students) {
                        students = studentsResponse.data.students.map(student => ({
                          id: student.id,
                          studentId: student.student_code,
                          studentNumber: student.student_number ?? null,
                          firstNameTh: student.first_name_th,
                          lastNameTh: student.last_name_th,
                          firstNameEn: student.first_name_en || '',
                          lastNameEn: student.last_name_en || '',
                          phone: student.current_phone || student.father_phone || student.mother_phone || '',
                          address: student.house_number || '',
                          fatherName: student.father_first_name || '',
                          motherName: student.mother_first_name || ''
                        }));
                      }

                      return {
                        id: classData.id,
                        name: classData.section ? `${classData.grade}/${classData.section}` : classData.grade,
                        grade: classData.grade,
                        section: classData.section,
                        students: students
                      };
                    } catch (error) {
                      console.error(`Failed to fetch students for class ${classData.id}:`, error);
                      return {
                        id: classData.id,
                        name: classData.section ? `${classData.grade}/${classData.section}` : classData.grade,
                        grade: classData.grade,
                        section: classData.section,
                        students: []
                      };
                    }
                  })
                );
              }
            } catch (error) {
              console.error(`Failed to fetch classes for school ${school.id}:`, error);
            }

            // ดึงข้อมูลครูของโรงเรียน
            let teachers = [];
            try {
              const teachersResponse = await personnelAPI.getTeachers(token, school.id);
              console.log(`👨‍🏫 Teachers for school ${school.id}:`, teachersResponse);

              if (teachersResponse.success && teachersResponse.data) {
                teachers = teachersResponse.data.map(teacher => ({
                  id: teacher.id,
                  teacherCode: teacher.teacher_code,
                  titleTh: teacher.title_th,
                  firstNameTh: teacher.first_name_th,
                  lastNameTh: teacher.last_name_th,
                  firstNameEn: teacher.first_name_en || '',
                  lastNameEn: teacher.last_name_en || '',
                  subject: teacher.subject || '',
                  address: teacher.address || '',
                  phone: teacher.phone || '',
                  homeroomClass: teacher.homeroom_class || ''
                }));
              }
            } catch (error) {
              console.error(`Failed to fetch teachers for school ${school.id}:`, error);
            }

            return {
              id: school.id,
              name: school.name,
              address: school.address,
              latitude: school.latitude ?? null,
              longitude: school.longitude ?? null,
              boundary: school.boundary ?? null,
              classrooms: classrooms,
              teachers: teachers
            };
          })
        );

        setSchools(transformedSchools);

        // auto-select ถ้ามีโรงเรียนเดียว (admin ไม่ต้องเลือก manual)
        if (transformedSchools.length === 1) {
          setSelectedSchoolId(transformedSchools[0].id);
        }
      }

      setLoading(false);
    } catch (error) {
      console.error('Failed to fetch schools data:', error);
      setLoading(false);
    }
  };

  const addSchool = async (school) => {
    try {
      const token = await getValidToken();
      if (!token) {
        throw new Error('No token found');
      }

      // เรียก API เพื่อสร้างโรงเรียนใหม่
      const response = await schoolAPI.createSchool(school, token);

      if (response.success && response.data) {
        // เพิ่มโรงเรียนใหม่ในระบบ
        const newSchool = {
          id: response.data.id,
          name: response.data.name,
          address: response.data.address,
          classrooms: [],
          teachers: []
        };
        setSchools([...schools, newSchool]);
      }
    } catch (error) {
      console.error('Failed to add school:', error);
      throw error;
    }
  };

  const updateSchool = async (schoolId, schoolData) => {
    try {
      const token = await getValidToken();
      if (!token) throw new Error('No token found');
      const response = await schoolAPI.updateSchool(schoolId, schoolData, token);
      if (response.success && response.data) {
        setSchools(schools.map((s) =>
          s.id === schoolId
            ? { ...s, ...response.data }
            : s
        ));
      }
    } catch (error) {
      console.error('Failed to update school:', error);
      throw error;
    }
  };

  const deleteSchool = async (schoolId) => {
    try {
      const token = await getValidToken();
      if (!token) {
        throw new Error('No token found');
      }

      // เรียก API เพื่อลบโรงเรียน
      await schoolAPI.deleteSchool(schoolId, token);

      // ลบโรงเรียนออกจาก state
      setSchools(schools.filter(school => school.id !== schoolId));
    } catch (error) {
      console.error('Failed to delete school:', error);
      throw error;
    }
  };

  const addStudent = async (schoolId, classroomId, student, overrideGrade, overrideSection) => {
    try {
      const token = await getValidToken();

      const currentSchool = schools.find(s => s.id === schoolId);
      const classroom = currentSchool?.classrooms.find(c => c.id === classroomId);

      // สร้าง payload แล้วลบ key ที่เป็น null/undefined ออก
      // เพราะ Fiber v3 strict binding จะ error ถ้า null ไปใส่ field ที่เป็น string/int ใน Go
      const rawPayload = {
        school_id: schoolId,
        class_id: classroomId,
        grade: overrideGrade ?? classroom?.grade ?? '',
        section: overrideSection ?? classroom?.section ?? '',
        national_id: student.nationalId || '',
        student_code: student.studentId,
        student_number: student.studentNumber || undefined,
        title_th: student.titleTh || '',
        first_name_th: student.firstNameTh,
        last_name_th: student.lastNameTh,
        first_name_en: student.firstNameEn || '',
        last_name_en: student.lastNameEn || '',
        gender: student.gender || '',
        birth_date: student.birthDate ? `${student.birthDate}T00:00:00Z` : undefined,
        blood_type: student.bloodType || '',
        nationality: student.nationality || '',
        ethnicity: student.ethnicity || '',
        religion: student.religion || '',
        birth_province: student.birthProvince || '',
        house_number: student.houseNumber || '',
        village_no: student.villageNo || '',
        road: student.road || '',
        sub_district: student.subDistrict || '',
        district: student.district || '',
        province: student.province || '',
        postal_code: student.postalCode || '',
        current_phone: student.currentPhone || student.phone || '',
        weight: student.weight || undefined,
        height: student.height || undefined,
        distance_paved_road: student.distancePavedRoad || undefined,
        distance_unpaved_road: student.distanceUnpavedRoad || undefined,
        travel_time: student.travelTime || undefined,
        travel_method: student.travelMethod || '',
        father_title: student.fatherTitle || '',
        father_first_name: student.fatherFirstName || student.fatherName || '',
        father_last_name: student.fatherLastName || '',
        father_occupation: student.fatherOccupation || '',
        father_monthly_income: student.fatherMonthlyIncome || undefined,
        father_phone: student.fatherPhone || '',
        mother_title: student.motherTitle || '',
        mother_first_name: student.motherFirstName || student.motherName || '',
        mother_last_name: student.motherLastName || '',
        mother_occupation: student.motherOccupation || '',
        mother_monthly_income: student.motherMonthlyIncome || undefined,
        mother_phone: student.motherPhone || '',
        guardian_relationship: student.guardianRelationship || '',
        guardian_title: student.guardianTitle || '',
        guardian_first_name: student.guardianFirstName || '',
        guardian_last_name: student.guardianLastName || '',
        guardian_occupation: student.guardianOccupation || '',
        guardian_monthly_income: student.guardianMonthlyIncome || undefined,
        guardian_phone: student.guardianPhone || '',
        child_order: student.childOrder || undefined,
        older_brothers: student.olderBrothers || 0,
        younger_brothers: student.youngerBrothers || 0,
        older_sisters: student.olderSisters || 0,
        younger_sisters: student.youngerSisters || 0,
        parents_marital_status: student.parentsMaritalStatus || '',
      };

      // ลบ key ที่เป็น undefined ออกเพื่อไม่ให้ JSON.stringify ส่ง null ไป backend
      const payload = Object.fromEntries(
        Object.entries(rawPayload).filter(([, v]) => v !== undefined)
      );

      const response = await personnelAPI.createStudent(payload, token);
      const created = response?.data || response;

      // อัปเดต local state ด้วย id จริงจาก server
      setSchools(prev => prev.map(school => {
        if (school.id !== schoolId) return school;
        return {
          ...school,
          classrooms: school.classrooms.map(cls => {
            if (cls.id !== classroomId) return cls;
            const newStudent = {
              id: created?.id ?? (cls.students.length > 0 ? Math.max(...cls.students.map(s => s.id)) + 1 : 1),
              studentId: created?.student_code ?? student.studentId,
              studentNumber: created?.student_number ?? student.studentNumber ?? null,
              firstNameTh: created?.first_name_th ?? student.firstNameTh,
              lastNameTh: created?.last_name_th ?? student.lastNameTh,
              firstNameEn: created?.first_name_en ?? student.firstNameEn ?? '',
              lastNameEn: created?.last_name_en ?? student.lastNameEn ?? '',
              phone: created?.current_phone ?? student.currentPhone ?? student.phone ?? '',
              address: created?.house_number ?? student.houseNumber ?? '',
              fatherName: created?.father_first_name ?? student.fatherFirstName ?? student.fatherName ?? '',
              motherName: created?.mother_first_name ?? student.motherFirstName ?? student.motherName ?? '',
            };
            return { ...cls, students: [...cls.students, newStudent] };
          }),
        };
      }));
    } catch (error) {
      console.error('Failed to add student:', error);
      throw error;
    }
  };

  const addStudentsBatch = async (schoolId, file, onProgress) => {
    console.log('🚀 addStudentsBatch called with:', {
      schoolId,
      file: file ? { name: file.name, size: file.size } : null,
      hasProgressCallback: !!onProgress
    });

    try {
      const token = await getValidToken();
      console.log('🔑 Token found:', !!token);

      // Call API to upload file to database
      if (token) {
        console.log('📡 Calling personnelAPI.uploadStudentsFile...');
        const result = await personnelAPI.uploadStudentsFile(file, schoolId, token, onProgress);
        console.log('✅ Upload result:', result);
        console.log('✅ Upload result.data:', result.data);

        // แสดงผลลัพธ์การอัพโหลด
        if (result && result.data) {
          const uploadData = result.data;
          console.log('📊 Upload data details:', uploadData);

          const totalRows = uploadData.total_rows || uploadData.TotalRows || 0;
          const successCount = uploadData.imported_rows || uploadData.success_count || uploadData.SuccessCount || 0;
          const failureCount = uploadData.error_rows || uploadData.failure_count || uploadData.FailureCount || 0;
          const duplicateCount = uploadData.duplicate_rows || uploadData.DuplicateRows || 0;
          const errors = uploadData.errors || uploadData.Errors || [];

          console.log('📈 Parsed counts:', { totalRows, successCount, failureCount, duplicateCount, errors });

          let message = `อัพโหลดสำเร็จ ${successCount} คน จาก ${totalRows} คน`;

          if (duplicateCount > 0) {
            message += `\nข้ามข้อมูลซ้ำ: ${duplicateCount} คน`;
          }

          if (failureCount > 0) {
            console.warn('Upload completed with errors:', errors);
            message += `\nข้อผิดพลาด: ${failureCount} คน`;
            if (errors.length > 0) {
              message += `\n\nรายละเอียด:\n${errors.slice(0, 10).join('\n')}`;
              if (errors.length > 10) {
                message += `\n... และอีก ${errors.length - 10} รายการ`;
              }
            }
          }

          alert(message);
        } else {
          console.warn('⚠️ No data in result:', result);
          alert('อัพโหลดเสร็จสิ้น แต่ไม่สามารถแสดงผลลัพธ์ได้');
        }

        // Reload students data from API to update local state
        console.log('🔄 Refreshing students data...');
        await fetchSchoolsData();
      }
    } catch (error) {
      console.error('Failed to upload students file:', error);
      throw error;
    }
  };

  const deleteStudent = async (schoolId, classroomId, studentId, deleteUser = false) => {
    try {
      const token = await getValidToken();
      await personnelAPI.deleteStudent(studentId, token);

      if (deleteUser) {
        try {
          // หา student_code จาก local state เพื่อ lookup user
          const currentSchool = schools.find(s => s.id === schoolId);
          const classroom = currentSchool?.classrooms.find(c => c.id === classroomId);
          const student = classroom?.students.find(s => s.id === studentId);
          const studentCode = student?.studentId;
          if (studentCode) {
            const res = await userAPI.getUsers(token);
            const users = res.data || res;
            const user = users.find(u => u.username === studentCode || u.student_code === studentCode);
            if (user) {
              await userAPI.deleteUser(user.id, token);
            }
          }
        } catch (err) {
          console.warn('ลบ user ไม่สำเร็จ:', err);
        }
      }
    } catch (error) {
      console.error('Failed to delete student:', error);
      throw error;
    }
    setSchools(schools.map(school => {
      if (school.id === schoolId) {
        return {
          ...school,
          classrooms: school.classrooms.map(classroom => {
            if (classroom.id === classroomId) {
              return {
                ...classroom,
                students: classroom.students.filter(s => s.id !== studentId)
              };
            }
            return classroom;
          })
        };
      }
      return school;
    }));
  };

  // updateStudent - แก้ไขข้อมูลนักเรียน (admin/editor)
  // body ใช้ snake_case ตาม backend (เช่น { student_number: 5 })
  const updateStudent = async (schoolId, classroomId, studentId, body) => {
    try {
      const token = await getValidToken();
      await personnelAPI.updateStudent(studentId, body, token);

      // map snake_case (backend) → camelCase (UI) เพื่อ sync local state
      const snakeToCamel = {
        student_number: 'studentNumber',
        first_name_th: 'firstNameTh',
        last_name_th: 'lastNameTh',
        first_name_en: 'firstNameEn',
        last_name_en: 'lastNameEn',
        current_phone: 'phone',
        house_number: 'address',
        father_first_name: 'fatherName',
        mother_first_name: 'motherName',
      };

      setSchools(schools.map(school => {
        if (school.id !== schoolId) return school;
        return {
          ...school,
          classrooms: school.classrooms.map(classroom => {
            if (classroom.id !== classroomId) return classroom;
            return {
              ...classroom,
              students: classroom.students.map(s => {
                if (s.id !== studentId) return s;
                const next = { ...s };
                for (const [snake, camel] of Object.entries(snakeToCamel)) {
                  if (snake in body) next[camel] = body[snake] ?? '';
                }
                return next;
              })
            };
          })
        };
      }));
    } catch (error) {
      console.error('Failed to update student:', error);
      throw error;
    }
  };

  const addTeacher = async (schoolId, teacher) => {
    try {
      const token = await getValidToken();

      // Call API to save teacher to database
      if (token) {
        const response = await personnelAPI.createTeacher(teacher, token);
        console.log('✅ Teacher created:', response);

        if (response.success && response.data) {
          // Transform teacher data to match frontend format
          const transformedTeacher = {
            id: response.data.id,
            teacherId: response.data.teacher_id,
            titleTh: response.data.title_th,
            firstNameTh: response.data.first_name_th,
            lastNameTh: response.data.last_name_th,
            firstNameEn: response.data.first_name_en || '',
            lastNameEn: response.data.last_name_en || '',
            subject: response.data.subject || '',
            address: response.data.address || '',
            phone: response.data.phone || '',
            homeroomClass: response.data.homeroom_class || ''
          };

          // Update local state with transformed teacher data
          setSchools(schools.map(school => {
            if (school.id === schoolId) {
              return {
                ...school,
                teachers: [...school.teachers, transformedTeacher]
              };
            }
            return school;
          }));

          // สร้าง user account ถ้ามี username/password ส่งมา
          if (teacher.username && teacher.password && teacher.email) {
            try {
              await userAPI.createUser({
                username: teacher.username,
                email: teacher.email,
                password: teacher.password,
                role: 'teacher',
                teacher_code: response.data.teacher_code,
                schoolId: String(schoolId),
              }, token);
              alert('บันทึกข้อมูลครูและสร้างบัญชีผู้ใช้สำเร็จ');
            } catch (userErr) {
              alert('บันทึกข้อมูลครูสำเร็จ แต่สร้างบัญชีผู้ใช้ไม่ได้: ' + userErr.message);
            }
          } else {
            alert('บันทึกข้อมูลครูสำเร็จ');
          }
        }
      }
    } catch (error) {
      console.error('Failed to add teacher:', error);
      alert('เกิดข้อผิดพลาดในการบันทึกข้อมูลครู: ' + error.message);
      throw error;
    }
  };

  const updateTeacher = async (schoolId, teacherData) => {
    try {
      const token = await getValidToken();

      // Call API to update teacher in database
      if (token) {
        const response = await personnelAPI.updateTeacher(teacherData.id, teacherData, token);
        console.log('✅ Teacher updated:', response);

        if (response.success && response.data) {
          // Transform teacher data to match frontend format
          const transformedTeacher = {
            id: response.data.id,
            teacherId: response.data.teacher_id,
            titleTh: response.data.title_th,
            firstNameTh: response.data.first_name_th,
            lastNameTh: response.data.last_name_th,
            firstNameEn: response.data.first_name_en || '',
            lastNameEn: response.data.last_name_en || '',
            subject: response.data.subject || '',
            address: response.data.address || '',
            phone: response.data.phone || '',
            homeroomClass: response.data.homeroom_class || ''
          };

          // Update local state with transformed teacher data
          setSchools(schools.map(school => {
            if (school.id === schoolId) {
              return {
                ...school,
                teachers: school.teachers.map(t =>
                  t.id === teacherData.id ? transformedTeacher : t
                )
              };
            }
            return school;
          }));

          alert('อัพเดตข้อมูลครูสำเร็จ');
        }
      }
    } catch (error) {
      console.error('Failed to update teacher:', error);
      alert('เกิดข้อผิดพลาดในการอัพเดตข้อมูลครู: ' + error.message);
      throw error;
    }
  };

  const deleteTeacher = async (schoolId, teacherId) => {
    try {
      const token = await getValidToken();

      // Call API to delete teacher from database
      if (token) {
        await personnelAPI.deleteTeacher(teacherId, token);
        console.log('✅ Teacher deleted');

        // Update local state
        setSchools(schools.map(school => {
          if (school.id === schoolId) {
            return {
              ...school,
              teachers: school.teachers.filter(t => t.id !== teacherId)
            };
          }
          return school;
        }));

        alert('ลบข้อมูลครูสำเร็จ');
      }
    } catch (error) {
      console.error('Failed to delete teacher:', error);
      alert('เกิดข้อผิดพลาดในการลบข้อมูลครู: ' + error.message);
      throw error;
    }
  };

  const addClassroom = async (schoolId, classroom) => {
    const token = await getValidToken();
    if (!token) throw new Error('No token found');

    // name เช่น "ม.1/1" → grade="ม.1", section="1"
    // ถ้าไม่มี "/" ให้ใช้ name ทั้งหมดเป็น grade และ section เป็นค่าว่าง
    const name = classroom.name || '';
    const slashIdx = name.lastIndexOf('/');
    const grade = slashIdx !== -1 ? name.substring(0, slashIdx).trim() : name.trim();
    const section = slashIdx !== -1 ? name.substring(slashIdx + 1).trim() : '';

    const res = await classAPI.createClass(schoolId, grade, section, token);
    console.log('🏫 createClass res:', res);
    const created = res.data || res;
    console.log('🏫 created:', created);

    setSchools(prev => prev.map(school => {
      if (school.id === schoolId) {
        return {
          ...school,
          classrooms: [...school.classrooms, {
            id: created.id,
            name: created.section ? `${created.grade}/${created.section}` : created.grade,
            grade: created.grade,
            section: created.section,
            students: [],
          }],
        };
      }
      return school;
    }));

    return created;
  };

  const deleteClassroom = async (schoolId, classroomId, force = false) => {
    const token = await getValidToken();
    if (token) {
      await classAPI.deleteClass(classroomId, token, force);
    }
    setSchools(schools.map(school => {
      if (school.id === schoolId) {
        return { ...school, classrooms: school.classrooms.filter(c => c.id !== classroomId) };
      }
      return school;
    }));
  };

  const updateClassroom = async (schoolId, classroomId, updatedData) => {
    try {
      const token = await getValidToken();
      // parse name → grade/section (เหมือน addClassroom)
      const name = updatedData.name || '';
      const slashIdx = name.lastIndexOf('/');
      const grade = slashIdx !== -1 ? name.substring(0, slashIdx).trim() : name.trim();
      const section = slashIdx !== -1 ? name.substring(slashIdx + 1).trim() : '';
      await classAPI.updateClass(classroomId, grade, section, token);
      setSchools(prev => prev.map(school => {
        if (school.id !== schoolId) return school;
        return {
          ...school,
          classrooms: school.classrooms.map(classroom => {
            if (classroom.id !== classroomId) return classroom;
            return {
              ...classroom,
              grade,
              section,
              name: section ? `${grade}/${section}` : grade,
              ...updatedData,
            };
          }),
        };
      }));
    } catch (error) {
      console.error('Failed to update classroom:', error);
      throw error;
    }
  };

  return (
    <SchoolContext.Provider value={{
      schools,
      selectedSchoolId,
      setSelectedSchoolId,
      addSchool,
      deleteSchool,
      addStudent,
      addStudentsBatch,
      updateStudent,
      deleteStudent,
      addTeacher,
      updateTeacher,
      deleteTeacher,
      addClassroom,
      updateClassroom,
      updateSchool,
      deleteClassroom
    }}>
      {children}
    </SchoolContext.Provider>
  );
};

export const useSchool = () => {
  const context = useContext(SchoolContext);
  if (!context) {
    throw new Error('useSchool must be used within SchoolProvider');
  }
  return context;
};
