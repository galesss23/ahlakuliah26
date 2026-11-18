
import { StudentRecord, AppSettings, SubjectItem, UserData, UserRole, ExamType, LearningMaterial, ForumMessage, Assignment, AssignmentSubmission, Question } from '../types';
import { supabase } from './supabase';

export const DEFAULT_SETTINGS: AppSettings = {
  appName: 'Emye Edu - CBT',
  logoUrl: 'https://i.ibb.co/8DhkQrJw/Whats-App-Image-2026-02-23-at-21-18-19.jpg',
  backgroundUrl: 'https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?q=80&w=2670&auto=format&fit=crop'
};

const LOCAL_STORAGE_KEY = 'cbt_exam_results';
const SETTINGS_KEY = 'cbt_app_settings';
const SUBJECTS_KEY = 'cbt_subjects';
const USERS_KEY = 'cbt_users';
const SUBMISSIONS_KEY = 'cbt_submissions';

let isSyncing = false;
let supabaseDisabled = false;

const getLocal = <T>(key: string): T[] => {
    try {
        const s = localStorage.getItem(key);
        return s ? JSON.parse(s) : [];
    } catch (e) { return []; }
};
const setLocal = (key: string, data: any) => {
    try {
        localStorage.setItem(key, JSON.stringify(data));
    } catch (e) {
        console.error("Local Storage Error:", e);
    }
};

export const isCloudActive = () => {
    return !!supabase && !supabaseDisabled;
};

const handleSupabaseError = (error: any) => {
    const errorMsg = error?.message || (typeof error === 'string' ? error : "");
    const errorCode = error?.code || "";
    
    // Check if network error, connection error, DNS issue, or critical auth/table error
    const isOfflineOrCritical = 
        !errorMsg ||
        errorMsg.includes('Failed to fetch') ||
        errorMsg.includes('NetworkError') ||
        errorMsg.includes('TypeError') ||
        errorMsg.includes('Load failed') ||
        errorMsg.includes('AbortError') ||
        errorMsg.includes('ERR_NAME_NOT_RESOLVED') ||
        errorMsg.includes('Invalid API key') ||
        errorMsg.includes('relation') || // Table not found
        error?.status === 401 ||
        error?.status === 403 ||
        error?.status === 404;

    if (isOfflineOrCritical) {
        if (!supabaseDisabled) {
            console.warn(`[CBT Storage] Cloud offline/tidak terjangkau (${errorMsg || errorCode || 'Network'}). Beralih otomatis ke Mode Lokal.`);
            supabaseDisabled = true;
        }
    } else {
        console.warn(`[CBT Storage] Catatan Supabase (${errorCode}): ${errorMsg}`);
    }
};

export const fetchSubjects = async (): Promise<SubjectItem[]> => {
    if (isCloudActive()) {
        try {
            const { data, error } = await supabase.from('subjects').select('*');
            if (error) {
                handleSupabaseError(error);
            } else if (data) {
                const normalized = data.map((s: any) => ({
                    id: s.id,
                    name: s.name,
                    code: s.code,
                    isActive: s.is_active ?? s.isActive,
                    lecturerId: s.lecturer_id ?? s.lecturerId,
                    duration: s.duration,
                    assignments: Array.isArray(s.assignments) ? s.assignments : [],
                    materials: Array.isArray(s.materials) ? s.materials : [],
                    questions: Array.isArray(s.questions) ? s.questions : []
                }));
                setLocal(SUBJECTS_KEY, normalized);
                return normalized;
            }
        } catch (e) { handleSupabaseError(e); }
    }
    return getLocal<SubjectItem>(SUBJECTS_KEY);
};

export const updateSubjectQuestions = async (subjectId: string, questions: Question[]) => {
    const list = getLocal<SubjectItem>(SUBJECTS_KEY);
    const index = list.findIndex(s => s.id === subjectId);
    if (index !== -1) {
        list[index].questions = questions;
        setLocal(SUBJECTS_KEY, list);
    }

    if (isCloudActive()) {
        try {
            const { error } = await supabase.from('subjects').update({ questions }).eq('id', subjectId);
            if (error) handleSupabaseError(error);
        } catch (e) { handleSupabaseError(e); }
    }
};

export const addSubject = async (name: string, code: string, extra: Partial<SubjectItem>) => {
    const newItem: SubjectItem = {
        id: `sub-${Date.now()}`,
        name,
        code,
        isActive: true,
        lecturerId: extra.lecturerId || null, 
        duration: extra.duration || 60,
        ...extra
    };
    
    const list = getLocal<SubjectItem>(SUBJECTS_KEY);
    list.push(newItem);
    setLocal(SUBJECTS_KEY, list);

    if (isCloudActive()) {
        try {
            const { error } = await supabase.from('subjects').insert({
                id: newItem.id,
                name: newItem.name,
                code: newItem.code,
                is_active: newItem.isActive,
                lecturer_id: newItem.lecturerId,
                duration: newItem.duration,
                materials: newItem.materials || [],
                assignments: newItem.assignments || [],
                questions: newItem.questions || []
            });
            if (error) handleSupabaseError(error);
        } catch (e) { handleSupabaseError(e); }
    }
    return newItem;
};

export const deleteSubject = async (id: string) => {
    const list = getLocal<SubjectItem>(SUBJECTS_KEY);
    setLocal(SUBJECTS_KEY, list.filter(s => s.id !== id));
    if (isCloudActive()) {
        try {
            const { error } = await supabase.from('subjects').delete().eq('id', id);
            if (error) handleSupabaseError(error);
        } catch (e) { handleSupabaseError(e); }
    }
};

export const addMaterialToSubject = async (subjectId: string, material: Omit<LearningMaterial, 'id' | 'createdAt'>) => {
    const newMaterial: LearningMaterial = {
        id: `mat-${Date.now()}`,
        ...material,
        createdAt: new Date().toISOString()
    };

    const list = getLocal<SubjectItem>(SUBJECTS_KEY);
    const index = list.findIndex(s => s.id === subjectId);
    if (index !== -1) {
        if (!list[index].materials) list[index].materials = [];
        list[index].materials!.push(newMaterial);
        setLocal(SUBJECTS_KEY, list);
    }

    if (isCloudActive()) {
        try {
            // Fetch current subject to get existing materials
            const { data: sub } = await supabase.from('subjects').select('materials').eq('id', subjectId).single();
            const existingMaterials = sub?.materials || [];
            const updatedMaterials = [...existingMaterials, newMaterial];
            
            const { error } = await supabase.from('subjects').update({ materials: updatedMaterials }).eq('id', subjectId);
            if (error) handleSupabaseError(error);
        } catch (e) { handleSupabaseError(e); }
    }
    return newMaterial;
};

export const fetchForumMessages = async (subjectId: string): Promise<ForumMessage[]> => {
    if (isCloudActive()) {
        try {
            const { data, error } = await supabase
                .from('forum_messages')
                .select('*')
                .eq('subject_id', subjectId)
                .order('timestamp', { ascending: true });
            
            if (error) {
                handleSupabaseError(error);
            } else if (data) {
                return data.map((m: any) => ({
                    id: m.id,
                    userId: m.user_id,
                    userName: m.user_name,
                    userRole: m.user_role,
                    text: m.text,
                    timestamp: m.timestamp
                }));
            }
        } catch (e) { handleSupabaseError(e); }
    }
    
    // Fallback to local subjects data if cloud fails
    const list = getLocal<SubjectItem>(SUBJECTS_KEY);
    const sub = list.find(s => s.id === subjectId);
    return sub?.forum || [];
};

export const addForumMessage = async (subjectId: string, message: Omit<ForumMessage, 'id' | 'timestamp'>) => {
    const newMessage: ForumMessage = {
        id: `msg-${Date.now()}`,
        ...message,
        timestamp: new Date().toISOString()
    };

    // Update local storage for offline support
    const list = getLocal<SubjectItem>(SUBJECTS_KEY);
    const index = list.findIndex(s => s.id === subjectId);
    if (index !== -1) {
        if (!list[index].forum) list[index].forum = [];
        list[index].forum!.push(newMessage);
        setLocal(SUBJECTS_KEY, list);
    }

    if (isCloudActive()) {
        try {
            const { error } = await supabase.from('forum_messages').insert({
                id: newMessage.id,
                subject_id: subjectId,
                user_id: newMessage.userId,
                user_name: newMessage.userName,
                user_role: newMessage.userRole,
                text: newMessage.text,
                timestamp: newMessage.timestamp
            });
            if (error) handleSupabaseError(error);
        } catch (e) { handleSupabaseError(e); }
    }
    return newMessage;
};

export const deleteMaterialFromSubject = async (subjectId: string, materialId: string) => {
    const list = getLocal<SubjectItem>(SUBJECTS_KEY);
    const index = list.findIndex(s => s.id === subjectId);
    if (index !== -1 && list[index].materials) {
        list[index].materials = list[index].materials!.filter(m => m.id !== materialId);
        setLocal(SUBJECTS_KEY, list);
    }

    if (isCloudActive()) {
        try {
            const { data: sub } = await supabase.from('subjects').select('materials').eq('id', subjectId).single();
            const existingMaterials = sub?.materials || [];
            const updatedMaterials = existingMaterials.filter((m: any) => m.id !== materialId);
            
            const { error } = await supabase.from('subjects').update({ materials: updatedMaterials }).eq('id', subjectId);
            if (error) handleSupabaseError(error);
        } catch (e) { handleSupabaseError(e); }
    }
};

export const addAssignmentToSubject = async (subjectId: string, assignment: Omit<Assignment, 'id' | 'createdAt'>) => {
    const newAssignment: Assignment = {
        id: `asg-${Date.now()}`,
        ...assignment,
        createdAt: new Date().toISOString()
    };

    const list = getLocal<SubjectItem>(SUBJECTS_KEY);
    const index = list.findIndex(s => s.id === subjectId);
    if (index !== -1) {
        if (!list[index].assignments) list[index].assignments = [];
        list[index].assignments!.push(newAssignment);
        setLocal(SUBJECTS_KEY, list);
    }

    if (isCloudActive()) {
        try {
            const { data: sub } = await supabase.from('subjects').select('assignments').eq('id', subjectId).single();
            const existing = sub?.assignments || [];
            const updated = [...existing, newAssignment];
            const { error } = await supabase.from('subjects').update({ assignments: updated }).eq('id', subjectId);
            if (error) handleSupabaseError(error);
        } catch (e) { handleSupabaseError(e); }
    }
    return newAssignment;
};

export const deleteAssignmentFromSubject = async (subjectId: string, assignmentId: string) => {
    const list = getLocal<SubjectItem>(SUBJECTS_KEY);
    const index = list.findIndex(s => s.id === subjectId);
    if (index !== -1 && list[index].assignments) {
        list[index].assignments = list[index].assignments!.filter(a => a.id !== assignmentId);
        setLocal(SUBJECTS_KEY, list);
    }

    if (isCloudActive()) {
        try {
            const { data: sub } = await supabase.from('subjects').select('assignments').eq('id', subjectId).single();
            const existing = sub?.assignments || [];
            const updated = existing.filter((a: any) => a.id !== assignmentId);
            const { error } = await supabase.from('subjects').update({ assignments: updated }).eq('id', subjectId);
            if (error) handleSupabaseError(error);
        } catch (e) { handleSupabaseError(e); }
    }
};

export const updateAssignmentInSubject = async (subjectId: string, assignmentId: string, updates: Partial<Assignment>) => {
    const list = getLocal<SubjectItem>(SUBJECTS_KEY);
    const index = list.findIndex(s => s.id === subjectId);
    if (index !== -1 && list[index].assignments) {
        const asgIndex = list[index].assignments!.findIndex(a => a.id === assignmentId);
        if (asgIndex !== -1) {
            list[index].assignments![asgIndex] = { ...list[index].assignments![asgIndex], ...updates };
            setLocal(SUBJECTS_KEY, list);
        }
    }

    if (isCloudActive()) {
        try {
            const { data: sub } = await supabase.from('subjects').select('assignments').eq('id', subjectId).single();
            const existing = sub?.assignments || [];
            const updated = existing.map((a: any) => a.id === assignmentId ? { ...a, ...updates } : a);
            const { error } = await supabase.from('subjects').update({ assignments: updated }).eq('id', subjectId);
            if (error) handleSupabaseError(error);
        } catch (e) { handleSupabaseError(e); }
    }
};

export const fetchSubmissions = async (assignmentId?: string): Promise<AssignmentSubmission[]> => {
    if (isCloudActive()) {
        try {
            let query = supabase.from('submissions').select('*');
            if (assignmentId) query = query.eq('assignment_id', assignmentId);
            const { data, error } = await query;
            if (error) {
                handleSupabaseError(error);
            } else if (data) {
                const mapped = data.map((s: any) => ({
                    id: s.id,
                    assignmentId: s.assignment_id,
                    studentId: s.student_id,
                    studentName: s.student_name,
                    studentNim: s.student_nim,
                    content: s.content,
                    fileName: s.file_name,
                    submittedAt: s.submitted_at,
                    grade: s.grade,
                    feedback: s.feedback
                }));
                setLocal(SUBMISSIONS_KEY, mapped);
                return mapped;
            }
        } catch (e) { handleSupabaseError(e); }
    }
    const all = getLocal<AssignmentSubmission>(SUBMISSIONS_KEY);
    return assignmentId ? all.filter(s => s.assignmentId === assignmentId) : all;
};

export const submitAssignment = async (submission: Omit<AssignmentSubmission, 'id' | 'submittedAt'>) => {
    const list = getLocal<AssignmentSubmission>(SUBMISSIONS_KEY);
    const existingIndex = list.findIndex(s => s.assignmentId === submission.assignmentId && s.studentId === submission.studentId);
    
    let result: AssignmentSubmission;

    if (existingIndex !== -1) {
        // Edit existing
        list[existingIndex] = { 
            ...list[existingIndex], 
            ...submission, 
            submittedAt: new Date().toISOString() 
        };
        result = list[existingIndex];
        setLocal(SUBMISSIONS_KEY, list);

        if (isCloudActive()) {
            try {
                const { error } = await supabase.from('submissions').update({
                    content: submission.content,
                    file_name: submission.fileName,
                    submitted_at: result.submittedAt
                }).eq('id', result.id);
                if (error) handleSupabaseError(error);
            } catch (e) { handleSupabaseError(e); }
        }
    } else {
        // Create new
        const newSubmission: AssignmentSubmission = {
            id: `subm-${Date.now()}`,
            ...submission,
            submittedAt: new Date().toISOString()
        };
        list.push(newSubmission);
        result = newSubmission;
        setLocal(SUBMISSIONS_KEY, list);

        if (isCloudActive()) {
            try {
            const { error } = await supabase.from('submissions').insert({
                id: newSubmission.id,
                assignment_id: newSubmission.assignmentId,
                student_id: newSubmission.studentId,
                student_name: newSubmission.studentName,
                student_nim: newSubmission.studentNim,
                content: newSubmission.content,
                file_name: newSubmission.fileName,
                submitted_at: newSubmission.submittedAt
            });
                if (error) handleSupabaseError(error);
            } catch (e) { handleSupabaseError(e); }
        }
    }
    return result;
};

export const deleteSubmission = async (submissionId: string) => {
    const list = getLocal<AssignmentSubmission>(SUBMISSIONS_KEY);
    setLocal(SUBMISSIONS_KEY, list.filter(s => s.id !== submissionId));

    if (isCloudActive()) {
        try {
            const { error } = await supabase.from('submissions').delete().eq('id', submissionId);
            if (error) handleSupabaseError(error);
        } catch (e) { handleSupabaseError(e); }
    }
};

export const gradeSubmission = async (submissionId: string, grade: number, feedback: string) => {
    const list = getLocal<AssignmentSubmission>(SUBMISSIONS_KEY);
    const index = list.findIndex(s => s.id === submissionId);
    if (index !== -1) {
        list[index].grade = grade;
        list[index].feedback = feedback;
        setLocal(SUBMISSIONS_KEY, list);
    }

    if (isCloudActive()) {
        try {
            const { error } = await supabase.from('submissions').update({ grade, feedback }).eq('id', submissionId);
            if (error) handleSupabaseError(error);
        } catch (e) { handleSupabaseError(e); }
    }
};

export const fetchUsers = async (): Promise<UserData[]> => {
    if (isCloudActive()) {
        try {
            const { data, error } = await supabase.from('users').select('*');
            if (error) {
                handleSupabaseError(error);
            } else if (data) {
                const normalized = data.map((u: any) => ({
                    id: u.id,
                    username: u.username,
                    password: u.password,
                    fullName: u.full_name ?? u.fullName ?? u.fullname,
                    role: u.role,
                    className: u.class_name ?? u.className ?? u.classname,
                    followedSubjectIds: Array.isArray(u.followed_subject_ids) ? u.followed_subject_ids : (Array.isArray(u.followedSubjectIds) ? u.followedSubjectIds : []),
                    whatsapp: u.whatsapp ?? u.wa_number ?? "",
                    createdAt: u.created_at ?? u.createdAt ?? u.createdat
                }));
                setLocal(USERS_KEY, normalized);
                return normalized;
            }
        } catch (e) { handleSupabaseError(e); }
    }
    return getLocal<UserData>(USERS_KEY);
};

export const addUser = async (user: Omit<UserData, 'id' | 'createdAt'>): Promise<UserData> => {
    const newUser: UserData = {
        id: `u-${Date.now()}`,
        ...user,
        createdAt: new Date().toISOString()
    };

    const list = getLocal<UserData>(USERS_KEY);
    list.push(newUser);
    setLocal(USERS_KEY, list);

    if (isCloudActive()) {
        try {
            const { error } = await supabase.from('users').insert({
                id: newUser.id,
                username: newUser.username,
                password: newUser.password,
                full_name: newUser.fullName,
                role: newUser.role,
                class_name: newUser.className,
                followed_subject_ids: newUser.followedSubjectIds || [],
                whatsapp: newUser.whatsapp || "",
                created_at: newUser.createdAt
            });
            if (error) handleSupabaseError(error);
        } catch (e) { handleSupabaseError(e); }
    }
    return newUser;
};

export const deleteUser = async (id: string) => {
    const list = getLocal<UserData>(USERS_KEY);
    setLocal(USERS_KEY, list.filter(u => u.id !== id));
    if (isCloudActive()) {
        try {
            const { error } = await supabase.from('users').delete().eq('id', id);
            if (error) handleSupabaseError(error);
        } catch (e) { handleSupabaseError(e); }
    }
};

export const updateUser = async (id: string, updates: Partial<UserData>) => {
    const list = getLocal<UserData>(USERS_KEY);
    const index = list.findIndex(u => u.id === id);
    if (index !== -1) {
        list[index] = { ...list[index], ...updates };
        setLocal(USERS_KEY, list);
    }

    if (isCloudActive()) {
        try {
            const dbUpdates: any = {};
            if (updates.username) dbUpdates.username = updates.username;
            if (updates.password) dbUpdates.password = updates.password;
            if (updates.fullName) dbUpdates.full_name = updates.fullName;
            if (updates.role) dbUpdates.role = updates.role;
            if (updates.className) dbUpdates.class_name = updates.className;
            if (updates.followedSubjectIds) dbUpdates.followed_subject_ids = updates.followedSubjectIds;
            if (updates.whatsapp !== undefined) dbUpdates.whatsapp = updates.whatsapp;
            if (updates.createdAt) dbUpdates.created_at = updates.createdAt;

            console.log("Saving user updates to Supabase:", dbUpdates);
            const { error } = await supabase.from('users').update(dbUpdates).eq('id', id);
            if (error) {
                console.warn("Update user di Supabase terkendala:", error);
                handleSupabaseError(error);
            } else {
                console.log("Successfully updated user in Supabase");
            }
        } catch (e) { handleSupabaseError(e); }
    }
};

export const getResults = async (): Promise<StudentRecord[]> => {
    if (isCloudActive()) {
        try {
            const { data, error } = await supabase.from('exam_results').select('*');
            if (error) {
                handleSupabaseError(error);
            } else if (data) {
                const normalized = data.map((r: any) => ({
                    id: r.id,
                    studentId: r.studentId ?? r.student_id,
                    studentName: r.studentName ?? r.student_name ?? r.name,
                    studentNim: r.studentNim ?? r.student_nim ?? r.nim,
                    name: r.studentName ?? r.studentName ?? r.name ?? r.student_name,
                    nim: r.studentNim ?? r.student_nim ?? r.nim ?? r.student_nim,
                    subject: r.subject,
                    examType: r.examType ?? r.exam_type,
                    score: r.score,
                    totalQuestions: r.totalQuestions ?? r.total_questions,
                    correctAnswers: r.correctAnswers ?? r.correct_answers,
                    startTime: r.startTime ?? r.start_time,
                    endTime: r.endTime ?? r.end_time,
                    timestamp: r.endTime ?? r.end_time ?? r.created_at ?? r.timestamp,
                    violations: r.violations,
                    snapshot: r.snapshot
                }));
                setLocal(LOCAL_STORAGE_KEY, normalized);
                return normalized;
            }
        } catch (e) { handleSupabaseError(e); }
    }
    return getLocal<StudentRecord>(LOCAL_STORAGE_KEY);
};

export const saveResult = async (record: StudentRecord) => {
    // Add compatibility fields for components still using them
    if (!record.name) record.name = record.studentName;
    if (!record.nim) record.nim = record.studentNim;
    if (!record.timestamp) record.timestamp = record.endTime || record.startTime;

    const list = getLocal<StudentRecord>(LOCAL_STORAGE_KEY);
    list.push(record);
    setLocal(LOCAL_STORAGE_KEY, list);

    if (isCloudActive()) {
        try {
            const { error } = await supabase.from('exam_results').insert({
                id: record.id,
                student_id: record.studentId,
                student_name: record.studentName,
                student_nim: record.studentNim,
                name: record.studentName,
                nim: record.studentNim,
                subject: record.subject,
                examType: record.examType || 'Ujian',
                score: record.score || 0,
                totalQuestions: record.totalQuestions || 0,
                correct_answers: record.correctAnswers || 0,
                start_time: record.startTime || new Date().toISOString(),
                end_time: record.endTime || new Date().toISOString(),
                timestamp: record.timestamp || record.endTime || record.startTime || new Date().toISOString(),
                violations: record.violations,
                snapshot: record.snapshot
            });
            if (error) handleSupabaseError(error);
        } catch (e) { handleSupabaseError(e); }
    }
};

export const deleteResult = async (id: string) => {
    const list = getLocal<StudentRecord>(LOCAL_STORAGE_KEY);
    setLocal(LOCAL_STORAGE_KEY, list.filter(r => r.id !== id));
    if (isCloudActive()) {
        try {
            const { error } = await supabase.from('exam_results').delete().eq('id', id);
            if (error) handleSupabaseError(error);
        } catch (e) { handleSupabaseError(e); }
    }
};

export const deleteAllResults = async () => {
    setLocal(LOCAL_STORAGE_KEY, []);
    if (isCloudActive()) {
        try {
            // Delete all records from exam_results
            const { error } = await supabase.from('exam_results').delete().neq('id', 'placeholder-non-existent-id');
            if (error) handleSupabaseError(error);
        } catch (e) { handleSupabaseError(e); }
    }
};

export const fetchAppSettings = async (): Promise<AppSettings> => {
    if (isCloudActive()) {
        try {
            const { data, error } = await supabase.from('settings').select('*').single();
            if (data) {
                const normalized: AppSettings = {
                    appName: data.app_name || data.appName || data.appname || DEFAULT_SETTINGS.appName,
                    logoUrl: data.logo_url || data.logoUrl || data.logourl || DEFAULT_SETTINGS.logoUrl,
                    backgroundUrl: data.background_url || data.backgroundUrl || data.backgroundurl,
                    runningText: data.running_text || data.runningText || data.runningtext,
                    footerText: data.footer_text || data.footerText || data.footertext,
                    ogImageUrl: data.og_image_url || data.ogImageUrl || data.ogimageurl
                };
                setLocal(SETTINGS_KEY, normalized);
                return normalized;
            }
        } catch (e) {}
    }

    const cached = localStorage.getItem(SETTINGS_KEY);
    if (cached) return JSON.parse(cached);
    
    return DEFAULT_SETTINGS;
};

export const saveAppSettings = async (settings: AppSettings) => {
    try {
        setLocal(SETTINGS_KEY, settings);
    } catch (e) {
        if (e instanceof Error && e.name === 'QuotaExceededError') {
            alert("Gagal menyimpan: Memori penyimpanan penuh. Coba gunakan gambar logo yang lebih kecil.");
        }
        console.error("Storage error:", e);
    }
    
    if (isCloudActive()) {
        try {
            const { error } = await supabase.from('settings').upsert({ 
                id: 1, 
                app_name: settings.appName,
                logo_url: settings.logoUrl,
                background_url: settings.backgroundUrl,
                running_text: settings.runningText,
                footer_text: settings.footerText,
                og_image_url: settings.ogImageUrl
            });
            if (error) {
                console.warn("Supabase Settings warning:", error);
                handleSupabaseError(error);
            }
        } catch (e) { 
            console.warn("Supabase Settings catch:", e);
            handleSupabaseError(e); 
        }
    }
};

export const syncPendingData = async () => {
    if (!isCloudActive() || isSyncing) return;
    isSyncing = true;
    try {
        const localResults = getLocal<StudentRecord>(LOCAL_STORAGE_KEY);
        if (localResults.length > 0) {
            const mappedResults = localResults.map(r => ({
                id: r.id,
                student_id: r.studentId,
                student_name: r.studentName,
                student_nim: r.studentNim,
                name: r.studentName,
                nim: r.studentNim,
                subject: r.subject,
                examType: r.examType || 'Ujian',
                score: r.score || 0,
                totalQuestions: r.totalQuestions || 0,
                correct_answers: r.correctAnswers || 0,
                start_time: r.startTime || new Date().toISOString(),
                end_time: r.endTime || new Date().toISOString(),
                timestamp: r.timestamp || r.endTime || r.startTime || new Date().toISOString(),
                violations: r.violations,
                snapshot: r.snapshot
            }));
            const { error } = await supabase.from('exam_results').upsert(mappedResults);
            if (error) handleSupabaseError(error);
        }
    } catch (err) {
        handleSupabaseError(err);
    } finally { isSyncing = false; }
};
