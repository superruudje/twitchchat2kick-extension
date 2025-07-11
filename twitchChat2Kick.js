// Wrap everything to avoid polluting the global scope
(() => {
    let ircSocket = null;

    function initTwitchChat(twitchChannelName, userHeight = '33.333') {
        if (ircSocket) ircSocket.close();

        // Compute Kick height as 100% - Twitch height
        const twitchHeightValue = parseFloat(userHeight);
        const kickHeightValue = 100 - twitchHeightValue;
        const kickHeight = `${kickHeightValue}%`;

        const chatContainer = document.querySelector('#chatroom-messages');
        chatContainer.style.setProperty("height", kickHeight, "important");

        const parentElement = chatContainer?.parentElement;

        let twitchChatContainer = document.getElementById("twitch-chat-container");

        if (twitchChatContainer) {
            // Update height only
            twitchChatContainer.style.setProperty("height", twitchHeightValue + '%', "important");
        } else {
            // Create and insert a new container
            twitchChatContainer = createTwitchChatContainer(twitchHeightValue);
            parentElement.insertBefore(twitchChatContainer, parentElement.firstChild);
        }

        const MAX_MESSAGES = 200;

        ircSocket = connectToTwitchIRC({
            channel: twitchChannelName,
            onMessage: (msg) => {
                try {
                    const messageEl = createTwitchChatMessageElement(msg);
                    const innerContainer = twitchChatContainer.querySelector("#twitch-chat-inner-container");

                    // Check if the user is near the bottom
                    const isNearBottom = twitchChatContainer.scrollHeight - twitchChatContainer.scrollTop - twitchChatContainer.clientHeight < 50;

                    innerContainer.appendChild(messageEl);

                    // Keep a certain number of messages
                    while (innerContainer.children.length > MAX_MESSAGES) {
                        innerContainer.removeChild(innerContainer.firstChild);
                    }

                    // Only auto-scroll if the user is near the bottom
                    if (isNearBottom) {
                        twitchChatContainer.scrollTop = twitchChatContainer.scrollHeight;
                    }
                } catch (err) {
                    console.error("Failed to parse Twitch chat message event:", err);
                }
            }
        });
    }

    chrome.storage.sync.get(["twitchChannelName", "twitchChatHeight"], (data) => {
        const name = data.twitchChannelName || "zackrawrr";
        const height = data.twitchChatHeight || "33.333%";
        initTwitchChat(name, height);
    });

    chrome.runtime.onMessage.addListener((msg) => {
        if (msg.type === "reloadTwitchChat") {
            chrome.storage.sync.get(["twitchChannelName", "twitchChatHeight"], (data) => {
                const name = data.twitchChannelName || "zackrawrr";
                const height = data.twitchChatHeight || "33.333%";
                initTwitchChat(name, height);
            });
        }
    });
})();

/**
 * Creates and returns a Twitch chat container element with predefined styling and child elements.
 *
 * @return {HTMLDivElement} A div element structured to contain Twitch chat components, including an inner container and a separator.
 */
function createTwitchChatContainer(heightPercentage = 33.333) {
    const container = document.createElement("div");
    container.id = "twitch-chat-container";
    container.className = "relative h-full w-full overflow-y-auto contain-strict";
    container.style.setProperty("height", heightPercentage + '%', "important");

    const innerContainer = document.createElement("div");
    innerContainer.id = "twitch-chat-inner-container";
    container.appendChild(innerContainer);

    const separatorWrapper = document.createElement("div");
    separatorWrapper.className = "flex w-full items-center";

    const separator = document.createElement("span");
    separator.className = "h-0.5 grow bg-[#24272c]";
    separator.style.margin = "4px 0";

    separatorWrapper.appendChild(separator);
    container.appendChild(separatorWrapper);

    return container
}

/**
 * Creates a Twitch chat message element from the provided message data.
 *
 * @param {Object} messageData - The chat message data.
 * @param {string} messageData.username - The username of the sender.
 * @param {string} [messageData.color="#FFFFFF"] - The color associated with the username.
 * @param {string} messageData.message - The content of the chat message.
 * @param {string} [messageData.timestamp=""] - The timestamp of the message.
 *
 * @return {HTMLElement} A DOM element representing the Twitch chat message.
 */
function createTwitchChatMessageElement(messageData) {
    const username = messageData.username;
    const color = messageData.color || "#FFFFFF";
    const message = messageData.message;
    const timestamp = messageData.timestamp || "";

    const container = document.createElement("div");
    const outer = document.createElement("div");
    outer.className = "group relative px-2 lg:px-3";

    const inner = document.createElement("div");
    inner.className = "w-full min-w-0 shrink-0 break-words rounded-lg px-2 py-1";
    inner.style.fontSize = "var(--chatroom-font-size)";

    const time = document.createElement("span");
    time.className = "text-neutral pr-1 font-semibold";
    time.style.display = "var(--chatroom-timestamps-display)";
    time.style.fontSize = "calc(var(--chatroom-font-size) - 2px)";
    time.textContent = timestamp;

    const userContainer = document.createElement("div");
    userContainer.className =
        "inline-flex min-w-0 flex-nowrap items-baseline rounded cursor-pointer transition-colors duration-150 ease-out";

    const badgeImg = document.createElement("img");
    badgeImg.alt = "Twitch badge";
    badgeImg.className = "size-[calc(1em*(18/13))]";
    badgeImg.src = chrome.runtime.getURL("twitch_logo.png");

    const usernameEl = document.createElement("button");
    usernameEl.className = "inline font-bold";
    usernameEl.title = username;
    usernameEl.style.color = color;
    usernameEl.innerHTML = "&nbsp" + username;

    const colon = document.createElement("span");
    colon.className = "inline-flex font-bold";
    colon.innerHTML = ":&nbsp";

    const messageSpan = document.createElement("span");
    messageSpan.className = "font-normal leading-[1.55]";
    messageSpan.innerHTML = message;

    userContainer.appendChild(badgeImg);
    userContainer.appendChild(usernameEl);
    inner.appendChild(time);
    inner.appendChild(userContainer);
    inner.appendChild(colon);
    inner.appendChild(messageSpan);
    outer.appendChild(inner);
    container.appendChild(outer);

    return container;
}

/**
 * Creates and returns an HTML string representing an 'emote' element.
 *
 * @param {string} emoteId - The unique identifier for the 'emote'.
 * @param {string} [emoteName=''] - The name of the 'emote'. Defaults to an empty string.
 * @param {string} emoteUrl - The URL of the 'emote' image.
 * @return {string} The HTML string representation of the 'emote' element.
 */
function createEmoteElement(emoteId, emoteName = '', emoteUrl) {
    return `
        <span class="relative mx-px inline-block h-[1.2em] w-[calc(var(--chatroom-font-size)*28/13)] align-middle" data-emote-id="${emoteId}" data-emote-name="${emoteName}">
            <div class="absolute left-0 top-1/2 size-[calc(var(--chatroom-font-size)*28/13)] -translate-y-1/2" data-state="closed">
                <img class="h-full w-full" alt="${emoteName}" draggable="false" src="${emoteUrl}" />
            </div>
        </span>
    `;
}

/**
 * Connects to Twitch IRC as an anonymous user and establishes a WebSocket connection to a specified channel.
 * Handles messages from the channel, parses them, and invokes the provided message handler.
 *
 * @param {Object} options - Configuration options for the connection.
 * @param {string} options.channel - The name of the Twitch channel to join.
 * @param {function(Object): void} options.onMessage - Callback function to handle incoming chat messages. The parsed message object is passed as the argument.
 * @return {WebSocket} The WebSocket connection to Twitch IRC.
 */
function connectToTwitchIRC({ channel, onMessage }) {
    const ws = new WebSocket("wss://irc-ws.chat.twitch.tv:443");

    const nick = `justinfan${Math.floor(Math.random() * 100000)}`; // anonymous

    ws.onopen = () => {
        ws.send("CAP REQ :twitch.tv/tags twitch.tv/commands");
        ws.send("PASS SCHMOOPIIE");
        ws.send(`NICK ${nick}`);
        ws.send(`USER ${nick} 8 * :${nick}`);
        ws.send(`JOIN #${channel.toLowerCase()}`);
        console.log(`[Twitch IRC] Connected as ${nick} to #${channel}`);
    };

    ws.onmessage = (event) => {
        const lines = event.data.split("\r\n").filter(Boolean);
        for (const line of lines) {
            if (line.startsWith("PING")) {
                ws.send("PONG :tmi.twitch.tv");
                return;
            }

            const match = line.match(/@([^ ]+) :([^!]+)!.* PRIVMSG #\w+ :(.*)/);
            if (match) {
                const tags = parseTags(match[1]);
                const username = match[2];
                const rawMessage = match[3];

                const emotes = tags["emotes"];
                const message = emotes
                    ? parseEmotes(rawMessage, emotes)
                    : escapeHtml(rawMessage);

                const parsed = {
                    username,
                    message,
                    timestamp: new Date().toLocaleTimeString(),
                    color: tags["color"] || undefined,
                };

                onMessage(parsed);
            }
        }
    };

    ws.onerror = (err) => console.error("[Twitch IRC] WebSocket error", err);

    return ws;
}

/**
 * Parses a semicolon-separated string of key-value pairs into an object.
 *
 * @param {string} tagString The semicolon-separated string containing tag key-value pairs.
 *                           Each pair is expected to have a format of `key=value`.
 * @return {Object} An object representation of the parsed tags, where each key corresponds to
 *                  a tag name and the value corresponds to the associated tag value.
 */
function parseTags(tagString) {
    const tags = {};
    tagString.split(";").forEach((part) => {
        const [key, value] = part.split("=");
        tags[key] = value || "";
    });
    return tags;
}

/**
 * Parses a given message and replaces segments identified by emotesTag with corresponding 'emote' elements.
 *
 * @param {string} message - The message containing text and placeholders for 'emotes'.
 * @param {string} emotesTag - The 'emotes' tag provided in the format where each 'emote' ID is mapped to specific positions (e.g., "emoteId:start-end").
 * @return {string} The resulting message with 'emotes' replaced by their corresponding elements and the remaining text escaped for HTML.
 */
function parseEmotes(message, emotesTag) {
    const emoteMap = [];

    emotesTag.split('/').forEach((emote) => {
        const [emoteId, positions] = emote.split(':');
        positions.split(',').forEach((range) => {
            const [start, end] = range.split('-').map(Number);
            emoteMap.push({ start, end, emoteId });
        });
    });

    emoteMap.sort((a, b) => a.start - b.start);

    let result = '';
    let lastIndex = 0;

    for (const { start, end, emoteId } of emoteMap) {
        // Append text before 'emote'
        result += escapeHtml(message.slice(lastIndex, start));
        // Build emote image URL
        const emoteUrl = `https://static-cdn.jtvnw.net/emoticons/v2/${emoteId}/default/dark/1.0`;
        // Append emote with Kick style
        result += createEmoteElement(emoteId, '', emoteUrl);
        lastIndex = end + 1;
    }

    // Append the rest of the message
    result += escapeHtml(message.slice(lastIndex));
    return result;
}

/**
 * Escapes special HTML characters in the given string to their corresponding HTML entities.
 *
 * @param {string} str The string to escape HTML characters from.
 * @return {string} A new string with special HTML characters replaced by their HTML entities.
 */
function escapeHtml(str) {
    return str.replace(/[&<>"']/g, (m) => ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;',
    }[m]));
}
