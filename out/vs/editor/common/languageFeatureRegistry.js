/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { Emitter } from '../../base/common/event.js';
import { toDisposable } from '../../base/common/lifecycle.js';
import { shouldSynchronizeModel } from './model.js';
import { score } from './languageSelector.js';
function isExclusive(selector) {
    if (typeof selector === 'string') {
        return false;
    }
    else if (Array.isArray(selector)) {
        return selector.every(isExclusive);
    }
    else {
        return !!selector.exclusive; // TODO: microsoft/TypeScript#42768
    }
}
class MatchCandidate {
    constructor(uri, languageId, notebookUri, notebookType, recursive) {
        this.uri = uri;
        this.languageId = languageId;
        this.notebookUri = notebookUri;
        this.notebookType = notebookType;
        this.recursive = recursive;
    }
    equals(other) {
        return (this.notebookType === other.notebookType &&
            this.languageId === other.languageId &&
            this.uri.toString() === other.uri.toString() &&
            this.notebookUri?.toString() === other.notebookUri?.toString() &&
            this.recursive === other.recursive);
    }
}
export class LanguageFeatureRegistry {
    constructor(_notebookInfoResolver) {
        this._notebookInfoResolver = _notebookInfoResolver;
        this._clock = 0;
        this._entries = [];
        this._onDidChange = new Emitter();
        this.onDidChange = this._onDidChange.event;
    }
    register(selector, provider) {
        let entry = {
            selector,
            provider,
            _score: -1,
            _time: this._clock++,
        };
        this._entries.push(entry);
        this._lastCandidate = undefined;
        this._onDidChange.fire(this._entries.length);
        return toDisposable(() => {
            if (entry) {
                const idx = this._entries.indexOf(entry);
                if (idx >= 0) {
                    this._entries.splice(idx, 1);
                    this._lastCandidate = undefined;
                    this._onDidChange.fire(this._entries.length);
                    entry = undefined;
                }
            }
        });
    }
    has(model) {
        return this.all(model).length > 0;
    }
    all(model) {
        if (!model) {
            return [];
        }
        this._updateScores(model, false);
        const result = [];
        // from registry
        for (const entry of this._entries) {
            if (entry._score > 0) {
                result.push(entry.provider);
            }
        }
        return result;
    }
    allNoModel() {
        return this._entries.map((entry) => entry.provider);
    }
    ordered(model, recursive = false) {
        const result = [];
        this._orderedForEach(model, recursive, (entry) => result.push(entry.provider));
        return result;
    }
    orderedGroups(model) {
        const result = [];
        let lastBucket;
        let lastBucketScore;
        this._orderedForEach(model, false, (entry) => {
            if (lastBucket && lastBucketScore === entry._score) {
                lastBucket.push(entry.provider);
            }
            else {
                lastBucketScore = entry._score;
                lastBucket = [entry.provider];
                result.push(lastBucket);
            }
        });
        return result;
    }
    _orderedForEach(model, recursive, callback) {
        this._updateScores(model, recursive);
        for (const entry of this._entries) {
            if (entry._score > 0) {
                callback(entry);
            }
        }
    }
    _updateScores(model, recursive) {
        const notebookInfo = this._notebookInfoResolver?.(model.uri);
        // use the uri (scheme, pattern) of the notebook info iff we have one
        // otherwise it's the model's/document's uri
        const candidate = notebookInfo
            ? new MatchCandidate(model.uri, model.getLanguageId(), notebookInfo.uri, notebookInfo.type, recursive)
            : new MatchCandidate(model.uri, model.getLanguageId(), undefined, undefined, recursive);
        if (this._lastCandidate?.equals(candidate)) {
            // nothing has changed
            return;
        }
        this._lastCandidate = candidate;
        for (const entry of this._entries) {
            entry._score = score(entry.selector, candidate.uri, candidate.languageId, shouldSynchronizeModel(model), candidate.notebookUri, candidate.notebookType);
            if (isExclusive(entry.selector) && entry._score > 0) {
                if (recursive) {
                    entry._score = 0;
                }
                else {
                    // support for one exclusive selector that overwrites
                    // any other selector
                    for (const entry of this._entries) {
                        entry._score = 0;
                    }
                    entry._score = 1000;
                    break;
                }
            }
        }
        // needs sorting
        this._entries.sort(LanguageFeatureRegistry._compareByScoreAndTime);
    }
    static _compareByScoreAndTime(a, b) {
        if (a._score < b._score) {
            return 1;
        }
        else if (a._score > b._score) {
            return -1;
        }
        // De-prioritize built-in providers
        if (isBuiltinSelector(a.selector) && !isBuiltinSelector(b.selector)) {
            return 1;
        }
        else if (!isBuiltinSelector(a.selector) && isBuiltinSelector(b.selector)) {
            return -1;
        }
        if (a._time < b._time) {
            return 1;
        }
        else if (a._time > b._time) {
            return -1;
        }
        else {
            return 0;
        }
    }
}
function isBuiltinSelector(selector) {
    if (typeof selector === 'string') {
        return false;
    }
    if (Array.isArray(selector)) {
        return selector.some(isBuiltinSelector);
    }
    return Boolean(selector.isBuiltin);
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibGFuZ3VhZ2VGZWF0dXJlUmVnaXN0cnkuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy9lZGl0b3IvY29tbW9uL2xhbmd1YWdlRmVhdHVyZVJlZ2lzdHJ5LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSw0QkFBNEIsQ0FBQTtBQUNwRCxPQUFPLEVBQWUsWUFBWSxFQUFFLE1BQU0sZ0NBQWdDLENBQUE7QUFDMUUsT0FBTyxFQUFjLHNCQUFzQixFQUFFLE1BQU0sWUFBWSxDQUFBO0FBQy9ELE9BQU8sRUFBb0MsS0FBSyxFQUFFLE1BQU0sdUJBQXVCLENBQUE7QUFVL0UsU0FBUyxXQUFXLENBQUMsUUFBMEI7SUFDOUMsSUFBSSxPQUFPLFFBQVEsS0FBSyxRQUFRLEVBQUUsQ0FBQztRQUNsQyxPQUFPLEtBQUssQ0FBQTtJQUNiLENBQUM7U0FBTSxJQUFJLEtBQUssQ0FBQyxPQUFPLENBQUMsUUFBUSxDQUFDLEVBQUUsQ0FBQztRQUNwQyxPQUFPLFFBQVEsQ0FBQyxLQUFLLENBQUMsV0FBVyxDQUFDLENBQUE7SUFDbkMsQ0FBQztTQUFNLENBQUM7UUFDUCxPQUFPLENBQUMsQ0FBRSxRQUEyQixDQUFDLFNBQVMsQ0FBQSxDQUFDLG1DQUFtQztJQUNwRixDQUFDO0FBQ0YsQ0FBQztBQVdELE1BQU0sY0FBYztJQUNuQixZQUNVLEdBQVEsRUFDUixVQUFrQixFQUNsQixXQUE0QixFQUM1QixZQUFnQyxFQUNoQyxTQUFrQjtRQUpsQixRQUFHLEdBQUgsR0FBRyxDQUFLO1FBQ1IsZUFBVSxHQUFWLFVBQVUsQ0FBUTtRQUNsQixnQkFBVyxHQUFYLFdBQVcsQ0FBaUI7UUFDNUIsaUJBQVksR0FBWixZQUFZLENBQW9CO1FBQ2hDLGNBQVMsR0FBVCxTQUFTLENBQVM7SUFDekIsQ0FBQztJQUVKLE1BQU0s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