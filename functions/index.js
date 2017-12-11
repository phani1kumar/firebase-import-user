// // Firebase Functions for Roo google assistant app
// // https://firebase.google.com/functions/write-firebase-functions
//

'use strict';
const functions = require('firebase-functions');
const admin = require('firebase-admin');
admin.initializeApp(functions.config().firebase);
const path = require("path");
const express = require('express');
const app = express();
const bodyParser = require('body-parser');
const morgan = require('morgan');
app.use(bodyParser.urlencoded({ extended: true }));

//Libraries to handle functionalities
const fbImporter = require('./lib/accountImporter.js');

function createUserAccount(user, admin, projectId) {
  return new Promise((resolve, reject) => {
    console.log('login successful. Now merge account');
    /* {
      "localId": uid,
      "email": email-address
      "emailVerified": email-verified,
      "passwordHash": base64-encoded-password-hash,
      "salt": base64-encoded-password-salt,
      "displayName": name,
      "photoUrl": photo-url,
      "createdAt": created-at-in-millis,
      "lastSignedInAt": last-signedin-at-in-millis,
      "phoneNumber": phone-number
      "providerUserInfo": [
        {
          "providerId": provider-id,
          "rawId": provider-uid,
          "email":  provider-email,
          "displayName": provider-name,
          "photoUrl": provider-photo-url
        },
        ...
      ]
    }, */
    let curTime = new Date().getTime();
    let userObj = {
      localId: user.uid,
      email: user.email,
      emailVerified: true,
      displayName: user.name,
      photoUrl: user.picture,
      createdAt: curTime,
      lastSignedInAt: curTime,
      providerUserInfo: [
        {
          providerId: 'google.com',
          rawId: user.uid,
          email: user.email,
          displayName: user.name,
          photoUrl: user.picture
        }
      ]
    };
    console.log('userObj:', userObj);
    fbImporter.insertUser(projectId, userObj).then(result => {
      console.log('Successfully created the user');
      return resolve(uid);
    }).catch(e => {
      console.log('Error while importing user:' + JSON.stringify(user), e);
      return reject(e);
    });;
  });
}

app.post('/cfns/users', (req, res, next) => {
  if (req.body.user) {
    createUserAccount(req.body.user, admin, functions.config().project.id);
  }
});
exports.importuser = functions.https.onRequest(app);
