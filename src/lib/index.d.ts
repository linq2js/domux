export interface Options<TModel = any> {
  model?: TModel | (() => TModel);
  container?: Node;
  [key: string]: any;
}

export type Action<TPayload = never, TReturn = void, TContext = never> = (
  payload?: TPayload,
  context?: TContext
) => TReturn;

export interface Context<TModel> {
  rootModel: any;
  rootContainer: Node;
  container: Node;
  node: Node;
  component: Component<TModel>;
  dispatch<TPayload, TReturn>(
    action: Action<TPayload, TReturn, Context<TModel>>,
    payload?: TPayload
  ): TReturn;
  [key: string]: any;
}

export interface BindingResult<TModel> {
  id?: any;
  class?: Classes | any;
  style?: Styles | any;
  text?: any;
  html?: any;
  init?: (() => Node | any) | Node | any;
  on?: Events;
  prop?: Properties;
  attr?: Attributes;
  children?: ChildrenOptions<any, TModel>;
}

export interface ChildrenOptions<TItem, TModel> {
  model: TItem[];
  update:
    | Component<TItem>
    | BindingDelegate<TItem, BindingResult<TItem> | void, TModel>;
}

export type BindingDelegate<TModel, TResult = any, TContextModel = TModel> = (
  model?: TModel,
  context?: Context<TModel>
) => TResult;

export interface Properties {
  [key: string]: any;
}

export interface Attributes {
  [key: string]: any;
}

export interface Events {
  [key: string]: (e: Event) => any;
}

export interface Styles {
  [key: string]: any;
}

export interface Classes {
  [key: string]: any;
}

export type QuerySelector = "this" | string;

export type Binding<TModel> = BindingDelegate<TModel, BindingResult<TModel>>;

export interface Bindable<TModel> {
  one(
    query: QuerySelector,
    binding: Component<TModel> | Binding<TModel>
  ): Component<TModel>;
  all(
    query: QuerySelector,
    binding: Component<TModel> | Binding<TModel>
  ): Component<TModel>;
}

export interface Component<TModel> extends Bindable<TModel> {
  bind(): void;
  bind(model: TModel, container?: Node);
  bind(container: Node);
}

export interface ModelBase {}

export type Model<T> = T & ModelBase;

export interface DefaultExports extends Bindable<any> {
  <TModel = any>(options?: Options<TModel>): Component<TModel>;
  model<T extends { [key: string]: any }>(props: T): Model<T>;
  nested(
    childModel: BindingDelegate<any, any[]>,
    childComponent?: BindingDelegate<any, Component<any> | BindingDelegate<any>>
  ): Binding<any>;
}

declare const domux: DefaultExports;

export default domux;
