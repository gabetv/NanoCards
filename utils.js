// utils.js

/**
 * Mélange un tableau en utilisant l'algorithme de Fisher-Yates.
 * @param {Array} array - Le tableau à mélanger.
 */
export function shuffleDeck(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
}

/**
 * Applique une classe d'animation à un élément pour une durée donnée.
 * @param {HTMLElement} element - L'élément DOM à animer.
 * @param {string} animationClass - La classe CSS contenant l'animation.
 * @param {number} duration - La durée de l'animation en millisecondes.
 * @returns {Promise<void>} Une promesse qui se résout quand l'animation est terminée.
 */
export function playAnimation(element, animationClass, duration = 600) {
    return new Promise((resolve) => {
        if (!element) {
            console.warn("playAnimation: L'élément fourni est nul ou indéfini.");
            resolve();
            return;
        }
        element.classList.add(animationClass);
        setTimeout(() => {
            element.classList.remove(animationClass);
            resolve();
        }, duration);
    });
}

/**
 * Déclenche une animation de tremblement sur l'écran (ou un élément spécifié).
 * @param {string} intensity - 'light' ou 'heavy'.
 * @param {number} duration - Durée en millisecondes.
 * @param {HTMLElement} targetElement - L'élément à secouer (par défaut: document.body).
 * @returns {Promise<void>}
 */
export async function triggerScreenShake(intensity = 'light', duration = 300, targetElement = document.body) {
    if (!targetElement) {
        console.warn("triggerScreenShake: L'élément cible n'existe pas.");
        return;
    }
    const shakeClass = intensity === 'heavy' ? 'animate-screen-shake-heavy' : 'animate-screen-shake-light';
    
    targetElement.classList.add(shakeClass);
    await new Promise(resolve => setTimeout(() => {
        targetElement.classList.remove(shakeClass);
        resolve();
    }, duration));
}

/**
 * Déclenche un effet visuel de flash d'impact au centre de l'écran.
 * @param {number} duration - Durée de l'effet en millisecondes.
 * @param {HTMLElement} impactOverlayElement - L'élément overlay pour le flash.
 * @returns {Promise<void>}
 */
export async function triggerImpactFlash(duration = 500, impactOverlayElement) {
    if (!impactOverlayElement) {
        console.warn("triggerImpactFlash: L'élément d'overlay pour l'impact n'est pas fourni ou n'existe pas.");
        return;
    }
    impactOverlayElement.classList.add('impact-flash-overlay-active');
    // La durée est gérée par l'animation CSS elle-même. On attend juste sa fin.
    await new Promise(resolve => setTimeout(() => {
        impactOverlayElement.classList.remove('impact-flash-overlay-active');
        resolve();
    }, duration)); 
}

/**
 * Affiche un message dans la zone de message du jeu pour une durée limitée.
 * @param {string} message - Le message à afficher.
 * @param {HTMLElement} messageElement - L'élément DOM où afficher le message.
 * @param {number} duration - Durée d'affichage en ms (par défaut 4000ms).
 */
export function displayGameMessage(message, messageElement, duration = 4000) {
    if (!messageElement) {
        console.warn("displayGameMessage: L'élément de message n'est pas fourni.");
        console.log("Jeu Msg:", message); // Log en fallback
        return;
    }
    console.log("Jeu Msg:", message);
    messageElement.textContent = message;
    // Optionnel: ajouter une classe pour animer l'apparition/disparition du message
    // messageElement.classList.add('message-visible'); 

    setTimeout(() => {
        // N'effacer que si c'est toujours le même message (évite d'effacer un nouveau message arrivé entre-temps)
        if (messageElement.textContent === message) {
            messageElement.textContent = "";
            // messageElement.classList.remove('message-visible');
        }
    }, duration);
}


/**
 * Vérifie si un champ donné contient au moins un monstre avec la capacité "PROTECTOR".
 * @param {Array<Object>} field - Le tableau de cartes représentant un champ.
 * @returns {boolean} True si un protecteur est trouvé, false sinon.
 */
export function hasProtector(field) {
    if (!field || !Array.isArray(field)) return false;
    return field.some(card => card && card.type === "Monstre" && card.abilities && card.abilities.includes("PROTECTOR"));
}