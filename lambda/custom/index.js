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
            WELCOME_MESSAGE: "Welcome to the %s. You can ask a question like, name works by pierre auguste renoir or  name artists like jackson... Whose works would you like to view?",
            WELCOME_REPROMPT: 'For instructions on what you can say, please say help me.',
            DISPLAY_CARD_TITLE_ARTISTS: 'Artists - %s.',
            DISPLAY_CARD_TITLE_ARTIST_WORKS: 'Artist Works - %s.',
            HELP_MESSAGE: "You can ask a question like, name works by renoir. ... Now, what can I help you with?",
            HELP_REPROMPT: "You can ask a question like, name works by renoir. ... Now, what can I help you with?",
            STOP_MESSAGE: 'Bye!',
            ITEM_REPEAT_MESSAGE: 'Try saying repeat.',
            ITEM_NOT_FOUND_MESSAGE: "I\'m sorry, I currently do not know ",
            ITEM_NOT_FOUND_WITH_ITEM_NAME: 'the work by %s. ',
            ITEM_NOT_FOUND_WITHOUT_ITEM_NAME: 'that work of art. ',
            ITEM_NOT_FOUND_REPROMPT: 'What else can I help with?',
            ARTIST_WORK_NO_SPEECH: 'an artist name must be provided to list their works of art',
            ARTIST_WORK_ERROR: 'there was a problem searching %s please try another artist',
            ARTIST_WORK_NO_RESULTS: 'There were no works found by %s',
            ARTIST_NAME_NO_SPEECH: 'an artist name must be provided',
            ARTIST_NAME_ERROR: 'There was a problem searching %s. Please try another artist name',
            ARTIST_NAME_NO_RESULTS: 'no artists found like %s'
        },
    },
    'en-US': {
        translation: {
            SKILL_NAME: 'Art gallery',
        },
    }
};
function sendResponse(context, title, msg, reprompt) {
    context.attributes.speechOutput = msg;
    context.attributes.repromptSpeech = reprompt;
    context.response.speak(msg).listen(context.attributes.repromptSpeech);
    context.response.cardRenderer(title, msg);
    context.emit(':responseReady');
}
function truncateSpeech(speech) {
    const alexaSpeechOutputLimit = 7800; // https://stackoverflow.com/questions/36557053/alexa-skill-ssml-max-length
    if (speech.length > alexaSpeechOutputLimit) {
        speech = speech.substring(0, alexaSpeechOutputLimit) + '...';
    }
    return speech;
}
const handlers = {
    //Use LaunchRequest, instead of NewSession if you want to use the one-shot model // Alexa, ask [my-skill-invocation-name] to (do something)...
    'LaunchRequest': function () {
        this.attributes.speechOutput = this.t('WELCOME_MESSAGE', this.t('SKILL_NAME'));
        this.attributes.repromptSpeech = this.t('WELCOME_REPROMPT');
        this.response.speak(this.attributes.speechOutput).listen(this.attributes.repromptSpeech);
        this.emit(':responseReady');
    },
    'ArtistWorkIntent': function () {
        let self = this; // needed for any nested functions.
        const itemSlot = self.event.request.intent.slots.Artist;
        let itemName = itemSlot && itemSlot.value ? itemSlot.value.toLowerCase() : '';
        console.log('searching for ' + itemName);
        const cardTitle = self.t('DISPLAY_CARD_TITLE', self.t('SKILL_NAME'), itemName);
        if (!itemName) {
            sendResponse(self, cardTitle, self.t('ARTIST_WORK_NO_SPEECH'), self.t('ITEM_NOT_FOUND_REPROMPT'));
            return;
        }
        ddb.query({
            TableName: 'ImageClassificationV2', ExpressionAttributeValues: { ":artist": { S: itemName } },
            KeyConditionExpression: "artist = :artist", IndexName: "ArtistNameIndex"
        }, function(err, data) {
            if (err) {
                sendResponse(self, cardTitle, self.t('ARTIST_WORK_ERROR'), self.t('ITEM_NOT_FOUND_REPROMPT'));
                return;
            }
            if (data.Items.length <= 0) {
                sendResponse(self, cardTitle, self.t('ARTIST_WORK_NO_RESULTS'), self.t('ITEM_NOT_FOUND_REPROMPT'));
                return;
            }
            sendResponse(
                self,
                cardTitle,
                truncateSpeech(
                    data.Items.map(item => item.name.S + '(' + item.date.S + ')').join(', ')
                ),
                self.t('ITEM_REPEAT_MESSAGE')
            );
        });
    },
    'ArtistIntent': function () {
        let self = this; // needed for any nested functions.
        const itemSlot = self.event.request.intent.slots.Artist;
        let itemName = itemSlot && itemSlot.value ? itemSlot.value.toLowerCase() : '';
        console.log('searching for ' + itemName);
        const cardTitle = self.t('DISPLAY_CARD_TITLE', self.t('SKILL_NAME'), itemName);
        if (!itemName) {
            sendResponse(self, cardTitle, self.t('ARTIST_NAME_NO_SPEECH'), self.t('ITEM_NOT_FOUND_REPROMPT'));
            return;
        }
        ddb.scan({
            TableName: 'ImageArtist', ExpressionAttributeValues: { ":artist": { S: itemName } },
            FilterExpression: 'contains(artist, :artist)'
        }, function(err, data) {
            if (err) {
                sendResponse(self, cardTitle, self.t('ARTIST_NAME_ERROR'), self.t('ITEM_NOT_FOUND_REPROMPT'));
                return;
            }
            if (data.Items.length <= 0) {
                sendResponse(self, cardTitle, self.t('ARTIST_NAME_NO_RESULTS'), self.t('ITEM_NOT_FOUND_REPROMPT'));
                return;
            }
            sendResponse(self, cardTitle, truncateSpeech(data.Items.map(item => item.artist.S).join(', ')), self.t('ITEM_REPEAT_MESSAGE'));
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
    alexa.appId = APP_ID;
    alexa.resources = languageStrings;
    alexa.registerHandlers(handlers);
    alexa.execute();
};
