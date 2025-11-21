// Configurazione Firebase
// Credenziali progetto: camporosso-3140d
const firebaseConfig = {
    apiKey: 'AIzaSyAgHsgl1Y0NgKubA77u6fsHtUORA8CzGE0',
    authDomain: 'camporosso-3140d.firebaseapp.com',
    projectId: 'camporosso-3140d',
    storageBucket: 'camporosso-3140d.firebasestorage.app',
    messagingSenderId: '366784778430',
    appId: '1:366784778430:web:0e3d553ed0355462678eef',
    measurementId: 'G-8T3Q7WSYE3'
};

// Variabili globali Firebase
let firebaseApp = null;
let firebaseDb = null;
let firebaseAuth = null;
let initAttempts = 0;
const MAX_INIT_ATTEMPTS = 50; // 5 secondi totali (50 * 100ms)

// Esporta anche su window per accesso globale
if (typeof window !== 'undefined') {
    window.firebaseApp = null;
    window.firebaseDb = null;
    window.firebaseAuth = null;
}

function initFirebase() {
    initAttempts++;
    
    // Attendi che Firebase SDK sia caricato
    if (typeof firebase === 'undefined') {
        if (initAttempts < MAX_INIT_ATTEMPTS) {
            if (initAttempts % 10 === 0) {
                console.log(`⏳ Attendo Firebase SDK... (tentativo ${initAttempts}/${MAX_INIT_ATTEMPTS})`);
            }
            setTimeout(initFirebase, 100);
            return;
        } else {
            console.error('❌ Firebase SDK non caricato dopo', MAX_INIT_ATTEMPTS, 'tentativi');
            console.error('Verifica che gli script Firebase siano inclusi prima di firebase-config.js');
            return;
        }
    }

    // Verifica che i moduli necessari siano disponibili
    if (!firebase.apps || typeof firebase.initializeApp !== 'function') {
        console.error('Firebase SDK non completo. Assicurati di includere gli script:');
        console.error('1. firebase-app-compat.js');
        console.error('2. firebase-firestore-compat.js');
        console.error('3. firebase-auth-compat.js');
        console.error('4. firebase-config.js');
        return;
    }

    // Verifica la configurazione (measurementId è opzionale)
    const requiredFields = ['apiKey', 'authDomain', 'projectId', 'storageBucket', 'messagingSenderId', 'appId'];
    const missingFields = [];
    const invalidFields = [];
    
    requiredFields.forEach(field => {
        const value = firebaseConfig[field];
        if (!value || typeof value !== 'string' || value.length === 0) {
            missingFields.push(field);
        } else if (value.startsWith('INSERISCI_FIREBASE')) {
            invalidFields.push(field);
        }
    });

    if (missingFields.length > 0 || invalidFields.length > 0) {
        console.error('❌ Config Firebase non valida:');
        if (missingFields.length > 0) {
            console.error('  Campi mancanti:', missingFields);
        }
        if (invalidFields.length > 0) {
            console.error('  Campi non configurati:', invalidFields);
        }
        console.error('Config attuale:', firebaseConfig);
        return;
    }
    
    console.log('✅ Configurazione Firebase valida');

    try {
        // Inizializza Firebase app se non già inizializzata
        if (firebase.apps && firebase.apps.length > 0) {
            firebaseApp = firebase.app();
            console.log('✅ Firebase app già inizializzata');
        } else {
            firebaseApp = firebase.initializeApp(firebaseConfig);
            console.log('✅ Firebase app inizializzata');
        }

        // Inizializza Firestore e Auth
        if (typeof firebase.firestore === 'function') {
            firebaseDb = firebase.firestore();
        } else {
            console.error('Firebase Firestore non disponibile');
        }

        if (typeof firebase.auth === 'function') {
            firebaseAuth = firebase.auth();
        } else {
            console.error('Firebase Auth non disponibile');
        }

        // Esporta globalmente per altri script
        if (typeof window !== 'undefined') {
            window.firebaseApp = firebaseApp;
            window.firebaseDb = firebaseDb;
            window.firebaseAuth = firebaseAuth;
        }

        // Esporta anche come variabili globali (per compatibilità)
        if (typeof globalThis !== 'undefined') {
            globalThis.firebaseApp = firebaseApp;
            globalThis.firebaseDb = firebaseDb;
            globalThis.firebaseAuth = firebaseAuth;
        }

        console.log('✅ Firebase inizializzato correttamente');
        console.log('  - Firestore:', firebaseDb ? '✅ disponibile' : '❌ non disponibile');
        console.log('  - Auth:', firebaseAuth ? '✅ disponibile' : '❌ non disponibile');
    } catch (error) {
        console.error('❌ Errore durante l\'inizializzazione di Firebase:', error);
        console.error('Dettagli errore:', error.message);
        console.error('Stack:', error.stack);
    }
}

// Inizializza Firebase quando il DOM è pronto
function startFirebaseInit() {
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initFirebase);
    } else {
        // Se il DOM è già caricato, aspetta un po' per assicurarsi che gli script Firebase siano caricati
        setTimeout(initFirebase, 100);
    }
}

startFirebaseInit();


