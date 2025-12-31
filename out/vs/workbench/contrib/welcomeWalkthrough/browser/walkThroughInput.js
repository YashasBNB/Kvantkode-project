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
var WalkThroughInput_1;
import * as marked from '../../../../base/common/marked/marked.js';
import { Schemas } from '../../../../base/common/network.js';
import { isEqual } from '../../../../base/common/resources.js';
import { ITextModelService, } from '../../../../editor/common/services/resolverService.js';
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
import { EditorInput } from '../../../common/editor/editorInput.js';
import { EditorModel } from '../../../common/editor/editorModel.js';
import { markedGfmHeadingIdPlugin } from '../../markdown/browser/markedGfmHeadingIdPlugin.js';
import { moduleToContent } from '../common/walkThroughContentProvider.js';
class WalkThroughModel extends EditorModel {
    constructor(mainRef, snippetRefs) {
        super();
        this.mainRef = mainRef;
        this.snippetRefs = snippetRefs;
    }
    get main() {
        return this.mainRef;
    }
    get snippets() {
        return this.snippetRefs.map((snippet) => snippet.object);
    }
    dispose() {
        this.snippetRefs.forEach((ref) => ref.dispose());
        super.dispose();
    }
}
let WalkThroughInput = WalkThroughInput_1 = class WalkThroughInput extends EditorInput {
    get capabilities() {
        return 8 /* EditorInputCapabilities.Singleton */ | super.capabilities;
    }
    get resource() {
        return this.options.resource;
    }
    constructor(options, instantiationService, textModelResolverService) {
        super();
        this.options = options;
        this.instantiationService = instantiationService;
        this.textModelResolverService = textModelResolverService;
        this.promise = null;
        this.maxTopScroll = 0;
        this.maxBottomScroll = 0;
    }
    get typeId() {
        return this.options.typeId;
    }
    getName() {
        return this.options.name;
    }
    getDescription() {
        return this.options.description || '';
    }
    getTelemetryFrom() {
        return this.options.telemetryFrom;
    }
    getTelemetryDescriptor() {
        const descriptor = super.getTelemetryDescriptor();
        descriptor['target'] = this.getTelemetryFrom();
        /* __GDPR__FRAGMENT__
            "EditorTelemetryDescriptor" : {
                "target" : { "classification": "SystemMetaData", "purpose": "FeatureInsight" }
            }
        */
        return descriptor;
    }
    get onReady() {
        return this.options.onReady;
    }
    get layout() {
        return this.options.layout;
    }
    resolve() {
        if (!this.promise) {
            this.promise = moduleToContent(this.instantiationService, this.options.resource).then((content) => {
                if (this.resource.path.endsWith('.html')) {
                    return new WalkThroughModel(content, []);
                }
                const snippets = [];
                let i = 0;
                const renderer = new marked.marked.Renderer();
                renderer.code = ({ lang }) => {
                    i++;
                    const resource = this.options.resource.with({
                        scheme: Schemas.walkThroughSnippet,
                        fragment: `${i}.${lang}`,
                    });
                    snippets.push(this.textModelResolverService.createModelReference(resource));
                    return `<div id="snippet-${resource.fragment}" class="walkThroughEditorContainer" ></div>`;
                };
                const m = new marked.Marked({ renderer }, markedGfmHeadingIdPlugin());
                content = m.parse(content, { async: false });
                return Promise.all(snippets).then((refs) => new WalkThroughModel(content, refs));
            });
        }
        return this.promise;
    }
    matches(otherInput) {
        if (super.matches(otherInput)) {
            return true;
        }
        if (otherInput instanceof WalkThroughInput_1) {
            return isEqual(otherInput.options.resource, this.options.resource);
        }
        return false;
    }
    dispose() {
        if (this.promise) {
            this.promise.then((model) => model.dispose());
            this.promise = null;
        }
        super.dispose();
    }
    relativeScrollPosition(topScroll, bottomScroll) {
        this.maxTopScroll = Math.max(this.maxTopScroll, topScroll);
        this.maxBottomScroll = Math.max(this.maxBottomScroll, bottomScroll);
    }
};
WalkThroughInput = WalkThroughInput_1 = __decorate([
    __param(1, IInstantiationService),
    __param(2, ITextModelService)
], WalkThroughInput);
export { WalkThroughInput };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoid2Fsa1Rocm91Z2hJbnB1dC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL3dlbGNvbWVXYWxrdGhyb3VnaC9icm93c2VyL3dhbGtUaHJvdWdoSW5wdXQudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7O0FBSWhHLE9BQU8sS0FBSyxNQUFNLE1BQU0sMENBQTBDLENBQUE7QUFDbEUsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLG9DQUFvQyxDQUFBO0FBQzVELE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQTtBQUU5RCxPQUFPLEVBRU4saUJBQWlCLEdBQ2pCLE1BQU0sdURBQXVELENBQUE7QUFDOUQsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sNERBQTRELENBQUE7QUFFbEcsT0FBTyxFQUFFLFdBQVcsRUFBRSxNQUFNLHVDQUF1QyxDQUFBO0FBQ25FLE9BQU8sRUFBRSxXQUFXLEVBQUUsTUFBTSx1Q0FBdUMsQ0FBQTtBQUNuRSxPQUFPLEVBQUUsd0JBQXdCLEVBQUUsTUFBTSxvREFBb0QsQ0FBQTtBQUM3RixPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0seUNBQXlDLENBQUE7QUFFekUsTUFBTSxnQkFBaUIsU0FBUSxXQUFXO0lBQ3pDLFlBQ1MsT0FBZSxFQUNmLFdBQTJDO1FBRW5ELEtBQUssRUFBRSxDQUFBO1FBSEMsWUFBTyxHQUFQLE9BQU8sQ0FBUTtRQUNmLGdCQUFXLEdBQVgsV0FBVyxDQUFnQztJQUdwRCxDQUFDO0lBRUQsSUFBSSxJQUFJO1FBQ1AsT0FBTyxJQUFJLENBQUMsT0FBTyxDQUFBO0lBQ3BCLENBQUM7SUFFRCxJQUFJLFFBQVE7UUFDWCxPQUFPLElBQUksQ0FBQyxXQUFXLENBQUMsR0FBRyxDQUFDLENBQUMsT0FBTyxFQUFFLEVBQUUsQ0FBQyxPQUFP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