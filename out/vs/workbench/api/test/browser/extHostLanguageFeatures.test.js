/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { TestInstantiationService } from '../../../../platform/instantiation/test/common/instantiationServiceMock.js';
import { setUnexpectedErrorHandler, errorHandler } from '../../../../base/common/errors.js';
import { URI } from '../../../../base/common/uri.js';
import * as types from '../../common/extHostTypes.js';
import { createTextModel } from '../../../../editor/test/common/testTextModel.js';
import { Position as EditorPosition, Position } from '../../../../editor/common/core/position.js';
import { Range as EditorRange } from '../../../../editor/common/core/range.js';
import { TestRPCProtocol } from '../common/testRPCProtocol.js';
import { IMarkerService } from '../../../../platform/markers/common/markers.js';
import { MarkerService } from '../../../../platform/markers/common/markerService.js';
import { ExtHostLanguageFeatures } from '../../common/extHostLanguageFeatures.js';
import { MainThreadLanguageFeatures } from '../../browser/mainThreadLanguageFeatures.js';
import { ExtHostCommands } from '../../common/extHostCommands.js';
import { MainThreadCommands } from '../../browser/mainThreadCommands.js';
import { ExtHostDocuments } from '../../common/extHostDocuments.js';
import { ExtHostDocumentsAndEditors } from '../../common/extHostDocumentsAndEditors.js';
import * as languages from '../../../../editor/common/languages.js';
import { getCodeLensModel } from '../../../../editor/contrib/codelens/browser/codelens.js';
import { getDefinitionsAtPosition, getImplementationsAtPosition, getTypeDefinitionsAtPosition, getDeclarationsAtPosition, getReferencesAtPosition, } from '../../../../editor/contrib/gotoSymbol/browser/goToSymbol.js';
import { getHoversPromise } from '../../../../editor/contrib/hover/browser/getHover.js';
import { getOccurrencesAtPosition } from '../../../../editor/contrib/wordHighlighter/browser/wordHighlighter.js';
import { getCodeActions } from '../../../../editor/contrib/codeAction/browser/codeAction.js';
import { getWorkspaceSymbols } from '../../../contrib/search/common/search.js';
import { rename } from '../../../../editor/contrib/rename/browser/rename.js';
import { provideSignatureHelp } from '../../../../editor/contrib/parameterHints/browser/provideSignatureHelp.js';
import { provideSuggestionItems, CompletionOptions, } from '../../../../editor/contrib/suggest/browser/suggest.js';
import { getDocumentFormattingEditsUntilResult, getDocumentRangeFormattingEditsUntilResult, getOnTypeFormattingEdits, } from '../../../../editor/contrib/format/browser/format.js';
import { getLinks } from '../../../../editor/contrib/links/browser/getLinks.js';
import { MainContext, ExtHostContext } from '../../common/extHost.protocol.js';
import { ExtHostDiagnostics } from '../../common/extHostDiagnostics.js';
import { NullLogService } from '../../../../platform/log/common/log.js';
import { getColors } from '../../../../editor/contrib/colorPicker/browser/color.js';
import { CancellationToken } from '../../../../base/common/cancellation.js';
import { nullExtensionDescription as defaultExtension } from '../../../services/extensions/common/extensions.js';
import { provideSelectionRanges } from '../../../../editor/contrib/smartSelect/browser/smartSelect.js';
import { mock } from '../../../../base/test/common/mock.js';
import { DisposableStore } from '../../../../base/common/lifecycle.js';
import { NullApiDeprecationService } from '../../common/extHostApiDeprecationService.js';
import { Progress } from '../../../../platform/progress/common/progress.js';
import { URITransformerService } from '../../common/extHostUriTransformerService.js';
import { OutlineModel } from '../../../../editor/contrib/documentSymbols/browser/outlineModel.js';
import { ILanguageFeaturesService } from '../../../../editor/common/services/languageFeatures.js';
import { LanguageFeaturesService } from '../../../../editor/common/services/languageFeaturesService.js';
import { CodeActionTriggerSource } from '../../../../editor/contrib/codeAction/common/types.js';
import { IUriIdentityService } from '../../../../platform/uriIdentity/common/uriIdentity.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../base/test/common/utils.js';
import { runWithFakedTimers } from '../../../../base/test/common/timeTravelScheduler.js';
suite('ExtHostLanguageFeatures', function () {
    const defaultSelector = { scheme: 'far' };
    let model;
    let extHost;
    let mainThread;
    const disposables = new DisposableStore();
    let rpcProtocol;
    let languageFeaturesService;
    let originalErrorHandler;
    let instantiationService;
    setup(() => {
        model = createTextModel(['This is the first line', 'This is the second line', 'This is the third line'].join('\n'), undefined, undefined, URI.parse('far://testing/file.a'));
        rpcProtocol = new TestRPCProtocol();
        languageFeaturesService = new LanguageFeaturesService();
        // Use IInstantiationService to get typechecking when instantiating
        let inst;
        {
            instantiationService = new TestInstantiationService();
            instantiationService.stub(IMarkerService, MarkerService);
            instantiationService.set(ILanguageFeaturesService, languageFeaturesService);
            instantiationService.set(IUriIdentityService, new (class extends mock() {
                asCanonicalUri(uri) {
                    return uri;
                }
            })());
            inst = instantiationService;
        }
        originalErrorHandler = errorHandler.getUnexpectedErrorHandler();
        setUnexpectedErrorHandler(() => { });
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
        const commands = new ExtHostCommands(rpcProtocol, new NullLogService(), new (class extends mock() {
            onExtensionError() {
                return true;
            }
        })());
        rpcProtocol.set(ExtHostContext.ExtHostCommands, commands);
        rpcProtocol.set(MainContext.MainThreadCommands, disposables.add(inst.createInstance(MainThreadCommands, rpcProtocol)));
        const diagnostics = new ExtHostDiagnostics(rpcProtocol, new NullLogService(), new (class extends mock() {
        })(), extHostDocumentsAndEditors);
        rpcProtocol.set(ExtHostContext.ExtHostDiagnostics, diagnostics);
        extHost = new ExtHostLanguageFeatures(rpcProtocol, new URITransformerService(null), extHostDocuments, commands, diagnostics, new NullLogService(), NullApiDeprecationService, new (class extends mock() {
            onExtensionError() {
                return true;
            }
        })());
        rpcProtocol.set(ExtHostContext.ExtHostLanguageFeatures, extHost);
        mainThread = rpcProtocol.set(MainContext.MainThreadLanguageFeatures, disposables.add(inst.createInstance(MainThreadLanguageFeatures, rpcProtocol)));
    });
    teardown(() => {
        disposables.clear();
        setUnexpectedErrorHandler(originalErrorHandler);
        model.dispose();
        mainThread.dispose();
        instantiationService.dispose();
        return rpcProtocol.sync();
    });
    ensureNoDisposablesAreLeakedInTestSuite();
    // --- outline
    test('DocumentSymbols, register/deregister', async () => {
        assert.strictEqual(languageFeaturesService.documentSymbolProvider.all(model).length, 0);
        const d1 = extHost.registerDocumentSymbolProvider(defaultExtension, defaultSelector, new (class {
            provideDocumentSymbols() {
                return [];
            }
        })());
        await rpcProtocol.sync();
        assert.strictEqual(languageFeaturesService.documentSymbolProvider.all(model).length, 1);
        d1.dispose();
        return rpcProtocol.sync();
    });
    test('DocumentSymbols, evil provider', async () => {
        disposables.add(extHost.registerDocumentSymbolProvider(defaultExtension, defaultSelector, new (class {
            provideDocumentSymbols() {
                throw new Error('evil document symbol provider');
            }
        })()));
        disposables.add(extHost.registerDocumentSymbolProvider(defaultExtension, defaultSelector, new (class {
            provideDocumentSymbols() {
                return [
                    new types.SymbolInformation('test', types.SymbolKind.Field, new types.Range(0, 0, 0, 0)),
                ];
            }
        })()));
        await rpcProtocol.sync();
        const value = (await OutlineModel.create(languageFeaturesService.documentSymbolProvider, model, CancellationToken.None)).asListOfDocumentSymbols();
        assert.strictEqual(value.length, 1);
    });
    test('DocumentSymbols, data conversion', async () => {
        disposables.add(extHost.registerDocumentSymbolProvider(defaultExtension, defaultSelector, new (class {
            provideDocumentSymbols() {
                return [
                    new types.SymbolInformation('test', types.SymbolKind.Field, new types.Range(0, 0, 0, 0)),
                ];
            }
        })()));
        await rpcProtocol.sync();
        const value = (await OutlineModel.create(languageFeaturesService.documentSymbolProvider, model, CancellationToken.None)).asListOfDocumentSymbols();
        assert.strictEqual(value.length, 1);
        const entry = value[0];
        assert.strictEqual(entry.name, 'test');
        assert.deepStrictEqual(entry.range, {
            startLineNumber: 1,
            startColumn: 1,
            endLineNumber: 1,
            endColumn: 1,
        });
    });
    test('Quick Outline uses a not ideal sorting, #138502', async function () {
        const symbols = [
            {
                name: 'containers',
                range: { startLineNumber: 1, startColumn: 1, endLineNumber: 4, endColumn: 26 },
            },
            {
                name: 'container 0',
                range: { startLineNumber: 2, startColumn: 5, endLineNumber: 5, endColumn: 1 },
            },
            {
                name: 'name',
                range: { startLineNumber: 2, startColumn: 5, endLineNumber: 2, endColumn: 16 },
            },
            {
                name: 'ports',
                range: { startLineNumber: 3, startColumn: 5, endLineNumber: 5, endColumn: 1 },
            },
            {
                name: 'ports 0',
                range: { startLineNumber: 4, startColumn: 9, endLineNumber: 4, endColumn: 26 },
            },
            {
                name: 'containerPort',
                range: { startLineNumber: 4, startColumn: 9, endLineNumber: 4, endColumn: 26 },
            },
        ];
        disposables.add(extHost.registerDocumentSymbolProvider(defaultExtension, defaultSelector, {
            provideDocumentSymbols: (doc, token) => {
                return symbols.map((s) => {
                    return new types.SymbolInformation(s.name, types.SymbolKind.Object, new types.Range(s.range.startLineNumber - 1, s.range.startColumn - 1, s.range.endLineNumber - 1, s.range.endColumn - 1));
                });
            },
        }));
        await rpcProtocol.sync();
        const value = (await OutlineModel.create(languageFeaturesService.documentSymbolProvider, model, CancellationToken.None)).asListOfDocumentSymbols();
        assert.strictEqual(value.length, 6);
        assert.deepStrictEqual(value.map((s) => s.name), ['containers', 'container 0', 'name', 'ports', 'ports 0', 'containerPort']);
    });
    // --- code lens
    test('CodeLens, evil provider', async () => {
        return runWithFakedTimers({ useFakeTimers: true }, async () => {
            disposables.add(extHost.registerCodeLensProvider(defaultExtension, defaultSelector, new (class {
                provideCodeLenses() {
                    throw new Error('evil');
                }
            })()));
            disposables.add(extHost.registerCodeLensProvider(defaultExtension, defaultSelector, new (class {
                provideCodeLenses() {
                    return [new types.CodeLens(new types.Range(0, 0, 0, 0))];
                }
            })()));
            await rpcProtocol.sync();
            const value = await getCodeLensModel(languageFeaturesService.codeLensProvider, model, CancellationToken.None);
            assert.strictEqual(value.lenses.length, 1);
            value.dispose();
        });
    });
    test('CodeLens, do not resolve a resolved lens', async () => {
        return runWithFakedTimers({ useFakeTimers: true }, async () => {
            disposables.add(extHost.registerCodeLensProvider(defaultExtension, defaultSelector, new (class {
                provideCodeLenses() {
                    return [
                        new types.CodeLens(new types.Range(0, 0, 0, 0), { command: 'id', title: 'Title' }),
                    ];
                }
                resolveCodeLens() {
                    assert.ok(false, 'do not resolve');
                }
            })()));
            await rpcProtocol.sync();
            const value = await getCodeLensModel(languageFeaturesService.codeLensProvider, model, CancellationToken.None);
            assert.strictEqual(value.lenses.length, 1);
            const [data] = value.lenses;
            const symbol = await Promise.resolve(data.provider.resolveCodeLens(model, data.symbol, CancellationToken.None));
            assert.strictEqual(symbol.command.id, 'id');
            assert.strictEqual(symbol.command.title, 'Title');
            value.dispose();
        });
    });
    test('CodeLens, missing command', async () => {
        return runWithFakedTimers({ useFakeTimers: true }, async () => {
            disposables.add(extHost.registerCodeLensProvider(defaultExtension, defaultSelector, new (class {
                provideCodeLenses() {
                    return [new types.CodeLens(new types.Range(0, 0, 0, 0))];
                }
            })()));
            await rpcProtocol.sync();
            const value = await getCodeLensModel(languageFeaturesService.codeLensProvider, model, CancellationToken.None);
            assert.strictEqual(value.lenses.length, 1);
            const [data] = value.lenses;
            const symbol = await Promise.resolve(data.provider.resolveCodeLens(model, data.symbol, CancellationToken.None));
            assert.strictEqual(symbol, undefined);
            value.dispose();
        });
    });
    // --- definition
    test('Definition, data conversion', async () => {
        disposables.add(extHost.registerDefinitionProvider(defaultExtension, defaultSelector, new (class {
            provideDefinition() {
                return [new types.Location(model.uri, new types.Range(1, 2, 3, 4))];
            }
        })()));
        await rpcProtocol.sync();
        const value = await getDefinitionsAtPosition(languageFeaturesService.definitionProvider, model, new EditorPosition(1, 1), false, CancellationToken.None);
        assert.strictEqual(value.length, 1);
        const [entry] = value;
        assert.deepStrictEqual(entry.range, {
            startLineNumber: 2,
            startColumn: 3,
            endLineNumber: 4,
            endColumn: 5,
        });
        assert.strictEqual(entry.uri.toString(), model.uri.toString());
    });
    test('Definition, one or many', async () => {
        disposables.add(extHost.registerDefinitionProvider(defaultExtension, defaultSelector, new (class {
            provideDefinition() {
                return [new types.Location(model.uri, new types.Range(1, 1, 1, 1))];
            }
        })()));
        disposables.add(extHost.registerDefinitionProvider(defaultExtension, defaultSelector, new (class {
            provideDefinition() {
                return new types.Location(model.uri, new types.Range(2, 1, 1, 1));
            }
        })()));
        await rpcProtocol.sync();
        const value = await getDefinitionsAtPosition(languageFeaturesService.definitionProvider, model, new EditorPosition(1, 1), false, CancellationToken.None);
        assert.strictEqual(value.length, 2);
    });
    test('Definition, registration order', async () => {
        disposables.add(extHost.registerDefinitionProvider(defaultExtension, defaultSelector, new (class {
            provideDefinition() {
                return [new types.Location(URI.parse('far://first'), new types.Range(2, 3, 4, 5))];
            }
        })()));
        disposables.add(extHost.registerDefinitionProvider(defaultExtension, defaultSelector, new (class {
            provideDefinition() {
                return new types.Location(URI.parse('far://second'), new types.Range(1, 2, 3, 4));
            }
        })()));
        await rpcProtocol.sync();
        const value = await getDefinitionsAtPosition(languageFeaturesService.definitionProvider, model, new EditorPosition(1, 1), false, CancellationToken.None);
        assert.strictEqual(value.length, 2);
        // let [first, second] = value;
        assert.strictEqual(value[0].uri.authority, 'second');
        assert.strictEqual(value[1].uri.authority, 'first');
    });
    test('Definition, evil provider', async () => {
        disposables.add(extHost.registerDefinitionProvider(defaultExtension, defaultSelector, new (class {
            provideDefinition() {
                throw new Error('evil provider');
            }
        })()));
        disposables.add(extHost.registerDefinitionProvider(defaultExtension, defaultSelector, new (class {
            provideDefinition() {
                return new types.Location(model.uri, new types.Range(1, 1, 1, 1));
            }
        })()));
        await rpcProtocol.sync();
        const value = await getDefinitionsAtPosition(languageFeaturesService.definitionProvider, model, new EditorPosition(1, 1), false, CancellationToken.None);
        assert.strictEqual(value.length, 1);
    });
    // -- declaration
    test('Declaration, data conversion', async () => {
        disposables.add(extHost.registerDeclarationProvider(defaultExtension, defaultSelector, new (class {
            provideDeclaration() {
                return [new types.Location(model.uri, new types.Range(1, 2, 3, 4))];
            }
        })()));
        await rpcProtocol.sync();
        const value = await getDeclarationsAtPosition(languageFeaturesService.declarationProvider, model, new EditorPosition(1, 1), false, CancellationToken.None);
        assert.strictEqual(value.length, 1);
        const [entry] = value;
        assert.deepStrictEqual(entry.range, {
            startLineNumber: 2,
            startColumn: 3,
            endLineNumber: 4,
            endColumn: 5,
        });
        assert.strictEqual(entry.uri.toString(), model.uri.toString());
    });
    // --- implementation
    test('Implementation, data conversion', async () => {
        disposables.add(extHost.registerImplementationProvider(defaultExtension, defaultSelector, new (class {
            provideImplementation() {
                return [new types.Location(model.uri, new types.Range(1, 2, 3, 4))];
            }
        })()));
        await rpcProtocol.sync();
        const value = await getImplementationsAtPosition(languageFeaturesService.implementationProvider, model, new EditorPosition(1, 1), false, CancellationToken.None);
        assert.strictEqual(value.length, 1);
        const [entry] = value;
        assert.deepStrictEqual(entry.range, {
            startLineNumber: 2,
            startColumn: 3,
            endLineNumber: 4,
            endColumn: 5,
        });
        assert.strictEqual(entry.uri.toString(), model.uri.toString());
    });
    // --- type definition
    test('Type Definition, data conversion', async () => {
        disposables.add(extHost.registerTypeDefinitionProvider(defaultExtension, defaultSelector, new (class {
            provideTypeDefinition() {
                return [new types.Location(model.uri, new types.Range(1, 2, 3, 4))];
            }
        })()));
        await rpcProtocol.sync();
        const value = await getTypeDefinitionsAtPosition(languageFeaturesService.typeDefinitionProvider, model, new EditorPosition(1, 1), false, CancellationToken.None);
        assert.strictEqual(value.length, 1);
        const [entry] = value;
        assert.deepStrictEqual(entry.range, {
            startLineNumber: 2,
            startColumn: 3,
            endLineNumber: 4,
            endColumn: 5,
        });
        assert.strictEqual(entry.uri.toString(), model.uri.toString());
    });
    // --- extra info
    test('HoverProvider, word range at pos', async () => {
        disposables.add(extHost.registerHoverProvider(defaultExtension, defaultSelector, new (class {
            provideHover() {
                return new types.Hover('Hello');
            }
        })()));
        await rpcProtocol.sync();
        const hovers = await getHoversPromise(languageFeaturesService.hoverProvider, model, new EditorPosition(1, 1), CancellationToken.None);
        assert.strictEqual(hovers.length, 1);
        const [entry] = hovers;
        assert.deepStrictEqual(entry.range, {
            startLineNumber: 1,
            startColumn: 1,
            endLineNumber: 1,
            endColumn: 5,
        });
    });
    test('HoverProvider, given range', async () => {
        disposables.add(extHost.registerHoverProvider(defaultExtension, defaultSelector, new (class {
            provideHover() {
                return new types.Hover('Hello', new types.Range(3, 0, 8, 7));
            }
        })()));
        await rpcProtocol.sync();
        const hovers = await getHoversPromise(languageFeaturesService.hoverProvider, model, new EditorPosition(1, 1), CancellationToken.None);
        assert.strictEqual(hovers.length, 1);
        const [entry] = hovers;
        assert.deepStrictEqual(entry.range, {
            startLineNumber: 4,
            startColumn: 1,
            endLineNumber: 9,
            endColumn: 8,
        });
    });
    test('HoverProvider, registration order', async () => {
        disposables.add(extHost.registerHoverProvider(defaultExtension, defaultSelector, new (class {
            provideHover() {
                return new types.Hover('registered first');
            }
        })()));
        disposables.add(extHost.registerHoverProvider(defaultExtension, defaultSelector, new (class {
            provideHover() {
                return new types.Hover('registered second');
            }
        })()));
        await rpcProtocol.sync();
        const value = await getHoversPromise(languageFeaturesService.hoverProvider, model, new EditorPosition(1, 1), CancellationToken.None);
        assert.strictEqual(value.length, 2);
        const [first, second] = value;
        assert.strictEqual(first.contents[0].value, 'registered second');
        assert.strictEqual(second.contents[0].value, 'registered first');
    });
    test('HoverProvider, evil provider', async () => {
        disposables.add(extHost.registerHoverProvider(defaultExtension, defaultSelector, new (class {
            provideHover() {
                throw new Error('evil');
            }
        })()));
        disposables.add(extHost.registerHoverProvider(defaultExtension, defaultSelector, new (class {
            provideHover() {
                return new types.Hover('Hello');
            }
        })()));
        await rpcProtocol.sync();
        const hovers = await getHoversPromise(languageFeaturesService.hoverProvider, model, new EditorPosition(1, 1), CancellationToken.None);
        assert.strictEqual(hovers.length, 1);
    });
    // --- occurrences
    test('Occurrences, data conversion', async () => {
        disposables.add(extHost.registerDocumentHighlightProvider(defaultExtension, defaultSelector, new (class {
            provideDocumentHighlights() {
                return [new types.DocumentHighlight(new types.Range(0, 0, 0, 4))];
            }
        })()));
        await rpcProtocol.sync();
        const value = (await getOccurrencesAtPosition(languageFeaturesService.documentHighlightProvider, model, new EditorPosition(1, 2), CancellationToken.None));
        assert.strictEqual(value.size, 1);
        const [entry] = Array.from(value.values())[0];
        assert.deepStrictEqual(entry.range, {
            startLineNumber: 1,
            startColumn: 1,
            endLineNumber: 1,
            endColumn: 5,
        });
        assert.strictEqual(entry.kind, languages.DocumentHighlightKind.Text);
    });
    test('Occurrences, order 1/2', async () => {
        disposables.add(extHost.registerDocumentHighlightProvider(defaultExtension, defaultSelector, new (class {
            provideDocumentHighlights() {
                return undefined;
            }
        })()));
        disposables.add(extHost.registerDocumentHighlightProvider(defaultExtension, '*', new (class {
            provideDocumentHighlights() {
                return [new types.DocumentHighlight(new types.Range(0, 0, 0, 4))];
            }
        })()));
        await rpcProtocol.sync();
        const value = (await getOccurrencesAtPosition(languageFeaturesService.documentHighlightProvider, model, new EditorPosition(1, 2), CancellationToken.None));
        assert.strictEqual(value.size, 1);
        const [entry] = Array.from(value.values())[0];
        assert.deepStrictEqual(entry.range, {
            startLineNumber: 1,
            startColumn: 1,
            endLineNumber: 1,
            endColumn: 5,
        });
        assert.strictEqual(entry.kind, languages.DocumentHighlightKind.Text);
    });
    test('Occurrences, order 2/2', async () => {
        disposables.add(extHost.registerDocumentHighlightProvider(defaultExtension, defaultSelector, new (class {
            provideDocumentHighlights() {
                return [new types.DocumentHighlight(new types.Range(0, 0, 0, 2))];
            }
        })()));
        disposables.add(extHost.registerDocumentHighlightProvider(defaultExtension, '*', new (class {
            provideDocumentHighlights() {
                return [new types.DocumentHighlight(new types.Range(0, 0, 0, 4))];
            }
        })()));
        await rpcProtocol.sync();
        const value = (await getOccurrencesAtPosition(languageFeaturesService.documentHighlightProvider, model, new EditorPosition(1, 2), CancellationToken.None));
        assert.strictEqual(value.size, 1);
        const [entry] = Array.from(value.values())[0];
        assert.deepStrictEqual(entry.range, {
            startLineNumber: 1,
            startColumn: 1,
            endLineNumber: 1,
            endColumn: 3,
        });
        assert.strictEqual(entry.kind, languages.DocumentHighlightKind.Text);
    });
    test('Occurrences, evil provider', async () => {
        disposables.add(extHost.registerDocumentHighlightProvider(defaultExtension, defaultSelector, new (class {
            provideDocumentHighlights() {
                throw new Error('evil');
            }
        })()));
        disposables.add(extHost.registerDocumentHighlightProvider(defaultExtension, defaultSelector, new (class {
            provideDocumentHighlights() {
                return [new types.DocumentHighlight(new types.Range(0, 0, 0, 4))];
            }
        })()));
        await rpcProtocol.sync();
        const value = await getOccurrencesAtPosition(languageFeaturesService.documentHighlightProvider, model, new EditorPosition(1, 2), CancellationToken.None);
        assert.strictEqual(value.size, 1);
    });
    // --- references
    test('References, registration order', async () => {
        disposables.add(extHost.registerReferenceProvider(defaultExtension, defaultSelector, new (class {
            provideReferences() {
                return [
                    new types.Location(URI.parse('far://register/first'), new types.Range(0, 0, 0, 0)),
                ];
            }
        })()));
        disposables.add(extHost.registerReferenceProvider(defaultExtension, defaultSelector, new (class {
            provideReferences() {
                return [
                    new types.Location(URI.parse('far://register/second'), new types.Range(0, 0, 0, 0)),
                ];
            }
        })()));
        await rpcProtocol.sync();
        const value = await getReferencesAtPosition(languageFeaturesService.referenceProvider, model, new EditorPosition(1, 2), false, false, CancellationToken.None);
        assert.strictEqual(value.length, 2);
        const [first, second] = value;
        assert.strictEqual(first.uri.path, '/second');
        assert.strictEqual(second.uri.path, '/first');
    });
    test('References, data conversion', async () => {
        disposables.add(extHost.registerReferenceProvider(defaultExtension, defaultSelector, new (class {
            provideReferences() {
                return [new types.Location(model.uri, new types.Position(0, 0))];
            }
        })()));
        await rpcProtocol.sync();
        const value = await getReferencesAtPosition(languageFeaturesService.referenceProvider, model, new EditorPosition(1, 2), false, false, CancellationToken.None);
        assert.strictEqual(value.length, 1);
        const [item] = value;
        assert.deepStrictEqual(item.range, {
            startLineNumber: 1,
            startColumn: 1,
            endLineNumber: 1,
            endColumn: 1,
        });
        assert.strictEqual(item.uri.toString(), model.uri.toString());
    });
    test('References, evil provider', async () => {
        disposables.add(extHost.registerReferenceProvider(defaultExtension, defaultSelector, new (class {
            provideReferences() {
                throw new Error('evil');
            }
        })()));
        disposables.add(extHost.registerReferenceProvider(defaultExtension, defaultSelector, new (class {
            provideReferences() {
                return [new types.Location(model.uri, new types.Range(0, 0, 0, 0))];
            }
        })()));
        await rpcProtocol.sync();
        const value = await getReferencesAtPosition(languageFeaturesService.referenceProvider, model, new EditorPosition(1, 2), false, false, CancellationToken.None);
        assert.strictEqual(value.length, 1);
    });
    // --- quick fix
    test('Quick Fix, command data conversion', async () => {
        return runWithFakedTimers({ useFakeTimers: true }, async () => {
            disposables.add(extHost.registerCodeActionProvider(defaultExtension, defaultSelector, {
                provideCodeActions() {
                    return [
                        { command: 'test1', title: 'Testing1' },
                        { command: 'test2', title: 'Testing2' },
                    ];
                },
            }));
            await rpcProtocol.sync();
            const value = await getCodeActions(languageFeaturesService.codeActionProvider, model, model.getFullModelRange(), {
                type: 1 /* languages.CodeActionTriggerType.Invoke */,
                triggerAction: CodeActionTriggerSource.QuickFix,
            }, Progress.None, CancellationToken.None);
            const { validActions: actions } = value;
            assert.strictEqual(actions.length, 2);
            const [first, second] = actions;
            assert.strictEqual(first.action.title, 'Testing1');
            assert.strictEqual(first.action.command.id, 'test1');
            assert.strictEqual(second.action.title, 'Testing2');
            assert.strictEqual(second.action.command.id, 'test2');
            value.dispose();
        });
    });
    test('Quick Fix, code action data conversion', async () => {
        return runWithFakedTimers({ useFakeTimers: true }, async () => {
            disposables.add(extHost.registerCodeActionProvider(defaultExtension, defaultSelector, {
                provideCodeActions() {
                    return [
                        {
                            title: 'Testing1',
                            command: { title: 'Testing1Command', command: 'test1' },
                            kind: types.CodeActionKind.Empty.append('test.scope'),
                        },
                    ];
                },
            }));
            await rpcProtocol.sync();
            const value = await getCodeActions(languageFeaturesService.codeActionProvider, model, model.getFullModelRange(), {
                type: 1 /* languages.CodeActionTriggerType.Invoke */,
                triggerAction: CodeActionTriggerSource.Default,
            }, Progress.None, CancellationToken.None);
            const { validActions: actions } = value;
            assert.strictEqual(actions.length, 1);
            const [first] = actions;
            assert.strictEqual(first.action.title, 'Testing1');
            assert.strictEqual(first.action.command.title, 'Testing1Command');
            assert.strictEqual(first.action.command.id, 'test1');
            assert.strictEqual(first.action.kind, 'test.scope');
            value.dispose();
        });
    });
    test("Cannot read property 'id' of undefined, #29469", async () => {
        return runWithFakedTimers({ useFakeTimers: true }, async () => {
            disposables.add(extHost.registerCodeActionProvider(defaultExtension, defaultSelector, new (class {
                provideCodeActions() {
                    return [undefined, null, { command: 'test', title: 'Testing' }];
                }
            })()));
            await rpcProtocol.sync();
            const value = await getCodeActions(languageFeaturesService.codeActionProvider, model, model.getFullModelRange(), {
                type: 1 /* languages.CodeActionTriggerType.Invoke */,
                triggerAction: CodeActionTriggerSource.Default,
            }, Progress.None, CancellationToken.None);
            const { validActions: actions } = value;
            assert.strictEqual(actions.length, 1);
            value.dispose();
        });
    });
    test('Quick Fix, evil provider', async () => {
        return runWithFakedTimers({ useFakeTimers: true }, async () => {
            disposables.add(extHost.registerCodeActionProvider(defaultExtension, defaultSelector, new (class {
                provideCodeActions() {
                    throw new Error('evil');
                }
            })()));
            disposables.add(extHost.registerCodeActionProvider(defaultExtension, defaultSelector, new (class {
                provideCodeActions() {
                    return [{ command: 'test', title: 'Testing' }];
                }
            })()));
            await rpcProtocol.sync();
            const value = await getCodeActions(languageFeaturesService.codeActionProvider, model, model.getFullModelRange(), {
                type: 1 /* languages.CodeActionTriggerType.Invoke */,
                triggerAction: CodeActionTriggerSource.QuickFix,
            }, Progress.None, CancellationToken.None);
            const { validActions: actions } = value;
            assert.strictEqual(actions.length, 1);
            value.dispose();
        });
    });
    // --- navigate types
    test('Navigate types, evil provider', async () => {
        disposables.add(extHost.registerWorkspaceSymbolProvider(defaultExtension, new (class {
            provideWorkspaceSymbols() {
                throw new Error('evil');
            }
        })()));
        disposables.add(extHost.registerWorkspaceSymbolProvider(defaultExtension, new (class {
            provideWorkspaceSymbols() {
                return [
                    new types.SymbolInformation('testing', types.SymbolKind.Array, new types.Range(0, 0, 1, 1)),
                ];
            }
        })()));
        await rpcProtocol.sync();
        const value = await getWorkspaceSymbols('');
        assert.strictEqual(value.length, 1);
        const [first] = value;
        assert.strictEqual(first.symbol.name, 'testing');
    });
    test('Navigate types, de-duplicate results', async () => {
        const uri = URI.from({ scheme: 'foo', path: '/some/path' });
        disposables.add(extHost.registerWorkspaceSymbolProvider(defaultExtension, new (class {
            provideWorkspaceSymbols() {
                return [
                    new types.SymbolInformation('ONE', types.SymbolKind.Array, undefined, new types.Location(uri, new types.Range(0, 0, 1, 1))),
                ];
            }
        })()));
        disposables.add(extHost.registerWorkspaceSymbolProvider(defaultExtension, new (class {
            provideWorkspaceSymbols() {
                return [
                    new types.SymbolInformation('ONE', types.SymbolKind.Array, undefined, new types.Location(uri, new types.Range(0, 0, 1, 1))),
                ]; // get de-duped
            }
        })()));
        disposables.add(extHost.registerWorkspaceSymbolProvider(defaultExtension, new (class {
            provideWorkspaceSymbols() {
                return [
                    new types.SymbolInformation('ONE', types.SymbolKind.Array, undefined, new types.Location(uri, undefined)),
                ]; // NO dedupe because of resolve
            }
            resolveWorkspaceSymbol(a) {
                return a;
            }
        })()));
        disposables.add(extHost.registerWorkspaceSymbolProvider(defaultExtension, new (class {
            provideWorkspaceSymbols() {
                return [
                    new types.SymbolInformation('ONE', types.SymbolKind.Struct, undefined, new types.Location(uri, new types.Range(0, 0, 1, 1))),
                ]; // NO dedupe because of kind
            }
        })()));
        await rpcProtocol.sync();
        const value = await getWorkspaceSymbols('');
        assert.strictEqual(value.length, 3);
    });
    // --- rename
    test('Rename, evil provider 0/2', async () => {
        disposables.add(extHost.registerRenameProvider(defaultExtension, defaultSelector, new (class {
            provideRenameEdits() {
                throw new (class Foo {
                })();
            }
        })()));
        await rpcProtocol.sync();
        try {
            await rename(languageFeaturesService.renameProvider, model, new EditorPosition(1, 1), 'newName');
            throw Error();
        }
        catch (err) {
            // expected
        }
    });
    test('Rename, evil provider 1/2', async () => {
        disposables.add(extHost.registerRenameProvider(defaultExtension, defaultSelector, new (class {
            provideRenameEdits() {
                throw Error('evil');
            }
        })()));
        await rpcProtocol.sync();
        const value = await rename(languageFeaturesService.renameProvider, model, new EditorPosition(1, 1), 'newName');
        assert.strictEqual(value.rejectReason, 'evil');
    });
    test('Rename, evil provider 2/2', async () => {
        disposables.add(extHost.registerRenameProvider(defaultExtension, '*', new (class {
            provideRenameEdits() {
                throw Error('evil');
            }
        })()));
        disposables.add(extHost.registerRenameProvider(defaultExtension, defaultSelector, new (class {
            provideRenameEdits() {
                const edit = new types.WorkspaceEdit();
                edit.replace(model.uri, new types.Range(0, 0, 0, 0), 'testing');
                return edit;
            }
        })()));
        await rpcProtocol.sync();
        const value = await rename(languageFeaturesService.renameProvider, model, new EditorPosition(1, 1), 'newName');
        assert.strictEqual(value.edits.length, 1);
    });
    test('Rename, ordering', async () => {
        disposables.add(extHost.registerRenameProvider(defaultExtension, '*', new (class {
            provideRenameEdits() {
                const edit = new types.WorkspaceEdit();
                edit.replace(model.uri, new types.Range(0, 0, 0, 0), 'testing');
                edit.replace(model.uri, new types.Range(1, 0, 1, 0), 'testing');
                return edit;
            }
        })()));
        disposables.add(extHost.registerRenameProvider(defaultExtension, defaultSelector, new (class {
            provideRenameEdits() {
                return;
            }
        })()));
        await rpcProtocol.sync();
        const value = await rename(languageFeaturesService.renameProvider, model, new EditorPosition(1, 1), 'newName');
        // least relevant rename provider
        assert.strictEqual(value.edits.length, 2);
    });
    test("Multiple RenameProviders don't respect all possible PrepareRename handlers 1/2, #98352", async function () {
        const called = [false, false, false, false];
        disposables.add(extHost.registerRenameProvider(defaultExtension, defaultSelector, new (class {
            prepareRename(document, position) {
                called[0] = true;
                const range = document.getWordRangeAtPosition(position);
                return range;
            }
            provideRenameEdits() {
                called[1] = true;
                return undefined;
            }
        })()));
        disposables.add(extHost.registerRenameProvider(defaultExtension, defaultSelector, new (class {
            prepareRename(document, position) {
                called[2] = true;
                return Promise.reject('Cannot rename this symbol2.');
            }
            provideRenameEdits() {
                called[3] = true;
                return undefined;
            }
        })()));
        await rpcProtocol.sync();
        await rename(languageFeaturesService.renameProvider, model, new EditorPosition(1, 1), 'newName');
        assert.deepStrictEqual(called, [true, true, true, false]);
    });
    test("Multiple RenameProviders don't respect all possible PrepareRename handlers 2/2, #98352", async function () {
        const called = [false, false, false];
        disposables.add(extHost.registerRenameProvider(defaultExtension, defaultSelector, new (class {
            prepareRename(document, position) {
                called[0] = true;
                const range = document.getWordRangeAtPosition(position);
                return range;
            }
            provideRenameEdits() {
                called[1] = true;
                return undefined;
            }
        })()));
        disposables.add(extHost.registerRenameProvider(defaultExtension, defaultSelector, new (class {
            provideRenameEdits(document, position, newName) {
                called[2] = true;
                return new types.WorkspaceEdit();
            }
        })()));
        await rpcProtocol.sync();
        await rename(languageFeaturesService.renameProvider, model, new EditorPosition(1, 1), 'newName');
        // first provider has NO prepare which means it is taken by default
        assert.deepStrictEqual(called, [false, false, true]);
    });
    // --- parameter hints
    test('Parameter Hints, order', async () => {
        disposables.add(extHost.registerSignatureHelpProvider(defaultExtension, defaultSelector, new (class {
            provideSignatureHelp() {
                return undefined;
            }
        })(), []));
        disposables.add(extHost.registerSignatureHelpProvider(defaultExtension, defaultSelector, new (class {
            provideSignatureHelp() {
                return {
                    signatures: [],
                    activeParameter: 0,
                    activeSignature: 0,
                };
            }
        })(), []));
        await rpcProtocol.sync();
        const value = await provideSignatureHelp(languageFeaturesService.signatureHelpProvider, model, new EditorPosition(1, 1), { triggerKind: languages.SignatureHelpTriggerKind.Invoke, isRetrigger: false }, CancellationToken.None);
        assert.ok(value);
    });
    test('Parameter Hints, evil provider', async () => {
        disposables.add(extHost.registerSignatureHelpProvider(defaultExtension, defaultSelector, new (class {
            provideSignatureHelp() {
                throw new Error('evil');
            }
        })(), []));
        await rpcProtocol.sync();
        const value = await provideSignatureHelp(languageFeaturesService.signatureHelpProvider, model, new EditorPosition(1, 1), { triggerKind: languages.SignatureHelpTriggerKind.Invoke, isRetrigger: false }, CancellationToken.None);
        assert.strictEqual(value, undefined);
    });
    // --- suggestions
    test('Suggest, order 1/3', async () => {
        return runWithFakedTimers({ useFakeTimers: true }, async () => {
            disposables.add(extHost.registerCompletionItemProvider(defaultExtension, '*', new (class {
                provideCompletionItems() {
                    return [new types.CompletionItem('testing1')];
                }
            })(), []));
            disposables.add(extHost.registerCompletionItemProvider(defaultExtension, defaultSelector, new (class {
                provideCompletionItems() {
                    return [new types.CompletionItem('testing2')];
                }
            })(), []));
            await rpcProtocol.sync();
            const value = await provideSuggestionItems(languageFeaturesService.completionProvider, model, new EditorPosition(1, 1), new CompletionOptions(undefined, new Set().add(27 /* languages.CompletionItemKind.Snippet */)));
            assert.strictEqual(value.items.length, 1);
            assert.strictEqual(value.items[0].completion.insertText, 'testing2');
            value.disposable.dispose();
        });
    });
    test('Suggest, order 2/3', async () => {
        return runWithFakedTimers({ useFakeTimers: true }, async () => {
            disposables.add(extHost.registerCompletionItemProvider(defaultExtension, '*', new (class {
                provideCompletionItems() {
                    return [new types.CompletionItem('weak-selector')]; // weaker selector but result
                }
            })(), []));
            disposables.add(extHost.registerCompletionItemProvider(defaultExtension, defaultSelector, new (class {
                provideCompletionItems() {
                    return []; // stronger selector but not a good result;
                }
            })(), []));
            await rpcProtocol.sync();
            const value = await provideSuggestionItems(languageFeaturesService.completionProvider, model, new EditorPosition(1, 1), new CompletionOptions(undefined, new Set().add(27 /* languages.CompletionItemKind.Snippet */)));
            assert.strictEqual(value.items.length, 1);
            assert.strictEqual(value.items[0].completion.insertText, 'weak-selector');
            value.disposable.dispose();
        });
    });
    test('Suggest, order 3/3', async () => {
        return runWithFakedTimers({ useFakeTimers: true }, async () => {
            disposables.add(extHost.registerCompletionItemProvider(defaultExtension, defaultSelector, new (class {
                provideCompletionItems() {
                    return [new types.CompletionItem('strong-1')];
                }
            })(), []));
            disposables.add(extHost.registerCompletionItemProvider(defaultExtension, defaultSelector, new (class {
                provideCompletionItems() {
                    return [new types.CompletionItem('strong-2')];
                }
            })(), []));
            await rpcProtocol.sync();
            const value = await provideSuggestionItems(languageFeaturesService.completionProvider, model, new EditorPosition(1, 1), new CompletionOptions(undefined, new Set().add(27 /* languages.CompletionItemKind.Snippet */)));
            assert.strictEqual(value.items.length, 2);
            assert.strictEqual(value.items[0].completion.insertText, 'strong-1'); // sort by label
            assert.strictEqual(value.items[1].completion.insertText, 'strong-2');
            value.disposable.dispose();
        });
    });
    test('Suggest, evil provider', async () => {
        return runWithFakedTimers({ useFakeTimers: true }, async () => {
            disposables.add(extHost.registerCompletionItemProvider(defaultExtension, defaultSelector, new (class {
                provideCompletionItems() {
                    throw new Error('evil');
                }
            })(), []));
            disposables.add(extHost.registerCompletionItemProvider(defaultExtension, defaultSelector, new (class {
                provideCompletionItems() {
                    return [new types.CompletionItem('testing')];
                }
            })(), []));
            await rpcProtocol.sync();
            const value = await provideSuggestionItems(languageFeaturesService.completionProvider, model, new EditorPosition(1, 1), new CompletionOptions(undefined, new Set().add(27 /* languages.CompletionItemKind.Snippet */)));
            assert.strictEqual(value.items[0].container.incomplete, false);
            value.disposable.dispose();
        });
    });
    test('Suggest, CompletionList', async () => {
        return runWithFakedTimers({ useFakeTimers: true }, async () => {
            disposables.add(extHost.registerCompletionItemProvider(defaultExtension, defaultSelector, new (class {
                provideCompletionItems() {
                    return new types.CompletionList([new types.CompletionItem('hello')], true);
                }
            })(), []));
            await rpcProtocol.sync();
            await provideSuggestionItems(languageFeaturesService.completionProvider, model, new EditorPosition(1, 1), new CompletionOptions(undefined, new Set().add(27 /* languages.CompletionItemKind.Snippet */))).then((model) => {
                assert.strictEqual(model.items[0].container.incomplete, true);
                model.disposable.dispose();
            });
        });
    });
    // --- format
    const NullWorkerService = new (class extends mock() {
        computeMoreMinimalEdits(resource, edits) {
            return Promise.resolve(edits ?? undefined);
        }
    })();
    test('Format Doc, data conversion', async () => {
        disposables.add(extHost.registerDocumentFormattingEditProvider(defaultExtension, defaultSelector, new (class {
            provideDocumentFormattingEdits() {
                return [
                    new types.TextEdit(new types.Range(0, 0, 0, 0), 'testing'),
                    types.TextEdit.setEndOfLine(types.EndOfLine.LF),
                ];
            }
        })()));
        await rpcProtocol.sync();
        const value = (await getDocumentFormattingEditsUntilResult(NullWorkerService, languageFeaturesService, model, { insertSpaces: true, tabSize: 4 }, CancellationToken.None));
        assert.strictEqual(value.length, 2);
        const [first, second] = value;
        assert.strictEqual(first.text, 'testing');
        assert.deepStrictEqual(first.range, {
            startLineNumber: 1,
            startColumn: 1,
            endLineNumber: 1,
            endColumn: 1,
        });
        assert.strictEqual(second.eol, 0 /* EndOfLineSequence.LF */);
        assert.strictEqual(second.text, '');
        assert.deepStrictEqual(second.range, {
            startLineNumber: 1,
            startColumn: 1,
            endLineNumber: 1,
            endColumn: 1,
        });
    });
    test('Format Doc, evil provider', async () => {
        disposables.add(extHost.registerDocumentFormattingEditProvider(defaultExtension, defaultSelector, new (class {
            provideDocumentFormattingEdits() {
                throw new Error('evil');
            }
        })()));
        await rpcProtocol.sync();
        return getDocumentFormattingEditsUntilResult(NullWorkerService, languageFeaturesService, model, { insertSpaces: true, tabSize: 4 }, CancellationToken.None);
    });
    test('Format Doc, order', async () => {
        disposables.add(extHost.registerDocumentFormattingEditProvider(defaultExtension, defaultSelector, new (class {
            provideDocumentFormattingEdits() {
                return undefined;
            }
        })()));
        disposables.add(extHost.registerDocumentFormattingEditProvider(defaultExtension, defaultSelector, new (class {
            provideDocumentFormattingEdits() {
                return [new types.TextEdit(new types.Range(0, 0, 0, 0), 'testing')];
            }
        })()));
        disposables.add(extHost.registerDocumentFormattingEditProvider(defaultExtension, defaultSelector, new (class {
            provideDocumentFormattingEdits() {
                return undefined;
            }
        })()));
        await rpcProtocol.sync();
        const value = (await getDocumentFormattingEditsUntilResult(NullWorkerService, languageFeaturesService, model, { insertSpaces: true, tabSize: 4 }, CancellationToken.None));
        assert.strictEqual(value.length, 1);
        const [first] = value;
        assert.strictEqual(first.text, 'testing');
        assert.deepStrictEqual(first.range, {
            startLineNumber: 1,
            startColumn: 1,
            endLineNumber: 1,
            endColumn: 1,
        });
    });
    test('Format Range, data conversion', async () => {
        disposables.add(extHost.registerDocumentRangeFormattingEditProvider(defaultExtension, defaultSelector, new (class {
            provideDocumentRangeFormattingEdits() {
                return [new types.TextEdit(new types.Range(0, 0, 0, 0), 'testing')];
            }
        })()));
        await rpcProtocol.sync();
        const value = (await getDocumentRangeFormattingEditsUntilResult(NullWorkerService, languageFeaturesService, model, new EditorRange(1, 1, 1, 1), { insertSpaces: true, tabSize: 4 }, CancellationToken.None));
        assert.strictEqual(value.length, 1);
        const [first] = value;
        assert.strictEqual(first.text, 'testing');
        assert.deepStrictEqual(first.range, {
            startLineNumber: 1,
            startColumn: 1,
            endLineNumber: 1,
            endColumn: 1,
        });
    });
    test('Format Range, + format_doc', async () => {
        disposables.add(extHost.registerDocumentRangeFormattingEditProvider(defaultExtension, defaultSelector, new (class {
            provideDocumentRangeFormattingEdits() {
                return [new types.TextEdit(new types.Range(0, 0, 0, 0), 'range')];
            }
        })()));
        disposables.add(extHost.registerDocumentRangeFormattingEditProvider(defaultExtension, defaultSelector, new (class {
            provideDocumentRangeFormattingEdits() {
                return [new types.TextEdit(new types.Range(2, 3, 4, 5), 'range2')];
            }
        })()));
        disposables.add(extHost.registerDocumentFormattingEditProvider(defaultExtension, defaultSelector, new (class {
            provideDocumentFormattingEdits() {
                return [new types.TextEdit(new types.Range(0, 0, 1, 1), 'doc')];
            }
        })()));
        await rpcProtocol.sync();
        const value = (await getDocumentRangeFormattingEditsUntilResult(NullWorkerService, languageFeaturesService, model, new EditorRange(1, 1, 1, 1), { insertSpaces: true, tabSize: 4 }, CancellationToken.None));
        assert.strictEqual(value.length, 1);
        const [first] = value;
        assert.strictEqual(first.text, 'range2');
        assert.strictEqual(first.range.startLineNumber, 3);
        assert.strictEqual(first.range.startColumn, 4);
        assert.strictEqual(first.range.endLineNumber, 5);
        assert.strictEqual(first.range.endColumn, 6);
    });
    test('Format Range, evil provider', async () => {
        disposables.add(extHost.registerDocumentRangeFormattingEditProvider(defaultExtension, defaultSelector, new (class {
            provideDocumentRangeFormattingEdits() {
                throw new Error('evil');
            }
        })()));
        await rpcProtocol.sync();
        return getDocumentRangeFormattingEditsUntilResult(NullWorkerService, languageFeaturesService, model, new EditorRange(1, 1, 1, 1), { insertSpaces: true, tabSize: 4 }, CancellationToken.None);
    });
    test('Format on Type, data conversion', async () => {
        disposables.add(extHost.registerOnTypeFormattingEditProvider(defaultExtension, defaultSelector, new (class {
            provideOnTypeFormattingEdits() {
                return [new types.TextEdit(new types.Range(0, 0, 0, 0), arguments[2])];
            }
        })(), [';']));
        await rpcProtocol.sync();
        const value = (await getOnTypeFormattingEdits(NullWorkerService, languageFeaturesService, model, new EditorPosition(1, 1), ';', { insertSpaces: true, tabSize: 2 }, CancellationToken.None));
        assert.strictEqual(value.length, 1);
        const [first] = value;
        assert.strictEqual(first.text, ';');
        assert.deepStrictEqual(first.range, {
            startLineNumber: 1,
            startColumn: 1,
            endLineNumber: 1,
            endColumn: 1,
        });
    });
    test('Links, data conversion', async () => {
        disposables.add(extHost.registerDocumentLinkProvider(defaultExtension, defaultSelector, new (class {
            provideDocumentLinks() {
                const link = new types.DocumentLink(new types.Range(0, 0, 1, 1), URI.parse('foo:bar#3'));
                link.tooltip = 'tooltip';
                return [link];
            }
        })()));
        await rpcProtocol.sync();
        const { links } = disposables.add(await getLinks(languageFeaturesService.linkProvider, model, CancellationToken.None));
        assert.strictEqual(links.length, 1);
        const [first] = links;
        assert.strictEqual(first.url?.toString(), 'foo:bar#3');
        assert.deepStrictEqual(first.range, {
            startLineNumber: 1,
            startColumn: 1,
            endLineNumber: 2,
            endColumn: 2,
        });
        assert.strictEqual(first.tooltip, 'tooltip');
    });
    test('Links, evil provider', async () => {
        disposables.add(extHost.registerDocumentLinkProvider(defaultExtension, defaultSelector, new (class {
            provideDocumentLinks() {
                return [new types.DocumentLink(new types.Range(0, 0, 1, 1), URI.parse('foo:bar#3'))];
            }
        })()));
        disposables.add(extHost.registerDocumentLinkProvider(defaultExtension, defaultSelector, new (class {
            provideDocumentLinks() {
                throw new Error();
            }
        })()));
        await rpcProtocol.sync();
        const { links } = disposables.add(await getLinks(languageFeaturesService.linkProvider, model, CancellationToken.None));
        assert.strictEqual(links.length, 1);
        const [first] = links;
        assert.strictEqual(first.url?.toString(), 'foo:bar#3');
        assert.deepStrictEqual(first.range, {
            startLineNumber: 1,
            startColumn: 1,
            endLineNumber: 2,
            endColumn: 2,
        });
    });
    test('Document colors, data conversion', async () => {
        disposables.add(extHost.registerColorProvider(defaultExtension, defaultSelector, new (class {
            provideDocumentColors() {
                return [
                    new types.ColorInformation(new types.Range(0, 0, 0, 20), new types.Color(0.1, 0.2, 0.3, 0.4)),
                ];
            }
            provideColorPresentations(color, context) {
                return [];
            }
        })()));
        await rpcProtocol.sync();
        const value = await getColors(languageFeaturesService.colorProvider, model, CancellationToken.None);
        assert.strictEqual(value.length, 1);
        const [first] = value;
        assert.deepStrictEqual(first.colorInfo.color, { red: 0.1, green: 0.2, blue: 0.3, alpha: 0.4 });
        assert.deepStrictEqual(first.colorInfo.range, {
            startLineNumber: 1,
            startColumn: 1,
            endLineNumber: 1,
            endColumn: 21,
        });
    });
    // -- selection ranges
    test('Selection Ranges, data conversion', async () => {
        disposables.add(extHost.registerSelectionRangeProvider(defaultExtension, defaultSelector, new (class {
            provideSelectionRanges() {
                return [
                    new types.SelectionRange(new types.Range(0, 10, 0, 18), new types.SelectionRange(new types.Range(0, 2, 0, 20))),
                ];
            }
        })()));
        await rpcProtocol.sync();
        provideSelectionRanges(languageFeaturesService.selectionRangeProvider, model, [new Position(1, 17)], { selectLeadingAndTrailingWhitespace: true, selectSubwords: true }, CancellationToken.None).then((ranges) => {
            assert.strictEqual(ranges.length, 1);
            assert.ok(ranges[0].length >= 2);
        });
    });
    test('Selection Ranges, bad data', async () => {
        try {
            const _a = new types.SelectionRange(new types.Range(0, 10, 0, 18), new types.SelectionRange(new types.Range(0, 11, 0, 18)));
            assert.ok(false, String(_a));
        }
        catch (err) {
            assert.ok(true);
        }
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0SG9zdExhbmd1YWdlRmVhdHVyZXMudGVzdC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9hcGkvdGVzdC9icm93c2VyL2V4dEhvc3RMYW5ndWFnZUZlYXR1cmVzLnRlc3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxNQUFNLE1BQU0sUUFBUSxDQUFBO0FBQzNCLE9BQU8sRUFBRSx3QkFBd0IsRUFBRSxNQUFNLDRFQUE0RSxDQUFBO0FBQ3JILE9BQU8sRUFBRSx5QkFBeUIsRUFBRSxZQUFZLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQTtBQUMzRixPQUFPLEVBQUUsR0FBRyxFQUFFLE1BQU0sZ0NBQWdDLENBQUE7QUFDcEQsT0FBTyxLQUFLLEtBQUssTUFBTSw4QkFBOEIsQ0FBQTtBQUNyRCxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0saURBQWlELENBQUE7QUFDakYsT0FBTyxFQUFFLFFBQVEsSUFBSSxjQUFjLEVBQUUsUUFBUSxFQUFFLE1BQU0sNENBQTRDLENBQUE7QUFDakcsT0FBTyxFQUFFLEtBQUssSUFBSSxXQUFXLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQTtBQUM5RSxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sOEJBQThCLENBQUE7QUFDOUQsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLGdEQUFnRCxDQUFBO0FBQy9FLE9BQU8sRUFBRSxhQUFhLEVBQUUsTUFBTSxzREFBc0QsQ0FBQTtBQUNwRixPQUFPLEVBQUUsdUJBQXVCLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQTtBQUNqRixPQUFPLEVBQUUsMEJBQTBCLEVBQUUsTUFBTSw2Q0FBNkMsQ0FBQTtBQUN4RixPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0saUNBQWlDLENBQUE7QUFDakUsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0scUNBQXFD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QUMsQ0FBQyxDQUFDLENBQUMsTUFBTSxJQUFJLENBQUMsQ0FBQyxDQUFBO1FBQ2pDLENBQUMsQ0FBQyxDQUFBO0lBQ0gsQ0FBQyxDQUFDLENBQUE7SUFFRixJQUFJLENBQUMsNEJBQTRCLEVBQUUsS0FBSyxJQUFJLEVBQUU7UUFDN0MsSUFBSSxDQUFDO1lBQ0osTUFBTSxFQUFFLEdBQUcsSUFBSSxLQUFLLENBQUMsY0FBYyxDQUNsQyxJQUFJLEtBQUssQ0FBQyxLQUFLLENBQUMsQ0FBQyxFQUFFLEVBQUUsRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDLEVBQzdCLElBQUksS0FBSyxDQUFDLGNBQWMsQ0FBQyxJQUFJLEtBQUssQ0FBQyxLQUFLLENBQUMsQ0FBQyxFQUFFLEVBQUUsRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUMsQ0FDdkQsQ0FBQTtZQUNELE1BQU0sQ0FBQyxFQUFFLENBQUMsS0FBSyxFQUFFLE1BQU0sQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFBO1FBQzdCLENBQUM7UUFBQyxPQUFPLEdBQUcsRUFBRSxDQUFDO1lBQ2QsTUFBTSxDQUFDLEVBQUUsQ0FBQyxJQUFJLENBQUMsQ0FBQTtRQUNoQixDQUFDO0lBQ0YsQ0FBQyxDQUFDLENBQUE7QUFDSCxDQUFDLENBQUMsQ0FBQSJ9