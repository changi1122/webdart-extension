document.addEventListener("dblclick", async (event) => {
    // 오른쪽 끝 50px 안쪽 더블 클릭 시 북마크 저장
    if (window.innerWidth - event.clientX < 50) {
        const scrollPosition = event.clientY + window.pageYOffset;
        const relativePosition = scrollPosition / document.documentElement.scrollHeight;
        
        // 기존 북마크 불러오기
        const { bookmarks = [] } = await chrome.storage.local.get("bookmarks");
        
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

        alert(`북마크 저장됨!\n위치: ${relativePosition}%\nurl: ${window.location.href}\n시간: ${new Date()}`);
    }
});

(async function () {
    // 현재 페이지 정보 가져오기
    const currentUrl = window.location.href;
    const currentDomain = new URL(currentUrl).hostname;

    // 북마크 데이터 가져오기
    const { bookmarks = [] } = await chrome.storage.local.get("bookmarks");

    // 현재 페이지가 북마크 목록에 있는지 확인
    const isBookmarked = bookmarks.some(b => b.url === currentUrl);

    if (isBookmarked) {
        addBookmarkIndicator();
    }
})();

// 책갈피 아이콘을 추가하는 함수
function addBookmarkIndicator() {
    const bookmarkIcon = document.createElement("div");
    bookmarkIcon.innerHTML = "🔖"; // 책갈피 이모지
    bookmarkIcon.style.position = "fixed";
    bookmarkIcon.style.top = "50%";
    bookmarkIcon.style.right = "10px";
    bookmarkIcon.style.fontSize = "24px";
    bookmarkIcon.style.cursor = "pointer";
    bookmarkIcon.style.zIndex = "9999";

    document.body.appendChild(bookmarkIcon);
}