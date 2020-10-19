export interface ElementProps {
  "#text"?: any;
  "#html"?: any;
  [key: string]: any;
}

export interface Dispatcher {
  dispatch<TPayload = never, TReturn = void>(
    action: (payload?: TPayload) => TReturn,
    payload?: TPayload
  ): TReturn;
}
export interface Context extends Dispatcher {
  rootModel: Function;
  rootContainer: Element | Document;
  container: Element | Document;
}

export type DomSelector = "this" | string;

export interface Binding<TModel> {
  target: DomSelector;
}

export interface SingleElementBinding<TModel> extends Binding<TModel> {
  props: (model?: TModel) => ElementProps;
  binder: DomBinder<TModel>;
}

export interface MultipleElementsBinding<TModel, TItemModel>
  extends Binding<TModel> {
  list: (model?: TModel) => TItemModel[];
  item:
    | [DomBinder<TModel>]
    | ((model?: TItemModel, context?: Context) => ElementProps);
}

export interface AddBinding<TModel = any> {
  (domSelector: DomSelector, appender: DomAppender): DomBinder;
  (
    domSelector: DomSelector,
    propsBuilder: (model?: TModel, context?: Context) => ElementProps
  ): DomBinder;

  (domSelector: DomSelector, binder: DomBinder<TModel>): DomBinder;

  <TItemModel>(
    domSelector: DomSelector,
    listModelSelector: (model?: TModel) => TItemModel[],
    itemPropsBuilder: (model?: TItemModel, context?: Context) => ElementProps
  ): DomBinder;

  <TItemModel>(
    domSelector: DomSelector,
    listModelSelector: (model?: TModel) => TItemModel[],
    itemBinder: [DomBinder<TItemModel>]
  ): DomBinder;

  <TResult>(
    domSelector: DomSelector,
    modelSelector: (model?: TModel) => TResult,
    binder: DomBinder<TResult>
  ): DomBinder;

  (...bindings: Binding<TModel>[]);
}

export interface DomBinder<TModel = any> extends Dispatcher {
  add: AddBinding<TModel>;

  update(model: TModel, container?: Element): DomBinder;
}

export interface Domux extends Function {
  (): DomBinder;
  <TModel>(modelAccessor: () => TModel): DomBinder<TModel>;
  <TModel>(model: Model<TModel>): DomBinder<TModel>;
  <TModel>(
    container: Element | Document,
    modelAccessor: () => TModel
  ): DomBinder<TModel>;
  <TModel>(container: Element | Document, model: Model<TModel>): DomBinder<
    TModel
  >;
  (container: Element | Document): DomBinder;
  add: AddBinding;
  model<T extends { [key: string]: any }>(props: T): Model<T>;
  self: DomAppender;
  ref<TModel>(ref: () => DomBinder<TModel>): DomBinder<TModel>;
}

export class DomAppender {
  constructor(append: (container: Element, target: Element) => any);
}

export class ModelBase {}

export type Model<T> = T & ModelBase;

declare const domux: Domux;

export default domux;
