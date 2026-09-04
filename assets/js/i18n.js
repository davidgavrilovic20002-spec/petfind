/* ============================================================
   PetFind — site-wide i18n (EN / FR)
   Text lives in the HTML as English (the default). Elements carry
   data-i18n keys; this swaps them to French and back, persists the
   choice, sets <html lang>, and injects the EN/FR switcher.
   Attributes: data-i18n (textContent), data-i18n-html (innerHTML),
   data-i18n-ph (placeholder), data-i18n-al (aria-label),
   data-i18n-content (content attr, for <meta>/<title> use data-i18n).
   ============================================================ */
(function (global) {
  'use strict';

  var FR = {
    /* ---- shared chrome ---- */
    'skip': 'Aller au contenu',
    'nav.how': 'Fonctionnement',
    'nav.features': 'Fonctionnalités',
    'nav.reviews': 'Avis',
    'nav.faq': 'FAQ',
    'nav.create': 'Créer une médaille',
    'nav.account': 'Mon compte',
    'nav.login': 'Se connecter',

    /* ---- account page ---- */
    'acc.eyebrow': 'Espace propriétaire',
    'acc.login.title': 'Connectez-vous',
    'acc.signup.title': 'Créer un compte',
    'acc.tab.login': 'Se connecter',
    'acc.tab.signup': 'Créer un compte',
    'acc.name': 'Votre nom',
    'acc.email': 'E-mail',
    'acc.email.ph': 'vous@exemple.fr',
    'acc.password': 'Mot de passe',
    'acc.password.ph': 'Au moins 6 caractères',
    'acc.submit.login': 'Se connecter',
    'acc.submit.signup': 'Créer mon compte',
    'acc.forgot': 'Mot de passe oublié ?',
    'acc.or': 'ou',
    'acc.google': 'Continuer avec Google',
    'acc.apple': 'Continuer avec Apple',
    'acc.dash.eyebrow': 'Mon compte',
    'acc.dash.title': 'Mes animaux',
    'acc.logout': 'Se déconnecter',
    'acc.newpet': '+ Créer une nouvelle médaille',
    'acc.empty': "Vous n'avez pas encore d'animal. Cliquez sur « Créer une nouvelle médaille » pour commencer.",
    'cookie.text': "Nous utilisons uniquement un stockage essentiel au fonctionnement du site. Avec votre accord, nous utiliserions aussi des statistiques respectueuses de la vie privée pour améliorer PetFind. Voir notre <a href=\"privacy.html\">politique de confidentialité</a>.",
    'cookie.decline': 'Refuser',
    'cookie.accept': 'Accepter',
    'foot.tagline': "Le système de soin connecté pour animaux qui commence par une médaille qui fonctionne toujours.",
    'foot.product': 'Produit',
    'foot.legal': 'Mentions légales',
    'foot.privacy': 'Confidentialité',
    'foot.privacy.long': 'Politique de confidentialité',
    'foot.terms': "Conditions d'utilisation",
    'foot.copy': '© %Y% PetFind. Conçu pour les animaux et celles et ceux qui les retrouvent.',
    'foot.region': 'France · Europe',
    'foot.home': 'Accueil',
    'foot.mini': '© %Y% PetFind · Confidentialité · Conditions',

    /* ---- home / landing ---- */
    'meta.title.home': 'PetFind — la médaille qui ramène les animaux à la maison',
    'meta.desc.home': "PetFind est une médaille QR en forme de patte qui fonctionne toujours — sans batterie, sans appli, sans compte. Celui qui trouve votre animal scanne, vous appelle en un geste et voit le vétérinaire le plus proche. Créez la page de votre animal en une minute.",
    'hero.badge': 'Sans batterie · sans appli · sans compte',
    'hero.h1': 'La médaille qui ramène <em>les animaux</em>.',
    'hero.lede': "Une médaille en forme de patte avec un QR code qui ne tombe jamais en panne de batterie. La personne qui trouve votre animal la scanne, vous joint en un geste et voit le vétérinaire le plus proche — où que votre animal réapparaisse.",
    'hero.drag': 'Faites pivoter la médaille',
    'hero.cta1': "Créer la médaille de votre animal",
    'hero.cta2': 'Voir le fonctionnement',
    'hero.scroll': 'Défiler',

    'st1.h2': "Un animal retrouvé ne devrait jamais être une <span class=\"hl\">impasse</span>.",
    'st1.p': "La plupart des médailles échouent au pire moment — une batterie GPS à plat, un numéro illisible. PetFind est conçue pour qu'un inconnu puisse aider en quelques secondes, sans rien installer ni recharger.",

    'feat.eyebrow': 'Pourquoi PetFind',
    'feat.h2': "Tout ce dont a besoin la personne qui trouve, sur une seule page.",
    'feat.qr.h': 'QR toujours actif',
    'feat.qr.p': "La médaille porte un QR code qui ne consomme aucune énergie. Elle fonctionne pour toujours comme identité de secours — même batterie à plat.",
    'feat.tap.h': 'Contact en un geste',
    'feat.tap.p': "La personne qui trouve vous appelle ou vous écrit directement depuis la page. Sans inscription, sans attente, sans intermédiaire.",
    'feat.vet.h': 'Vétérinaire le plus proche, en direct',
    'feat.vet.p': "La page trouve la clinique la plus proche de l'endroit où votre animal est retrouvé — pas une adresse fixe — pour que l'aide soit toujours proche.",
    'feat.priv.h': 'Privée par conception',
    'feat.priv.p': "Votre adresse n'est jamais affichée. Seuls votre numéro et le vétérinaire le plus proche apparaissent sur la page.",
    'feat.steps.h': "Vous écrivez les étapes",
    'feat.steps.p': "Choisissez exactement quoi faire — à partir de suggestions bienveillantes ou de vos propres mots, en français ou en anglais.",
    'feat.lang.h': 'Tout téléphone, toute langue',
    'feat.lang.p': "S'ouvre dans n'importe quel navigateur. La personne qui trouve peut basculer entre français et anglais d'un geste.",

    'dk.h2': "Un côté vous appelle. <span class=\"hl\">Un côté vous sauve.</span>",
    'dk.p': "Retournez la médaille : l'avant porte le logo PetFind, l'arrière un QR unique qui ouvre la page de votre animal. Faites-la pivoter en haut de la page pour voir les deux.",

    'how.eyebrow': 'Fonctionnement',
    'how.h2': "Trois étapes pour un animal plus en sécurité.",
    'how.s1.h': "Créez la page de votre animal",
    'how.s1.p': "Ajoutez les détails de votre animal et votre numéro, puis choisissez quoi faire. Environ une minute.",
    'how.s2.h': 'Recevez votre QR code unique',
    'how.s2.p': "Nous générons un QR unique à imprimer chez vous ou à mettre sur une médaille. Chaque animal a le sien.",
    'how.s3.h': 'On scanne, vous retrouvez',
    'how.s3.p': "La personne qui trouve votre animal scanne le code, vous appelle et voit le vétérinaire le plus proche — sans aucune appli.",
    'how.cta': 'Créer votre médaille',
    'how.card.tag': 'MÉDAILLE SCANNÉE',
    'how.card.title': 'Vous avez trouvé Luna 🐾',
    'how.card.p': "« Luna a une famille qui l'aime — elle la cherche. » Un geste pour appeler, et le vétérinaire le plus proche est là. Voilà toute l'expérience côté personne qui trouve.",
    'how.card.cta': 'En créer une pour votre animal',

    'rev.eyebrow': 'Adoptée par les amoureux des animaux',
    'rev.h2': 'Ce que disent les premiers utilisateurs',
    'rev.sample': "Avis d'exemple — les vrais arriveront au lancement",
    'rev.t1.q': "« Quelqu'un a trouvé notre chat à deux rues et a appelé en quelques minutes. Aucune appli, aucune complication — il a juste scanné la patte et nous a joints. Magique. »",
    'rev.t1.n': 'Marie L.',
    'rev.t1.l': 'Propriétaire de chat · Lyon',
    'rev.t2.q': "« Ce qui m'a convaincu, c'est le vétérinaire le plus proche. Mon chien s'est échappé en vacances, à des centaines de km, et la page a quand même orienté la personne vers une clinique proche. »",
    'rev.t2.n': 'Thomas B.',
    'rev.t2.l': 'Propriétaire de chien · Bordeaux',
    'rev.t3.q': "« Configurée en une minute et QR imprimé à la maison. Pouvoir écrire mes propres consignes — « elle est timide, asseyez-vous et attendez » — a tout changé. »",
    'rev.t3.n': 'Amélie S.',
    'rev.t3.l': 'Propriétaire de chat · Paris',

    'rate.h2': "Feriez-vous confiance à PetFind pour votre animal ?",
    'rate.p': "Touchez les étoiles pour noter l'idée. Votre note est enregistrée sur votre appareil — au lancement des comptes, elles aideront à façonner le produit.",

    'cta.h2': 'Donnez à votre animal un chemin vers la maison.',
    'cta.p': "Créez la page PetFind de votre animal — gratuite à configurer, prête en une minute, et active dès qu'on la scanne.",
    'cta.btn': 'Créer votre médaille',

    /* ---- faq ---- */
    'meta.title.faq': 'FAQ — PetFind',
    'faq.eyebrow': "Centre d'aide",
    'faq.h1': 'Questions fréquentes',
    'faq.q1': "Faut-il une appli ou un abonnement ?",
    'faq.a1': "Non. PetFind s'ouvre comme une page web normale dans n'importe quel navigateur. Rien à installer, ni pour vous ni pour la personne qui trouve votre animal, et le QR fonctionne même si la batterie d'un collier GPS est à plat.",
    'faq.q2': "Mon adresse est-elle visible par des inconnus ?",
    'faq.a2': "Jamais. Seuls votre numéro et la clinique vétérinaire la plus proche sont affichés. Votre adresse reste privée, pour la sécurité de votre famille.",
    'faq.q3': "Comment fonctionne le « vétérinaire le plus proche » ?",
    'faq.a3': "Avec l'accord de la personne qui trouve, la page lit la position de son téléphone et cherche la clinique vétérinaire la plus proche via OpenStreetMap. Le vétérinaire affiché est donc proche de l'endroit où se trouve réellement votre animal — pas une adresse fixe. Si la localisation est refusée, la page affiche un vétérinaire de secours (si vous en avez ajouté un) ou un lien « chercher un vétérinaire près de moi ».",
    'faq.q4': "Puis-je choisir quoi faire pour la personne qui trouve ?",
    'faq.a4': "Oui. À la création, vous choisissez les étapes affichées — parmi des suggestions bienveillantes comme « rassurez-moi » ou « donnez-moi de l'eau », ou avec vos propres mots. Vous pouvez les réordonner, les modifier ou les supprimer.",
    'faq.q5': "Quelles informations dois-je fournir ?",
    'faq.a5': "Juste le nom de votre animal et votre numéro de téléphone pour commencer. Tout le reste — race, âge, vétérinaire de secours — est facultatif.",
    'faq.q6': "Cela remplace-t-il la puce obligatoire ?",
    'faq.a6': "Non. En France, l'identification des chiens, chats et furets par une puce enregistrée à l'I-CAD reste obligatoire. PetFind est complémentaire : elle offre un moyen instantané et bienveillant de vous joindre pour des retrouvailles plus rapides.",
    'faq.q7': "Quelles langues sont prises en charge ?",
    'faq.a7': "La page de l'animal est disponible en français et en anglais, et la personne qui trouve peut basculer entre les deux d'un geste. D'autres langues sont prévues.",
    'faq.q8': "PetFind est-elle gratuite ?",
    'faq.a8': "Configurer la page de votre animal et générer un QR code est gratuit. Les médailles physiques, les fonctions premium et l'application de soin connecté plus large sont prévues.",
    'faq.q9': "Que se passe-t-il si je change de numéro ?",
    'faq.a9': "Vous mettez à jour vos informations et générez une nouvelle page. Des pages modifiables et toujours à jour, liées à un lien court permanent, arriveront avec les comptes — voir la feuille de route sur la page d'accueil.",
    'faq.cta': 'Créer votre médaille',

    /* ---- 404 ---- */
    'meta.title.404': 'Page introuvable — PetFind',
    'nf.h1': 'Piste perdue.',
    'nf.p': "Nous n'avons pas trouvé la page demandée. Elle a peut-être été déplacée, ou le lien est incomplet.",
    'nf.home': "Retour à l'accueil",
    'nf.create': 'Créer une médaille',

    /* ---- create / builder ---- */
    'meta.title.create': 'Créez votre médaille PetFind',
    'cr.eyebrow': 'Configurez votre médaille',
    'cr.h1': "Créez la page de votre animal",
    'cr.intro': "Renseignez vos informations, choisissez quoi faire pour la personne qui trouve, et nous générons un QR code unique. Aucun compte nécessaire — tout reste sur votre appareil jusqu'à la publication.",
    'cr.lang.h': 'Langue de la page',
    'cr.lang.p': "La personne qui trouve peut aussi changer de langue sur la page.",
    'cr.pet.h': 'À propos de votre animal',
    'cr.pet.name': "Nom de l'animal",
    'cr.pet.species': 'Espèce',
    'cr.pet.choose': 'Choisir…',
    'cr.pet.dog': 'Chien', 'cr.pet.cat': 'Chat', 'cr.pet.rabbit': 'Lapin', 'cr.pet.other': 'Autre',
    'cr.pet.breed': 'Race (facultatif)',
    'cr.pet.sex': 'Sexe (facultatif)',
    'cr.pet.female': 'Femelle', 'cr.pet.male': 'Mâle',
    'cr.pet.age': 'Âge (facultatif)',
    'cr.pet.home': "Afficher le message « J'ai une famille qui m'aime — elle me cherche ».",
    'cr.owner.h': 'Comment vous joindre',
    'cr.owner.p': "Votre adresse n'est jamais affichée. Seuls votre numéro et le vétérinaire le plus proche apparaissent.",
    'cr.owner.name': 'Votre nom',
    'cr.owner.phone': 'Numéro de téléphone',
    'cr.owner.err': "Ajoutez un numéro pour qu'on puisse vous joindre.",
    'cr.steps.h': 'Quoi faire — étapes pour la personne qui trouve',
    'cr.steps.p': "Modifiez le texte, supprimez des étapes ou ajoutez-en depuis les suggestions. Elles s'affichent sur la page de votre animal.",
    'cr.steps.add': '+ Ajouter ma propre étape',
    'cr.vet.h': 'Vétérinaire de secours (facultatif)',
    'cr.vet.p': "La page affiche automatiquement la clinique la plus proche de la personne qui trouve. Si sa localisation est désactivée, ce vétérinaire est affiché à la place.",
    'cr.vet.name': 'Nom de la clinique',
    'cr.vet.addr': 'Adresse',
    'cr.vet.phone': 'Téléphone',
    'cr.generate': 'Générer mon QR code',
    'cr.preview': 'Aperçu en direct',
    'cr.result.h': 'Votre médaille est prête 🎉',
    'cr.result.p': "Imprimez ce QR ou mettez-le sur une médaille. Quiconque le scanne ouvre la page de votre animal.",
    'cr.copy': 'Copier',
    'cr.download': 'Télécharger le QR (PNG)',
    'cr.open': 'Ouvrir la page de mon animal',
    'cr.note': "Ce lien pointe vers l'hébergement du site. Pour rendre le QR scannable par tous, publiez le site (ou connectez votre domaine). En attendant, le lien fonctionne sur cet appareil.",
    'cr.toast.copied': 'Lien copié',

    /* ---- legal shared ---- */
    'legal.draft': "<strong>Modèle provisoire.</strong> Ce texte est un point de départ. Faites-le relire par un professionnel qualifié et complétez les champs (nom de société, e-mail de contact, juridiction) avant toute mise en ligne publique.",
    'legal.updated': 'Dernière mise à jour :',

    /* ---- privacy ---- */
    'meta.title.privacy': 'Politique de confidentialité — PetFind',
    'pv.h1': 'Politique de confidentialité',
    'pv.intro': "PetFind (« nous ») crée des outils qui aident les animaux perdus à rentrer. Cette politique explique quelles informations sont concernées lorsque vous utilisez ce site et les pages qu'il génère.",
    'pv.h2.short': 'En bref',
    'pv.li1': "Les informations que vous saisissez pour créer une page (nom de l'animal, votre numéro, les étapes choisies) sont stockées <strong>dans le lien lui-même et dans votre propre navigateur</strong> — pas sur nos serveurs dans cette version.",
    'pv.li2': "Une page affiche seulement votre numéro et le vétérinaire le plus proche. <strong>Votre adresse n'est jamais affichée.</strong>",
    'pv.li3': "La fonction « vétérinaire le plus proche » utilise la position de la personne qui trouve uniquement avec son accord, et seulement pour rechercher des cliniques proches.",
    'pv.li4': "Les statistiques restent désactivées tant que vous ne les acceptez pas dans le bandeau cookies.",
    'pv.h2.info': 'Informations traitées',
    'pv.info1': "<strong>Détails de la page.</strong> Les informations saisies sont encodées dans le lien de la page et enregistrées localement dans votre navigateur pour y revenir. Dans cette version côté client, elles ne nous sont ni transmises ni stockées.",
    'pv.info2': "<strong>Localisation (personnes qui trouvent).</strong> Lorsqu'une personne ouvre une page et accepte de partager sa position, ses coordonnées sont envoyées au service OpenStreetMap Overpass pour trouver des cliniques proches. Nous ne stockons pas ces coordonnées. La localisation n'est jamais demandée au propriétaire.",
    'pv.info3': "<strong>Statistiques.</strong> Avec votre accord, nous pouvons utiliser un outil respectueux de la vie privée pour comprendre l'usage agrégé et anonyme. Aucune statistique avant consentement.",
    'pv.h2.third': 'Services tiers',
    'pv.third1': "<strong>OpenStreetMap / Overpass</strong> — pour trouver les cliniques proches à partir de la position. Voir la politique de la Fondation OpenStreetMap.",
    'pv.third2': "<strong>Itinéraires</strong> — les liens « Itinéraire » ouvrent votre application de cartes ; ses propres conditions s'appliquent alors.",
    'pv.third3': "<strong>Fournisseur de statistiques</strong> — uniquement avec votre accord ; configuré avant la mise en ligne.",
    'pv.h2.cookies': 'Cookies et stockage local',
    'pv.cookies': "Nous utilisons le stockage local de votre navigateur pour mémoriser votre choix de consentement et les pages créées sur cet appareil. Les cookies de statistiques, le cas échéant, ne sont posés qu'après votre acceptation.",
    'pv.h2.rights': 'Vos droits (RGPD)',
    'pv.rights': "Au titre du RGPD, vous avez le droit d'accéder à vos données, de les corriger, de les supprimer, d'en limiter le traitement, de les porter et de vous y opposer. Comme les données de votre page résident dans votre navigateur et votre lien dans cette version, vous les contrôlez directement : videz le stockage de votre navigateur ou supprimez le lien pour les effacer. Pour toute demande concernant des données que nous détenons, contactez-nous à l'adresse ci-dessous.",
    'pv.h2.children': 'Enfants',
    'pv.children': "PetFind est destiné aux adultes. Nous ne collectons pas sciemment de données d'enfants.",
    'pv.h2.changes': 'Modifications',
    'pv.changes': "Nous pourrons mettre à jour cette politique à mesure que PetFind évolue (par exemple avec l'ajout des comptes et du stockage serveur). Nous mettrons à jour la date ci-dessus.",
    'pv.h2.contact': 'Contact',
    'pv.contact': "Des questions sur la confidentialité ? Écrivez à <a href=\"mailto:privacy@petfind.example\">privacy@petfind.example</a>. <em>(À remplacer par votre vrai contact avant le lancement.)</em>",

    /* ---- terms ---- */
    'meta.title.terms': "Conditions d'utilisation — PetFind",
    'tm.h1': "Conditions d'utilisation",
    'tm.intro': "Ces conditions régissent votre utilisation du site PetFind et des pages et QR codes qu'il génère. En utilisant PetFind, vous les acceptez.",
    'tm.h2.what': "Ce qu'est PetFind",
    'tm.what': "PetFind vous aide à créer une page web pour votre animal et un QR code qui y mène, afin qu'une personne puisse vous contacter et voir le vétérinaire le plus proche. C'est une aide aux retrouvailles — pas une garantie de récupération, ni un substitut à l'identification légale obligatoire comme la puce.",
    'tm.h2.resp': 'Vos responsabilités',
    'tm.resp1': 'Fournir des coordonnées exactes et les tenir à jour.',
    'tm.resp2': "N'inclure que des informations que vous acceptez de montrer à qui trouve votre animal.",
    'tm.resp3': "Respecter les lois locales, dont l'identification obligatoire (ex. I-CAD en France).",
    'tm.resp4': "Ne pas utiliser PetFind pour publier des contenus illicites, trompeurs ou nuisibles.",
    'tm.h2.avail': 'Disponibilité',
    'tm.avail': "PetFind est fourni « en l'état » et « selon disponibilité ». Des fonctions comme la recherche du vétérinaire le plus proche dépendent de services tiers (par exemple OpenStreetMap) et de l'autorisation de localisation ; elles peuvent parfois être indisponibles ou inexactes.",
    'tm.h2.liab': 'Limitation de responsabilité',
    'tm.liab': "Dans la mesure permise par la loi, PetFind n'est pas responsable des pertes indirectes ou consécutives liées à l'usage du service, y compris le fait qu'un animal ne soit pas récupéré. Rien dans ces conditions n'exclut une responsabilité qui ne peut l'être en vertu de la loi applicable.",
    'tm.h2.ip': 'Propriété intellectuelle',
    'tm.ip': "Le nom PetFind, l'identité visuelle et le contenu du site nous appartiennent. Le contenu que vous saisissez sur votre animal reste le vôtre.",
    'tm.h2.changes': 'Modifications',
    'tm.changes': "Nous pourrons mettre à jour ces conditions à mesure que le produit évolue. Continuer à l'utiliser après des modifications vaut acceptation.",
    'tm.h2.contact': 'Contact',
    'tm.contact': "Des questions ? Écrivez à <a href=\"mailto:hello@petfind.example\">hello@petfind.example</a>. <em>(À remplacer par votre vrai contact avant le lancement.)</em>"
  };

  var year = new Date().getFullYear();
  function fill(v) { return typeof v === 'string' ? v.replace(/%Y%/g, year) : v; }

  function applyAttr(sel, setter) {
    document.querySelectorAll(sel).forEach(setter);
  }

  function apply(lang) {
    var t = lang === 'fr' ? FR : null;
    document.documentElement.lang = lang;

    applyAttr('[data-i18n]', function (el) {
      var k = el.getAttribute('data-i18n');
      if (!('i18nEn' in el.dataset)) el.dataset.i18nEn = el.textContent;
      el.textContent = fill(t && t[k] != null ? t[k] : el.dataset.i18nEn);
    });
    applyAttr('[data-i18n-html]', function (el) {
      var k = el.getAttribute('data-i18n-html');
      if (!('i18nEnh' in el.dataset)) el.dataset.i18nEnh = el.innerHTML;
      el.innerHTML = fill(t && t[k] != null ? t[k] : el.dataset.i18nEnh);
    });
    applyAttr('[data-i18n-ph]', function (el) {
      var k = el.getAttribute('data-i18n-ph');
      if (!('i18nEnp' in el.dataset)) el.dataset.i18nEnp = el.getAttribute('placeholder') || '';
      el.setAttribute('placeholder', t && t[k] != null ? fill(t[k]) : el.dataset.i18nEnp);
    });
    applyAttr('[data-i18n-al]', function (el) {
      var k = el.getAttribute('data-i18n-al');
      if (!('i18nEna' in el.dataset)) el.dataset.i18nEna = el.getAttribute('aria-label') || '';
      el.setAttribute('aria-label', t && t[k] != null ? fill(t[k]) : el.dataset.i18nEna);
    });
    applyAttr('[data-i18n-content]', function (el) {
      var k = el.getAttribute('data-i18n-content');
      if (!('i18nEnc' in el.dataset)) el.dataset.i18nEnc = el.getAttribute('content') || '';
      el.setAttribute('content', t && t[k] != null ? fill(t[k]) : el.dataset.i18nEnc);
    });

    var sw = document.getElementById('lang-switch');
    if (sw) {
      sw.querySelector('[data-l="en"]').classList.toggle('on', lang === 'en');
      sw.querySelector('[data-l="fr"]').classList.toggle('on', lang === 'fr');
    }
    global.PFI18n.lang = lang;
    if (global.PFI18nOnChange) try { global.PFI18nOnChange(lang); } catch (e) {}
  }

  function set(lang) {
    try { localStorage.setItem('pf_lang', lang); } catch (e) {}
    apply(lang);
  }

  function injectSwitch() {
    // Place the switch in the header row itself (not inside .nav-links) so it
    // stays visible on mobile, where .nav-links collapses into the hamburger.
    var host = document.querySelector('.site-head .nav') || document.querySelector('.site-head .nav-links');
    if (!host || document.getElementById('lang-switch')) return;
    var d = document.createElement('div');
    d.id = 'lang-switch'; d.className = 'lang-switch'; d.setAttribute('role', 'group'); d.setAttribute('aria-label', 'Language / Langue');
    d.innerHTML = '<button type="button" data-l="en">EN</button><button type="button" data-l="fr">FR</button>';
    d.querySelector('[data-l="en"]').addEventListener('click', function () { set('en'); });
    d.querySelector('[data-l="fr"]').addEventListener('click', function () { set('fr'); });
    // Sit just before the hamburger button when present, otherwise at the end.
    var menuBtn = host.querySelector('.menu-btn');
    if (menuBtn) host.insertBefore(d, menuBtn); else host.appendChild(d);
  }

  global.PFI18n = { apply: apply, set: set, lang: 'en', FR: FR };

  function boot() {
    injectSwitch();
    var l;
    try { l = localStorage.getItem('pf_lang'); } catch (e) {}
    // French is the site's main language; English only if the visitor picks it.
    if (l !== 'en' && l !== 'fr') l = 'fr';
    apply(l);
  }
  // i18n.js is loaded at the end of <body>, so all translatable content already
  // exists when this runs. Boot immediately (before first paint) to translate
  // to French without an English flash; fall back to DOMContentLoaded otherwise.
  if (document.body) boot();
  else document.addEventListener('DOMContentLoaded', boot);
})(window);
