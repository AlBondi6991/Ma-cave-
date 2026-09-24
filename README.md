# Ma Cave 🍷

Application de gestion de cave à vins, dans l'esprit d'Oeni.

## Fonctionnalités

- **Inventaire** : domaine, cuvée, millésime, couleur, pays / région / appellation, cépages, format, prix d'achat, valeur estimée, fournisseur. Recherche plein texte, filtres (couleur, garde, région) et tris.
- **Plan de cave visuel** : casiers en grille (rangées × colonnes), rangement rapide des bouteilles, déplacement / échange de cases, surlignage d'un vin, sortie d'une bouteille depuis sa case.
- **Apogée et alertes** : fenêtre de garde (à boire dès / apogée / jusqu'à), statut calculé (à garder, prêt, apogée, à boire vite, passé), liste « À boire maintenant » et alerte sur les vins passés.
- **Dégustations** : notes sur 20 (œil, nez, bouche, accord mets-vin), proposées à chaque bouteille bue.
- **Historique et statistiques** : entrées / sorties (bu, offert, vendu, cassé), valeur et plus-value, répartition par couleur, région, millésime, consommation mensuelle.
- **Scan d'étiquette** : une photo remplit la fiche. Ouverte dans claude.ai, l'app fait lire l'étiquette par Claude (garde estimée comprise) ; ailleurs, un OCR embarqué (Tesseract, français) lit domaine, millésime, appellation et format, sans connexion.
- **Accords mets-vins** : choisis un plat ou tape-le (« magret », « huîtres »…) et l'app propose les bouteilles de ta cave, les meilleurs accords et les plus mûres d'abord. Chaque fiche vin suggère aussi ses plats. Dans claude.ai, bouton « Demander à Claude ».
- **App installable (PWA)** : manifest, icônes, service worker ; s'ouvre hors connexion une fois installée.
- **Sauvegarde** : export / import JSON, cave d'exemple pour découvrir l'app.

Les données sont stockées localement dans le navigateur (`localStorage`).

## Développement

```bash
npm install
npm run dev        # serveur de développement
npm test           # tests unitaires (logique de cave)
npm run build      # vérification des types + build de production
```

Stack : React 19, TypeScript, Vite, Tailwind CSS 4, React Router, Recharts.

## Structure

- `src/lib/cellar.ts` : opérations pures sur l'état de la cave (stock, casiers, dégustations), testées dans `cellar.test.ts`
- `src/lib/status.ts` : calcul du statut de garde
- `src/lib/stats.ts` : agrégats pour le tableau de bord et les statistiques
- `src/lib/store.ts` : persistance locale et hook `useCellar`
- `src/pages/` : écrans (accueil, vins, fiche, formulaire, plan de cave, dégustations, stats, réglages)
