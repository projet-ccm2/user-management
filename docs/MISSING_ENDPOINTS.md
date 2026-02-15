# Endpoints DB-gateway manquants

Ce document liste les endpoints du DB-gateway qui ne sont pas encore implémentés côté API mais qui sont nécessaires pour une synchronisation complète (users, channels, liaisons ARE). Il sera mis à jour lorsque ces endpoints seront disponibles.

Référence : [DB-gateway (develop)](https://github.com/projet-ccm2/DB-gateway/tree/develop)

---

## Channels

| Endpoint (souhaité) | Description |
| ------------------- | ----------- |
| **GET /channels?name=** ou **GET /channels/by-name/:name** | Récupérer un channel par nom (ex. login Twitch) pour éviter de créer des doublons et pour obtenir l’`id` (UUID) après un échec de création (nom déjà existant). |

---

## Are (liaisons User ↔ Channel)

| Endpoint (souhaité) | Description |
| ------------------- | ----------- |
| **PUT /are** (ou PATCH) | Mettre à jour le `userType` d’une liaison existante (ex. changement de rôle). |
| **DELETE /are** | Supprimer une liaison (ex. un utilisateur n’est plus modérateur sur une chaîne). |

---

## Notes

- Sans **GET channel par name**, la création de la chaîne “owner” ou des chaînes où l’utilisateur est mod peut échouer si une chaîne avec le même nom existe déjà, et on ne peut pas récupérer l’`id` existant.
- Sans **PUT** et **DELETE** sur ARE, on ne peut pas mettre à jour un rôle ni retirer une liaison quand un modérateur est révoqué ou qu’un user n’est plus mod sur une chaîne.
