import axios from 'axios'
import fetchData from './fetch'
import { Node } from './nodes'
import { capitalize } from 'lodash'
const crypto = require(`crypto`)

exports.sourceNodes = async (
  { boundActionCreators },
  { apiURL = 'http://localhost:1337', contentTypes = [], loginData = {} }
) => {
  const { createNode, createParentChildLink } = boundActionCreators
  let jwtToken = null

  // Check if loginData is set.
  if (
    loginData.hasOwnProperty('identifier') &&
    loginData.identifier.length !== 0 &&
    loginData.hasOwnProperty('password') &&
    loginData.password.length !== 0
  ) {
    console.time('Authenticate Strapi user')
    console.log('Authenticate Strapi user')

    // Define API endpoint.
    const loginEndpoint = `${apiURL}/auth/local`

    // Make API request.
    try {
      const loginResponse = await axios.post(loginEndpoint, loginData)

      if (loginResponse.hasOwnProperty('data')) {
        jwtToken = loginResponse.data.jwt
      }
    } catch (e) {
      console.error('Strapi authentication error: ' + e)
    }

    console.timeEnd('Authenticate Strapi user')
  }

  // Generate a list of promises based on the `contentTypes` option.
  const promises = contentTypes.map(contentType =>
    fetchData({
      apiURL,
      contentType,
      jwtToken,
    })
  )

  // Execute the promises.
  const data = await Promise.all(promises)

  // Create nodes.
  contentTypes.forEach((contentType, i) => {
    const items = data[i]
    let childNodes = []
    items.forEach(item => {
      const node = Node(capitalize(contentType), item)
      createNode(node)
      findChildNodes(node, childNodes, node, createNode, createParentChildLink)
    })
    // childNodes.forEach(node => createNode(node))
  })
}

const findChildNodes = (item, childNodes, parent, createNode, createParentChildLink) => {
  const keys = Object.keys(item)
  keys.forEach(key => {
    if (Array.isArray(item[key])) {
      if (key === 'images') {
        item[key].forEach(i => {
          if ('mime' in i) {
            const node = {
              id: i.id,
              parent: parent.id,
              children: [],
              url: i['url'],
              name: i['name'],
              internal: {
                type: `ImageField`,
                mediaType: i['mime'],
                content: i['url'],
                contentDigest: crypto
                  .createHash('md5')
                  .update(JSON.stringify(i['url']))
                  .digest('hex'),
              },
            }
            if (node) {
              // childNodes.push(node)
              createNode(node)
              createParentChildLink({ parent: parent, child: node })
            }
          }
        })
      }
    } else if (typeof item[key] === 'object') {
      if ('mime' in item[key]) {
        const node = {
          id: item[key].id,
          parent: parent.id,
          children: [],
          url: item[key]['url'],
          name: item[key]['name'],
          internal: {
            type: `ImageField`,
            mediaType: item[key]['mime'],
            content: item[key]['url'],
            contentDigest: crypto
              .createHash('md5')
              .update(JSON.stringify(item[key]['url']))
              .digest('hex'),
          },
        }
        if (node) {
          // childNodes.push(node)
          createNode(node)
          createParentChildLink({ parent: parent, child: node })
        }
      }
    }
  })
}
