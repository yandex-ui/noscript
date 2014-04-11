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
```


### `ns.ModelCollection`
```js
// Instance API
collection.insert(models, index)
collection.remove(models)
collection.getSelfVersion()
collection.clear()
collection.onItemChanged(evt, model, jpath)
collection.onItemTouched(evt, model)
collection.onItemDestroyed(evt, model)
```

<div id="disqus_thread"></div>
<script type="text/javascript">
    /* * * CONFIGURATION VARIABLES: EDIT BEFORE PASTING INTO YOUR WEBPAGE * * */
    var disqus_shortname = 'noscript'; // required: replace example with your forum shortname

    /* * * DON'T EDIT BELOW THIS LINE * * */
    (function() {
        var dsq = document.createElement('script'); dsq.type = 'text/javascript'; dsq.async = true;
        dsq.src = '//' + disqus_shortname + '.disqus.com/embed.js';
        (document.getElementsByTagName('head')[0] || document.getElementsByTagName('body')[0]).appendChild(dsq);
    })();
</script>
<noscript>Please enable JavaScript to view the <a href="http://disqus.com/?ref_noscript">comments powered by Disqus.</a></noscript>
<a href="http://disqus.com" class="dsq-brlink">comments powered by <span class="logo-disqus">Disqus</span></a>
