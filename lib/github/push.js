const { enqueuePush } = require('../transforms/push')
const parseSmartCommit = require('../transforms/smart-commit')

module.exports = async (context, jiraClient) => {
  console.log(context)
  // Copy the shape of the context object for processing
  // but filter out any commits that don't have issue keys
  // so we don't have to process them.
  const payload = {
    repository: context.payload.repository,
    commits: context.payload.commits.map(commit => {
      const { issueKeys } = parseSmartCommit(commit.message)
      if (issueKeys) {
        return commit
      }
    }).filter(Boolean),
    installation: context.payload.installation
  }

  if (payload.commits.length === 0) {
    return
  }

  // Since a push event can have any number of commits
  // and we have to process each one indvidiually to get the
  // data we need for Jira, send this to a background job
  // so we can close the http connection as soon as the jobs
  // are in the queue.
  await enqueuePush(payload, jiraClient.baseURL)
}
