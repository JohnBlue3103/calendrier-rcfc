(function () {
  const cfg = window.CALENDRIER_CONFIG || {};
  const matchsSheetId = cfg.MATCHS_SHEET_ID || cfg.SHEET_ID || "";
  const calendriers = (cfg.CALENDRIERS || []).filter((c) => c && c.id);
  const modeMatchs = cfg.API_KEY && (calendriers.length || cfg.CALENDAR_ID) ? "agenda"
    : cfg.API_KEY && cfg.MATCHS_RANGE && matchsSheetId ? "sheet" : "demo";

  const $ = (id) => document.getElementById(id);
  const norm = (s) => String(s || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
  const startOfDay = (d) => { const x = new Date(d); x.setHours(0, 0, 0, 0); return x; };
  const addDays = (d, n) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };
  const JOURS = ["lundi", "mardi", "mercredi", "jeudi", "vendredi", "samedi", "dimanche"];
  const JOURS_DATE = ["dimanche", "lundi", "mardi", "mercredi", "jeudi", "vendredi", "samedi"];
  const MOIS = ["janvier", "février", "mars", "avril", "mai", "juin", "juillet", "août", "septembre", "octobre", "novembre", "décembre"];
  const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);
  const pad2 = (n) => String(n).padStart(2, "0");

  $("titre").textContent = cfg.TITRE || "Calendrier du club";
  $("sous-titre").textContent = cfg.SOUS_TITRE || "";
  if (cfg.API_KEY && cfg.CALENDAR_ID && !calendriers.length) {
    const cid = btoa(cfg.CALENDAR_ID).replace(/=+$/, "");
    const a = $("btn-agenda");
    a.href = "https://calendar.google.com/calendar/u/0?cid=" + encodeURIComponent(cid);
    a.hidden = false;
  }
  $("btn-imprimer").addEventListener("click", () => window.print());
  $("btn-passes").addEventListener("click", () => { vuePassee = !vuePassee; majBoutons(); afficher(); });

  function el(tag, cls, text) {
    const n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  }

  /* =====================  APPARENCE : couleurs des terrains et étiquettes  ===================== */
  // Couleurs reprises de tes agendas Google
  const COULEURS_TERRAINS = [
    ["honneur", "#F4511E"], ["karben", "#E4C441"], ["deviation", "#F09300"], ["vigoulet", "#8E24AA"],
    ["auzeville", "#0B8043"], ["i np", "#039BE5"], ["inp", "#039BE5"], ["brique", "#B5523B"],
    ["pompertuzat", "#5E7FA8"], ["labege", "#5E7FA8"],
  ];
  const couleurTerrain = (nom) => { const n = norm(nom); const t = COULEURS_TERRAINS.find(([k]) => n.includes(k)); return t ? t[1] : "#6f88a8"; };

  function decouperTitre(t) {
    let s = String(t), tag = "";
    const m = s.match(/\(([^)]*)\)\s*$/);
    if (m) { tag = m[1].trim(); s = s.slice(0, m.index).trim(); }
    const i = s.indexOf(" - ");
    return i > 0 ? { eq: s.slice(0, i).trim(), vs: s.slice(i + 3).trim(), tag } : { eq: s.trim(), vs: "", tag };
  }

  // Étiquette d'un match (équipe / adversaire / type) ou, en mode simple, d'une équipe à l'entraînement
  function puce(titre, couleur, o) {
    o = o || {};
    const p = el("div", "puce" + (o.simple ? " simple" : "") + (o.note ? " note" : "") + (o.trouve ? " trouve" : ""));
    p.style.setProperty("--c", couleur);
    p.title = titre;
    if (o.simple) { p.appendChild(el("span", "eq", titre)); return p; }
    const d = decouperTitre(titre);
    p.appendChild(el("span", "eq", d.eq));
    if (d.vs) p.appendChild(el("span", "vs", d.vs));
    if (d.tag) p.appendChild(el("span", "tag", d.tag));
    return p;
  }

  /* =====================  GRILLES (modèle commun)  ===================== */
  // Modèle : { rows: [[{ v, bg, fg, b, i, al }]], merges: [{ r, c, rs, cs }] }
  const cell = (v, o) => Object.assign({ v: v || "", bg: null, fg: null, b: false, i: false, al: "" }, o || {});

  const cssBg = (c) => {
    if (!c) return null;
    const r = Math.round((c.red || 0) * 255), g = Math.round((c.green || 0) * 255), b = Math.round((c.blue || 0) * 255);
    return r >= 250 && g >= 250 && b >= 250 ? null : `rgb(${r},${g},${b})`;
  };
  const cssFg = (c) => {
    if (!c) return null;
    const r = Math.round((c.red || 0) * 255), g = Math.round((c.green || 0) * 255), b = Math.round((c.blue || 0) * 255);
    return r + g + b < 60 ? null : `rgb(${r},${g},${b})`;
  };

  function grilleDepuisSheets(json) {
    const sh = (json.sheets || [])[0];
    const data = sh && sh.data && sh.data[0];
    if (!data) throw new Error("Le tableau est vide ou l'onglet est introuvable.");
    const r0 = data.startRow || 0, c0 = data.startColumn || 0;
    const rows = (data.rowData || []).map((rd) => (rd.values || []).map((c) => {
      const f = c.effectiveFormat || {}, t = f.textFormat || {};
      return { v: String(c.formattedValue || "").trim(), bg: cssBg(f.backgroundColor), fg: cssFg(t.foregroundColor), b: !!t.bold, i: !!t.italic, al: f.horizontalAlignment || "" };
    }));
    const merges = (sh.merges || []).map((m) => ({
      r: m.startRowIndex - r0, c: m.startColumnIndex - c0,
      rs: m.endRowIndex - m.startRowIndex, cs: m.endColumnIndex - m.startColumnIndex,
    })).filter((m) => m.r >= 0 && m.c >= 0);
    return { rows, merges };
  }

  async function lireFeuille(sheetId, range, messageErreur) {
    const fields = "sheets(merges,data(startRow,startColumn,rowData(values(formattedValue,effectiveFormat(backgroundColor,horizontalAlignment,textFormat(bold,italic,foregroundColor))))))";
    const url = "https://sheets.googleapis.com/v4/spreadsheets/" + encodeURIComponent(sheetId) +
      "?includeGridData=true&ranges=" + encodeURIComponent(range) + "&fields=" + encodeURIComponent(fields) +
      "&key=" + encodeURIComponent(cfg.API_KEY);
    const res = await fetch(url);
    if (!res.ok) throw new Error(messageErreur + " (code " + res.status + "). Vérifiez son partage (« toute personne disposant du lien »), le nom de l'onglet et la clé dans js/config.js.");
    return grilleDepuisSheets(await res.json());
  }

  // Construit un <table> à partir d'une zone de la grille, en reprenant fusions et couleurs.
  // moderne : habillage du site (rôles + étiquettes) au lieu des couleurs du tableur.
  function tableDepuis(grille, o) {
    const { r0, r1, c0, c1, debutDonnees, q, collante, moderne } = o;
    const couverte = new Set(), origine = new Map();
    for (const m of grille.merges) {
      origine.set(m.r + "," + m.c, m);
      for (let r = m.r; r < m.r + m.rs; r++) for (let c = m.c; c < m.c + m.cs; c++) if (r !== m.r || c !== m.c) couverte.add(r + "," + c);
    }
    const table = el("table", "grille" + (moderne ? " moderne" : ""));
    let trouves = 0;
    for (let r = r0; r <= r1; r++) {
      const tr = el("tr");
      for (let c = c0; c <= c1; c++) {
        if (couverte.has(r + "," + c)) continue;
        const d = (grille.rows[r] && grille.rows[r][c]) || { v: "", bg: null };
        const td = el("td");
        const m = origine.get(r + "," + c);
        if (m) { td.colSpan = Math.min(m.cs, c1 - c + 1); td.rowSpan = Math.min(m.rs, r1 - r + 1); }
        const classes = [];
        if (d.role) classes.push("r-" + d.role);
        if (d.nj) classes.push("nj");
        const donnee = r >= debutDonnees && c > c0 && d.v;
        if (moderne) {
          if (r >= debutDonnees && c === c0) {
            const dot = el("span", "dot"); dot.style.background = couleurTerrain(d.v);
            td.append(dot, el("span", null, d.v));
          } else if (donnee) {
            const couleur = couleurTerrain((grille.rows[r][c0] || {}).v);
            const conteneur = el("div", "puces");
            const morceaux = d.role !== "note" && d.v.includes("/") && d.v.split("/").every((x) => x.trim().length <= 18)
              ? d.v.split("/").map((x) => x.trim()) : [d.v];
            for (const t of morceaux) {
              const hit = !!q && norm(t).includes(q);
              if (hit) trouves++;
              conteneur.appendChild(puce(t, d.role === "note" ? "#F1C232" : couleur, { simple: true, note: d.role === "note", trouve: hit }));
            }
            td.appendChild(conteneur);
          } else td.textContent = d.v;
        } else {
          td.textContent = d.v;
          td.style.background = d.bg || "#fff";
          if (d.fg) td.style.color = d.fg;
          if (d.b) classes.push("b");
          if (d.i) classes.push("i");
          if (d.al === "CENTER") classes.push("centre");
          if (q && donnee && norm(d.v).includes(q)) { classes.push("trouve"); trouves++; }
        }
        if (collante && c === c0 && r >= debutDonnees) classes.push("sticky");
        td.className = classes.join(" ");
        tr.appendChild(td);
      }
      table.appendChild(tr);
    }
    const wrap = el("div", "tableau-wrap" + (moderne ? " moderne" : ""));
    wrap.appendChild(table);
    return { wrap, trouves };
  }

  /* =====================  MATCHS : regroupement par week-end (commun agenda / sheet)  ===================== */
  function regrouper(blocs) {
    const groupes = [];
    for (const b of blocs) {
      const cur = groupes[groupes.length - 1];
      const suit = cur && cur.blocs.length === 1 && cur.blocs[0].p.jour === "sam" && b.p.jour === "dim" &&
        (!(cur.blocs[0].date && b.date) || +b.date === +addDays(cur.blocs[0].date, 1));
      if (suit) cur.blocs.push(b); else groupes.push({ blocs: [b] });
    }
    for (const g of groupes) {
      const datees = g.blocs.filter((b) => b.date);
      g.debut = datees.length ? datees[0].date : null;
      g.fin = datees.length ? datees[datees.length - 1].date : null;
      if (g.blocs.length === 2 && g.blocs.every((b) => b.date)) {
        const [a, b] = g.blocs.map((x) => x.date);
        g.titre = a.getMonth() === b.getMonth()
          ? `Week-end du ${a.getDate()} et ${b.getDate()} ${MOIS[a.getMonth()]}`
          : `Week-end du ${a.getDate()} ${MOIS[a.getMonth()]} et ${b.getDate()} ${MOIS[b.getMonth()]}`;
      } else g.titre = g.blocs.map((b) => b.label).join(" + ");
    }
    return groupes;
  }

  /* =====================  MATCHS depuis Google Agenda -> tableau terrains × horaires  ===================== */
  function parseEvent(e) {
    const allDay = !!e.start.date;
    const start = allDay ? new Date(e.start.date + "T00:00:00") : new Date(e.start.dateTime);
    return { start, allDay, titre: e.summary || "(sans titre)", lieu: e.location || "" };
  }

  async function chargerUnAgenda(id, terrain) {
    const now = startOfDay(new Date());
    const min = addDays(now, -(cfg.JOURS_PASSES || 0));
    const max = addDays(now, cfg.JOURS_A_VENIR || 180);
    const url = "https://www.googleapis.com/calendar/v3/calendars/" + encodeURIComponent(id) +
      "/events?singleEvents=true&orderBy=startTime&maxResults=250" +
      "&timeMin=" + encodeURIComponent(min.toISOString()) +
      "&timeMax=" + encodeURIComponent(max.toISOString()) +
      "&key=" + encodeURIComponent(cfg.API_KEY);
    const res = await fetch(url);
    if (!res.ok) throw new Error("L'agenda" + (terrain ? " « " + terrain + " »" : "") + " n'est pas accessible (code " + res.status + "). Vérifiez qu'il est public (avec tous les détails des événements), que son identifiant est exact et que la clé est autorisée pour ce site.");
    const data = await res.json();
    return (data.items || []).filter((e) => e.status !== "cancelled" && e.start).map((e) => Object.assign(parseEvent(e), { terrain }));
  }

  async function chargerAgenda() {
    const sources = calendriers.length ? calendriers.map((c) => ({ id: c.id, terrain: c.nom })) : [{ id: cfg.CALENDAR_ID, terrain: null }];
    const parAgenda = await Promise.all(sources.map((s) => chargerUnAgenda(s.id, s.terrain)));
    return parAgenda.flat().sort((a, b) => a.start - b.start);
  }

  const minutes = (d) => d.getHours() * 60 + d.getMinutes();
  const libelleHeure = (min) => `${Math.floor(min / 60)}H${min % 60 ? pad2(min % 60) : ""}`;

  function terrainDe(lieu) {
    const n = norm(lieu);
    for (const t of cfg.TERRAINS || []) {
      for (const mot of t.mots) {
        const re = new RegExp("(^|[^a-z0-9])" + norm(mot).replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "([^a-z0-9]|$)");
        if (re.test(n)) return t.nom;
      }
    }
    return null;
  }

  function analyserAgenda(events) {
    const parJour = new Map();
    for (const ev of events) {
      const cle = +startOfDay(ev.start);
      if (!parJour.has(cle)) parJour.set(cle, { date: startOfDay(ev.start), events: [] });
      parJour.get(cle).events.push(ev);
    }
    const blocs = [];
    for (const { date, events: evs } of [...parJour.values()].sort((a, b) => a.date - b.date)) {
      const nj = date.getDay(); // 0 = dimanche
      const cols = new Set();
      const place = evs.map((ev) => {
        const colonne = ev.allDay ? -1 : minutes(ev.start);
        cols.add(colonne);
        return { ev, colonne, terrain: ev.terrain || terrainDe(ev.lieu) };
      });
      const colonnes = [...cols].sort((a, b) => a - b);

      const ordre = (cfg.TERRAINS || []).map((t) => t.nom);
      const weekend = nj === 6 || nj === 0;
      const noms = weekend ? ordre.filter((n) => !(nj === 0 && (cfg.TERRAINS_MASQUES_DIMANCHE || []).includes(n))) : [];
      const autres = [];
      for (const p of place) {
        if (p.terrain) { if (!noms.includes(p.terrain)) noms.push(p.terrain); continue; }
        const lbl = (p.ev.lieu || "Lieu non précisé").split(",")[0].trim().slice(0, 40).toUpperCase();
        p.terrain = lbl;
        if (!autres.includes(lbl)) autres.push(lbl);
      }
      noms.sort((a, b) => ordre.indexOf(a) - ordre.indexOf(b));

      const donnees = {
        nb: evs.length,
        colonnes: colonnes.map((c) => (c < 0 ? "JOURNÉE" : libelleHeure(c))),
        lignes: [...noms, ...autres].map((nom) => ({
          nom, couleur: couleurTerrain(nom),
          cases: colonnes.map((c) => place.filter((p) => p.terrain === nom && p.colonne === c).map((p) => p.ev)),
        })),
      };
      blocs.push({
        label: cap(JOURS_DATE[nj]) + " " + date.getDate() + " " + MOIS[date.getMonth()],
        p: { jour: nj === 6 ? "sam" : nj === 0 ? "dim" : "sem" }, date, donnees, vide: false,
      });
    }
    return { groupes: regrouper(blocs) };
  }

  // Carte d'un jour : entête + tableau terrains x heures
  function carteMatchs(b, q) {
    const d = b.donnees;
    const aujourdhui = !!b.date && +b.date === +startOfDay(new Date());
    const passee = !!b.date && b.date < startOfDay(new Date());
    const carte = el("div", "carte-jour" + (aujourdhui ? " aujourdhui" : "") + (passee ? " passee" : ""));
    const tete = el("div", "carte-tete");
    tete.appendChild(el("h3", null, b.label));
    if (aujourdhui) tete.appendChild(el("span", "badge", "Aujourd'hui"));
    tete.appendChild(el("span", "compte", d.nb + " match" + (d.nb > 1 ? "s" : "")));
    carte.appendChild(tete);

    const table = el("table", "matchs");
    const entete = el("tr");
    entete.appendChild(el("th", "t-terrain", "Terrain"));
    d.colonnes.forEach((h) => entete.appendChild(el("th", "t-heure", h)));
    table.appendChild(entete);
    let trouves = 0;
    for (const l of d.lignes) {
      const tr = el("tr");
      const nomTd = el("td", "t-terrain");
      const dot = el("span", "dot"); dot.style.background = l.couleur;
      nomTd.append(dot, el("span", null, l.nom));
      tr.appendChild(nomTd);
      let nb = 0;
      for (const evs of l.cases) {
        const td = el("td");
        for (const ev of evs) {
          if (q && !norm(ev.titre + " " + l.nom).includes(q)) continue;
          td.appendChild(puce(ev.titre, l.couleur, { trouve: !!q }));
          nb++; if (q) trouves++;
        }
        tr.appendChild(td);
      }
      tr.className = nb ? "" : "vide";
      table.appendChild(tr);
    }
    if (q && !trouves) return null;
    const wrap = el("div", "matchs-wrap");
    wrap.appendChild(table);
    carte.appendChild(wrap);

    // Version téléphone : une ligne par heure (le tableau est masqué en CSS sur petit écran)
    const liste = el("div", "liste-heures");
    d.colonnes.forEach((h, ci) => {
      const items = [];
      for (const l of d.lignes) {
        for (const ev of l.cases[ci]) {
          if (q && !norm(ev.titre + " " + l.nom).includes(q)) continue;
          items.push({ l, ev });
        }
      }
      if (!items.length) return;
      const ligne = el("div", "ligne-heure");
      ligne.appendChild(el("div", "h", h));
      const corps = el("div", "items");
      for (const { l, ev } of items) {
        const it = el("div", "item");
        const tag = el("div", "terrain-tag");
        const dot = el("span", "dot"); dot.style.background = l.couleur;
        tag.append(dot, el("span", null, l.nom));
        it.append(tag, puce(ev.titre, l.couleur, { trouve: !!q }));
        corps.appendChild(it);
      }
      ligne.appendChild(corps);
      liste.appendChild(ligne);
    });
    carte.appendChild(liste);
    return carte;
  }

  function evenementsDemo() {
    const now = startOfDay(new Date());
    const sam = addDays(now, (6 - now.getDay() + 7) % 7 || 7);
    const at = (d, h, m) => { const x = new Date(d); x.setHours(h, m, 0, 0); return x; };
    const mk = (d, h, m, titre, lieu) => ({ start: at(d, h, m), allDay: false, titre, lieu });
    const dim = addDays(sam, 1);
    return [
      mk(sam, 10, 0, "U11 – RCFC vs Lavaur", "Stade d'Auzeville, Auzeville-Tolosane"),
      mk(sam, 14, 30, "U15 – RCFC vs Revel", "Stade de Karben, Ramonville"),
      mk(sam, 18, 0, "Seniors B – RCFC vs Albi", "Terrain d'honneur, Ramonville"),
      mk(sam, 20, 0, "Seniors Féminines – RCFC vs Muret", "Terrain d'honneur, Ramonville"),
      mk(dim, 10, 0, "U13 – RCFC vs Pamiers", "Stade de Karben, Ramonville"),
      mk(dim, 15, 0, "Seniors A – RCFC vs Revel", "Terrain d'honneur, Ramonville"),
      mk(dim, 16, 0, "U17 – RCFC vs Castres", "Gymnase de Pompertuzat"),
      mk(addDays(sam, 4), 19, 0, "U15 Coupe – RCFC vs Muret", "Stade de Karben, Ramonville"),
      mk(addDays(sam, 7), 15, 0, "Seniors A – RCFC vs Albi", "Terrain d'honneur, Ramonville"),
    ];
  }

  /* =====================  MATCHS depuis un onglet du Sheet (option)  ===================== */
  const MOIS_ABBR = { jan: 0, fev: 1, mar: 2, avr: 3, mai: 4, juin: 5, juil: 6, aou: 7, sep: 8, oct: 9, nov: 10, dec: 11 };

  function parseLabelJour(label) {
    const n = norm(label);
    const m = n.match(/^(lun|mar|mer|jeu|ven|sam|dim)[a-z]*\.?\s+(\d{1,2})(?:er)?\s*([a-z]+)?/);
    if (!m) return null;
    let mois = null;
    if (m[3]) mois = m[3].startsWith("juil") ? 6 : m[3].startsWith("juin") ? 5 : MOIS_ABBR[m[3].slice(0, 3)];
    return { jour: m[1], num: parseInt(m[2], 10), mois: mois == null ? null : mois };
  }

  function dateDepuisLabel(p) {
    if (!p || p.mois == null) return null;
    const now = startOfDay(new Date());
    let best = null;
    for (const y of [now.getFullYear() - 1, now.getFullYear(), now.getFullYear() + 1]) {
      const d = new Date(y, p.mois, p.num);
      if (d.getMonth() !== p.mois) continue;
      if (!best || Math.abs(d - now) < Math.abs(best - now)) best = d;
    }
    return best;
  }

  function analyserMatchsSheet(grille) {
    const rows = grille.rows.map((r) => r.map((c) => c.v));
    const col0 = (i) => (rows[i] && rows[i][0]) || "";
    const blocs = [];
    for (let i = 0; i < rows.length; i++) {
      const p = parseLabelJour(col0(i));
      if (!p) continue;
      const idxEnt = norm(col0(i + 1)) === "terrains" ? i + 1 : norm(col0(i + 2)) === "terrains" ? i + 2 : -1;
      if (idxEnt < 0) continue;
      let c1 = 0;
      rows[idxEnt].forEach((v, c) => { if (v) c1 = c; });
      let r1 = idxEnt;
      while (r1 + 1 < rows.length && col0(r1 + 1)) r1++;
      let vide = true;
      for (let r = idxEnt + 1; r <= r1; r++) for (let c = 1; c <= c1; c++) if (rows[r][c]) vide = false;
      blocs.push({ label: col0(i), p, date: dateDepuisLabel(p), idxEnt, r1, c1, vide });
      i = r1;
    }
    if (!blocs.length) throw new Error("Planning des matchs non reconnu : aucun bloc « Samedi 12 septembre / TERRAINS / 10H… » trouvé.");
    return { grille, groupes: regrouper(blocs) };
  }

  async function chargerMatchs() {
    if (modeMatchs === "demo") return analyserAgenda(evenementsDemo());
    if (modeMatchs === "agenda") return analyserAgenda(await chargerAgenda());
    return analyserMatchsSheet(await lireFeuille(matchsSheetId, cfg.MATCHS_RANGE, "Le planning des matchs n'est pas accessible"));
  }

  /* ----- affichage des matchs ----- */
  let vuePassee = window.location && window.location.hash === "#passes";

  function rendreMatchs(liste, q) {
    const { grille, groupes } = donnees.matchs;
    const aujourdhui = startOfDay(new Date());
    const passe = (g) => !!g.fin && g.fin < aujourdhui;
    const choisis = groupes.filter((g) => (vuePassee ? passe(g) : !passe(g)));
    if (vuePassee) choisis.reverse();
    let rendus = 0;
    if (vuePassee && choisis.length) liste.appendChild(el("p", "aide-tableau", "Matchs des " + (cfg.JOURS_PASSES || 0) + " derniers jours, du plus récent au plus ancien."));
    for (const g of choisis) {
      const sec = el("section", "groupe weekend");
      let contenu = 0;
      if (g.blocs.length > 1) sec.appendChild(el("h2", null, g.titre));
      for (const b of g.blocs) {
        if (b.donnees) {
          const c = carteMatchs(b, q);
          if (c) { sec.appendChild(c); contenu++; }
          continue;
        }
        const barre = el("div", "barre-jour", b.label);
        let corps;
        if (q) {
          const t = tableDepuis(grille, { r0: b.idxEnt, r1: b.r1, c0: 0, c1: b.c1, debutDonnees: b.idxEnt + 1, q });
          if (!t.trouves) continue;
          corps = t.wrap;
        } else if (b.vide) {
          corps = el("p", "jour-vide", "Aucun match à domicile prévu.");
        } else {
          corps = tableDepuis(grille, { r0: b.idxEnt, r1: b.r1, c0: 0, c1: b.c1, debutDonnees: b.idxEnt + 1 }).wrap;
        }
        const bloc = el("div", "bloc");
        bloc.append(barre, corps);
        sec.appendChild(bloc);
        contenu++;
      }
      if (contenu) { liste.appendChild(sec); rendus++; }
    }
    if (!rendus) return q ? "Aucun match ne correspond à votre recherche."
      : vuePassee ? "Aucun match passé sur les " + (cfg.JOURS_PASSES || 0) + " derniers jours."
      : "Aucun match à domicile à venir pour le moment.";
    return null;
  }

  /* =====================  ENTRAÎNEMENTS (Sheet : lieux × jours/créneaux)  ===================== */
  function analyserEntrainements(grille) {
    const rows = grille.rows.map((r) => r.map((c) => c.v));
    const idxJours = rows.findIndex((r) => r.some((c) => JOURS.includes(norm(c))));
    if (idxJours < 0) throw new Error("Tableau des entraînements non reconnu : aucune ligne « Lundi, Mardi… » trouvée.");
    const ligneJours = rows[idxJours], ligneCreneaux = rows[idxJours + 1] || [];
    const largeur = Math.max(...rows.map((r) => r.length));
    const colonnes = [];
    let jourCourant = "", creneauCourant = "";
    for (let c = 1; c < largeur; c++) {
      if (JOURS.includes(norm(ligneJours[c]))) jourCourant = norm(ligneJours[c]);
      if (/\d/.test(ligneCreneaux[c] || "")) creneauCourant = ligneCreneaux[c];
      colonnes[c] = { jour: jourCourant, creneau: creneauCourant };
    }
    const entrees = [];
    rows.slice(idxJours + 2).forEach((r) => {
      const lieu = r[0];
      if (!lieu) return;
      for (let c = 1; c < r.length; c++) {
        const texte = r[c];
        if (!texte || texte === "," || !colonnes[c] || !colonnes[c].jour || !colonnes[c].creneau) continue;
        entrees.push({ jour: colonnes[c].jour, creneau: colonnes[c].creneau, colonne: c, lieu, texte });
      }
    });
    return { grille, idxJours, entrees };
  }

  // Construit la grille (même modèle que le Sheet) depuis js/entrainements.js
  function grilleDepuisEntrainements(d) {
    const PEACH = "rgb(249,203,156)", ORANGE = "rgb(241,194,50)";
    const colonnes = []; // { jour, creneau }
    d.jours.forEach((j) => j.creneaux.forEach((c) => colonnes.push({ jour: j.nom, creneau: c })));
    const W = colonnes.length + 1;
    const ligne = () => Array.from({ length: W }, () => cell(""));
    const merges = [];
    const rows = [];

    const titre = ligne(); titre[0] = cell(d.saison || "", { al: "CENTER", role: "titre" });
    rows.push(titre);
    merges.push({ r: 0, c: 0, rs: 1, cs: W });

    const jours = ligne();
    let c0 = 1;
    for (const j of d.jours) {
      for (let k = 0; k < j.creneaux.length; k++) jours[c0 + k] = cell(k === 0 ? j.nom : "", { bg: PEACH, b: true, al: "CENTER", role: "jour" });
      if (j.creneaux.length > 1) merges.push({ r: 1, c: c0, rs: 1, cs: j.creneaux.length });
      c0 += j.creneaux.length;
    }
    jours[0] = cell("");
    rows.push(jours);

    const creneaux = ligne();
    colonnes.forEach((c, i) => { creneaux[i + 1] = cell(c.creneau, { bg: PEACH, b: true, al: "CENTER", role: "creneau" }); });
    rows.push(creneaux);

    d.lieux.forEach((lieu) => {
      const r = ligne();
      r[0] = cell(lieu.nom, { bg: PEACH, b: true, i: true, role: "lieu" });
      for (const [cle, val] of Object.entries(lieu.cases || {})) {
        const idx = colonnes.findIndex((c) => c.jour + " " + c.creneau === cle);
        if (idx < 0) { console.warn("Entraînements : colonne inconnue « " + cle + " » (" + lieu.nom + ")"); continue; }
        const o = typeof val === "string" ? { texte: val } : val;
        const span = Math.max(1, Math.min(o.colonnes || 1, colonnes.length - idx));
        for (let k = 0; k < span; k++) r[idx + 1 + k] = cell(k === 0 ? o.texte : "", o.note ? { bg: ORANGE, role: "note" } : {});
        if (span > 1) merges.push({ r: rows.length, c: idx + 1, rs: 1, cs: span });
      }
      rows.push(r);
    });
    const debuts = [];
    { let c = 1; for (const j of d.jours) { debuts.push(c); c += j.creneaux.length; } }
    rows.slice(1).forEach((r) => debuts.forEach((c) => { r[c].nj = true; }));
    return { rows, merges };
  }

  async function chargerEntrainements() {
    if (cfg.API_KEY && cfg.SHEET_ID) return analyserEntrainements(await lireFeuille(cfg.SHEET_ID, cfg.SHEET_RANGE, "Le tableau des entraînements n'est pas accessible"));
    if (window.ENTRAINEMENTS) return analyserEntrainements(grilleDepuisEntrainements(window.ENTRAINEMENTS));
    throw new Error("Aucun créneau d'entraînement configuré (voir js/entrainements.js).");
  }

  function rendreTableau(liste, q) {
    const { grille, idxJours } = donnees.entrainements;
    let r1 = 0, c1 = 0;
    grille.rows.forEach((r, ri) => r.forEach((c, ci) => { if (c.v || c.bg) { r1 = Math.max(r1, ri); c1 = Math.max(c1, ci); } }));
    const t = tableDepuis(grille, { r0: 0, r1, c0: 0, c1, debutDonnees: idxJours + 2, q, collante: true, moderne: true });
    if (q && !t.trouves) return "Aucun entraînement ne correspond à votre recherche.";
    liste.appendChild(t.wrap);
    liste.appendChild(el("p", "aide-tableau", "Astuce : faites défiler le tableau vers la droite pour voir tous les jours."));
    return null;
  }

  function rendreParJour(liste, q) {
    const ent = q ? donnees.entrainements.entrees.filter((e) => norm(e.jour + " " + e.lieu + " " + e.texte + " " + e.creneau).includes(q)) : donnees.entrainements.entrees;
    if (!ent.length) return q ? "Aucun entraînement ne correspond à votre recherche." : "Aucun créneau d'entraînement renseigné.";
    const aujourdhui = JOURS[(new Date().getDay() + 6) % 7];
    for (const jour of JOURS) {
      const duJour = ent.filter((e) => e.jour === jour);
      if (!duJour.length) continue;
      const sec = el("section", "groupe" + (jour === aujourdhui ? " aujourdhui" : ""));
      sec.appendChild(el("h2", null, cap(jour) + (jour === aujourdhui ? " — aujourd'hui" : "")));
      const parCreneau = new Map();
      for (const e of duJour.sort((a, b) => a.colonne - b.colonne)) {
        if (!parCreneau.has(e.creneau)) parCreneau.set(e.creneau, []);
        parCreneau.get(e.creneau).push(e);
      }
      for (const [creneau, lignes] of parCreneau) {
        const [debut, fin] = creneau.split(/\s*[-–]\s*/);
        const c = el("div", "match");
        const qd = el("div", "quand");
        qd.appendChild(el("span", "heure", (debut || creneau).replace(/\s/g, "")));
        if (fin) qd.appendChild(el("span", "num", "→ " + fin.replace(/\s/g, "")));
        const infos = el("div", "infos");
        for (const l of lignes) {
          const ligne = el("div", "ligne");
          ligne.appendChild(el("span", "equipe", l.texte));
          ligne.appendChild(el("span", "lieu-inline", " · " + l.lieu));
          infos.appendChild(ligne);
        }
        c.append(qd, infos);
        sec.appendChild(c);
      }
      liste.appendChild(sec);
    }
    return null;
  }

  /* =====================  ONGLETS / AFFICHAGE  ===================== */
  const donnees = { matchs: null, entrainements: null };
  const erreurs = { matchs: null, entrainements: null };
  let onglet = "matchs";
  let vue = (window.innerWidth || 1024) >= 760 ? "tableau" : "jour";

  function afficher() {
    const liste = $("liste"), etat = $("etat");
    liste.replaceChildren();
    if (erreurs[onglet]) { etat.hidden = false; etat.className = "etat erreur"; etat.textContent = erreurs[onglet]; return; }
    const q = norm($("recherche").value.trim());
    let message;
    if (onglet === "matchs") message = rendreMatchs(liste, q);
    else message = vue === "tableau" ? rendreTableau(liste, q) : rendreParJour(liste, q);
    etat.className = "etat";
    etat.hidden = !message;
    if (message) etat.textContent = message;
  }

  function majBoutons() {
    $("tab-matchs").classList.toggle("actif", onglet === "matchs");
    $("tab-entrainements").classList.toggle("actif", onglet === "entrainements");
    $("btn-agenda").style.display = onglet === "matchs" ? "" : "none";
    $("btn-passes").style.display = onglet === "matchs" ? "" : "none";
    $("btn-passes").classList.toggle("actif", vuePassee);
    $("btn-passes").textContent = vuePassee ? "← Matchs à venir" : "Matchs passés";
    $("bandeau-demo").hidden = !(onglet === "matchs" && modeMatchs === "demo");
    document.querySelector(".conteneur").classList.toggle("large", onglet === "entrainements" && vue === "tableau");
    $("vue-ent").style.display = onglet === "entrainements" ? "" : "none";
    $("vue-tableau").classList.toggle("actif", vue === "tableau");
    $("vue-jour").classList.toggle("actif", vue === "jour");
    $("recherche").placeholder = onglet === "matchs"
      ? "Rechercher une équipe, un terrain…"
      : "Rechercher une équipe (ex : U13F)…";
  }

  function choisir(nom) { onglet = nom; majBoutons(); afficher(); }

  $("tab-matchs").addEventListener("click", () => choisir("matchs"));
  $("tab-entrainements").addEventListener("click", () => choisir("entrainements"));
  $("vue-tableau").addEventListener("click", () => { vue = "tableau"; majBoutons(); afficher(); });
  $("vue-jour").addEventListener("click", () => { vue = "jour"; majBoutons(); afficher(); });
  $("recherche").addEventListener("input", afficher);

  (async function init() {
    const [m, e] = await Promise.allSettled([chargerMatchs(), chargerEntrainements()]);
    if (m.status === "fulfilled") donnees.matchs = m.value; else erreurs.matchs = m.reason.message || "Impossible de charger les matchs.";
    if (e.status === "fulfilled") donnees.entrainements = e.value; else erreurs.entrainements = e.reason.message || "Impossible de charger les entraînements.";
    choisir(window.location && window.location.hash === "#entrainements" ? "entrainements" : "matchs");
  })();
})();
