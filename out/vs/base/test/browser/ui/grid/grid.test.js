/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { createSerializedGrid, getRelativeLocation, Grid, isGridBranchNode, sanitizeGridNodeDescriptor, SerializableGrid, Sizing, } from '../../../../browser/ui/grid/grid.js';
import { Event } from '../../../../common/event.js';
import { deepClone } from '../../../../common/objects.js';
import { nodesToArrays, TestView } from './util.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../common/utils.js';
// Simple example:
//
//  +-----+---------------+
//  |  4  |      2        |
//  +-----+---------+-----+
//  |        1      |     |
//  +---------------+  3  |
//  |        5      |     |
//  +---------------+-----+
//
//  V
//  +-H
//  | +-4
//  | +-2
//  +-H
//    +-V
//    | +-1
//    | +-5
//    +-3
suite('Grid', function () {
    const store = ensureNoDisposablesAreLeakedInTestSuite();
    let container;
    setup(function () {
        container = document.createElement('div');
        container.style.position = 'absolute';
        container.style.width = `${800}px`;
        container.style.height = `${600}px`;
    });
    test('getRelativeLocation', () => {
        assert.deepStrictEqual(getRelativeLocation(0 /* Orientation.VERTICAL */, [0], 0 /* Direction.Up */), [0]);
        assert.deepStrictEqual(getRelativeLocation(0 /* Orientation.VERTICAL */, [0], 1 /* Direction.Down */), [1]);
        assert.deepStrictEqual(getRelativeLocation(0 /* Orientation.VERTICAL */, [0], 2 /* Direction.Left */), [0, 0]);
        assert.deepStrictEqual(getRelativeLocation(0 /* Orientation.VERTICAL */, [0], 3 /* Direction.Right */), [0, 1]);
        assert.deepStrictEqual(getRelativeLocation(1 /* Orientation.HORIZONTAL */, [0], 0 /* Direction.Up */), [0, 0]);
        assert.deepStrictEqual(getRelativeLocation(1 /* Orientation.HORIZONTAL */, [0], 1 /* Direction.Down */), [0, 1]);
        assert.deepStrictEqual(getRelativeLocation(1 /* Orientation.HORIZONTAL */, [0], 2 /* Direction.Left */), [0]);
        assert.deepStrictEqual(getRelativeLocation(1 /* Orientation.HORIZONTAL */, [0], 3 /* Direction.Right */), [1]);
        assert.deepStrictEqual(getRelativeLocation(0 /* Orientation.VERTICAL */, [4], 0 /* Direction.Up */), [4]);
        assert.deepStrictEqual(getRelativeLocation(0 /* Orientation.VERTICAL */, [4], 1 /* Direction.Down */), [5]);
        assert.deepStrictEqual(getRelativeLocation(0 /* Orientation.VERTICAL */, [4], 2 /* Direction.Left */), [4, 0]);
        assert.deepStrictEqual(getRelativeLocation(0 /* Orientation.VERTICAL */, [4], 3 /* Direction.Right */), [4, 1]);
        assert.deepStrictEqual(getRelativeLocation(0 /* Orientation.VERTICAL */, [0, 0], 0 /* Direction.Up */), [0, 0, 0]);
        assert.deepStrictEqual(getRelativeLocation(0 /* Orientation.VERTICAL */, [0, 0], 1 /* Direction.Down */), [0, 0, 1]);
        assert.deepStrictEqual(getRelativeLocation(0 /* Orientation.VERTICAL */, [0, 0], 2 /* Direction.Left */), [0, 0]);
        assert.deepStrictEqual(getRelativeLocation(0 /* Orientation.VERTICAL */, [0, 0], 3 /* Direction.Right */), [0, 1]);
        assert.deepStrictEqual(getRelativeLocation(0 /* Orientation.VERTICAL */, [1, 2], 0 /* Direction.Up */), [1, 2, 0]);
        assert.deepStrictEqual(getRelativeLocation(0 /* Orientation.VERTICAL */, [1, 2], 1 /* Direction.Down */), [1, 2, 1]);
        assert.deepStrictEqual(getRelativeLocation(0 /* Orientation.VERTICAL */, [1, 2], 2 /* Direction.Left */), [1, 2]);
        assert.deepStrictEqual(getRelativeLocation(0 /* Orientation.VERTICAL */, [1, 2], 3 /* Direction.Right */), [1, 3]);
        assert.deepStrictEqual(getRelativeLocation(0 /* Orientation.VERTICAL */, [1, 2, 3], 0 /* Direction.Up */), [1, 2, 3]);
        assert.deepStrictEqual(getRelativeLocation(0 /* Orientation.VERTICAL */, [1, 2, 3], 1 /* Direction.Down */), [1, 2, 4]);
        assert.deepStrictEqual(getRelativeLocation(0 /* Orientation.VERTICAL */, [1, 2, 3], 2 /* Direction.Left */), [1, 2, 3, 0]);
        assert.deepStrictEqual(getRelativeLocation(0 /* Orientation.VERTICAL */, [1, 2, 3], 3 /* Direction.Right */), [1, 2, 3, 1]);
    });
    test('empty', () => {
        const view1 = store.add(new TestView(100, Number.MAX_VALUE, 100, Number.MAX_VALUE));
        const gridview = store.add(new Grid(view1));
        container.appendChild(gridview.element);
        gridview.layout(800, 600);
        assert.deepStrictEqual(view1.size, [800, 600]);
    });
    test('two views vertically', function () {
        const view1 = store.add(new TestView(50, Number.MAX_VALUE, 50, Number.MAX_VALUE));
        const grid = store.add(new Grid(view1));
        container.appendChild(grid.element);
        grid.layout(800, 600);
        assert.deepStrictEqual(view1.size, [800, 600]);
        const view2 = store.add(new TestView(50, Number.MAX_VALUE, 50, Number.MAX_VALUE));
        grid.addView(view2, 200, view1, 0 /* Direction.Up */);
        assert.deepStrictEqual(view1.size, [800, 400]);
        assert.deepStrictEqual(view2.size, [800, 200]);
    });
    test('two views horizontally', function () {
        const view1 = store.add(new TestView(50, Number.MAX_VALUE, 50, Number.MAX_VALUE));
        const grid = store.add(new Grid(view1));
        container.appendChild(grid.element);
        grid.layout(800, 600);
        assert.deepStrictEqual(view1.size, [800, 600]);
        const view2 = store.add(new TestView(50, Number.MAX_VALUE, 50, Number.MAX_VALUE));
        grid.addView(view2, 300, view1, 3 /* Direction.Right */);
        assert.deepStrictEqual(view1.size, [500, 600]);
        assert.deepStrictEqual(view2.size, [300, 600]);
    });
    test('simple layout', function () {
        const view1 = store.add(new TestView(50, Number.MAX_VALUE, 50, Number.MAX_VALUE));
        const grid = store.add(new Grid(view1));
        container.appendChild(grid.element);
        grid.layout(800, 600);
        assert.deepStrictEqual(view1.size, [800, 600]);
        const view2 = store.add(new TestView(50, Number.MAX_VALUE, 50, Number.MAX_VALUE));
        grid.addView(view2, 200, view1, 0 /* Direction.Up */);
        assert.deepStrictEqual(view1.size, [800, 400]);
        assert.deepStrictEqual(view2.size, [800, 200]);
        const view3 = store.add(new TestView(50, Number.MAX_VALUE, 50, Number.MAX_VALUE));
        grid.addView(view3, 200, view1, 3 /* Direction.Right */);
        assert.deepStrictEqual(view1.size, [600, 400]);
        assert.deepStrictEqual(view2.size, [800, 200]);
        assert.deepStrictEqual(view3.size, [200, 400]);
        const view4 = store.add(new TestView(50, Number.MAX_VALUE, 50, Number.MAX_VALUE));
        grid.addView(view4, 200, view2, 2 /* Direction.Left */);
        assert.deepStrictEqual(view1.size, [600, 400]);
        assert.deepStrictEqual(view2.size, [600, 200]);
        assert.deepStrictEqual(view3.size, [200, 400]);
        assert.deepStrictEqual(view4.size, [200, 200]);
        const view5 = store.add(new TestView(50, Number.MAX_VALUE, 50, Number.MAX_VALUE));
        grid.addView(view5, 100, view1, 1 /* Direction.Down */);
        assert.deepStrictEqual(view1.size, [600, 300]);
        assert.deepStrictEqual(view2.size, [600, 200]);
        assert.deepStrictEqual(view3.size, [200, 400]);
        assert.deepStrictEqual(view4.size, [200, 200]);
        assert.deepStrictEqual(view5.size, [600, 100]);
    });
    test('another simple layout with automatic size distribution', function () {
        const view1 = store.add(new TestView(50, Number.MAX_VALUE, 50, Number.MAX_VALUE));
        const grid = store.add(new Grid(view1));
        container.appendChild(grid.element);
        grid.layout(800, 600);
        assert.deepStrictEqual(view1.size, [800, 600]);
        const view2 = store.add(new TestView(50, Number.MAX_VALUE, 50, Number.MAX_VALUE));
        grid.addView(view2, Sizing.Distribute, view1, 2 /* Direction.Left */);
        assert.deepStrictEqual(view1.size, [400, 600]);
        assert.deepStrictEqual(view2.size, [400, 600]);
        const view3 = store.add(new TestView(50, Number.MAX_VALUE, 50, Number.MAX_VALUE));
        grid.addView(view3, Sizing.Distribute, view1, 3 /* Direction.Right */);
        assert.deepStrictEqual(view1.size, [266, 600]);
        assert.deepStrictEqual(view2.size, [266, 600]);
        assert.deepStrictEqual(view3.size, [268, 600]);
        const view4 = store.add(new TestView(50, Number.MAX_VALUE, 50, Number.MAX_VALUE));
        grid.addView(view4, Sizing.Distribute, view2, 1 /* Direction.Down */);
        assert.deepStrictEqual(view1.size, [266, 600]);
        assert.deepStrictEqual(view2.size, [266, 300]);
        assert.deepStrictEqual(view3.size, [268, 600]);
        assert.deepStrictEqual(view4.size, [266, 300]);
        const view5 = store.add(new TestView(50, Number.MAX_VALUE, 50, Number.MAX_VALUE));
        grid.addView(view5, Sizing.Distribute, view3, 0 /* Direction.Up */);
        assert.deepStrictEqual(view1.size, [266, 600]);
        assert.deepStrictEqual(view2.size, [266, 300]);
        assert.deepStrictEqual(view3.size, [268, 300]);
        assert.deepStrictEqual(view4.size, [266, 300]);
        assert.deepStrictEqual(view5.size, [268, 300]);
        const view6 = store.add(new TestView(50, Number.MAX_VALUE, 50, Number.MAX_VALUE));
        grid.addView(view6, Sizing.Distribute, view3, 1 /* Direction.Down */);
        assert.deepStrictEqual(view1.size, [266, 600]);
        assert.deepStrictEqual(view2.size, [266, 300]);
        assert.deepStrictEqual(view3.size, [268, 200]);
        assert.deepStrictEqual(view4.size, [266, 300]);
        assert.deepStrictEqual(view5.size, [268, 200]);
        assert.deepStrictEqual(view6.size, [268, 200]);
    });
    test('another simple layout with split size distribution', function () {
        const view1 = store.add(new TestView(50, Number.MAX_VALUE, 50, Number.MAX_VALUE));
        const grid = store.add(new Grid(view1));
        container.appendChild(grid.element);
        grid.layout(800, 600);
        assert.deepStrictEqual(view1.size, [800, 600]);
        const view2 = store.add(new TestView(50, Number.MAX_VALUE, 50, Number.MAX_VALUE));
        grid.addView(view2, Sizing.Split, view1, 2 /* Direction.Left */);
        assert.deepStrictEqual(view1.size, [400, 600]);
        assert.deepStrictEqual(view2.size, [400, 600]);
        const view3 = store.add(new TestView(50, Number.MAX_VALUE, 50, Number.MAX_VALUE));
        grid.addView(view3, Sizing.Split, view1, 3 /* Direction.Right */);
        assert.deepStrictEqual(view1.size, [200, 600]);
        assert.deepStrictEqual(view2.size, [400, 600]);
        assert.deepStrictEqual(view3.size, [200, 600]);
        const view4 = store.add(new TestView(50, Number.MAX_VALUE, 50, Number.MAX_VALUE));
        grid.addView(view4, Sizing.Split, view2, 1 /* Direction.Down */);
        assert.deepStrictEqual(view1.size, [200, 600]);
        assert.deepStrictEqual(view2.size, [400, 300]);
        assert.deepStrictEqual(view3.size, [200, 600]);
        assert.deepStrictEqual(view4.size, [400, 300]);
        const view5 = store.add(new TestView(50, Number.MAX_VALUE, 50, Number.MAX_VALUE));
        grid.addView(view5, Sizing.Split, view3, 0 /* Direction.Up */);
        assert.deepStrictEqual(view1.size, [200, 600]);
        assert.deepStrictEqual(view2.size, [400, 300]);
        assert.deepStrictEqual(view3.size, [200, 300]);
        assert.deepStrictEqual(view4.size, [400, 300]);
        assert.deepStrictEqual(view5.size, [200, 300]);
        const view6 = store.add(new TestView(50, Number.MAX_VALUE, 50, Number.MAX_VALUE));
        grid.addView(view6, Sizing.Split, view3, 1 /* Direction.Down */);
        assert.deepStrictEqual(view1.size, [200, 600]);
        assert.deepStrictEqual(view2.size, [400, 300]);
        assert.deepStrictEqual(view3.size, [200, 150]);
        assert.deepStrictEqual(view4.size, [400, 300]);
        assert.deepStrictEqual(view5.size, [200, 300]);
        assert.deepStrictEqual(view6.size, [200, 150]);
    });
    test('3/2 layout with split', function () {
        const view1 = store.add(new TestView(50, Number.MAX_VALUE, 50, Number.MAX_VALUE));
        const grid = store.add(new Grid(view1));
        container.appendChild(grid.element);
        grid.layout(800, 600);
        assert.deepStrictEqual(view1.size, [800, 600]);
        const view2 = store.add(new TestView(50, Number.MAX_VALUE, 50, Number.MAX_VALUE));
        grid.addView(view2, Sizing.Split, view1, 1 /* Direction.Down */);
        assert.deepStrictEqual(view1.size, [800, 300]);
        assert.deepStrictEqual(view2.size, [800, 300]);
        const view3 = store.add(new TestView(50, Number.MAX_VALUE, 50, Number.MAX_VALUE));
        grid.addView(view3, Sizing.Split, view2, 3 /* Direction.Right */);
        assert.deepStrictEqual(view1.size, [800, 300]);
        assert.deepStrictEqual(view2.size, [400, 300]);
        assert.deepStrictEqual(view3.size, [400, 300]);
        const view4 = store.add(new TestView(50, Number.MAX_VALUE, 50, Number.MAX_VALUE));
        grid.addView(view4, Sizing.Split, view1, 3 /* Direction.Right */);
        assert.deepStrictEqual(view1.size, [400, 300]);
        assert.deepStrictEqual(view2.size, [400, 300]);
        assert.deepStrictEqual(view3.size, [400, 300]);
        assert.deepStrictEqual(view4.size, [400, 300]);
        const view5 = store.add(new TestView(50, Number.MAX_VALUE, 50, Number.MAX_VALUE));
        grid.addView(view5, Sizing.Split, view1, 3 /* Direction.Right */);
        assert.deepStrictEqual(view1.size, [200, 300]);
        assert.deepStrictEqual(view2.size, [400, 300]);
        assert.deepStrictEqual(view3.size, [400, 300]);
        assert.deepStrictEqual(view4.size, [400, 300]);
        assert.deepStrictEqual(view5.size, [200, 300]);
    });
    test('sizing should be correct after branch demotion #50564', function () {
        const view1 = store.add(new TestView(50, Number.MAX_VALUE, 50, Number.MAX_VALUE));
        const grid = store.add(new Grid(view1));
        container.appendChild(grid.element);
        grid.layout(800, 600);
        const view2 = store.add(new TestView(50, Number.MAX_VALUE, 50, Number.MAX_VALUE));
        grid.addView(view2, Sizing.Split, view1, 3 /* Direction.Right */);
        const view3 = store.add(new TestView(50, Number.MAX_VALUE, 50, Number.MAX_VALUE));
        grid.addView(view3, Sizing.Split, view2, 1 /* Direction.Down */);
        const view4 = store.add(new TestView(50, Number.MAX_VALUE, 50, Number.MAX_VALUE));
        grid.addView(view4, Sizing.Split, view2, 3 /* Direction.Right */);
        assert.deepStrictEqual(view1.size, [400, 600]);
        assert.deepStrictEqual(view2.size, [200, 300]);
        assert.deepStrictEqual(view3.size, [400, 300]);
        assert.deepStrictEqual(view4.size, [200, 300]);
        grid.removeView(view3);
        assert.deepStrictEqual(view1.size, [400, 600]);
        assert.deepStrictEqual(view2.size, [200, 600]);
        assert.deepStrictEqual(view4.size, [200, 600]);
    });
    test('sizing should be correct after branch demotion #50675', function () {
        const view1 = store.add(new TestView(50, Number.MAX_VALUE, 50, Number.MAX_VALUE));
        const grid = store.add(new Grid(view1));
        container.appendChild(grid.element);
        grid.layout(800, 600);
        const view2 = store.add(new TestView(50, Number.MAX_VALUE, 50, Number.MAX_VALUE));
        grid.addView(view2, Sizing.Distribute, view1, 1 /* Direction.Down */);
        const view3 = store.add(new TestView(50, Number.MAX_VALUE, 50, Number.MAX_VALUE));
        grid.addView(view3, Sizing.Distribute, view2, 1 /* Direction.Down */);
        const view4 = store.add(new TestView(50, Number.MAX_VALUE, 50, Number.MAX_VALUE));
        grid.addView(view4, Sizing.Distribute, view3, 3 /* Direction.Right */);
        assert.deepStrictEqual(view1.size, [800, 200]);
        assert.deepStrictEqual(view2.size, [800, 200]);
        assert.deepStrictEqual(view3.size, [400, 200]);
        assert.deepStrictEqual(view4.size, [400, 200]);
        grid.removeView(view3, Sizing.Distribute);
        assert.deepStrictEqual(view1.size, [800, 200]);
        assert.deepStrictEqual(view2.size, [800, 200]);
        assert.deepStrictEqual(view4.size, [800, 200]);
    });
    test('getNeighborViews should work on single view layout', function () {
        const view1 = store.add(new TestView(50, Number.MAX_VALUE, 50, Number.MAX_VALUE));
        const grid = store.add(new Grid(view1));
        container.appendChild(grid.element);
        grid.layout(800, 600);
        assert.deepStrictEqual(grid.getNeighborViews(view1, 0 /* Direction.Up */), []);
        assert.deepStrictEqual(grid.getNeighborViews(view1, 3 /* Direction.Right */), []);
        assert.deepStrictEqual(grid.getNeighborViews(view1, 1 /* Direction.Down */), []);
        assert.deepStrictEqual(grid.getNeighborViews(view1, 2 /* Direction.Left */), []);
        assert.deepStrictEqual(grid.getNeighborViews(view1, 0 /* Direction.Up */, true), [view1]);
        assert.deepStrictEqual(grid.getNeighborViews(view1, 3 /* Direction.Right */, true), [view1]);
        assert.deepStrictEqual(grid.getNeighborViews(view1, 1 /* Direction.Down */, true), [view1]);
        assert.deepStrictEqual(grid.getNeighborViews(view1, 2 /* Direction.Left */, true), [view1]);
    });
    test('getNeighborViews should work on simple layout', function () {
        const view1 = store.add(new TestView(50, Number.MAX_VALUE, 50, Number.MAX_VALUE));
        const grid = store.add(new Grid(view1));
        container.appendChild(grid.element);
        grid.layout(800, 600);
        const view2 = store.add(new TestView(50, Number.MAX_VALUE, 50, Number.MAX_VALUE));
        grid.addView(view2, Sizing.Distribute, view1, 1 /* Direction.Down */);
        const view3 = store.add(new TestView(50, Number.MAX_VALUE, 50, Number.MAX_VALUE));
        grid.addView(view3, Sizing.Distribute, view2, 1 /* Direction.Down */);
        assert.deepStrictEqual(grid.getNeighborViews(view1, 0 /* Direction.Up */), []);
        assert.deepStrictEqual(grid.getNeighborViews(view1, 3 /* Direction.Right */), []);
        assert.deepStrictEqual(grid.getNeighborViews(view1, 1 /* Direction.Down */), [view2]);
        assert.deepStrictEqual(grid.getNeighborViews(view1, 2 /* Direction.Left */), []);
        assert.deepStrictEqual(grid.getNeighborViews(view1, 0 /* Direction.Up */, true), [view3]);
        assert.deepStrictEqual(grid.getNeighborViews(view1, 3 /* Direction.Right */, true), [view1]);
        assert.deepStrictEqual(grid.getNeighborViews(view1, 1 /* Direction.Down */, true), [view2]);
        assert.deepStrictEqual(grid.getNeighborViews(view1, 2 /* Direction.Left */, true), [view1]);
        assert.deepStrictEqual(grid.getNeighborViews(view2, 0 /* Direction.Up */), [view1]);
        assert.deepStrictEqual(grid.getNeighborViews(view2, 3 /* Direction.Right */), []);
        assert.deepStrictEqual(grid.getNeighborViews(view2, 1 /* Direction.Down */), [view3]);
        assert.deepStrictEqual(grid.getNeighborViews(view2, 2 /* Direction.Left */), []);
        assert.deepStrictEqual(grid.getNeighborViews(view2, 0 /* Direction.Up */, true), [view1]);
        assert.deepStrictEqual(grid.getNeighborViews(view2, 3 /* Direction.Right */, true), [view2]);
        assert.deepStrictEqual(grid.getNeighborViews(view2, 1 /* Direction.Down */, true), [view3]);
        assert.deepStrictEqual(grid.getNeighborViews(view2, 2 /* Direction.Left */, true), [view2]);
        assert.deepStrictEqual(grid.getNeighborViews(view3, 0 /* Direction.Up */), [view2]);
        assert.deepStrictEqual(grid.getNeighborViews(view3, 3 /* Direction.Right */), []);
        assert.deepStrictEqual(grid.getNeighborViews(view3, 1 /* Direction.Down */), []);
        assert.deepStrictEqual(grid.getNeighborViews(view3, 2 /* Direction.Left */), []);
        assert.deepStrictEqual(grid.getNeighborViews(view3, 0 /* Direction.Up */, true), [view2]);
        assert.deepStrictEqual(grid.getNeighborViews(view3, 3 /* Direction.Right */, true), [view3]);
        assert.deepStrictEqual(grid.getNeighborViews(view3, 1 /* Direction.Down */, true), [view1]);
        assert.deepStrictEqual(grid.getNeighborViews(view3, 2 /* Direction.Left */, true), [view3]);
    });
    test('getNeighborViews should work on a complex layout', function () {
        const view1 = store.add(new TestView(50, Number.MAX_VALUE, 50, Number.MAX_VALUE));
        const grid = store.add(new Grid(view1));
        container.appendChild(grid.element);
        grid.layout(800, 600);
        const view2 = store.add(new TestView(50, Number.MAX_VALUE, 50, Number.MAX_VALUE));
        grid.addView(view2, Sizing.Distribute, view1, 1 /* Direction.Down */);
        const view3 = store.add(new TestView(50, Number.MAX_VALUE, 50, Number.MAX_VALUE));
        grid.addView(view3, Sizing.Distribute, view2, 1 /* Direction.Down */);
        const view4 = store.add(new TestView(50, Number.MAX_VALUE, 50, Number.MAX_VALUE));
        grid.addView(view4, Sizing.Distribute, view2, 3 /* Direction.Right */);
        const view5 = store.add(new TestView(50, Number.MAX_VALUE, 50, Number.MAX_VALUE));
        grid.addView(view5, Sizing.Distribute, view4, 1 /* Direction.Down */);
        assert.deepStrictEqual(grid.getNeighborViews(view1, 0 /* Direction.Up */), []);
        assert.deepStrictEqual(grid.getNeighborViews(view1, 3 /* Direction.Right */), []);
        assert.deepStrictEqual(grid.getNeighborViews(view1, 1 /* Direction.Down */), [view2, view4]);
        assert.deepStrictEqual(grid.getNeighborViews(view1, 2 /* Direction.Left */), []);
        assert.deepStrictEqual(grid.getNeighborViews(view2, 0 /* Direction.Up */), [view1]);
        assert.deepStrictEqual(grid.getNeighborViews(view2, 3 /* Direction.Right */), [view4, view5]);
        assert.deepStrictEqual(grid.getNeighborViews(view2, 1 /* Direction.Down */), [view3]);
        assert.deepStrictEqual(grid.getNeighborViews(view2, 2 /* Direction.Left */), []);
        assert.deepStrictEqual(grid.getNeighborViews(view4, 0 /* Direction.Up */), [view1]);
        assert.deepStrictEqual(grid.getNeighborViews(view4, 3 /* Direction.Right */), []);
        assert.deepStrictEqual(grid.getNeighborViews(view4, 1 /* Direction.Down */), [view5]);
        assert.deepStrictEqual(grid.getNeighborViews(view4, 2 /* Direction.Left */), [view2]);
        assert.deepStrictEqual(grid.getNeighborViews(view5, 0 /* Direction.Up */), [view4]);
        assert.deepStrictEqual(grid.getNeighborViews(view5, 3 /* Direction.Right */), []);
        assert.deepStrictEqual(grid.getNeighborViews(view5, 1 /* Direction.Down */), [view3]);
        assert.deepStrictEqual(grid.getNeighborViews(view5, 2 /* Direction.Left */), [view2]);
        assert.deepStrictEqual(grid.getNeighborViews(view3, 0 /* Direction.Up */), [view2, view5]);
        assert.deepStrictEqual(grid.getNeighborViews(view3, 3 /* Direction.Right */), []);
        assert.deepStrictEqual(grid.getNeighborViews(view3, 1 /* Direction.Down */), []);
        assert.deepStrictEqual(grid.getNeighborViews(view3, 2 /* Direction.Left */), []);
    });
    test('getNeighborViews should work on another simple layout', function () {
        const view1 = store.add(new TestView(50, Number.MAX_VALUE, 50, Number.MAX_VALUE));
        const grid = store.add(new Grid(view1));
        container.appendChild(grid.element);
        grid.layout(800, 600);
        const view2 = store.add(new TestView(50, Number.MAX_VALUE, 50, Number.MAX_VALUE));
        grid.addView(view2, Sizing.Distribute, view1, 3 /* Direction.Right */);
        const view3 = store.add(new TestView(50, Number.MAX_VALUE, 50, Number.MAX_VALUE));
        grid.addView(view3, Sizing.Distribute, view2, 1 /* Direction.Down */);
        const view4 = store.add(new TestView(50, Number.MAX_VALUE, 50, Number.MAX_VALUE));
        grid.addView(view4, Sizing.Distribute, view2, 3 /* Direction.Right */);
        assert.deepStrictEqual(grid.getNeighborViews(view4, 0 /* Direction.Up */), []);
        assert.deepStrictEqual(grid.getNeighborViews(view4, 3 /* Direction.Right */), []);
        assert.deepStrictEqual(grid.getNeighborViews(view4, 1 /* Direction.Down */), [view3]);
        assert.deepStrictEqual(grid.getNeighborViews(view4, 2 /* Direction.Left */), [view2]);
    });
    test('getNeighborViews should only return immediate neighbors', function () {
        const view1 = store.add(new TestView(50, Number.MAX_VALUE, 50, Number.MAX_VALUE));
        const grid = store.add(new Grid(view1));
        container.appendChild(grid.element);
        grid.layout(800, 600);
        const view2 = store.add(new TestView(50, Number.MAX_VALUE, 50, Number.MAX_VALUE));
        grid.addView(view2, Sizing.Distribute, view1, 3 /* Direction.Right */);
        const view3 = store.add(new TestView(50, Number.MAX_VALUE, 50, Number.MAX_VALUE));
        grid.addView(view3, Sizing.Distribute, view2, 1 /* Direction.Down */);
        const view4 = store.add(new TestView(50, Number.MAX_VALUE, 50, Number.MAX_VALUE));
        grid.addView(view4, Sizing.Distribute, view2, 3 /* Direction.Right */);
        assert.deepStrictEqual(grid.getNeighborViews(view1, 3 /* Direction.Right */), [view2, view3]);
    });
    test('hiding splitviews and restoring sizes', function () {
        const view1 = store.add(new TestView(50, Number.MAX_VALUE, 50, Number.MAX_VALUE));
        const grid = store.add(new Grid(view1));
        container.appendChild(grid.element);
        grid.layout(800, 600);
        const view2 = store.add(new TestView(50, Number.MAX_VALUE, 50, Number.MAX_VALUE));
        grid.addView(view2, Sizing.Distribute, view1, 3 /* Direction.Right */);
        const view3 = store.add(new TestView(50, Number.MAX_VALUE, 50, Number.MAX_VALUE));
        grid.addView(view3, Sizing.Distribute, view2, 1 /* Direction.Down */);
        const view4 = store.add(new TestView(50, Number.MAX_VALUE, 50, Number.MAX_VALUE));
        grid.addView(view4, Sizing.Distribute, view2, 3 /* Direction.Right */);
        const size1 = view1.size;
        const size2 = view2.size;
        const size3 = view3.size;
        const size4 = view4.size;
        grid.maximizeView(view1);
        // Views 2, 3, 4 are hidden
        // Splitview (2,4) and ((2,4),3) are hidden
        assert.deepStrictEqual(view1.size, [800, 600]);
        assert.deepStrictEqual(view2.size, [0, 0]);
        assert.deepStrictEqual(view3.size, [0, 0]);
        assert.deepStrictEqual(view4.size, [0, 0]);
        grid.exitMaximizedView();
        assert.deepStrictEqual(view1.size, size1);
        assert.deepStrictEqual(view2.size, size2);
        assert.deepStrictEqual(view3.size, size3);
        assert.deepStrictEqual(view4.size, size4);
        // Views 1, 3, 4 are hidden
        // All splitviews are still visible => only orthogonalsize is 0
        grid.maximizeView(view2);
        assert.deepStrictEqual(view1.size, [0, 600]);
        assert.deepStrictEqual(view2.size, [800, 600]);
        assert.deepStrictEqual(view3.size, [800, 0]);
        assert.deepStrictEqual(view4.size, [0, 600]);
        grid.exitMaximizedView();
        assert.deepStrictEqual(view1.size, size1);
        assert.deepStrictEqual(view2.size, size2);
        assert.deepStrictEqual(view3.size, size3);
        assert.deepStrictEqual(view4.size, size4);
    });
    test('hasMaximizedView', function () {
        const view1 = store.add(new TestView(50, Number.MAX_VALUE, 50, Number.MAX_VALUE));
        const grid = store.add(new Grid(view1));
        container.appendChild(grid.element);
        grid.layout(800, 600);
        const view2 = store.add(new TestView(50, Number.MAX_VALUE, 50, Number.MAX_VALUE));
        grid.addView(view2, Sizing.Distribute, view1, 3 /* Direction.Right */);
        const view3 = store.add(new TestView(50, Number.MAX_VALUE, 50, Number.MAX_VALUE));
        grid.addView(view3, Sizing.Distribute, view2, 1 /* Direction.Down */);
        const view4 = store.add(new TestView(50, Number.MAX_VALUE, 50, Number.MAX_VALUE));
        grid.addView(view4, Sizing.Distribute, view2, 3 /* Direction.Right */);
        function checkIsMaximized(view) {
            grid.maximizeView(view);
            assert.deepStrictEqual(grid.hasMaximizedView(), true);
            // When a view is maximized, no view can be expanded even if it is maximized
            assert.deepStrictEqual(grid.isViewExpanded(view1), false);
            assert.deepStrictEqual(grid.isViewExpanded(view2), false);
            assert.deepStrictEqual(grid.isViewExpanded(view3), false);
            assert.deepStrictEqual(grid.isViewExpanded(view4), false);
            grid.exitMaximizedView();
            assert.deepStrictEqual(grid.hasMaximizedView(), false);
        }
        checkIsMaximized(view1);
        checkIsMaximized(view2);
        checkIsMaximized(view3);
        checkIsMaximized(view4);
    });
    test('Changes to the grid unmaximize the view', function () {
        const view1 = store.add(new TestView(50, Number.MAX_VALUE, 50, Number.MAX_VALUE));
        const grid = store.add(new Grid(view1));
        container.appendChild(grid.element);
        grid.layout(800, 600);
        const view2 = store.add(new TestView(50, Number.MAX_VALUE, 50, Number.MAX_VALUE));
        grid.addView(view2, Sizing.Distribute, view1, 3 /* Direction.Right */);
        const view3 = store.add(new TestView(50, Number.MAX_VALUE, 50, Number.MAX_VALUE));
        grid.addView(view3, Sizing.Distribute, view2, 1 /* Direction.Down */);
        const view4 = store.add(new TestView(50, Number.MAX_VALUE, 50, Number.MAX_VALUE));
        // Adding a view unmaximizes the view
        grid.maximizeView(view1);
        assert.deepStrictEqual(grid.hasMaximizedView(), true);
        grid.addView(view4, Sizing.Distribute, view2, 3 /* Direction.Right */);
        assert.deepStrictEqual(grid.hasMaximizedView(), false);
        assert.deepStrictEqual(grid.isViewVisible(view1), true);
        assert.deepStrictEqual(grid.isViewVisible(view2), true);
        assert.deepStrictEqual(grid.isViewVisible(view3), true);
        assert.deepStrictEqual(grid.isViewVisible(view4), true);
        // Removing a view unmaximizes the view
        grid.maximizeView(view1);
        assert.deepStrictEqual(grid.hasMaximizedView(), true);
        grid.removeView(view4);
        assert.deepStrictEqual(grid.hasMaximizedView(), false);
        assert.deepStrictEqual(grid.isViewVisible(view1), true);
        assert.deepStrictEqual(grid.isViewVisible(view2), true);
        assert.deepStrictEqual(grid.isViewVisible(view3), true);
        // Changing the visibility of any view while a view is maximized, unmaximizes the view
        grid.maximizeView(view1);
        assert.deepStrictEqual(grid.hasMaximizedView(), true);
        grid.setViewVisible(view3, true);
        assert.deepStrictEqual(grid.hasMaximizedView(), false);
        assert.deepStrictEqual(grid.isViewVisible(view1), true);
        assert.deepStrictEqual(grid.isViewVisible(view2), true);
        assert.deepStrictEqual(grid.isViewVisible(view3), true);
    });
    test('Changes to the grid sizing unmaximize the view', function () {
        const view1 = store.add(new TestView(50, Number.MAX_VALUE, 50, Number.MAX_VALUE));
        const grid = store.add(new Grid(view1));
        container.appendChild(grid.element);
        grid.layout(800, 600);
        const view2 = store.add(new TestView(50, Number.MAX_VALUE, 50, Number.MAX_VALUE));
        grid.addView(view2, Sizing.Distribute, view1, 3 /* Direction.Right */);
        const view3 = store.add(new TestView(50, Number.MAX_VALUE, 50, Number.MAX_VALUE));
        grid.addView(view3, Sizing.Distribute, view2, 1 /* Direction.Down */);
        const view4 = store.add(new TestView(50, Number.MAX_VALUE, 50, Number.MAX_VALUE));
        grid.addView(view4, Sizing.Distribute, view2, 3 /* Direction.Right */);
        // Maximizing a different view unmaximizes the current one and maximizes the new one
        grid.maximizeView(view1);
        assert.deepStrictEqual(grid.hasMaximizedView(), true);
        grid.maximizeView(view2);
        assert.deepStrictEqual(grid.hasMaximizedView(), true);
        assert.deepStrictEqual(grid.isViewVisible(view1), false);
        assert.deepStrictEqual(grid.isViewVisible(view2), true);
        assert.deepStrictEqual(grid.isViewVisible(view3), false);
        assert.deepStrictEqual(grid.isViewVisible(view4), false);
        // Distributing the size unmaximizes the view
        grid.maximizeView(view1);
        assert.deepStrictEqual(grid.hasMaximizedView(), true);
        grid.distributeViewSizes();
        assert.deepStrictEqual(grid.hasMaximizedView(), false);
        assert.deepStrictEqual(grid.isViewVisible(view1), true);
        assert.deepStrictEqual(grid.isViewVisible(view2), true);
        assert.deepStrictEqual(grid.isViewVisible(view3), true);
        assert.deepStrictEqual(grid.isViewVisible(view4), true);
        // Expanding a different view unmaximizes the view
        grid.maximizeView(view1);
        assert.deepStrictEqual(grid.hasMaximizedView(), true);
        grid.expandView(view2);
        assert.deepStrictEqual(grid.hasMaximizedView(), false);
        assert.deepStrictEqual(grid.isViewVisible(view1), true);
        assert.deepStrictEqual(grid.isViewVisible(view2), true);
        assert.deepStrictEqual(grid.isViewVisible(view3), true);
        assert.deepStrictEqual(grid.isViewVisible(view4), true);
        // Expanding the maximized view unmaximizes the view
        grid.maximizeView(view1);
        assert.deepStrictEqual(grid.hasMaximizedView(), true);
        grid.expandView(view1);
        assert.deepStrictEqual(grid.hasMaximizedView(), false);
        assert.deepStrictEqual(grid.isViewVisible(view1), true);
        assert.deepStrictEqual(grid.isViewVisible(view2), true);
        assert.deepStrictEqual(grid.isViewVisible(view3), true);
        assert.deepStrictEqual(grid.isViewVisible(view4), true);
    });
});
class TestSerializableView extends TestView {
    constructor(name, minimumWidth, maximumWidth, minimumHeight, maximumHeight) {
        super(minimumWidth, maximumWidth, minimumHeight, maximumHeight);
        this.name = name;
    }
    toJSON() {
        return { name: this.name };
    }
}
class TestViewDeserializer {
    constructor(store) {
        this.store = store;
        this.views = new Map();
    }
    fromJSON(json) {
        const view = this.store.add(new TestSerializableView(json.name, 50, Number.MAX_VALUE, 50, Number.MAX_VALUE));
        this.views.set(json.name, view);
        return view;
    }
    getView(id) {
        const view = this.views.get(id);
        if (!view) {
            throw new Error('Unknown view');
        }
        return view;
    }
}
function nodesToNames(node) {
    if (isGridBranchNode(node)) {
        return node.children.map(nodesToNames);
    }
    else {
        return node.view.name;
    }
}
suite('SerializableGrid', function () {
    const store = ensureNoDisposablesAreLeakedInTestSuite();
    let container;
    setup(function () {
        container = document.createElement('div');
        container.style.position = 'absolute';
        container.style.width = `${800}px`;
        container.style.height = `${600}px`;
    });
    test('serialize empty', function () {
        const view1 = store.add(new TestSerializableView('view1', 50, Number.MAX_VALUE, 50, Number.MAX_VALUE));
        const grid = store.add(new SerializableGrid(view1));
        container.appendChild(grid.element);
        grid.layout(800, 600);
        const actual = grid.serialize();
        assert.deepStrictEqual(actual, {
            orientation: 0,
            width: 800,
            height: 600,
            root: {
                type: 'branch',
                data: [
                    {
                        type: 'leaf',
                        data: {
                            name: 'view1',
                        },
                        size: 600,
                    },
                ],
                size: 800,
            },
        });
    });
    test('serialize simple layout', function () {
        const view1 = store.add(new TestSerializableView('view1', 50, Number.MAX_VALUE, 50, Number.MAX_VALUE));
        const grid = store.add(new SerializableGrid(view1));
        container.appendChild(grid.element);
        grid.layout(800, 600);
        const view2 = store.add(new TestSerializableView('view2', 50, Number.MAX_VALUE, 50, Number.MAX_VALUE));
        grid.addView(view2, 200, view1, 0 /* Direction.Up */);
        const view3 = store.add(new TestSerializableView('view3', 50, Number.MAX_VALUE, 50, Number.MAX_VALUE));
        grid.addView(view3, 200, view1, 3 /* Direction.Right */);
        const view4 = store.add(new TestSerializableView('view4', 50, Number.MAX_VALUE, 50, Number.MAX_VALUE));
        grid.addView(view4, 200, view2, 2 /* Direction.Left */);
        const view5 = store.add(new TestSerializableView('view5', 50, Number.MAX_VALUE, 50, Number.MAX_VALUE));
        grid.addView(view5, 100, view1, 1 /* Direction.Down */);
        assert.deepStrictEqual(grid.serialize(), {
            orientation: 0,
            width: 800,
            height: 600,
            root: {
                type: 'branch',
                data: [
                    {
                        type: 'branch',
                        data: [
                            { type: 'leaf', data: { name: 'view4' }, size: 200 },
                            { type: 'leaf', data: { name: 'view2' }, size: 600 },
                        ],
                        size: 200,
                    },
                    {
                        type: 'branch',
                        data: [
                            {
                                type: 'branch',
                                data: [
                                    { type: 'leaf', data: { name: 'view1' }, size: 300 },
                                    { type: 'leaf', data: { name: 'view5' }, size: 100 },
                                ],
                                size: 600,
                            },
                            { type: 'leaf', data: { name: 'view3' }, size: 200 },
                        ],
                        size: 400,
                    },
                ],
                size: 800,
            },
        });
    });
    test('deserialize empty', function () {
        const view1 = store.add(new TestSerializableView('view1', 50, Number.MAX_VALUE, 50, Number.MAX_VALUE));
        const grid = store.add(new SerializableGrid(view1));
        container.appendChild(grid.element);
        grid.layout(800, 600);
        const json = grid.serialize();
        grid.dispose();
        const deserializer = new TestViewDeserializer(store);
        const grid2 = store.add(SerializableGrid.deserialize(json, deserializer));
        grid2.layout(800, 600);
        assert.deepStrictEqual(nodesToNames(grid2.getViews()), ['view1']);
    });
    test('deserialize simple layout', function () {
        const view1 = store.add(new TestSerializableView('view1', 50, Number.MAX_VALUE, 50, Number.MAX_VALUE));
        const grid = store.add(new SerializableGrid(view1));
        container.appendChild(grid.element);
        grid.layout(800, 600);
        const view2 = store.add(new TestSerializableView('view2', 50, Number.MAX_VALUE, 50, Number.MAX_VALUE));
        grid.addView(view2, 200, view1, 0 /* Direction.Up */);
        const view3 = store.add(new TestSerializableView('view3', 50, Number.MAX_VALUE, 50, Number.MAX_VALUE));
        grid.addView(view3, 200, view1, 3 /* Direction.Right */);
        const view4 = store.add(new TestSerializableView('view4', 50, Number.MAX_VALUE, 50, Number.MAX_VALUE));
        grid.addView(view4, 200, view2, 2 /* Direction.Left */);
        const view5 = store.add(new TestSerializableView('view5', 50, Number.MAX_VALUE, 50, Number.MAX_VALUE));
        grid.addView(view5, 100, view1, 1 /* Direction.Down */);
        const json = grid.serialize();
        grid.dispose();
        const deserializer = new TestViewDeserializer(store);
        const grid2 = store.add(SerializableGrid.deserialize(json, deserializer));
        const view1Copy = deserializer.getView('view1');
        const view2Copy = deserializer.getView('view2');
        const view3Copy = deserializer.getView('view3');
        const view4Copy = deserializer.getView('view4');
        const view5Copy = deserializer.getView('view5');
        assert.deepStrictEqual(nodesToArrays(grid2.getViews()), [
            [view4Copy, view2Copy],
            [[view1Copy, view5Copy], view3Copy],
        ]);
        grid2.layout(800, 600);
        assert.deepStrictEqual(view1Copy.size, [600, 300]);
        assert.deepStrictEqual(view2Copy.size, [600, 200]);
        assert.deepStrictEqual(view3Copy.size, [200, 400]);
        assert.deepStrictEqual(view4Copy.size, [200, 200]);
        assert.deepStrictEqual(view5Copy.size, [600, 100]);
    });
    test('deserialize simple layout with scaling', function () {
        const view1 = store.add(new TestSerializableView('view1', 50, Number.MAX_VALUE, 50, Number.MAX_VALUE));
        const grid = store.add(new SerializableGrid(view1));
        container.appendChild(grid.element);
        grid.layout(800, 600);
        const view2 = store.add(new TestSerializableView('view2', 50, Number.MAX_VALUE, 50, Number.MAX_VALUE));
        grid.addView(view2, 200, view1, 0 /* Direction.Up */);
        const view3 = store.add(new TestSerializableView('view3', 50, Number.MAX_VALUE, 50, Number.MAX_VALUE));
        grid.addView(view3, 200, view1, 3 /* Direction.Right */);
        const view4 = store.add(new TestSerializableView('view4', 50, Number.MAX_VALUE, 50, Number.MAX_VALUE));
        grid.addView(view4, 200, view2, 2 /* Direction.Left */);
        const view5 = store.add(new TestSerializableView('view5', 50, Number.MAX_VALUE, 50, Number.MAX_VALUE));
        grid.addView(view5, 100, view1, 1 /* Direction.Down */);
        const json = grid.serialize();
        grid.dispose();
        const deserializer = new TestViewDeserializer(store);
        const grid2 = store.add(SerializableGrid.deserialize(json, deserializer));
        const view1Copy = deserializer.getView('view1');
        const view2Copy = deserializer.getView('view2');
        const view3Copy = deserializer.getView('view3');
        const view4Copy = deserializer.getView('view4');
        const view5Copy = deserializer.getView('view5');
        grid2.layout(400, 800); // [/2, *4/3]
        assert.deepStrictEqual(view1Copy.size, [300, 400]);
        assert.deepStrictEqual(view2Copy.size, [300, 267]);
        assert.deepStrictEqual(view3Copy.size, [100, 533]);
        assert.deepStrictEqual(view4Copy.size, [100, 267]);
        assert.deepStrictEqual(view5Copy.size, [300, 133]);
    });
    test('deserialize 4 view layout (ben issue #2)', function () {
        const view1 = store.add(new TestSerializableView('view1', 50, Number.MAX_VALUE, 50, Number.MAX_VALUE));
        const grid = store.add(new SerializableGrid(view1));
        container.appendChild(grid.element);
        grid.layout(800, 600);
        const view2 = store.add(new TestSerializableView('view2', 50, Number.MAX_VALUE, 50, Number.MAX_VALUE));
        grid.addView(view2, Sizing.Split, view1, 1 /* Direction.Down */);
        const view3 = store.add(new TestSerializableView('view3', 50, Number.MAX_VALUE, 50, Number.MAX_VALUE));
        grid.addView(view3, Sizing.Split, view2, 1 /* Direction.Down */);
        const view4 = store.add(new TestSerializableView('view4', 50, Number.MAX_VALUE, 50, Number.MAX_VALUE));
        grid.addView(view4, Sizing.Split, view3, 3 /* Direction.Right */);
        const json = grid.serialize();
        grid.dispose();
        const deserializer = new TestViewDeserializer(store);
        const grid2 = store.add(SerializableGrid.deserialize(json, deserializer));
        const view1Copy = deserializer.getView('view1');
        const view2Copy = deserializer.getView('view2');
        const view3Copy = deserializer.getView('view3');
        const view4Copy = deserializer.getView('view4');
        grid2.layout(800, 600);
        assert.deepStrictEqual(view1Copy.size, [800, 300]);
        assert.deepStrictEqual(view2Copy.size, [800, 150]);
        assert.deepStrictEqual(view3Copy.size, [400, 150]);
        assert.deepStrictEqual(view4Copy.size, [400, 150]);
    });
    test('deserialize 2 view layout (ben issue #3)', function () {
        const view1 = store.add(new TestSerializableView('view1', 50, Number.MAX_VALUE, 50, Number.MAX_VALUE));
        const grid = store.add(new SerializableGrid(view1));
        container.appendChild(grid.element);
        grid.layout(800, 600);
        const view2 = store.add(new TestSerializableView('view2', 50, Number.MAX_VALUE, 50, Number.MAX_VALUE));
        grid.addView(view2, Sizing.Split, view1, 3 /* Direction.Right */);
        const json = grid.serialize();
        grid.dispose();
        const deserializer = new TestViewDeserializer(store);
        const grid2 = store.add(SerializableGrid.deserialize(json, deserializer));
        const view1Copy = deserializer.getView('view1');
        const view2Copy = deserializer.getView('view2');
        grid2.layout(800, 600);
        assert.deepStrictEqual(view1Copy.size, [400, 600]);
        assert.deepStrictEqual(view2Copy.size, [400, 600]);
    });
    test('deserialize simple view layout #50609', function () {
        const view1 = store.add(new TestSerializableView('view1', 50, Number.MAX_VALUE, 50, Number.MAX_VALUE));
        const grid = store.add(new SerializableGrid(view1));
        container.appendChild(grid.element);
        grid.layout(800, 600);
        const view2 = store.add(new TestSerializableView('view2', 50, Number.MAX_VALUE, 50, Number.MAX_VALUE));
        grid.addView(view2, Sizing.Split, view1, 3 /* Direction.Right */);
        const view3 = store.add(new TestSerializableView('view3', 50, Number.MAX_VALUE, 50, Number.MAX_VALUE));
        grid.addView(view3, Sizing.Split, view2, 1 /* Direction.Down */);
        grid.removeView(view1, Sizing.Split);
        const json = grid.serialize();
        grid.dispose();
        const deserializer = new TestViewDeserializer(store);
        const grid2 = store.add(SerializableGrid.deserialize(json, deserializer));
        const view2Copy = deserializer.getView('view2');
        const view3Copy = deserializer.getView('view3');
        grid2.layout(800, 600);
        assert.deepStrictEqual(view2Copy.size, [800, 300]);
        assert.deepStrictEqual(view3Copy.size, [800, 300]);
    });
    test('sanitizeGridNodeDescriptor', () => {
        const nodeDescriptor = {
            groups: [{ size: 0.2 }, { size: 0.2 }, { size: 0.6, groups: [{}, {}] }],
        };
        const nodeDescriptorCopy = deepClone(nodeDescriptor);
        sanitizeGridNodeDescriptor(nodeDescriptorCopy, true);
        assert.deepStrictEqual(nodeDescriptorCopy, {
            groups: [{ size: 0.2 }, { size: 0.2 }, { size: 0.6, groups: [{ size: 0.5 }, { size: 0.5 }] }],
        });
    });
    test('createSerializedGrid', () => {
        const gridDescriptor = {
            orientation: 0 /* Orientation.VERTICAL */,
            groups: [
                { size: 0.2, data: 'a' },
                { size: 0.2, data: 'b' },
                { size: 0.6, groups: [{ data: 'c' }, { data: 'd' }] },
            ],
        };
        const serializedGrid = createSerializedGrid(gridDescriptor);
        assert.deepStrictEqual(serializedGrid, {
            root: {
                type: 'branch',
                size: undefined,
                data: [
                    { type: 'leaf', size: 0.2, data: 'a' },
                    { type: 'leaf', size: 0.2, data: 'b' },
                    {
                        type: 'branch',
                        size: 0.6,
                        data: [
                            { type: 'leaf', size: 0.5, data: 'c' },
                            { type: 'leaf', size: 0.5, data: 'd' },
                        ],
                    },
                ],
            },
            orientation: 0 /* Orientation.VERTICAL */,
            width: 1,
            height: 1,
        });
    });
    test('createSerializedGrid - issue #85601, should not allow single children groups', () => {
        const serializedGrid = createSerializedGrid({
            orientation: 1 /* Orientation.HORIZONTAL */,
            groups: [
                { groups: [{}, {}], size: 0.5 },
                { groups: [{}], size: 0.5 },
            ],
        });
        const views = [];
        const deserializer = new (class {
            fromJSON() {
                const view = {
                    element: document.createElement('div'),
                    layout: () => null,
                    minimumWidth: 0,
                    maximumWidth: Number.POSITIVE_INFINITY,
                    minimumHeight: 0,
                    maximumHeight: Number.POSITIVE_INFINITY,
                    onDidChange: Event.None,
                    toJSON: () => ({}),
                };
                views.push(view);
                return view;
            }
        })();
        const grid = store.add(SerializableGrid.deserialize(serializedGrid, deserializer));
        assert.strictEqual(views.length, 3);
        // should not throw
        grid.removeView(views[2]);
    });
    test('from', () => {
        const createView = () => ({
            element: document.createElement('div'),
            layout: () => null,
            minimumWidth: 0,
            maximumWidth: Number.POSITIVE_INFINITY,
            minimumHeight: 0,
            maximumHeight: Number.POSITIVE_INFINITY,
            onDidChange: Event.None,
            toJSON: () => ({}),
        });
        const a = createView();
        const b = createView();
        const c = createView();
        const d = createView();
        const gridDescriptor = {
            orientation: 0 /* Orientation.VERTICAL */,
            groups: [
                { size: 0.2, data: a },
                { size: 0.2, data: b },
                { size: 0.6, groups: [{ data: c }, { data: d }] },
            ],
        };
        const grid = SerializableGrid.from(gridDescriptor);
        assert.deepStrictEqual(nodesToArrays(grid.getViews()), [a, b, [c, d]]);
        grid.dispose();
    });
    test('serialize should store visibility and previous size', function () {
        const view1 = store.add(new TestSerializableView('view1', 50, Number.MAX_VALUE, 50, Number.MAX_VALUE));
        const grid = store.add(new SerializableGrid(view1));
        container.appendChild(grid.element);
        grid.layout(800, 600);
        const view2 = store.add(new TestSerializableView('view2', 50, Number.MAX_VALUE, 50, Number.MAX_VALUE));
        grid.addView(view2, 200, view1, 0 /* Direction.Up */);
        const view3 = store.add(new TestSerializableView('view3', 50, Number.MAX_VALUE, 50, Number.MAX_VALUE));
        grid.addView(view3, 200, view1, 3 /* Direction.Right */);
        const view4 = store.add(new TestSerializableView('view4', 50, Number.MAX_VALUE, 50, Number.MAX_VALUE));
        grid.addView(view4, 200, view2, 2 /* Direction.Left */);
        const view5 = store.add(new TestSerializableView('view5', 50, Number.MAX_VALUE, 50, Number.MAX_VALUE));
        grid.addView(view5, 100, view1, 1 /* Direction.Down */);
        assert.deepStrictEqual(view1.size, [600, 300]);
        assert.deepStrictEqual(view2.size, [600, 200]);
        assert.deepStrictEqual(view3.size, [200, 400]);
        assert.deepStrictEqual(view4.size, [200, 200]);
        assert.deepStrictEqual(view5.size, [600, 100]);
        grid.setViewVisible(view5, false);
        assert.deepStrictEqual(view1.size, [600, 400]);
        assert.deepStrictEqual(view2.size, [600, 200]);
        assert.deepStrictEqual(view3.size, [200, 400]);
        assert.deepStrictEqual(view4.size, [200, 200]);
        assert.deepStrictEqual(view5.size, [600, 0]);
        grid.setViewVisible(view5, true);
        assert.deepStrictEqual(view1.size, [600, 300]);
        assert.deepStrictEqual(view2.size, [600, 200]);
        assert.deepStrictEqual(view3.size, [200, 400]);
        assert.deepStrictEqual(view4.size, [200, 200]);
        assert.deepStrictEqual(view5.size, [600, 100]);
        grid.setViewVisible(view5, false);
        assert.deepStrictEqual(view1.size, [600, 400]);
        assert.deepStrictEqual(view2.size, [600, 200]);
        assert.deepStrictEqual(view3.size, [200, 400]);
        assert.deepStrictEqual(view4.size, [200, 200]);
        assert.deepStrictEqual(view5.size, [600, 0]);
        grid.setViewVisible(view5, false);
        const json = grid.serialize();
        assert.deepStrictEqual(json, {
            orientation: 0,
            width: 800,
            height: 600,
            root: {
                type: 'branch',
                data: [
                    {
                        type: 'branch',
                        data: [
                            { type: 'leaf', data: { name: 'view4' }, size: 200 },
                            { type: 'leaf', data: { name: 'view2' }, size: 600 },
                        ],
                        size: 200,
                    },
                    {
                        type: 'branch',
                        data: [
                            {
                                type: 'branch',
                                data: [
                                    { type: 'leaf', data: { name: 'view1' }, size: 400 },
                                    { type: 'leaf', data: { name: 'view5' }, size: 100, visible: false },
                                ],
                                size: 600,
                            },
                            { type: 'leaf', data: { name: 'view3' }, size: 200 },
                        ],
                        size: 400,
                    },
                ],
                size: 800,
            },
        });
        grid.dispose();
        const deserializer = new TestViewDeserializer(store);
        const grid2 = store.add(SerializableGrid.deserialize(json, deserializer));
        const view1Copy = deserializer.getView('view1');
        const view2Copy = deserializer.getView('view2');
        const view3Copy = deserializer.getView('view3');
        const view4Copy = deserializer.getView('view4');
        const view5Copy = deserializer.getView('view5');
        assert.deepStrictEqual(nodesToArrays(grid2.getViews()), [
            [view4Copy, view2Copy],
            [[view1Copy, view5Copy], view3Copy],
        ]);
        grid2.layout(800, 600);
        assert.deepStrictEqual(view1Copy.size, [600, 400]);
        assert.deepStrictEqual(view2Copy.size, [600, 200]);
        assert.deepStrictEqual(view3Copy.size, [200, 400]);
        assert.deepStrictEqual(view4Copy.size, [200, 200]);
        assert.deepStrictEqual(view5Copy.size, [600, 0]);
        assert.deepStrictEqual(grid2.isViewVisible(view1Copy), true);
        assert.deepStrictEqual(grid2.isViewVisible(view2Copy), true);
        assert.deepStrictEqual(grid2.isViewVisible(view3Copy), true);
        assert.deepStrictEqual(grid2.isViewVisible(view4Copy), true);
        assert.deepStrictEqual(grid2.isViewVisible(view5Copy), false);
        grid2.setViewVisible(view5Copy, true);
        assert.deepStrictEqual(view1Copy.size, [600, 300]);
        assert.deepStrictEqual(view2Copy.size, [600, 200]);
        assert.deepStrictEqual(view3Copy.size, [200, 400]);
        assert.deepStrictEqual(view4Copy.size, [200, 200]);
        assert.deepStrictEqual(view5Copy.size, [600, 100]);
        assert.deepStrictEqual(grid2.isViewVisible(view1Copy), true);
        assert.deepStrictEqual(grid2.isViewVisible(view2Copy), true);
        assert.deepStrictEqual(grid2.isViewVisible(view3Copy), true);
        assert.deepStrictEqual(grid2.isViewVisible(view4Copy), true);
        assert.deepStrictEqual(grid2.isViewVisible(view5Copy), true);
    });
    test('serialize should store visibility and previous size even for first leaf', function () {
        const view1 = store.add(new TestSerializableView('view1', 50, Number.MAX_VALUE, 50, Number.MAX_VALUE));
        const grid = store.add(new SerializableGrid(view1));
        container.appendChild(grid.element);
        grid.layout(800, 600);
        const view2 = store.add(new TestSerializableView('view2', 50, Number.MAX_VALUE, 50, Number.MAX_VALUE));
        grid.addView(view2, 200, view1, 0 /* Direction.Up */);
        const view3 = store.add(new TestSerializableView('view3', 50, Number.MAX_VALUE, 50, Number.MAX_VALUE));
        grid.addView(view3, 200, view1, 3 /* Direction.Right */);
        const view4 = store.add(new TestSerializableView('view4', 50, Number.MAX_VALUE, 50, Number.MAX_VALUE));
        grid.addView(view4, 200, view2, 2 /* Direction.Left */);
        const view5 = store.add(new TestSerializableView('view5', 50, Number.MAX_VALUE, 50, Number.MAX_VALUE));
        grid.addView(view5, 100, view1, 1 /* Direction.Down */);
        assert.deepStrictEqual(view1.size, [600, 300]);
        assert.deepStrictEqual(view2.size, [600, 200]);
        assert.deepStrictEqual(view3.size, [200, 400]);
        assert.deepStrictEqual(view4.size, [200, 200]);
        assert.deepStrictEqual(view5.size, [600, 100]);
        grid.setViewVisible(view4, false);
        assert.deepStrictEqual(view1.size, [600, 300]);
        assert.deepStrictEqual(view2.size, [800, 200]);
        assert.deepStrictEqual(view3.size, [200, 400]);
        assert.deepStrictEqual(view4.size, [0, 200]);
        assert.deepStrictEqual(view5.size, [600, 100]);
        const json = grid.serialize();
        assert.deepStrictEqual(json, {
            orientation: 0,
            width: 800,
            height: 600,
            root: {
                type: 'branch',
                data: [
                    {
                        type: 'branch',
                        data: [
                            { type: 'leaf', data: { name: 'view4' }, size: 200, visible: false },
                            { type: 'leaf', data: { name: 'view2' }, size: 800 },
                        ],
                        size: 200,
                    },
                    {
                        type: 'branch',
                        data: [
                            {
                                type: 'branch',
                                data: [
                                    { type: 'leaf', data: { name: 'view1' }, size: 300 },
                                    { type: 'leaf', data: { name: 'view5' }, size: 100 },
                                ],
                                size: 600,
                            },
                            { type: 'leaf', data: { name: 'view3' }, size: 200 },
                        ],
                        size: 400,
                    },
                ],
                size: 800,
            },
        });
        grid.dispose();
        const deserializer = new TestViewDeserializer(store);
        const grid2 = store.add(SerializableGrid.deserialize(json, deserializer));
        const view1Copy = deserializer.getView('view1');
        const view2Copy = deserializer.getView('view2');
        const view3Copy = deserializer.getView('view3');
        const view4Copy = deserializer.getView('view4');
        const view5Copy = deserializer.getView('view5');
        assert.deepStrictEqual(nodesToArrays(grid2.getViews()), [
            [view4Copy, view2Copy],
            [[view1Copy, view5Copy], view3Copy],
        ]);
        grid2.layout(800, 600);
        assert.deepStrictEqual(view1Copy.size, [600, 300]);
        assert.deepStrictEqual(view2Copy.size, [800, 200]);
        assert.deepStrictEqual(view3Copy.size, [200, 400]);
        assert.deepStrictEqual(view4Copy.size, [0, 200]);
        assert.deepStrictEqual(view5Copy.size, [600, 100]);
        assert.deepStrictEqual(grid2.isViewVisible(view1Copy), true);
        assert.deepStrictEqual(grid2.isViewVisible(view2Copy), true);
        assert.deepStrictEqual(grid2.isViewVisible(view3Copy), true);
        assert.deepStrictEqual(grid2.isViewVisible(view4Copy), false);
        assert.deepStrictEqual(grid2.isViewVisible(view5Copy), true);
        grid2.setViewVisible(view4Copy, true);
        assert.deepStrictEqual(view1Copy.size, [600, 300]);
        assert.deepStrictEqual(view2Copy.size, [600, 200]);
        assert.deepStrictEqual(view3Copy.size, [200, 400]);
        assert.deepStrictEqual(view4Copy.size, [200, 200]);
        assert.deepStrictEqual(view5Copy.size, [600, 100]);
        assert.deepStrictEqual(grid2.isViewVisible(view1Copy), true);
        assert.deepStrictEqual(grid2.isViewVisible(view2Copy), true);
        assert.deepStrictEqual(grid2.isViewVisible(view3Copy), true);
        assert.deepStrictEqual(grid2.isViewVisible(view4Copy), true);
        assert.deepStrictEqual(grid2.isViewVisible(view5Copy), true);
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZ3JpZC50ZXN0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvYmFzZS90ZXN0L2Jyb3dzZXIvdWkvZ3JpZC9ncmlkLnRlc3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxNQUFNLE1BQU0sUUFBUSxDQUFBO0FBQzNCLE9BQU8sRUFDTixvQkFBb0IsRUFFcEIsbUJBQW1CLEVBQ25CLElBQUksRUFJSixnQkFBZ0IsRUFHaEIsMEJBQTBCLEVBQzFCLGdCQUFnQixFQUNoQixNQUFNLEdBQ04sTUFBTSxxQ0FBcUMsQ0FBQTtBQUM1QyxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0sNkJBQTZCLENBQUE7QUFDbkQsT0FBTyxFQUFFLFNBQVMsRUFBRSxNQUFNLCtCQUErQixDQUFBO0FBQ3pELE9BQU8sRUFBRSxhQUFhLEVBQUUsUUFBUSxFQUFFLE1BQU0sV0FBVyxDQUFBO0FBQ25ELE9BQU8sRUFBRSx1Q0FBdUMsRUFBRSxNQUFNLDBCQUEwQixDQUFBO0FBR2xGLGtCQUFrQjtBQUNsQixFQUFFO0FBQ0YsMkJBQTJCO0FBQzNCLDJCQUEyQjtBQUMzQiwyQkFBMkI7QUFDM0IsMkJBQTJCO0FBQzNCLDJCQUEyQjtBQUMzQiwyQkFBMkI7QUFDM0IsMkJBQTJCO0FBQzNCLEVBQUU7QUFDRixLQUFLO0FBQ0wsT0FBTztBQUNQLFNBQVM7QUFDVCxTQUFTO0FBQ1QsT0FBTztBQUNQLFNBQVM7QUFDVCxXQUFXO0FBQ1gsV0FBVztBQUNYLFNBQVM7QUFFVCxLQUFLLENBQUMsTUFBTSxFQUFFO0lBQ2IsTUFBTSxLQUFLLEdBQUcsdUNBQXVDLEVBQUUsQ0FBQTtJQUN2RCxJQUFJLFNBQXNCLENBQUE7SUFFMUIsS0FBSyxDQUFDO1FBQ0wsU0FBUyxHQUFHLFFBQVEsQ0FBQyxhQUFhLENBQUMsS0FBSyxDQUFDLENBQUE7UUFDekMsU0FBUyxDQUFD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U0FBUyxDQUFDLENBQUMsQ0FBQTtRQUNqRixJQUFJLENBQUMsT0FBTyxDQUFDLEtBQUssRUFBRSxHQUFHLEVBQUUsS0FBSyx1QkFBZSxDQUFBO1FBQzdDLE1BQU0sQ0FBQyxlQUFlLENBQUMsS0FBSyxDQUFDLElBQUksRUFBRSxDQUFDLEdBQUcsRUFBRSxHQUFHLENBQUMsQ0FBQyxDQUFBO1FBQzlDLE1BQU0sQ0FBQyxlQUFlLENBQUMsS0FBSyxDQUFDLElBQUksRUFBRSxDQUFDLEdBQUcsRUFBRSxHQUFHLENBQUMsQ0FBQyxDQUFBO1FBRTlDLE1BQU0sS0FBSyxHQUFHLEtBQUssQ0FBQyxHQUFHLENBQUMsSUFBSSxRQUFRLENBQUMsRUFBRSxFQUFFLE1BQU0sQ0FBQyxTQUFTLEVBQUUsRUFBRSxFQUFFLE1BQU0sQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFBO1FBQ2pGLElBQUksQ0FBQyxPQUFPLENBQUMsS0FBSyxFQUFFLEdBQUcsRUFBRSxLQUFLLDBCQUFrQixDQUFBO1FBQ2hELE1BQU0sQ0FBQyxlQUFlLENBQUMsS0FBSyxDQUFDLElBQUksRUFBRSxDQUFDLEdBQUcsRUFBRSxHQUFHLENBQUMsQ0FBQyxDQUFBO1FBQzlDLE1BQU0sQ0FBQyxlQUFlLENBQUMsS0FBSyxDQUFDLElBQUksRUFBRSxDQUFDLEdBQUcsRUFBRSxHQUFHLENBQUMsQ0FBQyxDQUFBO1FBQzlDLE1BQU0sQ0FBQyxlQUFlLENBQUMsS0FBSyxDQUFDLElBQUksRUFBRSxDQUFDLEdBQUcsRUFBRSxHQUFHLENBQUMsQ0FBQyxDQUFBO1FBRTlDLE1BQU0sS0FBSyxHQUFHLEtBQUssQ0FBQyxHQUFHLENBQUMsSUFBSSxRQUFRLENBQUMsRUFBRSxFQUFFLE1BQU0sQ0FBQyxTQUFTLEVBQUUsRUFBRSxFQUFFLE1BQU0sQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFBO1FBQ2pGLElBQUksQ0FBQyxPQUFPLENBQUMsS0FBSyxFQUFFLEdBQUcsRUFBRSxLQUFLLHlCQUFpQixDQUFBO1FBQy9DLE1BQU0sQ0FBQyxlQUFlLENBQUMsS0FBSyxDQUFDLElBQUksRUFBRSxDQUFDLEdBQUcsRUFBRSxHQUFHLENBQUMsQ0FBQyxDQUFBO1FBQzlDLE1BQU0sQ0FBQyxlQUFlLENBQUMsS0FBSyxDQUFDLElBQUksRUFBRSxDQUFDLEdBQUcsRUFBRSxHQUFHLENBQUMsQ0FBQyxDQUFBO1FBQzlDLE1BQU0sQ0FBQyxlQUFlLENBQUMsS0FBSyxDQUFDLElBQUksRUFBRSxDQUFDLEdBQUcsRUFBRSxHQUFHLENBQUMsQ0FBQyxDQUFBO1FBQzlDLE1BQU0sQ0FBQyxlQUFlLENBQUMsS0FBSyxDQUFDLElBQUksRUFBRSxDQUFDLEdBQUcsRUFBRSxHQUFHLENBQUMsQ0FBQyxDQUFBO1FBRTlDLE1BQU0sS0FBSyxHQUFHLEtBQUssQ0FBQyxHQUFHLENBQUMsSUFBSSxRQUFRLENBQUMsRUFBRSxFQUFFLE1BQU0sQ0FBQyxTQUFTLEVBQUUsRUFBRSxFQUFFLE1BQU0sQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFBO1FBQ2pGLElBQUksQ0FBQyxPQUFPLENBQUMsS0FBSyxFQUFFLEdBQUcsRUFBRSxLQUFLLHlCQUFpQixDQUFBO1FBQy9DLE1BQU0sQ0FBQyxlQUFlLENBQUMsS0FBSyxDQUFDLElBQUksRUFBRSxDQUFDLEdBQUcsRUFBRSxHQUFHLENBQUMsQ0FBQyxDQUFBO1FBQzlDLE1BQU0sQ0FBQyxlQUFlLENBQUMsS0FBSyxDQUFDLElBQUksRUFBRSxDQUFDLEdBQUcsRUFBRSxHQUFHLENBQUMsQ0FBQyxDQUFBO1FBQzlDLE1BQU0sQ0FBQyxlQUFlLENBQUMsS0FBSyxDQUFDLElBQUksRUFBRSxDQUFDLEdBQUcsRUFBRSxHQUFHLENBQUMsQ0FBQyxDQUFBO1FBQzlDLE1BQU0sQ0FBQyxlQUFlLENBQUMsS0FBSyxDQUFDLElBQUksRUFBRSxDQUFDLEdBQUcsRUFBRSxHQUFHLENBQUMsQ0FBQyxDQUFBO1FBQzlDLE1BQU0sQ0FBQyxlQUFlLENBQUMsS0FBSyxDQUFDLElBQUksRUFBRSxDQUFDLEdBQUcsRUFBRSxHQUFHLENBQUMsQ0FBQyxDQUFBO0lBQy9DLENBQUMsQ0FBQyxD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QUUsRUFBRSxNQUFNLENBQUMsU0FBUyxFQUFFLEVBQUUsRUFBRSxNQUFNLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQTtRQUNqRixJQUFJLENBQUMsT0FBTyxDQUFDLEtBQUssRUFBRSxNQUFNLENBQUMsVUFBVSxFQUFFLEtBQUssdUJBQWUsQ0FBQTtRQUMzRCxNQUFNLENBQUMsZUFBZSxDQUFDLEtBQUssQ0FBQyxJQUFJLEVBQUUsQ0FBQyxHQUFHLEVBQUUsR0FBRyxDQUFDLENBQUMsQ0FBQTtRQUM5QyxNQUFNLENBQUMsZUFBZSxDQUFDLEtBQUssQ0FBQyxJQUFJLEVBQUUsQ0FBQyxHQUFHLEVBQUUsR0FBRyxDQUFDLENBQUMsQ0FBQTtRQUM5QyxNQUFNLENBQUMsZUFBZSxDQUFDLEtBQUssQ0FBQyxJQUFJLEVBQUUsQ0FBQyxHQUFHLEVBQUUsR0FBRyxDQUFDLENBQUMsQ0FBQTtRQUM5QyxNQUFNLENBQUMsZUFBZSxDQUFDLEtBQUssQ0FBQyxJQUFJLEVBQUUsQ0FBQyxHQUFHLEVBQUUsR0FBRyxDQUFDLENBQUMsQ0FBQTtRQUM5QyxNQUFNLENBQUMsZUFBZSxDQUFDLEtBQUssQ0FBQyxJQUFJLEVBQUUsQ0FBQyxHQUFHLEVBQUUsR0FBRyxDQUFDLENBQUMsQ0FBQTtRQUU5QyxNQUFNLEtBQUssR0FBRyxLQUFLLENBQUMsR0FBRyxDQUFDLElBQUksUUFBUSxDQUFDLEVBQUUsRUFBRSxNQUFNLENBQUMsU0FBUyxFQUFFLEVBQUUsRUFBRSxNQUFNLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQTtRQUNqRixJQUFJLENBQUMsT0FBTyxDQUFDLEtBQUssRUFBRSxNQUFNLENBQUMsVUFBVSxFQUFFLEtBQUsseUJBQWlCLENBQUE7UUFDN0QsTUFBTSxDQUFDLGVBQWUsQ0FBQyxLQUFLLENBQUMsSUFBSSxFQUFFLENBQUMsR0FBRyxFQUFFLEdBQUcsQ0FBQyxDQUFDLENBQUE7UUFDOUMsTUFBTSxDQUFDLGVBQWUsQ0FBQyxLQUFLLENBQUMsSUFBSSxFQUFFLENBQUMsR0FBRyxFQUFFLEdBQUcsQ0FBQyxDQUFD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LElBQUksRUFBRSxDQUFDLEdBQUcsRUFBRSxHQUFHLENBQUMsQ0FBQyxDQUFBO1FBQzlDLE1BQU0sQ0FBQyxlQUFlLENBQUMsS0FBSyxDQUFDLElBQUksRUFBRSxDQUFDLEdBQUcsRUFBRSxHQUFHLENBQUMsQ0FBQyxDQUFBO1FBQzlDLE1BQU0sQ0FBQyxlQUFlLENBQUMsS0FBSyxDQUFDLElBQUksRUFBRSxDQUFDLEdBQUcsRUFBRSxHQUFHLENBQUMsQ0FBQyxDQUFBO1FBQzlDLE1BQU0sQ0FBQyxlQUFlLENBQUMsS0FBSyxDQUFDLElBQUksRUFBRSxDQUFDLEdBQUcsRUFBRSxHQUFHLENBQUMsQ0FBQyxDQUFBO1FBRTlDLE1BQU0sS0FBSyxHQUFHLEtBQUssQ0FBQyxHQUFHLENBQUMsSUFBSSxRQUFRLENBQUMsRUFBRSxFQUFFLE1BQU0sQ0FBQyxTQUFTLEVBQUUsRUFBRSxFQUFFLE1BQU0sQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFBO1FBQ2pGLElBQUksQ0FBQyxPQUFPLENBQUMsS0FBSyxFQUFFLE1BQU0sQ0FBQyxLQUFLLEVBQUUsS0FBSyx1QkFBZSxDQUFBO1FBQ3RELE1BQU0sQ0FBQyxlQUFlLENBQUMsS0FBSyxDQUFDLElBQUksRUFBRSxDQUFDLEdBQUcsRUFBRSxHQUFHLENBQUMsQ0FBQyxDQUFBO1FBQzlDLE1BQU0sQ0FBQyxlQUFlLENBQUMsS0FBSyxDQUFDLElBQUksRUFBRSxDQUFDLEdBQUcsRUFBRSxHQUFHLENBQUMsQ0FBQyxDQUFBO1FBQzlDLE1BQU0sQ0FBQyxlQUFlLENBQUMsS0FBSyxDQUFDLElBQUksRUFBRSxDQUFDLEdBQUcsRUFBRSxHQUFHLENBQUMsQ0FBQyxDQUFBO1FBQzlDLE1BQU0sQ0FBQyxlQUFlLENBQUMsS0FBSyxDQUFDLElBQUksRUFBRSxDQUFDLEdBQUcsRUFBRSxHQUFHLENBQUMsQ0FBQyxDQUFBO1FBQzlDLE1BQU0sQ0FBQyxlQUFlLENBQUMsS0FBSyxDQUFDLElBQUksRUFBRSxDQUFDLEdBQUcsRUFBRSxHQUFHLENBQUMsQ0FBQyxDQUFBO1FBRTlDLE1BQU0sS0FBSyxHQUFHLEtBQUssQ0FBQyxHQUFHLENBQUMsSUFBSSxRQUFRLENBQUMsRUFBRSxFQUFFLE1BQU0sQ0FBQyxTQUFTLEVBQUUsRUFBRSxFQUFFLE1BQU0sQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFBO1FBQ2pGLElBQUksQ0FBQyxPQUFPLENBQUMsS0FBSyxFQUFFLE1BQU0sQ0FBQyxLQUFLLEVBQUUsS0FBSyx5QkFBaUIsQ0FBQTtRQUN4RCxNQUFNLENBQUMsZUFBZSxDQUFDLEtBQUssQ0FBQyxJQUFJLEVBQUUsQ0FBQyxHQUFHLEVBQUUsR0FBRyxDQUFDLENBQUMsQ0FBQTtRQUM5QyxNQUFNLENBQUMsZUFBZSxDQUFDLEtBQUssQ0FBQyxJQUFJLEVBQUUsQ0FBQyxHQUFHLEVBQUUsR0FBRyxDQUFDLENBQUMsQ0FBQTtRQUM5QyxNQUFNLENBQUMsZUFBZSxDQUFDLEtBQUssQ0FBQyxJQUFJLEVBQUUsQ0FBQyxHQUFHLEVBQUUsR0FBRyxDQUFDLENBQUMsQ0FBQTtRQUM5QyxNQUFNLENBQUMsZUFBZSxDQUFDLEtBQUssQ0FBQyxJQUFJLEVBQUUsQ0FBQyxHQUFHLEVBQUUsR0FBRyxDQUFDLENBQUMsQ0FBQTtRQUM5QyxNQUFNLENBQUMsZUFBZSxDQUFDLEtBQUssQ0FBQyxJQUFJLEVBQUUsQ0FBQyxHQUFHLEVBQUUsR0FBRyxDQUFDLENBQUMsQ0FBQTtRQUM5QyxNQUFNLENBQUMsZUFBZSxDQUFDLEtBQUssQ0FBQyxJQUFJLEVBQUUsQ0FBQyxHQUFHLEVBQUUsR0FBRyxDQUFDLENBQUMsQ0FBQTtJQUMvQyxDQUFDLENBQUMsQ0FBQTtJQUVGLElBQUksQ0FBQyx1QkFBdUIsRUFBRTtRQUM3QixNQUFNLEtBQUssR0FBRyxLQUFLLENBQUMsR0FBRyxDQUFDLElBQUksUUFBUSxDQUFDLEVBQUUsRUFBRSxNQUFNLENBQUMsU0FBUyxFQUFFLEVBQUUsRUFBRSxNQUFNLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQTtRQUNqRixNQUFNLElBQUksR0FBRyxLQUFLLENBQUMsR0FBRyxDQUFDLElBQUksSUFB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Q0FBQTtRQUMvQyxNQUFNLFNBQVMsR0FBRyxZQUFZLENBQUMsT0FBTyxDQUFDLE9BQU8sQ0FBQyxDQUFBO1FBRS9DLE1BQU0sQ0FBQyxlQUFlLENBQUMsYUFBYSxDQUFDLEtBQUssQ0FBQyxRQUFRLEVBQUUsQ0FBQyxFQUFFO1lBQ3ZELENBQUMsU0FBUyxFQUFFLFNBQVMsQ0FBQztZQUN0QixDQUFDLENBQUMsU0FBUyxFQUFFLFNBQVMsQ0FBQyxFQUFFLFNBQVMsQ0FBQztTQUNuQyxDQUFDLENBQUE7UUFFRixLQUFLLENBQUMsTUFBTSxDQUFDLEdBQUcsRUFBRSxHQUFHLENBQUMsQ0FBQTtRQUV0QixNQUFNLENBQUMsZUFBZSxDQUFDLFNBQVMsQ0FBQyxJQUFJLEVBQUUsQ0FBQyxHQUFHLEVBQUUsR0FBRyxDQUFDLENBQUMsQ0FBQTtRQUNsRCxNQUFNLENBQUMsZUFBZSxDQUFDLFNBQVMsQ0FBQyxJQUFJLEVBQUUsQ0FBQyxHQUFHLEVBQUUsR0FBRyxDQUFDLENBQUMsQ0FBQTtRQUNsRCxNQUFNLENBQUMsZUFBZSxDQUFDLFNBQVMsQ0FBQyxJQUFJLEVBQUUsQ0FBQyxHQUFHLEVBQUUsR0FBRyxDQUFDLENBQUMsQ0FBQTtRQUNsRCxNQUFNLENBQUMsZUFBZSxDQUFDLFNBQVMsQ0FBQyxJQUFJLEVBQUUsQ0FBQyxHQUFHLEVBQUUsR0FBRyxDQUFDLENBQUMsQ0FBQTtRQUNsRCxNQUFNLENBQUMsZUFBZSxDQUFDLFNBQVMsQ0FBQyxJQUFJLEVBQUUsQ0FBQyxHQUFHLEVBQUUsR0FBRyxDQUFDLENBQUMsQ0FBQTtJQUNuRCxDQUFDLENBQUMsQ0FBQTtJQUVGLElBQUksQ0FBQyx3Q0FBd0MsRUFBRTtRQUM5QyxNQUFNLEtBQUssR0FBRyxLQUFLLENBQUMsR0FBRyxDQUN0QixJQUFJLG9CQUFvQixDQUFDLE9BQU8sRUFBRSxFQUFFLEVBQUUsTUFBTSxDQUFDLFNBQVMsRUFBRSxFQUFFLEVBQUUsTUFBTSxDQUFDLFNBQVMsQ0FBQyxDQUM3RSxDQUFBO1FBQ0QsTUFBTSxJQUFJLEdBQUcsS0FBSyxDQUFDLEdB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QyxHQUFHLENBQ3RCLElBQUksb0JBQW9CLENBQUMsT0FBTyxFQUFFLEVBQUUsRUFBRSxNQUFNLENBQUMsU0FBUyxFQUFFLEVBQUUsRUFBRSxNQUFNLENBQUMsU0FBUyxDQUFDLENBQzdFLENBQUE7UUFDRCxJQUFJLENBQUMsT0FBTyxDQUFDLEtBQUssRUFBRSxHQUFHLEVBQUUsS0FBSyx5QkFBaUIsQ0FBQTtRQUUvQyxNQUFNLENBQUMsZUFBZSxDQUFDLEtBQUssQ0FBQyxJQUFJLEVBQUUsQ0FBQyxHQUFHLEVBQUUsR0FBRyxDQUFDLENBQUMsQ0FBQTtRQUM5QyxNQUFNLENBQUMsZUFBZSxDQUFDLEtBQUssQ0FBQyxJQUFJLEVBQUUsQ0FBQyxHQUFHLEVBQUUsR0FBRyxDQUFDLENBQUMsQ0FBQTtRQUM5QyxNQUFNLENBQUMsZUFBZSxDQUFDLEtBQUssQ0FBQyxJQUFJLEVBQUUsQ0FBQyxHQUFHLEVBQUUsR0FBRyxDQUFDLENBQUMsQ0FBQTtRQUM5QyxNQUFNLENBQUMsZUFBZSxDQUFDLEtBQUssQ0FBQyxJQUFJLEVBQUUsQ0FBQyxHQUFHLEVBQUUsR0FBRyxDQUFDLENBQUMsQ0FBQTtRQUM5QyxNQUFNLENBQUMsZUFBZSxDQUFDLEtBQUssQ0FBQyxJQUFJLEVBQUUsQ0FBQyxHQUFHLEVBQUUsR0FBRyxDQUFDLENBQUMsQ0FBQTtRQUU5QyxJQUFJLENBQUMsY0FBYyxDQUFDLEtBQUssRUFBRSxLQUFLLENBQUMsQ0FBQTtRQUVqQyxNQUFNLENBQUMsZUFBZSxDQUFDLEtBQUssQ0FBQyxJQUFJLEVBQUUsQ0FBQyxHQUFHLEVBQUUsR0FBRyxDQUFDLENBQUMsQ0FBQTtRQUM5QyxNQUFNLENBQUMsZUFBZSxDQUFDLEtBQUssQ0FBQyxJQUFJLEVBQUUsQ0FBQyxHQUFHLEVBQUUsR0FBRyxDQUFDLENBQUMsQ0FBQTtRQUM5QyxNQUFNLENBQUMsZUFBZSxDQUFDLEtBQUssQ0FBQyxJQUFJLEVBQUUsQ0FBQyxHQUFHLEVBQUUsR0FBRyxDQUFDLENBQUMsQ0FBQTtRQUM5QyxNQUFNLENBQUMsZUFBZSxDQUFDLEtBQUssQ0FBQyxJQUFJLEVBQUUsQ0FBQyxHQUFHLEVBQUUsR0FBRyxDQUFDLENBQUMsQ0FBQTtRQUM5QyxNQUFNLENBQUMsZUFBZSxDQUFDLEtBQUssQ0FBQyxJQUFJLEVBQUUsQ0FBQyxHQUFHLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQTtRQUU1QyxJQUFJLENBQUMsY0FBYyxDQUFDLEtBQUssRUFBRSxJQUFJLENBQUMsQ0FBQTtRQUVoQyxNQUFNLENBQUMsZUFBZSxDQUFDLEtBQUssQ0FBQyxJQUFJLEVBQUUsQ0FBQyxHQUFHLEVBQUUsR0FBRyxDQUFDLENBQUMsQ0FBQTtRQUM5QyxNQUFNLENBQUMsZUFBZSxDQUFDLEtBQUssQ0FBQyxJQUFJLEVBQUUsQ0FBQyxHQUFHLEVBQUUsR0FBRyxDQUFDLENBQUMsQ0FBQTtRQUM5QyxNQUFNLENBQUMsZUFBZSxDQUFDLEtBQUssQ0FBQyxJQUFJLEVBQUUsQ0FBQyxHQUFHLEVBQUUsR0FBRyxDQUFDLENBQUMsQ0FBQTtRQUM5QyxNQUFNLENBQUMsZUFBZSxDQUFDLEtBQUssQ0FBQyxJQUFJLEVBQUUsQ0FBQyxHQUFHLEVBQUUsR0FBRyxDQUFDLENBQUMsQ0FBQTtRQUM5QyxNQUFNLENBQUMsZUFBZSxDQUFDLEtBQUssQ0FBQyxJQUFJLEVBQUUsQ0FBQyxHQUFHLEVBQUUsR0FBRyxDQUFDLENBQUMsQ0FBQTtRQUU5QyxJQUFJLENBQUMsY0FBYyxDQUFDLEtBQUssRUFBRSxLQUFLLENBQUMsQ0FBQTtRQUVqQyxNQUFNLENBQUMsZUFBZSxDQUFDLEtBQUssQ0FBQyxJQUFJLEVBQUUsQ0FBQyxHQUFHLEVBQUUsR0FBRyxDQUFDLENBQUMsQ0FBQTtRQUM5QyxNQUFNLENBQUMsZUFBZSxDQUFDLEtBQUssQ0FBQyxJQUFJLEVBQUUsQ0FBQyxHQUFHLEVBQUUsR0FBRyxDQUFDLENBQUMsQ0FBQTtRQUM5QyxNQUFNLENBQUMsZUFBZSxDQUFDLEtBQUssQ0FBQyxJQUFJLEVBQUUsQ0FBQyxHQUFHLEVBQUUsR0FBRyxDQUFDLENBQUMsQ0FBQTtRQUM5QyxNQUFNLENBQUMs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LEdBQUcsQ0FBQyxDQUFBO1FBQ3RCLE1BQU0sQ0FBQyxlQUFlLENBQUMsU0FBUyxDQUFDLElBQUksRUFBRSxDQUFDLEdBQUcsRUFBRSxHQUFHLENBQUMsQ0FBQyxDQUFBO1FBQ2xELE1BQU0sQ0FBQyxlQUFlLENBQUMsU0FBUyxDQUFDLElBQUksRUFBRSxDQUFDLEdBQUcsRUFBRSxHQUFHLENBQUMsQ0FBQyxDQUFBO1FBQ2xELE1BQU0sQ0FBQyxlQUFlLENBQUMsU0FBUyxDQUFDLElBQUksRUFBRSxDQUFDLEdBQUcsRUFBRSxHQUFHLENBQUMsQ0FBQyxDQUFBO1FBQ2xELE1BQU0sQ0FBQyxlQUFlLENBQUMsU0FBUyxDQUFDLElBQUksRUFBRSxDQUFDLEdBQUcsRUFBRSxHQUFHLENBQUMsQ0FBQyxDQUFBO1FBQ2xELE1BQU0sQ0FBQyxlQUFlLENBQUMsU0FBUyxDQUFDLElBQUksRUFBRSxDQUFDLEdBQUcsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFBO1FBRWhELE1BQU0sQ0FBQyxlQUFlLENBQUMsS0FBSyxDQUFDLGFBQWEsQ0FBQyxTQUFTLENBQUMsRUFBRSxJQUFJLENBQUMsQ0FBQTtRQUM1RCxNQUFNLENBQUMsZUFBZSxDQUFDLEtBQUssQ0FBQyxhQUFhLENBQUMsU0FBUyxDQUFDLEVBQUUsSUFBSSxDQUFDLENBQUE7UUFDNUQsTUFBTSxDQUFDLGVBQWUsQ0FBQyxLQUFLLENBQUMsYUFBYSxDQUFDLFNBQVMsQ0FBQyxFQUFFLElBQUksQ0FBQyxDQUFBO1FBQzVELE1BQU0sQ0FBQyxlQUFlLENBQUMsS0FBSyxDQUFDLGFBQWEsQ0FBQyxTQUFTLENBQUMsRUFBRSxJQUFJLENBQUMsQ0FBQTtRQUM1RCxNQUFNLENBQUMsZUFBZSxDQUFDLEtBQUssQ0FBQyxhQUFhLENBQUMsU0FBUyxDQUFDLEVBQUUsS0FBSyxDQUFDLENBQUE7UUFFN0QsS0FBSyxDQUFDLGNBQWMsQ0FBQyxTQUFTLEVBQUUsSUFBSSxDQUFDLENBQUE7UUFFckMsTUFBTSxDQUFDLGVBQWUsQ0FBQyxTQUFTLENBQUMsSUFBSSxFQUFFLENB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QVMsRUFBRSxFQUFFLEVBQUUsTUFBTSxDQUFDLFNBQVMsQ0FBQyxDQUM3RSxDQUFBO1FBQ0QsSUFBSSxDQUFDLE9BQU8sQ0FBQyxLQUFLLEVBQUUsR0FBRyxFQUFFLEtBQUsseUJBQWlCLENBQUE7UUFFL0MsTUFBTSxDQUFDLGVBQWUsQ0FBQyxLQUFLLENBQUMsSUFBSSxFQUFFLENBQUMsR0FBRyxFQUFFLEdBQUcsQ0FBQyxDQUFDLENBQUE7UUFDOUMsTUFBTSxDQUFDLGVBQWUsQ0FBQyxLQUFLLENBQUMsSUFBSSxFQUFFLENBQUMsR0FBRyxFQUFFLEdBQUcsQ0FBQyxDQUFDLENBQUE7UUFDOUMsTUFBTSxDQUFDLGVBQWUsQ0FBQyxLQUFLLENBQUMsSUFBSSxFQUFFLENBQUMsR0FBRyxFQUFFLEdBQUcsQ0FBQyxDQUFDLENBQUE7UUFDOUMsTUFBTSxDQUFDLGVBQWUsQ0FBQyxLQUFLLENBQUMsSUFBSSxFQUFFLENBQUMsR0FBRyxFQUFFLEdBQUcsQ0FBQyxDQUFDLENBQUE7UUFDOUMsTUFBTSxDQUFDLGVBQWUsQ0FBQyxLQUFLLENBQUMsSUFBSSxFQUFFLENBQUMsR0FBRyxFQUFFLEdBQUcsQ0FBQyxDQUFDLENBQUE7UUFFOUMsSUFBSSxDQUFDLGNBQWMsQ0FBQyxLQUFLLEVBQUUsS0FBSyxDQUFDLENBQUE7UUFFakMsTUFBTSxDQUFDLGVBQWUsQ0FBQyxLQUFLLENBQUMsSUFBSSxFQUFFLENBQUMsR0FBRyxFQUFFLEdBQUcsQ0FBQyxDQUFDLENBQUE7UUFDOUMsTUFBTSxDQUFDLGVBQWUsQ0FBQyxLQUFLLENBQUMsSUFBSSxFQUFFLENBQUMsR0FBRyxFQUFFLEdBQUcsQ0FBQyxDQUFDLENBQUE7UUFDOUMsTUFBTSxDQUFDLGVBQWUsQ0FBQyxLQUFLLENBQUMsSUFBSSxFQUFFLENBQUMsR0FBRyxFQUFFLEdBQUcsQ0FBQyxDQUFDLENBQUE7UUFDOUMsTUFBTSxDQUFDLGVBQWUsQ0FBQyxLQUFLLENBQUMsSUFBSSxFQUFFLENBQUMsQ0FBQyxFQUFFLEdBQUcsQ0FBQyxDQUFDLENBQUE7UUFDNUMsTUFB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QVMsQ0FBQyxJQUFJLEVBQUUsQ0FBQyxHQUFHLEVBQUUsR0FBRyxDQUFDLENBQUMsQ0FBQTtRQUNsRCxNQUFNLENBQUMsZUFBZSxDQUFDLFNBQVMsQ0FBQyxJQUFJLEVBQUUsQ0FBQyxHQUFHLEVBQUUsR0FBRyxDQUFDLENBQUMsQ0FBQTtRQUNsRCxNQUFNLENBQUMsZUFBZSxDQUFDLFNBQVMsQ0FBQyxJQUFJLEVBQUUsQ0FBQyxDQUFDLEVBQUUsR0FBRyxDQUFDLENBQUMsQ0FBQTtRQUNoRCxNQUFNLENBQUMsZUFBZSxDQUFDLFNBQVMsQ0FBQyxJQUFJLEVBQUUsQ0FBQyxHQUFHLEVBQUUsR0FBRyxDQUFDLENBQUMsQ0FBQTtRQUVsRCxNQUFNLENBQUMsZUFBZSxDQUFDLEtBQUssQ0FBQyxhQUFhLENBQUMsU0FBUyxDQUFDLEVBQUUsSUFBSSxDQUFDLENBQUE7UUFDNUQsTUFBTSxDQUFDLGVBQWUsQ0FBQyxLQUFLLENBQUMsYUFBYSxDQUFDLFNBQVMsQ0FBQyxFQUFFLElBQUksQ0FBQyxDQUFBO1FBQzVELE1BQU0sQ0FBQyxlQUFlLENBQUMsS0FBSyxDQUFDLGFBQWEsQ0FBQyxTQUFTLENBQUMsRUFBRSxJQUFJLENBQUMsQ0FBQTtRQUM1RCxNQUFNLENBQUMsZUFBZSxDQUFDLEtBQUssQ0FBQyxhQUFhLENBQUMsU0FBUyxDQUFDLEVBQUUsS0FBSyxDQUFDLENBQUE7UUFDN0QsTUFBTSxDQUFDLGVBQWUsQ0FBQyxLQUFLLENBQUMsYUFBYSxDQUFDLFNBQVMsQ0FBQyxFQUFFLElBQUksQ0FBQyxDQUFBO1FBRTVELEtBQUssQ0FBQyxjQUFjLENBQUMsU0FBUyxFQUFFLElBQUksQ0FBQyxDQUFBO1FBRXJDLE1BQU0sQ0FBQyxlQUFlLENBQUMsU0FBUyxDQUFDLElBQUksRUFBRSxDQUFDLEdBQUcsRUFBRSxHQUFHLENBQUMsQ0FBQyxDQUFBO1FBQ2xELE1BQU0sQ0FBQyxlQUFlLENBQUMsU0FBUyxDQUFDLElBQUksRUFBRSxDQUFDLEdBQUcsRUFBRSxHQUFHLENBQUMsQ0FBQyxDQUFBO1FBQ2xELE1BQU0sQ0FBQyxlQUFlLENBQUMsU0FBUyxDQUFDLElBQUksRUFBRSxDQUFDLEdBQUcsRUFBRSxHQUFHLENBQUMsQ0FBQyxDQUFBO1FBQ2xELE1BQU0sQ0FBQyxlQUFlLENBQUMsU0FBUyxDQUFDLElBQUksRUFBRSxDQUFDLEdBQUcsRUFBRSxHQUFHLENBQUMsQ0FBQyxDQUFBO1FBQ2xELE1BQU0sQ0FBQyxlQUFlLENBQUMsU0FBUyxDQUFDLElBQUksRUFBRSxDQUFDLEdBQUcsRUFBRSxHQUFHLENBQUMsQ0FBQyxDQUFBO1FBRWxELE1BQU0sQ0FBQyxlQUFlLENBQUMsS0FBSyxDQUFDLGFBQWEsQ0FBQyxTQUFTLENBQUMsRUFBRSxJQUFJLENBQUMsQ0FBQTtRQUM1RCxNQUFNLENBQUMsZUFBZSxDQUFDLEtBQUssQ0FBQyxhQUFhLENBQUMsU0FBUyxDQUFDLEVBQUUsSUFBSSxDQUFDLENBQUE7UUFDNUQsTUFBTSxDQUFDLGVBQWUsQ0FBQyxLQUFLLENBQUMsYUFBYSxDQUFDLFNBQVMsQ0FBQyxFQUFFLElBQUksQ0FBQyxDQUFBO1FBQzVELE1BQU0sQ0FBQyxlQUFlLENBQUMsS0FBSyxDQUFDLGFBQWEsQ0FBQyxTQUFTLENBQUMsRUFBRSxJQUFJLENBQUMsQ0FBQTtRQUM1RCxNQUFNLENBQUMsZUFBZSxDQUFDLEtBQUssQ0FBQyxhQUFhLENBQUMsU0FBUyxDQUFDLEVBQUUsSUFBSSxDQUFDLENBQUE7SUFDN0QsQ0FBQyxDQUFDLENBQUE7QUFDSCxDQUFDLENBQUMsQ0FBQSJ9