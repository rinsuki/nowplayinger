import { IWorld, WorldManager } from "../core/world";
import * as OAuth from "oauth-1.0a"
import * as crypto from "crypto"
import QueryStringUtils from "../../utils/queryString";
import { shell } from "electron";
import prompt from "../../utils/promptPromise";
import requestOAuth from "../../utils/requestOAuth";
import openUrl from "../../utils/openUrlDialogPromise";

class TwitterWorld implements IWorld {

    // 下の二行は馬鹿にしか見えない
    static obakaKey = "WO6MlGk8YLOyt9NDKPdMBwDrB"
    static obakaSecret = "3FTJriO3v0IQJOnGOmxZ0lxk28dt2cT1ynd9Vw1Aev5RVQOMYp"
    // 上の二行は馬鹿にしか見えない

    static key = "twitter"
    config: {
        accessToken: string
        accessTokenSecret: string
        screenName: string
    }

    twitterClient = new OAuth({
        consumer: {
            key: TwitterWorld.obakaKey,
            secret: TwitterWorld.obakaSecret
        },
        signature_method: "HMAC-SHA1",
        hash_function(base_string, key) {
            console.log(base_string)
            return crypto.createHmac("sha1", key).update(base_string).digest("base64")
        },
        realm: ""
    })

    async post(content: string) {
        console.log(this.config)
        const tweetRes = await requestOAuth(this.twitterClient, {
            url: "https://api.twitter.com/1.1/statuses/update.json",
            method: "POST",
            data: {status: content}
        }, {
            key: this.config.accessToken,
            secret: this.config.accessTokenSecret
        }).then(r => r.json())
        console.log(tweetRes)
    }

    static async auth() {
        var world = new TwitterWorld()
        const requestTokenRes = await requestOAuth(world.twitterClient, {
            url: "https://api.twitter.com/oauth/request_token",
            method: "POST",
            data: {oauth_callback: "oob"}
        }).then(r => r.text()).then(r => QueryStringUtils.decode(r))
        console.log(requestTokenRes)

        await openUrl(`https://twitter.com/oauth/authorize?oauth_token=${requestTokenRes.oauth_token}`)
        const pinCode = await prompt("please input code", "")
        if (pinCode == null) {
            return
        }
        const accessTokenRes = await requestOAuth(world.twitterClient, {
            url: "https://api.twitter.com/oauth/access_token",
            method: "POST",
            data: {oauth_verifier: pinCode}
        }, {
            key: requestTokenRes.oauth_token,
            secret: requestTokenRes.oauth_token_secret,
        }).then(r => r.text()).then(r => QueryStringUtils.decode(r))
        console.log({
            key: accessTokenRes.oauth_token,
            secret: accessTokenRes.oauth_token_secret
        })
        world.config = {
            accessToken: accessTokenRes.oauth_token,
            accessTokenSecret: accessTokenRes.oauth_token_secret,
            screenName: accessTokenRes.screen_name
        }
        return world
    }

    getUniqueKey() {
        return "twitter-"+this.config.screenName
    }

    getDisplayName() {
        return this.config.screenName+"@twitter.com"
    }
}

WorldManager.addWorld(TwitterWorld)