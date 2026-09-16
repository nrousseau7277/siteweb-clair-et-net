#!/usr/bin/env python3
"""Reconstruit sitemap.xml a partir des pages du site.

A lancer avant d'envoyer des modifications :  python3 outils/maj-sitemap.py

Pour chaque page HTML :
  - l'adresse vient de sa balise « canonical », donc jamais de doublon ni de www ;
  - la date vient du dernier enregistrement Git de ce fichier, donc toujours juste ;
  - une page marquee « noindex » est ecartee.
L'ordre suit ORDRE : les pages importantes d'abord.
Ce dossier « outils » n'est pas publie sur le site (voir .vercelignore).
"""
import glob
import os
import re
import subprocess
import sys

RACINE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ORDRE = ['index.html', 'services.html', 'devis.html', 'credit-impot.html',
         'contact.html', 'postuler.html', 'mentions-legales.html']


def date_du_fichier(fichier):
    """Date du dernier enregistrement Git, ou date de modification du fichier."""
    try:
        d = subprocess.run(['git', 'log', '-1', '--format=%cs', '--', fichier],
                           cwd=RACINE, capture_output=True, text=True).stdout.strip()
        if d:
            return d
    except Exception:
        pass
    import datetime
    horodatage = os.path.getmtime(os.path.join(RACINE, fichier))
    return datetime.date.fromtimestamp(horodatage).isoformat()


def pages():
    trouvees = [os.path.basename(f) for f in glob.glob(os.path.join(RACINE, '*.html'))]
    connues = [p for p in ORDRE if p in trouvees]
    # Une page ajoutee sans etre listee dans ORDRE est quand meme prise, a la fin
    return connues + sorted(set(trouvees) - set(connues))


def main():
    lignes, ignorees = [], []
    for page in pages():
        contenu = open(os.path.join(RACINE, page), encoding='utf-8').read()
        if re.search(r'name="robots"[^>]*noindex', contenu):
            ignorees.append(page + ' (noindex)')
            continue
        adresse = re.search(r'<link rel="canonical" href="([^"]+)"', contenu)
        if not adresse:
            ignorees.append(page + ' (pas d\'adresse canonique)')
            continue
        lignes.append('  <url><loc>%s</loc><lastmod>%s</lastmod></url>'
                      % (adresse.group(1), date_du_fichier(page)))

    sortie = ('<?xml version="1.0" encoding="UTF-8"?>\n'
              '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'
              + '\n'.join(lignes) + '\n</urlset>\n')
    chemin = os.path.join(RACINE, 'sitemap.xml')
    avant = open(chemin, encoding='utf-8').read() if os.path.exists(chemin) else ''
    open(chemin, 'w', encoding='utf-8').write(sortie)

    print('%d page(s) dans le sitemap%s' % (len(lignes), ' — inchange' if sortie == avant else ' — mis a jour'))
    for i in ignorees:
        print('  ecartee :', i)
    return 0


if __name__ == '__main__':
    sys.exit(main())
