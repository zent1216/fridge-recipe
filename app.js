const KEY = "fridge-v1";
const SAMPLE = ["egg", "scallion", "onion", "kimchi", "rice", "pork"];
const SAMPLE_SEAS = ["소금", "설탕", "간장", "식용유"];
const CATS = ["전체", "밥", "국&찌개", "반찬", "일품", "후식", "기타"];
const PAGE = 24;
const app = document.getElementById("app");
let photos = null; // credits.json
let ALL = RECIPES.map(r => ({...r, cat: r.cat || "직접 작성"})); // 앱 레시피 + 식약처 레시피
let dbReady = false;
const state = {have: new Set(SAMPLE), seas: new Set(SAMPLE_SEAS), custom: [], level: 1, sample: true, showMiss: false, cat: "전체", q: "", limit: PAGE};

function load() {
  try {
    const s = JSON.parse(localStorage.getItem(KEY));
    if (s) { state.have = new Set(s.have.filter(k => INGREDIENTS[k])); state.seas = new Set((s.seas || []).filter(x => SEASONINGS.includes(x))); state.custom = s.custom || []; state.level = s.level || 1; state.showMiss = !!s.showMiss; state.sample = false; }
  } catch (e) {}
}
function save() {
  state.sample = false;
  try { localStorage.setItem(KEY, JSON.stringify({have: [...state.have], seas: [...state.seas], custom: state.custom, level: state.level, showMiss: state.showMiss})); } catch (e) {}
}
const esc = s => String(s).replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const norm = s => s.replace(/\s/g, "");
const info = k => INGREDIENTS[k] || {n: k, prep: [], keep: ""};

function resolve(text) {
  const t = norm(text);
  return Object.keys(INGREDIENTS).find(k => INGREDIENTS[k].n === t || INGREDIENTS[k].a.includes(t));
}
function hasIng(k) { return state.have.has(k) || state.custom.some(c => norm(c) === k); }
function img(id, label, cls) {
  if (photos && photos[id]) return `<img class="ph ${cls}" src="images/${esc(photos[id].file || id + ".jpg")}" alt="${esc(label)}" loading="lazy">`;
  return `<span class="ph tile ${cls}" role="img" aria-label="${esc(label)}">${esc(label)}</span>`;
}
function dishImg(r, cls) {
  if (r.img) return `<img class="ph ${cls}" src="${esc(r.img)}" alt="${esc(r.n)}" loading="lazy" referrerpolicy="no-referrer">`;
  return img("r-" + r.id, r.n, cls);
}
// 양념 상태: 물은 항상 있음, 다진 마늘은 마늘로 판단, 없으면 대체 양념을 찾음
function sauceState(name) {
  const alts = name.split(" 또는 ").map(s => s.trim());
  if (alts.some(x => /^찬?물$/.test(x) || x === "쌀뜨물")) return {ok: true, free: true};
  for (const x of alts) if (state.seas.has(x) || (x === "다진 마늘" && state.have.has("garlic"))) return {ok: true};
  for (const x of alts) { const sub = (SUBS[x] || []).find(s => state.seas.has(s)); if (sub) return {ok: true, sub}; }
  return {ok: false, opt: OPT_SAUCE.includes(name)};
}
function check(r) {
  const opt = r.opt || OPT[r.id] || [];
  const missKeys = r.ing.map(x => x[0]).filter(k => !hasIng(k));
  const miss = missKeys.filter(k => !opt.includes(k)).map(k => info(k).n);
  const skip = missKeys.filter(k => opt.includes(k)).map(k => info(k).n);
  r.sauce.forEach(([n]) => { const s = sauceState(n); if (!s.ok) (s.opt ? skip : miss).push(n); });
  return {r, miss, skip, got: r.ing.length - missKeys.length};
}
function matches(r) {
  if (state.cat !== "전체" && r.cat !== state.cat) return false;
  return !state.q || norm(r.n).includes(norm(state.q));
}
function ready(l) { return ALL.filter(r => r.lv === l && matches(r)).map(check).filter(x => (x.got > 0 || state.q) && (state.showMiss || !x.miss.length)).length; }
function scored() {
  return ALL.filter(r => r.lv === state.level && matches(r)).map(check).filter(x => (x.got > 0 || state.q) && (state.showMiss || !x.miss.length))
    .sort((a, b) => a.miss.length - b.miss.length || a.skip.length - b.skip.length || b.got - a.got);
}
function cardHTML({r, miss, skip, got}) {
  const status = miss.length ? `<span class="pill miss">${miss.length}개 부족</span>` : `<span class="pill">지금 가능</span>`;
  const list = miss.length ? "없는 재료: " + miss.slice(0, 5).join(", ") + (miss.length > 5 ? " 외" : "") : skip.length ? "빼고 만들기: " + skip.slice(0, 5).join(", ") : "필요한 재료가 모두 있습니다";
  return `<a class="card" href="#r-${r.id}">${dishImg(r, "")}<span class="in"><h3>${esc(r.n)}</h3>
    <span class="row">${status}<span class="meta">재료 ${got}/${r.ing.length}${r.min ? ` · ${r.min}분` : ""}</span></span><span class="note">${esc(list)}</span></span></a>`;
}
function resultsHTML() {
  const ok = scored(), title = state.showMiss ? "추천 요리" : "지금 만들 수 있는 요리";
  const empty = state.showMiss ? "조건에 맞는 요리가 없습니다. 재료를 넣거나 난이도, 종류를 바꿔 보세요." : "지금 재료와 양념으로 만들 수 있는 요리가 없습니다. 재료를 더 넣거나 다른 난이도를 고르거나, 난이도 옆 체크를 켜 보세요.";
  return `<h2 id="h-r">${title} ${ok.length.toLocaleString()}개</h2>
    ${ok.length ? `<div class="cards">${ok.slice(0, state.limit).map(cardHTML).join("")}</div>` : `<p class="panel">${empty}</p>`}
    ${ok.length > state.limit ? `<button class="btn ghost" id="more">더 보기 (${(ok.length - state.limit).toLocaleString()}개 남음)</button>` : ""}`;
}
function levelsHTML() {
  return [1, 2, 3].map(l => `<button class="lv" data-l="${l}" aria-pressed="${state.level === l}"><b>${LEVELS[l].n}</b><small>${LEVELS[l].d}</small><small class="cnt">${state.showMiss ? "표시" : "지금 가능"} ${ready(l).toLocaleString()}개</small></button>`).join("");
}
function jumpText() { const n = [1, 2, 3].map(ready); return `${state.showMiss ? "재료 부족 포함 요리" : "지금 만들 수 있는 요리"} ${(n[0] + n[1] + n[2]).toLocaleString()}개 · ${LEVELS[state.level].n} ${n[state.level - 1].toLocaleString()}개 보기 ↓`; }
function home() {
  document.title = "오늘 뭐 해먹지";
  const chips = [...state.have].map(k => `<button class="chip" data-del="${k}" aria-label="${INGREDIENTS[k].n} 빼기">${INGREDIENTS[k].n} ×</button>`).join("")
    + state.custom.map((c, i) => `<button class="chip custom" data-delc="${i}" aria-label="${esc(c)} 빼기">${esc(c)} ×</button>`).join("");
  app.innerHTML = `<header><h1>오늘 뭐 해먹지</h1><p>냉장고 재료와 양념을 고르면 지금 만들 수 있는 요리를 찾아드립니다. 레시피 ${ALL.length.toLocaleString()}개${dbReady ? "" : " 불러오는 중"}</p></header>
  <section class="panel" aria-labelledby="h-f"><h2 id="h-f">내 냉장고</h2>
    <form class="row" id="f"><input id="q" list="names" placeholder="재료 입력 (예: 삼겹살, 달걀, 아스파라거스)" aria-label="재료 이름" autocomplete="off"><datalist id="names">${Object.values(INGREDIENTS).map(v => `<option value="${v.n}">`).join("")}</datalist>
    <button class="btn">넣기</button><button type="button" class="btn ghost" id="clear">모두 비우기</button></form>
    ${state.sample ? `<p class="note">아래 재료와 양념은 예시입니다. 비우고 내 것을 넣어 보세요.</p>` : ""}
    <div class="chips">${chips || `<span class="note">아직 넣은 재료가 없습니다. 아래 사진을 누르거나 이름을 입력하세요.</span>`}</div>
    <div class="grid-ing">${Object.entries(INGREDIENTS).map(([k, v]) => `<button class="ing" data-k="${k}" aria-pressed="${state.have.has(k)}">${img("i-" + k, v.n, "")}${v.n}</button>`).join("")}</div></section>
  <section class="panel" aria-labelledby="h-s"><div class="row between"><h2 id="h-s">기본 양념</h2><span class="row"><button class="btn ghost small" id="seas-all">모두 있음</button><button class="btn ghost small" id="seas-none">모두 없음</button></span></div>
    <div class="chips">${SEASONINGS.map(s => `<button class="sea" data-s="${s}" aria-pressed="${state.seas.has(s)}">${s}</button>`).join("")}</div>
    <p class="note">물과 육수는 있다고 봅니다. 일부 양념은 있는 양념으로 대체해 추천합니다.</p></section>
  <section class="panel" aria-labelledby="h-l"><div class="row between"><h2 id="h-l">난이도</h2><label class="check"><input type="checkbox" id="show-miss" ${state.showMiss ? "checked" : ""}> 재료가 부족해도 가능한 요리 표시하기</label></div><div class="levels" id="levels">${levelsHTML()}</div></section>
  <section class="panel" aria-label="요리 찾기"><input id="rs" type="search" value="${esc(state.q)}" placeholder="요리 이름 검색 (예: 김치, 파스타)" aria-label="요리 이름 검색" autocomplete="off">
    <div class="chips">${CATS.map(c => `<button class="sea" data-c="${esc(c)}" aria-pressed="${state.cat === c}">${esc(c)}</button>`).join("")}</div></section>
  <section class="results" id="results">${resultsHTML()}</section>
  <button class="jump" id="jump">${jumpText()}</button>
  <footer>레시피: 직접 작성 ${RECIPES.length}개, <a href="https://www.foodsafetykorea.go.kr" target="_blank" rel="noopener">식품의약품안전처 식품안전나라</a> 조리식품 레시피 DB · <a href="#credits">출처 보기</a></footer>`;
}
function refreshResults() {
  const box = document.getElementById("results"); if (box) box.innerHTML = resultsHTML();
  const lv = document.getElementById("levels"); if (lv) lv.innerHTML = levelsHTML();
  const j = document.getElementById("jump"); if (j) j.textContent = jumpText();
}
function stepThumbs(r, text) {
  return r.ing.filter(([k]) => text.includes(info(k).n)).map(([k]) => img("i-" + k, info(k).n, "mini")).join("");
}
function detail(r) {
  document.title = r.n + " · 오늘 뭐 해먹지";
  const opt = r.opt || OPT[r.id] || [];
  const row = ([k, amt]) => {
    const has = hasIng(k), v = info(k), o = opt.includes(k);
    return `<tr><td><span class="nm">${img("i-" + k, v.n, "mini")}${esc(v.n)}</span></td><td><span class="pill ${has ? "" : o ? "opt" : "miss"}">${has ? "있음" : o ? "빼도 됨" : "없음"}</span></td><td>${esc(amt || "")}</td></tr>`;
  };
  const prep = r.ing.map(x => x[0]).filter(k => info(k).prep.length);
  const aiPhoto = photos && photos["r-" + r.id] && photos["r-" + r.id].ai;
  app.innerHTML = `<article class="detail"><a href="#">← 추천 목록으로</a>
   ${dishImg(r, "hero")}
   <div><h1>${esc(r.n)}</h1><p class="meta">${LEVELS[r.lv].n}${r.min ? ` · ${r.min}분 · 2인분` : ""}${r.kcal ? ` · 1인분 ${r.kcal}kcal` : ""}${aiPhoto ? " · 사진은 AI 생성 이미지입니다" : ""}</p></div>
   <section><h2>재료</h2><table>${r.ing.map(row).join("")}</table>${r.parts ? `<p class="note parts">원문 분량: ${esc(r.parts)}</p>` : ""}</section>
   ${r.sauce.length ? `<section><h2>양념</h2><table>${r.sauce.map(([n, a]) => { const s = sauceState(n); const tag = s.free ? "" : s.sub ? `<span class="pill opt">${s.sub}로 대체</span>` : s.ok ? `<span class="pill">있음</span>` : s.opt ? `<span class="pill opt">빼도 됨</span>` : `<span class="pill miss">없음</span>`; return `<tr><td>${esc(n)}</td><td>${tag}</td><td>${esc(a || "")}</td></tr>`; }).join("")}</table></section>` : ""}
   ${prep.length ? `<section><h2>재료 손질</h2>${prep.map(k => { const v = info(k), ai = photos && photos["i-" + k] && photos["i-" + k].ai; return `<div class="prep">${img("i-" + k, v.n, "")}<div><h3>${v.n}</h3>${ai ? `<p class="note">사진은 AI 생성 이미지입니다.</p>` : ""}<ol>${v.prep.map(p => `<li>${p}</li>`).join("")}</ol><p class="note">보관: ${v.keep}</p></div></div>`; }).join("")}</section>` : ""}
   <section><h2>만드는 법</h2><ol class="steps">${r.steps.map(s => { const t = s.t || s, pic = s.img, th = pic ? "" : stepThumbs(r, t); return `<li><div>${esc(t)}${pic ? `<img class="stepimg" src="${esc(pic)}" alt="" loading="lazy" referrerpolicy="no-referrer">` : ""}${th ? `<div class="thumbs">${th}</div>` : ""}</div></li>`; }).join("")}</ol></section>
   ${r.tip ? `<p class="tip"><b>팁</b> ${esc(r.tip)}</p>` : ""}
   ${r.parts ? `<p class="note">출처: 식품의약품안전처 식품안전나라 조리식품 레시피 DB. 분류와 난이도는 이 앱이 자동으로 정리했습니다.</p>` : ""}
   <p><a href="https://www.10000recipe.com/recipe/list.html?q=${encodeURIComponent(r.n)}" target="_blank" rel="noopener">만개의레시피에서 ${esc(r.n)} 더 찾아보기 ↗</a></p></article>`;
  scrollTo(0, 0);
}
function credits() {
  document.title = "출처 · 오늘 뭐 해먹지";
  app.innerHTML = `<a href="#">← 돌아가기</a><h1>출처</h1>
  <p>식약처 레시피와 사진: 식품의약품안전처 <a href="https://www.foodsafetykorea.go.kr" target="_blank" rel="noopener">식품안전나라</a> 조리식품 레시피 DB. 분류와 난이도는 이 앱이 자동으로 정리했습니다.</p>
  <p>재료 사진은 위키미디어 공용의 자유 라이선스 사진이며, AI 생성 이미지는 따로 표시했습니다.</p>
  <div class="credits">${Object.values(photos || {}).map(c => c.ai ? `<span>${esc(c.title)} · ${esc(c.author)}</span>` : `<span><a href="${esc(c.url)}" target="_blank" rel="noopener">${esc(c.title)}</a> · ${esc(c.author)} · ${esc(c.license)}</span>`).join("")}</div>`;
}
function route() {
  const h = location.hash.slice(1);
  if (h === "credits") return credits();
  const r = ALL.find(x => "r-" + x.id === h);
  r ? detail(r) : home();
}
function keepScroll(fn) { const y = scrollY, g = document.querySelector(".grid-ing"), gy = g ? g.scrollTop : 0; state.limit = PAGE; fn(); save(); route(); scrollTo(0, y); const n = document.querySelector(".grid-ing"); if (n) n.scrollTop = gy; }

app.addEventListener("click", e => {
  const b = e.target.closest("button"); if (!b) return;
  if (b.dataset.k) keepScroll(() => { const k = b.dataset.k; state.have.has(k) ? state.have.delete(k) : state.have.add(k); });
  else if (b.dataset.del) keepScroll(() => state.have.delete(b.dataset.del));
  else if (b.dataset.delc) keepScroll(() => state.custom.splice(+b.dataset.delc, 1));
  else if (b.dataset.l) keepScroll(() => { state.level = +b.dataset.l; });
  else if (b.dataset.c) keepScroll(() => { state.cat = b.dataset.c; });
  else if (b.dataset.s) keepScroll(() => { const s = b.dataset.s; state.seas.has(s) ? state.seas.delete(s) : state.seas.add(s); });
  else if (b.id === "seas-all") keepScroll(() => { state.seas = new Set(SEASONINGS); });
  else if (b.id === "seas-none") keepScroll(() => { state.seas.clear(); });
  else if (b.id === "clear") keepScroll(() => { state.have.clear(); state.custom = []; });
  else if (b.id === "jump") document.getElementById("results").scrollIntoView({behavior: "smooth"});
  else if (b.id === "more") { state.limit += PAGE; refreshResults(); }
});
app.addEventListener("submit", e => {
  e.preventDefault();
  const input = document.getElementById("q"), parts = input.value.split(/[,，]/).map(s => s.trim()).filter(Boolean);
  if (!parts.length) return;
  keepScroll(() => parts.forEach(p => { const k = resolve(p); if (k) state.have.add(k); else if (!state.custom.includes(p)) state.custom.push(p); }));
  document.getElementById("q").focus();
});
app.addEventListener("input", e => { if (e.target.id === "rs") { state.q = e.target.value; state.limit = PAGE; refreshResults(); } });
app.addEventListener("change", e => { if (e.target.id === "show-miss") keepScroll(() => { state.showMiss = e.target.checked; }); });
addEventListener("hashchange", route);
load();
route();
fetch("credits.json").then(r => r.json()).then(c => { photos = c; route(); }).catch(() => {});
fetch("recipes-db.json").then(r => r.json()).then(db => {
  ALL = ALL.concat(db.map(r => ({...r, ing: [...r.ing, ...r.raw].map(k => [k, ""]), sauce: r.sauce.map(n => [n, ""])})));
  dbReady = true; route();
}).catch(() => { dbReady = true; route(); });
