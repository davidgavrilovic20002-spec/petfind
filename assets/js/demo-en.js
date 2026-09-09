/* ============================================================
   PetFind — English for the clinical demonstration

   clinical.js keeps its French strings as STATE, not only as
   text: the schedule filters on view === 'Semaine' and status
   === 'Annulé'. Translating them in place would break the demo.
   So the French string stays the key, and localise() applies this
   table to the rendered text once, after each render. Doing it in
   the DOM rather than at each call site also reaches the headings
   and buttons that were never routed through esc(), and it can
   pin an <option>'s value to the French key before changing its
   label -- an option with no value attribute submits its own
   text, which would otherwise have broken the demo's filters.

   Anything absent falls through unchanged — which is what should
   happen to "Luna", "Dr Martin" and the sample owners' names.

   DELIBERATELY NOT TRANSLATED: the "Cadre français" module. It
   describes French veterinary and data-protection obligations
   and cites the Ordre national des vétérinaires, Service Public
   and the CNIL. Rendering that duty in English would state a
   French legal position in a language it was not written in, and
   a mistranslation there misleads rather than helps.
   ============================================================ */
(function (global) {
  'use strict';
  global.PFDemoEN = {
    /* modules */
    'Accueil & agenda': 'Reception & schedule',
    'Client & admission': 'Client & intake',
    'Consultation SOAP': 'SOAP consultation',
    'Spécialités': 'Specialties',
    'Laboratoire & imagerie': 'Laboratory & imaging',
    'Une vue claire de la journée, de l’arrivée à la sortie.': 'A clear view of the day, from arrival to discharge.',
    'Des fiches ciblées pour approfondir l’examen.': 'Focused sheets for a deeper examination.',

    /* schedule */
    'Jour': 'Day', 'Semaine': 'Week', 'Salles': 'Rooms', 'Praticiens': 'Practitioners',
    'Bloc opératoire': 'Operating theatre', 'Bloc': 'Theatre',
    'Salle': 'Room', 'Salle 1': 'Room 1', 'Salle 2': 'Room 2', 'Salle 3': 'Room 3',
    'Praticien': 'Practitioner', 'Prestation': 'Service', 'Statut': 'Status',
    'Date': 'Date', 'Heure': 'Time', 'Durée (min)': 'Duration (min)', 'Patient': 'Patient',
    'Planifié': 'Scheduled', 'Arrivé / admis': 'Arrived / admitted',
    'En consultation': 'In consultation', 'En consultation 1': 'Exam room 1',
    'En consultation 2': 'Exam room 2', 'En consultation 3': 'Exam room 3',
    'Au bloc': 'In theatre', 'Hospitalisé': 'Hospitalised',
    'Prêt pour la sortie': 'Ready for discharge', 'Annulé': 'Cancelled', 'Absent': 'No-show',
    'Consultation': 'Consultation', 'Vaccination': 'Vaccination', 'Chirurgie': 'Surgery',
    'Urgence': 'Emergency', 'Toilettage': 'Grooming', 'Téléconsultation': 'Teleconsultation',
    'Nouveau rendez-vous fictif': 'New sample appointment',
    'Statut mis à jour dans cette démonstration.': 'Status updated in this demonstration.',
    'Ce créneau chevauche un rendez-vous de cette salle ou de ce praticien.':
      'That slot overlaps an appointment for this room or practitioner.',
    'Le rendez-vous doit se terminer avant minuit.': 'The appointment must end before midnight.',
    'Aucun rendez-vous. Ajoutez une réservation de démonstration.':
      'Nothing booked. Add a sample appointment.',

    /* client & intake */
    'Client & foyer': 'Client & household', 'Nom du client': 'Client name',
    'Nom': 'Name', 'Adresse': 'Address', 'E-mail': 'Email',
    'Téléphone principal': 'Main phone', 'Autre téléphone': 'Other phone',
    'Autre propriétaire': 'Other owner', 'Autre propriétaire / compte lié': 'Other owner / linked account',
    'Contact principal': 'Primary contact', 'Compte de facturation': 'Billing account',
    'SIRET exploitation (si pertinent)': 'Farm SIRET (if relevant)',
    'À jour': 'Good standing', 'Crédit suspendu': 'Credit hold', 'Échéancier': 'Payment plan',
    'VIP': 'VIP', 'Créance impayée': 'Bad debt',
    'Identification': 'Identification', 'Identification du patient': 'Patient identification',
    'Espèce': 'Species', 'Espèce / race': 'Species / breed', 'Race': 'Breed',
    'Chien': 'Dog', 'Chat': 'Cat', 'NAC': 'Exotic', 'NAC · Lapin': 'Exotic · rabbit',
    'Équin': 'Equine', 'Bovin': 'Bovine', 'Autre': 'Other', 'Européen': 'European shorthair',
    'Chat · Européen': 'Cat · European shorthair', 'Chat · Siamois': 'Cat · Siamese',
    'Chien · Beagle': 'Dog · Beagle', 'Chien · Labrador': 'Dog · Labrador',
    'Robe & signes particuliers': 'Coat & distinguishing marks', 'Tigrée': 'Tabby',
    'Date de naissance': 'Date of birth', 'Sexe': 'Sex',
    'Mâle': 'Male', 'Femelle': 'Female', 'Inconnu': 'Unknown', 'Indéterminé': 'Undetermined',
    'Statut reproducteur': 'Neuter status', 'Entier / entière': 'Entire', 'Stérilisé(e)': 'Neutered',
    'Puce électronique (15 chiffres)': 'Microchip (15 digits)', 'Tatouage': 'Tattoo',
    'Passeport UE': 'EU passport', 'Code externe (si disponible)': 'External code (if available)',
    'Poids (kg)': 'Weight (kg)', 'Poids attendu : 0,1 à 120 kg': 'Expected weight: 0.1 to 120 kg',
    'Score corporel (BCS 1–9)': 'Body condition score (BCS 1–9)',
    'Évolution du poids': 'Weight trend',
    'Alertes & triage': 'Alerts & triage', 'Niveau de triage': 'Triage level',
    'Rouge': 'Red', 'Orange': 'Orange', 'Jaune': 'Yellow',
    'Vert — Standard': 'Green — standard', 'Jaune — Urgent': 'Yellow — urgent',
    'Orange — Très urgent': 'Orange — very urgent',
    'Rouge — Réanimation / trauma': 'Red — resuscitation / trauma',
    'Non évalué': 'Not assessed', 'Non évaluée': 'Not assessed',
    'Aucune alerte déclarée': 'No alert recorded', 'Risque signalé': 'Flagged risk',
    'Comportement': 'Behaviour', 'Muselière requise': 'Muzzle required',
    'Stress élevé': 'High stress', 'Risque anesthésique': 'Anaesthetic risk',
    'Allergies médicamenteuses': 'Drug allergies', 'Allergies : ': 'Allergies: ',
    'Diabète': 'Diabetes', 'Maladie rénale chronique': 'Chronic kidney disease',
    'Surveillance rage': 'Rabies watch', 'Situation médicale': 'Medical situation',
    'Problème chronique': 'Chronic problem',

    /* SOAP */
    'S · Anamnèse': 'S · History', 'O · Objectif': 'O · Objective',
    'O · Constantes & examen': 'O · Vitals & examination',
    'A · Évaluation': 'A · Assessment', 'P · Plan': 'P · Plan', 'P · Plan de soins': 'P · Care plan',
    'Motif de consultation': 'Presenting complaint', 'Histoire de la maladie': 'History of the illness',
    'Début des symptômes': 'Onset of signs', 'Évolution': 'Progression',
    'Amélioration': 'Improving', 'Stable': 'Stable', 'Aggravation': 'Worsening',
    'Non précisée': 'Not stated', 'Alimentation, environnement & mode de vie': 'Diet, environment & lifestyle',
    'Température (°C)': 'Temperature (°C)', 'Température : ': 'Temperature: ',
    'Fréquence cardiaque (bpm)': 'Heart rate (bpm)', 'FC : ': 'HR: ', 'FR : ': 'RR: ',
    'Qualité du pouls': 'Pulse quality', 'Pouls : ': 'Pulse: ',
    'Normal': 'Normal', 'Faible': 'Weak', 'Bondissant': 'Bounding', 'Irrégulier': 'Irregular',
    'TRC (secondes)': 'CRT (seconds)', 'TRC : ': 'CRT: ',
    'Muqueuses': 'Mucous membranes', 'Muqueuses : ': 'Mucous membranes: ',
    'Roses': 'Pink', 'Pâles': 'Pale', 'Ictériques': 'Icteric',
    'Congestionnées': 'Congested', 'Cyanosées': 'Cyanotic',
    'Aspect général & état mental': 'General appearance & mentation',
    'Peau & pelage': 'Skin & coat', 'Yeux, oreilles, nez, gorge': 'Eyes, ears, nose, throat',
    'Cavité buccale & dents': 'Oral cavity & teeth', 'Cardiovasculaire': 'Cardiovascular',
    'Respiratoire': 'Respiratory', 'Abdomen & digestif': 'Abdomen & digestive',
    'Urogénital': 'Urogenital', 'Locomoteur & démarche': 'Musculoskeletal & gait',
    'Neurologique': 'Neurological', 'Ganglions lymphatiques': 'Lymph nodes',
    'Non examiné': 'Not examined', 'Non examinée': 'Not examined', 'Non examinées': 'Not examined',
    'Anormal': 'Abnormal', 'Constat': 'Finding', 'Observation': 'Observation',
    'Justification & diagnostics différentiels': 'Rationale & differential diagnoses',
    'Différentiel': 'Differential', 'Présomptif': 'Presumptive', 'Confirmé': 'Confirmed',
    'Souffle cardiaque (1–6)': 'Heart murmur (1–6)',
    'Examens complémentaires & prise en charge': 'Further tests & management',
    'Conseils au propriétaire & suivi': 'Owner advice & follow-up',
    'Date de contrôle proposée': 'Proposed review date', 'Contrôle proposé : ': 'Review proposed: ',
    'Date à préciser': 'Date to confirm', 'À préciser': 'To confirm',
    'Dans l’intervalle': 'In the meantime', 'Début : ': 'Onset: ',
    'Validation clinique & plan de surveillance': 'Clinical validation & monitoring plan',
    'Documents de soins': 'Care documents',

    /* specialties */
    'Odontologie · carte Triadan': 'Dentistry · Triadan chart',
    'Maxillaire droit': 'Right maxilla', 'Maxillaire gauche': 'Left maxilla',
    'Mandibule droite': 'Right mandible', 'Mandibule gauche': 'Left mandible',
    'Saine': 'Healthy', 'Absente': 'Missing', 'Dent absente': 'Missing tooth',
    'Fracture': 'Fracture', 'Mobilité dentaire': 'Tooth mobility',
    'Poche parodontale (mm)': 'Periodontal pocket (mm)',
    'Lésion : localisation & description': 'Lesion: location & description',
    'Extraction envisagée': 'Extraction considered', 'Extraction réalisée': 'Extraction performed',
    'Observation de la dent ': 'Observation for tooth ',
    'Ophtalmologie': 'Ophthalmology', 'Droit (OD)': 'Right (OD)', 'Gauche (OG)': 'Left (OS)',
    'PIO (mmHg)': 'IOP (mmHg)', 'Fluorescéine': 'Fluorescein',
    'Positive': 'Positive', 'Négative': 'Negative', 'Non réalisée': 'Not performed',
    'Présente': 'Present',
    'Oncologie · préparation du protocole': 'Oncology · protocol preparation',
    'Surface corporelle validée (m²)': 'Verified body surface area (m²)',
    'Protocole de référence': 'Reference protocol',
    'Angle de Cobb': 'Cobb angle', 'Angle TPLO': 'TPLO angle',
    'Distance en mm': 'Distance in mm', 'Pixel': 'Pixel',

    /* laboratory */
    'Laboratoire de référence': 'Reference laboratory',
    'Connexions de laboratoire': 'Laboratory connections',
    'Hématocrite': 'Haematocrit', 'Créatinine': 'Creatinine', 'Urée': 'Urea',
    'Glucose': 'Glucose', 'Biochimie': 'Biochemistry',
    'Sources officielles': 'Official sources',
    'Ce qui fonctionne aujourd’hui': 'What works today',
    'Points à valider avant utilisation réelle': 'To validate before real use',
    'Un cahier des charges, pas une certification': 'A specification, not a certification',
    'Non renseigné': 'Not recorded', ' conservée dans cet onglet.': ' kept in this tab.',
    ' ans · ': ' yrs · ', ' mois': ' months', ' bpm': ' bpm', ' s': ' s', ' °C': ' °C', ' m²': ' m²',
    'Rendez-vous affichés': 'Appointments shown',
    'Identité, alertes et premières observations au même endroit.': 'Identity, alerts and first observations in one place.',
    'Chat · Européen · Femelle stérilisée · 4 ans · Camille Exemple': 'Cat · European shorthair · Neutered female · 4 yrs · Camille Exemple',
    'Saisie de référence uniquement : aucune interrogation ni mise à jour des registres nationaux.':
      'Reference entry only: no national registry is queried or updated.',
    'Perte légère': 'Mild loss', 'Perte modérée': 'Moderate loss', 'Perte sévère': 'Severe loss',
    'Le niveau de triage est attribué par l’équipe clinique, sans diagnostic automatique.':
      'Triage level is assigned by the clinical team; nothing is diagnosed automatically.',
    'Luna · valeurs fictives · juin à septembre 2026': 'Luna · sample values · June to September 2026',
    'Août': 'Aug', 'Juil.': 'Jul', 'Juin': 'Jun', 'Sept.': 'Sep',
    'Un examen structuré, avec la décision clinique au vétérinaire.':
      'A structured examination, with the clinical decision left to the veterinarian.',
    'Visite préventive': 'Preventive visit', 'Gastro-entérite': 'Gastroenteritis',
    'Suggestions de texte uniquement. Les terminologies ICD-Vet / SNOMED CT ne sont pas connectées ; leur accès et leurs licences restent à valider.':
      'Text suggestions only. ICD-Vet / SNOMED CT terminologies are not connected; access and licensing remain to be settled.',
    'Préparer la note SOAP': 'Prepare the SOAP note',
    'Note SOAP · brouillon de démonstration': 'SOAP note · demonstration draft',
    'Non signé, non versé au dossier patient. À relire et valider par le vétérinaire.':
      'Unsigned and not filed to the patient record. To be reviewed and approved by the veterinarian.',
    'Dictée ambiante en français': 'Ambient dictation in French',
    'Non connectée': 'Not connected', 'Non connecté': 'Not connected',
    'La transcription et la structuration automatique nécessitent un service configuré, une politique de confidentialité et une validation humaine. Aucun microphone n’est activé ici.':
      'Automatic transcription and structuring need a configured service, a privacy policy and human review. No microphone is enabled here.',
    'Relecture vétérinaire': 'Veterinary review',
    'Fiches de spécialité indépendantes · exemples fictifs': 'Standalone specialty sheets · sample data',
    'Dentition permanente du chien. Sélectionnez une dent pour consigner une observation fictive.':
      'Permanent canine dentition. Select a tooth to record a sample observation.',
    'Carte 2D numérotée uniquement. Les dentitions du chat, des jeunes animaux et les vues 3D ne sont pas disponibles.':
      'Numbered 2D chart only. Feline and juvenile dentitions and 3D views are not available.',
    'Conserver l’observation de cette dent': 'Keep this tooth observation',
    'Estimation : chien 0,101 × poids(kg)⅔ ; chat 0,100 × poids(kg)⅔. À valider par le vétérinaire ; aucune dose n’est calculée.':
      'Estimate: dog 0.101 × weight(kg)⅔; cat 0.100 × weight(kg)⅔. To be verified by the veterinarian; no dose is calculated.',
    'Référence chien ↗': 'Dog reference ↗', 'Référence chat ↗': 'Cat reference ↗',
    'Consignez la surface corporelle validée par le vétérinaire et les étapes du protocole. Aucun calcul de chimiothérapie ni conseil de dose automatique.':
      'Record the body surface area the veterinarian verified and the protocol steps. No chemotherapy calculation and no automatic dose advice.',
    '2 · Bilan prétraitement': '2 · Pre-treatment workup',
    '4 · Administration supervisée': '4 · Supervised administration',
    'Suivre les résultats et préparer les connexions de la clinique.':
      'Follow results and prepare the clinic’s connections.',
    'Résultats de laboratoire': 'Laboratory results', 'Hématologie': 'Haematology',
    'Valeurs et intervalles illustratifs pour cette maquette : ne pas utiliser pour une interprétation clinique. Les intervalles réels dépendent de l’espèce, de l’âge, de la méthode et du laboratoire.':
      'Illustrative values and ranges for this mock-up: do not use for clinical interpretation. Real ranges depend on species, age, method and laboratory.',
    'Paramètre': 'Parameter', 'Résultat': 'Result', 'Repère': 'Reference',
    'Accès fournisseur et configuration requis.': 'Vendor access and configuration required.',
    'Import bidirectionnel, cytologie et PCR : non disponibles avant raccordement et validation de l’identification des patients et des unités.':
      'Two-way import, cytology and PCR: unavailable until connected and until patient identification and units are validated.',
    'Aucun serveur PACS connecté': 'No PACS server connected',
    'Radiographie · Échographie · Scanner · IRM · Endoscopie': 'Radiography · Ultrasound · CT · MRI · Endoscopy',
    'Le lecteur DICOM n’est pas encore installé. Aucun examen n’est chargé ou envoyé. La calibration et la validation du lecteur sont nécessaires avant toute mesure clinique.':
      'The DICOM viewer is not installed yet. No study is loaded or sent. Calibration and validation of the viewer are required before any clinical measurement.',
    'Fenêtrage / contraste · indisponible': 'Windowing / contrast · unavailable',
    'Les dossiers patients sécurisés existants restent accessibles depuis l’en-tête. Cette démonstration permet de tester le planning, le changement de statut, les fiches d’admission, la préparation de notes SOAP et les observations dentaires.':
      'The existing secure patient records stay reachable from the header. This demonstration lets you try the schedule, status changes, intake sheets, SOAP note preparation and dental observations.',
    'La synchronisation multi-utilisateur de ces nouveaux modules, les signatures, l’historique auditable, les connexions fournisseurs, la dictée IA, le lecteur DICOM, et les schémas ophtalmologiques restent à réaliser ou à valider avant usage clinique.':
      'Multi-user synchronisation of these new modules, signatures, auditable history, vendor connections, AI dictation, the DICOM viewer and the ophthalmic diagrams remain to be built or validated before clinical use.',
    'Aucun rendez-vous': 'No appointment',

    /* Strings with no accented character at all -- the ones an accent-based
       search misses, which is how "Planning de la clinique" survived. */
    'Planning de la clinique': 'Clinic schedule',
    '+ Rendez-vous': '+ Appointment',
    'En salle d’attente': 'In the waiting room',
    'Chirurgies': 'Surgeries',
    'Statut de ': 'Status of ',
    'Patient fictif': 'Sample patient',
    'Risque de morsure / agressif': 'Bite risk / aggressive',
    'Conserver le brouillon dans cet onglet': 'Keep the draft in this tab',
    '1 · Diagnostic et stadification': '1 · Diagnosis and staging',
    '3 · Validation du protocole': '3 · Protocol approval',
    'Gaz du sang': 'Blood gas',
    'Angle de Cobb · indisponible': 'Cobb angle · unavailable',
    'Distance en mm · indisponible': 'Distance in mm · unavailable',
    'Distinguer les obligations, les bonnes pratiques et les options.':
      'Separating obligations, good practice and options.',
    'Salle 4': 'Room 4', 'Salle d’attente': 'Waiting room',

    /* French framework. These descriptions are PetFind's own plain-language
       summaries of what a practice has to think about, not statute, so they
       translate. The link labels stay French: they name French institutions
       and lead to French pages, and renaming them would misrepresent where
       the reader is being sent. */
    'Cadre français': 'French framework',
    'Les vues d’agenda, la carte dentaire, le SOAP, l’IA et le PACS sont des choix de logiciel. Leur présence ne démontre pas à elle seule le respect du droit français. Les obligations dépendent aussi de l’activité, des espèces prises en charge et de l’organisation de la clinique.':
      'Schedule views, the dental chart, SOAP, AI and PACS are software choices. Their presence alone does not demonstrate compliance with French law. The obligations also depend on the activity, the species treated and how the practice is organised.',
    'Repères consultés le 9 septembre 2026': 'References consulted on 9 September 2026',
    'Prévoir la vérification des identifiants et les procédures I-CAD ou IFCE/SIRE adaptées à l’animal. Saisir un numéro dans PetFind ne remplace pas une démarche au registre.':
      'Plan for identifier checks and the I-CAD or IFCE/SIRE procedures appropriate to the animal. Typing a number into PetFind does not replace filing with the registry.',
    'Secret professionnel & accès': 'Professional confidentiality & access',
    'Définir les habilitations, protéger les échanges et vérifier qui peut consulter ou modifier chaque dossier.':
      'Define permissions, protect exchanges, and check who may read or change each record.',
    'Documenter les finalités, bases légales, destinataires, durées et modalités d’exercice des droits des clients et salariés.':
      'Document the purposes, legal bases, recipients, retention periods and how clients and staff exercise their rights.',
    'Conservation & traçabilité': 'Retention & traceability',
    'Fixer les durées selon chaque catégorie de document et son fondement ; prévoir journalisation, sauvegardes et restauration testée.':
      'Set a period for each category of document and its basis; plan logging, backups and a restore you have tested.',
    'Vérifier contrats, localisation, transferts éventuels et mesures de sécurité, notamment pour l’IA, les laboratoires et l’imagerie.':
      'Check contracts, data location, any transfers and the security measures — particularly for AI, laboratories and imaging.',
    'Faire valider les modèles d’ordonnance, consentements, comptes rendus et obligations propres aux animaux de rente ou aux médicaments concernés.':
      'Have prescription templates, consents, reports and the obligations specific to food-producing animals or particular medicines reviewed.',
    'Vérifier le cadre en vigueur et l’éligibilité des actes avant d’activer un service à distance. Un libellé dans l’agenda ne l’autorise pas.':
      'Check the rules in force and whether the procedure is eligible before switching on a remote service. A label in the schedule does not authorise it.',
    'Liste de préparation non exhaustive. Cocher une ligne ne certifie pas la conformité ; conservez les preuves et faites valider les choix par les responsables compétents.':
      'This preparation list is not exhaustive. Ticking a line does not certify compliance; keep the evidence and have the choices approved by the people responsible.',
    'Information & droits des personnes': 'Information & individuals’ rights',
    'Prestataires & sous-traitants': 'Providers & processors',
    'Documents de soins': 'Care documents',
    'Un cahier des charges, pas une certification': 'A specification, not a certification',
    'Ce qui fonctionne aujourd’hui': 'What works today',
    'À préciser': 'To confirm', 'Allergies : ': 'Allergies: ',
    'Toutes les prestations': 'All services'
  };
})(typeof window === 'undefined' ? globalThis : window);