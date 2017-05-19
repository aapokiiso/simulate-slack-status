'use strict';

const slack = require('slack');
const request = require('request');
const emojiKeywords = require('emojis-keywords');

const authToken = process.env.SLACK_TOKEN;
if (!authToken) {
    throw "Missing Slack OAuth token!";
}

Promise.all([getStatusText(), getStatusEmoji()])
    .then(([statusText, statusEmoji]) => {
        slack.users.profile.set({token: authToken, profile: {
            'status_text': statusText,
            'status_emoji': statusEmoji
        }}, err => {
            if (err) {
                console.error(err);
            }
        });
    });

async function getStatusText() {
    let hotPosts = [];
    try {
        hotPosts = await new Promise((resolve, reject) => {
            request('https://www.reddit.com/r/SubredditSimulator/hot.json', (err, res, body) => {
                if (err) {
                    return reject(err);
                }

                let json;
                try {
                    json = JSON.parse(body);
                } catch (e) {
                    return reject(e);
                }

                return resolve(json);
            });
        });
    } catch (e) {
        console.error(e);
    }

    hotPosts = hotPosts['data']['children'];
    const postsData = hotPosts.map(hotPost => hotPost.data);

    const hotTextPost = postsData
        .filter(post => !post['stickied']) // Ignore stickied posts
        .find(post => post['selftext'] && post['selftext'].length); // Get first text post

    return hotTextPost['title'];
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

    // Return random emoji
    const i = Math.floor(Math.random() * emojis.length);

    return emojis[i];
}