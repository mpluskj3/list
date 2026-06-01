let adminInfo = JSON.parse(sessionStorage.getItem('adminInfo')) || null;
let weekdayData = []; // Array of objects mapping to 'schedules' table (8 fields)
let deletedIds = [];
let currentWeekFilter = 'all';
let deletedNavIds = [];
let weekendData = [];
let outlines = [];
let deletedWeekendIds = [];
let currentWeekendFilter = 'upcoming';
let adminUsers = [];
let deletedAdminIds = [];
let publishers = [];
let deletedPublisherIds = [];
let assignmentHistory = [];
let assignmentSortField = 'date'; // 'name', 'date', 'part'
let assignmentSortAsc = true;
let activeHelperRowIdx = null;
let activeHelperField = null;
let activeHelperFilterOnly = true;

// Focus Management for Weekend Table
let nextFocusTarget = { idx: null, field: null };
const weekendFieldSequence = ['speaker', 'congregation', 'speaker_contact', 'inviter', 'chairman', 'reader', 'bible_reader', 'prayer'];


document.addEventListener('DOMContentLoaded', () => {
    if (adminInfo) {
        showManagerContent();
    } else {
        showLoginSection();
    }
    setupEventListeners();
});

function setupEventListeners() {
    document.getElementById('btn-login').addEventListener('click', handleLogin);

    document.getElementById('btn-logout').addEventListener('click', () => {
        sessionStorage.removeItem('adminInfo');
        location.reload();
    });

    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
            document.querySelectorAll('.tab-content').forEach(c => c.style.display = 'none');


            btn.classList.add('active');
            const tabId = btn.getAttribute('data-tab');
            document.getElementById(`${tabId}-tab`).style.display = 'flex';

            if (tabId === 'menu-settings') {
                loadNavLinks();
            } else if (tabId === 'weekend-data') {
                loadWeekendData();
            } else if (tabId === 'admin-accounts') {
                loadAdminAccounts();
            } else if (tabId === 'publisher-mgmt') {
                loadPublishers();
            } else if (tabId === 'assignment-mgmt') {
                prepareAssignmentMgmt();
            } else if (tabId === 'print-schedules') {
                loadPrintTab();
            }
        });
    });

    document.getElementById('btn-add-publisher').addEventListener('click', addPublisherRow);
    document.getElementById('btn-save-publishers').addEventListener('click', savePublishers);
    document.getElementById('btn-auto-assign-all').addEventListener('click', executeAutoAssignment);

    document.getElementById('btn-add-account').addEventListener('click', addAdminAccountRow);
    document.getElementById('btn-save-accounts').addEventListener('click', saveAdminAccounts);

    document.getElementById('btn-show-outlines').addEventListener('click', () => {
        const section = document.getElementById('outlines-manager-section');
        section.style.display = (section.style.display === 'flex') ? 'none' : 'flex';
        if (section.style.display === 'flex') loadOutlines();
    });

    document.getElementById('btn-process-outlines').addEventListener('click', processOutlinesBulk);
    document.getElementById('btn-save-weekend').addEventListener('click', saveWeekendData);
    document.getElementById('btn-execute-move').addEventListener('click', executeMove);

    document.getElementById('btn-search-weekend').addEventListener('click', loadWeekendData);
    document.getElementById('btn-reset-weekend').addEventListener('click', resetWeekendFilters);
    document.getElementById('btn-delete-selected-weekend').addEventListener('click', deleteSelectedWeekendRows);
    document.getElementById('btn-batch-delete-weekend').addEventListener('click', deleteWeekendByRange);

    const btnGenSlots = document.getElementById('btn-generate-slots');
    if (btnGenSlots) {
        btnGenSlots.addEventListener('click', handleBatchGenerate);
    }

    document.getElementById('weekend-data-table').addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && (e.target.tagName === 'INPUT')) {
            e.preventDefault();
            const inputs = Array.from(document.querySelectorAll('#weekend-data-table input[type="text"], #weekend-data-table input[type="date"]'));
            const index = inputs.indexOf(e.target);
            if (index > -1 && index < inputs.length - 1) {
                inputs[index + 1].focus();
                if (inputs[index + 1].select) inputs[index + 1].select();
            }
        }
    });

    document.getElementById('check-all-weekend').addEventListener('change', (e) => {
        const checked = e.target.checked;
        document.querySelectorAll('.check-weekend').forEach(cb => {
            cb.checked = checked;
        });
    });



    document.getElementById('btn-save-data').addEventListener('click', saveData);

    const btnFetchWol = document.getElementById('btn-fetch-wol');
    if (btnFetchWol) {
        btnFetchWol.addEventListener('click', fetchWolData);
    }

    const btnShowManual = document.getElementById('btn-show-manual');
    if (btnShowManual) {
        btnShowManual.addEventListener('click', () => {
            const area = document.getElementById('manual-fetch-area');
            area.style.display = area.style.display === 'none' ? 'flex' : 'none';
        });
    }
    const btnFetchManual = document.getElementById('btn-fetch-manual');
    if (btnFetchManual) {
        btnFetchManual.addEventListener('click', () => {
            const html = document.getElementById('wol-manual-html').value;
            if (!html || !html.trim()) return alert('복사한 텍스트(Ctrl+A, Ctrl+C 후 사용)를 먼저 텍스트 상자에 붙여 넣고 아래에 제공해 주세요.');
            parseWolHtml(html);
        });
    }

    const weekFilter = document.getElementById('week-filter');
    if (weekFilter) {
        weekFilter.addEventListener('change', (e) => {
            currentWeekFilter = e.target.value;
            renderWeekdayTable();
        });
    }

    document.getElementById('btn-add-nav').addEventListener('click', () => {
        navLinks.push({ label: '새 버튼', type: 'internal', target: '평일집회', sort_order: navLinks.length + 1 });
        renderNavLinks();
    });

    document.getElementById('btn-save-nav').addEventListener('click', saveNavLinks);

    document.getElementById('btn-delete-week').addEventListener('click', deleteWeek);
    document.getElementById('btn-delete-past').addEventListener('click', deletePastWeeks);

    // Print Tab Event Listeners
    const btnPrintAll = document.getElementById('btn-print-select-all');
    if (btnPrintAll) {
        btnPrintAll.addEventListener('click', () => {
            document.querySelectorAll('.print-week-checkbox').forEach(cb => cb.checked = true);
        });
    }

    const btnPrintNone = document.getElementById('btn-print-select-none');
    if (btnPrintNone) {
        btnPrintNone.addEventListener('click', () => {
            document.querySelectorAll('.print-week-checkbox').forEach(cb => cb.checked = false);
        });
    }

    const btnTriggerPrint = document.getElementById('btn-trigger-print');
    if (btnTriggerPrint) {
        btnTriggerPrint.addEventListener('click', triggerPrintFlow);
    }

    const btnTriggerWeekendPrint = document.getElementById('btn-trigger-weekend-print');
    if (btnTriggerWeekendPrint) {
        btnTriggerWeekendPrint.addEventListener('click', triggerWeekendPrintFlow);
    }

    const printStartInput = document.getElementById('print-weekend-start-date');
    const printEndInput = document.getElementById('print-weekend-end-date');
    if (printStartInput) printStartInput.addEventListener('change', updateWeekendPrintBudget);
    if (printEndInput) printEndInput.addEventListener('change', updateWeekendPrintBudget);

    // Supabase Settings Event Listeners
    const btnSaveSupabase = document.getElementById('btn-save-supabase');
    if (btnSaveSupabase) btnSaveSupabase.addEventListener('click', saveCustomSupabase);

    const btnResetSupabase = document.getElementById('btn-reset-supabase');
    if (btnResetSupabase) btnResetSupabase.addEventListener('click', resetCustomSupabase);

    const btnCopySql = document.getElementById('btn-copy-sql');
    if (btnCopySql) btnCopySql.addEventListener('click', copySchemaSql);

    const btnSeedDb = document.getElementById('btn-seed-db');
    if (btnSeedDb) btnSeedDb.addEventListener('click', seedInitialData);
}

function showLoginSection() {
    document.getElementById('login-section').style.display = 'flex';
    document.getElementById('manager-content').style.display = 'none';
}

function showManagerContent() {
    document.getElementById('login-section').style.display = 'none';
    document.getElementById('manager-content').style.display = 'flex';
    document.getElementById('manager-content').style.flexDirection = 'column';
    document.getElementById('manager-content').style.flex = '1';
    document.getElementById('manager-content').style.overflow = 'hidden';

    // 최고관리자 여부에 따른 탭 노출 제어
    const isSuper = adminInfo && adminInfo.role === 'superadmin';
    document.getElementById('tab-admin-accounts').style.display = isSuper ? 'inline-block' : 'none';
    document.getElementById('tab-menu-settings').style.display = isSuper ? 'inline-block' : 'none';

    // 일반 관리자 권한별 탭 노출 제어
    const canWeekday = isSuper || (adminInfo && adminInfo.can_manage_weekday);
    const canWeekend = isSuper || (adminInfo && adminInfo.can_manage_weekend);

    const weekdayBtn = document.querySelector('.tab-btn[data-tab="weekday-data"]');
    const weekendBtn = document.querySelector('.tab-btn[data-tab="weekend-data"]');

    if (weekdayBtn) weekdayBtn.style.display = canWeekday ? 'inline-flex' : 'none';
    if (weekendBtn) weekendBtn.style.display = canWeekend ? 'inline-flex' : 'none';

    // 전도인/배정/인쇄 관리는 일정을 관리할 수 있는 모든 관리자에게 노출
    const canManage = canWeekday || canWeekend;
    const pubBtn = document.querySelector('.tab-btn[data-tab="publisher-mgmt"]');
    const assignBtn = document.querySelector('.tab-btn[data-tab="assignment-mgmt"]');
    const printBtn = document.getElementById('tab-print-schedules');
    if (pubBtn) pubBtn.style.display = canManage ? 'inline-flex' : 'none';
    if (assignBtn) assignBtn.style.display = canManage ? 'inline-flex' : 'none';
    if (printBtn) printBtn.style.display = canWeekday ? 'inline-flex' : 'none';

    // 최고관리자 전용 버튼 제한 (주말집회 관리)
    const restrictedElements = [
        'btn-show-outlines',
        'btn-generate-slots',
        'btn-delete-selected-weekend',
        'btn-batch-delete-weekend'
    ];
    restrictedElements.forEach(id => {
        const el = document.getElementById(id);
        if (el) {
            // 일괄 생성 영역은 부모 filter-box를 숨김
            if (id === 'btn-generate-slots') {
                const filterBox = el.closest('.filter-box');
                if (filterBox) filterBox.style.display = isSuper ? 'flex' : 'none';
            } else {
                el.style.display = isSuper ? 'inline-flex' : 'none';
            }
        }
    });

    // 권한이 전혀 없는 경우 처리
    const noPermSection = document.getElementById('no-permission-section');
    const tabBar = document.querySelector('.tab-bar');
    const tabContents = document.querySelectorAll('.tab-content');

    if (!canWeekday && !canWeekend) {
        if (noPermSection) noPermSection.style.display = 'flex';
        if (tabBar) tabBar.style.display = 'none';
        tabContents.forEach(c => c.style.display = 'none');
    } else {
        if (noPermSection) noPermSection.style.display = 'none';
        if (tabBar) tabBar.style.display = 'flex';

        // 기본 탭 설정 및 비활성화된 탭 숨김
        if (canWeekday) {
            document.getElementById('weekday-data-tab').style.display = 'flex';
            document.getElementById('weekend-data-tab').style.display = 'none';
            if (weekdayBtn) weekdayBtn.classList.add('active');
            if (weekendBtn) weekendBtn.classList.remove('active');
        } else if (canWeekend) {
            document.getElementById('weekend-data-tab').style.display = 'flex';
            document.getElementById('weekday-data-tab').style.display = 'none';
            if (weekendBtn) weekendBtn.classList.add('active');
            if (weekdayBtn) weekdayBtn.classList.remove('active');
            loadWeekendData(); // 주말 데이터 로드 트리거
        }
    }

    loadAllData();

    const userInfoEl = document.getElementById('user-info');
    if (userInfoEl) {
        userInfoEl.textContent = `${adminInfo.name} (${adminInfo.role === 'superadmin' ? '최고관리자' : '관리자'})`;
    }

    // 관리자 글꼴 즉시 적용
    supabaseClient.from('app_settings').select('*').then(({ data }) => {
        if (data) {
            const fontManager = data.find(s => s.key === 'font_manager')?.value || 'Pretendard';
            ensureFontLoaded(fontManager);
            applyFontToBody(fontManager);
        }
    });

    initPresence();
}

async function handleLogin() {
    const name = document.getElementById('admin-name').value;
    const pw = document.getElementById('admin-pw').value;

    if (!name || !pw) {
        alert('이름과 비밀번호를 입력하세요.');
        return;
    }


    try {
        const { data, error } = await supabaseClient
            .from('admin_users')
            .select('*')
            .eq('username', name)
            .eq('password', pw)
            .single();

        if (data) {
            adminInfo = {
                name: data.username,
                role: data.role,
                can_manage_weekday: data.can_manage_weekday !== false, // 기본값 true
                can_manage_weekend: data.can_manage_weekend !== false  // 기본값 true
            };
            sessionStorage.setItem('adminInfo', JSON.stringify(adminInfo));
            showManagerContent();
        } else {
            alert('이름 또는 비밀번호가 일치하지 않습니다.');
        }
    } catch (error) {
        console.error('Login error:', error);
        alert('로그인 중 오류가 발생했습니다.');
    } finally {

    }
}

async function loadAllData() {

    try {
        // Fetch schedules
        const { data: schData, error: schErr } = await supabaseClient
            .from('schedules')
            .select('*')
            .eq('sheet_type', '평일집회')
            .order('sort_order', { ascending: true });

        if (schErr) throw schErr;
        weekdayData = schData || [];
        deletedIds = [];

        renderWeekdayTable();
        updateWeekFilterDropdown();
    } catch (error) {
        console.error('Data load error:', error);
        alert('데이터를 불러오는 중 오류가 발생했습니다.');
    } finally {

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

function getCategoryOptions(selectedVal) {
    const categories = [
        { val: 'top', label: '상단(성경읽기/첫노래)' },
        { val: 'treasures', label: '성경에 담긴 보물' },
        { val: 'ministry', label: '야외 봉사에 힘쓰십시오' },
        { val: 'living', label: '그리스도인 생활' },
        { val: 'sunday', label: '광고' }
    ];
    return categories.map(c => `<option value="${c.val}" ${c.val === selectedVal ? 'selected' : ''}>${c.label}</option>`).join('');
}

function renderWeekdayTable() {
    const thead = document.querySelector('#weekday-data-table thead tr');
    thead.innerHTML = `
        <th style="width:110px;">분류</th>
        <th style="width:100px;">주차</th>
        <th style="width:100px;">부분(예: 1.)</th>
        <th>내용(주제)</th>
        <th style="width:70px;">시간</th>
        <th style="width:70px;">배정1</th>
        <th style="width:70px;">배정2</th>
        <th style="width:70px;">-</th>
    `;

    const tbody = document.querySelector('#weekday-data-table tbody');
    tbody.innerHTML = '';

    const displayData = currentWeekFilter === 'all'
        ? weekdayData
        : weekdayData.filter(d => d.week_date === currentWeekFilter);

    displayData.forEach((row) => {
        // Find the actual index in global weekdayData
        const originalIdx = weekdayData.indexOf(row);
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td><select onchange="updateWeekdayData(${originalIdx}, 'category', this.value)">${getCategoryOptions(row.category)}</select></td>
            <td><input type="text" value="${escapeHtml(row.week_date || '')}" onchange="updateWeekdayData(${originalIdx}, 'week_date', this.value)"></td>
            <td><input type="text" value="${escapeHtml(row.part_num || '')}" onchange="updateWeekdayData(${originalIdx}, 'part_num', this.value)"></td>
            <td><input type="text" value="${escapeHtml(row.content || '')}" onchange="updateWeekdayData(${originalIdx}, 'content', this.value)"></td>
            <td><input type="text" value="${escapeHtml(row.duration || '')}" onchange="updateWeekdayData(${originalIdx}, 'duration', this.value)"></td>
            <td><input type="text" value="${escapeHtml(row.assignee_1 || '')}" onchange="updateWeekdayData(${originalIdx}, 'assignee_1', this.value)" ondblclick="openAssignmentHelper(${originalIdx}, 'assignee_1')" placeholder="더블클릭시 추천" style="cursor: pointer;"></td>
            <td><input type="text" value="${escapeHtml(row.assignee_2 || '')}" onchange="updateWeekdayData(${originalIdx}, 'assignee_2', this.value)" ondblclick="openAssignmentHelper(${originalIdx}, 'assignee_2')" placeholder="더블클릭시 추천" style="cursor: pointer;"></td>
            <td>
                <div class="action-btn-group">
                    <button class="btn-mini" onclick="insertRow(${originalIdx})" style="background: #00b894;" title="추가"><i class="fas fa-plus"></i></button>
                    <button class="btn-mini" onclick="deleteRow(${originalIdx})" style="background: #d63031;" title="삭제"><i class="fas fa-trash"></i></button>
                </div>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

window.updateWeekdayData = (idx, field, value) => {
    weekdayData[idx][field] = value;
};

window.deleteRow = (idx) => {
    if (confirm('이 행을 삭제하시겠습니까?')) {
        const item = weekdayData[idx];
        if (item.id) deletedIds.push(item.id);
        weekdayData.splice(idx, 1);
        renderWeekdayTable();
    }
};

window.insertRow = (idx) => {
    const prevRow = weekdayData[idx];
    const newRow = {
        category: prevRow.category || 'living',
        week_date: prevRow.week_date || '',
        part_num: '',
        content: '',
        duration: '',
        assignee_1: '',
        assignee_2: '',
        sheet_type: '평일집회',
        sort_order: 0 // Will be handled on save or fixed locally
    };

    // Insert after current index
    weekdayData.splice(idx + 1, 0, newRow);

    // Recalculate sort orders for all to be safe
    weekdayData.forEach((row, i) => {
        row.sort_order = i + 1;
    });

    renderWeekdayTable();
};

async function fetchWolData() {
    const url = document.getElementById('wol-url-input').value;
    if (!url) return alert('URL을 입력하세요.');

    let html = '';
    try {
        const proxyUrl = `https://corsproxy.io/?${encodeURIComponent(url)}`;
        const response = await fetch(proxyUrl);
        if (!response.ok) throw new Error(`HTTP Error: ${response.status}`);
        html = await response.text();
    } catch (err1) {
        console.log('corsproxy.io failed, trying first fallback (codetabs)...', err1);
        try {
            const fallbackUrl = `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(url)}`;
            const response2 = await fetch(fallbackUrl);
            if (!response2.ok) throw new Error(`Fallback HTTP Error: ${response2.status}`);
            html = await response2.text();
        } catch (err2) {
            console.log('codetabs failed, trying second fallback (allorigins)...', err2);
            try {
                const fallbackUrl2 = `https://api.allorigins.win/get?url=${encodeURIComponent(url)}`;
                const response3 = await fetch(fallbackUrl2);
                if (!response3.ok) throw new Error(`AllOrigins HTTP Error: ${response3.status}`);
                const json = await response3.json();
                html = json.contents;
            } catch (err3) {
                console.error(err3);
                return alert('목록 서버가 JW.org 보안 또는 CORS 프록시 장애로 차단되었습니다. 아래에 있는 [수동 붙여넣기 모드] 버튼을 눌러 수동으로 파싱해주세요.');
            }
        }
    }

    await parseWolHtml(html);
}

async function parseWolHtml(html) {

    try {
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, 'text/html');

        let defaultWeekDate = '';
        const titleElem = doc.querySelector('h1');
        if (titleElem) defaultWeekDate = titleElem.textContent.trim();
        let weekDate = prompt('집회 주간 날짜를 입력하세요.', defaultWeekDate);
        if (!weekDate) { showLoading(false); return; }

        let bibleRange = '';
        const allLinks = doc.querySelectorAll('a');
        for (let i = 0; i < allLinks.length; i++) {
            let href = allLinks[i].getAttribute('href') || '';
            // The first Bible citation link in the WOL meeting page is the weekly reading range
            if (href.includes('/bc/') || href.includes('/b/')) {
                bibleRange = allLinks[i].textContent.trim();
                break;
            }
        }

        if (!bibleRange) {
            bibleRange = prompt('주간 성경읽기 범위를 파싱하지 못했습니다. 직접 입력해주세요 (예: 이사야 52-53장)', '');
        } else {
            let confirmRange = prompt('자동 추출된 주간 성경읽기 범위입니다. 맞으면 확인(엔터)을 눌러주세요', bibleRange);
            if (confirmRange === null) { showLoading(false); return; }
            bibleRange = confirmRange;
        }

        let newParts = [];
        let sortCounter = (weekdayData.length > 0) ? Math.max(...weekdayData.map(d => d.sort_order || 0)) + 1 : 1;

        if (bibleRange) {
            newParts.push({ category: 'top', week_date: weekDate, part_num: '', content: bibleRange, duration: '', assignee_1: '', assignee_2: '', sheet_type: '평일집회', sort_order: sortCounter++ });
        }

        const elements = doc.querySelectorAll('h2, h3, p');
        let currentSection = 'treasures';
        let hasFoundStartSong = false;
        let pendingPart = null;
        let lastSongText = '';

        let lastAddedText = "";
        elements.forEach(el => {
            let text = el.textContent.trim().replace(/\s+/g, ' ');
            if (!text || text === lastAddedText) return;
            lastAddedText = text;

            if (text.includes('성경에 담긴 보물')) { currentSection = 'treasures'; return; }
            if (text.includes('야외 봉사에 힘쓰십시오')) { currentSection = 'ministry'; return; }
            if (text.includes('그리스도인 생활')) { currentSection = 'living'; return; }

            // Title and Top level parsing
            if (text.startsWith('노래') && !text.includes('맺음말') && !hasFoundStartSong && currentSection === 'treasures') {
                hasFoundStartSong = true;

                let cleanText = text;
                let duration = "";

                const durationMatch = cleanText.match(/\(([^)]*?분)\)/);
                if (durationMatch) {
                    duration = durationMatch[0];
                    cleanText = cleanText.replace(duration, "").trim();
                }

                // Deduplicate repetitive phrases
                const prayerSuffix = " 및 기도 | 소개말";
                if (cleanText.includes(prayerSuffix + " " + prayerSuffix)) {
                    cleanText = cleanText.replace(prayerSuffix + " " + prayerSuffix, prayerSuffix).trim();
                }

                newParts.push({
                    category: 'top',
                    week_date: weekDate,
                    part_num: '',
                    content: cleanText,
                    duration: duration,
                    assignee_1: '', assignee_2: '',
                    sheet_type: '평일집회',
                    sort_order: sortCounter++
                });
            }
            else if (text.startsWith('노래') && currentSection === 'living' && !text.includes('맺음말')) {
                if (lastSongText !== text) {
                    newParts.push({ category: 'living', week_date: weekDate, part_num: '', content: text, duration: '', assignee_1: '', assignee_2: '', sheet_type: '평일집회', sort_order: sortCounter++ });
                    lastSongText = text;
                }
            }
            else {
                let matchCombined = text.match(/^(\d+)\.\s*(.*?)\((.*?분)\)(.*)?$/);
                if (matchCombined) {
                    let partNum = matchCombined[1] + ".";
                    let contentTitle = matchCombined[2].trim();
                    let durationStr = '(' + matchCombined[3] + ')';

                    if (matchCombined[4]) contentTitle += ' ' + matchCombined[4].trim();

                    newParts.push({
                        category: currentSection,
                        week_date: weekDate,
                        part_num: partNum,
                        content: contentTitle,
                        duration: durationStr,
                        assignee_1: '', assignee_2: '',
                        sheet_type: '평일집회',
                        sort_order: sortCounter++
                    });
                    pendingPart = null;
                }
                else if (text.includes('맺음말') && text.includes('분)')) {
                    // "맺음�?(3�? | ?�래 130 �?기도"
                    let matchEnd = text.match(/^(.*?)\((.*?분)\)(.*)/);
                    if (matchEnd) {
                        newParts.push({
                            category: 'living',
                            week_date: weekDate,
                            part_num: '맺음말',
                            content: matchEnd[3].replace('|', '').trim(),
                            duration: '(' + matchEnd[2] + ')',
                            assignee_1: '', assignee_2: '',
                            sheet_type: '평일집회',
                            sort_order: sortCounter++
                        });
                    }
                    pendingPart = null;
                }
                else {
                    // Check if it's JUST the title "1. 예수께서의 이로운 사랑의.." without time
                    let matchTitle = text.match(/^(\d+)\.\s*(.+)/);
                    if (matchTitle && !text.includes('분)')) {
                        pendingPart = {
                            category: currentSection,
                            week_date: weekDate,
                            part_num: matchTitle[1] + ".",
                            content: matchTitle[2].trim(),
                            duration: '',
                            assignee_1: '', assignee_2: '',
                            sheet_type: '평일집회',
                            sort_order: sortCounter++
                        };
                        newParts.push(pendingPart);
                    }
                    // Check if we have a pending part and this text contains a time like `(XX�?`
                    else if (pendingPart && text.indexOf('분)') !== -1) {
                        let matchDuration = text.match(/\((.*?분)\)(.*)/);
                        if (matchDuration) {
                            pendingPart.duration = '(' + matchDuration[1] + ')';
                            let extraContent = matchDuration[2].trim();
                            if (extraContent) {
                                pendingPart.content += ' ' + extraContent;
                            }
                            pendingPart = null; // Completed this part
                        }
                    }
                }
            }
        });


        if (newParts.length > 0) {
            weekdayData = [...weekdayData, ...newParts];
            currentWeekFilter = weekDate; // Switch to the newly fetched week
            renderWeekdayTable();
            updateWeekFilterDropdown();
            alert(`${newParts.length}개의 항목이 파싱/배치 되었습니다.\n내부 데이터를 확인하고 반드시 [최종 변경사항 저장]을 누르세요.`);
        } else {
            alert('파싱된 항목이 없습니다.');
        }

    } catch (e) {
        console.error(e);
        alert('스크래핑 중 오류가 발생했습니다.');
    }

}

async function saveData() {

    try {
        if (deletedIds.length > 0) {
            const { error: delErr } = await supabaseClient
                .from('schedules')
                .delete()
                .in('id', deletedIds);
            if (delErr) throw delErr;
            deletedIds = [];
        }

        const toInsert = weekdayData.filter(d => !d.id).map(d => {
            return {
                category: d.category,
                week_date: d.week_date,
                part_num: d.part_num,
                content: d.content,
                duration: d.duration,
                assignee_1: d.assignee_1,
                assignee_2: d.assignee_2,
                sheet_type: d.sheet_type,
                sort_order: d.sort_order
            };
        });

        if (toInsert.length > 0) {
            const { error: insErr } = await supabaseClient
                .from('schedules')
                .insert(toInsert);
            if (insErr) throw insErr;
        }

        const toUpdate = weekdayData.filter(d => d.id);
        if (toUpdate.length > 0) {
            const { error: updErr } = await supabaseClient
                .from('schedules')
                .upsert(toUpdate);
            if (updErr) throw updErr;
        }

        alert('데이터가 성공적으로 저장되었습니다.');
        broadcastChange('평일집회');
        await syncAssignmentHistory('weekday'); // 이력 동기화 추가
        loadAllData();
    } catch (error) {
        console.error('Save error:', error);
        alert('저장 중 오류가 발생했습니다.');
    } finally {

    }
}

function broadcastChange(tabType) {
    if (presenceChannel) {
        presenceChannel.send({
            type: 'broadcast',
            event: 'data_saved',
            payload: { adminName: adminInfo.name, tabType: tabType }
        });
    }
}

function showSyncToast(adminName, tabType) {
    const toast = document.createElement('div');
    toast.className = 'sync-toast';
    toast.innerHTML = `
        <div style="background:#fff; padding:15px; border-radius:8px; box-shadow:0 4px 6px rgba(0,0,0,0.1);">
            <strong>${adminName}</strong>님이 <strong>${tabType}</strong> 데이터를 업데이트했습니다.
            <button onclick="location.reload()" style="margin-left:10px; cursor:pointer;">지�??�로고침</button>
        </div>
    `;
    toast.style.position = 'fixed';
    toast.style.bottom = '20px';
    toast.style.right = '20px';
    toast.style.zIndex = '9999';
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 10000);
}



function updateWeekFilterDropdown() {
    const filter = document.getElementById('week-filter');
    if (!filter) return;

    // Get unique week dates
    const uniqueWeeks = [...new Set(weekdayData.map(d => d.week_date).filter(w => w))];

    // Custom sort: Use parseWeekDate helper
    uniqueWeeks.sort((a, b) => {
        const dateA = parseWeekDate(a);
        const dateB = parseWeekDate(b);
        if (!dateA || !dateB) return a.localeCompare(b);
        return dateA.start - dateB.start;
    });

    let html = '<option value="all">전체 보기</option>';
    uniqueWeeks.forEach(w => {
        html += `<option value="${w}" ${w === currentWeekFilter ? 'selected' : ''}>${w}</option>`;
    });
    filter.innerHTML = html;

    // 배정 관리 탭의 주차 필터도 함께 갱신
    const assignFilter = document.getElementById('assign-week-filter');
    if (assignFilter) {
        let assignHtml = '<option value="all">전체 주차</option>';
        uniqueWeeks.forEach(w => {
            assignHtml += `<option value="${w}">${w}</option>`;
        });
        assignFilter.innerHTML = assignHtml;
    }
}
async function loadNavLinks() {

    try {
        // Load nav links
        const { data: navData, error: navErr } = await supabaseClient
            .from('navigation_links')
            .select('*')
            .order('sort_order', { ascending: true });

        if (navErr) throw navErr;
        navLinks = navData || [];
        deletedNavIds = [];
        renderNavLinks();

        // Load app settings
        const { data: settingsData, error: settingsErr } = await supabaseClient
            .from('app_settings')
            .select('*');

        if (!settingsErr && settingsData) {
            const congName = settingsData.find(s => s.key === 'congregation_name')?.value || '';
            const fontViewer = settingsData.find(s => s.key === 'font_viewer')?.value || 'Pretendard';
            const fontManager = settingsData.find(s => s.key === 'font_manager')?.value || 'Pretendard';
            const fontPrint = settingsData.find(s => s.key === 'font_print')?.value || 'Pretendard';

            document.getElementById('congregation-name-input').value = congName;
            document.getElementById('font-viewer-select').value = fontViewer;
            document.getElementById('font-manager-select').value = fontManager;
            document.getElementById('font-print-select').value = fontPrint;

            // Apply Manager Font to body
            ensureFontLoaded(fontManager);
            applyFontToBody(fontManager);
        }

        // Load Supabase Connection details into settings UI
        const urlInput = document.getElementById('supabase-url-input');
        const keyInput = document.getElementById('supabase-key-input');
        const sqlTextarea = document.getElementById('db-sql-textarea');
        if (urlInput) urlInput.value = APP_CONFIG.SUPABASE_URL;
        if (keyInput) keyInput.value = APP_CONFIG.SUPABASE_KEY;
        if (sqlTextarea) sqlTextarea.value = SUPABASE_SCHEMA_SQL;
    } catch (e) {
        console.error('Error loading menu settings:', e);
    }

}

function renderNavLinks() {
    const tbody = document.querySelector('#nav-links-table tbody');
    tbody.innerHTML = '';

    navLinks.forEach((link, index) => {
        const tr = document.createElement('tr');

        let uiType = 'external';
        if (link.type === 'internal') {
            if (link.target === '평일집회') uiType = 'weekday';
            else if (link.target === '주말집회') uiType = 'weekend';
            else uiType = 'external'; // 외부 링크
        }

        const isPreset = (uiType === 'weekday' || uiType === 'weekend');

        tr.innerHTML = `
            <td><input type="text" value="${escapeHtml(link.label)}" onchange="updateNavLink(${index}, 'label', this.value)"></td>
            <td>
                <select onchange="handleNavTypeChange(${index}, this.value)">
                    <option value="weekday" ${uiType === 'weekday' ? 'selected' : ''}>평일집회</option>
                    <option value="weekend" ${uiType === 'weekend' ? 'selected' : ''}>주말집회</option>
                    <option value="external" ${uiType === 'external' ? 'selected' : ''}>외부링크</option>
                </select>
            </td>
            <td>
                <input type="text" 
                    value="${escapeHtml(link.target)}" 
                    placeholder="${isPreset ? '자동 지정됨' : 'https://...'}" 
                    onchange="updateNavLink(${index}, 'target', this.value)"
                    ${isPreset ? 'disabled style="background:#f1f2f6; color:#777;"' : ''}>
            </td>
            <td><input type="number" value="${link.sort_order}" style="width:60px; padding:6px;" onchange="updateNavLink(${index}, 'sort_order', parseInt(this.value))"></td>
            <td style="text-align:center;"><span class="btn-delete" onclick="deleteNavLink(${index})"><i class="fas fa-trash"></i></span></td>
        `;
        tbody.appendChild(tr);
    });
}

window.handleNavTypeChange = (index, uiValue) => {
    const link = navLinks[index];
    if (uiValue === 'weekday') {
        link.type = 'internal';
        link.target = '평일집회';
    } else if (uiValue === 'weekend') {
        link.type = 'internal';
        link.target = '주말집회';
    } else {
        link.type = 'external';
        link.target = '';
    }
    renderNavLinks();
};


function updateNavLink(index, field, value) {
    navLinks[index][field] = value;
}

function deleteNavLink(index) {
    if (!confirm('이 버튼을 삭제하시겠습니까?')) return;
    const link = navLinks[index];
    if (link.id) deletedNavIds.push(link.id);
    navLinks.splice(index, 1);
    renderNavLinks();
}

async function saveNavLinks() {

    try {
        // 1. Save Congregation Name and Fonts
        const congName = document.getElementById('congregation-name-input').value;
        const fontViewer = document.getElementById('font-viewer-select').value;
        const fontManager = document.getElementById('font-manager-select').value;
        const fontPrint = document.getElementById('font-print-select').value;

        const settingsUpserts = [
            { key: 'congregation_name', value: congName, updated_at: new Date() },
            { key: 'font_viewer', value: fontViewer, updated_at: new Date() },
            { key: 'font_manager', value: fontManager, updated_at: new Date() },
            { key: 'font_print', value: fontPrint, updated_at: new Date() }
        ];

        const { error: settingsErr } = await supabaseClient
            .from('app_settings')
            .upsert(settingsUpserts);

        if (settingsErr) throw settingsErr;

        // Instantly apply Manager Font to body
        ensureFontLoaded(fontManager);
        applyFontToBody(fontManager);

        // 2. Delete Nav Links
        if (deletedNavIds.length > 0) {
            await supabaseClient.from('navigation_links').delete().in('id', deletedNavIds);
        }

        // 3. Save Nav Links (Split into Update and Insert to avoid ID null issues)
        const updates = navLinks.filter(l => l.id).map(l => ({
            id: l.id,
            label: l.label,
            type: l.type,
            target: l.target,
            sort_order: l.sort_order
        }));

        const inserts = navLinks.filter(l => !l.id).map(l => ({
            label: l.label,
            type: l.type,
            target: l.target,
            sort_order: l.sort_order
        }));

        if (updates.length > 0) {
            const { error: upErr } = await supabaseClient.from('navigation_links').upsert(updates);
            if (upErr) throw upErr;
        }
        if (inserts.length > 0) {
            const { error: inErr } = await supabaseClient.from('navigation_links').insert(inserts);
            if (inErr) throw inErr;
        }

        alert('메뉴 설정이 저장되었습니다.');
        await loadNavLinks();
    } catch (e) {
        console.error(e);
        alert('메뉴 설정 저장 중 오류 발생: ' + e.message);
    }

}


function deleteWeek() {
    if (currentWeekFilter === 'all') {
        alert('삭제할 특정 주차를 선택해 주세요.');
        return;
    }

    if (!confirm(`${currentWeekFilter} 주차의 모든 데이터를 삭제하시겠습니까? (삭제 버튼을 눌러야 최종 반영됩니다)`)) return;

    // Find matching items
    const toDelete = weekdayData.filter(d => d.week_date === currentWeekFilter);
    toDelete.forEach(item => {
        if (item.id) deletedIds.push(item.id);
    });

    // Remove from local list
    weekdayData = weekdayData.filter(d => d.week_date !== currentWeekFilter);

    currentWeekFilter = 'all';
    renderWeekdayTable();
    updateWeekFilterDropdown();
    alert('삭제되었습니다. 변경사항을 서버에 반영하려면 [최종 변경사항 저장] 버튼을 눌러주세요.');
}

function deletePastWeeks() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const uniqueWeeks = [...new Set(weekdayData.map(d => d.week_date).filter(w => w))];
    const pastWeeks = uniqueWeeks.filter(w => {
        const parsed = parseWeekDate(w);
        // If the week ended before today, it's a past week
        return parsed && parsed.end < today;
    });

    if (pastWeeks.length === 0) {
        alert('삭제할 지난 계획서가 없습니다.');
        return;
    }

    if (!confirm(`지난 기간 모든 주차의 데이터를 모두 삭제하시겠습니까? (삭제 버튼을 눌러야 최종 반영됩니다)`)) return;

    pastWeeks.forEach(weekStr => {
        const toDelete = weekdayData.filter(d => d.week_date === weekStr);
        toDelete.forEach(item => {
            if (item.id) deletedIds.push(item.id);
        });
        weekdayData = weekdayData.filter(d => d.week_date !== weekStr);
    });

    currentWeekFilter = 'all';
    renderWeekdayTable();
    updateWeekFilterDropdown();
    alert(`${pastWeeks.length}개 주차의 데이터가 삭제되었습니다. [최종 변경사항 저장] 버튼을 눌러주세요.`);
}
async function loadWeekendData() {

    try {
        const { data: outData } = await supabaseClient.from('public_talk_outlines').select('*');
        outlines = outData || [];

        const dateFromVal = document.getElementById('search-date-from')?.value;
        const outlineNoVal = document.getElementById('search-outline-no')?.value;
        const keywordVal = document.getElementById('search-keyword')?.value;

        const startInput = document.getElementById('gen-start-date');
        const endInput = document.getElementById('gen-end-date');
        if (startInput && !startInput.value) {
            const now = new Date();
            const yearAhead = new Date();
            yearAhead.setFullYear(now.getFullYear() + 1);

            startInput.value = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
            endInput.value = `${yearAhead.getFullYear()}-${String(yearAhead.getMonth() + 1).padStart(2, '0')}-${String(yearAhead.getDate()).padStart(2, '0')}`;
        }

        let query = supabaseClient.from('public_talks').select('*').order('meeting_date', { ascending: true });

        if (dateFromVal) {
            query = query.gte('meeting_date', dateFromVal);
        } else {
            const todayStr = new Date().toLocaleDateString('en-CA'); // YYYY-MM-DD
            query = query.gte('meeting_date', todayStr);
        }

        if (outlineNoVal) {
            query = query.eq('outline_no', outlineNoVal);
        }

        if (keywordVal) {
            query = query.or(`speaker.ilike.%${keywordVal}%,topic.ilike.%${keywordVal}%,congregation.ilike.%${keywordVal}%`);
        }

        const { data, error } = await query;
        if (error) throw error;

        weekendData = data || [];
        deletedWeekendIds = [];
        renderWeekendTable();

        if (weekendData.length === 0) {

            const hasFilters = dateFromVal || outlineNoVal || keywordVal;
            if (hasFilters) {
                console.log('검색 조건에 맞는 결과가 없습니다.');
            } else {
                console.log('현재 시점의 주말일정이 없습니다. 우선 [주말일정 생성] 버튼을 눌러 일정을 만들어주세요.');
            }
        }
    } catch (e) {
        console.error(e);
        alert('주말 데이터를 불러오는 중 오류 발생');
    }

}

function resetWeekendFilters() {
    document.getElementById('search-date-from').value = '';
    document.getElementById('search-outline-no').value = '';
    document.getElementById('search-keyword').value = '';
    loadWeekendData();
}


async function deleteWeekendByRange() {
    const start = prompt('삭제할 기간의 시작 날짜를 입력하세요 (예: 2023-01-01)');
    if (!start) return;
    const end = prompt('삭제할 기간의 종료 날짜를 입력하세요 (예: 2023-12-31)');
    if (!end) return;

    if (!confirm(`${start} 부터 ${end} 까지의 모든 주말 일정을 시스템에서 완전히 삭제합니다.\n이 작업은 복구할 수 없습니다. 계속하시겠습니까?`)) {
        return;
    }


    try {
        const { count, error: countError } = await supabaseClient
            .from('public_talks')
            .select('*', { count: 'exact', head: true })
            .gte('meeting_date', start)
            .lte('meeting_date', end);

        if (countError) throw countError;

        if (count === 0) {
            alert('해당 기간에 삭제할 데이터가 없습니다.');

            return;
        }

        if (!confirm(`총 ${count}개의 일정이 검색되었습니다. 정말로 모두 영구 삭제하시겠습니까?`)) {

            return;
        }

        const { error: delError } = await supabaseClient
            .from('public_talks')
            .delete()
            .gte('meeting_date', start)
            .lte('meeting_date', end);

        if (delError) throw delError;

        alert(`${count}개의 일정이 성공적으로 삭제되었습니다.`);
        loadWeekendData();
    } catch (e) {
        console.error(e);
        alert('일괄 삭제 중 오류가 발생했습니다.');
    }

}

async function deleteSelectedWeekendRows() {
    const checkedBoxes = Array.from(document.querySelectorAll('.check-weekend:checked'));
    if (checkedBoxes.length === 0) {
        alert('삭제할 항목을 먼저 선택하세요.');
        return;
    }

    if (!confirm(`선택한 ${checkedBoxes.length}개의 일정(날짜 포함)을 시스템에서 완전히 삭제하시겠습니까?\n이 작업은 복구할 수 복구할 수 없습니다.`)) {
        return;
    }


    try {
        const idsToDelete = checkedBoxes.map(cb => cb.getAttribute('data-id')).filter(id => id);

        if (idsToDelete.length > 0) {
            const { error } = await supabaseClient.from('public_talks').delete().in('id', idsToDelete);
            if (error) throw error;
        }

        alert(`선택한 ${checkedBoxes.length}개의 항목이 성공적으로 삭제되었습니다.`);
        loadWeekendData();
    } catch (e) {
        console.error(e);
        alert('선택 삭제 중 오류가 발생했습니다.');
    }

}

async function handleBatchGenerate() {
    const start = document.getElementById('gen-start-date').value;
    const end = document.getElementById('gen-end-date').value;
    const day = parseInt(document.getElementById('gen-target-day').value);

    if (!start || !end) {
        alert('시작일과 종료일을 입력해주세요.');
        return;
    }

    const dayName = day === 0 ? '일요일' : '토요일';
    if (!confirm(`${start} ~ ${end} 기간 내의 모든 ${dayName} 빈 일정을 생성하시겠습니까?`)) return;


    try {
        const count = await syncWeekendSlots(start, end, day);
        alert(`${count}개의 일정이 생성되었습니다.`);
        loadWeekendData();
    } catch (e) {
        console.error(e);
        alert('일정 생성 중 오류가 발생했습니다.');
    }

}

async function syncWeekendSlots(startDateStr, endDateStr, targetDayOfWeek) {
    const start = new Date(startDateStr);
    const end = new Date(endDateStr);

    const dates = [];
    let current = new Date(start.getFullYear(), start.getMonth(), start.getDate(), 0, 0, 0);

    let diff = (targetDayOfWeek + 7 - current.getDay()) % 7;
    current.setDate(current.getDate() + diff);

    while (current <= end) {
        const yyyy = current.getFullYear();
        const mm = String(current.getMonth() + 1).padStart(2, '0');
        const dd = String(current.getDate()).padStart(2, '0');
        dates.push(`${yyyy}-${mm}-${dd}`);

        current.setDate(current.getDate() + 7);
    }

    if (dates.length === 0) return 0;

    const { data: existing } = await supabaseClient
        .from('public_talks')
        .select('meeting_date')
        .gte('meeting_date', dates[0])
        .lte('meeting_date', dates[dates.length - 1]);

    const existingDates = new Set(existing?.map(d => d.meeting_date) || []);
    const toInsert = dates.filter(d => !existingDates.has(d)).map(d => ({
        meeting_date: d
    }));

    if (toInsert.length > 0) {
        const { error } = await supabaseClient.from('public_talks').insert(toInsert);
        if (error) throw error;
    }
    return toInsert.length;
}

async function loadOutlines() {
    const { data } = await supabaseClient.from('public_talk_outlines').select('*').order('outline_no', { ascending: true });
    outlines = data || [];
}

function renderWeekendTable() {
    const tbody = document.querySelector('#weekend-data-table tbody');
    tbody.innerHTML = '';

    weekendData.forEach((row, idx) => {
        const tr = document.createElement('tr');
        const outlineTopic = outlines.find(o => o.outline_no === row.outline_no)?.topic || '';

        const d = new Date(row.meeting_date);
        const dateDisplay = isNaN(d) ? '' : `${String(d.getFullYear()).slice(-2)}/${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getDate()).padStart(2, '0')}`;

        // 중복 여부에 따른 배경색 적용
        let bgClass = '';
        if (row._dupStatus === '6month') {
            tr.style.backgroundColor = '#FFA500';
        } else if (row._dupStatus === '12month') {
            tr.style.backgroundColor = '#FFCC99';
        }

        tr.innerHTML = `
            <td style="text-align:center;"><input type="checkbox" class="check-weekend" data-id="${row.id || ''}"></td>
            <td class="col-date" style="text-align:center;">
                <div class="weekend-date-form">
                    <span class="weekend-date-display">${dateDisplay}</span>
                    <input type="date" value="${row.meeting_date || ''}" onchange="updateWeekendData(${idx}, 'meeting_date', this.value)" onclick="if(this.showPicker) this.showPicker()" style="background:transparent; border:none;">
                </div>
            </td>
            <td><input type="text" data-idx="${idx}" data-field="outline_no" value="${row.outline_no || ''}" onchange="handleOutlineChange(${idx}, this.value)" placeholder="번호" style="border:none; background:transparent; text-align:center;"></td>
            <td><input type="text" data-idx="${idx}" data-field="topic" value="${row.topic || outlineTopic}" onchange="updateWeekendData(${idx}, 'topic', this.value)" placeholder="주제" style="border:none; background:transparent;"></td>
            <td><input type="text" data-idx="${idx}" data-field="speaker" value="${row.speaker || ''}" onchange="updateWeekendData(${idx}, 'speaker', this.value)" style="border:none; background:transparent;"></td>
            <td><input type="text" data-idx="${idx}" data-field="congregation" value="${row.congregation || ''}" onchange="updateWeekendData(${idx}, 'congregation', this.value)" style="border:none; background:transparent;"></td>
            <td><input type="text" data-idx="${idx}" data-field="speaker_contact" value="${row.speaker_contact || ''}" onchange="updateWeekendData(${idx}, 'speaker_contact', this.value)" style="border:none; background:transparent;"></td>
            <td><input type="text" data-idx="${idx}" data-field="inviter" value="${row.inviter || ''}" onchange="updateWeekendData(${idx}, 'inviter', this.value)" style="border:none; background:transparent;"></td>
            <td><input type="text" data-idx="${idx}" data-field="chairman" value="${row.chairman || ''}" onchange="updateWeekendData(${idx}, 'chairman', this.value)" style="border:none; background:transparent;"></td>
            <td><input type="text" data-idx="${idx}" data-field="reader" value="${row.reader || ''}" onchange="updateWeekendData(${idx}, 'reader', this.value)" style="border:none; background:transparent;"></td>
            <td><input type="text" data-idx="${idx}" data-field="bible_reader" value="${row.bible_reader || ''}" onchange="updateWeekendData(${idx}, 'bible_reader', this.value)" style="border:none; background:transparent;"></td>
            <td><input type="text" data-idx="${idx}" data-field="prayer" value="${row.prayer || ''}" onchange="updateWeekendData(${idx}, 'prayer', this.value)" style="border:none; background:transparent;"></td>
            <td>
                <div class="action-btn-group">
                    <button onclick="openMoveModal(${idx})" class="btn-mini" style="background:#0984e3;" title="데이터 이동"><i class="fas fa-arrow-right"></i></button>
                    <button onclick="addWeekendRow(${idx})" class="btn-mini" style="background:#00b894;" title="추가"><i class="fas fa-plus"></i></button>
                    <button class="btn-mini" onclick="clearWeekendRow(${idx})" style="background:#d63031;" title="내용 초기화"><i class="fas fa-eraser"></i></button>
                </div>
            </td>
        `;
        tbody.appendChild(tr);
    });

    // Handle next focus after render
    if (nextFocusTarget.idx !== null && nextFocusTarget.field !== null) {
        const targetInput = document.querySelector(`input[data-idx="${nextFocusTarget.idx}"][data-field="${nextFocusTarget.field}"]`);
        if (targetInput) {
            targetInput.focus();
            if (targetInput.select) targetInput.select();
        }
        nextFocusTarget = { idx: null, field: null };
    }
}

window.updateWeekendData = (idx, field, value) => {
    weekendData[idx][field] = value;

    // Set next focus target in sequence
    const currentSeqIdx = weekendFieldSequence.indexOf(field);
    if (currentSeqIdx !== -1 && currentSeqIdx < weekendFieldSequence.length - 1) {
        nextFocusTarget = { idx, field: weekendFieldSequence[currentSeqIdx + 1] };
    }

    renderWeekendTable();
};

async function handleOutlineChange(idx, val) {
    if (!val) {
        weekendData[idx].outline_no = '';
        weekendData[idx].topic = '';
        weekendData[idx]._dupStatus = null;
        renderWeekendTable();
        return;
    }

    weekendData[idx].outline_no = val;

    const found = outlines.find(o => o.outline_no === val);
    if (found) {
        weekendData[idx].topic = found.topic;
    }

    // Auto-advance focus to speaker after outline (skipping topic)
    nextFocusTarget = { idx, field: 'speaker' };


    let meetingDate = new Date(weekendData[idx].meeting_date);
    if (isNaN(meetingDate)) meetingDate = new Date();

    const localDup = weekendData.find((d, i) => i !== idx && d.outline_no === val && d.meeting_date);
    if (localDup) {
        const dupDate = new Date(localDup.meeting_date);
        const diffMonths = (meetingDate - dupDate) / (1000 * 60 * 60 * 24 * 30);

        if (Math.abs(diffMonths) <= 6) {
            alert(`[경고] 현재 목록의 ${localDup.meeting_date} 일정과 골자가 중복됩니다. (6개월 내)\n강제로 입력하지만 주황색으로 표시됩니다.`);
            weekendData[idx]._dupStatus = '6month';
            renderWeekendTable();
            return;
        } else if (Math.abs(diffMonths) <= 12) {
            if (confirm(`[주의] 현재 목록의 ${localDup.meeting_date} 일정과 골자가 중복됩니다. (12개월 내)\n계속 입력하시겠습니까?`)) {
                weekendData[idx]._dupStatus = '12month';
                renderWeekendTable();
                return;
            } else {
                weekendData[idx].outline_no = '';
                weekendData[idx].topic = '';
                weekendData[idx]._dupStatus = null;
                renderWeekendTable();
                return;
            }
        }
    }

    const sixMonthsAgo = new Date(meetingDate);
    sixMonthsAgo.setMonth(meetingDate.getMonth() - 6);
    const twelveMonthsAgo = new Date(meetingDate);
    twelveMonthsAgo.setMonth(meetingDate.getMonth() - 12);

    try {
        const { data: dups } = await supabaseClient
            .from('public_talks')
            .select('meeting_date, speaker')
            .eq('outline_no', val)
            .neq('id', weekendData[idx].id || '00000000-0000-0000-0000-000000000000')
            .gte('meeting_date', twelveMonthsAgo.toISOString().split('T')[0])
            .lte('meeting_date', meetingDate.toISOString().split('T')[0]);

        if (dups && dups.length > 0) {
            const lastUsed = dups.sort((a, b) => new Date(b.meeting_date) - new Date(a.meeting_date))[0];
            const lastDate = new Date(lastUsed.meeting_date);

            if (lastDate >= sixMonthsAgo) {
                alert(`[경고] 서버 기록의 ${lastUsed.meeting_date} (${lastUsed.speaker || '정보없음'}) 일정과 중복됩니다. (6개월 내)\n주황색으로 표시됩니다.`);
                weekendData[idx]._dupStatus = '6month';
            } else {
                if (confirm(`[주의] 서버 기록의 ${lastUsed.meeting_date} (${lastUsed.speaker || '정보없음'}) 일정과 중복됩니다. (12개월 내)\n계속 입력하시겠습니까?`)) {
                    weekendData[idx]._dupStatus = '12month';
                } else {
                    weekendData[idx].outline_no = '';
                    weekendData[idx].topic = '';
                    weekendData[idx]._dupStatus = null;
                }
            }
        } else {
            weekendData[idx]._dupStatus = null;
        }
    } catch (e) {
        console.error('Duplicate check error:', e);
    }

    renderWeekendTable();
}

let moveSourceIdx = null;

function openMoveModal(idx) {
    moveSourceIdx = idx;
    const source = weekendData[idx];
    document.getElementById('move-source-info').textContent = `${source.meeting_date} 데이터를 어디로 이동할까요?`;

    const targetSelect = document.getElementById('move-target-select');
    targetSelect.innerHTML = '';

    weekendData.forEach((d, i) => {
        if (i !== idx) {
            const option = document.createElement('option');
            option.value = i;
            option.textContent = `${d.meeting_date} ${d.speaker ? '(' + d.speaker + ')' : '(미입력)'}`;
            targetSelect.appendChild(option);
        }
    });

    document.getElementById('move-data-modal').style.display = 'flex';
}

function closeMoveModal() {
    document.getElementById('move-data-modal').style.display = 'none';
}

async function executeMove() {
    const targetIdx = parseInt(document.getElementById('move-target-select').value);
    if (isNaN(targetIdx)) return;

    const source = weekendData[moveSourceIdx];
    const target = weekendData[targetIdx];

    if (target.speaker && !confirm('해당 날짜에 이미 데이터가 있습니다. 덮어씌울까요?')) return;

    const fields = ['outline_no', 'topic', 'speaker', 'congregation', 'speaker_contact', 'inviter'];
    fields.forEach(f => {
        target[f] = source[f];
        source[f] = '';
    });

    alert(`${source.meeting_date} 에서 ${target.meeting_date} 로 데이터가 이동했습니다.\n[최종 변경사항 저장]을 눌러야 서버에 반영됩니다.`);
    closeMoveModal();
    renderWeekendTable();
}

window.clearWeekendRow = (idx) => {
    if (!confirm('이 행의 내용을 초기화하시겠습니까? (날짜는 보존)')) return;
    const row = weekendData[idx];
    const fields = ['outline_no', 'topic', 'speaker', 'congregation', 'speaker_contact', 'inviter', 'chairman', 'reader', 'bible_reader', 'prayer'];
    fields.forEach(f => row[f] = '');
    row._dupStatus = null;
    renderWeekendTable();
};

function addWeekendRow(idx) {
    const baseDate = (typeof idx === 'number' && weekendData[idx]) ? weekendData[idx].meeting_date : '';

    const newRow = {
        meeting_date: baseDate,
        outline_no: '',
        topic: '',
        speaker: '',
        congregation: '',
        speaker_contact: '',
        inviter: '',
        chairman: '',
        reader: '',
        bible_reader: '',
        prayer: ''
    };

    if (typeof idx === 'number') {
        weekendData.splice(idx + 1, 0, newRow);
    } else {
        weekendData.push(newRow);
    }
    renderWeekendTable();
}

async function saveWeekendData() {

    try {
        if (deletedWeekendIds.length > 0) {
            await supabaseClient.from('public_talks').delete().in('id', deletedWeekendIds);
            deletedWeekendIds = [];
        }

        const toInsert = weekendData.filter(d => !d.id).map(d => ({
            meeting_date: d.meeting_date,
            outline_no: d.outline_no || null,
            topic: d.topic || null,
            speaker: d.speaker || null,
            congregation: d.congregation || null,
            speaker_contact: d.speaker_contact || null,
            inviter: d.inviter || null,
            chairman: d.chairman || null,
            reader: d.reader || null,
            bible_reader: d.bible_reader || null,
            prayer: d.prayer || null
        }));

        const toUpdate = weekendData.filter(d => d.id).map(d => ({
            id: d.id,
            meeting_date: d.meeting_date,
            outline_no: d.outline_no || null,
            topic: d.topic || null,
            speaker: d.speaker || null,
            congregation: d.congregation || null,
            speaker_contact: d.speaker_contact || null,
            inviter: d.inviter || null,
            chairman: d.chairman || null,
            reader: d.reader || null,
            bible_reader: d.bible_reader || null,
            prayer: d.prayer || null
        }));

        if (toInsert.length > 0) {
            const { error } = await supabaseClient
                .from('public_talks')
                .upsert(toInsert, { onConflict: 'meeting_date', ignoreDuplicates: false });
            if (error) throw error;
        }
        if (toUpdate.length > 0) {
            const { error } = await supabaseClient.from('public_talks').upsert(toUpdate);
            if (error) throw error;
        }

        alert('주말 데이터가 성공적으로 저장되었습니다.');
        broadcastChange('주말집회');
        await syncAssignmentHistory('weekend'); // 이력 동기화 추가
        loadWeekendData();
    } catch (e) {
        console.error(e);
        alert('저장 중 오류 발생');
    }

}

async function processOutlinesBulk() {
    const input = document.getElementById('outlines-bulk-input').value;
    if (!input.trim()) return alert('텍스트를 입력하세요.');

    const lines = input.split('\n');
    const parsed = [];
    const resultEl = document.getElementById('outlines-sync-result');
    resultEl.style.display = 'block';
    resultEl.innerHTML = '<span style="color:#0984e3;">분석 �?..</span>';

    lines.forEach(line => {
        const match = line.trim().match(/^(\d+)[.\-\s\t]+(.+)$/);
        if (match) {
            parsed.push({ outline_no: match[1], topic: match[2].trim() });
        }
    });

    if (parsed.length === 0) {
        resultEl.innerHTML = '<span style="color:#d63031;">분석할 데이터가 없습니다. 형식을 확인해주세요. (예: 1. 제목)</span>';
        return;
    }

    if (!confirm(`${parsed.length}개의 골자를 분석했습니다. DB에 동기화하시겠습니까?\n(기존 번호는 업데이트하고, 새 번호는 추가합니다)`)) return;


    try {
        const { error } = await supabaseClient.from('public_talk_outlines').upsert(parsed);
        if (error) throw error;

        resultEl.innerHTML = `<span style="color:#00b894; font-weight:bold;">성공: ${parsed.length}개의 골자가 동기화되었습니다.</span>`;
        await loadOutlines();
        renderWeekendTable();
    } catch (e) {
        console.error(e);
        resultEl.innerHTML = '<span style="color:#d63031;">?�류 발생: ' + e.message + '</span>';
    }

}

async function loadAdminAccounts() {
    if (adminInfo.role !== 'superadmin') return;


    try {
        const { data, error } = await supabaseClient
            .from('admin_users')
            .select('*')
            .order('username', { ascending: true });

        if (error) throw error;
        adminUsers = data || [];
        deletedAdminIds = [];
        renderAdminAccountsTable();
    } catch (e) {
        console.error(e);
        alert('계정 정보를 불러오는 중 오류 발생');
    }

}

function renderAdminAccountsTable() {
    const tbody = document.querySelector('#admin-accounts-table tbody');
    tbody.innerHTML = '';

    adminUsers.forEach((user, idx) => {
        const tr = document.createElement('tr');

        const isSelf = user.username === adminInfo.name;

        tr.innerHTML = `
            <td><input type="text" value="${escapeHtml(user.username)}" onchange="updateAdminUserData(${idx}, 'username', this.value)" ${isSelf ? 'disabled' : ''}></td>
            <td><input type="text" value="${escapeHtml(user.password)}" onchange="updateAdminUserData(${idx}, 'password', this.value)"></td>
            <td>
                <select onchange="updateAdminUserData(${idx}, 'role', this.value)">
                    <option value="superadmin" ${user.role === 'superadmin' ? 'selected' : ''}>최고관리자</option>
                    <option value="admin" ${user.role !== 'superadmin' ? 'selected' : ''}>일반관리자</option>
                </select>
            </td>
            <td style="text-align:center;">
                <input type="checkbox" ${user.can_manage_weekday !== false ? 'checked' : ''} onchange="updateAdminUserData(${idx}, 'can_manage_weekday', this.checked)">
            </td>
            <td style="text-align:center;">
                <input type="checkbox" ${user.can_manage_weekend !== false ? 'checked' : ''} onchange="updateAdminUserData(${idx}, 'can_manage_weekend', this.checked)">
            </td>
            <td style="text-align:center;">
                ${isSelf ? '-' : `<span class="btn-delete" onclick="deleteAdminAccount(${idx})"><i class="fas fa-trash"></i></span>`}
            </td>
        `;
        tbody.appendChild(tr);
    });
}

window.updateAdminUserData = (idx, field, value) => {
    adminUsers[idx][field] = value;
};

window.deleteAdminAccount = (idx) => {
    if (!confirm('이 계정을 삭제하시겠습니까?')) return;
    const user = adminUsers[idx];
    if (user.id) deletedAdminIds.push(user.id);
    adminUsers.splice(idx, 1);
    renderAdminAccountsTable();
};

function addAdminAccountRow() {
    adminUsers.push({
        username: '',
        password: '',
        role: 'admin',
        can_manage_weekday: true,
        can_manage_weekend: true
    });
    renderAdminAccountsTable();
}

async function saveAdminAccounts() {

    try {
        if (deletedAdminIds.length > 0) {
            await supabaseClient.from('admin_users').delete().in('id', deletedAdminIds);
            deletedAdminIds = [];
        }

        const toInsert = adminUsers.filter(u => !u.id);
        const toUpdate = adminUsers.filter(u => u.id);

        if (toInsert.length > 0) {
            const { error } = await supabaseClient.from('admin_users').insert(toInsert);
            if (error) throw error;
        }
        if (toUpdate.length > 0) {
            const { error } = await supabaseClient.from('admin_users').upsert(toUpdate);
            if (error) throw error;
        }

        alert('계정 정보가 성공적으로 저장되었습니다.');
        await loadAdminAccounts();
    } catch (e) {
        console.error(e);
        alert('저장 중 오류 발생');
    }

}
let presenceChannel = null;

function initPresence() {
    if (!adminInfo || !adminInfo.name) return;

    if (presenceChannel) {
        supabaseClient.removeChannel(presenceChannel);
    }

    presenceChannel = supabaseClient.channel('manager_presence');

    presenceChannel
        .on('presence', { event: 'sync' }, () => {
            const state = presenceChannel.presenceState();
            updatePresenceUI(state);
        })
        .on('broadcast', { event: 'data_saved' }, ({ payload }) => {
            showSyncToast(payload.adminName, payload.tabType);
        })
        .subscribe(async (status) => {
            if (status === 'SUBSCRIBED') {
                await presenceChannel.track({
                    name: adminInfo.name,
                    online_at: new Date().toISOString(),
                });
            }
        });
}

function updatePresenceUI(state) {
    const listElement = document.getElementById('active-admins-list');
    if (!listElement) return;

    const activeUserNames = [];
    const uniqueUserNames = new Set();

    for (const key in state) {
        state[key].forEach(presence => {
            if (presence.name) uniqueUserNames.add(presence.name);
        });
    }

    uniqueUserNames.forEach(name => {
        if (name === adminInfo.name) {
            activeUserNames.push(`${name}(나)`);
        } else {
            activeUserNames.push(name);
        }
    });

    if (activeUserNames.length > 0) {
        listElement.textContent = `현재 접속 중: ${activeUserNames.join(', ')}`;
    } else {
        listElement.textContent = '현재 접속 중: 아무도 없음..';
    }
}

function broadcastChange(tabType) {
    if (presenceChannel) {
        presenceChannel.send({
            type: 'broadcast',
            event: 'data_saved',
            payload: {
                adminName: adminInfo.name,
                tabType: tabType
            }
        });
    }
}

function showSyncToast(adminName, tabType) {
    const toast = document.getElementById('sync-toast');
    const msg = document.getElementById('sync-toast-msg');
    const btn = document.getElementById('btn-sync-now');

    if (!toast || !msg || !btn) return;

    msg.innerHTML = `방금 <b>${adminName}</b> 관리자가 <b>${tabType}</b>에서 저장했습니다.`;
    toast.style.display = 'flex';

    btn.onclick = () => {
        if (confirm('최신 데이터를 불러오시겠습니까? 현재까지 저장하지 않은 작업 내용은 소실됩니다.')) {
            loadAllData();
            toast.style.display = 'none';
        }
    };

    setTimeout(() => {
        if (toast.style.display === 'flex') {
            toast.style.display = 'none';
        }
    }, 10000);
}

// ==========================================
// 전도인 관리 (Publisher Management)
// ==========================================

async function loadPublishers() {
    try {
        const { data, error } = await supabaseClient
            .from('publishers')
            .select('*')
            .order('name', { ascending: true });

        if (error) throw error;
        publishers = data || [];
        deletedPublisherIds = [];
        renderPublishersTable();
    } catch (e) {
        console.error(e);
        alert('전도인 정보를 불러오는 중 오류 발생');
    }
}

function renderPublishersTable() {
    const tbody = document.querySelector('#publisher-data-table tbody');
    if (!tbody) return;
    tbody.innerHTML = '';

    publishers.forEach((p, idx) => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td><input type="text" value="${escapeHtml(p.name || '')}" onchange="updatePublisherData(${idx}, 'name', this.value)" style="width:100%;"></td>
            <td>
                <select onchange="updatePublisherData(${idx}, 'gender', this.value)">
                    <option value="남" ${p.gender === '남' ? 'selected' : ''}>남</option>
                    <option value="여" ${p.gender === '여' ? 'selected' : ''}>여</option>
                </select>
            </td>
            <td><input type="number" value="${p.birth_year || ''}" onchange="updatePublisherData(${idx}, 'birth_year', parseInt(this.value))" placeholder="1990" style="width:100%;"></td>
            <td><input type="checkbox" ${p.can_chairman ? 'checked' : ''} onchange="updatePublisherData(${idx}, 'can_chairman', this.checked)"></td>
            <td><input type="checkbox" ${p.can_reading ? 'checked' : ''} onchange="updatePublisherData(${idx}, 'can_reading', this.checked)"></td>
            <td><input type="checkbox" ${p.can_field_service ? 'checked' : ''} onchange="updatePublisherData(${idx}, 'can_field_service', this.checked)"></td>
            <td><input type="checkbox" ${p.can_talk ? 'checked' : ''} onchange="updatePublisherData(${idx}, 'can_talk', this.checked)"></td>
            <td><input type="checkbox" ${p.can_bible_study ? 'checked' : ''} onchange="updatePublisherData(${idx}, 'can_bible_study', this.checked)"></td>
            <td style="text-align:center;">
                <button class="btn-mini btn-mini-del" onclick="deletePublisherRow(${idx})"><i class="fas fa-trash"></i></button>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

window.updatePublisherData = (idx, field, value) => {
    // If it's the birth_year field and value is NaN, set to null
    if (field === 'birth_year' && isNaN(value)) {
        value = null;
    }
    publishers[idx][field] = value;
};

function addPublisherRow() {
    publishers.push({
        name: '',
        gender: '남',
        birth_year: null,
        can_chairman: false,
        can_reading: false,
        can_field_service: false,
        can_talk: false,
        can_bible_study: false
    });
    renderPublishersTable();
}

window.deletePublisherRow = (idx) => {
    if (!confirm('이 전도인을 명단에서 삭제하시겠습니까?')) return;
    const p = publishers[idx];
    if (p.id) deletedPublisherIds.push(p.id);
    publishers.splice(idx, 1);
    renderPublishersTable();
};

async function savePublishers() {
    try {
        if (deletedPublisherIds.length > 0) {
            await supabaseClient.from('publishers').delete().in('id', deletedPublisherIds);
            deletedPublisherIds = [];
        }

        // Clean data before sending to Supabase
        const cleanData = publishers.map(p => ({
            id: p.id, // Only for toUpdate
            name: p.name || '',
            gender: p.gender || '남',
            birth_year: (p.birth_year === null || isNaN(p.birth_year)) ? null : parseInt(p.birth_year),
            can_chairman: !!p.can_chairman,
            can_reading: !!p.can_reading,
            can_field_service: !!p.can_field_service,
            can_bible_study: !!p.can_bible_study,
            can_talk: !!p.can_talk
        }));

        const toInsert = cleanData.filter(p => !p.id).map(p => {
            const { id, ...rest } = p;
            return rest;
        });
        const toUpdate = cleanData.filter(p => p.id);

        if (toInsert.length > 0) {
            const { error } = await supabaseClient.from('publishers').insert(toInsert);
            if (error) throw error;
        }
        if (toUpdate.length > 0) {
            const { error } = await supabaseClient.from('publishers').upsert(toUpdate);
            if (error) throw error;
        }

        alert('전도인 명단이 저장되었습니다.');
        loadPublishers();
    } catch (e) {
        console.error(e);
        alert('저장 중 오류 발생');
    }
}

async function prepareAssignmentMgmt() {
    const summaryEl = document.getElementById('assignment-history-summary');
    if (!summaryEl) return;
    summaryEl.textContent = '배정 이력 데이터를 분석하는 중...';

    try {
        // 1. 배정 이력 테이블에서 전체 데이터 가져오기
        const { data: dbHistory, error } = await supabaseClient
            .from('assignment_history')
            .select('*');
        if (error) throw error;

        // 2. 현재 화면에 있는 평일 데이터(저장 전 변경사항 포함 가능)의 주차/날짜 목록 추출
        const localWeeks = [...new Set(weekdayData.map(d => d.week_date).filter(w => w))];
        const localWeekDates = localWeeks.map(w => parseWeekDate(w)?.start?.toISOString().split('T')[0]).filter(d => d);

        // 3. DB 이력 중 평일 관련 이력만 필터링하고 현재 화면과 겹치는 날짜는 제외
        const combinedHistory = (dbHistory || [])
            .filter(h => !['주말사회', '낭독', '기도'].includes(h.task_type))
            .filter(h => !localWeekDates.includes(h.meeting_date))
            .map(h => ({
                name: h.publisher_name,
                date: new Date(h.meeting_date),
                type: h.task_type,
                partner: h.partner_name
            }));

        // 4. 현재 화면(로컬)의 평일 배정 정보를 이력에 추가
        weekdayData.forEach(row => {
            const startDate = parseWeekDate(row.week_date)?.start;
            if (!startDate) return;
            if (row.assignee_1) combinedHistory.push({ name: row.assignee_1, date: startDate, type: row.part_num, partner: row.assignee_2 });
            if (row.assignee_2) combinedHistory.push({ name: row.assignee_2, date: startDate, type: row.part_num, partner: row.assignee_1 });
        });

        assignmentHistory = combinedHistory;

        // 전도인 정보도 최신화
        const { data: pubRes } = await supabaseClient.from('publishers').select('*');
        publishers = pubRes || [];

        renderAssignmentSummaryTable();
    } catch (e) {
        console.error(e);
        summaryEl.textContent = '데이터 분석 중 오류가 발생했습니다.';
    }
}

function renderAssignmentSummaryTable() {
    const summaryEl = document.getElementById('assignment-history-summary');
    if (!summaryEl) return;

    // 최근 배정 정보를 전도인별로 정리
    const rows = publishers.map(p => {
        const myHistory = assignmentHistory.filter(h => h.name === p.name).sort((a, b) => b.date - a.date);
        if (myHistory.length > 0) {
            const last = myHistory[0];
            return {
                name: p.name,
                date: last.date,
                type: last.type || '-',
                hasHistory: true
            };
        } else {
            return {
                name: p.name,
                date: new Date(0), // earliest possible date so it sorts correctly
                type: '-',
                hasHistory: false
            };
        }
    });

    // 정렬 수행
    rows.sort((a, b) => {
        let cmp = 0;
        if (assignmentSortField === 'name') {
            cmp = a.name.localeCompare(b.name, 'ko-KR');
        } else if (assignmentSortField === 'date') {
            cmp = a.date - b.date;
            if (cmp === 0) {
                cmp = a.name.localeCompare(b.name, 'ko-KR');
            }
        } else if (assignmentSortField === 'part') {
            cmp = a.type.localeCompare(b.type, 'ko-KR');
            if (cmp === 0) {
                cmp = a.date - b.date;
                if (cmp === 0) {
                    cmp = a.name.localeCompare(b.name, 'ko-KR');
                }
            }
        }
        return cmp * (assignmentSortAsc ? 1 : -1);
    });

    let summaryHtml = `<div style="margin-bottom:15px;">
        <strong style="color:var(--primary);">분석 완료:</strong> 총 ${assignmentHistory.length}건의 이력이 확인되었습니다. (현재 화면 내용 포함)<br>
        <span style="font-size:0.8rem; color:var(--gray-500);">* 아래는 각 전도인의 가장 최근 배정 정보입니다. 각 열(이름, 최근 배정일, 최근 파트) 제목을 클릭하여 정렬할 수 있습니다.</span>
    </div>`;

    const getIndicator = (field) => {
        if (assignmentSortField === field) {
            return assignmentSortAsc ? ' <span style="font-size:0.65rem;">▲</span>' : ' <span style="font-size:0.65rem;">▼</span>';
        }
        return '';
    };

    summaryHtml += `<table class="data-table" style="font-size:0.75rem; margin-top:10px;">
        <thead>
            <tr>
                <th onclick="toggleAssignmentSort('name')" style="cursor:pointer; user-select:none; text-align:center; transition: background-color 0.2s;">이름${getIndicator('name')}</th>
                <th onclick="toggleAssignmentSort('date')" style="cursor:pointer; user-select:none; text-align:center; transition: background-color 0.2s;">최근 배정일${getIndicator('date')}</th>
                <th onclick="toggleAssignmentSort('part')" style="cursor:pointer; user-select:none; text-align:center; transition: background-color 0.2s;">최근 파트${getIndicator('part')}</th>
            </tr>
        </thead>
        <tbody>`;

    rows.forEach(r => {
        if (r.hasHistory) {
            const dateStr = r.date.toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' });
            summaryHtml += `<tr>
                <td style="text-align:center; font-weight:bold;">${r.name}</td>
                <td style="text-align:center;">${dateStr}</td>
                <td style="text-align:center;">${r.type}</td>
            </tr>`;
        } else {
            summaryHtml += `<tr>
                <td style="text-align:center; font-weight:bold;">${r.name}</td>
                <td colspan="2" style="color:var(--gray-400); text-align:center;">기록 없음</td>
            </tr>`;
        }
    });

    summaryHtml += `</tbody></table>`;
    summaryEl.innerHTML = summaryHtml;
}

window.toggleAssignmentSort = (field) => {
    if (assignmentSortField === field) {
        assignmentSortAsc = !assignmentSortAsc;
    } else {
        assignmentSortField = field;
        assignmentSortAsc = true;
    }
    renderAssignmentSummaryTable();
};

async function executeAutoAssignment() {
    const selectedWeek = document.getElementById('assign-week-filter')?.value || 'all';
    const weekLabel = selectedWeek === 'all' ? '전체 주차' : selectedWeek;

    if (!confirm(`[${weekLabel}]의 비어있는 배정 항목들을 자동으로 채우시겠습니까?\n이전 배정 이력을 분석하여 최적의 전도인을 배정합니다.`)) return;

    await loadAllData(); 
    await loadWeekendData();
    await prepareAssignmentMgmt();

    let changeCount = 0;

    // 평일 데이터 필터링
    const targetWeekdayData = selectedWeek === 'all' 
        ? weekdayData 
        : weekdayData.filter(d => d.week_date === selectedWeek);

    // 주말 데이터 필터링 (선택된 주차의 범위 내에 있는 날짜만)
    let targetWeekendData = weekendData;
    if (selectedWeek !== 'all') {
        const range = parseWeekDate(selectedWeek);
        if (range) {
            targetWeekendData = weekendData.filter(d => {
                const meetingDate = new Date(d.meeting_date);
                return meetingDate >= range.start && meetingDate <= range.end;
            });
        }
    }

    targetWeekdayData.forEach(row => {
        if (row.assignee_1) return; 

        let taskType = '';
        let filterField = '';

        if (row.part_num && row.part_num.includes('사회')) {
            filterField = 'can_chairman';
            taskType = 'chairman';
        } else if (row.content && row.content.includes('성경 낭독')) {
            filterField = 'can_reading';
            taskType = 'reading';
        } else if (row.category === 'ministry') {
            filterField = 'can_field_service';
            taskType = 'ministry';
        } else if (row.category === 'living' && row.content.includes('연구')) {
            filterField = 'can_bible_study';
            taskType = 'bible_study';
        }

        if (filterField) {
            // 배정자 1 배정
            const candidate1 = findBestCandidate(filterField, taskType);
            if (candidate1) {
                row.assignee_1 = candidate1.name;
                changeCount++;
                assignmentHistory.push({ name: candidate1.name, date: parseWeekDate(row.week_date).start, type: taskType, partner: row.assignee_2 });

                // 만약 2인 배정이 필요한 파트라면 (예: 야외봉사 항목) assignee_2도 시도
                if (row.category === 'ministry' && !row.assignee_2) {
                    const candidate2 = findBestCandidate(filterField, taskType, candidate1.name);
                    if (candidate2 && candidate2.name !== candidate1.name) {
                        row.assignee_2 = candidate2.name;
                        changeCount++;
                        assignmentHistory.push({ name: candidate2.name, date: parseWeekDate(row.week_date).start, type: taskType, partner: candidate1.name });
                    }
                }
            }
        }
    });

    targetWeekendData.forEach(row => {
        if (!row.chairman) {
            const candidate = findBestCandidate('can_chairman', 'chairman');
            if (candidate) {
                row.chairman = candidate.name;
                changeCount++;
                assignmentHistory.push({ name: candidate.name, date: new Date(row.meeting_date), type: 'chairman' });
            }
        }
        if (!row.reader) {
            const candidate = findBestCandidate('can_reading', 'reading');
            if (candidate) {
                row.reader = candidate.name;
                changeCount++;
                assignmentHistory.push({ name: candidate.name, date: new Date(row.meeting_date), type: 'reading' });
            }
        }
    });

    if (changeCount > 0) {
        alert(`${changeCount}개의 배정이 자동으로 완료되었습니다. 내용을 확인하고 '저장' 버튼을 각각 눌러주세요.`);
        renderWeekdayTable();
        renderWeekendTable();
    } else {
        alert('자동 배정할 수 있는 빈 항목이 없거나 적합한 전도인을 찾지 못했습니다.');
    }
}

function findBestCandidate(filterField, taskType, currentPartnerName = null) {
    let candidates = publishers.filter(p => p[filterField] === true);
    if (candidates.length === 0) return null;

    candidates.forEach(p => {
        const myHistory = assignmentHistory.filter(h => h.name === p.name);
        if (myHistory.length === 0) {
            p._lastDate = new Date(0); 
            p._lastPartner = null;
        } else {
            const sorted = myHistory.sort((a, b) => b.date - a.date);
            p._lastDate = sorted[0].date;
            p._lastPartner = sorted[0].partner;
        }
    });

    // 우선순위 정렬: 
    // 1. 배정일이 오래된 사람 우선
    // 2. 만약 현재 파트너(있다면)가 직전 파트너와 같다면 순위를 뒤로 미룸
    candidates.sort((a, b) => {
        // 직전 파트너 중복 체크 (가점/감점 방식)
        let scoreA = a._lastDate.getTime();
        let scoreB = b._lastDate.getTime();

        if (currentPartnerName) {
            if (a._lastPartner === currentPartnerName) scoreA += 1000 * 60 * 60 * 24 * 30; // 약 한달치 패널티
            if (b._lastPartner === currentPartnerName) scoreB += 1000 * 60 * 60 * 24 * 30;
        }

        return scoreA - scoreB;
    });

    return candidates[0];
}

// ==========================================
// 배정 이력 동기화 (Assignment History Sync)
// ==========================================

async function syncAssignmentHistory(type) {
    try {
        if (type === 'weekday') {
            // 현재 화면에 표시된 주차(week_date)들의 이력을 삭제 후 재생성
            const uniqueWeeks = [...new Set(weekdayData.map(d => d.week_date).filter(w => w))];
            for (const weekStr of uniqueWeeks) {
                const startDate = parseWeekDate(weekStr)?.start;
                if (!startDate) continue;
                const startDateStr = startDate.toISOString().split('T')[0];

                // 1. 해당 주차의 기존 이력 삭제
                await supabaseClient.from('assignment_history').delete().eq('meeting_date', startDateStr);

                // 2. 새로운 이력 추출 및 삽입
                const weekParts = weekdayData.filter(d => d.week_date === weekStr);
                const newHistory = [];
                weekParts.forEach(p => {
                    if (p.assignee_1) {
                        newHistory.push({
                            publisher_name: p.assignee_1,
                            task_type: p.part_num || 'weekday_part',
                            meeting_date: startDateStr,
                            partner_name: p.assignee_2 || null
                        });
                    }
                    if (p.assignee_2) {
                        newHistory.push({
                            publisher_name: p.assignee_2,
                            task_type: p.part_num || 'weekday_part',
                            meeting_date: startDateStr,
                            partner_name: p.assignee_1 || null
                        });
                    }
                });

                if (newHistory.length > 0) {
                    await supabaseClient.from('assignment_history').insert(newHistory);
                }
            }
        } else if (type === 'weekend') {
            // 현재 화면에 표시된 모든 날짜의 이력을 삭제 후 재생성
            const uniqueDates = [...new Set(weekendData.map(d => d.meeting_date).filter(d => d))];
            for (const dateStr of uniqueDates) {
                // 1. 해당 날짜의 기존 이력 삭제
                await supabaseClient.from('assignment_history').delete().eq('meeting_date', dateStr);

                // 2. 새로운 이력 추출 및 삽입
                const row = weekendData.find(d => d.meeting_date === dateStr);
                if (!row) continue;

                const newHistory = [];
                if (row.chairman) newHistory.push({ publisher_name: row.chairman, task_type: '주말사회', meeting_date: dateStr });
                if (row.reader) newHistory.push({ publisher_name: row.reader, task_type: '낭독', meeting_date: dateStr });
                if (row.prayer) newHistory.push({ publisher_name: row.prayer, task_type: '기도', meeting_date: dateStr });

                if (newHistory.length > 0) {
                    await supabaseClient.from('assignment_history').insert(newHistory);
                }
            }
        }
        console.log(`[Sync] ${type} assignment history synchronized.`);
    } catch (e) {
        console.error('History sync error:', e);
    }
}

// ==========================================
// 평일 집회 배정 도우미 (Assignment Helper)
// ==========================================

async function loadAssignmentHelperData() {
    // 1. 전도인 명단이 비어있는 경우 로드
    if (publishers.length === 0) {
        const { data: pubRes, error: pubErr } = await supabaseClient
            .from('publishers')
            .select('*')
            .order('name', { ascending: true });
        if (pubErr) throw pubErr;
        publishers = pubRes || [];
    }

    // 2. 배정 이력 테이블에서 데이터 로드 (매번 최신 상태 유지)
    const { data: dbHistory, error: histErr } = await supabaseClient
        .from('assignment_history')
        .select('*');
    if (histErr) throw histErr;

    // 3. 현재 로컬 화면에 있는 평일 주차/날짜 데이터 목록
    const localWeeks = [...new Set(weekdayData.map(d => d.week_date).filter(w => w))];
    const localWeekDates = localWeeks.map(w => parseWeekDate(w)?.start?.toISOString().split('T')[0]).filter(d => d);

    // 4. 로컬 화면 데이터와 겹치지 않으며 주말 이력을 제외한 평일 DB 이력만 추출
    const combinedHistory = (dbHistory || [])
        .filter(h => !['주말사회', '낭독', '기도'].includes(h.task_type))
        .filter(h => !localWeekDates.includes(h.meeting_date))
        .map(h => ({
            name: h.publisher_name,
            date: new Date(h.meeting_date),
            type: h.task_type,
            partner: h.partner_name
        }));

    // 5. 현재 로컬 화면에 있는 평일 배정 내역을 임시 이력에 병합
    weekdayData.forEach(row => {
        const startDate = parseWeekDate(row.week_date)?.start;
        if (!startDate) return;
        if (row.assignee_1) combinedHistory.push({ name: row.assignee_1, date: startDate, type: row.part_num || 'weekday_part', partner: row.assignee_2 });
        if (row.assignee_2) combinedHistory.push({ name: row.assignee_2, date: startDate, type: row.part_num || 'weekday_part', partner: row.assignee_1 });
    });

    assignmentHistory = combinedHistory;
}

async function openAssignmentHelper(rowIdx, field) {
    activeHelperRowIdx = rowIdx;
    activeHelperField = field;
    activeHelperFilterOnly = true;

    const modal = document.getElementById('assignment-helper-modal');
    if (!modal) return;

    modal.style.display = 'flex';
    document.getElementById('assignment-helper-content').innerHTML = `
        <div style="padding:40px 20px; text-align:center; color:var(--gray-500);">
            <i class="fas fa-spinner fa-spin" style="font-size:1.8rem; color:var(--primary); margin-bottom:12px;"></i>
            <p style="font-weight:600; font-size:0.88rem;">전도인 명단 및 배정 이력을 분석하고 있습니다...</p>
        </div>
    `;

    try {
        await loadAssignmentHelperData();
        renderAssignmentHelper();
    } catch (e) {
        console.error(e);
        document.getElementById('assignment-helper-content').innerHTML = `
            <div style="padding:40px 20px; text-align:center; color:var(--danger);">
                <i class="fas fa-exclamation-circle" style="font-size:1.8rem; margin-bottom:12px;"></i>
                <p style="font-weight:600; font-size:0.88rem;">데이터 분석 중 오류가 발생했습니다.</p>
                <p style="font-size:0.75rem; color:var(--gray-500); margin-top:4px;">${escapeHtml(e.message || '')}</p>
            </div>
        `;
    }
}

function renderAssignmentHelper() {
    const contentEl = document.getElementById('assignment-helper-content');
    if (!contentEl) return;

    const row = weekdayData[activeHelperRowIdx];
    if (!row) return;

    let filterField = '';
    let taskType = '';
    let roleLabel = '';

    // 1. 역할 판단
    if (row.category === 'top') {
        filterField = 'can_chairman';
        taskType = 'chairman';
        roleLabel = '집회 사회 가능자';
    } else if (row.category === 'treasures') {
        if ((row.part_num && row.part_num.includes('3')) || (row.content && row.content.includes('성경 낭독'))) {
            filterField = 'can_reading';
            taskType = 'reading';
            roleLabel = '성경 낭독 (보물3) 가능자';
        } else {
            filterField = 'can_talk';
            taskType = 'talk';
            roleLabel = '성경에 담긴 보물 1, 2 가능자 (연설)';
        }
    } else if (row.category === 'ministry') {
        filterField = 'can_field_service';
        taskType = 'ministry';
        roleLabel = '실연 가능자';
    } else if (row.category === 'living') {
        if (row.content && (row.content.includes('연구') || row.content.includes('회중 성서 연구'))) {
            filterField = 'can_bible_study';
            taskType = 'bible_study';
            roleLabel = '회중 성서 연구 사회자';
        } else {
            filterField = '';
            taskType = 'living_other';
            roleLabel = '전체 전도인 (일반 파트)';
        }
    } else {
        filterField = '';
        taskType = 'other';
        roleLabel = '전체 전도인';
    }

    // 전도인 필터링
    const forceEligibleOnly = (row.category === 'top');
    let eligiblePublishers = [];
    if (activeHelperFilterOnly || forceEligibleOnly) {
        if (filterField) {
            eligiblePublishers = publishers.filter(p => p[filterField] === true);
        } else {
            eligiblePublishers = [...publishers];
        }
    } else {
        eligiblePublishers = [...publishers];
    }

    // 각 전도인의 마지막 배정 정보 분석
    eligiblePublishers.forEach(p => {
        const allHist = assignmentHistory.filter(h => h.name === p.name).sort((a, b) => b.date - a.date);
        
        let matchHist = [];
        if (taskType === 'chairman') {
            matchHist = assignmentHistory.filter(h => h.name === p.name && (h.type === 'chairman' || h.type.includes('사회'))).sort((a, b) => b.date - a.date);
        } else if (taskType === 'talk') {
            matchHist = assignmentHistory.filter(h => h.name === p.name && (h.type === 'talk' || h.type.includes('연설') || h.type.includes('보물'))).sort((a, b) => b.date - a.date);
        } else if (taskType === 'reading') {
            matchHist = assignmentHistory.filter(h => h.name === p.name && (h.type === 'reading' || h.type.includes('낭독'))).sort((a, b) => b.date - a.date);
        } else if (taskType === 'ministry') {
            matchHist = assignmentHistory.filter(h => h.name === p.name && (h.type === 'ministry' || h.type === '야외봉사')).sort((a, b) => b.date - a.date);
        } else if (taskType === 'bible_study') {
            matchHist = assignmentHistory.filter(h => h.name === p.name && (h.type === 'bible_study' || h.type.includes('연구') || h.type.includes('서적'))).sort((a, b) => b.date - a.date);
        } else {
            matchHist = allHist;
        }

        p._lastDate = matchHist.length > 0 ? matchHist[0].date : new Date(0);
        p._lastPart = matchHist.length > 0 ? matchHist[0].type : '-';
        p._overallLastDate = allHist.length > 0 ? allHist[0].date : new Date(0);
        p._overallLastPart = allHist.length > 0 ? allHist[0].type : '-';
    });

    // 정렬 수행: 
    // 1. 해당 역할 배정일이 가장 오래되었거나(never assigned) 과거인 순서
    // 2. 전체 배정일이 가장 오래된 순서
    // 3. 이름 한글 자음순
    eligiblePublishers.sort((a, b) => {
        let cmp = a._lastDate - b._lastDate;
        if (cmp === 0) {
            cmp = a._overallLastDate - b._overallLastDate;
            if (cmp === 0) {
                cmp = a.name.localeCompare(b.name, 'ko-KR');
            }
        }
        return cmp;
    });

    // 헤더 및 안내 영역 렌더링
    let html = `
        <div style="margin-bottom:16px; background:var(--gray-50); border:1px solid var(--border); padding:12px; border-radius:var(--radius); font-size:0.82rem;">
            <div style="display:flex; justify-content:space-between; flex-wrap:wrap; gap:8px;">
                <div><b>주차:</b> <span style="color:var(--primary); font-weight:600;">${escapeHtml(row.week_date || '')}</span></div>
                <div><b>항목:</b> <span style="font-weight:600;">${escapeHtml(row.part_num || '')} ${escapeHtml(row.content || '')}</span></div>
                <div><b>역할 분류:</b> <span class="badge-num" style="background:var(--primary-bg); color:var(--primary); font-weight:bold; border-radius:12px; padding:2px 8px; font-size:0.75rem;">${roleLabel}</span></div>
            </div>
        </div>

        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:14px; flex-wrap:wrap; gap:8px;">
            <div style="font-size:0.78rem; color:var(--gray-500); line-height:1.4;">
                * 목록에서 <b>이름을 클릭</b>하면 입력란에 즉시 대입됩니다.<br>
                * <b>추천 1순위 (이번 차례)</b>: 해당 역할을 수행한 지 가장 오래되었거나 이력이 없는 전도인입니다.
            </div>
            <div class="field-group" style="align-self: flex-end; ${row.category === 'top' ? 'display:none;' : ''}">
                <label class="field-label" style="margin-right:4px;">필터:</label>
                <select class="field" onchange="toggleHelperFilter(this.value)" style="height:34px; padding:4px 8px; font-size:0.78rem; border-radius:6px;">
                    <option value="eligible" ${activeHelperFilterOnly ? 'selected' : ''}>배정 가능 전도인만 보기</option>
                    <option value="all" ${!activeHelperFilterOnly ? 'selected' : ''}>전체 전도인 보기</option>
                </select>
            </div>
        </div>

        <div style="max-height:360px; overflow-y:auto; border:1px solid var(--border); border-radius:var(--radius);">
            <table class="data-table" style="font-size:0.78rem; text-align:center;">
                <thead>
                    <tr>
                        <th style="width:100px;">이름</th>
                        <th style="width:110px;">추천 상태</th>
                        <th style="width:130px;">마지막 배정 (해당 파트)</th>
                        <th>마지막 파트 내용 (해당 파트)</th>
                        <th style="width:130px;">마지막 배정 (전체)</th>
                    </tr>
                </thead>
                <tbody>
    `;

    if (eligiblePublishers.length === 0) {
        html += `
            <tr>
                <td colspan="5" style="padding:32px; color:var(--gray-400); text-align:center; font-weight:500;">조건에 일치하는 전도인이 없습니다.</td>
            </tr>
        `;
    } else {
        eligiblePublishers.forEach((p, index) => {
            const hasPartHistory = p._lastDate.getTime() > 0;
            const hasOverallHistory = p._overallLastDate.getTime() > 0;

            const partDateStr = hasPartHistory ? p._lastDate.toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' }) : '이력 없음';
            const overallDateStr = hasOverallHistory ? p._overallLastDate.toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' }) : '이력 없음';

            let recommendedBadge = '';
            if (index === 0) {
                recommendedBadge = `<span style="background:#10b981; color:white; font-size:0.68rem; font-weight:bold; padding:3px 8px; border-radius:4px; box-shadow:0 1.5px 4px rgba(16,185,129,0.3);"><i class="fas fa-check-circle"></i> 추천 1순위</span>`;
            } else if (index === 1) {
                recommendedBadge = `<span style="background:#3b82f6; color:white; font-size:0.68rem; font-weight:bold; padding:3px 8px; border-radius:4px;"><i class="fas fa-star"></i> 2순위</span>`;
            }

            const isEligible = !filterField || p[filterField] === true;

            html += `
                <tr style="cursor:pointer; transition: background 0.15s;" onclick="selectHelperPublisher('${escapeHtml(p.name)}')" onmouseover="this.style.background='var(--primary-bg)'" onmouseout="this.style.background='none'">
                    <td style="font-weight:bold; color:var(--primary); font-size:0.82rem; text-align:center; padding:10px 8px; ${!isEligible ? 'opacity: 0.5;' : ''}">${p.name} ${!isEligible ? '<span style="font-size:0.65rem; color:var(--danger); font-weight:normal;">(비대상)</span>' : ''}</td>
                    <td style="text-align:center;">${recommendedBadge}</td>
                    <td style="text-align:center; color:${hasPartHistory ? '#000' : 'var(--gray-400)'};">${partDateStr}</td>
                    <td style="text-align:center; color:var(--gray-600); max-width: 150px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${escapeHtml(p._lastPart)}</td>
                    <td style="text-align:center; color:var(--gray-500); font-size:0.75rem;">${overallDateStr} (${escapeHtml(p._overallLastPart)})</td>
                </tr>
            `;
        });
    }

    html += `
                </tbody>
            </table>
        </div>
    `;

    contentEl.innerHTML = html;
}

function toggleHelperFilter(val) {
    activeHelperFilterOnly = (val === 'eligible');
    renderAssignmentHelper();
}

function selectHelperPublisher(name) {
    if (activeHelperRowIdx === null || !activeHelperField) return;
    
    // 로컬 데이터 객체 업데이트
    weekdayData[activeHelperRowIdx][activeHelperField] = name;
    
    // 테이블 다시 그리기
    renderWeekdayTable();
    
    // 모달 닫기
    closeAssignmentHelperModal();
}

function closeAssignmentHelperModal() {
    const modal = document.getElementById('assignment-helper-modal');
    if (modal) modal.style.display = 'none';
    activeHelperRowIdx = null;
    activeHelperField = null;
}

// Print Tab Feature Implementation
async function loadPrintTab() {
    try {
        // Render week checkboxes
        const grid = document.getElementById('print-weeks-checkbox-grid');
        if (!grid) return;

        // Ensure weekdayData is loaded
        if (weekdayData.length === 0) {
            const { data: schData, error: schErr } = await supabaseClient
                .from('schedules')
                .select('*')
                .eq('sheet_type', '평일집회')
                .order('sort_order', { ascending: true });

            if (!schErr && schData) {
                weekdayData = schData;
            }
        }

        const uniqueWeeks = [...new Set(weekdayData.map(d => d.week_date).filter(w => w))];

        // Sort weeks using parseWeekDate helper
        uniqueWeeks.sort((a, b) => {
            const dateA = parseWeekDate(a);
            const dateB = parseWeekDate(b);
            if (!dateA || !dateB) return a.localeCompare(b);
            return dateA.start - dateB.start;
        });

        if (uniqueWeeks.length === 0) {
            grid.innerHTML = '<p style="color: var(--gray-400); font-size: 0.8rem; grid-column: 1/-1;">평일집회 데이터가 없습니다. 먼저 평일집회 탭에서 데이터를 로드/추가해 주세요.</p>';
            return;
        }

        grid.innerHTML = uniqueWeeks.map((week, idx) => {
            return `
                <label style="display: flex; align-items: center; gap: 8px; cursor: pointer; padding: 8px 12px; background: var(--gray-50); border: 1px solid var(--gray-200); border-radius: var(--radius-sm); font-size: 0.82rem; font-weight: 500; transition: all var(--transition);" class="print-week-item">
                    <input type="checkbox" class="print-week-checkbox" value="${escapeHtml(week)}" style="width: 16px; height: 16px; cursor: pointer;">
                    <span style="color: var(--gray-800);">${escapeHtml(week)}</span>
                </label>
            `;
        }).join('');

        // Set default dates for weekend print if empty
        const printStartInput = document.getElementById('print-weekend-start-date');
        const printEndInput = document.getElementById('print-weekend-end-date');
        if (printStartInput && !printStartInput.value) {
            const now = new Date();
            const threeMonthsAhead = new Date();
            threeMonthsAhead.setMonth(now.getMonth() + 3);

            printStartInput.value = now.toLocaleDateString('en-CA'); // YYYY-MM-DD
            printEndInput.value = threeMonthsAhead.toLocaleDateString('en-CA');

            // Trigger initial budget update
            setTimeout(() => {
                updateWeekendPrintBudget();
            }, 100);
        }

    } catch (e) {
        console.error('Error loading print tab data:', e);
        alert('인쇄 데이터를 로드하는 중 오류가 발생했습니다.');
    }
}

async function triggerPrintFlow() {
    // Get checked weeks
    const checkedBoxes = Array.from(document.querySelectorAll('.print-week-checkbox:checked'));
    if (checkedBoxes.length === 0) {
        alert('인쇄할 주차를 최소 하나 이상 선택해 주세요.');
        return;
    }
    
    const selectedWeeks = checkedBoxes.map(cb => cb.value);

    // Read settings (congregation_name, font_print) from app_settings
    let fontPrint = 'Pretendard';
    let congName = '춘천남부회중';
    try {
        const { data: settingsData } = await supabaseClient
            .from('app_settings')
            .select('*');
        if (settingsData) {
            fontPrint = settingsData.find(s => s.key === 'font_print')?.value || 'Pretendard';
            congName = settingsData.find(s => s.key === 'congregation_name')?.value || '춘천남부회중';
        }
    } catch (e) {
        console.warn('설정 데이터 로드 실패, 기본값 사용:', e);
        const congInput = document.getElementById('congregation-name-input');
        if (congInput && congInput.value) {
            congName = congInput.value.trim();
        }
    }
    
    generatePrintView(selectedWeeks, congName, fontPrint);
}

async function updateWeekendPrintBudget() {
    const startDate = document.getElementById('print-weekend-start-date').value;
    const endDate = document.getElementById('print-weekend-end-date').value;
    const infoEl = document.getElementById('print-weekend-budget-info');
    if (!infoEl) return;
    
    if (!startDate || !endDate) {
        infoEl.innerHTML = `<span style="color: var(--gray-500); font-weight: 500;">출력 기간을 설정해 주세요.</span>`;
        return;
    }
    
    if (new Date(startDate) > new Date(endDate)) {
        infoEl.innerHTML = `<span style="color: var(--danger); font-weight: 600;">⚠️ 시작일이 종료일보다 늦습니다.</span>`;
        return;
    }
    
    try {
        const { count, error } = await supabaseClient
            .from('public_talks')
            .select('*', { count: 'exact', head: true })
            .gte('meeting_date', startDate)
            .lte('meeting_date', endDate);
            
        if (error) throw error;
        
        const maxPageCapacity = 16; // fits comfortably on 1 A4 page
        const isSafe = count <= maxPageCapacity;
        
        let statusHtml = '';
        if (count === 0) {
            statusHtml = `<span style="color: var(--warning); font-weight: 600;">⚠️ 선택한 기간에 등록된 일정이 없습니다.</span>`;
        } else if (isSafe) {
            statusHtml = `<span style="color: var(--success); font-weight: 600;">✅ 현재 ${count}개 일정 등록됨 - A4 1페이지 내에 안정적으로 인쇄 가능합니다.</span>`;
        } else {
            statusHtml = `<span style="color: var(--danger); font-weight: 600;">❌ 현재 ${count}개 일정 등록됨 - A4 1페이지 용량(16개)을 초과하여 페이지가 잘리거나 넘어갈 수 있습니다.</span>`;
        }
        
        // Calculate max months recommendation from start date
        const { data: futureSlots } = await supabaseClient
            .from('public_talks')
            .select('meeting_date')
            .gte('meeting_date', startDate)
            .order('meeting_date', { ascending: true })
            .limit(maxPageCapacity + 1);
            
        let recommendHtml = '';
        if (futureSlots && futureSlots.length > 0) {
            const availableCount = Math.min(futureSlots.length, maxPageCapacity);
            const targetSlot = futureSlots[availableCount - 1];
            
            const startD = new Date(startDate);
            const targetD = new Date(targetSlot.meeting_date);
            const diffMonths = ((targetD.getFullYear() - startD.getFullYear()) * 12) + (targetD.getMonth() - startD.getMonth()) + 1;
            
            recommendHtml = `
                <div style="margin-top: 8px; font-size: 0.74rem; color: var(--gray-600); line-height: 1.4;">
                    💡 <strong>1페이지 최적화 가이드:</strong> 시작일 기준 최대 <strong>${diffMonths}개월</strong> 분량(${availableCount}개 일정)을 권장합니다.<br>
                    <button type="button" class="btn-mini" style="margin-top: 6px; font-size: 0.7rem; padding: 2px 8px; height: auto; background: var(--success); border: 1px solid var(--success-border); color: #fff;" onclick="optimizeWeekendPrintRange('${targetSlot.meeting_date}')">
                        최적화된 종료일로 설정 (~ ${targetSlot.meeting_date})
                    </button>
                </div>
            `;
        }
        
        infoEl.innerHTML = `
            <div style="padding: 10px; background: var(--gray-50); border: 1px solid var(--gray-200); border-radius: var(--radius-sm);">
                <div style="font-size: 0.78rem; display: flex; align-items: center; gap: 6px;">
                    ${statusHtml}
                </div>
                ${recommendHtml}
            </div>
        `;
    } catch (e) {
        console.error(e);
        infoEl.innerHTML = `<span style="color: var(--danger); font-weight: 500;">계산 중 오류 발생</span>`;
    }
}

window.optimizeWeekendPrintRange = (optimizedEndDate) => {
    document.getElementById('print-weekend-end-date').value = optimizedEndDate;
    updateWeekendPrintBudget();
};

async function triggerWeekendPrintFlow() {
    const startDate = document.getElementById('print-weekend-start-date').value;
    const endDate = document.getElementById('print-weekend-end-date').value;
    if (!startDate || !endDate) {
        alert('시작일과 종료일을 모두 선택해 주세요.');
        return;
    }
    if (new Date(startDate) > new Date(endDate)) {
        alert('시작일은 종료일보다 이전이어야 합니다.');
        return;
    }
    
    try {
        const { data, error } = await supabaseClient
            .from('public_talks')
            .select('*')
            .gte('meeting_date', startDate)
            .lte('meeting_date', endDate)
            .order('meeting_date', { ascending: true });
            
        if (error) throw error;
        if (!data || data.length === 0) {
            alert('선택한 기간에 등록된 주말집회 일정이 없습니다.');
            return;
        }
        
        let fontPrint = 'Pretendard';
        let congName = '춘천남부회중';
        try {
            const { data: settingsData } = await supabaseClient
                .from('app_settings')
                .select('*');
            if (settingsData) {
                fontPrint = settingsData.find(s => s.key === 'font_print')?.value || 'Pretendard';
                congName = settingsData.find(s => s.key === 'congregation_name')?.value || '춘천남부회중';
            }
        } catch (e) {
            console.warn('설정 로드 실패:', e);
            const congInput = document.getElementById('congregation-name-input');
            if (congInput && congInput.value) {
                congName = congInput.value.trim();
            }
        }
        
        // Read selected scale mode option
        const scaleMode = document.querySelector('input[name="print-weekend-scale-mode"]:checked')?.value || 'scale';
        
        generateWeekendPrintView(data, congName, fontPrint, scaleMode);
    } catch (e) {
        console.error(e);
        alert('주말집회 데이터를 로드하는 중 오류가 발생했습니다.');
    }
}

function generateWeekendPrintView(weekendList, congregationName, fontPrint = 'Pretendard', scaleMode = 'scale') {
    const originUrl = window.location.href;
    
    let rowsHtml = '';
    let lastMonth = '';
    
    weekendList.forEach((r, idx) => {
        const d = new Date(r.meeting_date);
        const curMonth = `${d.getFullYear()}-${d.getMonth() + 1}`;
        
        let rowClass = "";
        if (idx !== 0 && curMonth !== lastMonth) {
            rowClass = "month-border-top";
        }
        lastMonth = curMonth;
        
        const topic = r.topic || '';
        const dateStr = `${String(d.getFullYear()).slice(-2)}/${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getDate()).padStart(2, '0')}`;
        
        rowsHtml += `
            <tr class="${rowClass}">
                <td style="text-align: center; font-size: 0.88rem; font-weight: 500;">${dateStr}</td>
                <td style="text-align: center; font-size: 0.88rem;">${escapeHtml(r.outline_no || '')}</td>
                <td style="text-align: left; font-size: 0.94rem; font-weight: 600; padding-left: 8px; line-height: 1.35; word-break: keep-all; white-space: normal;">${escapeHtml(topic)}</td>
                <td style="text-align: center; font-size: 0.94rem; font-weight: 700;">${escapeHtml(r.speaker || '')}</td>
                <td style="text-align: center; font-size: 0.9rem;">${escapeHtml(r.congregation || '')}</td>
                <td style="text-align: center; font-size: 0.9rem;">${escapeHtml(r.chairman || '')}</td>
                <td style="text-align: center; font-size: 0.9rem;">${escapeHtml(r.reader || '')}</td>
                <td style="text-align: center; font-size: 0.9rem;">${escapeHtml(r.bible_reader || '')}</td>
                <td style="text-align: center; font-size: 0.9rem;">${escapeHtml(r.prayer || '')}</td>
            </tr>
        `;
    });
    
    const printWindow = window.open('', '_blank', 'width=900,height=950');
    if (!printWindow) {
        alert('팝업 차단이 활성화되어 있습니다. 팝업 허용 후 다시 시도해 주세요.');
        return;
    }
    
    const template = `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <title>${escapeHtml(congregationName)} 공개 강연 계획표</title>
            <style>
                @import url('${FONT_CDN_MAP[fontPrint] || FONT_CDN_MAP["Pretendard"]}');
                
                * {
                    box-sizing: border-box;
                }
                
                body {
                    font-family: ${FONT_FAMILY_MAP[fontPrint] || FONT_FAMILY_MAP["Pretendard"]};
                    margin: 0;
                    padding: 0;
                    background-color: #fff;
                    color: #000;
                    -webkit-print-color-adjust: exact !important;
                    print-color-adjust: exact !important;
                    font-size: 13px;
                    line-height: 1.45;
                }

                @page {
                    size: A4 portrait;
                    margin: 10mm 15mm 10mm 15mm;
                }

                .print-page {
                    width: 100%;
                    height: 275mm;
                    box-sizing: border-box;
                    display: flex;
                    flex-direction: column;
                    justify-content: flex-start;
                    overflow: hidden;
                }

                .main-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: flex-end;
                    padding-bottom: 6px;
                    margin-bottom: 12px;
                    width: 100%;
                    border-bottom: 2px solid #000;
                }

                .main-header-left {
                    font-size: 1.4rem;
                    font-weight: 800;
                    font-style: italic;
                }

                .main-header-right {
                    font-size: 1.4rem;
                    font-weight: 800;
                    font-style: italic;
                    letter-spacing: 0.05em;
                }

                .data-table {
                    width: 100%;
                    border-collapse: collapse;
                    margin-top: 4px;
                }

                .data-table th {
                    background-color: #f2f2f2;
                    border: 1px solid #333;
                    font-weight: 700;
                    font-size: 0.88rem;
                    padding: 8px 4px;
                    text-align: center;
                }

                .data-table td {
                    border: 1px solid #333;
                    padding: 8px 4px;
                    vertical-align: middle;
                }

                .month-border-top td {
                    border-top: 3px double #000 !important;
                }
            </style>
        </head>
        <body>
            <div class="print-page">
                <div class="main-header">
                    <div class="main-header-left">${escapeHtml(congregationName)}</div>
                    <div class="main-header-right">공개 강연 계획표 (주말집회)</div>
                </div>
                <table class="data-table">
                    <thead>
                        <tr>
                            <th style="width: 85px;">날짜</th>
                            <th style="width: 45px;">골자</th>
                            <th style="width: 250px;">공개 강연 주제</th>
                            <th style="width: 80px;">연사</th>
                            <th style="width: 100px;">회중</th>
                            <th style="width: 75px;">사회</th>
                            <th style="width: 75px;">파수대</th>
                            <th style="width: 75px;">낭독</th>
                            <th style="width: 75px;">기도</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${rowsHtml}
                    </tbody>
                </table>
            </div>
            
            <script>
                window.onload = function() {
                    const page = document.querySelector('.print-page');
                    const table = document.querySelector('.data-table');
                    const scaleMode = '${scaleMode}';
                    const maxH = 960; // portrait printable height
                    
                    let fontSize = 13.0;
                    let padding = 8.0;
                    
                    // 1단계: 세로 영역을 초과하는 대용량인 경우 축소
                    let attempts = 0;
                    while (page.scrollHeight > maxH && fontSize > 9.0 && attempts < 100) {
                        fontSize -= 0.2;
                        if (padding > 3.0) padding -= 0.2;
                        
                        table.style.fontSize = fontSize + 'px';
                        table.querySelectorAll('td').forEach(td => {
                            td.style.paddingTop = padding + 'px';
                            td.style.paddingBottom = padding + 'px';
                        });
                        attempts++;
                    }
                    
                    // 2단계: 여백 채우기 모드인 경우 꽉 찰 때까지 확대
                    if (scaleMode === 'scale') {
                        attempts = 0;
                        while (maxH - page.scrollHeight > 10 && fontSize < 24 && attempts < 100) {
                            fontSize += 0.2;
                            padding += 0.2;
                            
                            table.style.fontSize = fontSize + 'px';
                            table.querySelectorAll('td').forEach(td => {
                                td.style.paddingTop = padding + 'px';
                                td.style.paddingBottom = padding + 'px';
                            });
                            
                            if (page.scrollHeight > maxH) {
                                fontSize -= 0.2;
                                padding -= 0.2;
                                table.style.fontSize = fontSize + 'px';
                                table.querySelectorAll('td').forEach(td => {
                                    td.style.paddingTop = padding + 'px';
                                    td.style.paddingBottom = padding + 'px';
                                });
                                break;
                            }
                            attempts++;
                        }
                    }
                    
                    setTimeout(function() {
                        window.print();
                    }, 400);
                }
            <\/script>
        </body>
        </html>
    `;
    
    printWindow.document.open();
    printWindow.document.write(template);
    printWindow.document.close();
}

function renderWeekHtml(week, weekData, originUrl, congregationName) {
    const iconTreasures = new URL('Image01.png', originUrl).href;
    const iconMinistry = new URL('Image02.png', originUrl).href;
    const iconLiving = new URL('Image03.png', originUrl).href;

    const bibleRangeRow = weekData.find(d => d.category === 'top' && d.content && !d.content.includes('노래'));
    const bibleRange = bibleRangeRow ? bibleRangeRow.content.trim() : '';
    const weekHeaderTitle = bibleRange ? `${week} ${bibleRange}` : week;
    const chairman = bibleRangeRow && bibleRangeRow.assignee_1 ? bibleRangeRow.assignee_1.trim() : '';

    const topRows = weekData.filter(d => d.category === 'top' && d.id !== bibleRangeRow?.id);
    const treasuresRows = weekData.filter(d => d.category === 'treasures');
    const ministryRows = weekData.filter(d => d.category === 'ministry');
    const livingRows = weekData.filter(d => d.category === 'living');
    const sundayRows = weekData.filter(d => d.category === 'sunday');

    // Helper to format assignees beautifully
    function formatAssignees(row) {
        let a1 = row.assignee_1 ? row.assignee_1.trim() : '';
        let a2 = row.assignee_2 ? row.assignee_2.trim() : '';
        
        // Check if this is a bible study and format as "A1 (낭독:A2)"
        const isBibleStudy = row.content && (row.content.includes('회중 성서 연구') || row.content.includes('회중성서연구') || row.content.includes('회중 성서연구'));
        if (isBibleStudy && a1 && a2) {
            return `${a1} (낭독:${a2})`;
        }
        
        let parts = [];
        if (a1) parts.push(a1);
        if (a2) parts.push(a2);
        return parts.join(' / ');
    }

    // Helper to format prayers
    function formatConcludes(row) {
        let assignee = formatAssignees(row);
        if (!assignee) return '';
        const isConcluding = row.part_num === '맺음말' || (row.content && row.content.includes('맺음말'));
        const isStartingSong = row.category === 'top' && row.content && row.content.includes('노래');
        
        if ((isConcluding || isStartingSong) && !assignee.startsWith('기도')) {
            return `기도 : ${assignee}`;
        }
        return assignee;
    }

    // Helper to render rows
    function renderRowsHtml(rows) {
        return rows.map(row => {
            const leftText = (row.part_num ? `<strong>${escapeHtml(row.part_num)}</strong> ` : '') + 
                             escapeHtml(row.content) + 
                             (row.duration ? ` ${escapeHtml(row.duration)}` : '');
            
            const rightText = formatConcludes(row);
            
            return `
                <li class="part-row">
                    <div class="part-row-left">
                        <span class="part-bullet">·</span>
                        <div>${leftText}</div>
                    </div>
                    <div class="part-row-right">${rightText}</div>
                </li>
            `;
        }).join('');
    }

    let html = `<div class="week-container">`;
    
    // Week Header
    html += `
        <div class="week-header">
            <div class="week-title-range">${escapeHtml(weekHeaderTitle)}</div>
            <div class="week-chairman">${chairman ? `사회자 : ${escapeHtml(chairman)}` : ''}</div>
        </div>
    `;

    // Top rows (Opening song and prayer)
    if (topRows.length > 0) {
        html += `<div class="top-rows-container">`;
        topRows.forEach(row => {
            const leftText = (row.part_num ? `${escapeHtml(row.part_num)} ` : '') + 
                             escapeHtml(row.content) + 
                             (row.duration ? ` ${escapeHtml(row.duration)}` : '');
            const rightText = formatConcludes(row);
            html += `
                <div class="top-row">
                    <div class="top-row-left">
                        <span>·</span>
                        <div>${leftText}</div>
                    </div>
                    <div class="top-row-right">${rightText}</div>
                </div>
            `;
        });
        html += `</div>`;
    }

    // Section 1: Treasures
    if (treasuresRows.length > 0) {
        html += `
            <div class="section-banner treasures">
                <img src="${iconTreasures}" class="section-icon" alt="">
                성경에 담긴 보물
            </div>
            <ul class="part-list">
                ${renderRowsHtml(treasuresRows)}
            </ul>
        `;
    }

    // Section 2: Ministry
    if (ministryRows.length > 0) {
        html += `
            <div class="section-banner ministry">
                <img src="${iconMinistry}" class="section-icon" alt="">
                야외 봉사에 힘쓰십시오
            </div>
            <ul class="part-list">
                ${renderRowsHtml(ministryRows)}
            </ul>
        `;
    }

    // Section 3: Living
    if (livingRows.length > 0) {
        html += `
            <div class="section-banner living">
                <img src="${iconLiving}" class="section-icon" alt="">
                그리스도인 생활
            </div>
            <ul class="part-list">
                ${renderRowsHtml(livingRows)}
            </ul>
        `;
    }

    // Section 4: Sunday
    if (sundayRows.length > 0) {
        html += `
            <div class="section-banner living" style="background-color:#4a69bd !important;">
                광 고
            </div>
            <ul class="part-list">
                ${renderRowsHtml(sundayRows)}
            </ul>
        `;
    }

    html += `</div>`;
    return html;
}

function generatePrintView(selectedWeeks, congregationName, fontPrint = 'Pretendard') {
    selectedWeeks.sort((a, b) => {
        const dateA = parseWeekDate(a);
        const dateB = parseWeekDate(b);
        if (!dateA || !dateB) return a.localeCompare(b);
        return dateA.start - dateB.start;
    });

    const originUrl = window.location.href;
    let contentHtml = '';

    for (let i = 0; i < selectedWeeks.length; i += 2) {
        const w1 = selectedWeeks[i];
        const w2 = selectedWeeks[i + 1];

        const w1Data = weekdayData.filter(d => d.week_date === w1);
        const w2Data = w2 ? weekdayData.filter(d => d.week_date === w2) : [];

        const isSingleWeekPage = !w2;

        contentHtml += `
            <div class="print-page ${isSingleWeekPage ? 'single-week-page' : ''}">
                <div class="main-header">
                    <div class="main-header-left">${escapeHtml(congregationName)}</div>
                    <div class="main-header-right">평일 집회 계획표</div>
                </div>
                
                ${renderWeekHtml(w1, w1Data, originUrl, congregationName)}
                
                ${w2 ? `
                    <div class="week-divider"></div>
                    ${renderWeekHtml(w2, w2Data, originUrl, congregationName)}
                ` : ''}
            </div>
        `;
    }

    const printWindow = window.open('', '_blank', 'width=900,height=950');
    if (!printWindow) {
        alert('팝업 차단이 활성화되어 있습니다. 팝업 허용 후 다시 시도해 주세요.');
        return;
    }

    const template = `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <title>${escapeHtml(congregationName)} 평일 집회 계획표</title>
            <style>
                @import url('${FONT_CDN_MAP[fontPrint] || FONT_CDN_MAP["Pretendard"]}');
                
                * {
                    box-sizing: border-box;
                }
                
                body {
                    font-family: ${FONT_FAMILY_MAP[fontPrint] || FONT_FAMILY_MAP["Pretendard"]};
                    margin: 0;
                    padding: 0;
                    background-color: #fff;
                    color: #000;
                    -webkit-print-color-adjust: exact !important;
                    print-color-adjust: exact !important;
                    font-size: 14px;
                    line-height: 1.45;
                }

                @page {
                    size: A4 portrait;
                    margin: 10mm 15mm 10mm 15mm;
                }

                .print-page {
                    width: 100%;
                    height: 275mm;
                    page-break-after: always;
                    box-sizing: border-box;
                    display: flex;
                    flex-direction: column;
                    justify-content: space-between;
                    overflow: hidden;
                }

                .print-page:last-child {
                    page-break-after: avoid !important;
                }

                /* Main Page Header */
                .main-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: flex-end;
                    padding-bottom: 6px;
                    margin-bottom: 12px;
                    width: 100%;
                    border-bottom: 1px solid #333;
                }

                .main-header-left {
                    font-size: 1.4rem;
                    font-weight: 800;
                    font-style: italic;
                }

                .main-header-right {
                    font-size: 1.4rem;
                    font-weight: 800;
                    font-style: italic;
                    letter-spacing: 0.05em;
                }

                /* Week Section Header */
                .week-container {
                    width: 100%;
                    margin-bottom: 2px;
                }

                .week-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    font-weight: 800;
                    font-size: 1.15rem;
                    border-bottom: 0.5px solid #bbb;
                    padding: 4px 0 6px 0;
                    margin-bottom: 8px;
                }

                .week-title-range {
                    color: #000;
                }

                .week-chairman {
                    color: #000;
                }

                /* Top Rows (Song & Bible reading introductory items) */
                .top-rows-container {
                    padding: 2px 6px 4px 6px;
                }

                .top-row {
                    display: flex;
                    justify-content: space-between;
                    font-weight: 600;
                    font-size: 0.95rem;
                    margin-bottom: 5px;
                }

                .top-row-left {
                    display: flex;
                    align-items: flex-start;
                    gap: 8px;
                }

                .top-row-right {
                    font-weight: 700;
                    text-align: right;
                }

                /* Section Banners */
                .section-banner {
                    color: #fff;
                    padding: 5px 10px;
                    font-size: 0.92rem;
                    font-weight: 800;
                    display: flex;
                    align-items: center;
                    border-radius: 0px;
                    margin-top: 8px;
                    margin-bottom: 2px;
                    -webkit-print-color-adjust: exact !important;
                    print-color-adjust: exact !important;
                }

                .section-icon {
                    height: 1.15rem;
                    width: auto;
                    margin-right: 8px;
                    filter: brightness(1) invert(0);
                }

                .section-banner.treasures {
                    background-color: #2e6c70 !important;
                }

                .section-banner.ministry {
                    background-color: #ac5d18 !important;
                }

                .section-banner.living {
                    background-color: #892825 !important;
                }

                /* Part Row Styles */
                .part-list {
                    padding: 0;
                    margin: 0 0 6px 0;
                    list-style: none;
                }

                .part-row {
                    display: flex;
                    justify-content: space-between;
                    align-items: flex-start;
                    padding: 4.5px 6px;
                    border-bottom: 1px dashed #ccc;
                    font-size: 0.88rem;
                    font-weight: 500;
                    line-height: 1.4;
                }

                .part-row:last-child {
                    border-bottom: none;
                }

                .part-row-left {
                    display: flex;
                    align-items: flex-start;
                    gap: 8px;
                    flex: 1;
                    padding-right: 12px;
                }

                .part-bullet {
                    font-weight: bold;
                }

                .part-row-right {
                    font-weight: 700;
                    text-align: right;
                    white-space: nowrap;
                }
                
                .interp-prefix {
                    color: #d63031;
                    font-weight: bold;
                }

                .week-divider {
                    border-top: 2px solid #000;
                    margin: 14px 0;
                    width: 100%;
                }

                /* Compact styles (Default: fits 2-weeks stacked) */
                .part-row {
                    padding: 4.5px 6px;
                }
                .top-row {
                    margin-bottom: 5px;
                }
                .part-list {
                    margin-bottom: 6px;
                }

                /* Dynamic styling for single-week pages */
                .print-page.single-week-page {
                    padding-top: 0;
                    justify-content: flex-start;
                    height: 275mm;
                }
                .print-page.single-week-page .main-header {
                    margin-bottom: 12px;
                }
                .print-page.single-week-page .week-header {
                    font-size: 1.15rem;
                    padding: 4px 0 6px 0;
                    margin-bottom: 8px;
                    border-bottom: 0.5px solid #bbb;
                }
                .print-page.single-week-page .top-row {
                    font-size: 0.95rem;
                    margin-bottom: 5px;
                }
                .print-page.single-week-page .section-banner {
                    font-size: 0.92rem;
                    padding: 5px 10px;
                    margin-top: 8px;
                    margin-bottom: 2px;
                }
                .print-page.single-week-page .section-icon {
                    height: 1.15rem;
                }
                .print-page.single-week-page .part-row {
                    font-size: 0.88rem;
                    padding: 4.5px 6px;
                    line-height: 1.4;
                }
                .print-page.single-week-page .part-list {
                    margin-bottom: 6px;
                }
            </style>
        </head>
        <body>
            ${contentHtml}
            <script>
                window.onload = function() {
                    // 모든 A4 출력용 페이지에 대해 개별 최적화 작업 수행
                    const pages = document.querySelectorAll('.print-page');
                    pages.forEach(page => {
                        const isSingle = page.classList.contains('single-week-page');
                        
                        let fontSize = 14.0;
                        let padding = 5.0;
                        let bannerPadding = 5.0;
                        let dividerMargin = 14.0;
                        
                        const maxH = isSingle ? (page.clientHeight - 8) / 2 : (page.clientHeight - 8); 
                        
                        // 1단계: 컨텐츠가 지정된 A4 높이를 초과하여 넘치는 경우 -> 점진적으로 축소
                        let attempts = 0;
                        while (page.scrollHeight > maxH && fontSize > 9.0 && attempts < 150) {
                            fontSize -= 0.15;
                            if (padding > 1.0) padding -= 0.15;
                            if (bannerPadding > 1.5) bannerPadding -= 0.1;
                            if (dividerMargin > 4) dividerMargin -= 0.2;
                            
                            page.style.fontSize = fontSize + 'px';
                            
                            page.querySelectorAll('.part-row').forEach(row => {
                                row.style.paddingTop = padding + 'px';
                                row.style.paddingBottom = padding + 'px';
                            });
                            
                            page.querySelectorAll('.section-banner').forEach(banner => {
                                banner.style.paddingTop = bannerPadding + 'px';
                                banner.style.paddingBottom = bannerPadding + 'px';
                                banner.style.marginTop = (bannerPadding * 1.5) + 'px';
                            });

                            const divider = page.querySelector('.week-divider');
                            if (divider) {
                                divider.style.marginTop = dividerMargin + 'px';
                                divider.style.marginBottom = dividerMargin + 'px';
                            }
                            attempts++;
                        }

                        // 2단계: 여백이 너무 많이 남는 경우 -> 여백을 꽉 채우기 위해 점진적으로 확대
                        attempts = 0;
                        while (maxH - page.scrollHeight > 8 && fontSize < 26 && attempts < 150) {
                            fontSize += 0.15;
                            padding += 0.15;
                            bannerPadding += 0.1;
                            dividerMargin += 0.2;
                            
                            // 스타일 미리 적용해본 후 체크
                            page.style.fontSize = fontSize + 'px';
                            
                            page.querySelectorAll('.part-row').forEach(row => {
                                row.style.paddingTop = padding + 'px';
                                row.style.paddingBottom = padding + 'px';
                            });
                            
                            page.querySelectorAll('.section-banner').forEach(banner => {
                                banner.style.paddingTop = bannerPadding + 'px';
                                banner.style.paddingBottom = bannerPadding + 'px';
                                banner.style.marginTop = (bannerPadding * 1.5) + 'px';
                            });

                            const divider = page.querySelector('.week-divider');
                            if (divider) {
                                divider.style.marginTop = dividerMargin + 'px';
                                divider.style.marginBottom = dividerMargin + 'px';
                            }

                            // 만약 늘렸는데 최대 높이를 넘어가버렸다면 바로 직전으로 되돌린 후 중단
                            if (page.scrollHeight > maxH) {
                                fontSize -= 0.15;
                                padding -= 0.15;
                                bannerPadding -= 0.1;
                                dividerMargin -= 0.2;
                                
                                page.style.fontSize = fontSize + 'px';
                                page.querySelectorAll('.part-row').forEach(row => {
                                    row.style.paddingTop = padding + 'px';
                                    row.style.paddingBottom = padding + 'px';
                                });
                                page.querySelectorAll('.section-banner').forEach(banner => {
                                    banner.style.paddingTop = bannerPadding + 'px';
                                    banner.style.paddingBottom = bannerPadding + 'px';
                                    banner.style.marginTop = (bannerPadding * 1.5) + 'px';
                                });
                                if (divider) {
                                    divider.style.marginTop = dividerMargin + 'px';
                                    divider.style.marginBottom = dividerMargin + 'px';
                                }
                                break;
                            }
                            attempts++;
                        }
                    });

                    // 레이아웃 보정이 모두 끝난 뒤 인쇄 창 호출
                    setTimeout(function() {
                        window.print();
                    }, 400);
                }
            <\/script>
        </body>
        </html>
    `;

    printWindow.document.open();
    printWindow.document.write(template);
    printWindow.document.close();
}

async function saveCustomSupabase() {
    const url = document.getElementById('supabase-url-input').value.trim();
    const key = document.getElementById('supabase-key-input').value.trim();

    if (!url || !key) {
        alert('Supabase URL과 Key를 모두 입력해야 합니다.');
        return;
    }

    if (!url.startsWith('https://')) {
        alert('유효한 Supabase URL을 입력해 주세요. (예: https://xxxx.supabase.co)');
        return;
    }

    try {
        const tempClient = window.supabase.createClient(url, key);
        // 간단한 조회 쿼리로 연결성 검증 (테이블 유무에 따른 에러 상관없이 연결 자체 테스트)
        const { error } = await tempClient.from('app_settings').select('*').limit(1);
        
        if (error && error.message && (error.message.includes('Fetch') || error.status === 400 || error.status === 401 || error.status === 403)) {
            throw new Error(error.message);
        }
    } catch (err) {
        console.error('Supabase connection test failed:', err);
        if (!confirm('연결 테스트에 실패했습니다. (잘못된 URL/Key 또는 네트워크 오류)\n그래도 이 설정을 저장하시겠습니까?')) {
            return;
        }
    }

    localStorage.setItem('CUSTOM_SUPABASE_URL', url);
    localStorage.setItem('CUSTOM_SUPABASE_KEY', key);
    alert('Supabase 연결 설정이 저장되었습니다. 설정을 적용하기 위해 페이지를 새로고침합니다.');
    location.reload();
}

function resetCustomSupabase() {
    if (!confirm('Supabase 연결을 기본 설정(기존 데이터베이스)으로 복원하시겠습니까?\n페이지가 새로고침됩니다.')) return;
    localStorage.removeItem('CUSTOM_SUPABASE_URL');
    localStorage.removeItem('CUSTOM_SUPABASE_KEY');
    alert('기본 연결로 복원되었습니다.');
    location.reload();
}

function copySchemaSql() {
    const textarea = document.getElementById('db-sql-textarea');
    if (!textarea) return;
    textarea.select();
    try {
        document.execCommand('copy');
        alert('SQL 스크립트가 클립보드에 복사되었습니다!\nSupabase Dashboard -> SQL Editor에 붙여넣어 실행하세요.');
    } catch (err) {
        console.error('Copy failed:', err);
        alert('복사에 실패했습니다. 텍스트 창의 내용을 직접 드래그하여 복사하세요.');
    }
}

async function seedInitialData() {
    const statusSpan = document.getElementById('db-seed-status');
    if (statusSpan) statusSpan.textContent = '데이터 확인 중...';
    
    try {
        // 1. 테이블 존재 여부 확인 (app_settings 조회)
        const { data: testSettings, error: testErr } = await supabaseClient
            .from('app_settings')
            .select('*')
            .limit(1);

        if (testErr) {
            console.error('Table check error:', testErr);
            if (statusSpan) statusSpan.textContent = '';
            alert('테이블이 존재하지 않거나 액세스할 수 없습니다.\n먼저 Supabase SQL Editor에서 제공해 드린 SQL 스크립트를 실행(Run)해 주세요.');
            return;
        }

        if (statusSpan) statusSpan.textContent = '초기 데이터 생성 중...';

        // 2. admin_users 초기 계정 확인 및 삽입
        const { data: adminUsers, error: adminErr } = await supabaseClient
            .from('admin_users')
            .select('id')
            .eq('username', '관리자');

        if (!adminErr && (!adminUsers || adminUsers.length === 0)) {
            const { error: insAdminErr } = await supabaseClient
                .from('admin_users')
                .insert([
                    { username: '관리자', password: '1234', role: 'superadmin', can_manage_weekday: true, can_manage_weekend: true }
                ]);
            if (insAdminErr) console.warn('Failed to insert default admin user:', insAdminErr);
        }

        // 3. app_settings 초기 값 확인 및 삽입
        const { data: appSettings, error: appErr } = await supabaseClient
            .from('app_settings')
            .select('key');

        const existingKeys = (appSettings || []).map(s => s.key);
        const defaultSettings = [
            { key: 'congregation_name', value: '새로운 회중' },
            { key: 'font_viewer', value: 'Pretendard' },
            { key: 'font_manager', value: 'Pretendard' },
            { key: 'font_print', value: 'Pretendard' }
        ];

        const settingsToInsert = defaultSettings.filter(s => !existingKeys.includes(s.key));
        if (settingsToInsert.length > 0) {
            const { error: insSettingsErr } = await supabaseClient
                .from('app_settings')
                .insert(settingsToInsert);
            if (insSettingsErr) console.warn('Failed to insert default settings:', insSettingsErr);
        }

        // 4. navigation_links 초기 버튼 확인 및 삽입
        const { data: navLinksData, error: navLinksErr } = await supabaseClient
            .from('navigation_links')
            .select('id');

        if (!navLinksErr && (!navLinksData || navLinksData.length === 0)) {
            const defaultNavLinks = [
                { label: '평일집회', type: 'internal', target: '평일집회', sort_order: 1 },
                { label: '주말집회', type: 'internal', target: '주말집회', sort_order: 2 }
            ];
            const { error: insNavErr } = await supabaseClient
                .from('navigation_links')
                .insert(defaultNavLinks);
            if (insNavErr) console.warn('Failed to insert default navigation links:', insNavErr);
        }

        if (statusSpan) statusSpan.textContent = '완료!';
        alert('초기 데이터(기본 관리자 계정, 기본 탭 메뉴, 환경설정)가 데이터베이스에 성공적으로 생성되었습니다!\n\n이제 관리자 로그인창에서 "관리자" / "1234"로 로그인하실 수 있습니다.\n로그인 후 메뉴 설정에서 회중명을 적합하게 수정하세요.');
    } catch (err) {
        console.error('Seeding database failed:', err);
        if (statusSpan) statusSpan.textContent = '실패';
        alert('초기 데이터를 생성하는 도중 예기치 않은 오류가 발생했습니다.\n' + err.message);
    }
}

const SUPABASE_SCHEMA_SQL = `-- Supabase Schema for SheetViewer (Integrated Edition)
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
    prayer TEXT,
    is_confirmed BOOLEAN DEFAULT FALSE, -- SL(수어) 여부 또는 확정 상태
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
ALTER TABLE public.public_talks DISABLE ROW LEVEL SECURITY;

-- 기존 테이블이 존재할 때 누락된 컬럼 안전하게 추가
ALTER TABLE public.publishers ADD COLUMN IF NOT EXISTS can_talk BOOLEAN DEFAULT FALSE;
ALTER TABLE public.public_talks ADD COLUMN IF NOT EXISTS speaker_contact TEXT;
ALTER TABLE public.public_talks ADD COLUMN IF NOT EXISTS inviter TEXT;

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
`;

// Bind methods to window scope for onclick/ondblclick events
window.openAssignmentHelper = openAssignmentHelper;
window.toggleHelperFilter = toggleHelperFilter;
window.selectHelperPublisher = selectHelperPublisher;
window.closeAssignmentHelperModal = closeAssignmentHelperModal;
window.loadPrintTab = loadPrintTab;
window.triggerPrintFlow = triggerPrintFlow;
window.updateWeekendPrintBudget = updateWeekendPrintBudget;
window.triggerWeekendPrintFlow = triggerWeekendPrintFlow;
window.generateWeekendPrintView = generateWeekendPrintView;
window.saveCustomSupabase = saveCustomSupabase;
window.resetCustomSupabase = resetCustomSupabase;
window.copySchemaSql = copySchemaSql;
window.seedInitialData = seedInitialData;
