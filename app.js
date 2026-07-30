// Supabase Viewer Frontend app.js (Restored Original Logic + Refined Weekend Table)

window.appState = {
    initialized: false,
    userName: localStorage.getItem('userName') || null,
    congregationName: localStorage.getItem('congregationName') || '집회 계획표'
};
// 초기 title은 localStorage 캐시로 즉시 설정 (DB 로드 후 setupNavigationButtons에서 최신값으로 갱신됨)
document.title = window.appState.congregationName + " 집회계획표";


const urlParams = new URLSearchParams(window.location.search);
const sheetParam = urlParams.get('sheet') || urlParams.get('tab');
let currentSheet = sheetParam ? decodeURIComponent(sheetParam) : '평일집회';
let weeks = [];
let currentWeekIndex = 0;
let currentSchedules = [];
let navLinks = [];

let touchStartX = 0;
let touchStartY = 0;
let touchEndX = 0;
let touchEndY = 0;
const swipeThreshold = 50;

document.addEventListener('DOMContentLoaded', initializeApp);



async function initializeApp() {
    await checkAndApplyCustomDatabase();
    window.appState.initialized = true;

    if (!window.appState.userName) {
        let userName = prompt('사용자 이름을 입력해주세요 (본인 이름이 포함된 행이 강조됩니다):', '');
        if (userName) {
            const trimmedName = userName.trim();
            localStorage.setItem('userName', trimmedName);
            window.appState.userName = trimmedName;
        } else {
            window.appState.userName = 'Guest';
            localStorage.setItem('userName', 'Guest');
        }
    }

    await setupNavigationButtons();
    setupSwipeListeners();

    const changeNameBtn = document.getElementById('change-name-btn');
    if (changeNameBtn) {
        changeNameBtn.addEventListener('click', () => {
            let newName = prompt('새로운 이름을 입력하세요:', window.appState.userName || '');
            if (newName !== null) {
                const trimmedName = newName.trim();
                window.appState.userName = trimmedName;
                localStorage.setItem('userName', trimmedName);
                location.reload();
            }
        });
    }

    document.addEventListener('keydown', function (e) {
        const isWeekendTab = currentSheet.includes('주말') || currentSheet.includes('공강');
        if (isWeekendTab) return;

        if (e.key === 'ArrowLeft') navigateToPreviousWeek();
        else if (e.key === 'ArrowRight') navigateToNextWeek();
    });

    await loadData();
}

async function setupNavigationButtons() {
    const navContainer = document.getElementById('navigation-container');
    const sheetNav = document.getElementById('sheet-navigation');
    if (!sheetNav) return;

    try {
        const { data, error } = await supabaseClient
            .from('navigation_links')
            .select('*')
            .order('sort_order', { ascending: true });

        if (error) throw error;
        navLinks = data || [];

        if (navLinks.length === 0) {
            navContainer.style.display = 'none';
        } else {
            navContainer.style.display = 'block';
            sheetNav.innerHTML = '';

            const internalLinks = navLinks.filter(l => l.type === 'internal');
            if (internalLinks.length > 0) {
                const exists = internalLinks.some(l => l.target === currentSheet);
                if (!exists) {
                    currentSheet = internalLinks[0].target;
                }
            }

            navLinks.forEach(link => {
                const btn = (link.type === 'internal') ? document.createElement('button') : document.createElement('a');
                btn.textContent = link.label;
                btn.classList.add('tab-btn');
                if (link.type === 'internal') {
                    btn.classList.toggle('selected', currentSheet === link.target);
                    btn.addEventListener('click', () => switchToSheet(link.target));
                } else {
                    btn.href = link.target;
                    btn.target = '_blank';
                }
                sheetNav.appendChild(btn);
            });
        }

        const { data: settingsData, error: settingsErr } = await supabaseClient
            .from('app_settings')
            .select('*');

        if (!settingsErr && settingsData) {
            const congName = settingsData.find(s => s.key === 'congregation_name')?.value || '집회 계획표';
            const fontViewer = settingsData.find(s => s.key === 'font_viewer')?.value || 'Pretendard';

            window.appState.congregationName = congName;
            localStorage.setItem('congregationName', congName);
            localStorage.setItem('fontViewer', fontViewer);
            document.title = congName + " 집회계획표";

            // Apply Viewer Font
            ensureFontLoaded(fontViewer);
            applyFontToBody(fontViewer);
        }
    } catch (e) {
        console.error('Error loading navigation:', e);
    }
}

async function switchToSheet(sheetName) {
    if (currentSheet === sheetName) return;
    currentSheet = sheetName;
    setupNavigationButtons();

    // URL parameter update without reload
    try {
        const url = new URL(window.location.href);
        url.searchParams.set('sheet', sheetName);
        window.history.replaceState({}, '', url.toString());
    } catch (err) {
        console.error('Failed to update URL parameter:', err);
    }

    document.getElementById('content').classList.add('sheet-transition');
    await loadData();
    setTimeout(() => {
        const c = document.getElementById('content');
        if (c) c.classList.remove('sheet-transition');
    }, 300);
}

async function loadData() {
    const isWeekendTab = currentSheet.includes('주말') || currentSheet.includes('공강');

    const pagDots = document.getElementById('pagination-dots');
    const mainCont = document.getElementById('main-container');

    if (isWeekendTab) {
        if (pagDots) pagDots.style.display = 'none';
        if (mainCont) mainCont.style.maxWidth = '1600px';
        document.body.style.overflow = 'hidden'; // Lock body scroll for weekend view
    } else {
        if (pagDots) pagDots.style.display = 'flex';
        // Container max-width will revert to standard via CSS (600-950px)
        if (mainCont) mainCont.style.maxWidth = '';
        document.body.style.overflow = 'visible'; // Restore body scroll for weekday view
    }

    try {
        if (!isWeekendTab) {
            const { data, error } = await supabaseClient
                .from('schedules')
                .select('week_date')
                .eq('sheet_type', currentSheet);
            if (error) throw error;

            weeks = [...new Set(data.map(item => item.week_date))];
            weeks.sort((a, b) => {
                const dateA = parseWeekDate(a);
                const dateB = parseWeekDate(b);
                if (!dateA || !dateB) return 0;
                return dateA.start - dateB.start;
            });

            const today = new Date();
            today.setHours(0, 0, 0, 0);

            // 오늘 날짜 기준 이미 완전히 지난 주차만 제거
            // 시작일이 오늘보다 7일 이상 이전인 경우만 제거 (현재 주차 안전하게 포함)
            weeks = weeks.filter(w => {
                const range = parseWeekDate(w);
                if (!range) return true; // 파싱 실패 시 일단 표시
                const startMs = range.start.getTime();
                const todayMs = today.getTime();
                // 시작일 + 6일(주 종료일) >= 오늘이면 표시
                return startMs + (6 * 24 * 60 * 60 * 1000) >= todayMs;
            });

            let todayIndex = 0;
            for (let i = 0; i < weeks.length; i++) {
                const range = parseWeekDate(weeks[i]);
                if (range && today >= range.start && today <= range.end) {
                    todayIndex = i; break;
                }
            }
            todayIndex = Math.max(0, todayIndex);
            currentWeekIndex = todayIndex;

            // 사용자 배정 주간 정보 사전 로드
            fetchUserAssignedWeeks();

            setupPaginationDots();
            await displayWeek(currentWeekIndex, false);
        } else {
            const now = new Date();
            const today = now.toISOString().split('T')[0];
            const oneYearLaterDate = new Date();
            oneYearLaterDate.setFullYear(now.getFullYear() + 1);
            const oneYearLater = oneYearLaterDate.toISOString().split('T')[0];

            const { data, error } = await supabaseClient
                .from('public_talks')
                .select('*, public_talk_outlines(topic)')
                .gte('meeting_date', today)
                .lte('meeting_date', oneYearLater)
                .order('meeting_date', { ascending: true });

            if (error) throw error;
            currentSchedules = data || [];
            renderWeekendSchedulesTable();
        }
    } catch (e) {
        console.error('Data load error:', e);
        document.getElementById('content').innerHTML = '<p>데이터를 불러올 수 없습니다.</p>';
    }
}

function setupPaginationDots() {
    const dotsContainer = document.getElementById('pagination-dots');
    if (!dotsContainer) return;
    dotsContainer.innerHTML = '';

    weeks.forEach((_, index) => {
        const dot = document.createElement('div');
        dot.className = 'pagination-dot';
        if (index === currentWeekIndex) dot.classList.add('active');
        dot.addEventListener('click', () => displayWeek(index));
        dotsContainer.appendChild(dot);
    });
}

function updatePaginationDots() {
    const dots = document.querySelectorAll('.pagination-dot');
    dots.forEach((dot, index) => {
        dot.classList.toggle('active', index === currentWeekIndex);
    });
}

async function displayWeek(index, triggerLoading = true) {
    if (weeks.length === 0) {
        document.getElementById('content').innerHTML = '<p style="padding:2rem; text-align:center;">등록된 계획표가 없습니다.</p>';
        return;
    }
    if (index < 0 || index >= weeks.length) return;

    currentWeekIndex = index;
    updatePaginationDots();

    const week = weeks[index];
    try {
        const { data, error } = await supabaseClient
            .from('schedules')
            .select('*')
            .eq('sheet_type', currentSheet)
            .eq('week_date', week)
            .order('sort_order', { ascending: true });
        if (error) throw error;
        currentSchedules = data;

        // 해당 주차의 주말 데이터(일요일) 가져오기 추가
        window.appState.currentWeekendSchedule = null;
        const range = parseWeekDate(week);
        if (range && range.start) {
            // 주간 시작일(월요일)에서 6일을 더해 일요일을 계산 (문자열 파싱보다 안전)
            const d = new Date(range.start);
            d.setDate(d.getDate() + 6);
            const endDateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

            console.log(`[WeekendSync] Target Sunday: ${endDateStr}`);

            const { data: weekendData, error: weekendErr } = await supabaseClient
                .from('public_talks')
                .select('*, public_talk_outlines(topic)')
                .eq('meeting_date', endDateStr)
                .maybeSingle();

            if (weekendErr) console.error('Weekend fetch error:', weekendErr);
            if (weekendData) {
                console.log('[WeekendSync] Found data:', weekendData);
                window.appState.currentWeekendSchedule = weekendData;
            } else {
                console.warn(`[WeekendSync] No data found for ${endDateStr}`);
            }
        }

        renderSchedules();
    } catch (e) {
        console.error(e);
        document.getElementById('content').innerHTML = '<p>데이터 오류</p>';
    }
}

const formatAssignee = (raw) => {
    if (!raw) return '';
    let text = escapeHtml(raw);
    if (window.appState.userName && window.appState.userName !== 'Guest' && text.includes(window.appState.userName)) {
        text = `<span class="highlight">${text}</span>`;
    }
    return text;
};

const formatAssignees = (row) => {
    let a1 = row.assignee_1 ? row.assignee_1.trim() : '';
    let a2 = row.assignee_2 ? row.assignee_2.trim() : '';

    // Check if this is a bible study and format as "A1 (낭독:A2)"
    const isBibleStudy = row.content && (row.content.includes('회중 성서 연구') || row.content.includes('회중성서연구') || row.content.includes('회중 성서연구'));
    if (isBibleStudy && a1 && a2) {
        return `<span style="font-weight:bold; color:#000;">${formatAssignee(a1)}</span><span style="color:#555;"> (낭독 : ${formatAssignee(a2)})</span>`;
    }

    let parts = [];
    if (a1) parts.push(`<span style="font-weight:bold; color:#000;">${formatAssignee(a1)}</span>`);
    if (a2) parts.push(`<span style="font-weight:bold; color:#000;">${formatAssignee(a2)}</span>`);
    return parts.join(' <span style="color:#000;">/</span> ');
};

const formatConcludes = (row) => {
    let assignee = formatAssignees(row);
    if (!assignee) return '';

    const isConcluding = row.part_num === '맺음말' || (row.content && row.content.includes('맺음말'));
    const isStartingSong = row.category === 'top' && row.content && row.content.includes('노래');
    const isChairmanRow = row.category === 'top' && row.content && !row.content.includes('노래');

    // Check if it already starts with designated prefix to avoid duplication
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = assignee;
    const textOnly = (tempDiv.textContent || tempDiv.innerText || '').trim();

    if ((isConcluding || isStartingSong) && !textOnly.startsWith('기도')) {
        return `기도 : ${assignee}`;
    }

    if (isChairmanRow && !textOnly.startsWith('사회자')) {
        return `사회자 : ${assignee}`;
    }

    return assignee;
};

/* --- Original Weekday Rendering Logic (Restored) --- */
function renderSchedules() {
    const content = document.getElementById('content');
    const groups = { sunday: [], top: [], treasures: [], ministry: [], living: [] };
    let weekDateStr = (currentSchedules && currentSchedules.length > 0) ? currentSchedules[0].week_date : (weeks[currentWeekIndex] || '');

    currentSchedules.forEach(item => {
        if (groups[item.category]) groups[item.category].push(item);
        else groups.top.push(item);
    });

    const renderRow = (item) => {
        let html = `<div class="part-row">`;
        let leftText = '';
        if (item.part_num) leftText += `<strong>${escapeHtml(item.part_num)}</strong> `;
        if (item.content) leftText += escapeHtml(item.content) + ' ';
        if (item.duration) leftText += escapeHtml(item.duration);

        html += `
            <div class="part-title">${leftText.trim()}</div>`;

        const hasAssignee = item.assignee_1 || item.assignee_2;
        if (hasAssignee) {
            html += `
            <div style="display:flex; justify-content:flex-end; width:100%;">
                <div class="part-assignee">${formatConcludes(item)}</div>
            </div>`;
        }
        html += `</div>`;
        return html;
    };

    const congregationName = window.appState.congregationName || '집회 계획표';

    let html = `
    <div style="position:relative;">
        <div class="header-container">
            <div>${escapeHtml(congregationName)}</div>
            <div>평일 집회 계획표</div>
        </div>
        <div class="date-header-container">
            <button class="nav-arrow" onclick="navigateToPreviousWeek()"><i class="fas fa-chevron-left"></i></button>
            <div class="week-title week-title-clickable" style="flex:1;" onclick="openWeekSelectModal()" title="전체 주간 목록 보기">
                ${escapeHtml(weekDateStr)} <i class="fas fa-caret-down" style="font-size: 0.7em; margin-left: 4px; vertical-align: middle; color: #555;"></i>
            </div>
            <button class="nav-arrow" onclick="navigateToNextWeek()"><i class="fas fa-chevron-right"></i></button>
        </div>
        <div class="schedule-container">
    `;

    if (groups.sunday.length > 0) {
        html += `<div class="section-head head-sunday" style="text-align:center; margin-top:5px;">광 고</div><div class="section-bg bg-sunday" style="margin-bottom:10px;">`;
        groups.sunday.forEach(item => {
            html += renderRow(item);
        });
        html += `</div>`;
    }

    if (groups.top.length > 0) {
        html += `<div class="sec-top">`;
        groups.top.forEach(item => {
            let leftT = (item.part_num === '시작') ? '시작: ' + escapeHtml(item.content) :
                (item.part_num === '주간성경읽기 범위' ? escapeHtml(item.content) :
                    (item.part_num ? escapeHtml(item.part_num) + ' ' : '') + escapeHtml(item.content));
            if (item.duration) leftT += ' ' + escapeHtml(item.duration);

            let rightT = formatConcludes(item);
            html += `<div class="top-row"><div style="color:#444; flex:1;">${leftT}</div><div style="font-weight:bold; text-align:right;">${rightT}</div></div>`;
        });
        html += `</div>`;
    }

    const drawSection = (arr, label, cls) => {
        if (arr && arr.length > 0) {
            let iconHtml = '';
            if (cls === 'treasures') iconHtml = `<img src="Image01.png" class="section-icon" alt="">`;
            else if (cls === 'ministry') iconHtml = `<img src="Image02.png" class="section-icon" alt="">`;
            else if (cls === 'living') iconHtml = `<img src="Image03.png" class="section-icon" alt="">`;

            html += `<div class="section-head head-${cls}">${iconHtml}${label}</div><div class="section-bg bg-${cls}">`;
            arr.forEach(item => html += renderRow(item));
            html += `</div>`;
        }
    };
    drawSection(groups.treasures, '성경에 담긴 보물', 'treasures');
    drawSection(groups.ministry, '야외 봉사에 힘쓰십시오', 'ministry');
    drawSection(groups.living, '그리스도인 생활', 'living');

    html += `</div>`; // schedule-container 닫기

    console.log('[Render] Weekend data exists?', !!window.appState.currentWeekendSchedule);

    // --- 주말 집회 요약 섹션 추가 ---
    if (window.appState.currentWeekendSchedule) {
        const w = window.appState.currentWeekendSchedule;
        const d = new Date(w.meeting_date);
        const dateStr = `${d.getMonth() + 1}/${d.getDate()}`;
        const topic = w.topic || (w.public_talk_outlines?.topic || '');

        const outlineNoStr = w.outline_no ? String(w.outline_no).trim() : '';
        const outlineNoPrefix = outlineNoStr ? `(${escapeHtml(outlineNoStr)}) ` : '';

        html += `
        <div class="weekend-summary-box">
            <div class="weekend-summary-head">${dateStr} 주말 집회 계획표</div>
            
            <div class="weekend-summary-row">
                <div class="weekend-summary-label">사회자 및 시작 기도</div>
                <div class="weekend-summary-value">${formatAssignee(w.chairman)}</div>
            </div>
            
            <div class="weekend-summary-row tight-row" style="border-bottom:none; padding-bottom:0;">
                <div class="weekend-summary-label">공개 강연</div>
            </div>

            <div class="weekend-topic-row tight-row">
                ${outlineNoPrefix}${escapeHtml(topic)}
            </div>

            <div class="weekend-summary-row tight-row" style="padding-bottom:0;">
                <div class="weekend-summary-value">
                    ${formatAssignee(w.speaker)} (${escapeHtml(w.congregation)})
                </div>
            </div>
            
            <div class="weekend-summary-row">
                <div class="weekend-summary-label">파수대</div>
                <div class="weekend-summary-value">${formatAssignee(w.reader)}</div>
            </div>

            <div class="weekend-summary-row">
                <div class="weekend-summary-label">낭독</div>
                <div class="weekend-summary-value">${formatAssignee(w.bible_reader)}</div>
            </div>
            
            <div class="weekend-summary-row thick-border">
                <div class="weekend-summary-label">마치는 기도</div>
                <div class="weekend-summary-value">${formatAssignee(w.prayer)}</div>
            </div>
        </div>
        `;
    }

    html += `</div>`; // position:relative wrapper 닫기
    content.innerHTML = html;
}

/* --- Refined Weekend Rendering Table (Thick Borders + Dual Header) --- */
function renderWeekendSchedulesTable() {
    const content = document.getElementById('content');
    if (!currentSchedules || currentSchedules.length === 0) {
        content.innerHTML = '<p style="padding:3rem; text-align:center; color:#888;">등록된 집회 일정이 없습니다.</p>';
        return;
    }

    const congregationName = window.appState.congregationName || '집회 계획표';

    // Split Header: Left Small / Center Large
    let headerHtml = `
    <div style="padding: 5pt 1.5rem 0.1rem 1.5rem; display: flex; justify-content: center;">
        <div style="font-size: 1.5rem; font-weight: 700; color: #000; text-align: center;">공개 강연 계획표</div>
    </div>
    `;

    let html = headerHtml + `
    <div class="viewer-table-container">
    <table class="data-table">
        <thead>
            <tr>
                <th class="col-date" style="width:105px; text-align:center; color:#ffffff !important;">날짜</th>
                <th style="width:45px; text-align:center;">골자</th>
                <th class="col-topic" style="width:380px;">주제</th>
                <th style="width:100px; text-align:center;">연사</th>
                <th class="col-congregation" style="width:120px; text-align:center;">회중</th>
                <th style="width:90px; text-align:center;">사회</th>
                <th style="width:90px; text-align:center;">파수대</th>
                <th style="width:90px; text-align:center;">낭독</th>
                <th style="width:90px; text-align:center;">기도</th>
            </tr>
        </thead>
        <tbody>
    `;

    let lastMonth = '';

    currentSchedules.forEach((r, idx) => {
        const d = new Date(r.meeting_date);
        const curMonth = `${d.getFullYear()}-${d.getMonth() + 1}`;

        let rowClass = "";
        // Month border (thick) on first record of a new month
        if (idx !== 0 && curMonth !== lastMonth) {
            rowClass = "month-border-top";
        }
        lastMonth = curMonth;

        const topic = r.topic || (r.public_talk_outlines?.topic || '');
        const dateStr = `${String(d.getFullYear()).slice(-2)}/${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getDate()).padStart(2, '0')}`;

        // Font size decreased (1.05rem -> 0.95rem)
        const commonCellStyle = "font-size:0.95rem;";
        const smallCellStyle = "font-size:0.85rem;";

        html += `
            <tr class="${rowClass}">
                <td class="col-date" style="${smallCellStyle}">${dateStr}</td>
                <td style="text-align:center; font-weight:400; ${smallCellStyle}">${escapeHtml(r.outline_no)}</td>
                <td class="col-topic" style="font-weight:500; text-align:left; white-space:normal; line-height:1.2; ${commonCellStyle}">
                    <div>
                        ${escapeHtml(topic)}
                    </div>
                </td>
                <td style="text-align:center; font-weight:600; ${commonCellStyle}">${formatAssignee(r.speaker)}</td>
                <td class="col-congregation" style="text-align:center; ${commonCellStyle}">
                    <div style="white-space:normal; line-height:1.2;">
                        ${escapeHtml(r.congregation)}
                    </div>
                </td>
                <td style="text-align:center; ${commonCellStyle}">${formatAssignee(r.chairman)}</td>
                <td style="text-align:center; ${commonCellStyle}">${formatAssignee(r.reader)}</td>
                <td style="text-align:center; ${commonCellStyle}">${formatAssignee(r.bible_reader)}</td>
                <td style="text-align:center; ${commonCellStyle}">${formatAssignee(r.prayer)}</td>
            </tr>
        `;
    });

    html += `</tbody></table></div>`;
    content.innerHTML = html;
}

function navigateToPreviousWeek() {
    let newIndex = currentWeekIndex - 1;
    if (newIndex < 0) newIndex = weeks.length - 1;
    displayWeek(newIndex);
}

function navigateToNextWeek() {
    let newIndex = currentWeekIndex + 1;
    if (newIndex >= weeks.length) newIndex = 0;
    displayWeek(newIndex);
}

function setupSwipeListeners() {
    document.addEventListener('touchstart', e => {
        const isWeekendTab = currentSheet.includes('주말') || currentSheet.includes('공강');
        if (isWeekendTab) return;
        touchStartX = e.changedTouches[0].screenX;
        touchStartY = e.changedTouches[0].screenY;
    }, { passive: true });
    document.addEventListener('touchend', e => {
        const isWeekendTab = currentSheet.includes('주말') || currentSheet.includes('공강');
        if (isWeekendTab) return;
        touchEndX = e.changedTouches[0].screenX;
        touchEndY = e.changedTouches[0].screenY;
        handleSwipe();
    }, { passive: true });
}

function handleSwipe() {
    const dx = touchEndX - touchStartX;
    const dy = touchEndY - touchStartY;
    if (Math.abs(dy) > Math.abs(dx)) return;
    if (Math.abs(dx) >= swipeThreshold) {
        if (dx > 0) navigateToPreviousWeek(); else navigateToNextWeek();
    }
}

// ==========================================
// 폰트 헬퍼 함수 (Font Helpers)
// ==========================================

const FONT_CDN_MAP = {
    'Pretendard': "https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/static/pretendard.css",
    'Noto Sans KR': "https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@400;500;700;800&display=swap",
    'Nanum Gothic': "https://fonts.googleapis.com/css2?family=Nanum+Gothic:wght@400;700;800&display=swap",
    'Nanum Myeongjo': "https://fonts.googleapis.com/css2?family=Nanum+Myeongjo:wght@400;700;800&display=swap",
    'Gowun Dodum': "https://fonts.googleapis.com/css2?family=Gowun+Dodum&display=swap"
};

const FONT_FAMILY_MAP = {
    'Pretendard': "'Pretendard', -apple-system, BlinkMacSystemFont, system-ui, sans-serif",
    'Noto Sans KR': "'Noto Sans KR', sans-serif",
    'Nanum Gothic': "'Nanum Gothic', sans-serif",
    'Nanum Myeongjo': "'Nanum Myeongjo', serif",
    'Gowun Dodum': "'Gowun Dodum', sans-serif"
};

function ensureFontLoaded(fontName) {
    if (!fontName || !FONT_CDN_MAP[fontName]) return;
    const linkId = `font-link-${fontName.replace(/\s/g, '-')}`;
    if (document.getElementById(linkId)) return; // already loaded
    const link = document.createElement('link');
    link.id = linkId;
    link.rel = 'stylesheet';
    link.href = FONT_CDN_MAP[fontName];
    document.head.appendChild(link);
}

function applyFontToBody(fontName) {
    if (!fontName || !FONT_FAMILY_MAP[fontName]) return;
    document.body.style.fontFamily = FONT_FAMILY_MAP[fontName];
}

// ==========================================
// 주간 선택 모달 및 사용자 배정 하이라이트 기능
// ==========================================
let userAssignedWeeksMap = new Map(); // week_date -> Array of assigned part labels

async function fetchUserAssignedWeeks() {
    userAssignedWeeksMap.clear();
    const userName = window.appState.userName;
    if (!userName || userName === 'Guest' || !currentSheet) return;

    try {
        const { data, error } = await supabaseClient
            .from('schedules')
            .select('week_date, category, part_num, content, assignee_1, assignee_2, sort_order')
            .eq('sheet_type', currentSheet)
            .order('sort_order', { ascending: true });

        if (error) throw error;

        if (data) {
            data.forEach(item => {
                const a1 = item.assignee_1 || '';
                const a2 = item.assignee_2 || '';
                if (a1.includes(userName) || a2.includes(userName)) {
                    if (!userAssignedWeeksMap.has(item.week_date)) {
                        userAssignedWeeksMap.set(item.week_date, []);
                    }

                    // 프로/프로그램 명칭 정제
                    let partTitle = '';
                    const isChairmanRow = (item.category === 'top' && item.part_num === '주간성경읽기 범위') ||
                                         (item.category === 'top' && item.content && !item.content.includes('노래'));

                    if (isChairmanRow) {
                        partTitle = '사회자';
                    } else if (item.part_num && item.part_num.trim()) {
                        partTitle = item.part_num.trim();
                    } else if (item.content && item.content.trim()) {
                        partTitle = item.content.trim();
                    }

                    // 명칭 단순화/커스텀 변경
                    if (!isChairmanRow) {
                        if (partTitle.includes('소개말') || (partTitle.includes('노래') && partTitle.includes('기도'))) {
                            partTitle = '시작 기도';
                        } else if (partTitle.includes('맺음말')) {
                            partTitle = '마치는 기도';
                        }
                    }

                    // 길면 축약
                    if (partTitle.length > 15) {
                        partTitle = partTitle.substring(0, 14) + '…';
                    }

                    if (partTitle) {
                        userAssignedWeeksMap.get(item.week_date).push(partTitle);
                    }
                }
            });
        }
    } catch (err) {
        console.error('Error fetching user assigned weeks:', err);
    }
}

function openWeekSelectModal() {
    const modal = document.getElementById('week-select-modal');
    const listContainer = document.getElementById('week-modal-list');
    if (!modal || !listContainer) return;

    listContainer.innerHTML = '';

    if (weeks.length === 0) {
        listContainer.innerHTML = '<div style="padding: 20px; text-align: center; color: #777;">등록된 주간 목록이 없습니다.</div>';
    } else {
        const userName = window.appState.userName;
        const hasUser = userName && userName !== 'Guest';

        weeks.forEach((weekDate, index) => {
            const item = document.createElement('div');
            item.className = 'week-modal-item';
            
            const isCurrent = (index === currentWeekIndex);
            const assignedParts = userAssignedWeeksMap.get(weekDate) || [];
            const isAssigned = assignedParts.length > 0;

            if (isCurrent) item.classList.add('active');
            if (isAssigned) item.classList.add('assigned-week');

            let itemHtml = `<div class="week-modal-date">${escapeHtml(weekDate)}</div>`;
            if (isAssigned && hasUser) {
                const partsText = escapeHtml(assignedParts.join(', '));
                itemHtml += `<span class="week-user-badge">${partsText}</span>`;
            } else if (isCurrent) {
                itemHtml += `<span style="font-size:0.8em; color:#6366f1; font-weight:bold;">현재 선택됨</span>`;
            }

            item.innerHTML = itemHtml;

            item.addEventListener('click', () => {
                displayWeek(index);
                closeWeekSelectModal();
            });

            listContainer.appendChild(item);
        });
    }

    modal.style.display = 'flex';

    // 현재 선택된 위치로 스크롤 이동
    setTimeout(() => {
        const activeItem = listContainer.querySelector('.week-modal-item.active');
        if (activeItem) {
            activeItem.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
        }
    }, 50);
}

function closeWeekSelectModal() {
    const modal = document.getElementById('week-select-modal');
    if (modal) {
        modal.style.display = 'none';
    }
}

// 모달 바깥 배경 클릭 및 닫기 버튼 이벤트 바인딩
document.addEventListener('DOMContentLoaded', () => {
    const closeBtn = document.getElementById('close-week-modal-btn');
    if (closeBtn) {
        closeBtn.addEventListener('click', closeWeekSelectModal);
    }

    const modal = document.getElementById('week-select-modal');
    if (modal) {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                closeWeekSelectModal();
            }
        });
    }

    // ESC 키 누를 때 모달 닫기
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            closeWeekSelectModal();
        }
    });
});

