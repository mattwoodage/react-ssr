import React from 'react'
import ReactDOMServer from 'react-dom/server'
import StaticRouter from 'react-router-dom/StaticRouter'
import { renderRoutes } from 'react-router-config'
import DefaultTemplate from './DefaultTemplate'
import findAllDataCalls from './findAllDataCalls'
import matchRoute from './matchRoute'
const docType = `<!DOCTYPE html>`

const serverRender = ({ Html = DefaultTemplate, globals = ``, routes, redisClient }, req, res) => {
  const extensionRegex = /(?:\.([^.]+))?$/
  const extension = extensionRegex.exec(req.url)[1]

  if (extension) {
    return res.sendStatus(404)
  }

  const context = {}
  const state = {
    app: {
      title: 'Test',
      description: 'example desc'
    }
  }

  const component = props => renderRoutes(props.route.routes)
  const cleansedRoutes = [{ component, routes }]
  const { matchedRoutes, statusCode } = matchRoute(cleansedRoutes, req.url)
  const { route = {}, match = {} } = matchedRoutes.length > 1 ? matchedRoutes[1] : matchedRoutes[0]

  if (route.redirect) {
    return res.redirect(route.redirect)
  }

  const dataCalls = findAllDataCalls(matchedRoutes, state, match.params)

  Promise.all(dataCalls)
    .then(data => {
      const fetchedProps = {}

      data.map(component => {
        const name = component._displayName
        fetchedProps[name] = component.defaultProps
      })

      state._dataFromServerRender = fetchedProps

      const stream = ReactDOMServer.renderToString(
        <Html state={state}>
          <StaticRouter location={req.url} context={context}>
            {renderRoutes(cleansedRoutes)}
          </StaticRouter>
        </Html>
      )

      res.status(statusCode).send(`${docType}${stream}`)
    })
    .catch(err => {
      res.status(400).send(`400: An error has occurred: ${err}`)
    })
}

export default serverRender
