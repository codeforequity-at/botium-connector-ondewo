const util = require('util')
const debug = require('debug')('botium-connector-ondewo')

const SimpleRestContainer = require('botium-core/src/containers/plugins/SimpleRestContainer')
const CoreCapabilities = require('botium-core/src/Capabilities')

const Capabilities = {
  ONDEWO_BASEURL: 'ONDEWO_BASEURL',
  ONDEWO_USERNAME: 'ONDEWO_USERNAME',
  ONDEWO_PASSWORD: 'ONDEWO_PASSWORD'
}

class BotiumConnectorOndewo {
  constructor ({ queueBotSays, caps }) {
    this.queueBotSays = queueBotSays
    this.caps = caps
    this.delegateContainer = null
    this.delegateCaps = null
  }

  Validate () {
    debug('Validate called')

    if (!this.caps[Capabilities.ONDEWO_BASEURL]) throw new Error('ONDEWO_BASEURL capability required')

    if (!this.delegateContainer) {
      this.delegateCaps = {
        [CoreCapabilities.SIMPLEREST_URL]: this.caps[Capabilities.ONDEWO_BASEURL] + '/v2/projects/botium/agent/sessions/{{botium.conversationId}}:detectIntent',
        [CoreCapabilities.SIMPLEREST_METHOD]: 'POST',
        [CoreCapabilities.SIMPLEREST_BODY_TEMPLATE]:
        `{
          "queryParams": {
            "timeZone": "Europe/Vienna",
            "contexts": [],
            "resetContexts": false,
            "payload": {
              "source": "cdls test",
              "timestamp": {{fnc.timestamp}}
            }
          },
          "queryInput": {
            "text": {
              "text": "{{msg.messageText}}",
              "language_code": "en"
            }
          }
        }`,
        [CoreCapabilities.SIMPLEREST_RESPONSE_JSONPATH]: '$.query_result.fulfillment_messages[*].text.text',
        [CoreCapabilities.SIMPLEREST_RESPONSE_HOOK]: ({ botMsg }) => {
          if (botMsg.sourceData.query_result.intent) {
            botMsg.nlp = {
              intent: {
                name: botMsg.sourceData.query_result.intent.display_name,
                confidece: botMsg.sourceData.query_result.intent_detection_confidence
              }
            }
          }
        }
      }
      if (this.caps[Capabilities.ONDEWO_USERNAME]) {
        this.delegateCaps[CoreCapabilities.SIMPLEREST_HEADERS_TEMPLATE] = {
          Authorization: 'Basic ' + Buffer.from(`${this.caps[Capabilities.ONDEWO_USERNAME]}:${this.caps[Capabilities.ONDEWO_PASSWORD]}`).toString('base64')
        }
      }
      debug(`Validate delegateCaps ${util.inspect(this.delegateCaps)}`)
      this.delegateContainer = new SimpleRestContainer({ queueBotSays: this.queueBotSays, caps: this.delegateCaps })
    }

    debug('Validate delegate')
    this.delegateContainer.Validate()
    return Promise.resolve()
  }

  Build () {
    if (this.delegateContainer.Build) {
      this.delegateContainer.Build()
    }

    debug('Build called')
    return Promise.resolve()
  }

  Start () {
    debug('Start called')

    if (this.delegateContainer.Start) {
      this.delegateContainer.Start()
    }

    return Promise.resolve()
  }

  UserSays (msg) {
    debug('UserSays called')
    return this.delegateContainer.UserSays(msg)
  }

  Stop () {
    debug('Stop called')

    if (this.delegateContainer.Stop) {
      this.delegateContainer.Stop()
    }

    return Promise.resolve()
  }

  Clean () {
    debug('Clean called')
    if (this.delegateContainer.Clean) {
      this.delegateContainer.Clean()
    }

    return Promise.resolve()
  }
}

module.exports = {
  PluginVersion: 1,
  PluginClass: BotiumConnectorOndewo
}
