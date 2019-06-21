const { Subscription } = require('../models')

module.exports = async (req, res) => {
  if (!req.session.githubToken) {
    return res.sendStatus(401)
  }
  console.log(req.body)
  if (!req.body.installationId || !req.body.jiraHost) {
    res.status(400)
    return res.json({
      err: 'installationId and jiraHost must be provided to delete a subscription.'
    })
  }

  // Check if the user that posted this has access to the installation ID they're requesting
  try {
    const { data: { installations } } = await res.locals.github.users.getInstallations({})

    const userInstallation = installations.find(installation => {
      return installation.id === Number(req.body.installationId)
    })

    if (!userInstallation) {
      res.status(401)
      return res.json({
        err: `Failed to delete subscription for ${req.body.installationId}. User does not have access to that installation.`
      })
    }

    // If the installation is an Org, the user needs to be an admin for that Org
    if (userInstallation.target_type === 'Organization') {
      const { data: { login } } = await res.locals.github.users.get()
      const { data: { role } } = await res.locals.github.orgs.getOrgMembership({ org: userInstallation.account.login, username: login })

      if (role !== 'admin') {
        res.status(401)
        return res.json({
          err: `Failed to delete subscription to ${req.body.installationId}. User is not an admin of that installation`
        })
      }

      await Subscription.uninstall({
        installationId: req.body.installationId,
        host: req.body.jiraHost
      })

      return res.sendStatus(202)
    }

    // Otherwise it's a user installation
    await Subscription.uninstall({
      installationId: req.body.installationId,
      host: req.body.jiraHost
    })

    return res.sendStatus(202)
  } catch (err) {
    console.log(err)
    return res.sendStatus(400)
  }
}