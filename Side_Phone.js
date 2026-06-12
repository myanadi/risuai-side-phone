//@name Webso_Phone_v0.1.0
//@display-name 사이드폰 플러그인
//@api 3.0
//@version 0.1.0
//@arg auto_mode int 자동 모드: 0(끔·기본) 또는 1(켬·매 턴 자동 추출)
//@arg comment_model string 호출 모델: submodel(보조·기본) 또는 model(일반)
//@arg owner_name string 폰 주인 이름 (비우면 자동 감지)
//@arg array_cap int 각 앱 배열 상한 (15~50, 기본 25)
//@arg first_run_turns int 첫 실행 시 추출할 최근 턴 수 (1~10, 기본 3)

(function () {
  'use strict';

  // ===========================================================================
  // 0. 메타·상수
  // ===========================================================================

  const SCHEMA_VERSION = 1;

  // 캐릭터 + 채팅방 단위로 강제 분리. 
  async function cid() {
    try {
      const i = await risuai.getCurrentCharacterIndex();
      return Number.isFinite(i) ? `c${i}` : 'c?';
    } catch { return 'c?'; }
  }
  async function chid() {
    try {
      const i = await risuai.getCurrentChatIndex();
      return Number.isFinite(i) ? `chat${i}` : 'chat?';
    } catch { return 'chat?'; }
  }
  // 키 prefix는 `phone:c{ci}:chat{chi}:`
  const K = {
    state:    async () => `phone:${await cid()}:${await chid()}:state`,
    tweets:   async () => `phone:${await cid()}:${await chid()}:tweets`,
    searches: async () => `phone:${await cid()}:${await chid()}:searches`,
    drafts:   async () => `phone:${await cid()}:${await chid()}:drafts`,
    inbox:    async () => `phone:${await cid()}:${await chid()}:inbox`,
    calls:    async () => `phone:${await cid()}:${await chid()}:calls`,
    memos:    async () => `phone:${await cid()}:${await chid()}:memos`,
    settings: 'phone:settings', // 전역 (캐릭터/채팅 무관)
  };

  // 앱 정의 (홈 격자에 그릴 5개). 
  // 클래스명은 sp- prefix 
  const PHONE_APPS = [
    { id: 'tweets',   name: '트위터', icon: 'twitter',
      bg: 'linear-gradient(135deg, #5DBFF7 0%, #1DA1F2 50%, #0353A4 100%)', fg: '#fff' },
    { id: 'searches', name: '검색',   icon: 'search',
      bg: 'linear-gradient(135deg, #9D8FFF 0%, #6C5BD1 50%, #3B2E8C 100%)', fg: '#fff' },
    { id: 'drafts',   name: '메시지', icon: 'message',
      bg: 'linear-gradient(135deg, #FFEC4F 0%, #F4B400 100%)', fg: '#3C1E1E' },
    { id: 'calls',    name: '전화',   icon: 'phone',
      bg: 'linear-gradient(135deg, #4CD964 0%, #22A845 100%)', fg: '#fff' },
    { id: 'memos',    name: '메모',   icon: 'note',
      bg: 'linear-gradient(135deg, #D2A875 0%, #8B5A2B 100%)', fg: '#fff' },
  ];

  // SVG 아이콘 (Tabler 스타일 outline)
  const ICON_SVG = {
    twitter: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M22 4.01c-1 .49-1.98.689-3 .99c-1.121-1.265-2.783-1.335-4.38-.737S11.977 6.323 12 8v1c-3.245.083-6.135-1.395-8-4c0 0-4.182 7.433 4 11c-1.872 1.247-3.739 2.088-6 2c3.308 1.803 6.913 2.423 10.034 1.517c3.58-1.04 6.522-3.723 7.651-7.742a13.84 13.84 0 0 0 .497-3.753c-.002-.249 1.51-2.772 1.818-4.013z"/></svg>',
    search:  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/></svg>',
    message: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 20l1.3-3.9A9 9 0 1 1 8 18.7L3 20"/></svg>',
    phone:   '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M5 4h4l2 5l-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2"/></svg>',
    note:    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="5" y="3" width="14" height="18" rx="2"/><path d="M9 7h6M9 11h6M9 15h4"/></svg>',
    wifi:    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M2 9a16 16 0 0 1 20 0M5 12.5a11 11 0 0 1 14 0M8.5 16a6 6 0 0 1 7 0"/><circle cx="12" cy="20" r="1" fill="currentColor"/></svg>',
    battery: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="8" width="16" height="8" rx="1.5"/><path d="M21 11v2"/><rect x="5.5" y="10" width="9" height="4" rx=".5" fill="currentColor" stroke="none"/></svg>',
    xClose:  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 6l12 12M18 6L6 18"/></svg>',
    back:    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 6l-6 6 6 6"/></svg>',
  };

  const LLM_MODE_DEFAULT = 'submodel';
  const FIRST_RUN_DEFAULT = 3;

  // ===========================================================================
  // 1. 설정 읽기 (오버라이드 우선, getArgument 폴백)
  // ===========================================================================

  async function settings() {
    const overrides = await load(K.settings, {});
    const arg = async (k) => overrides[k] !== undefined ? overrides[k] : await risuai.getArgument(k);

    const num = (v, def, lo, hi) => {
      const n = parseInt(v, 10);
      if (isNaN(n)) return def;
      return Math.max(lo, Math.min(hi, n));
    };
    return {
      autoMode:      String(await arg('auto_mode')) === '1',
      commentModel:  (await arg('comment_model')) || LLM_MODE_DEFAULT,
      ownerName:     (await arg('owner_name')) || '',
      arrayCap:      num(await arg('array_cap'), 25, 15, 50),
      firstRunTurns: num(await arg('first_run_turns'), FIRST_RUN_DEFAULT, 1, 10),
      theme:         (await arg('theme')) || 'dark', // 'dark' | 'light'
    };
  }

  // ===========================================================================
  // 2. 저장소 헬퍼
  // ===========================================================================

  async function load(key, fallback) {
    try {
      const raw = await risuai.pluginStorage.getItem(key);
      if (raw == null || raw === '') return fallback;
      return JSON.parse(raw);
    } catch (e) {
      console.warn('[phone] load 실패', key, e);
      return fallback;
    }
  }

  async function save(key, value) {
    try {
      await risuai.pluginStorage.setItem(key, JSON.stringify(value));
    } catch (e) {
      console.error('[phone] save 실패', key, e);
    }
  }

  // 초기 상태 객체 (state 키에 저장)
  function freshState() {
    return {
      schemaVersion: SCHEMA_VERSION,
      lastSeenCount: 0,    // 마지막 추출 시점의 메시지 개수 (다음 슬라이스 시작점)
      ownerName: '',       // 폰 주인 (자동 감지 시 첫 호출에 채워짐)
      firstRunDone: false, // 첫 실행 처리 완료 여부
    };
  }

  // ===========================================================================
  // 3. LLM 호출 + JSON 파싱
  // ===========================================================================

  async function callLLM(systemText, userText, mode = LLM_MODE_DEFAULT) {
    const messages = [
      { role: 'system', content: systemText },
      { role: 'user', content: userText },
    ];
    let res;
    try {
      res = await risuai.runLLMModel({ messages, mode });
    } catch (e) {
      const msg = String(e && e.message || e);
      if (/429|rate|limit|too many/i.test(msg)) {
        await new Promise((r) => setTimeout(r, 2500));
        try {
          res = await risuai.runLLMModel({ messages, mode });
        } catch (e2) {
          console.error('[phone] runLLMModel 재시도도 실패:', e2);
          throw e2;
        }
      } else {
        console.error('[phone] runLLMModel 실패 — comment_model 확인:', e);
        throw e;
      }
    }
    if (res == null) return '';
    if (typeof res === 'string') return res;

    // 스트림(ReadableStream<string>) 반환이면 끝까지 읽어 합친다.
    if (typeof res.getReader === 'function') {
      const reader = res.getReader();
      let out = '';
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        out += typeof value === 'string' ? value : '';
      }
      return out;
    }

    // 객체로 감싸 오는 경우: { content }, { success, content }, { message }, { data } 등.
    if (typeof res === 'object') {
      const cand = res.content ?? res.message ?? res.text ?? res.data ?? res.result;
      if (typeof cand === 'string') return cand;
      if (cand && typeof cand.getReader === 'function') {
        const reader = cand.getReader();
        let out = '';
        while (true) { const { value, done } = await reader.read(); if (done) break; out += typeof value === 'string' ? value : ''; }
        return out;
      }
      console.warn('[phone] LLM 응답이 객체 — 구조 확인용 덤프:', res);
      if (cand != null) return String(cand);
    }
    return String(res);
  }

  // 코드펜스/잡설을 떼고 JSON만 안전 추출. 
  function parseJSON(text, fallback) {
    if (typeof text !== 'string' || !text.trim()) {
      console.warn('[phone] parseJSON: 빈 입력', text);
      return fallback;
    }
    let s = text.replace(/```json/gi, '').replace(/```/g, '').trim();

    try { return JSON.parse(s); } catch (_) {}

    const open = (() => {
      const o = s.indexOf('{'), a = s.indexOf('[');
      if (o === -1) return a; if (a === -1) return o; return Math.min(o, a);
    })();
    if (open === -1) { console.warn('[phone] parseJSON: 괄호 없음', s.slice(0, 200)); return fallback; }

    const openCh = s[open], closeCh = openCh === '{' ? '}' : ']';
    let depth = 0, end = -1, inStr = false, esc = false;
    for (let i = open; i < s.length; i++) {
      const ch = s[i];
      if (inStr) {
        if (esc) esc = false;
        else if (ch === '\\') esc = true;
        else if (ch === '"') inStr = false;
        continue;
      }
      if (ch === '"') inStr = true;
      else if (ch === openCh) depth++;
      else if (ch === closeCh) { depth--; if (depth === 0) { end = i; break; } }
    }
    const candidate = end !== -1 ? s.slice(open, end + 1) : s.slice(open);
    try {
      return JSON.parse(candidate);
    } catch (e) {
      console.warn('[phone] parseJSON 실패. 응답 앞부분:', candidate.slice(0, 300));
      return fallback;
    }
  }

  // ===========================================================================
  // 4. 폰 갱신 오케스트레이터
  // ===========================================================================

  // 메인 진입점. 트리거(폰 열기 또는 자동 모드 훅)에서 호출.
  // 새 턴 슬라이스 → LLM 추출 → 누적 저장.
  async function refreshPhone({ silent = false } = {}) {
    const cfg = await settings();
    const state = await load(await K.state(), freshState());

    // 소유자 이름 — 비어있으면 자동 감지(최초 1회)
    if (!state.ownerName) {
      const cfgName = (cfg.ownerName || '').trim();
      if (cfgName) state.ownerName = cfgName;
      else state.ownerName = await detectOwnerName();
      await save(await K.state(), state);
    }

    // ① 새 턴 수집 
    const collected = await collectNewTurns(state, cfg);
    if (!collected.text || !collected.text.trim()) {
      if (!silent) console.log('[phone] 추출할 새 턴 없음');
      return { skipped: true };
    }

    // ② 기존 폰 상태 요약 — 연속성 위해 LLM에 같이 줌 
    const recent = await loadRecentSnapshot(cfg);

    // ③ LLM 패스 
    const ctx = {
      owner: state.ownerName,
      slice: collected.text,
      recent,
    };
    let out;
    try {
      out = await extractPhone(ctx, cfg);
    } catch (e) {
      console.error('[phone] extractPhone 실패', e);
      return { skipped: true, error: e };
    }

    // ④ 누적 저장 
    await mergeStore(out, cfg);

    // ⑤ 상태 갱신
    state.lastSeenCount = collected.count;
    state.firstRunDone = true;
    await save(await K.state(), state);

    return { skipped: false, added: countAdded(out) };
  }

  // 현재 채팅의 메시지 슬라이스.
  // 첫 실행이면 최근 N턴만, 이후엔 lastSeenCount 이후 새 턴들.
  async function collectNewTurns(state, cfg) {
    try {
      const ci = await risuai.getCurrentCharacterIndex();
      const chi = await risuai.getCurrentChatIndex();
      const chat = await risuai.getChatFromIndex(ci, chi);
      if (!chat) {
        console.warn('[phone] 현재 채팅을 읽지 못함');
        return { text: '', count: state.lastSeenCount };
      }

      const msgs = chat.message || chat.messages || [];
      const total = msgs.length;

      let start;
      if (!state.firstRunDone) {
        // 첫 실행: 최근 N턴(메시지가 아니라 *턴*. 한 턴 = 유저+캐릭터 한 쌍 ≈ 메시지 2개)
        const turns = cfg.firstRunTurns || FIRST_RUN_DEFAULT;
        start = Math.max(0, total - turns * 2);
      } else {
        start = Math.min(state.lastSeenCount || 0, total);
      }
      const slice = msgs.slice(start);

      const lines = [];
      for (const m of slice) {
        const body = (m && (m.data ?? m.content) || '').trim();
        if (!body) continue;
        const who = (m.role === 'user') ? '유저' : '서술';
        lines.push(`[${who}] ${body}`);
      }
      return { text: lines.join('\n\n'), count: total };
    } catch (e) {
      console.error('[phone] collectNewTurns 실패', e);
      return { text: '', count: state.lastSeenCount };
    }
  }

  // 상대 캐릭터 이름 자동 감지.
  async function detectOwnerName() {
    try {
      const char = await risuai.getCharacter();
      const name = (char && char.name) ? String(char.name).trim() : '';
      if (name) return name;
    } catch (e) {
      console.warn('[phone] getCharacter 실패', e);
    }
    return '상대'; // 폴백 — 안 잡혀도 폰은 돌아야 함
  }

  // 각 앱에서 최근 N개만 짧게 — 연속성용 맥락. (전부 주면 비용·노이즈 폭증)
  async function loadRecentSnapshot(cfg) {
    const [tw, sr, df, ib, ca, mm] = await Promise.all([
      load(await K.tweets(),   []),
      load(await K.searches(), []),
      load(await K.drafts(),   []),
      load(await K.inbox(),    []),
      load(await K.calls(),    []),
      load(await K.memos(),    []),
    ]);
    return {
      tweets:   tw.slice(0, 3),
      searches: sr.slice(0, 5),
      drafts:   df.slice(0, 2),
      inbox:    ib.slice(0, 3),
      calls:    ca.slice(0, 3),
      memos:    mm.slice(0, 3),
    };
  }

  // ===========================================================================
  // 5. LLM 패스 — 5종 한 번에 추출
  // ===========================================================================

  function extractInstruction(owner) {
    return [
      `너는 RP 본문을 읽고, 거기 등장하는 캐릭터 「${owner}」가 그 시점에`,
      '폰으로 했을 법한 행동을 추출한다. 6종 중 0~6개를 자기 판단으로 골라 생성.',
      '',
      '[작성 원칙]',
      '- 매 턴 6종 다 채우지 않는다. 자연스러운 분량만.',
      '- 아무것도 안 했을 만한 턴은 전부 빈 배열로.',
      `- 캐릭터의 진심·균열·이면을 드러내는 디테일 위주.`,
      `  (겉으론 멀쩡한데 검색창엔 "헤어진 척 하는 법" 같은 대비)`,
      `- 본문에 상태창/시각 표기가 있으면 ts에 그걸 따른다. 모호하면 "오후".`,
      '- 새벽·자정 시간대는 그 자체로 강력 — 활용하라.',
      '- 기존 폰 상태(아래)와 모순되지 않게 — 어제 검색한 거 오늘 또 검색 X.',
      '- 한국어로만 출력. 영어 분석체 금지.',
      '',
      '[6종 출력 계약]',
      '{ "tweets":[], "searches":[], "drafts":[], "inbox":[], "calls":[], "memos":[] }',
      '',
      '[각 객체 모양]',
      'tweets:   { "ts":"오후 3시", "text":"트윗 내용", "length":"short|medium" }',
      'searches: { "ts":"오후 3시", "query":"검색어", "context":"왜 검색했나 한 줄" }',
      'drafts:   { "ts":"오후 3시", "to":"누구한테", "text":"쓰다 만 메시지", "why":"안 보낸 이유" }',
      'inbox:    { "ts":"오후 3시", "with":"상대(라벨)", "text":"메시지 한 줄", "direction":"in|out", "unread":true }',
      'calls:    { "ts":"새벽 2시 47분", "with":"❤️ 가을 / 그 사람 / 스팸(받지말것) 등 감정 박힌 라벨",',
      '           "direction":"out|in", "duration":초단위숫자, "status":"completed|missed|rejected" }',
      'memos:    { "ts":"오후 3시", "text":"내용", "kind":"memo|diary" }',
      '',
      '[메시지 디테일]',
      '- drafts(임시저장): 캐릭터가 *못 보낸* 메시지. 진심·균열의 결정적 흔적.',
      '- inbox(메시지): 캐릭터가 *주고받은* 메시지. direction:in=받은 것, out=보낸 것.',
      '  with는 상대 이름(통화 with처럼 감정 박힌 라벨 가능: "엄마", "❤️ 가을", "전남친(받지말것)" 등).',
      '  text는 메시지 한 줄. unread는 받은 것(in) 중 아직 안 읽은 경우만 true. 보낸 것(out)은 unread 생략.',
      '  한 캐릭터와 여러 번 주고받은 흐름도 자연스럽게 — in/out 섞어서.',
      '',
      '[통화 디테일]',
      '- duration은 *초* 단위. (예: 5 = 5초 / 47 = 47초 / 1800 = 30분 / 0 = 즉시 끊음)',
      '- 1분 미만의 짧은 통화는 그 자체로 강력 — "거절 직전" 같은 함의.',
      '- status: completed(정상 종료) / missed(부재중) / rejected(수신거절).',
      '- with는 단순 이름 X. 캐릭터 폰에 *어떻게 저장됐을지*. 감정·관계가 박힌 라벨.',
      '  예: "유저❤️", "유저(차단)", "그 사람", "전남친(받지말것)", "ㅇㅇ선배(2)".',
      '',
      '[메모 vs 일기]',
      '- memo (kind:"memo"): 짧은 혼잣말, 메모지에 휘갈긴 한두 줄.',
      '  예: "오늘 11시 약속 잊지 말기" / "왜 답이 안 와".',
      '- diary (kind:"diary"): 호흡 긴 정리체. 하루를 돌아보거나 감정을 풀어쓴 글.',
      '  여러 문장. 줄바꿈 포함 가능. 둘 다 메모 앱에 들어가지만 결이 분명히 달라야 함.',
      '',
      'JSON만 출력, 다른 말 금지. 코드펜스도 쓰지 마.',
    ].join('\n');
  }

  function snapshotBlock(recent) {
    const parts = [];
    if (recent.tweets.length)
      parts.push('[최근 트윗]\n' + recent.tweets.map(t => `- (${t.ts || '-'}) ${t.text}`).join('\n'));
    if (recent.searches.length)
      parts.push('[최근 검색어]\n' + recent.searches.map(s => `- ${s.query}`).join('\n'));
    if (recent.drafts.length)
      parts.push('[최근 임시저장]\n' + recent.drafts.map(d => `- ${d.to}한테: "${d.text}"`).join('\n'));
    if (recent.inbox.length)
      parts.push('[최근 메시지]\n' + recent.inbox.map(i => {
        const dir = (i.direction === 'out') ? '→' : '←';
        const who = i.with || i.from || '?';
        const text = i.text || i.preview || '';
        return `- ${dir} ${who}: "${text}"`;
      }).join('\n'));
    if (recent.calls.length)
      parts.push('[최근 통화]\n' + recent.calls.map(c => {
        const dir = c.direction === 'out' ? '→' : '←';
        const stat = c.status === 'missed' ? ' (부재중)' : c.status === 'rejected' ? ' (거절)' : '';
        const dur = typeof c.duration === 'number' ? `${c.duration}초` : '';
        return `- ${dir} ${c.with} ${dur}${stat}`;
      }).join('\n'));
    if (recent.memos.length)
      parts.push('[최근 메모]\n' + recent.memos.map(m => `- ${m.text}`).join('\n'));
    return parts.length ? parts.join('\n\n') : '(아직 기록 없음)';
  }

  async function extractPhone(ctx, cfg) {
    const sys = extractInstruction(ctx.owner);
    const user = [
      `[기존 폰 상태 요약]\n${snapshotBlock(ctx.recent)}`,
      `[새 RP 본문]\n${ctx.slice}`,
    ].join('\n\n');

    const raw = await callLLM(sys, user, cfg.commentModel);
    const out = parseJSON(raw, { tweets: [], searches: [], drafts: [], inbox: [], calls: [], memos: [] });

    // 각 배열이 없거나 배열 아니면 빈 배열로 정규화
    return {
      tweets:   Array.isArray(out.tweets)   ? out.tweets   : [],
      searches: Array.isArray(out.searches) ? out.searches : [],
      drafts:   Array.isArray(out.drafts)   ? out.drafts   : [],
      inbox:    Array.isArray(out.inbox)    ? out.inbox    : [],
      calls:    Array.isArray(out.calls)    ? out.calls    : [],
      memos:    Array.isArray(out.memos)    ? out.memos    : [],
    };
  }

  // ===========================================================================
  // 6. 상태 갱신 — 누적 저장 + 배열 상한
  // ===========================================================================

  // 새 추출분을 각 배열 앞에 unshift (최신이 위로). id·읽음표시 자동 부여.
  async function mergeStore(out, cfg) {
    const cap = cfg.arrayCap || 25;
    const stamp = (item) => ({
      id: 'p_' + Math.random().toString(36).slice(2, 10),
      seen: false,           // 아직 안 본 항목 (배지용)
      addedAt: Date.now(),
      ...item,
    });

    const apps = ['tweets', 'searches', 'drafts', 'inbox', 'calls', 'memos'];
    for (const app of apps) {
      const incoming = out[app] || [];
      if (!incoming.length) continue;
      const key = await K[app]();
      const existing = await load(key, []);
      const merged = [...incoming.map(stamp), ...existing].slice(0, cap);
      await save(key, merged);
    }
  }

  // 화면에서 "본 걸로" 표시 (배지 끄기용). 앱 화면 들어갈 때 호출 예정.
  async function markSeen(appId) {
    const key = await K[appId]();
    const arr = await load(key, []);
    let touched = false;
    for (const item of arr) {
      if (!item.seen) { item.seen = true; touched = true; }
    }
    if (touched) await save(key, arr);
  }

  // 미확인 개수 — 홈 화면 배지용.
  async function unseenCount(appId) {
    const key = await K[appId]();
    const arr = await load(key, []);
    if (appId === 'inbox') {
      // 보낸 메시지(out)는 배지 카운트 의미 없음
      return arr.filter(x => !x.seen && x.direction !== 'out').length;
    }
    return arr.filter(x => !x.seen).length;
  }

  function countAdded(out) {
    return (out.tweets?.length || 0) + (out.searches?.length || 0)
         + (out.drafts?.length || 0) + (out.inbox?.length || 0)
         + (out.calls?.length || 0) + (out.memos?.length || 0);
  }

  // ===========================================================================
  // 7. UI 셸 + 렌더 (본인 디자인 — 다크 청록 폰, 3+2 격자, sp- prefix)
  // ===========================================================================

  // 화면 상태 (어느 앱 보고 있는지)
  let activeView = 'home'; // 'home' | 'tweets' | 'searches' | 'drafts' | 'calls' | 'memos' | 'settings'
  let activeMsgTab = 'drafts'; // 'drafts' | 'inbox' — 메시지 앱 안 탭

  // 공통 헬퍼
  const esc = (s) => (s || '').replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));
  const ago = (ts) => { if (!ts) return ''; const m = Math.floor((Date.now() - ts) / 60000); return m < 1 ? '방금' : m < 60 ? m + '분 전' : Math.floor(m / 60) + '시간 전'; };
  // 통화 길이 (초 단위) → 한국어 라벨. 0초는 "즉시 끊음", 1시간 넘으면 시·분.
  const formatDuration = (sec) => {
    const s = Number(sec);
    if (!Number.isFinite(s) || s <= 0) return '즉시 끊음';
    if (s < 60) return `${s}초`;
    const m = Math.floor(s / 60), r = s % 60;
    if (m < 60) return r ? `${m}분 ${r}초` : `${m}분`;
    const h = Math.floor(m / 60), rm = m % 60;
    return rm ? `${h}시간 ${rm}분` : `${h}시간`;
  };

  async function openPhone() {
    await risuai.showContainer('fullscreen');
    const __cfg = await settings();
    const meta = document.createElement('meta');
    meta.name = 'viewport';
    meta.content = 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no';
    document.head.appendChild(meta);

    document.body.innerHTML = `
      <style>
        body { margin:0; background:transparent; width:100vw; height:100vh; overflow:hidden;
               font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif; position:relative; }
        .sp-backdrop { position:absolute; inset:0; z-index:1; cursor:pointer; }

        /* 폰 셸 — 다크 그라디언트 베이스 (본인 디자인) */
        .sp-phone { position:absolute; right:20px; bottom:80px; width:320px; height:78vh; max-height:680px;
            border-radius:28px; box-shadow:0 16px 40px var(--sp-shadow);
            z-index:2; display:flex; flex-direction:column; overflow:hidden;
            background: var(--sp-bg);
            --sp-bg:
              radial-gradient(circle at 20% 10%, rgba(138,167,160,.18), transparent 50%),
              radial-gradient(circle at 80% 90%, rgba(184,156,173,.16), transparent 50%),
              linear-gradient(180deg, #1a1d24 0%, #0c0f10 100%);
            --sp-shadow: rgba(0,0,0,.45);
            --sp-text: #e8ecea;
            --sp-text-dim: rgba(232,236,234,.5);
            --sp-text-faint: rgba(232,236,234,.35);
            --sp-divider: rgba(255,255,255,.06);
            --sp-hover: rgba(255,255,255,.08);
            --sp-card: rgba(255,255,255,.04);
            --sp-grip: rgba(232,236,234,.35);
            --sp-input-bg: rgba(0,0,0,.3);
            --sp-input-border: rgba(255,255,255,.15);
            --sp-accent: #5DBFF7;
            --sp-badge-border: #0c0f10; }

        /* 라이트 테마 — 같은 변수 다른 값 */
        .sp-phone.sp-light {
          --sp-bg:
            radial-gradient(circle at 20% 10%, rgba(138,167,160,.12), transparent 50%),
            radial-gradient(circle at 80% 90%, rgba(184,156,173,.10), transparent 50%),
            linear-gradient(180deg, #f4f6f7 0%, #e2e6e8 100%);
          --sp-shadow: rgba(0,0,0,.18);
          --sp-text: #1a1d24;
          --sp-text-dim: rgba(26,29,36,.55);
          --sp-text-faint: rgba(26,29,36,.4);
          --sp-divider: rgba(0,0,0,.07);
          --sp-hover: rgba(0,0,0,.06);
          --sp-card: rgba(0,0,0,.04);
          --sp-grip: rgba(26,29,36,.3);
          --sp-input-bg: rgba(255,255,255,.6);
          --sp-input-border: rgba(0,0,0,.15);
          --sp-accent: #0353A4;
          --sp-badge-border: #f4f6f7;
        }

        .sp-phone.sp-light {
            --sp-bg:
               radial-gradient(circle at 20% 10%, rgba(138,167,160,.12), transparent 50%),
               radial-gradient(circle at 80% 90%, rgba(184,156,173,.10), transparent 50%),
               linear-gradient(180deg, #f4f6f7 0%, #e2e6e8 100%);
            --sp-shadow: rgba(0,0,0,.18);
            --sp-text: #1a1d24;
            --sp-text-dim: rgba(26,29,36,.55);
            --sp-text-faint: rgba(26,29,36,.4);
            --sp-divider: rgba(0,0,0,.07);
            --sp-hover: rgba(0,0,0,.06);
            --sp-card: rgba(0,0,0,.04);
            --sp-grip: rgba(26,29,36,.3);
            --sp-input-bg: rgba(255,255,255,.6);
            --sp-input-border: rgba(0,0,0,.15);
            --sp-accent: #0353A4;
            --sp-badge-border: #f4f6f7; }
        @media (max-width:600px){ .sp-phone{ width:92vw; right:4vw; bottom:70px; height:82vh; } }

        /* 드래그 바 + 닫기 */
        .sp-drag { padding:11px 0 9px; position:relative; cursor:grab; user-select:none;
                   min-height:36px; box-sizing:border-box; }
        .sp-drag:active { cursor:grabbing; }
        .sp-grip { width:42px; height:4px; background:var(--sp-grip); border-radius:999px; margin:0 auto; }
        .sp-close { position:absolute; right:6px; top:50%; transform:translateY(-50%);
                    border:none; background:none; cursor:pointer; color:var(--sp-text);
                    width:44px; height:36px; display:flex; align-items:center; justify-content:center;
                    border-radius:8px; padding:0; }
        .sp-close:hover { background:var(--sp-hover); }
        .sp-close svg { width:18px; height:18px; }

        /* 상태바 */
        .sp-statusbar { flex-shrink:0; height:30px; display:flex; justify-content:space-between;
                        align-items:center; padding:0 22px; color:var(--sp-text);
                        font-size:13px; font-weight:600; letter-spacing:.3px; user-select:none; }
        .sp-statusbar .sp-icons { display:inline-flex; gap:8px; align-items:center; }
        .sp-statusbar svg { width:16px; height:16px; vertical-align:middle; }

        /* 본문 영역 */
        .sp-body { flex:1; overflow-y:auto; color:var(--sp-text); }
        .sp-body::-webkit-scrollbar { width:0; }

        /* === 홈 화면 (3+2 격자) === */
        .sp-home-grid { display:grid; grid-template-columns:repeat(3, 1fr); gap:28px 8px;
                padding:48px 22px 60px; max-width:320px; margin:0 auto; }
        .sp-app { background:none; border:0; color:var(--sp-text); display:flex; flex-direction:column;
                  align-items:center; gap:8px; cursor:pointer; position:relative; padding:4px;
                  transition:transform .12s ease; }
        .sp-app:active { transform:scale(0.94); }
        .sp-app-icon { width:60px; height:60px; border-radius:16px;
                       display:grid; place-items:center;
                       box-shadow:0 6px 18px rgba(0,0,0,.4), inset 0 1px 0 rgba(255,255,255,.08); }
        .sp-app-icon svg { width:28px; height:28px; }
        .sp-app-name { font-size:12px; font-weight:600; letter-spacing:.2px; color:var(--sp-text); }
        .sp-app-badge { position:absolute; top:-4px; right:calc(50% - 38px);
                        min-width:20px; height:20px; padding:0 6px; border-radius:10px;
                        background:#ff453a; color:#fff; font-size:11px; font-weight:700;
                        display:grid; place-items:center; border:2px solid var(--sp-badge-border);
                        box-sizing:content-box;
                        box-shadow:0 2px 6px rgba(255,69,58,.4); }

        /* === 앱 화면 공통 === */
        .sp-app-head { display:flex; align-items:center; gap:6px; padding:8px 12px;
                       background:var(--sp-card); border-bottom:1px solid var(--sp-divider); }
        .sp-back { cursor:pointer; width:44px; height:36px; display:flex; align-items:center;
                   justify-content:center; border-radius:8px; color:var(--sp-text); }
        .sp-back:hover { background:var(--sp-hover); }
        .sp-back svg { width:18px; height:18px; }
        .sp-app-title { flex:1; font-size:15px; font-weight:600; color:var(--sp-text); padding-left:4px; }
        .sp-empty { padding:60px 24px; text-align:center; color:var(--sp-text-dim);
                    font-size:13px; line-height:1.7; }

        /* === 홈 화면 새로고침 버튼 (전체 추출) === */
        .sp-home-refresh {
          margin:10px 14px 12px;
          padding:11px 14px;
          background:var(--sp-card);
          border:1px solid var(--sp-divider);
          border-radius:11px;
          font-size:13px; font-weight:500;
          color:var(--sp-text);
          text-align:center;
          cursor:pointer;
          letter-spacing:-.2px;
          transition:background .12s, opacity .12s;
        }
        .sp-home-refresh:hover { background:var(--sp-hover); }
        .sp-home-refresh.busy {
          opacity:.55; cursor:default;
          color:var(--sp-text-dim);
        }

        /* === 트위터 === */
        .sp-tweet { padding:13px 14px; border-bottom:1px solid var(--sp-divider); }
        .sp-tweet .sp-meta { display:flex; gap:8px; font-size:11px; color:var(--sp-text-dim);
                             margin-bottom:5px; }
        .sp-tweet p { margin:0; font-size:13.5px; line-height:1.55; color:var(--sp-text); }

        /* === 검색 === */
        .sp-search { display:flex; align-items:center; gap:10px; padding:11px 14px;
                     border-bottom:1px solid var(--sp-divider); }
        .sp-search .sp-q-icon { width:28px; height:28px; border-radius:50%;
                                background:var(--sp-card); display:grid; place-items:center;
                                color:var(--sp-text-dim); flex-shrink:0; }
        .sp-search .sp-q-icon svg { width:14px; height:14px; }
        .sp-search .sp-q { flex:1; font-size:13.5px; color:var(--sp-text); }
        .sp-search .sp-q small { display:block; font-size:11px; color:var(--sp-text-dim); margin-top:2px; }

        /* === 임시저장 메시지 === */
        .sp-draft { padding:12px 14px; border-bottom:1px solid var(--sp-divider); }
        .sp-draft .sp-to { font-size:11px; color:#FFEC4F; margin-bottom:4px; font-weight:600; }
        .sp-light .sp-draft .sp-to { color:#D97706; }
        .sp-draft .sp-to small { color:var(--sp-text-dim); font-weight:400; margin-left:6px; }
        .sp-draft .sp-text { font-size:13px; color:var(--sp-text); line-height:1.5;
                             padding:8px 10px; background:var(--sp-card);
                             border-radius:10px 10px 10px 2px; margin-bottom:6px; }
        .sp-draft .sp-why { font-size:11px; color:var(--sp-text-dim); font-style:italic; }

        /* === 받은 메시지 (잠금화면 미리보기 결) === */
        .sp-msg-tabs { display:flex; gap:6px; padding:10px 12px; background:var(--sp-card);
                       border-bottom:1px solid var(--sp-divider); }
        .sp-msg-tab { flex:1; padding:7px 10px; border-radius:8px; font-size:12px; text-align:center;
                      color:var(--sp-text-dim); cursor:pointer; background:transparent;
                      border:1px solid transparent; user-select:none; }
        .sp-msg-tab.active { background:var(--sp-hover); color:var(--sp-text); font-weight:600; }
        .sp-inbox { padding:12px 14px; border-bottom:1px solid var(--sp-divider); position:relative; opacity:.85; }
        .sp-inbox.unread { opacity:1; background:var(--sp-card); }
        .sp-inbox .sp-from { display:flex; align-items:center; gap:6px;
                             font-size:11.5px; color:var(--sp-text); font-weight:600; margin-bottom:5px; }
        .sp-inbox .sp-from .sp-lock { color:var(--sp-text-faint); font-size:10px; }
        .sp-inbox .sp-from .sp-unread-dot { width:7px; height:7px; border-radius:50%;
                                            background:#5DBFF7; box-shadow:0 0 6px rgba(93,191,247,.5); }
        .sp-inbox .sp-from .sp-ts { margin-left:auto; font-size:11px; color:var(--sp-text-faint); font-weight:400; }
        .sp-inbox .sp-preview { font-size:13px; color:var(--sp-text-dim); line-height:1.5;
                                overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }

        /* === 통화 === */
        .sp-call { display:flex; align-items:center; gap:11px; padding:12px 14px;
                   border-bottom:1px solid var(--sp-divider); }
        .sp-call .sp-call-icon { width:32px; height:32px; border-radius:50%; display:grid;
                                 place-items:center; flex-shrink:0; }
        .sp-call.out .sp-call-icon { background:rgba(76,217,100,.15); color:#4CD964; }
        .sp-call.in .sp-call-icon  { background:rgba(93,191,247,.15); color:var(--sp-accent); }
        .sp-call.missed .sp-call-icon { background:rgba(255,69,58,.15); color:#ff453a; }
        .sp-call.rejected .sp-call-icon { background:rgba(168,168,173,.2); color:#A8A8AD; }
        .sp-call .sp-call-icon svg { width:14px; height:14px; }
        .sp-call .sp-call-info { flex:1; }
        .sp-call .sp-call-info b { display:block; font-size:13.5px; color:var(--sp-text); font-weight:500; }
        .sp-call .sp-call-info span { font-size:11px; color:var(--sp-text-dim); }
        .sp-call .sp-call-time { font-size:11px; color:var(--sp-text-dim); }

        /* === 메모 === */
        /* 리디바탕 폰트 불러오기 추가 */
        @font-face {
          font-family: 'Ridibatang';
          src: url('https://cdn.jsdelivr.net/gh/projectnoonnu/noonfonts_twelve@1.0/RIDIBatang.woff') format('woff');
          font-weight: normal; font-style: normal;
        }
        .sp-memo { padding:13px 14px; border-bottom:1px solid var(--sp-divider); }
        .sp-memo .sp-memo-kind { font-size:10px; font-weight:600; color:#D2A875;
                                 letter-spacing:.5px; margin-bottom:5px; }
        .sp-memo .sp-memo-kind.diary { color:#B89CAD; }
        /* 여기에 리디바탕 폰트 적용 */
        .sp-memo p { margin:0; font-size:13px; line-height:1.6; color:var(--sp-text);
                     font-family:'Ridibatang', "Times New Roman", serif; } 
        .sp-memo .sp-memo-ts { font-size:11px; color:var(--sp-text-faint); margin-top:6px; }

        /* === 카톡 디테일 화면 === */
        .sp-chat-head {
          display:flex; align-items:center; gap:10px;
          padding:12px 14px;
          background:#a8bccc;
          border-bottom:1px solid rgba(0,0,0,.08);
          position:sticky; top:0; z-index:2;
        }
        .sp-chat-head .sp-back { cursor:pointer; color:#2c3e50; display:flex; align-items:center; }
        .sp-chat-head .sp-back svg { width:18px; height:18px; }
        .sp-chat-head-title {
          font-size:14.5px; font-weight:600; color:#1f2d3a;
          flex:1; letter-spacing:-.2px;
        }
        .sp-chat-head-menu {
          font-size:18px; color:#2c3e50; opacity:.55;
          font-weight:400; padding:0 4px;
        }

        .sp-chat-room {
          padding:14px 12px 20px;
          display:flex; flex-direction:column; gap:10px;
          background:#b2c7d9; min-height:100%;
        }

        /* 받기 (왼쪽) */
        .sp-chat-row { display:flex; gap:7px; }
        .sp-chat-row-in { align-items:flex-start; }
        .sp-chat-row-out { justify-content:flex-end; }

        .sp-chat-profile {
          width:36px; height:36px; border-radius:13px;
          background:#fff; flex-shrink:0;
          display:flex; align-items:center; justify-content:center;
          font-size:15px; color:#4a545e; font-weight:500;
          box-shadow:0 1px 1px rgba(0,0,0,.04);
        }
        .sp-chat-col-in  { display:flex; flex-direction:column; gap:3px; max-width:75%; }
        .sp-chat-col-out { display:flex; flex-direction:column; gap:3px; max-width:75%; align-items:flex-end; }
        .sp-chat-name {
          font-size:12px; color:#3a4754;
          margin-left:3px; letter-spacing:-.1px;
        }

        /* 말풍선 공통 */
        .sp-chat-bubble {
          max-width:240px;
          padding:9px 12px;
          border-radius:14px;
          font-size:13.5px; line-height:1.55;
          color:#1a1a1a; word-break:break-word;
          letter-spacing:-.2px;
        }
        .sp-chat-receive {
          background:#fff;
          border-top-left-radius:4px;
          box-shadow:0 1px 1.5px rgba(0,0,0,.05);
        }
        .sp-chat-send {
          background:#fef01b;
          border-top-right-radius:4px;
          box-shadow:0 1px 1.5px rgba(0,0,0,.05);
        }

        /* 시간 — 말풍선 아래 작게 */
        .sp-chat-time {
          font-size:10px; color:#5a6772; opacity:.75;
          margin-left:5px; white-space:nowrap;
        }
        .sp-chat-time-out {
          margin-left:0; margin-right:3px;
          text-align:right;
        }

        /* === 대화방 카드 (메시지 탭 목록) === */
        .sp-conv {
          display:flex; align-items:center; gap:11px;
          padding:12px 14px;
          border-bottom:1px solid var(--sp-divider);
          cursor:pointer;
          position:relative;
        }
        .sp-conv:hover { background:var(--sp-card); }
        .sp-conv-avatar {
          width:42px; height:42px; border-radius:14px;
          background:rgba(255,255,255,.06);
          display:flex; align-items:center; justify-content:center;
          font-size:16px; color:var(--sp-text); font-weight:500;
          flex-shrink:0;
        }
        .sp-conv-body { flex:1; min-width:0; }
        .sp-conv-top {
          display:flex; justify-content:space-between; align-items:baseline;
          gap:8px; margin-bottom:3px;
        }
        .sp-conv-name {
          font-size:13.5px; font-weight:600; color:var(--sp-text);
          overflow:hidden; text-overflow:ellipsis; white-space:nowrap;
        }
        .sp-conv-ts {
          font-size:10.5px; color:var(--sp-text-faint);
          flex-shrink:0;
        }
        .sp-conv-preview {
          font-size:12px; color:var(--sp-text-dim);
          line-height:1.45;
          overflow:hidden; text-overflow:ellipsis; white-space:nowrap;
        }
        .sp-conv-badge {
          min-width:18px; height:18px; padding:0 5px;
          border-radius:9px;
          background:#ff453a; color:#fff;
          font-size:10.5px; font-weight:600;
          display:flex; align-items:center; justify-content:center;
          flex-shrink:0;
        }

        /* === 설정 === */
        .sp-st-item { padding:12px 14px; border-bottom:1px solid var(--sp-divider);
                      display:flex; flex-direction:column; gap:6px; }
        .sp-st-item .row { display:flex; justify-content:space-between; align-items:center; gap:10px; }
        .sp-st-item b { font-size:13px; font-weight:600; color:var(--sp-text); }
        .sp-st-item .desc { font-size:11px; color:var(--sp-text-dim); line-height:1.4; }
        .sp-st-item .val { font-size:13px; font-weight:600; color:var(--sp-accent); min-width:30px; text-align:right; }
        .sp-st-item input[type="range"] { width:100%; accent-color:var(--sp-accent); margin:2px 0; }
        .sp-st-item input[type="checkbox"] { width:18px; height:18px; accent-color:var(--sp-accent); flex-shrink:0; }
        .sp-st-item select, .sp-st-item input[type="text"] {
            font-size:12px; padding:5px 10px; border:1px solid var(--sp-input-border);
            border-radius:6px; background:var(--sp-input-bg); color:var(--sp-text); }
        .sp-st-action { padding:12px 14px; cursor:pointer; color:var(--sp-accent);
                        font-size:13px; border-bottom:1px solid var(--sp-divider); }
        .sp-st-action:hover { background:var(--sp-card); }
      </style>
      <div class="sp-backdrop" id="sp-backdrop"></div>
      <div class="sp-phone ${__cfg.theme === 'light' ? 'sp-light' : ''}" id="sp-phone">
        <div class="sp-drag" id="sp-drag">
          <div class="sp-grip"></div>
          <button class="sp-close" id="sp-close" aria-label="닫기">${ICON_SVG.xClose}</button>
        </div>
        <div class="sp-statusbar">
          <span id="sp-clock">오후 3:00</span>
          <span class="sp-icons">${ICON_SVG.wifi}${ICON_SVG.battery}</span>
        </div>
        <div class="sp-body" id="sp-screen"></div>
      </div>`;

    document.getElementById('sp-backdrop').addEventListener('click', () => risuai.hideContainer());
    document.getElementById('sp-close').addEventListener('click', () => risuai.hideContainer());
    bindDrag();
    setClock();

    // 폰 열기 = 화면 표시만. 추출은 새로고침 버튼 누를 때만(진짜 수동).
    activeView = 'home';
    renderHome();
  }

  function setClock() {
    const el = document.getElementById('sp-clock');
    if (!el) return;
    const d = new Date();
    const hr = d.getHours();
    const min = String(d.getMinutes()).padStart(2, '0');
    const ampm = hr < 12 ? '오전' : '오후';
    const h12 = hr % 12 || 12;
    el.textContent = `${ampm} ${h12}:${min}`;
  }

  // 드래그 이동 
  function bindDrag() {
    const phone = document.getElementById('sp-phone');
    const bar = document.getElementById('sp-drag');
    if (!phone || !bar) return;
    let dx = 0, dy = 0, sx = 0, sy = 0, dragging = false;
    const start = (e) => {
      if (e.target.closest('.sp-close')) return;
      dragging = true;
      const p = e.touches ? e.touches[0] : e;
      sx = p.clientX; sy = p.clientY;
      const r = phone.getBoundingClientRect();
      dx = r.left; dy = r.top;
      phone.style.right = 'auto'; phone.style.bottom = 'auto';
      phone.style.left = dx + 'px'; phone.style.top = dy + 'px';
    };
    const move = (e) => {
      if (!dragging) return;
      const p = e.touches ? e.touches[0] : e;
      phone.style.left = (dx + p.clientX - sx) + 'px';
      phone.style.top = (dy + p.clientY - sy) + 'px';
    };
    const end = () => { dragging = false; };
    bar.addEventListener('mousedown', start);
    bar.addEventListener('touchstart', start, { passive: true });
    document.addEventListener('mousemove', move);
    document.addEventListener('touchmove', move, { passive: true });
    document.addEventListener('mouseup', end);
    document.addEventListener('touchend', end);
  }

  // --- 홈 화면 ---
  async function renderHome() {
    activeView = 'home';
    const screen = document.getElementById('sp-screen');
    if (!screen) return;

    // 각 앱의 미확인 개수. 메시지(drafts) 배지는 inbox도 합산.
    const counts = {};
    for (const app of PHONE_APPS) {
      counts[app.id] = await unseenCount(app.id);
      if (app.id === 'drafts') counts[app.id] += await unseenCount('inbox');
    }

    const appBtn = (app) => {
  const badge = counts[app.id] > 0 ? `<span class="sp-app-badge">${counts[app.id]}</span>` : '';
  return `
    <button class="sp-app" data-app="${app.id}">
      <span class="sp-app-icon" style="background:${app.bg}; color:${app.fg};">
        ${ICON_SVG[app.icon] || ''}
      </span>
      <span class="sp-app-name">${app.name}</span>
      ${badge}
    </button>`;
};
const appsHtml = PHONE_APPS.map(appBtn).join('') + `
  <button class="sp-app" data-app="settings">
    <span class="sp-app-icon" style="background:linear-gradient(135deg, #A8A8AD 0%, #5F5F65 100%); color:#fff;">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" style="width:28px;height:28px;"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09a1.65 1.65 0 0 0 1.51-1 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H8a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V8a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
    </span>
    <span class="sp-app-name">설정</span>
  </button>`;

screen.innerHTML = `
  <div class="sp-home-refresh" id="sp-home-refresh">↻ 전체 새로고침</div>
  <div class="sp-home-grid">${appsHtml}</div>`;

    document.getElementById('sp-home-refresh').addEventListener('click', async () => {
      const btn = document.getElementById('sp-home-refresh');
      if (btn.dataset.busy === '1') return;
      btn.dataset.busy = '1';
      btn.textContent = '추출 중…';
      btn.classList.add('busy');
      try { await refreshPhone({ silent: false }); } catch (e) {}
      renderHome();
    });

    screen.querySelectorAll('.sp-app').forEach((el) => {
      el.addEventListener('click', () => {
        const id = el.dataset.app;
        if (id === 'settings') renderSettings();
        else renderApp(id);
      });
    });
  }

  // --- 앱 화면 (5종 + 설정) ---
  async function renderApp(appId) {
    activeView = appId;
    const screen = document.getElementById('sp-screen');
    if (!screen) return;

    const app = PHONE_APPS.find(a => a.id === appId);

    // 메시지 앱은 특별 처리 — 탭(임시저장/받은 메시지) 두 개
    let body;
    let tabsHtml = '';
    if (appId === 'drafts') {
      tabsHtml = `
        <div class="sp-msg-tabs">
          <div class="sp-msg-tab ${activeMsgTab === 'drafts' ? 'active' : ''}" data-msg-tab="drafts">임시저장</div>
          <div class="sp-msg-tab ${activeMsgTab === 'inbox'  ? 'active' : ''}" data-msg-tab="inbox">메시지</div>
        </div>`;
      if (activeMsgTab === 'drafts') {
        const arr = await load(await K.drafts(), []);
        body = arr.length
          ? arr.map(item => renderItem('drafts', item)).join('')
          : `<div class="sp-empty">아직 임시저장된 메시지가 없어요.<br>홈에서 <b>↻ 전체 새로고침</b>을 눌러 추출하세요.</div>`;
      } else {
        // 'inbox' 탭 — 사람별 그룹화한 대화방 목록
        const arr = await load(await K.inbox(), []);
        if (!arr.length) {
          body = `<div class="sp-empty">아직 메시지가 없어요.<br>홈에서 <b>↻ 전체 새로고침</b>을 눌러 추출하세요.</div>`;
        } else {
          const groups = groupByWith(arr);
          body = groups.map(g => renderConversationCard(g)).join('');
        }
      }
    } else {
      const arr = await load(await K[appId](), []);
      body = arr.length
        ? arr.map(item => renderItem(appId, item)).join('')
        : `<div class="sp-empty">아직 기록이 없어요.<br>홈에서 <b>↻ 전체 새로고침</b>을 눌러 추출하세요.</div>`;
    }

    screen.innerHTML = `
      <div class="sp-app-head">
        <span class="sp-back" id="sp-back" aria-label="뒤로">${ICON_SVG.back}</span>
        <span class="sp-app-title">${app ? app.name : '메시지'}</span>
      </div>
      ${tabsHtml}
      ${body}`;

    document.getElementById('sp-back').addEventListener('click', () => renderHome());

    // 메시지 앱 탭 클릭
    screen.querySelectorAll('[data-msg-tab]').forEach((el) => {
      el.addEventListener('click', () => {
        activeMsgTab = el.dataset.msgTab;
        renderApp('drafts');
      });
    });

    // 메시지 탭 — 대화방 카드 클릭 시 그 사람과의 대화 상세
    if (appId === 'drafts' && activeMsgTab === 'inbox') {
      screen.querySelectorAll('.sp-conv-item').forEach(el => {
        el.addEventListener('click', () => renderConversation(el.dataset.with));
      });
    }

    // 화면 들어왔으니 미확인 표시 끄기. 메시지 앱은 현재 탭 거만.
    if (appId === 'drafts') {
      await markSeen(activeMsgTab);
    } else {
      await markSeen(appId);
    }
  }
    // --- 대화 상세 (그 사람과 주고받은 거 다, 카톡 뷰) ---
  async function renderConversation(withName) {
    activeView = 'inbox_detail';
    const screen = document.getElementById('sp-screen');
    const arr = await load(await K.inbox(), []);

    // 그 사람과의 메시지만. 옛 데이터 폴백 (from)
    const msgs = arr.filter(m => (m.with || m.from || '?') === withName);
    if (!msgs.length) {
      renderApp('drafts');
      return;
    }

    // arr는 최신이 앞 → 카톡식으로 옛→새(위→아래)이려면 뒤집기
    const ordered = msgs.slice().reverse();

    // 들어왔으니 받은 메시지(in) 중 unread 해제
    let dirty = false;
    for (const m of arr) {
      const w = m.with || m.from || '?';
      if (w === withName && m.unread && m.direction !== 'out') {
        m.unread = false;
        dirty = true;
      }
    }
    if (dirty) await save(await K.inbox(), arr);

    const initial = (withName || '?').charAt(0);

    const bubbles = ordered.map(m => {
      const isOut = m.direction === 'out';
      const text = m.text || m.preview || '';
      const ts = m.ts || '';
      if (isOut) {
        return `
          <div class="sp-chat-row sp-chat-row-out">
            <div class="sp-chat-col-out">
              <div class="sp-chat-bubble sp-chat-send">${esc(text)}</div>
              <div class="sp-chat-time sp-chat-time-out">${esc(ts)}</div>
            </div>
          </div>`;
      } else {
        return `
          <div class="sp-chat-row sp-chat-row-in">
            <div class="sp-chat-profile">${esc(initial)}</div>
            <div class="sp-chat-col-in">
              <div class="sp-chat-name">${esc(withName)}</div>
              <div class="sp-chat-bubble sp-chat-receive">${esc(text)}</div>
              <div class="sp-chat-time">${esc(ts)}</div>
            </div>
          </div>`;
      }
    }).join('');

    screen.innerHTML = `
      <div class="sp-chat-head">
        <span class="sp-back" id="sp-back-detail" aria-label="뒤로">${ICON_SVG.back}</span>
        <span class="sp-chat-head-title">${esc(withName)}</span>
        <span class="sp-chat-head-menu" aria-hidden="true">≡</span>
      </div>
      <div class="sp-chat-room">${bubbles}</div>`;

    document.getElementById('sp-back-detail').addEventListener('click', () => {
      activeMsgTab = 'inbox';
      renderApp('drafts');
    });
  }

  // 인박스 배열을 사람별로 묶기. 가장 최근 메시지 + 안 읽은 개수.
  function groupByWith(arr) {
    const map = new Map();
    for (const it of arr) {
      const key = it.with || it.from || '?';
      if (!map.has(key)) {
        // 첫 등장이 가장 최근 (arr는 최신 앞)
        map.set(key, { with: key, lastMsg: it, unreadCount: 0 });
      }
      if (it.unread && it.direction !== 'out') {
        map.get(key).unreadCount++;
      }
    }
    return Array.from(map.values());
  }

  // 대화방 카드 (메시지 탭 목록)
  function renderConversationCard(g) {
    const initial = (g.with || '?').charAt(0);
    const last = g.lastMsg || {};
    const text = last.text || last.preview || '';
    const isOut = last.direction === 'out';
    const prefix = isOut ? '나: ' : '';
    const ts = last.ts || '';
    const badge = g.unreadCount > 0
      ? `<span class="sp-conv-badge">${g.unreadCount}</span>`
      : '';
    return `
      <div class="sp-conv sp-conv-item" data-with="${esc(g.with)}">
        <div class="sp-conv-avatar">${esc(initial)}</div>
        <div class="sp-conv-body">
          <div class="sp-conv-top">
            <span class="sp-conv-name">${esc(g.with)}</span>
            <span class="sp-conv-ts">${esc(ts)}</span>
          </div>
          <div class="sp-conv-preview">${esc(prefix + text)}</div>
        </div>
        ${badge}
      </div>`;
  }

  // 각 앱별 항목 렌더
  function renderItem(appId, it) {
    if (appId === 'tweets') {
      return `<div class="sp-tweet">
        <div class="sp-meta"><span>@${esc(stateOwnerHandle())}</span><span>·</span><span>${esc(it.ts || '')}</span></div>
        <p>${esc(it.text || '')}</p></div>`;
    }
    if (appId === 'searches') {
      const ctx = it.context ? `<small>${esc(it.context)}</small>` : '';
      return `<div class="sp-search">
        <div class="sp-q-icon">${ICON_SVG.search}</div>
        <div class="sp-q">${esc(it.query || '')}${ctx}</div></div>`;
    }
    if (appId === 'drafts') {
      return `<div class="sp-draft">
        <div class="sp-to">${esc(it.to || '?')} <small>${esc(it.ts || '')}</small></div>
        <div class="sp-text">${esc(it.text || '')}</div>
        ${it.why ? `<div class="sp-why">— ${esc(it.why)}</div>` : ''}</div>`;
    }
    if (appId === 'inbox') {
      // 더 이상 직접 호출되지 않음 (대화방 카드로 대체). 호환용.
      const who = it.with || it.from || '?';
      const text = it.text || it.preview || '';
      const unreadCls = it.unread ? 'unread' : '';
      const dot = it.unread ? '<span class="sp-unread-dot"></span>' : '';
      return `<div class="sp-inbox ${unreadCls}">
        <div class="sp-from">${dot}<span>${esc(who)}</span>
          <span class="sp-ts">${esc(it.ts || '')}</span></div>
        <div class="sp-preview">${esc(text)}</div>
      </div>`;
    }
    if (appId === 'calls') {
      const status = it.status || (it.missed ? 'missed' : 'completed'); // 옛 데이터 호환
      const cls = status === 'missed' ? 'missed'
                : status === 'rejected' ? 'rejected'
                : (it.direction === 'out' ? 'out' : 'in');
      const dirIcon = status === 'missed' ? '✕'
                    : status === 'rejected' ? '⊘'
                    : (it.direction === 'out' ? '↗' : '↙');
      const label = status === 'missed' ? '부재중'
                  : status === 'rejected' ? '수신거절'
                  : formatDuration(it.duration);
      return `<div class="sp-call ${cls}">
        <div class="sp-call-icon">${dirIcon}</div>
        <div class="sp-call-info"><b>${esc(it.with || '?')}</b><span>${label} · ${esc(it.ts || '')}</span></div>
      </div>`;
    }
    if (appId === 'memos') {
      const kindLabel = it.kind === 'diary' ? '일기' : '메모';
      return `<div class="sp-memo">
        <div class="sp-memo-kind ${it.kind || 'memo'}">${kindLabel}</div>
        <p>${esc(it.text || '')}</p>
        <div class="sp-memo-ts">${esc(it.ts || '')}</div></div>`;
    }
    return '';
  }

  // 트위터 핸들 — 폰 주인 이름에서 만듦 (그냥 표시용)
  let _ownerCache = '';
  function stateOwnerHandle() { return _ownerCache || 'phone'; }
  async function refreshOwnerCache() {
    const state = await load(await K.state(), freshState());
    _ownerCache = state.ownerName || '';
  }

  // --- 설정 화면 ---
  async function renderSettings() {
    activeView = 'settings';
    const screen = document.getElementById('sp-screen');
    const cfg = await settings();
    const state = await load(await K.state(), freshState());

    const tg = (key, label, desc, on) => `
      <div class="sp-st-item">
        <div class="row">
          <div style="flex:1;"><b>${label}</b><div class="desc">${desc}</div></div>
          <input type="checkbox" data-st="${key}" data-kind="bool" ${on ? 'checked' : ''}>
        </div></div>`;
    const sl = (key, label, desc, val, min, max) => `
      <div class="sp-st-item">
        <div class="row"><b>${label}</b><span class="val" id="sp-v-${key}">${val}</span></div>
        <div class="desc">${desc}</div>
        <input type="range" data-st="${key}" data-kind="num" min="${min}" max="${max}" value="${val}">
      </div>`;
    const sel = (key, label, desc, val, opts) => `
      <div class="sp-st-item">
        <div class="row">
          <div style="flex:1;"><b>${label}</b><div class="desc">${desc}</div></div>
          <select data-st="${key}" data-kind="str">
            ${opts.map(o => `<option value="${o[0]}" ${val === o[0] ? 'selected' : ''}>${o[1]}</option>`).join('')}
          </select>
        </div></div>`;
    const txt = (key, label, desc, val, placeholder) => `
      <div class="sp-st-item">
        <div><b>${label}</b><div class="desc">${desc}</div></div>
        <input type="text" data-st="${key}" data-kind="str" value="${esc(val || '')}" placeholder="${placeholder}">
      </div>`;

    screen.innerHTML = `
      <div class="sp-app-head">
        <span class="sp-back" id="sp-back" aria-label="뒤로">${ICON_SVG.back}</span>
        <span class="sp-app-title">설정</span>
      </div>
      ${tg('auto_mode', '자동 모드', 'RP 출력마다 자동 추출 (호출 잦음 주의)', cfg.autoMode)}
      ${sel('comment_model', '호출 모델', '보조(저렴) / 일반(고품질)', cfg.commentModel,
        [['submodel', '보조모델'], ['model', '일반모델']])}
      ${txt('owner_name', '폰 주인 이름', `현재: ${esc(state.ownerName || '(미감지)')}`, cfg.ownerName, '비우면 자동 감지')}
      ${sl('array_cap', '배열 상한', '각 앱당 최대 보관 개수', cfg.arrayCap, 15, 50)}
      ${sl('first_run_turns', '첫 실행 턴 수', '처음 폰 열 때 추출할 최근 턴', cfg.firstRunTurns, 1, 10)}
      ${sel('theme', '테마', '다크(어두운 폰) / 라이트(밝은 폰)', cfg.theme,
        [['dark', '다크'], ['light', '라이트']])}
      <div class="sp-st-action" id="sp-reset">⟲ 이 채팅 폰 기록 전부 리셋</div>`;

    document.getElementById('sp-back').addEventListener('click', () => renderHome());

    const setOverride = async (key, raw) => {
      const ov = await load(K.settings, {});
      ov[key] = raw;
      await save(K.settings, ov);
    };

    screen.querySelectorAll('[data-st]').forEach((el) => {
      const key = el.dataset.st;
      const kind = el.dataset.kind;
      const ev = (el.type === 'range') ? 'input' : (el.type === 'text' ? 'change' : 'change');
      el.addEventListener(ev, () => {
        let v;
        if (kind === 'bool') v = el.checked ? '1' : '0';
        else if (kind === 'num') {
          v = String(el.value);
          const vEl = document.getElementById(`sp-v-${key}`);
          if (vEl) vEl.textContent = v;
        } else v = el.value;
        setOverride(key, v);
        // 테마 바뀌면 폰 셸 클래스 즉시 토글
        if (key === 'theme') {
          const phone = document.getElementById('sp-phone');
          if (phone) phone.classList.toggle('sp-light', v === 'light');
        }
      });
    });

    document.getElementById('sp-reset').addEventListener('click', async () => {
      if (!confirm('이 채팅방의 폰 기록을 전부 지워요. 되돌릴 수 없어요. 계속?')) return;
      const apps = ['tweets', 'searches', 'drafts', 'inbox', 'calls', 'memos'];
      for (const a of apps) await save(await K[a](), []);
      await save(await K.state(), freshState());
      _ownerCache = '';
      alert('리셋 완료. 홈으로 돌아갑니다.');
      renderHome();
    });
  }

  // ===========================================================================
  // 8. 진입점
  // ===========================================================================

  async function initPlugin() {
    await risuai.registerButton(
      { 
        name: '사이드폰', 
        icon: '📱', 
        iconType: 'html', 
        location: 'chat', 
        id: 'btn-secret-phone' 
      },
      async () => {
        await refreshOwnerCache();
        await openPhone();
      }
    );

    // 자동 모드 — RP 출력 후마다 백그라운드 추출
    await risuai.addRisuReplacer('afterRequest', async (content, type) => {
      try {
        const cfg = await settings();
        if (cfg.autoMode) await refreshPhone({ silent: true });
      } catch (e) {
        console.warn('[phone] afterRequest 자동 추출 실패', e);
      }
      return content;
    });

    console.log('[phone] 사이드폰 플러그인 로드 완료');
  }

  initPlugin().catch((e) => console.error('[phone] init 실패', e));
})();
