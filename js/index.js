// ============================================================
// ANIQUIZ - 500 ANIME CON HIGHER OR LOWER
// ============================================================

(function() {
    'use strict';

    const QUESTIONS_PER_QUIZ = 10;
    const MAX_ANIME = 500;
    const PER_PAGE = 50;
    const BATCH_SIZE = 5;

    // ===== DOM REFS =====
    const loading = document.getElementById('loading');
    const errorState = document.getElementById('errorState');
    const errorMessage = document.getElementById('errorMessage');
    const errorDetail = document.getElementById('errorDetail');
    const quizArea = document.getElementById('quizArea');
    const results = document.getElementById('results');
    const quizTitle = document.getElementById('quizTitle');
    const questionText = document.getElementById('questionText');
    const questionImageContainer = document.getElementById('questionImageContainer');
    const optionsGrid = document.getElementById('optionsGrid');
    const feedback = document.getElementById('feedback');
    const feedbackTitle = document.getElementById('feedbackTitle');
    const feedbackDetail = document.getElementById('feedbackDetail');
    const nextBtn = document.getElementById('nextBtn');
    const progressFill = document.getElementById('progressFill');
    const currentQuestionSpan = document.getElementById('currentQuestion');
    const totalQuestionsCount = document.getElementById('totalQuestionsCount');
    const totalAnimeSpan = document.getElementById('totalAnime');
    const totalQuestionsSpan = document.getElementById('totalQuestions');
    const footerAnimeCount = document.getElementById('footerAnimeCount');
    const resultScore = document.getElementById('resultScore');
    const resultLabel = document.getElementById('resultLabel');
    const resultIcon = document.getElementById('resultIcon');
    const resultCorrect = document.getElementById('resultCorrect');
    const resultWrong = document.getElementById('resultWrong');
    const resultAccuracy = document.getElementById('resultAccuracy');
    const quizBtns = document.querySelectorAll('.quiz-btn');
    const retryBtn = document.getElementById('retryBtn');
    const restartBtn = document.getElementById('restartBtn');
    const progressFillFull = document.getElementById('progressFillFull');
    const loadedCount = document.getElementById('loadedCount');
    const progressPercent = document.getElementById('progressPercent');

    // ===== HIGHER OR LOWER =====
    const higherLowerBtn = document.getElementById('higherLowerBtn');
    const higherLowerContainer = document.getElementById('higherLowerContainer');

    // ===== COLUMNS DOM REFS =====
    const columnsMode = document.getElementById('columnsMode');
    const leftItems = document.getElementById('leftItems');
    const rightItems = document.getElementById('rightItems');
    const leftTitle = document.getElementById('leftTitle');
    const rightTitle = document.getElementById('rightTitle');
    const resetBtn = document.getElementById('resetBtn');

    // ===== STATE =====
    let allAnime = [];
    let currentQuizType = 'character';
    let currentQuestions = [];
    let currentIndex = 0;
    let score = 0;
    let isAnswered = false;
    let isLoading = false;
    let isDataLoaded = false;
    let isHigherLowerActive = false;

    // ===== COLUMNS STATE =====
    let itemIdCounter = 0;

    // ===== UTILITY =====
    function shuffleArray(arr) {
        for (let i = arr.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [arr[i], arr[j]] = [arr[j], arr[i]];
        }
        return arr;
    }

    function pickRandom(arr) {
        return arr[Math.floor(Math.random() * arr.length)];
    }

    function getTitle(media) {
        return media.title.english || media.title.romaji || media.title.native || 'Sconosciuto';
    }

    function getStudio(media) {
        return media.studios?.nodes?.[0]?.name || 'Sconosciuto';
    }

    function getYear(media) {
        return media.startDate?.year || '?';
    }

    function getGenres(media) {
        return media.genres || [];
    }

    function getCharacters(media) {
        return media.characters?.nodes || [];
    }

    function getImage(media) {
        return media.coverImage?.large || null;
    }

    function sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    // ===== TOAST =====
    function showToast(message, type = 'success') {
        let toast = document.getElementById('customToast');
        if (!toast) {
            toast = document.createElement('div');
            toast.id = 'customToast';
            document.body.appendChild(toast);
        }

        const iconMap = {
            success: 'fa-check-circle',
            error: 'fa-exclamation-circle',
            info: 'fa-info-circle'
        };

        toast.innerHTML = `<i class="fas ${iconMap[type] || iconMap.success}"></i> ${message}`;
        toast.className = type;
        toast.style.opacity = '1';
        toast.style.transform = 'translateX(-50%) translateY(0)';
        toast.style.pointerEvents = 'auto';

        clearTimeout(toast._timeout);
        toast._timeout = setTimeout(() => {
            toast.style.opacity = '0';
            toast.style.transform = 'translateX(-50%) translateY(100px)';
            toast.style.pointerEvents = 'none';
        }, 3000);
    }

    // ============================================================
    // COLUMNS FUNCTIONS
    // ============================================================
    
    function updateCounter() {
        const total = document.querySelectorAll('.column-item').length;
        const itemsCount = document.getElementById('itemsCount');
        if (itemsCount) itemsCount.textContent = total;
    }

    function createItem(column, value = '') {
        const id = itemIdCounter++;
        const div = document.createElement('div');
        div.className = 'column-item';
        div.dataset.id = id;
        div.innerHTML = `
            <span class="item-number">${id + 1}</span>
            <input type="text" placeholder="Scrivi qui..." value="${value}" />
            <div class="item-actions">
                <button class="remove-item" title="Rimuovi"><i class="fas fa-times"></i></button>
            </div>
        `;

        div.querySelector('.remove-item').addEventListener('click', function(e) {
            e.stopPropagation();
            div.remove();
            updateCounter();
            showToast('Elemento rimosso', 'info');
            renumberItems();
        });

        div.querySelector('input').addEventListener('keydown', function(e) {
            if (e.key === 'Enter') {
                e.preventDefault();
                const btn = column === 'left' ?
                    document.querySelector('[data-column="left"]') :
                    document.querySelector('[data-column="right"]');
                if (btn) btn.click();
            }
        });

        column.appendChild(div);
        updateCounter();

        setTimeout(() => {
            div.querySelector('input').focus();
        }, 50);

        return div;
    }

    function renumberItems() {
        document.querySelectorAll('.column-item').forEach((item, index) => {
            const num = item.querySelector('.item-number');
            if (num) num.textContent = index + 1;
        });
    }

    function resetAll() {
        if (document.querySelectorAll('.column-item').length > 0) {
            if (!confirm('Sei sicuro di voler cancellare tutti gli elementi?')) return;
        }

        leftItems.innerHTML = '';
        rightItems.innerHTML = '';
        leftTitle.value = '';
        rightTitle.value = '';
        itemIdCounter = 0;

        updateCounter();
        showToast('Tutto resettato!', 'info');
        saveState();
    }

    function handleAddItem(column) {
        const container = column === 'left' ? leftItems : rightItems;
        createItem(container);
        saveState();
    }

    function saveState() {
        const state = {
            leftTitle: leftTitle.value,
            rightTitle: rightTitle.value,
            leftItems: [],
            rightItems: []
        };

        leftItems.querySelectorAll('.column-item input').forEach(input => {
            state.leftItems.push(input.value);
        });

        rightItems.querySelectorAll('.column-item input').forEach(input => {
            state.rightItems.push(input.value);
        });

        try {
            localStorage.setItem('aniquiz_columns', JSON.stringify(state));
        } catch (e) {}
    }

    function loadState() {
        try {
            const data = localStorage.getItem('aniquiz_columns');
            if (!data) return;

            const state = JSON.parse(data);

            if (state.leftTitle) leftTitle.value = state.leftTitle;
            if (state.rightTitle) rightTitle.value = state.rightTitle;

            if (state.leftItems && state.leftItems.length > 0) {
                state.leftItems.forEach(val => createItem(leftItems, val));
            }

            if (state.rightItems && state.rightItems.length > 0) {
                state.rightItems.forEach(val => createItem(rightItems, val));
            }

            updateCounter();

        } catch (e) {}
    }

    function setupAutoSave() {
        leftTitle.addEventListener('input', saveState);
        rightTitle.addEventListener('input', saveState);

        document.addEventListener('input', function(e) {
            if (e.target.closest('.column-item input')) {
                saveState();
            }
        });

        const observer = new MutationObserver(() => {
            saveState();
            updateCounter();
        });

        observer.observe(leftItems, { childList: true });
        observer.observe(rightItems, { childList: true });
    }

    function loadExampleData() {
        const examplesLeft = ['Goku', 'Naruto', 'Luffy', 'Saitama'];
        const examplesRight = ['Dragon Ball', 'Naruto', 'One Piece', 'One Punch Man'];
        
        examplesLeft.forEach(val => createItem(leftItems, val));
        examplesRight.forEach(val => createItem(rightItems, val));
        saveState();
    }

    // ============================================================
    // HIGHER OR LOWER
    // ============================================================
    
    function showHigherLower() {
        isHigherLowerActive = true;
        loading.style.display = 'none';
        errorState.classList.remove('show');
        quizArea.style.display = 'none';
        columnsMode.style.display = 'none';
        results.className = 'results';
        results.style.display = 'none';
        higherLowerContainer.style.display = 'block';
        
        // Aggiorna il titolo del quiz
        document.querySelector('.quiz-title').innerHTML = `
            <i class="fas fa-arrow-up" style="color:var(--accent-orange);"></i>
            <span style="font-weight:700;">Higher Or Lower?</span>
        `;
        
        // Ricarica l'iframe per refresh
        const iframe = higherLowerContainer.querySelector('iframe');
        if (iframe) {
            iframe.src = iframe.src;
        }
    }

    function hideHigherLower() {
        isHigherLowerActive = false;
        higherLowerContainer.style.display = 'none';
    }

    // ============================================================
    // FETCH ANIME
    // ============================================================
    
    async function fetchAnime() {
        const totalPages = Math.ceil(MAX_ANIME / PER_PAGE);
        const allAnimeResults = [];
        let loadedTotal = 0;
        let failedPages = 0;
        
        for (let batchStart = 0; batchStart < totalPages; batchStart += BATCH_SIZE) {
            const batchEnd = Math.min(batchStart + BATCH_SIZE, totalPages);
            const batchPromises = [];
            
            for (let page = batchStart + 1; page <= batchEnd; page++) {
                const query = `
                    query {
                        Page(page: ${page}, perPage: ${PER_PAGE}) {
                            pageInfo { hasNextPage }
                            media(type: ANIME, sort: POPULARITY_DESC, isAdult: false) {
                                id
                                title { romaji english native }
                                coverImage { large }
                                startDate { year }
                                studios { nodes { name } }
                                genres
                                characters(page: 1, perPage: 20) {
                                    nodes {
                                        id
                                        name { full }
                                        image { large }
                                    }
                                }
                            }
                        }
                    }
                `;
                
                batchPromises.push(
                    fetch('https://graphql.anilist.co', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Accept': 'application/json',
                        },
                        body: JSON.stringify({ query })
                    })
                    .then(res => {
                        if (!res.ok) throw new Error(`HTTP ${res.status}`);
                        return res.json();
                    })
                    .then(data => {
                        if (data.errors) throw new Error(data.errors[0].message);
                        return data.data.Page.media;
                    })
                    .catch(err => {
                        console.warn(`Errore pagina ${page}:`, err);
                        failedPages++;
                        return [];
                    })
                );
            }
            
            const batchResults = await Promise.all(batchPromises);
            
            for (const media of batchResults) {
                allAnimeResults.push(...media);
                loadedTotal += media.length;
                
                const percent = Math.min(100, (loadedTotal / MAX_ANIME) * 100);
                progressFillFull.style.width = `${percent}%`;
                loadedCount.textContent = loadedTotal;
                progressPercent.textContent = Math.round(percent);
            }
            
            const remainingPages = totalPages - (batchStart + BATCH_SIZE);
            if (remainingPages > 0) {
                document.querySelector('.loading-sub').textContent = 
                    `Caricati ${loadedTotal} anime su ${MAX_ANIME} (${remainingPages} pagine rimanenti)`;
            }
            
            if (batchEnd < totalPages) {
                await sleep(300);
            }
        }
        
        if (allAnimeResults.length === 0) {
            throw new Error('Impossibile caricare gli anime. Verifica la connessione.');
        }
        
        const uniqueMap = new Map();
        for (const anime of allAnimeResults) {
            if (!uniqueMap.has(anime.id)) {
                uniqueMap.set(anime.id, anime);
            }
        }
        
        const uniqueAnime = Array.from(uniqueMap.values());
        console.log(`✅ Caricati ${uniqueAnime.length} anime unici (${failedPages} pagine fallite)`);
        
        return shuffleArray(uniqueAnime);
    }

    // ============================================================
    // GENERATORI DOMANDE
    // ============================================================
    
    function generateCharacterQuestion(animeList) {
        const valid = animeList.filter(a => getCharacters(a).length > 2);
        if (valid.length < 4) return null;

        const media = pickRandom(valid);
        const chars = getCharacters(media);
        const character = pickRandom(chars);
        if (!character) return null;

        const correct = getTitle(media);
        const correctImage = getImage(media);
        const others = valid.filter(a => a.id !== media.id);
        if (others.length < 3) return null;

        const shuffledOthers = shuffleArray(others).slice(0, 3);
        const options = shuffleArray([
            { text: correct, image: correctImage, isCorrect: true },
            ...shuffledOthers.map(a => ({ text: getTitle(a), image: getImage(a), isCorrect: false }))
        ]);

        return {
            question: `In quale anime compare il personaggio <span class="highlight">"${character.name.full}"</span>?`,
            options: options,
            correct: correct,
            detail: `✅ "${character.name.full}" appare in <strong>"${correct}"</strong>`,
            showImageInQuestion: false,
            questionImage: null,
            isTextOnly: false
        };
    }

    function generateAnimeQuestion(animeList) {
        const media = pickRandom(animeList);
        if (!media) return null;

        const correct = getTitle(media);
        const correctImage = getImage(media);
        const others = animeList.filter(a => a.id !== media.id);
        if (others.length < 3) return null;

        const shuffledOthers = shuffleArray(others).slice(0, 3);
        const options = shuffleArray([
            { text: correct, image: correctImage, isCorrect: true },
            ...shuffledOthers.map(a => ({ text: getTitle(a), image: getImage(a), isCorrect: false }))
        ]);

        const chars = getCharacters(media);
        const character = chars.length > 0 ? pickRandom(chars) : null;

        const question = character ?
            `In quale di questi anime compare <span class="highlight">"${character.name.full}"</span>?` :
            `Quale di questi è l'anime <span class="highlight">"${correct}"</span>?`;

        return {
            question: question,
            options: options,
            correct: correct,
            detail: character ?
                `✅ "${character.name.full}" appare in <strong>"${correct}"</strong>` :
                `✅ L'anime corretto è <strong>"${correct}"</strong>`,
            showImageInQuestion: false,
            questionImage: null,
            isTextOnly: false
        };
    }

    function generateStudioQuestion(animeList) {
        const valid = animeList.filter(a => getStudio(a) !== 'Sconosciuto');
        if (valid.length < 4) return null;

        const media = pickRandom(valid);
        const correct = getStudio(media);
        const title = getTitle(media);
        const correctImage = getImage(media);

        const others = valid.filter(a => a.id !== media.id);
        if (others.length < 3) return null;

        const shuffledOthers = shuffleArray(others).slice(0, 3);
        const options = shuffleArray([
            { text: correct, icon: 'fa-building', isCorrect: true },
            ...shuffledOthers.map(a => ({ text: getStudio(a), icon: 'fa-building', isCorrect: false }))
        ]);

        return {
            question: `Quale studio ha animato <span class="highlight">"${title}"</span>?`,
            options: options,
            correct: correct,
            detail: `✅ "${title}" è stato animato da <strong>${correct}</strong>`,
            showImageInQuestion: true,
            questionImage: correctImage,
            title: title,
            isTextOnly: true
        };
    }

    function generateYearQuestion(animeList) {
        const valid = animeList.filter(a => a.startDate?.year && a.startDate.year > 1970);
        if (valid.length < 4) return null;

        const media = pickRandom(valid);
        const correct = String(getYear(media));
        const title = getTitle(media);
        const correctImage = getImage(media);

        const others = valid.filter(a => a.id !== media.id);
        if (others.length < 3) return null;

        const yearNum = parseInt(correct);
        const distractorYears = new Set();
        const offsets = [-5, -3, -1, 1, 2, 4, 6, 8];
        for (const offset of offsets) {
            const y = yearNum + offset;
            if (y > 1970 && y < 2030) {
                distractorYears.add(String(y));
            }
            if (distractorYears.size >= 3) break;
        }

        let distractors = Array.from(distractorYears);
        let attempts = 0;
        while (distractors.length < 3 && attempts < 50) {
            const other = pickRandom(others);
            if (other) {
                const y = String(getYear(other));
                if (y !== correct && !distractors.includes(y) && y !== '?') {
                    distractors.push(y);
                }
            }
            attempts++;
        }

        if (distractors.length < 3) return null;

        const options = shuffleArray([
            { text: correct, icon: 'fa-calendar', isCorrect: true },
            ...distractors.map(y => ({ text: y, icon: 'fa-calendar', isCorrect: false }))
        ]);

        return {
            question: `In che anno è uscito <span class="highlight">"${title}"</span>?`,
            options: options,
            correct: correct,
            detail: `✅ "${title}" è uscito nel <strong>${correct}</strong>`,
            showImageInQuestion: true,
            questionImage: correctImage,
            title: title,
            isTextOnly: true
        };
    }

    function generateGenreQuestion(animeList) {
        const valid = animeList.filter(a => a.genres && a.genres.length > 0);
        if (valid.length < 4) return null;

        const media = pickRandom(valid);
        const genres = getGenres(media);
        if (genres.length === 0) return null;

        const genre = pickRandom(genres);
        const title = getTitle(media);
        const correctImage = getImage(media);

        const notInGenre = valid.filter(a => 
            a.id !== media.id && 
            (!a.genres || !a.genres.includes(genre))
        );
        
        if (notInGenre.length < 3) return null;

        const shuffledDistractors = shuffleArray(notInGenre).slice(0, 3);
        
        const options = shuffleArray([
            { text: title, image: correctImage, isCorrect: true },
            ...shuffledDistractors.map(a => ({ 
                text: getTitle(a), 
                image: getImage(a), 
                isCorrect: false 
            }))
        ]);

        return {
            question: `Quale di questi anime appartiene al genere <span class="highlight">"${genre}"</span>?`,
            options: options,
            correct: title,
            detail: `✅ "<strong>${title}</strong>" è un anime di genere ${genre}`,
            showImageInQuestion: false,
            questionImage: null,
            isTextOnly: false
        };
    }

    function generateMixedQuestion(animeList) {
        const generators = [
            generateCharacterQuestion,
            generateAnimeQuestion,
            generateStudioQuestion,
            generateYearQuestion,
            generateGenreQuestion
        ];

        const generator = pickRandom(generators);
        let question = null;
        let attempts = 0;
        while (!question && attempts < 10) {
            question = generator(animeList);
            attempts++;
        }
        return question;
    }

    // ============================================================
    // QUIZ ENGINE
    // ============================================================
    
    function generateQuestions(type, animeList) {
        const generators = {
            character: generateCharacterQuestion,
            anime: generateAnimeQuestion,
            studio: generateStudioQuestion,
            year: generateYearQuestion,
            genre: generateGenreQuestion,
            mixed: generateMixedQuestion
        };

        const generator = generators[type] || generators.mixed;
        const questions = [];
        let attempts = 0;

        while (questions.length < QUESTIONS_PER_QUIZ && attempts < 300) {
            const q = generator(animeList);
            if (q && q.options && q.options.length === 4) {
                const duplicate = questions.some(existing =>
                    existing.question === q.question ||
                    (existing.correct === q.correct && existing.options.map(o => o.text).join(',') === q.options.map(o =>
                        o.text).join(','))
                );
                if (!duplicate) {
                    questions.push(q);
                }
            }
            attempts++;
        }

        return questions;
    }

    // ============================================================
    // RENDER QUIZ
    // ============================================================
    
    function renderQuestion(index) {
        const q = currentQuestions[index];
        if (!q) {
            console.warn('Domanda vuota, ricarico il quiz...');
            setTimeout(() => startQuiz(currentQuizType), 100);
            return;
        }

        questionText.innerHTML = q.question;
        
        questionImageContainer.innerHTML = '';
        if (q.showImageInQuestion && q.questionImage) {
            questionImageContainer.innerHTML = `
                <div class="question-image">
                    <img src="${q.questionImage}" alt="${q.title || 'Anime'}" onerror="this.style.display='none'">
                </div>
            `;
        }

        totalQuestionsCount.textContent = currentQuestions.length;
        currentQuestionSpan.textContent = index + 1;
        progressFill.style.width = `${((index) / currentQuestions.length) * 100}%`;

        feedback.className = 'feedback-area';
        feedback.classList.remove('show', 'correct', 'wrong');

        const letters = ['A', 'B', 'C', 'D'];
        optionsGrid.innerHTML = '';
        q.options.forEach((opt, i) => {
            const btn = document.createElement('button');
            btn.className = 'option-btn';
            
            let contentHtml = '';
            
            if (q.isTextOnly) {
                contentHtml = `
                    <span class="letter">${letters[i]}</span>
                    <div style="display:flex;flex-direction:column;align-items:center;gap:8px;padding:12px 0;">
                        <i class="fas ${opt.icon || 'fa-question'}" style="font-size:2.5rem;color:var(--accent-purple);opacity:0.7;"></i>
                        <span class="option-text">${opt.text}</span>
                    </div>
                `;
            } else if (opt.image) {
                contentHtml = `
                    <span class="letter">${letters[i]}</span>
                    <img src="${opt.image}" class="option-image" alt="${opt.text}" onerror="this.style.display='none'">
                    <span class="option-text">${opt.text}</span>
                `;
            } else {
                contentHtml = `
                    <span class="letter">${letters[i]}</span>
                    <span class="option-text">${opt.text}</span>
                `;
            }
            
            btn.innerHTML = contentHtml;
            btn.dataset.index = i;
            btn.addEventListener('click', () => handleOptionClick(i));
            optionsGrid.appendChild(btn);
        });

        nextBtn.className = 'next-btn';
        nextBtn.style.display = 'none';
        nextBtn.innerHTML = 'Prossima Domanda <i class="fas fa-arrow-right"></i>';

        isAnswered = false;
    }

    function handleOptionClick(index) {
        if (isAnswered) return;
        isAnswered = true;

        const q = currentQuestions[currentIndex];
        const btns = optionsGrid.querySelectorAll('.option-btn');
        const isCorrect = q.options[index].isCorrect;

        if (isCorrect) score++;

        feedback.className = 'feedback-area show';
        if (isCorrect) {
            feedback.classList.add('correct');
            feedbackTitle.textContent = '🎉 Corretto!';
        } else {
            feedback.classList.add('wrong');
            feedbackTitle.textContent = '❌ Sbagliato!';
        }
        feedbackDetail.innerHTML = q.detail;

        btns.forEach((btn, i) => {
            btn.classList.add('disabled');
            if (q.options[i].isCorrect) {
                btn.classList.add('correct');
            } else if (i === index && !isCorrect) {
                btn.classList.add('wrong');
            }
        });

        nextBtn.style.display = 'flex';
        nextBtn.className = 'next-btn show';
        
        if (currentIndex === currentQuestions.length - 1) {
            nextBtn.innerHTML = 'Vedi Risultati 🏆';
        } else {
            nextBtn.innerHTML = 'Prossima Domanda <i class="fas fa-arrow-right"></i>';
        }
    }

    function showResults() {
        quizArea.style.display = 'none';
        results.className = 'results show';
        results.style.display = 'flex';

        const total = currentQuestions.length;
        const wrong = total - score;
        const accuracy = Math.round((score / total) * 100);

        resultScore.textContent = `${score}/${total}`;
        resultCorrect.textContent = score;
        resultWrong.textContent = wrong;
        resultAccuracy.textContent = `${accuracy}%`;

        if (accuracy === 100) {
            resultIcon.textContent = '🏆';
            resultLabel.textContent = 'Perfetto! Sei un vero esperto di anime!';
        } else if (accuracy >= 80) {
            resultIcon.textContent = '🌟';
            resultLabel.textContent = 'Ottimo! Conosci davvero bene gli anime!';
        } else if (accuracy >= 60) {
            resultIcon.textContent = '📚';
            resultLabel.textContent = 'Buon lavoro! Continua a guardare anime!';
        } else if (accuracy >= 40) {
            resultIcon.textContent = '🤔';
            resultLabel.textContent = 'Non male, ma puoi fare di meglio!';
        } else {
            resultIcon.textContent = '😅';
            resultLabel.textContent = 'Forse è ora di guardare più anime!';
        }
    }

    // ============================================================
    // START QUIZ
    // ============================================================
    
    function startQuiz(type) {
        // Se è Higher Or Lower, nascondilo
        hideHigherLower();
        
        if (isLoading) {
            console.log('Caricamento in corso, aspetto...');
            return;
        }
        
        if (allAnime.length < 10) {
            errorMessage.textContent = 'Non ci sono abbastanza anime disponibili.';
            errorDetail.innerHTML = `
                <i class="fas fa-info-circle"></i>
                <span>Caricati solo ${allAnime.length} anime su ${MAX_ANIME}. Riprova più tardi.</span>
            `;
            errorState.classList.add('show');
            loading.style.display = 'none';
            quizArea.style.display = 'none';
            columnsMode.style.display = 'none';
            results.className = 'results';
            results.style.display = 'none';
            return;
        }

        // Se è colonne, mostralo
        if (type === 'columns') {
            loading.style.display = 'none';
            errorState.classList.remove('show');
            quizArea.style.display = 'none';
            results.className = 'results';
            results.style.display = 'none';
            columnsMode.style.display = 'block';
            
            document.querySelector('.quiz-title').innerHTML = `
                <i class="fas fa-columns" style="color:var(--accent-blue);"></i>
                <span style="font-weight:700;">Associazione Colonne</span>
            `;
            return;
        }

        // Altrimenti è un quiz normale
        currentQuizType = type;
        currentIndex = 0;
        score = 0;
        isAnswered = false;

        results.className = 'results';
        results.style.display = 'none';
        errorState.classList.remove('show');
        columnsMode.style.display = 'none';
        quizArea.style.display = 'none';
        loading.style.display = 'flex';
        loading.querySelector('.loading-text').textContent = 'Generazione domande in corso...';
        loading.querySelector('.loading-sub').textContent = `Abbiamo ${allAnime.length} anime disponibili!`;
        document.querySelector('.loading-progress').style.display = 'none';

        setTimeout(() => {
            const questions = generateQuestions(type, allAnime);
            
            if (questions.length < 5) {
                errorMessage.textContent = 'Impossibile generare abbastanza domande per questo quiz. Riprova.';
                errorDetail.innerHTML = `
                    <i class="fas fa-info-circle"></i>
                    <span>Generate solo ${questions.length} domande su ${QUESTIONS_PER_QUIZ} richieste.</span>
                `;
                errorState.classList.add('show');
                loading.style.display = 'none';
                return;
            }

            currentQuestions = questions;
            totalQuestionsSpan.textContent = questions.length;

            const titles = {
                character: 'Quiz Personaggio',
                anime: 'Quiz "In quale Anime?"',
                studio: 'Quiz Studio Animazione',
                year: 'Quiz Anno di Uscita',
                genre: 'Quiz Generi',
                mixed: 'Quiz Misto 🔥'
            };
            
            document.querySelector('.quiz-title').innerHTML = `
                <i class="fas fa-question-circle" style="color:var(--accent-purple);"></i>
                <span style="font-weight:700;">${titles[type] || 'Quiz'}</span>
            `;

            loading.style.display = 'none';
            quizArea.style.display = 'block';
            
            renderQuestion(0);
        }, 10);
    }

    // ============================================================
    // LOAD ANIME
    // ============================================================
    
    async function loadAnime() {
        if (isLoading) return;
        
        if (isDataLoaded && allAnime.length > 0) {
            startQuiz(currentQuizType);
            return;
        }
        
        isLoading = true;

        loading.style.display = 'flex';
        loading.querySelector('.loading-text').textContent = 'Caricamento anime in corso...';
        loading.querySelector('.loading-sub').textContent = `Stiamo caricando fino a ${MAX_ANIME} anime (20 pagine)`;
        document.querySelector('.loading-progress').style.display = 'flex';
        progressFillFull.style.width = '0%';
        loadedCount.textContent = '0';
        progressPercent.textContent = '0';
        
        errorState.classList.remove('show');
        quizArea.style.display = 'none';
        columnsMode.style.display = 'none';
        hideHigherLower();
        results.className = 'results';
        results.style.display = 'none';

        try {
            const data = await fetchAnime();
            if (!data || data.length < 10) {
                throw new Error('Pochi anime disponibili');
            }

            allAnime = data;
            isDataLoaded = true;
            totalAnimeSpan.textContent = allAnime.length;
            footerAnimeCount.textContent = allAnime.length;

            // Carica dati di esempio per le colonne se non ci sono elementi
            if (document.querySelectorAll('.column-item').length === 0) {
                const hasSaved = localStorage.getItem('aniquiz_columns');
                if (!hasSaved) {
                    loadExampleData();
                }
            }

            isLoading = false;
            startQuiz(currentQuizType);

        } catch (err) {
            console.error(err);
            errorMessage.textContent = 'Errore nel caricamento degli anime.';
            errorDetail.innerHTML = `
                <i class="fas fa-info-circle"></i>
                <span>⚠️ ${err.message || 'Verifica la connessione e riprova.'}</span>
            `;
            errorState.classList.add('show');
            loading.style.display = 'none';
            isLoading = false;
        }
    }

    // ============================================================
    // EVENT LISTENERS
    // ============================================================
    
    // Quiz buttons
    quizBtns.forEach(btn => {
        btn.addEventListener('click', function() {
            if (isLoading) {
                console.log('Caricamento in corso, attendi...');
                return;
            }
            quizBtns.forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            const type = this.dataset.quiz;
            
            // Se è Higher Or Lower
            if (type === 'higherlower') {
                showHigherLower();
                return;
            }
            
            if (allAnime.length > 0) {
                startQuiz(type);
            } else {
                currentQuizType = type;
                loadAnime();
            }
        });
    });

    // Next button
    nextBtn.addEventListener('click', function() {
        if (currentIndex < currentQuestions.length - 1) {
            currentIndex++;
            renderQuestion(currentIndex);
        } else {
            showResults();
        }
    });

    // Restart button
    restartBtn.addEventListener('click', function() {
        if (allAnime.length > 0) {
            startQuiz(currentQuizType);
        } else {
            loadAnime();
        }
    });

    // Retry button
    retryBtn.addEventListener('click', loadAnime);

    // ============================================================
    // COLUMNS EVENT LISTENERS
    // ============================================================
    
    document.querySelectorAll('.add-item-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const column = this.dataset.column;
            handleAddItem(column);
        });
    });

    resetBtn.addEventListener('click', resetAll);

    // ============================================================
    // KEYBOARD SHORTCUTS
    // ============================================================
    
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Enter' && nextBtn.style.display === 'flex' && nextBtn.classList.contains('show')) {
            e.preventDefault();
            nextBtn.click();
        }
        if (e.key >= '1' && e.key <= '4' && !isAnswered) {
            const idx = parseInt(e.key) - 1;
            const btns = optionsGrid.querySelectorAll('.option-btn');
            if (btns[idx] && !btns[idx].classList.contains('disabled')) {
                btns[idx].click();
            }
        }
        // Ctrl+Shift+R per reset delle colonne
        if (e.ctrlKey && e.shiftKey && e.key === 'R') {
            e.preventDefault();
            resetAll();
        }
    });

    // ============================================================
    // INIT
    // ============================================================
    
    // Load saved columns state
    loadState();
    setupAutoSave();
    updateCounter();

    // Load anime and start quiz
    loadAnime();

})();
