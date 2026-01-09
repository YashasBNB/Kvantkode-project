/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { Event } from '../../../../base/common/event.js';
export class TestTreeSitterParserService {
    constructor() {
        this.onDidUpdateTree = Event.None;
        this.onDidAddLanguage = Event.None;
    }
    getLanguage(languageId) {
        throw new Error('Method not implemented.');
    }
    getTreeSync(content, languageId) {
        throw new Error('Method not implemented.');
    }
    async getTextModelTreeSitter(model, parseImmediately) {
        throw new Error('Method not implemented.');
    }
    getTree(content, languageId) {
        throw new Error('Method not implemented.');
    }
    getOrInitLanguage(languageId) {
        throw new Error('Method not implemented.');
    }
    waitForLanguage(languageId) {
        throw new Error('Method not implemented.');
    }
    getParseResult(textModel) {
        throw new Error('Method not implemented.');
    }
}
