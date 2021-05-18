const debug = require('debug')('botium-connector-ondewo')
const grpc = require('@grpc/grpc-js')
const _ = require('lodash')
const mime = require('mime-types')
const randomize = require('randomatic')
const { UsersClient } = require('@ondewo/nlu-client-nodejs/api/ondewo/nlu/user_grpc_pb')
const { LoginRequest } = require('@ondewo/nlu-client-nodejs/api/ondewo/nlu/user_pb')
const { SessionsClient } = require('@ondewo/nlu-client-nodejs/api/ondewo/nlu/session_grpc_pb')
const {
  DetectIntentRequest,
  TextInput,
  QueryInput
} = require('@ondewo/nlu-client-nodejs/api/ondewo/nlu/session_pb')

const Capabilities = {
  ONDEWO_BASEURL: 'ONDEWO_BASEURL',
  ONDEWO_EMAIL: 'ONDEWO_EMAIL',
  ONDEWO_PASSWORD: 'ONDEWO_PASSWORD',
  ONDEWO_AUTH_TOKEN: 'ONDEWO_AUTH_TOKEN',
  ONDEWO_PROJECT_ID: 'ONDEWO_PROJECT_ID',
  ONDEWO_LANGUAGE_CODE: 'ONDEWO_LANGUAGE_CODE'
}

const Defaults = {
  [Capabilities.ONDEWO_BASEURL]: 'grpc-nlu.ondewo.com:443',
  [Capabilities.ONDEWO_LANGUAGE_CODE]: 'en'
}

class BotiumConnectorOndewo {
  constructor ({ queueBotSays, caps }) {
    this.queueBotSays = queueBotSays
    this.caps = caps
  }

  Validate () {
    debug('Validate called')
    this.caps = Object.assign({}, Defaults, this.caps)

    if (!this.caps[Capabilities.ONDEWO_BASEURL]) throw new Error('ONDEWO_BASEURL capability required')
    if (!this.caps[Capabilities.ONDEWO_EMAIL]) throw new Error('ONDEWO_EMAIL capability required')
    if (!this.caps[Capabilities.ONDEWO_PASSWORD]) throw new Error('ONDEWO_PASSWORD capability required')
    if (!this.caps[Capabilities.ONDEWO_AUTH_TOKEN]) throw new Error('ONDEWO_AUTH_TOKEN capability required')
    if (!this.caps[Capabilities.ONDEWO_PROJECT_ID]) throw new Error('ONDEWO_PROJECT_ID capability required')
  }

  async Start () {
    debug('Start called')
    await this._doLogin()
  }

  UserSays (msg) {
    debug('UserSays called')

    const metadata = new grpc.Metadata()
    metadata.add('Authorization', this.caps[Capabilities.ONDEWO_AUTH_TOKEN])
    metadata.add('cai-token', this.caiToken)

    const sessionClient = new SessionsClient(this.caps[Capabilities.ONDEWO_BASEURL], grpc.credentials.createSsl())

    const detectIntentRequest = new DetectIntentRequest()
    detectIntentRequest.setSession(`projects/${this.caps[Capabilities.ONDEWO_PROJECT_ID]}/agent/sessions/${this.sessionId}`)

    const textInput = new TextInput()
    textInput.setLanguageCode(this.caps[Capabilities.ONDEWO_LANGUAGE_CODE])

    if (msg.buttons && msg.buttons.length > 0 && (msg.buttons[0].text || msg.buttons[0].payload)) {
      textInput.setText(msg.buttons[0].text
        ? msg.buttons[0].text
        : _.isString(msg.buttons[0].payload) ? msg.buttons[0].payload : undefined)
    } else if (msg.media && msg.media.length > 0) {
      debug('The \'MEDIA\' message type is not supported yet.')
    } else {
      textInput.setText(msg.messageText)
    }

    const queryInput = new QueryInput()
    queryInput.setText(textInput)

    detectIntentRequest.setQueryInput(queryInput)

    sessionClient.detectIntent(detectIntentRequest, metadata, (error, response) => {
      if (error) {
        throw error
      } else {
        const botMsg = this._processResponse(response)
        this.queueBotSays(botMsg)
      }
    })
  }

  async _doLogin () {
    const metadata = new grpc.Metadata()
    metadata.add('Authorization', this.caps[Capabilities.ONDEWO_AUTH_TOKEN])

    const loginRequest = new LoginRequest()
    loginRequest.setUserEmail(this.caps[Capabilities.ONDEWO_EMAIL])
    loginRequest.setPassword(this.caps[Capabilities.ONDEWO_PASSWORD])

    const usersClient = new UsersClient(this.caps[Capabilities.ONDEWO_BASEURL], grpc.credentials.createSsl())

    return new Promise((resolve, reject) => {
      usersClient.login(loginRequest, metadata, (error, response) => {
        if (error) {
          return reject(reject)
        }
        this.caiToken = response.toObject().authToken
        this.sessionId = randomize('Aa0', 5)
        return resolve()
      })
    })
  }

  _processResponse (response) {
    const mapMedia = (m) => ({
      mediaUri: m.imageUri || m.uri,
      mimeType: mime.lookup(m.imageUri) || 'application/unknown',
      altText: false
    })
    const mapButtonPayload = (p) => {
      let payload
      try {
        payload = JSON.parse(p)
      } catch (err) {
        payload = p
      }
      return payload
    }
    const mapButton = (b) => ({
      text: _.isString(b) ? b : b.text,
      payload: !_.isString(b) ? mapButtonPayload(b.postback) : null
    })
    const mapCard = (c) => ({
      text: c.title,
      content: c.subtitle,
      media: c.imageUri ? [mapMedia({ imageUri: c.imageUri })] : null
    })

    const queryResult = response.toObject().queryResult
    const botMsg = {
      sourceData: queryResult,
      buttons: [],
      media: [],
      cards: []
    }
    for (const fulfillmentMessage of queryResult.fulfillmentMessagesList) {
      if (fulfillmentMessage.text) {
        botMsg.messageText = botMsg.messageText ? `${botMsg.messageText}\n${fulfillmentMessage.text.textList[0]}` : fulfillmentMessage.text.textList[0]
      } else if (fulfillmentMessage.quickReplies) {
        botMsg.messageText = botMsg.messageText ? `${botMsg.messageText}\n${fulfillmentMessage.quickReplies.title}` : fulfillmentMessage.quickReplies.title
        for (const quickReply of fulfillmentMessage.quickReplies.quickRepliesList) {
          botMsg.buttons.push(mapButton(quickReply))
        }
      } else if (fulfillmentMessage.card) {
        const botiumCard = mapCard(fulfillmentMessage.card)
        if (fulfillmentMessage.card.buttonsList && fulfillmentMessage.card.buttonsList.length > 0) {
          botiumCard.buttons = []
          for (const button of fulfillmentMessage.card.buttonsList) {
            botiumCard.buttons.push(mapButton(button))
          }
        }
        botMsg.cards.push(botiumCard)
      } else if (fulfillmentMessage.image) {
        botMsg.messageText = botMsg.messageText ? `${botMsg.messageText}\n${fulfillmentMessage.image.accessibilityText}` : fulfillmentMessage.image.accessibilityText
        botMsg.media.push(mapMedia(fulfillmentMessage.image))
      } else if (fulfillmentMessage.video) {
        botMsg.messageText = botMsg.messageText ? `${botMsg.messageText}\n${fulfillmentMessage.video.accessibilityText}` : fulfillmentMessage.video.accessibilityText
        botMsg.media.push(mapMedia(fulfillmentMessage.video))
      } else if (fulfillmentMessage.audio) {
        botMsg.messageText = botMsg.messageText ? `${botMsg.messageText}\n${fulfillmentMessage.audio.accessibilityText}` : fulfillmentMessage.audio.accessibilityText
        botMsg.media.push(mapMedia(fulfillmentMessage.audio))
      }
    }

    botMsg.nlp = {
      intent: this._extractIntent(queryResult)
    }
    return botMsg
  }

  _extractIntent (queryResult) {
    if (queryResult.intent) {
      return {
        name: queryResult.intent.displayName,
        confidence: queryResult.intentDetectionConfidence
      }
    }
    return {}
  }
}

module.exports = {
  PluginVersion: 1,
  PluginClass: BotiumConnectorOndewo,
  PluginDesc: {
    name: 'Ondewo',
    provider: 'Ondewo',
    features: {
      intentResolution: true,
      intentConfidenceScore: true
    },
    capabilities: [
      {
        name: Capabilities.ONDEWO_EMAIL,
        label: 'Email',
        type: 'string',
        required: true
      },
      {
        name: Capabilities.ONDEWO_PASSWORD,
        label: 'Password',
        type: 'secret',
        required: true
      },
      {
        name: Capabilities.ONDEWO_BASEURL,
        label: 'Base url',
        type: 'string',
        description: 'By default \'grpc-nlu.ondewo.com:443\' url will be used.',
        required: false
      },
      {
        name: Capabilities.ONDEWO_AUTH_TOKEN,
        label: 'Basic auth token',
        type: 'secret',
        required: true
      },
      {
        name: Capabilities.ONDEWO_PROJECT_ID,
        label: 'Project ID',
        type: 'string',
        required: true
      },
      {
        name: Capabilities.ONDEWO_LANGUAGE_CODE,
        label: 'Language code',
        type: 'string',
        description: 'By default \'en\' language code will be used.',
        required: false
      }
    ]
  }
}
