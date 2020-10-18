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
export interface Context extends Dispatcher {}

export interface AddBinding<TModel = any> {
  (
    domSelector: string,
    propsBuilder: (model: TModel, context?: Context) => ElementProps
  ): DomBinder;

  (domSelector: string, binder: DomBinder<TModel>): DomBinder;

  <TItemModel>(
    domSelector: string,
    listModelSelector: (model: TModel) => TItemModel[],
    itemPropsBuilder: (model: TItemModel, context?: Context) => ElementProps
  ): DomBinder;

  <TItemModel>(
    domSelector: string,
    listModelSelector: (model: TModel) => TItemModel[],
    itemBinder: [DomBinder<TItemModel>]
  ): DomBinder;

  <TResult>(
    domSelector: string,
    modelSelector: (model: TModel) => TResult,
    binder: DomBinder<TResult>
  ): DomBinder;
}

export interface DomBinder<TModel = any> extends Dispatcher {
  add: AddBinding<TModel>;

  update(): DomBinder;
}

export interface Domux extends Function {
  (): DomBinder;
  <TModel>(modelAccessor: () => TModel): DomBinder<TModel>;
  <TModel>(
    container: Element | Document,
    modelAccessor: () => TModel
  ): DomBinder<TModel>;
  (container: Element | Document): DomBinder;
  add: AddBinding;
}

declare const domux: Domux;

export default domux;
