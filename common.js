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
      storepass: 'never',
      storesite: 'changed'
    };

    // Copy only options that already exist in defaults. Obsolete settings will
    // be dropped.
    if (items.options !== undefined) {
      for (var option in this.globalOptions) {
        if (option in items.options) {
          this.globalOptions[option] = items.options[option];
        }
      }
    }

    this.savedItems = items;
    this.resetToGlobal();

    // Convert old stored string lengths into numbers.
    if (typeof this.length == 'string') {
      this.length = parseInt(this.length, 10);
      this.saveToGlobal();
    }
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

  // Get the hash bucket for the given tag.
  Options.prototype.hashBucket = function (tag) {
    // Java string hashcode implementation.
    var hash = 0;
    for (var i = 0; i < tag.length; i++) {
      hash = ((hash << 5) - hash) + tag.charCodeAt(i);
      hash = hash & hash;
    }

    // Hash is signed; take absolute value. 419 buckets leaves us room for ~100
    // other stored values, and is prime (everyone loves primes).
    hash = Math.abs(hash) % 419;
    return 'tag_' + hash;
  };

  // Get the saved options from the hashed index for the given tag.
  Options.prototype.getHashedTagOpts = function (tag) {
    var bucketobj = this.savedItems[this.hashBucket(tag)] || {};
    return bucketobj[tag];
  };

  // Set and save the options in the hashed index for the given tag.
  Options.prototype.setHashedTagOpts = function (tag, value) {
    var bucket = this.hashBucket(tag);
    var save = {};
    save[bucket] = this.savedItems[bucket] || {};
    save[bucket][tag] = value;
    chrome.storage.sync.set(save);
  };

  // Delete and save the options in the hashed index for the given tag.
  Options.prototype.delHashedTagOpts = function (tag) {
    var bucket = this.hashBucket(tag);
    var save = {};
    save[bucket] = this.savedItems[bucket] || {};
    delete save[bucket][tag];
    if (Object.keys(save[bucket]).length == 0) {
      chrome.storage.sync.remove(bucket);
    } else {
      chrome.storage.sync.set(save);
    }
  };

  // Load tag-specific options for the specified tag.
  Options.prototype.loadTag = function (tag) {
    this.resetToGlobal();
    this.tag = tag;
    var tagopts = this.getHashedTagOpts(tag);
    if (tagopts !== undefined) {
      this.digits = (tagopts.f.indexOf('d') != -1);
      this.punctuation = (tagopts.f.indexOf('p') != -1);
      this.mixedcase = (tagopts.f.indexOf('m') != -1);
      this.nospecial = (tagopts.f.indexOf('r') != -1);
      this.digitsonly = (tagopts.f.indexOf('g') != -1);
      // Convert old stored string lengths into numbers.
      if (typeof tagopts.l == 'string') {
        this.length = parseInt(tagopts.l, 10);
      } else {
        this.length = tagopts.l;
      }
    }
    this.updateDOM();
  };

  // Save current options as the tag-specific options for the current tag.
  // If onlyChanged is true, only save the options if they are different to the
  // defaults.
  Options.prototype.saveTagSpecific = function (onlyChanged) {
    if (this.tag.length < 1) {
      // Don't try and save for a blank tag.
      return;
    }

    // Check if any options are different to the defaults.
    if (onlyChanged) {
      var changed = false;
      for (var option in this.globalOptions) {
        if (this[option] != this.globalOptions[option]) {
          changed = true;
          break;
        }
      }
      if (!changed) {
        // We need to delete any saved option for this tag, in case it was
        // previously saved with non-default values.
        this.delHashedTagOpts(this.tag);
        return;
      }
    }

    // This format is relatively compact and happens to be similar to the
    // original Firefox extension, though we store length in a seperate field
    // rather than as part of the string to make parsing easier.
    var flags = '';
    if (this.digits) flags += 'd';
    if (this.punctuation) flags += 'p';
    if (this.mixedcase) flags += 'm';
    if (this.nospecial) flags += 'r';
    if (this.digitsonly) flags += 'g';
    var tagopts = { f: flags, l: this.length };
    this.setHashedTagOpts(this.tag, tagopts);
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
      } else if (typeof that[e.name] == 'number') {
        that[e.name] = parseInt(e.value, 10);
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

  // We fetch all the items in sync storage, so that we don't have to make
  // further asynchronous calls later. The maximum sync storage size is ~100KB
  // so even if it's full this won't be too expensive, and we only keep our
  // state in memory while the popup or options page is open.
  chrome.storage.sync.get(null, function (items) {
    // Pass options to the callback.
    callback(new Options(items));
  });
};
