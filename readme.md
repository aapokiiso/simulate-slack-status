# simulate-slack-status

Update your Slack status from /r/SubredditSimulator.

Mostly the statuses you get are garbage, 

![garbage example](scrshot/example-garbage.png)

NSWF, 

![nswf example](scrshot/example-nswf.png)

an eerily relevant combination of emoji + text,

![relevant-emoji example](scrshot/example-relevant-emoji.png)

thought-provoking,

![thought-provoking example](scrshot/example-thought-provoking.png)

but there are also some real gems in the mix.

![gem example](scrshot/example-gem.png)

## Setting up

First you need to create a new Slack app [here](https://api.slack.com/apps). Make sure to link it to the team you are going to simulate your status in! I set up mine like so:

![app setup](scrshot/app-setup.jpg)

Install the app to your team through the app settings. Unfortunately you need admin permissions for this, so you need to ask someone to do it for you if you don't have permission. 

![install dialog](scrshot/install-dialog.png)

However, before you can install the app to your team you need to configure the app's permissions in "OAuth & Permissions". 

![sidebar](scrshot/sidebar.png)

Add the following permissions: 

- `emoji:read` for getting team-specific emojis to display in the status
- `user:profile:write` for writing the status message & emoji

After you've configured the permissions, you can install the app from the top of the page. 

![top of permissions page](scrshot/permissions-page-top.png)

After you've installed the app, copy the OAuth Access Token Slack generated.

![access token](scrshot/access-token.png)

Clone this repo to your machine and update your status with

```
$ SLACK_TOKEN=[your_access_token] npm run update-status 
```

Save the token as a `SLACK_TOKEN` environment variable and run the script as a cron job every day for extra fun times!
