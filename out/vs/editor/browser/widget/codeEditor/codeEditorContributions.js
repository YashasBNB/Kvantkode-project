/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { getWindow, runWhenWindowIdle } from '../../../../base/browser/dom.js';
import { onUnexpectedError } from '../../../../base/common/errors.js';
import { Disposable, DisposableMap } from '../../../../base/common/lifecycle.js';
export class CodeEditorContributions extends Disposable {
    constructor() {
        super();
        this._editor = null;
        this._instantiationService = null;
        /**
         * Contains all instantiated contributions.
         */
        this._instances = this._register(new DisposableMap());
        /**
         * Contains contributions which are not yet instantiated.
         */
        this._pending = new Map();
        /**
         * Tracks which instantiation kinds are still left in `_pending`.
         */
        this._finishedInstantiation = [];
        this._finishedInstantiation[0 /* EditorContributionInstantiation.Eager */] = false;
        this._finishedInstantiation[1 /* EditorContributionInstantiation.AfterFirstRender */] = false;
        this._finishedInstantiation[2 /* EditorContributionInstantiation.BeforeFirstInteraction */] = false;
        this._finishedInstantiation[3 /* EditorContributionInstantiation.Eventually */] = false;
    }
    initialize(editor, contributions, instantiationService) {
        this._editor = editor;
        this._instantiationService = instantiationService;
        for (const desc of contributions) {
            if (this._pending.has(desc.id)) {
                onUnexpectedError(new Error(`Cannot have two contributions with the same id ${desc.id}`));
                continue;
            }
            this._pending.set(desc.id, desc);
        }
        this._instantiateSome(0 /* EditorContributionInstantiation.Eager */);
        // AfterFirstRender
        // - these extensions will be instantiated at the latest 50ms after the first render.
        // - but if there is idle time, we will instantiate them sooner.
        this._register(runWhenWindowIdle(getWindow(this._editor.getDomNode()), () => {
            this._instantiateSome(1 /* EditorContributionInstantiation.AfterFirstRender */);
        }));
        // BeforeFirstInteraction
        // - these extensions will be instantiated at the latest before a mouse or a keyboard event.
        // - but if there is idle time, we will instantiate them sooner.
        this._register(runWhenWindowIdle(getWindow(this._editor.getDomNode()), () => {
            this._instantiateSome(2 /* EditorContributionInstantiation.BeforeFirstInteraction */);
        }));
        // Eventually
        // - these extensions will only be instantiated when there is idle time.
        // - since there is no guarantee that there will ever be idle time, we set a timeout of 5s here.
        this._register(runWhenWindowIdle(getWindow(this._editor.getDomNode()), () => {
            this._instantiateSome(3 /* EditorContributionInstantiation.Eventually */);
        }, 5000));
    }
    saveViewState() {
        const contributionsState = {};
        for (const [id, contribution] of this._instances) {
            if (typeof contribution.saveViewState === 'function') {
                contributionsState[id] = contribution.saveViewState();
            }
        }
        return contributionsState;
    }
    restoreViewState(contributionsState) {
        for (const [id, contribution] of this._instances) {
            if (typeof contribution.restoreViewState === 'function') {
                contribution.restoreViewState(contributionsState[id]);
            }
        }
    }
    get(id) {
        this._instantiateById(id);
        return this._instances.get(id) || null;
    }
    /**
     * used by tests
     */
    set(id, value) {
        this._instances.set(id, value);
    }
    onBeforeInteractionEvent() {
        // this method is called very often by the editor!
        this._instantiateSome(2 /* EditorContributionInstantiation.BeforeFirstInteraction */);
    }
    onAfterModelAttached() {
        return runWhenWindowIdle(getWindow(this._editor?.getDomNode()), () => {
            this._instantiateSome(1 /* EditorContributionInstantiation.AfterFirstRender */);
        }, 50);
    }
    _instantiateSome(instantiation) {
        if (this._finishedInstantiation[instantiation]) {
            // already done with this instantiation!
            return;
        }
        this._finishedInstantiation[instantiation] = true;
        const contribs = this._findPendingContributionsByInstantiation(instantiation);
        for (const contrib of contribs) {
            this._instantiateById(contrib.id);
        }
    }
    _findPendingContributionsByInstantiation(instantiation) {
        const result = [];
        for (const [, desc] of this._pending) {
            if (desc.instantiation === instantiation) {
                result.push(desc);
            }
        }
        return result;
    }
    _instantiateById(id) {
        const desc = this._pending.get(id);
        if (!desc) {
            return;
        }
        this._pending.delete(id);
        if (!this._instantiationService || !this._editor) {
            throw new Error(`Cannot instantiate contributions before being initialized!`);
        }
        try {
            const instance = this._instantiationService.createInstance(desc.ctor, this._editor);
            this._instances.set(desc.id, instance);
            if (typeof instance.restoreViewState === 'function' &&
                desc.instantiation !== 0 /* EditorContributionInstantiation.Eager */) {
                console.warn(`Editor contribution '${desc.id}' should be eager instantiated because it uses saveViewState / restoreViewState.`);
            }
        }
        catch (err) {
            onUnexpectedError(err);
        }
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29kZUVkaXRvckNvbnRyaWJ1dGlvbnMuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy9lZGl0b3IvYnJvd3Nlci93aWRnZXQvY29kZUVkaXRvci9jb2RlRWRpdG9yQ29udHJpYnV0aW9ucy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQUUsU0FBUyxFQUFFLGlCQUFpQixFQUFFLE1BQU0saUNBQWlDLENBQUE7QUFDOUUsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sbUNBQW1DLENBQUE7QUFDckUsT0FBTyxFQUFFLFVBQVUsRUFBRSxhQUFhLEVBQWUsTUFBTSxzQ0FBc0MsQ0FBQTtBQVM3RixNQUFNLE9BQU8sdUJBQXdCLFNBQVEsVUFBVTtJQWlCdEQ7UUFDQyxLQUFLLEVBQUUsQ0FBQTtRQWpCQSxZQUFPLEdBQXVCLElBQUksQ0FBQTtRQUNsQywwQkFBcUIsR0FBaUMsSUFBSSxDQUFBO1FBRWxFOztXQUVHO1FBQ2MsZUFBVSxHQUFHLElBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSxhQUFhLEVBQStCLENBQUMsQ0FBQTtRQUM5Rjs7V0FFRztRQUNjLGFBQVEsR0FBRyxJQUFJLEdBQUcsRUFBMEMsQ0FBQTtRQUM3RTs7V0FFRztRQUNjLDJCQUFzQixHQUFjLEVBQUUsQ0FBQTtRQUt0RCxJQUFJLENBQUMsc0JBQXNCLCtDQUF1QyxHQUFHLEtBQUssQ0FBQTtRQUMxRSxJQUFJLENBQUMsc0JBQXNCLDBEQUFrRCxHQUFHLEtBQUssQ0FBQTtRQUNyRixJQUFJLENBQUMsc0JBQXNCLGdFQUF3RCxHQUFHLEtBQUssQ0FBQTtRQUMzRixJQUFJLENBQUMsc0JBQXNCLG9EQUE0QyxHQUFHLEtBQUssQ0FBQTtJQUNoRixDQUFDO0lBRU0sVUFBVSxDQUNoQixNQUFtQixFQUNuQixhQUErQyxFQUMvQyxvQkFBMkM7UUFFM0MsSUFB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