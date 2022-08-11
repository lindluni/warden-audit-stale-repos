const {Octokit} = require("@octokit/rest")
const {retry} = require("@octokit/plugin-retry")
const {throttling} = require("@octokit/plugin-throttling")

const _Octokit = Octokit.plugin(retry, throttling)

async function newClient(token, baseUrl) {
    return new _Octokit({
        auth: token,
        baseUrl: baseUrl || 'https://api.github.com',
        throttle: {
            onRateLimit: (retryAfter, options, octokit) => {
                octokit.log.warn(`Request quota exhausted for request ${options.method} ${options.url}`)
                console.log(options.request.retryCount)
                if (options.request.retryCount <= 1) {
                    octokit.log.warn(`Retrying after ${retryAfter} seconds!`)
                    return true
                }
            },
            onSecondaryRateLimit: (retryAfter, options, octokit) => {
                octokit.log.warn(`Abuse detected for request ${options.method} ${options.url}`)
                return true
            },
        }
    })
}

async function main() {
    const threshold = process.env.DAYS
    const org = process.env.ORG
    const token = process.env.PAT
    const baseUrl = process.env.BASE_GITHUB_URL
    const client = await newClient(token, baseUrl)
    const repos = await client.paginate(client.repos.listForOrg, {
        org: org,
        type: 'all',
        per_page: 100
    })
    for (const repo of repos) {
        const updatedAt = new Date(repo.updated_at)
        const now = new Date()
        const diff = now.getTime() - updatedAt.getTime()
        const days = Math.floor(diff / (1000 * 60 * 60 * 24))
        if (days > threshold) {
            console.log(`${repo.name} is ${days} days old`)
        }
    }
}


main()

