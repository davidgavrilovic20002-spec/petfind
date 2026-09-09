/* ============================================================
   PetFind — English for the clinical forms

   operations-data.js holds its labels in French, because that is
   the language of the practice and of the regulatory terms in
   it. Translating that file in place would have meant touching
   the validator that reports errors by label, and its tests.

   So the French label stays the key and this is a lookup applied
   at render time. Anything absent falls through unchanged, which
   is the right failure: an untranslated French label is readable
   to the vet using the app, a blank one is not.

   Terms deliberately NOT translated, because they are the terms:
   SOAP, Triadan, BCS, MCS, ASA, AMM/RCP, SIRET, I-CAD, SIRE,
   Glasgow CMPS-SF, Feline Grimace Scale, Schirmer, and the drug
   and unit names.
   ============================================================ */
(function (global) {
  'use strict';
  global.PFClinicalEN = {
    /* forms */
    'Rendez-vous': 'Appointment',
    'Admission & client (archive)': 'Intake & client (archived)',
    'Consultation SOAP': 'SOAP consultation',
    'Spécialités': 'Specialties',
    'Préparation de prescription': 'Prescription draft',
    'Préopératoire & chirurgie': 'Pre-op & surgery',
    'Relevé anesthésique': 'Anaesthetic record',
    'Hospitalisation & soins': 'Hospitalisation & care',
    'Préparation de facturation': 'Billing draft',

    /* appointment */
    'Début': 'Start', 'Fin': 'End', 'Clinique': 'Clinic', 'Salle': 'Room',
    'Prestation': 'Service', 'Statut': 'Status', 'Notes': 'Notes',

    /* intake */
    'Client': 'Client', 'Adresse': 'Address', 'Téléphone': 'Phone', 'E-mail': 'Email',
    'SIRET exploitation': 'Farm SIRET',
    'Autre propriétaire / contact principal': 'Other owner / primary contact',
    'Situation de facturation': 'Billing status',
    'Espèce': 'Species', 'Race': 'Breed', 'Robe / particularités': 'Coat / markings',
    'Naissance': 'Date of birth', 'Sexe et stérilisation': 'Sex and neuter status',
    'Puce électronique': 'Microchip', 'Tatouage': 'Tattoo', 'Passeport UE': 'EU passport',
    'Référence I-CAD / SIRE': 'I-CAD / SIRE reference',
    'Alertes comportementales': 'Behavioural alerts',
    'Allergies médicamenteuses': 'Drug allergies',
    'Risques médicaux et anesthésiques': 'Medical and anaesthetic risks',
    'Poids (kg)': 'Weight (kg)', 'BCS (1–9)': 'BCS (1–9)', 'MCS': 'MCS', 'Triage': 'Triage',
    'Non évalué': 'Not assessed',
    'Vert — Standard': 'Green — standard',
    'Jaune — Urgent': 'Yellow — urgent',
    'Orange — Très urgent': 'Orange — very urgent',
    'Rouge — Réanimation / trauma': 'Red — resuscitation / trauma',

    /* SOAP */
    'Motif': 'Presenting complaint', 'Début des symptômes': 'Onset of signs',
    'Évolution': 'Progression', 'Non précisée': 'Not stated',
    'Amélioration': 'Improving', 'Stable': 'Stable', 'Aggravation': 'Worsening',
    'S · Anamnèse, alimentation et environnement': 'S · History, diet and environment',
    'Température (°C)': 'Temperature (°C)',
    'Fréquence cardiaque (bpm)': 'Heart rate (bpm)',
    'Qualité du pouls': 'Pulse quality',
    'Fréquence respiratoire (/min)': 'Respiratory rate (/min)',
    'TRC (s)': 'CRT (s)', 'Muqueuses': 'Mucous membranes',
    'O · Examen clinique': 'O · Clinical examination',
    'A · Évaluation / diagnostic': 'A · Assessment / diagnosis',
    'Statut diagnostique': 'Diagnostic status',
    'Différentiel': 'Differential', 'Présomptif': 'Presumptive',
    'Confirmé': 'Confirmed', 'Chronique': 'Chronic',
    'P · Plan de soins': 'P · Care plan',
    'Conseils et suivi': 'Advice and follow-up',

    /* specialties */
    'Dentaire : dent Triadan, lésion, poche (mm), extraction': 'Dental: Triadan tooth, lesion, pocket (mm), extraction',
    'Schirmer OD (mm/min)': 'Schirmer OD (mm/min)', 'Schirmer OG (mm/min)': 'Schirmer OS (mm/min)',
    'PIO OD (mmHg)': 'IOP OD (mmHg)', 'PIO OG (mmHg)': 'IOP OS (mmHg)',
    'Fluorescéine : OD / OG': 'Fluorescein: OD / OS',
    'Examen ophtalmologique': 'Ophthalmic examination',
    'Surface corporelle validée (m²)': 'Verified body surface area (m²)',
    'Protocole oncologique et surveillance': 'Oncology protocol and monitoring',

    /* prescription */
    'Médicament': 'Medication', 'Substance active': 'Active substance',
    'Référence AMM / RCP': 'AMM / SPC reference', 'Espèce cible': 'Target species',
    'Dose par administration (mg/kg)': 'Dose per administration (mg/kg)',
    'Concentration (mg/mL)': 'Concentration (mg/mL)',
    'Voie': 'Route', 'Orale': 'Oral', 'Topique': 'Topical',
    'Administrations par jour': 'Administrations per day',
    'Durée (jours)': 'Duration (days)',
    'Renouvellements proposés': 'Proposed repeats',
    'Échéance proposée — à vérifier': 'Proposed expiry — verify',
    'Numéro ordinal': 'Registration number',
    'Instructions au propriétaire': 'Instructions for the owner',
    'Temps d’attente / exclusion alimentaire si applicable': 'Withdrawal period / food exclusion if applicable',
    'Vérification réglementaire spécifique': 'Specific regulatory check',

    /* surgery */
    'Intervention prévue': 'Scheduled procedure', 'Intervention': 'Procedure',
    'Jeûne vérifié': 'Fasting verified', 'Non vérifié': 'Not verified',
    'Oui': 'Yes', 'Non': 'No',
    'Non / exception documentée': 'No / documented exception',
    'Bilan pré-anesthésique': 'Pre-anaesthetic workup', 'Revu': 'Reviewed',
    'Non réalisé — justification ci-dessous': 'Not performed — justification below',
    'Classe ASA': 'ASA class', 'Non évaluée': 'Not assessed',
    'Consentement chirurgical signé': 'Signed surgical consent',
    'Référence du consentement': 'Consent reference',
    'Protocole / observations / justification': 'Protocol / observations / justification',

    /* anaesthesia */
    'Heure du relevé': 'Time of reading',
    'PA systolique (mmHg)': 'Systolic BP (mmHg)',
    'PA diastolique (mmHg)': 'Diastolic BP (mmHg)',
    'PAM (mmHg)': 'MAP (mmHg)',
    'Agent': 'Agent', 'Non renseigné': 'Not recorded',
    'Concentration gaz (%)': 'Gas concentration (%)',
    'Débit O₂ (L/min)': 'O₂ flow (L/min)',
    'Bolus / médicament : quantité, unité, voie, heure': 'Bolus / drug: amount, unit, route, time',
    'Observations': 'Observations',

    /* ICU */
    'Date et heure': 'Date and time',
    'Soin ou médicament programmé': 'Scheduled care or medication',
    'Échéance prévue': 'Due at', 'Réalisation': 'Completion',
    'À faire': 'To do', 'Réalisé': 'Done', 'Non réalisé': 'Not done', 'Reporté': 'Deferred',
    'Heure de réalisation': 'Time completed', 'Soluté': 'Fluid',
    'Débit prescrit (mL/kg/h)': 'Prescribed rate (mL/kg/h)',
    'Volume total perfusé (mL)': 'Total volume infused (mL)',
    'Diurèse (mL/kg/h)': 'Urine output (mL/kg/h)',
    'Score fécal (1–7)': 'Faecal score (1–7)',
    'Échelle de douleur': 'Pain scale',
    'Score et dénominateur': 'Score and denominator',
    'Surveillance / CRI validée / observations': 'Monitoring / verified CRI / observations',

    /* billing */
    'Acte / produit': 'Procedure / product', 'Quantité': 'Quantity',
    'Prix unitaire HT (€)': 'Unit price excl. VAT (€)', 'TVA (%)': 'VAT (%)',
    'Destinataire de facturation': 'Bill to',
    'Assureur / référence du dossier': 'Insurer / claim reference'
  };

  /* The explanatory note under each form. Keyed by the French text for the
     same reason as the labels. */
  global.PFClinicalNotesEN = {
    'Les créneaux sont contrôlés sur le serveur. Les horaires utilisent le fuseau de cet appareil. Annulez un rendez-vous pour libérer son créneau.':
      'Slots are checked on the server. Times use this device’s time zone. Cancel an appointment to free its slot.',
    'Fiche de consultation non signée. Le diagnostic et le plan sont saisis et validés par le vétérinaire.':
      'Unsigned consultation sheet. The diagnosis and plan are entered and approved by the veterinarian.',
    'Observations structurées ; pas de carte 3D ni de protocole de chimiothérapie automatique.':
      'Structured observations; no 3D chart and no automatic chemotherapy protocol.',
    'Brouillon non signé : ne pas remettre comme ordonnance. Calcul arithmétique seulement, sans recommandation de dose. Vérifiez le RCP, l’espèce, la voie et les règles propres au médicament.':
      'Unsigned draft: do not hand over as a prescription. Arithmetic only, with no dose recommendation. Check the SPC, the species, the route and the rules specific to the drug.',
    'Consignez la référence du consentement signé ; ce formulaire ne recueille pas de signature électronique.':
      'Record the reference of the signed consent; this form does not capture an electronic signature.',
    'Une fiche horodatée par relevé. Pas de connexion aux moniteurs ni d’alarme automatique.':
      'One timestamped entry per reading. No monitor connection and no automatic alarm.',
    'Fiche de soins horodatée. Le calcul de débit ne commande aucune pompe et ne remplace pas une prescription validée.':
      'Timestamped care sheet. The rate calculation drives no pump and does not replace an approved prescription.',
    'Estimation à une ligne, pas une facture émise ni un encaissement. Le taux de TVA est choisi par l’utilisateur et doit être validé selon l’opération.':
      'A single-line estimate, not an issued invoice and not a payment. The VAT rate is chosen by the user and must be verified for the transaction.'
  };
})(typeof window === 'undefined' ? globalThis : window);
