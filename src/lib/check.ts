import domux from "./index";

domux({
  model: domux.model({
    count: 1,
    nodes: [{ title: "item 1" }, { title: "item 2" }],
  }),
}).one("span", (model) => ({
  text: model.count,
  children: {
    model: model.nodes,
    update: null,
  },
}));
