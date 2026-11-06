// 식품안전나라 조리식품 레시피 DB를 앱용 recipes-db.json으로 변환합니다.
// 사용: FOODSAFETY_KEY=인증키 node tools/build-db.js  (키는 저장소에 넣지 마세요)
// 또는 이미 받은 원본으로: node tools/build-db.js 원본.json
const fs = require("fs");
const SEAS = [[/육수|^물$|찬물|얼음|끓는 물|탄산수|^(양념|양념장|주재료|부재료|속재료|재료|고명|소스|드레싱|반죽|튀김옷)$/, null],
 [/땅콩버터/,"#땅콩버터"],[/고추장/,"고추장"],[/된장|미소/,"된장"],[/고춧가루|고추가루/,"고춧가루"],[/국간장/,"국간장"],[/간장/,"간장"],[/소금|천일염/,"소금"],[/황설탕|흑설탕|^설탕|스테비아|알룰로스/,"설탕"],
 [/후추|후춧/,"후추"],[/참기름/,"참기름"],[/들기름/,"들기름"],[/올리브/,"올리브유"],[/식용유|튀김기름|콩기름|현미유|포도씨유|카놀라유|고추기름|마늘기름/,"식용유"],[/식초/,"식초"],[/레몬즙|레몬주스/,"레몬즙"],
 [/맛술|청주|정종|미림|소주|와인/,"맛술"],[/물엿|조청/,"물엿"],[/올리고당/,"올리고당"],[/꿀|유자청|매실|생강청/,"꿀"],[/마요네즈/,"마요네즈"],[/케첩/,"케첩"],[/굴소스/,"굴소스"],[/새우젓/,"새우젓"],[/액젓|어간장/,"액젓"],[/카레/,"카레가루"],[/전분|녹말/,"전분"],[/겨자|머스터드|와사비/,"겨자"],[/버터/,"버터"],
 [/통깨|참깨|깨소금|^깨$|검은깨|흑임자/,"통깨"],[/월계수|파슬리|바질|로즈마리|오레가노|타임|민트|계피|강황|식용꽃/,"허브"]];
const ING = [["garlic",/마늘/],["scallion",/대파|쪽파|실파|^파$|다진 ?파|파다진것/],["onion",/양파/],["sweetpumpkin",/단호박/],["zucchini",/애호박|^호박$/],["sweetpotato",/고구마/],["potato",/감자/],["carrot",/당근/],["tofu",/두부/],["kimchi",/김치|묵은지/],
 ["bacon",/베이컨/],["sausage",/소시지|비엔나/],["spam",/스팸|햄$|런천/],["pork",/돼지|삼겹|목살/],["ribs",/갈비/],["beef",/소고기|쇠고기|한우/],["chicken",/닭/],["rice",/^밥$|쌀밥|현미밥|귀리밥|찬밥/],["tuna",/참치/],["fishcake",/어묵/],["sprout",/콩나물/],["beansprout",/숙주/],["spinach",/시금치/],["mushroom",/버섯|양송이/],
 ["chili",/고추|청양|피망없음/],["squid",/오징어/],["octopus",/낙지|주꾸미|문어/],["shrimp",/새우/],["clam",/바지락|조개/],["mussel",/홍합/],["mackerel",/고등어/],["salmon",/연어/],["anchovy",/멸치/],["seaweed",/미역/],["ricecake",/떡/],["ramen",/라면/],["cheese",/치즈/],["milk",/우유/],["cream",/생크림|휘핑크림/],["yogurt",/요거트|요구르트/],["soymilk",/두유/],
 ["radish",/^무$|무채|^깍두기무/],["glassnoodle",/당면/],["cabbage",/양배추|적채/],["napa",/배추/],["tomato",/토마토/],["ricefl",/찹쌀가루|쌀가루/],["flour",/밀가루|박력분|강력분|중력분|부침가루|튀김가루/],["panko",/빵가루/],["gim",/^김$|김가루/],["pickle",/단무지/],
 ["cucumber",/오이/],["paprika",/파프리카|피망/],["perilla",/깻잎/],["chive",/부추/],["eggplant",/가지$/],["broccoli",/브로콜리|브로컬리/],["apple",/^사과/],["pear",/^배$|배즙/],["banana",/바나나/],["lemon",/^레몬/],["bread",/식빵|바게트|모닝빵/],["spaghetti",/스파게티|파스타|펜네/],["noodle",/소면|국수|메밀면/],["udon",/우동/],["nuts",/호두|아몬드|땅콩|잣$|견과|캐슈넛|피스타치오/],["lettuce",/상추|양상추/],["minari",/미나리/],["lotus",/연근/],["burdock",/우엉/],["ginger",/생강/],["kelp",/다시마/],["avocado",/아보카도/],["corn",/옥수수/],["rawrice",/^쌀$|^찹쌀$|^현미$|불린 쌀|멥쌀/],["egg",/달걀|계란|메추리알/]];
const {INGREDIENTS} = require("../data.js");
// 주재료가 아니면 빼도 되는 재료. 요리 이름에 들어 있으면 주재료로 봅니다
const OPTIONAL = new Set(["garlic","scallion","ginger","kelp","chili","nuts","lemon","onion","carrot","paprika","mushroom","perilla","minari","lettuce","cream","milk"]);
const OPT_RAW = /대추|어린잎|새싹|무순|샐러리|셀러리|건포도|크랜베리|호박씨|가다랑어|들깻?가루|들깨가루|천일염|레디쉬|치커리|로메인|비타민|쑥갓|장식/;
function parts(raw, title) {
  let t = (raw || "").replace(/\([^)]*\)|\[[^\]]*\]|（[^）]*）/g, " ").replace(/[●•·▶◆■□○★※]/g, "\n").replace(/\r/g, "");
  const out = [];
  t.split("\n").forEach((line, idx) => {
    line = line.trim(); if (!line) return;
    line = line.replace(/^[^,:：]{0,12}[:：]/, "").replace(/^재료\s*/, "");
    for (let tok of line.split(/[,，、;]/)) {
      tok = tok.trim().replace(/^(주재료|부재료|양념장?|소스|고명|육수|드레싱|양념)\s+/, "");
      const m = tok.match(/^(.*?)(?=\s*(?:약간|적당량|조금|소량|한\s*(?:줌|꼬집|컵|개|쪽|장|스푼)|[0-9½¼¾⅓⅔⅛.\/]))/);
      const n = (m ? m[1] : tok).trim().replace(/\s+/g, " ");
      if (!m && /\s/.test(n) && idx === 0 && n.length > 8) continue;
      if (n.length < 1 || n.length > 14) continue;
      if (title && n.replace(/\s/g, "") === title.replace(/\s/g, "")) continue;
      out.push(n);
    }
  });
  return [...new Set(out)];
}
function classify(names) {
  const ing = new Set(), sauce = new Set(), raw = new Set();
  for (const n of names) {
    const s = SEAS.find(([re]) => re.test(n));
    if (s) { if (s[1] === null) continue; if (s[1][0] === "#") raw.add(s[1].slice(1)); else sauce.add(s[1]); continue; }
    const i = ING.find(([, re]) => re.test(n));
    if (i) ing.add(i[0]); else raw.add(n.replace(/\s/g, ""));
  }
  return {ing: [...ing], sauce: [...sauce], raw: [...raw]};
}
const norm = s => s.replace(/s/g, "");
const https = u => (u || "").replace(/^http:/, "https:");
const clean = s => (s || "").replace(/\s+/g, " ").replace(/^\d+[.)]\s*/, "").replace(/\s*[a-z]$/, "").trim();
async function load() {
  if (process.argv[2]) return JSON.parse(fs.readFileSync(process.argv[2], "utf8"));
  const key = process.env.FOODSAFETY_KEY; if (!key) throw new Error("FOODSAFETY_KEY가 필요합니다");
  const all = [];
  for (let s = 1; ; s += 1000) {
    const j = await (await fetch(`https://openapi.foodsafetykorea.go.kr/api/${key}/COOKRCP01/json/${s}/${s + 999}`)).json();
    all.push(...(j.COOKRCP01.row || [])); if (all.length >= +j.COOKRCP01.total_count) break;
  }
  return all;
}
(async () => {
  const rows = await load(), seen = new Set(), out = [];
  for (const r of rows) {
    if (seen.has(r.RCP_NM)) continue; seen.add(r.RCP_NM);
    const c = classify(parts(r.RCP_PARTS_DTLS, r.RCP_NM)); if (!c.ing.length && !c.raw.length) continue;
    const steps = [];
    for (let i = 1; i <= 20; i++) { const k = String(i).padStart(2, "0"), t = clean(r["MANUAL" + k]); if (t) steps.push({t, img: https(r["MANUAL_IMG" + k])}); }
    if (!steps.length) continue;
    out.push({id: "d" + out.length, n: r.RCP_NM.trim(), cat: r.RCP_PAT2, way: r.RCP_WAY2, img: https(r.ATT_FILE_NO_MAIN || r.ATT_FILE_NO_MK), ...c, opt: [...c.ing.filter(k => OPTIONAL.has(k) && !norm(r.RCP_NM).includes(INGREDIENTS[k].n)), ...c.raw.filter(x => OPT_RAW.test(x))], parts: r.RCP_PARTS_DTLS.replace(/\s*\n\s*/g, " / "), steps, tip: clean(r.RCP_NA_TIP), kcal: +r.INFO_ENG || 0});
  }
  const score = r => r.steps.length + (r.ing.length + r.sauce.length + r.raw.length) * .35 + (r.way === "튀기기" ? 1.5 : 0);
  const sorted = out.map(score).sort((a, b) => a - b), lo = sorted[out.length / 3 | 0], hi = sorted[out.length * 2 / 3 | 0];
  for (const r of out) { const s = score(r); r.lv = s <= lo ? 1 : s <= hi ? 2 : 3; }
  fs.writeFileSync("recipes-db.json", JSON.stringify(out));
  const m = {}; out.forEach(r => r.raw.forEach(x => m[x] = (m[x] || 0) + 1));
  console.log("recipes", out.length, "lv", [1,2,3].map(l => out.filter(r => r.lv === l).length), "cut", lo, hi);
  console.log("noRaw", out.filter(r => !r.raw.length).length, "raw top:", Object.entries(m).sort((a, b) => b[1] - a[1]).slice(0, 70).map(x => x.join(":")).join(" "));
})();
