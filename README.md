# dotastup
Remplissage rapide commande de stupéfiants hospitaliers

## Lancer l'interface

```bash
npm install
npm start
```

Puis ouvrir `http://127.0.0.1:3000`.

## Ce que fait l'outil

- choix du service `Neurochir` ou `Chir 3`
- saisie directe de la quantite a commander pour chaque stupefiant
- selection des produits a renouveler
- generation d'un ou plusieurs formulaires PDF de demande deja remplis
- mise a disposition des feuilles de tracabilite vierges correspondant aux produits coches
- ouverture ou telechargement des PDF un par un depuis l'interface

## Hypothese actuelle

Pour `Chir 3`, le champ service du formulaire de demande est rempli avec `CHIR THOR`, car c'est l'intitule visible dans les PDFs de tracabilite fournis.
