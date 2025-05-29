// deckBuilder.js
import { getAllCards, createCardInstance } from './cardManager.js';

const MAX_DECK_SIZE = 40;
const MIN_DECK_SIZE = 20;
const MAX_COPIES_PER_CARD = 3;

let userCollection = {};
let userDeck = [];

// Déplacer les références DOM à l'intérieur d'initializeDeckBuilder ou les réassigner
let deckBuilderScreen, collectionArea, currentDeckArea, deckCountElement, saveDeckButton, backToMenuFromDeckBuilderButton, autoDeckButton;

let uiCreateCardDOMElement;
let uiDisplayGameMessage;
let uiShowScreen;
let uiShowCardInfo;

// ... (loadUserCollection, saveUserCollection, addToUserCollection, loadUserDeck, saveUserDeck, getUserDeck restent inchangés) ...
function loadUserCollection() {
    const savedCollection = localStorage.getItem('userCardCollection');
    userCollection = savedCollection ? JSON.parse(savedCollection) : {};
}

export function saveUserCollection() {
    localStorage.setItem('userCardCollection', JSON.stringify(userCollection));
}

export function addToUserCollection(cardId, quantity = 1) {
    loadUserCollection();
    userCollection[cardId] = (userCollection[cardId] || 0) + quantity;
    saveUserCollection();
}

function loadUserDeck() {
    const savedDeck = localStorage.getItem('userCustomDeck');
    userDeck = savedDeck ? JSON.parse(savedDeck) : [];
}

function saveUserDeck() {
    if (userDeck.length < MIN_DECK_SIZE) {
        if (uiDisplayGameMessage) uiDisplayGameMessage(`Votre deck doit contenir au moins ${MIN_DECK_SIZE} cartes pour être sauvegardé et utilisé.`, 5000);
        return false;
    }
    if (userDeck.length > MAX_DECK_SIZE) { 
        if (uiDisplayGameMessage) uiDisplayGameMessage(`Votre deck ne peut pas dépasser ${MAX_DECK_SIZE} cartes.`, 5000);
        return false;
    }
    localStorage.setItem('userCustomDeck', JSON.stringify(userDeck));
    if (uiDisplayGameMessage) uiDisplayGameMessage('Deck sauvegardé !');
    return true;
}

export function getUserDeck() {
    const savedDeck = localStorage.getItem('userCustomDeck');
    return savedDeck ? JSON.parse(savedDeck) : [];
}


// --- Fonctions de Rendu (renderCollection, renderCurrentDeck) ---
// ... (identiques à la version précédente, assurez-vous qu'elles utilisent `collectionArea`, `currentDeckArea` etc. qui seront initialisés)
function renderCollection() {
    if (!collectionArea) { console.error("renderCollection: collectionArea non défini"); return; }
    collectionArea.innerHTML = '<h2>Ma Collection</h2>';
    const allCardDefinitions = getAllCards();

    if (Object.keys(userCollection).length === 0) {
        collectionArea.innerHTML += '<p style="width:100%; text-align:center; color: var(--text-color-medium); padding-top: 20px;">Aucune carte dans votre collection. Ouvrez des boosters !</p>';
        return;
    }

    const sortedCollectionIds = Object.keys(userCollection).sort((a,b) => {
        const cardA = allCardDefinitions.find(c => c.id === a);
        const cardB = allCardDefinitions.find(c => c.id === b);
        if (!cardA || !cardB) return 0;
        if (cardA.type !== cardB.type) return cardA.type.localeCompare(cardB.type);
        return cardA.name.localeCompare(cardB.name);
    });


    for (const cardId of sortedCollectionIds) {
        const countInCollection = userCollection[cardId];
        if (countInCollection <= 0) continue;

        const cardData = allCardDefinitions.find(c => c.id === cardId);
        if (!cardData) continue;

        const cardInstance = createCardInstance(cardId); 

        const countInDeck = userDeck.filter(id => id === cardId).length;
        const availableToAdd = countInCollection - countInDeck;

        const displayCardInstance = { ...cardInstance };
        displayCardInstance.name = `${cardData.name} (x${availableToAdd})`;

        const cardElement = uiCreateCardDOMElement({
            cardInstance: displayCardInstance,
            owner: 'collection',
            location: 'booster', 
            gameState: {}, 
            actions: { onShowInfo: (inst) => { if(uiShowCardInfo) uiShowCardInfo(cardInstance, false); } } 
        });

        if (availableToAdd > 0 && userDeck.length < MAX_DECK_SIZE && countInDeck < MAX_COPIES_PER_CARD) {
            cardElement.style.cursor = 'pointer';
            cardElement.addEventListener('click', () => addCardToDeck(cardId));
        } else {
            cardElement.style.opacity = '0.5'; 
            cardElement.style.cursor = 'not-allowed';
            cardElement.addEventListener('click', (e) => {
                e.stopPropagation(); 
                if(uiShowCardInfo) uiShowCardInfo(cardInstance, false);
            });
        }
        collectionArea.appendChild(cardElement);
    }
}

function renderCurrentDeck() {
    if (!currentDeckArea) { console.error("renderCurrentDeck: currentDeckArea non défini"); return; }
    currentDeckArea.innerHTML = '<h2>Mon Deck Actuel</h2>';
    const allCardDefinitions = getAllCards();

    if (userDeck.length === 0) {
        currentDeckArea.innerHTML += '<p style="width:100%; text-align:center; color: var(--text-color-medium); padding-top: 20px;">Votre deck est vide. Cliquez sur les cartes de votre collection pour les ajouter.</p>';
    }

    const deckCardCounts = {};
    userDeck.forEach(cardId => {
        deckCardCounts[cardId] = (deckCardCounts[cardId] || 0) + 1;
    });
    
    const sortedDeckIds = Object.keys(deckCardCounts).sort((a,b) => {
        const cardA = allCardDefinitions.find(c => c.id === a);
        const cardB = allCardDefinitions.find(c => c.id === b);
        if (!cardA || !cardB) return 0;
        if (cardA.type !== cardB.type) return cardA.type.localeCompare(cardB.type);
        return cardA.name.localeCompare(cardB.name);
    });


    for (const cardId of sortedDeckIds) {
        const countInDeck = deckCardCounts[cardId];
        const cardData = allCardDefinitions.find(c => c.id === cardId);
        if (!cardData) continue;

        const cardInstance = createCardInstance(cardId);
        const displayCardInstance = { ...cardInstance };
        displayCardInstance.name = `${cardData.name} (x${countInDeck})`;

        const cardElement = uiCreateCardDOMElement({
            cardInstance: displayCardInstance,
            owner: 'deck',
            location: 'booster', 
            gameState: {},
            actions: { onShowInfo: (inst) => { if(uiShowCardInfo) uiShowCardInfo(cardInstance, false); } } 
        });
        cardElement.style.cursor = 'pointer';
        cardElement.addEventListener('click', () => removeCardFromDeck(cardId));
        currentDeckArea.appendChild(cardElement);
    }
    if (deckCountElement) {
        deckCountElement.textContent = `${userDeck.length} / ${MAX_DECK_SIZE}`;
        if (userDeck.length < MIN_DECK_SIZE) {
            deckCountElement.style.color = 'var(--danger-accent)';
        } else if (userDeck.length > MAX_DECK_SIZE) {
            deckCountElement.style.color = 'var(--danger-accent)'; 
        }
        else {
            deckCountElement.style.color = 'var(--secondary-accent)'; 
        }
    }
}


// --- Logique d'Ajout/Retrait du Deck (addCardToDeck, removeCardFromDeck) ---
// ... (identiques à la version précédente)
function addCardToDeck(cardId) {
    const countInDeck = userDeck.filter(id => id === cardId).length;
    const countInCollection = userCollection[cardId] || 0;
    const cardData = getAllCards().find(c => c.id === cardId);
    const cardName = cardData ? cardData.name : cardId;

    if (userDeck.length >= MAX_DECK_SIZE) {
        if (uiDisplayGameMessage) uiDisplayGameMessage(`Votre deck ne peut pas dépasser ${MAX_DECK_SIZE} cartes.`);
        return;
    }
    if (countInDeck >= MAX_COPIES_PER_CARD) {
        if (uiDisplayGameMessage) uiDisplayGameMessage(`Vous ne pouvez pas avoir plus de ${MAX_COPIES_PER_CARD} copies de "${cardName}".`);
        return;
    }
    if (countInDeck >= countInCollection) { 
        if (uiDisplayGameMessage) uiDisplayGameMessage(`Vous n'avez plus de copies disponibles de "${cardName}" pour ajouter.`);
        return;
    }

    userDeck.push(cardId);
    refreshDeckBuilderUI();
}

function removeCardFromDeck(cardIdToRemove) {
    const cardIndex = userDeck.findIndex(id => id === cardIdToRemove); 
    if (cardIndex > -1) {
        userDeck.splice(cardIndex, 1);
        refreshDeckBuilderUI();
    }
}

// --- Fonction Deck Automatique (autoFillDeck) ---
// ... (identique à la version précédente)
function autoFillDeck() {
    if (uiDisplayGameMessage) uiDisplayGameMessage("Construction automatique du deck...", 2000);
    userDeck = []; 

    const allCardDefinitions = getAllCards();
    let availableCards = []; 

    for (const cardId in userCollection) {
        const count = userCollection[cardId];
        if (count > 0) {
            const cardDef = allCardDefinitions.find(c => c.id === cardId);
            if (cardDef && cardDef.type === "Monstre") { 
                availableCards.push({
                    id: cardId,
                    countInCollection: count,
                    isProtector: cardDef.abilities && cardDef.abilities.includes("PROTECTOR"),
                    atk: cardDef.atk || 0 
                });
            }
        }
    }

    if (availableCards.length === 0) {
        if (uiDisplayGameMessage) uiDisplayGameMessage("Aucun monstre dans votre collection pour créer un deck auto.", 3000);
        refreshDeckBuilderUI();
        return;
    }

    const protectors = availableCards.filter(c => c.isProtector);
    protectors.sort((a, b) => b.atk - a.atk); 

    for (const protector of protectors) {
        let copiesToAdd = Math.min(protector.countInCollection, MAX_COPIES_PER_CARD);
        for (let i = 0; i < copiesToAdd; i++) {
            if (userDeck.length < MIN_DECK_SIZE) {
                userDeck.push(protector.id);
            } else {
                break;
            }
        }
        if (userDeck.length >= MIN_DECK_SIZE) break;
    }

    if (userDeck.length < MIN_DECK_SIZE) {
        const otherMonsters = availableCards.filter(c => !c.isProtector);
        otherMonsters.sort((a, b) => b.atk - a.atk); 

        for (const monster of otherMonsters) {
            let copiesInDeck = userDeck.filter(id => id === monster.id).length;
            let copiesToAdd = Math.min(monster.countInCollection, MAX_COPIES_PER_CARD - copiesInDeck);

            for (let i = 0; i < copiesToAdd; i++) {
                if (userDeck.length < MIN_DECK_SIZE) {
                    userDeck.push(monster.id);
                } else {
                    break;
                }
            }
            if (userDeck.length >= MIN_DECK_SIZE) break;
        }
    }
    
    let failsafeIteration = 0; 
    while (userDeck.length < MIN_DECK_SIZE && failsafeIteration < 50) {
        let cardAddedInLoop = false;
        const allAvailableMonstersSorted = availableCards.sort((a,b) => Math.random() - 0.5); 
        for (const monster of allAvailableMonstersSorted) {
            if (userDeck.length >= MIN_DECK_SIZE) break;
            
            let copiesInDeck = userDeck.filter(id => id === monster.id).length;
            if (copiesInDeck < monster.countInCollection && copiesInDeck < MAX_COPIES_PER_CARD) {
                userDeck.push(monster.id);
                cardAddedInLoop = true;
            }
        }
        failsafeIteration++;
        if (!cardAddedInLoop && userDeck.length < MIN_DECK_SIZE) {
            if (uiDisplayGameMessage) uiDisplayGameMessage(`Impossible de compléter le deck à ${MIN_DECK_SIZE} cartes avec la collection actuelle. Deck actuel: ${userDeck.length} cartes.`, 4000);
            break; 
        }
    }

    refreshDeckBuilderUI();
}


function refreshDeckBuilderUI() {
    if (!uiCreateCardDOMElement) {
        console.error("DeckBuilder: Fonctions UI non initialisées pour le rendu.");
        return;
    }
    renderCollection();
    renderCurrentDeck();
}

export function initializeDeckBuilder(uiFuncs) {
    // Initialiser les références DOM ici, car l'écran est maintenant visible
    deckBuilderScreen = document.getElementById('deck-builder-screen');
    collectionArea = document.getElementById('deck-builder-collection-area');
    currentDeckArea = document.getElementById('deck-builder-deck-area');
    deckCountElement = document.getElementById('deck-builder-deck-count');
    saveDeckButton = document.getElementById('deck-builder-save-button');
    backToMenuFromDeckBuilderButton = document.getElementById('back-to-menu-from-deck-builder');
    autoDeckButton = document.getElementById('deck-builder-auto-button');

    // Stocker les fonctions UI passées
    uiCreateCardDOMElement = uiFuncs.createCardDOMElement;
    uiDisplayGameMessage = uiFuncs.displayGameMessage;
    uiShowScreen = uiFuncs.showScreen;
    uiShowCardInfo = uiFuncs.showCardInfo;

    if (!saveDeckButton || !backToMenuFromDeckBuilderButton || !autoDeckButton || !collectionArea || !currentDeckArea || !deckCountElement) {
        console.error("DeckBuilder: Un ou plusieurs éléments DOM essentiels n'ont pas été trouvés dans initializeDeckBuilder.");
        // Afficher un message à l'utilisateur si possible, ou retourner pour éviter d'autres erreurs.
        if (uiDisplayGameMessage) uiDisplayGameMessage("Erreur: Impossible d'initialiser l'éditeur de deck. Éléments manquants.", 5000);
        return;
    }

    loadUserCollection();
    loadUserDeck();
    refreshDeckBuilderUI(); // Appeler après que les éléments DOM sont assignés

    // Utiliser une variable locale pour les boutons pour éviter de modifier les const globales
    // et s'assurer que les listeners sont sur les bons éléments après clonage (si toujours nécessaire)
    // Le clonage est une bonne pratique pour s'assurer de la fraîcheur du listener.
    let currentSaveButton = saveDeckButton;
    let currentBackButton = backToMenuFromDeckBuilderButton;
    let currentAutoButton = autoDeckButton;

    const newSaveButton = currentSaveButton.cloneNode(true);
    currentSaveButton.parentNode.replaceChild(newSaveButton, currentSaveButton);
    newSaveButton.addEventListener('click', () => { if (saveUserDeck()) { /* ... */ } });
    // saveDeckButton = newSaveButton; // Si vous aviez besoin de réassigner la variable globale

    const newBackButton = currentBackButton.cloneNode(true);
    currentBackButton.parentNode.replaceChild(newBackButton, currentBackButton);
    newBackButton.addEventListener('click', () => { if (uiShowScreen) uiShowScreen('menu'); });
    // backToMenuFromDeckBuilderButton = newBackButton;

    const newAutoDeckButton = currentAutoButton.cloneNode(true);
    currentAutoButton.parentNode.replaceChild(newAutoDeckButton, currentAutoButton);
    newAutoDeckButton.addEventListener('click', autoFillDeck);
    // autoDeckButton = newAutoDeckButton;
}