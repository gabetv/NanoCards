// main.js
import { loadCardData, getAllCards, createCardInstance as boosterCreateCardInstance } from './cardManager.js';
import { showScreen, displayGameMessage, createCardDOMElement as uiCreateCardDOMElement, showCardInfo as uiShowCardInfo, renderBoosterOpening as uiRenderBoosterOpening } from './uiManager.js';
import * as game from './gameLogic.js';
import { initializeDeckBuilder, addToUserCollection, getUserDeck } from './deckBuilder.js';

// --- Références aux Éléments du DOM ---
const playAiButton = document.getElementById('play-ai-button');
const openBoosterButton = document.getElementById('open-booster-button');
const backToMenuFromBoosterButton = document.getElementById('back-to-menu-from-booster-button');
// const openAnotherBoosterButton = document.getElementById('open-another-booster-button'); // Récupéré dynamiquement dans initializeApp
// const boosterPackVisual = document.getElementById('booster-pack-visual'); // Récupéré dynamiquement dans initializeApp
const quitGameButton = document.getElementById('quit-game-button');
const deckBuilderButton = document.getElementById('deck-builder-button');


// --- Références aux Boutons de Jeu ---
const drawCardButton = document.getElementById('draw-card-button');
const endTurnButton = document.getElementById('end-turn-button');


// --- Fonctions de Gestion du Menu et Booster ---

function handleOpenBoosterClick() { 
    showScreen('booster'); 
}

function actuallyOpenBooster() { 
    const boosterPackVis = document.getElementById('booster-pack-visual');
    const boosterCardsDisplayArea = document.getElementById('booster-cards-area');

    if (boosterPackVis) boosterPackVis.style.display = 'none';
    if (boosterCardsDisplayArea) boosterCardsDisplayArea.style.display = 'flex';

    const allCardsData = getAllCards();
    if (allCardsData.length === 0) {
        displayGameMessage("Données des cartes non chargées. Veuillez patienter ou vérifier la console.");
        const btnOpenAnother = document.getElementById('open-another-booster-button');
        if (btnOpenAnother) btnOpenAnother.style.display = 'block';
        return;
    }
    
    const boosterPack = []; 
    const boosterSize = 5; 
    
    for (let i = 0; i < boosterSize; i++) {
        const randomCardData = allCardsData[Math.floor(Math.random() * allCardsData.length)];
        if (randomCardData) {
            const cardInstance = boosterCreateCardInstance(randomCardData.id); 
            if (cardInstance) {
                boosterPack.push(cardInstance);
                addToUserCollection(randomCardData.id); 
            }
        }
    }

    const dummyGameState = { isPlayerTurn: false, selectedPlayerCard: null, opponentField: [], playerField: [], gameIsOver: true };
    const dummyActions = { 
        onShowInfo: (cardInst) => uiShowCardInfo(cardInst, false) 
    }; 
    
    uiRenderBoosterOpening(boosterPack, dummyGameState, dummyActions);
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
        openBoosterButton.addEventListener('click', handleOpenBoosterClick);
    }
    // Récupérer les éléments du booster ici car ils sont spécifiques à cet écran
    const boosterPackVisualElement = document.getElementById('booster-pack-visual'); 
    if (boosterPackVisualElement) { 
        boosterPackVisualElement.addEventListener('click', actuallyOpenBooster);
    }
    const openAnotherBoosterButtonElement = document.getElementById('open-another-booster-button');
    if (openAnotherBoosterButtonElement) {
        openAnotherBoosterButtonElement.addEventListener('click', handleOpenBoosterClick); 
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