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
        "Mardi 18h30-20h": "U13F heure d'hiver / U13G",
        "Mercredi 17h-20h": { texte: "U11G + U11F en heure d'hiver ?", colonnes: 2 },
        "Jeudi 17h-20h": "U15F",
      },
    },
    { nom: "Honneur", cases: { "Mercredi 17h-20h": "U6-U8" } },
    {
      nom: "Déviation",
      cases: {
        "Mardi 18h30-20h": "U14G / U18F",
        "Mardi 20h-22h": "Senior G",
        "Mercredi 15h-16h15": "Foot adapté",
        "Mercredi 17h-20h": "U7-U9",
        "Mercredi 20h-22h": "Senior F",
        "Jeudi 17h-20h": "U18F / U14G",
        "Vendredi 20h-22h": "Senior F",
      },
    },
    {
      nom: "Karben",
      cases: {
        "Lundi 17h-20h": "U12G / U10G",
        "Lundi 20h-22h": "FSGT Police",
        "Mardi 18h30-20h": "U15F",
        "Mardi 20h-22h": "FSGT CNES",
        "Mercredi 17h-20h": "U10G",
        "Mercredi 20h-22h": "Senior G 2",
        "Jeudi 17h-20h": "U12 / U13G",
        "Jeudi 20h-22h": "Senior G",
        "Vendredi 17h-20h": "U13F",
        "Vendredi 20h-22h": "Senior G 2",
      },
    },
    {
      nom: "Vigoulet-Auzil",
      cases: {
        "Mardi 18h30-20h": "U13F",
        "Mercredi 17h-20h": "U9F / U11F",
        "Samedi 10h30-11h30": "Mini-foot",
      },
    },
    { nom: "Brique rouge", cases: { "Vendredi 17h-20h": { texte: "Futsal sourd", colonnes: 2 } } },
    {
      nom: "INP",
      cases: {
        "Mercredi 15h-16h15": { texte: "14h-17h ponctuellement", colonnes: 2, note: true },
        "Vendredi 17h-20h": "U15G",
        "Vendredi 20h-22h": "Senior G / Senior F",
        "Samedi 10h30-11h30": { texte: "Sur demande une semaine à l'avance", note: true },
      },
    },
    { nom: "Gymnase Auzeville", cases: {} },
    { nom: "Pompertuzat (U15G)", cases: { "Mardi 18h30-20h": "U15G" } },
    { nom: "Labège (U15G)", cases: { "Mardi 18h30-20h": "U15G" } },
  ],
};
