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
      if (piege && piege.value) { form.reset(); if (ok) ok.hidden = false; return; }

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

    bouton.addEventListener('click', function () {
      var cadre = document.createElement('iframe');
      cadre.src = zone.dataset.carte;
      cadre.title = zone.dataset.titre || 'Plan d\'acces';
      cadre.loading = 'lazy';
      cadre.referrerPolicy = 'no-referrer-when-downgrade';
      cadre.allowFullscreen = true;
      cadre.style.height = getComputedStyle(zone).height;
      zone.parentNode.replaceChild(cadre, zone);
    });
  });
})();
