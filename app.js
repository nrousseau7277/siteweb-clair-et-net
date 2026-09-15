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

      var donnees = new FormData(form);

      if (bouton) { bouton.disabled = true; bouton.textContent = 'Envoi en cours…'; }

      fetch(url, { method: 'POST', body: donnees, headers: { Accept: 'application/json' } })
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
   Plan d'acces charge sur demande
   Google Maps depose des cookies des que la carte s'affiche.
   Tant que personne ne clique, aucune requete ne part : le site
   reste sans cookie, donc sans bandeau de consentement.
   ============================================================ */
(function () {
  var zones = document.querySelectorAll('.carte-attente[data-carte]');
  if (!zones.length) return;

  zones.forEach(function (zone) {
    var bouton = zone.querySelector('button');
    if (!bouton) return;

    function afficher() {
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

    // Si la personne a deja accepte les cookies, le plan s'affiche
    // directement : inutile de lui demander deux fois.
    try {
      if (localStorage.getItem('cnet-consentement') === 'oui') afficher();
    } catch (e) {}

    document.addEventListener('consentement', function (ev) {
      if (ev.detail === 'oui' && document.body.contains(zone)) afficher();
    });
  });
})();


/* ============================================================
   Bandeau de consentement
   Il commande reellement le chargement du plan Google Maps :
   tant qu'il n'y a pas d'accord, aucune requete ne part vers Google.
   Refuser est aussi simple qu'accepter, comme l'exige la CNIL.
   Le choix est garde dans le navigateur de la personne, rien n'est
   envoye nulle part.
   ============================================================ */
(function () {
  var CLE = 'cnet-consentement';

  function lire() {
    try { return localStorage.getItem(CLE); } catch (e) { return null; }
  }
  function ecrire(v) {
    try { localStorage.setItem(CLE, v); } catch (e) {}
  }

  // Previent le reste du site qu'un choix vient d'etre fait
  function diffuser(v) {
    document.dispatchEvent(new CustomEvent('consentement', { detail: v }));
  }

  function construire() {
    var b = document.createElement('div');
    b.className = 'bandeau-cookies';
    b.setAttribute('role', 'dialog');
    b.setAttribute('aria-label', 'Gestion des cookies');
    b.innerHTML =
      '<div class="bandeau-in">' +
        '<p class="bandeau-txt">Ce site n\'utilise aucun traceur publicitaire et ne mesure pas votre navigation. ' +
        'Seul le plan d\'accès, fourni par Google Maps, peut déposer des cookies — et seulement si vous l\'acceptez. ' +
        '<a href="/mentions-legales">En savoir plus</a></p>' +
        '<div class="bandeau-btns">' +
          '<button type="button" class="btn btn-clair" data-choix="non">Refuser</button>' +
          '<button type="button" class="btn btn-plein" data-choix="oui">Accepter</button>' +
        '</div>' +
      '</div>';
    document.body.appendChild(b);

    b.addEventListener('click', function (e) {
      var bt = e.target.closest('[data-choix]');
      if (!bt) return;
      var v = bt.dataset.choix;
      ecrire(v);
      b.remove();
      diffuser(v);
    });
    // laisse le temps au navigateur de peindre avant l'animation
    requestAnimationFrame(function () { b.classList.add('visible'); });
  }

  if (!lire()) construire();

  // Lien « Gérer les cookies » du pied de page
  document.addEventListener('click', function (e) {
    var l = e.target.closest('[data-gerer-cookies]');
    if (!l) return;
    e.preventDefault();
    if (document.querySelector('.bandeau-cookies')) return;
    construire();
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
