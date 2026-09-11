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

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      if (ok) ok.hidden = true;
      if (ko) ko.hidden = true;

      // Piege a robots : le champ est invisible pour un humain.
      // S'il est rempli, on fait semblant d'accepter sans rien envoyer.
      var piege = form.querySelector('[name="_gotcha"]');
      if (piege && piege.value) { form.reset(); if (ok) ok.hidden = false; return; }

      var url = form.dataset.endpoint;
      if (!url || url.indexOf('VOTRE_IDENTIFIANT') !== -1) {
        if (ko) ko.hidden = false;
        return;
      }

      var donnees = new FormData(form);
      if (form.dataset.sujet) donnees.append('_subject', form.dataset.sujet + ' — site Clair & Net');

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
