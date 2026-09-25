// Créneaux d'entraînement RCFC (fixes). Pour modifier le tableau, éditer ce fichier.
//
// - "jours" : les colonnes (chaque jour et ses créneaux, de gauche à droite)
// - "lieux" : les lignes ; "cases" = "Jour créneau": "équipe(s)"
//     Pour une case plus large ou colorée : "Jour créneau": { texte: "…", colonnes: 2, note: true }
//       colonnes : nombre de créneaux couverts (fusion) ; note : true = fond orange
window.ENTRAINEMENTS = {
  saison: "2026-2027",
  jours: [
    { nom: "Lundi", creneaux: ["17h-20h", "20h-22h"] },
    { nom: "Mardi", creneaux: ["18h30-20h", "20h-22h"] },
    { nom: "Mercredi", creneaux: ["15h-16h15", "17h-20h", "20h-22h"] },
    { nom: "Jeudi", creneaux: ["17h-20h", "20h-22h"] },
    { nom: "Vendredi", creneaux: ["17h-20h", "20h-22h"] },
    { nom: "Samedi", creneaux: ["10h30-11h30"] },
  ],
  lieux: [
    {
      nom: "Auzeville",
      cases: {
        "Lundi 17h-20h": "U11G",
        "Lundi 20h-22h": "FSGT",
        "Mardi 18h30-20h": "U13F heure hiver/U13G",
        "Mercredi 17h-20h": { texte: "U11G + u11f en heure hiver ?", colonnes: 2 },
        "Jeudi 17h-20h": "U15F",
      },
    },
    { nom: "Honneur", cases: { "Mercredi 17h-20h": "U6-U8" } },
    {
      nom: "Deviation",
      cases: {
        "Mardi 18h30-20h": "U14G / U18F",
        "Mardi 20h-22h": "Senior G",
        "Mercredi 15h-16h15": "Foot adapté",
        "Mercredi 17h-20h": "U7-U9",
        "Mercredi 20h-22h": "Senior F",
        "Jeudi 17h-20h": "U18F/U14G",
        "Vendredi 20h-22h": "senior F",
      },
    },
    {
      nom: "Karben",
      cases: {
        "Lundi 17h-20h": "U12G/U10G",
        "Lundi 20h-22h": "FSGT Police",
        "Mardi 18h30-20h": "U15F",
        "Mardi 20h-22h": "FSGT CNES",
        "Mercredi 17h-20h": "U10G",
        "Mercredi 20h-22h": "Senior G 2",
        "Jeudi 17h-20h": "U12/U13G",
        "Jeudi 20h-22h": "Senior G",
        "Vendredi 17h-20h": "U13F",
        "Vendredi 20h-22h": "Senior G 2",
      },
    },
    {
      nom: "Vigoulet-Auzil",
      cases: {
        "Mardi 18h30-20h": "U13F",
        "Mercredi 17h-20h": "U9F/U11F",
        "Samedi 10h30-11h30": "mini-Foot",
      },
    },
    { nom: "Brique rouge", cases: { "Vendredi 17h-20h": { texte: "Futsal sourd", colonnes: 2 } } },
    {
      nom: "I NP",
      cases: {
        "Mercredi 15h-16h15": { texte: "14h - 17 h ponctuellement", colonnes: 2, note: true },
        "Vendredi 17h-20h": "U15G",
        // TEXTE À COMPLÉTER : coupé sur la capture d'origine ("…enior G / Senior…")
        "Vendredi 20h-22h": "Senior G / Senior",
        "Samedi 10h30-11h30": { texte: "Sur demande une semaine à l'avance", note: true },
      },
    },
    { nom: "Gymnase Auzeville", cases: {} },
    { nom: "Pompertuzat ( U15G)", cases: { "Mardi 18h30-20h": "U15G" } },
    { nom: "Labège (U15G)", cases: { "Mardi 18h30-20h": "U15G" } },
  ],
};
