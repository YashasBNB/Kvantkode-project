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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29kZUVkaXRvckNvbnRyaWJ1dGlvbnMuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvS3ZhbnRrb2RlLXByb2plY3QvS3ZhbnRrb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL2VkaXRvci9icm93c2VyL3dpZGdldC9jb2RlRWRpdG9yL2NvZGVFZGl0b3JDb250cmlidXRpb25zLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBRSxTQUFTLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSxpQ0FBaUMsQ0FBQTtBQUM5RSxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQTtBQUNyRSxPQUFPLEVBQUUsVUFBVSxFQUFFLGFBQWEsRUFBZSxNQUFNLHNDQUFzQyxDQUFBO0FBUzdGLE1BQU0sT0FBTyx1QkFBd0IsU0FBUSxVQUFVO0lBaUJ0RDtRQUNDLEtBQUssRUFBRSxDQUFBO1FBakJBLFlBQU8sR0FBdUIsSUFBSSxDQUFBO1FBQ2xDLDBCQUFxQixHQUFpQyxJQUFJLENBQUE7UUFFbEU7O1dBRUc7UUFDYyxlQUFVLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLGFBQWEsRUFBK0IsQ0FBQyxDQUFBO1FBQzlGOztXQUVHO1FBQ2MsYUFBUSxHQUFHLElBQUksR0FBRyxFQUEwQyxDQUFBO1FBQzdFOztXQUVHO1FBQ2MsMkJBQXNCLEdBQWMsRUFBRSxDQUFBO1FBS3RELElBQUksQ0FBQyxzQkFBc0IsK0NBQXVDLEdBQUcsS0FBSyxDQUFBO1FBQzFFLElBQUksQ0FBQyxzQkFBc0IsMERBQWtELEdBQUcsS0FBSyxDQUFBO1FBQ3JGLElBQUksQ0FBQyxzQkFBc0IsZ0VBQXdELEdBQUcsS0FBSyxDQUFBO1FBQzNGLElBQUksQ0FBQyxzQkFBc0Isb0RBQTRDLEdBQUcsS0FBSyxDQUFBO0lBQ2hGLENBQUM7SUFFTSxVQUFVLENBQ2hCLE1BQW1CLEVBQ25CLGFBQStD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