import domux from "./index";

function query(selector) {
  return document.querySelector(selector);
}

function queryAll(selector) {
  return Array.from(document.querySelectorAll(selector));
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
