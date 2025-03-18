document.addEventListener("DOMContentLoaded", async () => {
    const bookmarkList = document.getElementById("bookmarkList");
    const searchInput = document.getElementById("search");
    const sortSelect = document.getElementById("sort");
    const prevPageBtn = document.getElementById("prevPage");
    const nextPageBtn = document.getElementById("nextPage");
    const pageInfo = document.getElementById("pageInfo");
    
    let bookmarks = [];
    let filteredBookmarks = [];
    let currentPage = 1;
    const itemsPerPage = 5;
    
    async function loadBookmarks() {
        const data = await chrome.storage.local.get("bookmarks");
        bookmarks = data.bookmarks || [];

        filterAndSort();
    }
    
    function groupBookmarksByDomain() {
        return bookmarks.reduce((groups, { domain, title, url, position, datetime }) => {
            if (!groups[domain])
                groups[domain] = [];
            groups[domain].push({ domain, title, url, position, datetime });
            return groups;
        }, {});
    }
    
    function renderBookmarks(bookmarkGroups) {
        bookmarkList.innerHTML = "";
        Object.entries(bookmarkGroups).forEach(([domain, items], idx) => {
            const button = document.createElement("button");
            button.className = "accordion";
            button.textContent = `${domain} (${items.length})`;
            
            const panel = document.createElement("div");
            panel.className = "panel";
            
            items.forEach(({ title, url, position, datetime }) => {
                const item = document.createElement("div");
                item.className = "bookmark-item";
    
                // 왼쪽 컨텐츠 영역
                const leftContent = document.createElement("div");
                leftContent.className = "bookmark-left";
    
                const titleElem = document.createElement("div");
                titleElem.className = "bookmark-title";
                titleElem.textContent = title;
    
                const detailsElem = document.createElement("div");
                detailsElem.className = "bookmark-details";
    
                const dateSpan = document.createElement("div");
                dateSpan.textContent = formatDateTime(datetime);
    
                const urlSpan = document.createElement("div");
                urlSpan.textContent = url;
    
                detailsElem.appendChild(dateSpan);
                detailsElem.appendChild(urlSpan);
    
                leftContent.appendChild(titleElem);
                leftContent.appendChild(detailsElem);
    
                // 오른쪽 position 영역 + 삭제 버튼
                const rightContent = document.createElement("div");
                rightContent.className = "bookmark-right";
    
                const positionText = document.createElement("span");
                positionText.textContent = `${Math.round(position * 100)}%`;
    
                const deleteButton = document.createElement("button");
                deleteButton.className = "delete-button";
                deleteButton.innerHTML = "❌";
                deleteButton.addEventListener("click", async (event) => {
                    event.stopPropagation(); // 부모 요소 클릭 이벤트 방지
                    removeBookmark(url); // 삭제 함수 호출
                });
    
                rightContent.appendChild(positionText);
                rightContent.appendChild(deleteButton);
    
                item.appendChild(leftContent);
                item.appendChild(rightContent);
    
                item.addEventListener("click", () => navigateToPosition(url, position));
                panel.appendChild(item);
            });
    
            button.addEventListener("click", () => {
                panel.style.display = panel.style.display === "block" ? "none" : "block";
                button.classList.toggle("active");
            });
    
            if (idx === 0) {
                panel.style.display = "block";
                button.classList.toggle("active");
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
        return new Intl.DateTimeFormat("ko-KR", {
            year: "numeric",
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
        filteredBookmarks = bookmarks.filter(({ url }) => url.toLowerCase().includes(query));
        
        const sortType = sortSelect.value;
        if (sortType === "recent") filteredBookmarks.sort((a, b) => b.position - a.position);
        else if (sortType === "oldest") filteredBookmarks.sort((a, b) => a.position - b.position);
        else if (sortType === "alphabet") filteredBookmarks.sort((a, b) => a.url.localeCompare(b.url));
        
        groupAndRender();
    }
    
    function paginate(array) {
        const start = (currentPage - 1) * itemsPerPage;
        return array.slice(start, start + itemsPerPage);
    }
    
    function updatePagination() {
        const totalPages = Math.ceil(filteredBookmarks.length / itemsPerPage);
        pageInfo.textContent = `${currentPage} / ${totalPages}`;
        prevPageBtn.disabled = currentPage === 1;
        nextPageBtn.disabled = currentPage === totalPages;
    }
    
    function groupAndRender() {
        const paginatedBookmarks = paginate(filteredBookmarks);
        const grouped = paginatedBookmarks.length > 0 ? groupBookmarksByDomain(paginatedBookmarks) : {};
        renderBookmarks(grouped);
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