const { Observable } = require('rxjs')

module.exports = (items = []) => {
    // Observer set upon subscription
    let _observer = null

    // accumulate emitted values until subscription
    const buffer = []

    // stack with empty indices from deleted items
    const slots = []

    // emits item to observer if present, or add item to the buffer
    const emit = (prev, item) => _observer ? _observer.next({prev, item}) : buffer.push({prev, item})
    return Object.assign(Observable.create(observer => {
        // Observable subscribed, flushing all pending items
        buffer.forEach(function (value) {
            observer.next(value)
        })
        _observer = observer
    }), {
            items,
            createItem: item => {
                item = Object.assign({}, item)
                if (slots.length > 0) {
                    item.id = slots.pop()
                    items[item.id] = item
                } else {
                    item.id = items.length
                    items.push(item)
                }
                emit(null, item)
            },
            updateItem: (item) => emit(item, Object.assign(items[item.id] || {}, item)),
            deleteItem: (id) => {
                emit(items[id], items[id] = null)
                slots.push(id)
            }
        })
}
