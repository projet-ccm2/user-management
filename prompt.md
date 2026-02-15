# context

quand on se connecte actuellement ça juste met a jour/creer l'utilisateur sur l'app.
Mais un utilisateur peu avoir accès a des chaine en temps que moderateur

# objectif 1

après l'update ou create d'un user il faut get sur l'api twitch les chaine ou il est moderateur et ses moderateur de sa chaine
et les mettre dans les are qui sont les "liaison" (donc si il est modo chez quelqu'un ou il a ses modo) si ça n'existe pas deja dans la db et que la chaine lié existe dans la db (ou mettre a jour si ça n'est plus le cas (changement de userType ou simplement plus moderateur donc la c'est une delete))

la doc de are
https://github.com/projet-ccm2/DB-gateway/blob/develop/doc/are.md


la doc pour get les channels : https://github.com/projet-ccm2/DB-gateway/blob/develop/doc/channels.md

# objectif 2 

on a les user certe mais c'est aussi des channel dans la connexion donc meme logique que pour user. si ça existe pas tu add. si ça existe tu update
et tu ajoute a are si le user et/ou channel n'existe pas pour les lié avec le userType "owner"

# autre

met un "//TODO :  endpoint db not implement" si il manque un endpoint dans la doc (et c'est sur que ça va manqué)
et fait un markdown des endpoint manquand (il seront mis a jour quand tout sera implementé mais faut les listé)

si tu as des question pose les