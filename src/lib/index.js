const templateClassName = "domux-template";
let lastQuery;

export default function domux({
  container = document,
  model,
  ...contextProps
} = {}) {
  return new Component({ container, model, contextProps });
}

class Component {
  constructor(options) {
    this._bindings = [];
    this._options = options;
    this._unsubscribe = undefined;

    // call by another component or internal
    this._update = (model, context) => {
      context = {
        ...options.contextProps,
        ...context,
        container: context.node || context.container,
        component: this,
        updateContainer: (inputModel = model) =>
          this._update(inputModel, context),
      };
      const bindings = this._bindings;
      for (let i = 0; i < bindings.length; i++) {
        bindings[i](model, context);
      }
    };
  }

  one(selector, binding) {
    this._bindings.push(createBinding(false, selector, binding));
    return this;
  }

  all(selector, binding) {
    this._bindings.push(createBinding(true, selector, binding));
    return this;
  }

  update(...args) {
    let model, container;
    if (!args.length) {
      model = this._options.model;
      container = this._options.container;
    } else if (args.length > 1) {
      [model, container] = args;
    } else if (args[0] && typeof args[0].cloneNode === "function") {
      model = this._options.model;
      container = args[0];
    } else {
      model = args[0];
      container = this._options.container;
    }

    if (!container) {
      return;
    }

    if (typeof model === "function") {
      model = model();
    }

    const updater = () => this.update(...args);
    let dynamicModel;

    if (model) {
      if (typeof model.subscribe === "function") {
        if (typeof this._unsubscribe === "function") {
          this._unsubscribe();
        }
        dynamicModel = model;
        this._unsubscribe = dynamicModel.subscribe(() => {
          const rootModel = dynamicModel.getState();
          this._update(
            rootModel,
            addDispatcher(
              updater,
              {
                rootContainer: container,
                rootComponent: this,
                container,
                rootModel,
              },
              dynamicModel.dispatch
            )
          );
        });
      }
      if (typeof model.getState === "function") {
        model = model.getState();
      }
    }
    this._update(
      model,
      addDispatcher(
        updater,
        {
          rootContainer: container,
          rootComponent: this,
          container,
          rootModel: model,
        },
        dynamicModel && dynamicModel.dispatch
      )
    );

    return this;
  }
}

function addDispatcher(updater, context, customDispatch) {
  context.dispatch = function dispatch() {
    if (typeof customDispatch === "function") {
      return customDispatch(...arguments);
    }
    const [action, payload] = arguments;
    const result = action(payload, context);
    if (isPromiseLike(result)) {
      return result.finally(updater);
    }
    updater();
    return result;
  };
  return context;
}

class Model {
  constructor(state = {}) {
    const listeners = [];
    this.getState = () => state;
    this.subscribe = (listener) => listeners.push(listener);

    Object.keys(state).forEach((key) => {
      Object.defineProperty(this, key, {
        get() {
          return state[key];
        },
        set(value) {
          if (state[key] === value) return;
          state = {
            ...state,
            [key]: value,
          };
          for (let i = 0; i < listeners.length; i++) {
            listeners[i](state);
          }
        },
      });
    });
  }
}

function query(container, selector, all) {
  if (selector === "this") {
    return [container];
  }
  // auto prepend :scope to selector
  if (/^\s*>/.test(selector)) {
    selector = ":scope " + selector;
  }
  if (process.env.NODE_ENV !== "production") {
    lastQuery = undefined;
  }
  if (
    !lastQuery ||
    lastQuery.container !== container ||
    lastQuery.selector !== selector ||
    lastQuery.all !== all
  ) {
    lastQuery = {
      container,
      selector,
      all,
      result: all
        ? container.querySelectorAll(selector)
        : container.querySelector(selector),
    };

    if (!lastQuery.result) {
      lastQuery.result = [];
    } else {
      lastQuery.result = all
        ? Array.from(lastQuery.result)
        : [lastQuery.result];
    }
  }

  return lastQuery.result;
}

function createBinding(all, selector, binding) {
  if (binding instanceof Component) {
    return function (model, context) {
      const nodes = query(context.container, selector, all);
      for (let i = 0; i < nodes.length; i++) {
        binding._update(model, { ...context, node: nodes[i] });
      }
    };
  }
  return function bindingFn(model, context) {
    const nodes = query(context.container, selector, all);
    for (let i = 0; i < nodes.length; i++) {
      const node = nodes[i];
      function update(inputModel = model) {
        const result = binding(inputModel, { ...context, node, update }) || {};
        updateNode(node, bindingFn, context, result);
      }

      update(model);
    }
  };
}

function getBindingData(node, key, init) {
  if (!node.__data) {
    node.__data = new WeakMap();
  }
  let data = node.__data.get(key);
  if (!data) {
    data = init();
    node.__data.set(key, data);
  }
  return data;
}

function getNodeInitialData(node) {
  if (!node.__initialData) {
    node.__initialData = {
      style: (node.getAttribute("style") || "") + ";",
      class: (node.getAttribute("class") || "") + " ",
    };
  }
  return node.__initialData;
}

function updateNode(node, bindingKey, context, result) {
  const initialData = getNodeInitialData(node);
  const bindingData = getBindingData(node, bindingKey, () => ({
    model: {},
    childTemplate: false,
    childModels: [],
    childNodes: [],
  }));
  if (!bindingData.initialized && "init" in result) {
    bindingData.initialized = true;
    let init = result.init;

    if (typeof init === "function") {
      init = init(node);
    }

    if (typeof init !== "undefined" && init !== null) {
      if (init && typeof init.cloneNode === "function") {
        node.appendChild(init.cloneNode(true));
      } else {
        node.innerHTML = "" + init;
      }
    }
  }

  if ("id" in result) {
    updateAttribute(node, bindingData.model, "id", result.id);
  }
  if ("class" in result) {
    updateClass(node, bindingData.model, result.class, initialData.class);
  }
  if ("style" in result) {
    updateStyle(node, bindingData.model, result.style, initialData.style);
  }
  if ("text" in result) {
    node.textContent = result.text;
  } else if ("html" in result) {
    node.innerHTML = result.html;
  }
  if (result.prop) {
    Object.entries(result.prop).forEach(([name, value]) =>
      updateProperty(node, bindingData.model, name, value)
    );
  }
  if (result.on) {
    Object.entries(result.on).forEach(([name, value]) =>
      updateEvent(node, bindingData.model, name, value)
    );
  }
  if (result.attr) {
    Object.entries(result.attr).forEach(([name, value]) =>
      updateAttribute(node, bindingData.model, name, value)
    );
  }

  if (result.children && typeof result.children.update !== "undefined") {
    if (bindingData.childTemplate === false) {
      bindingData.childTemplate = node.firstElementChild.cloneNode(true);
      bindingData.childTemplate.classList.remove(templateClassName);
      node.innerHTML = "";
    }
    if (bindingData.childTemplate) {
      let { model: childModels, update } = result.children;
      if (update instanceof Component) {
        update = update._update;
      }
      if (Array.isArray(childModels)) {
        for (let i = 0; i < childModels.length; i++) {
          const childModel = childModels[i];
          if (childModel === bindingData.childModels[i]) continue;
          let childNode = bindingData.childNodes[i];
          if (!childNode) {
            childNode = bindingData.childTemplate.cloneNode(true);
            bindingData.childNodes[i] = childNode;
            node.appendChild(childNode);
          }
          const childContext = {
            ...context,
            parent: context.node,
            node: childNode,
          };
          const updateResult = update(childModel, childContext);

          if (
            typeof updateResult === "object" &&
            !(updateResult instanceof Component)
          ) {
            updateNode(childNode, childNode, childContext, updateResult);
          }
        }
        // remove unused nodes
        for (
          let i = childModels.length;
          i < bindingData.childNodes.length;
          i++
        ) {
          node.removeChild(bindingData.childNodes[i]);
        }
        bindingData.childNodes.length = childModels.length;
      }
    }
  }
}

function init() {
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

function serializeStyle(style) {
  return Object.entries(style)
    .map(([key, value]) => `${key}: ${value}`)
    .join(";");
}

function updateStyle(node, prev, value, initial) {
  if (isEqual(prev.style, value)) return;
  prev.style = value;
  if (typeof value === "object") {
    node.style = initial + serializeStyle(value);
  } else {
    node.style = initial + value;
  }
}

function updateClass(node, prev, value, initial) {
  if (isEqual(prev.style, value)) return;
  prev.style = value;
  if (typeof value === "object") {
    Object.entries(value).forEach(([token, force]) =>
      node.classList.toggle(token, !!force)
    );
  } else {
    node.className = initial + value;
  }
}

function updateProperty(node, prev, name, value) {
  const key = "p:" + name;
  if (prev[key] === value) return;
  prev[key] = value;
  node[name] = value;
}

function updateEvent(node, prev, name, value) {
  const key = "e:" + name;
  if (prev[key] === value) return;
  prev[key] = value;
  node["on" + name] = value;
}

function updateAttribute(node, prev, name, value) {
  const key = "a:" + name;
  if (prev[key] === value) return;
  prev[key] = value;
  node.setAttribute(name, value);
}

Object.assign(domux, {
  one() {
    return domux().one(...arguments);
  },
  all() {
    return domux().all(...arguments);
  },
  model(state) {
    return new Model(state);
  },
  nested(childModel, childComponent) {
    return function (model, context) {
      return {
        init: context.container,
        children: {
          model: childModel(model, context),
          update:
            typeof childComponent === "function"
              ? childComponent(model, context)
              : context.component,
        },
      };
    };
  },
});

init();
