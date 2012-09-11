/* Copyright 2012 Google Inc. All Rights Reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

// Common functions shared between options page and popup. These are in the
// global namespace, because there are only a few of them.

// Get password hasher global options. callback will be called with the options
// object as an argument. This has to be async because chrome storage is async.
var getOptions = function (callback) {
  'use strict';

  var Options = function (items) {
    // The global options list is used to determine what settings exist as well
    // as to store their current values. It gets used in for loops, so it must
    // only contain the actual settings, not any methods. It's initialised here
    // with the default option values.
    this.globalOptions = {
      digits: true,
      punctuation: true,
      mixedcase: true,
      nospecial: false,
      digitsonly: false,
      length: 8,
      guesstag: 'name',
      displayhash: false,
      displaytag: true,
      storepass: 'never'
    };

    // Copy only options that already exist in defaults. Obsolete settings will
    // be dropped.
    for (var option in this.globalOptions) {
      if (option in items.options) {
        this.globalOptions[option] = items.options[option];
      }
    }

    this.resetToGlobal();
  };

  // Reset the options object to the saved global settings.
  Options.prototype.resetToGlobal = function () {
    for (var option in this.globalOptions) {
      this[option] = this.globalOptions[option];
    }
  };

  // Save the current values of the options object as the global settings.
  Options.prototype.saveToGlobal = function () {
    if (this.storepass != 'forever') {
      chrome.storage.local.remove('masterpassword');
    }
    for (var option in this.globalOptions) {
      this.globalOptions[option] = this[option];
    }
    chrome.storage.sync.set({options: this.globalOptions});
  };

  // Update the DOM to match the state of this options object.
  Options.prototype.updateDOM = function () {
    for (var option in this.globalOptions) {
      var e = document.getElementById(option);
      if (e) {
        if (e.type == 'checkbox')
          e.checked = this[option];
        else
          e.value = this[option];
      } else {
        var es = document.getElementsByName(option);
        for (var i = 0; i < es.length; ++i) {
          es[i].checked = (es[i].value == this[option]);
        }
      }
    }
  };

  // Bind the options object to the corresponding DOM elements.
  // The object will be updated when the state is changed by the user, and then
  // callback will be called if provided.
  Options.prototype.bindToDOM = function (callback) {
    var that = this;
    var updateOptions = function (event) {
      var e = event.target;
      if (e.type === 'checkbox') {
        that[e.name] = e.checked;
      } else {
        that[e.name] = e.value;
      }

      if (callback != undefined)
        callback();
    };

    this.updateDOM();
    for (var option in this.globalOptions) {
      var e = document.getElementById(option);
      if (e) {
        e.addEventListener('change', updateOptions);
      } else {
        var es = document.getElementsByName(option);
        for (var i = 0; i < es.length; ++i) {
          es[i].addEventListener('change', updateOptions);
        }
      }
    }
  };


  ////////////////////////////////////////////////////////
  // Execution starts here.

  chrome.storage.sync.get({options: {}}, function (items) {
    // Pass options to the callback.
    callback(new Options(items));
  });
};
