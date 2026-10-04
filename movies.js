document.addEventListener("DOMContentLoaded", async () => {

    const API_KEY = "e58f33fbc663fd74b0d4d71373e9f7fa";
    const phase1IDs = [1726, 1724, 10138, 10195, 1771, 24428];
    const phase2IDs = [68721, 76338, 100402, 118340, 99861, 102899];
    const phase3IDs = [271110, 284052, 283995, 315635, 284053, 284054, 299536, 363088, 299537, 299534, 429617];
    const phase4IDs = [497698, 566525, 524434, 634649, 453395, 616037, 505642];
    const phase5IDs = [640146, 447365, 609681, 533535, 822119, 986056];
    const phase6IDs = [617126, 969681];

    const CUSTOM_ORDER = [
        1771, 299537, 1726, 10138, 1724, 10195, 24428, 68721, 76338, 100402, 118340,
        283995, 99861, 102899, 271110, 497698, 284054, 315635, 284052, 284053, 363088, 453395,
        299536, 299534, 429617, 566525, 524434, 616037, 634649, 505642, 640146, 447365,
        986056, 609681, 822119, 533535, 617126, 969681
    ];

    const movieState = JSON.parse(localStorage.getItem("marvelState") || "{}");

    function saveMovieState() {
        localStorage.setItem("marvelState", JSON.stringify(movieState));
    }

    async function fetchMovie(id) {
        const response = await fetch(`https://api.themoviedb.org/3/movie/${id}?api_key=${API_KEY}`);
        return response.json();
    }

    async function fetchCredits(id) {
        const response = await fetch(`https://api.themoviedb.org/3/movie/${id}/credits?api_key=${API_KEY}`);
        return response.json();
    }

    function convertMovieData(apiMovie, credits) {
        const directorObj = credits.crew.find(p => p.job === "Director");

        return {
            id: apiMovie.id,
            title: apiMovie.title,
            year: apiMovie.release_date ? apiMovie.release_date.slice(0,4) : "N/A",
            poster: apiMovie.poster_path ? `https://image.tmdb.org/t/p/w500${apiMovie.poster_path}` : "https://via.placeholder.com/500x750?text=No+Poster",
            director: directorObj ? directorObj.name : "Unknown",
            runtime: apiMovie.runtime ? apiMovie.runtime + " min" : "N/A",
            rating: apiMovie.vote_average ? apiMovie.vote_average.toFixed(1) : "0.0",
            desc: apiMovie.overview || "No description."
        };
    }

    function createCard(movie) {
        const card = document.createElement("div");
        card.classList.add("movie-card");
        card.dataset.id = movie.id;

        card.innerHTML = `
            <div class="movie-card-inner">
                <div class="card-front">
                    <img src="${movie.poster}" alt="${movie.title}">
                </div>

                <div class="card-back">
                    <h3>${movie.title} (${movie.year})</h3>
                    <p>Director: ${movie.director}</p>
                    <p>Runtime: ${movie.runtime}</p>
                    <p>Rating: ${movie.rating}</p>
                    <p class="desc">${movie.desc}</p>

                    <div class="card-buttons">
                        <button class="watched-button">Watched</button>
                        <button class="rewatch-minus">-</button>
                        <span class="rewatch-count">0</span>
                        <button class="rewatch-plus">+</button>
                    </div>
                </div>
            </div>

        `;

        if (movieState[movie.id]) {
            if (movieState[movie.id].watched) {
                card.classList.add("watched");
                card.querySelector(".watched-button").classList.add("active");
            }
            card.querySelector(".rewatch-count").textContent = movieState[movie.id].rewatch || 0;   
        }

        return card;
    }

    async function loadPhase(phaseIDs, phaseNumber) {
        const row = document.querySelector(`[data-phase="${phaseNumber}"] .phase-row`);
        for (const id of phaseIDs) {
            const apiMovie = await fetchMovie(id);
            const credits = await fetchCredits(id);
            const movie = convertMovieData(apiMovie, credits);

            movieState[id] = movieState[id] || {watched: false, rewatch: 0};
            const card = createCard(movie);
            row.appendChild(card);
        }
    }

    async function loadChronological() {
        const grid = document.querySelector(".chronological-grid");
        for (const id of CUSTOM_ORDER) {
            const apiMovie = await fetchMovie(id);
            const credits = await fetchCredits(id);
            const movie = convertMovieData(apiMovie, credits);

            movieState[id] = movieState [id] || {watched: false, rewatch: 0};
            const card = createCard(movie);
            grid.appendChild(card);
        }
    }

    function updateOverallPercentage() {
        const activeView = document.querySelector("#release-view:not(.hidden), #chronological-view:not(.hidden)");
        if (!activeView) return;

        const total = activeView.querySelectorAll(".movie-card").length;
        const watched = activeView.querySelectorAll(".movie-card.watched").length;

        const percent = total ? Math.round ((watched / total) * 100) : 0;
        document.querySelector(".overall-percent").textContent = percent + "%";

        document.querySelectorAll(".phase-block").forEach(block => {
            const row = block.querySelector(".phase-row");
            const cards = row.querySelectorAll(".movie-card");
            const watchedCards = row.querySelectorAll(".movie-card.watched");

            const phasePercent = cards.length ? Math.round((watchedCards.length / cards.length) * 100) : 0;

            block.querySelector(".phase-percent").textContent = phasePercent + "%";

        });

    }

    document.addEventListener("click", (e) => {
        const btn = e.target.closest("button");
        if (!btn) return;

        const card = btn.closest(".movie-card");
        if (!card) return;

        const id = card.dataset.id;
        movieState[id] = movieState[id] || {watched: false, rewatch: 0};

        if (btn.classList.contains("watched-button")) {
            movieState[id].watched = !movieState[id].watched;

            document.querySelectorAll(`.movie-card[data-id="${id}"]`).forEach(c => {
                c.classList.toggle("watched", movieState[id].watched);
                c.querySelector(".watched-button").classList.toggle("active", movieState[id].watched);

            });

            saveMovieState();
            updateOverallPercentage();
            return;

        }

        if (btn.classList.contains("rewatch-plus") || btn.classList.contains("rewatch-minus")) {
           const delta = btn.classList.contains("rewatch-plus") ? 1 : -1;
           movieState[id].rewatch = Math.max(0, movieState[id].rewatch + delta);
           
            document.querySelectorAll(`.movie-card[data-id="${id}"] .rewatch-count`)
                .forEach(span => span.textContent = movieState[id].rewatch);
            
            saveMovieState();
            return;
            
        }

    });

    document.querySelector('[data-sort="release"]').addEventListener("click", () => {
        document.getElementById("release-view").classList.remove("hidden");
        document.getElementById("chronological-view").classList.add("hidden");

        document.querySelector('[data-sort="release"]').classList.add("active");
        document.querySelector('[data-sort="chronological"]').classList.remove("active")
        updateOverallPercentage();
    });

    document.querySelector('[data-sort="chronological"]').addEventListener("click", () =>{
        document.getElementById("release-view").classList.add("hidden");
        document.getElementById("chronological-view").classList.remove("hidden");

        document.querySelector('[data-sort="chronological"]').classList.add("active");
        document.querySelector('[data-sort="release"]').classList.remove("active")
        updateOverallPercentage();
    });

    await loadPhase(phase1IDs, 1);
    await loadPhase(phase2IDs, 2);
    await loadPhase(phase3IDs, 3);
    await loadPhase(phase4IDs, 4);
    await loadPhase(phase5IDs, 5);
    await loadPhase(phase6IDs, 6);

    await loadChronological();
    updateOverallPercentage();

})