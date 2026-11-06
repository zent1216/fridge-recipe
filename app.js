const KEY = "fridge-v1";
const SAMPLE = ["egg", "scallion", "onion", "kimchi", "rice", "pork"];
const app = document.getElementById("app");
let photos = null; // credits.json 내용. 사진이 있는 항목만 들어 있음
const state = {have: new Set(SAMPLE), custom: [], level: 1, sample: true};

function load() {
  try {
    const s = JSON.parse(localStorage.getItem(KEY));
    if (s) { state.have = new Set(s.have.filter(k => INGREDIENTS[k])); state.custom = s.custom || []; state.level = s.level || 1; state.sample = false; }
  } catch (e) {}
}
function save() {
  state.sample = false;
  try { localStorage.setItem(KEY, JSON.stringify({have: [...state.have], custom: state.custom, level: state.level})); } catch (e) {}
}
const esc = s => String(s).replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));

function resolve(text) {
  const t = text.replace(/\s/g, "");
  return Object.keys(INGREDIENTS).find(k => INGREDIENTS[k].n === t || INGREDIENTS[k].a.includes(t));
}
function img(id, label, cls) {
  if (photos && photos[id]) return `<img class="ph ${cls}" src="images/${esc(photos[id].file || id + ".jpg")}" alt="${esc(label)}" loading="lazy">`;
  return `<span class="ph tile ${cls}" role="img" aria-label="${esc(label)}">${esc(label)}</span>`;
}
function scored() {
  return RECIPES.filter(r => r.lv === state.level).map(r => {
    const miss = r.ing.filter(([k]) => !state.have.has(k)).map(([k]) => k);
    return {r, miss, got: r.ing.length - miss.length};
  }).sort((a, b) => a.miss.length - b.miss.length || a.r.min - b.r.min);
}
function cardHTML({r, miss, got}) {
  const status = miss.length ? `<span class="pill miss">${miss.length}개 부족</span>` : `<span class="pill">바로 가능</span>`;
  const list = miss.length ? "없는 재료: " + miss.map(k => INGREDIENTS[k].n).join(", ") : "필요한 재료가 모두 있습니다";
  return `<a class="card" href="#r-${r.id}">${img("r-" + r.id, r.n, "")}<span class="in"><h3>${esc(r.n)}</h3>
    <span class="row">${status}<span class="meta">재료 ${got}/${r.ing.length} · ${r.min}분</span></span><span class="note">${list}</span></span></a>`;
}
function home() {
  const list = scored(), ok = list.filter(x => x.got > 0);
  document.title = "오늘 뭐 해먹지";
  const chips = [...state.have].map(k => `<button class="chip" data-del="${k}" aria-label="${INGREDIENTS[k].n} 빼기">${INGREDIENTS[k].n} ×</button>`).join("")
    + state.custom.map((c, i) => `<button class="chip unknown" data-delc="${i}" aria-label="${esc(c)} 빼기">${esc(c)} ×</button>`).join("");
  app.innerHTML = `<header><h1>오늘 뭐 해먹지</h1><p>냉장고 재료를 넣고 난이도를 고르면, 지금 만들 수 있는 요리부터 보여드립니다.</p></header>
  <section class="panel" aria-labelledby="h-f"><h2 id="h-f">내 냉장고</h2>
    <form class="row" id="f"><input id="q" list="names" placeholder="재료 입력 (예: 삼겹살, 달걀)" aria-label="재료 이름" autocomplete="off"><datalist id="names">${Object.values(INGREDIENTS).map(v => `<option value="${v.n}">`).join("")}</datalist>
    <button class="btn">넣기</button><button type="button" class="btn ghost" id="clear">모두 비우기</button></form>
    ${state.sample ? `<p class="note">아래 재료는 예시입니다. 비우고 내 재료를 넣어 보세요.</p>` : ""}
    <div class="chips">${chips || `<span class="note">아직 넣은 재료가 없습니다. 아래 사진을 누르거나 이름을 입력하세요.</span>`}</div>
    ${state.custom.length ? `<p class="note">주황색 재료는 아직 레시피에 없어 추천에 반영되지 않습니다.</p>` : ""}
    <div class="grid-ing">${Object.entries(INGREDIENTS).map(([k, v]) => `<button class="ing" data-k="${k}" aria-pressed="${state.have.has(k)}">${img("i-" + k, v.n, "")}${v.n}</button>`).join("")}</div>
    <p class="note">소금, 설탕, 간장, 고추장 같은 기본 양념은 있다고 보고 추천합니다.</p></section>
  <section class="panel" aria-labelledby="h-l"><h2 id="h-l">난이도</h2><div class="levels">${[1,2,3].map(l => `<button class="lv" data-l="${l}" aria-pressed="${state.level === l}"><b>${LEVELS[l].n}</b><small>${LEVELS[l].d}</small></button>`).join("")}</div></section>
  <section style="display:flex;flex-direction:column;gap:12px" aria-labelledby="h-r"><h2 id="h-r">추천 요리 ${ok.length}개</h2>
    ${ok.length ? `<div class="cards">${ok.map(cardHTML).join("")}</div>` : `<p class="panel">이 난이도에서 맞는 요리가 없습니다. 재료를 더 넣거나 난이도를 바꿔 보세요.</p>`}</section>
  <footer>사진: 위키미디어 공용 · <a href="#credits">사진 출처 보기</a></footer>`;
}
function stepThumbs(r, text) {
  return r.ing.filter(([k]) => text.includes(INGREDIENTS[k].n)).map(([k]) => img("i-" + k, INGREDIENTS[k].n, "mini")).join("");
}
function detail(r) {
  document.title = r.n + " · 오늘 뭐 해먹지";
  const row = ([k, amt]) => {
    const has = state.have.has(k), v = INGREDIENTS[k];
    return `<tr><td><span class="nm">${img("i-" + k, v.n, "mini")}${v.n}</span></td><td><span class="pill ${has ? "" : "miss"}">${has ? "있음" : "없음"}</span></td><td>${amt}</td></tr>`;
  };
  app.innerHTML = `<article class="detail"><a href="#">← 추천 목록으로</a>
   ${img("r-" + r.id, r.n, "hero")}
   <div><h1>${r.n}</h1><p class="meta">${LEVELS[r.lv].n} · ${r.min}분 · 2인분${photos && photos["r-" + r.id] && photos["r-" + r.id].ai ? " · 사진은 AI 생성 이미지입니다" : ""}</p></div>
   <section><h2>재료</h2><table>${r.ing.map(row).join("")}</table></section>
   <section><h2>양념</h2><table>${r.sauce.map(([n, a]) => `<tr><td>${n}</td><td>${a}</td></tr>`).join("")}</table></section>
   <section><h2>재료 손질</h2>${r.ing.map(([k]) => { const v = INGREDIENTS[k]; return `<div class="prep">${img("i-" + k, v.n, "")}<div><h3>${v.n}</h3>${photos && photos["i-" + k] && photos["i-" + k].ai ? `<p class="note">사진은 AI 생성 이미지입니다.</p>` : ""}<ol>${v.prep.map(p => `<li>${p}</li>`).join("")}</ol><p class="note">보관: ${v.keep}</p></div></div>`; }).join("")}</section>
   <section><h2>만드는 법</h2><ol class="steps">${r.steps.map(s => { const t = stepThumbs(r, s); return `<li><div>${s}${t ? `<div class="thumbs">${t}</div>` : ""}</div></li>`; }).join("")}</ol></section>
   <p class="tip"><b>팁</b> ${r.tip}</p></article>`;
  scrollTo(0, 0);
}
function credits() {
  document.title = "사진 출처 · 오늘 뭐 해먹지";
  app.innerHTML = `<a href="#">← 돌아가기</a><h1>사진 출처</h1><p>사진은 위키미디어 공용의 자유 라이선스 사진이며, AI 생성 이미지는 따로 표시했습니다.</p>
  <div class="credits">${Object.values(photos || {}).map(c => c.ai ? `<span>${esc(c.title)} · ${esc(c.author)}</span>` : `<span><a href="${esc(c.url)}" target="_blank" rel="noopener">${esc(c.title)}</a> · ${esc(c.author)} · ${esc(c.license)}</span>`).join("")}</div>`;
}
function route() {
  const h = location.hash.slice(1);
  if (h === "credits") return credits();
  const r = RECIPES.find(x => "r-" + x.id === h);
  r ? detail(r) : home();
}
function keepScroll(fn) { const y = scrollY; const g = document.querySelector(".grid-ing"), gy = g ? g.scrollTop : 0; fn(); save(); route(); scrollTo(0, y); const n = document.querySelector(".grid-ing"); if (n) n.scrollTop = gy; }

app.addEventListener("click", e => {
  const b = e.target.closest("button"); if (!b) return;
  if (b.dataset.k) keepScroll(() => { const k = b.dataset.k; state.have.has(k) ? state.have.delete(k) : state.have.add(k); });
  else if (b.dataset.del) keepScroll(() => state.have.delete(b.dataset.del));
  else if (b.dataset.delc) keepScroll(() => state.custom.splice(+b.dataset.delc, 1));
  else if (b.dataset.l) keepScroll(() => { state.level = +b.dataset.l; });
  else if (b.id === "clear") keepScroll(() => { state.have.clear(); state.custom = []; });
});
app.addEventListener("submit", e => {
  e.preventDefault();
  const input = document.getElementById("q"), parts = input.value.split(/[,，]/).map(s => s.trim()).filter(Boolean);
  if (!parts.length) return;
  keepScroll(() => parts.forEach(p => { const k = resolve(p); if (k) state.have.add(k); else if (!state.custom.includes(p)) state.custom.push(p); }));
  document.getElementById("q").focus();
});
addEventListener("hashchange", route);
load();
route();
fetch("credits.json").then(r => r.json()).then(c => { photos = c; route(); }).catch(() => {});
