# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Stack

Static single HTML file (vanilla JS, Leaflet from cdnjs), published on GitHub Pages. No framework.

## Users

Un couple en train de choisir le lieu de leur mariage, en France (Loire, Rhône, Beaujolais, Ain, Drôme et alentours). Usage surtout sur téléphone, le soir, pour trier, mettre en favori, noter, comparer. Parfois sur ordinateur. Langue : français.

## Product Purpose

Il n'existe pas de catalogue regroupant tous les lieux selon leurs critères. La page agrège des lieux de mariage (capacité d'au moins 100 invités, hébergement sur place ou à proximité d'au moins 40 couchages, à 1h de Lyon ou 1h30 de Saint-Étienne) avec carte, photos, trajets réels, et un suivi personnel (statut, notes). Succès : réduire la liste à quelques lieux à visiter.

## Positioning

Un catalogue filtré sur les critères exacts du couple, avec temps de trajet réels depuis deux villes et suivi personnel, ce qu'aucun annuaire généraliste ne propose.

## Operating Context

Données relevées sur Mariages.net et Bridebook le 08/10/2026 (capacité, couchages, prix, traiteur, photos), géocodées via l'API Adresse et trajets calculés avec OSRM. Les statuts et notes restent dans le navigateur (localStorage).

## Capabilities and Constraints

251 lieux. Carte Leaflet/OpenStreetMap, liste avec photo, popup de fiche (photo, adresse, capacité, hébergement, prix, traiteur, liens), filtres (zone, type, invités, couchages, budget, trajet Lyon / Saint-Étienne, avec photo), tri, statuts (favori, à contacter, visité, écarté), notes, copie de la shortlist. Les chiffres sont à confirmer auprès de chaque lieu. Photos hébergées chez les annuaires (hotlink).

## Brand Commitments

Aucun nom ni identité imposés. Le titre peut évoluer. Pas de promesse commerciale inventée.

## Evidence on Hand

data/v2/final.json (lieux, adresses, coordonnées, trajets, URLs de photos validées). 47 lieux sans photo.

## Product Principles

1. Les photos font tomber amoureux, les chiffres font décider : les deux doivent être lisibles d'un coup d'œil.
2. Le téléphone est le premier écran.
3. Dire honnêtement ce qui est incertain (chiffres à vérifier) sans noyer l'interface.
4. Le suivi personnel (favoris, notes) est aussi important que la recherche.

## Accessibility & Inclusion

Contraste lisible, cibles tactiles confortables, navigation clavier du popup, respect de prefers-reduced-motion.
