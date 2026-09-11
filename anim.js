/* Charge dans le <head>, avant l'affichage.
   Il ne fait qu'une chose : signaler que les animations peuvent s'appliquer.
   Si ce fichier ne se charge pas, la classe est absente et tout le contenu
   reste visible — le site ne depend jamais de l'animation pour etre lisible.
   On respecte aussi le reglage systeme « reduire les animations ». */
(function () {
  try {
    if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    document.documentElement.className += ' anim';
  } catch (e) {}
})();
