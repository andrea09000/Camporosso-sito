# Gestionale Prenotazioni - App Web

## Setup Credenziali di Accesso

Il sistema usa **Firebase Authentication + Firestore** per gestire accessi e prenotazioni.

### Passaggi rapidi

1. Crea un progetto Firebase (Console > Add Project)
2. In **Build > Authentication**, abilita il provider **Email/Password**
3. In **Build > Firestore Database**, crea un database in modalità production
4. Crea la collezione `reservations` (i documenti verranno creati automaticamente dal form)
5. Nel file `firebase-config.js` (cartella principale del progetto) inserisci le credenziali della tua app web
6. In Firebase Auth crea un utente amministratore, ad esempio:
   - **Email:** `admin@camporosso.local` (qualsiasi dominio va bene)
   - **Password:** scegli una password sicura

> 💡 Il login del gestionale accetta sia email completa che "username".
> Se inserisci solo `admin`, il sistema lo converte in `admin@camporosso.local`.

### Funzionalità "Ricordami"

- **Senza "Ricordami":** la sessione dura finché la scheda resta aperta (persistence `SESSION`)
- **Con "Ricordami":** la sessione usa la persistence `LOCAL` (circa 30 giorni)

## Struttura File

```
gestionale/
├── login.html          # Pagina di login
├── admin.html          # Dashboard gestionale (protetta)
├── auth.js             # Sistema di autenticazione
├── admin.js            # Logica dashboard
├── manifest.json       # Manifest PWA
├── sw.js              # Service Worker
└── README.md          # Questo file
```

## Funzionalità

- ✅ Sistema di autenticazione con login Firebase
- ✅ Protezione delle pagine con richiesta login
- ✅ "Ricordami" - mantiene la sessione per 30 giorni
- ✅ Logout button nel gestionale
- ✅ PWA installabile su mobile/desktop
- ✅ Prenotazioni salvate su Firestore (con fallback locale offline)

## Installazione come App

1. Apri `gestionale/login.html` nel browser
2. Sul mobile: condividi → "Aggiungi alla schermata Home"
3. Sul desktop: clicca sull'icona "Installa" nella barra del browser

## Note di Sicurezza

⚠️ **Per un ambiente di produzione più sicuro:**
- Le credenziali dovrebbero essere gestite da un server backend
- Implementare rate limiting per il login
- Usare HTTPS per tutte le comunicazioni
- Implementare autenticazione a due fattori (2FA)

