// Copyright (c) 2017 Didi Labs. All rights reserved.


const nativeHost = "com.didi.lca.browserext";
const messageType = {
    'event': 0,
    'update': 1,
    'version': 2
};
var port = null;
var activeDownloads = {};
var activeRequests = {};
var activeRuleSet = {
    'version': 0,
    'rules': {}
};
var tmpRuleSet = {
    'version': 0,
    'rules': {}
};





/**
 * Prints debugging information about the extension.
 */
function debug() {
    chrome.management.getSelf(function(info) {
        console.log("ID: " + info.id);
        console.log("Extension version: " + info.version);
        console.log("Rule Set version: " + activeRuleSet.version);
        console.log("Extension enabled: " + info.enabled);
        console.log("Disabled reason: " + info.disabledReason);
        console.log("Can disable: " + info.mayDisable);
        console.log("Update URL: " + info.updateUrl);
        console.log("Permissions: " + Array.prototype.join.call(info.permissions, ", "));
        console.log("Install type: " + info.installType);
        console.log("Browser locale: " + chrome.i18n.getUILanguage());
        if (chrome.runtime.lastError) {
            console.log("Last error: " + chrome.runtime.lastError.message);
        } else {
            console.log("Last error: N/A");
        }
        chrome.extension.isAllowedIncognitoAccess(function(isAllowedAccess) {
            console.log("Allowed in incognito: " + isAllowedAccess);
        });
    });
};

/**
 * Rules are stored in a (logically) 3-level tree structure:
 * - tmpRuleSet.rules is the root (activeRuleSet is never directly edited)
 * - URL schemes (HTTP, FTP, etc) are the first level branches
 * - hostnames are the second level branches
 * - the 3rd level arrays of leaves
 * - each leaf is an object containing a compiled RegExp and some metadata
 *
 * Multiple leaves can have the same content. A single rule can result in
 * multiple leaves.
 *
 * @param rawRule is a object repesenting a detection rule
 */
function addRule(rawRule) {
    // basic safety checks for mandatory fields
    if (typeof rawRule.id != "number") {
        console.error("Invalid rule, missing rule ID: " + JSON.stringify(rawRule));
        return false;
    }
    if (typeof rawRule != "object" || typeof rawRule.rule != "object" || typeof rawRule.version != "number" || typeof rawRule.type != "string" || typeof rawRule.alert != "boolean" || typeof rawRule.block != "boolean") {
        console.error("Rule ID " + rawRule.id + " is invalid and/or malformed");
        return false;
    }
    if (rawRule.rule.scheme != undefined && !Array.isArray(rawRule.rule.scheme)) {
        console.error("Rule ID " + rawRule.id + " has invalid scheme");
        return false;
    }
    if (rawRule.rule.hostname != undefined && !Array.isArray(rawRule.rule.hostname)) {
        console.error("Rule ID " + rawRule.id + " has invalid hostname");
        return false;
    }

    var schemes = rawRule.rule.scheme;
    var hosts = rawRule.rule.hostname;
    var pattern = rawRule.rule.pattern;

    // rules need to specify a hostname and/or a pattern, otherwise it ends up as open wildcard
    if (hosts == undefined && pattern == undefined) {
        console.error("Rule ID " + rawRule.id + " is invalid. Rules must have a hostname and/or pattern");
        return false;
    }

    // replace omitted rule values with wildcards
    if (schemes == undefined) {
        schemes = ['_ALL_SCHEMES_'];
    }
    if (hosts == undefined) {
        hosts = ['_ALL_HOSTS_'];
    }
    if (pattern == undefined) {
        pattern = '[\s\S]*';
    }

    // try to create RegExp from pattern
    var regex = new RegExp(pattern, 'i');
    if (typeof regex != "object") {
        console.error("Rule ID " + rawRule.id + " has invalid RegExp pattern");
        return false;
    }

    // create the leaf object
    var leaf = {
        'id': rawRule.id,
        'version': rawRule.version,
        'type': rawRule.type,
        'alert': rawRule.alert,
        'block': rawRule.block,
        'regex': regex
    };

    // create any missing schemes and hosts, attach leaves
    for (var i = 0; i < schemes.length; i++) {
        var sc = schemes[i];
        if (tmpRuleSet.rules[sc] == undefined) {
            tmpRuleSet.rules[sc] = {};
        }
        for (var j = 0; j < hosts.length; j++) {
            var ho = hosts[i];
            if (tmpRuleSet.rules[sc][ho] == undefined) {
                tmpRuleSet.rules[sc][ho] = [];
            }
            tmpRuleSet.rules[sc][ho].push(leaf);
        }
    }

    return true;
};

/**
 * onMessageCallback handles incoming messages fron native Client based on the
 * msg param's type.
 *
 * @param msg is an object from the Native Client with a 'type' and 'data'
 */
function onMessageCallback(msg) {
    switch(msg.type) {
        case messageType.update:
            // update the tmpRuleSet with a new rule
            addRule(msg.data)
            break;
        case messageType.version:
            // sets the version number of the tempRuleSet and makes it the new activeRuleSet
            if (typeof msg.data == "number") {
                console.log("Updated rule set from version " + activeRuleSet.version + " to version " + msg.data);
                tmpRuleSet.version = msg.data;
                activeRuleSet = tmpRuleSet;
                tmpRuleSet = {
                    'version': 0,
                    'rules': {}
                };
            }
            break;
        default:
            console.error("Received message with unknown message type");
    }
};

/**
 * requestUpdate sends a message to ask for a rule set update.
 */
function requestUpdate() {
    var message = {
        'version': activeRuleSet.version
    }
    port.postMessage([messageType.update, message]);
};

/**
 * onAlarmCallback handles alarms based on alarm name.
 *
 * @param alarm is an object with a 'name'
 */
function onAlarmCallback(alarm) {
    if (alarm.name == "update") {
        requestUpdate();
    }
};

/**
 * onBeforeRequestCallback performs synchronous blocking based on patterns from
 * the active rule set.
 */
function onBeforeRequestCallback(requestInfo) {
    // get URL
    var url = new URI(requestInfo.url);

    // normalize URL
    url.normalize();
    var urlString = url.toString();

    // check scheme
    var scheme = activeRuleSet.rules[url.scheme()];
    if (scheme == undefined) {
        scheme = activeRuleSet.rules['_ALL_SCHEMES_'];
    }
    // no matching scheme or wildcards
    if (scheme == undefined) {
        return {'cancel': false};
    }

    // check domain name, if entire domain is blocked
    var rules = scheme[url.domain()];
    // try entire hostname
    if (rules == undefined) {
        rules = scheme[url.hostname()];
    }
    // try wildcard
    if (rules == undefined) {
        rules = scheme['_ALL_HOSTS_'];
    }
    // no matching hosts or wildcards
    if (rules == undefined) {
        return {'cancel': false};
    }

    // find matching pattern
    var rule = undefined;
    for (var i = 0; i < rules.length; i++) {
        if (rules[i].regex.test(urlString)) {
            rule = rules[i];
            console.log("Rule ID " + rules[i].id + "(v" + rules[i].version + ") matched " + urlString);
            break;
        }
    }

    // exit if no rule matched
    if (rule == undefined) {
        return {'cancel': false};
    }

    // always show alert when blocking main_frames
    if (requestInfo.type == "main_frame" && rule.block && !rule.alert) {
        rule.alert == true;
    }

    // rule matched, determine appropriate action
    if (rule.alert && rule.block) {
        // block and alert the user
        port.postMessage([messageType.event, {
            'category': 'url',
            'type': "block",
            'url': requestInfo.url,
            'method': requestInfo.method,
            'urltype': requestInfo.type,
            'ruleid': rule.id,
            'ruleversion': rule.version
        }]);
        var redirectPage = chrome.extension.getURL('block.html');
        chrome.tabs.update(requestInfo.tabId, {'url':redirectPage});
        return {'cancel': true};
    } else if (rule.block) {
        // block without alerting user
        port.postMessage([messageType.event, {
            'category': 'url',
            'type': "block",
            'url': requestInfo.url,
            'method': requestInfo.method,
            'urltype': requestInfo.type,
            'ruleid': rule.id,
            'ruleversion': rule.version
        }]);
        return {'cancel': true};
    } else if (rule.alert) {
        // alert the user, don't block
        port.postMessage([messageType.event, {
            'category': 'url',
            'type': "alert",
            'url': requestInfo.url,
            'method': requestInfo.method,
            'urltype': requestInfo.type,
            'ruleid': rule.id,
            'ruleversion': rule.version
        }]);
        return {'cancel': false};
    } else {
        // don't alert or block
        // we shouldn't have rules like this...
        console.warn("Rule ID " + rule.id + "(v" + rule.version + ") didn't specify an action to perform");
        return {'cancel': false};
    }
};

/**
 * onBeforeRedirectCallback tracks request redirects in the activeRedirects
 * object.
 */
function onBeforeRedirectCallback(requestInfo) {
    // ignore requests that are cached or not associated with a tab
    if (requestInfo.tabId < 0 || requestInfo.fromCache == true) {
        return;
    }
    // record redirect in activeRequests
    if (activeRequests[requestInfo.requestId] == undefined) {
        activeRequests[requestInfo.requestId] = {
            'originalurl': requestInfo.url,
            'redirects': []
        };
    }
    activeRequests[requestInfo.requestId].redirects.push(requestInfo.redirectUrl);
};

/**
 * onRequestCallback creates events when a request completes or causes an
 * error and sends them to the agent.
 */
function onRequestCallback(requestInfo) {
    // ignore requests that are cached or not associated with a tab
    if (requestInfo.tabId < 0 || requestInfo.fromCache == true) {
        return;
    }
    // gather request info into event
    var message = {
        'category': 'url',
        'type': "request",
        'url': requestInfo.url,
        'method': requestInfo.method,
        'urltype': requestInfo.type
    };
    if (requestInfo.statusLine != undefined) {
        message.status = requestInfo.statusLine;
    }
    if (requestInfo.ip != undefined) {
        message.ip = requestInfo.ip;
    }
    if (requestInfo.error != undefined) {
        message.error = requestInfo.error;
    }
    if (activeRequests[requestInfo.requestId] != undefined) {
        message.originalurl = activeRequests[requestInfo.requestId].originalurl;
        activeRequests[requestInfo.requestId].redirects.pop();
        if (activeRequests[requestInfo.requestId].redirects.length > 0) {
            message.redirects = activeRequests[requestInfo.requestId].redirects.join(" ");
        }
        delete activeRequests[requestInfo.requestId];
    }
    // send event to native messaging client
    port.postMessage([messageType.event, message]);
};

/**
 * onDownloadCallback creates events when downloads complete and sends them to
 * the agent.
 */
function onDownloadCallback(downloadDelta) {
    // look for fresh download completions and interruptions, skip rest
    if (downloadDelta.state == undefined || downloadDelta.state.current == "in_progress" || downloadDelta.state.previous != "in_progress")
    {
        return;
    }
    // detect redirect
    if (downloadDelta.url)
    {
        // record redirect in activeDownloads
        if (activeDownloads[downloadDelta.id] == undefined) {
            activeDownloads[downloadDelta.id] = {
                'originalurl': downloadDelta.url.previous,
                'redirects': []
            };
        }
        activeDownloads[downloadDelta.id].redirects.push(downloadDelta.url.current);
        return;
    }
    // detect completion or interruption
    if (downloadDelta.state && downloadDelta.state.current != "in_progress" && downloadDelta.state.previous == "in_progress")
    {
        chrome.downloads.search({'id':downloadDelta.id}, function(downloadItems) {
            // gather download info into event
            var message = {
                'category': 'url',
                'type': "download",
                'url': downloadItems[0].finalUrl,
                'referrer': downloadItems[0].referrer,
                'path': downloadItems[0].filename,
                'mime': downloadItems[0].mime
            };
            if (downloadItems[0].error != undefined) {
                message.error = downloadItems[0].error;
            }
            if (activeDownloads[downloadItems[0].id] != undefined) {
                message.originalurl = activeDownloads[downloadItems[0].id].originalurl;
                activeDownloads[downloadItems[0].id].redirects.pop();
                if (activeDownloads[downloadItems[0].id].redirects.length > 0) {
                    // flatten string-array into space delimited string
                    message.redirects = activeDownloads[downloadItems[0].id].redirects.join(" ");
                }
                delete activeDownloads[downloadItems[0].id];
            }
            // send event to native messaging client
            port.postMessage([messageType.event, message]);
        });
    }
};

/**
 * onDisconnectCallback removes listeners and shuts down if Native Messaging
 * Client becomes disconnected. We cannot communicate with the agent without
 * it, so nothing else we can do.
 */
function onDisconnectCallback() {
    console.error(nativeHost + " disconnected");
    delete port;
    delete activeDownloads;
    delete activeRequests;
    delete activeRuleSet;
    delete tmpRuleSet;

    // Remove Listeners
    chrome.alarms.onAlarm.removeListener(onAlarmCallback);
    chrome.downloads.onChanged.removeListener(onDownloadCallback);
    chrome.webRequest.onBeforeRequest.removeListener(onBeforeRequestCallback);
    chrome.webRequest.onBeforeRedirect.removeListener(onBeforeRedirectCallback);
    chrome.webRequest.onCompleted.removeListener(onRequestCallback);
    chrome.webRequest.onErrorOccurred.removeListener(onRequestCallback);
};





// Connect to native host (causes process to start)
port = chrome.runtime.connectNative(nativeHost);

// Do nothing if the native host can't be reached
if (port != null) {
    // request initial update
    requestUpdate();

    // create update alarm, request update every 5 minutes
    chrome.alarms.create("update", {'delayInMinutes':5.0, 'periodInMinutes':5.0});

    // add alarm listeners
    chrome.alarms.onAlarm.addListener(onAlarmCallback);

    // Add port event listeners
    port.onMessage.addListener(onMessageCallback);
    port.onDisconnect.addListener(onDisconnectCallback);

    // Add webRequest event listeners
    chrome.downloads.onChanged.addListener(onDownloadCallback);
    chrome.webRequest.onBeforeRequest.addListener(onBeforeRequestCallback, {'urls':["<all_urls>"], 'types':["main_frame","sub_frame"]}, ["blocking"]);
    chrome.webRequest.onBeforeRedirect.addListener(onBeforeRedirectCallback, {'urls':["<all_urls>"]});
    chrome.webRequest.onCompleted.addListener(onRequestCallback, {'urls':["<all_urls>"]});
    chrome.webRequest.onErrorOccurred.addListener(onRequestCallback, {'urls':["<all_urls>"]});
}
