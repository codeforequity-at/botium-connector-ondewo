# Botium Connector for Ondewo Chatbots

[![NPM](https://nodei.co/npm/botium-connector-ondewo.png?downloads=true&downloadRank=true&stars=true)](https://nodei.co/npm/botium-connector-ondewo/)

[![Codeship Status for codeforequity-at/botium-connector-ondewo](https://app.codeship.com/projects/fba89060-ca95-0137-148b-262f82e94b5b/status?branch=master)](https://app.codeship.com/projects/367944)
[![npm version](https://badge.fury.io/js/botium-connector-ondewo.svg)](https://badge.fury.io/js/botium-connector-ondewo)
[![license](https://img.shields.io/github/license/mashape/apistatus.svg)]()


This is a [Botium](https://github.com/codeforequity-at/botium-core) connector for testing your [Ondewo](https://www.ondewo.com/) chatbot.

__Did you read the [Botium in a Nutshell](https://medium.com/@floriantreml/botium-in-a-nutshell-part-1-overview-f8d0ceaf8fb4) articles? Be warned, without prior knowledge of Botium you won't be able to properly use this library!__

## How it works
Botium connects to the API of your ondewo chatbot.

It can be used as any other Botium connector with all Botium Stack components:
* [Botium CLI](https://github.com/codeforequity-at/botium-cli/)
* [Botium Bindings](https://github.com/codeforequity-at/botium-bindings/)
* [Botium Box](https://www.botium.at)

## Requirements
* **Node.js and NPM**
* an **Ondewo bot**
* a **project directory** on your workstation to hold test cases and Botium configuration

## Install Botium and Ondewo Connector

When using __Botium CLI__:

```
> npm install -g botium-cli
> npm install -g botium-connector-ondewo
> botium-cli init
> botium-cli run
```

When using __Botium Bindings__:

```
> npm install -g botium-bindings
> npm install -g botium-connector-ondewo
> botium-bindings init mocha
> npm install && npm run mocha
```

When using __Botium Box__:

_Already integrated into Botium Box, no setup required_

## Connecting Ondewo chatbot to Botium

You have to know just the endpoint URL for your chatbot, as well as username and password.
  
Create a botium.json with this URL in your project directory: 

```
{
  "botium": {
    "Capabilities": {
      "PROJECTNAME": "<whatever>",
      "CONTAINERMODE": "ondewo",
      "ONDEWO_EMAIL": "...",
      "ONDEWO_PASSWORD": "...",
      "ONDEWO_AUTH_TOKEN": "...",
      "ONDEWO_PROJECT_ID": "..."
    }
  }
}
```

To check the configuration, run the emulator (Botium CLI required) to bring up a chat interface in your terminal window:

```
> botium-cli emulator
```

Botium setup is ready, you can begin to write your [BotiumScript](https://github.com/codeforequity-at/botium-core/wiki/Botium-Scripting) files.

## How to start sample

* Adapt botium.json in the samples/ondewo directory
* Install botium-core
* Install packages, run the test

```
> npm install --no-save botium-core
> cd ./samples/ondewo
> npm install && npm test
```

## Supported Capabilities

Set the capability __CONTAINERMODE__ to __ondewo__ to activate this connector.

### ONDEWO_BASEURL
Ondewo chatbot base url. By default `grpc-nlu.ondewo.com:443` is used.

### ONDEWO_EMAIL*
Ondewo login email address

### ONDEWO_PASSWORD*
Ondewo login password

### ONDEWO_AUTH_TOKEN*
Ondewo basic auth token

### ONDEWO_PROJECT_ID*
Ondewo chatbot project id

### ONDEWO_LANGUAGE_CODE*
Ondewo language code. By default `en` code is used.

### Roadmap
* Support for sentiment analyze
