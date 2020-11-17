var express = require('express');
var serve_static = require('serve-static');
var http = require('http');

/* définition classe pour une session */
class Session
{
    constructor(pseudo, socket)
    {
        this.pseudo = pseudo;
        this.socket = socket;
    }

    setPartie(partie)
    {
        this.partie = partie;
    }

    setType(type)
    {
        this.type = type;
    }
}

/* définition classe pour une partie */
class Partie
{
    constructor(sessionX,sessionO)
    {
        this.sessionX = sessionX;
        this.sessionO = sessionO;
        /* initialisation grille */
        this.grille = [];
        for (let i=0; i < 9; i++)
        {
            this.grille.push(' ');
        }
        /* choix aléatoire du tour */
        if(Math.round(Math.random()) == 0)
        {
            this.tour = 'X';
        }
        else
        {
            this.tour = 'O';
        }
    }

    /* envoie le type (X ou O) aux clients */
    envoyerType()
    {
        this.sessionO.socket.emit('type',"O");
        this.sessionX.socket.emit('type',"X");
    }

    /* envoie le pion qui doit jouer le prochain tour */
    envoyerTour()
    {
        this.sessionO.socket.emit('tour', this.tour);
        this.sessionX.socket.emit('tour', this.tour);
    }

    /* envoie la grille aux clients */
    envoyerGrille()
    {
        this.sessionO.socket.emit('grille', this.grille);
        this.sessionX.socket.emit('grille', this.grille);
    }

    /* inverse les tours */
    changerTour()
    {
        if (this.tour === 'X')
            this.tour = 'O';
        else if (this.tour === 'O')
            this.tour = 'X';
    }

    /* teste si la partie est finie pour le type envoyé
     * renvoie nulle si la partie est nulle 
     * renvoie null si rien de spécial
     */
    testFin(type)
    {
        let compteur = 0;
        /* tests d'alignement sur une ligne */
        for(let i=0; i < 3; i++)
        {
            if(this.grille[i] === type)
            {
                compteur += 1;
            }
        }
        if(compteur == 3)
            return type;

        compteur = 0;
        for(let i=3; i < 6; i++)
        {
            if(this.grille[i] === type)
            {
                compteur += 1;
            }
        }
        if(compteur == 3)
            return type;

        compteur = 0;
        for(let i=6; i < 9; i++)
        {
            if(this.grille[i] === type)
            {
                compteur += 1;
            }
        }
        if(compteur == 3)
            return type;

        compteur = 0;
        /* tests d'alignement sur une colonne */
        for(let i=0; i < 9; i+=3)
        {
            if(this.grille[i] === type)
            {
                compteur += 1;
            }
        }
        if(compteur == 3)
            return type;

        compteur = 0;
        for(let i=1; i < 9; i+=3)
        {
            if(this.grille[i] === type)
            {
                compteur += 1;
            }
        }
        if(compteur == 3)
            return type;

        compteur = 0;
        for(let i=2; i < 9; i+=3)
        {
            if(this.grille[i] === type)
            {
                compteur += 1;
            }
        }
        if(compteur == 3)
            return type;

        compteur = 0;
        /* tests diagonales */
        if(this.grille[0] === type)
        {
            compteur += 1;
        }
        if(this.grille[4] === type)
        {
            compteur += 1;
        }
        if(this.grille[8] === type)
        {
            compteur += 1;
        }
        if(compteur == 3)
            return type;

        compteur = 0;
        if(this.grille[2] === type)
        {
            compteur += 1;
        }
        if(this.grille[4] === type)
        {
            compteur += 1;
        }
        if(this.grille[6] === type)
        {
            compteur += 1;
        }
        if(compteur == 3)
            return type;

        compteur = 0;
        /* test de grille remplie */
        for(let i=0; i<9; i++)
        {
            if(this.grille[i] === ' ')
            {
                compteur+=1;
            }
        }
        if (compteur == 0)
        {
            return "nulle";
        }

        return null;
    }

    /* envoie un message au vainqueur ou aux perdants */
    envoyerResultat(resultat)
    {
        switch(resultat)
        {
            case 'nulle':
                this.sessionO.socket.emit('resultat','nulle');
                this.sessionX.socket.emit('resultat','nulle');
                break;
            case 'X':
                this.sessionO.socket.emit('resultat','defaite');
                this.sessionX.socket.emit('resultat','victoire');
                break;
            case 'O':
                this.sessionO.socket.emit('resultat','victoire');
                this.sessionX.socket.emit('resultat','defaite');
                break;
        }
    }

    /* jouer un tour avec le numéro de case choisie pour le coup
     * null pour envoyer la grille et le tour
     */
    jouer(numeroCase, type)
    {
        /* vérification si un coup est joué */
        if(numeroCase != null)
        {
            /* vérification si le joueur qui joue est le bon */
            if(type === this.tour)
            {
                /* vérification si la case est libre */
                if(this.grille[numeroCase] === ' ')
                {
                    /* jouer le coup */
                    this.grille[numeroCase] = type;
                    let resultat = this.testFin(type);
                    if(resultat == null)
                        this.changerTour();
                    else
                    {
                        this.envoyerGrille();
                        this.tour = ' ';
                        this.envoyerResultat(resultat);
                        return;
                    }
                }
                else
                {
                    console.log("la case n'est pas libre");
                    return;
                }
            }
            else
            {
                console.log("ce n'est pas à son tour");
                return;
            }
        }
        this.envoyerGrille();
        this.envoyerTour();
    }
}
var joueurEnAttente = undefined; // variable pour le joueur en attente

var app = express();
/* Activation du serveur statique */
app.use(serve_static(__dirname+"/public"));
/* Récupération du serveur http de l'application */
var serveur = http.Server(app);

/* Écoute sur un seul port */
serveur.listen(8080, function()
    {
        console.log("Serveur en écoute sur le port 8080");
    }
);

/* Gestion du temps réel */
var io = require('socket.io').listen(serveur);

io.sockets.on('connection', function(socket)
    {
        console.log("Un client s'est connecté");

        socket.on('disconnect', function()
            {
                console.log("Un client s'est déconnecté");
            }
        );

        /* gestion d'un nouveau joueur qui a entré son pseudo */
        socket.on('nouveauJoueur', function(pseudo)
            {
                socket.emit('validationSession',pseudo);
                if(typeof(joueurEnAttente) != "undefined")// vérification d'un joueur en file d'attente
                {
                    socket.session = new Session(pseudo, socket); // création session
                    let partie = new Partie(joueurEnAttente, socket.session); // création partie
                    joueurEnAttente = undefined;
                    partie.sessionO.setPartie(partie); // affectation partie
                    partie.sessionX.setPartie(partie); // affectation partie
                    partie.sessionO.setType('O');
                    partie.sessionX.setType('X');
                    partie.sessionO.socket.emit('partieTrouvee',partie.sessionX.pseudo);
                    partie.sessionX.socket.emit('partieTrouvee',partie.sessionO.pseudo);
                    partie.envoyerType();
                    partie.jouer(null);
                }
                else
                {
                    socket.session = new Session(pseudo, socket); // création session
                    joueurEnAttente = socket.session // mise en file d'attente
                    socket.emit('miseEnFileDAttente');
                }
            }
        );

        /* gestion d'un coup joué par un joueur */
        socket.on('coupJoue', function(numeroCase)
            {
                console.log(socket.session.pseudo + " (" + socket.session.type + ") joue sur la case " + numeroCase);
                socket.session.partie.jouer(numeroCase, socket.session.type);
            }
        );
    }
);
