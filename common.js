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

  chrome.storage.sync.get({options: {}}, function (items) {
    // Default values for options.
    var options = {
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
    for (var option in options) {
      if (option in items.options) {
        options[option] = items.options[option];
      }
    }

    // Pass options to the callback.
    callback(options);
  });
};

// Use an options object to set the state of the corresponding DOM elements.
// The object will be updated when the state is changed by the user, and then
// callback will be called (passing it the options object) if provided.
var copyOptionsToDOM = function (options, callback) {
  'use strict';

  var updateOptions = function (event) {
    var e = event.target;
    if (e.type === 'checkbox') {
      options[e.name] = e.checked;
    } else {
      options[e.name] = e.value;
    }

    if (callback != undefined)
      callback(options);
  };

  for (var option in options) {
    var e = document.getElementById(option);
    if (e) {
      if (e.type == 'checkbox')
        e.checked = options[option];
      else
        e.value = options[option];
      e.addEventListener('change', updateOptions);
    } else {
      var es = document.getElementsByName(option);
      for (var i = 0; i < es.length; ++i) {
        es[i].checked = (es[i].value == options[option]);
        es[i].addEventListener('change', updateOptions);
      }
    }
  }
};
