const assert = require('assert')
const { Observable } = require('rxjs')

const type = value =>
    Object.prototype.toString.call(value).replace(/^\[object |\]$/g, '').toLowerCase()

const assertArg = (method, arg, atype) =>
    assert(
        [].concat(atype).indexOf(type(arg)) >= 0,
        `${method} expects argument ${atype}, got ${type(arg)}`
    )

const assertIndex = (index, arr) => {
    if (index >= arr.length)
        throw new Error(`Index ${index} is out of range of array with ${arr.length} elements`)
}

module.exports = (allocSize = 0) => {
    // Observer set upon subscription
    let _observer = null

    // items storage array 
    const _items = Array(allocSize)

    // array with empty indices resulted from deleted items
    const _slots = Array.from(Array(allocSize), (_, i) => i)

    // accumulate emitted values until subscription
    const _buffer = []

    // emits item to observer if present, or add item to the buffer
    const emit = (prev, item) => _observer ? _observer.next({ prev, item }) : _buffer.push({ prev, item })
    return Object.assign(Observable.create(observer => {
        // Observable subscribed, flushing all pending items
        _buffer.forEach(function (value) {
            observer.next(value)
        })
        _observer = observer
    }), {
            /**
             * Creates new item in the store
             * @param {object} item object to add to store
             * @returns {object} the item with added _index property pointing the same item in the store
             */
            createItem: item => {
                assertArg("createItem", item, "object")
                item = Object.assign({}, item)
                if (_slots.length > 0) {
                    item._index = _slots.pop()
                    _items[item._index] = item
                } else {
                    item._index = _items.length
                    _items.push(item)
                }
                emit(null, item)
                return item
            },
            /**
             * Updates item at specified index
             * @param {number} index in store to be updated
             * @param {object} item object used to update an existing item in the store.
             * @returns {object} the updated item
             */
            updateItem: (index, item) => {
                assertArg("updateItem", index, "number")
                assertArg("updateItem", item, ["object", "null"])
                assertIndex(index, _items)
                if (!item) {
                    // deleting item
                    if (_items.indexOf(index) < 0)
                        _slots.push(index)
                    emit(_items[index], _items[index] = null)
                } else {
                    if (!_items[index]) {
                        // updating deleted item
                        const islot = _slots.indexOf(index)
                        assert(islot >= 0, `Missing slot for deleted item at index ${islot}`)
                        _slots.splice(islot, 1)
                    }
                    emit(item, _items[index] = Object.assign(_items[index] || { _index: index }, item))
                }
                return _items[index]
            },
            /**
             * Deletes item at specified index
             * @param {number} index in store to be deleted
             */
            deleteItem: index => {
                assertArg("deleteItem", index, ["number"])
                assertIndex(index, _items)
                if (index >= _items.length)
                    throw new Error(`Index ${index} is out of range of array size ${_items.length}`)
                emit(_items[index], _items[index] = null)
                if (_slots.indexOf(index) < 0)
                    _slots.push(index)
            },
            /**
             * Returns all items
             * @return {array} all existing items in the store
             */
            items: () => _items.filter(item => item),
            /**
             * Return an item at specified index
             * @return {object} an item
             */
            item: index => {
                assertArg("item", index, "number")
                assertIndex(index, _items)
                return _items[index]
            },
            /**
             * Return the number of items in the store
             * @return {number} number of items in the store
             */
            size: () => _items.length - _slots.length,
        })
}
