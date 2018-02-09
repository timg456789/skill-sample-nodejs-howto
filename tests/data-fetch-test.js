let AWS = require('aws-sdk');
AWS.config.update({region: 'us-east-1'});
let ddb = new AWS.DynamoDB({apiVersion: '2012-08-10'});

let params = {
    TableName: 'ImageClassificationV2',
    ExpressionAttributeValues: {
        ":artist": {
            S: 'jackson pollock'
        }
    },
    KeyConditionExpression: "artist = :artist",
    IndexName: "ArtistNameIndex"
};
ddb.query(params, function(err, data) {
    if (err) {
        console.log("Error", err);
    } else {
        let nameAndDateForArtist = data
            .Items
            .map(item => item.name.S + '(' + item.date.S + ')')
            .join(', ');
        console.log(nameAndDateForArtist);
    }
});

let itemName = 'jackson';
console.log('searching for ' + itemName);
let artistParams = {
    TableName: 'ImageArtist',
    ExpressionAttributeValues: {
        ":artist": {
            S: itemName
        }
    },
    FilterExpression: 'contains(artist, :artist)'
};
let self = this;
ddb.scan(artistParams, function(err, data) {
    if (err) {
        console.log("Error", err);
    } else {
        console.log(`found ${data.Items.length} items`);
        if (data.Items.length > 0) {
            let nameAndDateForArtist = 'beep! beep! dooo! doo! ' + data
                .Items
                .map(item => item.artist.S)
                .join(', ');
            const alexaSpeechOutputLimit = 7800; // https://stackoverflow.com/questions/36557053/alexa-skill-ssml-max-length
            if (nameAndDateForArtist.length > alexaSpeechOutputLimit) {
                nameAndDateForArtist = nameAndDateForArtist.substring(0, alexaSpeechOutputLimit) + '...';
            }
            console.log(nameAndDateForArtist);
        }
    }
});