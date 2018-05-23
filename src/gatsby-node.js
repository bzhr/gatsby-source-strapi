import axios from "axios"
import fetchData from "./fetch"
import { Node } from "./nodes"
import { capitalize } from "lodash"
const crypto = require(`crypto`)

exports.sourceNodes = async (
  { boundActionCreators },
  { apiURL = "http://localhost:1337", contentTypes = [], loginData = {} }
) => {
  const { createNode } = boundActionCreators
  let jwtToken = null

  // Check if loginData is set.
  if (
    loginData.hasOwnProperty("identifier") &&
    loginData.identifier.length !== 0 &&
    loginData.hasOwnProperty("password") &&
    loginData.password.length !== 0
  ) {
    console.time("Authenticate Strapi user")
    console.log("Authenticate Strapi user")

    // Define API endpoint.
    const loginEndpoint = `${apiURL}/auth/local`

    // Make API request.
    try {
      const loginResponse = await axios.post(loginEndpoint, loginData)

      if (loginResponse.hasOwnProperty("data")) {
        jwtToken = loginResponse.data.jwt
      }
    } catch (e) {
      console.error("Strapi authentication error: " + e)
    }

    console.timeEnd("Authenticate Strapi user")
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
      findChildNodes(node, childNodes, node, contentType)
      childNodes.forEach(node => createNode(node))
      // childNodes.forEach(node => console.log(node.id))
    })
  })
}

const findChildNodes = (item, childNodes, parent, contentType) => {
  const keys = Object.keys(item)
  keys.forEach(key => {
    if (Array.isArray(item[key])) {
      if (key === "images") {
        item[key].forEach(i => {
          if ("mime" in i) {
            console.log(`${contentType}_${i.id}`)
            const node = {
              id: `${contentType}_${i.id}`,
              parent: parent.id,
              children: [],
              image: i["url"],
              internal: {
                type: `ImageField`,
                mediaType: i["mime"],
                content: i["url"],
                contentDigest: crypto
                  .createHash("md5")
                  .update(JSON.stringify(i["url"]))
                  .digest("hex")
              }
            };
            childNodes.push(node)
          }
        })
      }
    } else if (typeof item[key] === "object") {
      if ("mime" in item[key]) {
        console.log(`${contentType}_${item[key].id}`)
        const node = {
          id: `${contentType}_${item[key].id}`,
          parent: parent.id,
          children: [],
          image: item[key]["url"],
          internal: {
            type: `ImageField`,
            mediaType: item[key]["mime"],
            content: item[key]["url"],
            contentDigest: crypto
              .createHash("md5")
              .update(JSON.stringify(item[key]["url"]))
              .digest("hex")
          }
        };
        childNodes.push(node)
      }
    }
  })
}
