/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import '../../../../editor/contrib/codeAction/browser/codeAction.js';
import '../../../../editor/contrib/codelens/browser/codelens.js';
import '../../../../editor/contrib/colorPicker/browser/colorPickerContribution.js';
import '../../../../editor/contrib/format/browser/format.js';
import '../../../../editor/contrib/gotoSymbol/browser/goToCommands.js';
import '../../../../editor/contrib/documentSymbols/browser/documentSymbols.js';
import '../../../../editor/contrib/hover/browser/getHover.js';
import '../../../../editor/contrib/links/browser/getLinks.js';
import '../../../../editor/contrib/parameterHints/browser/provideSignatureHelp.js';
import '../../../../editor/contrib/smartSelect/browser/smartSelect.js';
import '../../../../editor/contrib/suggest/browser/suggest.js';
import '../../../../editor/contrib/rename/browser/rename.js';
import '../../../../editor/contrib/inlayHints/browser/inlayHintsController.js';
import assert from 'assert';
import { setUnexpectedErrorHandler, errorHandler } from '../../../../base/common/errors.js';
import { URI } from '../../../../base/common/uri.js';
import { Event } from '../../../../base/common/event.js';
import * as types from '../../common/extHostTypes.js';
import { createTextModel } from '../../../../editor/test/common/testTextModel.js';
import { TestRPCProtocol } from '../common/testRPCProtocol.js';
import { MarkerService } from '../../../../platform/markers/common/markerService.js';
import { IMarkerService } from '../../../../platform/markers/common/markers.js';
import { ICommandService, CommandsRegistry } from '../../../../platform/commands/common/commands.js';
import { IModelService } from '../../../../editor/common/services/model.js';
import { ExtHostLanguageFeatures } from '../../common/extHostLanguageFeatures.js';
import { MainThreadLanguageFeatures } from '../../browser/mainThreadLanguageFeatures.js';
import { ExtHostApiCommands } from '../../common/extHostApiCommands.js';
import { ExtHostCommands } from '../../common/extHostCommands.js';
import { MainThreadCommands } from '../../browser/mainThreadCommands.js';
import { ExtHostDocuments } from '../../common/extHostDocuments.js';
import { ExtHostDocumentsAndEditors } from '../../common/extHostDocumentsAndEditors.js';
import { MainContext, ExtHostContext } from '../../common/extHost.protocol.js';
import { ExtHostDiagnostics } from '../../common/extHostDiagnostics.js';
import '../../../contrib/search/browser/search.contribution.js';
import { ILogService, NullLogService } from '../../../../platform/log/common/log.js';
import { nullExtensionDescription, IExtensionService, } from '../../../services/extensions/common/extensions.js';
import { dispose, ImmortalReference } from '../../../../base/common/lifecycle.js';
import { IEditorWorkerService } from '../../../../editor/common/services/editorWorker.js';
import { mock } from '../../../../base/test/common/mock.js';
import { NullApiDeprecationService } from '../../common/extHostApiDeprecationService.js';
import { ServiceCollection } from '../../../../platform/instantiation/common/serviceCollection.js';
import { SyncDescriptor } from '../../../../platform/instantiation/common/descriptors.js';
import { ITextModelService, } from '../../../../editor/common/services/resolverService.js';
import { URITransformerService } from '../../common/extHostUriTransformerService.js';
import { IOutlineModelService, OutlineModelService, } from '../../../../editor/contrib/documentSymbols/browser/outlineModel.js';
import { ILanguageFeatureDebounceService, LanguageFeatureDebounceService, } from '../../../../editor/common/services/languageFeatureDebounce.js';
import { ILanguageFeaturesService } from '../../../../editor/common/services/languageFeatures.js';
import { LanguageFeaturesService } from '../../../../editor/common/services/languageFeaturesService.js';
import { assertType } from '../../../../base/common/types.js';
import { IUriIdentityService } from '../../../../platform/uriIdentity/common/uriIdentity.js';
import { IConfigurationService } from '../../../../platform/configuration/common/configuration.js';
import { TestConfigurationService } from '../../../../platform/configuration/test/common/testConfigurationService.js';
import { IEnvironmentService } from '../../../../platform/environment/common/environment.js';
import { TestInstantiationService } from '../../../../platform/instantiation/test/common/instantiationServiceMock.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../base/test/common/utils.js';
import { runWithFakedTimers } from '../../../../base/test/common/timeTravelScheduler.js';
import { timeout } from '../../../../base/common/async.js';
function assertRejects(fn, message = 'Expected rejection') {
    return fn().then(() => assert.ok(false, message), (_err) => assert.ok(true));
}
function isLocation(value) {
    const candidate = value;
    return candidate && candidate.uri instanceof URI && candidate.range instanceof types.Range;
}
suite('ExtHostLanguageFeatureCommands', function () {
    const defaultSelector = { scheme: 'far' };
    let model;
    let insta;
    let rpcProtocol;
    let extHost;
    let mainThread;
    let commands;
    let disposables = [];
    let originalErrorHandler;
    suiteSetup(() => {
        model = createTextModel(['This is the first line', 'This is the second line', 'This is the third line'].join('\n'), undefined, undefined, URI.parse('far://testing/file.b'));
        originalErrorHandler = errorHandler.getUnexpectedErrorHandler();
        setUnexpectedErrorHandler(() => { });
        // Use IInstantiationService to get typechecking when instantiating
        rpcProtocol = new TestRPCProtocol();
        const services = new ServiceCollection();
        services.set(IUriIdentityService, new (class extends mock() {
            asCanonicalUri(uri) {
                return uri;
            }
        })());
        services.set(ILanguageFeaturesService, new SyncDescriptor(LanguageFeaturesService));
        services.set(IExtensionService, new (class extends mock() {
            async activateByEvent() { }
            activationEventIsDone(activationEvent) {
                return true;
            }
        })());
        services.set(ICommandService, new SyncDescriptor(class extends mock() {
            executeCommand(id, ...args) {
                const command = CommandsRegistry.getCommands().get(id);
                if (!command) {
                    return Promise.reject(new Error(id + ' NOT known'));
                }
                const { handler } = command;
                return Promise.resolve(insta.invokeFunction(handler, ...args));
            }
        }));
        services.set(IEnvironmentService, new (class extends mock() {
            constructor() {
                super(...arguments);
                this.isBuilt = true;
                this.isExtensionDevelopment = false;
            }
        })());
        services.set(IMarkerService, new MarkerService());
        services.set(ILogService, new SyncDescriptor(NullLogService));
        services.set(ILanguageFeatureDebounceService, new SyncDescriptor(LanguageFeatureDebounceService));
        services.set(IModelService, new (class extends mock() {
            constructor() {
                super(...arguments);
                this.onModelRemoved = Event.None;
            }
            getModel() {
                return model;
            }
        })());
        services.set(ITextModelService, new (class extends mock() {
            async createModelReference() {
                return new ImmortalReference(new (class extends mock() {
                    constructor() {
                        super(...arguments);
                        this.textEditorModel = model;
                    }
                })());
            }
        })());
        services.set(IEditorWorkerService, new (class extends mock() {
            async computeMoreMinimalEdits(_uri, edits) {
                return edits || undefined;
            }
        })());
        services.set(ILanguageFeatureDebounceService, new SyncDescriptor(LanguageFeatureDebounceService));
        services.set(IOutlineModelService, new SyncDescriptor(OutlineModelService));
        services.set(IConfigurationService, new TestConfigurationService());
        insta = new TestInstantiationService(services);
        const extHostDocumentsAndEditors = new ExtHostDocumentsAndEditors(rpcProtocol, new NullLogService());
        extHostDocumentsAndEditors.$acceptDocumentsAndEditorsDelta({
            addedDocuments: [
                {
                    isDirty: false,
                    versionId: model.getVersionId(),
                    languageId: model.getLanguageId(),
                    uri: model.uri,
                    lines: model.getValue().split(model.getEOL()),
                    EOL: model.getEOL(),
                    encoding: 'utf8',
                },
            ],
        });
        const extHostDocuments = new ExtHostDocuments(rpcProtocol, extHostDocumentsAndEditors);
        rpcProtocol.set(ExtHostContext.ExtHostDocuments, extHostDocuments);
        commands = new ExtHostCommands(rpcProtocol, new NullLogService(), new (class extends mock() {
            onExtensionError() {
                return true;
            }
        })());
        rpcProtocol.set(ExtHostContext.ExtHostCommands, commands);
        rpcProtocol.set(MainContext.MainThreadCommands, insta.createInstance(MainThreadCommands, rpcProtocol));
        ExtHostApiCommands.register(commands);
        const diagnostics = new ExtHostDiagnostics(rpcProtocol, new NullLogService(), new (class extends mock() {
        })(), extHostDocumentsAndEditors);
        rpcProtocol.set(ExtHostContext.ExtHostDiagnostics, diagnostics);
        extHost = new ExtHostLanguageFeatures(rpcProtocol, new URITransformerService(null), extHostDocuments, commands, diagnostics, new NullLogService(), NullApiDeprecationService, new (class extends mock() {
            onExtensionError() {
                return true;
            }
        })());
        rpcProtocol.set(ExtHostContext.ExtHostLanguageFeatures, extHost);
        mainThread = rpcProtocol.set(MainContext.MainThreadLanguageFeatures, insta.createInstance(MainThreadLanguageFeatures, rpcProtocol));
        // forcefully create the outline service so that `ensureNoDisposablesAreLeakedInTestSuite` doesn't bark
        insta.get(IOutlineModelService);
        return rpcProtocol.sync();
    });
    suiteTeardown(() => {
        setUnexpectedErrorHandler(originalErrorHandler);
        model.dispose();
        mainThread.dispose();
        insta.get(IOutlineModelService).dispose();
        insta.dispose();
    });
    teardown(() => {
        disposables = dispose(disposables);
        return rpcProtocol.sync();
    });
    ensureNoDisposablesAreLeakedInTestSuite();
    // --- workspace symbols
    function testApiCmd(name, fn) {
        test(name, async function () {
            await runWithFakedTimers({}, async () => {
                await fn();
                await timeout(10000); // API commands for things that allow commands dispose their result delay. This is to be nice
                // because otherwise properties like command are disposed too early
            });
        });
    }
    test('WorkspaceSymbols, invalid arguments', function () {
        const promises = [
            assertRejects(() => commands.executeCommand('vscode.executeWorkspaceSymbolProvider')),
            assertRejects(() => commands.executeCommand('vscode.executeWorkspaceSymbolProvider', null)),
            assertRejects(() => commands.executeCommand('vscode.executeWorkspaceSymbolProvider', undefined)),
            assertRejects(() => commands.executeCommand('vscode.executeWorkspaceSymbolProvider', true)),
        ];
        return Promise.all(promises);
    });
    test('WorkspaceSymbols, back and forth', function () {
        disposables.push(extHost.registerWorkspaceSymbolProvider(nullExtensionDescription, {
            provideWorkspaceSymbols(query) {
                return [
                    new types.SymbolInformation(query, types.SymbolKind.Array, new types.Range(0, 0, 1, 1), URI.parse('far://testing/first')),
                    new types.SymbolInformation(query, types.SymbolKind.Array, new types.Range(0, 0, 1, 1), URI.parse('far://testing/second')),
                ];
            },
        }));
        disposables.push(extHost.registerWorkspaceSymbolProvider(nullExtensionDescription, {
            provideWorkspaceSymbols(query) {
                return [
                    new types.SymbolInformation(query, types.SymbolKind.Array, new types.Range(0, 0, 1, 1), URI.parse('far://testing/first')),
                ];
            },
        }));
        return rpcProtocol.sync().then(() => {
            return commands
                .executeCommand('vscode.executeWorkspaceSymbolProvider', 'testing')
                .then((value) => {
                assert.strictEqual(value.length, 2); // de-duped
                for (const info of value) {
                    assert.strictEqual(info instanceof types.SymbolInformation, true);
                    assert.strictEqual(info.name, 'testing');
                    assert.strictEqual(info.kind, types.SymbolKind.Array);
                }
            });
        });
    });
    test('executeWorkspaceSymbolProvider should accept empty string, #39522', async function () {
        disposables.push(extHost.registerWorkspaceSymbolProvider(nullExtensionDescription, {
            provideWorkspaceSymbols() {
                return [
                    new types.SymbolInformation('hello', types.SymbolKind.Array, new types.Range(0, 0, 0, 0), URI.parse('foo:bar')),
                ];
            },
        }));
        await rpcProtocol.sync();
        let symbols = await commands.executeCommand('vscode.executeWorkspaceSymbolProvider', '');
        assert.strictEqual(symbols.length, 1);
        await rpcProtocol.sync();
        symbols = await commands.executeCommand('vscode.executeWorkspaceSymbolProvider', '*');
        assert.strictEqual(symbols.length, 1);
    });
    // --- formatting
    test('executeFormatDocumentProvider, back and forth', async function () {
        disposables.push(extHost.registerDocumentFormattingEditProvider(nullExtensionDescription, defaultSelector, new (class {
            provideDocumentFormattingEdits() {
                return [types.TextEdit.insert(new types.Position(0, 0), '42')];
            }
        })()));
        await rpcProtocol.sync();
        const edits = await commands.executeCommand('vscode.executeFormatDocumentProvider', model.uri);
        assert.strictEqual(edits.length, 1);
    });
    // --- rename
    test('vscode.prepareRename', async function () {
        disposables.push(extHost.registerRenameProvider(nullExtensionDescription, defaultSelector, new (class {
            prepareRename(document, position) {
                return {
                    range: new types.Range(0, 12, 0, 24),
                    placeholder: 'foooPlaceholder',
                };
            }
            provideRenameEdits(document, position, newName) {
                const edit = new types.WorkspaceEdit();
                edit.insert(document.uri, position, newName);
                return edit;
            }
        })()));
        await rpcProtocol.sync();
        const data = await commands.executeCommand('vscode.prepareRename', model.uri, new types.Position(0, 12));
        assert.ok(data);
        assert.strictEqual(data.placeholder, 'foooPlaceholder');
        assert.strictEqual(data.range.start.line, 0);
        assert.strictEqual(data.range.start.character, 12);
        assert.strictEqual(data.range.end.line, 0);
        assert.strictEqual(data.range.end.character, 24);
    });
    test('vscode.executeDocumentRenameProvider', async function () {
        disposables.push(extHost.registerRenameProvider(nullExtensionDescription, defaultSelector, new (class {
            provideRenameEdits(document, position, newName) {
                const edit = new types.WorkspaceEdit();
                edit.insert(document.uri, position, newName);
                return edit;
            }
        })()));
        await rpcProtocol.sync();
        const edit = await commands.executeCommand('vscode.executeDocumentRenameProvider', model.uri, new types.Position(0, 12), 'newNameOfThis');
        assert.ok(edit);
        assert.strictEqual(edit.has(model.uri), true);
        const textEdits = edit.get(model.uri);
        assert.strictEqual(textEdits.length, 1);
        assert.strictEqual(textEdits[0].newText, 'newNameOfThis');
    });
    // --- definition
    test('Definition, invalid arguments', function () {
        const promises = [
            assertRejects(() => commands.executeCommand('vscode.executeDefinitionProvider')),
            assertRejects(() => commands.executeCommand('vscode.executeDefinitionProvider', null)),
            assertRejects(() => commands.executeCommand('vscode.executeDefinitionProvider', undefined)),
            assertRejects(() => commands.executeCommand('vscode.executeDefinitionProvider', true, false)),
        ];
        return Promise.all(promises);
    });
    test('Definition, back and forth', function () {
        disposables.push(extHost.registerDefinitionProvider(nullExtensionDescription, defaultSelector, {
            provideDefinition(doc) {
                return new types.Location(doc.uri, new types.Range(1, 0, 0, 0));
            },
        }));
        disposables.push(extHost.registerDefinitionProvider(nullExtensionDescription, defaultSelector, {
            provideDefinition(doc) {
                // duplicate result will get removed
                return new types.Location(doc.uri, new types.Range(1, 0, 0, 0));
            },
        }));
        disposables.push(extHost.registerDefinitionProvider(nullExtensionDescription, defaultSelector, {
            provideDefinition(doc) {
                return [
                    new types.Location(doc.uri, new types.Range(2, 0, 0, 0)),
                    new types.Location(doc.uri, new types.Range(3, 0, 0, 0)),
                    new types.Location(doc.uri, new types.Range(4, 0, 0, 0)),
                ];
            },
        }));
        return rpcProtocol.sync().then(() => {
            return commands
                .executeCommand('vscode.executeDefinitionProvider', model.uri, new types.Position(0, 0))
                .then((values) => {
                assert.strictEqual(values.length, 4);
                for (const v of values) {
                    assert.ok(v.uri instanceof URI);
                    assert.ok(v.range instanceof types.Range);
                }
            });
        });
    });
    test('Definition, back and forth (sorting & de-deduping)', function () {
        disposables.push(extHost.registerDefinitionProvider(nullExtensionDescription, defaultSelector, {
            provideDefinition(doc) {
                return new types.Location(URI.parse('file:///b'), new types.Range(1, 0, 0, 0));
            },
        }));
        disposables.push(extHost.registerDefinitionProvider(nullExtensionDescription, defaultSelector, {
            provideDefinition(doc) {
                // duplicate result will get removed
                return new types.Location(URI.parse('file:///b'), new types.Range(1, 0, 0, 0));
            },
        }));
        disposables.push(extHost.registerDefinitionProvider(nullExtensionDescription, defaultSelector, {
            provideDefinition(doc) {
                return [
                    new types.Location(URI.parse('file:///a'), new types.Range(2, 0, 0, 0)),
                    new types.Location(URI.parse('file:///c'), new types.Range(3, 0, 0, 0)),
                    new types.Location(URI.parse('file:///d'), new types.Range(4, 0, 0, 0)),
                ];
            },
        }));
        return rpcProtocol.sync().then(() => {
            return commands
                .executeCommand('vscode.executeDefinitionProvider', model.uri, new types.Position(0, 0))
                .then((values) => {
                assert.strictEqual(values.length, 4);
                assert.strictEqual(values[0].uri.path, '/a');
                assert.strictEqual(values[1].uri.path, '/b');
                assert.strictEqual(values[2].uri.path, '/c');
                assert.strictEqual(values[3].uri.path, '/d');
            });
        });
    });
    test('Definition Link', () => {
        disposables.push(extHost.registerDefinitionProvider(nullExtensionDescription, defaultSelector, {
            provideDefinition(doc) {
                return [
                    new types.Location(doc.uri, new types.Range(0, 0, 0, 0)),
                    {
                        targetUri: doc.uri,
                        targetRange: new types.Range(1, 0, 0, 0),
                        targetSelectionRange: new types.Range(1, 1, 1, 1),
                        originSelectionRange: new types.Range(2, 2, 2, 2),
                    },
                ];
            },
        }));
        return rpcProtocol.sync().then(() => {
            return commands
                .executeCommand('vscode.executeDefinitionProvider', model.uri, new types.Position(0, 0))
                .then((values) => {
                assert.strictEqual(values.length, 2);
                for (const v of values) {
                    if (isLocation(v)) {
                        assert.ok(v.uri instanceof URI);
                        assert.ok(v.range instanceof types.Range);
                    }
                    else {
                        assert.ok(v.targetUri instanceof URI);
                        assert.ok(v.targetRange instanceof types.Range);
                        assert.ok(v.targetSelectionRange instanceof types.Range);
                        assert.ok(v.originSelectionRange instanceof types.Range);
                    }
                }
            });
        });
    });
    // --- declaration
    test('Declaration, back and forth', function () {
        disposables.push(extHost.registerDeclarationProvider(nullExtensionDescription, defaultSelector, {
            provideDeclaration(doc) {
                return new types.Location(doc.uri, new types.Range(1, 0, 0, 0));
            },
        }));
        disposables.push(extHost.registerDeclarationProvider(nullExtensionDescription, defaultSelector, {
            provideDeclaration(doc) {
                // duplicate result will get removed
                return new types.Location(doc.uri, new types.Range(1, 0, 0, 0));
            },
        }));
        disposables.push(extHost.registerDeclarationProvider(nullExtensionDescription, defaultSelector, {
            provideDeclaration(doc) {
                return [
                    new types.Location(doc.uri, new types.Range(2, 0, 0, 0)),
                    new types.Location(doc.uri, new types.Range(3, 0, 0, 0)),
                    new types.Location(doc.uri, new types.Range(4, 0, 0, 0)),
                ];
            },
        }));
        return rpcProtocol.sync().then(() => {
            return commands
                .executeCommand('vscode.executeDeclarationProvider', model.uri, new types.Position(0, 0))
                .then((values) => {
                assert.strictEqual(values.length, 4);
                for (const v of values) {
                    assert.ok(v.uri instanceof URI);
                    assert.ok(v.range instanceof types.Range);
                }
            });
        });
    });
    test('Declaration Link', () => {
        disposables.push(extHost.registerDeclarationProvider(nullExtensionDescription, defaultSelector, {
            provideDeclaration(doc) {
                return [
                    new types.Location(doc.uri, new types.Range(0, 0, 0, 0)),
                    {
                        targetUri: doc.uri,
                        targetRange: new types.Range(1, 0, 0, 0),
                        targetSelectionRange: new types.Range(1, 1, 1, 1),
                        originSelectionRange: new types.Range(2, 2, 2, 2),
                    },
                ];
            },
        }));
        return rpcProtocol.sync().then(() => {
            return commands
                .executeCommand('vscode.executeDeclarationProvider', model.uri, new types.Position(0, 0))
                .then((values) => {
                assert.strictEqual(values.length, 2);
                for (const v of values) {
                    if (isLocation(v)) {
                        assert.ok(v.uri instanceof URI);
                        assert.ok(v.range instanceof types.Range);
                    }
                    else {
                        assert.ok(v.targetUri instanceof URI);
                        assert.ok(v.targetRange instanceof types.Range);
                        assert.ok(v.targetSelectionRange instanceof types.Range);
                        assert.ok(v.originSelectionRange instanceof types.Range);
                    }
                }
            });
        });
    });
    // --- type definition
    test('Type Definition, invalid arguments', function () {
        const promises = [
            assertRejects(() => commands.executeCommand('vscode.executeTypeDefinitionProvider')),
            assertRejects(() => commands.executeCommand('vscode.executeTypeDefinitionProvider', null)),
            assertRejects(() => commands.executeCommand('vscode.executeTypeDefinitionProvider', undefined)),
            assertRejects(() => commands.executeCommand('vscode.executeTypeDefinitionProvider', true, false)),
        ];
        return Promise.all(promises);
    });
    test('Type Definition, back and forth', function () {
        disposables.push(extHost.registerTypeDefinitionProvider(nullExtensionDescription, defaultSelector, {
            provideTypeDefinition(doc) {
                return new types.Location(doc.uri, new types.Range(1, 0, 0, 0));
            },
        }));
        disposables.push(extHost.registerTypeDefinitionProvider(nullExtensionDescription, defaultSelector, {
            provideTypeDefinition(doc) {
                // duplicate result will get removed
                return new types.Location(doc.uri, new types.Range(1, 0, 0, 0));
            },
        }));
        disposables.push(extHost.registerTypeDefinitionProvider(nullExtensionDescription, defaultSelector, {
            provideTypeDefinition(doc) {
                return [
                    new types.Location(doc.uri, new types.Range(2, 0, 0, 0)),
                    new types.Location(doc.uri, new types.Range(3, 0, 0, 0)),
                    new types.Location(doc.uri, new types.Range(4, 0, 0, 0)),
                ];
            },
        }));
        return rpcProtocol.sync().then(() => {
            return commands
                .executeCommand('vscode.executeTypeDefinitionProvider', model.uri, new types.Position(0, 0))
                .then((values) => {
                assert.strictEqual(values.length, 4);
                for (const v of values) {
                    assert.ok(v.uri instanceof URI);
                    assert.ok(v.range instanceof types.Range);
                }
            });
        });
    });
    test('Type Definition Link', () => {
        disposables.push(extHost.registerTypeDefinitionProvider(nullExtensionDescription, defaultSelector, {
            provideTypeDefinition(doc) {
                return [
                    new types.Location(doc.uri, new types.Range(0, 0, 0, 0)),
                    {
                        targetUri: doc.uri,
                        targetRange: new types.Range(1, 0, 0, 0),
                        targetSelectionRange: new types.Range(1, 1, 1, 1),
                        originSelectionRange: new types.Range(2, 2, 2, 2),
                    },
                ];
            },
        }));
        return rpcProtocol.sync().then(() => {
            return commands
                .executeCommand('vscode.executeTypeDefinitionProvider', model.uri, new types.Position(0, 0))
                .then((values) => {
                assert.strictEqual(values.length, 2);
                for (const v of values) {
                    if (isLocation(v)) {
                        assert.ok(v.uri instanceof URI);
                        assert.ok(v.range instanceof types.Range);
                    }
                    else {
                        assert.ok(v.targetUri instanceof URI);
                        assert.ok(v.targetRange instanceof types.Range);
                        assert.ok(v.targetSelectionRange instanceof types.Range);
                        assert.ok(v.originSelectionRange instanceof types.Range);
                    }
                }
            });
        });
    });
    // --- implementation
    test('Implementation, invalid arguments', function () {
        const promises = [
            assertRejects(() => commands.executeCommand('vscode.executeImplementationProvider')),
            assertRejects(() => commands.executeCommand('vscode.executeImplementationProvider', null)),
            assertRejects(() => commands.executeCommand('vscode.executeImplementationProvider', undefined)),
            assertRejects(() => commands.executeCommand('vscode.executeImplementationProvider', true, false)),
        ];
        return Promise.all(promises);
    });
    test('Implementation, back and forth', function () {
        disposables.push(extHost.registerImplementationProvider(nullExtensionDescription, defaultSelector, {
            provideImplementation(doc) {
                return new types.Location(doc.uri, new types.Range(1, 0, 0, 0));
            },
        }));
        disposables.push(extHost.registerImplementationProvider(nullExtensionDescription, defaultSelector, {
            provideImplementation(doc) {
                // duplicate result will get removed
                return new types.Location(doc.uri, new types.Range(1, 0, 0, 0));
            },
        }));
        disposables.push(extHost.registerImplementationProvider(nullExtensionDescription, defaultSelector, {
            provideImplementation(doc) {
                return [
                    new types.Location(doc.uri, new types.Range(2, 0, 0, 0)),
                    new types.Location(doc.uri, new types.Range(3, 0, 0, 0)),
                    new types.Location(doc.uri, new types.Range(4, 0, 0, 0)),
                ];
            },
        }));
        return rpcProtocol.sync().then(() => {
            return commands
                .executeCommand('vscode.executeImplementationProvider', model.uri, new types.Position(0, 0))
                .then((values) => {
                assert.strictEqual(values.length, 4);
                for (const v of values) {
                    assert.ok(v.uri instanceof URI);
                    assert.ok(v.range instanceof types.Range);
                }
            });
        });
    });
    test('Implementation Definition Link', () => {
        disposables.push(extHost.registerImplementationProvider(nullExtensionDescription, defaultSelector, {
            provideImplementation(doc) {
                return [
                    new types.Location(doc.uri, new types.Range(0, 0, 0, 0)),
                    {
                        targetUri: doc.uri,
                        targetRange: new types.Range(1, 0, 0, 0),
                        targetSelectionRange: new types.Range(1, 1, 1, 1),
                        originSelectionRange: new types.Range(2, 2, 2, 2),
                    },
                ];
            },
        }));
        return rpcProtocol.sync().then(() => {
            return commands
                .executeCommand('vscode.executeImplementationProvider', model.uri, new types.Position(0, 0))
                .then((values) => {
                assert.strictEqual(values.length, 2);
                for (const v of values) {
                    if (isLocation(v)) {
                        assert.ok(v.uri instanceof URI);
                        assert.ok(v.range instanceof types.Range);
                    }
                    else {
                        assert.ok(v.targetUri instanceof URI);
                        assert.ok(v.targetRange instanceof types.Range);
                        assert.ok(v.targetSelectionRange instanceof types.Range);
                        assert.ok(v.originSelectionRange instanceof types.Range);
                    }
                }
            });
        });
    });
    // --- references
    test('reference search, back and forth', function () {
        disposables.push(extHost.registerReferenceProvider(nullExtensionDescription, defaultSelector, {
            provideReferences() {
                return [new types.Location(URI.parse('some:uri/path'), new types.Range(0, 1, 0, 5))];
            },
        }));
        return commands
            .executeCommand('vscode.executeReferenceProvider', model.uri, new types.Position(0, 0))
            .then((values) => {
            assert.strictEqual(values.length, 1);
            const [first] = values;
            assert.strictEqual(first.uri.toString(), 'some:uri/path');
            assert.strictEqual(first.range.start.line, 0);
            assert.strictEqual(first.range.start.character, 1);
            assert.strictEqual(first.range.end.line, 0);
            assert.strictEqual(first.range.end.character, 5);
        });
    });
    // --- document highlights
    test('"vscode.executeDocumentHighlights" API has stopped returning DocumentHighlight[]#200056', async function () {
        disposables.push(extHost.registerDocumentHighlightProvider(nullExtensionDescription, defaultSelector, {
            provideDocumentHighlights() {
                return [
                    new types.DocumentHighlight(new types.Range(0, 17, 0, 25), types.DocumentHighlightKind.Read),
                ];
            },
        }));
        await rpcProtocol.sync();
        return commands
            .executeCommand('vscode.executeDocumentHighlights', model.uri, new types.Position(0, 0))
            .then((values) => {
            assert.ok(Array.isArray(values));
            assert.strictEqual(values.length, 1);
            const [first] = values;
            assert.strictEqual(first.range.start.line, 0);
            assert.strictEqual(first.range.start.character, 17);
            assert.strictEqual(first.range.end.line, 0);
            assert.strictEqual(first.range.end.character, 25);
        });
    });
    // --- outline
    test('Outline, back and forth', function () {
        disposables.push(extHost.registerDocumentSymbolProvider(nullExtensionDescription, defaultSelector, {
            provideDocumentSymbols() {
                return [
                    new types.SymbolInformation('testing1', types.SymbolKind.Enum, new types.Range(1, 0, 1, 0)),
                    new types.SymbolInformation('testing2', types.SymbolKind.Enum, new types.Range(0, 1, 0, 3)),
                ];
            },
        }));
        return rpcProtocol.sync().then(() => {
            return commands
                .executeCommand('vscode.executeDocumentSymbolProvider', model.uri)
                .then((values) => {
                assert.strictEqual(values.length, 2);
                const [first, second] = values;
                assert.strictEqual(first instanceof types.SymbolInformation, true);
                assert.strictEqual(second instanceof types.SymbolInformation, true);
                assert.strictEqual(first.name, 'testing2');
                assert.strictEqual(second.name, 'testing1');
            });
        });
    });
    test('vscode.executeDocumentSymbolProvider command only returns SymbolInformation[] rather than DocumentSymbol[] #57984', function () {
        disposables.push(extHost.registerDocumentSymbolProvider(nullExtensionDescription, defaultSelector, {
            provideDocumentSymbols() {
                return [
                    new types.SymbolInformation('SymbolInformation', types.SymbolKind.Enum, new types.Range(1, 0, 1, 0)),
                ];
            },
        }));
        disposables.push(extHost.registerDocumentSymbolProvider(nullExtensionDescription, defaultSelector, {
            provideDocumentSymbols() {
                const root = new types.DocumentSymbol('DocumentSymbol', 'DocumentSymbol#detail', types.SymbolKind.Enum, new types.Range(1, 0, 1, 0), new types.Range(1, 0, 1, 0));
                root.children = [
                    new types.DocumentSymbol('DocumentSymbol#child', 'DocumentSymbol#detail#child', types.SymbolKind.Enum, new types.Range(1, 0, 1, 0), new types.Range(1, 0, 1, 0)),
                ];
                return [root];
            },
        }));
        return rpcProtocol.sync().then(() => {
            return commands
                .executeCommand('vscode.executeDocumentSymbolProvider', model.uri)
                .then((values) => {
                assert.strictEqual(values.length, 2);
                const [first, second] = values;
                assert.strictEqual(first instanceof types.SymbolInformation, true);
                assert.strictEqual(first instanceof types.DocumentSymbol, false);
                assert.strictEqual(second instanceof types.SymbolInformation, true);
                assert.strictEqual(first.name, 'DocumentSymbol');
                assert.strictEqual(first.children.length, 1);
                assert.strictEqual(second.name, 'SymbolInformation');
            });
        });
    });
    // --- suggest
    testApiCmd('triggerCharacter is null when completion provider is called programmatically #159914', async function () {
        let actualContext;
        disposables.push(extHost.registerCompletionItemProvider(nullExtensionDescription, defaultSelector, {
            provideCompletionItems(_doc, _pos, _tok, context) {
                actualContext = context;
                return [];
            },
        }, []));
        await rpcProtocol.sync();
        await commands.executeCommand('vscode.executeCompletionItemProvider', model.uri, new types.Position(0, 4));
        assert.ok(actualContext);
        assert.deepStrictEqual(actualContext, {
            triggerKind: types.CompletionTriggerKind.Invoke,
            triggerCharacter: undefined,
        });
    });
    testApiCmd('Suggest, back and forth', async function () {
        disposables.push(extHost.registerCompletionItemProvider(nullExtensionDescription, defaultSelector, {
            provideCompletionItems() {
                const a = new types.CompletionItem('item1');
                a.documentation = new types.MarkdownString('hello_md_string');
                const b = new types.CompletionItem('item2');
                b.textEdit = types.TextEdit.replace(new types.Range(0, 4, 0, 8), 'foo'); // overwite after
                const c = new types.CompletionItem('item3');
                c.textEdit = types.TextEdit.replace(new types.Range(0, 1, 0, 6), 'foobar'); // overwite before & after
                // snippet string!
                const d = new types.CompletionItem('item4');
                d.range = new types.Range(0, 1, 0, 4); // overwite before
                d.insertText = new types.SnippetString('foo$0bar');
                return [a, b, c, d];
            },
        }, []));
        await rpcProtocol.sync();
        const list = await commands.executeCommand('vscode.executeCompletionItemProvider', model.uri, new types.Position(0, 4));
        assert.ok(list instanceof types.CompletionList);
        const values = list.items;
        assert.ok(Array.isArray(values));
        assert.strictEqual(values.length, 4);
        const [first, second, third, fourth] = values;
        assert.strictEqual(first.label, 'item1');
        assert.strictEqual(first.textEdit, undefined); // no text edit, default ranges
        assert.ok(!types.Range.isRange(first.range));
        assert.strictEqual(first.documentation.value, 'hello_md_string');
        assert.strictEqual(second.label, 'item2');
        assert.strictEqual(second.textEdit.newText, 'foo');
        assert.strictEqual(second.textEdit.range.start.line, 0);
        assert.strictEqual(second.textEdit.range.start.character, 4);
        assert.strictEqual(second.textEdit.range.end.line, 0);
        assert.strictEqual(second.textEdit.range.end.character, 8);
        assert.strictEqual(third.label, 'item3');
        assert.strictEqual(third.textEdit.newText, 'foobar');
        assert.strictEqual(third.textEdit.range.start.line, 0);
        assert.strictEqual(third.textEdit.range.start.character, 1);
        assert.strictEqual(third.textEdit.range.end.line, 0);
        assert.strictEqual(third.textEdit.range.end.character, 6);
        assert.strictEqual(fourth.label, 'item4');
        assert.strictEqual(fourth.textEdit, undefined);
        const range = fourth.range;
        assert.ok(types.Range.isRange(range));
        assert.strictEqual(range.start.line, 0);
        assert.strictEqual(range.start.character, 1);
        assert.strictEqual(range.end.line, 0);
        assert.strictEqual(range.end.character, 4);
        assert.ok(fourth.insertText instanceof types.SnippetString);
        assert.strictEqual(fourth.insertText.value, 'foo$0bar');
    });
    testApiCmd('Suggest, return CompletionList !array', async function () {
        disposables.push(extHost.registerCompletionItemProvider(nullExtensionDescription, defaultSelector, {
            provideCompletionItems() {
                const a = new types.CompletionItem('item1');
                const b = new types.CompletionItem('item2');
                return new types.CompletionList([a, b], true);
            },
        }, []));
        await rpcProtocol.sync();
        const list = await commands.executeCommand('vscode.executeCompletionItemProvider', model.uri, new types.Position(0, 4));
        assert.ok(list instanceof types.CompletionList);
        assert.strictEqual(list.isIncomplete, true);
    });
    testApiCmd('Suggest, resolve completion items', async function () {
        let resolveCount = 0;
        disposables.push(extHost.registerCompletionItemProvider(nullExtensionDescription, defaultSelector, {
            provideCompletionItems() {
                const a = new types.CompletionItem('item1');
                const b = new types.CompletionItem('item2');
                const c = new types.CompletionItem('item3');
                const d = new types.CompletionItem('item4');
                return new types.CompletionList([a, b, c, d], false);
            },
            resolveCompletionItem(item) {
                resolveCount += 1;
                return item;
            },
        }, []));
        await rpcProtocol.sync();
        const list = await commands.executeCommand('vscode.executeCompletionItemProvider', model.uri, new types.Position(0, 4), undefined, 2);
        assert.ok(list instanceof types.CompletionList);
        assert.strictEqual(resolveCount, 2);
    });
    testApiCmd('"vscode.executeCompletionItemProvider" doesnot return a preselect field #53749', async function () {
        disposables.push(extHost.registerCompletionItemProvider(nullExtensionDescription, defaultSelector, {
            provideCompletionItems() {
                const a = new types.CompletionItem('item1');
                a.preselect = true;
                const b = new types.CompletionItem('item2');
                const c = new types.CompletionItem('item3');
                c.preselect = true;
                const d = new types.CompletionItem('item4');
                return new types.CompletionList([a, b, c, d], false);
            },
        }, []));
        await rpcProtocol.sync();
        const list = await commands.executeCommand('vscode.executeCompletionItemProvider', model.uri, new types.Position(0, 4), undefined);
        assert.ok(list instanceof types.CompletionList);
        assert.strictEqual(list.items.length, 4);
        const [a, b, c, d] = list.items;
        assert.strictEqual(a.preselect, true);
        assert.strictEqual(b.preselect, undefined);
        assert.strictEqual(c.preselect, true);
        assert.strictEqual(d.preselect, undefined);
    });
    testApiCmd("executeCompletionItemProvider doesn't capture commitCharacters #58228", async function () {
        disposables.push(extHost.registerCompletionItemProvider(nullExtensionDescription, defaultSelector, {
            provideCompletionItems() {
                const a = new types.CompletionItem('item1');
                a.commitCharacters = ['a', 'b'];
                const b = new types.CompletionItem('item2');
                return new types.CompletionList([a, b], false);
            },
        }, []));
        await rpcProtocol.sync();
        const list = await commands.executeCommand('vscode.executeCompletionItemProvider', model.uri, new types.Position(0, 4), undefined);
        assert.ok(list instanceof types.CompletionList);
        assert.strictEqual(list.items.length, 2);
        const [a, b] = list.items;
        assert.deepStrictEqual(a.commitCharacters, ['a', 'b']);
        assert.strictEqual(b.commitCharacters, undefined);
    });
    testApiCmd('vscode.executeCompletionItemProvider returns the wrong CompletionItemKinds in insiders #95715', async function () {
        disposables.push(extHost.registerCompletionItemProvider(nullExtensionDescription, defaultSelector, {
            provideCompletionItems() {
                return [
                    new types.CompletionItem('My Method', types.CompletionItemKind.Method),
                    new types.CompletionItem('My Property', types.CompletionItemKind.Property),
                ];
            },
        }, []));
        await rpcProtocol.sync();
        const list = await commands.executeCommand('vscode.executeCompletionItemProvider', model.uri, new types.Position(0, 4), undefined);
        assert.ok(list instanceof types.CompletionList);
        assert.strictEqual(list.items.length, 2);
        const [a, b] = list.items;
        assert.strictEqual(a.kind, types.CompletionItemKind.Method);
        assert.strictEqual(b.kind, types.CompletionItemKind.Property);
    });
    // --- signatureHelp
    test('Parameter Hints, back and forth', async () => {
        disposables.push(extHost.registerSignatureHelpProvider(nullExtensionDescription, defaultSelector, new (class {
            provideSignatureHelp(_document, _position, _token, context) {
                return {
                    activeSignature: 0,
                    activeParameter: 1,
                    signatures: [
                        {
                            label: 'abc',
                            documentation: `${context.triggerKind === 1 /* vscode.SignatureHelpTriggerKind.Invoke */ ? 'invoked' : 'unknown'} ${context.triggerCharacter}`,
                            parameters: [],
                        },
                    ],
                };
            }
        })(), []));
        await rpcProtocol.sync();
        const firstValue = await commands.executeCommand('vscode.executeSignatureHelpProvider', model.uri, new types.Position(0, 1), ',');
        assert.strictEqual(firstValue.activeSignature, 0);
        assert.strictEqual(firstValue.activeParameter, 1);
        assert.strictEqual(firstValue.signatures.length, 1);
        assert.strictEqual(firstValue.signatures[0].label, 'abc');
        assert.strictEqual(firstValue.signatures[0].documentation, 'invoked ,');
    });
    // --- quickfix
    testApiCmd('QuickFix, back and forth', function () {
        disposables.push(extHost.registerCodeActionProvider(nullExtensionDescription, defaultSelector, {
            provideCodeActions() {
                return [{ command: 'testing', title: 'Title', arguments: [1, 2, true] }];
            },
        }));
        return rpcProtocol.sync().then(() => {
            return commands
                .executeCommand('vscode.executeCodeActionProvider', model.uri, new types.Range(0, 0, 1, 1))
                .then((value) => {
                assert.strictEqual(value.length, 1);
                const [first] = value;
                assert.strictEqual(first.title, 'Title');
                assert.strictEqual(first.command, 'testing');
                assert.deepStrictEqual(first.arguments, [1, 2, true]);
            });
        });
    });
    testApiCmd('vscode.executeCodeActionProvider results seem to be missing their `command` property #45124', function () {
        disposables.push(extHost.registerCodeActionProvider(nullExtensionDescription, defaultSelector, {
            provideCodeActions(document, range) {
                return [
                    {
                        command: {
                            arguments: [document, range],
                            command: 'command',
                            title: 'command_title',
                        },
                        kind: types.CodeActionKind.Empty.append('foo'),
                        title: 'title',
                    },
                ];
            },
        }));
        return rpcProtocol.sync().then(() => {
            return commands
                .executeCommand('vscode.executeCodeActionProvider', model.uri, new types.Range(0, 0, 1, 1))
                .then((value) => {
                assert.strictEqual(value.length, 1);
                const [first] = value;
                assert.ok(first.command);
                assert.strictEqual(first.command.command, 'command');
                assert.strictEqual(first.command.title, 'command_title');
                assert.strictEqual(first.kind.value, 'foo');
                assert.strictEqual(first.title, 'title');
            });
        });
    });
    testApiCmd('vscode.executeCodeActionProvider passes Range to provider although Selection is passed in #77997', function () {
        disposables.push(extHost.registerCodeActionProvider(nullExtensionDescription, defaultSelector, {
            provideCodeActions(document, rangeOrSelection) {
                return [
                    {
                        command: {
                            arguments: [document, rangeOrSelection],
                            command: 'command',
                            title: 'command_title',
                        },
                        kind: types.CodeActionKind.Empty.append('foo'),
                        title: 'title',
                    },
                ];
            },
        }));
        const selection = new types.Selection(0, 0, 1, 1);
        return rpcProtocol.sync().then(() => {
            return commands
                .executeCommand('vscode.executeCodeActionProvider', model.uri, selection)
                .then((value) => {
                assert.strictEqual(value.length, 1);
                const [first] = value;
                assert.ok(first.command);
                assert.ok(first.command.arguments[1] instanceof types.Selection);
                assert.ok(first.command.arguments[1].isEqual(selection));
            });
        });
    });
    testApiCmd('vscode.executeCodeActionProvider results seem to be missing their `isPreferred` property #78098', function () {
        disposables.push(extHost.registerCodeActionProvider(nullExtensionDescription, defaultSelector, {
            provideCodeActions(document, rangeOrSelection) {
                return [
                    {
                        command: {
                            arguments: [document, rangeOrSelection],
                            command: 'command',
                            title: 'command_title',
                        },
                        kind: types.CodeActionKind.Empty.append('foo'),
                        title: 'title',
                        isPreferred: true,
                    },
                ];
            },
        }));
        const selection = new types.Selection(0, 0, 1, 1);
        return rpcProtocol.sync().then(() => {
            return commands
                .executeCommand('vscode.executeCodeActionProvider', model.uri, selection)
                .then((value) => {
                assert.strictEqual(value.length, 1);
                const [first] = value;
                assert.strictEqual(first.isPreferred, true);
            });
        });
    });
    testApiCmd('resolving code action', async function () {
        let didCallResolve = 0;
        class MyAction extends types.CodeAction {
        }
        disposables.push(extHost.registerCodeActionProvider(nullExtensionDescription, defaultSelector, {
            provideCodeActions(document, rangeOrSelection) {
                return [new MyAction('title', types.CodeActionKind.Empty.append('foo'))];
            },
            resolveCodeAction(action) {
                assert.ok(action instanceof MyAction);
                didCallResolve += 1;
                action.title = 'resolved title';
                action.edit = new types.WorkspaceEdit();
                return action;
            },
        }));
        const selection = new types.Selection(0, 0, 1, 1);
        await rpcProtocol.sync();
        const value = await commands.executeCommand('vscode.executeCodeActionProvider', model.uri, selection, undefined, 1000);
        assert.strictEqual(didCallResolve, 1);
        assert.strictEqual(value.length, 1);
        const [first] = value;
        assert.strictEqual(first.title, 'title'); // does NOT change
        assert.ok(first.edit); // is set
    });
    // --- code lens
    testApiCmd('CodeLens, back and forth', function () {
        const complexArg = {
            foo() { },
            bar() { },
            big: extHost,
        };
        disposables.push(extHost.registerCodeLensProvider(nullExtensionDescription, defaultSelector, {
            provideCodeLenses() {
                return [
                    new types.CodeLens(new types.Range(0, 0, 1, 1), {
                        title: 'Title',
                        command: 'cmd',
                        arguments: [1, true, complexArg],
                    }),
                ];
            },
        }));
        return rpcProtocol.sync().then(() => {
            return commands
                .executeCommand('vscode.executeCodeLensProvider', model.uri)
                .then((value) => {
                assert.strictEqual(value.length, 1);
                const [first] = value;
                assert.strictEqual(first.command.title, 'Title');
                assert.strictEqual(first.command.command, 'cmd');
                assert.strictEqual(first.command.arguments[0], 1);
                assert.strictEqual(first.command.arguments[1], true);
                assert.strictEqual(first.command.arguments[2], complexArg);
            });
        });
    });
    testApiCmd('CodeLens, resolve', async function () {
        let resolveCount = 0;
        disposables.push(extHost.registerCodeLensProvider(nullExtensionDescription, defaultSelector, {
            provideCodeLenses() {
                return [
                    new types.CodeLens(new types.Range(0, 0, 1, 1)),
                    new types.CodeLens(new types.Range(0, 0, 1, 1)),
                    new types.CodeLens(new types.Range(0, 0, 1, 1)),
                    new types.CodeLens(new types.Range(0, 0, 1, 1), {
                        title: 'Already resolved',
                        command: 'fff',
                    }),
                ];
            },
            resolveCodeLens(codeLens) {
                codeLens.command = { title: resolveCount.toString(), command: 'resolved' };
                resolveCount += 1;
                return codeLens;
            },
        }));
        await rpcProtocol.sync();
        let value = await commands.executeCommand('vscode.executeCodeLensProvider', model.uri, 2);
        assert.strictEqual(value.length, 3); // the resolve argument defines the number of results being returned
        assert.strictEqual(resolveCount, 2);
        resolveCount = 0;
        value = await commands.executeCommand('vscode.executeCodeLensProvider', model.uri);
        assert.strictEqual(value.length, 4);
        assert.strictEqual(resolveCount, 0);
    });
    testApiCmd('Links, back and forth', function () {
        disposables.push(extHost.registerDocumentLinkProvider(nullExtensionDescription, defaultSelector, {
            provideDocumentLinks() {
                return [new types.DocumentLink(new types.Range(0, 0, 0, 20), URI.parse('foo:bar'))];
            },
        }));
        return rpcProtocol.sync().then(() => {
            return commands
                .executeCommand('vscode.executeLinkProvider', model.uri)
                .then((value) => {
                assert.strictEqual(value.length, 1);
                const [first] = value;
                assert.strictEqual(first.target + '', 'foo:bar');
                assert.strictEqual(first.range.start.line, 0);
                assert.strictEqual(first.range.start.character, 0);
                assert.strictEqual(first.range.end.line, 0);
                assert.strictEqual(first.range.end.character, 20);
            });
        });
    });
    testApiCmd("What's the condition for DocumentLink target to be undefined? #106308", async function () {
        disposables.push(extHost.registerDocumentLinkProvider(nullExtensionDescription, defaultSelector, {
            provideDocumentLinks() {
                return [new types.DocumentLink(new types.Range(0, 0, 0, 20), undefined)];
            },
            resolveDocumentLink(link) {
                link.target = URI.parse('foo:bar');
                return link;
            },
        }));
        await rpcProtocol.sync();
        const links1 = await commands.executeCommand('vscode.executeLinkProvider', model.uri);
        assert.strictEqual(links1.length, 1);
        assert.strictEqual(links1[0].target, undefined);
        const links2 = await commands.executeCommand('vscode.executeLinkProvider', model.uri, 1000);
        assert.strictEqual(links2.length, 1);
        assert.strictEqual(links2[0].target.toString(), URI.parse('foo:bar').toString());
    });
    testApiCmd('DocumentLink[] vscode.executeLinkProvider returns lack tooltip #213970', async function () {
        disposables.push(extHost.registerDocumentLinkProvider(nullExtensionDescription, defaultSelector, {
            provideDocumentLinks() {
                const link = new types.DocumentLink(new types.Range(0, 0, 0, 20), URI.parse('foo:bar'));
                link.tooltip = 'Link Tooltip';
                return [link];
            },
        }));
        await rpcProtocol.sync();
        const links1 = await commands.executeCommand('vscode.executeLinkProvider', model.uri);
        assert.strictEqual(links1.length, 1);
        assert.strictEqual(links1[0].tooltip, 'Link Tooltip');
    });
    test('Color provider', function () {
        disposables.push(extHost.registerColorProvider(nullExtensionDescription, defaultSelector, {
            provideDocumentColors() {
                return [
                    new types.ColorInformation(new types.Range(0, 0, 0, 20), new types.Color(0.1, 0.2, 0.3, 0.4)),
                ];
            },
            provideColorPresentations() {
                const cp = new types.ColorPresentation('#ABC');
                cp.textEdit = types.TextEdit.replace(new types.Range(1, 0, 1, 20), '#ABC');
                cp.additionalTextEdits = [types.TextEdit.insert(new types.Position(2, 20), '*')];
                return [cp];
            },
        }));
        return rpcProtocol
            .sync()
            .then(() => {
            return commands
                .executeCommand('vscode.executeDocumentColorProvider', model.uri)
                .then((value) => {
                assert.strictEqual(value.length, 1);
                const [first] = value;
                assert.strictEqual(first.color.red, 0.1);
                assert.strictEqual(first.color.green, 0.2);
                assert.strictEqual(first.color.blue, 0.3);
                assert.strictEqual(first.color.alpha, 0.4);
                assert.strictEqual(first.range.start.line, 0);
                assert.strictEqual(first.range.start.character, 0);
                assert.strictEqual(first.range.end.line, 0);
                assert.strictEqual(first.range.end.character, 20);
            });
        })
            .then(() => {
            const color = new types.Color(0.5, 0.6, 0.7, 0.8);
            const range = new types.Range(0, 0, 0, 20);
            return commands
                .executeCommand('vscode.executeColorPresentationProvider', color, { uri: model.uri, range })
                .then((value) => {
                assert.strictEqual(value.length, 1);
                const [first] = value;
                assert.strictEqual(first.label, '#ABC');
                assert.strictEqual(first.textEdit.newText, '#ABC');
                assert.strictEqual(first.textEdit.range.start.line, 1);
                assert.strictEqual(first.textEdit.range.start.character, 0);
                assert.strictEqual(first.textEdit.range.end.line, 1);
                assert.strictEqual(first.textEdit.range.end.character, 20);
                assert.strictEqual(first.additionalTextEdits.length, 1);
                assert.strictEqual(first.additionalTextEdits[0].range.start.line, 2);
                assert.strictEqual(first.additionalTextEdits[0].range.start.character, 20);
                assert.strictEqual(first.additionalTextEdits[0].range.end.line, 2);
                assert.strictEqual(first.additionalTextEdits[0].range.end.character, 20);
            });
        });
    });
    test('"TypeError: e.onCancellationRequested is not a function" calling hover provider in Insiders #54174', function () {
        disposables.push(extHost.registerHoverProvider(nullExtensionDescription, defaultSelector, {
            provideHover() {
                return new types.Hover('fofofofo');
            },
        }));
        return rpcProtocol.sync().then(() => {
            return commands
                .executeCommand('vscode.executeHoverProvider', model.uri, new types.Position(1, 1))
                .then((value) => {
                assert.strictEqual(value.length, 1);
                assert.strictEqual(value[0].contents.length, 1);
            });
        });
    });
    // --- inline hints
    testApiCmd('Inlay Hints, back and forth', async function () {
        disposables.push(extHost.registerInlayHintsProvider(nullExtensionDescription, defaultSelector, {
            provideInlayHints() {
                return [new types.InlayHint(new types.Position(0, 1), 'Foo')];
            },
        }));
        await rpcProtocol.sync();
        const value = await commands.executeCommand('vscode.executeInlayHintProvider', model.uri, new types.Range(0, 0, 20, 20));
        assert.strictEqual(value.length, 1);
        const [first] = value;
        assert.strictEqual(first.label, 'Foo');
        assert.strictEqual(first.position.line, 0);
        assert.strictEqual(first.position.character, 1);
    });
    testApiCmd('Inline Hints, merge', async function () {
        disposables.push(extHost.registerInlayHintsProvider(nullExtensionDescription, defaultSelector, {
            provideInlayHints() {
                const part = new types.InlayHintLabelPart('Bar');
                part.tooltip = 'part_tooltip';
                part.command = { command: 'cmd', title: 'part' };
                const hint = new types.InlayHint(new types.Position(10, 11), [part]);
                hint.tooltip = 'hint_tooltip';
                hint.paddingLeft = true;
                hint.paddingRight = false;
                return [hint];
            },
        }));
        disposables.push(extHost.registerInlayHintsProvider(nullExtensionDescription, defaultSelector, {
            provideInlayHints() {
                const hint = new types.InlayHint(new types.Position(0, 1), 'Foo', types.InlayHintKind.Parameter);
                hint.textEdits = [types.TextEdit.insert(new types.Position(0, 0), 'Hello')];
                return [hint];
            },
        }));
        await rpcProtocol.sync();
        const value = await commands.executeCommand('vscode.executeInlayHintProvider', model.uri, new types.Range(0, 0, 20, 20));
        assert.strictEqual(value.length, 2);
        const [first, second] = value;
        assert.strictEqual(first.label, 'Foo');
        assert.strictEqual(first.position.line, 0);
        assert.strictEqual(first.position.character, 1);
        assert.strictEqual(first.textEdits?.length, 1);
        assert.strictEqual(first.textEdits[0].newText, 'Hello');
        assert.strictEqual(second.position.line, 10);
        assert.strictEqual(second.position.character, 11);
        assert.strictEqual(second.paddingLeft, true);
        assert.strictEqual(second.paddingRight, false);
        assert.strictEqual(second.tooltip, 'hint_tooltip');
        const label = second.label[0];
        assertType(label instanceof types.InlayHintLabelPart);
        assert.strictEqual(label.value, 'Bar');
        assert.strictEqual(label.tooltip, 'part_tooltip');
        assert.strictEqual(label.command?.command, 'cmd');
        assert.strictEqual(label.command?.title, 'part');
    });
    testApiCmd('Inline Hints, bad provider', async function () {
        disposables.push(extHost.registerInlayHintsProvider(nullExtensionDescription, defaultSelector, {
            provideInlayHints() {
                return [new types.InlayHint(new types.Position(0, 1), 'Foo')];
            },
        }));
        disposables.push(extHost.registerInlayHintsProvider(nullExtensionDescription, defaultSelector, {
            provideInlayHints() {
                throw new Error();
            },
        }));
        await rpcProtocol.sync();
        const value = await commands.executeCommand('vscode.executeInlayHintProvider', model.uri, new types.Range(0, 0, 20, 20));
        assert.strictEqual(value.length, 1);
        const [first] = value;
        assert.strictEqual(first.label, 'Foo');
        assert.strictEqual(first.position.line, 0);
        assert.strictEqual(first.position.character, 1);
    });
    // --- selection ranges
    test('Selection Range, back and forth', async function () {
        disposables.push(extHost.registerSelectionRangeProvider(nullExtensionDescription, defaultSelector, {
            provideSelectionRanges() {
                return [
                    new types.SelectionRange(new types.Range(0, 10, 0, 18), new types.SelectionRange(new types.Range(0, 2, 0, 20))),
                ];
            },
        }));
        await rpcProtocol.sync();
        const value = await commands.executeCommand('vscode.executeSelectionRangeProvider', model.uri, [new types.Position(0, 10)]);
        assert.strictEqual(value.length, 1);
        assert.ok(value[0].parent);
    });
    // --- call hierarchy
    test('CallHierarchy, back and forth', async function () {
        disposables.push(extHost.registerCallHierarchyProvider(nullExtensionDescription, defaultSelector, new (class {
            prepareCallHierarchy(document, position) {
                return new types.CallHierarchyItem(types.SymbolKind.Constant, 'ROOT', 'ROOT', document.uri, new types.Range(0, 0, 0, 0), new types.Range(0, 0, 0, 0));
            }
            provideCallHierarchyIncomingCalls(item, token) {
                return [
                    new types.CallHierarchyIncomingCall(new types.CallHierarchyItem(types.SymbolKind.Constant, 'INCOMING', 'INCOMING', item.uri, new types.Range(0, 0, 0, 0), new types.Range(0, 0, 0, 0)), [new types.Range(0, 0, 0, 0)]),
                ];
            }
            provideCallHierarchyOutgoingCalls(item, token) {
                return [
                    new types.CallHierarchyOutgoingCall(new types.CallHierarchyItem(types.SymbolKind.Constant, 'OUTGOING', 'OUTGOING', item.uri, new types.Range(0, 0, 0, 0), new types.Range(0, 0, 0, 0)), [new types.Range(0, 0, 0, 0)]),
                ];
            }
        })()));
        await rpcProtocol.sync();
        const root = await commands.executeCommand('vscode.prepareCallHierarchy', model.uri, new types.Position(0, 0));
        assert.ok(Array.isArray(root));
        assert.strictEqual(root.length, 1);
        assert.strictEqual(root[0].name, 'ROOT');
        const incoming = await commands.executeCommand('vscode.provideIncomingCalls', root[0]);
        assert.strictEqual(incoming.length, 1);
        assert.strictEqual(incoming[0].from.name, 'INCOMING');
        const outgoing = await commands.executeCommand('vscode.provideOutgoingCalls', root[0]);
        assert.strictEqual(outgoing.length, 1);
        assert.strictEqual(outgoing[0].to.name, 'OUTGOING');
    });
    test('prepareCallHierarchy throws TypeError if clangd returns empty result #137415', async function () {
        disposables.push(extHost.registerCallHierarchyProvider(nullExtensionDescription, defaultSelector, new (class {
            prepareCallHierarchy(document, position) {
                return [];
            }
            provideCallHierarchyIncomingCalls(item, token) {
                return [];
            }
            provideCallHierarchyOutgoingCalls(item, token) {
                return [];
            }
        })()));
        await rpcProtocol.sync();
        const root = await commands.executeCommand('vscode.prepareCallHierarchy', model.uri, new types.Position(0, 0));
        assert.ok(Array.isArray(root));
        assert.strictEqual(root.length, 0);
    });
    // --- type hierarchy
    test('TypeHierarchy, back and forth', async function () {
        disposables.push(extHost.registerTypeHierarchyProvider(nullExtensionDescription, defaultSelector, new (class {
            prepareTypeHierarchy(document, position, token) {
                return [
                    new types.TypeHierarchyItem(types.SymbolKind.Constant, 'ROOT', 'ROOT', document.uri, new types.Range(0, 0, 0, 0), new types.Range(0, 0, 0, 0)),
                ];
            }
            provideTypeHierarchySupertypes(item, token) {
                return [
                    new types.TypeHierarchyItem(types.SymbolKind.Constant, 'SUPER', 'SUPER', item.uri, new types.Range(0, 0, 0, 0), new types.Range(0, 0, 0, 0)),
                ];
            }
            provideTypeHierarchySubtypes(item, token) {
                return [
                    new types.TypeHierarchyItem(types.SymbolKind.Constant, 'SUB', 'SUB', item.uri, new types.Range(0, 0, 0, 0), new types.Range(0, 0, 0, 0)),
                ];
            }
        })()));
        await rpcProtocol.sync();
        const root = await commands.executeCommand('vscode.prepareTypeHierarchy', model.uri, new types.Position(0, 0));
        assert.ok(Array.isArray(root));
        assert.strictEqual(root.length, 1);
        assert.strictEqual(root[0].name, 'ROOT');
        const incoming = await commands.executeCommand('vscode.provideSupertypes', root[0]);
        assert.strictEqual(incoming.length, 1);
        assert.strictEqual(incoming[0].name, 'SUPER');
        const outgoing = await commands.executeCommand('vscode.provideSubtypes', root[0]);
        assert.strictEqual(outgoing.length, 1);
        assert.strictEqual(outgoing[0].name, 'SUB');
    });
    test('selectionRangeProvider on inner array always returns outer array #91852', async function () {
        disposables.push(extHost.registerSelectionRangeProvider(nullExtensionDescription, defaultSelector, {
            provideSelectionRanges(_doc, positions) {
                const [first] = positions;
                return [
                    new types.SelectionRange(new types.Range(first.line, first.character, first.line, first.character)),
                ];
            },
        }));
        await rpcProtocol.sync();
        const value = await commands.executeCommand('vscode.executeSelectionRangeProvider', model.uri, [new types.Position(0, 10)]);
        assert.strictEqual(value.length, 1);
        assert.strictEqual(value[0].range.start.line, 0);
        assert.strictEqual(value[0].range.start.character, 10);
        assert.strictEqual(value[0].range.end.line, 0);
        assert.strictEqual(value[0].range.end.character, 10);
    });
    test('more element test of selectionRangeProvider on inner array always returns outer array #91852', async function () {
        disposables.push(extHost.registerSelectionRangeProvider(nullExtensionDescription, defaultSelector, {
            provideSelectionRanges(_doc, positions) {
                const [first, second] = positions;
                return [
                    new types.SelectionRange(new types.Range(first.line, first.character, first.line, first.character)),
                    new types.SelectionRange(new types.Range(second.line, second.character, second.line, second.character)),
                ];
            },
        }));
        await rpcProtocol.sync();
        const value = await commands.executeCommand('vscode.executeSelectionRangeProvider', model.uri, [new types.Position(0, 0), new types.Position(0, 10)]);
        assert.strictEqual(value.length, 2);
        assert.strictEqual(value[0].range.start.line, 0);
        assert.strictEqual(value[0].range.start.character, 0);
        assert.strictEqual(value[0].range.end.line, 0);
        assert.strictEqual(value[0].range.end.character, 0);
        assert.strictEqual(value[1].range.start.line, 0);
        assert.strictEqual(value[1].range.start.character, 10);
        assert.strictEqual(value[1].range.end.line, 0);
        assert.strictEqual(value[1].range.end.character, 10);
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0SG9zdEFwaUNvbW1hbmRzLnRlc3QuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvS3ZhbnRrb2RlLXByb2plY3QvS3ZhbnRrb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9hcGkvdGVzdC9icm93c2VyL2V4dEhvc3RBcGlDb21tYW5kcy50ZXN0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sNkRBQTZELENBQUE7QUFDcEUsT0FBTyx5REFBeUQsQ0FBQTtBQUNoRSxPQUFPLDJFQUEyRSxDQUFBO0FBQ2xGLE9BQU8scURBQXFELENBQUE7QUFDNUQsT0FBTywrREFBK0QsQ0FBQTtBQUN0RSxPQUFPLHVFQUF1RSxDQUFBO0FBQzlFLE9BQU8sc0RBQXNELENBQUE7QUFDN0QsT0FBTyxzREFBc0QsQ0FBQTtBQUM3RCxPQUFPLDJFQUEyRSxDQUFBO0FBQ2xGLE9BQU8sK0RBQStELENBQUE7QUFDdEUsT0FBTyx1REFBdUQsQ0FBQTtBQUM5RCxPQUFPLHFEQUFxRCxDQUFBO0FBQzVELE9BQU8sdUVBQXVFLENBQUE7QUFFOUUsT0FBTyxNQUFNLE1BQU0sUUFBUSxDQUFBO0FBQzNCLE9BQU8sRUFBRSx5QkFBeUIsRUFBRSxZQUFZLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQTtBQUMzRixPQUFPLEVBQUUsR0FBRyxFQUFFLE1BQU0sZ0NBQWdDLENBQUE7QUFDcEQsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLGtDQUFrQyxDQUFBO0FBQ3hELE9BQU8sS0FBSyxLQUFLLE1BQU0sOEJBQThCLENBQUE7QUFDckQsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLGlEQUFpRCxDQUFBO0FBQ2pGLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSw4QkFBOEIsQ0FBQTtBQUM5RCxPQUFPLEVBQUUsYUFBYSxFQUFFLE1BQU0sc0RBQXNELENBQUE7QUFDcEYsT0FBTyxFQUFFLGNBQWMs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QyxNQUFNLENBQUMsUUFBUyxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsSUFBSSxFQUFFLENBQUMsQ0FBQyxDQUFBO1FBQ3RELE1BQU0sQ0FBQyxXQUFXLENBQUMsTUFBTSxDQUFDLFFBQVMsQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLFNBQVMsRUFBRSxDQUFDLENBQUMsQ0FBQTtRQUMzRCxNQUFNLENBQUMsV0FBVyxDQUFDLEtBQUssQ0FBQyxLQUFLLEVBQUUsT0FBTyxDQUFDLENBQUE7UUFDeEMsTUFBTSxDQUFDLFdBQVcsQ0FBQyxLQUFLLENBQUMsUUFBUyxDQUFDLE9BQU8sRUFBRSxRQUFRLENBQUMsQ0FBQTtRQUNyRCxNQUFNLENBQUMsV0FBVyxDQUFDLEtBQUssQ0FBQyxRQUFTLENBQUMsS0FBSyxDQUFDLEtBQUssQ0FBQyxJQUFJLEVBQUUsQ0FBQyxDQUFDLENBQUE7UUFDdkQsTUFBTSxDQUFDLFdBQVcsQ0FBQyxLQUFLLENBQUMsUUFBUyxDQUFDLEtBQUssQ0FBQyxLQUFLLENBQUMsU0FBUyxFQUFFLENBQUMsQ0FBQyxDQUFBO1FBQzVELE1BQU0sQ0FBQyxXQUFXLENBQUMsS0FBSyxDQUFDLFFBQVMsQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLElBQUksRUFBRSxDQUFDLENBQUMsQ0FBQTtRQUNyRCxNQUFNLENBQUMsV0FBVyxDQUFDLEtBQUssQ0FBQyxRQUFTLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxTQUFTLEVBQUUsQ0FBQyxDQUFDLENBQUE7UUFDMUQsTUFBTSxDQUFDLFdBQVcsQ0FBQyxNQUFNLENBQUMsS0FBSyxFQUFFLE9BQU8sQ0FBQyxDQUFBO1FBQ3pDLE1BQU0sQ0FBQyxXQUFXLENBQUMsTUFBTSxDQUFDLFFBQVEsRUFBRSxTQUFTLENBQUMsQ0FBQTtRQUM5QyxNQUFNLEtBQUssR0FBUSxNQUFNLENBQUMsS0FBTSxDQUFBO1FBQ2hDLE1BQU0sQ0FBQyxFQUFFLENBQUMsS0FBSyxDQUFDLEtBQUssQ0FBQyxPQUFPLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQTtRQUNyQyxN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QyxFQUN0QyxLQUFLLENBQUMsR0FBRyxFQUNULENBQUMsSUFBSSxLQUFLLENBQUMsUUFBUSxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsRUFBRSxJQUFJLEtBQUssQ0FBQyxRQUFRLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDLENBQ3JELENBQUE7UUFDRCxNQUFNLENBQUMsV0FBVyxDQUFDLEtBQUssQ0FBQyxNQUFNLEVBQUUsQ0FBQyxDQUFDLENBQUE7UUFDbkMsTUFBTSxDQUFDLFdBQVcsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLEtBQUssQ0FBQyxJQUFJLEVBQUUsQ0FBQyxDQUFDLENBQUE7UUFDaEQsTUFBTSxDQUFDLFdBQVcsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLEtBQUssQ0FBQyxTQUFTLEVBQUUsQ0FBQyxDQUFDLENBQUE7UUFDckQsTUFBTSxDQUFDLFdBQVcsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxJQUFJLEVBQUUsQ0FBQyxDQUFDLENBQUE7UUFDOUMsTUFBTSxDQUFDLFdBQVcsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxTQUFTLEVBQUUsQ0FBQyxDQUFDLENBQUE7UUFDbkQsTUFBTSxDQUFDLFdBQVcsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLEtBQUssQ0FBQyxJQUFJLEVBQUUsQ0FBQyxDQUFDLENBQUE7UUFDaEQsTUFBTSxDQUFDLFdBQVcsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLEtBQUssQ0FBQyxTQUFTLEVBQUUsRUFBRSxDQUFDLENBQUE7UUFDdEQsTUFBTSxDQUFDLFdBQVcsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxJQUFJLEVBQUUsQ0FBQyxDQUFDLENBQUE7UUFDOUMsTUFBTSxDQUFDLFdBQVcsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxTQUFTLEVBQUUsRUFBRSxDQUFDLENBQUE7SUFDckQsQ0FBQyxDQUFDLENBQUE7QUFDSCxDQUFDLENBQUMsQ0FBQSJ9