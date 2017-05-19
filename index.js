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

    // Remove cruft
    hotPosts = hotPosts['data']['children'];
    hotPosts = hotPosts.map(hotPost => hotPost.data);

    let hotTextPosts = hotPosts
        .filter(post => !post['stickied']) // Ignore stickied posts
        .filter(post => post['selftext'] && post['selftext'].length); // Ignore image posts (no context in Slack)

    // Optional subreddit filtering
    const subreddit = process.env.SUBREDDIT;
    if (subreddit) {
        const regex = new RegExp('^' + subreddit + '[_-]+SS$', 'i');
        hotTextPosts = hotTextPosts.filter(post => {
            return post.author.match(regex);
        });
    }

    // Select random post
    let hotTextPost;
    if (hotTextPosts.length) {
        const i = Math.floor(Math.random() * hotTextPosts.length);
        hotTextPost = hotTextPosts[i];
    }

    return hotTextPost ? hotTextPost['title'] : '';
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