(() => {
  let youtubeLeftControls, youtubePlayer;
  let currentVideo = "";
  let currentVideoBookmarks = [];

  const fetchBookmarks = () => {
    return new Promise((resolve) => {
      chrome.storage.sync.get([currentVideo], (obj) => {
        resolve(obj[currentVideo] ? JSON.parse(obj[currentVideo]) : []);
      });
    });
  };

  document.addEventListener(
    "keydown",
    (event) => {
      const isTyping =
        document.activeElement.tagName === "INPUT" ||
        document.activeElement.tagName === "TEXTAREA" ||
        document.activeElement.isContentEditable;

      if (isTyping) {
        event.stopPropagation();
      }
    },
    true
  );

  const addNewBookmarkEventHandler = async () => {
    const currentTime = youtubePlayer.currentTime;

    const userDescription = prompt(
      "Enter a description for the bookmark:",
      `Bookmark at ${getTime(currentTime)}`
    );

    const newBookmark = {
      time: currentTime,
      desc: userDescription || `Bookmark at ${getTime(currentTime)}`,
    };
    currentVideoBookmarks = await fetchBookmarks();
    chrome.storage.sync.set({
      [currentVideo]: JSON.stringify(
        [...currentVideoBookmarks, newBookmark].sort((a, b) => a.time - b.time)
      ),
    });
  };

  const newVideoLoaded = async () => {
    const bookmarkBtnExists =
      document.getElementsByClassName("bookmark-btn")[0];

    currentVideoBookmarks = await fetchBookmarks();

    if (!bookmarkBtnExists) {
      // Create the bookmark button
      const bookmarkBtn = document.createElement("img");
      bookmarkBtn.src = chrome.runtime.getURL("assets/bookmark.png");
      bookmarkBtn.className = "ytp-button bookmark-btn";
      bookmarkBtn.title = "Click to bookmark current timestamp";

      // Create the text box for custom descriptions
      const descInput = document.createElement("input");
      descInput.type = "text";
      descInput.placeholder = "Enter description...";
      descInput.style.cssText = `
        margin-left: 10px;
        padding: 5px;
        border: 1px solid #ccc;
        border-radius: 4px;
        font-size: 12px;
        width: 200px;
      `;
      descInput.className = "bookmark-desc-input";

      youtubeLeftControls =
        document.getElementsByClassName("ytp-left-controls")[0];
      youtubePlayer = document.getElementsByClassName("video-stream")[0];

      // Append the button and text box to the controls
      youtubeLeftControls.appendChild(descInput);
      youtubeLeftControls.appendChild(bookmarkBtn);

      // Add event listener for the bookmark button
      bookmarkBtn.addEventListener("click", async () => {
        const currentTime = youtubePlayer.currentTime;
        const userDescription =
          descInput.value || `Bookmark at ${getTime(currentTime)}`;

        const newBookmark = {
          time: currentTime,
          desc: userDescription,
        };

        currentVideoBookmarks = await fetchBookmarks();

        chrome.storage.sync.set({
          [currentVideo]: JSON.stringify(
            [...currentVideoBookmarks, newBookmark].sort(
              (a, b) => a.time - b.time
            )
          ),
        });

        // Clear the text box after saving the bookmark
        descInput.value = "";
      });
    }
  };

  chrome.runtime.onMessage.addListener((obj, sender, response) => {
    const { type, value, videoId } = obj;

    if (type === "NEW") {
      currentVideo = videoId;
      newVideoLoaded();
    } else if (type === "PLAY") {
      youtubePlayer.currentTime = value;
    } else if (type === "DELETE") {
      currentVideoBookmarks = currentVideoBookmarks.filter(
        (b) => b.time != value
      );
      chrome.storage.sync.set({
        [currentVideo]: JSON.stringify(currentVideoBookmarks),
      });

      response(currentVideoBookmarks);
    }
  });

  newVideoLoaded();
})();

const getTime = (t) => {
  var date = new Date(0);
  date.setSeconds(t);

  return date.toISOString().substr(11, 8);
};
