const input = document.getElementById("channelName");
const heightInput = document.getElementById("chatHeight");
const status = document.getElementById("status");
const saveBtn = document.getElementById("saveBtn");

chrome.storage.sync.get(["twitchChannelName", "twitchChatHeight"], (data) => {
    if (data.twitchChannelName) {
        input.value = data.twitchChannelName;
    }
    if (data.twitchChatHeight) {
        heightInput.value = parseFloat(data.twitchChatHeight);
    }
});

saveBtn.onclick = async () => {
    const channelName = input.value.trim().toLowerCase();
    const chatHeightRaw = heightInput.value.trim();
    const chatHeight = parseFloat(chatHeightRaw);

    if (!channelName) {
        status.textContent = "Please enter a channel name.";
        return;
    }

    if (isNaN(chatHeight) || chatHeight < 10 || chatHeight > 90) {
        status.textContent = "Please enter a height between 10 and 90.";
        return;
    }

    try {
        chrome.storage.sync.set({
            twitchChannelName: channelName,
            twitchChatHeight: `${chatHeight}`
        }, () => {
            status.textContent = "Saved!";
            setTimeout(() => (status.textContent = ""), 1500);

            // 🔁 Notify content script to reinitialize
            chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
                if (tabs[0]) {
                    chrome.tabs.sendMessage(tabs[0].id, { type: "reloadTwitchChat" });
                }
            });
        });
    } catch (e) {
        console.error(e);
        status.textContent = "Invalid channel name or network error.";
    }
};