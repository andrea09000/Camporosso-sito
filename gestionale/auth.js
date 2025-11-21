// Sistema di autenticazione per il gestionale usando Firebase Auth
const FIREBASE_USERNAME_DOMAIN = 'camporosso.local';

function formatUsernameToEmail(username) {
    if (!username) return '';
    const value = username.trim().toLowerCase();
    return value.includes('@') ? value : `${value}@${FIREBASE_USERNAME_DOMAIN}`;
}

async function waitForFirebaseAuth(timeout = 10000) {
    // Controlla sia firebaseAuth che window.firebaseAuth
    if (typeof firebaseAuth !== 'undefined' && firebaseAuth) return firebaseAuth;
    if (typeof window !== 'undefined' && window.firebaseAuth) return window.firebaseAuth;

    return new Promise((resolve, reject) => {
        const start = Date.now();
        const interval = setInterval(() => {
            const auth = (typeof firebaseAuth !== 'undefined' && firebaseAuth) || (typeof window !== 'undefined' && window.firebaseAuth);
            if (auth) {
                clearInterval(interval);
                resolve(auth);
            } else if (Date.now() - start > timeout) {
                clearInterval(interval);
                console.error('Firebase Auth non disponibile dopo', timeout, 'ms');
                resolve(null);
            }
        }, 100);
    });
}

async function getFirebaseAuthOrThrow() {
    const auth = await waitForFirebaseAuth();
    if (!auth) {
        throw new Error('Firebase non configurato');
    }
    return auth;
}

// Verifica se l'utente è autenticato
async function isAuthenticated() {
    const auth = await waitForFirebaseAuth();
    if (!auth) return false;

    return new Promise(resolve => {
        const unsubscribe = auth.onAuthStateChanged(user => {
            unsubscribe();
            resolve(!!user);
        });
    });
}

// Effettua il login usando Firebase Auth
async function login(username, password, rememberMe = false) {
    try {
        const auth = await getFirebaseAuthOrThrow();
        const email = formatUsernameToEmail(username);

        const persistence = rememberMe
            ? firebase.auth.Auth.Persistence.LOCAL
            : firebase.auth.Auth.Persistence.SESSION;

        await auth.setPersistence(persistence);
        const credential = await auth.signInWithEmailAndPassword(email, password);

        if (credential && credential.user) {
            if (rememberMe) {
                localStorage.setItem('gestionale_rememberMe', 'true');
            } else {
                localStorage.removeItem('gestionale_rememberMe');
            }
            return true;
        }
        return false;
    } catch (err) {
        console.error('Errore durante il login Firebase:', err);
        throw err;
    }
}

// Effettua il logout usando Firebase Auth
async function logout() {
    try {
        const auth = await waitForFirebaseAuth();
        if (auth) {
            await auth.signOut();
        }
    } catch (err) {
        console.error('Errore logout:', err);
    }
    
    localStorage.removeItem('gestionale_rememberMe');
    window.location.href = 'login.html';
}

// Ottieni l'utente corrente
async function getCurrentUser() {
    const auth = await waitForFirebaseAuth();
    if (!auth) return null;

    return new Promise(resolve => {
        const unsubscribe = auth.onAuthStateChanged(user => {
            unsubscribe();
            resolve(user || null);
        });
    });
}

// Ottieni l'username dall'email dell'utente
async function getLoggedInUsername() {
    const user = await getCurrentUser();
    if (!user || !user.email) {
        return null;
    }
    
    const email = user.email;
    if (email.endsWith(`@${FIREBASE_USERNAME_DOMAIN}`)) {
        return email.replace(`@${FIREBASE_USERNAME_DOMAIN}`, '');
    }
    return email.split('@')[0];
}

// Proteggi una pagina richiedendo autenticazione
async function requireAuth() {
    const authenticated = await isAuthenticated();
    if (!authenticated) {
        window.location.href = 'login.html';
        return false;
    }
    return true;
}
