// Configuration du calendrier RCFC.
// Tant que API_KEY est vide, la page affiche des données de démonstration.
window.CALENDRIER_CONFIG = {
  // Clé d'API Google (Calendar API + Sheets API), à restreindre au domaine calendrier.rcfc.fr
  API_KEY: "AIzaSyAgH1_NPw2CLJ4RJGAxHPnzDb5GRCOoA4w",

  // MATCHS À DOMICILE : un Google Agenda PAR TERRAIN (un agenda = une ligne du tableau).
  // Pour chaque agenda : Paramètres et partage > "Intégrer l'agenda" > ID de l'agenda.
  // Chaque agenda doit être public (tous les détails des événements).
  // "nom" doit être identique à un nom de la liste TERRAINS ci-dessous.
  CALENDRIERS: [
    { nom: "HONNEUR", id: "c_33d0f0b25547184b3e2071f4fde424c4f70f38db93f7def7a32c489b15111c48@group.calendar.google.com" },    // RCFC Honneur-Ramonville
    { nom: "KARBEN", id: "c_e8fc42c3c88d492c5e9b69e47c192e6d4aaf9627c951c658a25b0c643d630d07@group.calendar.google.com" },     // RCFC Karben-Ramonville
    { nom: "DEVIATION", id: "c_f86c20785987e10ed7f9c1b7597d185d8530f1a9838b7c138dad7b051185bf07@group.calendar.google.com" },  // RCFC Déviation-Ramonville
    { nom: "VIGOULET", id: "c_feb519450157f165e3c461bc3cf8ea03b6ca89006eb66f52b65ed36be36309b2@group.calendar.google.com" },   // RCFC Vigoulet-Auzil
    { nom: "AUZEVILLE", id: "c_446894f6d834aaf10111d5c2c411ede0a448e15bd573e3e854083bff783c0ae6@group.calendar.google.com" },  // RCFC Auzeville-Tolosane
    { nom: "INP", id: "" },
  ],
  // OPTION : un seul agenda contenant tous les matchs (le terrain est alors lu dans le champ "Lieu")
  CALENDAR_ID: "",
  JOURS_A_VENIR: 180,
  JOURS_PASSES: 60,

  // Comment un événement est placé dans le tableau :
  //  - la LIGNE = le terrain (son agenda ; à défaut, un des mots clés du champ "Lieu")
  //  - la COLONNE = l'heure de début EXACTE de l'événement (une colonne par heure de match ce jour-là)
  //  - la CASE = le titre de l'événement
  TERRAINS: [
    { nom: "HONNEUR", mots: ["honneur"] },
    { nom: "KARBEN", mots: ["karben"] },
    { nom: "DEVIATION", mots: ["deviation", "déviation"] },
    { nom: "VIGOULET", mots: ["vigoulet"] },
    { nom: "AUZEVILLE", mots: ["auzeville"] },
    { nom: "INP", mots: ["inp", "i.n.p"] },
  ],
  TERRAINS_MASQUES_DIMANCHE: ["INP"],

  // ENTRAÎNEMENTS : Google Sheet (identifiant = partie de l'adresse entre /d/ et /edit)
  SHEET_ID: "",
  SHEET_RANGE: "Entraînements!A1:Z40",

  // OPTION : lire les matchs depuis un onglet du Sheet plutôt que depuis l'agenda
  // (laisser CALENDAR_ID vide dans ce cas). MATCHS_SHEET_ID vide = même Sheet que les entraînements.
  MATCHS_SHEET_ID: "",
  MATCHS_RANGE: "",

  TITRE: "Calendrier du club",
  SOUS_TITRE: "RCFC",
};
