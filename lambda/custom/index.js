'use strict';

const Alexa = require('alexa-sdk');
let AWS = require('aws-sdk');
AWS.config.update({region: 'us-east-1'});
let ddb = new AWS.DynamoDB({apiVersion: '2012-08-10'});
const APP_ID = 'amzn1.ask.skill.1377365e-6b9d-485d-b628-034819fe2c60';

const languageStrings = {
    'en': {
        translation: {
            SKILL_NAME: 'Art gallery',
            WELCOME_MESSAGE: "Welcome to the %s. You can ask a question like, show works by pierre auguste renoir or  name artists like jackson... Whose works would you like to view?",
            WELCOME_REPROMPT: 'For instructions on what you can say, please say help me.',
            DISPLAY_CARD_TITLE: '%s  - Recipe for %s.',
            HELP_MESSAGE: "You can ask a question like, show works by renoir. ... Now, what can I help you with?",
            HELP_REPROMPT: "You can ask a question like, show works by renoir. ... Now, what can I help you with?",
            STOP_MESSAGE: 'Goodbye!',
            RECIPE_REPEAT_MESSAGE: 'Try saying repeat.',
            RECIPE_NOT_FOUND_MESSAGE: "I\'m sorry, I currently do not know ",
            RECIPE_NOT_FOUND_WITH_ITEM_NAME: 'the work by %s. ',
            RECIPE_NOT_FOUND_WITHOUT_ITEM_NAME: 'that work of art. ',
            RECIPE_NOT_FOUND_REPROMPT: 'What else can I help with?',
        },
    },
    'en-US': {
        translation: {
            SKILL_NAME: 'Art gallery',
        },
    }
};

const handlers = {
    //Use LaunchRequest, instead of NewSession if you want to use the one-shot model
    // Alexa, ask [my-skill-invocation-name] to (do something)...
    'LaunchRequest': function () {
        this.attributes.speechOutput = this.t('WELCOME_MESSAGE', this.t('SKILL_NAME'));
        // If the user either does not reply to the welcome message or says something that is not
        // understood, they will be prompted again with this text.
        this.attributes.repromptSpeech = this.t('WELCOME_REPROMPT');
        this.response.speak(this.attributes.speechOutput).listen(this.attributes.repromptSpeech);
        this.emit(':responseReady');
    },
    'RecipeIntent': function () {
        const itemSlot = this.event.request.intent.slots.Artist;
        let itemName;
        if (itemSlot && itemSlot.value) {
            itemName = itemSlot.value.toLowerCase();
        }
        console.log('searching for ' + itemName);
        const cardTitle = this.t('DISPLAY_CARD_TITLE', this.t('SKILL_NAME'), itemName);
        let params = {
            TableName: 'ImageClassificationV2',
            ExpressionAttributeValues: {
                ":artist": {
                    S: itemName
                }
            },
            KeyConditionExpression: "artist = :artist",
            IndexName: "ArtistNameIndex"
        };
        let self = this;
        ddb.query(params, function(err, data) {
            if (err) {
                console.log("Error", err);
            } else {
                console.log(`found ${data.Items.length} items`);
                if (data.Items.length > 0) {
                    let nameAndDateForArtist = data
                        .Items
                        .map(item => item.name.S + '(' + item.date.S + ')')
                        .join(', ');
                    const alexaSpeechOutputLimit = 7800; // https://stackoverflow.com/questions/36557053/alexa-skill-ssml-max-length
                    if (nameAndDateForArtist.length > alexaSpeechOutputLimit) {
                        nameAndDateForArtist = nameAndDateForArtist.substring(0, alexaSpeechOutputLimit) + '...';
                    }
                    self.attributes.speechOutput = nameAndDateForArtist;
                    self.attributes.repromptSpeech = self.t('RECIPE_REPEAT_MESSAGE');
                    self.response.speak(nameAndDateForArtist).listen(self.attributes.repromptSpeech);
                    self.response.cardRenderer(cardTitle, nameAndDateForArtist);
                    self.emit(':responseReady');
                } else {
                    let speechOutput = self.t('RECIPE_NOT_FOUND_MESSAGE');
                    const repromptSpeech = self.t('RECIPE_NOT_FOUND_REPROMPT');
                    if (itemName) {
                        speechOutput += self.t('RECIPE_NOT_FOUND_WITH_ITEM_NAME', itemName);
                    } else {
                        speechOutput += self.t('RECIPE_NOT_FOUND_WITHOUT_ITEM_NAME');
                    }
                    speechOutput += repromptSpeech;
                    self.attributes.speechOutput = speechOutput;
                    self.attributes.repromptSpeech = repromptSpeech;
                    self.response.speak(speechOutput).listen(repromptSpeech);
                    self.emit(':responseReady');
                }
            }
        });
    },
    'ArtistIntent': function () {
        const itemSlot = this.event.request.intent.slots.Artist;
        let itemName;
        if (itemSlot && itemSlot.value) {
            itemName = itemSlot.value.toLowerCase();
        }
        console.log('searching for ' + itemName);
        const cardTitle = this.t('DISPLAY_CARD_TITLE', this.t('SKILL_NAME'), itemName);
        let params = {
            TableName: 'ImageArtist',
            ExpressionAttributeValues: {
                ":artist": {
                    S: itemName
                }
            },
            FilterExpression: 'contains(artist, :artist)'
        };
        let self = this;
        ddb.scan(params, function(err, data) {
            if (err) {
                console.log("Error", err);
            } else {
                console.log(`found ${data.Items.length} items`);
                if (data.Items.length > 0) {
                    let nameAndDateForArtist = data
                        .Items
                        .map(item => item.artist.S)
                        .join(', ');
                    const alexaSpeechOutputLimit = 7800; // https://stackoverflow.com/questions/36557053/alexa-skill-ssml-max-length
                    if (nameAndDateForArtist.length > alexaSpeechOutputLimit) {
                        nameAndDateForArtist = nameAndDateForArtist.substring(0, alexaSpeechOutputLimit) + '...';
                    }
                    self.attributes.speechOutput = nameAndDateForArtist;
                    self.attributes.repromptSpeech = self.t('RECIPE_REPEAT_MESSAGE');
                    self.response.speak(nameAndDateForArtist).listen(self.attributes.repromptSpeech);
                    self.response.cardRenderer(cardTitle, nameAndDateForArtist);
                    self.emit(':responseReady');
                } else {
                    let speechOutput = self.t('RECIPE_NOT_FOUND_MESSAGE');
                    const repromptSpeech = self.t('RECIPE_NOT_FOUND_REPROMPT');
                    if (itemName) {
                        speechOutput += self.t('RECIPE_NOT_FOUND_WITH_ITEM_NAME', itemName);
                    } else {
                        speechOutput += self.t('RECIPE_NOT_FOUND_WITHOUT_ITEM_NAME');
                    }
                    speechOutput += repromptSpeech;
                    self.attributes.speechOutput = speechOutput;
                    self.attributes.repromptSpeech = repromptSpeech;
                    self.response.speak(speechOutput).listen(repromptSpeech);
                    self.emit(':responseReady');
                }
            }
        });

    },
    'AMAZON.HelpIntent': function () {
        this.attributes.speechOutput = this.t('HELP_MESSAGE');
        this.attributes.repromptSpeech = this.t('HELP_REPROMPT');

        this.response.speak(this.attributes.speechOutput).listen(this.attributes.repromptSpeech);
        this.emit(':responseReady');
    },
    'AMAZON.RepeatIntent': function () {
        this.response.speak(this.attributes.speechOutput).listen(this.attributes.repromptSpeech);
        this.emit(':responseReady');
    },
    'AMAZON.StopIntent': function () {
        this.response.speak("Goodbye!");
        this.emit(':responseReady');
    },
    'AMAZON.CancelIntent': function () {
        this.response.speak("Goodbye!");
        this.emit(':responseReady');
    },
    'SessionEndedRequest': function () {
        console.log(`Session ended: ${this.event.request.reason}`);
    },
    'Unhandled': function () {
        this.attributes.speechOutput = this.t('HELP_MESSAGE');
        this.attributes.repromptSpeech = this.t('HELP_REPROMPT');
        this.response.speak(this.attributes.speechOutput).listen(this.attributes.repromptSpeech);
        this.emit(':responseReady');
    },
};

exports.handler = function (event, context, callback) {
    console.log(JSON.stringify(event));
    const alexa = Alexa.handler(event, context, callback);
    alexa.APP_ID = APP_ID;
    alexa.resources = languageStrings;
    alexa.registerHandlers(handlers);
    alexa.execute();
};
