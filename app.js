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
