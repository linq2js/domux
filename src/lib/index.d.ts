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
}

export class ModelBase {}

export type Model<T> = T & ModelBase;

declare const domux: Domux;

export default domux;
