const defaultUrl = typeof SUPABASE_CONFIG !== 'undefined' ? SUPABASE_CONFIG.SUPABASE_URL : 'https://sppgggjhslaxecoopnfn.supabase.co';
const defaultKey = typeof SUPABASE_CONFIG !== 'undefined' ? SUPABASE_CONFIG.SUPABASE_KEY : 'sb_publishable_wxGXxpaOyrmaD9r19E7rTw_4Beazi_A';

let defaultSupabaseClient = null;
if (window.supabase) {
    defaultSupabaseClient = window.supabase.createClient(defaultUrl, defaultKey);
}

const CUSTOM_SUPABASE_URL = localStorage.getItem('CUSTOM_SUPABASE_URL') || sessionStorage.getItem('SESSION_SUPABASE_URL');
const CUSTOM_SUPABASE_KEY = localStorage.getItem('CUSTOM_SUPABASE_KEY') || sessionStorage.getItem('SESSION_SUPABASE_KEY');

const APP_CONFIG = {
    SUPABASE_URL: CUSTOM_SUPABASE_URL || defaultUrl,
    SUPABASE_KEY: CUSTOM_SUPABASE_KEY || defaultKey,
    DEFAULT_RANGE: '평일집회',
    ALLOWED_SHEETS: ['평일집회', 'Ko계획표']
};

let supabaseClient = null;
if (window.supabase) {
    supabaseClient = window.supabase.createClient(APP_CONFIG.SUPABASE_URL, APP_CONFIG.SUPABASE_KEY);
}

// 헬퍼 함수: URL 파라미터 또는 세션 저장소를 확인하여 custom database 연결 정보 적용
async function checkAndApplyCustomDatabase() {
    const urlParams = new URLSearchParams(window.location.search);
    const dbParam = urlParams.get('db') || urlParams.get('cong');
    
    if (dbParam && defaultSupabaseClient) {
        try {
            console.log('[CustomDB] URL 파라미터 감지:', dbParam);
            const { data, error } = await defaultSupabaseClient
                .from('database_connections')
                .select('supabase_url, supabase_key')
                .eq('username', dbParam.trim())
                .maybeSingle();
                
            if (error) {
                console.error('[CustomDB] 연결 정보 조회 중 오류 발생:', error);
            }
                
            if (data && data.supabase_url && data.supabase_key) {
                console.log('[CustomDB] 커스텀 DB 연결 정보 발견:', data.supabase_url);
                // Active 클라이언트 재설정
                supabaseClient = window.supabase.createClient(data.supabase_url, data.supabase_key);
                APP_CONFIG.SUPABASE_URL = data.supabase_url;
                APP_CONFIG.SUPABASE_KEY = data.supabase_key;
                
                // 세션에 저장하여 세션 유지
                sessionStorage.setItem('SESSION_SUPABASE_URL', data.supabase_url);
                sessionStorage.setItem('SESSION_SUPABASE_KEY', data.supabase_key);
            } else {
                console.warn('[CustomDB] 지정된 ID에 해당하는 커스텀 DB를 찾을 수 없습니다:', dbParam);
            }
        } catch (e) {
            console.error('[CustomDB] 커스텀 DB 적용 중 오류:', e);
        }
    }
}

// HTML 이스케이프 처리 (XSS 방지)
function escapeHtml(text) {
    if (text === undefined || text === null) return '';
    
    const map = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;'
    };
    
    return text.toString().replace(/[&<>"']/g, m => map[m]);
}

// 디바운스 함수 (성능 최적화)
function debounce(func, wait) {
    let timeout;
    return function(...args) {
        const context = this;
        clearTimeout(timeout);
        timeout = setTimeout(() => func.apply(context, args), wait);
    };
}

/**
 * 주차 문자열(예: '5월 4-10일', '5/11-17일')을 시작일과 종료일 객체로 변환
 */
function parseWeekDate(str) {
    if (!str) return null;
    try {
        const today = new Date();
        const year = today.getFullYear();
        
        // 정규화: /를 월로 변경, '일' 제거
        let clean = str.replace(/\//g, '월').replace(/일/g, '').trim();
        
        const parts = clean.split('-');
        if (parts.length < 2) {
            // 범위가 아닌 단일 날짜인 경우 (예: '5월 4')
            const singleMatch = clean.match(/(\d+)월\s*(\d+)/);
            if (!singleMatch) return null;
            const d = new Date(year, parseInt(singleMatch[1]) - 1, parseInt(singleMatch[2]));
            return { start: d, end: d };
        }
        
        const startPart = parts[0].trim();
        const endPart = parts[1].trim();
        
        const startMatch = startPart.match(/(\d+)월\s*(\d+)/);
        if (!startMatch) return null;
        
        const startMonth = parseInt(startMatch[1]);
        const startDay = parseInt(startMatch[2]);
        const startDate = new Date(year, startMonth - 1, startDay);
        
        let endDate;
        const endMatch = endPart.match(/(\d+)월\s*(\d+)/);
        if (endMatch) {
            // 월이 바뀌는 경우 (예: '12월 28-1월 3')
            endDate = new Date(year, parseInt(endMatch[1]) - 1, parseInt(endMatch[2]));
        } else {
            // 같은 월인 경우 (예: '4-10')
            endDate = new Date(year, startMonth - 1, parseInt(endPart));
        }
        
        // 연말/연초 처리 (12월에서 1월로 넘어갈 때)
        if (startDate.getMonth() === 11 && endDate.getMonth() === 0) {
            endDate.setFullYear(year + 1);
        }
        
        return { start: startDate, end: endDate };
    } catch (e) {
        console.error('Error parsing week date:', str, e);
        return null;
    }
}

// 글꼴 동적 로드 및 적용 유틸리티
function ensureFontLoaded(fontName) {
    if (fontName === 'Gowun Dodum') {
        if (!document.getElementById('font-link-gowun-dodum')) {
            const link = document.createElement('link');
            link.id = 'font-link-gowun-dodum';
            link.href = 'https://fonts.googleapis.com/css2?family=Gowun+Dodum&display=swap';
            link.rel = 'stylesheet';
            document.head.appendChild(link);
        }
    } else if (fontName === 'Noto Sans KR') {
        if (!document.getElementById('font-link-noto-sans-kr')) {
            const link = document.createElement('link');
            link.id = 'font-link-noto-sans-kr';
            link.href = 'https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@300;400;500;700&display=swap';
            link.rel = 'stylesheet';
            document.head.appendChild(link);
        }
    } else if (fontName === 'Nanum Gothic') {
        if (!document.getElementById('font-link-nanum-gothic')) {
            const link = document.createElement('link');
            link.id = 'font-link-nanum-gothic';
            link.href = 'https://fonts.googleapis.com/css2?family=Nanum+Gothic:wght@400;700;800&display=swap';
            link.rel = 'stylesheet';
            document.head.appendChild(link);
        }
    }
}

function applyFontToBody(fontName) {
    let fontFamily = "";
    if (fontName === 'Gowun Dodum') {
        fontFamily = "'Gowun Dodum', sans-serif";
    } else if (fontName === 'Noto Sans KR') {
        fontFamily = "'Noto Sans KR', sans-serif";
    } else if (fontName === 'Nanum Gothic') {
        fontFamily = "'Nanum Gothic', sans-serif";
    } else {
        fontFamily = "'Pretendard', -apple-system, BlinkMacSystemFont, system-ui, sans-serif";
    }
    document.body.style.fontFamily = fontFamily;
}


