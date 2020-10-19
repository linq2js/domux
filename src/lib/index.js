const defaultDomSelector = (model) => model;
const templateClassName = "domux-template";

export default function domux(defaultContainer, modelAccessor) {
  if (
    typeof defaultContainer === "function" ||
    defaultContainer instanceof Model
  ) {
    modelAccessor = defaultContainer;
  }
  defaultContainer = undefined;

  const instance = {
    add,
    update,
    // action,
    dispatch,
  };
  const bindings = [];
  const currentContext = {
    dispatch,
  };
  let hasChange = false;
  let isBuiltInModel = false;
  let dispatchScopes = 0;

  if (modelAccessor instanceof Model) {
    isBuiltInModel = true;
    modelAccessor = modelAccessor.__accessor;
  }

  if (typeof modelAccessor.subscribe === "function") {
    modelAccessor.subscribe(handleChange);
  }

  function handleChange() {
    hasChange = true;
    if (!dispatchScopes) {
      update(modelAccessor());
    }
  }

  function dispatch(action, payload) {
    if (!modelAccessor) {
      throw new Error("Model accessor required");
    }

    try {
      dispatchScopes++;
      hasChange = false;
      const result = action(payload, { dispatch });
      if (isBuiltInModel) return result;
      if (isPromiseLike(result)) {
        return result.finally(() => update(modelAccessor()));
      }
      return result;
    } finally {
      dispatchScopes--;
      if (isBuiltInModel) {
        if (hasChange && !dispatchScopes) {
          update(modelAccessor());
        }
      } else {
        update(modelAccessor());
      }
    }
  }

  // function action(fn) {
  //   return function (payload) {
  //     return dispatch(fn, payload);
  //   };
  // }

  function add() {
    // add(domSelector, binder)
    // add(domSelector, itemBinder)
    if (arguments.length === 2 && typeof arguments[1] !== "function") {
      return add(arguments[0], undefined, arguments[1]);
    }
    const [
      domSelector,
      modelSelector = defaultDomSelector,
      itemBinder,
    ] = arguments;
    // add(domSelector, modelSelector, itemBinder)
    const isBinder =
      typeof itemBinder === "object" && typeof itemBinder.update === "function";
    const isChildBinder = Array.isArray(itemBinder);

    bindings.push(function updateBinding(
      rootModel,
      container,
      parentContext = currentContext
    ) {
      const context = { ...parentContext, dispatch: parentContext.dispatch };
      if (!parentContext) {
        if (modelAccessor) {
          context.rootModel = modelAccessor;
        }
        if (defaultContainer) {
          container.rootContainer = defaultContainer;
        }
      }
      context.container = container || context.rootContainer;

      if (!context.container.__bindingCache) {
        context.container.__bindingCache = new WeakMap();
      }

      let bindingCache = context.container.__bindingCache.get(updateBinding);
      if (!bindingCache) {
        context.container.__bindingCache.set(
          updateBinding,
          (bindingCache = {
            callbacks: callbackFactory(),
          })
        );
      }

      bindingCache.callbacks.resetHookIndex();
      context.callback = bindingCache.callbacks;

      context.update = () => updateBinding(...arguments);
      const dom =
        domSelector === "this"
          ? container
          : container.querySelector(domSelector);
      const model = modelSelector(rootModel, context);

      if (isBinder) {
        return itemBinder.update(model, dom, context);
      }

      if (!dom) return;

      // node array binding
      if (itemBinder) {
        if (!dom.__isDirty) {
          dom.__isDirty = true;
          dom.__template = dom.firstElementChild;
          dom.__childElements = [];
          dom.__childModels = [];
          dom.innerHTML = "";
        }
        if (!dom.__template) return;
        if (!model) {
          dom.innerHTML = "";
        } else {
          for (let i = 0; i < model.length; i++) {
            if (isEqual(dom.__childModels[i], model[i])) {
              continue;
            }
            let element = dom.__childElements[i];
            // no child at this position
            if (!element) {
              const newElement = dom.__template.cloneNode(true);
              newElement.classList.remove(templateClassName);
              dom.__childElements[i] = element = newElement;
              dom.appendChild(newElement);
            }
            if (isChildBinder) {
              itemBinder[0].update(model[i], element, context);
            } else {
              const childModel = itemBinder(model[i], context);
              if (!isEqual(childModel, dom.__childModels[i])) {
                updateElement(element, childModel, dom.__childModels[i]);
                dom.__childModels[i] = childModel;
              }
            }
          }

          for (let i = model.length; i < dom.__childElements.length; i++) {
            const element = dom.__childElements[i];
            if (element.ondestroy) {
              element.ondestroy({ type: "destroy", target: element });
            }

            dom.removeChild(element);
          }
          dom.__childElements.length = model.length;
        }
      } else {
        updateElement(dom, model, dom.__model);
        dom.__model = model;
      }
    });

    return instance;
  }

  function update(rootModel, targetContainer, context) {
    if (!arguments.length && modelAccessor) {
      rootModel = modelAccessor();
    }
    const container =
      arguments.length > 1 ? targetContainer : defaultContainer || document;
    // no container specified
    if (!container) {
      return instance;
    }
    // model is not changed
    if (isEqual(container.__rootModel, rootModel)) {
      return;
    }
    container.__rootModel = rootModel;
    for (let i = 0; i < bindings.length; i++) {
      bindings[i](rootModel, container, context);
    }
    return instance;
  }

  return instance;
}

Object.assign(domux, {
  model(props) {
    return new Model(props);
  },
  add() {
    return domux().add(...arguments);
  },
});

function updateElement(dom, model, prevModel = {}) {
  if (!dom.__created) {
    dom.__styleText = (dom.getAttribute("style") || "") + ";";
    dom.__classText = (dom.getAttribute("class") || "") + " ";
  }

  Object.entries(model).forEach(([key, value]) => {
    if (prevModel[key] === value) return;
    const isProp = key[0] === "$";
    const prop = isProp ? key.substr(1) : undefined;
    if (key === "#text") {
      dom.textContent =
        typeof value === "undefined" || value === null ? "" : value;
    } else if (key === "#html") {
      dom.innerHTML =
        typeof value === "undefined" || value === null ? "" : value;
    } else if (key === "style") {
      if (!isEqual(dom.__styles, value)) {
        dom.__styles = value;
        changeStyles(dom, dom.__styles, dom.__styleText);
      }
    } else if (key === "class") {
      if (!isEqual(dom.__classes, value)) {
        dom.__classes = value;
        changeClasses(dom, dom.__classes, dom.__classText);
      }
    } else if (isProp) {
      dom[prop] = value;
    } else {
      dom.setAttribute(key, value);
    }
  });

  if (!dom.__created) {
    dom.__created = true;
    if (dom.oncreate) {
      dom.oncreate({ type: "create", target: dom });
    }
  }
}

function changeStyles(dom, styles, initialStyles) {
  if (typeof styles === "string") {
    dom.style = initialStyles + styles;
  } else {
    dom.style =
      initialStyles +
      Object.entries(styles)
        .map(([key, value]) => `${key}: ${value}`)
        .join(";");
  }
}

function changeClasses(dom, classes, initialClasses) {
  if (typeof classes === "string") {
    dom.className = initialClasses + classes;
  } else {
    Object.entries(classes).forEach(([key, value]) =>
      dom.classList.toggle(key, !!value)
    );
  }
}

function isPromiseLike(obj) {
  return obj && typeof obj.then === "function";
}

function isEqual(a, b) {
  if (a === b) {
    return true;
  }

  if (
    typeof a !== "object" ||
    typeof b !== "object" ||
    isPromiseLike(a) ||
    isPromiseLike(b) ||
    Array.isArray(a) ||
    Array.isArray(b)
  )
    return false;
  if (a === null && b) return false;
  if (b === null && a) return false;

  const comparer = (key) => {
    return a[key] === b[key];
  };
  return Object.keys(a).every(comparer) && Object.keys(b).every(comparer);
}

const emptyMap = new Map();
const unset = {};
emptyMap.value = unset;

function callbackFactory() {
  const cache = createArrayKeyedMap();

  return Object.assign(
    function (func, ...keys) {
      cache.hookIndex++;
      return cache.getOrAdd([cache.hookIndex].concat(keys), () => func);
    },
    {
      resetHookIndex() {
        cache.hookIndex = 0;
      },
    }
  );
}

function createArrayKeyedMap() {
  const root = new Map();
  const values = [];
  root.value = unset;

  function getMap(key, createIfNotExist) {
    const keyArray = Array.isArray(key) ? key : [key];
    let prev = root;
    for (let i = 0; i < keyArray.length; i++) {
      const item = keyArray[i];
      const map = prev.get(item);
      if (typeof map === "undefined") {
        if (!createIfNotExist) {
          return emptyMap;
        }
        const newMap = new Map();
        newMap.value = unset;
        prev.set(item, newMap);
        prev = newMap;
      } else {
        prev = map;
      }
    }
    return prev;
  }

  return {
    set(key, value) {
      const map = getMap(key, true);
      if (map.value === unset) {
        values[values.length] = map;
      }
      map.value = value;
    },
    get(key) {
      const value = getMap(key, false).value;
      return value === unset ? undefined : value;
    },
    getOrAdd(key, creator) {
      const map = getMap(key, true);
      if (map.value === unset) {
        map.value = creator(key);
      }
      return map.value;
    },
    clear() {
      root.clear();
    },
    delete(key) {
      getMap(key, false).value = unset;
    },
    *values() {
      for (const map of values) {
        yield map.value;
      }
    },
  };
}

class Model {
  constructor(props = {}) {
    const listeners = [];
    this.__accessor = () => props;
    this.__accessor.subscribe = (listener) => listeners.push(listener);
    Object.keys(props).forEach((key) => {
      Object.defineProperty(this, key, {
        get() {
          return props[key];
        },
        set(value) {
          if (props[key] === value) return;
          props = {
            ...props,
            [key]: value,
          };
          for (let i = 0; i < listeners.length; i++) {
            listeners[i](props);
          }
        },
      });
    });
  }
}

if (!document.querySelector("#domux-styles")) {
  const styleElement = document.createElement("style");
  styleElement.id = "domux-styles";
  styleElement.type = "text/css";
  const styles = `.${templateClassName} {display: none !important;}`;
  const styleContainer = document.querySelector("head") || document.body;

  if (styleElement.styleSheet) {
    styleElement.styleSheet.cssText = styles;
  } else {
    styleElement.appendChild(document.createTextNode(styles));
  }
  styleContainer.appendChild(styleElement);
}
