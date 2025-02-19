const instance = process.env.INSTANCE_NAME
const isProd = (instance === 'production')

module.exports = async (req, res) => {
  const isHttps = req.secure || req.header('x-forwarded-proto') === 'https'

  return res.status(200)
    .json({
      // Will need to be set to `true` once we verify the app will work with
      // GDPR compliant APIs. Ref: https://github.com/github/ecosystem-primitives/issues/220
      apiMigrations: {
        gdpr: false
      },
      name: 'GitHub' + (isProd ? '' : (instance ? (` (${instance})`) : '')),
      description: 'Application for integrating with GitHub',
      key: 'com.github.integration' + (instance ? `.${instance}` : ''),
      baseUrl: `${isHttps ? 'https' : 'http'}://${req.get('host')}`,
      lifecycle: {
        installed: '/jira/events/installed',
        uninstalled: '/jira/events/uninstalled',
        enabled: '/jira/events/enabled',
        disabled: '/jira/events/disabled'
      },
      vendor: {
        name: 'GitHub',
        url: 'http://github.com'
      },
      authentication: {
        type: 'jwt'
      },
      scopes: [
        'READ',
        'WRITE',
        'DELETE',
        'ADMIN'
      ],
      apiVersion: 1,
      modules: {
        jiraDevelopmentTool: {
          application: {
            value: 'GitHub'
          },
          capabilities: [
            'branch',
            'commit',
            'pull_request'
          ],
          key: 'github-development-tool',
          logoUrl: 'https://assets-cdn.github.com/images/modules/logos_page/GitHub-Mark.png',
          name: {
            value: 'GitHub'
          },
          url: 'https://github.com'
        },
        postInstallPage: {
          key: 'github-post-install-page',
          name: {
            value: 'GitHub Configuration'
          },
          url: '/jira/configuration',
          conditions: [
            {
              condition: 'addon_property_exists',
              invert: true,
              params: {
                propertyKey: 'configuration',
                objectKey: 'has-repos'
              }
            },
            {
              condition: 'user_is_admin'
            }
          ]
        }
      }
    })
}
