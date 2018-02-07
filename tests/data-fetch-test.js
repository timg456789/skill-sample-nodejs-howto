let AWS = require('aws-sdk');
AWS.config.update({region: 'us-east-1'});
let ddb = new AWS.DynamoDB({apiVersion: '2012-08-10'});

let params = {
    TableName: 'ImageClassificationV2',
    ExpressionAttributeValues: {
        ":artist": {
            S: 'pablo picasso'
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