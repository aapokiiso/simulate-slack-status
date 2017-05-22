'use strict';

const slack = require('slack');
const request = require('request');
const emojiKeywords = Object.keys(require('./emoji-keywords'));

const authToken = process.env.SLACK_TOKEN;
if (!authToken) {
    throw "Missing Slack OAuth token!";
}

Promise.all([getStatusText(), getStatusEmoji()])
    .then(([statusText, statusEmoji]) => {
        return setStatus(statusText, statusEmoji);
    });

async function setStatus(text, emoji) {
    try {
        await new Promise((resolve, reject) => {
            slack.users.profile.set({token: authToken, profile: {
                'status_text': text,
                'status_emoji': emoji
            }}, async err => {
                if (err) {
                    // Retry until a valid emoji is found
                    if (err.message == 'profile_status_set_failed_not_valid_emoji') {
                        const newEmoji = await getStatusEmoji();
                        await setStatus(text, newEmoji);
                    } else {
                        return reject(err);
                    }
                }
                return resolve();
            });
        });
    } catch (e) {
        console.error(e);
    }
}

async function getStatusText() {
    const postsToFind = 50; // Find a nice pool of status text candidates
    const maxPageNum = 25; // Don't run indefinitely

    let hotTextPosts = [];
    let pageNum = 1;
    while (pageNum < maxPageNum || hotTextPosts.length < postsToFind) {
        let pagePosts = await getHotPosts(pageNum);

        // Remove cruft
        pagePosts = pagePosts['data']['children'];
        pagePosts = pagePosts.map(hotPost => hotPost.data);

        let pageTextPosts = pagePosts
            .filter(post => !post['stickied']) // Ignore stickied posts
            .filter(post => post['selftext'] && post['selftext'].length) // Ignore image posts (no context in Slack)
            .filter(post => post['title'].length < 100); // Slack status text max length is 100 chars

        // Optional subreddit-simulator filtering
        const subreddit = process.env.SUBREDDIT;
        if (subreddit) {
            const regex = new RegExp('^' + subreddit + '[_-]+SS$', 'i');
            pageTextPosts = pageTextPosts.filter(post => {
                return post.author.match(regex);
            });
        }

        hotTextPosts = hotTextPosts.concat(pageTextPosts);

        pageNum++;
    }

    // Select random post
    let hotTextPost;
    if (hotTextPosts.length) {
        const i = Math.floor(Math.random() * hotTextPosts.length);
        hotTextPost = hotTextPosts[i];
    }

    const statusText = hotTextPost ? hotTextPost['title'] : '';

    return statusText;
}

async function getHotPosts(page) {
    let hotPosts = [];

    try {
        hotPosts = await new Promise((resolve, reject) => {
            const offset = page * 25; // Each result page is 25 items

            request({
                url: 'https://www.reddit.com/r/SubredditSimulator/hot.json',
                qs: {
                    count: offset // Reddit confusingly labels offset as count in URLs
                },
                json: true
            }, (err, res, json) => {
                if (err) {
                    return reject(err);
                }

                return resolve(json);
            });
        });
    } catch (e) {
        console.error(e);
    }

    return hotPosts;
}

async function getStatusEmoji() {
    let emojis = emojiKeywords;
    try {
        const customEmojis = await new Promise((resolve, reject) => {
            slack.emoji.list({token: authToken}, (err, data) => {
                if (err) {
                    return reject(err);
                }

                const customEmojiKeywords = Object.keys(data.emoji);

                return resolve(customEmojiKeywords);
            });
        });

        emojis = emojis.concat(customEmojis);
        // Remove duplicates
        emojis = emojis.filter((val, i, self) => self.indexOf(val) === i);
    } catch (e) {
        console.error(e);
    }

    // Remove weird unsupported emojis
    const isValidEmoji = /^:[a-zA-Z0-9_]+:$/;
    emojis = emojis.filter(emoji => emoji.match(isValidEmoji));

    // Return random emoji
    const i = Math.floor(Math.random() * emojis.length);

    return emojis[i];
}