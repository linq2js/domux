# DOMUX

Powerful DOM manipulation library

## Installation

```
npm install domux --save
```

## Why Domux ?

- Domux is made for small and medium projects.
- With Domux you can manipulate DOM easier and more flexible.
- Domux is an alternative for jQuery or static template engines.
- Domux is very compact, only 3kb after GZiped

## Getting started

Let's create counter app

**index.html**

```html
<body>
  <h1></h1>
  <button>Increase</button>
</body>
```

**script.js**

```js
import domux from "domux";
// define root model
// model can be anything
let rootModel = 0;
const binder = domux
  // select h1 element, you can use any kind of querySelector expression (#element-id, .element-class etc.)
  // then bind model value to textContent of the element
  // that means when model updated, the textContent will be updated as well
  .add("h1", (model) => ({
    "#text": model,
  }))
  // select button element
  .add("button", () => ({
    // add onclick event binding
    // if binding name starts with $ it uses to element prop unless it uses to element attribute
    // (id, class, style are attributes. value, disabled are props)
    // there are 2 special bindings: #text (use to textContent prop) and #html (use to innerHTML)
    $onclick() {
      // update model
      rootModel++;
      // update bindings
      binder.update(rootModel);
    },
  }));
// update all bindings with specified model
binder.update(rootModel);
```

## Toggling classes and updating style

**index.html**

```html
<body>
  <style type="text/css">
    .checked {
      font-weight: bold;
    }
  </style>
  <input type="checkbox" />
  <label>Click on checkbox to see an effect</label>
</body>
```

**script.js**

```js
import domux from "domux";

let rootModel = false;
const binder = domux
  .add("input", (model) => ({
    $onclick() {
      rootModel = !model;
      binder.update(rootModel);
    },
  }))
  // add bindings for label element
  .add("label", (model) => ({
    // toggle checked class according to model value
    // add checked class if model is true, unless remove checked class
    // you also assign string value to class binding
    // class: model ? 'checked' : ''
    class: { checked: model },
    // you also assign string value to style attribute
    // style: model ? 'text-decoration: underline' : ''
    style: {
      "text-decoration": model ? "underline" : "none",
    },
  }));

binder.update(rootModel);
```

## Rendering list

**index.html**

```html
<body>
  <h1><span></span></h1>
  <ul>
    <!--This li element uses to item template-->
    <li></li>
  </ul>
</body>
```

**script.js**

```js
import domux from "domux";

let rootModel = {
  fruits: ["apple", "banan", "orange"],
};
const binder = domux
  .add("h1 > span", (model) => ({
    "#text": model.fruits.length,
  }))
  .add(
    "ul",
    (model) => model.fruits,
    (fruit) => ({ "#text": fruit })
  );

binder.update(rootModel);
```

In this example, when the page is loading, if binder.update() did not call yet, user can see empty LI element, this looks weird.
You can set **domux-template** class to that LI element to hide it during page loading.

```html
<li class="domux-template"></li>
```

## Combining multiple binders

If you want to render more complex list item (bind event to buttons that placed inside LI elements).
You need to update your code and move binding logic to other binder.

**index.html**

```html
<body>
  <h1><span></span></h1>
  <ul>
    <!--This li element uses to item template-->
    <li><span></span><button>Remove</button></li>
  </ul>
</body>
```

```js
import domux from "domux";

let rootModel = {
  fruits: ["apple", "banan", "orange"],
};
// define item binder
const itemBinder = domux
  .add("span", (fruit) => ({
    "#text": fruit,
  }))
  .add("button", (fruit) => ({
    $onclick() {
      // DO NOT mutate rootModel directly using rootModel.fruits.splice(fruitIndex, 1)
      // the model must be immutable, clone model before updating
      // the reason to use immutable object is detecting change faster than using a mutable object
      rootModel = {
        ...rootModel,
        fruits: rootModel.fruits.filter((x) => x !== fruit),
      };
      listBinder.update(rootModel);
    },
  }));
const listBinder = domux
  .add("h1 > span", (model) => ({
    "#text": model.fruits.length,
  }))
  .add(
    "ul",
    (model) => model.fruits,
    // use itemBinder for model.fruits
    // you must wrap itemBinder into square brackets, itemBinder retrieves single fruit item
    // without the brackets, itemBinder retrieves whole model.fruits
    [itemBinder]
  );

listBinder.update(rootModel);
```

## Using custom container

By default, Domux performs updating from document element, you can specify other container

```js
const binder = domux(document.getElementById("root")).add("selector", () => {});
```

## Builtin Model

Domux provides a built-in model class, that helps you modify app data more efficiently and easier

```js
const rootModel = domux.model({ count: 1 });
const rootBinder = domux(rootModel).add("h1", (model) => ({
  "#text": model.count,
  $onclick() {
    // model object is plain object, do not modify its prop
    // we should update rootModel
    rootModel.count++;
    // dont need to call rootBinder.update(rootModel)
  },
}));
```

## Dependencies

Nothing
