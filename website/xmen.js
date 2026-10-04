document.addEventListener("DOMContentLoaded", async () => {

    const movieState = JSON.parse(localStorage.getItem("xmenState") || "{}");

    function saveMovieState() {
        localStorage.setItem("xmenState", JSON.stringify(movieState));
    }

    const API_KEY = "e58f33fbc663fd74b0d4d71373e9f7fa";

    const release_order = [36657, 36658, 36668, 2080, 49538, 76170, 127585, 293660, 246655, 263115, 383498, 320288, 340102, 533535];
    const chronological_order = [49538, 127585, 2080, 246655, 320288, 36657, 36658, 36668, 76170, 293660, 340102, 383498, 263115, 533535];

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
            title: apiMovie.title,
            year: apiMovie.release_date ? apiMovie.release_date.slice(0, 4) : "N/A",
            poster: apiMovie.poster_path ? `https://image.tmdb.org/t/p/w500${apiMovie.poster_path}` : "https://via.placeholder.com/500x750?text=No+Poster",
            director: directorObj ? directorObj.name : "Unknown",
            runtime: apiMovie.runtime ? apiMovie.runtime + " min" : "N/A",
            rating: apiMovie.vote_average ? apiMovie.vote_average.toFixed(1) : "0.0",
            desc: apiMovie.overview || "No description.",
            id: apiMovie.id
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

            if (movieState[movie.id].rewatch !== undefined) {
                card.querySelector(".rewatch-count").textContent = movieState[movie.id].rewatch;
            }
        }

        return card;
    }

    async function loadReleaseOrder(){
        const grid = document.querySelector(".release-grid");
        

        for (const id of release_order) {
            const apiMovie = await fetchMovie(id);
            const credits = await fetchCredits(id);
            const movie = await convertMovieData(apiMovie, credits);
            movieState[id] = movieState[id] || {watched: false, rewatch: 0};
            const card = createCard(movie);
            grid.appendChild(card);
        }
    }

    async function loadChronologicalOrder() {
        const grid = document.querySelector(".chronological-grid");

        for (const id of chronological_order) {
             const apiMovie = await fetchMovie(id);
            const credits = await fetchCredits(id);
            const movie = await convertMovieData(apiMovie, credits);
            movieState[id] = movieState[id] || {watched: false, rewatch: 0};
            const card = createCard(movie);
            grid.appendChild(card);
        }
    }

    function updateOverallPercentage() {
        const activeView = document.querySelector("#release-view:not(.hidden), #chronological-view:not(.hidden)");
        if (!activeView) return;
        const total = activeView.querySelectorAll(".movie-card").length;
        const watchedCards = activeView.querySelectorAll(".movie-card.watched").length;

        const percent = total ? Math.round((watchedCards / total) * 100) : 0;
        const percentElement = document.getElementById("overall-percent");
        if (percentElement) percentElement.textContent = percent + "%";
    }

    document.addEventListener("click", (e) => {
        const btn = e.target.closest("button");
        if (!btn) return;

        if (btn.classList.contains("watched-button")) {
            btn.classList.toggle("active");
            const card = btn.closest(".movie-card");
            const id = card.dataset.id;
            card.classList.toggle("watched");

            movieState[id] = movieState[id] || {};
            movieState[id].watched = card.classList.contains("watched");
            document.querySelectorAll(".movie-card").forEach(otherCard => {
                if (otherCard.dataset.id === id) {
                    otherCard.classList.toggle("watched", movieState[id].watched);
                    otherCard.querySelector(".watched-button").classList.toggle("active", movieState[id].watched);
                }
            });
            saveMovieState();

            updateOverallPercentage();
            return;
        }

        if (btn.classList.contains("rewatch-plus") || btn.classList.contains("rewatch-minus")) {
            const card = btn.closest(".movie-card");
            const id = card.dataset.id;

            const countSpan = btn.parentElement.querySelector(".rewatch-count");
            const change = btn.classList.contains("rewatch-plus") ? 1 : -1;
            const newValue = Math.max(0, Number(countSpan.textContent) + change);
            countSpan.textContent = newValue;

            movieState[id] = movieState[id] || {};
            movieState[id].rewatch = newValue;
            document.querySelectorAll(".movie-card").forEach(otherCard => {
                if (otherCard.dataset.id === id) {
                    otherCard.querySelector(".rewatch-count").textContent = newValue;
                }
            });
            saveMovieState();

            return;
        }
    });

    document.querySelector('[data-sort="release"]').addEventListener("click", () => {
        document.getElementById("release-view").classList.remove("hidden");
        document.getElementById("chronological-view").classList.add("hidden");

        document.querySelector('[data-sort="release"]').classList.add("active");
        document.querySelector('[data-sort="chronological"]').classList.remove("active");
        updateOverallPercentage();
    });

    document.querySelector('[data-sort="chronological"]').addEventListener ("click", () => {
        document.getElementById("release-view").classList.add("hidden");
        document.getElementById("chronological-view").classList.remove("hidden");

        document.querySelector('[data-sort="chronological"]').classList.add("active");
        document.querySelector('[data-sort="release"]').classList.remove("active");
        updateOverallPercentage();
    });

    await loadReleaseOrder();
    await loadChronologicalOrder();

    document.querySelector('[data-sort="release"]').classList.add("active");
    
    updateOverallPercentage();

})