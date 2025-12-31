var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { Emitter } from '../../../../base/common/event.js';
import { splitGlobAware } from '../../../../base/common/glob.js';
import { Disposable } from '../../../../base/common/lifecycle.js';
import { observableValue } from '../../../../base/common/observable.js';
import { createDecorator } from '../../../../platform/instantiation/common/instantiation.js';
import { IStorageService, } from '../../../../platform/storage/common/storage.js';
import { MutableObservableValue } from './observableValue.js';
import { StoredValue } from './storedValue.js';
import { namespaceTestTag } from './testTypes.js';
export const ITestExplorerFilterState = createDecorator('testingFilterState');
const tagRe = /!?@([^ ,:]+)/g;
const trimExtraWhitespace = (str) => str.replace(/\s\s+/g, ' ').trim();
let TestExplorerFilterState = class TestExplorerFilterState extends Disposable {
    constructor(storageService) {
        super();
        this.storageService = storageService;
        this.focusEmitter = new Emitter();
        /**
         * Mapping of terms to whether they're included in the text.
         */
        this.termFilterState = {};
        /** @inheritdoc */
        this.globList = [];
        /** @inheritdoc */
        this.includeTags = new Set();
        /** @inheritdoc */
        this.excludeTags = new Set();
        /** @inheritdoc */
        this.text = this._register(new MutableObservableValue(''));
        /** @inheritdoc */
        this.fuzzy = this._register(MutableObservableValue.stored(new StoredValue({
            key: 'testHistoryFuzzy',
            scope: 0 /* StorageScope.PROFILE */,
            target: 0 /* StorageTarget.USER */,
        }, this.storageService), false));
        this.reveal = observableValue('TestExplorerFilterState.reveal', undefined);
        this.onDidRequestInputFocus = this.focusEmitter.event;
        this.selectTestInExplorerEmitter = this._register(new Emitter());
        this.onDidSelectTestInExplorer = this.selectTestInExplorerEmitter.event;
    }
    /** @inheritdoc */
    didSelectTestInExplorer(testId) {
        this.selectTestInExplorerEmitter.fire(testId);
    }
    /** @inheritdoc */
    focusInput() {
        this.focusEmitter.fire();
    }
    /** @inheritdoc */
    setText(text) {
        if (text === this.text.value) {
            return;
        }
        this.termFilterState = {};
        this.globList = [];
        this.includeTags.clear();
        this.excludeTags.clear();
        let globText = '';
        let lastIndex = 0;
        for (const match of text.matchAll(tagRe)) {
            let nextIndex = match.index + match[0].length;
            const tag = match[0];
            if (allTestFilterTerms.includes(tag)) {
                this.termFilterState[tag] = true;
            }
            // recognize and parse @ctrlId:tagId or quoted like @ctrlId:"tag \\"id"
            if (text[nextIndex] === ':') {
                nextIndex++;
                let delimiter = text[nextIndex];
                if (delimiter !== `"` && delimiter !== `'`) {
                    delimiter = ' ';
                }
                else {
                    nextIndex++;
                }
                let tagId = '';
                while (nextIndex < text.length && text[nextIndex] !== delimiter) {
                    if (text[nextIndex] === '\\') {
                        tagId += text[nextIndex + 1];
                        nextIndex += 2;
                    }
                    else {
                        tagId += text[nextIndex];
                        nextIndex++;
                    }
                }
                if (match[0].startsWith('!')) {
                    this.excludeTags.add(namespaceTestTag(match[1], tagId));
                }
                else {
                    this.includeTags.add(namespaceTestTag(match[1], tagId));
                }
                nextIndex++;
            }
            globText += text.slice(lastIndex, match.index);
            lastIndex = nextIndex;
        }
        globText += text.slice(lastIndex).trim();
        if (globText.length) {
            for (const filter of splitGlobAware(globText, ',')
                .map((s) => s.trim())
                .filter((s) => !!s.length)) {
                if (filter.startsWith('!')) {
                    this.globList.push({ include: false, text: filter.slice(1).toLowerCase() });
                }
                else {
                    this.globList.push({ include: true, text: filter.toLowerCase() });
                }
            }
        }
        this.text.value = text; // purposely afterwards so everything is updated when the change event happen
    }
    /** @inheritdoc */
    isFilteringFor(term) {
        return !!this.termFilterState[term];
    }
    /** @inheritdoc */
    toggleFilteringFor(term, shouldFilter) {
        const text = this.text.value.trim();
        if (shouldFilter !== false && !this.termFilterState[term]) {
            this.setText(text ? `${text} ${term}` : term);
        }
        else if (shouldFilter !== true && this.termFilterState[term]) {
            this.setText(trimExtraWhitespace(text.replace(term, '')));
        }
    }
};
TestExplorerFilterState = __decorate([
    __param(0, IStorageService)
], TestExplorerFilterState);
export { TestExplorerFilterState };
export var TestFilterTerm;
(function (TestFilterTerm) {
    TestFilterTerm["Failed"] = "@failed";
    TestFilterTerm["Executed"] = "@executed";
    TestFilterTerm["CurrentDoc"] = "@doc";
    TestFilterTerm["OpenedFiles"] = "@openedFiles";
    TestFilterTerm["Hidden"] = "@hidden";
})(TestFilterTerm || (TestFilterTerm = {}));
const allTestFilterTerms = [
    "@failed" /* TestFilterTerm.Failed */,
    "@executed" /* TestFilterTerm.Executed */,
    "@doc" /* TestFilterTerm.CurrentDoc */,
    "@openedFiles" /* TestFilterTerm.OpenedFiles */,
    "@hidden" /* TestFilterTerm.Hidden */,
];
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVzdEV4cGxvcmVyRmlsdGVyU3RhdGUuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi90ZXN0aW5nL2NvbW1vbi90ZXN0RXhwbG9yZXJGaWx0ZXJTdGF0ZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7QUFBQTs7O2dHQUdnRztBQUNoRyxPQUFPLEVBQUUsT0FBTyxFQUFTLE1BQU0sa0NBQWtDLENBQUE7QUFDakUsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLGlDQUFpQyxDQUFBO0FBQ2hFLE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQTtBQUNqRSxPQUFPLEVBQXVCLGVBQWUsRUFBRSxNQUFNLHVDQUF1QyxDQUFBO0FBQzVGLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSw0REFBNEQsQ0FBQTtBQUM1RixPQUFPLEVBQ04sZUFBZSxHQUdmLE1BQU0sZ0RBQWdELENBQUE7QUFDdkQsT0FBTyxFQUFvQixzQkFBc0IsRUFBRSxNQUFNLHNCQUFzQixDQUFBO0FBQy9FLE9BQU8sRUFBRSxXQUFXLEVBQUUsTUFBTSxrQkFBa0IsQ0FBQTtBQUM5QyxPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSxnQkFBZ0IsQ0FBQTtBQStEakQsTUFBTSxDQUFDLE1BQU0sd0JBQXdCLEdBQ3BDLGVBQWUsQ0FBMkIsb0JBQW9CLENBQUMsQ0FBQTtBQUVoRSxNQUFNLEtBQUssR0FBRyxlQUFlLENBQUE7QUFDN0IsTUFBTSxtQkFBbUIsR0FBRyxDQUFDLEdBQVcsRUFBRSxFQUFFLENBQUMsR0FBRyxDQUFDLE9BQU8sQ0FBQyxRQUFRLEVBQUUsR0FBRyxDQUFDLENBQUMsSUFBSSxFQUFFLENBQUE7QUFFdkUsSUFBTSx1QkFBdUIsR0FBN0IsTUFBTSx1QkFBd0IsU0FBUSxVQUFVO0lBNkN0RCxZQUE2QixjQUFnRDtRQUM1RSxL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