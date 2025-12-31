/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { TestInstantiationService } from '../../../platform/instantiation/test/common/instantiationServiceMock.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../base/test/common/utils.js';
import { TreeSitterTextModelService } from '../../../editor/common/services/treeSitter/treeSitterParserService.js';
import { IModelService } from '../../../editor/common/services/model.js';
import { Event } from '../../../base/common/event.js';
import { URI } from '../../../base/common/uri.js';
import { IFileService } from '../../../platform/files/common/files.js';
import { ILogService, NullLogService } from '../../../platform/log/common/log.js';
import { ITelemetryService, } from '../../../platform/telemetry/common/telemetry.js';
import { IConfigurationService } from '../../../platform/configuration/common/configuration.js';
import { TestConfigurationService } from '../../../platform/configuration/test/common/testConfigurationService.js';
import { IEnvironmentService } from '../../../platform/environment/common/environment.js';
import { ModelService } from '../../../editor/common/services/modelService.js';
// eslint-disable-next-line local/code-layering, local/code-import-patterns
import { TreeSitterTokenizationFeature } from '../../services/treeSitter/browser/treeSitterTokenizationFeature.js';
import { ITreeSitterImporter, ITreeSitterParserService, TreeSitterImporter, } from '../../../editor/common/services/treeSitterParserService.js';
import { TreeSitterTokenizationRegistry, } from '../../../editor/common/languages.js';
import { FileService } from '../../../platform/files/common/fileService.js';
import { Schemas } from '../../../base/common/network.js';
import { DiskFileSystemProvider } from '../../../platform/files/node/diskFileSystemProvider.js';
import { ILanguageService } from '../../../editor/common/languages/language.js';
import { LanguageService } from '../../../editor/common/services/languageService.js';
import { TestColorTheme, TestThemeService, } from '../../../platform/theme/test/common/testThemeService.js';
import { IThemeService } from '../../../platform/theme/common/themeService.js';
import { ITextResourcePropertiesService } from '../../../editor/common/services/textResourceConfiguration.js';
import { TestTextResourcePropertiesService } from '../common/workbenchTestServices.js';
import { TestLanguageConfigurationService } from '../../../editor/test/common/modes/testLanguageConfigurationService.js';
import { ILanguageConfigurationService } from '../../../editor/common/languages/languageConfigurationRegistry.js';
import { IUndoRedoService } from '../../../platform/undoRedo/common/undoRedo.js';
import { UndoRedoService } from '../../../platform/undoRedo/common/undoRedoService.js';
import { TestDialogService } from '../../../platform/dialogs/test/common/testDialogService.js';
import { TestNotificationService } from '../../../platform/notification/test/common/testNotificationService.js';
import { DisposableStore } from '../../../base/common/lifecycle.js';
import { TokenStyle, } from '../../../platform/theme/common/tokenClassificationRegistry.js';
import { Color } from '../../../base/common/color.js';
import { ITreeSitterTokenizationStoreService } from '../../../editor/common/model/treeSitterTokenStoreService.js';
import { Range } from '../../../editor/common/core/range.js';
// eslint-disable-next-line local/code-layering, local/code-import-patterns
import { ICodeEditorService } from '../../../editor/browser/services/codeEditorService.js';
// eslint-disable-next-line local/code-layering, local/code-import-patterns
import { TestCodeEditorService } from '../../../editor/test/browser/editorTestServices.js';
class MockTelemetryService {
    constructor() {
        this.telemetryLevel = 0 /* TelemetryLevel.NONE */;
        this.sessionId = '';
        this.machineId = '';
        this.sqmId = '';
        this.devDeviceId = '';
        this.firstSessionDate = '';
        this.sendErrorTelemetry = false;
    }
    publicLog(eventName, data) { }
    publicLog2(eventName, data) { }
    publicLogError(errorEventName, data) { }
    publicLogError2(eventName, data) { }
    setExperimentProperty(name, value) { }
}
class MockTokenStoreService {
    delete(model) {
        throw new Error('Method not implemented.');
    }
    handleContentChanged(model, e) { }
    rangeHasTokens(model, range, minimumTokenQuality) {
        return true;
    }
    rangHasAnyTokens(model) {
        return true;
    }
    getNeedsRefresh(model) {
        return [];
    }
    setTokens(model, tokens) { }
    getTokens(model, line) {
        return undefined;
    }
    updateTokens(model, version, updates) { }
    markForRefresh(model, range) { }
    hasTokens(model, accurateForRange) {
        return true;
    }
}
class TestTreeSitterColorTheme extends TestColorTheme {
    resolveScopes(scopes, definitions) {
        return new TokenStyle(Color.red, undefined, undefined, undefined, undefined);
    }
    getTokenColorIndex() {
        return { get: () => 10 };
    }
}
suite('Tree Sitter TokenizationFeature', function () {
    let instantiationService;
    let modelService;
    let fileService;
    let textResourcePropertiesService;
    let languageConfigurationService;
    let telemetryService;
    let logService;
    let configurationService;
    let themeService;
    let languageService;
    let environmentService;
    let tokenStoreService;
    let treeSitterParserService;
    let treeSitterTokenizationSupport;
    let disposables;
    setup(async () => {
        disposables = new DisposableStore();
        instantiationService = disposables.add(new TestInstantiationService());
        telemetryService = new MockTelemetryService();
        logService = new NullLogService();
        configurationService = new TestConfigurationService({
            'editor.experimental.preferTreeSitter.typescript': true,
        });
        themeService = new TestThemeService(new TestTreeSitterColorTheme());
        environmentService = {};
        tokenStoreService = new MockTokenStoreService();
        instantiationService.set(IEnvironmentService, environmentService);
        instantiationService.set(IConfigurationService, configurationService);
        instantiationService.set(ILogService, logService);
        instantiationService.set(ITelemetryService, telemetryService);
        instantiationService.set(ITreeSitterTokenizationStoreService, tokenStoreService);
        languageService = disposables.add(instantiationService.createInstance(LanguageService));
        instantiationService.set(ILanguageService, languageService);
        instantiationService.set(IThemeService, themeService);
        textResourcePropertiesService = instantiationService.createInstance(TestTextResourcePropertiesService);
        instantiationService.set(ITextResourcePropertiesService, textResourcePropertiesService);
        languageConfigurationService = disposables.add(instantiationService.createInstance(TestLanguageConfigurationService));
        instantiationService.set(ILanguageConfigurationService, languageConfigurationService);
        instantiationService.set(ITreeSitterImporter, instantiationService.createInstance(TreeSitterImporter));
        instantiationService.set(ICodeEditorService, instantiationService.createInstance(TestCodeEditorService));
        fileService = disposables.add(instantiationService.createInstance(FileService));
        const diskFileSystemProvider = disposables.add(new DiskFileSystemProvider(logService));
        disposables.add(fileService.registerProvider(Schemas.file, diskFileSystemProvider));
        instantiationService.set(IFileService, fileService);
        const dialogService = new TestDialogService();
        const notificationService = new TestNotificationService();
        const undoRedoService = new UndoRedoService(dialogService, notificationService);
        instantiationService.set(IUndoRedoService, undoRedoService);
        modelService = new ModelService(configurationService, textResourcePropertiesService, undoRedoService, instantiationService);
        instantiationService.set(IModelService, modelService);
        treeSitterParserService = disposables.add(instantiationService.createInstance(TreeSitterTextModelService));
        treeSitterParserService.isTest = true;
        instantiationService.set(ITreeSitterParserService, treeSitterParserService);
        disposables.add(instantiationService.createInstance(TreeSitterTokenizationFeature));
        treeSitterTokenizationSupport = disposables.add((await TreeSitterTokenizationRegistry.getOrCreate('typescript')));
    });
    teardown(() => {
        disposables.dispose();
    });
    ensureNoDisposablesAreLeakedInTestSuite();
    function tokensContentSize(tokens) {
        return tokens[tokens.length - 1].startOffsetInclusive + tokens[tokens.length - 1].length;
    }
    let nameNumber = 1;
    async function getModelAndPrepTree(content) {
        const model = disposables.add(modelService.createModel(content, { languageId: 'typescript', onDidChange: Event.None }, URI.file(`file${nameNumber++}.ts`)));
        const tree = disposables.add(await treeSitterParserService.getTextModelTreeSitter(model));
        const treeParseResult = new Promise((resolve) => {
            const disposable = treeSitterParserService.onDidUpdateTree((e) => {
                if (e.textModel === model) {
                    disposable.dispose();
                    resolve();
                }
            });
        });
        await tree.parse();
        await treeParseResult;
        assert.ok(tree);
        return model;
    }
    function verifyTokens(tokens) {
        assert.ok(tokens);
        for (let i = 1; i < tokens.length; i++) {
            const previousToken = tokens[i - 1];
            const token = tokens[i];
            assert.deepStrictEqual(previousToken.startOffsetInclusive + previousToken.length, token.startOffsetInclusive);
        }
    }
    test('Three changes come back to back ', async () => {
        const content = `/**
**/
class x {
}




class y {
}`;
        const model = await getModelAndPrepTree(content);
        let updateListener;
        let change;
        const updatePromise = new Promise((resolve) => {
            updateListener = treeSitterParserService.onDidUpdateTree(async (e) => {
                if (e.textModel === model) {
                    change = e;
                    resolve();
                }
            });
        });
        const edit1 = new Promise((resolve) => {
            model.applyEdits([{ range: new Range(7, 1, 8, 1), text: '' }]);
            resolve();
        });
        const edit2 = new Promise((resolve) => {
            model.applyEdits([{ range: new Range(6, 1, 7, 1), text: '' }]);
            resolve();
        });
        const edit3 = new Promise((resolve) => {
            model.applyEdits([{ range: new Range(5, 1, 6, 1), text: '' }]);
            resolve();
        });
        const edits = Promise.all([edit1, edit2, edit3]);
        await updatePromise;
        await edits;
        assert.ok(change);
        assert.strictEqual(change.versionId, 4);
        assert.strictEqual(change.ranges[0].newRangeStartOffset, 0);
        assert.strictEqual(change.ranges[0].newRangeEndOffset, 32);
        assert.strictEqual(change.ranges[0].newRange.startLineNumber, 1);
        assert.strictEqual(change.ranges[0].newRange.endLineNumber, 7);
        updateListener?.dispose();
        modelService.destroyModel(model.uri);
    });
    test('File single line file', async () => {
        const content = `console.log('x');`;
        const model = await getModelAndPrepTree(content);
        const tokens = treeSitterTokenizationSupport.getTokensInRange(model, new Range(1, 1, 1, 18), 0, 17);
        verifyTokens(tokens);
        assert.deepStrictEqual(tokens?.length, 9);
        assert.deepStrictEqual(tokensContentSize(tokens), content.length);
        modelService.destroyModel(model.uri);
    });
    test('File with new lines at beginning and end', async () => {
        const content = `
console.log('x');
`;
        const model = await getModelAndPrepTree(content);
        const tokens = treeSitterTokenizationSupport.getTokensInRange(model, new Range(1, 1, 3, 1), 0, 19);
        verifyTokens(tokens);
        assert.deepStrictEqual(tokens?.length, 11);
        assert.deepStrictEqual(tokensContentSize(tokens), content.length);
        modelService.destroyModel(model.uri);
    });
    test('File with new lines at beginning and end \\r\\n', async () => {
        const content = "\r\nconsole.log('x');\r\n";
        const model = await getModelAndPrepTree(content);
        const tokens = treeSitterTokenizationSupport.getTokensInRange(model, new Range(1, 1, 3, 1), 0, 21);
        verifyTokens(tokens);
        assert.deepStrictEqual(tokens?.length, 11);
        assert.deepStrictEqual(tokensContentSize(tokens), content.length);
        modelService.destroyModel(model.uri);
    });
    test('File with empty lines in the middle', async () => {
        const content = `
console.log('x');

console.log('7');
`;
        const model = await getModelAndPrepTree(content);
        const tokens = treeSitterTokenizationSupport.getTokensInRange(model, new Range(1, 1, 5, 1), 0, 38);
        verifyTokens(tokens);
        assert.deepStrictEqual(tokens?.length, 21);
        assert.deepStrictEqual(tokensContentSize(tokens), content.length);
        modelService.destroyModel(model.uri);
    });
    test('File with empty lines in the middle \\r\\n', async () => {
        const content = "\r\nconsole.log('x');\r\n\r\nconsole.log('7');\r\n";
        const model = await getModelAndPrepTree(content);
        const tokens = treeSitterTokenizationSupport.getTokensInRange(model, new Range(1, 1, 5, 1), 0, 42);
        verifyTokens(tokens);
        assert.deepStrictEqual(tokens?.length, 21);
        assert.deepStrictEqual(tokensContentSize(tokens), content.length);
        modelService.destroyModel(model.uri);
    });
    test('File with non-empty lines that match no scopes', async () => {
        const content = `console.log('x');
;
{
}
`;
        const model = await getModelAndPrepTree(content);
        const tokens = treeSitterTokenizationSupport.getTokensInRange(model, new Range(1, 1, 5, 1), 0, 24);
        verifyTokens(tokens);
        assert.deepStrictEqual(tokens?.length, 16);
        assert.deepStrictEqual(tokensContentSize(tokens), content.length);
        modelService.destroyModel(model.uri);
    });
    test('File with non-empty lines that match no scopes \\r\\n', async () => {
        const content = "console.log('x');\r\n;\r\n{\r\n}\r\n";
        const model = await getModelAndPrepTree(content);
        const tokens = treeSitterTokenizationSupport.getTokensInRange(model, new Range(1, 1, 5, 1), 0, 28);
        verifyTokens(tokens);
        assert.deepStrictEqual(tokens?.length, 16);
        assert.deepStrictEqual(tokensContentSize(tokens), content.length);
        modelService.destroyModel(model.uri);
    });
    test('File with tree-sitter token that spans multiple lines', async () => {
        const content = `/**
**/

console.log('x');

`;
        const model = await getModelAndPrepTree(content);
        const tokens = treeSitterTokenizationSupport.getTokensInRange(model, new Range(1, 1, 6, 1), 0, 28);
        verifyTokens(tokens);
        assert.deepStrictEqual(tokens?.length, 12);
        assert.deepStrictEqual(tokensContentSize(tokens), content.length);
        modelService.destroyModel(model.uri);
    });
    test('File with tree-sitter token that spans multiple lines \\r\\n', async () => {
        const content = "/**\r\n**/\r\n\r\nconsole.log('x');\r\n\r\n";
        const model = await getModelAndPrepTree(content);
        const tokens = treeSitterTokenizationSupport.getTokensInRange(model, new Range(1, 1, 6, 1), 0, 33);
        verifyTokens(tokens);
        assert.deepStrictEqual(tokens?.length, 12);
        assert.deepStrictEqual(tokensContentSize(tokens), content.length);
        modelService.destroyModel(model.uri);
    });
    test('File with tabs', async () => {
        const content = `function x() {
	return true;
}

class Y {
	private z = false;
}`;
        const model = await getModelAndPrepTree(content);
        const tokens = treeSitterTokenizationSupport.getTokensInRange(model, new Range(1, 1, 7, 1), 0, 63);
        verifyTokens(tokens);
        assert.deepStrictEqual(tokens?.length, 30);
        assert.deepStrictEqual(tokensContentSize(tokens), content.length);
        modelService.destroyModel(model.uri);
    });
    test('File with tabs \\r\\n', async () => {
        const content = 'function x() {\r\n\treturn true;\r\n}\r\n\r\nclass Y {\r\n\tprivate z = false;\r\n}';
        const model = await getModelAndPrepTree(content);
        const tokens = treeSitterTokenizationSupport.getTokensInRange(model, new Range(1, 1, 7, 1), 0, 69);
        verifyTokens(tokens);
        assert.deepStrictEqual(tokens?.length, 30);
        assert.deepStrictEqual(tokensContentSize(tokens), content.length);
        modelService.destroyModel(model.uri);
    });
    test('Template string', async () => {
        const content = '`t ${6}`';
        const model = await getModelAndPrepTree(content);
        const tokens = treeSitterTokenizationSupport.getTokensInRange(model, new Range(1, 1, 1, 8), 0, 8);
        verifyTokens(tokens);
        assert.deepStrictEqual(tokens?.length, 6);
        assert.deepStrictEqual(tokensContentSize(tokens), content.length);
        modelService.destroyModel(model.uri);
    });
    test('Many nested scopes', async () => {
        const content = `y = new x(ttt({
	message: '{0} i\\n\\n [commandName]({1}).',
	args: ['Test', \`command:\${openSettingsCommand}?\${encodeURIComponent('["SettingName"]')}\`],
	// To make sure the translators don't break the link
	comment: ["{Locked=']({'}"]
}));`;
        const model = await getModelAndPrepTree(content);
        const tokens = treeSitterTokenizationSupport.getTokensInRange(model, new Range(1, 1, 6, 5), 0, 238);
        verifyTokens(tokens);
        assert.deepStrictEqual(tokens?.length, 65);
        assert.deepStrictEqual(tokensContentSize(tokens), content.length);
        modelService.destroyModel(model.uri);
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidHJlZVNpdHRlclRva2VuaXphdGlvbkZlYXR1cmUudGVzdC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC90ZXN0L2VsZWN0cm9uLW1haW4vdHJlZVNpdHRlclRva2VuaXphdGlvbkZlYXR1cmUudGVzdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLE1BQU0sTUFBTSxRQUFRLENBQUE7QUFDM0IsT0FBTyxFQUFFLHdCQUF3QixFQUFFLE1BQU0seUVBQXlFLENBQUE7QUFDbEgsT0FBTyxFQUFFLHVDQUF1QyxFQUFFLE1BQU0sb0NBQW9DLENBQUE7QUFDNUYsT0FBTyxFQUFFLDBCQUEwQixFQUFFLE1BQU0sdUVBQXVFLENBQUE7QUFDbEgsT0FBTyxFQUFFLGFBQWEsRUFBRSxNQUFNLDBDQUEwQyxDQUFBO0FBQ3hFLE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSwrQkFBK0IsQ0FBQTtBQUNyRCxPQUFPLEVBQUUsR0FBRyxFQUFFLE1BQU0sNkJBQTZCLENBQUE7QUFDakQsT0FBTyxFQUFFLFlBQVksRUFBRSxNQUFNLHlDQUF5QyxDQUFBO0FBQ3RFLE9BQU8sRUFBRSxXQUFXLEVBQUUsY0FBYyxFQUFFLE1BQU0scUNBQXFDLENBQUE7QUFDakYsT0FBTyxFQUVOLGlCQUFpQixHQUVqQixNQUFNLGlEQUFpRCxDQUFBO0FBT3hELE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLHlEQUF5RCxDQUFBO0FBQy9GLE9BQU8sRUFBRSx3QkFBd0IsRUFBRSxNQUFNLHlFQUF5RSxDQUFBO0FBQ2xILE9BQU8sRUFBRSxtQkFBbUIsRUFBRSxNQUFNLHFEQUFxRCxDQUFBO0FBQ3pGLE9BQU8sRUFBRSxZQUFZLEVBQUUsTUFBTSxpREFBaUQsQ0FBQTtBQUM5RSwyRUFBMkU7QUFDM0UsT0FBTyxFQUFFLDZCQUE2QixFQUFFLE1B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