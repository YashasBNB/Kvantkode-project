/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../base/test/common/utils.js';
import { createTextModel } from '../../common/testTextModel.js';
import { timeout } from '../../../../base/common/async.js';
import { ConsoleMainLogger } from '../../../../platform/log/common/log.js';
import { LogService } from '../../../../platform/log/common/logService.js';
import { mock } from '../../../../base/test/common/mock.js';
import { TextModelTreeSitter } from '../../../common/services/treeSitter/textModelTreeSitter.js';
import { TreeSitterLanguages } from '../../../common/services/treeSitter/treeSitterLanguages.js';
class MockParser {
    constructor() {
        this.language = null;
    }
    delete() { }
    setLanguage(language) {
        return this;
    }
    parse(callback, oldTree, options) {
        return new MockTree();
    }
    reset() { }
    getIncludedRanges() {
        return [];
    }
    getTimeoutMicros() {
        return 0;
    }
    setTimeoutMicros(timeout) { }
    setLogger(callback) {
        throw new Error('Method not implemented.');
    }
    getLogger() {
        throw new Error('Method not implemented.');
    }
}
class MockTreeSitterImporter {
    constructor() {
        this.parserClass = MockParser;
    }
    async getParserClass() {
        return MockParser;
    }
    async getLanguageClass() {
        return MockLanguage;
    }
    async getQueryClass() {
        throw new Error('Method not implemented.');
    }
}
class MockTree {
    constructor() {
        this.language = new MockLanguage();
        this.editorLanguage = '';
        this.editorContents = '';
        this.rootNode = {};
    }
    rootNodeWithOffset(offsetBytes, offsetExtent) {
        throw new Error('Method not implemented.');
    }
    copy() {
        throw new Error('Method not implemented.');
    }
    delete() { }
    edit(edit) {
        return this;
    }
    walk() {
        throw new Error('Method not implemented.');
    }
    getChangedRanges(other) {
        throw new Error('Method not implemented.');
    }
    getIncludedRanges() {
        throw new Error('Method not implemented.');
    }
    getEditedRange(other) {
        throw new Error('Method not implemented.');
    }
    getLanguage() {
        throw new Error('Method not implemented.');
    }
}
class MockLanguage {
    constructor() {
        this.types = [];
        this.fields = [];
        this.version = 0;
        this.fieldCount = 0;
        this.stateCount = 0;
        this.nodeTypeCount = 0;
        this.languageId = '';
    }
    get name() {
        throw new Error('Method not implemented.');
    }
    get abiVersion() {
        throw new Error('Method not implemented.');
    }
    get metadata() {
        throw new Error('Method not implemented.');
    }
    get supertypes() {
        throw new Error('Method not implemented.');
    }
    subtypes(supertype) {
        throw new Error('Method not implemented.');
    }
    fieldNameForId(fieldId) {
        throw new Error('Method not implemented.');
    }
    fieldIdForName(fieldName) {
        throw new Error('Method not implemented.');
    }
    idForNodeType(type, named) {
        throw new Error('Method not implemented.');
    }
    nodeTypeForId(typeId) {
        throw new Error('Method not implemented.');
    }
    nodeTypeIsNamed(typeId) {
        throw new Error('Method not implemented.');
    }
    nodeTypeIsVisible(typeId) {
        throw new Error('Method not implemented.');
    }
    nextState(stateId, typeId) {
        throw new Error('Method not implemented.');
    }
    query(source) {
        throw new Error('Method not implemented.');
    }
    lookaheadIterator(stateId) {
        throw new Error('Method not implemented.');
    }
}
suite('TreeSitterParserService', function () {
    const treeSitterImporter = new MockTreeSitterImporter();
    let logService;
    let telemetryService;
    setup(function () {
        logService = new LogService(new ConsoleMainLogger());
        telemetryService = new (class extends mock() {
            async publicLog2() {
                //
            }
        })();
    });
    const store = ensureNoDisposablesAreLeakedInTestSuite();
    test('TextModelTreeSitter race condition: first language is slow to load', async function () {
        class MockTreeSitterLanguages extends TreeSitterLanguages {
            async _fetchJavascript() {
                await timeout(200);
                const language = new MockLanguage();
                language.languageId = 'javascript';
                this._onDidAddLanguage.fire({ id: 'javascript', language });
            }
            getOrInitLanguage(languageId) {
                if (languageId === 'javascript') {
                    this._fetchJavascript();
                    return undefined;
                }
                const language = new MockLanguage();
                language.languageId = languageId;
                return language;
            }
        }
        const treeSitterLanguages = store.add(new MockTreeSitterLanguages(treeSitterImporter, {}, { isBuilt: false }, new Map()));
        const textModel = store.add(createTextModel('console.log("Hello, world!");', 'javascript'));
        const textModelTreeSitter = store.add(new TextModelTreeSitter(textModel, treeSitterLanguages, false, treeSitterImporter, logService, telemetryService, { exists: async () => false }));
        textModel.setLanguage('typescript');
        await timeout(300);
        assert.strictEqual((textModelTreeSitter.parseResult?.language).languageId, 'typescript');
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidHJlZVNpdHRlclBhcnNlclNlcnZpY2UudGVzdC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL2VkaXRvci90ZXN0L2Jyb3dzZXIvc2VydmljZXMvdHJlZVNpdHRlclBhcnNlclNlcnZpY2UudGVzdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUNoRyxPQUFPLE1BQU0sTUFBTSxRQUFRLENBQUE7QUFDM0IsT0FBTyxFQUFFLHVDQUF1QyxFQUFFLE1BQU0sdUNBQXVDLENBQUE7QUFFL0YsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLCtCQUErQixDQUFBO0FBQy9ELE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQTtBQUMxRCxPQUFPLEVBQUUsaUJBQWlCLEVBQWUsTUFBTSx3Q0FBd0MsQ0FBQTtBQUV2RixPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0sK0NBQStDLENBQUE7QUFDMUUsT0FBTyxFQUFFLElBQUksRUFBRSxNQUFNLHNDQUFzQyxDQUFBO0FBRTNELE9BQU8sRUFBRSxtQkFBbUIsRUFBRSxNQUFNLDREQUE0RCxDQUFBO0FBQ2hHLE9BQU8sRUFBRSxtQkFBbUIsRUFBRSxNQUFNLDREQUE0RCxDQUFBO0FBRWhHLE1BQU0sVUFBVTtJQUFoQjtRQUNDLGFBQVEsR0FBMkIsSUFBSSxDQUFBO0lBMEJ4QyxDQUFDO0lBekJBLE1BQU0sS0FBVSxDQUFDO0lBQ2pCLFdBQVcsQ0FBQyxRQUFnQztRQUMzQyxPQUFPLElBQUksQ0FBQTtJQUNaLENBQUM7SUFDRCxLQUFLLENBQ0osUUFBdUMsRUFDdkMsT0FBNEIsRUFDNUIsT0FBNkI7UUFFN0IsT0FBTyxJQUFJLFFBQVEsRUFBRSxDQUFBO0lBQ3RCLENBQUM7SUFDRCxLQUFLLEtBQVUsQ0FBQztJQUNoQixpQkFBaUI7UUFDaEIsT0FBTyxFQUFFLENBQUE7SUFDVixDQUFDO0lB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