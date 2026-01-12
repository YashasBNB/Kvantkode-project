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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic3RpY2t5U2Nyb2xsTW9kZWxQcm92aWRlci5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS9LdmFudGtvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvZWRpdG9yL2NvbnRyaWIvc3RpY2t5U2Nyb2xsL2Jyb3dzZXIvc3RpY2t5U2Nyb2xsTW9kZWxQcm92aWRlci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQUUsVUFBVSxFQUFFLGVBQWUsRUFBZSxNQUFNLHNDQUFzQyxDQUFBO0FBRS9GLE9BQU8sRUFBRSx3QkFBd0IsRUFBRSxNQUFNLDhDQUE4QyxDQUFBO0FBQ3ZGLE9BQU8sRUFDTixjQUFjLEVBQ2QsWUFBWSxFQUNaLFlBQVksR0FDWixNQUFNLCtDQUErQyxDQUFBO0FBRXRELE9BQU8sRUFFTix1QkFBdUIsRUFDdkIsT0FBTyxHQUNQLE1BQU0sa0NBQWtDLENBQUE7QUFDekMsT0FBTyxFQUFFLGlCQUFpQixFQUFFLG1CQUFtQixFQUFFLE1BQU0sa0NBQWtDLENBQUE7QUFDekYsT0FBTyxFQUFFLG1CQUFtQixFQUFFLE1BQU0sOENBQThDLENBQUE7QUFDbEYsT0FBTyxFQUFFLG1CQUFtQixFQUFFLE1BQU0sOENBQThDLENBQUE7QUFDbEYsT0FBTyxFQUFFLDZCQUE2QixFQUFFLE1BQU0sNERBQTRELENBQUE7QUFFMUcsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sbUNBQW1DLENBQUE7QUFDckUsT0FBTyxFQUFFLGFBQWEsRUFBRSxXQUFXLEVBQUUsV0FBVyxFQUFFLE1BQU0sMEJBQTBCLENBQUE7QUFDbEYsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLHFDQUFxQyxDQUFBO0FBQzlELE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLDREQUE0RCxDQUFBO0FBR2xHLElBQUssYUFJSjtBQUpELFdBQUssYUFBYTtJQUNqQiwrQ0FBOEIsQ0FBQTtJQUM5QixnRUFBK0MsQ0FBQTtJQUMvQyx1REFBc0MsQ0FBQTtBQUN2QyxDQUFDLEVBSkksYUFBYSxLQUFiLGFBQWEsUUFJakI7QUFFRCxJQUFLLE1BSUo7QUFKRCxXQUFLLE1BQU07SUFDVixxQ0FBSyxDQUFBO0lBQ0wseUNBQU8sQ0FBQTtJQUNQLDJDQUFRLENBQUE7QUFDVCxDQUFDLEVBSkksTUFBTSxLQUFOLE1BQU0sUUFJVjtBQVdNLElBQU0sbUJBQW1CLEdBQXpCLE1BQU0sbUJBQW9CLFNBQVEsVUFBVTtJQVFsRCxZQUNrQixPQUEwQixFQUMzQyxnQkFBNEIsRUFDTCw2QkFBNEQsRUFDekQsd0JBQWtEO1FBRTVFLEtBQUssRUFBRSxDQUFBO1FBTFUsWUFBTyxHQUFQLE9BQU8sQ0FBbUI7UUFScEMsb0JBQWUsR0FBeUMsRUFBRSxDQUFBO1FBQzFELGtCQUFhLEdBQXlDLElBQUksQ0FBQTtRQUMxRCxxQkFBZ0IsR0FBZ0MsSUFBSSxDQUFDLFNBQVMsQ0FDckUsSUFBSSxPQUFPLENBQXFCLEdBQUcsQ0FBQyxDQUNwQyxDQUFBO1FBQ2dCLHFCQUFnQixHQUFvQixJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksZUFBZSxFQUFFLENBQUMsQ0FBQTtRQVV6RixRQUFRLElBQUksQ0FBQyxPQUFPLENBQUMsU0FBUyxxQ0FBMkIsQ0FBQyxZQUFZLEVBQUUsQ0FBQztZQUN4RSxLQUFLLGFBQWEsQ0FBQyxhQUFhO2dCQUMvQixJQUFJLENBQUMsZUFBZSxDQUFDLElBQUksQ0FDeEIsSUFBSSx1Q0FBdUMsQ0FBQyxJQUFJLENBQUMsT0FBTyxFQUFFLHdCQUF3QixDQUFDLENBQ25GLENBQUE7WUFDRixlQUFlO1lBQ2YsS0FBSyxhQUFhLENBQUMsc0JBQXNCO2dCQUN4QyxJQUFJLENBQUMsZUFBZSxDQUFDLElBQUksQ0FDeEIsSUFBSSw2Q0FBNkMsQ0FDaEQsSUFBSSxDQUFDLE9BQU8sRUFDWixnQkFBZ0IsRUFDaEIsd0JBQXdCLENBQ3hCLENBQ0QsQ0FBQTtZQUNGLGVBQWU7WUFDZixLQUFLLGFBQWEsQ0FBQyxpQkFBaUI7Z0JBQ25DLElBQUksQ0FBQyxlQUFlLENBQUMsSUFBSSxDQUN4QixJQUFJLGtEQUFrRCxDQUNyRCxJQUFJLENBQUMsT0FBTyxFQUNaLDZCQUE2QixDQUM3QixDQUNELENBQUE7Z0JBQ0QsTUFBSztRQUNQLENBQUM7SUFDRixDQUFDO0lBRWUsT0FBTztRQUN0QixJQUFJLENBQUMsZUFBZSxDQUFDLE9BQU8sQ0FBQyxDQUFDLFFBQVEsRUFBRSxFQUFFLENBQUMsUUFBUSxDQUFDLE9BQU8sRUFBRSxDQUFDLENBQUE7UUFDOUQsSUFBSSxDQUFDLGdCQUFnQixDQUFDLEtBQUssRUFBRSxDQUFBO1FBQzdCLElBQUksQ0FBQyxtQkFBbUIsRUFBRSxDQUFBO1FBQzFCLEtBQUssQ0FBQyxPQUFPLEVBQUUsQ0FBQTtJQUNoQixDQUFDO0lBRU8sbUJBQW1CO1FBQzFCLElBQUksSUFBSSxDQUFDLGFBQWEsRUFBRSxDQUFDO1lBQ3hCLElBQUksQ0FBQyxhQUFhLENBQUMsTUFBTSxFQUFFLENBQUE7WUFDM0IsSUFBSSxDQUFDLGFBQWEsR0FBRyxJQUFJLENBQUE7UUFDMUIsQ0FBQztJQUNGLENBQUM7SUFFTSxLQUFLLENBQUMsTUFBTSxDQUFDLEtBQXdCO1FBQzNDLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxLQUFLLEVBQUUsQ0FBQTtRQUM3QixJQUFJLENBQUMsZ0JBQWdCLENBQUMsR0FBRyxDQUFDO1lBQ3pCLE9BQU8sRUFBRSxHQUFHLEVBQUU7Z0JBQ2IsSUFBSSxDQUFDLG1CQUFtQixFQUFFLENBQUE7Z0JBQzFCLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxNQUFNLEVBQUUsQ0FBQTtZQUMvQixDQUFDO1NBQ0QsQ0FBQyxDQUFBO1FBQ0YsSUFBSSxDQUFDLG1CQUFtQixFQUFFLENBQUE7UUFFMUIsT0FBTyxNQUFNLElBQUksQ0FBQyxnQkFBZ0I7YUFDaEMsT0FBTyxDQUFDLEtBQUssSUFBSSxFQUFFO1lBQ25CLEtBQUssTUFBTSxhQUFhLElBQUksSUFBSSxDQUFDLGVBQWUsRUFBRSxDQUFDO2dCQUNsRCxNQUFNLEVBQUUsYUFBYSxFQUFFLFlBQVksRUFBRSxHQUFHLGFBQWEsQ0FBQyxrQkFBa0IsQ0FBQyxLQUFLLENBQUMsQ0FBQTtnQkFDL0UsSUFBSSxDQUFDLGFBQWEsR0FBRyxZQUFZLENBQUE7Z0JBQ2pDLE1BQU0sTUFBTSxHQUFHLE1BQU0sYUFBYSxDQUFBO2dCQUNsQyxJQUFJLElBQUksQ0FBQyxhQUFhLEtBQUssWUFBWSxFQUFFLENBQUM7b0JBQ3pDLE9BQU8sSUFBSSxDQUFBO2dCQUNaLENBQUM7Z0JBQ0QsUUFBUSxNQUFNLEVBQUUsQ0FBQztvQkFDaEIsS0FBSyxNQUFNLENBQUMsUUFBUTt3QkFDbkIsSUFBSSxDQUFDLGdCQUFnQixDQUFDLEtBQUssRUFBRSxDQUFBO3dCQUM3QixPQUFPLElBQUksQ0FBQTtvQkFDWixLQUFLLE1BQU0sQ0FBQyxLQUFLO3dCQUNoQixPQUFPLGFBQWEsQ0FBQyxXQUFXLENBQUE7Z0JBQ2xDLENBQUM7WUFDRixDQUFDO1lBQ0QsT0FBTyxJQUFJLENBQUE7UUFDWixDQUFDLENBQUM7YUFDRCxLQUFLLENBQUMsQ0FBQyxLQUFLLEVBQUUsRUFBRTtZQUNoQixpQkFBaUIsQ0FBQyxLQUFLLENBQUMsQ0FBQTtZQUN4QixPQUFPLElBQUksQ0FBQTtRQUNaLENBQUMsQ0FBQyxDQUFBO0lBQ0osQ0FBQztDQUNELENBQUE7QUExRlksbUJBQW1CO0lBVzdCLFdBQUEscUJBQXFCLENBQUE7SUFDckIsV0FBQSx3QkFBd0IsQ0FBQTtHQVpkLG1CQUFtQixDQTBGL0I7O0FBZ0JELE1BQWUsNEJBQ2QsU0FBUSxVQUFVO0lBS2xCLFlBQStCLE9BQTBCO1FBQ3hELEtBQUssRUFBRSxDQUFBO1FBRHVCLFlBQU8sR0FBUCxPQUFPLENBQW1CO1FBRi9DLGlCQUFZLEdBQXVCLElBQUksQ0FBQTtJQUlqRCxDQUFDO0lBRUQsSUFBSSxXQUFXO1FBQ2QsT0FBTyxJQUFJLENBQUMsWUFBWSxDQUFBO0lBQ3pCLENBQUM7SUFFTyxRQUFRO1FBQ2YsSUFBSSxDQUFDLFlBQVksR0FBRyxJQUFJLENBQUE7UUFDeEIsT0FBTyxNQUFNLENBQUMsT0FBTyxDQUFBO0lBQ3RCLENBQUM7SUFFTSxrQkFBa0IsQ0FBQyxLQUF3QjtRQUlqRCxJQUFJLEtBQUssQ0FBQyx1QkFBdUIsSUFBSSxDQUFDLElBQUksQ0FBQyxlQUFlLEVBQUUsRUFBRSxDQUFDO1lBQzlELE9BQU8sRUFBRSxhQUFhLEVBQUUsSUFBSSxDQUFDLFFBQVEsRUFBRSxFQUFFLFlBQVksRUFBRSxJQUFJLEVBQUUsQ0FBQTtRQUM5RCxDQUFDO1FBQ0QsTUFBTSxvQkFBb0IsR0FBRyx1QkFBdUIsQ0FBQyxDQUFDLEtBQUssRUFBRSxFQUFFLENBQzlELElBQUksQ0FBQyx1QkFBdUIsQ0FBQyxLQUFLLENBQUMsQ0FDbkMsQ0FBQTtRQUVELE9BQU87WUFDTixhQUFhLEVBQUUsb0JBQW9CO2lCQUNqQyxJQUFJLENBQUMsQ0FBQyxhQUFhLEVBQUUsRUFBRTtnQkFDdkIsSUFBSSxDQUFDLElBQUksQ0FBQyxZQUFZLENBQUMsYUFBYSxDQUFDLEVBQUUsQ0FBQztvQkFDdkMsT0FBTyxJQUFJLENBQUMsUUFBUSxFQUFFLENBQUE7Z0JBQ3ZCLENBQUM7Z0JBQ0QsSUFBSSxLQUFLLENBQUMsdUJBQXVCLEVBQUUsQ0FBQztvQkFDbkMsT0FBTyxNQUFNLENBQUMsUUFBUSxDQUFBO2dCQUN2QixDQUFDO2dCQUNELElBQUksQ0FBQyxZQUFZLEdBQUcsSUFBSSxDQUFDLGlCQUFpQixDQUFDLEtBQUssRUFBRSxhQUFhLENBQUMsQ0FBQTtnQkFDaEUsT0FBTyxNQUFNLENBQUMsS0FBSyxDQUFBO1lBQ3BCLENBQUMsQ0FBQztpQkFDRCxJQUFJLENBQUMsU0FBUyxFQUFFLENBQUMsR0FBRyxFQUFFLEVBQUU7Z0JBQ3hCLGlCQUFpQixDQUFDLEdBQUcsQ0FBQyxDQUFBO2dCQUN0QixPQUFPLE1BQU0sQ0FBQyxRQUFRLENBQUE7WUFDdkIsQ0FBQyxDQUFDO1lBQ0gsWUFBWSxFQUFFLG9CQUFvQjtTQUNsQyxDQUFBO0lBQ0YsQ0FBQztJQUVEOzs7OztPQUtHO0lBQ08sWUFBWSxDQUFDLEtBQVE7UUFDOUIsT0FBTyxJQUFJLENBQUE7SUFDWixDQUFDO0lBRUQ7Ozs7T0FJRztJQUNPLGVBQWU7UUFDeEIsT0FBTyxJQUFJLENBQUE7SUFDWixDQUFDO0NBZ0JEO0FBRUQsSUFBTSx1Q0FBdUMsR0FBN0MsTUFBTSx1Q0FBd0MsU0FBUSw0QkFBMEM7SUFDL0YsWUFDQyxPQUEwQixFQUNpQix3QkFBa0Q7UUFFN0YsS0FBSyxDQUFDLE9BQU8sQ0FBQyxDQUFBO1FBRjZCLDZCQUF3QixHQUF4Qix3QkFBd0IsQ0FBMEI7SUFHOUYsQ0FBQztJQUVTLHVCQUF1QixDQUFDLEtBQXdCO1FBQ3pELE9BQU8sWUFBWSxDQUFDLE1BQU0sQ0FDekIsSUFBSSxDQUFDLHdCQUF3QixDQUFDLHNCQUFzQixFQUNwRCxJQUFJLENBQUMsT0FBTyxDQUFDLFFBQVEsRUFBRSxFQUN2QixLQUFLLENBQ0wsQ0FBQTtJQUNGLENBQUM7SUFFUyxpQkFBaUIsQ0FBQyxLQUF3QixFQUFFLEtBQW1CO1FBQ3hFLE1BQU0sRUFBRSxvQkFBb0IsRUFBRSxVQUFVLEVBQUUsR0FBRyxJQUFJLENBQUMsNEJBQTRCLENBQzdFLEtBQUssRUFDTCxJQUFJLENBQUMsWUFBWSxFQUFFLGlCQUFpQixDQUNwQyxDQUFBO1FBQ0QsTUFBTSxTQUFTLEdBQUcsSUFBSSxDQUFDLE9BQU8sQ0FBQyxRQUFRLEVBQUUsQ0FBQTtRQUN6QyxPQUFPLElBQUksV0FBVyxDQUNyQixTQUFTLENBQUMsR0FBRyxFQUNiLFNBQVMsQ0FBQyxZQUFZLEVBQUUsRUFDeEIsb0JBQW9CLEVBQ3BCLFVBQVUsQ0FDVixDQUFBO0lBQ0YsQ0FBQztJQUVrQixZQUFZLENBQUMsS0FBbUI7UUFDbEQsT0FBTyxLQUFLLElBQUksS0FBSyxDQUFDLFFBQVEsQ0FBQyxJQUFJLEdBQUcsQ0FBQyxDQUFBO0lBQ3hDLENBQUM7SUFFTyw0QkFBNEIsQ0FDbkMsWUFBMEIsRUFDMUIsaUJBQXFDO1FBRXJDLElBQUksZUFBNEMsQ0FBQTtRQUNoRCwwQ0FBMEM7UUFDMUMsSUFBSSxRQUFRLENBQUMsS0FBSyxDQUFDLFlBQVksQ0FBQyxRQUFRLENBQUMsTUFBTSxFQUFFLENBQUMsWUFBWSxZQUFZLEVBQUUsQ0FBQztZQUM1RSxNQUFNLFFBQVEsR0FBRyxRQUFRLENBQUMsSUFBSSxDQUM3QixZQUFZLENBQUMsUUFBUSxDQUFDLE1BQU0sRUFBRSxFQUM5QixDQUFDLG1CQUFtQixFQUFFLEVBQUUsQ0FBQyxtQkFBbUIsQ0FBQyxFQUFFLEtBQUssaUJBQWlCLENBQ3JFLENBQUE7WUFDRCxJQUFJLFFBQVEsRUFBRSxDQUFDO2dCQUNkLGVBQWUsR0FBRyxRQUFRLENBQUMsUUFBUSxDQUFBO1lBQ3BDLENBQUM7aUJBQU0sQ0FBQztnQkFDUCxJQUFJLE1BQU0sR0FBRyxFQUFFLENBQUE7Z0JBQ2YsSUFBSSxtQkFBbUIsR0FBRyxDQUFDLENBQUMsQ0FBQTtnQkFDNUIsSUFBSSxtQkFBbUIsR0FBRyxTQUFTLENBQUE7Z0JBQ25DLEtBQUssTUFBTSxDQUFDLElBQUksRUFBRSxZQUFZLENBQUMsSUFBSSxZQUFZLENBQUMsUUFBUSxDQUFDLE9BQU8sRUFBRSxFQUFFLENBQUM7b0JBQ3BFLE1BQU0sY0FBYyxHQUFHLElBQUksQ0FBQyx1QkFBdUIsQ0FBQyxZQUFZLENBQUMsQ0FBQTtvQkFDakUsSUFBSSxjQUFjLEdBQUcsbUJBQW1CLEVBQUUsQ0FBQzt3QkFDMUMsbUJBQW1CLEdBQUcsWUFBWSxDQUFBO3dCQUNsQyxtQkFBbUIsR0FBRyxjQUFjLENBQUE7d0JBQ3BDLE1BQU0sR0FBRyxZQUFZLENBQUMsRUFBRSxDQUFBO29CQUN6QixDQUFDO2dCQUNGLENBQUM7Z0JBQ0QsaUJBQWlCLEdBQUcsTUFBTSxDQUFBO2dCQUMxQixlQUFlLEdBQUcsbUJBQW9CLENBQUMsUUFBUSxDQUFBO1lBQ2hELENBQUM7UUFDRixDQUFDO2FBQU0sQ0FBQztZQUNQLGVBQWUsR0FBRyxZQUFZLENBQUMsUUFBdUMsQ0FBQTtRQUN2RSxDQUFDO1FBQ0QsTUFBTSxjQUFjLEdBQW9CLEVBQUUsQ0FBQTtRQUMxQyxNQUFNLG9CQUFvQixHQUFHLEtBQUssQ0FBQyxJQUFJLENBQUMsZUFBZSxDQUFDLE1BQU0sRUFBRSxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsUUFBUSxFQUFFLFFBQVEsRUFBRSxFQUFFO1lBQzdGLE1BQU0sTUFBTSxHQUFnQixJQUFJLFdBQVcsQ0FDMUMsUUFBUSxDQUFDLE1BQU0sQ0FBQyxLQUFLLENBQUMsZUFBZSxFQUNyQyxRQUFRLENBQUMsTUFBTSxDQUFDLEtBQUssQ0FBQyxhQUFhLENBQ25DLENBQUE7WUFDRCxNQUFNLE1BQU0sR0FBZ0IsSUFBSSxXQUFXLENBQzFDLFFBQVEsQ0FBQyxNQUFNLENBQUMsS0FBSyxDQUFDLGVBQWUsRUFDckMsUUFBUSxDQUFDLE1BQU0sQ0FBQyxLQUFLLENBQUMsYUFBYSxDQUNuQyxDQUFBO1lBQ0QsT0FBTyxJQUFJLENBQUMsV0FBVyxDQUFDLE1BQU0sRUFBRSxNQUFNLENBQUMsQ0FBQTtRQUN4QyxDQUFDLENBQUMsQ0FBQTtRQUNGLEtBQUssTUFBTSxjQUFjLElBQUksb0JBQW9CLEVBQUUsQ0FBQztZQUNuRCxjQUFjLENBQUMsSUFBSSxDQUNsQixJQUFJLENBQUMsOEJBQThCLENBQ2xDLGNBQWMsRUFDZCxjQUFjLENBQUMsTUFBTSxDQUFDLGNBQWMsQ0FBQyxlQUFlLENBQ3BELENBQ0QsQ0FBQTtRQUNGLENBQUM7UUFDRCxNQUFNLG9CQUFvQixHQUFHLElBQUksYUFBYSxDQUFDLFNBQVMsRUFBRSxjQUFjLEVBQUUsU0FBUyxDQUFDLENBQUE7UUFFcEYsT0FBTztZQUNOLG9CQUFvQixFQUFFLG9CQUFvQjtZQUMxQyxVQUFVLEVBQUUsaUJBQWlCO1NBQzdCLENBQUE7SUFDRixDQUFDO0lBRU8sOEJBQThCLENBQ3JDLGNBQThCLEVBQzlCLGlCQUF5QjtRQUV6QixNQUFNLFFBQVEsR0FBb0IsRUFBRSxDQUFBO1FBQ3BDLEtBQUssTUFBTSxLQUFLLElBQUksY0FBYyxDQUFDLFFBQVEsQ0FBQyxNQUFNLEVBQUUsRUFBRSxDQUFDO1lBQ3RELElBQUksS0FBSyxDQUFDLE1BQU0sQ0FBQyxjQUFjLENBQUMsZUFBZSxLQUFLLEtBQUssQ0FBQyxNQUFNLENBQUMsS0FBSyxDQUFDLGFBQWEsRUFBRSxDQUFDO2dCQUN0RixJQUFJLEtBQUssQ0FBQyxNQUFNLENBQUMsY0FBYyxDQUFDLGVBQWUsS0FBSyxpQkFBaUIsRUFBRSxDQUFDO29CQUN2RSxRQUFRLENBQUMsSUFBSSxDQUNaLElBQUksQ0FBQyw4QkFBOEIsQ0FBQyxLQUFLLEVBQUUsS0FBSyxDQUFDLE1BQU0sQ0FBQyxjQUFjLENBQUMsZUFBZSxDQUFDLENBQ3ZGLENBQUE7Z0JBQ0YsQ0FBQztxQkFBTSxDQUFDO29CQUNQLEtBQUssTUFBTSxRQUFRLElBQUksS0FBSyxDQUFDLFFBQVEsQ0FBQyxNQUFNLEVBQUUsRUFBRSxDQUFDO3dCQUNoRCxRQUFRLENBQUMsSUFBSSxDQUNaLElBQUksQ0FBQyw4QkFBOEIsQ0FDbEMsUUFBUSxFQUNSLEtBQUssQ0FBQyxNQUFNLENBQUMsY0FBYyxDQUFDLGVBQWUsQ0FDM0MsQ0FDRCxDQUFBO29CQUNGLENBQUM7Z0JBQ0YsQ0FBQztZQUNGLENBQUM7UUFDRixDQUFDO1FBQ0QsUUFBUSxDQUFDLElBQUksQ0FBQyxDQUFDLE1BQU0sRUFBRSxNQUFNLEVBQUUsRUFBRSxDQUFDLElBQUksQ0FBQyxXQUFXLENBQUMsTUFBTSxDQUFDLEtBQU0sRUFBRSxNQUFNLENBQUMsS0FBTSxDQUFDLENBQUMsQ0FBQTtRQUNqRixNQUFNLEtBQUssR0FBRyxJQUFJLFdBQVcsQ0FDNUIsY0FBYyxDQUFDLE1BQU0sQ0FBQyxjQUFjLENBQUMsZUFBZSxFQUNwRCxjQUFjLENBQUMsTUFBTSxDQUFDLEtBQUssQ0FBQyxhQUFhLENBQ3pDLENBQUE7UUFDRCxPQUFPLElBQUksYUFBYSxDQUFDLEtBQUssRUFBRSxRQUFRLEVBQUUsU0FBUyxDQUFDLENBQUE7SUFDckQsQ0FBQztJQUVPLFdBQVcsQ0FBQyxNQUFtQixFQUFFLE1BQW1CO1FBQzNELElBQUksTUFBTSxDQUFDLGVBQWUsS0FBSyxNQUFNLENBQUMsZUFBZSxFQUFFLENBQUM7WUFDdkQsT0FBTyxNQUFNLENBQUMsZUFBZSxHQUFHLE1BQU0sQ0FBQyxlQUFlLENBQUE7UUFDdkQsQ0FBQzthQUFNLENBQUM7WUFDUCxPQUFPLE1BQU0sQ0FBQyxhQUFhLEdBQUcsTUFBTSxDQUFDLGFBQWEsQ0FBQTtRQUNuRCxDQUFDO0lBQ0YsQ0FBQztJQUVPLHVCQUF1QixDQUFDLE9BQXNDO1FBQ3JFLElBQUksR0FBRyxHQUFHLENBQUMsQ0FBQTtRQUNYLEtBQUssTUFBTSxLQUFLLElBQUksT0FBTyxDQUFDLFFBQVEsQ0FBQyxNQUFNLEVBQUUsRUFBRSxDQUFDO1lBQy9DLEdBQUcsSUFBSSxJQUFJLENBQUMsdUJBQXVCLENBQUMsS0FBSyxDQUFDLENBQUE7UUFDM0MsQ0FBQztRQUNELElBQUksT0FBTyxZQUFZLGNBQWMsRUFBRSxDQUFDO1lBQ3ZDLE9BQU8sQ0FDTixHQUFHLEdBQUcsT0FBTyxDQUFDLE1BQU0sQ0FBQyxLQUFLLENBQUMsYUFBYSxHQUFHLE9BQU8sQ0FBQyxNQUFNLENBQUMsY0FBYyxDQUFDLGVBQWUsQ0FDeEYsQ0FBQTtRQUNGLENBQUM7YUFBTSxDQUFDO1lBQ1AsT0FBTyxHQUFHLENBQUE7UUFDWCxDQUFDO0lBQ0YsQ0FBQztDQUNELENBQUE7QUFqSkssdUNBQXVDO0lBRzFDLFdBQUEsd0JBQXdCLENBQUE7R0FIckIsdUNBQXVDLENBaUo1QztBQUVELE1BQWUsdUNBQXdDLFNBQVEsNEJBQW1EO0lBR2pILFlBQVksTUFBeUI7UUFDcEMsS0FBSyxDQUFDLE1BQU0sQ0FBQyxDQUFBO1FBQ2IsSUFBSSxDQUFDLHFCQUFxQixHQUFHLElBQUksbUJBQW1CLENBQUMsTUFBTSxDQUFDLENBQUE7SUFDN0QsQ0FBQztJQUVTLGlCQUFpQixDQUFDLEtBQXdCLEVBQUUsS0FBcUI7UUFDMUUsTUFBTSxjQUFjLEdBQUcsSUFBSSxDQUFDLG1CQUFtQixDQUFDLEtBQUssQ0FBQyxDQUFBO1FBQ3RELE1BQU0sU0FBUyxHQUFHLElBQUksQ0FBQyxPQUFPLENBQUMsUUFBUSxFQUFFLENBQUE7UUFDekMsT0FBTyxJQUFJLFdBQVcsQ0FBQyxTQUFTLENBQUMsR0FBRyxFQUFFLFNBQVMsQ0FBQyxZQUFZLEVBQUUsRUFBRSxjQUFjLEVBQUUsU0FBUyxDQUFDLENBQUE7SUFDM0YsQ0FBQztJQUVrQixZQUFZLENBQUMsS0FBcUI7UUFDcEQsT0FBTyxLQUFLLEtBQUssSUFBSSxDQUFBO0lBQ3RCLENBQUM7SUFFTyxtQkFBbUIsQ0FBQyxjQUE4QjtRQUN6RCxNQUFNLE1BQU0sR0FBRyxjQUFjLENBQUMsTUFBTSxDQUFBO1FBQ3BDLE1BQU0scUJBQXFCLEdBQW9CLEVBQUUsQ0FBQTtRQUVqRCxrQ0FBa0M7UUFDbEMsTUFBTSxvQkFBb0IsR0FBRyxJQUFJLGFBQWEsQ0FBQyxTQUFTLEVBQUUsRUFBRSxFQUFFLFNBQVMsQ0FBQyxDQUFBO1FBRXhFLEtBQUssSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsR0FBRyxNQUFNLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQztZQUNqQyxnREFBZ0Q7WUFDaEQsTUFBTSxXQUFXLEdBQUcsY0FBYyxDQUFDLGNBQWMsQ0FBQyxDQUFDLENBQUMsQ0FBQTtZQUVwRCxJQUFJLFVBQVUsQ0FBQTtZQUNkLElBQUksV0FBVyxLQUFLLENBQUMsQ0FBQyxFQUFFLENBQUM7Z0JBQ3hCLDBDQUEwQztnQkFDMUMsVUFBVSxHQUFHLHFCQUFxQixDQUFDLFdBQVcsQ0FBQyxDQUFBO1lBQ2hELENBQUM7aUJBQU0sQ0FBQztnQkFDUCxnREFBZ0Q7Z0JBQ2hELFVBQVUsR0FBRyxvQkFBb0IsQ0FBQTtZQUNsQyxDQUFDO1lBRUQsTUFBTSxLQUFLLEdBQUcsSUFBSSxhQUFhLENBQzlCLElBQUksV0FBVyxDQUNkLGNBQWMsQ0FBQyxrQkFBa0IsQ0FBQyxDQUFDLENBQUMsRUFDcEMsY0FBYyxDQUFDLGdCQUFnQixDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FDdEMsRUFDRCxFQUFFLEVBQ0YsVUFBVSxDQUNWLENBQUE7WUFDRCxVQUFVLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsQ0FBQTtZQUMvQixxQkFBcUIsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLENBQUE7UUFDbEMsQ0FBQztRQUNELE9BQU8sb0JBQW9CLENBQUE7SUFDNUIsQ0FBQztDQUNEO0FBRUQsSUFBTSxrREFBa0QsR0FBeEQsTUFBTSxrREFBbUQsU0FBUSx1Q0FBdUM7SUFHdkcsWUFDQyxNQUF5QixFQUVSLDZCQUE0RDtRQUU3RSxLQUFLLENBQUMsTUFBTSxDQUFDLENBQUE7UUFGSSxrQ0FBNkIsR0FBN0IsNkJBQTZCLENBQStCO1FBSTdFLElBQUksQ0FBQyxRQUFRLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FDN0IsSUFBSSxtQkFBbUIsQ0FDdEIsTUFBTSxDQUFDLFFBQVEsRUFBRSxFQUNqQixJQUFJLENBQUMsNkJBQTZCLEVBQ2xDLElBQUksQ0FBQyxxQkFBcUIsQ0FDMUIsQ0FDRCxDQUFBO0lBQ0YsQ0FBQztJQUVrQixLQUFLLENBQUMsdUJBQXVCLENBQy9DLEtBQXdCO1FBRXhCLE9BQU8sSUFBSSxDQUFDLFFBQVEsQ0FBQyxPQUFPLENBQUMsS0FBSyxDQUFDLENBQUE7SUFDcEMsQ0FBQztDQUNELENBQUE7QUF4Qkssa0RBQWtEO0lBS3JELFdBQUEsNkJBQTZCLENBQUE7R0FMMUIsa0RBQWtELENBd0J2RDtBQUVELElBQU0sNkNBQTZDLEdBQW5ELE1BQU0sNkNBQThDLFNBQVEsdUNBQXVDO0lBR2xHLFlBQ0MsTUFBeUIsRUFDekIsZ0JBQTRCLEVBQ2Usd0JBQWtEO1FBRTdGLEtBQUssQ0FBQyxNQUFNLENBQUMsQ0FBQTtRQUY4Qiw2QkFBd0IsR0FBeEIsd0JBQXdCLENBQTBCO1FBRzdGLE1BQU0saUJBQWlCLEdBQUcsaUJBQWlCLENBQUMsd0JBQXdCLENBQ25FLElBQUksQ0FBQyx3QkFBd0IsRUFDN0IsTUFBTSxDQUFDLFFBQVEsRUFBRSxDQUNqQixDQUFBO1FBQ0QsSUFBSSxpQkFBaUIsQ0FBQyxNQUFNLEdBQUcsQ0FBQyxFQUFFLENBQUM7WUFDbEMsSUFBSSxDQUFDLFFBQVEsR0FBRyxJQUFJLENBQUMsU0FBUyxDQUM3QixJQUFJLG1CQUFtQixDQUN0QixNQUFNLENBQUMsUUFBUSxFQUFFLEVBQ2pCLGlCQUFpQixFQUNqQixnQkFBZ0IsRUFDaEIsSUFBSSxDQUFDLHFCQUFxQixFQUMxQixTQUFTLENBQ1QsQ0FDRCxDQUFBO1FBQ0YsQ0FBQztJQUNGLENBQUM7SUFFa0IsZUFBZTtRQUNqQyxPQUFPLElBQUksQ0FBQyxRQUFRLEtBQUssU0FBUyxDQUFBO0lBQ25DLENBQUM7SUFFa0IsS0FBSyxDQUFDLHVCQUF1QixDQUMvQyxLQUF3QjtRQUV4QixPQUFPLElBQUksQ0FBQyxRQUFRLEVBQUUsT0FBTyxDQUFDLEtBQUssQ0FBQyxJQUFJLElBQUksQ0FBQTtJQUM3QyxDQUFDO0NBQ0QsQ0FBQTtBQW5DSyw2Q0FBNkM7SUFNaEQsV0FBQSx3QkFBd0IsQ0FBQTtHQU5yQiw2Q0FBNkMsQ0FtQ2xEIn0=