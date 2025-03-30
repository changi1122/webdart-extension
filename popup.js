document.addEventListener("DOMContentLoaded", async () => {
    const bookmarkList = document.getElementById("bookmarkList");
    const searchInput = document.getElementById("search");
    const sortSelect = document.getElementById("sort");
    const prevPageBtn = document.getElementById("prevPage");
    const nextPageBtn = document.getElementById("nextPage");
    const pageInfo = document.getElementById("pageInfo");
    
    let bookmarks = [];
    let filteredBookmarks = [];
    let groupedArray = [];
    let currentPage = 1;
    const itemsPerPage = 5;
    
    async function loadBookmarks() {
        const data = await chrome.storage.local.get("bookmarks");
        bookmarks = data.bookmarks || [];

        for (const bookmark of bookmarks) {
            bookmark.datetimeObj = new Date(bookmark.datetime)
        }

        filterAndSort();
    }
    
    function groupBookmarksByDomain() {
        return filteredBookmarks.reduce((groups, { domain, title, url, position, datetime }) => {
            if (!groups[domain])
                groups[domain] = [];
            groups[domain].push({ domain, title, url, position, datetime });
            return groups;
        }, {});
    }
    
    function renderBookmarks(bookmarkGroups) {
        bookmarkList.innerHTML = "";
    
        bookmarkGroups.forEach(([domain, items], idx) => {
            const button = document.createElement("button");
            button.className = "accordion ellipsis";
            button.textContent = `${domain} (${items.length})`;
    
            const panel = document.createElement("div");
            panel.className = "panel";
    
            // 템플릿으로 HTML 구조 생성
            panel.innerHTML = items.map(({ title, url, position, datetime }) => `
                <div class="bookmark-item" data-url="${url}" data-position="${position}" title="${title}">
                    <div class="bookmark-left">
                        <div class="bookmark-title ellipsis">${title}</div>
                        <div class="bookmark-details">
                            <div class="bookmark-date ellipsis">${formatDateTime(datetime)}</div>
                            <div class="ellipsis">${url}</div>
                        </div>
                    </div>
                    <div class="bookmark-right">
                        <span>${Math.round(position * 100)}%</span>
                        <button class="delete-button" aria-label="Delete">
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="20" height="20">
                                <path d="M6 6L18 18M6 18L18 6" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                            </svg>
                        </button>
                    </div>
                </div>
            `).join("");
    
            // 이벤트 바인딩
            panel.querySelectorAll(".bookmark-item").forEach(item => {
                const url = item.dataset.url;
                const position = parseFloat(item.dataset.position);
    
                item.addEventListener("click", () => navigateToPosition(url, position));
    
                const deleteBtn = item.querySelector(".delete-button");
                deleteBtn.addEventListener("click", (e) => {
                    e.stopPropagation();
                    removeBookmark(url);
                });
            });
    
            // 아코디언 기능
            button.addEventListener("click", () => {
                const isOpen = panel.style.display === "block";
                panel.style.display = isOpen ? "none" : "block";
                button.classList.toggle("active", !isOpen);
            });
    
            // 첫 항목은 열어두기
            if (idx === 0) {
                panel.style.display = "block";
                button.classList.add("active");
            }
    
            bookmarkList.appendChild(button);
            bookmarkList.appendChild(panel);
        });
    }
    
    function navigateToPosition(url, position) {
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            if (tabs.length === 0) return;
    
            const tab = tabs[0];
    
            chrome.scripting.executeScript({
                target: { tabId: tab.id },
                func: () => window.location.href
            }, (results) => {
                if (!results || results.length === 0) return;
    
                const currentUrl = results[0].result;
    
                if (currentUrl !== url) {
                    chrome.tabs.update(tab.id, { url }, () => {
                        chrome.tabs.onUpdated.addListener(function listener(tabId, changeInfo) {
                            if (tabId === tab.id && changeInfo.status === "complete") {
                                chrome.tabs.onUpdated.removeListener(listener);
                                scrollToPosition(tab.id, position);
                            }
                        });
                    });
                } else {
                    scrollToPosition(tab.id, position);
                }
            });
        });
    }

    function formatDateTime(datetime) {
        const date = new Date(datetime);
        return new Intl.DateTimeFormat("en", {
            month: "2-digit",
            day: "2-digit",
            hour: "2-digit",
            minute: "2-digit",
            hour12: false, // 24시간 형식
        }).format(date);
    }

    function scrollToPosition(tabId, position) {
        chrome.scripting.executeScript({
            target: { tabId },
            func: (pos) => {
                const position = pos * document.documentElement.scrollHeight - 128;
                window.scrollTo(0, (position < 0 ? 0 : position));
            },
            args: [position]
        });
    }
    
    function filterAndSort() {
        let query = searchInput.value.toLowerCase();
        filteredBookmarks = bookmarks.filter(({ title, url }) => (title + url).toLowerCase().includes(query));
        
        const sortType = sortSelect.value;
        if (sortType === "recent") filteredBookmarks.sort((a, b) => b.datetimeObj.getTime() - a.datetimeObj.getTime());
        else if (sortType === "oldest") filteredBookmarks.sort((a, b) => a.datetimeObj.getTime() - b.datetimeObj.getTime());
        else if (sortType === "alphabet") filteredBookmarks.sort((a, b) => a.domain.localeCompare(b.domain));
        
        groupAndRender();
    }
    
    function paginate(groupedArray) {
        const start = (currentPage - 1) * itemsPerPage;
        const end = start + itemsPerPage;
        return groupedArray.slice(start, end);
    }
    
    function updatePagination() {
        const totalPages = Math.ceil(groupedArray.length / itemsPerPage);
        pageInfo.textContent = `${currentPage} / ${totalPages}`;
        prevPageBtn.disabled = currentPage === 1;
        nextPageBtn.disabled = currentPage === totalPages;
    }
    
    function groupAndRender() {
        const groupedBookmarks = filteredBookmarks.length > 0 ? groupBookmarksByDomain(filteredBookmarks) : {};
        groupedArray = Object.entries(groupedBookmarks);
        const paginatedBookmarks = paginate(groupedArray);
        renderBookmarks(paginatedBookmarks);
        updatePagination();
    }

    function removeBookmark(url) {
        // 저장된 북마크 데이터를 가져와서 삭제
        chrome.storage.local.get(["bookmarks"], async (data) => {
            let bookmarks = data.bookmarks || [];
            bookmarks = bookmarks.filter((bookmark) => bookmark.url !== url);
            await chrome.storage.local.set({ bookmarks });
            await loadBookmarks(); // UI 업데이트
        });
    }

    
    searchInput.addEventListener("input", filterAndSort);
    sortSelect.addEventListener("change", filterAndSort);
    prevPageBtn.addEventListener("click", () => { currentPage--; groupAndRender(); });
    nextPageBtn.addEventListener("click", () => { currentPage++; groupAndRender(); });
    
    await loadBookmarks();
});