### `ns.Model`
```js
// Static API
ns.Model.define(id, info, base)
ns.Model.info(id)
ns.Model.infoLite(id)
ns.Model.key(id, params, info)
ns.Model.get(id, params)
ns.Model.getValid(id, params)
ns.Model.isValid(id, params)
ns.Model.invalidate(id, filter)
ns.Model.destroy(model)
ns.Model.destroyWith(targetModel, withModels)
ns.Model.isCollection(model)

// Instance API
model.getRequestParams()
model.prepareRequest(requestId)
model.canRetry()
model.extractData(result)
model.extractError(result)
model.preprocessData(data)
model.setData(data, options) // options.silent
model.set(jpath, value, options) // options.silent
model.getData() // Returns whole data object
model.get(jpath) // Returns some data object property
model.select(jpath) // Returns an array of values, selected from data object (useful when there are many results returned by the same jpath)
model.setError(error)
model.getError()
model.isValid()
model.isDo()
model.getVersion()
model.touch()
model.invalidate()
//
```
