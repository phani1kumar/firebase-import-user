'use strict';

const _ = require('lodash');

const api = require('./import/api');
// var logger = require('../lib/logger');
// var utils = require('../lib/utils');

var ALLOWED_JSON_KEYS = [
  'localId', 'email', 'emailVerified', 'passwordHash', 'salt', 'displayName', 'photoUrl', 'createdAt', 'lastSignedInAt',
  'providerUserInfo', 'phoneNumber'];
var ALLOWED_JSON_KEYS_RENAMING = {
  lastSignedInAt: 'lastLoginAt'
};
var ALLOWED_PROVIDER_USER_INFO_KEYS = ['providerId', 'rawId', 'email', 'displayName', 'photoUrl'];
var ALLOWED_PROVIDER_IDS = ['google.com', 'facebook.com', 'twitter.com', 'github.com'];


var _toWebSafeBase64 = function (data) {
  return data.toString('base64').replace(/\//g, '_').replace(/\+/g, '-');
};

var _addProviderUserInfo = function (user, providerId, arr) {
  if (arr[0]) {
    user.providerUserInfo.push({
      providerId: providerId,
      rawId: arr[0],
      email: arr[1],
      displayName: arr[2],
      photoUrl: arr[3]
    });
  }
};

var _genUploadAccountPostBody = function (projectId, accounts) {
  var postBody = {
    users: accounts.map(
      function (account) {
        _.each(ALLOWED_JSON_KEYS_RENAMING, function (value, key) {
          if (account[key]) {
            account[value] = account[key];
            delete account[key];
          }
        });
        return account;
      })
  };

  postBody.targetProjectId = projectId;
  return postBody;
};

var transArrayToUser = function (arr) {
  var user = {
    localId: arr[0],
    email: arr[1],
    emailVerified: arr[2] === 'true',
    passwordHash: arr[3],
    salt: arr[4],
    displayName: arr[5],
    photoUrl: arr[6],
    createdAt: arr[23],
    lastLoginAt: arr[24],
    phoneNumber: arr[26],
    providerUserInfo: []
  };
  _addProviderUserInfo(user, 'google.com', arr.slice(7, 11));
  _addProviderUserInfo(user, 'facebook.com', arr.slice(11, 15));
  _addProviderUserInfo(user, 'twitter.com', arr.slice(15, 19));
  _addProviderUserInfo(user, 'github.com', arr.slice(19, 23));
  return user;
};

var _validateProviderUserInfo = function (providerUserInfo) {
  if (!_.includes(ALLOWED_PROVIDER_IDS, providerUserInfo.providerId)) {
    return { error: JSON.stringify(providerUserInfo, null, 2) + ' has unsupported providerId' };
  }
  var keydiff = _.difference(_.keys(providerUserInfo), ALLOWED_PROVIDER_USER_INFO_KEYS);
  if (keydiff.length) {
    return { error: JSON.stringify(providerUserInfo, null, 2) + ' has unsupported keys: ' + keydiff.join(',') };
  }
  return {};
};

var validateUserJson = function (userJson) {
  var keydiff = _.difference(_.keys(userJson), ALLOWED_JSON_KEYS);
  if (keydiff.length) {
    return { error: JSON.stringify(userJson, null, 2) + ' has unsupported keys: ' + keydiff.join(',') };
  }
  if (userJson.providerUserInfo) {
    for (var i = 0; i < userJson.providerUserInfo.length; i++) {
      var res = _validateProviderUserInfo(userJson.providerUserInfo[i]);
      if (res.error) {
        return res;
      }
    }
  }
  return {};
};

module.exports.insertUser = function (projectId, user) {
  let userList = [];
  userList.push(user);
  return new Promise((resolve, reject) => {
    console.log('Starting importing ' + userList.length + ' account(s).');
    let validation = validateUserJson(user);
    if (validation.error)
      return reject(validation.error);

    api.request('POST', '/identitytoolkit/v3/relyingparty/uploadAccount', {
      auth: true,
      json: true,
      data: _genUploadAccountPostBody(projectId, userList),
      origin: api.googleOrigin
    }).then(ret => {
      if (ret.body.error) {
        console.log('Encountered problems while importing accounts. Details:');
        console.log(ret.body.error.map(
          rawInfo => {
            return {
              account: JSON.stringify(userList[parseInt(rawInfo.index, 10)], null, 2),
              reason: rawInfo.message
            };
          }));
          return reject(ret.body.error);
      } else {
        console.log('Imported successfully.');
        return resolve('Imported successfully!');
      }
      console.log('Done!');
    })
    .catch(e => {
      console.log('Error while importing user:', e);
      reject(e);
    });
  });
};