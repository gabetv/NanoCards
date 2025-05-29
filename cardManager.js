// cardManager.js
import { shuffleDeck } from './utils.js';

let allCards = []; // Stocke toutes les définitions de cartes de cards.json
let instanceIdCounter = 0; // Pour donner un ID unique à chaque instance de carte

/**
 * Charge les données des cartes depuis le fichier JSON.
 * Doit être appelée une fois au démarrage de l'application.
 * @returns {Promise<boolean>} True si le chargement réussit, false sinon.
 */
export async function loadCardData() {
    if (allCards.length > 0) return true; // Déjà chargées
    try {
        const response = await fetch('cards.json');
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        allCards = await response.json();
        console.log("Données des cartes chargées avec succès.", allCards.length, "cartes trouvées.");
        return true;
    } catch (error) {
        console.error("Erreur critique : Impossible de charger les données des cartes depuis cards.json :", error);
        // On pourrait afficher un message à l'utilisateur ici si l'élément existe déjà
        // uiManager.displayGameMessage("Erreur critique: Données des cartes introuvables!", uiManager.getGameMessageElement());
        return false;
    }
}

/**
 * Récupère toutes les définitions de cartes chargées.
 * @returns {Array<Object>} Un tableau de toutes les cartes.
 */
export function getAllCards() {
    return allCards;
}

/**
 * Crée une instance unique d'une carte basée sur son ID de définition.
 * @param {string} cardId - L'ID de la carte à instancier (depuis cards.json).
 * @returns {Object|null} L'objet de l'instance de carte ou null si l'ID n'est pas trouvé.
 */
export function createCardInstance(cardId) {
    const cardData = allCards.find(c => c.id === cardId);
    if (!cardData) {
        console.error(`createCardInstance: Données non trouvées pour la carte ID: ${cardId}`);
        return null;
    }
    instanceIdCounter++;
    return {
        ...cardData, // Copie toutes les propriétés de la carte de base
        instanceId: `inst-${instanceIdCounter}`, // ID unique pour cette copie spécifique
        hasAttackedThisTurn: false,
        isRevealed: false, // Pour les cartes objectif
        canAttackNextTurn: true, // Pour l'effet de gel
        // Ajoutez ici d'autres états dynamiques si nécessaire (ex: currentPS pour points de structure)
    };
}

/**
 * Initialise un deck avec des cartes Monstre (pour l'IA ou en fallback pour le joueur).
 * @param {Array<string>} deckArray - Le tableau (vide) qui sera rempli avec les ID des cartes.
 * @param {number} deckSize - La taille souhaitée du deck.
 */
export function initializeDeck(deckArray, deckSize = 20) {
    if (allCards.length === 0) {
        console.error("initializeDeck: Les données des cartes ne sont pas chargées. Impossible de créer le deck.");
        return;
    }
    deckArray.length = 0; // Vider le tableau existant
    const monsterCards = allCards.filter(card => card.type === "Monstre");

    if (monsterCards.length === 0) {
        console.error("initializeDeck: Aucune carte de type 'Monstre' trouvée dans cards.json.");
        return;
    }

    // Remplir le deck jusqu'à la taille désirée en répétant les monstres disponibles
    for (let i = 0; i < deckSize; i++) {
        deckArray.push(monsterCards[i % monsterCards.length].id);
    }
    
    shuffleDeck(deckArray); // Mélanger le deck
    console.log(`Deck initialisé (par défaut) avec ${deckArray.length} cartes.`);
}


/**
 * Initialise les cartes Objectif pour un joueur.
 * Sélectionne aléatoirement 4 cartes Magie/Piège.
 * @param {Array<Object>} goalCardArray - Le tableau (vide) qui sera rempli avec les instances des cartes objectif.
 */
export function initializeGoalCards(goalCardArray) {
    if (allCards.length === 0) {
        console.error("initializeGoalCards: Les données des cartes ne sont pas chargées.");
        return;
    }
    goalCardArray.length = 0;
    const spellTrapCards = allCards.filter(card => card.type === "Magie" || card.type === "Piege");

    if (spellTrapCards.length === 0) {
        console.warn("initializeGoalCards: Aucune carte Magie/Piège disponible pour les objectifs.");
        for (let i = 0; i < 4; i++) goalCardArray.push(null); 
        return;
    }
    
    const shuffledSpellTraps = [...spellTrapCards]; 
    shuffleDeck(shuffledSpellTraps); 

    for (let i = 0; i < 4; i++) {
        const cardData = shuffledSpellTraps[i % shuffledSpellTraps.length];
        if (cardData) {
            const cardInstance = createCardInstance(cardData.id);
            if (cardInstance) {
                goalCardArray.push(cardInstance);
            } else {
                goalCardArray.push(null); 
            }
        } else {
             goalCardArray.push(null); 
        }
    }
    console.log(`Cartes Objectif initialisées avec ${goalCardArray.filter(c => c).length} cartes.`);
}