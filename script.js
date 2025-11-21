// Gestione menu hamburger
const menuToggle = document.getElementById('menuToggle');
const menuOverlay = document.getElementById('menuOverlay');

// Verifica che menuToggle esista prima di aggiungere event listener
if (menuToggle && menuOverlay) {
    menuToggle.addEventListener('click', function() {
        menuToggle.classList.toggle('active');
        menuOverlay.classList.toggle('active');
        
        // Previene lo scroll quando il menu è aperto
        if (menuOverlay.classList.contains('active')) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = 'auto';
        }
    });

    // Chiudi menu quando si clicca su un link
    const menuLinks = document.querySelectorAll('.menu-list a');
    menuLinks.forEach(link => {
        link.addEventListener('click', function() {
            menuToggle.classList.remove('active');
            menuOverlay.classList.remove('active');
            document.body.style.overflow = 'auto';
        });
    });

    // Chiudi menu quando si clicca fuori dal menu
    menuOverlay.addEventListener('click', function(e) {
        if (e.target === menuOverlay) {
            menuToggle.classList.remove('active');
            menuOverlay.classList.remove('active');
            document.body.style.overflow = 'auto';
        }
    });
}

// Smooth scroll per il link "Scorri in basso" - scroll preciso alla sezione menu
const scrollIndicator = document.querySelector('.scroll-indicator');
if (scrollIndicator) {
    scrollIndicator.addEventListener('click', function(e) {
        e.preventDefault();
        const menuSection = document.getElementById('menu');
        if (menuSection) {
            // Calcola la posizione esatta considerando l'header fisso
            const headerHeight = 100; // Altezza approssimativa dell'header
            const menuTop = menuSection.offsetTop;
            const targetPosition = menuTop - headerHeight;
            
            // Smooth scroll preciso alla sezione menu
            window.scrollTo({
                top: targetPosition,
                behavior: 'smooth'
            });
        }
    });
}

// Smooth scroll per i link interni (esclusi i menu-nav-link che hanno gestione separata)
document.querySelectorAll('a[href^="#"]:not(.menu-nav-link)').forEach(anchor => {
    anchor.addEventListener('click', function(e) {
        const href = this.getAttribute('href');
        if (href !== '#' && href !== '') {
            const target = document.querySelector(href);
            if (target) {
                e.preventDefault();
                
                // Calcola la posizione target considerando l'header fisso
                const headerHeight = 100; // Altezza approssimativa dell'header
                const targetPosition = target.offsetTop - headerHeight;
                
                // Smooth scroll
                window.scrollTo({
                    top: targetPosition,
                    behavior: 'smooth'
                });
                
                // Aggiorna l'URL senza refresh
                if (history.pushState) {
                    history.pushState(null, null, href);
                }
            }
        }
    });
});

// Gestione navigazione menu
const menuNavLinks = document.querySelectorAll('.menu-nav-link');
const menuCategories = document.querySelectorAll('.menu-category');

// Gestione specifica per i link del menu di navigazione - mostra solo la categoria cliccata
menuNavLinks.forEach(link => {
    link.addEventListener('click', function(e) {
        e.preventDefault();
        const href = this.getAttribute('href');
        const targetId = href.substring(1); // Rimuove il #
        const target = document.getElementById(targetId);
        
        if (target) {
            // Nasconde tutte le categorie
            menuCategories.forEach(category => {
                category.classList.remove('active');
            });
            
            // Mostra solo la categoria cliccata
            setTimeout(() => {
                target.classList.add('active');
            }, 50);
            
            // NON fa scroll, la pagina rimane dove è
            
            // Aggiorna il link attivo
            updateActiveMenuLink(this);
            
            // Aggiorna l'URL
            if (history.pushState) {
                history.pushState(null, null, href);
            }
        }
    });
});

function updateActiveMenuLink(activeLink) {
    menuNavLinks.forEach(link => {
        link.classList.remove('active');
    });
    if (activeLink) {
        activeLink.classList.add('active');
    }
}

// Rimuoviamo la funzione di update durante lo scroll dato che ora usiamo solo il click

// Imposta il link attivo iniziale e mostra la prima categoria
document.addEventListener('DOMContentLoaded', function() {
    // Controlla se c'è un hash nell'URL
    if (window.location.hash) {
        const hash = window.location.hash;
        const targetId = hash.substring(1);
        const targetCategory = document.getElementById(targetId);
        const targetLink = document.querySelector(`.menu-nav-link[href="${hash}"]`);
        
        if (targetCategory && targetLink) {
            // Nasconde tutte le categorie
            menuCategories.forEach(category => {
                category.classList.remove('active');
            });
            // Mostra la categoria dall'URL
            targetCategory.classList.add('active');
            updateActiveMenuLink(targetLink);
        }
    } else {
        // Di default mostra la prima categoria presente nella navigazione
        const firstLink = menuNavLinks[0];
        if (firstLink) {
            const targetId = firstLink.getAttribute('href').substring(1);
            const firstCategory = document.getElementById(targetId);
            if (firstCategory) {
                firstCategory.classList.add('active');
                updateActiveMenuLink(firstLink);
            }
        }
    }
    
    // Inizializza carousel
    initCarousel();
    
    // Inizializza gestione scroll header
    initHeaderScroll();
});

// Gestione Carousel
function initCarousel() {
    const slides = document.querySelectorAll('.carousel-slide');
    const indicators = document.querySelectorAll('.carousel-indicator');
    
    if (!slides.length) return;
    
    let currentSlide = 0;
    const totalSlides = slides.length;
    
    // Funzione per aggiornare il carousel
    function updateCarousel(index) {
        // Rimuove active da tutte le slide e indicatori
        slides.forEach(slide => slide.classList.remove('active'));
        indicators.forEach(indicator => indicator.classList.remove('active'));
        
        // Aggiunge active alla slide e indicatore corrente
        slides[index].classList.add('active');
        if (indicators[index]) {
            indicators[index].classList.add('active');
        }
        
        currentSlide = index;
    }
    
    // Funzione per slide successiva
    function nextSlide() {
        const next = (currentSlide + 1) % totalSlides;
        updateCarousel(next);
    }
    
    // Funzione per slide precedente
    function prevSlide() {
        const prev = (currentSlide - 1 + totalSlides) % totalSlides;
        updateCarousel(prev);
    }
    
    // Event listener per indicatori
    indicators.forEach((indicator, index) => {
        indicator.addEventListener('click', () => {
            updateCarousel(index);
        });
    });
    
    // Auto-play opzionale (scorri automaticamente ogni 3 secondi)
    let autoPlayInterval;
    
    function startAutoPlay() {
        autoPlayInterval = setInterval(nextSlide, 3000);
    }
    
    function stopAutoPlay() {
        if (autoPlayInterval) {
            clearInterval(autoPlayInterval);
        }
    }
    
    // Avvia auto-play
    startAutoPlay();
    
    // Pausa auto-play quando l'utente interagisce con i controlli
    indicators.forEach(indicator => {
        indicator.addEventListener('mouseenter', stopAutoPlay);
        indicator.addEventListener('mouseleave', startAutoPlay);
    });
    
    // Pausa auto-play quando l'utente passa il mouse sulla sezione
    const parallaxSection = document.querySelector('.parallax-section');
    if (parallaxSection) {
        parallaxSection.addEventListener('mouseenter', stopAutoPlay);
        parallaxSection.addEventListener('mouseleave', startAutoPlay);
    }
    
    // Supporto per touch swipe (mobile)
    let touchStartX = 0;
    let touchEndX = 0;
    
    if (parallaxSection) {
        parallaxSection.addEventListener('touchstart', (e) => {
            touchStartX = e.changedTouches[0].screenX;
            stopAutoPlay();
        });
        
        parallaxSection.addEventListener('touchend', (e) => {
            touchEndX = e.changedTouches[0].screenX;
            handleSwipe();
            startAutoPlay();
        });
    }
    
    function handleSwipe() {
        const swipeThreshold = 50;
        const diff = touchStartX - touchEndX;
        
        if (Math.abs(diff) > swipeThreshold) {
            if (diff > 0) {
                // Swipe sinistra - slide successiva
                nextSlide();
            } else {
                // Swipe destra - slide precedente
                prevSlide();
            }
        }
    }
    
    // Inizializza con la prima slide
    updateCarousel(0);
}

// Gestione cambio header quando si scrolla oltre metà dell'immagine hero
function initHeaderScroll() {
    const header = document.querySelector('.header');
    const hero = document.querySelector('.hero');
    
    if (!header || !hero) return;
    
    window.addEventListener('scroll', function() {
        const scrolled = window.pageYOffset;
        const heroHeight = hero.offsetHeight;
        const halfHeroHeight = heroHeight / 2;
        
        // Quando si scrolla oltre metà dell'immagine hero, cambia l'header
        if (scrolled > halfHeroHeight) {
            header.classList.add('scrolled');
        } else {
            header.classList.remove('scrolled');
        }
    });
}

