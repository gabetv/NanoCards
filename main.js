// main.js
import { loadCardData, getAllCards, createCardInstance as boosterCreateCardInstance } from './cardManager.js';
import { showScreen, displayGameMessage, createCardDOMElement as uiCreateCardDOMElement, showCardInfo as uiShowCardInfo, renderBoosterOpening as uiRenderBoosterOpening } from './uiManager.js'; // Importer spécifiquement ce dont on a besoin
import * as game from './gameLogic.js';
import { initializeDeckBuilder, addToUserCollection, getUserDeck } from './deckBuilder.js';

// --- Références aux Éléments du DOM ---
const playAiButton = document.getElementById('play-ai-button');
const openBoosterButton = document.getElementById('open-booster-button');
const backToMenuFromBoosterButton = document.getElementById('back-to-menu-from-booster-button');
const openAnotherBoosterButton = document.getElementById('open-another-booster-button');
const quitGameButton = document.getElementById('quit-game-button');
const deckBuilderButton = document.getElementById('deck-builder-button');

// --- Références aux Boutons de Jeu ---
const drawCardButton = document.getElementById('draw-card-button');
const endTurnButton = document.getElementById('end-turn-button');


// --- Fonctions de Gestion du Menu et Booster ---
function handleOpenBooster() {
    const allCardsData = getAllCards();
    if (allCardsData.length === 0) {
        displayGameMessage("Données des cartes non chargées. Veuillez patienter ou vérifier la console.");
        return;
    }
    
    const boosterPack = []; // Contient des instances de cartes pour l'affichage
    const boosterSize = 5; 
    
    for (let i = 0; i < boosterSize; i++) {
        const randomCardData = allCardsData[Math.floor(Math.random() * allCardsData.length)];
        if (randomCardData) {
            const cardInstance = boosterCreateCardInstance(randomCardData.id); 
            if (cardInstance) {
                boosterPack.push(cardInstance);
                addToUserCollection(randomCardData.id); // Ajoute l'ID de base à la collection
            }
        }
    }

    // gameState et actions pour l'affichage du booster (principalement pour onShowInfo)
    const dummyGameState = { isPlayerTurn: false, selectedPlayerCard: null, opponentField: [], playerField: [], gameIsOver: true };
    const dummyActions = { 
        onShowInfo: (cardInst) => uiShowCardInfo(cardInst, false) // La popup ne permettra pas de jouer la carte depuis le booster
    }; 
    
    // Utiliser la fonction renderBoosterOpening de uiManager.js
    uiRenderBoosterOpening(boosterPack, dummyGameState, dummyActions);
    showScreen('booster');
}


// --- Initialisation de l'Application ---
async function initializeApp() {
    const cardsLoaded = await loadCardData(); 
    
    if (!cardsLoaded) {
        displayGameMessage("ERREUR CRITIQUE: Impossible de charger les données du jeu. L'application ne peut pas démarrer.");
        if(playAiButton) playAiButton.disabled = true;
        if(openBoosterButton) openBoosterButton.disabled = true;
        if(deckBuilderButton) deckBuilderButton.disabled = true; 
        return;
    }

    if (playAiButton) {
        playAiButton.addEventListener('click', () => {
            const currentDeck = getUserDeck();
            if (!currentDeck || currentDeck.length < 20) {
                displayGameMessage("Votre deck doit contenir au moins 20 cartes. Veuillez visiter l'Éditeur de Deck.", 5000);
                return;
            }
            game.setupNewGame();
        });
    }

    if (openBoosterButton) {
        openBoosterButton.addEventListener('click', handleOpenBooster);
    }
    if (openAnotherBoosterButton) {
        openAnotherBoosterButton.addEventListener('click', handleOpenBooster); 
    }
    if (backToMenuFromBoosterButton) {
        backToMenuFromBoosterButton.addEventListener('click', () => showScreen('menu'));
    }

    if (deckBuilderButton) {
        deckBuilderButton.addEventListener('click', () => {
            initializeDeckBuilder({ 
                createCardDOMElement: uiCreateCardDOMElement, 
                displayGameMessage: displayGameMessage,
                showScreen: showScreen,
                showCardInfo: uiShowCardInfo 
            }); 
            showScreen('deck-builder');
        });
    }

    if (drawCardButton) {
        drawCardButton.addEventListener('click', game.handlePlayerDrawCard);
    }
    if (endTurnButton) {
        endTurnButton.addEventListener('click', game.endPlayerTurn);
    }
    if (quitGameButton) {
        quitGameButton.addEventListener('click', () => {
            if (confirm("Êtes-vous sûr de vouloir quitter la partie et retourner au menu principal ?")) {
                game.quitGame();
            }
        });
    }
    
    showScreen('menu'); 
}

initializeApp();