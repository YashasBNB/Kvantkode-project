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
import { Disposable, DisposableStore } from '../../../../base/common/lifecycle.js';
import { ILanguageFeaturesService } from '../../../common/services/languageFeatures.js';
import { OutlineElement, OutlineGroup, OutlineModel, } from '../../documentSymbols/browser/outlineModel.js';
import { createCancelablePromise, Delayer, } from '../../../../base/common/async.js';
import { FoldingController, RangesLimitReporter } from '../../folding/browser/folding.js';
import { SyntaxRangeProvider } from '../../folding/browser/syntaxRangeProvider.js';
import { IndentRangeProvider } from '../../folding/browser/indentRangeProvider.js';
import { ILanguageConfigurationService } from '../../../common/languages/languageConfigurationRegistry.js';
import { onUnexpectedError } from '../../../../base/common/errors.js';
import { StickyElement, StickyModel, StickyRange } from './stickyScrollElement.js';
import { Iterable } from '../../../../base/common/iterator.js';
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
var ModelProvider;
(function (ModelProvider) {
    ModelProvider["OUTLINE_MODEL"] = "outlineModel";
    ModelProvider["FOLDING_PROVIDER_MODEL"] = "foldingProviderModel";
    ModelProvider["INDENTATION_MODEL"] = "indentationModel";
})(ModelProvider || (ModelProvider = {}));
var Status;
(function (Status) {
    Status[Status["VALID"] = 0] = "VALID";
    Status[Status["INVALID"] = 1] = "INVALID";
    Status[Status["CANCELED"] = 2] = "CANCELED";
})(Status || (Status = {}));
let StickyModelProvider = class StickyModelProvider extends Disposable {
    constructor(_editor, onProviderUpdate, _languageConfigurationService, _languageFeaturesService) {
        super();
        this._editor = _editor;
        this._modelProviders = [];
        this._modelPromise = null;
        this._updateScheduler = this._register(new Delayer(300));
        this._updateOperation = this._register(new DisposableStore());
        switch (this._editor.getOption(120 /* EditorOption.stickyScroll */).defaultModel) {
            case ModelProvider.OUTLINE_MODEL:
                this._modelProviders.push(new StickyModelFromCandidateOutlineProvider(this._editor, _languageFeaturesService));
            // fall through
            case ModelProvider.FOLDING_PROVIDER_MODEL:
                this._modelProviders.push(new StickyModelFromCandidateSyntaxFoldingProvider(this._editor, onProviderUpdate, _languageFeaturesService));
            // fall through
            case ModelProvider.INDENTATION_MODEL:
                this._modelProviders.push(new StickyModelFromCandidateIndentationFoldingProvider(this._editor, _languageConfigurationService));
                break;
        }
    }
    dispose() {
        this._modelProviders.forEach((provider) => provider.dispose());
        this._updateOperation.clear();
        this._cancelModelPromise();
        super.dispose();
    }
    _cancelModelPromise() {
        if (this._modelPromise) {
            this._modelPromise.cancel();
            this._modelPromise = null;
        }
    }
    async update(token) {
        this._updateOperation.clear();
        this._updateOperation.add({
            dispose: () => {
                this._cancelModelPromise();
                this._updateScheduler.cancel();
            },
        });
        this._cancelModelPromise();
        return await this._updateScheduler
            .trigger(async () => {
            for (const modelProvider of this._modelProviders) {
                const { statusPromise, modelPromise } = modelProvider.computeStickyModel(token);
                this._modelPromise = modelPromise;
                const status = await statusPromise;
                if (this._modelPromise !== modelPromise) {
                    return null;
                }
                switch (status) {
                    case Status.CANCELED:
                        this._updateOperation.clear();
                        return null;
                    case Status.VALID:
                        return modelProvider.stickyModel;
                }
            }
            return null;
        })
            .catch((error) => {
            onUnexpectedError(error);
            return null;
        });
    }
};
StickyModelProvider = __decorate([
    __param(2, IInstantiationService),
    __param(3, ILanguageFeaturesService)
], StickyModelProvider);
export { StickyModelProvider };
class StickyModelCandidateProvider extends Disposable {
    constructor(_editor) {
        super();
        this._editor = _editor;
        this._stickyModel = null;
    }
    get stickyModel() {
        return this._stickyModel;
    }
    _invalid() {
        this._stickyModel = null;
        return Status.INVALID;
    }
    computeStickyModel(token) {
        if (token.isCancellationRequested || !this.isProviderValid()) {
            return { statusPromise: this._invalid(), modelPromise: null };
        }
        const providerModelPromise = createCancelablePromise((token) => this.createModelFromProvider(token));
        return {
            statusPromise: providerModelPromise
                .then((providerModel) => {
                if (!this.isModelValid(providerModel)) {
                    return this._invalid();
                }
                if (token.isCancellationRequested) {
                    return Status.CANCELED;
                }
                this._stickyModel = this.createStickyModel(token, providerModel);
                return Status.VALID;
            })
                .then(undefined, (err) => {
                onUnexpectedError(err);
                return Status.CANCELED;
            }),
            modelPromise: providerModelPromise,
        };
    }
    /**
     * Method which checks whether the model returned by the provider is valid and can be used to compute a sticky model.
     * This method by default returns true.
     * @param model model returned by the provider
     * @returns boolean indicating whether the model is valid
     */
    isModelValid(model) {
        return true;
    }
    /**
     * Method which checks whether the provider is valid before applying it to find the provider model.
     * This method by default returns true.
     * @returns boolean indicating whether the provider is valid
     */
    isProviderValid() {
        return true;
    }
}
let StickyModelFromCandidateOutlineProvider = class StickyModelFromCandidateOutlineProvider extends StickyModelCandidateProvider {
    constructor(_editor, _languageFeaturesService) {
        super(_editor);
        this._languageFeaturesService = _languageFeaturesService;
    }
    createModelFromProvider(token) {
        return OutlineModel.create(this._languageFeaturesService.documentSymbolProvider, this._editor.getModel(), token);
    }
    createStickyModel(token, model) {
        const { stickyOutlineElement, providerID } = this._stickyModelFromOutlineModel(model, this._stickyModel?.outlineProviderId);
        const textModel = this._editor.getModel();
        return new StickyModel(textModel.uri, textModel.getVersionId(), stickyOutlineElement, providerID);
    }
    isModelValid(model) {
        return model && model.children.size > 0;
    }
    _stickyModelFromOutlineModel(outlineModel, preferredProvider) {
        let outlineElements;
        // When several possible outline providers
        if (Iterable.first(outlineModel.children.values()) instanceof OutlineGroup) {
            const provider = Iterable.find(outlineModel.children.values(), (outlineGroupOfModel) => outlineGroupOfModel.id === preferredProvider);
            if (provider) {
                outlineElements = provider.children;
            }
            else {
                let tempID = '';
                let maxTotalSumOfRanges = -1;
                let optimalOutlineGroup = undefined;
                for (const [_key, outlineGroup] of outlineModel.children.entries()) {
                    const totalSumRanges = this._findSumOfRangesOfGroup(outlineGroup);
                    if (totalSumRanges > maxTotalSumOfRanges) {
                        optimalOutlineGroup = outlineGroup;
                        maxTotalSumOfRanges = totalSumRanges;
                        tempID = outlineGroup.id;
                    }
                }
                preferredProvider = tempID;
                outlineElements = optimalOutlineGroup.children;
            }
        }
        else {
            outlineElements = outlineModel.children;
        }
        const stickyChildren = [];
        const outlineElementsArray = Array.from(outlineElements.values()).sort((element1, element2) => {
            const range1 = new StickyRange(element1.symbol.range.startLineNumber, element1.symbol.range.endLineNumber);
            const range2 = new StickyRange(element2.symbol.range.startLineNumber, element2.symbol.range.endLineNumber);
            return this._comparator(range1, range2);
        });
        for (const outlineElement of outlineElementsArray) {
            stickyChildren.push(this._stickyModelFromOutlineElement(outlineElement, outlineElement.symbol.selectionRange.startLineNumber));
        }
        const stickyOutlineElement = new StickyElement(undefined, stickyChildren, undefined);
        return {
            stickyOutlineElement: stickyOutlineElement,
            providerID: preferredProvider,
        };
    }
    _stickyModelFromOutlineElement(outlineElement, previousStartLine) {
        const children = [];
        for (const child of outlineElement.children.values()) {
            if (child.symbol.selectionRange.startLineNumber !== child.symbol.range.endLineNumber) {
                if (child.symbol.selectionRange.startLineNumber !== previousStartLine) {
                    children.push(this._stickyModelFromOutlineElement(child, child.symbol.selectionRange.startLineNumber));
                }
                else {
                    for (const subchild of child.children.values()) {
                        children.push(this._stickyModelFromOutlineElement(subchild, child.symbol.selectionRange.startLineNumber));
                    }
                }
            }
        }
        children.sort((child1, child2) => this._comparator(child1.range, child2.range));
        const range = new StickyRange(outlineElement.symbol.selectionRange.startLineNumber, outlineElement.symbol.range.endLineNumber);
        return new StickyElement(range, children, undefined);
    }
    _comparator(range1, range2) {
        if (range1.startLineNumber !== range2.startLineNumber) {
            return range1.startLineNumber - range2.startLineNumber;
        }
        else {
            return range2.endLineNumber - range1.endLineNumber;
        }
    }
    _findSumOfRangesOfGroup(outline) {
        let res = 0;
        for (const child of outline.children.values()) {
            res += this._findSumOfRangesOfGroup(child);
        }
        if (outline instanceof OutlineElement) {
            return (res + outline.symbol.range.endLineNumber - outline.symbol.selectionRange.startLineNumber);
        }
        else {
            return res;
        }
    }
};
StickyModelFromCandidateOutlineProvider = __decorate([
    __param(1, ILanguageFeaturesService)
], StickyModelFromCandidateOutlineProvider);
class StickyModelFromCandidateFoldingProvider extends StickyModelCandidateProvider {
    constructor(editor) {
        super(editor);
        this._foldingLimitReporter = new RangesLimitReporter(editor);
    }
    createStickyModel(token, model) {
        const foldingElement = this._fromFoldingRegions(model);
        const textModel = this._editor.getModel();
        return new StickyModel(textModel.uri, textModel.getVersionId(), foldingElement, undefined);
    }
    isModelValid(model) {
        return model !== null;
    }
    _fromFoldingRegions(foldingRegions) {
        const length = foldingRegions.length;
        const orderedStickyElements = [];
        // The root sticky outline element
        const stickyOutlineElement = new StickyElement(undefined, [], undefined);
        for (let i = 0; i < length; i++) {
            // Finding the parent index of the current range
            const parentIndex = foldingRegions.getParentIndex(i);
            let parentNode;
            if (parentIndex !== -1) {
                // Access the reference of the parent node
                parentNode = orderedStickyElements[parentIndex];
            }
            else {
                // In that case the parent node is the root node
                parentNode = stickyOutlineElement;
            }
            const child = new StickyElement(new StickyRange(foldingRegions.getStartLineNumber(i), foldingRegions.getEndLineNumber(i) + 1), [], parentNode);
            parentNode.children.push(child);
            orderedStickyElements.push(child);
        }
        return stickyOutlineElement;
    }
}
let StickyModelFromCandidateIndentationFoldingProvider = class StickyModelFromCandidateIndentationFoldingProvider extends StickyModelFromCandidateFoldingProvider {
    constructor(editor, _languageConfigurationService) {
        super(editor);
        this._languageConfigurationService = _languageConfigurationService;
        this.provider = this._register(new IndentRangeProvider(editor.getModel(), this._languageConfigurationService, this._foldingLimitReporter));
    }
    async createModelFromProvider(token) {
        return this.provider.compute(token);
    }
};
StickyModelFromCandidateIndentationFoldingProvider = __decorate([
    __param(1, ILanguageConfigurationService)
], StickyModelFromCandidateIndentationFoldingProvider);
let StickyModelFromCandidateSyntaxFoldingProvider = class StickyModelFromCandidateSyntaxFoldingProvider extends StickyModelFromCandidateFoldingProvider {
    constructor(editor, onProviderUpdate, _languageFeaturesService) {
        super(editor);
        this._languageFeaturesService = _languageFeaturesService;
        const selectedProviders = FoldingController.getFoldingRangeProviders(this._languageFeaturesService, editor.getModel());
        if (selectedProviders.length > 0) {
            this.provider = this._register(new SyntaxRangeProvider(editor.getModel(), selectedProviders, onProviderUpdate, this._foldingLimitReporter, undefined));
        }
    }
    isProviderValid() {
        return this.provider !== undefined;
    }
    async createModelFromProvider(token) {
        return this.provider?.compute(token) ?? null;
    }
};
StickyModelFromCandidateSyntaxFoldingProvider = __decorate([
    __param(2, ILanguageFeaturesService)
], StickyModelFromCandidateSyntaxFoldingProvider);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic3RpY2t5U2Nyb2xsTW9kZWxQcm92aWRlci5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL2VkaXRvci9jb250cmliL3N0aWNreVNjcm9sbC9icm93c2VyL3N0aWNreVNjcm9sbE1vZGVsUHJvdmlkZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUFFLFVBQVUsRUFBRSxlQUFlLEVBQWUsTUFBTSxzQ0FBc0MsQ0FBQTtBQUUvRixPQUFPLEVBQUUsd0JBQXdCLEVBQUUsTUFBTSw4Q0FBOEMsQ0FBQTtBQUN2RixPQUFPLEVBQ04sY0FBYyxFQUNkLFlBQVksRUFDWixZQUFZLEdBQ1osTUFBTSwrQ0FBK0MsQ0FBQTtBQUV0RCxPQUFPLEVBRU4sdUJBQXVCLEVBQ3ZCLE9BQU8sR0FDUCxNQUFNLGtDQUFrQyxDQUFBO0FBQ3pDLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxtQkFBbUIsRUFBRSxNQUFNLGtDQUFrQyxDQUFBO0FBQ3pGLE9BQU8sRUFBRSxtQkFBbUIsRUFBRSxNQUFNLDhDQUE4QyxDQUFBO0FBQ2xGLE9BQU8sRUFBRSxtQkFBbUIsRUFBRSxNQUFNLDhDQUE4QyxDQUFBO0FBQ2xGLE9BQU8sRUFBRSw2QkFBNkIsRUFBRSxNQUFNLDREQUE0RCxDQUFBO0FBRTFHLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLG1DQUFtQyxDQUFBO0FBQ3JFLE9BQU8sRUFBRSxhQUFhLEVBQUUsV0FBVyxFQUFFLFdBQVcsRUFBRSxNQUFNLDBCQUEwQixDQUFBO0FBQ2xGLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQTtBQUM5RCxPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSw0REFBNEQsQ0FBQTtBQUdsRyxJQUFLLGFBSUo7QUFKRCxXQUFLLGFBQWE7SUFDakIsK0NBQThCLENBQUE7SUFDOUIs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