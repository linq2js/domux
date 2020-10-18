import domux from "./index";

const rootElement = document.getElementById("root");

rootElement.innerHTML = `
  <h1></h1>
  <button id="increase-sync">Increase</button>
  <button id="increase-async">Increase Async</button>
`;

let rootModel = 0;

const Root$ = domux(() => rootModel)
  .add("h1", (model) => ({
    "#text": model,
  }))
  .add("#increase-sync", (model, { dispatch }) => ({
    $onclick: () => dispatch(increase),
  }))
  .add("#increase-async", (model, { dispatch }) => ({
    $onclick: () => dispatch(increaseAsync),
  }));

function increase() {
  rootModel++;
}

async function increaseAsync() {
  await new Promise((resolve) => setTimeout(resolve, 1000));
  Root$.dispatch(increase);
}

Root$.update();
