// ============================================================
// MAIN.JS - Utility condivise per tutti i quiz
// VERSIONE: 50 anime (mix di 5 ordinamenti in parallelo)
// ============================================================

(function() {
    'use strict';

    const PER_PAGE = 10; // 10 anime per categoria
    const TOTAL_CATEGORIES = 5; // 5 categorie diverse
    const TOTAL_ANIME = 50; // 10 x 5 = 50 anime totali

    window.allAnime = [];
    window.isDataLoaded = false;
    window.isLoading = false;

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

    // ===== COSTRUISCI QUERY (MULTIPLA) =====
    function buildMultiQuery() {
        // 5 ordinamenti diversi su 5 pagine
        const sorts = [
            { name: 'popolari', sort: 'POPULARITY_DESC', page: 1 },
            { name: 'trending', sort: 'TRENDING_DESC', page: 1 },
            { name: 'votati', sort: 'SCORE_DESC', page: 1 },
            { name: 'recenti', sort: 'START_DATE_DESC', page: 1 },
            { name: 'casuali', sort: 'POPULARITY_DESC', page: Math.floor(Math.random() * 20) + 1 }
        ];

        // Costruisce la query con 5 richieste in una
        let query = 'query {';
        
        sorts.forEach((s, index) => {
            const alias = `cat${index + 1}`;
            query += `
                ${alias}: Page(page: ${s.page}, perPage: ${PER_PAGE}) {
                    pageInfo { hasNextPage }
                    media(type: ANIME, sort: ${s.sort}, isAdult: false) {
                        id
                        title { romaji english native }
                        coverImage { large }
                        startDate { year }
                        studios { nodes { name } }
                        genres
                        characters(page: 1, perPage: 10) {
                            nodes {
                                id
                                name { full }
                                image { large }
                            }
                        }
                    }
                }
            `;
        });

        query += '}';
        return query;
    }

    // ===== FETCH ANIME MISTO (1 RICHIESTA) =====
    async function fetchMixedAnime() {
        const query = buildMultiQuery();
        
        try {
            const response = await fetch('https://graphql.anilist.co', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                },
                body: JSON.stringify({ query })
            });

            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            
            const data = await response.json();
            if (data.errors) throw new Error(data.errors[0].message);
            
            // Unisci tutti i risultati
            const allAnimeResults = [];
            const categories = ['cat1', 'cat2', 'cat3', 'cat4', 'cat5'];
            
            categories.forEach((cat, index) => {
                const categoryData = data.data[cat]?.media || [];
                const names = ['Popolari', 'Trending', 'Votati', 'Recenti', 'Casuali'];
                console.log(`📊 ${names[index]}: ${categoryData.length} anime`);
                allAnimeResults.push(...categoryData);
            });

            // Elimina duplicati (stesso ID)
            const uniqueMap = new Map();
            for (const anime of allAnimeResults) {
                if (!uniqueMap.has(anime.id)) {
                    uniqueMap.set(anime.id, anime);
                }
            }
            
            const uniqueAnime = Array.from(uniqueMap.values());
            console.log(`✅ Caricati ${uniqueAnime.length} anime unici (mix di 5 categorie)`);
            
            // Shuffle finale per mescolare tutto
            return shuffleArray(uniqueAnime);

        } catch (err) {
            console.error('Errore fetch:', err);
            throw err;
        }
    }

    // ===== CARICA ANIME (PUBBLICA) =====
    window.loadAnimeData = async function() {
        if (window.isLoading) return;
        
        if (window.isDataLoaded && window.allAnime.length > 0) {
            return window.allAnime;
        }
        
        window.isLoading = true;

        try {
            // Mostra progresso
            const progressFill = document.getElementById('progressFillFull');
            const loadedCount = document.getElementById('loadedCount');
            const progressPercent = document.getElementById('progressPercent');
            const loadingSub = document.querySelector('.loading-sub');
            
            if (progressFill) progressFill.style.width = '10%';
            if (loadedCount) loadedCount.textContent = '0';
            if (progressPercent) progressPercent.textContent = '10';
            if (loadingSub) loadingSub.textContent = 'Caricamento anime in corso...';

            const data = await fetchMixedAnime();
            
            if (!data || data.length < 10) {
                throw new Error('Pochi anime disponibili');
            }

            window.allAnime = data;
            window.isDataLoaded = true;
            
            // Aggiorna i contatori
            const totalAnimeSpan = document.getElementById('totalAnime');
            const footerAnimeCount = document.getElementById('footerAnimeCount');
            const totalQuestionsSpan = document.getElementById('totalQuestions');
            
            if (totalAnimeSpan) totalAnimeSpan.textContent = data.length;
            if (footerAnimeCount) footerAnimeCount.textContent = data.length;
            if (totalQuestionsSpan) totalQuestionsSpan.textContent = data.length * 10;

            // Progresso al 100%
            if (progressFill) progressFill.style.width = '100%';
            if (loadedCount) loadedCount.textContent = data.length;
            if (progressPercent) progressPercent.textContent = '100';

            window.isLoading = false;
            return data;

        } catch (err) {
            console.error(err);
            window.isLoading = false;
            throw err;
        }
    };

    // ===== GENERATORI DOMANDE =====
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

    // ===== GENERA DOMANDE (PUBBLICA) =====
    window.generateQuestions = function(type, animeList) {
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

        while (questions.length < 10 && attempts < 300) {
            const q = generator(animeList);
            if (q && q.options && q.options.length === 4) {
                const duplicate = questions.some(existing =>
                    existing.question === q.question ||
                    (existing.correct === q.correct && 
                     existing.options.map(o => o.text).join(',') === q.options.map(o => o.text).join(','))
                );
                if (!duplicate) {
                    questions.push(q);
                }
            }
            attempts++;
        }

        return questions;
    };

})();
