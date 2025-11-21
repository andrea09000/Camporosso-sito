# Setup Firebase per il Sistema di Prenotazioni

## ⚠️ IMPORTANTE: Configurazione Regole Firestore

Per permettere al form di prenotazione di salvare i dati (senza autenticazione), devi configurare le regole Firestore.

### Passaggi:

1. Vai su **Firebase Console**: https://console.firebase.google.com
2. Seleziona il progetto: **camporosso-3140d**
3. Vai su **Firestore Database** → **Regole**
4. Sostituisci le regole con questo codice:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Collezione prenotazioni: permette scrittura pubblica, lettura solo autenticata
    match /reservations/{reservationId} {
      // Chiunque può creare una prenotazione (form pubblico)
      allow create: if true;
      
      // Solo utenti autenticati possono leggere, aggiornare ed eliminare (gestionale)
      allow read, update, delete: if request.auth != null;
    }
  }
}
```

5. Clicca su **Pubblica**

### Spiegazione delle Regole:

- **`allow create: if true`**: Permette a chiunque (anche non autenticato) di creare prenotazioni tramite il form pubblico
- **`allow read, update, delete: if request.auth != null`**: Solo gli utenti autenticati (gestionale) possono leggere, modificare ed eliminare prenotazioni

### Verifica:

Dopo aver pubblicato le regole:
1. Prova a compilare il form di prenotazione
2. Controlla la console del browser (F12) per eventuali errori
3. Verifica su Firebase Console → Firestore Database → `reservations` che la prenotazione sia stata salvata

## Creazione Utente Admin per il Gestionale

1. Vai su **Firebase Console** → **Authentication** → **Users**
2. Clicca su **Add user**
3. Inserisci:
   - **Email**: `admin@camporosso.local` (o qualsiasi email con formato `username@camporosso.local`)
   - **Password**: la password che preferisci
   - **Disabilita**: "Email verification" (non serve per uso interno)
4. Clicca su **Add user**

Ora puoi accedere al gestionale con:
- **Username**: `admin` (senza @camporosso.local)
- **Password**: quella che hai impostato

## Troubleshooting

### "Errore: Permessi insufficienti"
- Verifica che le regole Firestore siano pubblicate correttamente
- Controlla che la collezione si chiami esattamente `reservations` (minuscolo)

### "Firebase non disponibile"
- Verifica che gli script Firebase siano caricati nell'ordine corretto
- Controlla la console del browser per errori di rete
- Verifica che `firebase-config.js` contenga le credenziali corrette

### Le prenotazioni non appaiono nel gestionale
- Verifica che l'utente admin sia autenticato
- Controlla che le regole Firestore permettano la lettura agli utenti autenticati
- Verifica la console del browser per errori

