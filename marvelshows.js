document.addEventListener("DOMContentLoaded", async () => {

    const API_KEY = "e58f33fbc663fd74b0d4d71373e9f7fa";

    const show_list = [1403, 61550, 61889, 38472, 62126, 62127, 62285, 68716, 67178,
                        67466, 66190, 85271, 88396, 84958, 91363, 88329, 92749, 92782,
                        92783, 114472, 122226, 138501, 202555, 114471,];

    const showState = JSON.parse(localStorage.getItem("marvelShowsState") || "{}");

    function saveState() {
        localStorage.setItem("marvelShowsState", JSON.stringify(showState));
    }

    let currentShowId = null;
    let currentSeasonNumber = 1;

    async function fetchShow(id) {
        const res = await fetch(`https://api.themoviedb.org/3/tv/${id}?api_key=${API_KEY}`);
        return res.json();       
    }

    async function fetchSeason(showId, seasonNumber) {
        const res = await fetch(`https://api.themoviedb.org/3/tv/${showId}/season/${seasonNumber}?api_key=${API_KEY}`);
        return res.json();
    }

    function createShowCard(show) {
        const card = document.createElement("div");
        card.classList.add("movie-card");
        card.dataset.showId = show.id;

        const poster = show.poster_path ? `https://image.tmdb.org/t/p/w500${show.poster_path}` : "https://via.placeholder.com/500x750?text=No+Poster";
        const percent = calculateShowPercent(show.id);

        card.innerHTML = `
            <div class="movie-card-inner">
                <div class="card-front">
                    <img src="${poster}" alt="${show.name}">
                </div>
                
                <div class="card-back">
                    <h3>${show.name}</h3>
                    <p class="desc">${show.overview || "No description available."}</p>

                    <p class="show-percent-label">
                        Episodes watched: <span class="show-percent">${percent}%</span>
                    </p>

                    <div class="card-buttons">
                        <button class="info-button">More Info</button>
                        <button class="rewatch-minus">-</button>
                        <span class="rewatch-count">${getRewatch(show.id)}</span>
                        <button class="rewatch-plus">+</button>
                    </div>
                </div>
            </div>
        `;

        return card;
    }

    async function loadShows() {
        const grid = document.getElementById("shows-grid");

        for (const show of show_list) {
            const apiShow = await fetchShow(show);
            const card = createShowCard(apiShow);
            grid.appendChild(card);
        }

        updateOverallPercent();
    }

    
    const modalOverlay = document.querySelector(".modal-overlay");
    const modalBannerImg = document.querySelector(".modal-banner-img");
    const modalTitle = document.querySelector(".modal-title");
    const modalOverview = document.querySelector(".modal-overview");
    const modalRating = document.querySelector(".modal-rating")
    const modalShowPercent = document.querySelector(".modal-show-percent");
    const modalRewatchCount = document.querySelector(".show-rewatch-count");

    const seasonSelect = document.getElementById("season-select");
    const seasonPercent = document.querySelector(".season-percent");
    const episodesContainer = document.querySelector(".modal-episodes");

    document.addEventListener("click", async (e) => {
        if (e.target.classList.contains("info-button")) {
            const card = e.target.closest(".movie-card");
            currentShowId = Number(card.dataset.showId);

            const show = await fetchShow(currentShowId);

            showState[currentShowId] = showState[currentShowId] || {watchedEpisodes: {}, rewatch: 0};
            for (const season of show.seasons) {
                if (season.season_number > 0) {
                    const seasonData = await fetchSeason(currentShowId, season.season_number);
                    seasonData.episodes.forEach(ep => {
                        if (!(ep.id in showState[currentShowId].watchedEpisodes)) {
                            showState[currentShowId].watchedEpisodes[ep.id] = false;
                        }
                    });
                }
            }

            saveState();

            modalBannerImg.src = show.backdrop_path ? `https://image.tmdb.org/t/p/w1280${show.backdrop_path}` : "https://via.placeholder.com/1280x720?text=No+Banner";
            modalTitle.textContent = show.name;
            modalOverview.textContent = show.overview || "No overview available.";
            modalRating.textContent = `Rating: ${show.vote_average.toFixed(1)}`;
            
            modalShowPercent.textContent = calculateShowPercent(currentShowId) + "%";
            modalRewatchCount.textContent = getRewatch(currentShowId);

            seasonSelect.innerHTML = "";
            show.seasons.forEach(season => {
                if (season.season_number > 0) {
                    const opt = document.createElement("option");
                    opt.value = season.season_number;
                    opt.textContent = `Season ${season.season_number}`;
                    seasonSelect.appendChild(opt);
                }
            });

            currentSeasonNumber = Number(seasonSelect.value);

            const seasonData = await fetchSeason(currentShowId, currentSeasonNumber);
            renderEpisodes(seasonData);

            modalOverlay.classList.remove("hidden");
        }

        if (e.target.classList.contains("modal-close")) {
            modalOverlay.classList.add("hidden");
        }

        if (e.target.classList.contains("episode-watched-button")) {
            const epItem = e.target.closest(".episode-item");
            const epId = epItem.dataset.epId;

            toggleEpisodeWatched(currentShowId, epId);

            e.target.classList.toggle("active", isEpisodeWatched(currentShowId, epId));
            updateSeasonPercent();
            updateShowPercent();
            updateOverallPercent();
        }

        if (e.target.classList.contains("rewatch-plus")) {
            incrementRewatch(currentShowId);
            modalRewatchCount.textContent = getRewatch(currentShowId);
            updateCardRewatch(currentShowId);
        }

        if (e.target.classList.contains("rewatch-minus")) {
            decrementRewatch(currentShowId);
            modalRewatchCount.textContent = getRewatch(currentShowId);
            updateCardRewatch(currentShowId);
        }
    });

    seasonSelect.addEventListener("change", async () => {
        currentSeasonNumber = Number(seasonSelect.value);
        const seasonData = await fetchSeason(currentShowId, currentSeasonNumber);
        renderEpisodes(seasonData);
        updateSeasonPercent();
    });

    function renderEpisodes(seasonData) {
        showState[currentShowId] = showState[currentShowId] || {watchedEpisodes: {}, rewatch: 0};
        seasonData.episodes.forEach(ep => {
            if (!(ep.id in showState[currentShowId].watchedEpisodes)) {
                showState[currentShowId].watchedEpisodes[ep.id] = false;
            }
        });
        saveState();

        episodesContainer.innerHTML = "";

        seasonData.episodes.forEach(ep => {
            const item = document.createElement("div");
            item.classList.add("episode-item");
            item.dataset.epId = ep.id;

            const still = ep.still_path ? `https://image.tmdb.org/t/p/w300${ep.still_path}` : "https://via.placeholder.com/300x169?text=No+Image";

            item.innerHTML = `
                <div class="episode-thumb">
                    <img src="${still}" alt ="${ep.name}">
                </div>
                <div class="episode-info">
                    <h3>${ep.name}</h3>
                    <p> Season ${ep.season_number} Episode ${ep.episode_number}</p>
                    <p> Runtime: ${ep.runtime || "N/A"} min</p>
                    <p> Rating: ${ep.vote_average || "N/A"}</p>
                    <p class="episode-overview">${ep.overview || "No overview available."}</p>
                    <button class="episode-watched-button ${isEpisodeWatched(currentShowId, ep.id) ? "active" : ""}">
                        Watched
                    </button>
                </div>
            `;

            episodesContainer.appendChild(item);
        });

        updateSeasonPercent();
    }

    function toggleEpisodeWatched(showId, epId) {
        showState[showId] = showState[showId] || {watchedEpisodes: {}, rewatch: 0};
        showState[showId].watchedEpisodes[epId] = !showState[showId].watchedEpisodes[epId];
        saveState();
    }

    function isEpisodeWatched(showId, epId) {
        return showState[showId]?.watchedEpisodes?.[epId] || false;
    }

    function getRewatch(showId) {
        return showState[showId]?.rewatch || 0;
    }

    function incrementRewatch(showId) {
        showState[showId] = showState[showId] || {watchedEpisodes: {}, rewatch: 0};
        showState[showId].rewatch++;
        saveState();
    }

    function decrementRewatch(showId) {
        showState[showId] = showState[showId] || { watchedEpisodes: {}, rewatch: 0 };
        showState[showId].rewatch = Math.max(0, showState[showId].rewatch - 1);
        saveState();
    }

    function updateCardRewatch(showId) {
        document.querySelectorAll(`[data-show-id="${showId}"] .rewatch-count`)
            .forEach(el => el.textContent = getRewatch(showId));
    }

    function calculateShowPercent(showId) {
        const watched = Object.values(showState[showId]?.watchedEpisodes || {}).filter(v => v).length;
        const total = Object.keys(showState[showId]?.watchedEpisodes || {}).length;
        return total ? Math.round((watched / total) * 100) : 0;
    }

    function updateShowPercent() {
        modalShowPercent.textContent = calculateShowPercent(currentShowId) + "%";
        document.querySelectorAll(`[data-show-id="${currentShowId}"] .show-percent`)
            .forEach(el => el.textContent = calculateShowPercent(currentShowId) + "%");
    }

    function updateSeasonPercent() {
        const epButtons = episodesContainer.querySelectorAll(".episode-watched-button");
        const total = epButtons.length;
        const watched = [...epButtons].filter(btn => btn.classList.contains("active")).length;
        const percent = total ? Math.round((watched/total) * 100) :0;
        seasonPercent.textContent = percent + "%";
    }
    
    function updateOverallPercent() {
        let totalEpisodes = 0;
        let watchedEpisodes = 0;
        for (const showId in showState) {
            const eps = showState[showId].watchedEpisodes || {};
            totalEpisodes += Object.keys(eps).length;
            watchedEpisodes += Object.values(eps).filter(v => v).length;
        }
        const percent = totalEpisodes ? Math.round((watchedEpisodes/totalEpisodes) * 100) : 0;
        document.getElementById("overall-percent").textContent = percent + "%";
    }

    await loadShows();

});