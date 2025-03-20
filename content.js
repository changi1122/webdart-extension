document.addEventListener("dblclick", async (event) => {
    // 오른쪽 끝 200px 안쪽 더블 클릭 시 북마크 저장
    if (window.innerWidth - event.clientX < 200) {
        const scrollPosition = event.clientY + window.pageYOffset;
        const relativePosition = scrollPosition / document.documentElement.scrollHeight;
        
        // 기존 북마크 불러오기
        let { bookmarks = [] } = await chrome.storage.local.get("bookmarks");
        
        // 현재 페이지 북마크가 존재하면 삭제
        const currentUrl = window.location.href;
        removeBookmarkIndicator();
        bookmarks = bookmarks.filter(bookmark => bookmark.url !== currentUrl);

        // 새로운 북마크 추가
        bookmarks.push({
            domain: new URL(window.location.href).hostname,
            title: document.title,
            url: window.location.href,
            position: relativePosition,
            datetime: (new Date()).toISOString()
        });

        // 스토리지에 저장
        await chrome.storage.local.set({ bookmarks });

        addBookmarkIndicator(relativePosition);

        window.removeEventListener("resize", updateBookmarkIndicator);
        window.addEventListener("resize", updateBookmarkIndicator);

        console.log(`북마크 저장됨!\n위치: ${relativePosition}%\nurl: ${window.location.href}\n시간: ${new Date()}`);
    }
});

(async function () {
    // 현재 페이지 정보 가져오기
    const currentUrl = window.location.href;
    const currentDomain = new URL(currentUrl).hostname;

    // 북마크 데이터 가져오기
    const { bookmarks = [] } = await chrome.storage.local.get("bookmarks");

    // 현재 페이지가 북마크 목록에 있는지 확인
    const bookmark = bookmarks.find(b => b.url === currentUrl);

    if (bookmark) {
        addBookmarkIndicator(bookmark.position);
        // TODO: 북마크가 있을 때만 이벤트 추가
        window.addEventListener("resize", updateBookmarkIndicator);
    }
})();

// 책갈피 아이콘 위치 유지
function updateBookmarkIndicator() {
    const bookmarkIcon = document.getElementById("webdart-bookmark");
    if (bookmarkIcon) {
        const position = bookmarkIcon.getAttribute("data-position");
        bookmarkIcon.style.top = position * document.documentElement.scrollHeight + "px";
    }
}

// 책갈피 아이콘을 추가하는 함수
function addBookmarkIndicator(position) {
    const bookmarkWrapper = document.createElement("div");
    bookmarkWrapper.id = "webdart-bookmark";
    bookmarkWrapper.style.position = "absolute";
    bookmarkWrapper.style.top = position * document.documentElement.scrollHeight + "px";
    bookmarkWrapper.style.right = "10px";
    bookmarkWrapper.style.display = "flex";
    bookmarkWrapper.style.alignItems = "center";
    bookmarkWrapper.style.cursor = "pointer";
    bookmarkWrapper.style.zIndex = "9999";

    // 미리 정의된 HTML 문자열
    const BOOKMARK_HTML = `
        <span class="webdart-remove-text" style="
            margin-right: 8px; font-size: 14px; color: black; 
            background-color: rgba(255, 255, 255, 0.8); padding: 4px 6px; 
            border-radius: 4px; box-shadow: 0 0 5px rgba(0,0,0,0.2); 
            display: none;">
            북마크 지우기
        </span>
        <div class="webdart-bookmark-icon" style="font-size: 24px;
            width: 40px; height: 40px; border-radius: 4px;
            display: inline-flex; justify-content: center;
            align-items: center;">📍</div>
    `;

    bookmarkWrapper.innerHTML = BOOKMARK_HTML;
    const removeText = bookmarkWrapper.querySelector(".webdart-remove-text");
    const bookmarkIcon = bookmarkWrapper.querySelector(".webdart-bookmark-icon");

    // hover 상태에서 배경색과 투명도 변경
    bookmarkWrapper.addEventListener("mouseenter", () => {
        removeText.style.display = "inline-block";
        bookmarkIcon.style.backgroundColor = "rgba(200, 200, 200, 0.5)";
        bookmarkIcon.style.opacity = "0.5";
    });

    bookmarkWrapper.addEventListener("mouseleave", () => {
        removeText.style.display = "none";
        bookmarkIcon.style.backgroundColor = "";
        bookmarkIcon.style.opacity = "1";
    });

    // 클릭 이벤트 추가
    bookmarkWrapper.addEventListener("click", function () {
        bookmarkIcon.style.backgroundColor = "rgba(200, 200, 200, 0.5)";
        bookmarkIcon.style.opacity = "0.5";
        setTimeout(() => bookmarkWrapper.remove(), 300); // 0.3초 후 삭제
    });

    document.body.appendChild(bookmarkWrapper);
}

async function removeBookmarkCurrentPage() {
    const currentUrl = window.location.href;

    let { bookmarks = [] } = await chrome.storage.local.get("bookmarks");
    bookmarks = bookmarks.filter(bookmark => bookmark.url !== currentUrl);
    await chrome.storage.local.set({ bookmarks });

    removeBookmarkIndicator();
    window.removeEventListener("resize", updateBookmarkIndicator);

}

function removeBookmarkIndicator() {
    const bookmarkIcon = document.getElementById("webdart-bookmark");
    if (bookmarkIcon) {
        bookmarkIcon.remove();
    }
}