export const modelDisplayName = (model: string): string =>
  /\.gguf$/i.test(model) ? model.split(/[\\/]/).pop() || model : model;
