/* Menu mobile : l'ouverture est pilotée en CSS par la case à cocher,
   donc le menu fonctionne même sans JavaScript. Ici on ne fait que
   le refermer quand on clique sur un lien. */
(function () {
  var c = document.getElementById('menuToggle');
  if (!c) return;
  document.querySelectorAll('.menu a').forEach(function (a) {
    a.addEventListener('click', function () { c.checked = false; });
  });
  addEventListener('keydown', function (e) { if (e.key === 'Escape') c.checked = false; });
})();

/* ============================================================
   ENVOI DES FORMULAIRES
   Le formulaire declare son point d'envoi dans data-endpoint.
   Sans JavaScript rien n'est perdu : le telephone et l'adresse
   e-mail restent affiches juste a cote.
   ============================================================ */
(function () {
  var formulaires = document.querySelectorAll('form[data-endpoint]');
  if (!formulaires.length) return;

  formulaires.forEach(function (form) {
    var ok = form.querySelector('.msg-ok');
    var ko = form.querySelector('.msg-ko');
    var bouton = form.querySelector('[type="submit"]');
    var libelle = bouton ? bouton.textContent : '';

    var manque = form.querySelector('.msg-champs');

    // On prend la main sur la verification : le navigateur afficherait
    // une bulle dans sa propre langue, et une seule a la fois.
    // Si JavaScript ne se charge pas, l'attribut reste absent et
    // la verification native du navigateur s'applique quand meme.
    form.setAttribute('novalidate', '');

    // Nom lisible d'un champ, tire de son libelle
    function nomDuChamp(champ) {
      var l = champ.closest('label');
      if (!l) return 'un champ';
      var t = l.cloneNode(true);
      var e = t.querySelectorAll('input, select, textarea, .fac, .obl');
      for (var i = 0; i < e.length; i++) e[i].remove();
      return t.textContent.replace(/\s+/g, ' ').trim().replace(/\s*:$/, '');
    }

    function nettoyer(champ) {
      champ.classList.remove('invalide');
      champ.removeAttribute('aria-invalid');
    }

    // Des que la personne corrige, on enleve le rouge sur ce champ
    form.addEventListener('input', function (e) {
      if (e.target.classList.contains('invalide') && e.target.checkValidity()) nettoyer(e.target);
    });

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      if (ok) ok.hidden = true;
      if (ko) ko.hidden = true;

      // Verification des champs obligatoires
      var champs = form.querySelectorAll('input[required], select[required], textarea[required]');
      var vides = [], malformes = [], premier = null;
      for (var i = 0; i < champs.length; i++) {
        var c = champs[i];
        nettoyer(c);
        if (c.checkValidity()) continue;
        if (c.validity.valueMissing) {
          vides.push(nomDuChamp(c));
        } else if (c.type === 'email') {
          malformes.push('L’adresse e-mail n’est pas au bon format : il manque le @ ou ce qui suit.');
        } else {
          malformes.push('Le champ « ' + nomDuChamp(c) + ' » est à revoir.');
        }
        c.classList.add('invalide');
        c.setAttribute('aria-invalid', 'true');
        if (!premier) premier = c;
      }

      if (premier) {
        var phrases = [];
        if (vides.length) {
          phrases.push(vides.length > 1
            ? 'Il manque ' + vides.length + ' champs obligatoires : ' + vides.join(', ') + '.'
            : 'Il manque un champ obligatoire : ' + vides[0] + '.');
        }
        for (var j = 0; j < malformes.length; j++) phrases.push(malformes[j]);
        if (manque) { manque.textContent = phrases.join(' '); manque.hidden = false; }
        premier.focus();
        if (premier.scrollIntoView) premier.scrollIntoView({ block: 'center', behavior: 'smooth' });
        return;
      }
      if (manque) manque.hidden = true;

      // Piege a robots : le champ est invisible pour un humain.
      // S'il est rempli, on fait semblant d'accepter sans rien envoyer.
      var piege = form.querySelector('[name="botcheck"]');
      // Case a cocher : sa valeur vaut toujours « on », c'est « checked » qui compte.
      if (piege && piege.checked) { form.reset(); if (ok) ok.hidden = false; return; }

      var url = form.dataset.endpoint;
      var cle = form.querySelector('[name="access_key"]');
      if (!url || !cle || !cle.value || cle.value.indexOf('VOTRE_CLE') !== -1) {
        if (ko) ko.hidden = false;
        return;
      }

      // Envoi en JSON et non en « multipart » : le JSON est toujours encode en
      // UTF-8, alors qu'en multipart le serveur doit deviner l'encodage et
      // abimait les accents dans l'e-mail recu (constate le 15/09/2026).
      var brut = {};
      new FormData(form).forEach(function (valeur, cle) { brut[cle] = valeur; });

      // Web3Forms conserve les accents dans les reponses, mais pas dans les
      // noms de champs : les intitules affiches dans l'e-mail sont donc sans
      // accent. Prenom et nom sont regroupes sur une seule ligne, dans cet ordre.
      var donnees = {};
      ['access_key', 'subject', 'from_name', 'botcheck'].forEach(function (cle) {
        if (brut[cle] !== undefined) donnees[cle] = brut[cle];
      });
      var nomComplet = [brut.prenom, brut.nom].filter(Boolean).join(' ');
      if (nomComplet) donnees['Nom complet'] = nomComplet;
      if (brut.email) donnees.email = brut.email;   // « email » : sert d'adresse de reponse
      [['telephone', 'Tel'], ['commune', 'Commune'], ['besoin', 'Besoin'],
       ['contact', 'Mode de contact'], ['poste', 'Poste'], ['message', 'Message']
      ].forEach(function (c) {
        if (brut[c[0]] !== undefined && brut[c[0]] !== '') donnees[c[1]] = brut[c[0]];
      });

      if (bouton) { bouton.disabled = true; bouton.textContent = 'Envoi en cours…'; }

      fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify(donnees)
      })
        .then(function (r) {
          if (!r.ok) throw new Error('envoi refuse');
          form.reset();
          if (ok) ok.hidden = false;
        })
        .catch(function () { if (ko) ko.hidden = false; })
        .finally(function () {
          if (bouton) { bouton.disabled = false; bouton.textContent = libelle; }
        });
    });
  });
})();


/* ============================================================
   Consentement : la memoire des choix
   Deux usages sont soumis a accord, chacun accepte ou refuse a part :
   - carte  : le plan Google Maps de la page Contact ;
   - mesure : la mesure d'audience Google Analytics.
   Le choix est garde six mois dans le navigateur de la personne,
   puis redemande, comme le recommande la CNIL. Rien n'est envoye
   nulle part.
   ============================================================ */
var Consentement = (function () {
  // Identifiant Google Analytics 4 de Clair & Net (G-XXXXXXXXXX).
  // Vide : aucune mesure n'est chargee et le bandeau ne parle que du plan.
  var GA = '';

  var CLE = 'cnet-choix';
  var DUREE = 182 * 24 * 3600 * 1000; // six mois

  // Reprend le choix fait avec la premiere version du bandeau (oui / non),
  // qui ne portait que sur le plan.
  try {
    var ancien = localStorage.getItem('cnet-consentement');
    if (ancien) {
      localStorage.setItem(CLE, JSON.stringify({ carte: ancien === 'oui', date: Date.now() }));
      localStorage.removeItem('cnet-consentement');
    }
  } catch (e) {}

  function lire() {
    var c = null;
    try { c = JSON.parse(localStorage.getItem(CLE)); } catch (e) {}
    if (!c || typeof c !== 'object' || !(Date.now() - c.date < DUREE)) return null;
    return c;
  }

  function enregistrer(carte, mesure) {
    var c = { carte: !!carte, date: Date.now() };
    if (GA) c.mesure = !!mesure;
    try { localStorage.setItem(CLE, JSON.stringify(c)); } catch (e) {}
    // Previent le reste du site qu'un choix vient d'etre fait
    document.dispatchEvent(new CustomEvent('consentement', { detail: c }));
  }

  // Faut-il poser la question ? Oui s'il n'y a pas de choix, s'il a plus
  // de six mois, ou si la mesure d'audience a ete ajoutee depuis.
  function aDemander() {
    var c = lire();
    return !c || (!!GA && typeof c.mesure !== 'boolean');
  }

  return { GA: GA, lire: lire, enregistrer: enregistrer, aDemander: aDemander };
})();


/* ============================================================
   Plan d'acces charge sur demande
   Google Maps depose des cookies des que la carte s'affiche.
   Tant que personne n'a accepte ni clique, aucune requete ne part.
   ============================================================ */
(function () {
  var zones = document.querySelectorAll('.carte-attente[data-carte]');
  if (!zones.length) return;

  zones.forEach(function (zone) {
    var bouton = zone.querySelector('button');
    if (!bouton) return;

    function afficher() {
      if (!document.body.contains(zone)) return;
      var cadre = document.createElement('iframe');
      cadre.src = zone.dataset.carte;
      cadre.title = zone.dataset.titre || 'Plan d\'acces';
      cadre.loading = 'lazy';
      cadre.referrerPolicy = 'no-referrer-when-downgrade';
      cadre.allowFullscreen = true;
      // Pas de hauteur en style direct : elle ecraserait la regle CSS
      // qui fait remplir le conteneur, et laisserait une zone vide dessous.
      zone.parentNode.replaceChild(cadre, zone);
    }

    bouton.addEventListener('click', afficher);

    // Si la personne a deja accepte le plan, il s'affiche directement :
    // inutile de lui demander deux fois.
    var c = Consentement.lire();
    if (c && c.carte) afficher();

    document.addEventListener('consentement', function (ev) {
      if (ev.detail.carte) afficher();
    });
  });
})();


/* ============================================================
   Mesure d'audience Google Analytics
   Le script de Google n'est meme pas telecharge tant que la
   personne n'a pas accepte. Si elle retire son accord, la mesure
   s'arrete aussitot et les cookies deja deposes sont effaces.
   ============================================================ */
(function () {
  var id = Consentement.GA;
  if (!id) return;
  var charge = false;

  function activer() {
    window['ga-disable-' + id] = false;
    if (charge) return;
    charge = true;
    window.dataLayer = window.dataLayer || [];
    window.gtag = function () { window.dataLayer.push(arguments); };
    window.gtag('js', new Date());
    window.gtag('config', id, {
      cookie_expires: 13 * 30 * 24 * 3600, // 13 mois au plus, comme le demande la CNIL
      allow_google_signals: false,         // aucun rapprochement avec les comptes Google
      allow_ad_personalization_signals: false
    });
    var s = document.createElement('script');
    s.async = true;
    s.src = 'https://www.googletagmanager.com/gtag/js?id=' + encodeURIComponent(id);
    document.head.appendChild(s);
  }

  function desactiver() {
    window['ga-disable-' + id] = true;
    // Efface _ga et _ga_XXXX, poses par Google sur le domaine principal
    var domaine = location.hostname.replace(/^www\./, '');
    document.cookie.split(';').forEach(function (morceau) {
      var nom = morceau.split('=')[0].trim();
      if (nom.indexOf('_ga') !== 0) return;
      var perime = '=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/';
      document.cookie = nom + perime;
      document.cookie = nom + perime + '; domain=.' + domaine;
    });
  }

  // Sans accord en cours (refus, ou accord de plus de six mois),
  // on ne laisse pas trainer d'anciens cookies de mesure.
  var c = Consentement.lire();
  if (c && c.mesure) activer(); else desactiver();

  document.addEventListener('consentement', function (ev) {
    if (ev.detail.mesure) activer(); else desactiver();
  });
})();


/* ============================================================
   Bandeau de consentement
   Refuser est aussi simple qu'accepter, comme l'exige la CNIL.
   Quand la mesure d'audience est active, « Personnaliser » permet
   d'accepter l'un sans l'autre ; rien n'est coche d'avance.
   ============================================================ */
(function () {
  var avecMesure = !!Consentement.GA;

  var TEXTE_SIMPLE =
    'Ce site n\'utilise aucun traceur publicitaire et ne mesure pas votre navigation. ' +
    'Seul le plan d\'accès, fourni par Google Maps, peut déposer des cookies — et seulement si vous l\'acceptez. ';
  var TEXTE_MESURE =
    'Avec votre accord, nous mesurons la fréquentation du site avec Google Analytics et affichons ' +
    'le plan d\'accès fourni par Google Maps. Ces deux services déposent des cookies. ' +
    'Aucun traceur publicitaire. ';

  function fermer(b) {
    b.remove();
  }

  function vueSimple(b) {
    b.querySelector('.bandeau-in').innerHTML =
      '<p class="bandeau-txt">' + (avecMesure ? TEXTE_MESURE : TEXTE_SIMPLE) +
        '<a href="/mentions-legales#cookies">En savoir plus</a></p>' +
      '<div class="bandeau-btns">' +
        '<button type="button" class="btn btn-clair" data-action="refuser">' + (avecMesure ? 'Tout refuser' : 'Refuser') + '</button>' +
        (avecMesure ? '<button type="button" class="btn-texte" data-action="personnaliser">Personnaliser</button>' : '') +
        '<button type="button" class="btn btn-plein" data-action="accepter">' + (avecMesure ? 'Tout accepter' : 'Accepter') + '</button>' +
      '</div>';
  }

  function ligne(nom, titre, texte, coche) {
    return '<label class="choix">' +
        '<input type="checkbox" name="' + nom + '"' + (coche ? ' checked' : '') + '>' +
        '<span><strong>' + titre + '</strong>' + texte + '</span>' +
      '</label>';
  }

  function vueDetail(b) {
    var c = Consentement.lire() || {};
    b.querySelector('.bandeau-in').innerHTML =
      '<div class="bandeau-choix">' +
        '<p class="bandeau-txt">Choisissez ce que vous acceptez. Vous pourrez changer d\'avis à tout moment ' +
          'par le lien « Gérer les cookies » en bas de page. <a href="/mentions-legales#cookies">En savoir plus</a></p>' +
        ligne('mesure', 'Mesure d\'audience',
          'Google Analytics compte les visites et les pages consultées, pour nous aider à améliorer le site. ' +
          'Rien n\'est utilisé pour de la publicité.', c.mesure === true) +
        ligne('carte', 'Plan d\'accès',
          'Affiche la carte Google Maps sur la page Contact. Google peut alors déposer ses propres cookies.', c.carte === true) +
      '</div>' +
      '<div class="bandeau-btns">' +
        '<button type="button" class="btn btn-clair" data-action="refuser">Tout refuser</button>' +
        '<button type="button" class="btn btn-plein" data-action="enregistrer">Enregistrer</button>' +
      '</div>';
    var premier = b.querySelector('input');
    if (premier) premier.focus({ preventScroll: true });
  }

  function construire(detail) {
    var b = document.createElement('div');
    b.className = 'bandeau-cookies';
    b.setAttribute('role', 'dialog');
    b.setAttribute('aria-label', 'Gestion des cookies');
    b.innerHTML = '<div class="bandeau-in"></div>';
    document.body.appendChild(b);
    if (detail) vueDetail(b); else vueSimple(b);

    b.addEventListener('click', function (e) {
      var bt = e.target.closest('[data-action]');
      if (!bt) return;
      var action = bt.dataset.action;
      if (action === 'personnaliser') { vueDetail(b); return; }
      if (action === 'refuser') Consentement.enregistrer(false, false);
      if (action === 'accepter') Consentement.enregistrer(true, true);
      if (action === 'enregistrer') {
        Consentement.enregistrer(b.querySelector('[name="carte"]').checked,
                                 b.querySelector('[name="mesure"]').checked);
      }
      fermer(b);
    });
    // laisse le temps au navigateur de peindre avant l'animation
    requestAnimationFrame(function () { b.classList.add('visible'); });
  }

  if (Consentement.aDemander()) construire(false);

  // Lien « Gérer les cookies » du pied de page : ouvre directement
  // le detail des choix quand il y en a plusieurs.
  document.addEventListener('click', function (e) {
    var l = e.target.closest('[data-gerer-cookies]');
    if (!l) return;
    e.preventDefault();
    var ouvert = document.querySelector('.bandeau-cookies');
    if (ouvert) ouvert.remove();
    construire(avecMesure);
  });
})();


/* ============================================================
   Apparitions au defilement
   On marque les blocs a animer, puis on les revele quand ils
   entrent dans l'ecran. Tout est conditionne a la classe « anim » :
   sans elle (JavaScript indisponible, ou reglage « reduire les
   animations »), le contenu reste affiche normalement.
   ============================================================ */
(function () {
  if (!document.documentElement.classList.contains('anim')) return;
  if (!('IntersectionObserver' in window)) return;

  // Blocs concernes, dans l'ordre ou ils apparaissent dans la page
  var cibles = [
    '.sec .tete', '.carte', '.trio > *', '.etapes > li',
    '.zone > *', '.encart-tarif', '.bande-cta .wrap', '.gal > *',
    '.grille-form > *', '.amen-grid > *', '.centre'
  ];

  var blocs = [];
  cibles.forEach(function (sel) {
    [].forEach.call(document.querySelectorAll(sel), function (el) {
      // on evite d'animer un element deja contenu dans un autre anime
      if (el.closest('.entete, .pied, .bandeau-cookies, .menu')) return;
      if (blocs.indexOf(el) === -1) blocs.push(el);
    });
  });
  if (!blocs.length) return;

  blocs.forEach(function (el) {
    el.classList.add('apparait');
    // decalage en cascade pour les elements d'une meme rangee
    var freres = el.parentNode ? [].indexOf.call(el.parentNode.children, el) : 0;
    if (freres > 0 && freres < 4) el.setAttribute('data-retard', String(freres));
  });

  var aRepondu = false;

  var oeil = new IntersectionObserver(function (entrees) {
    aRepondu = true;
    entrees.forEach(function (e) {
      if (!e.isIntersecting) return;
      e.target.classList.add('vu');
      oeil.unobserve(e.target);
    });
  }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });

  blocs.forEach(function (el) { oeil.observe(el); });

  // Filet de securite cible. Un IntersectionObserver qui fonctionne rappelle
  // toujours une premiere fois juste apres observe(), meme pour les blocs
  // hors ecran. S'il ne rappelle jamais, c'est qu'il est inoperant dans cet
  // environnement : on affiche tout plutot que de laisser une page vide.
  // Ce filet ne se declenche donc pas dans un navigateur normal, et
  // n'annule pas l'effet pour qui lit lentement.
  setTimeout(function () {
    if (aRepondu) return;
    blocs.forEach(function (el) { el.classList.add('vu'); });
  }, 1200);
})();


/* ============================================================
   Ruban d'avis
   On transforme la grille a trois colonnes en une bande qui
   defile doucement. Les cartes sont dupliquees une fois pour
   que la boucle soit invisible ; les copies sont masquees aux
   lecteurs d'ecran pour ne pas lire deux fois les memes avis.
   Si cette fonction ne s'execute pas, la grille d'origine reste
   affichee telle quelle.
   ============================================================ */
(function () {
  if (!document.documentElement.classList.contains('anim')) return;

  var grille = document.querySelector('.avis-grille');
  if (!grille) return;

  var avis = [].slice.call(grille.children);
  if (avis.length < 2) return;

  var ruban = document.createElement('div');
  ruban.className = 'avis-ruban';
  var piste = document.createElement('div');
  piste.className = 'avis-piste';

  avis.forEach(function (el) { piste.appendChild(el); });
  // seconde serie, pour boucler sans saut visible
  avis.forEach(function (el) {
    var copie = el.cloneNode(true);
    copie.setAttribute('aria-hidden', 'true');
    piste.appendChild(copie);
  });

  ruban.appendChild(piste);
  grille.parentNode.replaceChild(ruban, grille);

  // Faire glisser a la main suspend le defilement, puis il repart.
  var minuteur;
  ruban.addEventListener('scroll', function () {
    ruban.classList.add('fige');
    clearTimeout(minuteur);
    minuteur = setTimeout(function () { ruban.classList.remove('fige'); }, 2500);
  }, { passive: true });
})();


/* ============================================================
   Barre du haut
   Au repos elle a la meme couleur que le bandeau juste en dessous,
   pour qu'aucune marche de couleur n'apparaisse. Des que la page
   defile, elle passe au blanc et se detache du contenu.
   ============================================================ */
(function () {
  var barre = document.querySelector('.entete');
  if (!barre) return;

  var enCours = false;
  function majuscule() {
    barre.classList.toggle('defile', window.scrollY > 8);
    enCours = false;
  }
  // On ne recalcule qu'une fois par image affichee, pas a chaque pixel.
  window.addEventListener('scroll', function () {
    if (enCours) return;
    enCours = true;
    window.requestAnimationFrame(majuscule);
  }, { passive: true });

  majuscule();
})();
