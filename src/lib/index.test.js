import domux from "./index";

function query(selector, container = document) {
  return container.querySelector(selector);
}

function queryAll(selector, container = document) {
  return Array.from(container.querySelectorAll(selector));
}

beforeEach(() => {
  document.body.innerHTML = "";
});

test("counter", () => {
  const rootModel = domux.model({ count: 0 });

  document.body.innerHTML = `
    <h1></h1>
  `;

  const binder = domux(rootModel).add("h1", (model) => ({
    "#text": model.count,
    $onclick: () => rootModel.count++,
  }));

  binder.update();

  expect(query("h1").textContent).toBe("0");
  query("h1").click();
  expect(query("h1").textContent).toBe("1");
});

test("appender", () => {
  const tree = {
    id: "root",
    title: "root",
    children: [
      { id: "c1", title: "child 1" },
      {
        id: "c2",
        title: "child 2",
        children: [
          { id: "c3", title: "child 3" },
          { id: "c4", title: "child 4" },
        ],
      },
    ],
  };

  document.body.innerHTML = `
    <div class="tree">
        <div class="node">
            <span></span>
            <div class="children"></div>
        </div>
    </div>
  `;
  const nodeBinder = domux
    .add(":scope > .children", domux.self)
    .add("this", (model) => ({
      id: model.id,
    }))
    .add(":scope > .children", (model) => model.children, [
      domux.ref(() => nodeBinder),
    ])
    .add(":scope > span", (model) => ({
      "#text": model.title,
    }));
  const rootBinder = domux.add(".tree > .node", nodeBinder);

  rootBinder.update(tree);
  const rootNode = query("#root");
  expect(rootNode).not.toBeUndefined();
  const c1Node = query("#c1", rootNode);
  expect(c1Node).not.toBeUndefined();
  const c2Node = query("#c2", rootNode);
  expect(c2Node).not.toBeUndefined();

  const c3Node = query("#c3", c2Node);
  expect(c3Node).not.toBeUndefined();

  const c4Node = query("#c4", c2Node);
  expect(c4Node).not.toBeUndefined();
});
