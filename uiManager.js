// uiManager.js
import { playAnimation, triggerScreenShake, triggerImpactFlash, displayGameMessage as utilDisplayGameMessage, hasProtector } from './utils.js';

// --- Références aux Éléments du DOM ---
const mainMenuScreen = document.getElementById('main-menu-screen');
const boosterOpeningScreen = document.getElementById('booster-opening-screen');
const gameBoardElement = document.getElementById('game-board');
const deckBuilderScreenElement = document.getElementById('deck-builder-screen'); 

const deckCountElement = document.getElementById('deck-count');
const playerHandArea = document.getElementById('player-hand-area');
const playerFieldArea = document.getElementById('player-field-area');
const playerGoalCardArea = document.getElementById('player-goal-card-area');
const opponentHandArea = document.getElementById('opponent-hand-area');
const opponentFieldArea = document.getElementById('opponent-field-area');
const opponentGoalCardArea = document.getElementById('opponent-goal-card-area');

const boosterCardsArea = document.getElementById('booster-cards-area');
const boosterPackVisualElement = document.getElementById('booster-pack-visual'); 
const openAnotherBoosterButtonElement = document.getElementById('open-another-booster-button'); 

const gameMessageElement = document.getElementById('game-message');
const impactFlashOverlayElement = document.getElementById('impact-flash-overlay');

const cardInfoPopupElement = document.getElementById('card-info-popup');
const popupCardNameElement = document.getElementById('popup-card-name');
const popupCardTypeElement = document.getElementById('popup-card-type-cost');
const popupCardStatsElement = document.getElementById('popup-card-stats');
const popupCardAbilitiesElement = document.getElementById('popup-card-abilities');
const popupCardDescriptionElement = document.getElementById('popup-card-description');
const closePopupButtonElement = document.getElementById('close-popup-button');


// --- Gestion de l'Affichage des Écrans ---
export function showScreen(screenName) {
    if (mainMenuScreen) mainMenuScreen.classList.remove('active-screen');
    if (boosterOpeningScreen) boosterOpeningScreen.classList.remove('active-screen');
    if (gameBoardElement) gameBoardElement.classList.remove('active-screen');
    if (deckBuilderScreenElement) deckBuilderScreenElement.classList.remove('active-screen'); 
    if (cardInfoPopupElement) cardInfoPopupElement.style.display = 'none';

    if (screenName === 'menu' && mainMenuScreen) {
        mainMenuScreen.classList.add('active-screen');
    } else if (screenName === 'booster' && boosterOpeningScreen) {
        boosterOpeningScreen.classList.add('active-screen');
        // Réinitialiser l'état de l'écran d'ouverture de booster
        if (boosterPackVisualElement) boosterPackVisualElement.style.display = 'flex'; // ou 'block'
        if (boosterCardsArea) {
            boosterCardsArea.style.display = 'none'; 
            boosterCardsArea.innerHTML = ''; 
        }
        if (openAnotherBoosterButtonElement) openAnotherBoosterButtonElement.style.display = 'none';
    } else if (screenName === 'game' && gameBoardElement) {
        gameBoardElement.classList.add('active-screen');
    } else if (screenName === 'deck-builder' && deckBuilderScreenElement) {
        deckBuilderScreenElement.classList.add('active-screen');
    } else {
        console.warn(`showScreen: Nom d'écran inconnu "${screenName}" ou élément DOM non trouvé.`);
    }
}


// --- Affichage des Messages ---
export function displayGameMessage(message, duration = 4000) {
    utilDisplayGameMessage(message, gameMessageElement, duration);
}

// --- Gestion de la Popup d'Info Carte ---
export function showCardInfo(cardInstance, canPlayFromPopup = false, playActionCallback = null) {
    if (!cardInstance || !cardInfoPopupElement) return;

    popupCardNameElement.textContent = cardInstance.name;
    
    const typeSpan = popupCardTypeElement.querySelector('#popup-card-type');
    const costSpan = popupCardTypeElement.querySelector('#popup-card-cost');
    if (typeSpan) typeSpan.textContent = `Type: ${cardInstance.type}`;
    if (costSpan) {
        costSpan.style.display = cardInstance.cost !== undefined ? 'inline' : 'none';
        if (cardInstance.cost !== undefined) costSpan.textContent = `Coût: ${cardInstance.cost}`;
    }

    if (cardInstance.type === "Monstre") {
        popupCardStatsElement.textContent = `ATK: ${cardInstance.atk} / DEF: ${cardInstance.def}`;
        popupCardStatsElement.style.display = 'block';
    } else {
        popupCardStatsElement.style.display = 'none';
    }

    const rarityText = cardInstance.rarity ? `${cardInstance.rarity}` : "Commun"; // Juste le mot pour le span
    let abilitiesText = "";
    if (cardInstance.abilities && cardInstance.abilities.length > 0) {
        abilitiesText = `Capacités: ${cardInstance.abilities.join(', ')} <br>`;
    }
    
    // Construire le contenu HTML pour les capacités et la rareté
    popupCardAbilitiesElement.innerHTML = `${abilitiesText}<span class="rarity-text-popup">Rareté: <span class="rarity-${rarityText.toLowerCase().replace('é', 'e')}">${rarityText}</span></span>`;
    popupCardAbilitiesElement.style.display = 'block'; 

    popupCardDescriptionElement.textContent = cardInstance.description || "Pas de description.";

    const popupActionsDiv = cardInfoPopupElement.querySelector('.popup-actions');
    if (!popupActionsDiv) return;
    popupActionsDiv.innerHTML = ''; 

    if (canPlayFromPopup) {
        const playButton = document.createElement('button');
        playButton.id = 'play-card-from-popup-button';
        playButton.classList.add('menu-button', 'primary-action');
        playButton.textContent = 'Jouer Carte';
        playButton.onclick = () => {
            if (playActionCallback) playActionCallback(cardInstance.instanceId);
            hideCardInfo();
        };
        popupActionsDiv.appendChild(playButton);
    }

    cardInfoPopupElement.style.display = 'flex';
}

export function hideCardInfo() {
    if (cardInfoPopupElement) cardInfoPopupElement.style.display = 'none';
    const popupActionsDiv = cardInfoPopupElement.querySelector('.popup-actions');
    if (popupActionsDiv) popupActionsDiv.innerHTML = '';
}

if (closePopupButtonElement) {
    closePopupButtonElement.addEventListener('click', hideCardInfo);
}


// --- Création des Éléments DOM pour les Cartes ---
export function createCardDOMElement({ cardInstance, owner, location, gameState, actions }) {
    const cardDiv = document.createElement('div');
    cardDiv.dataset.instanceId = cardInstance.instanceId;

    if (cardInstance.rarity) {
        const rarityClass = `rarity-${cardInstance.rarity.toLowerCase().replace(/\s+/g, '-').replace('é', 'e')}`;
        cardDiv.classList.add(rarityClass);
    } else {
        cardDiv.classList.add('rarity-commun'); 
    }

    let isProtector = cardInstance.abilities && cardInstance.abilities.includes("PROTECTOR");
    let isFrozen = !cardInstance.canAttackNextTurn && location === 'field';

    if (location === 'field') {
        if (isProtector) cardDiv.classList.add('is-protector');
        if (isFrozen) cardDiv.classList.add('is-frozen');
    }
    
    let iconClass = "icon-monster"; 
    let iconContent = "❓"; // Default icon content
    if (isProtector) {
        iconClass = "icon-protector";
        iconContent = "🛡️";
    } else if (cardInstance.type === "Monstre") {
        iconClass = "icon-monster";
        iconContent = "⚔️";
    } else if (cardInstance.type === "Magie") {
        iconClass = "icon-spell";
        iconContent = "🔮";
    } else if (cardInstance.type === "Piege") {
        iconClass = "icon-trap";
        iconContent = "⚙️";
    }
    cardDiv.classList.add(iconClass.replace('-icon', '-card-type')); // e.g., monster-card-type

    let statsHTML = '<div class="card-stats-area">&nbsp;</div>';
    if (cardInstance.type === "Monstre") {
        statsHTML = `
            <div class="card-stats-area">
                <span class="stat-box atk-box"><span class="stat-icon icon-atk"></span>${cardInstance.atk}</span>
                <span class="stat-box def-box"><span class="stat-icon icon-def"></span>${cardInstance.def}</span>
            </div>`;
    }

    const placeholderImageClass = cardInstance.placeholderStyle || 'placeholder-default';
    const imageAreaIconContent = `<span class="card-image-icon">${iconContent}</span>`;

    let cardInnerHtmlStructure = `
        <div class="card-header">
            <span class="card-name-text">${cardInstance.name}</span>
        </div>
        <div class="card-image-container">
            <div class="card-image-area ${placeholderImageClass}">
                ${imageAreaIconContent}
            </div>
        </div>
        ${statsHTML}
    `;

    if (location === 'booster' || location === 'collection' || location === 'deck') {
        cardDiv.classList.add('card'); 
        let abilitiesDisplay = '&nbsp;';
        if (cardInstance.abilities && cardInstance.abilities.length > 0) {
            abilitiesDisplay = cardInstance.abilities.join(', ');
        } else if (cardInstance.type !== "Monstre") {
            abilitiesDisplay = cardInstance.type;
        }

        cardDiv.innerHTML = cardInnerHtmlStructure + `
            <div class="card-ability-text">${abilitiesDisplay}</div>
            <div class="card-description-area custom-scrollbar">${cardInstance.description || 'Aucune.'}</div>`;
        
        cardDiv.style.cursor = 'pointer';
        
        if (actions && actions.onShowInfo) {
             cardDiv.addEventListener('click', (e) => { 
                e.stopPropagation(); 
                actions.onShowInfo(cardInstance, false); 
            });
        }
    } else if (location === 'goal') {
        cardDiv.classList.add('goal-card');
        let goalContent = '';
        if (cardInstance.isRevealed) {
            cardDiv.classList.add('revealed');
            goalContent = `
                <div class="card-header goal-header">
                     <span class="card-name-text">${cardInstance.name}</span>
                </div>
                <div class="card-image-container">
                    <div class="card-image-area ${placeholderImageClass}">
                        ${imageAreaIconContent}
                    </div>
                </div>
                <div class="card-desc-goal custom-scrollbar">${cardInstance.description}</div>`;
        } else if (owner === "Joueur") { // Goal card du joueur, non révélée mais visible pour le joueur
            goalContent = `
                <div class="card-header goal-header">
                    <span class="card-name-text">${cardInstance.name}</span>
                </div>
                 <div class="card-image-container">
                    <div class="card-image-area ${placeholderImageClass} player-hidden-goal">
                        ${imageAreaIconContent}
                        <span class="hidden-goal-text-overlay">(Caché)</span>
                    </div>
                </div>
                <div class="card-desc-goal-hidden custom-scrollbar">${cardInstance.description}</div>`;
        } else { // Goal card de l'IA, non révélée
            goalContent = `<div class="card-image-container">
                               <div class="card-image-area ${placeholderImageClass} opponent-hidden-goal">
                                   <span class="card-image-icon">?</span>
                               </div>
                           </div>`;
        }
        cardDiv.innerHTML = goalContent;
         if (actions && actions.onShowInfo && (cardInstance.isRevealed || owner === "Joueur")) {
            cardDiv.addEventListener('click', () => actions.onShowInfo(cardInstance));
        }

        if (owner === "IA" && gameState.isPlayerTurn && gameState.selectedPlayerCard && 
            !gameState.gameIsOver && !cardInstance.isRevealed && 
            !hasProtector(gameState.opponentField) && gameState.selectedPlayerCard.canAttackNextTurn) {
            cardDiv.classList.add('targetable');
            if (actions && actions.onTargetCard) cardDiv.addEventListener('click', (e) => { e.stopPropagation(); actions.onTargetCard(cardInstance); });
        }

    } else { // Cards in hand or field
        cardDiv.classList.add('card');
        if (owner === "Joueur") cardDiv.classList.add('player-card'); else cardDiv.classList.add('opponent-card');

        if (owner === "Joueur" && location === 'hand' && (cardInstance.type === "Monstre")) {
            cardDiv.classList.add('playable');
        }

        if (location === 'field' && cardInstance.hasAttackedThisTurn && !isFrozen) cardDiv.style.opacity = "0.65";
        else if (!isFrozen) cardDiv.style.opacity = "1";

        let abTxt = "";
        if (location === 'field') { 
            if(isProtector) abTxt = `<div class="card-ability-text is-protector-text">Protecteur</div>`;
            else if(isFrozen) abTxt = `<div class="card-ability-text is-frozen-text">Gelé!</div>`;
            else if (cardInstance.type !== "Monstre") abTxt = `<div class="card-ability-text">${cardInstance.type}</div>`; 
            else abTxt = `<div class="card-ability-text">&nbsp;</div>`; 
        } else if (location === 'hand') { 
             if (cardInstance.type !== "Monstre") abTxt = `<div class="card-ability-text">${cardInstance.type}</div>`;
             else abTxt = `<div class="card-ability-text">&nbsp;</div>`;
        } else {
            abTxt = `<div class="card-ability-text">&nbsp;</div>`;
        }
        
        // Description is generally not shown on small in-game cards for space reasons
        cardDiv.innerHTML = cardInnerHtmlStructure + abTxt;


        if (!gameState.gameIsOver) {
            if (owner === "Joueur") {
                if (location === 'hand') { 
                    if (actions && actions.onShowInfo) cardDiv.addEventListener('click', () => { actions.onShowInfo(cardInstance, true, actions.onPlayCard); });
                } else if (location === 'field' && cardInstance.type === "Monstre") {
                    if (!cardInstance.hasAttackedThisTurn && cardInstance.canAttackNextTurn) { 
                        if (actions && actions.onSelectCardForAttack) cardDiv.addEventListener('click', () => { actions.onSelectCardForAttack(cardInstance.instanceId); if (actions.onShowInfo) actions.onShowInfo(cardInstance); });
                    } else { 
                        if (actions && actions.onShowInfo) cardDiv.addEventListener('click', () => actions.onShowInfo(cardInstance)); 
                    }
                } else if (location === 'field') { // Non-monster card on field (if ever possible)
                    if (actions && actions.onShowInfo) cardDiv.addEventListener('click', () => actions.onShowInfo(cardInstance));
                }
            } else if (owner === "IA" && location === 'field' && cardInstance.type === "Monstre") {
                const canBeTargeted = gameState.isPlayerTurn && gameState.selectedPlayerCard && gameState.selectedPlayerCard.canAttackNextTurn &&
                                      (!hasProtector(gameState.opponentField) || (isProtector)); 
                if (canBeTargeted) {
                    cardDiv.classList.add('targetable');
                    if (actions && actions.onTargetCard) cardDiv.addEventListener('click', (e) => { e.stopPropagation(); actions.onTargetCard(cardInstance); });
                } else { 
                    if (actions && actions.onShowInfo) cardDiv.addEventListener('click', () => actions.onShowInfo(cardInstance));
                }
            } else { // IA hand (no interaction) or other non-interactive states
                if (actions && actions.onShowInfo && location !== 'hand') cardDiv.addEventListener('click', () => actions.onShowInfo(cardInstance));
            }
        } else { // Game is over, only show info
            if (actions && actions.onShowInfo) cardDiv.addEventListener('click', () => actions.onShowInfo(cardInstance));
        }
    }
    return cardDiv;
}

// --- Fonctions de Rendu des Zones ---
function renderZone(areaElement, title, cards, owner, location, gameState, actions, isGoalZone = false) {
    if (!areaElement) return;
    areaElement.innerHTML = `<h2>${title}</h2>`;
    
    if (isGoalZone) {
        for (let i = 0; i < 4; i++) {
            if (cards[i]) {
                areaElement.appendChild(createCardDOMElement({ cardInstance: cards[i], owner, location, gameState, actions }));
            } else {
                const p = document.createElement('div');
                p.classList.add('goal-card', 'destroyed-placeholder'); // Updated class
                p.innerHTML = `<div class="goal-destroyed-text">(Vide)</div>`; // Changed text for clarity
                areaElement.appendChild(p);
            }
        }
    } else if (location === 'hand' && owner === 'IA') {
        if (cards.length === 0) {
            areaElement.innerHTML += '<p class="empty-zone-text">(Vide)</p>';
        } else {
            cards.forEach(() => {
                const p = document.createElement('div');
                p.classList.add('card-placeholder'); // This class needs styling for square shape
                areaElement.appendChild(p);
            });
        }
    } else {
        if (cards.length === 0 && location !== 'hand') { // Don't show (Vide) for player's empty hand
             areaElement.innerHTML += '<p class="empty-zone-text">(Vide)</p>';
        } else {
            cards.forEach(c => areaElement.appendChild(createCardDOMElement({ cardInstance: c, owner, location, gameState, actions })));
        }
    }

    if (location === 'field' && owner === 'Joueur' && gameState.selectedPlayerCard && cards.find(c => c.instanceId === gameState.selectedPlayerCard.instanceId)) {
        const el = areaElement.querySelector(`.card[data-instance-id="${gameState.selectedPlayerCard.instanceId}"]`);
        if (el) el.classList.add('selected');
    }
}

export function renderPlayerHand(playerHand, gameState, actions) { renderZone(playerHandArea, 'Ma Main', playerHand, "Joueur", "hand", gameState, actions); }
export function renderPlayerField(playerField, gameState, actions) { renderZone(playerFieldArea, 'Mon Terrain', playerField, "Joueur", "field", gameState, actions); }
export function renderPlayerGoalCards(playerGoalCards, gameState, actions) { renderZone(playerGoalCardArea, 'Mes Objectifs', playerGoalCards, "Joueur", "goal", gameState, actions, true); }
export function renderOpponentHand(opponentHand) { renderZone(opponentHandArea, 'Main IA', opponentHand, "IA", "hand", {}, {}); }
export function renderOpponentField(opponentField, gameState, actions) { renderZone(opponentFieldArea, 'Terrain IA', opponentField, "IA", "field", gameState, actions); }
export function renderOpponentGoalCards(opponentGoalCards, gameState, actions) { renderZone(opponentGoalCardArea, 'Objectifs IA', opponentGoalCards, "IA", "goal", gameState, actions, true); }

// --- Booster Opening Enhancements ---
async function triggerLegendaryShine(cardElement) {
    if (!cardElement) return;
    const shineOverlay = document.createElement('div');
    shineOverlay.classList.add('legendary-shine-overlay');
    if (cardElement.firstChild) {
        cardElement.insertBefore(shineOverlay, cardElement.firstChild);
    } else {
        cardElement.appendChild(shineOverlay);
    }
    await new Promise(resolve => setTimeout(() => {
        if (shineOverlay.parentNode) { 
            shineOverlay.remove();
        }
        resolve();
    }, 1200)); 
}

export function renderBoosterOpening(boosterPack, gameState, actions) {
    if (!boosterCardsArea || !openAnotherBoosterButtonElement) { // boosterPackVisualElement est géré par showScreen et main.js
        console.error("renderBoosterOpening: boosterCardsArea ou openAnotherBoosterButtonElement sont manquants.");
        return;
    }
    
    boosterCardsArea.innerHTML = ''; // Vider la zone
    // boosterCardsArea.style.display = 'flex'; // Déjà fait par actuallyOpenBooster dans main.js

    if (boosterPack.length === 0) {
        boosterCardsArea.innerHTML = '<p class="empty-zone-text">Quelque chose s\'est mal passé, booster vide !</p>';
        if (openAnotherBoosterButtonElement) openAnotherBoosterButtonElement.style.display = 'block';
        return;
    }

    const cardPromises = boosterPack.map((cardInstance, index) => {
        return new Promise(resolve => {
            const cardElement = createCardDOMElement({ 
                cardInstance, 
                owner: "booster", 
                location: "booster", 
                gameState, 
                actions 
            });
            
            cardElement.classList.add('booster-card-appear');
            cardElement.style.animationDelay = `${index * 0.15}s`;

            cardElement.addEventListener('animationend', async (event) => {
                // S'assurer que c'est bien l'animation 'card-appear' qui se termine
                if (event.animationName === 'card-appear') { 
                    cardElement.classList.remove('booster-card-appear'); 
                    if (cardInstance.rarity === "Légendaire") {
                        await triggerLegendaryShine(cardElement);
                    } else if (cardInstance.rarity === "Épique") { // Changed from "epique" to "Épique" to match JSON
                        cardElement.classList.add('highlight-rare-card'); 
                    }
                }
                resolve(); 
            }, { once: true }); // Important pour que resolve ne soit appelé qu'une fois par carte
            
            boosterCardsArea.appendChild(cardElement);
        });
    });

    Promise.all(cardPromises).then(() => {
        if (openAnotherBoosterButtonElement) openAnotherBoosterButtonElement.style.display = 'block';
    }).catch(error => {
        console.error("Erreur lors de l'animation des cartes du booster:", error);
        if (openAnotherBoosterButtonElement) openAnotherBoosterButtonElement.style.display = 'block'; // Afficher quand même en cas d'erreur
    });
}


export function updateDeckCount(count) { if (deckCountElement) deckCountElement.textContent = count; }

export function getGameMessageElement() { return gameMessageElement; }
export function getImpactFlashOverlayElement() { return impactFlashOverlayElement; }

export async function uiTriggerScreenShake(intensity, duration) {
    await triggerScreenShake(intensity, duration, document.body);
}
export async function uiTriggerImpactFlash(duration) {
    await triggerImpactFlash(duration, impactFlashOverlayElement);
}

export function setTurnIndicator(actor, gameIsOver = false) { 
    const drawButton = document.getElementById('draw-card-button');
    const endTurnButton = document.getElementById('end-turn-button');

    if (gameIsOver) { 
        if (drawButton) drawButton.disabled = true;
        if (endTurnButton) endTurnButton.disabled = true;
    } else if (actor === 'Joueur') {
        if (drawButton) drawButton.disabled = false;
        if (endTurnButton) endTurnButton.disabled = false;
    } else { 
        if (drawButton) drawButton.disabled = true;
        if (endTurnButton) endTurnButton.disabled = true;
    }
}