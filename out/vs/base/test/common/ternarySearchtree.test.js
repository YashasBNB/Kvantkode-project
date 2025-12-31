/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { shuffle } from '../../common/arrays.js';
import { randomPath } from '../../common/extpath.js';
import { StopWatch } from '../../common/stopwatch.js';
import { ConfigKeysIterator, PathIterator, StringIterator, TernarySearchTree, UriIterator, } from '../../common/ternarySearchTree.js';
import { URI } from '../../common/uri.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from './utils.js';
suite('Ternary Search Tree', () => {
    ensureNoDisposablesAreLeakedInTestSuite();
    test('PathIterator', () => {
        const iter = new PathIterator();
        iter.reset('file:///usr/bin/file.txt');
        assert.strictEqual(iter.value(), 'file:');
        assert.strictEqual(iter.hasNext(), true);
        assert.strictEqual(iter.cmp('file:'), 0);
        assert.ok(iter.cmp('a') < 0);
        assert.ok(iter.cmp('aile:') < 0);
        assert.ok(iter.cmp('z') > 0);
        assert.ok(iter.cmp('zile:') > 0);
        iter.next();
        assert.strictEqual(iter.value(), 'usr');
        assert.strictEqual(iter.hasNext(), true);
        iter.next();
        assert.strictEqual(iter.value(), 'bin');
        assert.strictEqual(iter.hasNext(), true);
        iter.next();
        assert.strictEqual(iter.value(), 'file.txt');
        assert.strictEqual(iter.hasNext(), false);
        iter.next();
        assert.strictEqual(iter.value(), '');
        assert.strictEqual(iter.hasNext(), false);
        iter.next();
        assert.strictEqual(iter.value(), '');
        assert.strictEqual(iter.hasNext(), false);
        //
        iter.reset('/foo/bar/');
        assert.strictEqual(iter.value(), 'foo');
        assert.strictEqual(iter.hasNext(), true);
        iter.next();
        assert.strictEqual(iter.value(), 'bar');
        assert.strictEqual(iter.hasNext(), false);
    });
    test('URIIterator', function () {
        const iter = new UriIterator(() => false, () => false);
        iter.reset(URI.parse('file:///usr/bin/file.txt'));
        assert.strictEqual(iter.value(), 'file');
        // assert.strictEqual(iter.cmp('FILE'), 0);
        assert.strictEqual(iter.cmp('file'), 0);
        assert.strictEqual(iter.hasNext(), true);
        iter.next();
        assert.strictEqual(iter.value(), 'usr');
        assert.strictEqual(iter.hasNext(), true);
        iter.next();
        assert.strictEqual(iter.value(), 'bin');
        assert.strictEqual(iter.hasNext(), true);
        iter.next();
        assert.strictEqual(iter.value(), 'file.txt');
        assert.strictEqual(iter.hasNext(), false);
        iter.reset(URI.parse('file://share/usr/bin/file.txt?foo'));
        // scheme
        assert.strictEqual(iter.value(), 'file');
        // assert.strictEqual(iter.cmp('FILE'), 0);
        assert.strictEqual(iter.cmp('file'), 0);
        assert.strictEqual(iter.hasNext(), true);
        iter.next();
        // authority
        assert.strictEqual(iter.value(), 'share');
        assert.strictEqual(iter.cmp('SHARe'), 0);
        assert.strictEqual(iter.hasNext(), true);
        iter.next();
        // path
        assert.strictEqual(iter.value(), 'usr');
        assert.strictEqual(iter.hasNext(), true);
        iter.next();
        // path
        assert.strictEqual(iter.value(), 'bin');
        assert.strictEqual(iter.hasNext(), true);
        iter.next();
        // path
        assert.strictEqual(iter.value(), 'file.txt');
        assert.strictEqual(iter.hasNext(), true);
        iter.next();
        // query
        assert.strictEqual(iter.value(), 'foo');
        assert.strictEqual(iter.cmp('z') > 0, true);
        assert.strictEqual(iter.cmp('a') < 0, true);
        assert.strictEqual(iter.hasNext(), false);
    });
    test('URIIterator - ignore query/fragment', function () {
        const iter = new UriIterator(() => false, () => true);
        iter.reset(URI.parse('file:///usr/bin/file.txt'));
        assert.strictEqual(iter.value(), 'file');
        // assert.strictEqual(iter.cmp('FILE'), 0);
        assert.strictEqual(iter.cmp('file'), 0);
        assert.strictEqual(iter.hasNext(), true);
        iter.next();
        assert.strictEqual(iter.value(), 'usr');
        assert.strictEqual(iter.hasNext(), true);
        iter.next();
        assert.strictEqual(iter.value(), 'bin');
        assert.strictEqual(iter.hasNext(), true);
        iter.next();
        assert.strictEqual(iter.value(), 'file.txt');
        assert.strictEqual(iter.hasNext(), false);
        iter.reset(URI.parse('file://share/usr/bin/file.txt?foo'));
        // scheme
        assert.strictEqual(iter.value(), 'file');
        // assert.strictEqual(iter.cmp('FILE'), 0);
        assert.strictEqual(iter.cmp('file'), 0);
        assert.strictEqual(iter.hasNext(), true);
        iter.next();
        // authority
        assert.strictEqual(iter.value(), 'share');
        assert.strictEqual(iter.cmp('SHARe'), 0);
        assert.strictEqual(iter.hasNext(), true);
        iter.next();
        // path
        assert.strictEqual(iter.value(), 'usr');
        assert.strictEqual(iter.hasNext(), true);
        iter.next();
        // path
        assert.strictEqual(iter.value(), 'bin');
        assert.strictEqual(iter.hasNext(), true);
        iter.next();
        // path
        assert.strictEqual(iter.value(), 'file.txt');
        assert.strictEqual(iter.hasNext(), false);
    });
    function assertTstDfs(trie, ...elements) {
        assert.ok(trie._isBalanced(), 'TST is not balanced');
        let i = 0;
        for (const [key, value] of trie) {
            const expected = elements[i++];
            assert.ok(expected);
            assert.strictEqual(key, expected[0]);
            assert.strictEqual(value, expected[1]);
        }
        assert.strictEqual(i, elements.length);
        const map = new Map();
        for (const [key, value] of elements) {
            map.set(key, value);
        }
        map.forEach((value, key) => {
            assert.strictEqual(trie.get(key), value);
        });
        // forEach
        let forEachCount = 0;
        trie.forEach((element, key) => {
            assert.strictEqual(element, map.get(key));
            forEachCount++;
        });
        assert.strictEqual(map.size, forEachCount);
        // iterator
        let iterCount = 0;
        for (const [key, value] of trie) {
            assert.strictEqual(value, map.get(key));
            iterCount++;
        }
        assert.strictEqual(map.size, iterCount);
    }
    test('TernarySearchTree - set', function () {
        let trie = TernarySearchTree.forStrings();
        trie.set('foobar', 1);
        trie.set('foobaz', 2);
        assertTstDfs(trie, ['foobar', 1], ['foobaz', 2]); // longer
        trie = TernarySearchTree.forStrings();
        trie.set('foobar', 1);
        trie.set('fooba', 2);
        assertTstDfs(trie, ['fooba', 2], ['foobar', 1]); // shorter
        trie = TernarySearchTree.forStrings();
        trie.set('foo', 1);
        trie.set('foo', 2);
        assertTstDfs(trie, ['foo', 2]);
        trie = TernarySearchTree.forStrings();
        trie.set('foo', 1);
        trie.set('foobar', 2);
        trie.set('bar', 3);
        trie.set('foob', 4);
        trie.set('bazz', 5);
        assertTstDfs(trie, ['bar', 3], ['bazz', 5], ['foo', 1], ['foob', 4], ['foobar', 2]);
    });
    test('TernarySearchTree - set w/ undefined', function () {
        const trie = TernarySearchTree.forStrings();
        trie.set('foobar', undefined);
        trie.set('foobaz', 2);
        assert.strictEqual(trie.get('foobar'), undefined);
        assert.strictEqual(trie.get('foobaz'), 2);
        assert.strictEqual(trie.get('NOT HERE'), undefined);
        assert.ok(trie.has('foobaz'));
        assert.ok(trie.has('foobar'));
        assert.ok(!trie.has('NOT HERE'));
        assertTstDfs(trie, ['foobar', undefined], ['foobaz', 2]); // should check for undefined value
        const oldValue = trie.set('foobar', 3);
        assert.strictEqual(oldValue, undefined);
        assert.strictEqual(trie.get('foobar'), 3);
    });
    test('TernarySearchTree - findLongestMatch', function () {
        const trie = TernarySearchTree.forStrings();
        trie.set('foo', 1);
        trie.set('foobar', 2);
        trie.set('foobaz', 3);
        assertTstDfs(trie, ['foo', 1], ['foobar', 2], ['foobaz', 3]);
        assert.strictEqual(trie.findSubstr('f'), undefined);
        assert.strictEqual(trie.findSubstr('z'), undefined);
        assert.strictEqual(trie.findSubstr('foo'), 1);
        assert.strictEqual(trie.findSubstr('fooö'), 1);
        assert.strictEqual(trie.findSubstr('fooba'), 1);
        assert.strictEqual(trie.findSubstr('foobarr'), 2);
        assert.strictEqual(trie.findSubstr('foobazrr'), 3);
    });
    test('TernarySearchTree - basics', function () {
        const trie = new TernarySearchTree(new StringIterator());
        trie.set('foo', 1);
        trie.set('bar', 2);
        trie.set('foobar', 3);
        assertTstDfs(trie, ['bar', 2], ['foo', 1], ['foobar', 3]);
        assert.strictEqual(trie.get('foo'), 1);
        assert.strictEqual(trie.get('bar'), 2);
        assert.strictEqual(trie.get('foobar'), 3);
        assert.strictEqual(trie.get('foobaz'), undefined);
        assert.strictEqual(trie.get('foobarr'), undefined);
        assert.strictEqual(trie.findSubstr('fo'), undefined);
        assert.strictEqual(trie.findSubstr('foo'), 1);
        assert.strictEqual(trie.findSubstr('foooo'), 1);
        trie.delete('foobar');
        trie.delete('bar');
        assert.strictEqual(trie.get('foobar'), undefined);
        assert.strictEqual(trie.get('bar'), undefined);
        trie.set('foobar', 17);
        trie.set('barr', 18);
        assert.strictEqual(trie.get('foobar'), 17);
        assert.strictEqual(trie.get('barr'), 18);
        assert.strictEqual(trie.get('bar'), undefined);
    });
    test('TernarySearchTree - delete & cleanup', function () {
        // normal delete
        let trie = new TernarySearchTree(new StringIterator());
        trie.set('foo', 1);
        trie.set('foobar', 2);
        trie.set('bar', 3);
        assertTstDfs(trie, ['bar', 3], ['foo', 1], ['foobar', 2]);
        trie.delete('foo');
        assertTstDfs(trie, ['bar', 3], ['foobar', 2]);
        trie.delete('foobar');
        assertTstDfs(trie, ['bar', 3]);
        // superstr-delete
        trie = new TernarySearchTree(new StringIterator());
        trie.set('foo', 1);
        trie.set('foobar', 2);
        trie.set('bar', 3);
        trie.set('foobarbaz', 4);
        trie.deleteSuperstr('foo');
        assertTstDfs(trie, ['bar', 3], ['foo', 1]);
        trie = new TernarySearchTree(new StringIterator());
        trie.set('foo', 1);
        trie.set('foobar', 2);
        trie.set('bar', 3);
        trie.set('foobarbaz', 4);
        trie.deleteSuperstr('fo');
        assertTstDfs(trie, ['bar', 3]);
        // trie = new TernarySearchTree<string, number>(new StringIterator());
        // trie.set('foo', 1);
        // trie.set('foobar', 2);
        // trie.set('bar', 3);
        // trie.deleteSuperStr('f');
        // assertTernarySearchTree(trie, ['bar', 3]);
    });
    test('TernarySearchTree (PathSegments) - basics', function () {
        const trie = new TernarySearchTree(new PathIterator());
        trie.set('/user/foo/bar', 1);
        trie.set('/user/foo', 2);
        trie.set('/user/foo/flip/flop', 3);
        assert.strictEqual(trie.get('/user/foo/bar'), 1);
        assert.strictEqual(trie.get('/user/foo'), 2);
        assert.strictEqual(trie.get('/user//foo'), 2);
        assert.strictEqual(trie.get('/user\\foo'), 2);
        assert.strictEqual(trie.get('/user/foo/flip/flop'), 3);
        assert.strictEqual(trie.findSubstr('/user/bar'), undefined);
        assert.strictEqual(trie.findSubstr('/user/foo'), 2);
        assert.strictEqual(trie.findSubstr('\\user\\foo'), 2);
        assert.strictEqual(trie.findSubstr('/user//foo'), 2);
        assert.strictEqual(trie.findSubstr('/user/foo/ba'), 2);
        assert.strictEqual(trie.findSubstr('/user/foo/far/boo'), 2);
        assert.strictEqual(trie.findSubstr('/user/foo/bar'), 1);
        assert.strictEqual(trie.findSubstr('/user/foo/bar/far/boo'), 1);
    });
    test('TernarySearchTree - (AVL) set', function () {
        {
            // rotate left
            const trie = new TernarySearchTree(new PathIterator());
            trie.set('/fileA', 1);
            trie.set('/fileB', 2);
            trie.set('/fileC', 3);
            assertTstDfs(trie, ['/fileA', 1], ['/fileB', 2], ['/fileC', 3]);
        }
        {
            // rotate left (inside middle)
            const trie = new TernarySearchTree(new PathIterator());
            trie.set('/foo/fileA', 1);
            trie.set('/foo/fileB', 2);
            trie.set('/foo/fileC', 3);
            assertTstDfs(trie, ['/foo/fileA', 1], ['/foo/fileB', 2], ['/foo/fileC', 3]);
        }
        {
            // rotate right
            const trie = new TernarySearchTree(new PathIterator());
            trie.set('/fileC', 3);
            trie.set('/fileB', 2);
            trie.set('/fileA', 1);
            assertTstDfs(trie, ['/fileA', 1], ['/fileB', 2], ['/fileC', 3]);
        }
        {
            // rotate right (inside middle)
            const trie = new TernarySearchTree(new PathIterator());
            trie.set('/mid/fileC', 3);
            trie.set('/mid/fileB', 2);
            trie.set('/mid/fileA', 1);
            assertTstDfs(trie, ['/mid/fileA', 1], ['/mid/fileB', 2], ['/mid/fileC', 3]);
        }
        {
            // rotate right, left
            const trie = new TernarySearchTree(new PathIterator());
            trie.set('/fileD', 7);
            trie.set('/fileB', 2);
            trie.set('/fileG', 42);
            trie.set('/fileF', 24);
            trie.set('/fileZ', 73);
            trie.set('/fileE', 15);
            assertTstDfs(trie, ['/fileB', 2], ['/fileD', 7], ['/fileE', 15], ['/fileF', 24], ['/fileG', 42], ['/fileZ', 73]);
        }
        {
            // rotate left, right
            const trie = new TernarySearchTree(new PathIterator());
            trie.set('/fileJ', 42);
            trie.set('/fileZ', 73);
            trie.set('/fileE', 15);
            trie.set('/fileB', 2);
            trie.set('/fileF', 7);
            trie.set('/fileG', 1);
            assertTstDfs(trie, ['/fileB', 2], ['/fileE', 15], ['/fileF', 7], ['/fileG', 1], ['/fileJ', 42], ['/fileZ', 73]);
        }
    });
    test('TernarySearchTree - (BST) delete', function () {
        const trie = new TernarySearchTree(new StringIterator());
        // delete root
        trie.set('d', 1);
        assertTstDfs(trie, ['d', 1]);
        trie.delete('d');
        assertTstDfs(trie);
        // delete node with two element
        trie.clear();
        trie.set('d', 1);
        trie.set('b', 1);
        trie.set('f', 1);
        assertTstDfs(trie, ['b', 1], ['d', 1], ['f', 1]);
        trie.delete('d');
        assertTstDfs(trie, ['b', 1], ['f', 1]);
        // single child node
        trie.clear();
        trie.set('d', 1);
        trie.set('b', 1);
        trie.set('f', 1);
        trie.set('e', 1);
        assertTstDfs(trie, ['b', 1], ['d', 1], ['e', 1], ['f', 1]);
        trie.delete('f');
        assertTstDfs(trie, ['b', 1], ['d', 1], ['e', 1]);
    });
    test('TernarySearchTree - (AVL) delete', function () {
        const trie = new TernarySearchTree(new StringIterator());
        trie.clear();
        trie.set('d', 1);
        trie.set('b', 1);
        trie.set('f', 1);
        trie.set('e', 1);
        trie.set('z', 1);
        assertTstDfs(trie, ['b', 1], ['d', 1], ['e', 1], ['f', 1], ['z', 1]);
        // right, right
        trie.delete('b');
        assertTstDfs(trie, ['d', 1], ['e', 1], ['f', 1], ['z', 1]);
        trie.clear();
        trie.set('d', 1);
        trie.set('c', 1);
        trie.set('f', 1);
        trie.set('a', 1);
        trie.set('b', 1);
        assertTstDfs(trie, ['a', 1], ['b', 1], ['c', 1], ['d', 1], ['f', 1]);
        // left, left
        trie.delete('f');
        assertTstDfs(trie, ['a', 1], ['b', 1], ['c', 1], ['d', 1]);
        // mid
        trie.clear();
        trie.set('a', 1);
        trie.set('ad', 1);
        trie.set('ab', 1);
        trie.set('af', 1);
        trie.set('ae', 1);
        trie.set('az', 1);
        assertTstDfs(trie, ['a', 1], ['ab', 1], ['ad', 1], ['ae', 1], ['af', 1], ['az', 1]);
        trie.delete('ab');
        assertTstDfs(trie, ['a', 1], ['ad', 1], ['ae', 1], ['af', 1], ['az', 1]);
        trie.delete('a');
        assertTstDfs(trie, ['ad', 1], ['ae', 1], ['af', 1], ['az', 1]);
    });
    test("TernarySearchTree: Cannot read property '1' of undefined #138284", function () {
        const keys = [
            URI.parse('fake-fs:/C'),
            URI.parse('fake-fs:/A'),
            URI.parse('fake-fs:/D'),
            URI.parse('fake-fs:/B'),
        ];
        const tst = TernarySearchTree.forUris();
        for (const item of keys) {
            tst.set(item, true);
        }
        assert.ok(tst._isBalanced());
        tst.delete(keys[0]);
        assert.ok(tst._isBalanced());
    });
    test("TernarySearchTree: Cannot read property '1' of undefined #138284 (simple)", function () {
        const keys = ['C', 'A', 'D', 'B'];
        const tst = TernarySearchTree.forStrings();
        for (const item of keys) {
            tst.set(item, true);
        }
        assertTstDfs(tst, ['A', true], ['B', true], ['C', true], ['D', true]);
        tst.delete(keys[0]);
        assertTstDfs(tst, ['A', true], ['B', true], ['D', true]);
        {
            const tst = TernarySearchTree.forStrings();
            tst.set('C', true);
            tst.set('A', true);
            tst.set('B', true);
            assertTstDfs(tst, ['A', true], ['B', true], ['C', true]);
        }
    });
    test("TernarySearchTree: Cannot read property '1' of undefined #138284 (random)", function () {
        for (let round = 10; round >= 0; round--) {
            const keys = [];
            for (let i = 0; i < 100; i++) {
                keys.push(URI.from({ scheme: 'fake-fs', path: randomPath(undefined, undefined, 10) }));
            }
            const tst = TernarySearchTree.forUris();
            try {
                for (const item of keys) {
                    tst.set(item, true);
                    assert.ok(tst._isBalanced(), `SET${item}|${keys.map(String).join()}`);
                }
                for (const item of keys) {
                    tst.delete(item);
                    assert.ok(tst._isBalanced(), `DEL${item}|${keys.map(String).join()}`);
                }
            }
            catch (err) {
                assert.ok(false, `FAILED with keys: ${keys.map(String).join()}`);
            }
        }
    });
    test("TernarySearchTree: Cannot read properties of undefined (reading 'length'): #161618 (simple)", function () {
        const raw = 'config.debug.toolBarLocation,floating,config.editor.renderControlCharacters,true,config.editor.renderWhitespace,selection,config.files.autoSave,off,config.git.enabled,true,config.notebook.globalToolbar,true,config.terminal.integrated.tabs.enabled,true,config.terminal.integrated.tabs.showActions,singleTerminalOrNarrow,config.terminal.integrated.tabs.showActiveTerminal,singleTerminalOrNarrow,config.workbench.activityBar.visible,true,config.workbench.experimental.settingsProfiles.enabled,true,config.workbench.layoutControl.type,both,config.workbench.sideBar.location,left,config.workbench.statusBar.visible,true';
        const array = raw.split(',');
        const tuples = [];
        for (let i = 0; i < array.length; i += 2) {
            tuples.push([array[i], array[i + 1]]);
        }
        const map = TernarySearchTree.forConfigKeys();
        map.fill(tuples);
        assert.strictEqual([...map].join(), raw);
        assert.ok(map.has('config.editor.renderWhitespace'));
        const len = [...map].length;
        map.delete('config.editor.renderWhitespace');
        assert.ok(map._isBalanced());
        assert.strictEqual([...map].length, len - 1);
    });
    test("TernarySearchTree: Cannot read properties of undefined (reading 'length'): #161618 (random)", function () {
        const raw = 'config.debug.toolBarLocation,floating,config.editor.renderControlCharacters,true,config.editor.renderWhitespace,selection,config.files.autoSave,off,config.git.enabled,true,config.notebook.globalToolbar,true,config.terminal.integrated.tabs.enabled,true,config.terminal.integrated.tabs.showActions,singleTerminalOrNarrow,config.terminal.integrated.tabs.showActiveTerminal,singleTerminalOrNarrow,config.workbench.activityBar.visible,true,config.workbench.experimental.settingsProfiles.enabled,true,config.workbench.layoutControl.type,both,config.workbench.sideBar.location,left,config.workbench.statusBar.visible,true';
        const array = raw.split(',');
        const tuples = [];
        for (let i = 0; i < array.length; i += 2) {
            tuples.push([array[i], array[i + 1]]);
        }
        for (let round = 100; round >= 0; round--) {
            shuffle(tuples);
            const map = TernarySearchTree.forConfigKeys();
            map.fill(tuples);
            assert.strictEqual([...map].join(), raw);
            assert.ok(map.has('config.editor.renderWhitespace'));
            const len = [...map].length;
            map.delete('config.editor.renderWhitespace');
            assert.ok(map._isBalanced());
            assert.strictEqual([...map].length, len - 1);
        }
    });
    test('TernarySearchTree (PathSegments) - lookup', function () {
        const map = new TernarySearchTree(new PathIterator());
        map.set('/user/foo/bar', 1);
        map.set('/user/foo', 2);
        map.set('/user/foo/flip/flop', 3);
        assert.strictEqual(map.get('/foo'), undefined);
        assert.strictEqual(map.get('/user'), undefined);
        assert.strictEqual(map.get('/user/foo'), 2);
        assert.strictEqual(map.get('/user/foo/bar'), 1);
        assert.strictEqual(map.get('/user/foo/bar/boo'), undefined);
    });
    test('TernarySearchTree (PathSegments) - superstr', function () {
        const map = new TernarySearchTree(new PathIterator());
        map.set('/user/foo/bar', 1);
        map.set('/user/foo', 2);
        map.set('/user/foo/flip/flop', 3);
        map.set('/usr/foo', 4);
        let item;
        let iter = map.findSuperstr('/user');
        item = iter.next();
        assert.strictEqual(item.value[1], 2);
        assert.strictEqual(item.done, false);
        item = iter.next();
        assert.strictEqual(item.value[1], 1);
        assert.strictEqual(item.done, false);
        item = iter.next();
        assert.strictEqual(item.value[1], 3);
        assert.strictEqual(item.done, false);
        item = iter.next();
        assert.strictEqual(item.value, undefined);
        assert.strictEqual(item.done, true);
        iter = map.findSuperstr('/usr');
        item = iter.next();
        assert.strictEqual(item.value[1], 4);
        assert.strictEqual(item.done, false);
        item = iter.next();
        assert.strictEqual(item.value, undefined);
        assert.strictEqual(item.done, true);
        assert.strictEqual(map.findSuperstr('/not'), undefined);
        assert.strictEqual(map.findSuperstr('/us'), undefined);
        assert.strictEqual(map.findSuperstr('/usrr'), undefined);
        assert.strictEqual(map.findSuperstr('/userr'), undefined);
    });
    test('TernarySearchTree (PathSegments) - delete_superstr', function () {
        const map = new TernarySearchTree(new PathIterator());
        map.set('/user/foo/bar', 1);
        map.set('/user/foo', 2);
        map.set('/user/foo/flip/flop', 3);
        map.set('/usr/foo', 4);
        assertTstDfs(map, ['/user/foo', 2], ['/user/foo/bar', 1], ['/user/foo/flip/flop', 3], ['/usr/foo', 4]);
        // not a segment
        map.deleteSuperstr('/user/fo');
        assertTstDfs(map, ['/user/foo', 2], ['/user/foo/bar', 1], ['/user/foo/flip/flop', 3], ['/usr/foo', 4]);
        // delete a segment
        map.set('/user/foo/bar', 1);
        map.set('/user/foo', 2);
        map.set('/user/foo/flip/flop', 3);
        map.set('/usr/foo', 4);
        map.deleteSuperstr('/user/foo');
        assertTstDfs(map, ['/user/foo', 2], ['/usr/foo', 4]);
    });
    test('TernarySearchTree (URI) - basics', function () {
        const trie = new TernarySearchTree(new UriIterator(() => false, () => false));
        trie.set(URI.file('/user/foo/bar'), 1);
        trie.set(URI.file('/user/foo'), 2);
        trie.set(URI.file('/user/foo/flip/flop'), 3);
        assert.strictEqual(trie.get(URI.file('/user/foo/bar')), 1);
        assert.strictEqual(trie.get(URI.file('/user/foo')), 2);
        assert.strictEqual(trie.get(URI.file('/user/foo/flip/flop')), 3);
        assert.strictEqual(trie.findSubstr(URI.file('/user/bar')), undefined);
        assert.strictEqual(trie.findSubstr(URI.file('/user/foo')), 2);
        assert.strictEqual(trie.findSubstr(URI.file('/user/foo/ba')), 2);
        assert.strictEqual(trie.findSubstr(URI.file('/user/foo/far/boo')), 2);
        assert.strictEqual(trie.findSubstr(URI.file('/user/foo/bar')), 1);
        assert.strictEqual(trie.findSubstr(URI.file('/user/foo/bar/far/boo')), 1);
    });
    test('TernarySearchTree (URI) - query parameters', function () {
        const trie = new TernarySearchTree(new UriIterator(() => false, () => true));
        const root = URI.parse('memfs:/?param=1');
        trie.set(root, 1);
        assert.strictEqual(trie.get(URI.parse('memfs:/?param=1')), 1);
        assert.strictEqual(trie.findSubstr(URI.parse('memfs:/?param=1')), 1);
        assert.strictEqual(trie.findSubstr(URI.parse('memfs:/aaa?param=1')), 1);
    });
    test('TernarySearchTree (URI) - lookup', function () {
        const map = new TernarySearchTree(new UriIterator(() => false, () => false));
        map.set(URI.parse('http://foo.bar/user/foo/bar'), 1);
        map.set(URI.parse('http://foo.bar/user/foo?query'), 2);
        map.set(URI.parse('http://foo.bar/user/foo?QUERY'), 3);
        map.set(URI.parse('http://foo.bar/user/foo/flip/flop'), 3);
        assert.strictEqual(map.get(URI.parse('http://foo.bar/foo')), undefined);
        assert.strictEqual(map.get(URI.parse('http://foo.bar/user')), undefined);
        assert.strictEqual(map.get(URI.parse('http://foo.bar/user/foo/bar')), 1);
        assert.strictEqual(map.get(URI.parse('http://foo.bar/user/foo?query')), 2);
        assert.strictEqual(map.get(URI.parse('http://foo.bar/user/foo?Query')), undefined);
        assert.strictEqual(map.get(URI.parse('http://foo.bar/user/foo?QUERY')), 3);
        assert.strictEqual(map.get(URI.parse('http://foo.bar/user/foo/bar/boo')), undefined);
    });
    test('TernarySearchTree (URI) - lookup, casing', function () {
        const map = new TernarySearchTree(new UriIterator((uri) => /^https?$/.test(uri.scheme), () => false));
        map.set(URI.parse('http://foo.bar/user/foo/bar'), 1);
        assert.strictEqual(map.get(URI.parse('http://foo.bar/USER/foo/bar')), 1);
        map.set(URI.parse('foo://foo.bar/user/foo/bar'), 1);
        assert.strictEqual(map.get(URI.parse('foo://foo.bar/USER/foo/bar')), undefined);
    });
    test('TernarySearchTree (URI) - superstr', function () {
        const map = new TernarySearchTree(new UriIterator(() => false, () => false));
        map.set(URI.file('/user/foo/bar'), 1);
        map.set(URI.file('/user/foo'), 2);
        map.set(URI.file('/user/foo/flip/flop'), 3);
        map.set(URI.file('/usr/foo'), 4);
        let item;
        let iter = map.findSuperstr(URI.file('/user'));
        item = iter.next();
        assert.strictEqual(item.value[1], 2);
        assert.strictEqual(item.done, false);
        item = iter.next();
        assert.strictEqual(item.value[1], 1);
        assert.strictEqual(item.done, false);
        item = iter.next();
        assert.strictEqual(item.value[1], 3);
        assert.strictEqual(item.done, false);
        item = iter.next();
        assert.strictEqual(item.value, undefined);
        assert.strictEqual(item.done, true);
        iter = map.findSuperstr(URI.file('/usr'));
        item = iter.next();
        assert.strictEqual(item.value[1], 4);
        assert.strictEqual(item.done, false);
        item = iter.next();
        assert.strictEqual(item.value, undefined);
        assert.strictEqual(item.done, true);
        iter = map.findSuperstr(URI.file('/'));
        item = iter.next();
        assert.strictEqual(item.value[1], 2);
        assert.strictEqual(item.done, false);
        item = iter.next();
        assert.strictEqual(item.value[1], 1);
        assert.strictEqual(item.done, false);
        item = iter.next();
        assert.strictEqual(item.value[1], 3);
        assert.strictEqual(item.done, false);
        item = iter.next();
        assert.strictEqual(item.value[1], 4);
        assert.strictEqual(item.done, false);
        item = iter.next();
        assert.strictEqual(item.value, undefined);
        assert.strictEqual(item.done, true);
        assert.strictEqual(map.findSuperstr(URI.file('/not')), undefined);
        assert.strictEqual(map.findSuperstr(URI.file('/us')), undefined);
        assert.strictEqual(map.findSuperstr(URI.file('/usrr')), undefined);
        assert.strictEqual(map.findSuperstr(URI.file('/userr')), undefined);
    });
    test('TernarySearchTree (ConfigKeySegments) - basics', function () {
        const trie = new TernarySearchTree(new ConfigKeysIterator());
        trie.set('config.foo.bar', 1);
        trie.set('config.foo', 2);
        trie.set('config.foo.flip.flop', 3);
        assert.strictEqual(trie.get('config.foo.bar'), 1);
        assert.strictEqual(trie.get('config.foo'), 2);
        assert.strictEqual(trie.get('config.foo.flip.flop'), 3);
        assert.strictEqual(trie.findSubstr('config.bar'), undefined);
        assert.strictEqual(trie.findSubstr('config.foo'), 2);
        assert.strictEqual(trie.findSubstr('config.foo.ba'), 2);
        assert.strictEqual(trie.findSubstr('config.foo.far.boo'), 2);
        assert.strictEqual(trie.findSubstr('config.foo.bar'), 1);
        assert.strictEqual(trie.findSubstr('config.foo.bar.far.boo'), 1);
    });
    test('TernarySearchTree (ConfigKeySegments) - lookup', function () {
        const map = new TernarySearchTree(new ConfigKeysIterator());
        map.set('config.foo.bar', 1);
        map.set('config.foo', 2);
        map.set('config.foo.flip.flop', 3);
        assert.strictEqual(map.get('foo'), undefined);
        assert.strictEqual(map.get('config'), undefined);
        assert.strictEqual(map.get('config.foo'), 2);
        assert.strictEqual(map.get('config.foo.bar'), 1);
        assert.strictEqual(map.get('config.foo.bar.boo'), undefined);
    });
    test('TernarySearchTree (ConfigKeySegments) - superstr', function () {
        const map = new TernarySearchTree(new ConfigKeysIterator());
        map.set('config.foo.bar', 1);
        map.set('config.foo', 2);
        map.set('config.foo.flip.flop', 3);
        map.set('boo', 4);
        let item;
        const iter = map.findSuperstr('config');
        item = iter.next();
        assert.strictEqual(item.value[1], 2);
        assert.strictEqual(item.done, false);
        item = iter.next();
        assert.strictEqual(item.value[1], 1);
        assert.strictEqual(item.done, false);
        item = iter.next();
        assert.strictEqual(item.value[1], 3);
        assert.strictEqual(item.done, false);
        item = iter.next();
        assert.strictEqual(item.value, undefined);
        assert.strictEqual(item.done, true);
        assert.strictEqual(map.findSuperstr('foo'), undefined);
        assert.strictEqual(map.findSuperstr('config.foo.no'), undefined);
        assert.strictEqual(map.findSuperstr('config.foop'), undefined);
    });
    test('TernarySearchTree (ConfigKeySegments) - delete_superstr', function () {
        const map = new TernarySearchTree(new ConfigKeysIterator());
        map.set('config.foo.bar', 1);
        map.set('config.foo', 2);
        map.set('config.foo.flip.flop', 3);
        map.set('boo', 4);
        assertTstDfs(map, ['boo', 4], ['config.foo', 2], ['config.foo.bar', 1], ['config.foo.flip.flop', 3]);
        // not a segment
        map.deleteSuperstr('config.fo');
        assertTstDfs(map, ['boo', 4], ['config.foo', 2], ['config.foo.bar', 1], ['config.foo.flip.flop', 3]);
        // delete a segment
        map.set('config.foo.bar', 1);
        map.set('config.foo', 2);
        map.set('config.foo.flip.flop', 3);
        map.set('config.boo', 4);
        map.deleteSuperstr('config.foo');
        assertTstDfs(map, ['boo', 4], ['config.foo', 2]);
    });
    test('TST, fill', function () {
        const tst = TernarySearchTree.forStrings();
        const keys = ['foo', 'bar', 'bang', 'bazz'];
        Object.freeze(keys);
        tst.fill(true, keys);
        for (const key of keys) {
            assert.ok(tst.get(key), key);
        }
    });
});
suite.skip('TST, perf', function () {
    function createRandomUris(n) {
        const uris = [];
        function randomWord() {
            let result = '';
            const length = 4 + Math.floor(Math.random() * 4);
            for (let i = 0; i < length; i++) {
                result += (Math.random() * 26 + 65).toString(36);
            }
            return result;
        }
        // generate 10000 random words
        const words = [];
        for (let i = 0; i < 10000; i++) {
            words.push(randomWord());
        }
        for (let i = 0; i < n; i++) {
            let len = 4 + Math.floor(Math.random() * 4);
            const segments = [];
            for (; len >= 0; len--) {
                segments.push(words[Math.floor(Math.random() * words.length)]);
            }
            uris.push(URI.from({ scheme: 'file', path: segments.join('/') }));
        }
        return uris;
    }
    let tree;
    let sampleUris = [];
    let candidates = [];
    suiteSetup(() => {
        const len = 50_000;
        sampleUris = createRandomUris(len);
        candidates = [...sampleUris.slice(0, len / 2), ...createRandomUris(len / 2)];
        shuffle(candidates);
    });
    setup(() => {
        tree = TernarySearchTree.forUris();
        for (const uri of sampleUris) {
            tree.set(uri, true);
        }
    });
    const _profile = false;
    function perfTest(name, callback) {
        test(name, function () {
            if (_profile) {
                console.profile(name);
            }
            const sw = new StopWatch();
            callback();
            console.log(name, sw.elapsed());
            if (_profile) {
                console.profileEnd();
            }
        });
    }
    perfTest('TST, clear', function () {
        tree.clear();
    });
    perfTest('TST, insert', function () {
        const insertTree = TernarySearchTree.forUris();
        for (const uri of sampleUris) {
            insertTree.set(uri, true);
        }
    });
    perfTest('TST, lookup', function () {
        let match = 0;
        for (const candidate of candidates) {
            if (tree.has(candidate)) {
                match += 1;
            }
        }
        assert.strictEqual(match, sampleUris.length / 2);
    });
    perfTest('TST, substr', function () {
        let match = 0;
        for (const candidate of candidates) {
            if (tree.findSubstr(candidate)) {
                match += 1;
            }
        }
        assert.strictEqual(match, sampleUris.length / 2);
    });
    perfTest('TST, superstr', function () {
        for (const candidate of candidates) {
            tree.findSuperstr(candidate);
        }
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVybmFyeVNlYXJjaHRyZWUudGVzdC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL2Jhc2UvdGVzdC9jb21tb24vdGVybmFyeVNlYXJjaHRyZWUudGVzdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLE1BQU0sTUFBTSxRQUFRLENBQUE7QUFDM0IsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLHdCQUF3QixDQUFBO0FBQ2hELE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSx5QkFBeUIsQ0FBQTtBQUNwRCxPQUFPLEVBQUUsU0FBUyxFQUFFLE1BQU0sMkJBQTJCLENBQUE7QUFDckQsT0FBTyxFQUNOLGtCQUFrQixFQUNsQixZQUFZLEVBQ1osY0FBYyxFQUNkLGlCQUFpQixFQUNqQixXQUFXLEdBQ1gsTUFBTSxtQ0FBbUMsQ0FBQTtBQUMxQyxPQUFPLEVBQUUsR0FBRyxFQUFFLE1BQU0scUJBQXFCLENBQUE7QUFDekMsT0FBTyxFQUFFLHVDQUF1QyxFQUFFLE1BQU0sWUFBWSxDQUFBO0FBRXBFLEtBQUssQ0FBQyxxQkFBcUIsRUFBRSxHQUFHLEVBQUU7SUFDakMsdUNBQXVDLEVBQUUsQ0FBQTtJQUV6QyxJQUFJLENBQUMsY0FBYyxFQUFFLEdBQUcsRUFBRTtRQUN6QixNQUFNLElBQUksR0FBRyxJQUFJLFlBQVksRUFBRSxDQUFBO1FBQy9CLElBQUksQ0FBQyxLQUFLLENBQUMsMEJBQTBCLENBQUMsQ0FBQTtRQUV0QyxNQUFNLENBQUMsV0FBVyxDQUFDLElBQUksQ0FBQyxLQUFLLEVBQUUsRUFBRSxPQUFPLENBQUMsQ0FBQTtRQUN6QyxNQUFNLENBQUMsV0FBVyxDQUFDLElBQUksQ0FBQyxPQUFPLEVBQUUsRUFBRSxJQUFJLENBQUMsQ0FBQTtRQUN4QyxNQUFNLENBQUMsV0FBVyxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMs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QUFJLENBQUMsR0FBRyxDQUFDLE1BQU0sQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFBO1FBQ3ZDLE1BQU0sQ0FBQyxXQUFXLENBQUMsSUFBSSxDQUFDLE9BQU8sRUFBRSxFQUFFLElBQUksQ0FBQyxDQUFBO1FBQ3hDLElBQUksQ0FBQyxJQUFJLEVBQUUsQ0FBQTtRQUVYLE1BQU0sQ0FBQyxXQUFXLENBQUMsSUFBSSxDQUFDLEtBQUssRUFBRSxFQUFFLEtBQUssQ0FBQyxDQUFBO1FBQ3ZDLE1BQU0sQ0FBQyxXQUFXLENBQUMsSUFBSSxDQUFDLE9BQU8sRUFBRSxFQUFFLElBQUksQ0FBQyxDQUFBO1FBQ3hDLElBQUksQ0FBQyxJQUFJLEVBQUUsQ0FBQTtRQUVYLE1BQU0sQ0FBQyxXQUFXLENBQUMsSUFBSSxDQUFDLEtBQUssRUFBRSxFQUFFLEtBQUssQ0FBQyxDQUFBO1FBQ3ZDLE1BQU0sQ0FBQyxXQUFXLENBQUMsSUFBSSxDQUFDLE9BQU8sRUFBRSxFQUFFLElBQUksQ0FBQyxDQUFBO1FBQ3hDLElBQUksQ0FBQyxJQUFJLEVBQUUsQ0FBQTtRQUVYLE1BQU0sQ0FBQyxXQUFXLENBQUMsSUFBSSxDQUFDLEtBQUssRUFBRSxFQUFFLFVBQVUsQ0FBQyxDQUFBO1FBQzVDLE1BQU0sQ0FBQyxXQUFXLENBQUMsSUFBSSxDQUFDLE9BQU8sRUFBRSxFQUFFLEtBQUssQ0FBQyxDQUFBO1FBRXpDLElBQUksQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLEtBQUssQ0FBQyxtQ0FBbUMsQ0FBQyxDQUFDLENBQUE7UUFFMUQsU0FBUztRQUNULE1BQU0sQ0FBQyxXQUFXLENBQUMsSUFBSSxDQUFDLEtBQUssRUFBRSxFQUFFLE1BQU0sQ0FBQyxDQUFBO1FBQ3hDLDJDQUEyQztRQUMzQyxNQUFNLENBQUMsV0FBVyxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsTUFBTSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUE7UUFDdkMsTUFBTSxDQUFDLFdBQVcsQ0FBQyxJQUFJLENBQUMsT0FBTyxFQUFFLEVBQUUsSUFBSSxDQUFDLENBQUE7UUFDeEMsSUFBSSxDQUFDLElBQUksRUFBRSxDQUFBO1FBRVgsWUFBWTtRQUNaLE1BQU0sQ0FBQyxXQUFXLENBQUMsSUFBSSxDQUFDLEtBQUssRUFBRSxFQUFFLE9BQU8sQ0FBQyxDQUFBO1FBQ3pDLE1BQU0sQ0FBQyxXQUFXLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxPQUFPLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQTtRQUN4QyxNQUFNLENBQUMsV0FBVyxDQUFDLElBQUksQ0FBQyxPQUFPLEVBQUUsRUFBRSxJQUFJLENBQUMsQ0FBQTtRQUN4QyxJQUFJLENBQUMsSUFBSSxFQUFFLENBQUE7UUFFWCxPQUFPO1FBQ1AsTUFBTSxDQUFDLFdBQVcsQ0FBQyxJQUFJLENBQUMsS0FBSyxFQUFFLEVBQUUsS0FBSyxDQUFDLENBQUE7UUFDdkMsTUFBTSxDQUFDLFdBQVcsQ0FBQyxJQUFJLENBQUMsT0FBTyxFQUFFLEVBQUUsSUFBSSxDQUFDLENBQUE7UUFDeEMsSUFBSSxDQUFDLElBQUksRUFBRSxDQUFBO1FBRVgsT0FBTztRQUNQLE1BQU0sQ0FBQyxXQUFXLENBQUMsSUFBSSxDQUFDLEtBQUssRUFBRSxFQUFFLEtBQUssQ0FBQyxDQUFBO1FBQ3ZDLE1BQU0sQ0FBQyxXQUFXLENBQUMsSUFBSSxDQUFDLE9BQU8sRUFBRSxFQUFFLElBQUksQ0FBQyxDQUFBO1FBQ3hDLElBQUksQ0FBQyxJQUFJLEVBQUUsQ0FBQTtRQUVYLE9BQU87UUFDUCxNQUFNLENBQUMsV0FBVyxDQUFDLElBQUksQ0FBQyxLQUFLLEVBQUUsRUFBRSxVQUFVLENBQUMsQ0FBQTtRQUM1QyxNQUFNLENBQUMsV0FBVyxDQUFDLElBQUksQ0FBQyxPQUFPLEVBQUUsRUFBRSxJQUFJLENBQUMsQ0FBQTtRQUN4QyxJQUFJLENBQUMsSUFBSSxFQUFFLENBQUE7UUFFWCxRQUFRO1FBQ1IsTUFBTSxDQUFDLFdBQVcsQ0FBQyxJQUFJLENBQUMsS0FBSyxFQUFFLEVBQUUsS0FBSyxDQUFDLENBQUE7UUFDdkMsTUFBTSxDQUFDLFdBQVcsQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsRUFBRSxJQUFJLENBQUMsQ0FBQTtRQUMzQyxNQUFNLENBQUMsV0FBVyxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxFQUFFLElBQUksQ0FBQyxDQUFBO1FBQzNDLE1BQU0sQ0FBQyxXQUFXLENBQUMsSUFBSSxDQUFDLE9BQU8sRUFBRSxFQUFFLEtBQUssQ0FBQyxDQUFBO0lBQzFDLENBQUMsQ0FBQyxDQUFBO0lBRUYsSUFBSSxDQUFDLHFDQUFxQyxFQUFFO1FBQzNDLE1BQU0sSUFBSSxHQUFHLElBQUksV0FBVyxDQUMzQixHQUFHLEVBQUUsQ0FBQyxLQUFLLEVBQ1gsR0FBRyxFQUFFLENBQUMsSUFBSSxDQUNWLENBQUE7UUFDRCxJQUFJLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxLQUFLLENBQUMsMEJBQTBCLENBQUMsQ0FBQyxDQUFBO1FBRWpELE1BQU0sQ0FBQyxXQUFXLENBQUMsSUFBSSxDQUFDLEtBQUssRUFBRSxFQUFFLE1BQU0sQ0FBQyxDQUFBO1FBQ3hDLDJDQUEyQztRQUMzQyxNQUFNLENBQUMsV0FBVyxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsTUFBTSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUE7UUFDdkMsTUFBTSxDQUFDLFdBQVcsQ0FBQyxJQUFJLENBQUMsT0FBTyxFQUFFLEVBQUUsSUFBSSxDQUFDLENBQUE7UUFDeEMsSUFBSSxDQUFDLElBQUksRUFBRSxDQUFBO1FBRVgsTUFBTSxDQUFDLFdBQVcsQ0FBQyxJQUFJLENBQUMsS0FBSyxFQUFFLEVBQUUsS0FBSyxDQUFDLENBQUE7UUFDdkMsTUFBTSxDQUFDLFdBQVcsQ0FBQyxJQUFJLENBQUMsT0FBTyxFQUFFLEVBQUUsSUFBSSxDQUFDLENBQUE7UUFDeEMsSUFBSSxDQUFDLElBQUksRUFBRSxDQUFBO1FBRVgsTUFBTSxDQUFDLFdBQVcsQ0FBQyxJQUFJLENBQUMsS0FBSyxFQUFFLEVBQUUsS0FBSyxDQUFDLENBQUE7UUFDdkMsTUFBTSxDQUFDLFdBQVcsQ0FBQyxJQUFJLENBQUMsT0FBTyxFQUFFLEVBQUUsSUFBSSxDQUFDLENBQUE7UUFDeEMsSUFBSSxDQUFDLElBQUksRUFBRSxDQUFBO1FBRVgsTUFBTSxDQUFDLFdBQVcsQ0FBQyxJQUFJLENBQUMsS0FBSyxFQUFFLEVBQUUsVUFBVSxDQUFDLENBQUE7UUFDNUMsTUFBTSxDQUFDLFdBQVcsQ0FBQyxJQUFJLENBQUMsT0FBTyxFQUFFLEVBQUUsS0FBSyxDQUFDLENBQUE7UUFFekMsSUFBSSxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsS0FBSyxDQUFDLG1DQUFtQyxDQUFDLENBQUMsQ0FBQTtRQUUxRCxTQUFTO1FBQ1QsTUFBTSxDQUFDLFdBQVcsQ0FBQyxJQUFJLENBQUMsS0FBSyxFQUFFLEVBQUUsTUFBTSxDQUFDLENBQUE7UUFDeEMsMkNBQTJDO1FBQzNDLE1BQU0sQ0FBQyxXQUFXLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxNQUFNLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQTtRQUN2QyxNQUFNLENBQUMsV0FBVyxDQUFDLElBQUksQ0FBQyxPQUFPLEVBQUUsRUFBRSxJQUFJLENBQUMsQ0FBQTtRQUN4QyxJQUFJLENBQUMsSUFBSSxFQUFFLENBQUE7UUFFWCxZQUFZO1FBQ1osTUFBTSxDQUFDLFdBQVcsQ0FBQyxJQUFJLENBQUMsS0FBSyxFQUFFLEVBQUUsT0FBTyxDQUFDLENBQUE7UUFDekMsTUFBTSxDQUFDLFdBQVcsQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLE9BQU8sQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFBO1FBQ3hDLE1BQU0sQ0FBQyxXQUFXLENBQUMsSUFBSSxDQUFDLE9BQU8sRUFBRSxFQUFFLElBQUksQ0FBQyxDQUFBO1FBQ3hDLElBQUksQ0FBQyxJQUFJLEVBQUUsQ0FBQTtRQUVYLE9BQU87UUFDUCxNQUFNLENBQUMsV0FBVyxDQUFDLElBQUksQ0FBQyxLQUFLLEVBQUUsRUFBRSxLQUFLLENBQUMsQ0FBQTtRQUN2QyxNQUFNLENBQUMsV0FBVyxDQUFDLElBQUksQ0FBQyxPQUFPLEVBQUUsRUFBRSxJQUFJLENBQUMsQ0FBQTtRQUN4QyxJQUFJLENBQUMsSUFBSSxFQUFFLENBQUE7UUFFWCxPQUFPO1FBQ1AsTUFBTSxDQUFDLFdBQVcsQ0FBQyxJQUFJLENBQUMsS0FBSyxFQUFFLEVBQUUsS0FBSyxDQUFDLENBQUE7UUFDdkMsTUFBTSxDQUFDLFdBQVcsQ0FBQyxJQUFJLENBQUMsT0FBTyxFQUFFLEVBQUUsSUFBSSxDQUFDLENBQUE7UUFDeEMsSUFBSSxDQUFDLElBQUksRUFBRSxDQUFBO1FBRVgsT0FBTztRQUNQLE1BQU0sQ0FBQyxXQUFXLENBQUMsSUFBSSxDQUFDLEtBQUssRUFBRSxFQUFFLFVBQVUsQ0FBQyxDQUFBO1FBQzVDLE1BQU0sQ0FBQyxXQUFXLENBQUMsSUFBSSxDQUFDLE9BQU8sRUFBRSxFQUFFLEtBQUssQ0FBQyxDQUFBO0lBQzFDLENBQUMsQ0FBQyxDQUFBO0lBRUYsU0FBUyxZQUFZLENBQUksSUFBa0MsRUFBRSxHQUFHLFFBQXVCO1FBQ3RGLE1BQU0sQ0FBQyxFQUFFLENBQUMsSUFBSSxDQUFDLFdBQVcsRUFBRSxFQUFFLHFCQUFxQixDQUFDLENBQUE7UUFFcEQsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFBO1FBQ1QsS0FBSyxNQUFNLENBQUMsR0FBRyxFQUFFLEtBQUssQ0FBQyxJQUFJLElBQUksRUFBRSxDQUFDO1lBQ2pDLE1BQU0sUUFBUSxHQUFHLFFBQVEsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFBO1lBQzlCLE1BQU0sQ0FBQyxFQUFFLENBQUMsUUFBUSxDQUFDLENBQUE7WUFDbkIsTUFBTSxDQUFDLFdBQVcsQ0FBQyxHQUFHLEVBQUUsUUFBUSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUE7WUFDcEMsTUFBTSxDQUFDLFdBQVcsQ0FBQyxLQUFLLEVBQUUsUUFBUSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUE7UUFDdkMsQ0FBQztRQUVELE1BQU0sQ0FBQyxXQUFXLENBQUMsQ0FBQyxFQUFFLFFBQVEsQ0FBQyxNQUFNLENBQUMsQ0FBQTtRQUV0QyxNQUFNLEdBQUcsR0FBRyxJQUFJLEdBQUcsRUFBYSxDQUFBO1FBQ2hDLEtBQUssTUFBTSxDQUFDLEdBQUcsRUFBRSxLQUFLLENBQUMsSUFBSSxRQUFRLEVBQUUsQ0FBQztZQUNyQyxHQUFHLENBQUMsR0FBRyxDQUFDLEdBQUcsRUFBRSxLQUFLLENBQUMsQ0FBQTtRQUNwQixDQUFDO1FBQ0QsR0FBRyxDQUFDLE9BQU8sQ0FBQyxDQUFDLEtBQUssRUFBRSxHQUFHLEVBQUUsRUFBRTtZQUMxQixNQUFNLENBQUMsV0FBVyxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLEVBQUUsS0FBSyxDQUFDLENBQUE7UUFDekMsQ0FBQyxDQUFDLENBQUE7UUFFRixVQUFVO1FBQ1YsSUFBSSxZQUFZLEdBQUcsQ0FBQyxDQUFBO1FBQ3BCLElBQUksQ0FBQyxPQUFPLENBQUMsQ0FBQyxPQUFPLEVBQUUsR0FBRyxFQUFFLEVBQUU7WUFDN0IsTUFBTSxDQUFDLFdBQVcsQ0FBQyxPQUFPLEVBQUUsR0FBRyxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFBO1lBQ3pDLFlBQVksRUFBRSxDQUFBO1FBQ2YsQ0FBQyxDQUFDLENBQUE7UUFDRixNQUFNLENBQUMsV0FBVyxDQUFDLEdBQUcsQ0FBQyxJQUFJLEVBQUUsWUFBWSxDQUFDLENBQUE7UUFFMUMsV0FBVztRQUNYLElBQUksU0FBUyxHQUFHLENBQUMsQ0FBQTtRQUNqQixLQUFLLE1BQU0sQ0FBQyxHQUFHLEVBQUUsS0FBSyxDQUFDLElBQUksSUFBSSxFQUFFLENBQUM7WUFDakMsTUFBTSxDQUFDLFdBQVcsQ0FBQyxLQUFLLEVBQUUsR0FBRyxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFBO1lBQ3ZDLFNBQVMsRUFBRSxDQUFBO1FBQ1osQ0FBQztRQUNELE1BQU0sQ0FBQyxXQUFXLENBQUMsR0FBRyxDQUFDLElBQUksRUFBRSxTQUFTLENBQUMsQ0FBQTtJQUN4QyxDQUFDO0lBRUQsSUFBSSxDQUFDLHlCQUF5QixFQUFFO1FBQy9CLElBQUksSUFBSSxHQUFHLGlCQUFpQixDQUFDLFVBQVUsRUFBVSxDQUFBO1FBQ2pELElBQUksQ0FBQyxHQUFHLENBQUMsUUFBUSxFQUFFLENBQUMsQ0FBQyxDQUFBO1FBQ3JCLElBQUksQ0FBQyxHQUFHLENBQUMsUUFBUSxFQUFFLENBQUMsQ0FBQyxDQUFBO1FBRXJCLFlBQVksQ0FBQyxJQUFJLEVBQUUsQ0FBQyxRQUFRLEVBQUUsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxRQUFRLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQSxDQUFDLFNBQVM7UUFFMUQsSUFBSSxHQUFHLGlCQUFpQixDQUFDLFVBQVUsRUFBVSxDQUFBO1FBQzdDLElBQUksQ0FBQyxHQUFHLENBQUMsUUFBUSxFQUFFLENBQUMsQ0FBQyxDQUFBO1FBQ3JCLElBQUksQ0FBQyxHQUFHLENBQUMsT0FBTyxFQUFFLENBQUMsQ0FBQyxDQUFBO1FBQ3BCLFlBQVksQ0FBQyxJQUFJLEVBQUUsQ0FBQyxPQUFPLEVBQUUsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxRQUFRLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQSxDQUFDLFVBQVU7UUFFMUQsSUFBSSxHQUFHLGlCQUFpQixDQUFDLFVBQVUsRUFBVSxDQUFBO1FBQzdDLElBQUksQ0FBQyxHQUFHLENBQUMsS0FBSyxFQUFFLENBQUMsQ0FBQyxDQUFBO1FBQ2xCLElBQUksQ0FBQyxHQUFHLENBQUMsS0FBSyxFQUFFLENBQUMsQ0FBQyxDQUFBO1FBQ2xCLFlBQVksQ0FBQyxJQUFJLEVBQUUsQ0FBQyxLQUFLLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQTtRQUU5QixJQUFJLEdBQUcsaUJBQWlCLENBQUMsVUFBVSxFQUFVLENBQUE7UUFDN0MsSUFBSSxDQUFDLEdBQUcsQ0FBQyxLQUFLLEVBQUUsQ0FBQyxDQUFDLENBQUE7UUFDbEIsSUFBSSxDQUFDLEdBQUcsQ0FBQyxRQUFRLEVBQUUsQ0FBQyxDQUFDLENBQUE7UUFDckIsSUFBSSxDQUFDLEdBQUcsQ0FBQyxLQUFLLEVBQUUsQ0FBQyxDQUFDLENBQUE7UUFDbEIsSUFBSSxDQUFDLEdBQUcsQ0FBQyxNQUFNLEVBQUUsQ0FBQyxDQUFDLENBQUE7UUFDbkIsSUFBSSxDQUFDLEdBQUcsQ0FBQyxNQUFNLEVBQUUsQ0FBQyxDQUFDLENBQUE7UUFFbkIsWUFBWSxDQUFDLElBQUksRUFBRSxDQUFDLEtBQUssRUFBRSxDQUFDLENBQUMsRUFBRSxDQUFDLE1BQU0sRUFBRSxDQUFDLENBQUMsRUFBRSxDQUFDLEtBQUssRUFBRSxDQUFDLENBQUMsRUFBRSxDQUFDLE1BQU0sRUFBRSxDQUFDLENBQUMsRUFBRSxDQUFDLFFBQVEsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFBO0lBQ3BGLENBQUMsQ0FBQyxDQUFBO0lBRUYsSUFBSSxDQUFDLHNDQUFzQyxFQUFFO1FBQzVDLE1BQU0sSUFBSSxHQUFHLGlCQUFpQixDQUFDLFVBQVUsRUFBTyxDQUFBO1FBQ2hELElBQUksQ0FBQyxHQUFHLENBQUMsUUFBUSxFQUFFLFNBQVMsQ0FBQyxDQUFBO1FBQzdCLElBQUksQ0FBQyxHQUFHLENBQUMsUUFBUSxFQUFFLENBQUMsQ0FBQyxDQUFBO1FBRXJCLE1BQU0sQ0FBQyxXQUFXLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxRQUFRLENBQUMsRUFBRSxTQUFTLENBQUMsQ0FBQTtRQUNqRCxNQUFNLENBQUMsV0FBVyxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsUUFBUSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUE7UUFDekMsTUFBTSxDQUFDLFdBQVcsQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLFVBQVUsQ0FBQyxFQUFFLFNBQVMsQ0FBQyxDQUFBO1FBRW5ELE1BQU0sQ0FBQyxFQUFFLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFBO1FBQzdCLE1BQU0sQ0FBQyxFQUFFLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFBO1FBQzdCLE1BQU0sQ0FBQyxFQUFFLENBQUMsQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLFVBQVUsQ0FBQyxDQUFDLENBQUE7UUFFaEMsWUFBWSxDQUFDLElBQUksRUFBRSxDQUFDLFFBQVEsRUFBRSxTQUFTLENBQUMsRUFBRSxDQUFDLFFBQVEsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFBLENBQUMsbUNBQW1DO1FBRTVGLE1BQU0sUUFBUSxHQUFHLElBQUksQ0FBQyxHQUFHLENBQUMsUUFBUSxFQUFFLENBQUMsQ0FBQyxDQUFBO1FBQ3RDLE1BQU0sQ0FBQyxXQUFXLENBQUMsUUFBUSxFQUFFLFNBQVMsQ0FBQyxDQUFBO1FBQ3ZDLE1BQU0sQ0FBQyxXQUFXLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxRQUFRLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQTtJQUMxQyxDQUFDLENBQUMsQ0FBQTtJQUVGLElBQUksQ0FBQyxzQ0FBc0MsRUFBRTtRQUM1QyxNQUFNLElBQUksR0FBRyxpQkFBaUIsQ0FBQyxVQUFVLEVBQVUsQ0FBQTtRQUNuRCxJQUFJLENBQUMsR0FBRyxDQUFDLEtBQUssRUFBRSxDQUFDLENBQUMsQ0FBQTtRQUNsQixJQUFJLENBQUMsR0FBRyxDQUFDLFFBQVEsRUFBRSxDQUFDLENBQUMsQ0FBQTtRQUNyQixJQUFJLENBQUMsR0FBRyxDQUFDLFFBQVEsRUFBRSxDQUFDLENBQUMsQ0FBQTtRQUNyQixZQUFZLENBQUMsSUFBSSxFQUFFLENBQUMsS0FBSyxFQUFFLENBQUMsQ0FBQyxFQUFFLENBQUMsUUFBUSxFQUFFLENBQUMsQ0FBQyxFQUFFLENBQUMsUUFBUSxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUE7UUFFNUQsTUFBTSxDQUFDLFdBQVcsQ0FBQyxJQUFJLENBQUMsVUFBVSxDQUFDLEdBQUcsQ0FBQyxFQUFFLFNBQVMsQ0FBQyxDQUFBO1FBQ25ELE1BQU0sQ0FBQyxXQUFXLENBQUMsSUFBSSxDQUFDLFVBQVUsQ0FBQyxHQUFHLENBQUMsRUFBRSxTQUFTLENBQUMsQ0FBQTtRQUNuRCxNQUFNLENBQUMsV0FBVyxDQUFDLElBQUksQ0FBQyxVQUFVLENBQUMsS0FBSyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUE7UUFDN0MsTUFBTSxDQUFDLFdBQVcsQ0FBQyxJQUFJLENBQUMsVUFBVSxDQUFDLE1BQU0sQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFBO1FBQzlDLE1BQU0sQ0FBQyxXQUFXLENBQUMsSUFBSSxDQUFDLFVBQVUsQ0FBQyxPQUFPLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQTtRQUMvQyxNQUFNLENBQUMsV0FBVyxDQUFDLElBQUksQ0FBQyxVQUFVLENBQUMsU0FBUyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUE7UUFDakQsTUFBTSxDQUFDLFdBQVcsQ0FBQyxJQUFJLENBQUMsVUFBVSxDQUFDLFVBQVUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFBO0lBQ25ELENBQUMsQ0FBQyxDQUFBO0lBRUYsSUFBSSxDQUFDLDRCQUE0QixFQUFFO1FBQ2xDLE1BQU0sSUFBSSxHQUFHLElBQUksaUJBQWlCLENBQWlCLElBQUksY0FBYyxFQUFFLENBQUMsQ0FBQTtRQUV4RSxJQUFJLENBQUMsR0FBRyxDQUFDLEtBQUssRUFBRSxDQUFDLENBQUMsQ0FBQTtRQUNsQixJQUFJLENBQUMsR0FBRyxDQUFDLEtBQUssRUFBRSxDQUFDLENBQUMsQ0FBQTtRQUNsQixJQUFJLENBQUMsR0FBRyxDQUFDLFFBQVEsRUFBRSxDQUFDLENBQUMsQ0FBQTtRQUNyQixZQUFZLENBQUMsSUFBSSxFQUFFLENBQUMsS0FBSyxFQUFFLENBQUMsQ0FBQyxFQUFFLENBQUMsS0FBSyxFQUFFLENBQUMsQ0FBQyxFQUFFLENBQUMsUUFBUSxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUE7UUFFekQsTUFBTSxDQUFDLFdBQVcsQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLEtBQUssQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFBO1FBQ3RDLE1BQU0sQ0FBQyxXQUFXLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxLQUFLLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQTtRQUN0QyxNQUFNLENBQUMsV0FBVyxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsUUFBUSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUE7UUFDekMsTUFBTSxDQUFDLFdBQVcsQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLFFBQVEsQ0FBQyxFQUFFLFNBQVMsQ0FBQyxDQUFBO1FBQ2pELE1BQU0sQ0FBQyxXQUFXLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxTQUFTLENBQUMsRUFBRSxTQUFTLENBQUMsQ0FBQTtRQUVsRCxNQUFNLENBQUMsV0FBVyxDQUFDLElBQUksQ0FBQyxVQUFVLENBQUMsSUFBSSxDQUFDLEVBQUUsU0FBUyxDQUFDLENBQUE7UUFDcEQsTUFBTSxDQUFDLFdBQVcsQ0FBQyxJQUFJLENBQUMsVUFBVSxDQUFDLEtBQUssQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFBO1FBQzdDLE1BQU0sQ0FBQyxXQUFXLENBQUMsSUFBSSxDQUFDLFVBQVUsQ0FBQyxPQUFPLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQTtRQUUvQyxJQUFJLENBQUMsTUFBTSxDQUFDLFFBQVEsQ0FBQyxDQUFBO1FBQ3JCLElBQUksQ0FBQyxNQUFNLENBQUMsS0FBSyxDQUFDLENBQUE7UUFDbEIsTUFBTSxDQUFDLFdBQVcsQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLFFBQVEsQ0FBQyxFQUFFLFNBQVMsQ0FBQyxDQUFBO1FBQ2pELE1BQU0sQ0FBQyxXQUFXLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxLQUFLLENBQUMsRUFBRSxTQUFTLENBQUMsQ0FBQTtRQUU5QyxJQUFJLENBQUMsR0FBRyxDQUFDLFFBQVEsRUFBRSxFQUFFLENBQUMsQ0FBQTtRQUN0QixJQUFJLENBQUMsR0FBRyxDQUFDLE1BQU0sRUFBRSxFQUFFLENBQUMsQ0FBQTtRQUNwQixNQUFNLENBQUMsV0FBVyxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsUUFBUSxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUE7UUFDMUMsTUFBTSxDQUFDLFdBQVcsQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLE1BQU0sQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFBO1FBQ3hDLE1BQU0sQ0FBQyxXQUFXLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxLQUFLLENBQUMsRUFBRSxTQUFTLENBQUMsQ0FBQTtJQUMvQyxDQUFDLENBQUMsQ0FBQTtJQUVGLElBQUksQ0FBQyxzQ0FBc0MsRUFBRTtRQUM1QyxnQkFBZ0I7UUFDaEIsSUFBSSxJQUFJLEdBQUcsSUFBSSxpQkFBaUIsQ0FBaUIsSUFBSSxjQUFjLEVBQUUsQ0FBQyxDQUFBO1FBQ3RFLElBQUksQ0FBQyxHQUFHLENBQUMsS0FBSyxFQUFFLENBQUMsQ0FBQyxDQUFBO1FBQ2xCLElBQUksQ0FBQyxHQUFHLENBQUMsUUFBUSxFQUFFLENBQUMsQ0FBQyxDQUFBO1FBQ3JCLElBQUksQ0FBQyxHQUFHLENBQUMsS0FBSyxFQUFFLENBQUMsQ0FBQyxDQUFBO1FBQ2xCLFlBQVksQ0FBQyxJQUFJLEVBQUUsQ0FBQyxLQUFLLEVBQUUsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxLQUFLLEVBQUUsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxRQUFRLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQTtRQUN6RCxJQUFJLENBQUMsTUFBTSxDQUFDLEtBQUssQ0FBQyxDQUFBO1FBQ2xCLFlBQVksQ0FBQyxJQUFJLEVBQUUsQ0FBQyxLQUFLLEVBQUUsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxRQUFRLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQTtRQUM3QyxJQUFJLENBQUMsTUFBTSxDQUFDLFFBQVEsQ0FBQyxDQUFBO1FBQ3JCLFlBQVksQ0FBQyxJQUFJLEVBQUUsQ0FBQyxLQUFLLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQTtRQUU5QixrQkFBa0I7UUFDbEIsSUFBSSxHQUFHLElBQUksaUJBQWlCLENBQWlCLElBQUksY0FBYyxFQUFFLENBQUMsQ0FBQTtRQUNsRSxJQUFJLENBQUMsR0FBRyxDQUFDLEtBQUssRUFBRSxDQUFDLENBQUMsQ0FBQTtRQUNsQixJQUFJLENBQUMsR0FBRyxDQUFDLFFBQVEsRUFBRSxDQUFDLENBQUMsQ0FBQTtRQUNyQixJQUFJLENBQUMsR0FBRyxDQUFDLEtBQUssRUFBRSxDQUFDLENBQUMsQ0FBQTtRQUNsQixJQUFJLENBQUMsR0FBRyxDQUFDLFdBQVcsRUFBRSxDQUFDLENBQUMsQ0FBQTtRQUN4QixJQUFJLENBQUMsY0FBYyxDQUFDLEtBQUssQ0FBQyxDQUFBO1FBQzFCLFlBQVksQ0FBQyxJQUFJLEVBQUUsQ0FBQyxLQUFLLEVBQUUsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxLQUFLLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQTtRQUUxQyxJQUFJLEdBQUcsSUFBSSxpQkFBaUIsQ0FBaUIsSUFBSSxjQUFjLEVBQUUsQ0FBQyxDQUFBO1FBQ2xFLElBQUksQ0FBQyxHQUFHLENBQUMsS0FBSyxFQUFFLENBQUMsQ0FBQyxDQUFBO1FBQ2xCLElBQUksQ0FBQyxHQUFHLENBQUMsUUFBUSxFQUFFLENBQUMsQ0FBQyxDQUFBO1FBQ3JCLElBQUksQ0FBQyxHQUFHLENBQUMsS0FBSyxFQUFFLENBQUMsQ0FBQyxDQUFBO1FBQ2xCLElBQUksQ0FBQyxHQUFHLENBQUMsV0FBVyxFQUFFLENBQUMsQ0FBQyxDQUFBO1FBQ3hCLElBQUksQ0FBQyxjQUFjLENBQUMsSUFBSSxDQUFDLENBQUE7UUFDekIsWUFBWSxDQUFDLElBQUksRUFBRSxDQUFDLEtBQUssRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFBO1FBRTlCLHNFQUFzRTtRQUN0RSxzQkFBc0I7UUFDdEIseUJBQXlCO1FBQ3pCLHNCQUFzQjtRQUN0Qiw0QkFBNEI7UUFDNUIsNkNBQTZDO0lBQzlDLENBQUMsQ0FBQyxDQUFBO0lBRUYsSUFBSSxDQUFDLDJDQUEyQyxFQUFFO1FBQ2pELE1BQU0sSUFBSSxHQUFHLElBQUksaUJBQWlCLENBQWlCLElBQUksWUFBWSxFQUFFLENBQUMsQ0FBQTtRQUV0RSxJQUFJLENBQUMsR0FBRyxDQUFDLGVBQWUsRUFBRSxDQUFDLENBQUMsQ0FBQTtRQUM1QixJQUFJLENBQUMsR0FBRyxDQUFDLFdBQVcsRUFBRSxDQUFDLENBQUMsQ0FBQTtRQUN4QixJQUFJLENBQUMsR0FBRyxDQUFDLHFCQUFxQixFQUFFLENBQUMsQ0FBQyxDQUFBO1FBRWxDLE1BQU0sQ0FBQyxXQUFXLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxlQUFlLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQTtRQUNoRCxNQUFNLENBQUMsV0FBVyxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsV0FBVyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUE7UUFDNUMsTUFBTSxDQUFDLFdBQVcsQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLFlBQVksQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFBO1FBQzdDLE1BQU0sQ0FBQyxXQUFXLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxZQUFZLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQTtRQUM3QyxNQUFNLENBQUMsV0FBVyxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMscUJBQXFCLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQTtRQUV0RCxNQUFNLENBQUMsV0FBVyxDQUFDLElBQUksQ0FBQyxVQUFVLENBQUMsV0FBVyxDQUFDLEVBQUUsU0FBUyxDQUFDLENBQUE7UUFDM0QsTUFBTSxDQUFDLFdBQVcsQ0FBQyxJQUFJLENBQUMsVUFBVSxDQUFDLFdBQVcsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFBO1FBQ25ELE1BQU0sQ0FBQyxXQUFXLENBQUMsSUFBSSxDQUFDLFVBQVUsQ0FBQyxhQUFhLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQTtRQUNyRCxNQUFNLENBQUMsV0FBVyxDQUFDLElBQUksQ0FBQyxVQUFVLENBQUMsWUFBWSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUE7UUFDcEQsTUFBTSxDQUFDLFdBQVcsQ0FBQyxJQUFJLENBQUMsVUFBVSxDQUFDLGNBQWMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFBO1FBQ3RELE1BQU0sQ0FBQyxXQUFXLENBQUMsSUFBSSxDQUFDLFVBQVUsQ0FBQyxtQkFBbUIsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFBO1FBQzNELE1BQU0sQ0FBQyxXQUFXLENBQUMsSUFBSSxDQUFDLFVBQVUsQ0FBQyxlQUFlLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQTtRQUN2RCxNQUFNLENBQUMsV0FBVyxDQUFDLElBQUksQ0FBQyxVQUFVLENBQUMsdUJBQXVCLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQTtJQUNoRSxDQUFDLENBQUMsQ0FBQTtJQUVGLElBQUksQ0FBQywrQkFBK0IsRUFBRTtRQUNyQyxDQUFDO1lBQ0EsY0FBYztZQUNkLE1BQU0sSUFBSSxHQUFHLElBQUksaUJBQWlCLENBQWlCLElBQUksWUFBWSxFQUFFLENBQUMsQ0FBQTtZQUN0RSxJQUFJLENBQUMsR0FBRyxDQUFDLFFBQVEsRUFBRSxDQUFDLENBQUMsQ0FBQTtZQUNyQixJQUFJLENBQUMsR0FBRyxDQUFDLFFBQVEsRUFBRSxDQUFDLENBQUMsQ0FBQTtZQUNyQixJQUFJLENBQUMsR0FBRyxDQUFDLFFBQVEsRUFBRSxDQUFDLENBQUMsQ0FBQTtZQUNyQixZQUFZLENBQUMsSUFBSSxFQUFFLENBQUMsUUFBUSxFQUFFLENBQUMsQ0FBQyxFQUFFLENBQUMsUUFBUSxFQUFFLENBQUMsQ0FBQyxFQUFFLENBQUMsUUFBUSxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUE7UUFDaEUsQ0FBQztRQUVELENBQUM7WUFDQSw4QkFBOEI7WUFDOUIsTUFBTSxJQUFJLEdBQUcsSUFBSSxpQkFBaUIsQ0FBaUIsSUFBSSxZQUFZLEVBQUUsQ0FBQyxDQUFBO1lBQ3RFLElBQUksQ0FBQyxHQUFHLENBQUMsWUFBWSxFQUFFLENBQUMsQ0FBQyxDQUFBO1lBQ3pCLElBQUksQ0FBQyxHQUFHLENBQUMsWUFBWSxFQUFFLENBQUMsQ0FBQyxDQUFBO1lBQ3pCLElBQUksQ0FBQyxHQUFHLENBQUMsWUFBWSxFQUFFLENBQUMsQ0FBQyxDQUFBO1lBQ3pCLFlBQVksQ0FBQyxJQUFJLEVBQUUsQ0FBQyxZQUFZLEVBQUUsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxZQUFZLEVBQUUsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxZQUFZLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQTtRQUM1RSxDQUFDO1FBRUQsQ0FBQztZQUNBLGVBQWU7WUFDZixNQUFNLElBQUksR0FBRyxJQUFJLGlCQUFpQixDQUFpQixJQUFJLFlBQVksRUFBRSxDQUFDLENBQUE7WUFDdEUsSUFBSSxDQUFDLEdBQUcsQ0FBQyxRQUFRLEVBQUUsQ0FBQyxDQUFDLENBQUE7WUFDckIsSUFBSSxDQUFDLEdBQUcsQ0FBQyxRQUFRLEVBQUUsQ0FBQyxDQUFDLENBQUE7WUFDckIsSUFBSSxDQUFDLEdBQUcsQ0FBQyxRQUFRLEVBQUUsQ0FBQyxDQUFDLENBQUE7WUFDckIsWUFBWSxDQUFDLElBQUksRUFBRSxDQUFDLFFBQVEsRUFBRSxDQUFDLENBQUMsRUFBRSxDQUFDLFFBQVEsRUFBRSxDQUFDLENBQUMsRUFBRSxDQUFDLFFBQVEsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFBO1FBQ2hFLENBQUM7UUFFRCxDQUFDO1lBQ0EsK0JBQStCO1lBQy9CLE1BQU0sSUFBSSxHQUFHLElBQUksaUJBQWlCLENBQWlCLElBQUksWUFBWSxFQUFFLENBQUMsQ0FBQTtZQUN0RSxJQUFJLENBQUMsR0FBRyxDQUFDLFlBQVksRUFBRSxDQUFDLENBQUMsQ0FBQTtZQUN6QixJQUFJLENBQUMsR0FBRyxDQUFDLFlBQVksRUFBRSxDQUFDLENBQUMsQ0FBQTtZQUN6QixJQUFJLENBQUMsR0FBRyxDQUFDLFlBQVksRUFBRSxDQUFDLENBQUMsQ0FBQTtZQUN6QixZQUFZLENBQUMsSUFBSSxFQUFFLENBQUMsWUFBWSxFQUFFLENBQUMsQ0FBQyxFQUFFLENBQUMsWUFBWSxFQUFFLENBQUMsQ0FBQyxFQUFFLENBQUMsWUFBWSxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUE7UUFDNUUsQ0FBQztRQUVELENBQUM7WUFDQSxxQkFBcUI7WUFDckIsTUFBTSxJQUFJLEdBQUcsSUFBSSxpQkFBaUIsQ0FBaUIsSUFBSSxZQUFZLEVBQUUsQ0FBQyxDQUFBO1lBQ3RFLElBQUksQ0FBQyxHQUFHLENBQUMsUUFBUSxFQUFFLENBQUMsQ0FBQyxDQUFBO1lBQ3JCLElBQUksQ0FBQyxHQUFHLENBQUMsUUFBUSxFQUFFLENBQUMsQ0FBQyxDQUFBO1lBQ3JCLElBQUksQ0FBQyxHQUFHLENBQUMsUUFBUSxFQUFFLEVBQUUsQ0FBQyxDQUFBO1lBQ3RCLElBQUksQ0FBQyxHQUFHLENBQUMsUUFBUSxFQUFFLEVBQUUsQ0FBQyxDQUFBO1lBQ3RCLElBQUksQ0FBQyxHQUFHLENBQUMsUUFBUSxFQUFFLEVBQUUsQ0FBQyxDQUFBO1lBQ3RCLElBQUksQ0FBQyxHQUFHLENBQUMsUUFBUSxFQUFFLEVBQUUsQ0FBQyxDQUFBO1lBQ3RCLFlBQVksQ0FDWCxJQUFJLEVBQ0osQ0FBQyxRQUFRLEVBQUUsQ0FBQyxDQUFDLEVBQ2IsQ0FBQyxRQUFRLEVBQUUsQ0FBQyxDQUFDLEVBQ2IsQ0FBQyxRQUFRLEVBQUUsRUFBRSxDQUFDLEVBQ2QsQ0FBQyxRQUFRLEVBQUUsRUFBRSxDQUFDLEVBQ2QsQ0FBQyxRQUFRLEVBQUUsRUFBRSxDQUFDLEVBQ2QsQ0FBQyxRQUFRLEVBQUUsRUFBRSxDQUFDLENBQ2QsQ0FBQTtRQUNGLENBQUM7UUFFRCxDQUFDO1lBQ0EscUJBQXFCO1lBQ3JCLE1BQU0sSUFBSSxHQUFHLElBQUksaUJBQWlCLENBQWlCLElBQUksWUFBWSxFQUFFLENBQUMsQ0FBQTtZQUN0RSxJQUFJLENBQUMsR0FBRyxDQUFDLFFBQVEsRUFBRSxFQUFFLENBQUMsQ0FBQTtZQUN0QixJQUFJLENBQUMsR0FBRyxDQUFDLFFBQVEsRUFBRSxFQUFFLENBQUMsQ0FBQTtZQUN0QixJQUFJLENBQUMsR0FBRyxDQUFDLFFBQVEsRUFBRSxFQUFFLENBQUMsQ0FBQTtZQUN0QixJQUFJLENBQUMsR0FBRyxDQUFDLFFBQVEsRUFBRSxDQUFDLENBQUMsQ0FBQTtZQUNyQixJQUFJLENBQUMsR0FBRyxDQUFDLFFBQVEsRUFBRSxDQUFDLENBQUMsQ0FBQTtZQUNyQixJQUFJLENBQUMsR0FBRyxDQUFDLFFBQVEsRUFBRSxDQUFDLENBQUMsQ0FBQTtZQUNyQixZQUFZLENBQ1gsSUFBSSxFQUNKLENBQUMsUUFBUSxFQUFFLENBQUMsQ0FBQyxFQUNiLENB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QUcsRUFBRSxDQUFDLENBQUMsQ0FBQTtRQUNoQixJQUFJLENBQUMsR0FBRyxDQUFDLEdBQUcsRUFBRSxDQUFDLENBQUMsQ0FBQTtRQUNoQixZQUFZLENBQUMsSUFBSSxFQUFFLENBQUMsR0FBRyxFQUFFLENBQUMsQ0FBQyxFQUFFLENBQUMsR0FBRyxFQUFFLENBQUMsQ0FBQyxFQUFFLENBQUMsR0FBRyxFQUFFLENBQUMsQ0FBQyxFQUFFLENBQUMsR0FBRyxFQUFFLENBQUMsQ0FBQyxFQUFFLENBQUMsR0FBRyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUE7UUFFcEUsZUFBZTtRQUNmLElBQUksQ0FBQyxNQUFNLENBQUMsR0FBRyxDQUFDLENBQUE7UUFDaEIsWUFBWSxDQUFDLElBQUksRUFBRSxDQUFDLEdBQUcsRUFBRSxDQUFDLENBQUMsRUFBRSxDQUFDLEdBQUcsRUFBRSxDQUFDLENBQUMsRUFBRSxDQUFDLEdBQUcsRUFBRSxDQUFDLENBQUMsRUFBRSxDQUFDLEdBQUcsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFBO1FBRTFELElBQUksQ0FBQyxLQUFLLEVBQUUsQ0FBQTtRQUNaLElBQUksQ0FBQyxHQUFHLENBQUMsR0FBRyxFQUFFLENBQUMsQ0FBQyxDQUFBO1FBQ2hCLElBQUksQ0FBQyxHQUFHLENBQUMsR0FBRyxFQUFFLENBQUMsQ0FBQyxDQUFBO1FBQ2hCLElBQUksQ0FBQyxHQUFHLENBQUMsR0FBRyxFQUFFLENBQUMsQ0FBQyxDQUFBO1FBQ2hCLElBQUksQ0FBQyxHQUFHLENBQUMsR0FBRyxFQUFFLENBQUMsQ0FBQyxDQUFBO1FBQ2hCLElBQUksQ0FBQyxHQUFHLENBQUMsR0FBRyxFQUFFLENBQUMsQ0FBQyxDQUFBO1FBQ2hCLFlBQVksQ0FBQyxJQUFJLEVBQUUsQ0FBQyxHQUFHLEVBQUUsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxHQUFHLEVBQUUsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxHQUFHLEVBQUUsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxHQUFHLEVBQUUsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxHQUFHLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQTtRQUVwRSxhQUFhO1FBQ2IsSUFBSSxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsQ0FBQTtRQUNoQixZQUFZLENBQUMsSUFBSSxFQUFFLENBQUMsR0FBRyxFQUFFLENBQUMsQ0FBQyxFQUFFLENBQUMsR0FBRyxFQUFFLENBQUMsQ0FBQyxFQUFFLENBQUMsR0FBRyxFQUFFLENBQUMsQ0FBQyxFQUFFLENBQUMsR0FBRyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUE7UUFFMUQsTUFBTTtRQUNOLElBQUksQ0FBQyxLQUFLLEVBQUUsQ0FBQTtRQUNaLElBQUksQ0FBQyxHQUFHLENBQUMsR0FBRyxFQUFFLENBQUMsQ0FBQyxDQUFBO1FBQ2hCLElBQUksQ0FBQyxHQUFHLENBQUMsSUFBSSxFQUFFLENBQUMsQ0FBQyxDQUFBO1FBQ2pCLElBQUksQ0FBQyxHQUFHLENBQUMsSUFBSSxFQUFFLENBQUMsQ0FBQyxDQUFBO1FBQ2pCLElBQUksQ0FBQyxHQUFHLENBQUMsSUFBSSxFQUFFLENBQUMsQ0FBQyxDQUFBO1FBQ2pCLElBQUksQ0FBQyxHQUFHLENBQUMsSUFBSSxFQUFFLENBQUMsQ0FBQyxDQUFBO1FBQ2pCLElBQUksQ0FBQyxHQUFHLENBQUMsSUFBSSxFQUFFLENBQUMsQ0FBQyxDQUFBO1FBQ2pCLFlBQVksQ0FBQyxJQUFJLEVBQUUsQ0FBQyxHQUFHLEVBQUUsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxJQUFJLEVBQUUsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxJQUFJLEVBQUUsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxJQUFJLEVBQUUsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxJQUFJLEVBQUUsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxJQUFJLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQTtRQUVuRixJQUFJLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxDQUFBO1FBQ2pCLFlBQVksQ0FBQyxJQUFJLEVBQUUsQ0FBQyxHQUFHLEVBQUUsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxJQUFJLEVBQUUsQ0FBQyxD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VSxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUE7SUFDckQsQ0FBQyxDQUFDLENBQUE7SUFFRixJQUFJLENBQUMsa0NBQWtDLEVBQUU7UUFDeEMsTUFBTSxJQUFJLEdBQUcsSUFBSSxpQkFBaUIsQ0FDakMsSUFBSSxXQUFXLENBQ2QsR0FBRyxFQUFFLENBQUMsS0FBSyxFQUNYLEdBQUcsRUFBRSxDQUFDLEtBQUssQ0FDWCxDQUNELENBQUE7UUFFRCxJQUFJLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsZUFBZSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUE7UUFDdEMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLFdBQVcsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFBO1FBQ2xDLElBQUksQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxxQkFBcUIsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFBO1FBRTVDLE1BQU0sQ0FBQyxXQUFXLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLGVBQWUsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUE7UUFDMUQsTUFBTSxDQUFDLFdBQVcsQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsV0FBVyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQTtRQUN0RCxNQUFNLENBQUMsV0FBVyxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxxQkFBcUIsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUE7UUFFaEUsTUFBTSxDQUFDLFdBQVcsQ0FBQyxJQUFJLENBQUMsVUFBVSxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsV0FBVyxDQUFDLENBQUMsRUFBRSxTQUFTLENBQUMsQ0FBQTtRQUNyRSxNQUFNLENBQUMsV0FBVyxDQUFDLElBQUksQ0FBQyxVQUFVLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxXQUFXLENBQUMs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S0FBSyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFBO1FBQ3BDLE1BQU0sQ0FBQyxXQUFXLENBQUMsSUFBSSxDQUFDLElBQUksRUFBRSxLQUFLLENBQUMsQ0FBQTtRQUNwQyxJQUFJLEdBQUcsSUFBSSxDQUFDLElBQUksRUFBRSxDQUFBO1FBQ2xCLE1BQU0sQ0FBQyxXQUFXLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQTtRQUNwQyxNQUFNLENBQUMsV0FBVyxDQUFDLElBQUksQ0FBQyxJQUFJLEVBQUUsS0FBSyxDQUFDLENBQUE7UUFDcEMsSUFBSSxHQUFHLElBQUksQ0FBQyxJQUFJLEVBQUUsQ0FBQTtRQUNsQixNQUFNLENBQUMsV0FBVyxDQUFDLElBQUksQ0FBQyxLQUFLLEVBQUUsU0FBUyxDQUFDLENBQUE7UUFDekMsTUFBTSxDQUFDLFdBQVcsQ0FBQyxJQUFJLENBQUMsSUFBSSxFQUFFLElBQUksQ0FBQyxDQUFBO1FBRW5DLElBQUksR0FBRyxHQUFHLENBQUMsWUFBWSxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLENBQUUsQ0FBQTtRQUMxQyxJQUFJLEdBQUcsSUFBSSxDQUFDLElBQUksRUFBRSxDQUFBO1FBQ2xCLE1BQU0sQ0FBQyxXQUFXLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQTtRQUNwQyxNQUFNLENBQUMsV0FBVyxDQUFDLElBQUksQ0FBQyxJQUFJLEVBQUUsS0FBSyxDQUFDLENBQUE7UUFFcEMsSUFBSSxHQUFHLElBQUksQ0FBQyxJQUFJLEVBQUUsQ0FBQTtRQUNsQixNQUFNLENBQUMsV0FBVyxDQUFDLElBQUksQ0FBQyxLQUFLLEVBQUUsU0FBUyxDQUFDLENBQUE7UUFDekMsTUFBTSxDQUFDLFdBQVcsQ0FBQyxJQUFJLENBQUMsSUFBSSxFQUFFLElBQUksQ0FBQyxDQUFBO1FBRW5DLElBQUksR0FBRyxHQUFHLENBQUMsWUFBWSxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUUsQ0FBQTtRQUN2QyxJQUFJLEdBQUcsSUFBSSxDQUFDLElBQUksRUFBRSxDQUFBO1FBQ2xCLE1BQU0sQ0FBQyxXQUFXLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQTtRQUNwQyxNQUFNLENBQUMsV0FBVyxDQUFDLElBQUksQ0FBQyxJQUFJLEVBQUUsS0FBSyxDQUFDLENBQUE7UUFDcEMsSUFBSSxHQUFHLElBQUksQ0FBQyxJQUFJLEVBQUUsQ0FBQTtRQUNsQixNQUFNLENBQUMsV0FBVyxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUE7UUFDcEMsTUFBTSxDQUFDLFdBQVcsQ0FBQyxJQUFJLENBQUMsSUFBSSxFQUFFLEtBQUssQ0FBQyxDQUFBO1FBQ3BDLElBQUksR0FBRyxJQUFJLENBQUMsSUFBSSxFQUFFLENBQUE7UUFDbEIsTUFBTSxDQUFDLFdBQVcsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFBO1FBQ3BDLE1BQU0sQ0FBQyxXQUFXLENBQUMsSUFBSSxDQUFDLElBQUksRUFBRSxLQUFLLENBQUMsQ0FBQTtRQUNwQyxJQUFJLEdBQUcsSUFBSSxDQUFDLElBQUksRUFBRSxDQUFBO1FBQ2xCLE1BQU0sQ0FBQyxXQUFXLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQTtRQUNwQyxNQUFNLENBQUMsV0FBVyxDQUFDLElBQUksQ0FBQyxJQUFJLEVBQUUsS0FBSyxDQUFDLENBQUE7UUFDcEMsSUFBSSxHQUFHLElBQUksQ0FBQyxJQUFJLEVBQUUsQ0FBQTtRQUNsQixNQUFNLENBQUMsV0FBVyxDQUFDLElBQUksQ0FBQyxLQUFLLEVBQUUsU0FBUyxDQUFDLENBQUE7UUFDekMsTUFBTSxDQUFDLFdBQVcsQ0FBQyxJQUFJLENBQUMsSUFBSSxFQUFFLElBQUks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