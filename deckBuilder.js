// deckBuilder.js
import { getAllCards, createCardInstance } from './cardManager.js';

const MAX_DECK_SIZE = 40;
const MIN_DECK_SIZE = 20;
const MAX_COPIES_PER_CARD = 3;

let userCollection = {};
let userDeck = [];

let deckBuilderScreen, collectionArea, currentDeckArea, deckCountElement, saveDeckButton, backToMenuFromDeckBuilderButton, autoDeckButton;

let uiCreateCardDOMElement;
let uiDisplayGameMessage;
let uiShowScreen;
let uiShowCardInfo;

function loadUserCollection() {
    const savedCollection = localStorage.getItem('userCardCollection');
    userCollection = savedCollection ? JSON.parse(savedCollection) : {};
    // Pour démo: ajouter quelques cartes si la collection est vide
    if (Object.keys(userCollection).length === 0) {
        console.log("Collection vide, ajout de cartes de démo.");
        const demoCards = ["m001", "m002", "m003", "m004", "m005", "m006", "m007", "s001", "s002", "s003", "s004", "s005", "s006", "s007", "s008"];
        demoCards.forEach(id => {
            userCollection[id] = (userCollection[id] || 0) + MAX_COPIES_PER_CARD; // Donner 3 copies de chaque
        });
        saveUserCollection();
    }
}

export function saveUserCollection() {
    localStorage.setItem('userCardCollection', JSON.stringify(userCollection));
}

export function addToUserCollection(cardId, quantity = 1) {
    loadUserCollection(); // S'assurer qu'on travaille sur la dernière version
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
    // Optionnel: valider le deck ici avant de le retourner
    return savedDeck ? JSON.parse(savedDeck) : [];
}

function renderCollection() {
    if (!collectionArea) { console.error("renderCollection: collectionArea non défini"); return; }
    collectionArea.innerHTML = '<h2>Ma Collection</h2>';
    const allCardDefinitions = getAllCards();

    if (Object.keys(userCollection).length === 0) {
        collectionArea.innerHTML += '<p class="empty-zone-text">Aucune carte dans votre collection. Ouvrez des boosters !</p>';
        return;
    }

    const sortedCollectionIds = Object.keys(userCollection).sort((a,b) => {
        const cardA = allCardDefinitions.find(c => c.id === a);
        const cardB = allCardDefinitions.find(c => c.id === b);
        if (!cardA || !cardB) return 0;
        if (cardA.type !== cardB.type) return cardA.type.localeCompare(cardB.type);
        // Optionnel: trier par rareté puis par nom
        const rarityOrder = { "Commun": 0, "Rare": 1, "Épique": 2, "Légendaire": 3 };
        const rarityA = rarityOrder[cardA.rarity] ?? -1;
        const rarityB = rarityOrder[cardB.rarity] ?? -1;
        if (rarityA !== rarityB) return rarityB - rarityA; // Plus rare en premier
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

        const displayCardInstance = { ...cardInstance }; // Utiliser une copie pour l'affichage
        displayCardInstance.name = `${cardData.name} (x${availableToAdd})`; // Afficher le compte disponible

        const cardElement = uiCreateCardDOMElement({
            cardInstance: displayCardInstance,
            owner: 'collection', // Pas vraiment un owner, juste un contexte
            location: 'collection', // Spécifier que c'est pour la collection
            gameState: {}, // Pas d'état de jeu pertinent ici
            actions: { onShowInfo: (inst) => { if(uiShowCardInfo) uiShowCardInfo(cardInstance, false); } } // Afficher info de l'instance originale
        });

        if (availableToAdd > 0 && userDeck.length < MAX_DECK_SIZE && countInDeck < MAX_COPIES_PER_CARD) {
            cardElement.style.cursor = 'pointer';
            // Retirer l'ancien listener et ajouter le nouveau pour éviter les doublons si la fonction est appelée plusieurs fois
            const newCardElement = cardElement.cloneNode(true); // Cloner pour supprimer les anciens listeners
            newCardElement.addEventListener('click', (e) => {
                // Si le clic vient de l'intérieur (ex: bouton sur la carte), ne pas ajouter au deck
                if (e.target !== newCardElement && !newCardElement.contains(e.target)) return; 
                addCardToDeck(cardId);
            });
            collectionArea.appendChild(newCardElement);

        } else {
            cardElement.style.opacity = '0.6'; 
            cardElement.style.cursor = 'not-allowed';
            // Permettre de voir l'info même si non ajoutable
            cardElement.addEventListener('click', (e) => {
                e.stopPropagation(); 
                if(uiShowCardInfo) uiShowCardInfo(cardInstance, false);
            });
            collectionArea.appendChild(cardElement);
        }
    }
}

function renderCurrentDeck() {
    if (!currentDeckArea) { console.error("renderCurrentDeck: currentDeckArea non défini"); return; }
    currentDeckArea.innerHTML = '<h2>Mon Deck Actuel</h2>';
    const allCardDefinitions = getAllCards();

    if (userDeck.length === 0) {
        currentDeckArea.innerHTML += '<p class="empty-zone-text">Votre deck est vide. Cliquez sur les cartes de votre collection pour les ajouter.</p>';
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
        const rarityOrder = { "Commun": 0, "Rare": 1, "Épique": 2, "Légendaire": 3 };
        const rarityA = rarityOrder[cardA.rarity] ?? -1;
        const rarityB = rarityOrder[cardB.rarity] ?? -1;
        if (rarityA !== rarityB) return rarityB - rarityA;
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
            owner: 'deck', // Contexte
            location: 'deck', // Spécifier que c'est pour le deck
            gameState: {},
            actions: { onShowInfo: (inst) => { if(uiShowCardInfo) uiShowCardInfo(cardInstance, false); } } 
        });
        cardElement.style.cursor = 'pointer';
        
        const newCardElement = cardElement.cloneNode(true);
        newCardElement.addEventListener('click', (e) => {
            if (e.target !== newCardElement && !newCardElement.contains(e.target)) return;
            removeCardFromDeck(cardId);
        });
        currentDeckArea.appendChild(newCardElement);
    }
    if (deckCountElement) {
        deckCountElement.textContent = `${userDeck.length} / ${MAX_DECK_SIZE}`;
        deckCountElement.classList.remove('count-ok', 'count-error');
        if (userDeck.length < MIN_DECK_SIZE || userDeck.length > MAX_DECK_SIZE) {
            deckCountElement.style.color = 'var(--danger-accent)';
            deckCountElement.classList.add('count-error');
        } else {
            deckCountElement.style.color = 'var(--secondary-accent)'; 
            deckCountElement.classList.add('count-ok');
        }
    }
}

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
        if (uiDisplayGameMessage) uiDisplayGameMessage(`Vous n'avez plus de copies disponibles de "${cardName}" dans votre collection.`);
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

function autoFillDeck() {
    if (uiDisplayGameMessage) uiDisplayGameMessage("Construction automatique du deck...", 2000);
    userDeck = []; 

    const allCardDefinitions = getAllCards();
    let availableCardsForAutoDeck = []; 

    for (const cardId in userCollection) {
        const countInCollection = userCollection[cardId];
        if (countInCollection > 0) {
            const cardDef = allCardDefinitions.find(c => c.id === cardId);
            // Pour l'instant, l'auto-deck se concentre sur les monstres pour simplifier
            if (cardDef && cardDef.type === "Monstre") { 
                availableCardsForAutoDeck.push({
                    id: cardId,
                    countInCollection: countInCollection,
                    isProtector: cardDef.abilities && cardDef.abilities.includes("PROTECTOR"),
                    atk: cardDef.atk || 0,
                    def: cardDef.def || 0 // Ajouter def pour potentiels tris
                });
            }
        }
    }

    if (availableCardsForAutoDeck.length === 0) {
        if (uiDisplayGameMessage) uiDisplayGameMessage("Aucun monstre dans votre collection pour créer un deck auto.", 3000);
        refreshDeckBuilderUI();
        return;
    }

    // Stratégie simple : Prioriser les protecteurs, puis les monstres à haute ATK
    // Viser MIN_DECK_SIZE
    
    // 1. Ajouter des Protecteurs (jusqu'à MAX_COPIES_PER_CARD)
    const protectors = availableCardsForAutoDeck.filter(c => c.isProtector);
    protectors.sort((a, b) => b.atk - a.atk); // Les plus forts protecteurs d'abord

    for (const protector of protectors) {
        let copiesToAdd = Math.min(protector.countInCollection, MAX_COPIES_PER_CARD);
        for (let i = 0; i < copiesToAdd; i++) {
            if (userDeck.length < MIN_DECK_SIZE) {
                userDeck.push(protector.id);
            } else {
                break; // Limite MIN_DECK_SIZE atteinte
            }
        }
        if (userDeck.length >= MIN_DECK_SIZE) break;
    }

    // 2. Ajouter d'autres Monstres (les plus forts en ATK d'abord)
    if (userDeck.length < MIN_DECK_SIZE) {
        const otherMonsters = availableCardsForAutoDeck.filter(c => !c.isProtector);
        otherMonsters.sort((a, b) => b.atk - a.atk); 

        for (const monster of otherMonsters) {
            let copiesCurrentlyInDeck = userDeck.filter(id => id === monster.id).length;
            let copiesToAdd = Math.min(monster.countInCollection - copiesCurrentlyInDeck, MAX_COPIES_PER_CARD - copiesCurrentlyInDeck);

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
    
    // 3. Failsafe: Si toujours pas assez, ajouter aléatoirement des monstres restants (respectant MAX_COPIES)
    let failsafeIteration = 0; 
    const allAvailableMonstersSortedRandomly = availableCardsForAutoDeck.sort((a,b) => Math.random() - 0.5); 
    while (userDeck.length < MIN_DECK_SIZE && failsafeIteration < 50) { // Limite d'itérations pour éviter boucle infinie
        let cardAddedInLoop = false;
        for (const monster of allAvailableMonstersSortedRandomly) {
            if (userDeck.length >= MIN_DECK_SIZE) break;
            
            let copiesCurrentlyInDeck = userDeck.filter(id => id === monster.id).length;
            if (copiesCurrentlyInDeck < monster.countInCollection && copiesCurrentlyInDeck < MAX_COPIES_PER_CARD) {
                userDeck.push(monster.id);
                cardAddedInLoop = true;
            }
        }
        failsafeIteration++;
        if (!cardAddedInLoop && userDeck.length < MIN_DECK_SIZE) { // Si aucune carte n'a pu être ajoutée
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
    deckBuilderScreen = document.getElementById('deck-builder-screen');
    collectionArea = document.getElementById('deck-builder-collection-area');
    currentDeckArea = document.getElementById('deck-builder-deck-area');
    deckCountElement = document.getElementById('deck-builder-deck-count');
    saveDeckButton = document.getElementById('deck-builder-save-button');
    backToMenuFromDeckBuilderButton = document.getElementById('back-to-menu-from-deck-builder');
    autoDeckButton = document.getElementById('deck-builder-auto-button');

    uiCreateCardDOMElement = uiFuncs.createCardDOMElement;
    uiDisplayGameMessage = uiFuncs.displayGameMessage;
    uiShowScreen = uiFuncs.showScreen;
    uiShowCardInfo = uiFuncs.showCardInfo;

    if (!saveDeckButton || !backToMenuFromDeckBuilderButton || !autoDeckButton || !collectionArea || !currentDeckArea || !deckCountElement) {
        console.error("DeckBuilder: Un ou plusieurs éléments DOM essentiels n'ont pas été trouvés.");
        if (uiDisplayGameMessage) uiDisplayGameMessage("Erreur: Impossible d'initialiser l'éditeur de deck. Éléments manquants.", 5000);
        return;
    }

    loadUserCollection();
    loadUserDeck();
    refreshDeckBuilderUI(); 

    // S'assurer que les listeners ne sont ajoutés qu'une fois en clonant et remplaçant les boutons
    // Ceci est une bonne pratique si initializeDeckBuilder peut être appelé plusieurs fois.
    const newSaveButton = saveDeckButton.cloneNode(true);
    saveDeckButton.parentNode.replaceChild(newSaveButton, saveDeckButton);
    saveDeckButton = newSaveButton; // Réassigner à la variable globale
    saveDeckButton.addEventListener('click', () => { if (saveUserDeck()) { /* Optionnel: action après sauvegarde réussie */ } });

    const newBackButton = backToMenuFromDeckBuilderButton.cloneNode(true);
    backToMenuFromDeckBuilderButton.parentNode.replaceChild(newBackButton, backToMenuFromDeckBuilderButton);
    backToMenuFromDeckBuilderButton = newBackButton;
    backToMenuFromDeckBuilderButton.addEventListener('click', () => { if (uiShowScreen) uiShowScreen('menu'); });

    const newAutoDeckButton = autoDeckButton.cloneNode(true);
    autoDeckButton.parentNode.replaceChild(newAutoDeckButton, autoDeckButton);
    autoDeckButton = newAutoDeckButton;
    autoDeckButton.addEventListener('click', autoFillDeck);
}