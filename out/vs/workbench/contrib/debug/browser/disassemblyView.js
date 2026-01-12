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
var DisassemblyView_1, BreakpointRenderer_1, InstructionRenderer_1;
import { PixelRatio } from '../../../../base/browser/pixelRatio.js';
import { $, addStandardDisposableListener, append, } from '../../../../base/browser/dom.js';
import { binarySearch2 } from '../../../../base/common/arrays.js';
import { Emitter } from '../../../../base/common/event.js';
import { Disposable, dispose } from '../../../../base/common/lifecycle.js';
import { isAbsolute } from '../../../../base/common/path.js';
import { URI } from '../../../../base/common/uri.js';
import { applyFontInfo } from '../../../../editor/browser/config/domFontInfo.js';
import { isCodeEditor } from '../../../../editor/browser/editorBrowser.js';
import { BareFontInfo } from '../../../../editor/common/config/fontInfo.js';
import { Range } from '../../../../editor/common/core/range.js';
import { StringBuilder } from '../../../../editor/common/core/stringBuilder.js';
import { ITextModelService } from '../../../../editor/common/services/resolverService.js';
import { localize } from '../../../../nls.js';
import { IConfigurationService } from '../../../../platform/configuration/common/configuration.js';
import { IContextKeyService, } from '../../../../platform/contextkey/common/contextkey.js';
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
import { WorkbenchTable } from '../../../../platform/list/browser/listService.js';
import { ILogService } from '../../../../platform/log/common/log.js';
import { IStorageService } from '../../../../platform/storage/common/storage.js';
import { ITelemetryService } from '../../../../platform/telemetry/common/telemetry.js';
import { editorBackground } from '../../../../platform/theme/common/colorRegistry.js';
import { IThemeService } from '../../../../platform/theme/common/themeService.js';
import { IUriIdentityService } from '../../../../platform/uriIdentity/common/uriIdentity.js';
import { EditorPane } from '../../../browser/parts/editor/editorPane.js';
import { focusedStackFrameColor, topStackFrameColor } from './callStackEditorContribution.js';
import * as icons from './debugIcons.js';
import { CONTEXT_LANGUAGE_SUPPORTS_DISASSEMBLE_REQUEST, DISASSEMBLY_VIEW_ID, IDebugService, } from '../common/debug.js';
import { InstructionBreakpoint } from '../common/debugModel.js';
import { getUriFromSource } from '../common/debugSource.js';
import { isUri, sourcesEqual } from '../common/debugUtils.js';
import { IEditorService } from '../../../services/editor/common/editorService.js';
// Special entry as a placeholer when disassembly is not available
const disassemblyNotAvailable = {
    allowBreakpoint: false,
    isBreakpointSet: false,
    isBreakpointEnabled: false,
    instructionReference: '',
    instructionOffset: 0,
    instructionReferenceOffset: 0,
    address: 0n,
    instruction: {
        address: '-1',
        instruction: localize('instructionNotAvailable', 'Disassembly not available.'),
    },
};
let DisassemblyView = class DisassemblyView extends EditorPane {
    static { DisassemblyView_1 = this; }
    static { this.NUM_INSTRUCTIONS_TO_LOAD = 50; }
    constructor(group, telemetryService, themeService, storageService, _configurationService, _instantiationService, _debugService) {
        super(DISASSEMBLY_VIEW_ID, group, telemetryService, themeService, storageService);
        this._configurationService = _configurationService;
        this._instantiationService = _instantiationService;
        this._debugService = _debugService;
        this._instructionBpList = [];
        this._enableSourceCodeRender = true;
        this._loadingLock = false;
        this._referenceToMemoryAddress = new Map();
        this._disassembledInstructions = undefined;
        this._onDidChangeStackFrame = this._register(new Emitter({ leakWarningThreshold: 1000 }));
        this._previousDebuggingState = _debugService.state;
        this._register(_configurationService.onDidChangeConfiguration((e) => {
            if (e.affectsConfiguration('debug')) {
                // show/hide source code requires changing height which WorkbenchTable doesn't support dynamic height, thus force a total reload.
                const newValue = this._configurationService.getValue('debug').disassemblyView
                    .showSourceCode;
                if (this._enableSourceCodeRender !== newValue) {
                    this._enableSourceCodeRender = newValue;
                    // todo: trigger rerender
                }
                else {
                    this._disassembledInstructions?.rerender();
                }
            }
        }));
    }
    get fontInfo() {
        if (!this._fontInfo) {
            this._fontInfo = this.createFontInfo();
            this._register(this._configurationService.onDidChangeConfiguration((e) => {
                if (e.affectsConfiguration('editor')) {
                    this._fontInfo = this.createFontInfo();
                }
            }));
        }
        return this._fontInfo;
    }
    createFontInfo() {
        return BareFontInfo.createFromRawSettings(this._configurationService.getValue('editor'), PixelRatio.getInstance(this.window).value);
    }
    get currentInstructionAddresses() {
        return this._debugService
            .getModel()
            .getSessions(false)
            .map((session) => session.getAllThreads())
            .reduce((prev, curr) => prev.concat(curr), [])
            .map((thread) => thread.getTopStackFrame())
            .map((frame) => frame?.instructionPointerReference)
            .map((ref) => (ref ? this.getReferenceAddress(ref) : undefined));
    }
    // Instruction reference of the top stack frame of the focused stack
    get focusedCurrentInstructionReference() {
        return this._debugService.getViewModel().focusedStackFrame?.thread.getTopStackFrame()
            ?.instructionPointerReference;
    }
    get focusedCurrentInstructionAddress() {
        const ref = this.focusedCurrentInstructionReference;
        return ref ? this.getReferenceAddress(ref) : undefined;
    }
    get focusedInstructionReference() {
        return this._debugService.getViewModel().focusedStackFrame?.instructionPointerReference;
    }
    get focusedInstructionAddress() {
        const ref = this.focusedInstructionReference;
        return ref ? this.getReferenceAddress(ref) : undefined;
    }
    get isSourceCodeRender() {
        return this._enableSourceCodeRender;
    }
    get debugSession() {
        return this._debugService.getViewModel().focusedSession;
    }
    get onDidChangeStackFrame() {
        return this._onDidChangeStackFrame.event;
    }
    get focusedAddressAndOffset() {
        const element = this._disassembledInstructions?.getFocusedElements()[0];
        if (!element) {
            return undefined;
        }
        const reference = element.instructionReference;
        const offset = Number(element.address - this.getReferenceAddress(reference));
        return { reference, offset, address: element.address };
    }
    createEditor(parent) {
        this._enableSourceCodeRender =
            this._configurationService.getValue('debug').disassemblyView.showSourceCode;
        const lineHeight = this.fontInfo.lineHeight;
        const thisOM = this;
        const delegate = new (class {
            constructor() {
                this.headerRowHeight = 0; // No header
            }
            getHeight(row) {
                if (thisOM.isSourceCodeRender &&
                    row.showSourceLocation &&
                    row.instruction.location?.path &&
                    row.instruction.line) {
                    // instruction line + source lines
                    if (row.instruction.endLine) {
                        return lineHeight * (row.instruction.endLine - row.instruction.line + 2);
                    }
                    else {
                        // source is only a single line.
                        return lineHeight * 2;
                    }
                }
                // just instruction line
                return lineHeight;
            }
        })();
        const instructionRenderer = this._register(this._instantiationService.createInstance(InstructionRenderer, this));
        this._disassembledInstructions = this._register(this._instantiationService.createInstance(WorkbenchTable, 'DisassemblyView', parent, delegate, [
            {
                label: '',
                tooltip: '',
                weight: 0,
                minimumWidth: this.fontInfo.lineHeight,
                maximumWidth: this.fontInfo.lineHeight,
                templateId: BreakpointRenderer.TEMPLATE_ID,
                project(row) {
                    return row;
                },
            },
            {
                label: localize('disassemblyTableColumnLabel', 'instructions'),
                tooltip: '',
                weight: 0.3,
                templateId: InstructionRenderer.TEMPLATE_ID,
                project(row) {
                    return row;
                },
            },
        ], [this._instantiationService.createInstance(BreakpointRenderer, this), instructionRenderer], {
            identityProvider: { getId: (e) => e.instruction.address },
            horizontalScrolling: false,
            overrideStyles: {
                listBackground: editorBackground,
            },
            multipleSelectionSupport: false,
            setRowLineHeight: false,
            openOnSingleClick: false,
            accessibilityProvider: new AccessibilityProvider(),
            mouseSupport: false,
        }));
        this._disassembledInstructions.domNode.classList.add('disassembly-view');
        if (this.focusedInstructionReference) {
            this.reloadDisassembly(this.focusedInstructionReference, 0);
        }
        this._register(this._disassembledInstructions.onDidScroll((e) => {
            if (this._loadingLock) {
                return;
            }
            if (e.oldScrollTop > e.scrollTop && e.scrollTop < e.height) {
                this._loadingLock = true;
                const prevTop = Math.floor(e.scrollTop / this.fontInfo.lineHeight);
                this.scrollUp_LoadDisassembledInstructions(DisassemblyView_1.NUM_INSTRUCTIONS_TO_LOAD).then((loaded) => {
                    if (loaded > 0) {
                        this._disassembledInstructions.reveal(prevTop + loaded, 0);
                    }
                    this._loadingLock = false;
                });
            }
            else if (e.oldScrollTop < e.scrollTop &&
                e.scrollTop + e.height > e.scrollHeight - e.height) {
                this._loadingLock = true;
                this.scrollDown_LoadDisassembledInstructions(DisassemblyView_1.NUM_INSTRUCTIONS_TO_LOAD).then(() => {
                    this._loadingLock = false;
                });
            }
        }));
        this._register(this._debugService.getViewModel().onDidFocusStackFrame(({ stackFrame }) => {
            if (this._disassembledInstructions && stackFrame?.instructionPointerReference) {
                this.goToInstructionAndOffset(stackFrame.instructionPointerReference, 0);
            }
            this._onDidChangeStackFrame.fire();
        }));
        // refresh breakpoints view
        this._register(this._debugService.getModel().onDidChangeBreakpoints((bpEvent) => {
            if (bpEvent && this._disassembledInstructions) {
                // draw viewable BP
                let changed = false;
                bpEvent.added?.forEach((bp) => {
                    if (bp instanceof InstructionBreakpoint) {
                        const index = this.getIndexFromReferenceAndOffset(bp.instructionReference, bp.offset);
                        if (index >= 0) {
                            this._disassembledInstructions.row(index).isBreakpointSet = true;
                            this._disassembledInstructions.row(index).isBreakpointEnabled = bp.enabled;
                            changed = true;
                        }
                    }
                });
                bpEvent.removed?.forEach((bp) => {
                    if (bp instanceof InstructionBreakpoint) {
                        const index = this.getIndexFromReferenceAndOffset(bp.instructionReference, bp.offset);
                        if (index >= 0) {
                            this._disassembledInstructions.row(index).isBreakpointSet = false;
                            changed = true;
                        }
                    }
                });
                bpEvent.changed?.forEach((bp) => {
                    if (bp instanceof InstructionBreakpoint) {
                        const index = this.getIndexFromReferenceAndOffset(bp.instructionReference, bp.offset);
                        if (index >= 0) {
                            if (this._disassembledInstructions.row(index).isBreakpointEnabled !== bp.enabled) {
                                this._disassembledInstructions.row(index).isBreakpointEnabled = bp.enabled;
                                changed = true;
                            }
                        }
                    }
                });
                // get an updated list so that items beyond the current range would render when reached.
                this._instructionBpList = this._debugService.getModel().getInstructionBreakpoints();
                // breakpoints restored from a previous session can be based on memory
                // references that may no longer exist in the current session. Request
                // those instructions to be loaded so the BP can be displayed.
                for (const bp of this._instructionBpList) {
                    this.primeMemoryReference(bp.instructionReference);
                }
                if (changed) {
                    this._onDidChangeStackFrame.fire();
                }
            }
        }));
        this._register(this._debugService.onDidChangeState((e) => {
            if ((e === 3 /* State.Running */ || e === 2 /* State.Stopped */) &&
                this._previousDebuggingState !== 3 /* State.Running */ &&
                this._previousDebuggingState !== 2 /* State.Stopped */) {
                // Just started debugging, clear the view
                this.clear();
                this._enableSourceCodeRender =
                    this._configurationService.getValue('debug').disassemblyView.showSourceCode;
            }
            this._previousDebuggingState = e;
            this._onDidChangeStackFrame.fire();
        }));
    }
    layout(dimension) {
        this._disassembledInstructions?.layout(dimension.height);
    }
    async goToInstructionAndOffset(instructionReference, offset, focus) {
        let addr = this._referenceToMemoryAddress.get(instructionReference);
        if (addr === undefined) {
            await this.loadDisassembledInstructions(instructionReference, 0, -DisassemblyView_1.NUM_INSTRUCTIONS_TO_LOAD, DisassemblyView_1.NUM_INSTRUCTIONS_TO_LOAD * 2);
            addr = this._referenceToMemoryAddress.get(instructionReference);
        }
        if (addr) {
            this.goToAddress(addr + BigInt(offset), focus);
        }
    }
    /** Gets the address associated with the instruction reference. */
    getReferenceAddress(instructionReference) {
        return this._referenceToMemoryAddress.get(instructionReference);
    }
    /**
     * Go to the address provided. If no address is provided, reveal the address of the currently focused stack frame. Returns false if that address is not available.
     */
    goToAddress(address, focus) {
        if (!this._disassembledInstructions) {
            return false;
        }
        if (!address) {
            return false;
        }
        const index = this.getIndexFromAddress(address);
        if (index >= 0) {
            this._disassembledInstructions.reveal(index);
            if (focus) {
                this._disassembledInstructions.domFocus();
                this._disassembledInstructions.setFocus([index]);
            }
            return true;
        }
        return false;
    }
    async scrollUp_LoadDisassembledInstructions(instructionCount) {
        const first = this._disassembledInstructions?.row(0);
        if (first) {
            return this.loadDisassembledInstructions(first.instructionReference, first.instructionReferenceOffset, first.instructionOffset - instructionCount, instructionCount);
        }
        return 0;
    }
    async scrollDown_LoadDisassembledInstructions(instructionCount) {
        const last = this._disassembledInstructions?.row(this._disassembledInstructions?.length - 1);
        if (last) {
            return this.loadDisassembledInstructions(last.instructionReference, last.instructionReferenceOffset, last.instructionOffset + 1, instructionCount);
        }
        return 0;
    }
    /**
     * Sets the memory reference address. We don't just loadDisassembledInstructions
     * for this, since we can't really deal with discontiguous ranges (we can't
     * detect _if_ a range is discontiguous since we don't know how much memory
     * comes between instructions.)
     */
    async primeMemoryReference(instructionReference) {
        if (this._referenceToMemoryAddress.has(instructionReference)) {
            return true;
        }
        const s = await this.debugSession?.disassemble(instructionReference, 0, 0, 1);
        if (s && s.length > 0) {
            try {
                this._referenceToMemoryAddress.set(instructionReference, BigInt(s[0].address));
                return true;
            }
            catch {
                return false;
            }
        }
        return false;
    }
    /** Loads disasembled instructions. Returns the number of instructions that were loaded. */
    async loadDisassembledInstructions(instructionReference, offset, instructionOffset, instructionCount) {
        const session = this.debugSession;
        const resultEntries = await session?.disassemble(instructionReference, offset, instructionOffset, instructionCount);
        // Ensure we always load the baseline instructions so we know what address the instructionReference refers to.
        if (!this._referenceToMemoryAddress.has(instructionReference) && instructionOffset !== 0) {
            await this.loadDisassembledInstructions(instructionReference, 0, 0, DisassemblyView_1.NUM_INSTRUCTIONS_TO_LOAD);
        }
        if (session && resultEntries && this._disassembledInstructions) {
            const newEntries = [];
            let lastLocation;
            let lastLine;
            for (let i = 0; i < resultEntries.length; i++) {
                const instruction = resultEntries[i];
                const thisInstructionOffset = instructionOffset + i;
                // Forward fill the missing location as detailed in the DAP spec.
                if (instruction.location) {
                    lastLocation = instruction.location;
                    lastLine = undefined;
                }
                if (instruction.line) {
                    const currentLine = {
                        startLineNumber: instruction.line,
                        startColumn: instruction.column ?? 0,
                        endLineNumber: instruction.endLine ?? instruction.line,
                        endColumn: instruction.endColumn ?? 0,
                    };
                    // Add location only to the first unique range. This will give the appearance of grouping of instructions.
                    if (!Range.equalsRange(currentLine, lastLine ?? null)) {
                        lastLine = currentLine;
                        instruction.location = lastLocation;
                    }
                }
                let address;
                try {
                    address = BigInt(instruction.address);
                }
                catch {
                    console.error(`Could not parse disassembly address ${instruction.address} (in ${JSON.stringify(instruction)})`);
                    continue;
                }
                const entry = {
                    allowBreakpoint: true,
                    isBreakpointSet: false,
                    isBreakpointEnabled: false,
                    instructionReference,
                    instructionReferenceOffset: offset,
                    instructionOffset: thisInstructionOffset,
                    instruction,
                    address,
                };
                newEntries.push(entry);
                // if we just loaded the first instruction for this reference, mark its address.
                if (offset === 0 && thisInstructionOffset === 0) {
                    this._referenceToMemoryAddress.set(instructionReference, address);
                }
            }
            if (newEntries.length === 0) {
                return 0;
            }
            const refBaseAddress = this._referenceToMemoryAddress.get(instructionReference);
            const bps = this._instructionBpList.map((p) => {
                const base = this._referenceToMemoryAddress.get(p.instructionReference);
                if (!base) {
                    return undefined;
                }
                return {
                    enabled: p.enabled,
                    address: base + BigInt(p.offset || 0),
                };
            });
            if (refBaseAddress !== undefined) {
                for (const entry of newEntries) {
                    const bp = bps.find((p) => p?.address === entry.address);
                    if (bp) {
                        entry.isBreakpointSet = true;
                        entry.isBreakpointEnabled = bp.enabled;
                    }
                }
            }
            const da = this._disassembledInstructions;
            if (da.length === 1 && this._disassembledInstructions.row(0) === disassemblyNotAvailable) {
                da.splice(0, 1);
            }
            const firstAddr = newEntries[0].address;
            const lastAddr = newEntries[newEntries.length - 1].address;
            const startN = binarySearch2(da.length, (i) => Number(da.row(i).address - firstAddr));
            const start = startN < 0 ? ~startN : startN;
            const endN = binarySearch2(da.length, (i) => Number(da.row(i).address - lastAddr));
            const end = endN < 0 ? ~endN : endN + 1;
            const toDelete = end - start;
            // Go through everything we're about to add, and only show the source
            // location if it's different from the previous one, "grouping" instructions by line
            let lastLocated;
            for (let i = start - 1; i >= 0; i--) {
                const { instruction } = da.row(i);
                if (instruction.location && instruction.line !== undefined) {
                    lastLocated = instruction;
                    break;
                }
            }
            const shouldShowLocation = (instruction) => instruction.line !== undefined &&
                instruction.location !== undefined &&
                (!lastLocated ||
                    !sourcesEqual(instruction.location, lastLocated.location) ||
                    instruction.line !== lastLocated.line);
            for (const entry of newEntries) {
                if (shouldShowLocation(entry.instruction)) {
                    entry.showSourceLocation = true;
                    lastLocated = entry.instruction;
                }
            }
            da.splice(start, toDelete, newEntries);
            return newEntries.length - toDelete;
        }
        return 0;
    }
    getIndexFromReferenceAndOffset(instructionReference, offset) {
        const addr = this._referenceToMemoryAddress.get(instructionReference);
        if (addr === undefined) {
            return -1;
        }
        return this.getIndexFromAddress(addr + BigInt(offset));
    }
    getIndexFromAddress(address) {
        const disassembledInstructions = this._disassembledInstructions;
        if (disassembledInstructions && disassembledInstructions.length > 0) {
            return binarySearch2(disassembledInstructions.length, (index) => {
                const row = disassembledInstructions.row(index);
                return Number(row.address - address);
            });
        }
        return -1;
    }
    /**
     * Clears the table and reload instructions near the target address
     */
    reloadDisassembly(instructionReference, offset) {
        if (!this._disassembledInstructions) {
            return;
        }
        this._loadingLock = true; // stop scrolling during the load.
        this.clear();
        this._instructionBpList = this._debugService.getModel().getInstructionBreakpoints();
        this.loadDisassembledInstructions(instructionReference, offset, -DisassemblyView_1.NUM_INSTRUCTIONS_TO_LOAD * 4, DisassemblyView_1.NUM_INSTRUCTIONS_TO_LOAD * 8).then(() => {
            // on load, set the target instruction in the middle of the page.
            if (this._disassembledInstructions.length > 0) {
                const targetIndex = Math.floor(this._disassembledInstructions.length / 2);
                this._disassembledInstructions.reveal(targetIndex, 0.5);
                // Always focus the target address on reload, or arrow key navigation would look terrible
                this._disassembledInstructions.domFocus();
                this._disassembledInstructions.setFocus([targetIndex]);
            }
            this._loadingLock = false;
        });
    }
    clear() {
        this._referenceToMemoryAddress.clear();
        this._disassembledInstructions?.splice(0, this._disassembledInstructions.length, [
            disassemblyNotAvailable,
        ]);
    }
};
DisassemblyView = DisassemblyView_1 = __decorate([
    __param(1, ITelemetryService),
    __param(2, IThemeService),
    __param(3, IStorageService),
    __param(4, IConfigurationService),
    __param(5, IInstantiationService),
    __param(6, IDebugService)
], DisassemblyView);
export { DisassemblyView };
let BreakpointRenderer = class BreakpointRenderer {
    static { BreakpointRenderer_1 = this; }
    static { this.TEMPLATE_ID = 'breakpoint'; }
    constructor(_disassemblyView, _debugService) {
        this._disassemblyView = _disassemblyView;
        this._debugService = _debugService;
        this.templateId = BreakpointRenderer_1.TEMPLATE_ID;
        this._breakpointIcon = 'codicon-' + icons.breakpoint.regular.id;
        this._breakpointDisabledIcon = 'codicon-' + icons.breakpoint.disabled.id;
        this._breakpointHintIcon = 'codicon-' + icons.debugBreakpointHint.id;
        this._debugStackframe = 'codicon-' + icons.debugStackframe.id;
        this._debugStackframeFocused = 'codicon-' + icons.debugStackframeFocused.id;
    }
    renderTemplate(container) {
        // align from the bottom so that it lines up with instruction when source code is present.
        container.style.alignSelf = 'flex-end';
        const icon = append(container, $('.codicon'));
        icon.style.display = 'flex';
        icon.style.alignItems = 'center';
        icon.style.justifyContent = 'center';
        icon.style.height = this._disassemblyView.fontInfo.lineHeight + 'px';
        const currentElement = { element: undefined };
        const disposables = [
            this._disassemblyView.onDidChangeStackFrame(() => this.rerenderDebugStackframe(icon, currentElement.element)),
            addStandardDisposableListener(container, 'mouseover', () => {
                if (currentElement.element?.allowBreakpoint) {
                    icon.classList.add(this._breakpointHintIcon);
                }
            }),
            addStandardDisposableListener(container, 'mouseout', () => {
                if (currentElement.element?.allowBreakpoint) {
                    icon.classList.remove(this._breakpointHintIcon);
                }
            }),
            addStandardDisposableListener(container, 'click', () => {
                if (currentElement.element?.allowBreakpoint) {
                    // click show hint while waiting for BP to resolve.
                    icon.classList.add(this._breakpointHintIcon);
                    const reference = currentElement.element.instructionReference;
                    const offset = Number(currentElement.element.address - this._disassemblyView.getReferenceAddress(reference));
                    if (currentElement.element.isBreakpointSet) {
                        this._debugService.removeInstructionBreakpoints(reference, offset);
                    }
                    else if (currentElement.element.allowBreakpoint &&
                        !currentElement.element.isBreakpointSet) {
                        this._debugService.addInstructionBreakpoint({
                            instructionReference: reference,
                            offset,
                            address: currentElement.element.address,
                            canPersist: false,
                        });
                    }
                }
            }),
        ];
        return { currentElement, icon, disposables };
    }
    renderElement(element, index, templateData, height) {
        templateData.currentElement.element = element;
        this.rerenderDebugStackframe(templateData.icon, element);
    }
    disposeTemplate(templateData) {
        dispose(templateData.disposables);
        templateData.disposables = [];
    }
    rerenderDebugStackframe(icon, element) {
        if (element?.address === this._disassemblyView.focusedCurrentInstructionAddress) {
            icon.classList.add(this._debugStackframe);
        }
        else if (element?.address === this._disassemblyView.focusedInstructionAddress) {
            icon.classList.add(this._debugStackframeFocused);
        }
        else {
            icon.classList.remove(this._debugStackframe);
            icon.classList.remove(this._debugStackframeFocused);
        }
        icon.classList.remove(this._breakpointHintIcon);
        if (element?.isBreakpointSet) {
            if (element.isBreakpointEnabled) {
                icon.classList.add(this._breakpointIcon);
                icon.classList.remove(this._breakpointDisabledIcon);
            }
            else {
                icon.classList.remove(this._breakpointIcon);
                icon.classList.add(this._breakpointDisabledIcon);
            }
        }
        else {
            icon.classList.remove(this._breakpointIcon);
            icon.classList.remove(this._breakpointDisabledIcon);
        }
    }
};
BreakpointRenderer = BreakpointRenderer_1 = __decorate([
    __param(1, IDebugService)
], BreakpointRenderer);
let InstructionRenderer = class InstructionRenderer extends Disposable {
    static { InstructionRenderer_1 = this; }
    static { this.TEMPLATE_ID = 'instruction'; }
    static { this.INSTRUCTION_ADDR_MIN_LENGTH = 25; }
    static { this.INSTRUCTION_BYTES_MIN_LENGTH = 30; }
    constructor(_disassemblyView, themeService, editorService, textModelService, uriService, logService) {
        super();
        this._disassemblyView = _disassemblyView;
        this.editorService = editorService;
        this.textModelService = textModelService;
        this.uriService = uriService;
        this.logService = logService;
        this.templateId = InstructionRenderer_1.TEMPLATE_ID;
        this._topStackFrameColor = themeService.getColorTheme().getColor(topStackFrameColor);
        this._focusedStackFrameColor = themeService.getColorTheme().getColor(focusedStackFrameColor);
        this._register(themeService.onDidColorThemeChange((e) => {
            this._topStackFrameColor = e.getColor(topStackFrameColor);
            this._focusedStackFrameColor = e.getColor(focusedStackFrameColor);
        }));
    }
    renderTemplate(container) {
        const sourcecode = append(container, $('.sourcecode'));
        const instruction = append(container, $('.instruction'));
        this.applyFontInfo(sourcecode);
        this.applyFontInfo(instruction);
        const currentElement = { element: undefined };
        const cellDisposable = [];
        const disposables = [
            this._disassemblyView.onDidChangeStackFrame(() => this.rerenderBackground(instruction, sourcecode, currentElement.element)),
            addStandardDisposableListener(sourcecode, 'dblclick', () => this.openSourceCode(currentElement.element?.instruction)),
        ];
        return { currentElement, instruction, sourcecode, cellDisposable, disposables };
    }
    renderElement(element, index, templateData, height) {
        this.renderElementInner(element, index, templateData, height);
    }
    async renderElementInner(element, index, templateData, height) {
        templateData.currentElement.element = element;
        const instruction = element.instruction;
        templateData.sourcecode.innerText = '';
        const sb = new StringBuilder(1000);
        if (this._disassemblyView.isSourceCodeRender &&
            element.showSourceLocation &&
            instruction.location?.path &&
            instruction.line !== undefined) {
            const sourceURI = this.getUriFromSource(instruction);
            if (sourceURI) {
                let textModel = undefined;
                const sourceSB = new StringBuilder(10000);
                const ref = await this.textModelService.createModelReference(sourceURI);
                if (templateData.currentElement.element !== element) {
                    return; // avoid a race, #192831
                }
                textModel = ref.object.textEditorModel;
                templateData.cellDisposable.push(ref);
                // templateData could have moved on during async.  Double check if it is still the same source.
                if (textModel && templateData.currentElement.element === element) {
                    let lineNumber = instruction.line;
                    while (lineNumber && lineNumber >= 1 && lineNumber <= textModel.getLineCount()) {
                        const lineContent = textModel.getLineContent(lineNumber);
                        sourceSB.appendString(`  ${lineNumber}: `);
                        sourceSB.appendString(lineContent + '\n');
                        if (instruction.endLine && lineNumber < instruction.endLine) {
                            lineNumber++;
                            continue;
                        }
                        break;
                    }
                    templateData.sourcecode.innerText = sourceSB.build();
                }
            }
        }
        let spacesToAppend = 10;
        if (instruction.address !== '-1') {
            sb.appendString(instruction.address);
            if (instruction.address.length < InstructionRenderer_1.INSTRUCTION_ADDR_MIN_LENGTH) {
                spacesToAppend =
                    InstructionRenderer_1.INSTRUCTION_ADDR_MIN_LENGTH - instruction.address.length;
            }
            for (let i = 0; i < spacesToAppend; i++) {
                sb.appendString(' ');
            }
        }
        if (instruction.instructionBytes) {
            sb.appendString(instruction.instructionBytes);
            spacesToAppend = 10;
            if (instruction.instructionBytes.length < InstructionRenderer_1.INSTRUCTION_BYTES_MIN_LENGTH) {
                spacesToAppend =
                    InstructionRenderer_1.INSTRUCTION_BYTES_MIN_LENGTH - instruction.instructionBytes.length;
            }
            for (let i = 0; i < spacesToAppend; i++) {
                sb.appendString(' ');
            }
        }
        sb.appendString(instruction.instruction);
        templateData.instruction.innerText = sb.build();
        this.rerenderBackground(templateData.instruction, templateData.sourcecode, element);
    }
    disposeElement(element, index, templateData, height) {
        dispose(templateData.cellDisposable);
        templateData.cellDisposable = [];
    }
    disposeTemplate(templateData) {
        dispose(templateData.disposables);
        templateData.disposables = [];
    }
    rerenderBackground(instruction, sourceCode, element) {
        if (element && this._disassemblyView.currentInstructionAddresses.includes(element.address)) {
            instruction.style.background = this._topStackFrameColor?.toString() || 'transparent';
        }
        else if (element?.address === this._disassemblyView.focusedInstructionAddress) {
            instruction.style.background = this._focusedStackFrameColor?.toString() || 'transparent';
        }
        else {
            instruction.style.background = 'transparent';
        }
    }
    openSourceCode(instruction) {
        if (instruction) {
            const sourceURI = this.getUriFromSource(instruction);
            const selection = instruction.endLine
                ? {
                    startLineNumber: instruction.line,
                    endLineNumber: instruction.endLine,
                    startColumn: instruction.column || 1,
                    endColumn: instruction.endColumn || 1073741824 /* Constants.MAX_SAFE_SMALL_INTEGER */,
                }
                : {
                    startLineNumber: instruction.line,
                    endLineNumber: instruction.line,
                    startColumn: instruction.column || 1,
                    endColumn: instruction.endColumn || 1073741824 /* Constants.MAX_SAFE_SMALL_INTEGER */,
                };
            this.editorService.openEditor({
                resource: sourceURI,
                description: localize('editorOpenedFromDisassemblyDescription', 'from disassembly'),
                options: {
                    preserveFocus: false,
                    selection: selection,
                    revealIfOpened: true,
                    selectionRevealType: 1 /* TextEditorSelectionRevealType.CenterIfOutsideViewport */,
                    pinned: false,
                },
            });
        }
    }
    getUriFromSource(instruction) {
        // Try to resolve path before consulting the debugSession.
        const path = instruction.location.path;
        if (path && isUri(path)) {
            // path looks like a uri
            return this.uriService.asCanonicalUri(URI.parse(path));
        }
        // assume a filesystem path
        if (path && isAbsolute(path)) {
            return this.uriService.asCanonicalUri(URI.file(path));
        }
        return getUriFromSource(instruction.location, instruction.location.path, this._disassemblyView.debugSession.getId(), this.uriService, this.logService);
    }
    applyFontInfo(element) {
        applyFontInfo(element, this._disassemblyView.fontInfo);
        element.style.whiteSpace = 'pre';
    }
};
InstructionRenderer = InstructionRenderer_1 = __decorate([
    __param(1, IThemeService),
    __param(2, IEditorService),
    __param(3, ITextModelService),
    __param(4, IUriIdentityService),
    __param(5, ILogService)
], InstructionRenderer);
class AccessibilityProvider {
    getWidgetAriaLabel() {
        return localize('disassemblyView', 'Disassembly View');
    }
    getAriaLabel(element) {
        let label = '';
        const instruction = element.instruction;
        if (instruction.address !== '-1') {
            label += `${localize('instructionAddress', 'Address')}: ${instruction.address}`;
        }
        if (instruction.instructionBytes) {
            label += `, ${localize('instructionBytes', 'Bytes')}: ${instruction.instructionBytes}`;
        }
        label += `, ${localize(`instructionText`, 'Instruction')}: ${instruction.instruction}`;
        return label;
    }
}
let DisassemblyViewContribution = class DisassemblyViewContribution {
    constructor(editorService, debugService, contextKeyService) {
        contextKeyService.bufferChangeEvents(() => {
            this._languageSupportsDisassembleRequest =
                CONTEXT_LANGUAGE_SUPPORTS_DISASSEMBLE_REQUEST.bindTo(contextKeyService);
        });
        const onDidActiveEditorChangeListener = () => {
            if (this._onDidChangeModelLanguage) {
                this._onDidChangeModelLanguage.dispose();
                this._onDidChangeModelLanguage = undefined;
            }
            const activeTextEditorControl = editorService.activeTextEditorControl;
            if (isCodeEditor(activeTextEditorControl)) {
                const language = activeTextEditorControl.getModel()?.getLanguageId();
                // TODO: instead of using idDebuggerInterestedInLanguage, have a specific ext point for languages
                // support disassembly
                this._languageSupportsDisassembleRequest?.set(!!language && debugService.getAdapterManager().someDebuggerInterestedInLanguage(language));
                this._onDidChangeModelLanguage = activeTextEditorControl.onDidChangeModelLanguage((e) => {
                    this._languageSupportsDisassembleRequest?.set(debugService.getAdapterManager().someDebuggerInterestedInLanguage(e.newLanguage));
                });
            }
            else {
                this._languageSupportsDisassembleRequest?.set(false);
            }
        };
        onDidActiveEditorChangeListener();
        this._onDidActiveEditorChangeListener = editorService.onDidActiveEditorChange(onDidActiveEditorChangeListener);
    }
    dispose() {
        this._onDidActiveEditorChangeListener.dispose();
        this._onDidChangeModelLanguage?.dispose();
    }
};
DisassemblyViewContribution = __decorate([
    __param(0, IEditorService),
    __param(1, IDebugService),
    __param(2, IContextKeyService)
], DisassemblyViewContribution);
export { DisassemblyViewContribution };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZGlzYXNzZW1ibHlWaWV3LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL0t2YW50a29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9kZWJ1Zy9icm93c2VyL2Rpc2Fzc2VtYmx5Vmlldy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLHdDQUF3QyxDQUFBO0FBQ25FLE9BQU8sRUFDTixDQUFDLEVBRUQsNkJBQTZCLEVBQzdCLE1BQU0sR0FDTixNQUFNLGlDQUFpQyxDQUFBO0FBR3hDLE9BQU8sRUFBRSxhQUFhLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQTtBQUVqRSxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sa0NBQWtDLENBQUE7QUFDMUQsT0FBTyxFQUFFLFVBQVUsRUFBZSxPQUFPLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQTtBQUN2RixPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0saUNBQWlDLENBQUE7QUFFNUQsT0FBTyxFQUFFLEdBQUcsRUFBRSxNQUFNLGdDQUFnQyxDQUFBO0FBQ3BELE9BQU8sRUFBRSxhQUFhLEVBQUUsTUFBTSxrREFBa0QsQ0FBQTtBQUNoRixPQUFPLEVBQUUsWUFBWSxFQUFFLE1BQU0sNkNBQTZDLENBQUE7QUFDMUUsT0FBTyxFQUFFLFlBQVksRUFBRSxNQUFNLDhDQUE4QyxDQUFBO0FBQzNFLE9BQU8sRUFBVSxLQUFLLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQTtBQUN2RSxPQUFPLEVBQUUsYUFBYSxFQUFFLE1BQU0saURBQWlELENBQUE7QUFFL0UsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sdURBQXVELENBQUE7QUFDekYsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLG9CQUFvQixDQUFBO0FBQzdDLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLDREQUE0RCxD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