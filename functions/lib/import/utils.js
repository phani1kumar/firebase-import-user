'use strict';

var _ = require('lodash');
var RSVP = require('rsvp');

var configstore = require('./configstore');
var FirebaseError = require('./error');
// var logger = require('./logger');

var isWindows = process.platform === 'win32';

var ENV_OVERRIDES = [];

module.exports = {
  /**
   * Create a Firebase Console URL for the specified path and project.
   * @param {String} project The Project ID for the URL.
   * @param {String} path The console path for the URL.
   */
  consoleUrl: function(project, path) {
    var api = require('./api');
    return api.consoleOrigin + '/project/' + project + path;
  },
  /**
   * Trace up the ancestry of objects that have a `parent` key, finding the
   * first instance of the provided key.
   *
   * @param {Object} options The options object with potential parents.
   * @param {String} key The key for which to look.
   */
  getInheritedOption: function(options, key) {
    var target = options;
    while (target) {
      if (_.has(target, key)) {
        return target[key];
      }
      target = target.parent;
    }
  },
  /**
   * Override a value with supplied environment variable if present.
   *
   * @param {String} envname The environment variable to override.
   * @param {String} value The default value if no env is set.
   * @param {Function} coerce A function that returns the environment
   *   variable in an acceptable format. If this throws an error, the
   *   default value will be used.
   * @returns {String} The fully resolved value
   */
  envOverride: function(envname, value, coerce) {
    if (process.env[envname] && process.env[envname].length) {
      ENV_OVERRIDES.push(envname);
      if (coerce) {
        try {
          return coerce(process.env[envname], value);
        } catch (e) {
          return value;
        }
      }
      return process.env[envname];
    }
    return value;
  },
  /**
   * A list of environment variable overrides that have been applied.
   */
  envOverrides: ENV_OVERRIDES,

  /**
   * Add a subdomain to the specified HTTP origin.
   * @param {String} origin The HTTP origin (e.g. https://example.com)
   * @param {String} subdomain The subdomain to add
   * @returns {String} The origin for the domain with a subdomain
   */
  addSubdomain: function(origin, subdomain) {
    return origin.replace('//', '//' + subdomain + '.');
  },
  
  /**
   * Return a promise that rejects with a FirebaseError.
   * @param {String} message the error message
   * @param {Object} options the error options
   */
  reject: function(message, options) {
    return RSVP.reject(new FirebaseError(message, options));
  },
  
  /**
   * Sets the active project alias or id in the specified directory.
   * @param {String} projectDir the project directory
   * @param {String} newActive the new active project alias or id
   */
  makeActiveProject: function(projectDir, newActive) {
    var activeProjects = configstore.get('activeProjects') || {};
    if (newActive) {
      activeProjects[projectDir] = newActive;
    } else {
      _.unset(activeProjects, projectDir);
    }

    configstore.set('activeProjects', activeProjects);
  },

  /**
   * Creates API endpoint string, e.g. /v1/projects/pid/cloudfunctions
   * @param {Array} array of parts to be connected together with slashes
   */
  endpoint: function(parts) {
    return '/' + _.join(parts, '/');
  }
};