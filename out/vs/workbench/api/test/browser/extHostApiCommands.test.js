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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0SG9zdEFwaUNvbW1hbmRzLnRlc3QuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvYXBpL3Rlc3QvYnJvd3Nlci9leHRIb3N0QXBpQ29tbWFuZHMudGVzdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLDZEQUE2RCxDQUFBO0FBQ3BFLE9BQU8seURBQXlELENBQUE7QUFDaEUsT0FBTywyRUFBMkUsQ0FBQTtBQUNsRixPQUFPLHFEQUFxRCxDQUFBO0FBQzVELE9BQU8sK0RBQStELENBQUE7QUFDdEUsT0FBTyx1RUFBdUUsQ0FBQTtBQUM5RSxPQUFPLHNEQUFzRCxDQUFBO0FBQzdELE9BQU8sc0RBQXNELENBQUE7QUFDN0QsT0FBTywyRUFBMkUsQ0FBQTtBQUNsRixPQUFPLCtEQUErRCxDQUFBO0FBQ3RFLE9BQU8sdURBQXVELENBQUE7QUFDOUQsT0FBTyxxREFBcUQsQ0FBQTtBQUM1RCxPQUFPLHVFQUF1RSxDQUFBO0FBRTlFLE9BQU8sTUFBTSxNQUFNLFFBQVEsQ0FBQTtBQUMzQixPQUFPLEVBQUUseUJBQXlCLEVBQUUsWUFBWSxFQUFFLE1BQU0sbUNBQW1DLENBQUE7QUFDM0YsT0FBTyxFQUFFLEdBQUcsRUFBRSxNQUFNLGdDQUFnQyxDQUFBO0FBQ3BELE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQTtBQUN4RCxPQUFPLEtBQUssS0FBSyxNQUFNLDhCQUE4QixDQUFBO0FBQ3JELE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSxpREFBaUQsQ0FBQTtBQUNqRixPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sOEJBQThCLENBQUE7QUFDOUQsT0FBTyxFQUFFLGFBQWEsRUFBRSxNQUFNLHNEQUFzRCxDQUFBO0FBQ3BGLE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSxnREFBZ0QsQ0FBQTtB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QUFLLENBQUMsR0FBRyxDQUFDLElBQUksRUFBRSxDQUFDLENBQUMsQ0FBQTtRQUN0RCxNQUFNLENBQUMsV0FBVyxDQUFDLE1BQU0sQ0FBQyxRQUFTLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxTQUFTLEVBQUUsQ0FBQyxDQUFDLENBQUE7UUFDM0QsTUFBTSxDQUFDLFdBQVcsQ0FBQyxLQUFLLENBQUMsS0FBSyxFQUFFLE9BQU8sQ0FBQyxDQUFBO1FBQ3hDLE1BQU0sQ0FBQyxXQUFXLENBQUMsS0FBSyxDQUFDLFFBQVMsQ0FBQyxPQUFPLEVBQUUsUUFBUSxDQUFDLENBQUE7UUFDckQsTUFBTSxDQUFDLFdBQVcsQ0FBQyxLQUFLLENBQUMsUUFBUyxDQUFDLEtBQUssQ0FBQyxLQUFLLENBQUMsSUFBSSxFQUFFLENBQUMsQ0FBQyxDQUFBO1FBQ3ZELE1BQU0sQ0FBQyxXQUFXLENBQUMsS0FBSyxDQUFDLFFBQVMsQ0FBQyxLQUFLLENBQUMsS0FBSyxDQUFDLFNBQVMsRUFBRSxDQUFDLENBQUMsQ0FBQTtRQUM1RCxNQUFNLENBQUMsV0FBVyxDQUFDLEtBQUssQ0FBQyxRQUFTLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxJQUFJLEVBQUUsQ0FBQyxDQUFDLENBQUE7UUFDckQsTUFBTSxDQUFDLFdBQVcsQ0FBQyxLQUFLLENBQUMsUUFBUyxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsU0FBUyxFQUFFLENBQUMsQ0FBQyxDQUFBO1FBQzFELE1BQU0sQ0FBQyxXQUFXLENBQUMsTUFBTSxDQUFDLEtBQUssRUFBRSxPQUFPLENBQUMsQ0FBQTtRQUN6QyxNQUFNLENBQUMsV0FBVyxDQUFDLE1BQU0sQ0FBQyxRQUFRLEVBQUUsU0FBUyxDQUFDLENBQUE7UUFDOUMsTUFBTSxLQUFLLEdBQVEsTUFBTSxDQUFDLEtBQU0sQ0FBQTtRQUNoQyxNQUFNLENBQUMsRUFBRSxDQUFDLEtBQUssQ0FBQyxLQUFLLENBQUMsT0FBTyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUE7UUFDckMsTUFBTSxDQUFDLFdBQVcsQ0FBQyxLQUFL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RUFDVCxDQUFDLElBQUksS0FBSyxDQUFDLFFBQVEsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLEVBQUUsSUFBSSxLQUFLLENBQUMsUUFBUSxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQyxDQUNyRCxDQUFBO1FBQ0QsTUFBTSxDQUFDLFdBQVcsQ0FBQyxLQUFLLENBQUMsTUFBTSxFQUFFLENBQUMsQ0FBQyxDQUFBO1FBQ25DLE1BQU0sQ0FBQyxXQUFXLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxLQUFLLENBQUMsSUFBSSxFQUFFLENBQUMsQ0FBQyxDQUFBO1FBQ2hELE1BQU0sQ0FBQyxXQUFXLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxLQUFLLENBQUMsU0FBUyxFQUFFLENBQUMsQ0FBQyxDQUFBO1FBQ3JELE1BQU0sQ0FBQyxXQUFXLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsSUFBSSxFQUFFLENBQUMsQ0FBQyxDQUFBO1FBQzlDLE1BQU0sQ0FBQyxXQUFXLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsU0FBUyxFQUFFLENBQUMsQ0FBQyxDQUFBO1FBQ25ELE1BQU0sQ0FBQyxXQUFXLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxLQUFLLENBQUMsSUFBSSxFQUFFLENBQUMsQ0FBQyxDQUFBO1FBQ2hELE1BQU0sQ0FBQyxXQUFXLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxLQUFLLENBQUMsU0FBUyxFQUFFLEVBQUUsQ0FBQyxDQUFBO1FBQ3RELE1BQU0sQ0FBQyxXQUFXLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsSUFBSSxFQUFFLENBQUMsQ0FBQyxDQUFBO1FBQzlDLE1BQU0sQ0FBQyxXQUFXLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsU0FBUyxFQUFFLEVBQUUsQ0FBQyxDQUFBO0lBQ3JELENBQUMsQ0FBQyxDQUFBO0FBQ0gsQ0FBQyxDQUFDLENBQUEifQ==