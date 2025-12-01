// Gestionale Prenotazioni - Admin Dashboard con Firebase
const RESERVATIONS_COLLECTION = 'reservations';
let cachedReservations = [];
let reservationsUnsubscribe = null;

async function waitForFirebaseDb(timeout = 10000) {
    // Controlla sia firebaseDb che window.firebaseDb
    if (typeof firebaseDb !== 'undefined' && firebaseDb) return firebaseDb;
    if (typeof window !== 'undefined' && window.firebaseDb) return window.firebaseDb;

    return new Promise((resolve, reject) => {
        const start = Date.now();
        const interval = setInterval(() => {
            const db = (typeof firebaseDb !== 'undefined' && firebaseDb) || (typeof window !== 'undefined' && window.firebaseDb);
            if (db) {
                clearInterval(interval);
                resolve(db);
            } else if (Date.now() - start > timeout) {
                clearInterval(interval);
                console.error('Firebase Firestore non disponibile dopo', timeout, 'ms');
                console.error('Verifica che:');
                console.error('1. Gli script Firebase siano caricati prima di firebase-config.js');
                console.error('2. firebase-config.js sia caricato correttamente');
                console.error('3. Le credenziali Firebase siano corrette');
                resolve(null);
            }
        }, 100);
    });
}

function normalizeReservationDoc(doc) {
    const data = doc.data ? doc.data() : doc;
    const createdAtRaw = data.created_at;
    const createdAt = createdAtRaw && createdAtRaw.toDate ? createdAtRaw.toDate().toISOString() : (createdAtRaw || new Date().toISOString());

    return {
        name: data.name || '',
        surname: data.surname || '',
        email: data.email || '',
        phone: data.phone || '',
        date: data.date || '',
        time: data.time || '',
        guests: data.guests || 0,
        notes: data.notes || '',
        status: data.status || 'new',
        createdAt,
        id: doc.id || data.id || null
    };
}

function sortReservationsByDate(reservations) {
    return reservations.sort((a, b) => {
        const dateA = new Date(`${a.date} ${a.time}`);
        const dateB = new Date(`${b.date} ${b.time}`);
        return dateA - dateB;
    });
}

async function updateReservationStatus(reservationId, status) {
    if (!reservationId) return;
    const db = await waitForFirebaseDb();
    if (!db) return;

    try {
        await db.collection(RESERVATIONS_COLLECTION)
            .doc(reservationId)
            .update({
                status,
                updated_at: firebase.firestore.FieldValue.serverTimestamp()
            });
    } catch (err) {
        console.error('Errore aggiornamento stato prenotazione:', err);
    }
}

async function subscribeToReservations() {
    const db = await waitForFirebaseDb();
    if (!db) return;

    if (reservationsUnsubscribe) {
        reservationsUnsubscribe();
    }

    reservationsUnsubscribe = db.collection(RESERVATIONS_COLLECTION)
        .orderBy('created_at', 'desc')
        .onSnapshot(snapshot => {
            const reservations = sortReservationsByDate(
                snapshot.docs.map(doc => normalizeReservationDoc(doc))
            );
            cachedReservations = reservations;
            window.allReservationsFull = cachedReservations;
            displayReservations(reservations);
        }, error => {
            console.error('Errore aggiornamento realtime Firebase:', error);
        });
}

// Carica le prenotazioni da Firebase (con fallback su localStorage solo se Firebase non disponibile)
async function loadReservations() {
    const db = await waitForFirebaseDb();

    if (db) {
        try {
            console.log('Caricamento prenotazioni da Firebase...');
            const snapshot = await db
                .collection(RESERVATIONS_COLLECTION)
                .orderBy('created_at', 'desc')
                .get();

            const reservations = sortReservationsByDate(
                snapshot.docs.map(doc => normalizeReservationDoc(doc))
            );

            console.log(`✅ Caricate ${reservations.length} prenotazioni da Firebase`);
            cachedReservations = reservations;
            window.allReservationsFull = cachedReservations;
            return reservations;
        } catch (err) {
            console.error('❌ Errore nel caricamento da Firebase:', err);
            console.error('Dettagli:', err.message);
            console.error('Code:', err.code);
            
            if (err.code === 'permission-denied') {
                console.error('⚠️ Permessi insufficienti. Verifica le regole Firestore.');
                alert('Errore: Permessi insufficienti per leggere le prenotazioni. Verifica le regole Firestore.');
            }
            
            // Fallback su localStorage solo se Firebase non è disponibile
            console.warn('⚠️ Fallback su localStorage (i dati potrebbero non essere aggiornati)');
            return loadFromLocalStorage();
        }
    }

    console.warn('⚠️ Firebase non disponibile, uso localStorage');
    return loadFromLocalStorage();
}

// Fallback: carica da localStorage
function loadFromLocalStorage() {
    const reservations = JSON.parse(localStorage.getItem('reservations')) || [];
    const sorted = sortReservationsByDate(reservations);
    cachedReservations = sorted;
    window.allReservationsFull = cachedReservations;
    return sorted;
}

// Salva le prenotazioni (fallback locale)
async function saveReservations(reservations) {
    localStorage.setItem('reservations', JSON.stringify(reservations));
}

// Visualizza le prenotazioni nella tabella
async function displayReservations(reservations = null, options = {}) {
    const { updateCache = false } = options;
    console.log('🔄 displayReservations chiamata');

    let allReservations;
    if (reservations) {
        allReservations = sortReservationsByDate(reservations.map(r => ({ ...r })));
        if (updateCache) {
            cachedReservations = allReservations;
            window.allReservationsFull = cachedReservations;
        }
    } else {
        if (!cachedReservations.length) {
            await loadReservations();
        }
        allReservations = cachedReservations;
    }

    console.log('📋 Numero prenotazioni:', allReservations.length);
    
    const tbody = document.getElementById('reservationsBody');
    const emptyState = document.getElementById('emptyState');
    const table = document.getElementById('reservationsTable');

    if (!tbody) {
        console.error('❌ ERRORE: tbody non trovato!');
        return;
    }

    if (allReservations.length === 0) {
        console.log('ℹ️ Nessuna prenotazione trovata');
        table.style.display = 'none';
        emptyState.style.display = 'block';
        updateStats([]);
        tbody.innerHTML = '';
        return;
    }

    tbody.innerHTML = '';

    console.log('✅ Visualizzazione', allReservations.length, 'prenotazioni');
    table.style.display = 'table';
    emptyState.style.display = 'none';
    
    const allReservationsFull = cachedReservations;

        console.log('🔄 Creazione righe per', allReservations.length, 'prenotazioni');
        allReservations.forEach((reservation, filteredIndex) => {
            console.log('📝 Creazione riga', filteredIndex + 1, 'di', allReservations.length, 'per:', reservation.name);
        const row = document.createElement('tr');
        const date = new Date(reservation.date);
        const formattedDate = date.toLocaleDateString('it-IT', { 
            weekday: 'short', 
            year: 'numeric', 
            month: 'short', 
            day: 'numeric' 
        });

        // Trova l'indice originale nella lista completa usando createdAt o id
        const originalIndex = allReservationsFull.findIndex(r => 
            (r.id && reservation.id && r.id === reservation.id) ||
            r.createdAt === reservation.createdAt
        );
        const indexToUse = originalIndex >= 0 ? originalIndex : filteredIndex;
        const reservationId = reservation.id || null; // ID Firebase se disponibile

        // Prepara dati per WhatsApp
        const phoneNumber = reservation.phone.replace(/\s+/g, '').replace(/[^\d+]/g, ''); // Rimuovi spazi e caratteri non numerici (tranne +)
        let phoneForWhatsApp = phoneNumber;
        if (!phoneForWhatsApp.startsWith('+')) {
            // Se non inizia con +, aggiungi +39
            if (phoneForWhatsApp.startsWith('39')) {
                phoneForWhatsApp = '+' + phoneForWhatsApp;
            } else {
                phoneForWhatsApp = '+39' + phoneForWhatsApp;
            }
        }
        
        // Formatta data per il messaggio (es: 15 gennaio 2024)
        const dateForMessage = date.toLocaleDateString('it-IT', { 
            day: 'numeric', 
            month: 'long', 
            year: 'numeric' 
        });
        
        // Salva reservation data come stringa base64 per evitare problemi con caratteri speciali
        const reservationData = btoa(JSON.stringify(reservation));
        
        const statusValue = (reservation.status || 'new').toLowerCase();
        let statusClass = 'status-new';
        let statusLabel = 'Nuova';

        if (statusValue === 'confirmed') {
            statusClass = 'status-confirmed';
            statusLabel = 'Confermata';
        } else if (statusValue === 'rejected' || statusValue === 'cancelled') {
            statusClass = 'status-rejected';
            statusLabel = statusValue === 'cancelled' ? 'Cancellata' : 'Rifiutata';
        }

        // Per mobile, aggiungi data-label agli attributi
        const isMobile = window.innerWidth <= 480;
        
        // Crea le celle della riga
        const cellData = isMobile ? {
            data: `<td data-label="Data">${formattedDate}</td>`,
            time: `<td data-label="Orario">${reservation.time}</td>`,
            name: `<td data-label="Nome">${reservation.name} ${reservation.surname}</td>`,
            email: `<td data-label="Email"><a href="mailto:${reservation.email}">${reservation.email}</a></td>`,
            phone: `<td data-label="Telefono"><a href="tel:${reservation.phone}">${reservation.phone}</a></td>`,
            guests: `<td data-label="Ospiti">${reservation.guests}</td>`,
            notes: `<td data-label="Note">${reservation.notes || '-'}</td>`,
            status: `<td data-label="Stato"><span class="status-badge ${statusClass}">${statusLabel}</span></td>`
        } : {
            data: `<td>${formattedDate}</td>`,
            time: `<td>${reservation.time}</td>`,
            name: `<td>${reservation.name} ${reservation.surname}</td>`,
            email: `<td><a href="mailto:${reservation.email}">${reservation.email}</a></td>`,
            phone: `<td><a href="tel:${reservation.phone}">${reservation.phone}</a></td>`,
            guests: `<td>${reservation.guests}</td>`,
            notes: `<td>${reservation.notes || '-'}</td>`,
            status: `<td><span class="status-badge ${statusClass}">${statusLabel}</span></td>`
        };
        
        // Costruisci l'HTML completo della riga (senza la cella Azioni)
        row.innerHTML = `
            ${cellData.data}
            ${cellData.time}
            ${cellData.name}
            ${cellData.email}
            ${cellData.phone}
            ${cellData.guests}
            ${cellData.notes}
            ${cellData.status}
        `;
        
        // Crea la cella Conferma con il bottone
        const confirmCell = document.createElement('td');
        if (isMobile) {
            confirmCell.setAttribute('data-label', 'Conferma');
        }
        confirmCell.style.textAlign = 'center';
        confirmCell.style.verticalAlign = 'middle';
        
        // Crea bottone Conferma
        const confirmBtn = document.createElement('button');
        confirmBtn.className = 'btn-confirm';
        confirmBtn.textContent = 'Conferma';
        confirmBtn.style.display = 'inline-block';
        confirmBtn.style.visibility = 'visible';
        confirmBtn.style.opacity = '1';
        confirmBtn.setAttribute('data-phone', phoneForWhatsApp);
        confirmBtn.setAttribute('data-date', dateForMessage);
        confirmBtn.setAttribute('data-time', reservation.time);
        confirmBtn.setAttribute('data-name', reservation.name);
        confirmBtn.setAttribute('data-reservation', reservationData);
        
        // Aggiungi il bottone alla cella Conferma
        confirmCell.appendChild(confirmBtn);
        
        // Crea la cella Elimina con il bottone
        const deleteCell = document.createElement('td');
        if (isMobile) {
            deleteCell.setAttribute('data-label', 'Elimina');
        }
        deleteCell.style.textAlign = 'center';
        deleteCell.style.verticalAlign = 'middle';
        
        // Crea bottone Elimina
        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'btn-delete';
        deleteBtn.textContent = 'Elimina';
        deleteBtn.style.display = 'inline-block';
        deleteBtn.style.visibility = 'visible';
        deleteBtn.style.opacity = '1';
        deleteBtn.setAttribute('data-phone', phoneForWhatsApp);
        deleteBtn.setAttribute('data-date', dateForMessage);
        deleteBtn.setAttribute('data-time', reservation.time);
        deleteBtn.setAttribute('data-name', reservation.name);
        deleteBtn.setAttribute('data-reservation', reservationData);
        
        // Aggiungi il bottone alla cella Elimina
        deleteCell.appendChild(deleteBtn);
        
        // Aggiungi le celle alla riga
        row.appendChild(confirmCell);
        row.appendChild(deleteCell);
        
        // Verifica che i bottoni siano effettivamente nella riga
        const confirmBtnCheck = row.querySelector('.btn-confirm');
        const deleteBtnCheck = row.querySelector('.btn-delete');
        
        if (!confirmBtnCheck) {
            console.error('❌ ERRORE: Bottone Conferma NON trovato nella riga!');
        }
        if (!deleteBtnCheck) {
            console.error('❌ ERRORE: Bottone Elimina NON trovato nella riga!');
        }
        
        console.log('✅ Creata riga per:', reservation.name);
        console.log('✅ Bottone Conferma creato e aggiunto:', confirmBtnCheck ? 'SI' : 'NO');
        console.log('✅ Bottone Elimina creato e aggiunto:', deleteBtnCheck ? 'SI' : 'NO');
        
        // Verifica che i bottoni siano visibili
        if (confirmBtnCheck) {
            console.log('✅ Bottone Conferma trovato nel DOM:', confirmBtnCheck.outerHTML);
        } else {
            console.error('❌ Bottone Conferma NON trovato dopo creazione!');
        }
        if (deleteBtnCheck) {
            console.log('✅ Bottone Elimina trovato nel DOM:', deleteBtnCheck.outerHTML);
        } else {
            console.error('❌ Bottone Elimina NON trovato dopo creazione!');
        }
        
        // Aggiungi event listeners ai bottoni
        confirmBtn.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            console.log('Click su Conferma per:', reservation.name);
            const phone = this.getAttribute('data-phone');
            const date = this.getAttribute('data-date');
            const time = this.getAttribute('data-time');
            const name = this.getAttribute('data-name');
            const resData = this.getAttribute('data-reservation');
            confirmReservation(phone, date, time, name, resData);
        });
        
        deleteBtn.addEventListener('click', async function(e) {
            e.preventDefault();
            e.stopPropagation();
            console.log('Click su Elimina per:', reservation.name);
            
            // Usa sempre rejectReservation per aprire WhatsApp con il messaggio di rifiuto
            const phone = this.getAttribute('data-phone');
            const date = this.getAttribute('data-date');
            const time = this.getAttribute('data-time');
            const name = this.getAttribute('data-name');
            const resData = this.getAttribute('data-reservation');
            rejectReservation(phone, date, time, name, resData);
        });
        
        tbody.appendChild(row);
    });

    updateStats(allReservations);
}

// Aggiorna le statistiche
async function updateStats(reservations) {
    if (!reservations) {
        reservations = await loadReservations();
    }
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const todayCount = reservations.filter(r => {
        const resDate = new Date(r.date);
        resDate.setHours(0, 0, 0, 0);
        return resDate.getTime() === today.getTime();
    }).length;

    const weekAgo = new Date(today);
    weekAgo.setDate(weekAgo.getDate() - 7);
    const weekCount = reservations.filter(r => {
        const resDate = new Date(r.date);
        resDate.setHours(0, 0, 0, 0);
        return resDate >= weekAgo && resDate <= today;
    }).length;

    document.getElementById('totalReservations').textContent = reservations.length;
    document.getElementById('todayReservations').textContent = todayCount;
    document.getElementById('weekReservations').textContent = weekCount;
    document.getElementById('pendingReservations').textContent = reservations.length;
}

// Elimina una prenotazione
async function deleteReservation(identifier, isFirestoreId = false) {
    if (!confirm('Sei sicuro di voler eliminare questa prenotazione?')) {
        return;
    }

    const db = await waitForFirebaseDb();
    
    if (!db) {
        console.error('Firebase non disponibile per eliminazione');
        alert('Errore: Firebase non disponibile. Verifica la connessione.');
        return;
    }

    const isStringId = typeof identifier === 'string';

    if ((isFirestoreId || isStringId) && db) {
        const docId = identifier;
        try {
            console.log('Eliminazione prenotazione con ID:', docId);
            await db.collection(RESERVATIONS_COLLECTION).doc(docId).delete();
            console.log('✅ Prenotazione eliminata con successo');
            // Ricarica le prenotazioni
            await displayReservations();
            return;
        } catch (err) {
            console.error('❌ Errore eliminazione Firebase:', err);
            console.error('Dettagli errore:', err.message);
            console.error('Code:', err.code);
            
            let errorMessage = 'Errore durante l\'eliminazione.';
            if (err.code === 'permission-denied') {
                errorMessage = 'Errore: Permessi insufficienti. Verifica le regole di sicurezza Firestore.';
            } else if (err.code === 'not-found') {
                errorMessage = 'Errore: Prenotazione non trovata. Potrebbe essere già stata eliminata.';
            } else {
                errorMessage = `Errore: ${err.message || 'Errore sconosciuto'}`;
            }
            alert(errorMessage);
        }
    } else {
        // Fallback su localStorage
        console.log('Eliminazione da localStorage (fallback)');
        const reservations = loadFromLocalStorage();
        const index = typeof identifier === 'number' ? identifier : parseInt(identifier, 10);
        if (!isNaN(index) && index >= 0 && index < reservations.length) {
            reservations.splice(index, 1);
            saveReservations(reservations);
            displayReservations(reservations, { updateCache: true });
        } else {
            alert('Errore: Indice prenotazione non valido');
        }
    }
}

// Elimina tutte le prenotazioni
async function clearAllReservations() {
    if (!confirm('Sei sicuro di voler eliminare TUTTE le prenotazioni? Questa azione non può essere annullata.')) {
        return;
    }

    const db = await waitForFirebaseDb();
    if (db) {
        try {
            console.log('Eliminazione di tutte le prenotazioni...');
            const snapshot = await db.collection(RESERVATIONS_COLLECTION).get();
            
            if (snapshot.empty) {
                alert('Nessuna prenotazione da eliminare.');
                return;
            }

            console.log(`Trovate ${snapshot.size} prenotazioni da eliminare`);
            
            // Firestore batch può eliminare max 500 documenti alla volta
            const batchSize = 500;
            const docs = snapshot.docs;
            
            for (let i = 0; i < docs.length; i += batchSize) {
                const batch = db.batch();
                const batchDocs = docs.slice(i, i + batchSize);
                batchDocs.forEach(doc => batch.delete(doc.ref));
                await batch.commit();
                console.log(`Eliminato batch ${Math.floor(i / batchSize) + 1} (${batchDocs.length} documenti)`);
            }
            
            console.log('✅ Tutte le prenotazioni eliminate con successo');
            cachedReservations = [];
            window.allReservationsFull = [];
            await displayReservations([]);
            alert('Tutte le prenotazioni sono state eliminate con successo.');
            return;
        } catch (err) {
            console.error('❌ Errore eliminazione Firebase:', err);
            console.error('Dettagli errore:', err.message);
            console.error('Code:', err.code);
            
            let errorMessage = 'Errore durante l\'eliminazione.';
            if (err.code === 'permission-denied') {
                errorMessage = 'Errore: Permessi insufficienti. Verifica le regole di sicurezza Firestore.\n\nLe regole devono permettere la scrittura per utenti autenticati.';
            } else {
                errorMessage = `Errore: ${err.message || 'Errore sconosciuto'}`;
            }
            alert(errorMessage);
        }
    } else {
        console.log('Firebase non disponibile, uso localStorage');
        localStorage.removeItem('reservations');
        cachedReservations = [];
        window.allReservationsFull = [];
        displayReservations([]);
        alert('Prenotazioni eliminate da localStorage (Firebase non disponibile).');
    }
}

// Filtra le prenotazioni
async function filterReservations() {
    const searchTerm = document.getElementById('searchInput').value.toLowerCase();
    const filterDate = document.getElementById('filterDate').value;
    let reservations = cachedReservations.length ? [...cachedReservations] : await loadReservations();

    // Filtra per ricerca
    if (searchTerm) {
        reservations = reservations.filter(r => 
            r.name.toLowerCase().includes(searchTerm) ||
            r.surname.toLowerCase().includes(searchTerm) ||
            r.email.toLowerCase().includes(searchTerm) ||
            r.phone.includes(searchTerm)
        );
    }

    // Filtra per data
    if (filterDate) {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        switch (filterDate) {
            case 'today':
                reservations = reservations.filter(r => {
                    const resDate = new Date(r.date);
                    resDate.setHours(0, 0, 0, 0);
                    return resDate.getTime() === today.getTime();
                });
                break;
            case 'week':
                const weekAgo = new Date(today);
                weekAgo.setDate(weekAgo.getDate() - 7);
                reservations = reservations.filter(r => {
                    const resDate = new Date(r.date);
                    resDate.setHours(0, 0, 0, 0);
                    return resDate >= weekAgo && resDate <= today;
                });
                break;
            case 'month':
                const monthAgo = new Date(today);
                monthAgo.setMonth(monthAgo.getMonth() - 1);
                reservations = reservations.filter(r => {
                    const resDate = new Date(r.date);
                    resDate.setHours(0, 0, 0, 0);
                    return resDate >= monthAgo && resDate <= today;
                });
                break;
        }
    }

    displayReservations(reservations, { updateCache: false });
}

// Indirizzo dell'agriturismo (da configurare)
const AGRI_ADDRESS = 'Cascina Camporosso, Via Serioletto, 24057 Martinengo BG'; // L'utente fornirà questo dopo

// Conferma prenotazione - apre WhatsApp con messaggio di conferma
async function confirmReservation(phoneNumber, dateFormatted, time, customerName, reservationData) {
    // Decodifica reservation data
    const reservation = JSON.parse(atob(reservationData));
    
    // Messaggio di conferma
    const message = `Ciao ${customerName}, siamo felici di contattarla. La sua prenotazione presso Agriturismo Camporosso è stata accettata. Ci vediamo il ${dateFormatted} alle ${time} in ${AGRI_ADDRESS}.`;
    
    // Apre WhatsApp
    const whatsappUrl = `https://wa.me/${phoneNumber}?text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, '_blank');

    if (reservation.id) {
        await updateReservationStatus(reservation.id, 'confirmed');
    }
}

// Rifiuta/Elimina prenotazione - apre WhatsApp con messaggio di rifiuto
async function rejectReservation(phoneNumber, dateFormatted, time, customerName, reservationData) {
    // Decodifica reservation data
    const reservation = JSON.parse(atob(reservationData));
    
    // Messaggio di rifiuto
    const message = `Ciao ${customerName}, mi dispiace ma siamo occupati per il ${dateFormatted} alle ${time}. Ci scusiamo per il disagio.`;
    
    const whatsappUrl = `https://wa.me/${phoneNumber}?text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, '_blank');

    if (reservation.id) {
        await updateReservationStatus(reservation.id, 'rejected');
    }
    
    // Dopo aver aperto WhatsApp, elimina la prenotazione
    setTimeout(async () => {
        if (confirm('Vuoi eliminare questa prenotazione dal sistema?')) {
            const reservationId = reservation.id || null;
            if (reservationId) {
                // Usa l'ID diretto se disponibile
                await deleteReservation(reservationId, true);
            } else {
                // Fallback: cerca per createdAt
                const allReservationsFull = window.allReservationsFull || [];
                const index = allReservationsFull.findIndex(r => 
                    r.createdAt === reservation.createdAt
                );
                if (index >= 0) {
                    await deleteReservation(index, false);
                } else {
                    alert('Errore: Prenotazione non trovata nel sistema.');
                }
            }
        }
    }, 500);
}

// Esporta le prenotazioni in CSV
async function exportReservations() {
    const reservations = cachedReservations.length ? [...cachedReservations] : await loadReservations();
    
    if (reservations.length === 0) {
        alert('Nessuna prenotazione da esportare');
        return;
    }

    // Crea header CSV
    let csv = 'Data,Orario,Nome,Cognome,Email,Telefono,Ospiti,Note\n';

    // Aggiungi le righe
    reservations.forEach(r => {
        const date = new Date(r.date);
        const formattedDate = date.toLocaleDateString('it-IT');
        csv += `"${formattedDate}","${r.time}","${r.name}","${r.surname}","${r.email}","${r.phone}","${r.guests}","${r.notes || ''}"\n`;
    });

    // Crea e scarica il file
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `prenotazioni_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

// Registra Service Worker per PWA
if ('serviceWorker' in navigator) {
    window.addEventListener('load', function() {
        navigator.serviceWorker.register('/gestionale/sw.js')
            .then(function(registration) {
                console.log('ServiceWorker registrato con successo:', registration.scope);
            })
            .catch(function(error) {
                console.log('ServiceWorker registrazione fallita:', error);
            });
    });
}

// Inizializza la dashboard
document.addEventListener('DOMContentLoaded', async function() {
    // Verifica autenticazione prima di inizializzare
    if (typeof requireAuth === 'function') {
        const authenticated = await requireAuth();
        if (!authenticated) {
            return; // Se non autenticato, requireAuth reindirizza a login
        }
    }
    
    await loadReservations();
    await displayReservations();
    await subscribeToReservations();

    // Event listeners per ricerca e filtri
    document.getElementById('searchInput').addEventListener('input', filterReservations);
    document.getElementById('filterDate').addEventListener('change', filterReservations);
});

