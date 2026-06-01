-- Supabase Schema for SheetViewer (Integrated Edition)
-- 모든 생성 구문은 IF NOT EXISTS를 사용하여 기존 데이터를 안전하게 보호합니다.

-- 0. 확장 기능 활성화 (UUID 생성용)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Create schedules table (평일 집회 계획표)
CREATE TABLE IF NOT EXISTS public.schedules (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    category TEXT NOT NULL,       -- 분류 (top, treasures, ministry, living, sunday)
    week_date TEXT NOT NULL,      -- 주차 (예: '4월 13-19일')
    part_num TEXT,                -- 항목 (예: '1', '2', '3', '사회자 및 시작 기도')
    content TEXT,                 -- 내용 (예: '예수께서는...', '성경 낭독', '(55) 하느님 앞에서...')
    duration TEXT,                -- 시간 (예: '(10분)')
    assignee_1 TEXT,              -- 배정자1 (예: '홍길동') 
    assignee_2 TEXT,              -- 배정자2
    sheet_type TEXT,              -- '평일집회' 등
    sort_order INTEGER, 
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
ALTER TABLE public.schedules DISABLE ROW LEVEL SECURITY;

-- 2. Create publishers table (전도인 명단 및 권한)
CREATE TABLE IF NOT EXISTS public.publishers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT UNIQUE NOT NULL,
    gender TEXT,                  -- 성별
    birth_year INTEGER,           -- 출생연도 (구 나이)
    can_chairman BOOLEAN DEFAULT FALSE, -- 집회 사회 가능 여부
    can_reading BOOLEAN DEFAULT FALSE,  -- 성경 낭독 가능 여부
    can_field_service BOOLEAN DEFAULT FALSE, -- 실연 가능 여부
    can_talk BOOLEAN DEFAULT FALSE,       -- 공개 강연 가능 여부
    can_bible_study BOOLEAN DEFAULT FALSE,   -- 성서 연구 가능 여부
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
ALTER TABLE public.publishers DISABLE ROW LEVEL SECURITY;

-- 3. Create assignment_history table (배정 이력 추적)
CREATE TABLE IF NOT EXISTS public.assignment_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    publisher_name TEXT NOT NULL,
    task_type TEXT NOT NULL, -- 'chairman', 'reading', 'speaker' 등
    meeting_date DATE NOT NULL,
    partner_name TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
ALTER TABLE public.assignment_history DISABLE ROW LEVEL SECURITY;

-- 4. Create public_talk_outlines table (공개 강연 골자 명단)
CREATE TABLE IF NOT EXISTS public.public_talk_outlines (
    outline_no TEXT PRIMARY KEY,
    topic TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
ALTER TABLE public.public_talk_outlines DISABLE ROW LEVEL SECURITY;

-- 5. Create public_talks table (주말 집회 계획표)
CREATE TABLE IF NOT EXISTS public.public_talks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    meeting_date DATE NOT NULL UNIQUE,
    outline_no TEXT REFERENCES public.public_talk_outlines(outline_no),
    topic TEXT,                   -- 골자 외 커스텀 주제가 필요한 경우
    speaker TEXT,
    congregation TEXT,
    speaker_contact TEXT,         -- 연사 연락처
    inviter TEXT,                 -- 초대자
    chairman TEXT,
    reader TEXT,
    bible_reader TEXT,            -- 낭독자 성함
    prayer TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
ALTER TABLE public.public_talks DISABLE ROW LEVEL SECURITY;

-- 기존 테이블이 존재할 때 누락된 컬럼 안전하게 추가
ALTER TABLE public.publishers ADD COLUMN IF NOT EXISTS can_talk BOOLEAN DEFAULT FALSE;
ALTER TABLE public.public_talks ADD COLUMN IF NOT EXISTS speaker_contact TEXT;
ALTER TABLE public.public_talks ADD COLUMN IF NOT EXISTS inviter TEXT;
ALTER TABLE public.public_talks ADD COLUMN IF NOT EXISTS bible_reader TEXT;

-- 6. Create admin_users table (관리자 계정)
CREATE TABLE IF NOT EXISTS public.admin_users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    username TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    role TEXT,
    can_manage_weekday BOOLEAN DEFAULT TRUE,
    can_manage_weekend BOOLEAN DEFAULT TRUE
);
ALTER TABLE public.admin_users DISABLE ROW LEVEL SECURITY;

-- 초기 관리자 계정 생성 (이미 존재하는 경우 무시)
INSERT INTO public.admin_users (username, password, role) 
VALUES ('관리자', '1234', 'superadmin') 
ON CONFLICT (username) DO NOTHING;

-- 7. Create navigation_links table (상단 탭 버튼 관리)
CREATE TABLE IF NOT EXISTS public.navigation_links (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    label TEXT NOT NULL,         -- 버튼명 (예: '목요일')
    type TEXT NOT NULL,          -- 'internal' (시트전환) 또는 'external' (외부링크)
    target TEXT NOT NULL,        -- 대상 (시트명 '평일집회' 또는 URL)
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
ALTER TABLE public.navigation_links DISABLE ROW LEVEL SECURITY;

-- 8. Create app_settings table (전역 설정 관리)
CREATE TABLE IF NOT EXISTS public.app_settings (
    key TEXT PRIMARY KEY,
    value TEXT,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
ALTER TABLE public.app_settings DISABLE ROW LEVEL SECURITY;

-- 초기 설정값 생성 (이미 존재하는 경우 무시)
INSERT INTO public.app_settings (key, value) 
VALUES ('congregation_name', '춘천수어집단')
ON CONFLICT (key) DO NOTHING;
