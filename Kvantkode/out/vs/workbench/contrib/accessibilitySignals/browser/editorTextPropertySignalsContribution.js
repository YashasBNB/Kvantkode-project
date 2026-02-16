/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
import { disposableTimeout } from '../../../../base/common/async.js';
import { Disposable, DisposableStore } from '../../../../base/common/lifecycle.js';
import { autorun, autorunWithStore, derived, observableFromEvent, observableFromPromise, observableFromValueWithChangeEvent, observableSignalFromEvent, wasEventTriggeredRecently, } from '../../../../base/common/observable.js';
import { isDefined } from '../../../../base/common/types.js';
import { isCodeEditor, isDiffEditor, } from '../../../../editor/browser/editorBrowser.js';
import { FoldingController } from '../../../../editor/contrib/folding/browser/folding.js';
import { AccessibilitySignal, IAccessibilitySignalService, } from '../../../../platform/accessibilitySignal/browser/accessibilitySignalService.js';
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
import { IMarkerService, MarkerSeverity } from '../../../../platform/markers/common/markers.js';
import { IEditorService } from '../../../services/editor/common/editorService.js';
import { IDebugService } from '../../debug/common/debug.js';
let EditorTextPropertySignalsContribution = class EditorTextPropertySignalsContribution extends Disposable {
    constructor(_editorService, _instantiationService, _accessibilitySignalService) {
        super();
        this._editorService = _editorService;
        this._instantiationService = _instantiationService;
        this._accessibilitySignalService = _accessibilitySignalService;
        this._textProperties = [
            this._instantiationService.createInstance(MarkerTextProperty, AccessibilitySignal.errorAtPosition, AccessibilitySignal.errorOnLine, MarkerSeverity.Error),
            this._instantiationService.createInstance(MarkerTextProperty, AccessibilitySignal.warningAtPosition, AccessibilitySignal.warningOnLine, MarkerSeverity.Warning),
            this._instantiationService.createInstance(FoldedAreaTextProperty),
            this._instantiationService.createInstance(BreakpointTextProperty),
        ];
        this._someAccessibilitySignalIsEnabled = derived(this, (reader) => this._textProperties
            .flatMap((p) => [p.lineSignal, p.positionSignal])
            .filter(isDefined)
            .some((signal) => observableFromValueWithChangeEvent(this, this._accessibilitySignalService.getEnabledState(signal, false)).read(reader)));
        this._activeEditorObservable = observableFromEvent(this, this._editorService.onDidActiveEditorChange, (_) => {
            const activeTextEditorControl = this._editorService.activeTextEditorControl;
            const editor = isDiffEditor(activeTextEditorControl)
                ? activeTextEditorControl.getOriginalEditor()
                : isCodeEditor(activeTextEditorControl)
                    ? activeTextEditorControl
                    : undefined;
            return editor && editor.hasModel() ? { editor, model: editor.getModel() } : undefined;
        });
        this._register(autorunWithStore((reader, store) => {
            /** @description updateSignalsEnabled */
            if (!this._someAccessibilitySignalIsEnabled.read(reader)) {
                return;
            }
            const activeEditor = this._activeEditorObservable.read(reader);
            if (activeEditor) {
                this._registerAccessibilitySignalsForEditor(activeEditor.editor, activeEditor.model, store);
            }
        }));
    }
    _registerAccessibilitySignalsForEditor(editor, editorModel, store) {
        let lastLine = -1;
        const ignoredLineSignalsForCurrentLine = new Set();
        const timeouts = store.add(new DisposableStore());
        const propertySources = this._textProperties.map((p) => ({
            source: p.createSource(editor, editorModel),
            property: p,
        }));
        const didType = wasEventTriggeredRecently(editor.onDidChangeModelContent, 100, store);
        store.add(editor.onDidChangeCursorPosition((args) => {
            timeouts.clear();
            if (args &&
                args.reason !== 3 /* CursorChangeReason.Explicit */ &&
                args.reason !== 0 /* CursorChangeReason.NotSet */) {
                // Ignore cursor changes caused by navigation (e.g. which happens when execution is paused).
                ignoredLineSignalsForCurrentLine.clear();
                return;
            }
            const trigger = (property, source, mode) => {
                const signal = mode === 'line' ? property.lineSignal : property.positionSignal;
                if (!signal ||
                    !this._accessibilitySignalService.getEnabledState(signal, false).value ||
                    !source.isPresent(position, mode, undefined)) {
                    return;
                }
                for (const modality of ['sound', 'announcement']) {
                    if (this._accessibilitySignalService.getEnabledState(signal, false, modality).value) {
                        const delay = this._accessibilitySignalService.getDelayMs(signal, modality, mode) +
                            (didType.get() ? 1000 : 0);
                        timeouts.add(disposableTimeout(() => {
                            if (source.isPresent(position, mode, undefined)) {
                                if (!(mode === 'line') || !ignoredLineSignalsForCurrentLine.has(property)) {
                                    this._accessibilitySignalService.playSignal(signal, { modality });
                                }
                                ignoredLineSignalsForCurrentLine.add(property);
                            }
                        }, delay));
                    }
                }
            };
            // React to cursor changes
            const position = args.position;
            const lineNumber = position.lineNumber;
            if (lineNumber !== lastLine) {
                ignoredLineSignalsForCurrentLine.clear();
                lastLine = lineNumber;
                for (const p of propertySources) {
                    trigger(p.property, p.source, 'line');
                }
            }
            for (const p of propertySources) {
                trigger(p.property, p.source, 'positional');
            }
            // React to property state changes for the current cursor position
            for (const s of propertySources) {
                if (![s.property.lineSignal, s.property.positionSignal].some((s) => s && this._accessibilitySignalService.getEnabledState(s, false).value)) {
                    return;
                }
                let lastValueAtPosition = undefined;
                let lastValueOnLine = undefined;
                timeouts.add(autorun((reader) => {
                    const newValueAtPosition = s.source.isPresentAtPosition(args.position, reader);
                    const newValueOnLine = s.source.isPresentOnLine(args.position.lineNumber, reader);
                    if (lastValueAtPosition !== undefined && lastValueAtPosition !== undefined) {
                        if (!lastValueAtPosition && newValueAtPosition) {
                            trigger(s.property, s.source, 'positional');
                        }
                        if (!lastValueOnLine && newValueOnLine) {
                            trigger(s.property, s.source, 'line');
                        }
                    }
                    lastValueAtPosition = newValueAtPosition;
                    lastValueOnLine = newValueOnLine;
                }));
            }
        }));
    }
};
EditorTextPropertySignalsContribution = __decorate([
    __param(0, IEditorService),
    __param(1, IInstantiationService),
    __param(2, IAccessibilitySignalService)
], EditorTextPropertySignalsContribution);
export { EditorTextPropertySignalsContribution };
class TextPropertySource {
    static { this.notPresent = new TextPropertySource({
        isPresentAtPosition: () => false,
        isPresentOnLine: () => false,
    }); }
    constructor(options) {
        this.isPresentOnLine = options.isPresentOnLine;
        this.isPresentAtPosition = options.isPresentAtPosition ?? (() => false);
    }
    isPresent(position, mode, reader) {
        return mode === 'line'
            ? this.isPresentOnLine(position.lineNumber, reader)
            : this.isPresentAtPosition(position, reader);
    }
}
let MarkerTextProperty = class MarkerTextProperty {
    constructor(positionSignal, lineSignal, severity, markerService) {
        this.positionSignal = positionSignal;
        this.lineSignal = lineSignal;
        this.severity = severity;
        this.markerService = markerService;
        this.debounceWhileTyping = true;
    }
    createSource(editor, model) {
        const obs = observableSignalFromEvent('onMarkerChanged', this.markerService.onMarkerChanged);
        return new TextPropertySource({
            isPresentAtPosition: (position, reader) => {
                obs.read(reader);
                const hasMarker = this.markerService
                    .read({ resource: model.uri })
                    .some((m) => m.severity === this.severity &&
                    m.startLineNumber <= position.lineNumber &&
                    position.lineNumber <= m.endLineNumber &&
                    m.startColumn <= position.column &&
                    position.column <= m.endColumn);
                return hasMarker;
            },
            isPresentOnLine: (lineNumber, reader) => {
                obs.read(reader);
                const hasMarker = this.markerService
                    .read({ resource: model.uri })
                    .some((m) => m.severity === this.severity &&
                    m.startLineNumber <= lineNumber &&
                    lineNumber <= m.endLineNumber);
                return hasMarker;
            },
        });
    }
};
MarkerTextProperty = __decorate([
    __param(3, IMarkerService)
], MarkerTextProperty);
class FoldedAreaTextProperty {
    constructor() {
        this.lineSignal = AccessibilitySignal.foldedArea;
    }
    createSource(editor, _model) {
        const foldingController = FoldingController.get(editor);
        if (!foldingController) {
            return TextPropertySource.notPresent;
        }
        const foldingModel = observableFromPromise(foldingController.getFoldingModel() ?? Promise.resolve(undefined));
        return new TextPropertySource({
            isPresentOnLine(lineNumber, reader) {
                const m = foldingModel.read(reader);
                const regionAtLine = m.value?.getRegionAtLine(lineNumber);
                const hasFolding = !regionAtLine
                    ? false
                    : regionAtLine.isCollapsed && regionAtLine.startLineNumber === lineNumber;
                return hasFolding;
            },
        });
    }
}
let BreakpointTextProperty = class BreakpointTextProperty {
    constructor(debugService) {
        this.debugService = debugService;
        this.lineSignal = AccessibilitySignal.break;
    }
    createSource(editor, model) {
        const signal = observableSignalFromEvent('onDidChangeBreakpoints', this.debugService.getModel().onDidChangeBreakpoints);
        const debugService = this.debugService;
        return new TextPropertySource({
            isPresentOnLine(lineNumber, reader) {
                signal.read(reader);
                const breakpoints = debugService.getModel().getBreakpoints({ uri: model.uri, lineNumber });
                const hasBreakpoints = breakpoints.length > 0;
                return hasBreakpoints;
            },
        });
    }
};
BreakpointTextProperty = __decorate([
    __param(0, IDebugService)
], BreakpointTextProperty);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZWRpdG9yVGV4dFByb3BlcnR5U2lnbmFsc0NvbnRyaWJ1dGlvbi5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS9LdmFudGtvZGUtcHJvamVjdC9LdmFudGtvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvYWNjZXNzaWJpbGl0eVNpZ25hbHMvYnJvd3Nlci9lZGl0b3JUZXh0UHJvcGVydHlTaWduYWxzQ29udHJpYnV0aW9uLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLGtDQUFrQyxDQUFBO0FBQ3BFLE9BQU8sRUFBRSxVQUFVLEVBQUUsZUFBZSxFQUFFLE1BQU0sc0NBQXNDLENBQUE7QUFDbEYsT0FBTyxFQUVOLE9BQU8sRUFDUCxnQkFBZ0IsRUFDaEIsT0FBTyxFQUNQLG1CQUFtQixFQUNuQixxQkFBcUIsRUFDckIsa0NBQWtDLEVBQ2xDLHlCQUF5QixFQUN6Qix5QkFBeUIsR0FDekIsTUFBTSx1Q0FBdUMsQ0FBQTtBQUM5QyxPQUFPLEVBQUUsU0FBUyxFQUFFLE1BQU0sa0NBQWtDLENBQUE7QUFDNUQsT0FBTyxFQUVOLFlBQVksRUFDWixZQUFZLEdBQ1osTUFBTSw2Q0FBNkMsQ0FBQTtBQUlwRCxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSx1REFBdUQsQ0FBQTtBQUN6RixPQUFPLEVBRU4sbUJBQW1CLEVBQ25CLDJCQUEyQixHQUMzQixNQUFNLGdGQUFnRixDQUFBO0FBQ3ZGLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLDREQUE0RCxDQUFBO0FBQ2xHLE9BQU8sRUFBRSxjQUFjLEVBQUUsY0FBYyxFQUFFLE1BQU0sZ0RBQWdELENBQUE7QUFFL0YsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLGtEQUFrRCxDQUFBO0FBQ2pGLE9BQU8sRUFBRSxhQUFhLEVBQUUsTUFBTSw2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