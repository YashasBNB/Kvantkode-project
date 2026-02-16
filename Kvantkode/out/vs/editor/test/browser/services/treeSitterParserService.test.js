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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidHJlZVNpdHRlclBhcnNlclNlcnZpY2UudGVzdC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS9LdmFudGtvZGUtcHJvamVjdC9LdmFudGtvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvZWRpdG9yL3Rlc3QvYnJvd3Nlci9zZXJ2aWNlcy90cmVlU2l0dGVyUGFyc2VyU2VydmljZS50ZXN0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBQ2hHLE9BQU8sTUFBTSxNQUFNLFFBQVEsQ0FBQTtBQUMzQixPQUFPLEVBQUUsdUNBQXVDLEVBQUUsTUFBTSx1Q0FBdUMsQ0FBQTtBQUUvRixPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sK0JBQStCLENBQUE7QUFDL0QsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLGtDQUFrQyxDQUFBO0FBQzFELE9BQU8sRUFBRSxpQkFBaUIsRUFBZSxNQUFNLHdDQUF3QyxDQUFBO0FBRXZGLE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSwrQ0FBK0MsQ0FBQTtBQUMxRSxPQUFPLEVBQUUsSUFBSSxFQUFFLE1BQU0sc0NBQXNDLENBQUE7QUFFM0QsT0FBTyxFQUFFLG1CQUFtQixFQUFFLE1BQU0sNERBQTRELENBQUE7QUFDaEcsT0FBTyxFQUFFLG1CQUFtQixFQUFFLE1BQU0sNERBQTRELENBQUE7QUFFaEcsTUFBTSxVQUFVO0lBQWhCO1FBQ0MsYUFBUSxHQUEyQixJQUFJLENBQUE7SUEwQnhDLENBQUM7SUF6QkEsTUFBTSxLQUFVLENBQUM7SUFDakIsV0FBVyxDQUFDLFFBQWdDO1FBQzNDLE9BQU8sSUFBSSxDQUFBO0lBQ1osQ0FBQztJQUNELEtBQUssQ0FDSixRQUF1QyxFQUN2QyxPQUE0QixFQUM1QixPQUE2QjtRQUU3QixPQUFPLElBQUksUUFBUSxFQUFFLENBQUE7SUFDdEIsQ0FBQztJQUNELEtBQUssS0FBVSxDQUFDO0lBQ2hCLGlCQUFpQjtRQUNoQixPQUFP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